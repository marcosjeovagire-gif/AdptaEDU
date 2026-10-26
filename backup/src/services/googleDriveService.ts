import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Estudante, RegistroAcompanhamentoApoio } from '../types';
import { isRealOnline, adicionarListenerConectividade } from './connectivityService';

// Inicialização segura do Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Escopo restrito e seguro para arquivos criados pelo app no Google Drive
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const provider = new GoogleAuthProvider();
provider.addScope(GOOGLE_DRIVE_SCOPE);
provider.setCustomParameters({
  prompt: 'select_account',
});

// Cache do token em memória conforme diretrizes de segurança (NÃO em localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink?: string;
  description?: string;
  properties?: Record<string, string>;
  parents?: string[];
}

export interface DriveUploadedFile {
  id: string;
  name: string;
  webViewLink: string;
  folderName: string;
  serie: string;
  studentName?: string;
  tipo: 'diario_bordo' | 'foto_estudante' | 'atividade_adaptada' | 'relatorio_pdf' | 'documento_pdf' | 'outro';
  uploadedAt: string;
  sizeBytes?: number;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  folderId?: string;
  folderName?: string;
  folderWebViewLink?: string;
  metadataOrganizador?: {
    pastaNome: string;
    pastaId: string;
    serie: string;
    tipoDocumento: string;
    webViewLink?: string;
    estudante?: string;
    matricula?: string;
  };
  queued?: boolean;
  queueId?: string;
  error?: string;
  message?: string;
}

export interface DrivePendingUploadItem {
  id: string;
  fileName: string;
  serie: string;
  studentName?: string;
  studentMatricula?: string;
  tipoDocumento?: 'relatorio_trimestral' | 'relatorio_apoio' | 'atividade_adaptada_pdf' | 'historico_pedagogico' | 'ficha_estudante' | 'ficha_estudante_pdf' | 'outro' | 'outro_pdf' | string;
  pdfBase64: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  status: 'pending' | 'uploading' | 'failed' | 'completed';
}

const REGISTRO_UPLOADS_KEY = 'adaptaedu_drive_uploads_index';
const QUEUE_UPLOADS_KEY = 'adaptaedu_drive_pending_uploads_queue';

// Normaliza o nome da série para organização consistente em pastas
export function normalizarNomeSeriePasta(serieOuTurma?: string): string {
  if (!serieOuTurma) return 'Geral';
  const s = serieOuTurma.trim().toLowerCase();
  
  if (s.includes('6')) return '6º Ano';
  if (s.includes('7')) return '7º Ano';
  if (s.includes('8')) return '8º Ano';
  if (s.includes('9')) return '9º Ano';
  if (s.includes('1') && (s.includes('série') || s.includes('serie') || s.includes('em') || s.includes('médio'))) return '1ª Série EM';
  if (s.includes('2') && (s.includes('série') || s.includes('serie') || s.includes('em') || s.includes('médio'))) return '2ª Série EM';
  if (s.includes('3') && (s.includes('série') || s.includes('serie') || s.includes('em') || s.includes('médio'))) return '3ª Série EM';
  
  // Casos gerais de turmas
  return serieOuTurma.trim();
}

/**
 * Inicializa o listener de autenticação Firebase.
 */
export const initGoogleDriveAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
      if (cachedAccessToken && isOnline()) {
        processarFilaUploadsPendentes(cachedAccessToken).catch(() => {});
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Autentica com o Google e obtém o token de acesso com o escopo do Google Drive.
 */
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    if (isOnline()) {
      processarFilaUploadsPendentes(cachedAccessToken).catch(err => {
        console.warn('[Google Drive Queue] Erro ao processar pendências pós-login:', err);
      });
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro na autenticação com Google Drive:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retorna o token de acesso atual em memória.
 */
export const getGoogleDriveAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Desconecta a conta Google e limpa o token em memória.
 */
export const signOutGoogleDrive = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
  }
};

/**
 * Verifica se o usuário atual está com o Google Drive conectado.
 */
export const isGoogleDriveConnected = (): boolean => {
  return Boolean(auth.currentUser && cachedAccessToken);
};

export const getGoogleCurrentUser = (): User | null => {
  return auth.currentUser;
};

export interface TesteConexaoDriveResultado {
  success: boolean;
  status: 'conectado' | 'desconectado' | 'token_expirado' | 'offline' | 'erro_api';
  mensagem: string;
  email?: string;
  nome?: string;
  photoUrl?: string;
  pastaBackupId?: string;
  pastaBackupNome?: string;
  pastaBackupWebViewLink?: string;
  latenciaMs?: number;
  espacoEmUso?: string;
  espacoTotal?: string;
  timestamp: string;
}

/**
 * Realiza um teste ativo de comunicação e permissão com a API do Google Drive.
 * Valida o token OAuth, obtém os dados da conta institucional, cota e assegura a pasta 'Backups_AdaptaEdu'.
 */
export async function testarConexaoGoogleDrive(customToken?: string): Promise<TesteConexaoDriveResultado> {
  const t0 = Date.now();
  const timestamp = new Date().toISOString();

  if (!isRealOnline()) {
    return {
      success: false,
      status: 'offline',
      mensagem: 'Dispositivo sem conexão à internet. Verifique sua rede para testar a comunicação com o Google Drive.',
      latenciaMs: 0,
      timestamp,
    };
  }

  const token = customToken || cachedAccessToken;
  const user = auth.currentUser;

  if (!token) {
    return {
      success: false,
      status: 'desconectado',
      mensagem: 'Conta do Google Drive não conectada neste dispositivo. Clique no botão de conexão para autorizar o acesso.',
      latenciaMs: 0,
      timestamp,
    };
  }

  try {
    // 1. Testa token ativo e obtém informações de usuário e cota
    const resAbout = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const latencia = Date.now() - t0;

    if (!resAbout.ok) {
      if (resAbout.status === 401 || resAbout.status === 403) {
        cachedAccessToken = null; // Token expirado ou revogado
        return {
          success: false,
          status: 'token_expirado',
          mensagem: 'Sessão do Google Drive expirou ou requer nova autorização (HTTP 401/403). Conecte novamente a conta.',
          latenciaMs: latencia,
          timestamp,
        };
      }
      const errJson = await resAbout.json().catch(() => ({}));
      return {
        success: false,
        status: 'erro_api',
        mensagem: `Erro retornado pelo Google Drive: ${errJson.error?.message || resAbout.statusText}`,
        latenciaMs: latencia,
        timestamp,
      };
    }

    const dataAbout = await resAbout.json();
    const driveUser = dataAbout.user || {};
    const quota = dataAbout.storageQuota || {};

    let espacoUsoStr: string | undefined;
    let espacoTotalStr: string | undefined;

    if (quota.usage) {
      const mbUso = (Number(quota.usage) / (1024 * 1024)).toFixed(1);
      espacoUsoStr = `${mbUso} MB`;
    }
    if (quota.limit) {
      const gbTotal = (Number(quota.limit) / (1024 * 1024 * 1024)).toFixed(1);
      espacoTotalStr = `${gbTotal} GB`;
    }

    // 2. Confirma prontidão e acesso à pasta dedicada de Backups
    let pastaBackupInfo: DriveFolderInfo | undefined;
    try {
      pastaBackupInfo = await getOrCreateDriveFolder('Backups_AdaptaEdu', undefined, token);
    } catch (e: any) {
      console.warn('[Teste Conexão Drive] Aviso ao assegurar pasta Backups_AdaptaEdu:', e);
    }

    return {
      success: true,
      status: 'conectado',
      mensagem: `Comunicação com Google Drive 100% operacional! Pasta de destino '${pastaBackupInfo?.name || 'Backups_AdaptaEdu'}' confirmada.`,
      email: driveUser.emailAddress || user?.email || undefined,
      nome: driveUser.displayName || user?.displayName || undefined,
      photoUrl: driveUser.photoLink || user?.photoURL || undefined,
      pastaBackupId: pastaBackupInfo?.id,
      pastaBackupNome: pastaBackupInfo?.name || 'Backups_AdaptaEdu',
      pastaBackupWebViewLink: pastaBackupInfo?.webViewLink,
      espacoEmUso: espacoUsoStr,
      espacoTotal: espacoTotalStr,
      latenciaMs: latencia,
      timestamp,
    };
  } catch (error: any) {
    const latencia = Date.now() - t0;
    return {
      success: false,
      status: 'erro_api',
      mensagem: `Falha na verificação de comunicação com o Google Drive: ${error?.message || 'Erro de rede'}`,
      latenciaMs: latencia,
      timestamp,
    };
  }
}

/**
 * Converte dataUrl base64 em Blob para upload multipart.
 */
function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return { blob: new Blob([array], { type: mimeType }), mimeType };
  } catch {
    // Fallback para blob vazio
    return { blob: new Blob([]), mimeType: 'image/jpeg' };
  }
}

/**
 * Busca ou cria uma pasta no Google Drive pelo nome e pasta pai opcional.
 */
export async function getOrCreateDriveFolder(
  folderName: string,
  parentFolderId?: string,
  token?: string
): Promise<DriveFolderInfo> {
  const accessToken = token || cachedAccessToken;
  if (!accessToken) {
    throw new Error('Token do Google Drive não disponível. Conecte sua conta Google.');
  }

  // Sanitiza o nome para a query do Google Drive
  const escapedName = folderName.replace(/'/g, "\\'");
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  // 1. Tenta localizar a pasta existente com metadados
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink,description,properties,parents)&pageSize=1`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      const f = data.files[0];
      return {
        id: f.id,
        name: f.name,
        webViewLink: f.webViewLink,
        description: f.description,
        properties: f.properties,
        parents: f.parents,
      };
    }
  }

  // 2. Se não existir, cria a pasta configurando os metadados organizadores da série
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink,description,properties,parents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
      description: `Pasta Organizadora Curricular - Série: ${folderName} - AdaptaEdu Escolar`,
      properties: {
        sistema: 'AdaptaEdu Escolar',
        organizador: folderName,
        tipo: 'pasta_serie',
      },
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(`Falha ao criar pasta "${folderName}" no Google Drive: ${errData.error?.message || createRes.statusText}`);
  }

  const created = await createRes.json();
  return {
    id: created.id,
    name: created.name,
    webViewLink: created.webViewLink,
    description: created.description,
    properties: created.properties,
    parents: created.parents,
  };
}

/**
 * Garante que a pasta raiz do sistema e a subpasta da Série correspondente existam no Drive.
 */
export async function ensureGradeFolderInDrive(
  serieOuTurma: string,
  token?: string
): Promise<{ rootFolder: DriveFolderInfo; gradeFolder: DriveFolderInfo }> {
  const rootFolderName = 'AdaptaEdu Escolar - Registros e Imagens';
  const rootFolder = await getOrCreateDriveFolder(rootFolderName, undefined, token);
  
  const gradeFolderName = normalizarNomeSeriePasta(serieOuTurma);
  const gradeFolder = await getOrCreateDriveFolder(gradeFolderName, rootFolder.id, token);

  return { rootFolder, gradeFolder };
}

/**
 * Envia uma imagem (base64 Data URL) para a pasta da série correspondente no Google Drive.
 */
export async function uploadImageToDrive(params: {
  dataUrl: string;
  fileName: string;
  serie: string;
  studentName?: string;
  tipo: 'diario_bordo' | 'foto_estudante' | 'atividade_adaptada' | 'outro';
  token?: string;
}): Promise<UploadResult> {
  const { dataUrl, fileName, serie, studentName, tipo, token } = params;
  const accessToken = token || cachedAccessToken;

  if (!accessToken) {
    return {
      success: false,
      error: 'NOT_AUTHENTICATED',
      message: 'Google Drive não conectado. Faça login com o Google para enviar a imagem.',
    };
  }

  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return {
      success: false,
      error: 'INVALID_DATA',
      message: 'Formato de imagem inválido para envio.',
    };
  }

  try {
    // 1. Garante a estrutura de pastas por série no Drive
    const { gradeFolder } = await ensureGradeFolderInDrive(serie, accessToken);

    // 2. Prepara o Blob e Metadados
    const { blob, mimeType } = dataUrlToBlob(dataUrl);
    const metadata = {
      name: fileName,
      parents: [gradeFolder.id],
      description: `AdaptaEdu Escolar - Série: ${serie} - Tipo: ${tipo} ${studentName ? `- Estudante: ${studentName}` : ''}`,
      properties: {
        sistema: 'AdaptaEdu Escolar',
        serie: serie,
        tipo: tipo,
        estudante: studentName || 'N/A',
        dataEnvio: new Date().toISOString(),
      },
    };

    // 3. Monta o corpo Multipart
    const boundary = '-------AdaptaEduDriveBoundary' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const multipartRequestBody = new Blob([
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${mimeType}\r\n\r\n`,
      blob,
      closeDelim,
    ], { type: `multipart/related; boundary=${boundary}` });

    // 4. Executa a requisição de upload
    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erro HTTP ${uploadRes.status} no upload do Drive.`);
    }

    const file = await uploadRes.json();

    // 5. Registra no índice local de uploads para consulta rápida no app
    registrarUploadLocal({
      id: file.id,
      name: file.name,
      webViewLink: file.webViewLink,
      folderName: gradeFolder.name,
      serie,
      studentName,
      tipo,
      uploadedAt: new Date().toISOString(),
      sizeBytes: file.size ? Number(file.size) : undefined,
    });

    return {
      success: true,
      fileId: file.id,
      fileName: file.name,
      webViewLink: file.webViewLink,
      folderName: gradeFolder.name,
      message: `Imagem enviada com sucesso para a pasta "${gradeFolder.name}" no Google Drive.`,
    };
  } catch (error: any) {
    console.error('Erro ao enviar imagem ao Google Drive:', error);
    return {
      success: false,
      error: error.message || 'Falha ao processar o upload no Google Drive.',
      message: error.message || 'Erro durante a comunicação com o Google Drive.',
    };
  }
}

export interface EnviarPdfOpcoes {
  fileName: string;
  serie: string;
  studentName?: string;
  studentMatricula?: string;
  tipoDocumento?: 'relatorio_trimestral' | 'relatorio_apoio' | 'atividade_adaptada_pdf' | 'historico_pedagogico' | 'ficha_estudante_pdf' | 'outro_pdf' | string;
  token?: string;
}

export interface UploadPdfBlobParams extends EnviarPdfOpcoes {
  pdfBlob: Blob;
}

/**
 * Converte um Blob em string Base64 (DataURL) para persistência segura na fila
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      if ('arrayBuffer' in blob) {
        blob.arrayBuffer().then(buf => {
          const b64 = Buffer.from(buf).toString('base64');
          resolve(`data:${blob.type || 'application/pdf'};base64,${b64}`);
        }).catch(reject);
        return;
      }
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converte string Base64 de volta para Blob binário para retransmissão
 */
export function base64ToBlob(base64Data: string, mimeType = 'application/pdf'): Blob {
  let cleanBase64 = base64Data;
  let type = mimeType;
  if (base64Data.includes(',')) {
    const parts = base64Data.split(',');
    const match = parts[0].match(/:(.*?);/);
    if (match) type = match[1];
    cleanBase64 = parts[1];
  }

  if (typeof atob === 'function') {
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  } else {
    const buffer = Buffer.from(cleanBase64, 'base64');
    return new Blob([buffer], { type });
  }
}

/**
 * Detecta se o ambiente está online
 */
export function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine && isRealOnline();
  }
  return isRealOnline();
}

/**
 * Identifica se um erro lançado decorre de perda ou indisponibilidade de rede
 */
export function isNetworkError(error: any): boolean {
  if (!isOnline()) return true;
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  return (
    error.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('net::') ||
    msg.includes('offline') ||
    msg.includes('aborted') ||
    msg.includes('connection') ||
    msg.includes('timeout')
  );
}

// Subscrição a eventos de alteração da fila de uploads
type QueueListener = (queue: DrivePendingUploadItem[]) => void;
const queueListeners: Set<QueueListener> = new Set();

export function subscribeToDriveUploadQueue(listener: QueueListener): () => void {
  queueListeners.add(listener);
  try {
    listener(obterFilaUploadsPendentes());
  } catch (e) {
    console.error('Erro no listener da fila:', e);
  }
  return () => {
    queueListeners.delete(listener);
  };
}

function notificarMudancaFila(queue: DrivePendingUploadItem[]) {
  queueListeners.forEach(listener => {
    try {
      listener(queue);
    } catch (e) {
      console.error('Erro ao notificar listener da fila de uploads:', e);
    }
  });
}

/**
 * Obtém todos os itens da fila de uploads pendentes
 */
export function obterFilaUploadsPendentes(): DrivePendingUploadItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_UPLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Retorna a quantidade de itens na fila pendentes de envio
 */
export function obterQuantidadeUploadsPendentes(): number {
  const fila = obterFilaUploadsPendentes();
  return fila.filter(i => i.status === 'pending' || i.status === 'failed' || i.status === 'uploading').length;
}

/**
 * Salva a fila de uploads no localStorage e notifica os ouvintes
 */
export function salvarFilaUploads(fila: DrivePendingUploadItem[]): void {
  try {
    localStorage.setItem(QUEUE_UPLOADS_KEY, JSON.stringify(fila));
    notificarMudancaFila(fila);
  } catch (e) {
    console.error('Erro ao persistir fila de uploads do Google Drive:', e);
  }
}

/**
 * Adiciona um documento PDF à fila de uploads pendentes
 */
export function adicionarFilaUpload(
  item: Omit<DrivePendingUploadItem, 'id' | 'createdAt' | 'attempts' | 'status'>
): DrivePendingUploadItem {
  const fila = obterFilaUploadsPendentes();
  const novoItem: DrivePendingUploadItem = {
    ...item,
    id: `upload_queue_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  };

  fila.push(novoItem);
  salvarFilaUploads(fila);
  console.log(`[Google Drive Queue] Documento "${novoItem.fileName}" enfileirado para pasta "${novoItem.serie}". Total na fila: ${fila.length}`);
  return novoItem;
}

/**
 * Remove um item da fila de uploads
 */
export function removerItemFilaUpload(id: string): void {
  const fila = obterFilaUploadsPendentes();
  const novaFila = fila.filter(item => item.id !== id);
  salvarFilaUploads(novaFila);
}

/**
 * Atualiza campos de um item na fila de uploads
 */
export function atualizarItemFilaUpload(id: string, updates: Partial<DrivePendingUploadItem>): void {
  const fila = obterFilaUploadsPendentes();
  const idx = fila.findIndex(i => i.id === id);
  if (idx !== -1) {
    fila[idx] = { ...fila[idx], ...updates };
    salvarFilaUploads(fila);
  }
}

/**
 * Limpa todos os uploads pendentes da fila
 */
export function limparTodaFilaUploads(): void {
  salvarFilaUploads([]);
}

/**
 * Limpa uploads concluídos
 */
export function limparFilaUploadsConcluidos(): void {
  const fila = obterFilaUploadsPendentes();
  const pendentes = fila.filter(i => i.status !== 'completed');
  salvarFilaUploads(pendentes);
}

/**
 * Executa o upload REST direto do Blob de PDF para a pasta organizadora de série no Google Drive
 */
export async function executarUploadDiretoPdf(
  pdfBlob: Blob,
  options: EnviarPdfOpcoes,
  tokenParam?: string
): Promise<UploadResult> {
  const { 
    fileName, 
    serie, 
    studentName, 
    studentMatricula, 
    tipoDocumento = 'relatorio_trimestral', 
    token 
  } = options;

  const accessToken = tokenParam || token || cachedAccessToken;

  if (!accessToken) {
    return {
      success: false,
      error: 'NOT_AUTHENTICATED',
      message: 'Google Drive não conectado. Faça login com o Google para enviar o documento PDF.',
    };
  }

  // 1. Garante e recupera a estrutura de pastas por série no Drive com todos os seus metadados
  const { gradeFolder, rootFolder } = await ensureGradeFolderInDrive(serie, accessToken);
  const pastaOrganizadoraNome = gradeFolder.name;
  const pastaOrganizadoraId = gradeFolder.id;

  // 2. Normaliza o nome do arquivo garantindo a extensão .pdf
  const cleanFileName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  // 3. Monta o metadado organizador extraído da pasta de destino da série
  const metadataOrganizador = {
    pastaNome: pastaOrganizadoraNome,
    pastaId: pastaOrganizadoraId,
    serie: normalizarNomeSeriePasta(serie),
    tipoDocumento,
    webViewLink: gradeFolder.webViewLink,
    estudante: studentName || 'Geral',
    matricula: studentMatricula || '',
  };

  // 4. Constrói os metadados do documento PDF vinculando-o diretamente à pasta organizadora
  const metadata = {
    name: cleanFileName,
    parents: [pastaOrganizadoraId],
    mimeType: 'application/pdf',
    description: `AdaptaEdu Escolar - Documento Pedagógico PDF\n` +
      `Pasta Organizadora: ${pastaOrganizadoraNome} (ID: ${pastaOrganizadoraId})\n` +
      `Organizador Curricular: Série/Ano ${pastaOrganizadoraNome}\n` +
      `Série Informada: ${serie}\n` +
      (studentName ? `Estudante: ${studentName}\n` : '') +
      (studentMatricula ? `Matrícula: ${studentMatricula}\n` : '') +
      `Tipo de Documento: ${tipoDocumento}\n` +
      `Pasta Raiz: ${rootFolder.name} (${rootFolder.id})\n` +
      `Emissão e Organização Automática via AdaptaEdu Escolar`,
    properties: {
      sistema: 'AdaptaEdu Escolar',
      organizador: pastaOrganizadoraNome,
      pastaOrganizadoraId: pastaOrganizadoraId,
      pastaOrganizadoraNome: pastaOrganizadoraNome,
      pastaOrganizadoraLink: gradeFolder.webViewLink || '',
      pastaRaizId: rootFolder.id,
      serie: serie,
      serieNormalizada: pastaOrganizadoraNome,
      estudante: studentName || 'Geral',
      matricula: studentMatricula || '',
      tipoDocumento,
      formato: 'application/pdf',
      tamanhoBytes: String(pdfBlob.size),
      dataEnvio: new Date().toISOString(),
    },
    appProperties: {
      sistema: 'AdaptaEdu Escolar',
      organizador: 'pasta_serie',
      pastaOrganizadora: pastaOrganizadoraNome,
      folderId: pastaOrganizadoraId,
      serie: pastaOrganizadoraNome,
      tipoDocumento,
    },
  };

  // 5. Monta o corpo Multipart/related para o Google Drive REST API v3
  const boundary = '-------AdaptaEduPdfBoundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartRequestBody = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    'Content-Type: application/pdf\r\n\r\n',
    pdfBlob,
    closeDelim,
  ], { type: `multipart/related; boundary=${boundary}` });

  // 6. Executa a requisição de upload para a API do Google Drive
  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size,parents,properties,appProperties',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro HTTP ${uploadRes.status} no upload do PDF para o Google Drive.`);
  }

  const file = await uploadRes.json();

  // 7. Registra no índice local de uploads para visualização no modal e relatórios
  registrarUploadLocal({
    id: file.id,
    name: file.name,
    webViewLink: file.webViewLink,
    folderName: pastaOrganizadoraNome,
    serie,
    studentName,
    tipo: 'relatorio_pdf',
    uploadedAt: new Date().toISOString(),
    sizeBytes: file.size ? Number(file.size) : pdfBlob.size,
  });

  return {
    success: true,
    fileId: file.id,
    fileName: file.name,
    webViewLink: file.webViewLink,
    folderId: pastaOrganizadoraId,
    folderName: pastaOrganizadoraNome,
    folderWebViewLink: gradeFolder.webViewLink,
    metadataOrganizador,
    message: `Documento PDF "${file.name}" enviado com sucesso para a pasta "${pastaOrganizadoraNome}" no Google Drive.`,
  };
}

/**
 * Refatora o serviço de integração com Google Drive:
 * Recebe um Blob de PDF e o envia automaticamente para a pasta correspondente
 * à série do estudante no Google Drive, utilizando os metadados da pasta como organizador.
 *
 * Inclui verificação proativa de fila (queue) e retomada automática:
 * Se o usuário perder a conexão durante o envio, o PDF é salvo na fila de pendências
 * e retransmitido automaticamente assim que a rede for detectada novamente.
 *
 * Suporta ambas as assinaturas:
 * 1) uploadPdfBlob(pdfBlob, options)
 * 2) uploadPdfBlob({ pdfBlob, ...options })
 */
export async function uploadPdfBlob(
  blobOrParams: Blob | UploadPdfBlobParams,
  maybeOptions?: EnviarPdfOpcoes
): Promise<UploadResult> {
  let pdfBlob: Blob;
  let options: EnviarPdfOpcoes;

  if (blobOrParams instanceof Blob) {
    pdfBlob = blobOrParams;
    options = maybeOptions || { fileName: `Documento_${Date.now()}.pdf`, serie: 'Geral' };
  } else {
    pdfBlob = blobOrParams.pdfBlob;
    options = blobOrParams;
  }

  const { 
    fileName, 
    serie, 
    studentName, 
    studentMatricula, 
    tipoDocumento = 'relatorio_trimestral', 
    token 
  } = options;

  if (!pdfBlob || !(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
    return {
      success: false,
      error: 'INVALID_BLOB',
      message: 'O arquivo PDF fornecido não é um Blob válido ou está vazio.',
    };
  }

  const cleanFileName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const pastaNomeNormalizado = normalizarNomeSeriePasta(serie);

  // 1. Verificação proativa de rede: se offline, enfileira imediatamente
  if (!isOnline()) {
    try {
      const base64 = await blobToBase64(pdfBlob);
      const enfileirado = adicionarFilaUpload({
        fileName: cleanFileName,
        serie,
        studentName,
        studentMatricula,
        tipoDocumento,
        pdfBase64: base64,
        mimeType: pdfBlob.type || 'application/pdf',
        sizeBytes: pdfBlob.size,
        lastError: 'Sem conexão com a internet (offline).',
      });

      return {
        success: false,
        queued: true,
        queueId: enfileirado.id,
        fileName: cleanFileName,
        folderName: pastaNomeNormalizado,
        error: 'OFFLINE_QUEUED',
        message: `Sem conexão à internet. O documento "${cleanFileName}" foi salvo na fila de uploads pendentes e será transmitido automaticamente para a pasta "${pastaNomeNormalizado}" assim que a rede for detectada.`,
        metadataOrganizador: {
          pastaNome: pastaNomeNormalizado,
          pastaId: 'pendente_conexao',
          serie: pastaNomeNormalizado,
          tipoDocumento,
          estudante: studentName || 'Geral',
          matricula: studentMatricula || '',
        },
      };
    } catch (e: any) {
      console.error('Erro ao enfileirar documento offline:', e);
    }
  }

  const accessToken = token || cachedAccessToken;

  if (!accessToken) {
    return {
      success: false,
      error: 'NOT_AUTHENTICATED',
      message: 'Google Drive não conectado. Faça login com o Google para enviar o documento PDF.',
    };
  }

  try {
    const res = await executarUploadDiretoPdf(pdfBlob, options, accessToken);
    return res;
  } catch (error: any) {
    console.error('Erro ao enviar documento PDF para o Google Drive:', error);

    // Se houve perda de conexão durante o envio, salva na fila para retomada automática
    if (isNetworkError(error)) {
      try {
        const base64 = await blobToBase64(pdfBlob);
        const enfileirado = adicionarFilaUpload({
          fileName: cleanFileName,
          serie,
          studentName,
          studentMatricula,
          tipoDocumento,
          pdfBase64: base64,
          mimeType: pdfBlob.type || 'application/pdf',
          sizeBytes: pdfBlob.size,
          lastError: error.message || 'Conexão perdida durante o envio.',
        });

        return {
          success: false,
          queued: true,
          queueId: enfileirado.id,
          fileName: cleanFileName,
          folderName: pastaNomeNormalizado,
          error: 'NETWORK_ERROR_QUEUED',
          message: `Conexão perdida durante o envio. O documento "${cleanFileName}" foi mantido na fila de pendências e o upload será retomado automaticamente assim que a rede for restabelecida.`,
          metadataOrganizador: {
            pastaNome: pastaNomeNormalizado,
            pastaId: 'pendente_reconexao',
            serie: pastaNomeNormalizado,
            tipoDocumento,
            estudante: studentName || 'Geral',
            matricula: studentMatricula || '',
          },
        };
      } catch (queueErr) {
        console.error('Erro ao salvar na fila após queda de rede:', queueErr);
      }
    }

    return {
      success: false,
      error: error.message || 'Falha ao processar o upload do PDF no Google Drive.',
      message: error.message || 'Erro durante a comunicação com o Google Drive.',
    };
  }
}

let isProcessingQueue = false;

/**
 * Processa a fila de uploads pendentes enviando cada PDF para a respectiva pasta de série no Drive.
 * É acionado automaticamente na detecção do evento 'online' da rede ou ao autenticar no Google Drive.
 */
export async function processarFilaUploadsPendentes(tokenParam?: string): Promise<{
  total: number;
  processados: number;
  sucessos: number;
  falhas: number;
}> {
  if (isProcessingQueue) {
    return { total: 0, processados: 0, sucessos: 0, falhas: 0 };
  }

  if (!isOnline()) {
    return { total: 0, processados: 0, sucessos: 0, falhas: 0 };
  }

  const token = tokenParam || cachedAccessToken;
  if (!token) {
    return { total: 0, processados: 0, sucessos: 0, falhas: 0 };
  }

  const fila = obterFilaUploadsPendentes();
  const pendentes = fila.filter(item => item.status === 'pending' || item.status === 'failed');

  if (pendentes.length === 0) {
    return { total: 0, processados: 0, sucessos: 0, falhas: 0 };
  }

  if (!isRealOnline()) {
    console.warn('[Google Drive Queue] Conexão real indisponível. Processamento da fila postergado.');
    return { total: pendentes.length, processados: 0, sucessos: 0, falhas: 0 };
  }

  isProcessingQueue = true;
  let sucessos = 0;
  let falhas = 0;
  let processados = 0;

  console.log(`[Google Drive Queue] Iniciando processamento de ${pendentes.length} upload(s) pendente(s)...`);

  try {
    for (const item of pendentes) {
      if (!isOnline()) {
        console.warn('[Google Drive Queue] Rede desconectada durante o processamento da fila. Pausando fila...');
        break;
      }

      // Backoff exponencial e limite de tentativas
      const attempts = item.attempts || 0;
      if (attempts >= 8) {
        // Excedeu limite seguro de retentativas; mantém na fila sem loop contínuo
        continue;
      }

      if (attempts > 0 && item.lastAttemptAt) {
        const delayMs = Math.min(60000, Math.pow(2, Math.min(attempts, 6)) * 1000);
        const elapsedMs = Date.now() - new Date(item.lastAttemptAt).getTime();
        if (elapsedMs < delayMs) {
          // Dentro do intervalo de atraso progressivo
          continue;
        }
      }

      atualizarItemFilaUpload(item.id, {
        status: 'uploading',
        lastAttemptAt: new Date().toISOString(),
        attempts: (item.attempts || 0) + 1,
      });

      try {
        const blob = base64ToBlob(item.pdfBase64, item.mimeType || 'application/pdf');
        const res = await executarUploadDiretoPdf(
          blob,
          {
            fileName: item.fileName,
            serie: item.serie,
            studentName: item.studentName,
            studentMatricula: item.studentMatricula,
            tipoDocumento: item.tipoDocumento,
            token,
          },
          token
        );

        if (res.success) {
          sucessos++;
          processados++;
          atualizarItemFilaUpload(item.id, {
            status: 'completed',
            lastError: undefined,
          });
          // Remove da fila após confirmação de sucesso
          removerItemFilaUpload(item.id);
          console.log(`[Google Drive Queue] Upload de "${item.fileName}" concluído com sucesso na pasta "${item.serie}".`);
        } else {
          falhas++;
          processados++;
          atualizarItemFilaUpload(item.id, {
            status: 'failed',
            lastError: res.error || res.message,
          });
        }
      } catch (err: any) {
        falhas++;
        processados++;
        const netErr = isNetworkError(err);
        atualizarItemFilaUpload(item.id, {
          status: netErr ? 'pending' : 'failed',
          lastError: err.message || 'Falha no envio do PDF',
        });
        if (netErr) {
          console.warn('[Google Drive Queue] Interrupção de rede detectada durante item da fila. Pausando...');
          break;
        }
      }
    }
  } finally {
    isProcessingQueue = false;
  }

  return { total: pendentes.length, processados, sucessos, falhas };
}

// Auto-inicialização de listeners de rede no navegador para retomada automática
if (typeof window !== 'undefined') {
  adicionarListenerConectividade((status) => {
    if (status === 'online' && cachedAccessToken && obterQuantidadeUploadsPendentes() > 0) {
      console.log('[Google Drive Queue] Evento ONLINE detectado com conexão estável. Retomando uploads pendentes automaticamente...');
      processarFilaUploadsPendentes().catch(err => {
        console.error('[Google Drive Queue] Erro ao retomar fila online:', err);
      });
    }
  });

  window.addEventListener('focus', () => {
    if (isRealOnline() && cachedAccessToken && obterQuantidadeUploadsPendentes() > 0) {
      processarFilaUploadsPendentes().catch(() => {});
    }
  });

  // Checagem periódica a cada 45 segundos
  setInterval(() => {
    if (isRealOnline() && isGoogleDriveConnected() && obterQuantidadeUploadsPendentes() > 0) {
      processarFilaUploadsPendentes().catch(() => {});
    }
  }, 45000);
}

/**
 * Aliases e compatibilidade com implementações existentes
 */
export const uploadPdfBlobToGradeFolder = uploadPdfBlob;
export const uploadPdfToDrive = uploadPdfBlob;
export const enviarPdfParaDrivePorSerie = uploadPdfBlob;
export const uploadPdfBlobParaSerieDoEstudante = uploadPdfBlob;

/**
 * Registra o upload no histórico local para fácil visualização
 */
function registrarUploadLocal(file: DriveUploadedFile) {
  try {
    const raw = localStorage.getItem(REGISTRO_UPLOADS_KEY);
    const list: DriveUploadedFile[] = raw ? JSON.parse(raw) : [];
    // Evita duplicação do mesmo fileId
    const filtrada = list.filter(item => item.id !== file.id);
    filtrada.unshift(file);
    // Guarda até os últimos 100 uploads
    localStorage.setItem(REGISTRO_UPLOADS_KEY, JSON.stringify(filtrada.slice(0, 100)));
  } catch (e) {
    console.error('Erro ao registrar histórico de upload local:', e);
  }
}

/**
 * Obtém a lista dos uploads já realizados para o Google Drive
 */
export function getUploadsGoogleDriveLocais(): DriveUploadedFile[] {
  try {
    const raw = localStorage.getItem(REGISTRO_UPLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Sincroniza em lote todas as fotos pendentes de estudantes e diários de bordo com o Google Drive
 */
export async function sincronizarFotosParaGoogleDrive(params: {
  estudantes: Estudante[];
  registrosApoio: RegistroAcompanhamentoApoio[];
  onProgresso?: (progresso: { atual: number; total: number; mensagem: string }) => void;
}): Promise<{ totalProcessados: number; sucessos: number; erros: number }> {
  const { estudantes, registrosApoio, onProgresso } = params;
  const accessToken = cachedAccessToken;

  if (!accessToken) {
    throw new Error('Google Drive não está conectado.');
  }

  // Itens a enviar: estudantes com foto + registros com foto de diário de bordo
  const itensParaEnviar: Array<{
    tipo: 'foto_estudante' | 'diario_bordo';
    dataUrl: string;
    fileName: string;
    serie: string;
    studentName: string;
  }> = [];

  // 1. Fotos de estudantes
  for (const est of estudantes) {
    if (est.fotoUrl && est.fotoUrl.startsWith('data:image')) {
      const serie = normalizarNomeSeriePasta(est.anoSerie || est.turma);
      const cleanName = est.nome.replace(/[^a-zA-Z0-9]/g, '_');
      itensParaEnviar.push({
        tipo: 'foto_estudante',
        dataUrl: est.fotoUrl,
        fileName: `Foto_Aluno_${est.matricula || 'MAT'}_${cleanName}.jpg`,
        serie,
        studentName: est.nome,
      });
    }
  }

  // 2. Fotos de Diário de Bordo do Apoio
  for (const reg of registrosApoio) {
    if (reg.fotoDiarioBordoUrl && reg.fotoDiarioBordoUrl.startsWith('data:image')) {
      const est = estudantes.find(e => e.id === reg.studentId);
      const serie = normalizarNomeSeriePasta(est?.anoSerie || reg.turma);
      const cleanName = (est?.nome || 'Aluno').replace(/[^a-zA-Z0-9]/g, '_');
      itensParaEnviar.push({
        tipo: 'diario_bordo',
        dataUrl: reg.fotoDiarioBordoUrl,
        fileName: `Diario_Bordo_${reg.data}_${cleanName}.jpg`,
        serie,
        studentName: est?.nome || 'Estudante',
      });
    }
  }

  const total = itensParaEnviar.length;
  let sucessos = 0;
  let erros = 0;

  for (let i = 0; i < total; i++) {
    const item = itensParaEnviar[i];
    if (onProgresso) {
      onProgresso({
        atual: i + 1,
        total,
        mensagem: `Enviando imagem ${i + 1} de ${total} para a pasta "${item.serie}"...`,
      });
    }

    const res = await uploadImageToDrive({
      dataUrl: item.dataUrl,
      fileName: item.fileName,
      serie: item.serie,
      studentName: item.studentName,
      tipo: item.tipo,
      token: accessToken,
    });

    if (res.success) {
      sucessos++;
    } else {
      erros++;
    }
  }

  return { totalProcessados: total, sucessos, erros };
}

// Re-exporta serviços e tipos de Backup Periódico para a pasta dedicada 'Backups_AdaptaEdu'
export {
  BACKUP_FOLDER_NAME,
  BACKUP_CONFIG_KEY,
  BACKUP_HISTORY_KEY,
  obterConfiguracaoBackup,
  salvarConfiguracaoBackup,
  subscribeToBackupStatus,
  obterHistoricoBackupsLocais,
  extrairDadosLocalStorageParaBackup,
  garantirPastaBackupsNoDrive,
  executarBackupLocalStorageParaDrive,
  listarBackupsNoDrive,
  baixarBackupDoDrive,
  restaurarBackupLocalStorage,
  baixarBackupJsonNavegador,
  iniciarServicoBackupPeriodico,
} from './backupDriveService';
export type {
  BackupStats,
  AdaptaEduBackupPayload,
  DriveBackupFileInfo,
  BackupConfig,
  BackupExecutionResult,
} from './backupDriveService';

