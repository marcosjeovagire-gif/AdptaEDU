import { useEffect, useState, useCallback } from 'react';
import { 
  NetworkSyncStatus, 
  RegistroAcompanhamentoApoio, 
  AtividadeAdaptada,
  SyncQueueItem 
} from '../types';
import { 
  obterItensPendentesFilaSincronizacao, 
  removerItemFilaSincronizacao, 
  atualizarStatusItemFila, 
  salvarRegistroApoioIdb, 
  salvarAtividadeIdb,
  contarPendenciasFila, 
  getMetaKv, 
  setMetaKv,
  idbGet,
  STORES
} from './indexedDbService';
import { uploadImageToDrive, isGoogleDriveConnected } from './googleDriveService';
import { isRealOnline, adicionarListenerConectividade } from './connectivityService';
import { 
  salvarAtividadeNoFirestore, 
  salvarRegistroApoioNoFirestore, 
  salvarPeiNoFirestore 
} from './escolaFirestoreService';

type SyncListener = (status: NetworkSyncStatus) => void;

let listeners: Set<SyncListener> = new Set();
let isMonitoringStarted = false;
let isCurrentlySyncing = false;
let currentPendingCount = 0;
let lastSyncTimestamp: string | null = null;

export function getIsOnline(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine === 'undefined') {
    return isRealOnline();
  }
  return navigator.onLine && isRealOnline();
}

export function notificarMudancaStatus() {
  const status = obterStatusSincronizacaoAtual();
  listeners.forEach(fn => {
    try {
      fn(status);
    } catch (e) {
      console.warn('Erro em listener de sincronização:', e);
    }
  });
}

export function obterStatusSincronizacaoAtual(): NetworkSyncStatus {
  return {
    isOnline: getIsOnline(),
    pendingCount: currentPendingCount,
    isSyncing: isCurrentlySyncing,
    lastSyncAt: lastSyncTimestamp,
    storageType: typeof window !== 'undefined' && Boolean(window.indexedDB) ? 'indexeddb' : 'localstorage_fallback',
  };
}

export function registrarListenerSincronizacao(listener: SyncListener): () => void {
  listeners.add(listener);
  // Notifica o estado inicial
  listener(obterStatusSincronizacaoAtual());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Processa todos os itens pendentes na fila de sincronização
 */
export async function sincronizarPendenciasFila(): Promise<{
  sincronizados: number;
  falhas: number;
  itensProcessados: string[];
}> {
  if (isCurrentlySyncing) {
    return { sincronizados: 0, falhas: 0, itensProcessados: [] };
  }

  if (!getIsOnline()) {
    console.info('Dispositivo offline. Sincronização adiada até restabelecimento da conexão.');
    return { sincronizados: 0, falhas: 0, itensProcessados: [] };
  }

  isCurrentlySyncing = true;
  notificarMudancaStatus();

  let sincronizados = 0;
  let falhas = 0;
  const itensProcessados: string[] = [];

  try {
    const pendentes = await obterItensPendentesFilaSincronizacao();
    currentPendingCount = pendentes.length;
    notificarMudancaStatus();

    for (const item of pendentes) {
      try {
        await atualizarStatusItemFila(item.id, 'syncing');

        // Sincronização específica por entidade
        if (item.entity === 'registro_apoio') {
          const reg: RegistroAcompanhamentoApoio = item.payload;
          
          // 1. Sincroniza no Firestore em nuvem
          await salvarRegistroApoioNoFirestore(reg);

          // 2. Atualiza registro no IndexedDB para status 'synced'
          await salvarRegistroApoioIdb({
            ...reg,
            syncStatus: 'synced',
            updatedAt: new Date().toISOString(),
          }, false);

          // 3. Se houver fotografia do diário de bordo e Google Drive estiver conectado, envia
          if (reg.fotoDiarioBordoUrl && isGoogleDriveConnected()) {
            try {
              const cleanName = reg.nomeEstudante.replace(/[^a-zA-Z0-9]/g, '_');
              await uploadImageToDrive({
                dataUrl: reg.fotoDiarioBordoUrl,
                fileName: `DiarioBordo_${reg.data}_${cleanName}.jpg`,
                serie: reg.turma,
                studentName: reg.nomeEstudante,
                tipo: 'diario_bordo',
              });
            } catch (driveErr) {
              console.warn('Registro sincronizado localmente, upload no Drive pendente:', driveErr);
            }
          }

          // 4. Remove da fila de sincronização
          await removerItemFilaSincronizacao(item.id);
          sincronizados++;
          itensProcessados.push(item.id);

          // Dispara evento customizado para que a interface reaja em tempo real
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('adaptaedu:registro_sincronizado', {
              detail: { registroId: reg.id, studentId: reg.studentId, data: reg.data }
            }));
          }
        } else if (item.entity === 'atividade') {
          const ativ: AtividadeAdaptada = item.payload;

          // 1. Sincroniza no Firestore em nuvem
          await salvarAtividadeNoFirestore(ativ);

          // 2. Atualiza atividade no IndexedDB para status 'synced'
          await salvarAtividadeIdb({
            ...ativ,
            syncStatus: 'synced',
          }, false);

          // 3. Remove da fila de sincronização
          await removerItemFilaSincronizacao(item.id);
          sincronizados++;
          itensProcessados.push(item.id);

          // 4. Dispara evento customizado para que a interface reaja em tempo real
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('adaptaedu:atividade_sincronizada', {
              detail: { atividadeId: ativ.id }
            }));
          }
        } else if (item.entity === 'documento' || item.entity === 'pei') {
          // Sincroniza PEI no Firestore
          if (item.payload && (item.payload as any).studentName) {
            await salvarPeiNoFirestore(item.payload as any);
          }
          await removerItemFilaSincronizacao(item.id);
          sincronizados++;
          itensProcessados.push(item.id);
        } else {
          // Outras entidades (estudantes, perfis)
          await removerItemFilaSincronizacao(item.id);
          sincronizados++;
          itensProcessados.push(item.id);
        }
      } catch (itemErr: any) {
        console.error(`Falha ao sincronizar item ${item.id}:`, itemErr);
        await atualizarStatusItemFila(item.id, 'failed', itemErr?.message || 'Erro de sincronização');
        falhas++;
      }
    }

    currentPendingCount = await contarPendenciasFila();
    lastSyncTimestamp = new Date().toISOString();
    await setMetaKv('ultimo_sync_timestamp', lastSyncTimestamp);

    if (sincronizados > 0) {
      console.info(`Sincronização offline concluída com sucesso: ${sincronizados} item(ns) sincronizado(s).`);
    }
  } catch (e) {
    console.error('Erro durante o ciclo de sincronização:', e);
  } finally {
    isCurrentlySyncing = false;
    currentPendingCount = await contarPendenciasFila();
    notificarMudancaStatus();
  }

  return { sincronizados, falhas, itensProcessados };
}

/**
 * Inicia monitoramento automático dos eventos online/offline do navegador
 * e dispara sincronização automática sempre que a internet retornar.
 */
export function iniciarMonitoramentoSincronizacao(): () => void {
  if (typeof window === 'undefined' || isMonitoringStarted) {
    return () => {};
  }

  isMonitoringStarted = true;

  // Carrega último timestamp de sincronização do IndexedDB
  getMetaKv<string | null>('ultimo_sync_timestamp', null).then(ts => {
    if (ts) lastSyncTimestamp = ts;
    contarPendenciasFila().then(count => {
      currentPendingCount = count;
      notificarMudancaStatus();
    });
  });

  const unsubscribeConnectivity = adicionarListenerConectividade((status) => {
    if (status === 'online') {
      console.info('Conexão estável com a internet confirmada! Sincronizando dados pendentes...');
      notificarMudancaStatus();
      setTimeout(() => {
        sincronizarPendenciasFila();
      }, 500);
    } else if (status === 'offline') {
      console.warn('Conexão com a internet perdida. Modo Offline ativado com IndexedDB.');
      notificarMudancaStatus();
    } else if (status === 'server-unavailable') {
      console.warn('Servidor local temporariamente inacessível. Operando com IndexedDB em modo offline.');
      notificarMudancaStatus();
    }
  });

  // Intervalo periódico leve a cada 30 segundos se estiver online e houver pendências
  const intervalId = setInterval(() => {
    if (getIsOnline() && currentPendingCount > 0 && !isCurrentlySyncing) {
      sincronizarPendenciasFila();
    }
  }, 30000);

  return () => {
    unsubscribeConnectivity();
    clearInterval(intervalId);
    isMonitoringStarted = false;
  };
}

/**
 * Hook React para componentes que necessitam monitorar o estado de rede e sincronização
 */
export function useOfflineSync() {
  const [status, setStatus] = useState<NetworkSyncStatus>(() => obterStatusSincronizacaoAtual());

  useEffect(() => {
    // Garante que o monitoramento global esteja ativo
    iniciarMonitoramentoSincronizacao();

    const unsubscribe = registrarListenerSincronizacao((novoStatus) => {
      setStatus({ ...novoStatus });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const sincronizarManual = useCallback(async () => {
    return await sincronizarPendenciasFila();
  }, []);

  return {
    isOnline: status.isOnline,
    pendingCount: status.pendingCount,
    isSyncing: status.isSyncing,
    lastSyncAt: status.lastSyncAt,
    storageType: status.storageType,
    sincronizarManual,
  };
}
