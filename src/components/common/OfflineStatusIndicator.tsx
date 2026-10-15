import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X, 
  ShieldCheck, 
  HardDrive,
  ExternalLink,
  FolderSync,
  Cloud,
  CloudOff,
  CloudRain,
  Check,
  Loader2,
  Folder
} from 'lucide-react';
import { useOfflineSync } from '../../services/offlineSyncService';
import { 
  obterEstatisticasArmazenamento, 
  obterItensPendentesFilaSincronizacao 
} from '../../services/indexedDbService';
import { 
  verificarPendenciasBackupDrive, 
  executarBackupLocalStorageParaDrive,
  inscreverMudancaBackup,
  StatusPendenciaBackupDrive,
  BACKUP_FOLDER_NAME
} from '../../services/backupDriveService';
import { isGoogleDriveConnected, getGoogleCurrentUser } from '../../services/googleDriveService';
import { adicionarListenerConectividade } from '../../services/connectivityService';
import { SyncQueueItem } from '../../types';

export const OfflineStatusIndicator: React.FC = () => {
  const { isOnline, pendingCount, isSyncing, lastSyncAt, storageType, sincronizarManual } = useOfflineSync();
  const [modalAberto, setModalAberto] = useState(false);
  const [itensPendentes, setItensPendentes] = useState<SyncQueueItem[]>([]);
  const [storageStats, setStorageStats] = useState<{
    quotaMb: number;
    usageMb: number;
    percentageUsed: number;
    isPersisted: boolean;
  } | null>(null);

  // Status de Service Worker
  const [swStatus, setSwStatus] = useState<{
    suportado: boolean;
    ativo: boolean;
    registrado: boolean;
    controlando: boolean;
  }>({
    suportado: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    ativo: false,
    registrado: false,
    controlando: typeof navigator !== 'undefined' && 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller),
  });

  // Status de Pendência de Backup no Google Drive
  const [drivePendencia, setDrivePendencia] = useState<StatusPendenciaBackupDrive | null>(() => {
    try {
      return verificarPendenciasBackupDrive();
    } catch {
      return null;
    }
  });

  const [executandoBackup, setExecutandoBackup] = useState(false);
  const [feedbackBackup, setFeedbackBackup] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Monitora status do Service Worker
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          setSwStatus({
            suportado: true,
            registrado: true,
            ativo: Boolean(reg.active),
            controlando: Boolean(navigator.serviceWorker.controller),
          });
        }
      }).catch(console.warn);

      const handleControllerChange = () => {
        setSwStatus(prev => ({
          ...prev,
          controlando: Boolean(navigator.serviceWorker.controller),
          ativo: true,
        }));
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  // Monitora alterações de configuração e estado de backup do Google Drive
  useEffect(() => {
    const atualizarPendencia = () => {
      try {
        setDrivePendencia(verificarPendenciasBackupDrive());
      } catch (e) {
        console.warn('Erro ao verificar pendências de backup:', e);
      }
    };

    atualizarPendencia();

    // Inscreve no serviço de backup
    const unsubscribeBackup = inscreverMudancaBackup(() => {
      atualizarPendencia();
    });

    // Escuta eventos de conectividade centralizados e foco para reavaliar pendência do Drive
    const unsubscribeConnectivity = adicionarListenerConectividade(() => {
      atualizarPendencia();
    });
    window.addEventListener('focus', atualizarPendencia);
    const intervalTimer = setInterval(atualizarPendencia, 30000);

    return () => {
      unsubscribeBackup();
      unsubscribeConnectivity();
      window.removeEventListener('focus', atualizarPendencia);
      clearInterval(intervalTimer);
    };
  }, []);

  // Carrega itens pendentes e estatísticas de armazenamento quando abre o popover
  useEffect(() => {
    if (modalAberto) {
      obterItensPendentesFilaSincronizacao().then(setItensPendentes);
      obterEstatisticasArmazenamento().then(stats => {
        setStorageStats({
          quotaMb: stats.quotaMb,
          usageMb: stats.usageMb,
          percentageUsed: stats.percentageUsed,
          isPersisted: stats.isPersisted,
        });
      });
      try {
        setDrivePendencia(verificarPendenciasBackupDrive());
      } catch {}
    }
  }, [modalAberto, pendingCount, isSyncing]);

  // Fecha com clique fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setModalAberto(false);
      }
    }
    if (modalAberto) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalAberto]);

  const handleSincronizar = async () => {
    await sincronizarManual();
    const pendentes = await obterItensPendentesFilaSincronizacao();
    setItensPendentes(pendentes);
    setDrivePendencia(verificarPendenciasBackupDrive());
  };

  const handleExecutarBackupDrive = async () => {
    setExecutandoBackup(true);
    setFeedbackBackup(null);

    try {
      const res = await executarBackupLocalStorageParaDrive({ forcar: true });
      if (res.success) {
        setFeedbackBackup({
          tipo: 'sucesso',
          msg: `Backup salvo com sucesso na pasta "${BACKUP_FOLDER_NAME}"! (${res.fileName || 'Arquivo gerado'})`,
        });
        setDrivePendencia(verificarPendenciasBackupDrive());
      } else {
        setFeedbackBackup({
          tipo: 'erro',
          msg: res.message || res.error || 'Falha ao salvar backup no Google Drive.',
        });
      }
      setTimeout(() => setFeedbackBackup(null), 5000);
    } catch (err: any) {
      setFeedbackBackup({
        tipo: 'erro',
        msg: err.message || 'Erro inesperado ao realizar backup no Google Drive.',
      });
      setTimeout(() => setFeedbackBackup(null), 5000);
    } finally {
      setExecutandoBackup(false);
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Botão Indicador Pílula com Alternância 'Online' (Verde) e 'Offline' (Amarelo) */}
      <button
        type="button"
        onClick={() => setModalAberto(!modalAberto)}
        className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-2xs border ${
          !isOnline
            ? 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200'
            : isSyncing || executandoBackup
            ? 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
            : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
        }`}
        title={
          !isOnline
            ? `Status: Offline. Dados protegidos no IndexedDB pelo Service Worker. ${drivePendencia?.temPendencia ? 'Backup do Drive pendente.' : ''}`
            : `Status: Online. Conexão ativa com Service Worker e IndexedDB. ${drivePendencia?.temPendencia ? 'Aviso: Há pendência de backup no Google Drive.' : 'Backups sincronizados.'}`
        }
      >
        {!isOnline ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <WifiOff className="h-3.5 w-3.5 text-amber-800 shrink-0" />
            <span className="font-extrabold tracking-tight">Offline</span>
            <span className="hidden md:inline text-[10px] font-semibold text-amber-800/80 bg-amber-200/60 px-1.5 py-0.5 rounded">
              IndexedDB
            </span>
          </>
        ) : isSyncing || executandoBackup ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 text-blue-700 animate-spin shrink-0" />
            <span className="font-extrabold tracking-tight">Sincronizando...</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <Wifi className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
            <span className="font-extrabold tracking-tight">Online</span>
            <span className="hidden md:inline text-[10px] font-semibold text-emerald-800/80 bg-emerald-200/60 px-1.5 py-0.5 rounded">
              {swStatus.ativo ? 'SW + IndexedDB' : 'IndexedDB'}
            </span>
          </>
        )}

        {/* Notificação Visual de Pendência de Backup no Google Drive */}
        {drivePendencia?.temPendencia && (
          <span 
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200/90 text-amber-950 border border-amber-400/80 shadow-2xs" 
            title={drivePendencia.motivo}
          >
            <FolderSync className="h-3 w-3 text-amber-800" />
            <span className="hidden sm:inline">Drive Pendente</span>
            <span className="sm:hidden">Drive</span>
          </span>
        )}

        {/* Contagem de registros pendentes no IndexedDB */}
        {pendingCount > 0 && (
          <span 
            className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-2xs" 
            title={`${pendingCount} registro(s) pendente(s) de envio no IndexedDB`}
          >
            {pendingCount}
          </span>
        )}
      </button>

      {/* Popover Detalhado de Conectividade, Service Worker, IndexedDB e Google Drive */}
      {modalAberto && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-slate-800 animate-fadeIn text-xs space-y-3.5">
          
          {/* Cabeçalho do Popover */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-700" />
              <span className="font-extrabold text-sm text-slate-900">Status de Sincronização e Dados</span>
            </div>
            <button
              onClick={() => setModalAberto(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Card 1: Status Geral de Conexão (Online vs Offline) */}
          <div className={`p-3 rounded-xl border flex items-start gap-3 ${
            !isOnline
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}>
            <div className={`p-2 rounded-lg shrink-0 ${
              !isOnline ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-200/80 text-emerald-900'
            }`}>
              {!isOnline ? <WifiOff className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
            </div>
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-black">
                  {!isOnline ? 'Modo Offline Ativo' : 'Sistema Online'}
                </strong>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  !isOnline ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {!isOnline ? 'OFFLINE (Amarelo)' : 'ONLINE (Verde)'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 mt-0.5">
                {!isOnline
                  ? 'Você pode preencher registros e editar atividades normalmente. O Service Worker e o IndexedDB preservam seus dados localmente com segurança total.'
                  : 'Conexão ativa e sincronizada. Operações são replicadas e sincronizadas automaticamente.'}
              </p>
            </div>
          </div>

          {/* Card 2: NOTIFICAÇÃO DE PENDÊNCIAS DE BACKUP NO GOOGLE DRIVE (Destaque Requisitado) */}
          <div className={`p-3 rounded-xl border space-y-2 ${
            drivePendencia?.temPendencia
              ? 'bg-amber-50/70 border-amber-300 text-amber-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FolderSync className={`h-4 w-4 ${drivePendencia?.temPendencia ? 'text-amber-700' : 'text-emerald-700'}`} />
                <span className="font-extrabold text-[11px] text-slate-900">
                  Backup no Google Drive
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                drivePendencia?.temPendencia
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {drivePendencia?.temPendencia ? 'Pendência Detectada' : 'Em Dia'}
              </span>
            </div>

            {/* Mensagem e Motivo da Pendência */}
            <p className="text-[11px] text-slate-600 leading-snug">
              {drivePendencia?.motivo}
            </p>

            {drivePendencia?.ultimoBackupTimestamp && (
              <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                <span>Último backup na nuvem:</span>
                <span className="font-mono font-medium text-slate-700">
                  {new Date(drivePendencia.ultimoBackupTimestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            )}

            {/* Feedback de Ação de Backup */}
            {feedbackBackup && (
              <div className={`p-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${
                feedbackBackup.tipo === 'sucesso' 
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}>
                {feedbackBackup.tipo === 'sucesso' ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                <span>{feedbackBackup.msg}</span>
              </div>
            )}

            {/* Botão de Envio Imediato de Backup */}
            {drivePendencia?.isGoogleDriveConectado && (
              <button
                type="button"
                onClick={handleExecutarBackupDrive}
                disabled={executandoBackup || !isOnline}
                className="w-full mt-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                {executandoBackup ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Enviando Backup para o Drive...</span>
                  </>
                ) : (
                  <>
                    <Folder className="h-3.5 w-3.5" />
                    <span>Realizar Backup no Google Drive Agora</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Card 3: Status do Service Worker e do IndexedDB */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
              Arquitetura de Armazenamento Local
            </span>

            {/* Service Worker */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Service Worker (PWA):</span>
              </span>
              <span className="font-extrabold text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {swStatus.ativo ? 'Ativo (sw.js)' : swStatus.suportado ? 'Registrado' : 'Indisponível'}
              </span>
            </div>

            {/* IndexedDB */}
            <div className="flex items-center justify-between text-[11px] border-t border-slate-200/60 pt-1.5">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <HardDrive className="h-3.5 w-3.5 text-teal-600" />
                <span>Banco de Dados Local:</span>
              </span>
              <span className="font-extrabold text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                IndexedDB (14 Stores)
              </span>
            </div>

            {/* Fila de sincronização */}
            <div className="flex items-center justify-between text-[11px] border-t border-slate-200/60 pt-1.5">
              <span className="text-slate-600">Registros pendentes na fila:</span>
              <strong className={`font-mono font-black ${pendingCount > 0 ? 'text-amber-800' : 'text-slate-800'}`}>
                {pendingCount} pendente(s)
              </strong>
            </div>

            {storageStats && storageStats.quotaMb > 0 && (
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Armazenamento local:</span>
                <span className="font-mono text-slate-700">
                  {storageStats.usageMb} MB de {storageStats.quotaMb} MB
                </span>
              </div>
            )}
          </div>

          {/* Lista de Registros Pendentes se houver */}
          {itensPendentes.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Itens na fila de sincronização ({itensPendentes.length}):
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {itensPendentes.map(item => (
                  <div key={item.id} className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] flex items-center justify-between">
                    <div className="truncate mr-2">
                      <strong className="text-amber-950 font-bold block truncate">
                        {item.payload?.nomeEstudante || item.entityId}
                      </strong>
                      <span className="text-[10px] text-slate-500">
                        {item.payload?.data ? `Data: ${item.payload.data}` : item.entity}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 shrink-0">
                      Pendente
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rodapé com botão de sincronização manual */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">
              Auto-sync ao reconectar
            </span>

            <button
              type="button"
              onClick={handleSincronizar}
              disabled={!isOnline || isSyncing}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Fila Agora'}</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
