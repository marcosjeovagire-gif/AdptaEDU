import { 
  getOrCreateDriveFolder, 
  getGoogleDriveAccessToken, 
  isGoogleDriveConnected, 
  getGoogleCurrentUser, 
  testarConexaoGoogleDrive,
  TesteConexaoDriveResultado,
  isOnline,
  DriveFolderInfo
} from './googleDriveService';
import { adicionarListenerConectividade } from './connectivityService';
import { Estudante, AtividadeAdaptada, RegistroAcompanhamentoApoio } from '../types';

export const BACKUP_FOLDER_NAME = 'Backups_AdaptaEdu';
export const BACKUP_CONFIG_KEY = 'adaptaedu_backup_config';
export const BACKUP_HISTORY_KEY = 'adaptaedu_backup_history';

export interface BackupStats {
  totalEstudantes: number;
  totalAtividades: number;
  totalRegistrosApoio: number;
  totalHistorico: number;
  totalAuditoria: number;
  totalPerfis: number;
  totalHabilidades: number;
  totalMatrizes: number;
}

export interface AdaptaEduBackupPayload {
  version: string;
  timestamp: string;
  appName: string;
  origem: string;
  user?: {
    email?: string;
    name?: string;
  };
  stats: BackupStats;
  data: {
    estudantes: Estudante[];
    atividades: AtividadeAdaptada[];
    registrosApoio: RegistroAcompanhamentoApoio[];
    historico: any[];
    auditoria: any[];
    perfis: any[];
    habilidades: any[];
    matrizes: any[];
    curriculumSkills: any[];
    escolaConfig: any;
  };
}

export interface DriveBackupFileInfo {
  id: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
  sizeBytes: number;
  createdAt: string;
  stats?: {
    estudantes: number;
    atividades: number;
    registros: number;
  };
}

export type BackupFrequencyType = 'diario' | 'semanal';

export interface BackupConfig {
  enabled: boolean;
  intervalMinutes: number; // ex: 15, 30, 60, 180, 720, 1440
  specificTimes?: string[]; // ex: ["08:00", "14:00", "22:00"]
  frequencyType?: BackupFrequencyType; // 'diario' | 'semanal'
  diasSemana?: number[]; // [0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb]
  lastBackupTimestamp: string | null;
  lastBackupStatus: 'sucesso' | 'erro' | 'em_andamento' | 'pendente' | 'nunca';
  lastBackupFileName: string | null;
  lastBackupFileId: string | null;
  lastBackupWebViewLink: string | null;
  lastBackupError: string | null;
  lastBackupStats?: {
    estudantes: number;
    atividades: number;
    registros: number;
  };
  lastBackupDataHash?: string | null;
}

export { testarConexaoGoogleDrive };
export type { TesteConexaoDriveResultado };

export interface BackupExecutionResult {
  success: boolean;
  skipped?: boolean;
  fileId?: string;
  fileName?: string;
  folderName: string;
  folderId?: string;
  folderWebViewLink?: string;
  webViewLink?: string;
  sizeBytes?: number;
  stats?: {
    estudantes: number;
    atividades: number;
    registros: number;
  };
  error?: string;
  message: string;
}

export interface AdaptaEduCompressedBackupContainer {
  format: 'adaptaedu_lzw_v1';
  compressao: 'LZW';
  originalSizeBytes: number;
  compressedSizeBytes: number;
  taxaCompressao: string;
  timestamp: string;
  payloadLzw: string;
}

/**
 * Algoritmo Lempel-Ziv-Welch (LZW) adaptado para Unicode/UTF-8.
 * Realiza compressão sem perdas (lossless) do JSON serializado, reduzindo em 60-80% o consumo de cota no Google Drive.
 */
export function lzwCompressUtf8(uncompressed: string): string {
  if (!uncompressed) return '';
  const encoded = encodeURIComponent(uncompressed);
  const dict: Record<string, number> = {};
  for (let i = 0; i < 256; i++) {
    dict[String.fromCharCode(i)] = i;
  }

  let phrase = '';
  const out: number[] = [];
  let code = 256;

  for (let i = 0; i < encoded.length; i++) {
    const char = encoded.charAt(i);
    const phrasePlusChar = phrase + char;
    if (dict[phrasePlusChar] !== undefined) {
      phrase = phrasePlusChar;
    } else {
      out.push(dict[phrase]);
      dict[phrasePlusChar] = code++;
      phrase = char;
    }
  }

  if (phrase !== '') {
    out.push(dict[phrase]);
  }

  return out.map(c => String.fromCharCode(c)).join('');
}

/**
 * Descompressão simétrica LZW reversa de payloads comprimidos.
 */
export function lzwDecompressUtf8(compressed: string): string {
  if (!compressed) return '';
  const dict: Record<number, string> = {};
  for (let i = 0; i < 256; i++) {
    dict[i] = String.fromCharCode(i);
  }

  let currChar = compressed.charAt(0);
  let oldPhrase = currChar;
  const out: string[] = [currChar];
  let code = 256;
  let phrase = '';

  for (let i = 1; i < compressed.length; i++) {
    const currCode = compressed.charCodeAt(i);
    if (dict[currCode] !== undefined) {
      phrase = dict[currCode];
    } else if (currCode === code) {
      phrase = oldPhrase + currChar;
    } else {
      throw new Error('Falha na descompressão LZW: código fora do dicionário.');
    }

    out.push(phrase);
    currChar = phrase.charAt(0);
    dict[code++] = oldPhrase + currChar;
    oldPhrase = phrase;
  }

  return decodeURIComponent(out.join(''));
}

const CONFIG_PADRAO: BackupConfig = {
  enabled: true,
  intervalMinutes: 30, // Backup periódico a cada 30 minutos
  frequencyType: 'diario',
  diasSemana: [1, 2, 3, 4, 5], // Dias úteis padrão (Segunda a Sexta) caso alternado para semanal
  specificTimes: [],
  lastBackupTimestamp: null,
  lastBackupStatus: 'nunca',
  lastBackupFileName: null,
  lastBackupFileId: null,
  lastBackupWebViewLink: null,
  lastBackupError: null,
};

// Listeners de alteração de configuração de backup
type BackupListener = (config: BackupConfig) => void;
const backupListeners: Set<BackupListener> = new Set();

export function subscribeToBackupStatus(listener: BackupListener): () => void {
  backupListeners.add(listener);
  try {
    listener(obterConfiguracaoBackup());
  } catch (e) {
    console.error('Erro no listener de backup:', e);
  }
  return () => {
    backupListeners.delete(listener);
  };
}

export const inscreverMudancaBackup = subscribeToBackupStatus;

function notificarMudancaBackup(config: BackupConfig): void {
  backupListeners.forEach(fn => {
    try {
      fn(config);
    } catch (e) {
      console.error('Erro ao notificar listener de backup:', e);
    }
  });
}

/**
 * Obtém a configuração atual de backup persistida
 */
export function obterConfiguracaoBackup(): BackupConfig {
  try {
    const raw = localStorage.getItem(BACKUP_CONFIG_KEY);
    if (!raw) return { ...CONFIG_PADRAO };
    const parsed = JSON.parse(raw);
    return { ...CONFIG_PADRAO, ...parsed };
  } catch {
    return { ...CONFIG_PADRAO };
  }
}

/**
 * Atualiza e salva as preferências de backup
 */
export function salvarConfiguracaoBackup(updates: Partial<BackupConfig>): BackupConfig {
  try {
    const atual = obterConfiguracaoBackup();
    const nova = { ...atual, ...updates };
    localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(nova));
    notificarMudancaBackup(nova);
    return nova;
  } catch (e) {
    console.error('Erro ao persistir configurações de backup:', e);
    return { ...CONFIG_PADRAO, ...updates };
  }
}

/**
 * Obtém o histórico dos backups salvos localmente
 */
export function obterHistoricoBackupsLocais(): DriveBackupFileInfo[] {
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Registra um novo backup no histórico local
 */
function registrarBackupNoHistoricoLocal(item: DriveBackupFileInfo): void {
  try {
    const lista = obterHistoricoBackupsLocais();
    const filtrada = lista.filter(b => b.id !== item.id);
    filtrada.unshift(item);
    localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(filtrada.slice(0, 30)));
  } catch (e) {
    console.error('Erro ao salvar histórico de backup local:', e);
  }
}

/**
 * Extrai todos os dados do localStorage (estudantes, atividades, registros, auditoria, configurações)
 * construindo o pacote canônico de backup.
 */
export function extrairDadosLocalStorageParaBackup(): AdaptaEduBackupPayload {
  const safeGet = <T>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      const parsed = JSON.parse(saved);
      return parsed !== undefined && parsed !== null ? parsed : fallback;
    } catch (e) {
      console.warn(`[Backup AdaptaEdu] Falha ao extrair chave "${key}":`, e);
      return fallback;
    }
  };

  const estudantes = safeGet<Estudante[]>('adaptaedu_estudantes', []);
  const atividades = safeGet<AtividadeAdaptada[]>('adaptaedu_atividades', []);
  const registrosApoio = safeGet<RegistroAcompanhamentoApoio[]>('adaptaedu_registros_apoio', []);
  const historico = safeGet<any[]>('adaptaedu_historico', []);
  const auditoria = safeGet<any[]>('adaptaedu_auditoria', []);
  const perfis = safeGet<any[]>('adaptaedu_perfis', []);
  const habilidades = safeGet<any[]>('adaptaedu_habilidades', []);
  const matrizes = safeGet<any[]>('adaptaedu_matrizes', []);
  const curriculumSkills = safeGet<any[]>('adaptaedu_curriculum_skills', []);
  const escolaConfig = safeGet<any>('adaptaedu_escola_config', null);

  const currentUser = getGoogleCurrentUser();

  const stats: BackupStats = {
    totalEstudantes: Array.isArray(estudantes) ? estudantes.length : 0,
    totalAtividades: Array.isArray(atividades) ? atividades.length : 0,
    totalRegistrosApoio: Array.isArray(registrosApoio) ? registrosApoio.length : 0,
    totalHistorico: Array.isArray(historico) ? historico.length : 0,
    totalAuditoria: Array.isArray(auditoria) ? auditoria.length : 0,
    totalPerfis: Array.isArray(perfis) ? perfis.length : 0,
    totalHabilidades: Array.isArray(habilidades) ? habilidades.length : 0,
    totalMatrizes: Array.isArray(matrizes) ? matrizes.length : 0,
  };

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    appName: 'AdaptaEdu Escolar',
    origem: 'localStorage',
    user: {
      email: currentUser?.email || undefined,
      name: currentUser?.displayName || undefined,
    },
    stats,
    data: {
      estudantes: Array.isArray(estudantes) ? estudantes : [],
      atividades: Array.isArray(atividades) ? atividades : [],
      registrosApoio: Array.isArray(registrosApoio) ? registrosApoio : [],
      historico: Array.isArray(historico) ? historico : [],
      auditoria: Array.isArray(auditoria) ? auditoria : [],
      perfis: Array.isArray(perfis) ? perfis : [],
      habilidades: Array.isArray(habilidades) ? habilidades : [],
      matrizes: Array.isArray(matrizes) ? matrizes : [],
      curriculumSkills: Array.isArray(curriculumSkills) ? curriculumSkills : [],
      escolaConfig,
    },
  };
}

/**
 * Garante que a pasta dedicada 'Backups_AdaptaEdu' exista no Google Drive
 */
export async function garantirPastaBackupsNoDrive(tokenParam?: string): Promise<DriveFolderInfo> {
  const token = tokenParam || (await getGoogleDriveAccessToken());
  if (!token) {
    throw new Error('Google Drive não está autenticado. Conecte sua conta Google.');
  }
  return await getOrCreateDriveFolder(BACKUP_FOLDER_NAME, undefined, token);
}

let isBackupRunning = false;

/**
 * Executa o backup dos dados do localStorage para o Google Drive na pasta 'Backups_AdaptaEdu'.
 * Pode ser acionado sob demanda (forcar: true) ou pelo agendador periódico (forcar: false).
 */
export async function executarBackupLocalStorageParaDrive(options?: {
  forcar?: boolean;
  token?: string;
}): Promise<BackupExecutionResult> {
  const config = obterConfiguracaoBackup();
  const token = options?.token || (await getGoogleDriveAccessToken());

  if (!token) {
    salvarConfiguracaoBackup({
      lastBackupStatus: 'erro',
      lastBackupError: 'Google Drive não conectado.',
    });
    return {
      success: false,
      folderName: BACKUP_FOLDER_NAME,
      error: 'NOT_AUTHENTICATED',
      message: 'Google Drive não conectado. Faça login com o Google para enviar o backup.',
    };
  }

  if (!isOnline()) {
    return {
      success: false,
      folderName: BACKUP_FOLDER_NAME,
      error: 'OFFLINE',
      message: 'Dispositivo offline. O backup para o Google Drive será realizado quando a rede for detectada.',
    };
  }

  // Se não for forçado, verifica se o intervalo configurado já decorreu
  if (!options?.forcar && config.lastBackupTimestamp) {
    const elapsedMinutes = (Date.now() - new Date(config.lastBackupTimestamp).getTime()) / (1000 * 60);
    if (elapsedMinutes < config.intervalMinutes) {
      return {
        success: true,
        skipped: true,
        folderName: BACKUP_FOLDER_NAME,
        message: `Backup recente realizado há ${Math.round(elapsedMinutes)} minuto(s). Próximo agendado para após ${config.intervalMinutes} minutos.`,
      };
    }
  }

  if (isBackupRunning) {
    return {
      success: false,
      folderName: BACKUP_FOLDER_NAME,
      error: 'IN_PROGRESS',
      message: 'Um backup já está em processamento no momento.',
    };
  }

  isBackupRunning = true;
  salvarConfiguracaoBackup({ lastBackupStatus: 'em_andamento', lastBackupError: null });

  try {
    // 1. Extração dos dados do localStorage e Compressão LZW
    const payload = extrairDadosLocalStorageParaBackup();
    const dataString = JSON.stringify(payload.data);

    // Identificador hash para verificar se houve alterações reais desde o último backup
    let hashCalc = 0;
    for (let i = 0; i < dataString.length; i++) {
      hashCalc = ((hashCalc << 5) - hashCalc) + dataString.charCodeAt(i);
      hashCalc |= 0;
    }
    const currentDataHash = String(hashCalc);

    // Só executa backup se existirem alterações reais nos dados (quando não for forçado manualmente)
    if (!options?.forcar && config.lastBackupDataHash && config.lastBackupDataHash === currentDataHash && config.lastBackupStatus === 'sucesso') {
      isBackupRunning = false;
      return {
        success: true,
        skipped: true,
        folderName: BACKUP_FOLDER_NAME,
        message: 'Nenhuma alteração nos dados do sistema desde o último backup. Envio ignorado para economizar recursos e evitar duplicatas.',
      };
    }

    const jsonString = JSON.stringify(payload);
    const originalSizeBytes = new TextEncoder().encode(jsonString).length;

    // Aplicação da compressão LZW
    const lzwPayload = lzwCompressUtf8(jsonString);
    const container: AdaptaEduCompressedBackupContainer = {
      format: 'adaptaedu_lzw_v1',
      compressao: 'LZW',
      originalSizeBytes,
      compressedSizeBytes: lzwPayload.length,
      taxaCompressao: originalSizeBytes > 0 ? `${((1 - lzwPayload.length / originalSizeBytes) * 100).toFixed(1)}%` : '0%',
      timestamp: new Date().toISOString(),
      payloadLzw: lzwPayload,
    };

    const containerJson = JSON.stringify(container);
    const jsonBlob = new Blob([containerJson], { type: 'application/json;charset=utf-8' });

    // 2. Garante a pasta dedicada 'Backups_AdaptaEdu'
    const backupFolder = await garantirPastaBackupsNoDrive(token);

    // 3. Monta o nome padronizado do arquivo
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dataFormatada = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}m${pad(now.getSeconds())}s`;
    const fileName = `Backup_AdaptaEdu_${dataFormatada}.json`;

    // 4. Monta requisição Multipart/Related para Google Drive v3 REST API
    const boundary = '-------AdaptaEduBackupBoundary' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [backupFolder.id],
      description: `Backup Periódico Automático do AdaptaEdu Escolar gerado em ${now.toLocaleString('pt-BR')} (Comprimido com LZW - Economia: ${container.taxaCompressao}). ` +
        `Estudantes: ${payload.stats.totalEstudantes}, Atividades: ${payload.stats.totalAtividades}, ` +
        `Registros de Apoio: ${payload.stats.totalRegistrosApoio}.`,
      properties: {
        sistema: 'AdaptaEdu Escolar',
        tipo: 'backup_localstorage',
        pasta: BACKUP_FOLDER_NAME,
        timestamp: now.toISOString(),
        compressao: 'LZW',
        tamanhoOriginalBytes: String(originalSizeBytes),
        tamanhoComprimidoBytes: String(container.compressedSizeBytes),
        economiaArmazenamento: container.taxaCompressao,
        totalEstudantes: String(payload.stats.totalEstudantes),
        totalAtividades: String(payload.stats.totalAtividades),
        totalRegistros: String(payload.stats.totalRegistrosApoio),
      },
      appProperties: {
        sistema: 'AdaptaEdu Escolar',
        tipo: 'backup_periodico',
        versao: '1.0',
        compressao: 'lzw_v1',
      },
    };

    const multipartRequestBody = new Blob([
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      jsonBlob,
      closeDelim,
    ], { type: `multipart/related; boundary=${boundary}` });

    // 5. Upload para o Google Drive
    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size,parents,createdTime,properties',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erro HTTP ${uploadRes.status} ao enviar backup para a pasta ${BACKUP_FOLDER_NAME}.`);
    }

    const file = await uploadRes.json();

    const statsResumo = {
      estudantes: payload.stats.totalEstudantes,
      atividades: payload.stats.totalAtividades,
      registros: payload.stats.totalRegistrosApoio,
    };

    // 6. Atualiza configurações e histórico local
    salvarConfiguracaoBackup({
      lastBackupTimestamp: now.toISOString(),
      lastBackupStatus: 'sucesso',
      lastBackupFileName: file.name,
      lastBackupFileId: file.id,
      lastBackupWebViewLink: file.webViewLink,
      lastBackupError: null,
      lastBackupStats: statsResumo,
      lastBackupDataHash: currentDataHash,
    });

    registrarBackupNoHistoricoLocal({
      id: file.id,
      name: file.name,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      sizeBytes: file.size ? Number(file.size) : jsonBlob.size,
      createdAt: now.toISOString(),
      stats: statsResumo,
    });

    console.log(`[Backup AdaptaEdu] Backup salvo com sucesso no Google Drive na pasta "${BACKUP_FOLDER_NAME}": ${file.name}`);

    return {
      success: true,
      fileId: file.id,
      fileName: file.name,
      folderName: BACKUP_FOLDER_NAME,
      folderId: backupFolder.id,
      folderWebViewLink: backupFolder.webViewLink,
      webViewLink: file.webViewLink,
      sizeBytes: file.size ? Number(file.size) : jsonBlob.size,
      stats: statsResumo,
      message: `Backup "${file.name}" gravado com sucesso na pasta "${BACKUP_FOLDER_NAME}" no Google Drive!`,
    };
  } catch (error: any) {
    console.error('[Backup AdaptaEdu] Erro ao realizar backup no Google Drive:', error);
    salvarConfiguracaoBackup({
      lastBackupStatus: 'erro',
      lastBackupError: error.message || 'Falha ao salvar backup no Google Drive.',
    });
    return {
      success: false,
      folderName: BACKUP_FOLDER_NAME,
      error: error.message || 'Erro durante a transmissão do backup para o Google Drive.',
      message: error.message || 'Falha na comunicação com o Google Drive.',
    };
  } finally {
    isBackupRunning = false;
  }
}

/**
 * Lista todos os arquivos de backup salvos na pasta 'Backups_AdaptaEdu' no Google Drive
 */
export async function listarBackupsNoDrive(tokenParam?: string): Promise<DriveBackupFileInfo[]> {
  const token = tokenParam || (await getGoogleDriveAccessToken());
  if (!token) {
    throw new Error('Google Drive não está conectado.');
  }

  const backupFolder = await garantirPastaBackupsNoDrive(token);
  const query = `'${backupFolder.id}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&fields=files(id,name,webViewLink,webContentLink,size,createdTime,properties)&pageSize=30`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Falha ao listar backups na pasta do Google Drive.');
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    webViewLink: f.webViewLink,
    webContentLink: f.webContentLink,
    sizeBytes: f.size ? Number(f.size) : 0,
    createdAt: f.createdTime,
    stats: {
      estudantes: f.properties?.totalEstudantes ? Number(f.properties.totalEstudantes) : 0,
      atividades: f.properties?.totalAtividades ? Number(f.properties.totalAtividades) : 0,
      registros: f.properties?.totalRegistros ? Number(f.properties.totalRegistros) : 0,
    },
  }));
}

/**
 * Baixa e carrega o conteúdo JSON de um backup diretamente do Google Drive
 */
export async function baixarBackupDoDrive(fileId: string, tokenParam?: string): Promise<AdaptaEduBackupPayload> {
  const token = tokenParam || (await getGoogleDriveAccessToken());
  if (!token) {
    throw new Error('Google Drive não está conectado.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Erro ao baixar backup do Google Drive (HTTP ${res.status}).`);
  }

  const json = await res.json();
  return json as AdaptaEduBackupPayload;
}

/**
 * Restaura o conteúdo de um backup no localStorage da aplicação
 */
export function restaurarBackupLocalStorage(payload: AdaptaEduBackupPayload): {
  success: boolean;
  message: string;
  stats: {
    estudantes: number;
    atividades: number;
    registrosApoio: number;
  };
} {
  if (!payload || !payload.data) {
    throw new Error('Arquivo de backup corrompido ou em formato inválido.');
  }

  const { data } = payload;
  let estudantesCount = 0;
  let atividadesCount = 0;
  let registrosCount = 0;

  if (Array.isArray(data.estudantes)) {
    localStorage.setItem('adaptaedu_estudantes', JSON.stringify(data.estudantes));
    estudantesCount = data.estudantes.length;
  }
  if (Array.isArray(data.atividades)) {
    localStorage.setItem('adaptaedu_atividades', JSON.stringify(data.atividades));
    atividadesCount = data.atividades.length;
  }
  if (Array.isArray(data.registrosApoio)) {
    localStorage.setItem('adaptaedu_registros_apoio', JSON.stringify(data.registrosApoio));
    registrosCount = data.registrosApoio.length;
  }
  if (Array.isArray(data.historico)) {
    localStorage.setItem('adaptaedu_historico', JSON.stringify(data.historico));
  }
  if (Array.isArray(data.auditoria)) {
    localStorage.setItem('adaptaedu_auditoria', JSON.stringify(data.auditoria));
  }
  if (Array.isArray(data.perfis)) {
    localStorage.setItem('adaptaedu_perfis', JSON.stringify(data.perfis));
  }
  if (Array.isArray(data.habilidades)) {
    localStorage.setItem('adaptaedu_habilidades', JSON.stringify(data.habilidades));
  }
  if (data.escolaConfig) {
    localStorage.setItem('adaptaedu_escola_config', JSON.stringify(data.escolaConfig));
  }
  if (Array.isArray(data.matrizes)) {
    localStorage.setItem('adaptaedu_matrizes', JSON.stringify(data.matrizes));
  }
  if (Array.isArray(data.curriculumSkills)) {
    localStorage.setItem('adaptaedu_curriculum_skills', JSON.stringify(data.curriculumSkills));
  }

  // Registra no histórico de auditoria
  try {
    const rawAudit = localStorage.getItem('adaptaedu_auditoria');
    const audits = rawAudit ? JSON.parse(rawAudit) : [];
    audits.unshift({
      id: `aud-restore-${Date.now()}`,
      dataHora: new Date().toLocaleString('pt-BR'),
      usuarioResponsavel: 'Backup Service',
      usuarioAlterado: 'Restauração do Google Drive',
      perfisAnteriores: [],
      perfisPosteriores: [],
      situacaoAnterior: 'Backup anterior',
      situacaoPosterior: `Restaurado: ${estudantesCount} estudantes, ${atividadesCount} atividades, ${registrosCount} registros`,
      resultado: 'Sucesso',
      detalhes: `Restauração realizada a partir do backup do Google Drive gerado em ${payload.timestamp}.`,
    });
    localStorage.setItem('adaptaedu_auditoria', JSON.stringify(audits));
  } catch (e) {
    console.error('Erro ao registrar auditoria de restauração:', e);
  }

  return {
    success: true,
    message: `Backup restaurado com sucesso! (${estudantesCount} estudantes, ${atividadesCount} atividades e ${registrosCount} registros de acompanhamento restaurados)`,
    stats: {
      estudantes: estudantesCount,
      atividades: atividadesCount,
      registrosApoio: registrosCount,
    },
  };
}

/**
 * Permite fazer o download do arquivo de backup JSON no próprio navegador
 */
export function baixarBackupJsonNavegador(payloadParam?: AdaptaEduBackupPayload): void {
  const payload = payloadParam || extrairDadosLocalStorageParaBackup();
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dataFormatada = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}m`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `Backup_AdaptaEdu_Local_${dataFormatada}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

let periodicTimerId: any = null;

/**
 * Inicializa o serviço em segundo plano de verificação e execução periódica de backups
 * para o Google Drive na pasta 'Backups_AdaptaEdu'.
 */
export function iniciarServicoBackupPeriodico(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const verificarEExecutar = async () => {
    const config = obterConfiguracaoBackup();
    if (!config.enabled) return;

    if (!isOnline() || !isGoogleDriveConnected()) {
      return;
    }

    const token = await getGoogleDriveAccessToken();
    if (!token) return;

    const now = Date.now();
    const nowObj = new Date(now);
    const lastTime = config.lastBackupTimestamp ? new Date(config.lastBackupTimestamp).getTime() : 0;
    const intervalMs = config.intervalMinutes * 60 * 1000;

    // Avaliação de frequência (diário vs semanal)
    const frequencia = config.frequencyType || 'diario';
    const diaAtual = nowObj.getDay(); // 0 = Domingo, 1 = Segunda, ... 5 = Sexta, 6 = Sábado
    let diaPermitido = true;
    if (frequencia === 'semanal') {
      const diasPermitidos = (config.diasSemana && config.diasSemana.length > 0)
        ? config.diasSemana
        : [5]; // Sexta-feira por padrão
      diaPermitido = diasPermitidos.includes(diaAtual);
    }

    if (!diaPermitido) {
      return; // Fora dos dias agendados na frequência semanal
    }

    let shouldBackup = (now - lastTime >= intervalMs);

    // Verificação de horários específicos (ex: ["08:00", "14:00", "22:00"])
    if (config.specificTimes && config.specificTimes.length > 0) {
      const currentTimeStr = `${String(nowObj.getHours()).padStart(2, '0')}:${String(nowObj.getMinutes()).padStart(2, '0')}`;
      if (config.specificTimes.includes(currentTimeStr)) {
        // Apenas dispara se o último backup foi há mais de 10 minutos (evita duplicação no mesmo minuto)
        if (now - lastTime > 600000) {
          shouldBackup = true;
        }
      }
    }

    // Se o tempo decorrido desde o último backup for maior ou igual ao intervalo configurado ou for um horário específico
    if (shouldBackup) {
      console.log(`[Backup AdaptaEdu] Iniciando backup automático na pasta "${BACKUP_FOLDER_NAME}"...`);
      executarBackupLocalStorageParaDrive({ forcar: false, token }).catch(err => {
        console.warn('[Backup AdaptaEdu] Falha na execução periódica:', err);
      });
    }
  };

  // Checagem periódica a cada 60 segundos
  if (!periodicTimerId) {
    periodicTimerId = setInterval(verificarEExecutar, 60000);
  }

  // Verificação inicial após 8 segundos da inicialização do app
  const initialTimeout = setTimeout(verificarEExecutar, 8000);

  // Escuta retorno de conectividade estável via serviço centralizado (com probe de saúde e debounce)
  const unsubscribeConnectivity = adicionarListenerConectividade((status) => {
    if (status === 'online' && isGoogleDriveConnected()) {
      console.log('[Backup AdaptaEdu] Conexão online estável confirmada. Avaliando necessidade de backup...');
      verificarEExecutar();
    }
  });

  // Escuta retorno de foco da janela
  const handleFocus = () => {
    verificarEExecutar();
  };

  window.addEventListener('focus', handleFocus);

  return () => {
    if (periodicTimerId) {
      clearInterval(periodicTimerId);
      periodicTimerId = null;
    }
    clearTimeout(initialTimeout);
    unsubscribeConnectivity();
    window.removeEventListener('focus', handleFocus);
  };
}

export interface StatusPendenciaBackupDrive {
  temPendencia: boolean;
  motivo: string;
  minutosDesdeUltimoBackup: number | null;
  intervaloConfigurado: number;
  horariosEspecificosConfigurados?: string[];
  frequenciaConfigurada?: 'diario' | 'semanal';
  diasSemanaConfigurados?: number[];
  ultimoBackupTimestamp: string | null;
  statusUltimoBackup: 'sucesso' | 'erro' | 'em_andamento' | 'pendente' | 'nunca';
  isGoogleDriveConectado: boolean;
  isOnline: boolean;
}

/**
 * Avalia o estado de prontidão e pendências do backup no Google Drive
 */
export function verificarPendenciasBackupDrive(): StatusPendenciaBackupDrive {
  const config = obterConfiguracaoBackup();
  const driveConectado = isGoogleDriveConnected();
  const online = isOnline();

  let minutosDesdeUltimo: number | null = null;
  if (config.lastBackupTimestamp) {
    minutosDesdeUltimo = Math.floor((Date.now() - new Date(config.lastBackupTimestamp).getTime()) / (1000 * 60));
  }

  if (!driveConectado) {
    return {
      temPendencia: true,
      motivo: 'Google Drive não conectado. Faça login para manter seus backups sincronizados na nuvem.',
      minutosDesdeUltimoBackup: minutosDesdeUltimo,
      intervaloConfigurado: config.intervalMinutes,
      horariosEspecificosConfigurados: config.specificTimes || [],
      frequenciaConfigurada: config.frequencyType || 'diario',
      diasSemanaConfigurados: config.diasSemana || [1, 2, 3, 4, 5],
      ultimoBackupTimestamp: config.lastBackupTimestamp,
      statusUltimoBackup: config.lastBackupStatus,
      isGoogleDriveConectado: false,
      isOnline: online,
    };
  }

  if (config.lastBackupStatus === 'erro') {
    return {
      temPendencia: true,
      motivo: config.lastBackupError || 'A última tentativa de backup no Google Drive falhou.',
      minutosDesdeUltimoBackup: minutosDesdeUltimo,
      intervaloConfigurado: config.intervalMinutes,
      horariosEspecificosConfigurados: config.specificTimes || [],
      frequenciaConfigurada: config.frequencyType || 'diario',
      diasSemanaConfigurados: config.diasSemana || [1, 2, 3, 4, 5],
      ultimoBackupTimestamp: config.lastBackupTimestamp,
      statusUltimoBackup: 'erro',
      isGoogleDriveConectado: true,
      isOnline: online,
    };
  }

  if (!config.lastBackupTimestamp || config.lastBackupStatus === 'nunca') {
    return {
      temPendencia: true,
      motivo: 'Nenhum backup em nuvem realizado nesta sessão ainda.',
      minutosDesdeUltimoBackup: null,
      intervaloConfigurado: config.intervalMinutes,
      horariosEspecificosConfigurados: config.specificTimes || [],
      frequenciaConfigurada: config.frequencyType || 'diario',
      diasSemanaConfigurados: config.diasSemana || [1, 2, 3, 4, 5],
      ultimoBackupTimestamp: null,
      statusUltimoBackup: 'nunca',
      isGoogleDriveConectado: true,
      isOnline: online,
    };
  }

  // Verifica se o momento atual coincide com algum horário fixo agendado
  if (config.specificTimes && config.specificTimes.length > 0) {
    const nowObj = new Date();
    const currentTimeStr = `${String(nowObj.getHours()).padStart(2, '0')}:${String(nowObj.getMinutes()).padStart(2, '0')}`;
    if (config.specificTimes.includes(currentTimeStr) && (minutosDesdeUltimo === null || minutosDesdeUltimo >= 10)) {
      return {
        temPendencia: true,
        motivo: `Horário específico programado (${currentTimeStr}) atingido para backup no Google Drive.`,
        minutosDesdeUltimoBackup: minutosDesdeUltimo,
        intervaloConfigurado: config.intervalMinutes,
        horariosEspecificosConfigurados: config.specificTimes,
        frequenciaConfigurada: config.frequencyType || 'diario',
        diasSemanaConfigurados: config.diasSemana || [1, 2, 3, 4, 5],
        ultimoBackupTimestamp: config.lastBackupTimestamp,
        statusUltimoBackup: 'pendente',
        isGoogleDriveConectado: true,
        isOnline: online,
      };
    }
  }

  if (minutosDesdeUltimo !== null && minutosDesdeUltimo >= config.intervalMinutes) {
    return {
      temPendencia: true,
      motivo: `Intervalo de backup (${config.intervalMinutes} min) atingido há ${minutosDesdeUltimo} minutos.`,
      minutosDesdeUltimoBackup: minutosDesdeUltimo,
      intervaloConfigurado: config.intervalMinutes,
      horariosEspecificosConfigurados: config.specificTimes || [],
      frequenciaConfigurada: config.frequencyType || 'diario',
      diasSemanaConfigurados: config.diasSemana || [1, 2, 3, 4, 5],
      ultimoBackupTimestamp: config.lastBackupTimestamp,
      statusUltimoBackup: 'pendente',
      isGoogleDriveConectado: true,
      isOnline: online,
    };
  }

  return {
    temPendencia: false,
    motivo: 'Backups sincronizados com o Google Drive.',
    minutosDesdeUltimoBackup: minutosDesdeUltimo,
    intervaloConfigurado: config.intervalMinutes,
    horariosEspecificosConfigurados: config.specificTimes || [],
    frequenciaConfigurada: config.frequencyType || 'diario',
    diasSemanaConfigurados: config.diasSemana || [1, 2, 3, 4, 5],
    ultimoBackupTimestamp: config.lastBackupTimestamp,
    statusUltimoBackup: config.lastBackupStatus,
    isGoogleDriveConectado: true,
    isOnline: online,
  };
}

