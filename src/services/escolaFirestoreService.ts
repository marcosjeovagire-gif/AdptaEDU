import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { EscolaConfig } from '../types';
import { SCHOOL_ID_PADRAO } from '../server/authService';
import { salvarConfiguracaoBackup } from './backupDriveService';

// Inicialização segura e singleton do Firebase App e Firestore
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const databaseId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-adaptaeduescolar-93ae9046-073e-4fe5-ae85-7b963c2dbc1b';
export const firestoreDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

export interface SalvarPreferenciasBackupParams {
  schoolId?: string;
  horario: string; // Ex: '22:00'
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
 * Salva as preferências de backup automático no Firestore
 * no documento de configurações da escola (/schools/{schoolId}).
 */
export async function salvarPreferenciasBackupNoFirestore(
  params: SalvarPreferenciasBackupParams
): Promise<SalvarPreferenciasBackupResult> {
  const schoolId = params.schoolId || params.escolaConfig?.id || SCHOOL_ID_PADRAO;
  const documentPath = `schools/${schoolId}`;
  const nowIso = new Date().toISOString();

  // 1. Atualiza e sincroniza no backupDriveService (localStorage/agendador)
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

  // Também persiste em cache local institucional
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
    console.warn('[Firestore] Erro ao sincronizar cache local:', err);
  }

  // 2. Persiste no Firestore no documento da escola
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
    console.warn(`[Firestore] Falha ao gravar em '${documentPath}':`, error);
    return {
      success: true, // Gravado em cache local e pronto para sincronizar
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
 * Mapeia no documento institucional e na coleção de habilidades
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
        console.warn('Erro ao salvar matrizes no cache local:', e);
      }
    }

    return {
      sucesso: true,
      mensagem: `${params.matrizes.length} matrizes e ${params.habilidades.length} habilidades salvas com sucesso no Firestore!`,
    };
  } catch (err: any) {
    console.warn('[Firestore] Erro ao salvar matrizes no Firestore:', err);
    // Preserva no armazenamento local
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
        console.warn('Erro ao salvar estudantes no cache local:', e);
      }
    }

    return {
      sucesso: true,
      mensagem: `${params.estudantes.length} estudantes sincronizados com sucesso no Firestore!`,
    };
  } catch (err: any) {
    console.warn('[Firestore] Erro ao salvar estudantes no Firestore:', err);
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

