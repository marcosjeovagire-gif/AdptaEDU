import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Award, 
  History, 
  Settings, 
  Plus, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  FileCheck, 
  Edit2, 
  Archive, 
  Eye, 
  Trash2,
  Home,
  Check,
  X,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Camera,
  Key,
  Lock,
  Mail,
  RefreshCw,
  UserCheck,
  UserX,
  Database,
  ChevronDown,
  Sparkles,
  FileSpreadsheet,
  Printer,
  HeartHandshake,
  Calendar,
  Download,
  Image as ImageIcon,
  LayoutGrid,
  Table as TableIcon,
  School,
  Folder,
  UploadCloud,
  ExternalLink,
  CheckSquare,
  Square,
  FileDown,
  Loader2,
  Clock,
  Wifi,
  Save
} from 'lucide-react';
import { 
  Estudante, 
  Professor, 
  AuthorizedUser, 
  HabilidadeAprovada, 
  PerfilPedagogico, 
  DocumentoImportado, 
  AtividadeAdaptada, 
  RegistroHistorico, 
  EscolaConfig,
  UserRole,
  RegistroAuditoria,
  CurriculumMatrix,
  RegistroAcompanhamentoApoio
} from '../../types';
import { PROFISSIONAIS_APOIO_IDENTIFICADOS_PDF } from '../../data/pdfServerData';
import { TURMAS_OFICIAIS_ESCOLA, gerarEstudantesOficiaisDoPdf } from '../../data/pdfEstudantesData';
import { compressImageFile } from '../../utils/imageCompressor';
import { RevisaoImportacaoUsuariosModal } from './RevisaoImportacaoUsuariosModal';
import { RevisaoImportacaoEstudantesModal } from './RevisaoImportacaoEstudantesModal';
import { FichaEstudanteModal } from './FichaEstudanteModal';
import { ExportarAuditoriaModal } from './ExportarAuditoriaModal';
import { exportAuditoriaToCSV, exportAuditoriaToPDF } from '../../services/auditExportService';
import { previewUserImport, authorizeNewUser, validarProtecaoUltimoCoordenador, unlinkUserUid } from '../../server/authService';
import { runAllStudentSecurityTests } from '../../server/__tests__/studentSecurityTests';
import { runAllSecurityTests, TESTES_FIREBASE_PENDENTES } from '../../server/__tests__/authSecurityTests';
import { CoordenacaoDashboardCharts } from './CoordenacaoDashboardCharts';
import { PainelLembretesCoordenacao } from './PainelLembretesCoordenacao';
import { RelatorioMensalApoioModal } from '../apoio/RelatorioMensalApoioModal';
import { RelatorioEvolucaoTrimestralModal } from './RelatorioEvolucaoTrimestralModal';
import { RelatorioPdiModal } from './RelatorioPdiModal';
import { PainelAuditoriaAvancada } from './PainelAuditoriaAvancada';
import { GraficoHistoricoBimestre } from './GraficoHistoricoBimestre';
import { CardCoberturaPeiPorTurma } from './CardCoberturaPeiPorTurma';
import { PeiGeneratorModal } from '../pei/PeiGeneratorModal';
import { baixarMultiplasAtividadesComoPdf } from '../../services/atividadeA4PdfService';
import { PeiDocumento } from '../../types';
import { baixarPeiComoPdf, sanitizarNomeArquivoPei } from '../../services/peiPdfService';
import { obterTodosPeis } from '../../services/peiService';
import { baixarRelatorioConsolidadoEstudantePdf } from '../../services/relatorioConsolidadoService';
import { 
  obterConfiguracaoBackup, 
  salvarConfiguracaoBackup,
  executarBackupLocalStorageParaDrive,
  inscreverMudancaBackup,
  testarConexaoGoogleDrive,
  TesteConexaoDriveResultado
} from '../../services/backupDriveService';
import { 
  salvarPreferenciasBackupNoFirestore, 
  obterPreferenciasEscolaDoFirestore 
} from '../../services/escolaFirestoreService';

export type AbaCoordenacao = 
  | 'inicio'
  | 'estudantes' 
  | 'professores' 
  | 'apoio'
  | 'perfis' 
  | 'documentos'
  | 'matriz' 
  | 'habilidades' 
  | 'atividades' 
  | 'historico' 
  | 'configuracoes';

export interface CoordenacaoViewProps {
  escolaConfig: EscolaConfig;
  onUpdateEscolaConfig: (novaConfig: EscolaConfig) => void;
  estudantes: Estudante[];
  onAddEstudante: (novo: Estudante) => void;
  onBatchAddEstudantes?: (novos: Estudante[]) => void;
  onResetarEstudantesParaPadrao?: () => void;
  onUpdateEstudante: (atualizado: Estudante) => void;
  usuariosAutorizados: AuthorizedUser[];
  onUpdateUsuariosAutorizados: (usuarios: AuthorizedUser[]) => void;
  currentUserRoles: UserRole[];
  currentUserName?: string;
  currentUser?: AuthorizedUser | null;
  perfisPedagogicos: PerfilPedagogico[];
  onAddPerfilPedagogico: (novo: PerfilPedagogico) => void;
  habilidades: HabilidadeAprovada[];
  onAddHabilidade: (nova: HabilidadeAprovada) => void;
  onAprovarHabilidade: (id: string) => void;
  documentos: DocumentoImportado[];
  onAddDocumento: (doc: DocumentoImportado) => void;
  atividades: AtividadeAdaptada[];
  historico: RegistroHistorico[];
  auditoria: RegistroAuditoria[];
  onAddAuditoria: (auditoria: RegistroAuditoria) => void;
  onVisualizarAtividadeA4: (atividade: AtividadeAdaptada) => void;
  matrizesCurriculares?: CurriculumMatrix[];
  onOpenImportarMatriz?: () => void;
  onOpenCentralMaster?: () => void;
  registrosApoio?: RegistroAcompanhamentoApoio[];
  onSalvarRegistroApoio?: (novo: RegistroAcompanhamentoApoio) => void;
  onNavigateToApoio?: () => void;
  onOpenGoogleDrive?: () => void;
  isGoogleDriveConnected?: boolean;
  onOpenCriarPei?: (estudanteId?: string) => void;
  initialTab?: AbaCoordenacao;
  initialEstudanteId?: string;
}

export const CoordenacaoView: React.FC<CoordenacaoViewProps> = ({
  escolaConfig,
  onUpdateEscolaConfig,
  estudantes,
  onAddEstudante,
  onBatchAddEstudantes,
  onResetarEstudantesParaPadrao,
  onUpdateEstudante,
  usuariosAutorizados,
  onUpdateUsuariosAutorizados,
  currentUserRoles,
  currentUserName,
  currentUser,
  perfisPedagogicos,
  onAddPerfilPedagogico,
  habilidades,
  onAddHabilidade,
  onAprovarHabilidade,
  documentos,
  onAddDocumento,
  atividades,
  historico,
  auditoria,
  onAddAuditoria,
  onVisualizarAtividadeA4,
  matrizesCurriculares = [],
  onOpenImportarMatriz,
  onOpenCentralMaster,
  registrosApoio = [],
  onSalvarRegistroApoio,
  onNavigateToApoio,
  onOpenGoogleDrive,
  isGoogleDriveConnected = false,
  onOpenCriarPei,
  initialTab,
  initialEstudanteId,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<AbaCoordenacao>(() => initialTab || 'inicio');

  // Estados locais para criação de PEI (SEDUC-GO) e exportação em PDF
  const [modalPeiInternoAberto, setModalPeiInternoAberto] = useState<boolean>(false);
  const [estudanteIdPeiInterno, setEstudanteIdPeiInterno] = useState<string | undefined>(undefined);
  const [baixandoPeiDocId, setBaixandoPeiDocId] = useState<string | null>(null);
  const [filtroTipoDocumento, setFiltroTipoDocumento] = useState<'todos' | 'pei' | 'outros'>('todos');
  
  // Estados para Backup Agendado e Sincronização Google Drive
  const [configBackup, setConfigBackup] = useState(() => obterConfiguracaoBackup());
  const [novoHorario, setNovoHorario] = useState(() => {
    const config = obterConfiguracaoBackup();
    return (config.specificTimes && config.specificTimes.length > 0) ? config.specificTimes[0] : '22:00';
  });
  const [isExecutandoBackupManual, setIsExecutandoBackupManual] = useState(false);
  const [feedbackBackupManual, setFeedbackBackupManual] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);
  const [salvandoFirestore, setSalvandoFirestore] = useState(false);
  const [statusSalvarFirestore, setStatusSalvarFirestore] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const handleSalvarPreferenciasFirestore = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSalvandoFirestore(true);
    setStatusSalvarFirestore(null);
    try {
      const horaParaSalvar = novoHorario || '22:00';
      const frequenciaParaSalvar = (configBackup.frequencyType || 'diario') as 'diario' | 'semanal';

      const res = await salvarPreferenciasBackupNoFirestore({
        horario: horaParaSalvar,
        frequencia: frequenciaParaSalvar,
        enabled: configBackup.enabled,
        escolaConfig: formEscola,
      });

      const configAtualizada: EscolaConfig = {
        ...formEscola,
        backupHorario: horaParaSalvar,
        backupFrequencia: frequenciaParaSalvar,
        backupConfig: {
          horario: horaParaSalvar,
          frequencia: frequenciaParaSalvar,
          enabled: configBackup.enabled,
          atualizadoEm: new Date().toISOString(),
          atualizadoPor: 'Coordenação Pedagógica',
        },
      };
      setFormEscola(configAtualizada);
      onUpdateEscolaConfig(configAtualizada);

      if (res.salvoNoFirestore || res.success) {
        setStatusSalvarFirestore({
          tipo: 'sucesso',
          texto: res.message || 'Preferências salvas no Firestore no documento de configurações da escola com sucesso!'
        });
      } else {
        setStatusSalvarFirestore({
          tipo: 'erro',
          texto: res.message || 'Falha ao gravar no Firestore. Preferências preservadas localmente.'
        });
      }
    } catch (err: any) {
      setStatusSalvarFirestore({
        tipo: 'erro',
        texto: `Erro ao salvar no Firestore: ${err?.message || 'Falha de comunicação'}.`
      });
    } finally {
      setSalvandoFirestore(false);
      setTimeout(() => {
        setStatusSalvarFirestore(null);
      }, 5000);
    }
  };

  React.useEffect(() => {
    const unsub = inscreverMudancaBackup((novaConfig) => {
      setConfigBackup(novaConfig);
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    let montado = true;
    const carregarPreferenciasFirestore = async () => {
      try {
        const idEscola = escolaConfig?.id;
        const res = await obterPreferenciasEscolaDoFirestore(idEscola);
        if (montado && res.success && res.dados) {
          const dados = res.dados;
          const horarioFirestore = dados.backupHorario || dados.backupConfig?.horario;
          const frequenciaFirestore = dados.backupFrequencia || dados.backupConfig?.frequencia;
          if (horarioFirestore) {
            setNovoHorario(horarioFirestore);
          }
          if (frequenciaFirestore) {
            const updated = salvarConfiguracaoBackup({ frequencyType: frequenciaFirestore });
            setConfigBackup(updated);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar preferências de backup do Firestore:', err);
      }
    };
    carregarPreferenciasFirestore();
    return () => {
      montado = false;
    };
  }, [escolaConfig?.id]);

  const handleAlternarHorarioPredefinido = (horario: string) => {
    const atuais = configBackup.specificTimes || [];
    let novos: string[];
    if (atuais.includes(horario)) {
      novos = atuais.filter(h => h !== horario);
    } else {
      novos = [...atuais, horario].sort();
    }
    const updated = salvarConfiguracaoBackup({ specificTimes: novos });
    setConfigBackup(updated);
  };

  const handleRemoverHorario = (horarioParaRemover: string) => {
    const atuais = configBackup.specificTimes || [];
    const novos = atuais.filter(h => h !== horarioParaRemover);
    const updated = salvarConfiguracaoBackup({ specificTimes: novos });
    setConfigBackup(updated);
  };

  const handleAdicionarHorarioPersonalizado = () => {
    if (!novoHorario) return;
    const regexHora = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regexHora.test(novoHorario)) {
      setFeedbackBackupManual({ tipo: 'erro', texto: 'Informe um horário válido no formato HH:MM.' });
      return;
    }
    const atuais = configBackup.specificTimes || [];
    if (atuais.includes(novoHorario)) {
      setFeedbackBackupManual({ tipo: 'info', texto: `O horário ${novoHorario} já está agendado.` });
      return;
    }
    const novos = [...atuais, novoHorario].sort();
    const updated = salvarConfiguracaoBackup({ specificTimes: novos });
    setConfigBackup(updated);
    setFeedbackBackupManual({ tipo: 'sucesso', texto: `Horário ${novoHorario} agendado com sucesso.` });
    setTimeout(() => setFeedbackBackupManual(null), 3000);
  };

  const handleExecutarBackupAgora = async () => {
    setIsExecutandoBackupManual(true);
    setFeedbackBackupManual(null);
    try {
      const res = await executarBackupLocalStorageParaDrive({ forcar: true });
      if (res.success) {
        setFeedbackBackupManual({
          tipo: 'sucesso',
          texto: `Backup sincronizado com sucesso às ${new Date().toLocaleTimeString('pt-BR')}! Gravado no Google Drive.`
        });
      } else {
        setFeedbackBackupManual({
          tipo: 'erro',
          texto: res.message || 'Falha ao executar backup para o Google Drive.'
        });
      }
    } catch (e: any) {
      setFeedbackBackupManual({
        tipo: 'erro',
        texto: e?.message || 'Erro inesperado ao realizar backup.'
      });
    } finally {
      setIsExecutandoBackupManual(false);
    }
  };

  const [isTestandoConexaoDrive, setIsTestandoConexaoDrive] = useState(false);
  const [resultadoTesteDrive, setResultadoTesteDrive] = useState<TesteConexaoDriveResultado | null>(null);

  const handleTestarConexaoDrive = async () => {
    setIsTestandoConexaoDrive(true);
    setResultadoTesteDrive(null);
    try {
      const res = await testarConexaoGoogleDrive();
      setResultadoTesteDrive(res);
      if (res.success) {
        setFeedbackBackupManual({
          tipo: 'sucesso',
          texto: `Conexão com Google Drive ativa e validada (${res.latenciaMs ?? 0}ms). Conta: ${res.email || 'Conectada'}.`
        });
      } else {
        setFeedbackBackupManual({
          tipo: 'erro',
          texto: res.mensagem
        });
      }
    } catch (err: any) {
      setResultadoTesteDrive({
        success: false,
        status: 'erro_api',
        mensagem: err?.message || 'Erro inesperado ao testar comunicação com o Google Drive.',
        timestamp: new Date().toISOString()
      });
      setFeedbackBackupManual({
        tipo: 'erro',
        texto: 'Falha na comunicação de rede com o Google Drive.'
      });
    } finally {
      setIsTestandoConexaoDrive(false);
    }
  };

  const handleAlterarFrequencia = (novaFrequencia: 'diario' | 'semanal') => {
    const updated = salvarConfiguracaoBackup({ frequencyType: novaFrequencia });
    setConfigBackup(updated);
  };

  const handleAlternarDiaSemana = (dia: number) => {
    const diasAtuais = configBackup.diasSemana || [1, 2, 3, 4, 5];
    let novosDias: number[];
    if (diasAtuais.includes(dia)) {
      novosDias = diasAtuais.filter(d => d !== dia);
      if (novosDias.length === 0) novosDias = [dia];
    } else {
      novosDias = [...diasAtuais, dia].sort();
    }
    const updated = salvarConfiguracaoBackup({ diasSemana: novosDias });
    setConfigBackup(updated);
  };

  const handleDispararCriarPei = (estId?: string) => {
    if (onOpenCriarPei) {
      onOpenCriarPei(estId);
    } else {
      setEstudanteIdPeiInterno(estId);
      setModalPeiInternoAberto(true);
    }
  };

  const [downloadingConsolidadoAlunoId, setDownloadingConsolidadoAlunoId] = useState<string | null>(null);
  const [notificacaoConsolidado, setNotificacaoConsolidado] = useState<string | null>(null);

  const handleBaixarRelatorioConsolidado = (est: Estudante) => {
    try {
      setDownloadingConsolidadoAlunoId(est.id);
      const peiAluno = peisArmazenados.find(p => p.studentId === est.id);
      const perfilAluno = perfisPedagogicos.find(p => p.estudanteId === est.id);
      const { fileName } = baixarRelatorioConsolidadoEstudantePdf(
        est,
        atividades,
        registrosApoio,
        peiAluno,
        perfilAluno,
        escolaConfig,
        currentUserName || 'Coordenação de Educação Especial'
      );
      setNotificacaoConsolidado(`Relatório Consolidado (${fileName}) baixado com sucesso!`);
      setTimeout(() => setNotificacaoConsolidado(null), 4500);
    } catch (err: any) {
      console.error('Erro ao baixar relatório consolidado:', err);
      alert('Não foi possível gerar o relatório consolidado.');
    } finally {
      setDownloadingConsolidadoAlunoId(null);
    }
  };

  // Sincroniza aba e estudante inicial vindos de links compartilhados
  React.useEffect(() => {
    if (initialTab) {
      setAbaAtiva(initialTab);
    }
  }, [initialTab]);

  React.useEffect(() => {
    if (initialEstudanteId) {
      const aluno = estudantes.find(e => e.id === initialEstudanteId);
      if (aluno) {
        setEstudanteFichaModal(aluno);
        setAbaAtiva('estudantes');
      }
    }
  }, [initialEstudanteId, estudantes]);

  // Modal de Importação do PDF de Usuários/Professores
  const [modalImportarUsuariosAberto, setModalImportarUsuariosAberto] = useState(false);
  const [registrosParaRevisao, setRegistrosParaRevisao] = useState<any[]>([]);

  // Modal de Importação de Estudantes (PDF) & Ficha Individual
  const [modalImportarEstudantesAberto, setModalImportarEstudantesAberto] = useState(false);
  const [estudanteFichaModal, setEstudanteFichaModal] = useState<Estudante | null>(null);
  const [buscaEstudante, setBuscaEstudante] = useState('');
  const [filtroTurmaEstudante, setFiltroTurmaEstudante] = useState('todas');
  const [filtroStatusEstudante, setFiltroStatusEstudante] = useState('todos');
  const [modoVisualizacaoEstudantes, setModoVisualizacaoEstudantes] = useState<'tabela_salas' | 'cards' | 'resumo_turmas'>('tabela_salas');
  const [feedbackEstudantes, setFeedbackEstudantes] = useState<string | null>(null);
  const [estudanteIdParaUploadFoto, setEstudanteIdParaUploadFoto] = useState<string | null>(null);
  const fileInputFotoEstudanteRef = useRef<HTMLInputElement>(null);
  const [testesSegurancaResultados, setTestesSegurancaResultados] = useState<any[] | null>(null);
  const [menuAcoesRapidasAberto, setMenuAcoesRapidasAberto] = useState(false);

  // Estados para consulta de Profissional de Apoio na Coordenação
  const [buscaApoioEstudante, setBuscaApoioEstudante] = useState('');
  const [filtroApoioTurma, setFiltroApoioTurma] = useState<string>('todas');
  const [filtroApoioProfissional, setFiltroApoioProfissional] = useState<string>('todos');
  const [filtroApoioPresenca, setFiltroApoioPresenca] = useState<'todos' | 'presente' | 'ausente'>('todos');
  const [filtroApoioDataInicio, setFiltroApoioDataInicio] = useState<string>('');
  const [filtroApoioDataFim, setFiltroApoioDataFim] = useState<string>('');
  const [fotoModalDiarioBordoUrl, setFotoModalDiarioBordoUrl] = useState<string | null>(null);
  const [fotoModalTitulo, setFotoModalTitulo] = useState<string>('');
  const [modalRelatorioApoioAberto, setModalRelatorioAberto] = useState(false);
  const [alunoSelecionadoParaRelatorio, setAlunoSelecionadoParaRelatorio] = useState<Estudante | null>(null);
  const [modalRelatorioTrimestralAberto, setModalRelatorioTrimestralAberto] = useState(false);
  const [modalRelatorioPdiAberto, setModalRelatorioPdiAberto] = useState(false);
  const [pdiEstudanteInicialId, setPdiEstudanteInicialId] = useState<string | undefined>(undefined);
  const [filtroSerieEstudante, setFiltroSerieEstudante] = useState<string>('todas');
  const [filtroPerfilEstudante, setFiltroPerfilEstudante] = useState<'todos' | 'com_perfil' | 'sem_perfil'>('todos');

  // Estados para animação (framer-motion) e expansão dos Cards de Estudantes
  const [cardsEstudantesExpandidos, setCardsEstudantesExpandidos] = useState<Record<string, boolean>>({});
  const [peisArmazenados, setPeisArmazenados] = useState<PeiDocumento[]>([]);

  // Sincronização em tempo real de PEIs do sistema para alimentar os cards
  useEffect(() => {
    let cancel = false;
    obterTodosPeis().then((list) => {
      if (!cancel) setPeisArmazenados(list);
    });
    const handleUpdate = () => {
      obterTodosPeis().then((list) => {
        if (!cancel) setPeisArmazenados(list);
      });
    };
    window.addEventListener('adaptaedu:pei_atualizado', handleUpdate);
    window.addEventListener('adaptaedu:pei_excluido', handleUpdate);
    return () => {
      cancel = true;
      window.removeEventListener('adaptaedu:pei_atualizado', handleUpdate);
      window.removeEventListener('adaptaedu:pei_excluido', handleUpdate);
    };
  }, []);

  // Estados para Seleção Múltipla e Exportação Contínua em Lote de Atividades (A4)
  const [atividadesSelecionadasIds, setAtividadesSelecionadasIds] = useState<Set<string>>(new Set());
  const [isExportandoLoteAtividadesPdf, setIsExportandoLoteAtividadesPdf] = useState(false);
  const [feedbackExportacaoLote, setFeedbackExportacaoLote] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const [filtroTurmaAtividade, setFiltroTurmaAtividade] = useState('todas');
  const [filtroStatusAtividade, setFiltroStatusAtividade] = useState('todos');
  const [buscaAtividade, setBuscaAtividade] = useState('');

  const turmasAtividadesDisponiveis = useMemo(() => {
    return Array.from(new Set(atividades.map(a => a.turma))).filter(Boolean).sort();
  }, [atividades]);

  const atividadesFiltradas = useMemo(() => {
    return atividades.filter(ativ => {
      const matchTurma = filtroTurmaAtividade === 'todas' || ativ.turma === filtroTurmaAtividade;
      const matchStatus = filtroStatusAtividade === 'todos' || ativ.status === filtroStatusAtividade;
      const termo = buscaAtividade.trim().toLowerCase();
      const matchBusca = !termo || (
        (ativ.conteudo && ativ.conteudo.toLowerCase().includes(termo)) ||
        (ativ.estudanteNome && ativ.estudanteNome.toLowerCase().includes(termo)) ||
        (ativ.professorNome && ativ.professorNome.toLowerCase().includes(termo)) ||
        (ativ.disciplina && ativ.disciplina.toLowerCase().includes(termo)) ||
        (ativ.habilidadeCodigo && ativ.habilidadeCodigo.toLowerCase().includes(termo))
      );
      return matchTurma && matchStatus && matchBusca;
    });
  }, [atividades, filtroTurmaAtividade, filtroStatusAtividade, buscaAtividade]);

  const handleToggleSelecionarAtividade = (id: string) => {
    setAtividadesSelecionadasIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelecionarTodasAtividadesFiltradas = () => {
    setAtividadesSelecionadasIds(new Set(atividadesFiltradas.map(a => a.id)));
  };

  const handleDesmarcarTodasAtividades = () => {
    setAtividadesSelecionadasIds(new Set());
  };

  const handleExportarAtividadesSelecionadasPdf = async () => {
    const selecionadas = atividades.filter(a => atividadesSelecionadasIds.has(a.id));
    if (selecionadas.length === 0) return;

    setIsExportandoLoteAtividadesPdf(true);
    setFeedbackExportacaoLote(null);

    try {
      const { fileName } = await baixarMultiplasAtividadesComoPdf(selecionadas, escolaConfig);

      onAddAuditoria({
        id: `aud-export-lote-${Date.now()}`,
        dataHora: new Date().toLocaleString('pt-BR'),
        usuarioResponsavel: currentUserName || 'Coordenação',
        usuarioAlterado: `${selecionadas.length} Atividades Selecionadas`,
        perfisAnteriores: [],
        perfisPosteriores: [],
        situacaoAnterior: 'Atividades Individuais',
        situacaoPosterior: 'Arquivo PDF Contínuo Compilado',
        resultado: 'Sucesso',
        detalhes: `Exportadas ${selecionadas.length} atividades adaptadas em um único arquivo PDF contínuo A4 com logo institucional padronizado (${fileName}).`,
      });

      setFeedbackExportacaoLote({
        tipo: 'sucesso',
        msg: `PDF contínuo gerado e baixado com sucesso! (${selecionadas.length} atividades inclusas no arquivo ${fileName})`,
      });
      setTimeout(() => setFeedbackExportacaoLote(null), 5000);
    } catch (err: any) {
      console.error('Erro ao compilar e exportar lote contínuo de atividades:', err);
      setFeedbackExportacaoLote({
        tipo: 'erro',
        msg: 'Falha ao gerar o arquivo PDF contínuo. Verifique os dados e tente novamente.',
      });
      setTimeout(() => setFeedbackExportacaoLote(null), 5000);
    } finally {
      setIsExportandoLoteAtividadesPdf(false);
    }
  };

  const turmasApoioDisponiveis = useMemo(() => {
    return Array.from(new Set(estudantes.map(e => e.turma))).filter(Boolean).sort();
  }, [estudantes]);

  const profissionaisApoioDisponiveis = useMemo(() => {
    const unique = new Map<string, string>();
    usuariosAutorizados
      .filter(u => u.roles.includes('PROFISSIONAL_DE_APOIO'))
      .forEach(u => unique.set(u.emailNormalized || u.email, u.name));
    registrosApoio.forEach(r => {
      if (r.profissionalResponsavelEmail) {
        unique.set(r.profissionalResponsavelEmail.toLowerCase(), r.profissionalResponsavelNome);
      }
    });
    return Array.from(unique.entries()).map(([email, nome]) => ({ email, nome }));
  }, [usuariosAutorizados, registrosApoio]);

  const registrosApoioFiltrados = useMemo(() => {
    return registrosApoio.filter(reg => {
      if (buscaApoioEstudante.trim()) {
        const termo = buscaApoioEstudante.toLowerCase();
        const nomeMatch = reg.nomeEstudante?.toLowerCase().includes(termo);
        const turmaMatch = reg.turma?.toLowerCase().includes(termo);
        const profMatch = reg.profissionalResponsavelNome?.toLowerCase().includes(termo);
        if (!nomeMatch && !turmaMatch && !profMatch) return false;
      }
      if (filtroApoioTurma !== 'todas' && reg.turma !== filtroApoioTurma) {
        return false;
      }
      if (filtroApoioProfissional !== 'todos' && reg.profissionalResponsavelEmail?.toLowerCase() !== filtroApoioProfissional.toLowerCase()) {
        return false;
      }
      if (filtroApoioPresenca === 'presente' && !reg.presente) return false;
      if (filtroApoioPresenca === 'ausente' && reg.presente) return false;
      if (filtroApoioDataInicio && reg.data < filtroApoioDataInicio) return false;
      if (filtroApoioDataFim && reg.data > filtroApoioDataFim) return false;
      return true;
    });
  }, [
    registrosApoio, 
    buscaApoioEstudante, 
    filtroApoioTurma, 
    filtroApoioProfissional, 
    filtroApoioPresenca, 
    filtroApoioDataInicio, 
    filtroApoioDataFim
  ]);

  const exportarRegistrosApoioCSV = () => {
    if (registrosApoioFiltrados.length === 0) return;
    const cabecalho = [
      'Data',
      'Dia da Semana',
      'Estudante',
      'Turma',
      'Profissional de Apoio',
      'E-mail Profissional',
      'Presença',
      'Sinais/Irritabilidade',
      'Observação Comportamental',
      'Atividade Adaptada',
      'Disciplinas Envolvidas',
      'Conseguiu Realizar',
      'Observação da Atividade',
      'Informações Adicionais',
      'Foto Diário de Bordo'
    ];

    const linhas = registrosApoioFiltrados.map(r => [
      `"${r.data}"`,
      `"${r.diaSemana || ''}"`,
      `"${(r.nomeEstudante || '').replace(/"/g, '""')}"`,
      `"${(r.turma || '').replace(/"/g, '""')}"`,
      `"${(r.profissionalResponsavelNome || '').replace(/"/g, '""')}"`,
      `"${r.profissionalResponsavelEmail || ''}"`,
      `"${r.presente ? 'Presente' : 'Ausente'}"`,
      `"${r.demonstrouIrritabilidadeOuSinais || 'N/A'}"`,
      `"${(r.observacaoComportamental || '').replace(/"/g, '""')}"`,
      `"${r.recebeuAtividadeAdaptada || 'N/A'}"`,
      `"${(r.disciplinasEnvolvidas || []).join(', ').replace(/"/g, '""')}"`,
      `"${r.conseguiuRealizarAtividade || 'N/A'}"`,
      `"${(r.observacaoAtividade || '').replace(/"/g, '""')}"`,
      `"${(r.informacoesAdicionais || '').replace(/"/g, '""')}"`,
      `"${r.fotoDiarioBordoUrl ? 'Foto Anexada' : 'Não'}"`
    ]);

    const csvContent = '\uFEFF' + [cabecalho.join(';'), ...linhas.map(l => l.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_apoio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Modal de Cadastro de Professor / Usuário
  const [modalNovoProfessorAberto, setModalNovoProfessorAberto] = useState(false);
  const [confirmarPerfilCoordenacao, setConfirmarPerfilCoordenacao] = useState(false);
  const [novoProfNome, setNovoProfNome] = useState('');
  const [novoProfEmail, setNovoProfEmail] = useState('');
  const [novoProfRoles, setNovoProfRoles] = useState<UserRole[]>(['teacher']);
  const [novoProfTurmas, setNovoProfTurmas] = useState('');
  const [novoProfDisciplinas, setNovoProfDisciplinas] = useState('');
  const [novoProfObs, setNovoProfObs] = useState('');
  const [msgSucessoProfessor, setMsgSucessoProfessor] = useState<string | null>(null);

  // Filtros da Tabela de Usuários
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [filtroRoleUsuario, setFiltroRoleUsuario] = useState<string>('todos');
  const [filtroSituacaoUsuario, setFiltroSituacaoUsuario] = useState<string>('todos');
  const [filtroDominioUsuario, setFiltroDominioUsuario] = useState<string>('todos');
  const [filtroPrimeiroAcesso, setFiltroPrimeiroAcesso] = useState<string>('todos');
  const [paginaUsuario, setPaginaUsuario] = useState(1);
  const itensPorPagina = 10;

  // Ações sobre usuário
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<AuthorizedUser | null>(null);
  const [confirmarDesativacao, setConfirmarDesativacao] = useState<AuthorizedUser | null>(null);
  const [confirmarDesvincularUid, setConfirmarDesvincularUid] = useState<AuthorizedUser | null>(null);
  const [avisoProtecaoCoordenador, setAvisoProtecaoCoordenador] = useState<string | null>(null);

  // Modais Estudante, Perfil, Habilidade, Documento
  const [modalEstudanteAberto, setModalEstudanteAberto] = useState(false);
  const [estudanteEmEdicao, setEstudanteEmEdicao] = useState<Estudante | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [modalHabilidadeAberto, setModalHabilidadeAberto] = useState(false);
  const [modalDocumentoAberto, setModalDocumentoAberto] = useState(false);
  const [tipoDocSelecionado, setTipoDocSelecionado] = useState<DocumentoImportado['tipo']>('lista_estudantes');
  const [modalAuditoriaAberto, setModalAuditoriaAberto] = useState(false);

  // Form Estudante
  const [formEstudante, setFormEstudante] = useState<Omit<Estudante, 'id'>>({
    nome: '',
    matricula: '',
    turma: '',
    anoSerie: '',
    turno: 'Manhã',
    dataNascimento: '',
    situacao: 'ativo',
    professoresAutorizadosIds: [],
  });

  // Form Perfil Pedagógico
  const [formPerfil, setFormPerfil] = useState({
    estudanteId: '',
    nivelLeitura: '',
    nivelEscrita: '',
    conhecimentosMatematicos: '',
    habilidadesConsolidadas: '',
    habilidadesEmDesenvolvimento: '',
    barreirasPedagogicas: '',
    estrategiasRecomendadas: '',
    recursosAcessibilidade: '',
    adaptacoesAvaliativas: '',
    extensaoEnunciados: 'Curto e direto',
    quantidadeAlternativas: 3,
    necessidadeApoioVisual: true,
    necessidadeInstrucoesCurtas: true,
    tempoAdicionalAutorizado: '50% adicional',
    observacoesPedagogicas: '',
  });

  // Form Habilidade Manual
  const [formHabilidade, setFormHabilidade] = useState({
    disciplina: '',
    serie: '',
    unidadeTematica: '',
    objetoConhecimento: '',
    codigo: '',
    descricao: '',
    documentoOrigem: 'Matriz Curricular Institucional',
    paginaOrigem: '1',
  });

  // Form Config Escola
  const [formEscola, setFormEscola] = useState<EscolaConfig>({ ...escolaConfig });
  const [configSalvaMsg, setConfigSalvaMsg] = useState(false);

  // Upload de Documentos genéricos
  const [arquivoUpload, setArquivoUpload] = useState<File | null>(null);
  const [etapaImportacao, setEtapaImportacao] = useState<'selecionar' | 'analisando' | 'revisar'>('selecionar');
  const [dadosExtraidosTemp, setDadosExtraidosTemp] = useState<any[]>([]);

  // --------------------------------------------------------------------------
  // LÓGICA DE USUÁRIOS E IMPORTAÇÃO
  // --------------------------------------------------------------------------
  const abrirImportacaoPdf = () => {
    const res = previewUserImport();
    if (res.success && res.data) {
      setRegistrosParaRevisao(res.data.registros);
      setModalImportarUsuariosAberto(true);
    }
  };

  const salvarNovoProfessor = (e: React.FormEvent) => {
    e.preventDefault();

    const turmas = novoProfTurmas.split(',').map(s => s.trim()).filter(Boolean);
    const disciplinas = novoProfDisciplinas.split(',').map(s => s.trim()).filter(Boolean);

    const res = authorizeNewUser({
      nome: novoProfNome,
      email: novoProfEmail,
      roles: novoProfRoles,
      turmas,
      disciplinas,
      currentUserRoles,
      existingUsers: usuariosAutorizados,
      createdBy: 'Coordenação',
    });

    if (!res.success) {
      alert(res.message);
      return;
    }

    if (res.data) {
      onUpdateUsuariosAutorizados([res.data, ...usuariosAutorizados]);
      onAddAuditoria({
        id: `aud-${Date.now()}`,
        dataHora: new Date().toLocaleString('pt-BR'),
        usuarioResponsavel: 'Coordenação',
        usuarioAlterado: res.data.name,
        perfisAnteriores: [],
        perfisPosteriores: res.data.roles,
        situacaoAnterior: 'Não cadastrado',
        situacaoPosterior: 'Ativo / Autorizado',
        resultado: 'Sucesso',
        detalhes: 'Novo usuário cadastrado manualmente.',
      });

      setMsgSucessoProfessor('Usuário autorizado com sucesso. Oriente o profissional a entrar com a conta Google Educacional cadastrada.');
      setNovoProfNome('');
      setNovoProfEmail('');
      setNovoProfTurmas('');
      setNovoProfDisciplinas('');
      setNovoProfObs('');
      setNovoProfRoles(['teacher']);
      setTimeout(() => {
        setMsgSucessoProfessor(null);
        setModalNovoProfessorAberto(false);
      }, 3000);
    }
  };

  // Alternar Papel de Coordenação no Form
  const handleToggleCoordenacaoNoForm = (checked: boolean) => {
    if (checked) {
      setConfirmarPerfilCoordenacao(true);
    } else {
      setNovoProfRoles(prev => prev.filter(r => r !== 'coordinator'));
    }
  };

  // Ações em Usuário Existente
  const handleSalvarEdicaoUsuario = (user: AuthorizedUser) => {
    // Validar se está removendo papel de coordenador do último
    const validacao = validarProtecaoUltimoCoordenador(user, usuariosAutorizados, user.roles, user.active);
    if (!validacao.success) {
      setAvisoProtecaoCoordenador(validacao.message);
      return;
    }

    onUpdateUsuariosAutorizados(usuariosAutorizados.map(u => u.id === user.id ? user : u));
    setUsuarioEmEdicao(null);
    setAvisoProtecaoCoordenador(null);
  };

  const handleConfirmarDesativacao = (user: AuthorizedUser) => {
    const validacao = validarProtecaoUltimoCoordenador(user, usuariosAutorizados, user.roles, false);
    if (!validacao.success) {
      setAvisoProtecaoCoordenador(validacao.message);
      setConfirmarDesativacao(null);
      return;
    }

    const updated: AuthorizedUser = {
      ...user,
      active: false,
      status: 'inactive',
      updatedAt: new Date().toISOString(),
    };

    onUpdateUsuariosAutorizados(usuariosAutorizados.map(u => u.id === user.id ? updated : u));
    onAddAuditoria({
      id: `aud-${Date.now()}`,
      dataHora: new Date().toLocaleString('pt-BR'),
      usuarioResponsavel: 'Coordenação',
      usuarioAlterado: user.name,
      perfisAnteriores: user.roles,
      perfisPosteriores: user.roles,
      situacaoAnterior: 'Ativo',
      situacaoPosterior: 'Inativo',
      resultado: 'Sucesso',
      detalhes: 'Usuário desativado pela Coordenação.',
    });
    setConfirmarDesativacao(null);
  };

  const handleReativarUsuario = (user: AuthorizedUser) => {
    const updated: AuthorizedUser = {
      ...user,
      active: true,
      status: 'authorized',
      updatedAt: new Date().toISOString(),
    };
    onUpdateUsuariosAutorizados(usuariosAutorizados.map(u => u.id === user.id ? updated : u));
  };

  const handleArquivarUsuario = (user: AuthorizedUser) => {
    const validacao = validarProtecaoUltimoCoordenador(user, usuariosAutorizados, user.roles, false);
    if (!validacao.success) {
      setAvisoProtecaoCoordenador(validacao.message);
      return;
    }

    const updated: AuthorizedUser = {
      ...user,
      status: 'archived',
      active: false,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onUpdateUsuariosAutorizados(usuariosAutorizados.map(u => u.id === user.id ? updated : u));
  };

  const handleDesvincularUid = (user: AuthorizedUser) => {
    const res = unlinkUserUid(user.id, currentUserRoles, usuariosAutorizados);
    if (res.success && res.data) {
      onUpdateUsuariosAutorizados(usuariosAutorizados.map(u => u.id === user.id ? res.data! : u));
      onAddAuditoria({
        id: `aud-${Date.now()}`,
        dataHora: new Date().toLocaleString('pt-BR'),
        usuarioResponsavel: 'Coordenação',
        usuarioAlterado: user.name,
        perfisAnteriores: user.roles,
        perfisPosteriores: user.roles,
        situacaoAnterior: 'UID Vinculado',
        situacaoPosterior: 'UID Desvinculado',
        resultado: 'Sucesso',
        detalhes: 'UID desvinculado para forçar nova autenticação Google.',
      });
      setConfirmarDesvincularUid(null);
    }
  };

  // Upload de Foto de Professor
  const handleUploadFotoProfessor = (userId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const photoUrl = event.target.result as string;
          onUpdateUsuariosAutorizados(usuariosAutorizados.map(u => u.id === userId ? { ...u, photoUrl } : u));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Estatísticas de Usuários para os Cards
  const totalUsuarios = usuariosAutorizados.length;
  const totalProfessores = usuariosAutorizados.filter(u => u.roles.includes('teacher')).length;
  const totalCoordenadores = usuariosAutorizados.filter(u => u.roles.includes('coordinator')).length;
  const totalAtivos = usuariosAutorizados.filter(u => u.active && u.status === 'authorized').length;
  const totalInativos = usuariosAutorizados.filter(u => !u.active || u.status === 'inactive').length;
  const totalAguardandoAcesso = usuariosAutorizados.filter(u => !u.firstAccessAt).length;
  const totalPendentesRevisao = usuariosAutorizados.filter(u => u.status === 'inactive' || !u.email.includes('@')).length;

  // Filtragem da tabela
  const usuariosFiltrados = usuariosAutorizados.filter(u => {
    const matchBusca = u.name.toLowerCase().includes(buscaUsuario.toLowerCase()) ||
                       u.email.toLowerCase().includes(buscaUsuario.toLowerCase());
    const matchRole = filtroRoleUsuario === 'todos' || u.roles.includes(filtroRoleUsuario as any);
    const matchSituacao = filtroSituacaoUsuario === 'todos' || u.status === filtroSituacaoUsuario;
    const matchDominio = filtroDominioUsuario === 'todos' || u.email.endsWith(filtroDominioUsuario);
    const matchAcesso = filtroPrimeiroAcesso === 'todos' || 
                        (filtroPrimeiroAcesso === 'aguardando' && !u.firstAccessAt) ||
                        (filtroPrimeiroAcesso === 'acessou' && u.firstAccessAt);
    return matchBusca && matchRole && matchSituacao && matchDominio && matchAcesso;
  });

  const totalPaginasUsuarios = Math.ceil(usuariosFiltrados.length / itensPorPagina) || 1;
  const usuariosPaginados = usuariosFiltrados.slice((paginaUsuario - 1) * itensPorPagina, paginaUsuario * itensPorPagina);

  // --------------------------------------------------------------------------
  // ESTUDANTES E SALAS
  // --------------------------------------------------------------------------
  const todasAsSalas = useMemo(() => {
    const setSalas = new Set<string>();
    TURMAS_OFICIAIS_ESCOLA.forEach(t => setSalas.add(t));
    estudantes.forEach(e => {
      if (e.turma) setSalas.add(e.turma);
    });
    return Array.from(setSalas).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [estudantes]);

  const salasEstatisticas = useMemo(() => {
    return todasAsSalas.map(sala => {
      const alunosDaSala = estudantes.filter(e => e.turma === sala);
      const ativos = alunosDaSala.filter(e => e.situacao === 'ativo').length;
      const paeNomes = Array.from(new Set(alunosDaSala.map(e => e.paeResponsavelNome).filter(Boolean)));
      const turno = alunosDaSala[0]?.turno || (sala.startsWith('1º') || sala.startsWith('2º') || sala.startsWith('3º') ? 'Vespertino' : 'Matutino');

      return {
        sala,
        totalAlunos: alunosDaSala.length,
        alunosAtivos: ativos,
        paeNomes,
        turno,
        alunos: alunosDaSala
      };
    });
  }, [todasAsSalas, estudantes]);

  const todasAsSeries = useMemo(() => {
    const set = new Set<string>();
    estudantes.forEach(e => {
      let s = e.anoSerie?.trim();
      if (!s && e.turma) {
        const match = e.turma.match(/^(\d+º(?:\s*Ano)?|\d+ª(?:\s*Série)?|[A-Za-z0-9ºª]+)/i);
        s = match ? match[0] : e.turma.split(' ')[0];
      }
      if (s) {
        if (/^6/i.test(s)) s = '6º Ano';
        else if (/^7/i.test(s)) s = '7º Ano';
        else if (/^8/i.test(s)) s = '8º Ano';
        else if (/^9/i.test(s)) s = '9º Ano';
        else if (/^1/i.test(s) && /em|s[ée]rie/i.test(s)) s = '1ª Série EM';
        else if (/^2/i.test(s) && /em|s[ée]rie/i.test(s)) s = '2ª Série EM';
        else if (/^3/i.test(s) && /em|s[ée]rie/i.test(s)) s = '3ª Série EM';
        set.add(s);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [estudantes]);

  const estudantesFiltrados = useMemo(() => {
    return estudantes.filter(est => {
      if (filtroTurmaEstudante !== 'todas' && est.turma !== filtroTurmaEstudante) return false;
      if (filtroStatusEstudante !== 'todos' && est.situacao !== filtroStatusEstudante) return false;

      // Filtro por Série
      if (filtroSerieEstudante !== 'todas') {
        const s = (est.anoSerie || est.turma || '').toLowerCase();
        const f = filtroSerieEstudante.toLowerCase().replace('º ano', '').replace('ª série', '').replace(' em', '').trim();
        const matchSerie = s.includes(f) || (est.anoSerie && est.anoSerie === filtroSerieEstudante);
        if (!matchSerie) return false;
      }

      // Filtro por Perfil Pedagógico
      if (filtroPerfilEstudante === 'com_perfil') {
        const temPerfil = Boolean(est.perfilPedagogicoId || perfisPedagogicos.some(p => p.estudanteId === est.id));
        if (!temPerfil) return false;
      } else if (filtroPerfilEstudante === 'sem_perfil') {
        const temPerfil = Boolean(est.perfilPedagogicoId || perfisPedagogicos.some(p => p.estudanteId === est.id));
        if (temPerfil) return false;
      }

      if (buscaEstudante.trim()) {
        const t = buscaEstudante.toLowerCase();
        const nomeMatch = est.nome.toLowerCase().includes(t);
        const matMatch = est.matricula.toLowerCase().includes(t);
        const laudoMatch = (est.laudo || '').toLowerCase().includes(t);
        const paeMatch = (est.paeResponsavelNome || '').toLowerCase().includes(t);
        const turmaMatch = (est.turma || '').toLowerCase().includes(t);
        const serieMatch = (est.anoSerie || '').toLowerCase().includes(t);
        return nomeMatch || matMatch || laudoMatch || paeMatch || turmaMatch || serieMatch;
      }
      return true;
    });
  }, [estudantes, filtroTurmaEstudante, filtroStatusEstudante, filtroSerieEstudante, filtroPerfilEstudante, buscaEstudante, perfisPedagogicos]);

  const estudantesAgrupadosPorTurma = useMemo(() => {
    const map = new Map<string, Estudante[]>();
    for (const est of estudantesFiltrados) {
      const turma = est.turma || 'Sem Turma';
      if (!map.has(turma)) {
        map.set(turma, []);
      }
      map.get(turma)!.push(est);
    }
    const turmasOrdenadas = Array.from(map.keys()).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    return turmasOrdenadas.map(turma => ({
      turma,
      estudantes: map.get(turma)!
    }));
  }, [estudantesFiltrados]);

  const toggleCardEstudanteExpandido = (id: string) => {
    setCardsEstudantesExpandidos(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandirTodosCardsEstudantes = () => {
    const todos: Record<string, boolean> = {};
    estudantesFiltrados.forEach(e => {
      todos[e.id] = true;
    });
    setCardsEstudantesExpandidos(todos);
  };

  const recolherTodosCardsEstudantes = () => {
    setCardsEstudantesExpandidos({});
  };

  const obterPeiDoEstudante = (estId: string, estNome: string): PeiDocumento | undefined => {
    const direto = peisArmazenados.find(
      p => p.studentId === estId || (p.studentName && p.studentName.toLowerCase().trim() === estNome.toLowerCase().trim())
    );
    if (direto) return direto;

    const docPei = documentos.find(d => {
      if (d.tipo !== 'pei' && !d.peiDados) return false;
      if (d.peiDados?.studentId === estId) return true;
      if (d.peiDados?.studentName && d.peiDados.studentName.toLowerCase().trim() === estNome.toLowerCase().trim()) return true;
      const campoAluno = d.camposExtraidos?.find(c => c.campo.toLowerCase().includes('aluno') || c.campo.toLowerCase().includes('estudante'));
      if (campoAluno && campoAluno.valor.toLowerCase().trim() === estNome.toLowerCase().trim()) return true;
      return false;
    });
    return docPei?.peiDados;
  };

  const handleSincronizarEstudantesDoPdf = () => {
    if (onResetarEstudantesParaPadrao) {
      onResetarEstudantesParaPadrao();
    } else {
      const oficiais = gerarEstudantesOficiaisDoPdf();
      if (onBatchAddEstudantes) {
        onBatchAddEstudantes(oficiais);
      }
    }
    setFeedbackEstudantes('Relação oficial de 63 estudantes em 18 salas restaurada/sincronizada com sucesso!');
    setTimeout(() => setFeedbackEstudantes(null), 4000);
  };

  const exportarEstudantesCSV = () => {
    const lista = estudantesFiltrados;
    if (lista.length === 0) {
      alert('Nenhum estudante na listagem atual para exportar.');
      return;
    }

    const cabecalho = [
      'Turma/Sala',
      'Ano/Série',
      'Turno',
      'Nome Completo',
      'Matrícula',
      'Situação',
      'Profissional de Apoio (PAE)',
      'E-mail PAE',
      'Diagnóstico / Laudo Oficial',
      'Status Laudo',
      'Responsáveis',
      'Telefones',
      'Professores Vinculados'
    ];

    const linhas = lista.map(e => [
      `"${(e.turma || '').replace(/"/g, '""')}"`,
      `"${(e.anoSerie || '').replace(/"/g, '""')}"`,
      `"${(e.turno || '').replace(/"/g, '""')}"`,
      `"${(e.nome || '').replace(/"/g, '""')}"`,
      `"${(e.matricula || '').replace(/"/g, '""')}"`,
      `"${(e.situacao || '').replace(/"/g, '""')}"`,
      `"${(e.paeResponsavelNome || 'Não informado').replace(/"/g, '""')}"`,
      `"${(e.paeResponsavelEmail || '').replace(/"/g, '""')}"`,
      `"${(e.laudo || '').replace(/"/g, '""')}"`,
      `"${(e.statusLaudo || '').replace(/"/g, '""')}"`,
      `"${(e.responsaveis || '').replace(/"/g, '""')}"`,
      `"${(e.telefones || '').replace(/"/g, '""')}"`,
      `"${(e.professoresAutorizadosIds || []).length} vinculados"`
    ].join(';'));

    const csvContent = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Estudantes_e_Salas_Olynto_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSelecionarFotoEstudante = (estId: string) => {
    setEstudanteIdParaUploadFoto(estId);
    if (fileInputFotoEstudanteRef.current) {
      fileInputFotoEstudanteRef.current.click();
    }
  };

  const handleProcessarFotoEstudante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !estudanteIdParaUploadFoto) return;

    try {
      const base64 = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.75 });
      const est = estudantes.find(item => item.id === estudanteIdParaUploadFoto);
      if (est) {
        const atualizado = { ...est, fotoUrl: base64 };
        onUpdateEstudante(atualizado);
        setFeedbackEstudantes(`Fotografia de ${est.nome} atualizada com sucesso.`);
        setTimeout(() => setFeedbackEstudantes(null), 3500);
      }
    } catch {
      alert('Não foi possível processar a imagem selecionada.');
    } finally {
      e.target.value = '';
      setEstudanteIdParaUploadFoto(null);
    }
  };

  const abrirCadastroEstudante = () => {
    setEstudanteEmEdicao(null);
    setFormEstudante({
      nome: '',
      matricula: '',
      turma: '',
      anoSerie: '',
      turno: 'Manhã',
      dataNascimento: '',
      situacao: 'ativo',
      professoresAutorizadosIds: [],
    });
    setModalEstudanteAberto(true);
  };

  const salvarEstudante = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEstudante.nome.trim()) return;

    if (estudanteEmEdicao) {
      onUpdateEstudante({ ...estudanteEmEdicao, ...formEstudante });
    } else {
      onAddEstudante({ id: `est-${Date.now()}`, ...formEstudante });
    }
    setModalEstudanteAberto(false);
  };

  // Monitoramento de pendências para lembretes visuais da coordenação
  const totalLembretesPendentes = useMemo(() => {
    let count = 0;
    atividades.forEach(a => {
      if (a.status !== 'Revisada') count++;
    });
    const mapaReg = new Set(registrosApoio.map(r => r.studentId));
    estudantes.forEach(e => {
      if (e.situacao === 'ativo' && (e.paeResponsavelNome || (e.profissionaisApoioIds && e.profissionaisApoioIds.length > 0) || e.laudo)) {
        if (!mapaReg.has(e.id)) count++;
      }
    });
    return count;
  }, [atividades, estudantes, registrosApoio]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Banner de Aviso Oficial */}
      <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
          <span className="font-bold">Dados locais de teste. Firebase ainda não configurado.</span>
        </div>
        <span className="text-[11px] text-amber-800">
          Início seguro e em conformidade estrita com o relatório oficial da SEDUC-GO.
        </span>
      </div>

      {avisoProtecaoCoordenador && (
        <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-600 text-xs text-rose-900 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-700" />
            <span>{avisoProtecaoCoordenador}</span>
          </div>
          <button onClick={() => setAvisoProtecaoCoordenador(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Cabeçalho do Painel da Coordenação */}
      <div className="mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            Painel da Coordenação
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Gestão Pedagógica, Usuários & Matriz Curricular
          </h1>
          <p className="text-xs text-slate-500">
            {escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro'}
          </p>
        </div>

        {/* Contadores Gerais */}
        <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Estudantes</span>
            <span className="text-base font-black text-slate-900">{estudantes.length}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Usuários</span>
            <span className="text-base font-black text-slate-900">{usuariosAutorizados.length}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Habilidades</span>
            <span className="text-base font-black text-slate-900">{habilidades.filter(h => h.status === 'aprovada').length}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Atividades</span>
            <span className="text-base font-black text-slate-900">{atividades.length}</span>
          </div>
        </div>
      </div>

      {/* Navegação entre Módulos da Coordenação */}
      <div className="mb-6 flex items-center overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-slate-200">
        {[
          { id: 'inicio', label: 'Início', icon: Home, alertCount: totalLembretesPendentes },
          { id: 'estudantes', label: 'Estudantes', icon: Users, count: estudantes.length },
          { id: 'professores', label: 'Professores e usuários', icon: GraduationCap, count: usuariosAutorizados.length },
          { id: 'apoio', label: 'Profissional de Apoio', icon: HeartHandshake, count: registrosApoio.length },
          { id: 'perfis', label: 'Perfil pedagógico', icon: Award, count: perfisPedagogicos.length },
          { id: 'documentos', label: 'Documentos', icon: Upload, count: documentos.length },
          { id: 'matriz', label: 'Matriz curricular', icon: BookOpen, count: habilidades.length },
          { id: 'habilidades', label: 'Habilidades', icon: Layers, count: habilidades.filter(h => h.status === 'aprovada').length },
          { id: 'atividades', label: 'Atividades', icon: FileCheck, count: atividades.length },
          { id: 'historico', label: 'Histórico & Auditoria', icon: History, count: historico.length + auditoria.length },
          { id: 'configuracoes', label: 'Configurações', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = abaAtiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id as AbaCoordenacao)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-emerald-800 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.alertCount !== undefined && tab.alertCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black flex items-center gap-1 ${
                  isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {tab.alertCount}
                </span>
              )}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Toast de Notificação de Download do Relatório Consolidado */}
      {notificacaoConsolidado && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-sky-900 text-white rounded-2xl shadow-xl flex items-center gap-3 border border-sky-700 animate-slideDown">
          <CheckCircle className="h-5 w-5 text-sky-300 shrink-0" />
          <span className="text-xs font-bold">{notificacaoConsolidado}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. INÍCIO */}
      {/* ========================================================================= */}
      {abaAtiva === 'inicio' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
              <Home className="h-8 w-8 text-emerald-700" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {currentUserRoles.includes('superadmin') || currentUserRoles.includes('developer')
                ? 'Painel do Administrador Principal & Coordenação Geral'
                : 'Painel da Coordenação Pedagógica'}
            </h2>
            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              {currentUserRoles.includes('superadmin') || currentUserRoles.includes('developer')
                ? 'Ambiente administrativo principal com acesso integral a todas as funções: importação de estudantes, gestão de professores, matriz curricular, perfis pedagógicos, auditoria e testes de segurança.'
                : 'Módulo de acesso institucional com e-mail educacional e importação direta do relatório oficial da escola.'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4">
              {/* 1. Importar Lista de Estudantes */}
              <button
                onClick={() => setModalImportarEstudantesAberto(true)}
                className="px-3.5 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="h-4 w-4" />
                <span>Importar Lista de Estudantes</span>
              </button>

              {/* 2. Importar Lista de Professores */}
              <button
                onClick={abrirImportacaoPdf}
                className="px-3.5 py-2 bg-indigo-700 text-white text-xs font-bold rounded-xl hover:bg-indigo-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="h-4 w-4" />
                <span>Importar Lista de Professores</span>
              </button>

              {/* 3. Importar Matrizes Curriculares (Estilo minimalista da Seção 2) */}
              <button
                onClick={onOpenImportarMatriz}
                className="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-50/70 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs text-xs font-bold rounded-xl"
                title="Importar e revisar Matrizes Curriculares (PDF, DOCX, XLSX, CSV)"
              >
                <BookOpen className="h-4 w-4 text-emerald-700" />
                <span>Importar Matrizes Curriculares</span>
              </button>

              {/* 4. Cadastrar Professor */}
              <button
                onClick={() => setModalNovoProfessorAberto(true)}
                className="px-3.5 py-2 bg-sky-700 text-white text-xs font-bold rounded-xl hover:bg-sky-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Cadastrar Professor</span>
              </button>

              {/* 5. Cadastrar Estudante */}
              <button
                onClick={abrirCadastroEstudante}
                className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Cadastrar Estudante</span>
              </button>

              {/* 6. Relatório de Desempenho PDI */}
              <button
                onClick={() => {
                  setPdiEstudanteInicialId(undefined);
                  setModalRelatorioPdiAberto(true);
                }}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Gerar Relatório de Desempenho do Estudante (PDI) em PDF"
              >
                <Award className="h-4 w-4" />
                <span>Relatório PDI (Desempenho)</span>
              </button>

              {/* 7. Ações Rápidas (Menu dropdown compacto da Seção 23) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuAcoesRapidasAberto(!menuAcoesRapidasAberto)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Ações Rápidas</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {menuAcoesRapidasAberto && (
                  <div 
                    className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-left text-xs divide-y divide-slate-100 animate-fadeIn"
                  >
                    <div className="pb-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase px-3 py-1 block">IMPORTAÇÕES</span>
                      <button
                        onClick={() => { setMenuAcoesRapidasAberto(false); setModalImportarEstudantesAberto(true); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-900 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Importar estudantes</span>
                      </button>
                      <button
                        onClick={() => { setMenuAcoesRapidasAberto(false); abrirImportacaoPdf(); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-900 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Importar professores</span>
                      </button>
                      <button
                        onClick={() => { setMenuAcoesRapidasAberto(false); onOpenImportarMatriz?.(); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-teal-50 hover:text-teal-900 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                        <span>Importar matrizes</span>
                      </button>
                    </div>

                    <div className="py-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase px-3 py-1 block">CADASTROS</span>
                      <button
                        onClick={() => { setMenuAcoesRapidasAberto(false); abrirCadastroEstudante(); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-slate-500" />
                        <span>Cadastrar estudante</span>
                      </button>
                      <button
                        onClick={() => { setMenuAcoesRapidasAberto(false); setModalNovoProfessorAberto(true); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-slate-500" />
                        <span>Cadastrar professor</span>
                      </button>
                      <button
                        onClick={() => { setMenuAcoesRapidasAberto(false); setModalHabilidadeAberto(true); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                        <span>Cadastrar habilidade manual</span>
                      </button>
                    </div>

                    <div className="py-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase px-3 py-1 block">RELATÓRIOS & PDI</span>
                      <button
                        onClick={() => { setMenuAcoesRapidasAberto(false); setPdiEstudanteInicialId(undefined); setModalRelatorioPdiAberto(true); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-teal-50 hover:text-teal-900 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <Award className="h-3.5 w-3.5 text-teal-600" />
                        <span>Relatório de Desempenho (PDI)</span>
                      </button>
                      <button
                        onClick={() => { setMenuAcoesRapidasAberto(false); setModalRelatorioTrimestralAberto(true); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-900 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Relatório Trimestral</span>
                      </button>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase px-3 py-1 block">ADMINISTRAÇÃO</span>
                      {onOpenCentralMaster && (currentUserRoles.includes('superadmin') || currentUserName === 'MARCOS ANTONIO FERREIRA') && (
                        <button
                          onClick={() => { setMenuAcoesRapidasAberto(false); onOpenCentralMaster(); }}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-900 hover:text-white font-bold flex items-center gap-2 text-slate-900 cursor-pointer"
                        >
                          <Database className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Central Master</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setMenuAcoesRapidasAberto(false); setAbaAtiva('configuracoes'); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-500" />
                        <span>Configurações</span>
                      </button>
                      <button
                        onClick={() => { setMenuAcoesRapidasAberto(false); setAbaAtiva('historico'); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <History className="h-3.5 w-3.5 text-slate-500" />
                        <span>Auditoria</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão Google Drive */}
              {onOpenGoogleDrive && (
                <button
                  type="button"
                  onClick={onOpenGoogleDrive}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                    isGoogleDriveConnected
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                  title="Gerenciar pastas organizadas por série e fotos no Google Drive"
                >
                  <Folder className="h-4 w-4 text-amber-500" />
                  <span>Google Drive (Séries)</span>
                  {isGoogleDriveConnected && (
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  )}
                </button>
              )}

              {/* 7. Central Master (Visível na área administrativa do superadministrador) */}
              {onOpenCentralMaster && (currentUserRoles.includes('superadmin') || currentUserName === 'MARCOS ANTONIO FERREIRA') && (
                <button
                  type="button"
                  onClick={onOpenCentralMaster}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs border border-emerald-500/30"
                  title="Central Master de Dados e Arquivos (Exclusivo Superadmin)"
                >
                  <Database className="h-4 w-4 text-emerald-400" />
                  <span>Central Master</span>
                </button>
              )}
            </div>
          </div>

          {/* PAINEL DE NOTIFICAÇÕES & ALERTAS VISUAIS DA COORDENAÇÃO (PRAZOS DE PEI E APOIO 15 DIAS) */}
          <PainelLembretesCoordenacao
            atividades={atividades}
            estudantes={estudantes}
            registrosApoio={registrosApoio}
            peisArmazenados={peisArmazenados}
            usuariosAutorizados={usuariosAutorizados}
            onVisualizarAtividade={onVisualizarAtividadeA4}
            onNavigateToApoio={onNavigateToApoio}
            onNavigateToTab={(tabId) => setAbaAtiva(tabId as AbaCoordenacao)}
            onVisualizarPei={async (pei) => {
              try {
                await baixarPeiComoPdf(pei, escolaConfig);
              } catch (err) {
                console.error('Erro ao visualizar PEI:', err);
              }
            }}
            onCriarPeiParaEstudante={(estudanteId) => {
              setEstudanteIdPeiInterno(estudanteId);
              setModalPeiInternoAberto(true);
            }}
            onNavigateToEstudante={(estudanteId, turma) => {
              if (turma) setFiltroTurmaEstudante(turma);
              setAbaAtiva('estudantes');
            }}
          />

          {/* CARD DE MONITORAMENTO DE COBERTURA PEDAGÓGICA (TOTAL DE ESTUDANTES POR TURMA & PEIs ATIVOS) */}
          <CardCoberturaPeiPorTurma
            estudantes={estudantes}
            peisArmazenados={peisArmazenados}
            documentos={documentos}
            perfisPedagogicos={perfisPedagogicos}
            escolaConfig={escolaConfig}
            onNavigateToEstudantesComTurma={(turma) => {
              setFiltroTurmaEstudante(turma);
              setAbaAtiva('estudantes');
            }}
            onCriarPeiParaEstudante={(estudanteId) => {
              setEstudanteIdPeiInterno(estudanteId);
              setModalPeiInternoAberto(true);
            }}
            onVisualizarPei={async (pei) => {
              try {
                await baixarPeiComoPdf(pei, escolaConfig);
              } catch (err) {
                console.error('Erro ao visualizar PEI:', err);
              }
            }}
          />

          {/* DASHBOARD ANALÍTICO RECHARTS DA COORDENAÇÃO */}
          <CoordenacaoDashboardCharts
            atividades={atividades}
            perfisPedagogicos={perfisPedagogicos}
            estudantes={estudantes}
            escolaConfig={escolaConfig}
            onNavigateToTab={(tabId) => setAbaAtiva(tabId as AbaCoordenacao)}
            onVisualizarAtividade={onVisualizarAtividadeA4}
            onOpenRelatorioTrimestral={() => setModalRelatorioTrimestralAberto(true)}
            onOpenRelatorioPdi={() => {
              setPdiEstudanteInicialId(undefined);
              setModalRelatorioPdiAberto(true);
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PROFESSORES E USUÁRIOS (MÓDULO COMPLETO EXIGIDO) */}
      {/* ========================================================================= */}
      {abaAtiva === 'professores' && (
        <div className="space-y-5">
          
          {/* CARDS OBRIGATÓRIOS DA SEÇÃO 10 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase truncate">Total Usuários</span>
              <span className="text-base font-black text-slate-900">{totalUsuarios}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-sky-200">
              <span className="text-[10px] text-sky-800 font-bold block uppercase truncate">Professores</span>
              <span className="text-base font-black text-sky-700">{totalProfessores}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-200">
              <span className="text-[10px] text-indigo-800 font-bold block uppercase truncate">Coordenadores</span>
              <span className="text-base font-black text-indigo-700">{totalCoordenadores}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-bold block uppercase truncate">Ativos</span>
              <span className="text-base font-black text-emerald-700">{totalAtivos}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase truncate">Inativos</span>
              <span className="text-base font-black text-slate-600">{totalInativos}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-amber-200">
              <span className="text-[10px] text-amber-800 font-bold block uppercase truncate">Aguardando 1º Login</span>
              <span className="text-base font-black text-amber-700">{totalAguardandoAcesso}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase truncate">Pendentes Revisão</span>
              <span className="text-base font-black text-slate-600">{totalPendentesRevisao}</span>
            </div>
          </div>

          {/* Barra de Ações: Importar Lista + Cadastrar Professor */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou e-mail educacional..."
                value={buscaUsuario}
                onChange={(e) => {
                  setBuscaUsuario(e.target.value);
                  setPaginaUsuario(1);
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={abrirImportacaoPdf}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="h-4 w-4" />
                <span>Importar lista (PDF)</span>
              </button>

              <button
                onClick={() => setModalNovoProfessorAberto(true)}
                className="px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>+ Cadastrar professor</span>
              </button>
            </div>
          </div>

          {/* Filtros Avançados */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Perfil:</span>
              <select
                value={filtroRoleUsuario}
                onChange={(e) => setFiltroRoleUsuario(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 bg-white"
              >
                <option value="todos">Todos</option>
                <option value="coordinator">Coordenação</option>
                <option value="teacher">Professor</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Situação:</span>
              <select
                value={filtroSituacaoUsuario}
                onChange={(e) => setFiltroSituacaoUsuario(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 bg-white"
              >
                <option value="todos">Todas</option>
                <option value="authorized">Autorizado</option>
                <option value="inactive">Inativo</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Domínio:</span>
              <select
                value={filtroDominioUsuario}
                onChange={(e) => setFiltroDominioUsuario(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 bg-white font-mono text-[11px]"
              >
                <option value="todos">Todos os domínios</option>
                <option value="educa.go.gov.br">@educa.go.gov.br</option>
                <option value="admin.educa.go.gov.br">@admin.educa.go.gov.br</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Acesso:</span>
              <select
                value={filtroPrimeiroAcesso}
                onChange={(e) => setFiltroPrimeiroAcesso(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 bg-white"
              >
                <option value="todos">Todos</option>
                <option value="aguardando">Aguardando 1º login</option>
                <option value="acessou">Já autenticou</option>
              </select>
            </div>
          </div>

          {/* Listagem de Usuários */}
          {usuariosAutorizados.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
              <GraduationCap className="h-10 w-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhum professor ou coordenador autorizado.
              </p>
              <p className="text-xs text-slate-500">
                Importe o documento PDF ou cadastre os profissionais individualmente.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={abrirImportacaoPdf}
                  className="px-4 py-2 bg-indigo-700 text-white text-xs font-bold rounded-xl hover:bg-indigo-800 cursor-pointer"
                >
                  Importar Lista do PDF
                </button>
                <button
                  onClick={() => setModalNovoProfessorAberto(true)}
                  className="px-4 py-2 bg-sky-700 text-white text-xs font-bold rounded-xl hover:bg-sky-800 cursor-pointer"
                >
                  + Cadastrar professor
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-12 text-center">Avatar</th>
                      <th className="p-3 font-bold">Nome</th>
                      <th className="p-3 font-bold">E-mail Educacional</th>
                      <th className="p-3 font-bold">Perfis</th>
                      <th className="p-3 font-bold">Situação</th>
                      <th className="p-3 font-bold">1º Acesso</th>
                      <th className="p-3 font-bold">Último Acesso</th>
                      <th className="p-3 font-bold">Turmas</th>
                      <th className="p-3 font-bold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usuariosPaginados.map((u) => {
                      const iniciais = u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                      const isCoordenadorUser = u.roles.includes('coordinator');

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-2.5 text-center">
                            <label className="relative cursor-pointer group block">
                              {u.photoUrl ? (
                                <img src={u.photoUrl} alt={u.name} className="h-8 w-8 rounded-full object-cover mx-auto ring-1 ring-slate-300" />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center mx-auto text-[11px] group-hover:bg-slate-300">
                                  {iniciais}
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/png,image/jpeg"
                                className="hidden"
                                onChange={(e) => handleUploadFotoProfessor(u.id, e)}
                                title="Upload de foto do professor"
                              />
                            </label>
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {u.name}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                            {u.email}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((r, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    r === 'coordinator'
                                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                      : 'bg-sky-100 text-sky-900'
                                  }`}
                                >
                                  {r === 'coordinator' ? 'Coordenação' : 'Professor'}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              u.active && u.status === 'authorized'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.status === 'archived'
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {u.status === 'authorized' && u.active ? 'Ativo' : u.status === 'archived' ? 'Arquivado' : 'Inativo'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                            {u.firstAccessAt ? new Date(u.firstAccessAt).toLocaleDateString('pt-BR') : 'Aguardando login Google'}
                          </td>
                          <td className="p-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                            {u.lastAccessAt ? new Date(u.lastAccessAt).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px] whitespace-nowrap max-w-[120px] truncate">
                            {u.allowedClasses.join(', ') || 'Todas'}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {/* Editar */}
                              <button
                                onClick={() => setUsuarioEmEdicao({ ...u })}
                                className="p-1 rounded text-slate-600 hover:text-emerald-700 hover:bg-slate-100"
                                title="Editar dados e permissões"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Ativar / Desativar */}
                              {u.active ? (
                                <button
                                  onClick={() => setConfirmarDesativacao(u)}
                                  className="p-1 rounded text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                                  title="Desativar acesso"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReativarUsuario(u)}
                                  className="p-1 rounded text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                  title="Reativar acesso"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Desvincular UID */}
                              <button
                                onClick={() => setConfirmarDesvincularUid(u)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-700 hover:bg-indigo-50"
                                title="Desvincular UID do Firebase"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>

                              {/* Arquivar */}
                              <button
                                onClick={() => handleArquivarUsuario(u)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Arquivar registro"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>Página {paginaUsuario} de {totalPaginasUsuarios} ({usuariosFiltrados.length} usuários filtrados)</span>
                <div className="flex gap-1">
                  <button
                    disabled={paginaUsuario <= 1}
                    onClick={() => setPaginaUsuario(p => p - 1)}
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={paginaUsuario >= totalPaginasUsuarios}
                    onClick={() => setPaginaUsuario(p => p + 1)}
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ESTUDANTES E SALAS DE AULA                                             */}
      {/* ========================================================================= */}
      {abaAtiva === 'estudantes' && (
        <div className="space-y-5">
          {/* Input oculto para upload de foto direta do estudante */}
          <input 
            type="file" 
            ref={fileInputFotoEstudanteRef} 
            onChange={handleProcessarFotoEstudante} 
            accept="image/*" 
            className="hidden" 
          />

          {/* Feedback de Sincronização / Upload */}
          {feedbackEstudantes && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>{feedbackEstudantes}</span>
              </div>
              <button onClick={() => setFeedbackEstudantes(null)}><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Cabeçalho do Módulo de Estudantes & Ações */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Módulo Acadêmico & Inclusão
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {todasAsSalas.length} Salas de Aula Oficiais
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Salas de Aula & Lista de Estudantes por Turma
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Relação oficial extraída do documento da escola. Gestão por sala, fichas individuais, diagnóstico pedagógico e vínculo com PAEs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPdiEstudanteInicialId(undefined);
                  setModalRelatorioPdiAberto(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Gerar Relatórios de Desempenho dos Estudantes (PDI) com exportação em PDF"
              >
                <Award className="h-3.5 w-3.5" />
                <span>Relatório PDI</span>
              </button>

              <button
                type="button"
                onClick={() => setModalRelatorioTrimestralAberto(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Gerar Relatórios Trimestrais de Evolução dos Estudantes (PDF e CSV)"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Relatório Trimestral</span>
              </button>

              <button
                type="button"
                onClick={handleSincronizarEstudantesDoPdf}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Sincronizar/Restaurar lista de 63 alunos em 18 salas direto do PDF oficial"
              >
                <RefreshCw className="h-3.5 w-3.5 text-amber-700" />
                <span>Sincronizar Alunos do PDF (63)</span>
              </button>

              <button
                type="button"
                onClick={exportarEstudantesCSV}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Exportar dados de todas as salas em formato CSV"
              >
                <Download className="h-3.5 w-3.5 text-slate-700" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setModalImportarEstudantesAberto(true)}
                className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Importar Lista (PDF)</span>
              </button>

              <button
                type="button"
                onClick={abrirCadastroEstudante}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Novo Estudante</span>
              </button>
            </div>
          </div>

          {/* Cards de Métricas Gerais das Salas e Alunos */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-bold block uppercase truncate">Total de Estudantes</span>
              <span className="text-lg font-black text-slate-900">{estudantes.length}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-800 font-bold block uppercase truncate">Salas / Turmas</span>
              <span className="text-lg font-black text-emerald-700">{todasAsSalas.length} turmas</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-sky-200 shadow-2xs">
              <span className="text-[10px] text-sky-800 font-bold block uppercase truncate">Estudantes Ativos</span>
              <span className="text-lg font-black text-sky-700">{estudantes.filter(e => e.situacao === 'ativo').length}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs">
              <span className="text-[10px] text-indigo-800 font-bold block uppercase truncate">Com PAE Responsável</span>
              <span className="text-lg font-black text-indigo-700">{estudantes.filter(e => e.paeResponsavelNome).length}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-2xs">
              <span className="text-[10px] text-purple-800 font-bold block uppercase truncate">Professores Vinculados</span>
              <span className="text-lg font-black text-purple-700">{estudantes.filter(e => (e.professoresAutorizadosIds || []).length > 0).length}</span>
            </div>
          </div>

          {/* Barra de Filtro de Salas / Turmas (Pill selector com contagem) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-emerald-700" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Navegar por Salas de Aula:
                </span>
              </div>

              {/* Seletor de Modo de Visualização */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setModoVisualizacaoEstudantes('tabela_salas')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    modoVisualizacaoEstudantes === 'tabela_salas'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Visão em tabela agrupada por sala"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Tabela por Turmas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoVisualizacaoEstudantes('resumo_turmas')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    modoVisualizacaoEstudantes === 'resumo_turmas'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Painel geral com resumo de cada uma das 18 salas"
                >
                  <School className="h-3.5 w-3.5" />
                  <span>Painel das Salas (18)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoVisualizacaoEstudantes('cards')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    modoVisualizacaoEstudantes === 'cards'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Visão em fichas / cards de estudantes"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Fichas</span>
                </button>
              </div>
            </div>

            {/* Carrossel de botões de cada sala */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setFiltroTurmaEstudante('todas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filtroTurmaEstudante === 'todas'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todas as Salas ({estudantes.length})
              </button>

              {salasEstatisticas.map((s) => {
                const isSelected = filtroTurmaEstudante === s.sala;
                return (
                  <button
                    key={s.sala}
                    type="button"
                    onClick={() => setFiltroTurmaEstudante(isSelected ? 'todas' : s.sala)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{s.sala}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
                    }`}>
                      {s.totalAlunos}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Barra de Busca Rápida e Filtros por Nome e Série */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
              
              {/* Campo de Busca Rápida */}
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Busca rápida por nome do estudante, matrícula, laudo, turma ou PAE..."
                  value={buscaEstudante}
                  onChange={(e) => setBuscaEstudante(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-xs bg-slate-50/50"
                />
                {buscaEstudante && (
                  <button
                    type="button"
                    onClick={() => setBuscaEstudante('')}
                    className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filtros em Linha: Série, Turma, Situação e Perfil */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Filtro por Série */}
                <select
                  value={filtroSerieEstudante}
                  onChange={(e) => setFiltroSerieEstudante(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="todas">Todas as Séries ({todasAsSeries.length})</option>
                  {todasAsSeries.map(s => {
                    const qtd = estudantes.filter(e => {
                      const estSerie = (e.anoSerie || e.turma || '').toLowerCase();
                      const f = s.toLowerCase().replace('º ano', '').replace('ª série', '').replace(' em', '').trim();
                      return estSerie.includes(f);
                    }).length;
                    return (
                      <option key={s} value={s}>{s} ({qtd} alunos)</option>
                    );
                  })}
                </select>

                {/* Filtro por Turma */}
                <select
                  value={filtroTurmaEstudante}
                  onChange={(e) => setFiltroTurmaEstudante(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="todas">Todas as Turmas ({estudantes.length})</option>
                  {todasAsSalas.map(t => {
                    const qtd = estudantes.filter(e => e.turma === t).length;
                    return (
                      <option key={t} value={t}>{t} ({qtd} alunos)</option>
                    );
                  })}
                </select>

                {/* Filtro por Situação */}
                <select
                  value={filtroStatusEstudante}
                  onChange={(e) => setFiltroStatusEstudante(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="ativo">Ativos ({estudantes.filter(e => e.situacao === 'ativo').length})</option>
                  <option value="transferido">Transferidos ({estudantes.filter(e => e.situacao === 'transferido').length})</option>
                  <option value="arquivado">Arquivados ({estudantes.filter(e => e.situacao === 'arquivado').length})</option>
                </select>

                {/* Filtro por Perfil Pedagógico */}
                <select
                  value={filtroPerfilEstudante}
                  onChange={(e) => setFiltroPerfilEstudante(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="todos">Todos os Perfis</option>
                  <option value="com_perfil">Com Perfil Ativo</option>
                  <option value="sem_perfil">Sem Perfil Ativo</option>
                </select>
              </div>
            </div>

            {/* Chips Rápidos de Série e Contador de Resultados */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Atalhos de Série:
                </span>
                <button
                  type="button"
                  onClick={() => setFiltroSerieEstudante('todas')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0 ${
                    filtroSerieEstudante === 'todas'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas
                </button>
                {todasAsSeries.map(s => {
                  const isSel = filtroSerieEstudante === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFiltroSerieEstudante(isSel ? 'todas' : s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0 ${
                        isSel
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <span className="text-slate-500 font-semibold text-[11px]">
                  Exibindo <strong>{estudantesFiltrados.length}</strong> de {estudantes.length} alunos
                </span>

                {(buscaEstudante || filtroSerieEstudante !== 'todas' || filtroTurmaEstudante !== 'todas' || filtroStatusEstudante !== 'todos' || filtroPerfilEstudante !== 'todos') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuscaEstudante('');
                      setFiltroSerieEstudante('todas');
                      setFiltroTurmaEstudante('todas');
                      setFiltroStatusEstudante('todos');
                      setFiltroPerfilEstudante('todos');
                    }}
                    className="text-rose-600 hover:text-rose-800 font-bold text-[11px] underline cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODO 1: TABELA ORGANIZADA POR SALAS / TURMAS                             */}
          {/* ========================================================================= */}
          {modoVisualizacaoEstudantes === 'tabela_salas' && (
            <div className="space-y-6">
              {estudantesAgrupadosPorTurma.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-2">
                  <School className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">Nenhum estudante encontrado com os filtros selecionados.</p>
                  <p className="text-xs text-slate-500">Tente limpar a busca ou selecionar outra turma.</p>
                </div>
              ) : (
                estudantesAgrupadosPorTurma.map((grupo) => {
                  const paePrincipal = grupo.estudantes[0]?.paeResponsavelNome || 'Pendente de designação';
                  const turnoPrincipal = grupo.estudantes[0]?.turno || 'Matutino';

                  return (
                    <div key={grupo.turma} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      {/* Cabeçalho da Sala */}
                      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-sm border border-white/20">
                            {grupo.turma.split(' ')[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black tracking-tight">
                                Sala / Turma: {grupo.turma}
                              </h3>
                              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                                {grupo.estudantes.length} {grupo.estudantes.length === 1 ? 'estudante' : 'estudantes'}
                              </span>
                            </div>
                            <p className="text-xs text-emerald-100 flex items-center gap-2 mt-0.5">
                              <span>Turno: <strong>{turnoPrincipal}</strong></span>
                              <span>•</span>
                              <span>PAE Responsável: <strong>{paePrincipal}</strong></span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFormEstudante({
                                nome: '',
                                matricula: '',
                                turma: grupo.turma,
                                anoSerie: grupo.estudantes[0]?.anoSerie || 'Ensino Fundamental',
                                turno: turnoPrincipal,
                                dataNascimento: '',
                                situacao: 'ativo',
                                professoresAutorizadosIds: [],
                              });
                              setEstudanteEmEdicao(null);
                              setModalEstudanteAberto(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Adicionar à Sala</span>
                          </button>
                        </div>
                      </div>

                      {/* Tabela de Estudantes da Sala */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                            <tr>
                              <th className="p-3 w-12 text-center">Foto</th>
                              <th className="p-3 font-bold">Nome do Estudante</th>
                              <th className="p-3 font-bold">Matrícula</th>
                              <th className="p-3 font-bold">Situação</th>
                              <th className="p-3 font-bold">Diagnóstico / AEE (PDF)</th>
                              <th className="p-3 font-bold">PAE / Apoio</th>
                              <th className="p-3 font-bold">Responsáveis & Telefones</th>
                              <th className="p-3 font-bold text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {grupo.estudantes.map((est) => {
                              const iniciais = est.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                              return (
                                <tr key={est.id} className="hover:bg-slate-50/80 transition-colors">
                                  {/* Foto com ação de upload rápido */}
                                  <td className="p-2.5 text-center">
                                    <div className="relative group mx-auto w-9 h-9">
                                      {est.fotoUrl ? (
                                        <img 
                                          src={est.fotoUrl} 
                                          alt={est.nome} 
                                          className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-300" 
                                        />
                                      ) : (
                                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200">
                                          {iniciais}
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleSelecionarFotoEstudante(est.id)}
                                        className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                        title="Atualizar foto do estudante"
                                      >
                                        <Camera className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>

                                  {/* Nome */}
                                  <td className="p-3">
                                    <button
                                      type="button"
                                      onClick={() => setEstudanteFichaModal(est)}
                                      className="font-bold text-slate-900 hover:text-emerald-700 text-left block cursor-pointer transition-colors"
                                    >
                                      {est.nome}
                                    </button>
                                    <span className="text-[10px] text-slate-400 block">
                                      Nascimento: {est.dataNascimento || 'Não informado'}
                                    </span>
                                  </td>

                                  {/* Matrícula */}
                                  <td className="p-3 font-mono font-semibold text-slate-600 whitespace-nowrap">
                                    {est.matricula}
                                  </td>

                                  {/* Situação */}
                                  <td className="p-3 whitespace-nowrap">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      est.situacao === 'ativo' 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                        : est.situacao === 'transferido'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {est.situacao.toUpperCase()}
                                    </span>
                                  </td>

                                  {/* Diagnóstico / AEE extraído do PDF */}
                                  <td className="p-3 max-w-xs">
                                    {est.laudo ? (
                                      <div className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-[11px] text-slate-700 leading-snug line-clamp-2" title={est.laudo}>
                                        {est.laudo}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Não registrado</span>
                                    )}
                                  </td>

                                  {/* PAE */}
                                  <td className="p-3 whitespace-nowrap">
                                    <span className="font-semibold text-slate-800 block text-xs">
                                      {est.paeResponsavelNome || 'Pendente'}
                                    </span>
                                    {est.paeResponsavelEmail && (
                                      <span className="text-[10px] text-slate-400 block font-mono">
                                        {est.paeResponsavelEmail}
                                      </span>
                                    )}
                                  </td>

                                  {/* Responsáveis e Telefones */}
                                  <td className="p-3 max-w-xs">
                                    <div className="text-[11px] text-slate-600">
                                      <p className="truncate font-medium">{est.responsaveis || 'Não informado'}</p>
                                      <p className="text-slate-400 truncate">{est.telefones || ''}</p>
                                    </div>
                                  </td>

                                  {/* Ações */}
                                  <td className="p-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleDispararCriarPei(est.id)}
                                        className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Criar Plano Educacional Individualizado (PEI - SEDUC-GO)"
                                      >
                                        <GraduationCap className="h-3 w-3 text-indigo-700" />
                                        <span>PEI</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPdiEstudanteInicialId(est.id);
                                          setModalRelatorioPdiAberto(true);
                                        }}
                                        className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Gerar Relatório de Desempenho (PDI)"
                                      >
                                        <Award className="h-3 w-3" />
                                        <span>PDI</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleBaixarRelatorioConsolidado(est)}
                                        disabled={downloadingConsolidadoAlunoId === est.id}
                                        className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors border border-sky-200 disabled:opacity-60"
                                        title="Gerar e Baixar Relatório Consolidado em PDF (Histórico Pedagógico + Acompanhamento de Apoio SEDUC-GO)"
                                      >
                                        {downloadingConsolidadoAlunoId === est.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin text-sky-700" />
                                        ) : (
                                          <FileDown className="h-3 w-3 text-sky-700" />
                                        )}
                                        <span>Gerar Relatório PDF</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setEstudanteFichaModal(est)}
                                        className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Ver ficha individual"
                                      >
                                        <FileText className="h-3 w-3" />
                                        <span>Ficha</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEstudanteEmEdicao(est);
                                          setFormEstudante({ ...est });
                                          setModalEstudanteAberto(true);
                                        }}
                                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                                        title="Editar estudante"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODO 2: PAINEL DAS SALAS (RESUMO DAS 18 SALAS)                           */}
          {/* ========================================================================= */}
          {modoVisualizacaoEstudantes === 'resumo_turmas' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {salasEstatisticas.map((s) => {
                return (
                  <div 
                    key={s.sala}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-400 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-black text-slate-900 flex items-center gap-1.5">
                          <School className="h-4 w-4 text-emerald-700" />
                          <span>Sala: {s.sala}</span>
                        </span>
                        <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full">
                          {s.totalAlunos} {s.totalAlunos === 1 ? 'estudante' : 'estudantes'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                        <p><strong>Turno:</strong> {s.turno}</p>
                        <p>
                          <strong>PAE Responsável:</strong>{' '}
                          {s.paeNomes.length > 0 ? s.paeNomes.join(', ') : 'Não informado'}
                        </p>
                        <p><strong>Estudantes Ativos:</strong> {s.alunosAtivos}</p>
                      </div>

                      {/* Lista de alunos da sala */}
                      <div className="space-y-1 pt-2 border-t border-slate-100 mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Alunos matriculados:
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {s.alunos.map(a => (
                            <span 
                              key={a.id}
                              onClick={() => setEstudanteFichaModal(a)}
                              className="text-[11px] bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer transition-colors truncate max-w-full"
                              title={`Ver ficha de ${a.nome}`}
                            >
                              {a.nome}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFiltroTurmaEstudante(s.sala);
                        setModoVisualizacaoEstudantes('tabela_salas');
                      }}
                      className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <TableIcon className="h-3.5 w-3.5" />
                      <span>Ver Estudantes desta Sala</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODO 3: CARDS / FICHAS DOS ESTUDANTES (FRAMER-MOTION & EXPANSÃO RÁPIDA)   */}
          {/* ========================================================================= */}
          {modoVisualizacaoEstudantes === 'cards' && (
            <div className="space-y-3">
              {/* Barra superior de controle rápido e contagem */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Fichas dos Estudantes</span>
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {estudantesFiltrados.length} {estudantesFiltrados.length === 1 ? 'aluno listado' : 'alunos listados'}
                  </span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                  <button
                    type="button"
                    onClick={expandirTodosCardsEstudantes}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer transition-colors"
                    title="Expandir o resumo de Perfil e PEI de todos os cards visíveis"
                  >
                    Expandir Todos
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={recolherTodosCardsEstudantes}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer transition-colors"
                    title="Recolher todos os resumos"
                  >
                    Recolher Todos
                  </button>
                </div>
              </div>

              {estudantesFiltrados.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-2 shadow-2xs"
                >
                  <Users className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">Nenhum estudante encontrado com os filtros selecionados.</p>
                  <p className="text-xs text-slate-500">Ajuste o termo de busca ou selecione outra turma/série no menu superior.</p>
                </motion.div>
              ) : (
                <motion.div 
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {estudantesFiltrados.map((est) => {
                      const perfilEst = perfisPedagogicos.find(p => p.estudanteId === est.id);
                      const peiEst = obterPeiDoEstudante(est.id, est.nome);
                      const qtdProfessores = (est.professoresAutorizadosIds || []).length;
                      const iniciais = est.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                      const isExpanded = Boolean(cardsEstudantesExpandidos[est.id]);

                      return (
                        <motion.div
                          layout
                          key={est.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          whileHover={{ y: -3, transition: { duration: 0.15 } }}
                          className={`bg-white p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-all duration-200 ${
                            isExpanded
                              ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-md'
                              : 'border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                          }`}
                        >
                          <div>
                            {/* Cabeçalho do Card: Foto, Matrícula e Situação */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="relative group w-9 h-9">
                                  {est.fotoUrl ? (
                                    <img src={est.fotoUrl} alt={est.nome} className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-300" />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200">
                                      {iniciais}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelecionarFotoEstudante(est.id);
                                    }}
                                    className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                    title="Atualizar foto"
                                  >
                                    <Camera className="h-3 w-3" />
                                  </button>
                                </div>
                                <div>
                                  <span className="text-[10px] font-mono text-slate-500 block">Matrícula: {est.matricula}</span>
                                </div>
                              </div>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                est.situacao === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {est.situacao.toUpperCase()}
                              </span>
                            </div>

                            {/* Nome oficial do estudante */}
                            <h3 className="font-extrabold text-sm text-slate-900 mb-1 leading-snug">
                              {est.nome}
                            </h3>

                            <div className="text-xs text-slate-600 space-y-0.5 mb-2">
                              <p><strong>Turma:</strong> {est.turma} • {est.anoSerie}</p>
                              <p><strong>Turno:</strong> {est.turno}</p>
                              {est.paeResponsavelNome && (
                                <p><strong>PAE:</strong> {est.paeResponsavelNome}</p>
                              )}
                            </div>

                            {/* Diagnóstico oficial / Laudo (exibido no módulo acadêmico) */}
                            {est.laudo && (
                              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 mb-2 line-clamp-2">
                                <strong>AEE:</strong> {est.laudo}
                              </div>
                            )}

                            {/* Badges de Status (Professores, Perfil e PEI) */}
                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                              {qtdProfessores > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200">
                                  {qtdProfessores} {qtdProfessores === 1 ? 'prof. vinculado' : 'profs. vinculados'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                                  Sem professor
                                </span>
                              )}

                              {perfilEst ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                                  <BookOpen className="h-2.5 w-2.5" />
                                  <span>Perfil OK</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                                  Sem perfil
                                </span>
                              )}

                              {peiEst ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                  <GraduationCap className="h-2.5 w-2.5 text-emerald-700" />
                                  <span>PEI Ativo</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                                  Sem PEI
                                </span>
                              )}
                            </div>

                            {/* Botão Interativo com Efeito de Expandir para Resumo Rápido */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCardEstudanteExpandido(est.id);
                              }}
                              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                                isExpanded
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs'
                                  : 'bg-slate-50 hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-800 border border-slate-200/80 hover:border-emerald-200'
                              }`}
                              aria-expanded={isExpanded}
                            >
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{isExpanded ? 'Ocultar Resumo Pedagógico & PEI' : 'Ver Resumo: Perfil Pedagógico & PEI'}</span>
                              </span>
                              <motion.span
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="inline-flex items-center ml-1 text-slate-500"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </motion.span>
                            </button>

                            {/* Painel Expansível de Resumo com Animação Fluida Framer-Motion */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  key="resumo-expansivel"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] }}
                                  className="overflow-hidden space-y-2.5 pt-2 pb-1"
                                >
                                  {/* 1. SEÇÃO DO PERFIL PEDAGÓGICO */}
                                  <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5 text-purple-700" />
                                        <span className="text-xs font-extrabold text-slate-900">Perfil Pedagógico</span>
                                      </div>
                                      {perfilEst ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          <span>Cadastrado</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3" />
                                          <span>Pendente</span>
                                        </span>
                                      )}
                                    </div>

                                    {perfilEst ? (
                                      <div className="space-y-2 text-xs">
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Leitura & Escrita</span>
                                            <span className="font-bold text-slate-800 text-[11px] block truncate">
                                              {perfilEst.nivelLeitura || perfilEst.nivelEscrita ? `${perfilEst.nivelLeitura || '—'} / ${perfilEst.nivelEscrita || '—'}` : 'Em avaliação'}
                                            </span>
                                          </div>
                                          <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Matemática</span>
                                            <span className="font-bold text-slate-800 text-[11px] block truncate">
                                              {perfilEst.conhecimentosMatematicos || 'Em avaliação'}
                                            </span>
                                          </div>
                                        </div>

                                        {perfilEst.habilidadesConsolidadas && (
                                          <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                                            <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">Habilidades Consolidadas</span>
                                            <p className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed">
                                              {perfilEst.habilidadesConsolidadas}
                                            </p>
                                          </div>
                                        )}

                                        {perfilEst.habilidadesEmDesenvolvimento && (
                                          <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                                            <span className="text-[10px] font-bold text-indigo-800 uppercase block mb-0.5">Em Desenvolvimento</span>
                                            <p className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed">
                                              {perfilEst.habilidadesEmDesenvolvimento}
                                            </p>
                                          </div>
                                        )}

                                        {(perfilEst.barreirasPedagogicas || perfilEst.estrategiasRecomendadas) && (
                                          <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                                            <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">Estratégias / Barreiras</span>
                                            <p className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed">
                                              {perfilEst.estrategiasRecomendadas || perfilEst.barreirasPedagogicas}
                                            </p>
                                          </div>
                                        )}

                                        <div className="pt-0.5 flex items-center justify-end">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setAbaAtiva('perfis');
                                            }}
                                            className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>Ver módulo de Perfis</span>
                                            <ExternalLink className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 text-xs space-y-2">
                                        <p className="text-[11px] text-amber-900 leading-snug">
                                          Estudante ainda não possui Perfil Pedagógico registrado. Cadastre para subsidiar os professores nas adaptações.
                                        </p>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFormPerfil(prev => ({ ...prev, estudanteId: est.id, estudanteNome: est.nome }));
                                            setModalPerfilAberto(true);
                                          }}
                                          className="w-full py-1.5 px-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                          <span>+ Criar Perfil Pedagógico</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* 2. SEÇÃO DO STATUS DO PEI (SEDUC-GO) */}
                                  <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <GraduationCap className="h-3.5 w-3.5 text-indigo-700" />
                                        <span className="text-xs font-extrabold text-slate-900">Status do PEI (SEDUC-GO)</span>
                                      </div>
                                      {peiEst ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          <span>{peiEst.status ? peiEst.status.toUpperCase() : 'HOMOLOGADO'}</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3" />
                                          <span>Não Criado</span>
                                        </span>
                                      )}
                                    </div>

                                    {peiEst ? (
                                      <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs space-y-2">
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                          <div>
                                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Período</span>
                                            <span className="font-bold text-slate-800">{peiEst.period || 'Ano Letivo 2026'}</span>
                                          </div>
                                          <div>
                                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Atualização</span>
                                            <span className="font-semibold text-slate-700">
                                              {peiEst.updatedAt ? new Date(peiEst.updatedAt).toLocaleDateString('pt-BR') : 'Recente'}
                                            </span>
                                          </div>
                                        </div>

                                        {peiEst.diagnosis && (
                                          <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                                            <span className="font-bold text-slate-900 block text-[10px] uppercase text-indigo-800">Diagnóstico / AEE:</span>
                                            <span className="line-clamp-2">{peiEst.diagnosis}</span>
                                          </div>
                                        )}

                                        {peiEst.subject && (
                                          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-emerald-50/50 p-1.5 rounded border border-emerald-100">
                                            <span className="font-bold text-emerald-900">Componente / Disciplina:</span>
                                            <span className="font-extrabold text-emerald-800">{peiEst.subject}</span>
                                          </div>
                                        )}

                                        {peiEst.areaAcademica && peiEst.areaAcademica.length > 0 && (
                                          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-sky-50/50 p-1.5 rounded border border-sky-100">
                                            <span className="font-bold text-sky-900">Áreas Acadêmicas Adaptadas:</span>
                                            <span className="font-extrabold text-sky-800">{peiEst.areaAcademica.length} área(s)</span>
                                          </div>
                                        )}

                                        <div className="pt-1 flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              setBaixandoPeiDocId(peiEst.id || est.id);
                                              try {
                                                await baixarPeiComoPdf(peiEst, escolaConfig);
                                              } catch (err) {
                                                console.error('Erro ao baixar PEI PDF:', err);
                                              } finally {
                                                setBaixandoPeiDocId(null);
                                              }
                                            }}
                                            disabled={baixandoPeiDocId === (peiEst.id || est.id)}
                                            className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border border-rose-200 cursor-pointer transition-colors disabled:opacity-50"
                                            title="Baixar PEI diagramado em PDF A4 com cabeçalho oficial"
                                          >
                                            {baixandoPeiDocId === (peiEst.id || est.id) ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <Download className="h-3 w-3" />
                                            )}
                                            <span>Baixar PDF</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDispararCriarPei(est.id);
                                            }}
                                            className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border border-indigo-200 cursor-pointer transition-colors"
                                            title="Revisar ou editar o PEI"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                            <span>Revisar PEI</span>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200 text-xs space-y-2">
                                        <p className="text-[11px] text-indigo-900 leading-snug">
                                          Nenhum Plano Educacional Individualizado registrado para este aluno.
                                        </p>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDispararCriarPei(est.id);
                                          }}
                                          className="w-full py-1.5 px-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                                        >
                                          <GraduationCap className="h-3.5 w-3.5" />
                                          <span>+ Elaborar PEI (SEDUC-GO)</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Botões de Ação na Ficha */}
                          <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDispararCriarPei(est.id);
                              }}
                              className="py-1.5 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              title="Criar Plano Educacional Individualizado (PEI - SEDUC-GO)"
                            >
                              <GraduationCap className="h-3.5 w-3.5 text-indigo-700" />
                              <span>PEI</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPdiEstudanteInicialId(est.id);
                                setModalRelatorioPdiAberto(true);
                              }}
                              className="py-1.5 px-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              title="Gerar Relatório de Desempenho (PDI)"
                            >
                              <Award className="h-3.5 w-3.5" />
                              <span>PDI</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBaixarRelatorioConsolidado(est);
                              }}
                              disabled={downloadingConsolidadoAlunoId === est.id}
                              className="py-1.5 px-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors border border-sky-200 disabled:opacity-60"
                              title="Gerar e Baixar Relatório Consolidado em PDF (Histórico Pedagógico + Acompanhamento de Apoio SEDUC-GO)"
                            >
                              {downloadingConsolidadoAlunoId === est.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-700" />
                              ) : (
                                <FileDown className="h-3.5 w-3.5 text-sky-700" />
                              )}
                              <span>Gerar Relatório PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEstudanteFichaModal(est);
                              }}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Ver Ficha</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEstudanteEmEdicao(est);
                                setFormEstudante({ ...est });
                                setModalEstudanteAberto(true);
                              }}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                              title="Editar dados"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3.1. PROFISSIONAL DE APOIO - CONSULTA E ACOMPANHAMENTO COORDENAÇÃO       */}
      {/* ========================================================================= */}
      {abaAtiva === 'apoio' && (
        <div className="space-y-6">
          
          {/* Cabeçalho do Módulo & Ações */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <HeartHandshake className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Profissional de Apoio
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Consulta formal dos acompanhamentos diários, diários de bordo e presenças dos estudantes atendidos.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Botão para Acessar Módulo Interativo Completo do Profissional de Apoio */}
              {onNavigateToApoio && (
                <button
                  type="button"
                  onClick={onNavigateToApoio}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  title="Abrir o ambiente interativo de preenchimento e calendário"
                >
                  <HeartHandshake className="h-4 w-4" />
                  <span>Espaço do Profissional de Apoio</span>
                </button>
              )}

              {/* Botão de Exportação PDF Oficial */}
              <button
                type="button"
                onClick={() => {
                  setAlunoSelecionadoParaRelatorio(null);
                  setModalRelatorioAberto(true);
                }}
                disabled={registrosApoioFiltrados.length === 0}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                title="Exportar Relatório Mensal Oficial em PDF para a Direção Escolar"
              >
                <Printer className="h-4 w-4" />
                <span>Exportar Relatório em PDF ({registrosApoioFiltrados.length})</span>
              </button>

              {/* Botão de Exportação CSV */}
              <button
                type="button"
                onClick={exportarRegistrosApoioCSV}
                disabled={registrosApoioFiltrados.length === 0}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer disabled:opacity-40"
                title="Exportar registros filtrados em planilha CSV"
              >
                <Download className="h-4 w-4 text-emerald-700" />
                <span>Exportar CSV ({registrosApoioFiltrados.length})</span>
              </button>
            </div>
          </div>

          {/* Cards de Métricas Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total de Registros</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{registrosApoio.length}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Histórico acumulado</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Registros Hoje</span>
              <span className="text-2xl font-black text-emerald-800 mt-1 block">
                {registrosApoio.filter(r => r.data === new Date().toISOString().split('T')[0]).length}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Data atual do sistema</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Presenças</span>
              <span className="text-2xl font-black text-emerald-800 mt-1 block">
                {registrosApoio.filter(r => r.presente).length}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Alunos presentes</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Ausências</span>
              <span className="text-2xl font-black text-amber-800 mt-1 block">
                {registrosApoio.filter(r => !r.presente).length}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Ausências registradas</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Estudantes</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {new Set(registrosApoio.map(r => r.studentId)).size} / {estudantes.length}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Com registros realizados</span>
            </div>
          </div>

          {/* Painel de Filtros */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Filter className="h-4 w-4 text-emerald-700" />
                <span>Filtros de Consulta</span>
              </div>

              {(buscaApoioEstudante || filtroApoioTurma !== 'todas' || filtroApoioProfissional !== 'todos' || filtroApoioPresenca !== 'todos' || filtroApoioDataInicio || filtroApoioDataFim) && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaApoioEstudante('');
                    setFiltroApoioTurma('todas');
                    setFiltroApoioProfissional('todos');
                    setFiltroApoioPresenca('todos');
                    setFiltroApoioDataInicio('');
                    setFiltroApoioDataFim('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Busca por Estudante */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar estudante..."
                  value={buscaApoioEstudante}
                  onChange={e => setBuscaApoioEstudante(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              {/* Filtro por Turma */}
              <div>
                <select
                  value={filtroApoioTurma}
                  onChange={e => setFiltroApoioTurma(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden cursor-pointer"
                >
                  <option value="todas">Todas as Turmas</option>
                  {turmasApoioDisponiveis.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Profissional de Apoio */}
              <div>
                <select
                  value={filtroApoioProfissional}
                  onChange={e => setFiltroApoioProfissional(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden cursor-pointer"
                >
                  <option value="todos">Todos os Profissionais</option>
                  {profissionaisApoioDisponiveis.map(p => (
                    <option key={p.email} value={p.email}>{p.nome}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Presença */}
              <div>
                <select
                  value={filtroApoioPresenca}
                  onChange={e => setFiltroApoioPresenca(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden cursor-pointer"
                >
                  <option value="todos">Presença: Todas</option>
                  <option value="presente">Apenas Presentes</option>
                  <option value="ausente">Apenas Ausentes</option>
                </select>
              </div>

              {/* Filtro por Período */}
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={filtroApoioDataInicio}
                  onChange={e => setFiltroApoioDataInicio(e.target.value)}
                  title="Data de início"
                  className="w-1/2 px-2 py-2 text-[11px] rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden cursor-pointer"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="date"
                  value={filtroApoioDataFim}
                  onChange={e => setFiltroApoioDataFim(e.target.value)}
                  title="Data final"
                  className="w-1/2 px-2 py-2 text-[11px] rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Lista de Registros */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-semibold px-1">
              <div>
                <span>{registrosApoioFiltrados.length} registro(s) encontrado(s)</span>
                {registrosApoioFiltrados.length !== registrosApoio.length && (
                  <span className="ml-1 text-slate-400">• Filtrado de um total de {registrosApoio.length} registros</span>
                )}
              </div>
              {registrosApoioFiltrados.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAlunoSelecionadoParaRelatorio(null);
                    setModalRelatorioAberto(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                  title="Exportar listagem em PDF para a Direção"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Exportar Listagem em PDF</span>
                </button>
              )}
            </div>

            {registrosApoioFiltrados.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">
                  Nenhum registro de acompanhamento localizado
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {registrosApoio.length === 0 
                    ? 'Ainda não foram efetuados registros de acompanhamento pelos profissionais de apoio. Eles aparecerão aqui assim que forem salvos.'
                    : 'Nenhum registro atende aos critérios dos filtros selecionados acima. Tente ajustar os filtros.'}
                </p>
                {onNavigateToApoio && registrosApoio.length === 0 && (
                  <button
                    type="button"
                    onClick={onNavigateToApoio}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <HeartHandshake className="h-4 w-4" />
                    <span>Realizar Primeiro Registro no Módulo de Apoio</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {registrosApoioFiltrados.map((reg) => {
                  const estudanteAssociado = estudantes.find(e => e.id === reg.studentId);
                  const fotoAluno = estudanteAssociado?.fotoUrl;
                  const dataFormatada = reg.data.split('-').reverse().join('/');

                  return (
                    <div
                      key={reg.id}
                      className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
                    >
                      {/* Topo do Card: Aluno, Turma, Data e Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          {/* Foto do Aluno */}
                          {fotoAluno ? (
                            <img
                              src={fotoAluno}
                              alt={reg.nomeEstudante}
                              className="h-12 w-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black flex items-center justify-center shrink-0 text-sm">
                              {reg.nomeEstudante.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                                {reg.nomeEstudante}
                              </h3>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
                                {reg.turma}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                              <span>{dataFormatada} ({reg.diaSemana || 'Dia Letivo'})</span>
                              <span>•</span>
                              <span>Resp: <strong className="text-slate-700">{reg.profissionalResponsavelNome}</strong></span>
                            </p>
                          </div>
                        </div>

                        {/* Status Presença */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {reg.presente ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-300 text-emerald-800">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-700" />
                              <span>Presente</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-300 text-rose-800">
                              <X className="h-3.5 w-3.5 text-rose-700" />
                              <span>Ausente</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Corpo do Registro */}
                      {reg.presente ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Acompanhamento Comportamental */}
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <span className="font-extrabold text-slate-800 block uppercase tracking-wider text-[10px]">
                              Acompanhamento Comportamental Observável
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 font-medium">Demonstrou irritabilidade ou sinais:</span>
                              <span className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] ${
                                reg.demonstrouIrritabilidadeOuSinais === 'Sim'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}>
                                {reg.demonstrouIrritabilidadeOuSinais || 'Não'}
                              </span>
                            </div>
                            {reg.observacaoComportamental && (
                              <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 italic">
                                "{reg.observacaoComportamental}"
                              </p>
                            )}
                          </div>

                          {/* Atividade Adaptada */}
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <span className="font-extrabold text-slate-800 block uppercase tracking-wider text-[10px]">
                              Atividade Adaptada Realizada
                            </span>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div>
                                <span className="text-slate-600 font-medium">Recebeu atividade: </span>
                                <strong className="text-slate-800">{reg.recebeuAtividadeAdaptada || 'Sim'}</strong>
                              </div>
                              {reg.conseguiuRealizarAtividade && (
                                <div>
                                  <span className="text-slate-600 font-medium">Conseguiu realizar: </span>
                                  <strong className="text-slate-800">{reg.conseguiuRealizarAtividade}</strong>
                                </div>
                              )}
                            </div>

                            {reg.disciplinasEnvolvidas && reg.disciplinasEnvolvidas.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                <span className="text-slate-500 text-[11px]">Disciplinas:</span>
                                {reg.disciplinasEnvolvidas.map(d => (
                                  <span key={d} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            )}

                            {reg.observacaoAtividade && (
                              <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 italic mt-1">
                                "{reg.observacaoAtividade}"
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                          <p>O estudante esteve <strong>ausente</strong> nesta data. Nenhuma atividade ou acompanhamento presencial foi realizado.</p>
                        </div>
                      )}

                      {/* Informações Adicionais */}
                      {reg.informacoesAdicionais && (
                        <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-1">
                          <span className="font-bold text-emerald-950 block text-[11px]">Informações adicionais do dia:</span>
                          <p className="text-slate-700">{reg.informacoesAdicionais}</p>
                        </div>
                      )}

                      {/* Fotografia do Diário de Bordo & Rodapé do Card */}
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-slate-100">
                        {/* Diário de Bordo */}
                        <div>
                          {reg.fotoDiarioBordoUrl ? (
                            <button
                              type="button"
                              onClick={() => {
                                setFotoModalDiarioBordoUrl(reg.fotoDiarioBordoUrl || null);
                                setFotoModalTitulo(`${reg.nomeEstudante} - Diário de Bordo (${dataFormatada})`);
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-colors cursor-pointer"
                            >
                              <Camera className="h-3.5 w-3.5 text-emerald-700" />
                              <span>Ver Fotografia do Diário de Bordo</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Sem foto do Diário de Bordo anexada</span>
                          )}
                        </div>

                        {/* Metadados */}
                        <div className="text-[11px] text-slate-400 font-mono">
                          <span>Registrado às {reg.horario || '12:00'} • ID: {reg.id.split('-').slice(0, 3).join('-')}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PERFIL PEDAGÓGICO */}
      {/* ========================================================================= */}
      {abaAtiva === 'perfis' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Perfis Pedagógicos Autorizados</h2>
            <button
              onClick={() => setModalPerfilAberto(true)}
              disabled={estudantes.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>+ Criar perfil pedagógico</span>
            </button>
          </div>

          {perfisPedagogicos.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                Nenhum perfil pedagógico cadastrado.
              </p>
              <p className="text-xs text-slate-500">
                O perfil pedagógico somente deverá existir depois de cadastrado pela Coordenação ou extraído e aprovado de documento oficial.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {perfisPedagogicos.map((perfil) => (
                <div key={perfil.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-sm text-slate-900 mb-2">
                    Estudante: {perfil.estudanteNome}
                  </h3>
                  <div className="text-xs text-slate-600 space-y-1.5 border-t border-slate-100 pt-2">
                    <p><strong>Nível de Leitura:</strong> {perfil.nivelLeitura || 'Não informado'}</p>
                    <p><strong>Estratégias Recomendadas:</strong> {perfil.estrategiasRecomendadas || 'Padrão'}</p>
                    <p><strong>Alternativas:</strong> {perfil.quantidadeAlternativas} opções</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DOCUMENTOS & PEIS OFICIAIS                                             */}
      {/* ========================================================================= */}
      {abaAtiva === 'documentos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">Documentos & PEIs Homologados</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  SEDUC-GO / SIAP
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Planos Educacionais Individualizados (PEI), relatórios e arquivos institucionais do Colégio Estadual Olynto Pereira de Castro.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDispararCriarPei()}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Criar novo Plano Educacional Individualizado conforme diretrizes da SEDUC-GO"
              >
                <GraduationCap className="h-4 w-4 text-emerald-200" />
                <span>+ Criar PEI (SEDUC-GO)</span>
              </button>
              <button
                type="button"
                onClick={() => setModalDocumentoAberto(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                + Enviar Documento
              </button>
            </div>
          </div>

          {/* Filtros por Categoria de Documento */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setFiltroTipoDocumento('todos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                filtroTipoDocumento === 'todos'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({documentos.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipoDocumento('pei')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                filtroTipoDocumento === 'pei'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5 text-emerald-700" />
              <span>PEIs Oficiais ({documentos.filter(d => d.tipo === 'pei' || Boolean(d.peiDados)).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipoDocumento('outros')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                filtroTipoDocumento === 'outros'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Outros ({documentos.filter(d => d.tipo !== 'pei' && !d.peiDados).length})
            </button>
          </div>

          {(() => {
            const docsFiltrados = documentos.filter(doc => {
              const isPei = doc.tipo === 'pei' || Boolean(doc.peiDados);
              if (filtroTipoDocumento === 'pei') return isPei;
              if (filtroTipoDocumento === 'outros') return !isPei;
              return true;
            });

            if (docsFiltrados.length === 0) {
              return (
                <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
                  <GraduationCap className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">
                    {filtroTipoDocumento === 'pei'
                      ? 'Nenhum PEI oficial cadastrado ainda.'
                      : 'Nenhum documento cadastrado nesta categoria.'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {filtroTipoDocumento === 'pei'
                      ? 'Utilize o assistente integrado com IA para criar um Plano Educacional Individualizado alinhado às diretrizes do SIAP da SEDUC-GO.'
                      : 'Envie listas de estudantes, matrizes curriculares ou crie um PEI para vincular aos alunos.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDispararCriarPei()}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>Criar PEI (SEDUC-GO)</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {docsFiltrados.map((doc) => {
                  const isPei = doc.tipo === 'pei' || Boolean(doc.peiDados);
                  const pei = doc.peiDados;

                  return (
                    <div
                      key={doc.id}
                      className={`bg-white p-4 rounded-xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                        isPei ? 'border-emerald-200 hover:border-emerald-400 bg-linear-to-r from-emerald-50/20 to-white' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${isPei ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {isPei ? <GraduationCap className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{doc.nomeArquivo}</span>
                            {isPei ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                PEI • SIAP SEDUC-GO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {doc.tipo}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {doc.tamanho} • {doc.dataEnvio}
                            </span>
                          </div>

                          {isPei && pei && (
                            <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span>Aluno: <strong className="text-slate-900">{pei.studentName}</strong></span>
                              <span>•</span>
                              <span>Turma: <strong>{pei.grade} - {pei.classRoom}</strong></span>
                              <span>•</span>
                              <span>Período: <strong>{pei.period}</strong></span>
                              <span>•</span>
                              <span>Diagnóstico: <strong className="text-slate-800">{pei.diagnosis}</strong></span>
                            </div>
                          )}

                          {!isPei && doc.camposExtraidos && doc.camposExtraidos.length > 0 && (
                            <p className="text-[11px] text-slate-500">
                              {doc.camposExtraidos.map(c => `${c.campo}: ${c.valor}`).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                        {isPei && pei && (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                setBaixandoPeiDocId(doc.id);
                                try {
                                  await baixarPeiComoPdf(pei, escolaConfig);
                                } catch (e) {
                                  console.error('Erro ao baixar PEI PDF:', e);
                                } finally {
                                  setBaixandoPeiDocId(null);
                                }
                              }}
                              disabled={baixandoPeiDocId === doc.id}
                              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                              title="Baixar PEI diagramado em PDF oficial A4 com logotipo da escola"
                            >
                              {baixandoPeiDocId === doc.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Gerando PDF...</span>
                                </>
                              ) : (
                                <>
                                  <FileDown className="h-3.5 w-3.5" />
                                  <span>Baixar PDF (A4)</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDispararCriarPei(pei.studentId)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Editar ou revisar dados deste PEI"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Editar</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MATRIZ CURRICULAR */}
      {/* ========================================================================= */}
      {abaAtiva === 'matriz' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Matrizes Curriculares Homologadas</h2>
              <p className="text-xs text-slate-500">Documentos e diretrizes curriculares oficiais (DC-GO / BNCC) da escola.</p>
            </div>
            <button
              onClick={onOpenImportarMatriz}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <BookOpen className="h-4 w-4" />
              <span>Importar Matrizes Curriculares</span>
            </button>
          </div>

          {matrizesCurriculares.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">Nenhuma matriz curricular cadastrada.</p>
              <p className="text-xs text-slate-500">Clique em "Importar Matrizes Curriculares" para enviar um documento oficial.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matrizesCurriculares.map(m => (
                <div key={m.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{m.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {m.status === 'approved' ? 'Aprovada' : m.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p>Disciplina: <strong>{m.subject}</strong> • Série: <strong>{m.grade}</strong></p>
                    <p>Ano de Referência: <strong>{m.referenceYear}</strong> • Etapa: {m.educationStage}</p>
                    <p className="text-[11px] text-slate-400 truncate">Arquivo: {m.sourceFileName || 'Documento homologado'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. HABILIDADES */}
      {abaAtiva === 'habilidades' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Habilidades Aprovadas</h2>
            <button
              onClick={() => setModalHabilidadeAberto(true)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold"
            >
              + Cadastrar habilidade manual
            </button>
          </div>

          {habilidades.filter(h => h.status === 'aprovada').length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">Nenhuma habilidade aprovada.</p>
              <p className="text-xs text-slate-500">As habilidades aparecerão depois da importação e revisão da matriz.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {habilidades.filter(h => h.status === 'aprovada').map(hab => (
                <div key={hab.id} className="p-3 bg-white rounded-xl border text-xs">
                  <strong>{hab.codigo}:</strong> {hab.descricao}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. ATIVIDADES */}
      {abaAtiva === 'atividades' && (
        <div className="space-y-6">
          <CoordenacaoDashboardCharts
            atividades={atividades}
            perfisPedagogicos={perfisPedagogicos}
            estudantes={estudantes}
            escolaConfig={escolaConfig}
            onNavigateToTab={(tabId) => setAbaAtiva(tabId as AbaCoordenacao)}
            onVisualizarAtividade={onVisualizarAtividadeA4}
            onOpenRelatorioTrimestral={() => setModalRelatorioTrimestralAberto(true)}
          />
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Atividades Criadas</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {atividadesFiltradas.length} {atividadesFiltradas.length === 1 ? 'atividade' : 'atividades'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Gerencie, selecione múltiplas atividades e exporte em lote como um único PDF contínuo formatado em folha A4.
                </p>
              </div>

              {/* Botões de Ação de Seleção e Exportação Contínua */}
              <div className="flex items-center gap-2 flex-wrap">
                {atividadesSelecionadasIds.size > 0 && (
                  <button
                    onClick={handleExportarAtividadesSelecionadasPdf}
                    disabled={isExportandoLoteAtividadesPdf}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                    title="Exportar todas as atividades selecionadas em um único PDF contínuo A4"
                  >
                    {isExportandoLoteAtividadesPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Gerando PDF Contínuo...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        <span>Exportar {atividadesSelecionadasIds.size} em PDF Contínuo (A4)</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleSelecionarTodasAtividadesFiltradas}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Selecionar Todas ({atividadesFiltradas.length})</span>
                </button>

                {atividadesSelecionadasIds.size > 0 && (
                  <button
                    onClick={handleDesmarcarTodasAtividades}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5" />
                    <span>Desmarcar ({atividadesSelecionadasIds.size})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Alerta de Feedback de Exportação em Lote */}
            {feedbackExportacaoLote && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border animate-fadeIn shadow-2xs ${
                feedbackExportacaoLote.tipo === 'sucesso'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <div className="flex items-center gap-2">
                  {feedbackExportacaoLote.tipo === 'sucesso' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-700 shrink-0" />
                  )}
                  <span>{feedbackExportacaoLote.msg}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/70 border border-current">
                  PDF Lote A4
                </span>
              </div>
            )}

            {/* Barra de Filtros e Busca */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por conteúdo, aluno, professor ou disciplina..."
                  value={buscaAtividade}
                  onChange={(e) => setBuscaAtividade(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Turma:</span>
                <select
                  value={filtroTurmaAtividade}
                  onChange={(e) => setFiltroTurmaAtividade(e.target.value)}
                  className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                >
                  <option value="todas">Todas as Turmas</option>
                  {turmasAtividadesDisponiveis.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Status:</span>
                <select
                  value={filtroStatusAtividade}
                  onChange={(e) => setFiltroStatusAtividade(e.target.value)}
                  className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="Revisada">Revisada</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>

              {atividadesSelecionadasIds.size > 0 && (
                <div className="ml-auto text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  {atividadesSelecionadasIds.size} selecionada(s)
                </div>
              )}
            </div>

            {atividadesFiltradas.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border text-center text-xs text-slate-500">
                Nenhuma atividade encontrada com os filtros selecionados.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {atividadesFiltradas.map(ativ => {
                  const isSelecionada = atividadesSelecionadasIds.has(ativ.id);
                  return (
                    <div 
                      key={ativ.id} 
                      className={`bg-white p-4 rounded-xl border transition-all text-xs space-y-2.5 ${
                        isSelecionada
                          ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/15 shadow-sm'
                          : 'border-slate-200 shadow-2xs hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleSelecionarAtividade(ativ.id)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer shrink-0"
                            title={isSelecionada ? 'Desmarcar atividade' : 'Selecionar atividade para exportação contínua'}
                          >
                            {isSelecionada ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                          <div>
                            <p className="font-extrabold text-sm text-slate-900 leading-snug">{ativ.conteudo}</p>
                            <p className="text-slate-500 text-xs mt-0.5">
                              Aluno: <strong>{ativ.estudanteNome}</strong> • Sala: {ativ.turma} • {ativ.disciplina}
                            </p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${
                          ativ.status === 'Revisada'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ativ.status}
                        </span>
                      </div>

                      {/* Badge de Alinhamento ao PEI */}
                      <div className="flex items-center gap-2 flex-wrap pl-6.5">
                        {ativ.alinhadaAoPei ? (
                          <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                            <span>✓ Alinhada ao PEI</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-slate-100 text-slate-500 border border-slate-200">
                            Pendente PEI
                          </span>
                        )}

                        {ativ.peiAlinhadoPor && (
                          <span className="text-[10px] text-slate-400">
                            Validação: {ativ.peiAlinhadoPor}
                          </span>
                        )}
                      </div>

                      {ativ.peiAlinhamentoDetalhes && ativ.alinhadaAoPei && (
                        <p className="text-[11px] text-emerald-900/80 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 ml-6.5">
                          <strong>Meta PEI:</strong> {ativ.peiAlinhamentoDetalhes}
                        </p>
                      )}

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 pl-6.5">
                        <span className="text-[11px] text-slate-400">
                          {ativ.questoes?.length || 3} questões adaptadas
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSelecionarAtividade(ativ.id)}
                            className={`text-[11px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                              isSelecionada 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isSelecionada ? '✓ Selecionada' : '+ Selecionar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onVisualizarAtividadeA4(ativ)}
                            className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>Visualizar Folha A4 →</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </div>
    )}

      {/* ========================================================================= */}
      {/* 9. HISTÓRICO & AUDITORIA */}
      {abaAtiva === 'historico' && (
        <div className="space-y-6">
          {/* Gráfico de Barras Recharts: Evolução Mensal do Volume de Atividades Adaptadas e Registros Diários do Apoio ao Longo do Bimestre */}
          <GraficoHistoricoBimestre
            atividades={atividades}
            registrosApoio={registrosApoio}
            estudantes={estudantes}
            anoLetivo="2026"
          />

          <PainelAuditoriaAvancada
            auditoria={auditoria}
            historico={historico}
            escolaConfig={escolaConfig}
            currentUserName={currentUserName}
            onOpenRelatorioFormalModal={() => setModalAuditoriaAberto(true)}
            onExecutarTestesLgpd={() => {
              const testesAuth = runAllSecurityTests();
              const testesEstudantes = runAllStudentSecurityTests();
              setTestesSegurancaResultados([
                ...testesEstudantes.map(t => ({ ...t, suite: 'Importação & Estudantes (LGPD)' })),
                ...testesAuth.map(t => ({ ...t, suite: 'Autenticação & Professores' })),
              ]);
            }}
          />

          {/* PAINEL DE TESTES EXECUTADOS */}
          {testesSegurancaResultados && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    Resultado dos Testes de Segurança & Privacidade ({testesSegurancaResultados.length} verificações)
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {testesSegurancaResultados.filter(t => t.passed).length} / {testesSegurancaResultados.length} Aprovados
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {testesSegurancaResultados.map((teste, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 ${
                      teste.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">{teste.suite}</span>
                      <strong className="text-slate-900 block">{teste.description}</strong>
                      <span className="text-[11px] text-slate-600 block mt-0.5">{teste.details}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                      teste.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {teste.passed ? 'APROVADO' : 'FALHA'}
                    </span>
                  </div>
                ))}
              </div>

              {/* LISTA DE TESTES DO FIREBASE PENDENTES */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    Testes do Firebase Preparados (Aguardando Configuração Real)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {TESTES_FIREBASE_PENDENTES.length} Pendentes
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {TESTES_FIREBASE_PENDENTES.map(tf => (
                    <div key={tf.id} className="p-2 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-slate-800 block text-[11px]">{tf.descricao}</strong>
                        <span className="text-[10px] text-slate-500 block">{tf.motivo}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap">
                        PENDENTE
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. CONFIGURAÇÕES & AUTENTICAÇÃO */}
      {abaAtiva === 'configuracoes' && (
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-xs">
          
          <h2 className="text-base font-extrabold text-slate-900 pb-2 border-b">
            Configurações Institucionais & Autenticação
          </h2>

          {configSalvaMsg && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl font-bold text-emerald-900">
              Configurações salvas localmente com sucesso!
            </div>
          )}

          {/* Seção de Autenticação Exigida na Seção 3 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-700" />
              <h3 className="font-extrabold text-sm text-slate-900">Opções de Autenticação</h3>
            </div>
            
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formEscola.permitirAcessoEmailSenha}
                onChange={(e) => setFormEscola({ ...formEscola, permitirAcessoEmailSenha: e.target.checked })}
                className="h-4 w-4 rounded text-emerald-600"
              />
              <span className="font-bold text-slate-800">
                Permitir acesso por e-mail e senha (opção administrativa)
              </span>
            </label>
            <p className="text-[11px] text-slate-500">
              Valor padrão: false (mostra apenas &ldquo;Entrar com Google&rdquo;). Quando ativo, permite redefinição segura de senha com no mínimo 10 caracteres.
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            onUpdateEscolaConfig(formEscola);
            setConfigSalvaMsg(true);
            setTimeout(() => setConfigSalvaMsg(false), 2500);
          }} className="space-y-4">
            
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nome da Escola:</label>
              <input
                type="text"
                value={formEscola.nome}
                onChange={(e) => setFormEscola({ ...formEscola, nome: e.target.value })}
                placeholder="Ex: Colégio Estadual Olynto Pereira de Castro"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Subtítulo:</label>
              <input
                type="text"
                value={formEscola.subtitulo}
                onChange={(e) => setFormEscola({ ...formEscola, subtitulo: e.target.value })}
                placeholder="Secretaria de Estado da Educação - SEDUC Goiás"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </form>

          {/* Seção de Backup Automático e Programado no Google Drive ('Backups_AdaptaEdu') */}
          <div data-testid="secao-configuracoes-backup" className="p-5 bg-white border border-emerald-200/80 rounded-2xl shadow-xs space-y-5">
            {/* Cabeçalho da Seção */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900">
                      Configurações de Backup
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                      Google Drive (Backups_AdaptaEdu)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Salvaguarda contínua e programada de todos os dados do IndexedDB e da rotina escolar
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isGoogleDriveConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Google Drive Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Drive Desconectado
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O sistema realiza o backup automático e criptografado dos dados sincronizados do <strong className="text-slate-800">IndexedDB e Armazenamento Local</strong> (<strong className="text-slate-800">estudantes</strong>, <strong className="text-slate-800">atividades adaptadas</strong>, <strong className="text-slate-800">diários de bordo do apoio</strong>, <strong className="text-slate-800">PEIs</strong>, <strong className="text-slate-800">matrizes curriculares</strong> e <strong className="text-slate-800">trilhas de auditoria</strong>) para a pasta dedicada <strong className="text-emerald-800">Backups_AdaptaEdu</strong> no Google Drive da instituição.
            </p>

            {/* Formulário de Preferências de Backup no Firestore */}
            <form onSubmit={handleSalvarPreferenciasFirestore} className="space-y-4">
              {/* Grade de Configurações: Frequência + Horários Específicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Seletor de Frequência e Ativação Geral */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-emerald-700" />
                    <label className="text-xs font-bold text-slate-800">Rotina de Backup Automático</label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer" title="Ativar ou pausar rotina de backup">
                    <input
                      type="checkbox"
                      checked={configBackup.enabled}
                      onChange={(e) => {
                        const updated = salvarConfiguracaoBackup({ enabled: e.target.checked });
                        setConfigBackup(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Seletor de Frequência: Diário vs Semanal */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="seletor-frequencia-backup" className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Frequência do Backup:</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">Diário ou Semanal</span>
                  </div>

                  {/* Seletor Dropdown para acessibilidade e testes */}
                  <select
                    id="seletor-frequencia-backup"
                    name="frequenciaBackup"
                    data-testid="select-frequencia-backup"
                    value={configBackup.frequencyType || 'diario'}
                    disabled={!configBackup.enabled}
                    onChange={(e) => handleAlterarFrequencia(e.target.value as 'diario' | 'semanal')}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <option value="diario">Diário (Todos os dias)</option>
                    <option value="semanal">Semanal (Dias específicos da semana)</option>
                  </select>

                  {/* Botões visuais de alternância */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!configBackup.enabled}
                      onClick={() => handleAlterarFrequencia('diario')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        (configBackup.frequencyType || 'diario') === 'diario'
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                      } disabled:opacity-50`}
                    >
                      <span>Diário</span>
                      <span className="text-[10px] opacity-80 font-normal hidden sm:inline">(Todos os dias)</span>
                    </button>

                    <button
                      type="button"
                      disabled={!configBackup.enabled}
                      onClick={() => handleAlterarFrequencia('semanal')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        configBackup.frequencyType === 'semanal'
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                      } disabled:opacity-50`}
                    >
                      <span>Semanal</span>
                      <span className="text-[10px] opacity-80 font-normal hidden sm:inline">(Dias fixos)</span>
                    </button>
                  </div>
                </div>

                {/* Configuração de Dias da Semana (quando frequência for Semanal) */}
                {configBackup.frequencyType === 'semanal' && (
                  <div className="p-3 bg-white border border-emerald-200/80 rounded-xl space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Dias da Semana Ativos:</span>
                      <div className="flex gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = salvarConfiguracaoBackup({ diasSemana: [1, 2, 3, 4, 5] });
                            setConfigBackup(updated);
                          }}
                          className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                        >
                          Seg-Sex
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = salvarConfiguracaoBackup({ diasSemana: [5] });
                            setConfigBackup(updated);
                          }}
                          className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                        >
                          Toda Sexta
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {[
                        { dia: 0, rotulo: 'Dom', nome: 'Domingo' },
                        { dia: 1, rotulo: 'Seg', nome: 'Segunda-feira' },
                        { dia: 2, rotulo: 'Ter', nome: 'Terça-feira' },
                        { dia: 3, rotulo: 'Qua', nome: 'Quarta-feira' },
                        { dia: 4, rotulo: 'Qui', nome: 'Quinta-feira' },
                        { dia: 5, rotulo: 'Sex', nome: 'Sexta-feira' },
                        { dia: 6, rotulo: 'Sáb', nome: 'Sábado' },
                      ].map((item) => {
                        const ativo = (configBackup.diasSemana || [1, 2, 3, 4, 5]).includes(item.dia);
                        return (
                          <button
                            key={item.dia}
                            type="button"
                            disabled={!configBackup.enabled}
                            onClick={() => handleAlternarDiaSemana(item.dia)}
                            title={item.nome}
                            className={`py-1.5 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer ${
                              ativo
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {item.rotulo}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Intervalo de Verificação Periódica */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Verificação periódica entre horários:
                  </label>
                  <select
                    value={configBackup.intervalMinutes}
                    disabled={!configBackup.enabled}
                    onChange={(e) => {
                      const updated = salvarConfiguracaoBackup({ intervalMinutes: Number(e.target.value) });
                      setConfigBackup(updated);
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                  >
                    <option value={15}>A cada 15 minutos (Alta frequência)</option>
                    <option value={30}>A cada 30 minutos (Padrão recomendado)</option>
                    <option value={60}>A cada 1 hora (60 minutos)</option>
                    <option value={120}>A cada 2 horas</option>
                    <option value={240}>A cada 4 horas</option>
                    <option value={720}>A cada 12 horas</option>
                    <option value={1440}>A cada 24 horas</option>
                  </select>
                </div>

                <p className="text-[11px] text-slate-500 leading-snug">
                  {configBackup.enabled 
                    ? `Frequência ${configBackup.frequencyType === 'semanal' ? 'semanal' : 'diária'} ativa. O sistema monitora o IndexedDB e sincroniza para a pasta Backups_AdaptaEdu.`
                    : 'O backup automático está pausado. Backups manuais ainda podem ser acionados.'}
                </p>
              </div>

              {/* Card 2: Horários Específicos Agendados (Rotina da Escola) */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-700" />
                  <label className="text-xs font-bold text-slate-800">
                    Horários Fixos Programados (Previsibilidade Escolar)
                  </label>
                </div>

                <p className="text-[11px] text-slate-500">
                  Defina horários estratégicos (ex: 22h para fechamento noturno) para execução pontual do backup no Drive:
                </p>

                {/* Chips de horários cadastrados */}
                <div className="min-h-[42px] p-2 bg-white border border-slate-200 rounded-lg flex flex-wrap gap-1.5 items-center">
                  {(!configBackup.specificTimes || configBackup.specificTimes.length === 0) ? (
                    <span className="text-[11px] text-slate-400 italic">
                      Nenhum horário fixo agendado. Escolha uma sugestão ou adicione abaixo.
                    </span>
                  ) : (
                    configBackup.specificTimes.map((horario, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-md text-xs font-bold shadow-2xs"
                      >
                        <Clock className="h-3 w-3 text-emerald-700" />
                        <span>{horario}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoverHorario(horario)}
                          className="ml-0.5 text-emerald-600 hover:text-red-600 rounded-sm p-0.5 transition-colors cursor-pointer"
                          title={`Remover horário ${horario}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Sugestões Rápidas de Turnos */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Sugestões de Turnos Escolares:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { hora: '08:00', label: '08:00 (Início Turno)' },
                      { hora: '12:00', label: '12:00 (Almoço)' },
                      { hora: '17:30', label: '17:30 (Fim Vespertino)' },
                      { hora: '18:00', label: '18:00 (Encerramento)' },
                      { hora: '22:00', label: '22:00 (Fechamento 22h)' },
                      { hora: '23:30', label: '23:30 (Noturno)' },
                    ].map((item) => {
                      const ativo = (configBackup.specificTimes || []).includes(item.hora);
                      return (
                        <button
                          key={item.hora}
                          type="button"
                          onClick={() => handleAlternarHorarioPredefinido(item.hora)}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                            ativo
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          {ativo ? `✓ ${item.hora}` : `+ ${item.label}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Formulário de Adicionar Horário Customizado (input time) */}
                <div className="pt-1 space-y-1.5">
                  <label htmlFor="input-horario-backup" className="block text-[11px] font-bold text-slate-700">
                    Horário do Backup Automático (ex: 22h / 22:00):
                  </label>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <input
                      id="input-horario-backup"
                      name="horarioBackup"
                      data-testid="input-horario-backup"
                      type="time"
                      value={novoHorario}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNovoHorario(val);
                        if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(val)) {
                          const atuais = configBackup.specificTimes || [];
                          if (!atuais.includes(val)) {
                            const novos = [...atuais, val].sort();
                            const updated = salvarConfiguracaoBackup({ specificTimes: novos });
                            setConfigBackup(updated);
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAdicionarHorarioPersonalizado();
                        }
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs cursor-pointer"
                      title="Seletor de horário (input time) para backup automático"
                    />
                    <button
                      type="button"
                      onClick={handleAdicionarHorarioPersonalizado}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Agendar Horário</span>
                    </button>
                    {(!configBackup.specificTimes || !configBackup.specificTimes.includes('22:00')) && (
                      <button
                        type="button"
                        onClick={() => {
                          setNovoHorario('22:00');
                          const atuais = configBackup.specificTimes || [];
                          if (!atuais.includes('22:00')) {
                            const novos = [...atuais, '22:00'].sort();
                            const updated = salvarConfiguracaoBackup({ specificTimes: novos });
                            setConfigBackup(updated);
                            setFeedbackBackupManual({ tipo: 'sucesso', texto: 'Horário de fechamento das 22h agendado.' });
                            setTimeout(() => setFeedbackBackupManual(null), 3000);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        title="Agendar diretamente às 22h"
                      >
                        + Definir 22h
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de Ações do Formulário: Testar Conexão + Salvar no Firestore */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-200/70">
              <div className="flex items-center gap-2">
                {/* Botão Testar Conexão Google Drive que valida as credenciais */}
                <button
                  type="button"
                  id="btn-testar-conexao-google-drive"
                  data-testid="btn-testar-conexao-google-drive"
                  onClick={handleTestarConexaoDrive}
                  disabled={isTestandoConexaoDrive}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-300 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-2xs disabled:opacity-50"
                  title="Testar comunicação e validar credenciais do Google Drive"
                >
                  {isTestandoConexaoDrive ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                      <span>Validando Credenciais...</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 text-emerald-700" />
                      <span>Testar Conexão Google Drive</span>
                    </>
                  )}
                </button>
              </div>

              {/* Botão de envio para salvar preferências no Firestore */}
              <button
                type="submit"
                disabled={salvandoFirestore}
                data-testid="btn-salvar-preferencias-firestore"
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 transition-colors cursor-pointer text-xs shadow-2xs disabled:opacity-50"
                title="Salvar horário e frequência no documento da escola no Firestore"
              >
                {salvandoFirestore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Gravando no Firestore...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Salvar Preferências no Firestore</span>
                  </>
                )}
              </button>
            </div>

            {/* Feedback de Persistência no Firestore */}
            {statusSalvarFirestore && (
              <div
                role="status"
                aria-live="polite"
                data-testid="feedback-salvar-firestore"
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                  statusSalvarFirestore.tipo === 'sucesso'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {statusSalvarFirestore.tipo === 'sucesso' ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                )}
                <span>{statusSalvarFirestore.texto}</span>
              </div>
            )}
          </form>

            {/* Painel de Diagnóstico do Teste de Conexão com o Drive */}
            {resultadoTesteDrive && (
              <div
                role="status"
                aria-live="polite"
                data-testid="status-conexao-drive"
                className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
                  resultadoTesteDrive.success
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/90 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {resultadoTesteDrive.success ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    )}
                    <span className="font-extrabold text-sm">
                      {resultadoTesteDrive.success
                        ? 'Google Drive Conectado e Operacional'
                        : 'Atenção com a Conexão ao Google Drive'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono opacity-70">
                    {resultadoTesteDrive.latenciaMs !== undefined && `${resultadoTesteDrive.latenciaMs} ms`}
                  </span>
                </div>

                <p className="leading-relaxed">{resultadoTesteDrive.mensagem}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="font-semibold block text-slate-600">Conta Google:</span>
                    <span className="font-medium text-slate-900 truncate block">
                      {resultadoTesteDrive.email || (isGoogleDriveConnected ? 'Autenticada' : 'Não identificada')}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-600">Pasta de Destino:</span>
                    <span className="font-medium text-slate-900 block font-mono">
                      {resultadoTesteDrive.pastaBackupNome || 'Backups_AdaptaEdu'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-600">Espaço em Nuvem:</span>
                    <span className="font-medium text-slate-900 block">
                      {resultadoTesteDrive.espacoEmUso ? `${resultadoTesteDrive.espacoEmUso} em uso` : 'Cota institucional'}
                    </span>
                  </div>
                </div>

                {!resultadoTesteDrive.success && onOpenGoogleDrive && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onOpenGoogleDrive}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Conectar Google Drive Agora
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Feedback de Ação */}
            {feedbackBackupManual && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                  feedbackBackupManual.tipo === 'sucesso'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : feedbackBackupManual.tipo === 'erro'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                {feedbackBackupManual.tipo === 'sucesso' && <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />}
                {feedbackBackupManual.tipo === 'erro' && <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />}
                {feedbackBackupManual.tipo === 'info' && <Clock className="h-4 w-4 shrink-0 text-blue-600" />}
                <span>{feedbackBackupManual.texto}</span>
              </div>
            )}

            {/* Diagnóstico do Último Backup e Barra de Ações */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-700">Último Backup:</span>
                  {configBackup.lastBackupTimestamp ? (
                    <span className="text-slate-800 font-medium">
                      {new Date(configBackup.lastBackupTimestamp).toLocaleString('pt-BR')}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Nenhum backup registrado nesta máquina</span>
                  )}
                  {configBackup.lastBackupStatus === 'sucesso' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                      Sucesso
                    </span>
                  )}
                  {configBackup.lastBackupStatus === 'erro' && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-semibold text-[10px]">
                      Erro ({configBackup.lastBackupError || 'Falha'})
                    </span>
                  )}
                  {configBackup.lastBackupStatus === 'em_andamento' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px] animate-pulse">
                      Em andamento...
                    </span>
                  )}
                </div>

                {configBackup.lastBackupFileName && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    Arquivo: {configBackup.lastBackupFileName}
                  </div>
                )}
              </div>

              {/* Botões de Ação: Testar Conexão + Backup Agora + Gerenciar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Botão de Teste de Conexão com o Google Drive */}
                <button
                  type="button"
                  data-testid="btn-testar-conexao-drive"
                  onClick={handleTestarConexaoDrive}
                  disabled={isTestandoConexaoDrive}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-300 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-2xs disabled:opacity-50"
                  title="Testar comunicação, credenciais e permissões com o Google Drive"
                >
                  {isTestandoConexaoDrive ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                      <span>Validando Conexão...</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 text-emerald-700" />
                      <span>Testar Conexão Google Drive</span>
                    </>
                  )}
                </button>

                {/* Botão de Backup Imediato */}
                <button
                  type="button"
                  onClick={handleExecutarBackupAgora}
                  disabled={isExecutandoBackupManual || !isGoogleDriveConnected}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 transition-colors cursor-pointer text-xs shadow-2xs"
                  title="Executar salvaguarda imediata para o Google Drive"
                >
                  {isExecutandoBackupManual ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sincronizando com Drive...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      <span>Fazer Backup Agora</span>
                    </>
                  )}
                </button>

                {onOpenGoogleDrive && (
                  <button
                    type="button"
                    onClick={onOpenGoogleDrive}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold flex items-center gap-2 transition-colors cursor-pointer text-xs shadow-2xs"
                  >
                    <Folder className="h-4 w-4 text-emerald-700" />
                    <span>Gerenciar Backups e Pastas</span>
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REVISAR IMPORTAÇÃO DE USUÁRIOS (PDF) */}
      {/* ========================================================================= */}
      {modalImportarUsuariosAberto && (
        <RevisaoImportacaoUsuariosModal
          registros={registrosParaRevisao}
          onFechar={() => setModalImportarUsuariosAberto(false)}
          onSalvarImportados={(novos) => {
            onUpdateUsuariosAutorizados([...novos, ...usuariosAutorizados]);
            setModalImportarUsuariosAberto(false);
          }}
          currentUserRoles={currentUserRoles}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: + CADASTRAR PROFESSOR (COM AS REGRAS E CONFIRMAÇÕES DA SEÇÃO 11) */}
      {/* ========================================================================= */}
      {modalNovoProfessorAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-extrabold text-base text-slate-900">Cadastrar Professor / Usuário</h3>
              <button onClick={() => setModalNovoProfessorAberto(false)}><X className="h-5 w-5" /></button>
            </div>

            {msgSucessoProfessor && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl font-bold text-emerald-900">
                {msgSucessoProfessor}
              </div>
            )}

            <form onSubmit={salvarNovoProfessor} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *:</label>
                <input
                  type="text"
                  required
                  value={novoProfNome}
                  onChange={(e) => setNovoProfNome(e.target.value)}
                  placeholder="Nome completo do docente"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail Educacional * (domínios @educa.go.gov.br ou @admin.educa.go.gov.br):</label>
                <input
                  type="email"
                  required
                  value={novoProfEmail}
                  onChange={(e) => setNovoProfEmail(e.target.value.toLowerCase().trim())}
                  placeholder="usuario@educa.go.gov.br"
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>

              <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block">Perfis do Sistema:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={novoProfRoles.includes('teacher')}
                      disabled // Professor marcado por padrão
                    />
                    <span>Professor</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={novoProfRoles.includes('coordinator')}
                      onChange={(e) => handleToggleCoordenacaoNoForm(e.target.checked)}
                    />
                    <span className="text-indigo-900">Coordenação</span>
                  </label>
                </div>
              </div>

              {/* Confirmação ao conceder Coordenação exigida na Seção 11 */}
              {confirmarPerfilCoordenacao && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <p className="font-bold text-amber-950">
                    Este perfil permite administrar usuários, estudantes, matrizes curriculares, documentos e configurações institucionais. Confirma a atribuição do perfil de Coordenação?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmarPerfilCoordenacao(false);
                      }}
                      className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!novoProfRoles.includes('coordinator')) {
                          setNovoProfRoles([...novoProfRoles, 'coordinator']);
                        }
                        setConfirmarPerfilCoordenacao(false);
                      }}
                      className="px-3 py-1 bg-indigo-700 text-white rounded text-xs font-bold"
                    >
                      Confirmar perfil
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Turmas Permitidas:</label>
                  <input
                    type="text"
                    value={novoProfTurmas}
                    onChange={(e) => setNovoProfTurmas(e.target.value)}
                    placeholder="Ex: 6º A, 7º B"
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Disciplinas Permitidas:</label>
                  <input
                    type="text"
                    value={novoProfDisciplinas}
                    onChange={(e) => setNovoProfDisciplinas(e.target.value)}
                    placeholder="Ex: Ciências, Biologia"
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoProfessorAberto(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 text-white rounded-xl font-bold hover:bg-sky-800"
                >
                  Salvar usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR USUÁRIO */}
      {usuarioEmEdicao && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-900">Editar Usuário Autorizado</h3>
              <button onClick={() => setUsuarioEmEdicao(null)}><X className="h-5 w-5" /></button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nome Completo:</label>
              <input
                type="text"
                value={usuarioEmEdicao.name}
                onChange={(e) => setUsuarioEmEdicao({ ...usuarioEmEdicao, name: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">E-mail Educacional:</label>
              <input
                type="email"
                value={usuarioEmEdicao.email}
                onChange={(e) => setUsuarioEmEdicao({ 
                  ...usuarioEmEdicao, 
                  email: e.target.value.toLowerCase().trim(),
                  emailNormalized: e.target.value.toLowerCase().trim()
                })}
                className="w-full px-3 py-1.5 border rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Perfis:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={usuarioEmEdicao.roles.includes('teacher')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUsuarioEmEdicao({ ...usuarioEmEdicao, roles: [...usuarioEmEdicao.roles, 'teacher'] });
                      } else {
                        setUsuarioEmEdicao({ ...usuarioEmEdicao, roles: usuarioEmEdicao.roles.filter(r => r !== 'teacher') });
                      }
                    }}
                  />
                  <span>Professor</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={usuarioEmEdicao.roles.includes('coordinator')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUsuarioEmEdicao({ ...usuarioEmEdicao, roles: [...usuarioEmEdicao.roles, 'coordinator'] });
                      } else {
                        setUsuarioEmEdicao({ ...usuarioEmEdicao, roles: usuarioEmEdicao.roles.filter(r => r !== 'coordinator') });
                      }
                    }}
                  />
                  <span>Coordenação</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                onClick={() => setUsuarioEmEdicao(null)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSalvarEdicaoUsuario(usuarioEmEdicao)}
                className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg font-bold"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE DESATIVAÇÃO */}
      {confirmarDesativacao && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl text-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Confirmar Desativação</h4>
            <p className="text-slate-600">
              Tem certeza que deseja desativar o acesso de <strong>{confirmarDesativacao.name}</strong>? O usuário não conseguirá mais autenticar com sua conta educacional.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmarDesativacao(null)} className="px-3 py-1 bg-slate-100 rounded">Cancelar</button>
              <button onClick={() => handleConfirmarDesativacao(confirmarDesativacao)} className="px-3 py-1 bg-rose-700 text-white rounded font-bold">Desativar</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE DESVINCULAR UID */}
      {confirmarDesvincularUid && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl text-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Desvincular UID</h4>
            <p className="text-slate-600">
              Esta operação exigirá um novo login e uma nova vinculação da conta Google Educacional. Deseja continuar?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmarDesvincularUid(null)} className="px-3 py-1 bg-slate-100 rounded">Cancelar</button>
              <button onClick={() => handleDesvincularUid(confirmarDesvincularUid)} className="px-3 py-1 bg-indigo-700 text-white rounded font-bold">Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESTUDANTE */}
      {modalEstudanteAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-3 text-xs">
            <div className="flex justify-between border-b pb-2">
              <h3 className="font-bold text-sm">Cadastrar Estudante</h3>
              <button onClick={() => setModalEstudanteAberto(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={salvarEstudante} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Nome Completo *:</label>
                <input
                  type="text"
                  required
                  value={formEstudante.nome}
                  onChange={(e) => setFormEstudante({ ...formEstudante, nome: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Matrícula *:</label>
                  <input
                    type="text"
                    required
                    value={formEstudante.matricula}
                    onChange={(e) => setFormEstudante({ ...formEstudante, matricula: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Turma *:</label>
                  <input
                    type="text"
                    required
                    value={formEstudante.turma}
                    onChange={(e) => setFormEstudante({ ...formEstudante, turma: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Ano/Série *:</label>
                  <input
                    type="text"
                    required
                    value={formEstudante.anoSerie}
                    onChange={(e) => setFormEstudante({ ...formEstudante, anoSerie: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Turno *:</label>
                  <select
                    value={formEstudante.turno}
                    onChange={(e) => setFormEstudante({ ...formEstudante, turno: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded bg-white"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setModalEstudanteAberto(false)} className="px-3 py-1 bg-slate-100 rounded font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-1 bg-emerald-700 text-white rounded font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PERFIL PEDAGÓGICO */}
      {modalPerfilAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-3 text-xs">
            <div className="flex justify-between border-b pb-2">
              <h3 className="font-bold text-sm">Criar Perfil Pedagógico</h3>
              <button onClick={() => setModalPerfilAberto(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const est = estudantes.find(x => x.id === formPerfil.estudanteId);
              if (!est) return;
              onAddPerfilPedagogico({
                id: `perfil-${Date.now()}`,
                ...formPerfil,
                estudanteId: est.id,
                estudanteNome: est.nome,
                status: 'aprovado',
                dataCadastro: new Date().toLocaleDateString('pt-BR'),
              });
              setModalPerfilAberto(false);
            }} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Estudante *:</label>
                <select
                  required
                  value={formPerfil.estudanteId}
                  onChange={(e) => setFormPerfil({ ...formPerfil, estudanteId: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded bg-white"
                >
                  <option value="">Selecione o estudante</option>
                  {estudantes.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Estratégias Recomendadas:</label>
                <input
                  type="text"
                  value={formPerfil.estrategiasRecomendadas}
                  onChange={(e) => setFormPerfil({ ...formPerfil, estrategiasRecomendadas: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setModalPerfilAberto(false)} className="px-3 py-1 bg-slate-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-1 bg-emerald-700 text-white rounded font-bold">Salvar Perfil</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HABILIDADE MANUAL */}
      {modalHabilidadeAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-3 text-xs">
            <div className="flex justify-between border-b pb-2">
              <h3 className="font-bold text-sm">Cadastrar Habilidade Manual</h3>
              <button onClick={() => setModalHabilidadeAberto(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              onAddHabilidade({
                id: `hab-${Date.now()}`,
                ...formHabilidade,
                status: 'aprovada',
              });
              setModalHabilidadeAberto(false);
            }} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Código BNCC *:</label>
                <input
                  type="text"
                  required
                  value={formHabilidade.codigo}
                  onChange={(e) => setFormHabilidade({ ...formHabilidade, codigo: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Descrição *:</label>
                <textarea
                  rows={3}
                  required
                  value={formHabilidade.descricao}
                  onChange={(e) => setFormHabilidade({ ...formHabilidade, descricao: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setModalHabilidadeAberto(false)} className="px-3 py-1 bg-slate-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-1 bg-slate-800 text-white rounded font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO E REVISÃO DE ESTUDANTES (PDF) */}
      {modalImportarEstudantesAberto && (
        <RevisaoImportacaoEstudantesModal
          onClose={() => setModalImportarEstudantesAberto(false)}
          onImportacaoSucesso={(novosEstudantes) => {
            if (onBatchAddEstudantes) {
              onBatchAddEstudantes(novosEstudantes);
            } else {
              novosEstudantes.forEach(est => onAddEstudante(est));
            }
            onAddAuditoria({
              id: `aud-${Date.now()}`,
              dataHora: new Date().toLocaleString('pt-BR'),
              usuarioResponsavel: currentUserName || 'Coordenação',
              usuarioAlterado: `${novosEstudantes.length} Estudantes`,
              perfisAnteriores: [],
              perfisPosteriores: ['estudante'],
              situacaoAnterior: 'Não cadastrado',
              situacaoPosterior: 'Ativo',
              resultado: 'Sucesso',
              detalhes: `Importação de lista em PDF concluída. Geradas ${novosEstudantes.length} fichas individuais.`,
            });
            setModalImportarEstudantesAberto(false);
          }}
          existingStudents={estudantes}
          professoresDisponiveis={usuariosAutorizados}
          currentUserRoles={currentUserRoles}
          currentUserName={currentUserName || 'Coordenação Pedagógica'}
        />
      )}

      {/* MODAL DE FICHA INDIVIDUAL DO ESTUDANTE */}
      {estudanteFichaModal && (
        <FichaEstudanteModal
          estudante={estudanteFichaModal}
          escolaConfig={escolaConfig}
          professoresDisponiveis={usuariosAutorizados}
          perfisPedagogicos={perfisPedagogicos}
          atividades={atividades}
          registrosApoio={registrosApoio}
          currentUserRoles={currentUserRoles}
          allStudents={estudantes}
          onClose={() => setEstudanteFichaModal(null)}
          onUpdateEstudante={(atualizado) => {
            onUpdateEstudante(atualizado);
            setEstudanteFichaModal(atualizado);
          }}
          onAbrirEdicaoManual={(est) => {
            setEstudanteFichaModal(null);
            setEstudanteEmEdicao(est);
            setFormEstudante({ ...est });
            setModalEstudanteAberto(true);
          }}
          onCriarPerfilPedagogico={(estId) => {
            setEstudanteFichaModal(null);
            setFormPerfil(prev => ({ ...prev, estudanteId: estId }));
            setModalPerfilAberto(true);
          }}
          onVisualizarAtividadeA4={(ativ) => {
            onVisualizarAtividadeA4(ativ);
          }}
          onGerarRelatorioPdi={(estId) => {
            setPdiEstudanteInicialId(estId);
            setModalRelatorioPdiAberto(true);
          }}
          onCriarPei={(estId) => {
            handleDispararCriarPei(estId);
          }}
        />
      )}

      {/* MODAL DE EXPORTAÇÃO FORMAL DE AUDITORIA (CSV / PDF) */}
      <ExportarAuditoriaModal
        isOpen={modalAuditoriaAberto}
        onClose={() => setModalAuditoriaAberto(false)}
        auditoria={auditoria}
        escolaConfig={escolaConfig}
        usuarioAtualNome={currentUserName}
      />

      {/* MODAL DE EXPORTAÇÃO DO RELATÓRIO MENSAL DO PROFISSIONAL DE APOIO EM PDF */}
      {modalRelatorioApoioAberto && (
        <RelatorioMensalApoioModal
          isOpen={modalRelatorioApoioAberto}
          onClose={() => {
            setModalRelatorioAberto(false);
            setAlunoSelecionadoParaRelatorio(null);
          }}
          registros={registrosApoio}
          estudantes={estudantes}
          escolaConfig={escolaConfig}
          currentUser={currentUser || {
            id: 'coord-user',
            uid: null,
            name: currentUserName || 'Coordenação Pedagógica',
            email: 'coordenacao@educa.go.gov.br',
            emailNormalized: 'coordenacao@educa.go.gov.br',
            roles: currentUserRoles || ['coordinator'],
            active: true,
            status: 'authorized',
            schoolId: 'escola-1',
            allowedClasses: [],
            allowedDisciplines: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'system',
            source: 'admin',
            sourcePage: null,
            firstAccessAt: null,
            lastAccessAt: null,
            archivedAt: null
          }}
          alunoInicial={alunoSelecionadoParaRelatorio}
        />
      )}

      {/* MODAL DE VISUALIZAÇÃO AMPLIADA DA FOTO DO DIÁRIO DE BORDO */}
      {fotoModalDiarioBordoUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-700" />
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  {fotoModalTitulo || 'Fotografia do Diário de Bordo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFotoModalDiarioBordoUrl(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                title="Fechar visualização"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto flex items-center justify-center bg-slate-950 rounded-xl p-2">
              <img
                src={fotoModalDiarioBordoUrl}
                alt="Diário de Bordo"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Documento anexado pelo Profissional de Apoio</span>
              <button
                type="button"
                onClick={() => setFotoModalDiarioBordoUrl(null)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RELATÓRIO TRIMESTRAL DE EVOLUÇÃO DOS ESTUDANTES */}
      {modalRelatorioTrimestralAberto && (
        <RelatorioEvolucaoTrimestralModal
          isOpen={modalRelatorioTrimestralAberto}
          onClose={() => setModalRelatorioTrimestralAberto(false)}
          estudantes={estudantes}
          perfisPedagogicos={perfisPedagogicos}
          atividades={atividades}
          registrosApoio={registrosApoio}
          escolaConfig={escolaConfig}
          currentUserName={currentUserName}
        />
      )}

      {/* MODAL DE RELATÓRIO DE DESEMPENHO DO PDI (PLANO DE DESENVOLVIMENTO INDIVIDUAL) */}
      {modalRelatorioPdiAberto && (
        <RelatorioPdiModal
          isOpen={modalRelatorioPdiAberto}
          onClose={() => {
            setModalRelatorioPdiAberto(false);
            setPdiEstudanteInicialId(undefined);
          }}
          estudantes={estudantes}
          perfisPedagogicos={perfisPedagogicos}
          atividades={atividades}
          registrosApoio={registrosApoio}
          escolaConfig={escolaConfig}
          currentUserName={currentUserName}
          estudanteInicialId={pdiEstudanteInicialId}
        />
      )}

      {/* MODAL DE CRIAÇÃO DO PEI (SEDUC-GO / SIAP) */}
      {modalPeiInternoAberto && (
        <PeiGeneratorModal
          isOpen={modalPeiInternoAberto}
          onClose={() => {
            setModalPeiInternoAberto(false);
            setEstudanteIdPeiInterno(undefined);
          }}
          students={estudantes}
          staffMembers={usuariosAutorizados}
          escolaConfig={escolaConfig}
          initialStudentId={estudanteIdPeiInterno}
          onSavePei={(novoPei: PeiDocumento) => {
            onAddDocumento({
              id: `doc-pei-${novoPei.id}`,
              tipo: 'pei',
              nomeArquivo: sanitizarNomeArquivoPei(novoPei),
              formato: 'PDF',
              tamanho: '24 KB',
              dataEnvio: new Date().toLocaleDateString('pt-BR'),
              status: 'aprovado',
              camposExtraidos: [
                { campo: 'Estudante', valor: novoPei.studentName, confianca: 'identificado' },
                { campo: 'Diagnóstico', valor: novoPei.diagnosis, confianca: 'identificado' },
                { campo: 'Ano/Série', valor: `${novoPei.grade} - ${novoPei.classRoom}`, confianca: 'identificado' },
                { campo: 'Período', valor: novoPei.period, confianca: 'identificado' },
              ],
              peiDados: novoPei,
            });
            onAddAuditoria({
              id: `aud-${Date.now()}`,
              dataHora: new Date().toLocaleString('pt-BR'),
              usuarioResponsavel: currentUserName || 'Coordenação',
              usuarioAlterado: novoPei.studentName,
              perfisAnteriores: [],
              perfisPosteriores: ['estudante'],
              situacaoAnterior: 'Sem PEI',
              situacaoPosterior: 'PEI Homologado',
              resultado: 'Sucesso',
              detalhes: `PEI oficial homologado no SIAP/SEDUC-GO para ${novoPei.studentName} (${novoPei.period}).`,
            });
            setModalPeiInternoAberto(false);
          }}
        />
      )}

    </div>
  );
};
