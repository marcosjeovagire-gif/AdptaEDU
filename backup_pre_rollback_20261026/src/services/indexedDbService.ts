import { 
  Estudante, 
  AtividadeAdaptada, 
  RegistroAcompanhamentoApoio, 
  PerfilPedagogico, 
  AuthorizedUser, 
  EscolaConfig, 
  CurriculumMatrix, 
  CurriculumSkill, 
  HabilidadeAprovada, 
  DocumentoImportado, 
  RegistroHistorico, 
  RegistroAuditoria,
  SyncQueueItem
} from '../types';
import { 
  validateAndSanitizeEstudantes, 
  validateAndSanitizeAtividades, 
  validateAndSanitizeRegistrosApoio, 
  validateAndSanitizePerfisPedagogicos, 
  validateAndSanitizeAuthorizedUsers,
  validateAndSanitizeEscolaConfig
} from '../utils/typeValidators';
import { 
  ESTUDANTES_INICIAIS, 
  PERFIS_PEDAGOGICOS_INICIAIS, 
  ATIVIDADES_INICIAIS, 
  REGISTROS_APOIO_INICIAIS,
  ESCOLA_CONFIG_INICIAL 
} from '../data/mockData';
import { gerarUsuariosIniciaisAutorizadosDoPdf } from '../data/pdfServerData';
import { MATRIZES_CURRICULARES_INICIAIS, HABILIDADES_CURRICULARES_INICIAIS } from '../server/curriculumMatrixService';

export const DB_NAME = 'AdaptaEdu_OfflineDB_v1';
export const DB_VERSION = 1;

// Nomes das Object Stores no IndexedDB
export const STORES = {
  ESTUDANTES: 'estudantes',
  ATIVIDADES: 'atividades',
  REGISTROS_APOIO: 'registros_apoio',
  PERFIS_PEDAGOGICOS: 'perfis_pedagogicos',
  USUARIOS_AUTORIZADOS: 'usuarios_autorizados',
  ESCOLA_CONFIG: 'escola_config',
  MATRIZES_CURRICULARES: 'matrizes_curriculares',
  CURRICULUM_SKILLS: 'curriculum_skills',
  HABILIDADES: 'habilidades',
  DOCUMENTOS: 'documentos',
  HISTORICO: 'historico',
  AUDITORIA: 'auditoria',
  SYNC_QUEUE: 'sync_queue',
  META_KV: 'meta_kv',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Abre e inicializa a base de dados IndexedDB
 */
export function openIndexedDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB não suportado neste navegador'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Falha ao abrir IndexedDB AdaptaEdu:', request.error);
      reject(request.error || new Error('Erro desconhecido ao abrir IndexedDB'));
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
        dbPromise = null;
        console.warn('Banco IndexedDB desatualizado. Recarregando instância.');
      };

      // Tenta persistência de armazenamento durável
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(persisted => {
          if (persisted) {
            // Persistência garantida
          }
        }).catch(() => {
          // Ignora silenciosamente se o navegador rejeitar
        });
      }

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // 1. Estudantes
      if (!db.objectStoreNames.contains(STORES.ESTUDANTES)) {
        const store = db.createObjectStore(STORES.ESTUDANTES, { keyPath: 'id' });
        store.createIndex('turma', 'turma', { unique: false });
        store.createIndex('matricula', 'matricula', { unique: false });
        store.createIndex('nome', 'nome', { unique: false });
      }

      // 2. Atividades Adaptadas
      if (!db.objectStoreNames.contains(STORES.ATIVIDADES)) {
        const store = db.createObjectStore(STORES.ATIVIDADES, { keyPath: 'id' });
        store.createIndex('estudanteId', 'estudanteId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('dataCriacao', 'dataCriacao', { unique: false });
      }

      // 3. Registros de Apoio (Diário de Bordo do Profissional de Apoio)
      if (!db.objectStoreNames.contains(STORES.REGISTROS_APOIO)) {
        const store = db.createObjectStore(STORES.REGISTROS_APOIO, { keyPath: 'id' });
        store.createIndex('studentId', 'studentId', { unique: false });
        store.createIndex('data', 'data', { unique: false });
        store.createIndex('student_data', ['studentId', 'data'], { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // 4. Perfis Pedagógicos
      if (!db.objectStoreNames.contains(STORES.PERFIS_PEDAGOGICOS)) {
        const store = db.createObjectStore(STORES.PERFIS_PEDAGOGICOS, { keyPath: 'id' });
        store.createIndex('estudanteId', 'estudanteId', { unique: false });
      }

      // 5. Usuários Autorizados
      if (!db.objectStoreNames.contains(STORES.USUARIOS_AUTORIZADOS)) {
        const store = db.createObjectStore(STORES.USUARIOS_AUTORIZADOS, { keyPath: 'id' });
        store.createIndex('emailNormalized', 'emailNormalized', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // 6. Configuração da Escola
      if (!db.objectStoreNames.contains(STORES.ESCOLA_CONFIG)) {
        db.createObjectStore(STORES.ESCOLA_CONFIG, { keyPath: 'key' });
      }

      // 7. Matrizes Curriculares
      if (!db.objectStoreNames.contains(STORES.MATRIZES_CURRICULARES)) {
        db.createObjectStore(STORES.MATRIZES_CURRICULARES, { keyPath: 'id' });
      }

      // 8. Habilidades Curriculares Detalhadas
      if (!db.objectStoreNames.contains(STORES.CURRICULUM_SKILLS)) {
        const store = db.createObjectStore(STORES.CURRICULUM_SKILLS, { keyPath: 'id' });
        store.createIndex('matrixId', 'matrixId', { unique: false });
        store.createIndex('skillCode', 'skillCode', { unique: false });
      }

      // 9. Habilidades Aprovadas
      if (!db.objectStoreNames.contains(STORES.HABILIDADES)) {
        const store = db.createObjectStore(STORES.HABILIDADES, { keyPath: 'id' });
        store.createIndex('codigo', 'codigo', { unique: false });
        store.createIndex('disciplina', 'disciplina', { unique: false });
      }

      // 10. Documentos
      if (!db.objectStoreNames.contains(STORES.DOCUMENTOS)) {
        db.createObjectStore(STORES.DOCUMENTOS, { keyPath: 'id' });
      }

      // 11. Histórico
      if (!db.objectStoreNames.contains(STORES.HISTORICO)) {
        const store = db.createObjectStore(STORES.HISTORICO, { keyPath: 'id' });
        store.createIndex('data', 'data', { unique: false });
      }

      // 12. Auditoria
      if (!db.objectStoreNames.contains(STORES.AUDITORIA)) {
        const store = db.createObjectStore(STORES.AUDITORIA, { keyPath: 'id' });
        store.createIndex('dataHora', 'dataHora', { unique: false });
      }

      // 13. Fila de Sincronização Offline (Sync Queue)
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('entity', 'entity', { unique: false });
      }

      // 14. Metadados e Chave-Valor
      if (!db.objectStoreNames.contains(STORES.META_KV)) {
        db.createObjectStore(STORES.META_KV, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

// =========================================================================
// OPERAÇÕES GENÉRICAS DO INDEXEDDB
// =========================================================================

export async function idbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve((request.result as T[]) || []);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function idbGet<T>(storeName: StoreName, key: string | number): Promise<T | null> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve((request.result as T) ?? null);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function idbPut<T>(storeName: StoreName, item: T): Promise<void> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function idbPutMany<T>(storeName: StoreName, items: T[]): Promise<void> {
  if (!items || items.length === 0) return;
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      for (const item of items) {
        store.put(item);
      }
    } catch (e) {
      reject(e);
    }
  });
}

export async function idbDelete(storeName: StoreName, key: string | number): Promise<void> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function idbClear(storeName: StoreName): Promise<void> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function idbCount(storeName: StoreName): Promise<number> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

// =========================================================================
// GESTÃO DE CHAVE-VALOR (META_KV)
// =========================================================================

export async function getMetaKv<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const item = await idbGet<{ key: string; value: T }>(STORES.META_KV, key);
    return item ? item.value : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setMetaKv<T>(key: string, value: T): Promise<void> {
  try {
    await idbPut(STORES.META_KV, { key, value, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.warn(`Erro ao gravar meta_kv (${key}):`, e);
  }
}

// =========================================================================
// MIGRAÇÃO TRANSPARENTE DE LOCALSTORAGE PARA INDEXEDDB
// =========================================================================

/**
 * Migra dados do localStorage para o IndexedDB na primeira execução,
 * preservando todas as atividades, estudantes e registros já existentes.
 */
export async function migrarLocalStorageParaIndexedDbSeNecessario(): Promise<{
  migrado: boolean;
  estudantesCount: number;
  atividadesCount: number;
  registrosApoioCount: number;
}> {
  try {
    const jaMigrado = await getMetaKv<boolean>('migrado_de_localstorage_v1', false);
    const totalEstudantesIdb = await idbCount(STORES.ESTUDANTES);

    // Se já foi migrado e há estudantes no banco, não precisa repetir
    if (jaMigrado && totalEstudantesIdb > 0) {
      return {
        migrado: false,
        estudantesCount: totalEstudantesIdb,
        atividadesCount: await idbCount(STORES.ATIVIDADES),
        registrosApoioCount: await idbCount(STORES.REGISTROS_APOIO),
      };
    }

    console.info('Iniciando migração de dados do localStorage para o IndexedDB...');

    // 1. Estudantes
    let estudantes: Estudante[] = [];
    const lsEstudantes = localStorage.getItem('adaptaedu_estudantes');
    if (lsEstudantes) {
      try {
        estudantes = validateAndSanitizeEstudantes(JSON.parse(lsEstudantes));
      } catch (e) {
        console.warn('Erro ao ler estudantes do localStorage:', e);
      }
    }
    if (estudantes.length === 0) {
      estudantes = validateAndSanitizeEstudantes(ESTUDANTES_INICIAIS);
    }
    await idbPutMany(STORES.ESTUDANTES, estudantes);

    // 2. Registros de Apoio
    let registrosApoio: RegistroAcompanhamentoApoio[] = [];
    const lsRegistros = localStorage.getItem('adaptaedu_registros_apoio');
    if (lsRegistros) {
      try {
        registrosApoio = validateAndSanitizeRegistrosApoio(JSON.parse(lsRegistros));
      } catch (e) {
        console.warn('Erro ao ler registros de apoio do localStorage:', e);
      }
    }
    if (registrosApoio.length === 0) {
      registrosApoio = validateAndSanitizeRegistrosApoio(REGISTROS_APOIO_INICIAIS);
    }
    await idbPutMany(STORES.REGISTROS_APOIO, registrosApoio);

    // 3. Atividades Adaptadas
    let atividades: AtividadeAdaptada[] = [];
    const lsAtividades = localStorage.getItem('adaptaedu_atividades');
    if (lsAtividades) {
      try {
        atividades = validateAndSanitizeAtividades(JSON.parse(lsAtividades));
      } catch (e) {
        console.warn('Erro ao ler atividades do localStorage:', e);
      }
    }
    if (atividades.length === 0) {
      atividades = validateAndSanitizeAtividades(ATIVIDADES_INICIAIS);
    }
    await idbPutMany(STORES.ATIVIDADES, atividades);

    // 4. Perfis Pedagógicos
    let perfis: PerfilPedagogico[] = [];
    const lsPerfis = localStorage.getItem('adaptaedu_perfis');
    if (lsPerfis) {
      try {
        perfis = validateAndSanitizePerfisPedagogicos(JSON.parse(lsPerfis));
      } catch (e) {
        console.warn('Erro ao ler perfis pedagógicos do localStorage:', e);
      }
    }
    if (perfis.length === 0) {
      perfis = validateAndSanitizePerfisPedagogicos(PERFIS_PEDAGOGICOS_INICIAIS);
    }
    await idbPutMany(STORES.PERFIS_PEDAGOGICOS, perfis);

    // 5. Usuários Autorizados
    let usuarios: AuthorizedUser[] = [];
    const lsUsuarios = localStorage.getItem('adaptaedu_authorized_users');
    if (lsUsuarios) {
      try {
        usuarios = validateAndSanitizeAuthorizedUsers(JSON.parse(lsUsuarios));
      } catch (e) {
        console.warn('Erro ao ler usuários autorizados do localStorage:', e);
      }
    }
    if (usuarios.length === 0) {
      usuarios = validateAndSanitizeAuthorizedUsers(gerarUsuariosIniciaisAutorizadosDoPdf());
    }
    await idbPutMany(STORES.USUARIOS_AUTORIZADOS, usuarios);

    // 6. Configuração da Escola
    let escolaConfig: EscolaConfig = {
      ...ESCOLA_CONFIG_INICIAL,
      nome: 'Colégio Estadual Olynto Pereira de Castro',
      subtitulo: 'Secretaria de Estado da Educação - SEDUC Goiás',
    };
    const lsEscola = localStorage.getItem('adaptaedu_escola_config');
    if (lsEscola) {
      try {
        escolaConfig = validateAndSanitizeEscolaConfig(JSON.parse(lsEscola), escolaConfig);
      } catch (e) {
        console.warn('Erro ao ler escolaConfig do localStorage:', e);
      }
    }
    await idbPut(STORES.ESCOLA_CONFIG, { key: 'principal', config: escolaConfig });
    await setMetaKv('escola_config', escolaConfig);

    // 7. Matrizes Curriculares e Habilidades
    let matrizes: CurriculumMatrix[] = MATRIZES_CURRICULARES_INICIAIS;
    const lsMatrizes = localStorage.getItem('adaptaedu_matrizes');
    if (lsMatrizes) {
      try {
        const parsed = JSON.parse(lsMatrizes);
        if (Array.isArray(parsed) && parsed.length > 0) matrizes = parsed;
      } catch {}
    }
    await idbPutMany(STORES.MATRIZES_CURRICULARES, matrizes);

    let skills: CurriculumSkill[] = HABILIDADES_CURRICULARES_INICIAIS;
    const lsSkills = localStorage.getItem('adaptaedu_curriculum_skills');
    if (lsSkills) {
      try {
        const parsed = JSON.parse(lsSkills);
        if (Array.isArray(parsed) && parsed.length > 0) skills = parsed;
      } catch {}
    }
    await idbPutMany(STORES.CURRICULUM_SKILLS, skills);

    // 8. Habilidades Aprovadas
    let habilidades: HabilidadeAprovada[] = [];
    const lsHabs = localStorage.getItem('adaptaedu_habilidades');
    if (lsHabs) {
      try {
        const parsed = JSON.parse(lsHabs);
        if (Array.isArray(parsed)) habilidades = parsed;
      } catch {}
    }
    if (habilidades.length > 0) {
      await idbPutMany(STORES.HABILIDADES, habilidades);
    }

    // 9. Documentos
    let documentos: DocumentoImportado[] = [];
    const lsDocs = localStorage.getItem('adaptaedu_documentos');
    if (lsDocs) {
      try {
        const parsed = JSON.parse(lsDocs);
        if (Array.isArray(parsed)) documentos = parsed;
      } catch {}
    }
    if (documentos.length > 0) {
      await idbPutMany(STORES.DOCUMENTOS, documentos);
    }

    // 10. Histórico
    let historico: RegistroHistorico[] = [];
    const lsHist = localStorage.getItem('adaptaedu_historico');
    if (lsHist) {
      try {
        const parsed = JSON.parse(lsHist);
        if (Array.isArray(parsed)) historico = parsed;
      } catch {}
    }
    if (historico.length > 0) {
      await idbPutMany(STORES.HISTORICO, historico);
    }

    // 11. Auditoria
    let auditoria: RegistroAuditoria[] = [];
    const lsAud = localStorage.getItem('adaptaedu_auditoria');
    if (lsAud) {
      try {
        const parsed = JSON.parse(lsAud);
        if (Array.isArray(parsed)) auditoria = parsed;
      } catch {}
    }
    if (auditoria.length > 0) {
      await idbPutMany(STORES.AUDITORIA, auditoria);
    }

    // Marca como migrado
    await setMetaKv('migrado_de_localstorage_v1', true);
    await setMetaKv('data_migracao', new Date().toISOString());

    console.info(`Migração IndexedDB concluída com sucesso! (${estudantes.length} estudantes, ${atividades.length} atividades, ${registrosApoio.length} registros de apoio).`);

    return {
      migrado: true,
      estudantesCount: estudantes.length,
      atividadesCount: atividades.length,
      registrosApoioCount: registrosApoio.length,
    };
  } catch (e) {
    console.error('Erro durante migração para IndexedDB:', e);
    return {
      migrado: false,
      estudantesCount: 0,
      atividadesCount: 0,
      registrosApoioCount: 0,
    };
  }
}

// =========================================================================
// MÉTODOS ESPECÍFICOS PARA PROFISSIONAL DE APOIO E REGISTROS DE ACOMPANHAMENTO
// =========================================================================

/**
 * Salva um registro de apoio no IndexedDB.
 * Se offline, marca com syncStatus 'pending_sync' ou 'offline_created'.
 */
export async function salvarRegistroApoioIdb(
  registro: RegistroAcompanhamentoApoio,
  offline = false
): Promise<RegistroAcompanhamentoApoio> {
  const agora = new Date().toISOString();
  const registroComStatus: RegistroAcompanhamentoApoio = {
    ...registro,
    syncStatus: offline 
      ? (registro.syncStatus === 'offline_created' ? 'offline_created' : 'pending_sync') 
      : 'synced',
    lastModifiedLocally: agora,
  };

  await idbPut(STORES.REGISTROS_APOIO, registroComStatus);

  // Se estiver offline, adiciona ou atualiza na fila de sincronização
  if (offline) {
    await enfileirarItemSincronizacao({
      entity: 'registro_apoio',
      entityId: registroComStatus.id,
      operation: 'update',
      payload: registroComStatus,
    });
  }

  // Mantém espelho no localStorage para compatibilidade reversa
  try {
    const todos = await idbGetAll<RegistroAcompanhamentoApoio>(STORES.REGISTROS_APOIO);
    localStorage.setItem('adaptaedu_registros_apoio', JSON.stringify(todos));
  } catch (e) {
    console.warn('Falha ao espelhar registros_apoio no localStorage:', e);
  }

  return registroComStatus;
}

export async function salvarTodosRegistrosApoioIdb(
  registros: RegistroAcompanhamentoApoio[]
): Promise<void> {
  await idbPutMany(STORES.REGISTROS_APOIO, registros);
  try {
    localStorage.setItem('adaptaedu_registros_apoio', JSON.stringify(registros));
  } catch {}
}

export async function obterTodosRegistrosApoioIdb(): Promise<RegistroAcompanhamentoApoio[]> {
  const lista = await idbGetAll<RegistroAcompanhamentoApoio>(STORES.REGISTROS_APOIO);
  if (lista.length === 0) {
    // Tenta fallback do localStorage se IDB estiver temporariamente vazio
    const ls = localStorage.getItem('adaptaedu_registros_apoio');
    if (ls) {
      try {
        const parsed = validateAndSanitizeRegistrosApoio(JSON.parse(ls));
        if (parsed.length > 0) {
          await idbPutMany(STORES.REGISTROS_APOIO, parsed);
          return parsed;
        }
      } catch {}
    }
  }
  return lista;
}

// =========================================================================
// MÉTODOS ESPECÍFICOS PARA ESTUDANTES
// =========================================================================

export async function salvarEstudantesIdb(estudantes: Estudante[]): Promise<void> {
  await idbPutMany(STORES.ESTUDANTES, estudantes);
  try {
    localStorage.setItem('adaptaedu_estudantes', JSON.stringify(estudantes));
  } catch {}
}

export async function salvarEstudanteIdb(estudante: Estudante): Promise<void> {
  await idbPut(STORES.ESTUDANTES, estudante);
  try {
    const todos = await idbGetAll<Estudante>(STORES.ESTUDANTES);
    localStorage.setItem('adaptaedu_estudantes', JSON.stringify(todos));
  } catch {}
}

export async function obterEstudantesIdb(): Promise<Estudante[]> {
  const lista = await idbGetAll<Estudante>(STORES.ESTUDANTES);
  if (lista.length === 0) {
    const ls = localStorage.getItem('adaptaedu_estudantes');
    if (ls) {
      try {
        const parsed = validateAndSanitizeEstudantes(JSON.parse(ls));
        if (parsed.length > 0) {
          await idbPutMany(STORES.ESTUDANTES, parsed);
          return parsed;
        }
      } catch {}
    }
  }
  return lista;
}

// =========================================================================
// MÉTODOS ESPECÍFICOS PARA ATIVIDADES ADAPTADAS
// =========================================================================

export async function salvarAtividadesIdb(atividades: AtividadeAdaptada[]): Promise<void> {
  await idbPutMany(STORES.ATIVIDADES, atividades);
  try {
    localStorage.setItem('adaptaedu_atividades', JSON.stringify(atividades));
  } catch {}
}

export async function salvarAtividadeIdb(
  atividade: AtividadeAdaptada,
  isOffline = false
): Promise<AtividadeAdaptada> {
  const agora = new Date().toISOString();
  const statusSincronizacao = isOffline ? 'pending_sync' : 'synced';

  const atividadePersistida: AtividadeAdaptada = {
    ...atividade,
    syncStatus: statusSincronizacao,
    lastModifiedLocally: agora,
  };

  await idbPut(STORES.ATIVIDADES, atividadePersistida);

  // Se estiver offline, adiciona ou atualiza na fila de sincronização
  if (isOffline) {
    await enfileirarItemSincronizacao({
      entity: 'atividade',
      entityId: atividadePersistida.id,
      operation: 'update',
      payload: atividadePersistida,
    });
  }

  try {
    const todas = await idbGetAll<AtividadeAdaptada>(STORES.ATIVIDADES);
    localStorage.setItem('adaptaedu_atividades', JSON.stringify(todas));
  } catch {}

  return atividadePersistida;
}

export async function obterAtividadesIdb(): Promise<AtividadeAdaptada[]> {
  const lista = await idbGetAll<AtividadeAdaptada>(STORES.ATIVIDADES);
  if (lista.length === 0) {
    const ls = localStorage.getItem('adaptaedu_atividades');
    if (ls) {
      try {
        const parsed = validateAndSanitizeAtividades(JSON.parse(ls));
        if (parsed.length > 0) {
          await idbPutMany(STORES.ATIVIDADES, parsed);
          return parsed;
        }
      } catch {}
    }
  }
  return lista;
}

// =========================================================================
// FILA DE SINCRONIZAÇÃO OFFLINE (SYNC QUEUE)
// =========================================================================

export async function enfileirarItemSincronizacao(item: {
  entity: SyncQueueItem['entity'];
  entityId: string;
  operation: SyncQueueItem['operation'];
  payload: any;
}): Promise<SyncQueueItem> {
  const id = `sync-${item.entity}-${item.entityId}`;
  const queueItem: SyncQueueItem = {
    id,
    entity: item.entity,
    entityId: item.entityId,
    operation: item.operation,
    payload: item.payload,
    timestamp: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  };

  await idbPut(STORES.SYNC_QUEUE, queueItem);
  return queueItem;
}

export async function obterFilaSincronizacao(): Promise<SyncQueueItem[]> {
  return idbGetAll<SyncQueueItem>(STORES.SYNC_QUEUE);
}

export async function obterItensPendentesFilaSincronizacao(): Promise<SyncQueueItem[]> {
  const todos = await idbGetAll<SyncQueueItem>(STORES.SYNC_QUEUE);
  return todos.filter(item => item.status === 'pending' || item.status === 'failed');
}

export async function removerItemFilaSincronizacao(id: string): Promise<void> {
  await idbDelete(STORES.SYNC_QUEUE, id);
}

export async function atualizarStatusItemFila(
  id: string,
  status: SyncQueueItem['status'],
  erro?: string
): Promise<void> {
  const item = await idbGet<SyncQueueItem>(STORES.SYNC_QUEUE, id);
  if (!item) return;

  const atualizado: SyncQueueItem = {
    ...item,
    status,
    retryCount: status === 'failed' ? item.retryCount + 1 : item.retryCount,
    lastError: erro,
  };

  await idbPut(STORES.SYNC_QUEUE, atualizado);
}

export async function contarPendenciasFila(): Promise<number> {
  const pendentes = await obterItensPendentesFilaSincronizacao();
  return pendentes.length;
}

/**
 * Retorna status de uso e persistência do armazenamento
 */
export async function obterEstatisticasArmazenamento(): Promise<{
  quotaMb: number;
  usageMb: number;
  percentageUsed: number;
  isPersisted: boolean;
  indexedDbSupported: boolean;
}> {
  const supported = typeof window !== 'undefined' && Boolean(window.indexedDB);
  let quotaMb = 0;
  let usageMb = 0;
  let percentageUsed = 0;
  let isPersisted = false;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      quotaMb = Math.round(quota / (1024 * 1024));
      usageMb = Number((usage / (1024 * 1024)).toFixed(2));
      percentageUsed = quota > 0 ? Number(((usage / quota) * 100).toFixed(1)) : 0;
    } catch {}
  }

  if (navigator.storage && navigator.storage.persisted) {
    try {
      isPersisted = await navigator.storage.persisted();
    } catch {}
  }

  return {
    quotaMb,
    usageMb,
    percentageUsed,
    isPersisted,
    indexedDbSupported: supported,
  };
}

/**
 * Zera estritamente os lançamentos diários do apoio e as atividades geradas no IndexedDB,
 * preservando integralmente estudantes, professores, matrizes, habilidades e configurações.
 */
export async function zerarLancamentosEAtividadesIdb(): Promise<void> {
  await idbClear(STORES.ATIVIDADES);
  await idbClear(STORES.REGISTROS_APOIO);
}

