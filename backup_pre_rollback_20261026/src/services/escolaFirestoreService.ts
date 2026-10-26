import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  orderBy,
  getDocs,
  deleteDoc,
  Unsubscribe
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Estudante, AtividadeAdaptada, RegistroAcompanhamentoApoio, PeiDocumento, AuthorizedUser, EscolaConfig } from '../types';
import { SCHOOL_ID_PADRAO } from '../server/authService';

/**
 * SINCRONIZAÇÃO EM TEMPO REAL (REQUISITO 1)
 * Gerencia o estado live da aplicação entre múltiplos computadores.
 */

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestoreDb = getFirestore(app);
export const firestoreAuth = getAuth(app);
const db = firestoreDb;

// --- FUNÇÕES DE SINCRONIZAÇÃO ORIGINAIS (RESTAURADAS PARA COMPATIBILIDADE) ---

export async function sincronizarUsuarioAutorizadoNoFirestore(
  usuario: AuthorizedUser,
  firebaseUser?: FirebaseUser | null
): Promise<boolean> {
  const currentAuth = firebaseUser || firestoreAuth.currentUser;
  const uid = currentAuth?.uid || usuario.uid || usuario.id;
  if (!uid) return false;

  try {
    const docRef = doc(db, 'authorizedUsers', uid);
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
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    return true;
  } catch (err) {
    return false;
  }
}

export async function salvarPreferenciasBackupNoFirestore(params: {
  schoolId?: string;
  horario: string;
  frequencia: 'diario' | 'semanal';
  enabled?: boolean;
  escolaConfig?: EscolaConfig;
}): Promise<any> {
  const schoolId = params.schoolId || params.escolaConfig?.id || SCHOOL_ID_PADRAO;
  const docRef = doc(db, 'schools', schoolId);
  
  const payload = {
    id: schoolId,
    backupConfig: {
      horario: params.horario,
      frequencia: params.frequencia,
      enabled: params.enabled !== undefined ? params.enabled : true,
      updatedAt: serverTimestamp()
    },
    updatedAt: serverTimestamp()
  };

  await setDoc(docRef, payload, { merge: true });
  return { success: true };
}

export async function obterPreferenciasEscolaDoFirestore(schoolId: string = SCHOOL_ID_PADRAO) {
  const docRef = doc(db, 'schools', schoolId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return { success: true, dados: snap.data() };
  return { success: false };
}

export async function salvarMatrizesEHabilidadesNoFirestore(params: {
  schoolId?: string;
  matrizes: any[];
  habilidades: any[];
}) {
  const schoolId = params.schoolId || SCHOOL_ID_PADRAO;
  const docRef = doc(db, 'schools', schoolId);
  await setDoc(docRef, {
    matrizesCurriculares: params.matrizes,
    curriculumSkills: params.habilidades,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return { sucesso: true };
}

export async function salvarEstudantesNoFirestore(params: {
  schoolId?: string;
  estudantes: any[];
}) {
  const schoolId = params.schoolId || SCHOOL_ID_PADRAO;
  const docRef = doc(db, 'schools', schoolId);
  await setDoc(docRef, {
    estudantesOficiais: params.estudantes,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return { sucesso: true };
}

// --- MÉTODOS DE CLASSE (REQUISITO 1) ---

export class EscolaFirestoreService {
  
  static async salvarEstudante(estudante: Estudante) {
    const docRef = doc(db, 'students', estudante.id);
    await setDoc(docRef, {
      ...estudante,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  static ouvirEstudantes(callback: (estudantes: Estudante[]) => void) {
    const q = query(collection(db, 'students'), orderBy('nome'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as Estudante);
      callback(docs);
    });
  }

  static async salvarPei(pei: PeiDocumento) {
    const docRef = doc(db, 'peis', pei.id);
    await setDoc(docRef, {
      ...pei,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  static ouvirPeis(estudanteId: string, callback: (peis: PeiDocumento[]) => void) {
    const q = query(
      collection(db, 'peis'), 
      where('studentId', '==', estudanteId),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as PeiDocumento);
      callback(docs);
    });
  }

  static async atualizarStatusAtividade(atividadeId: string, status: string) {
    const docRef = doc(db, 'activities', atividadeId);
    await setDoc(docRef, { status, updatedAt: serverTimestamp() }, { merge: true });
  }

  static ouvirAtividades(callback: (atividades: AtividadeAdaptada[]) => void) {
    const q = query(collection(db, 'activities'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as AtividadeAdaptada);
      callback(docs);
    });
  }

  static async salvarRegistroApoio(registro: RegistroAcompanhamentoApoio) {
    const docRef = doc(db, 'supportRecords', registro.id);
    await setDoc(docRef, {
      ...registro,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  static ouvirRegistrosApoio(estudanteId: string, callback: (regs: RegistroAcompanhamentoApoio[]) => void) {
    const q = query(
      collection(db, 'supportRecords'), 
      where('studentId', '==', estudanteId),
      orderBy('data', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as RegistroAcompanhamentoApoio);
      callback(docs);
    });
  }
}

// --- EXPORTS DE COMPATIBILIDADE ---
export const firestoreSync = EscolaFirestoreService;

export const salvarAtividadeNoFirestore = async (a: AtividadeAdaptada) => {
  const docRef = doc(db, 'activities', a.id);
  await setDoc(docRef, { ...a, updatedAt: serverTimestamp() }, { merge: true });
};

export const salvarRegistroApoioNoFirestore = async (r: RegistroAcompanhamentoApoio) => {
  const docRef = doc(db, 'supportRecords', r.id);
  await setDoc(docRef, { ...r, updatedAt: serverTimestamp() }, { merge: true });
};

export const salvarPeiNoFirestore = async (p: PeiDocumento) => {
  const docRef = doc(db, 'peis', p.id);
  await setDoc(docRef, { ...p, updatedAt: serverTimestamp() }, { merge: true });
};

// Listeners com nome antigo para UI
export const ouvirAtividadesDoFirestore = (cb: (a: AtividadeAdaptada[]) => void) => {
  return firestoreSync.ouvirAtividades(cb);
};

export const ouvirRegistrosApoioDoFirestore = (cb: (r: RegistroAcompanhamentoApoio[]) => void) => {
  // O componente pode estar chamando sem o estudanteId para pegar todos
  const q = query(collection(db, 'supportRecords'), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(d => d.data() as RegistroAcompanhamentoApoio);
    cb(docs);
  });
};

export const ouvirPeisDoFirestore = (cb: (p: PeiDocumento[]) => void) => {
  const q = query(collection(db, 'peis'), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(d => d.data() as PeiDocumento);
    cb(docs);
  });
};

export async function excluirTodasAtividadesDoFirestore() {
  const q = query(collection(db, 'activities'));
  const snap = await getDocs(q);
  const deletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
}

export async function excluirTodosRegistrosApoioDoFirestore() {
  const q = query(collection(db, 'supportRecords'));
  const snap = await getDocs(q);
  const deletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
}
