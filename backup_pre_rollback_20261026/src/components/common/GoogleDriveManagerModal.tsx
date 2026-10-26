import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  UploadCloud, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  RefreshCw, 
  Image as ImageIcon, 
  Layers, 
  LogOut, 
  ShieldCheck,
  FileText,
  UserCheck,
  Wifi,
  WifiOff,
  Clock,
  Trash2,
  Database,
  Download,
  History,
  HardDrive,
  RotateCcw
} from 'lucide-react';
import { 
  signInWithGoogleDrive, 
  signOutGoogleDrive, 
  isGoogleDriveConnected, 
  getGoogleCurrentUser, 
  getUploadsGoogleDriveLocais, 
  sincronizarFotosParaGoogleDrive,
  uploadImageToDrive,
  uploadPdfBlobToGradeFolder,
  normalizarNomeSeriePasta,
  DriveUploadedFile,
  DrivePendingUploadItem,
  obterFilaUploadsPendentes,
  processarFilaUploadsPendentes,
  subscribeToDriveUploadQueue,
  removerItemFilaUpload,
  isOnline,
  BACKUP_FOLDER_NAME,
  obterConfiguracaoBackup,
  salvarConfiguracaoBackup,
  subscribeToBackupStatus,
  executarBackupLocalStorageParaDrive,
  listarBackupsNoDrive,
  baixarBackupDoDrive,
  restaurarBackupLocalStorage,
  baixarBackupJsonNavegador,
  BackupConfig,
  DriveBackupFileInfo
} from '../../services/googleDriveService';
import { Estudante, RegistroAcompanhamentoApoio } from '../../types';
import { adicionarListenerConectividade } from '../../services/connectivityService';

interface GoogleDriveManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  estudantes: Estudante[];
  registrosApoio: RegistroAcompanhamentoApoio[];
}

export const GoogleDriveManagerModal: React.FC<GoogleDriveManagerModalProps> = ({
  isOpen,
  onClose,
  estudantes,
  registrosApoio,
}) => {
  const [isConnected, setIsConnected] = useState(isGoogleDriveConnected());
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(
    getGoogleCurrentUser()?.email || null
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ atual: number; total: number } | null>(null);
  const [uploads, setUploads] = useState<DriveUploadedFile[]>([]);
  const [filtroSerie, setFiltroSerie] = useState<string>('todas');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Estados para upload manual/teste
  const [testeSerie, setTesteSerie] = useState<string>('6º Ano');
  const [testeTipo, setTesteTipo] = useState<'foto_estudante' | 'diario_bordo' | 'relatorio_pdf' | 'atividade_adaptada'>('diario_bordo');
  const [isUploadingTeste, setIsUploadingTeste] = useState(false);

  // Fila de Uploads Pendentes (Retomada Automática)
  const [filaUploads, setFilaUploads] = useState<DrivePendingUploadItem[]>(() => obterFilaUploadsPendentes());
  const [isProcessingFila, setIsProcessingFila] = useState(false);
  const [redeOnline, setRedeOnline] = useState<boolean>(() => isOnline());

  // Aba ativa do modal: 'series' (Pastas por Série) ou 'backups' (Serviço de Backup Periódico)
  const [abaModal, setAbaModal] = useState<'series' | 'backups'>('series');

  // Estados do Serviço de Backup em 'Backups_AdaptaEdu'
  const [backupConfig, setBackupConfig] = useState<BackupConfig>(() => obterConfiguracaoBackup());
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [listaBackupsDrive, setListaBackupsDrive] = useState<DriveBackupFileInfo[]>([]);
  const [isLoadingBackupsDrive, setIsLoadingBackupsDrive] = useState<boolean>(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsConnected(isGoogleDriveConnected());
      setCurrentUserEmail(getGoogleCurrentUser()?.email || null);
      setUploads(getUploadsGoogleDriveLocais());
      setFilaUploads(obterFilaUploadsPendentes());
      setRedeOnline(isOnline());
      setBackupConfig(obterConfiguracaoBackup());

      const unsubscribeQueue = subscribeToDriveUploadQueue((novaFila) => {
        setFilaUploads([...novaFila]);
      });

      const unsubscribeBackup = subscribeToBackupStatus((novaConfig) => {
        setBackupConfig({ ...novaConfig });
      });

      const unsubscribeConnectivity = adicionarListenerConectividade((status) => {
        setRedeOnline(status === 'online');
      });

      // Se abrir na aba de backups e conectado, lista backups do Drive
      if (isGoogleDriveConnected()) {
        listarBackupsNoDrive().then(files => setListaBackupsDrive(files)).catch(() => {});
      }

      return () => {
        unsubscribeQueue();
        unsubscribeBackup();
        unsubscribeConnectivity();
      };
    }
  }, [isOpen]);

  const handleCarregarBackupsDrive = async () => {
    if (!isConnected) {
      setMensagemErro('Conecte ao Google Drive para listar os backups.');
      return;
    }
    setIsLoadingBackupsDrive(true);
    setMensagemErro(null);
    try {
      const files = await listarBackupsNoDrive();
      setListaBackupsDrive(files);
    } catch (e: any) {
      setMensagemErro(e.message || 'Falha ao buscar backups no Google Drive.');
    } finally {
      setIsLoadingBackupsDrive(false);
    }
  };

  const handleExecutarBackupAgora = async () => {
    if (!isConnected) {
      setMensagemErro('Conecte ao Google Drive antes de iniciar o backup.');
      return;
    }
    setIsBackingUp(true);
    setMensagemErro(null);
    try {
      const res = await executarBackupLocalStorageParaDrive({ forcar: true });
      if (res.success) {
        setMensagemSucesso(`Backup "${res.fileName}" salvo com sucesso na pasta "${BACKUP_FOLDER_NAME}" no Google Drive!`);
        setTimeout(() => setMensagemSucesso(null), 5000);
        // Atualiza a lista de backups
        handleCarregarBackupsDrive();
      } else {
        setMensagemErro(res.error || res.message || 'Falha no backup.');
      }
    } catch (e: any) {
      setMensagemErro(e.message || 'Erro ao executar backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestaurarBackup = async (file: DriveBackupFileInfo) => {
    const confirmou = window.confirm(
      `Atenção: Deseja restaurar os dados do backup "${file.name}"?\n` +
      `Isso atualizará os dados locais de estudantes, atividades e registros de apoio para o estado deste arquivo.`
    );
    if (!confirmou) return;

    setIsRestoringBackup(true);
    setMensagemErro(null);
    try {
      const payload = await baixarBackupDoDrive(file.id);
      const res = restaurarBackupLocalStorage(payload);
      setMensagemSucesso(res.message);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e: any) {
      setMensagemErro(e.message || 'Erro ao restaurar backup do Google Drive.');
      setIsRestoringBackup(false);
    }
  };

  const handleAlterarIntervalo = (minutos: number) => {
    salvarConfiguracaoBackup({ intervalMinutes: minutos });
    setMensagemSucesso(`Intervalo de backup periódico configurado para ${minutos} minutos.`);
    setTimeout(() => setMensagemSucesso(null), 3000);
  };

  const handleAlternarBackupAtivo = (ativo: boolean) => {
    salvarConfiguracaoBackup({ enabled: ativo });
    setMensagemSucesso(ativo ? 'Backup periódico ativado.' : 'Backup periódico pausado.');
    setTimeout(() => setMensagemSucesso(null), 3000);
  };

  const handleProcessarFilaPendentes = async () => {
    if (!isConnected) {
      setMensagemErro('Conecte ao Google Drive para processar a fila de pendências.');
      return;
    }
    setIsProcessingFila(true);
    setMensagemErro(null);
    try {
      const res = await processarFilaUploadsPendentes();
      setUploads(getUploadsGoogleDriveLocais());
      setFilaUploads(obterFilaUploadsPendentes());
      if (res.sucessos > 0) {
        setMensagemSucesso(`${res.sucessos} documento(s) da fila enviado(s) com sucesso para as respectivas pastas de série!`);
        setTimeout(() => setMensagemSucesso(null), 5000);
      } else if (res.total === 0) {
        setMensagemSucesso('Nenhum upload pendente na fila.');
        setTimeout(() => setMensagemSucesso(null), 3000);
      }
    } catch (e: any) {
      setMensagemErro(e.message || 'Erro ao processar uploads pendentes.');
    } finally {
      setIsProcessingFila(false);
    }
  };

  if (!isOpen) return null;

  const handleConectarGoogle = async () => {
    setIsAuthenticating(true);
    setMensagemErro(null);
    try {
      const res = await signInWithGoogleDrive();
      setIsConnected(true);
      setCurrentUserEmail(res.user.email);
      setMensagemSucesso(`Conectado com sucesso com a conta ${res.user.email}!`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      setMensagemErro(err.message || 'Falha ao conectar com o Google Drive.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDesconectarGoogle = async () => {
    await signOutGoogleDrive();
    setIsConnected(false);
    setCurrentUserEmail(null);
    setMensagemSucesso('Conta Google desconectada.');
    setTimeout(() => setMensagemSucesso(null), 3000);
  };

  const handleSincronizarTodas = async () => {
    if (!isConnected) {
      setMensagemErro('Conecte ao Google Drive antes de sincronizar.');
      return;
    }

    setIsSyncing(true);
    setMensagemErro(null);
    setSyncStatus('Iniciando sincronização...');

    try {
      const resultado = await sincronizarFotosParaGoogleDrive({
        estudantes,
        registrosApoio,
        onProgresso: (p) => {
          setSyncProgress({ atual: p.atual, total: p.total });
          setSyncStatus(p.mensagem);
        },
      });

      setUploads(getUploadsGoogleDriveLocais());
      setMensagemSucesso(
        `Sincronização concluída! ${resultado.sucessos} foto(s) enviada(s) com sucesso para as pastas das séries no Google Drive.`
      );
      setSyncStatus(null);
      setSyncProgress(null);
      setTimeout(() => setMensagemSucesso(null), 5000);
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro durante a sincronização.');
      setSyncStatus(null);
      setSyncProgress(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUploadArquivoTeste = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isConnected) {
      setMensagemErro('Conecte ao Google Drive primeiro.');
      return;
    }

    setIsUploadingTeste(true);
    setMensagemErro(null);

    // Se for um arquivo PDF
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') || testeTipo === 'relatorio_pdf') {
      try {
        const res = await uploadPdfBlobToGradeFolder({
          pdfBlob: file,
          fileName: file.name,
          serie: testeSerie,
          tipoDocumento: 'relatorio_trimestral',
        });

        setIsUploadingTeste(false);
        if (res.success) {
          setUploads(getUploadsGoogleDriveLocais());
          setMensagemSucesso(`Documento PDF "${res.fileName}" enviado para a pasta "${res.folderName}" no Google Drive!`);
          setTimeout(() => setMensagemSucesso(null), 4000);
        } else {
          setMensagemErro(res.error || 'Erro no upload do PDF.');
        }
      } catch (err: any) {
        setIsUploadingTeste(false);
        setMensagemErro(err.message || 'Falha ao enviar PDF para o Drive.');
      }
      e.target.value = '';
      return;
    }

    // Se for uma imagem (Data URL)
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const res = await uploadImageToDrive({
        dataUrl,
        fileName: `${testeTipo === 'diario_bordo' ? 'DiarioBordo' : 'FotoAluno'}_${Date.now()}_${file.name}`,
        serie: testeSerie,
        tipo: testeTipo,
      });

      setIsUploadingTeste(false);
      if (res.success) {
        setUploads(getUploadsGoogleDriveLocais());
        setMensagemSucesso(`Imagem enviada para a pasta "${res.folderName}" no Google Drive!`);
        setTimeout(() => setMensagemSucesso(null), 4000);
      } else {
        setMensagemErro(res.error || 'Erro no upload.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Contagem de fotos disponíveis localmente
  const fotosEstudantesCount = estudantes.filter(e => Boolean(e.fotoUrl)).length;
  const fotosDiarioCount = registrosApoio.filter(r => Boolean(r.fotoDiarioBordoUrl)).length;
  const totalFotosDisponiveis = fotosEstudantesCount + fotosDiarioCount;

  // Séries atendidas
  const seriesPastas = [
    '6º Ano',
    '7º Ano',
    '8º Ano',
    '9º Ano',
    '1ª Série EM',
    '2ª Série EM',
    '3ª Série EM',
    'Geral'
  ];

  // Uploads filtrados
  const uploadsFiltrados = uploads.filter(u => {
    if (filtroSerie === 'todas') return true;
    return normalizarNomeSeriePasta(u.serie) === filtroSerie || u.folderName === filtroSerie;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden text-slate-800 animate-fadeIn">
        
        {/* Topo do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-emerald-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Integração Google Drive</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Pastas por Série & Backups
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Organização por série e serviço de backup periódico do localStorage na pasta 'Backups_AdaptaEdu'
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 sm:px-6 gap-2 pt-2">
          <button
            onClick={() => setAbaModal('series')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              abaModal === 'series'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-t-xl'
            }`}
          >
            <Layers className="h-4 w-4 text-emerald-700" />
            <span>Pastas por Série & Documentos</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
              {uploads.length}
            </span>
          </button>

          <button
            onClick={() => {
              setAbaModal('backups');
              if (isConnected && listaBackupsDrive.length === 0) {
                handleCarregarBackupsDrive();
              }
            }}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              abaModal === 'backups'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-t-xl'
            }`}
          >
            <Database className="h-4 w-4 text-emerald-700" />
            <span>Backups Periódicos ('Backups_AdaptaEdu')</span>
            {backupConfig.enabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                Ativo ({backupConfig.intervalMinutes}m)
              </span>
            )}
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Mensagens de Feedback */}
          {mensagemSucesso && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {mensagemErro && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-rose-700 shrink-0" />
              <span>{mensagemErro}</span>
            </div>
          )}

          {/* Cartão de Status de Conexão com Google */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                isConnected ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {isConnected ? <ShieldCheck className="h-6 w-6" /> : <Folder className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Google Drive:</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                    isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isConnected ? 'Conectado e Ativo' : 'Não Conectado'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  {isConnected 
                    ? `Autenticado como: ${currentUserEmail || 'Conta Google'}`
                    : 'Conecte sua conta Google para salvar fotos e registros em pastas separadas por série no Google Drive.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {isConnected ? (
                <button
                  onClick={handleDesconectarGoogle}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Desconectar</span>
                </button>
              ) : (
                <button
                  onClick={handleConectarGoogle}
                  disabled={isAuthenticating}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 flex items-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      <span>Conectar com Google</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Conteúdo da Aba 1: Pastas por Série & Documentos */}
          {abaModal === 'series' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Fila de Uploads Pendentes (Retomada Automática) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span>Fila de Uploads Pendentes (Retomada Automática)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    filaUploads.length > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {filaUploads.length} {filaUploads.length === 1 ? 'pendência' : 'pendências'}
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  redeOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'
                }`}>
                  {redeOnline ? (
                    <>
                      <Wifi className="h-3 w-3 text-emerald-700" />
                      <span>Rede Conectada</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 text-rose-700" />
                      <span>Sem Conexão (Offline)</span>
                    </>
                  )}
                </span>

                {filaUploads.length > 0 && isConnected && (
                  <button
                    onClick={handleProcessarFilaPendentes}
                    disabled={isProcessingFila || !redeOnline}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {isProcessingFila ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Retomando...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        <span>Processar Fila</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Caso a conexão de rede caia durante o envio de um documento PDF para a pasta de série no Google Drive, o arquivo é mantido com segurança nesta fila e a transmissão é retomada de forma 100% automática assim que a rede for restabelecida.
            </p>

            {filaUploads.length > 0 ? (
              <div className="space-y-2 pt-1">
                {filaUploads.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-rose-600 shrink-0" />
                        <span className="font-bold text-slate-800 truncate" title={item.fileName}>
                          {item.fileName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold shrink-0">
                          {item.serie}
                        </span>
                        {item.status === 'uploading' && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold flex items-center gap-1">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" /> Enviando...
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        {item.studentName && <span>Estudante: <strong>{item.studentName}</strong></span>}
                        <span>Tamanho: {(item.sizeBytes / 1024).toFixed(1)} KB</span>
                        {item.attempts > 0 && <span>Tentativas: {item.attempts}</span>}
                        {item.lastError && (
                          <span className="text-rose-600 truncate max-w-[250px]" title={item.lastError}>
                            • {item.lastError}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => removerItemFilaUpload(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover da fila"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Nenhum documento pendente na fila. Todos os envios para as pastas de série estão sincronizados.</span>
              </div>
            )}
          </div>

          {/* Estrutura de Pastas por Série no Google Drive */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-700" />
                <span>Pastas Organizadoras por Série no Google Drive</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Pasta Principal: <strong>AdaptaEdu Escolar - Registros e Imagens</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {seriesPastas.map((serie) => {
                const countSerie = uploads.filter(
                  u => normalizarNomeSeriePasta(u.serie) === serie || u.folderName === serie
                ).length;
                return (
                  <div
                    key={serie}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-extrabold text-slate-800 truncate">{serie}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                      {countSerie} {countSerie === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção de Sincronização em Lote */}
          <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-emerald-900 block">
                Sincronizar Todas as Imagens Cadastradas ({totalFotosDisponiveis} fotos)
              </span>
              <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                Envia de forma automática todas as fotografias dos estudantes ({fotosEstudantesCount}) e do Diário de Bordo ({fotosDiarioCount}) diretamente para a pasta da respectiva série no seu Google Drive.
              </p>
              {syncStatus && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 pt-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{syncStatus}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleSincronizarTodas}
              disabled={isSyncing || totalFotosDisponiveis === 0}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors shrink-0 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Sincronizar Fotos no Drive</span>
                </>
              )}
            </button>
          </div>

          {/* Envio Direto de Imagem para Teste / Registro Específico */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <UploadCloud className="h-4 w-4 text-emerald-700" />
              <span>Enviar Imagem Manualmente para Pasta da Série</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Série / Pasta de Destino:
                </label>
                <select
                  value={testeSerie}
                  onChange={(e) => setTesteSerie(e.target.value)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
                >
                  {seriesPastas.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tipo de Arquivo:
                </label>
                <select
                  value={testeTipo}
                  onChange={(e) => setTesteTipo(e.target.value as any)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
                >
                  <option value="diario_bordo">Diário de Bordo (Apoio - Imagem)</option>
                  <option value="foto_estudante">Fotografia do Aluno (Imagem)</option>
                  <option value="relatorio_pdf">Relatório Pedagógico / Atividade (PDF)</option>
                  <option value="atividade_adaptada">Atividade Adaptada (Imagem/Folha)</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  {isUploadingTeste ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 text-emerald-400" />
                      <span>Selecionar Arquivo (Imagem ou PDF)</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleUploadArquivoTeste}
                    disabled={isUploadingTeste}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Histórico de Uploads / Arquivos no Drive */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-indigo-700" />
                <span>Arquivos no Google Drive ({uploadsFiltrados.length})</span>
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Filtrar Série:</span>
                <select
                  value={filtroSerie}
                  onChange={(e) => setFiltroSerie(e.target.value)}
                  className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="todas">Todas as Séries</option>
                  {seriesPastas.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {uploadsFiltrados.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
                <ImageIcon className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  Nenhum arquivo ou imagem enviado para o Google Drive nesta categoria ainda.
                </p>
                <p className="text-[11px] text-slate-400">
                  Ao salvar fotos no Diário de Bordo, relatórios pedagógicos em PDF ou fotos de estudantes com o Google Drive conectado, eles aparecerão aqui organizados por série.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Arquivo</th>
                      <th className="p-2.5">Pasta (Série)</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Data de Envio</th>
                      <th className="p-2.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {uploadsFiltrados.map((up) => {
                      const isPdf = up.tipo === 'relatorio_pdf' || up.tipo === 'documento_pdf' || up.name.toLowerCase().endsWith('.pdf');
                      return (
                        <tr key={up.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-semibold text-slate-900 flex items-center gap-2">
                            {isPdf ? (
                              <FileText className="h-4 w-4 text-rose-600 shrink-0" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px]" title={up.name}>
                              {up.name}
                            </span>
                            {isPdf && (
                              <span className="text-[9px] font-black uppercase px-1 rounded bg-rose-100 text-rose-800 shrink-0">
                                PDF
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                              {up.folderName || up.serie}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className="capitalize text-slate-600">
                              {up.tipo.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                            {new Date(up.uploadedAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-2.5 text-right">
                            <a
                              href={up.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer"
                            >
                              <span>Abrir no Drive</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 2: Backups Periódicos ('Backups_AdaptaEdu') */}
      {abaModal === 'backups' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Card de Destaque da Pasta Dedicada 'Backups_AdaptaEdu' */}
          <div className="p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl shadow-md border border-emerald-700/40 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
              <Database className="w-48 h-48 text-white" />
            </div>
            <div className="relative z-10 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                    <Folder className="h-4 w-4" />
                  </div>
                  <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-300">
                    Pasta Dedicada no Google Drive
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 font-mono">
                  {BACKUP_FOLDER_NAME}
                </span>
              </div>

              <h3 className="text-base font-extrabold text-white">
                Serviço de Backup Periódico dos Dados do localStorage
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Gera e transmite cópias de segurança integrais em formato JSON diretamente para a pasta dedicada <strong className="text-emerald-300">{BACKUP_FOLDER_NAME}</strong> no Google Drive, preservando dados do localStorage: <strong className="text-white">estudantes</strong>, <strong className="text-white">atividades adaptadas</strong>, <strong className="text-white">registros diários de apoio</strong>, perfis pedagógicos e histórico.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs border border-white/10">
                  <span className="text-[10px] text-slate-400 block font-semibold">Estudantes no Backup:</span>
                  <strong className="text-sm font-black text-white">{estudantes.length} cadastrados</strong>
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs border border-white/10">
                  <span className="text-[10px] text-slate-400 block font-semibold">Registros de Apoio:</span>
                  <strong className="text-sm font-black text-white">{registrosApoio.length} lançamentos</strong>
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs border border-white/10">
                  <span className="text-[10px] text-slate-400 block font-semibold">Frequência Automática:</span>
                  <strong className="text-sm font-black text-emerald-400">
                    {backupConfig.enabled ? `A cada ${backupConfig.intervalMinutes} min` : 'Pausado'}
                  </strong>
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs border border-white/10">
                  <span className="text-[10px] text-slate-400 block font-semibold">Conexão de Rede:</span>
                  <strong className={`text-sm font-black ${redeOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {redeOnline ? 'Online (Conectado)' : 'Offline'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Controles de Configuração do Intervalo Periódico & Execução Manual */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-emerald-700" />
                  <span>Configuração do Backup Periódico</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Quando ativo e com rede conectada, o serviço executa o backup automaticamente e salva na pasta '{BACKUP_FOLDER_NAME}'.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={backupConfig.enabled}
                    onChange={(e) => handleAlternarBackupAtivo(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Agendador Ativo</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Intervalo de Repetição:
                </label>
                <select
                  value={backupConfig.intervalMinutes}
                  onChange={(e) => handleAlterarIntervalo(Number(e.target.value))}
                  disabled={!backupConfig.enabled}
                  className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  <option value={15}>A cada 15 minutos (Alta frequência)</option>
                  <option value={30}>A cada 30 minutos (Recomendado)</option>
                  <option value={60}>A cada 1 hora</option>
                  <option value={180}>A cada 3 horas</option>
                  <option value={360}>A cada 6 horas</option>
                  <option value={1440}>Diário (A cada 24 horas)</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex flex-col justify-end">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExecutarBackupAgora}
                    disabled={isBackingUp || !isConnected}
                    className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isBackingUp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Enviando para '{BACKUP_FOLDER_NAME}'...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        <span>Executar Backup Imediato para Google Drive</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => baixarBackupJsonNavegador()}
                    className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Baixar cópia do arquivo JSON no navegador"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Baixar JSON Local</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Resumo do Último Backup */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${
                  backupConfig.lastBackupStatus === 'sucesso' ? 'bg-emerald-500' :
                  backupConfig.lastBackupStatus === 'erro' ? 'bg-rose-500' :
                  backupConfig.lastBackupStatus === 'em_andamento' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'
                }`} />
                <span className="text-slate-500 font-medium">Último Backup Periódico:</span>
                <strong className="text-slate-900">
                  {backupConfig.lastBackupTimestamp
                    ? new Date(backupConfig.lastBackupTimestamp).toLocaleString('pt-BR')
                    : 'Aguardando primeiro ciclo de backup'}
                </strong>
              </div>

              {backupConfig.lastBackupStats && (
                <div className="text-[11px] text-slate-600 font-medium flex items-center gap-2">
                  <span>Alunos: <strong>{backupConfig.lastBackupStats.estudantes}</strong></span>
                  <span>•</span>
                  <span>Atividades: <strong>{backupConfig.lastBackupStats.atividades}</strong></span>
                  <span>•</span>
                  <span>Registros: <strong>{backupConfig.lastBackupStats.registros}</strong></span>
                </div>
              )}

              {backupConfig.lastBackupWebViewLink && (
                <a
                  href={backupConfig.lastBackupWebViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold inline-flex items-center gap-1 underline"
                >
                  <span>Abrir no Drive</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Lista de Backups Armazenados no Google Drive na pasta 'Backups_AdaptaEdu' */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <History className="h-4 w-4 text-emerald-700" />
                <span>Backups na Pasta '{BACKUP_FOLDER_NAME}' no Drive ({listaBackupsDrive.length})</span>
              </h4>

              <button
                onClick={handleCarregarBackupsDrive}
                disabled={isLoadingBackupsDrive || !isConnected}
                className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingBackupsDrive ? 'animate-spin' : ''}`} />
                <span>Atualizar Lista</span>
              </button>
            </div>

            {isLoadingBackupsDrive ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-700 mx-auto mb-2" />
                <span className="text-xs text-slate-600 font-semibold">Buscando backups na pasta '{BACKUP_FOLDER_NAME}'...</span>
              </div>
            ) : !isConnected ? (
              <div className="p-6 text-center bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <AlertCircle className="h-6 w-6 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-amber-900">
                  Conecte sua conta Google para listar e restaurar os arquivos da pasta '{BACKUP_FOLDER_NAME}'.
                </p>
              </div>
            ) : listaBackupsDrive.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                <HardDrive className="h-8 w-8 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Nenhum backup encontrado na pasta '{BACKUP_FOLDER_NAME}' ainda.</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Clique no botão "Executar Backup Imediato para Google Drive" acima ou aguarde o ciclo periódico automático de {backupConfig.intervalMinutes} minutos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Arquivo de Backup</th>
                      <th className="p-2.5">Data & Hora</th>
                      <th className="p-2.5">Tamanho</th>
                      <th className="p-2.5">Dados Salvos</th>
                      <th className="p-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {listaBackupsDrive.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-emerald-700 shrink-0" />
                            <span className="font-bold text-slate-900 truncate max-w-[220px]" title={b.name}>
                              {b.name}
                            </span>
                            <span className="text-[9px] font-black uppercase px-1 rounded bg-emerald-100 text-emerald-800">
                              JSON
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                          {b.createdAt ? new Date(b.createdAt).toLocaleString('pt-BR') : '-'}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {(b.sizeBytes / 1024).toFixed(1)} KB
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-600">
                          {b.stats && (b.stats.estudantes > 0 || b.stats.atividades > 0 || b.stats.registros > 0) ? (
                            <span>
                              {b.stats.estudantes} alunos • {b.stats.atividades} ativ • {b.stats.registros} reg
                            </span>
                          ) : (
                            <span className="text-slate-400">Snapshot completo</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {b.webViewLink && (
                              <a
                                href={b.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Abrir no Google Drive"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => handleRestaurarBackup(b)}
                              disabled={isRestoringBackup}
                              className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Restaurar dados locais a partir deste backup"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Restaurar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Escopo: Google Drive API (drive.file) • Modo de Inclusão Escolar
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
