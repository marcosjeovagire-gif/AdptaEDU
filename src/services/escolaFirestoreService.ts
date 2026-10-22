import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  query,
  onSnapshot,
  getDocs,
  deleteDoc,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { EscolaConfig, AtividadeAdaptada, RegistroAcompanhamentoApoio, PeiDocumento, AuthorizedUser } from '../types';
import { SCHOOL_ID_PADRAO } from '../server/authService';
import { salvarConfiguracaoBackup } from './backupDriveService';
import { logger } from './logger';

// Inicialização segura e singleton do Firebase App, Firestore e Auth
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const databaseId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-adaptaeduescolar-93ae9046-073e-4fe5-ae85-7b963c2dbc1b';
export const firestoreDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const firestoreAuth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firestoreAuth.currentUser?.uid,
      email: firestoreAuth.currentUser?.email,
      emailVerified: firestoreAuth.currentUser?.emailVerified,
      isAnonymous: firestoreAuth.currentUser?.isAnonymous,
      tenantId: firestoreAuth.currentUser?.tenantId,
      providerInfo: firestoreAuth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  logger.error('Firestore Error', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface SalvarPreferenciasBackupParams {
  schoolId?: string;
  horario: string;
  frequencia: 'diario' | 'semanal';
  enabled?: boolean;
  escolaConfig?: EscolaConfig;
}

export interface SalvarPreferenciasBackupResult {
  success: boolean;
  message: string;
  salvoNoFirestore: boolean;
  documentPath: string;
  dadosSalvos?: any;
  error?: string;
}

/**
 * Sincroniza usuário autorizado no Firestore (/authorizedUsers/{userId})
 */
export async function sincronizarUsuarioAutorizadoNoFirestore(
  usuario: AuthorizedUser,
  firebaseUser?: FirebaseUser | null
): Promise<boolean> {
  const currentAuth = firebaseUser || firestoreAuth.currentUser;
  const uid = currentAuth?.uid || usuario.uid || usuario.id;
  if (!uid) return false;

  try {
    const docRef = doc(firestoreDb, 'authorizedUsers', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        id: usuario.id,
        uid: uid,
        name: usuario.name || (usuario as any).nome || 'Usuário',
        nome: (usuario as any).nome || usuario.name || 'Usuário',
        email: usuario.email,
        emailNormalized: usuario.emailNormalized || usuario.email.toLowerCase().trim(),
        roles: usuario.roles,
        schoolId: usuario.schoolId || SCHOOL_ID_PADRAO,
        status: 'authorized',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      logger.info('Firestore', `Usuário ${usuario.email} sincronizado em authorizedUsers/${uid}`);
    }
    return true;
  } catch (err: any) {
    logger.warn('Firestore', `Aviso ao sincronizar authorizedUsers/${uid} (tolerante a offline): ${err.message}`);
    return false;
  }
}

/**
 * Salva as preferências de backup automático no Firestore
 */
export async function salvarPreferenciasBackupNoFirestore(
  params: SalvarPreferenciasBackupParams
): Promise<SalvarPreferenciasBackupResult> {
  const schoolId = params.schoolId || params.escolaConfig?.id || SCHOOL_ID_PADRAO;
  const documentPath = `schools/${schoolId}`;
  const nowIso = new Date().toISOString();

  salvarConfiguracaoBackup({
    enabled: params.enabled !== undefined ? params.enabled : true,
    frequencyType: params.frequencia,
    specificTimes: [params.horario],
  });

  const payloadBackup = {
    horario: params.horario,
    frequencia: params.frequencia,
    enabled: params.enabled !== undefined ? params.enabled : true,
    atualizadoEm: nowIso,
    atualizadoPor: 'Coordenação Pedagógica',
  };

  const payloadDocumentoEscola: Record<string, any> = {
    id: schoolId,
    backupConfig: payloadBackup,
    backupHorario: params.horario,
    backupFrequencia: params.frequencia,
    ultimaAtualizacaoBackup: nowIso,
  };

  if (params.escolaConfig) {
    if (params.escolaConfig.nome) payloadDocumentoEscola.nome = params.escolaConfig.nome;
    if (params.escolaConfig.subtitulo) payloadDocumentoEscola.subtitulo = params.escolaConfig.subtitulo;
    if (params.escolaConfig.municipio) payloadDocumentoEscola.municipio = params.escolaConfig.municipio;
    if (params.escolaConfig.emailInstitucional) payloadDocumentoEscola.emailInstitucional = params.escolaConfig.emailInstitucional;
    if (typeof params.escolaConfig.permitirAcessoEmailSenha === 'boolean') {
      payloadDocumentoEscola.permitirAcessoEmailSenha = params.escolaConfig.permitirAcessoEmailSenha;
    }
  }

  try {
    const rawLocal = localStorage.getItem('adaptaedu_escola_config');
    const localConfig = rawLocal ? JSON.parse(rawLocal) : {};
    const mesclado = {
      ...localConfig,
      ...payloadDocumentoEscola,
      backupHorario: params.horario,
      backupFrequencia: params.frequencia,
      backupConfig: payloadBackup,
    };
    localStorage.setItem('adaptaedu_escola_config', JSON.stringify(mesclado));
  } catch (err) {
    logger.warn('Firestore', 'Erro ao sincronizar cache local de escola', err);
  }

  try {
    const docRef = doc(firestoreDb, 'schools', schoolId);
    await setDoc(
      docRef,
      {
        ...payloadDocumentoEscola,
        timestampAtualizacao: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      message: `Preferências de backup salvas no Firestore no documento '${documentPath}' com sucesso!`,
      salvoNoFirestore: true,
      documentPath,
      dadosSalvos: payloadDocumentoEscola,
    };
  } catch (error: any) {
    logger.warn('Firestore', `Falha ao gravar em '${documentPath}', mantendo em cache local: ${error.message}`);
    return {
      success: true,
      message: `Preferências salvas localmente e na fila do Firestore (${error.code || error.message || 'Offline'}).`,
      salvoNoFirestore: false,
      documentPath,
      dadosSalvos: payloadDocumentoEscola,
      error: error.message || String(error),
    };
  }
}

/**
 * Obtém as preferências salvas no documento da escola no Firestore
 */
export async function obterPreferenciasEscolaDoFirestore(
  schoolId: string = SCHOOL_ID_PADRAO
): Promise<{
  success: boolean;
  dados?: any;
  error?: string;
}> {
  try {
    const docRef = doc(firestoreDb, 'schools', schoolId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        success: true,
        dados: snap.data(),
      };
    }
    return {
      success: false,
      error: 'Documento da escola não encontrado no Firestore.',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Salva Matrizes Curriculares e Habilidades da Escola no Firestore
 */
export async function salvarMatrizesEHabilidadesNoFirestore(params: {
  schoolId?: string;
  matrizes: any[];
  habilidades: any[];
}): Promise<{ sucesso: boolean; mensagem: string; error?: string }> {
  const schoolId = params.schoolId || SCHOOL_ID_PADRAO;
  try {
    const docRef = doc(firestoreDb, 'schools', schoolId);
    await setDoc(
      docRef,
      {
        totalMatrizes: params.matrizes.length,
        totalHabilidades: params.habilidades.length,
        matrizesCurriculares: params.matrizes,
        curriculumSkills: params.habilidades,
        ultimaAtualizacaoMatriz: new Date().toISOString(),
        atualizadoPor: 'Coordenação Pedagógica - Importador Inteligente',
        timestampAtualizacao: serverTimestamp(),
      },
      { merge: true }
    );

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('adaptaedu_matrizes_curriculares', JSON.stringify(params.matrizes));
        localStorage.setItem('adaptaedu_curriculum_skills', JSON.stringify(params.habilidades));
      } catch (e) {
        logger.warn('Firestore', 'Erro ao salvar matrizes no cache local', e);
      }
    }

    return {
      sucesso: true,
      mensagem: `${params.matrizes.length} matrizes e ${params.habilidades.length} habilidades salvas com sucesso no Firestore!`,
    };
  } catch (err: any) {
    logger.warn('Firestore', `Erro ao salvar matrizes no Firestore: ${err.message}`);
    try {
      localStorage.setItem('adaptaedu_matrizes_curriculares', JSON.stringify(params.matrizes));
      localStorage.setItem('adaptaedu_curriculum_skills', JSON.stringify(params.habilidades));
    } catch {}
    return {
      sucesso: true,
      mensagem: 'Matrizes e habilidades salvas com sucesso no cache local (disponibilidade offline assegurada).',
      error: err.message,
    };
  }
}

/**
 * Salva lista de Estudantes no Firestore e sincroniza com o cache local
 */
export async function salvarEstudantesNoFirestore(params: {
  schoolId?: string;
  estudantes: any[];
}): Promise<{ sucesso: boolean; mensagem: string; error?: string }> {
  const schoolId = params.schoolId || SCHOOL_ID_PADRAO;
  try {
    const docRef = doc(firestoreDb, 'schools', schoolId);
    await setDoc(
      docRef,
      {
        totalEstudantes: params.estudantes.length,
        estudantesOficiais: params.estudantes,
        ultimaAtualizacaoEstudantes: new Date().toISOString(),
        timestampAtualizacao: serverTimestamp(),
      },
      { merge: true }
    );

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('adaptaedu_estudantes', JSON.stringify(params.estudantes));
      } catch (e) {
        logger.warn('Firestore', 'Erro ao salvar estudantes no cache local', e);
      }
    }

    return {
      sucesso: true,
      mensagem: `${params.estudantes.length} estudantes sincronizados com sucesso no Firestore!`,
    };
  } catch (err: any) {
    logger.warn('Firestore', `Erro ao salvar estudantes no Firestore: ${err.message}`);
    try {
      localStorage.setItem('adaptaedu_estudantes', JSON.stringify(params.estudantes));
    } catch {}
    return {
      sucesso: true,
      mensagem: 'Estudantes salvos no cache local do navegador.',
      error: err.message,
    };
  }
}

/**
 * Salva ou atualiza uma atividade adaptada no Firestore
 */
export async function salvarAtividadeNoFirestore(atividade: AtividadeAdaptada): Promise<{ sucesso: boolean; id: string; error?: string }> {
  try {
    const docRef = doc(firestoreDb, 'activities', atividade.id);
    await setDoc(
      docRef,
      {
        ...atividade,
        atualizadoEmFirestore: serverTimestamp(),
      },
      { merge: true }
    );
    logger.info('Firestore', `Atividade ${atividade.id} sincronizada no Firestore`);
    return { sucesso: true, id: atividade.id };
  } catch (err: any) {
    logger.warn('Firestore', `Erro ao sincronizar atividade ${atividade.id} na nuvem: ${err.message}`);
    return { sucesso: false, id: atividade.id, error: err.message || String(err) };
  }
}

/**
 * Salva ou atualiza um registro de apoio no Firestore
 */
export async function salvarRegistroApoioNoFirestore(registro: RegistroAcompanhamentoApoio): Promise<{ sucesso: boolean; id: string; error?: string }> {
  try {
    const docRef = doc(firestoreDb, 'supportRecords', registro.id);
    await setDoc(
      docRef,
      {
        ...registro,
        atualizadoEmFirestore: serverTimestamp(),
      },
      { merge: true }
    );
    logger.info('Firestore', `Registro de apoio ${registro.id} sincronizado no Firestore`);
    return { sucesso: true, id: registro.id };
  } catch (err: any) {
    logger.warn('Firestore', `Erro ao sincronizar registro de apoio ${registro.id} na nuvem: ${err.message}`);
    return { sucesso: false, id: registro.id, error: err.message || String(err) };
  }
}

/**
 * Salva ou atualiza um documento PEI no Firestore
 */
export async function salvarPeiNoFirestore(pei: PeiDocumento): Promise<{ sucesso: boolean; id: string; error?: string }> {
  try {
    const docRef = doc(firestoreDb, 'peis', pei.id);
    await setDoc(
      docRef,
      {
        ...pei,
        atualizadoEmFirestore: serverTimestamp(),
      },
      { merge: true }
    );
    logger.info('Firestore', `PEI ${pei.id} sincronizado no Firestore`);
    return { sucesso: true, id: pei.id };
  } catch (err: any) {
    logger.warn('Firestore', `Erro ao sincronizar PEI ${pei.id} na nuvem: ${err.message}`);
    return { sucesso: false, id: pei.id, error: err.message || String(err) };
  }
}

/**
 * Listener em tempo real para sincronização de Atividades Adaptadas entre múltiplos dispositivos.
 * Garante que só seja anexado quando houver autenticação válida, evitando permission errors.
 */
export function ouvirAtividadesDoFirestore(
  onUpdate: (atividades: AtividadeAdaptada[]) => void,
  onError?: (error: Error) => void
): () => void {
  let unsubFirestore: Unsubscribe | null = null;
  let isSubscribed = true;

  const iniciarListenerFirestore = () => {
    if (!isSubscribed) return;
    try {
      const q = query(collection(firestoreDb, 'activities'));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const lista: AtividadeAdaptada[] = [];
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              lista.push(docSnap.data() as AtividadeAdaptada);
            }
          });
          onUpdate(lista);
        },
        (error) => {
          logger.info('Firestore', 'Conexão em tempo real de atividades pausada (modo offline ativo)', error.message);
          if (onError) onError(error);
        }
      );
    } catch (err: any) {
      logger.warn('Firestore', 'Falha ao iniciar listener de atividades', err);
    }
  };

  // Observa ciclo de autenticação: anexa somente quando autenticado
  const unsubAuth = onAuthStateChanged(firestoreAuth, (user) => {
    if (user) {
      if (!unsubFirestore) {
        iniciarListenerFirestore();
      }
    } else {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
    }
  });

  return () => {
    isSubscribed = false;
    unsubAuth();
    if (unsubFirestore) {
      unsubFirestore();
      unsubFirestore = null;
    }
  };
}

/**
 * Listener em tempo real para sincronização de Registros de Apoio entre múltiplos dispositivos.
 * Garante que só seja anexado quando houver autenticação válida.
 */
export function ouvirRegistrosApoioDoFirestore(
  onUpdate: (registros: RegistroAcompanhamentoApoio[]) => void,
  onError?: (error: Error) => void
): () => void {
  let unsubFirestore: Unsubscribe | null = null;
  let isSubscribed = true;

  const iniciarListenerFirestore = () => {
    if (!isSubscribed) return;
    try {
      const q = query(collection(firestoreDb, 'supportRecords'));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const lista: RegistroAcompanhamentoApoio[] = [];
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              lista.push(docSnap.data() as RegistroAcompanhamentoApoio);
            }
          });
          onUpdate(lista);
        },
        (error) => {
          logger.info('Firestore', 'Conexão em tempo real de registros de apoio pausada (modo offline ativo)', error.message);
          if (onError) onError(error);
        }
      );
    } catch (err: any) {
      logger.warn('Firestore', 'Falha ao iniciar listener de apoio', err);
    }
  };

  const unsubAuth = onAuthStateChanged(firestoreAuth, (user) => {
    if (user) {
      if (!unsubFirestore) {
        iniciarListenerFirestore();
      }
    } else {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
    }
  });

  return () => {
    isSubscribed = false;
    unsubAuth();
    if (unsubFirestore) {
      unsubFirestore();
      unsubFirestore = null;
    }
  };
}

/**
 * Listener em tempo real para sincronização de PEIs entre múltiplos dispositivos
 */
export function ouvirPeisDoFirestore(
  onUpdate: (peis: PeiDocumento[]) => void,
  onError?: (error: Error) => void
): () => void {
  let unsubFirestore: Unsubscribe | null = null;
  let isSubscribed = true;

  const iniciarListenerFirestore = () => {
    if (!isSubscribed) return;
    try {
      const q = query(collection(firestoreDb, 'peis'));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const lista: PeiDocumento[] = [];
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              lista.push(docSnap.data() as PeiDocumento);
            }
          });
          if (lista.length > 0) {
            onUpdate(lista);
          }
        },
        (error) => {
          logger.info('Firestore', 'Conexão em tempo real de PEIs pausada (modo offline ativo)', error.message);
          if (onError) onError(error);
        }
      );
    } catch (err: any) {
      logger.warn('Firestore', 'Falha ao iniciar listener de PEIs', err);
    }
  };

  const unsubAuth = onAuthStateChanged(firestoreAuth, (user) => {
    if (user) {
      if (!unsubFirestore) {
        iniciarListenerFirestore();
      }
    } else {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
    }
  });

  return () => {
    isSubscribed = false;
    unsubAuth();
    if (unsubFirestore) {
      unsubFirestore();
      unsubFirestore = null;
    }
  };
}

/**
 * Exclui todas as atividades geradas da coleção 'activities' no Cloud Firestore
 */
export async function excluirTodasAtividadesDoFirestore(): Promise<number> {
  try {
    const q = query(collection(firestoreDb, 'activities'));
    const snap = await getDocs(q);
    let count = 0;
    const deletes = snap.docs.map(async (d) => {
      await deleteDoc(d.ref);
      count++;
    });
    await Promise.all(deletes);
    return count;
  } catch (err) {
    logger.warn('Firestore', 'Aviso ao limpar coleção activities no Firestore (tolerante a offline)', err);
    return 0;
  }
}

/**
 * Exclui todos os registros de acompanhamento da coleção 'supportRecords' no Cloud Firestore
 */
export async function excluirTodosRegistrosApoioDoFirestore(): Promise<number> {
  try {
    const q = query(collection(firestoreDb, 'supportRecords'));
    const snap = await getDocs(q);
    let count = 0;
    const deletes = snap.docs.map(async (d) => {
      await deleteDoc(d.ref);
      count++;
    });
    await Promise.all(deletes);
    return count;
  } catch (err) {
    logger.warn('Firestore', 'Aviso ao limpar coleção supportRecords no Firestore (tolerante a offline)', err);
    return 0;
  }
}
