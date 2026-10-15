import React, { useState, useMemo, useRef } from 'react';
import { 
  HeartHandshake, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Camera, 
  Image as ImageIcon, 
  Upload, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  ArrowLeft, 
  Save, 
  X, 
  AlertCircle, 
  FileText, 
  UserCheck, 
  Smile, 
  AlertTriangle, 
  Sparkles, 
  BookOpen, 
  Trash2,
  CalendarCheck,
  User,
  ShieldCheck,
  Check,
  Printer,
  Download,
  Folder,
  ExternalLink,
  Loader2,
  CalendarDays,
  LayoutGrid,
  List,
  ArrowUpDown,
  Eye,
  Wifi,
  WifiOff,
  Database,
  GraduationCap,
  FileDown
} from 'lucide-react';
import { 
  Estudante, 
  AuthorizedUser, 
  EscolaConfig, 
  RegistroAcompanhamentoApoio, 
  CurriculumMatrix, 
  RegistroAuditoria,
  AtividadeAdaptada
} from '../../types';
import { baixarRelatorioConsolidadoEstudantePdf } from '../../services/relatorioConsolidadoService';
import { obterTodosPeis } from '../../services/peiService';
import { 
  isDiaUtil, 
  getNomeDiaSemana, 
  formatarDataPtBr, 
  processarRegistroAcompanhamento, 
  associarFotoEstudante 
} from '../../server/apoioService';
import { 
  uploadImageToDrive, 
  isGoogleDriveConnected, 
  normalizarNomeSeriePasta 
} from '../../services/googleDriveService';
import { useOfflineSync } from '../../services/offlineSyncService';
import { salvarRegistroApoioIdb } from '../../services/indexedDbService';
import { CalendarioInterativo } from './CalendarioInterativo';
import { RelatorioMensalApoioModal } from './RelatorioMensalApoioModal';
import { LembretesNotificacoesApoioCard } from './LembretesNotificacoesApoioCard';

interface ProfissionalApoioViewProps {
  currentUser: AuthorizedUser;
  escolaConfig: EscolaConfig;
  estudantes: Estudante[];
  onUpdateEstudante: (atualizado: Estudante) => void;
  registrosApoio: RegistroAcompanhamentoApoio[];
  onSalvarRegistroApoio: (novo: RegistroAcompanhamentoApoio) => void;
  onAddAuditoria: (auditoria: RegistroAuditoria) => void;
  matrizesCurriculares?: CurriculumMatrix[];
  atividades?: AtividadeAdaptada[];
  onVoltarParaCoordenacao?: () => void;
  onOpenCriarPei?: (estudanteId?: string) => void;
}

export const ProfissionalApoioView: React.FC<ProfissionalApoioViewProps> = ({
  currentUser,
  escolaConfig,
  estudantes,
  onUpdateEstudante,
  registrosApoio,
  onSalvarRegistroApoio,
  onAddAuditoria,
  matrizesCurriculares = [],
  atividades = [],
  onVoltarParaCoordenacao,
  onOpenCriarPei,
}) => {
  // Hook de Sincronização Offline e Conectividade
  const { isOnline, pendingCount, sincronizarManual, isSyncing } = useOfflineSync();

  // Estado de navegação interna
  const [alunoSelecionado, setAlunoSelecionado] = useState<Estudante | null>(null);
  const [buscaEstudante, setBuscaEstudante] = useState('');
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [baixandoConsolidado, setBaixandoConsolidado] = useState<boolean>(false);
  const [notificacaoConsolidado, setNotificacaoConsolidado] = useState<string | null>(null);

  const handleBaixarRelatorioConsolidado = async (aluno: Estudante) => {
    try {
      setBaixandoConsolidado(true);
      const todosPeis = await obterTodosPeis();
      const peisAluno = todosPeis.filter(p => p.studentId === aluno.id);
      const { fileName } = baixarRelatorioConsolidadoEstudantePdf(
        aluno,
        atividades || [],
        registrosApoio,
        peisAluno,
        undefined,
        escolaConfig,
        `PAE: ${currentUser.name}`
      );
      setNotificacaoConsolidado(`Relatório Pedagógico Consolidado (${fileName}) compilado e baixado com sucesso!`);
      setTimeout(() => setNotificacaoConsolidado(null), 4000);
    } catch (err) {
      console.error('Erro ao gerar relatório consolidado:', err);
    } finally {
      setBaixandoConsolidado(false);
    }
  };

  // Modo de visualização principal: 'alunos' (cartões de alunos) ou 'calendario' (calendário e anotações cronológicas)
  const [modoVisualizacao, setModoVisualizacao] = useState<'alunos' | 'calendario'>('alunos');

  // Estados da visão de Calendário & Anotações Cronológicas
  const [dataFiltroCronologico, setDataFiltroCronologico] = useState<string>(''); // '' = todo o mês selecionado
  const [filtroEstudanteCronologico, setFiltroEstudanteCronologico] = useState<string>('todos');
  const [filtroTurmaCronologico, setFiltroTurmaCronologico] = useState<string>('todas');
  const [filtroPresencaCronologico, setFiltroPresencaCronologico] = useState<'todos' | 'presente' | 'ausente'>('todos');
  const [buscaTextoCronologico, setBuscaTextoCronologico] = useState<string>('');
  const [ordemCronologica, setOrdemCronologica] = useState<'desc' | 'asc'>('desc');
  const [fotoAmpliadaModal, setFotoAmpliadaModal] = useState<{ url: string; titulo: string; data: string } | null>(null);
  const [modalNovoRegistroRapidoData, setModalNovoRegistroRapidoData] = useState<string | null>(null);
  
  // Estado do Calendário (Ano e Mês atuais)
  const hoje = new Date();
  const hojeIso = hoje.toISOString().split('T')[0];
  const [mesAtual, setMesAtual] = useState<number>(hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState<number>(hoje.getFullYear());

  // Estado do Modal de Registro Diário
  const [modalRegistroAberto, setModalRegistroAberto] = useState(false);
  const [dataSelecionadaParaRegistro, setDataSelecionadaParaRegistro] = useState<string>(hojeIso);
  const [alunoParaRegistro, setAlunoParaRegistro] = useState<Estudante | null>(null);

  // Estado do Modal de Exportação do Relatório Mensal em PDF para a Direção
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [alunoParaRelatorio, setAlunoParaRelatorio] = useState<Estudante | null>(null);

  const handleAbrirRelatorioGeral = () => {
    setAlunoParaRelatorio(null);
    setModalRelatorioAberto(true);
  };

  const handleAbrirRelatorioAluno = (estudante: Estudante) => {
    setAlunoParaRelatorio(estudante);
    setModalRelatorioAberto(true);
  };

  // Campos do formulário
  const [presente, setPresente] = useState<boolean>(true);
  const [demonstrouIrritabilidade, setDemonstrouIrritabilidade] = useState<'Sim' | 'Não' | 'Não se aplica'>('Não');
  const [obsComportamento, setObsComportamento] = useState('');
  const [recebeuAtividadeAdaptada, setRecebeuAtividadeAdaptada] = useState<'Sim' | 'Não'>('Sim');
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<string[]>([]);
  const [conseguiuRealizar, setConseguiuRealizar] = useState<'Sim' | 'Parcialmente' | 'Não'>('Sim');
  const [obsAtividade, setObsAtividade] = useState('');
  const [infoAdicionais, setInfoAdicionais] = useState('');
  const [fotoDiarioBordo, setFotoDiarioBordo] = useState<string>('');
  const [driveStatusDiario, setDriveStatusDiario] = useState<{
    salvoNoDrive: boolean;
    folderName?: string;
    webViewLink?: string;
    isEnviando?: boolean;
  } | null>(null);

  // Mensagens e feedbacks
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [isSalvando, setIsSalvando] = useState(false);

  // Upload de foto do aluno
  const fileInputFotoAlunoRef = useRef<HTMLInputElement>(null);
  const [estudanteIdParaFoto, setEstudanteIdParaFoto] = useState<string | null>(null);

  // Upload do diário de bordo
  const fileInputDiarioRef = useRef<HTMLInputElement>(null);

  // Lista de disciplinas extraídas da Matriz Curricular (com fallback padrão)
  const disciplinasDisponiveis = useMemo(() => {
    const fromMatrix = matrizesCurriculares.map(m => m.subject).filter(Boolean);
    const defaults = [
      'Língua Portuguesa',
      'Matemática',
      'Ciências',
      'História',
      'Geografia',
      'Arte',
      'Educação Física',
      'Língua Inglesa',
      'Ensino Religioso'
    ];
    return Array.from(new Set([...fromMatrix, ...defaults]));
  }, [matrizesCurriculares]);

  // Lista de turmas únicas para filtro
  const turmasDisponiveis = useMemo(() => {
    return Array.from(new Set(estudantes.map(e => e.turma))).sort();
  }, [estudantes]);

  // Filtragem dos estudantes
  const estudantesFiltrados = useMemo(() => {
    return estudantes.filter(e => {
      if (filtroTurma !== 'todas' && e.turma !== filtroTurma) return false;
      if (buscaEstudante.trim()) {
        const termo = buscaEstudante.toLowerCase();
        return (
          e.nome.toLowerCase().includes(termo) ||
          e.matricula.toLowerCase().includes(termo) ||
          e.turma.toLowerCase().includes(termo)
        );
      }
      return true;
    });
  }, [estudantes, filtroTurma, buscaEstudante]);

  // Indicador de registros de hoje
  const registrosHojeMap = useMemo(() => {
    const map = new Map<string, RegistroAcompanhamentoApoio>();
    registrosApoio
      .filter(r => r.data === hojeIso)
      .forEach(r => map.set(r.studentId, r));
    return map;
  }, [registrosApoio, hojeIso]);

  const totalHojeRealizados = registrosHojeMap.size;
  const totalHojePendentes = Math.max(0, estudantes.length - totalHojeRealizados);

  // Geração dos dias do mês para o Calendário
  const diasDoMes = useMemo(() => {
    const primeiroDiaMes = new Date(anoAtual, mesAtual, 1);
    const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0);
    const totalDias = ultimoDiaMes.getDate();
    const diaSemanaInicio = primeiroDiaMes.getDay(); // 0 = Domingo, 1 = Segunda...

    const dias: Array<{
      dia: number;
      dataIso: string;
      diaSemana: number;
      isUtil: boolean;
      isHoje: boolean;
      registro?: RegistroAcompanhamentoApoio;
      registros: RegistroAcompanhamentoApoio[];
      totalRegistros: number;
      totalPresentes: number;
      totalAusentes: number;
      totalComAnotacao: number;
      totalComFotoDiario: number;
    }> = [];

    // Dias do mês
    for (let d = 1; d <= totalDias; d++) {
      const mesStr = String(mesAtual + 1).padStart(2, '0');
      const diaStr = String(d).padStart(2, '0');
      const dataIso = `${anoAtual}-${mesStr}-${diaStr}`;
      const dataObj = new Date(anoAtual, mesAtual, d);
      const diaSemana = dataObj.getDay();
      const util = diaSemana >= 1 && diaSemana <= 5;
      const isHoje = dataIso === hojeIso;

      // Todos os registros deste dia
      const registrosDoDia = registrosApoio.filter(r => r.data === dataIso);

      // Localiza registro do aluno selecionado para esta data
      let reg: RegistroAcompanhamentoApoio | undefined;
      if (alunoSelecionado) {
        reg = registrosDoDia.find(r => r.studentId === alunoSelecionado.id);
      }

      const totalPresentes = registrosDoDia.filter(r => r.presente).length;
      const totalAusentes = registrosDoDia.filter(r => !r.presente).length;
      const totalComAnotacao = registrosDoDia.filter(r => 
        Boolean(r.observacaoComportamental || r.observacaoAtividade || r.informacoesAdicionais)
      ).length;
      const totalComFotoDiario = registrosDoDia.filter(r => Boolean(r.fotoDiarioBordoUrl)).length;

      dias.push({
        dia: d,
        dataIso,
        diaSemana,
        isUtil: util,
        isHoje,
        registro: reg,
        registros: registrosDoDia,
        totalRegistros: registrosDoDia.length,
        totalPresentes,
        totalAusentes,
        totalComAnotacao,
        totalComFotoDiario,
      });
    }

    return {
      offsetInicio: diaSemanaInicio,
      dias,
      totalDias,
    };
  }, [anoAtual, mesAtual, alunoSelecionado, registrosApoio, hojeIso]);

  // Registros do mês atual selecionado
  const registrosDoMes = useMemo(() => {
    const mesStr = String(mesAtual + 1).padStart(2, '0');
    const prefixo = `${anoAtual}-${mesStr}`;
    return registrosApoio.filter(r => r.data && r.data.startsWith(prefixo));
  }, [registrosApoio, anoAtual, mesAtual]);

  // Lista cronológica filtrada de registros para a visualização de calendário
  const registrosCronologicosFiltrados = useMemo(() => {
    const mesStr = String(mesAtual + 1).padStart(2, '0');
    const prefixoMes = `${anoAtual}-${mesStr}`;

    return registrosApoio.filter(r => {
      // 1. Filtro por data específica ou por mês
      if (dataFiltroCronologico) {
        if (r.data !== dataFiltroCronologico) return false;
      } else {
        if (!r.data || !r.data.startsWith(prefixoMes)) return false;
      }

      // 2. Filtro por estudante
      if (filtroEstudanteCronologico !== 'todos' && r.studentId !== filtroEstudanteCronologico) {
        return false;
      }

      // 3. Filtro por turma
      if (filtroTurmaCronologico !== 'todas') {
        const est = estudantes.find(e => e.id === r.studentId);
        const turmaAluno = est?.turma || r.turma;
        if (turmaAluno !== filtroTurmaCronologico) return false;
      }

      // 4. Filtro por presença
      if (filtroPresencaCronologico === 'presente' && !r.presente) return false;
      if (filtroPresencaCronologico === 'ausente' && r.presente) return false;

      // 5. Filtro textual nas anotações
      if (buscaTextoCronologico.trim()) {
        const termo = buscaTextoCronologico.toLowerCase();
        const est = estudantes.find(e => e.id === r.studentId);
        const matchNome = (est?.nome || r.nomeEstudante || '').toLowerCase().includes(termo);
        const matchMat = (est?.matricula || '').toLowerCase().includes(termo);
        const matchTurma = (r.turma || '').toLowerCase().includes(termo);
        const matchComp = (r.observacaoComportamental || '').toLowerCase().includes(termo);
        const matchAtiv = (r.observacaoAtividade || '').toLowerCase().includes(termo);
        const matchInfo = (r.informacoesAdicionais || '').toLowerCase().includes(termo);
        const matchDisc = (r.disciplinasEnvolvidas || []).some(d => d.toLowerCase().includes(termo));
        
        if (!matchNome && !matchMat && !matchTurma && !matchComp && !matchAtiv && !matchInfo && !matchDisc) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Ordenação cronológica por data e horário
      const cmp = ordemCronologica === 'desc'
        ? b.data.localeCompare(a.data)
        : a.data.localeCompare(b.data);
      if (cmp !== 0) return cmp;
      return (b.horario || '').localeCompare(a.horario || '');
    });
  }, [
    registrosApoio,
    dataFiltroCronologico,
    anoAtual,
    mesAtual,
    filtroEstudanteCronologico,
    filtroTurmaCronologico,
    filtroPresencaCronologico,
    buscaTextoCronologico,
    ordemCronologica,
    estudantes
  ]);

  // Agrupamento cronológico por data para exibição organizada
  const registrosAgrupadosPorData = useMemo(() => {
    const mapa = new Map<string, RegistroAcompanhamentoApoio[]>();
    registrosCronologicosFiltrados.forEach(r => {
      const lista = mapa.get(r.data) || [];
      lista.push(r);
      mapa.set(r.data, lista);
    });

    return Array.from(mapa.entries()).map(([dataIso, itens]) => ({
      dataIso,
      diaSemana: getNomeDiaSemana(dataIso),
      dataFormatada: formatarDataPtBr(dataIso),
      itens,
    }));
  }, [registrosCronologicosFiltrados]);

  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handleMesAnterior = () => {
    if (mesAtual === 0) {
      setMesAtual(11);
      setAnoAtual(prev => prev - 1);
    } else {
      setMesAtual(prev => prev - 1);
    }
  };

  const handleMesSeguinte = () => {
    if (mesAtual === 11) {
      setMesAtual(0);
      setAnoAtual(prev => prev + 1);
    } else {
      setMesAtual(prev => prev + 1);
    }
  };

  // Abertura do formulário ao clicar em um dia útil
  const handleAbrirRegistroData = (dataIso: string, aluno?: Estudante) => {
    if (!isDiaUtil(dataIso)) return;

    const est = aluno || alunoSelecionado;
    if (!est) return;

    setDataSelecionadaParaRegistro(dataIso);
    setAlunoParaRegistro(est);
    setMensagemErro(null);

    // Carrega registro existente se houver
    const regExistente = registrosApoio.find(r => r.studentId === est.id && r.data === dataIso);
    if (regExistente) {
      setPresente(regExistente.presente);
      setDemonstrouIrritabilidade(regExistente.demonstrouIrritabilidadeOuSinais || 'Não');
      setObsComportamento(regExistente.observacaoComportamental || '');
      setRecebeuAtividadeAdaptada(regExistente.recebeuAtividadeAdaptada || 'Sim');
      setDisciplinasSelecionadas(regExistente.disciplinasEnvolvidas || []);
      setConseguiuRealizar(regExistente.conseguiuRealizarAtividade || 'Sim');
      setObsAtividade(regExistente.observacaoAtividade || '');
      setInfoAdicionais(regExistente.informacoesAdicionais || '');
      setFotoDiarioBordo(regExistente.fotoDiarioBordoUrl || '');
    } else {
      // Padrão inicial limpo
      setPresente(true);
      setDemonstrouIrritabilidade('Não');
      setObsComportamento('');
      setRecebeuAtividadeAdaptada('Sim');
      setDisciplinasSelecionadas([]);
      setConseguiuRealizar('Sim');
      setObsAtividade('');
      setInfoAdicionais('');
      setFotoDiarioBordo('');
    }

    setModalRegistroAberto(true);
  };

  // Submissão do registro
  const handleSalvarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoParaRegistro) return;

    setIsSalvando(true);
    setMensagemErro(null);

    const regExistente = registrosApoio.find(
      r => r.studentId === alunoParaRegistro.id && r.data === dataSelecionadaParaRegistro
    );

    const res = processarRegistroAcompanhamento({
      registroExistenteId: regExistente?.id,
      studentId: alunoParaRegistro.id,
      nomeEstudante: alunoParaRegistro.nome,
      turma: alunoParaRegistro.turma,
      data: dataSelecionadaParaRegistro,
      presente,
      demonstrouIrritabilidadeOuSinais: presente ? demonstrouIrritabilidade : undefined,
      observacaoComportamental: presente && demonstrouIrritabilidade === 'Sim' ? obsComportamento : undefined,
      recebeuAtividadeAdaptada: presente ? recebeuAtividadeAdaptada : undefined,
      disciplinasEnvolvidas: presente && recebeuAtividadeAdaptada === 'Sim' ? disciplinasSelecionadas : undefined,
      conseguiuRealizarAtividade: presente && recebeuAtividadeAdaptada === 'Sim' ? conseguiuRealizar : undefined,
      observacaoAtividade: presente ? obsAtividade : undefined,
      informacoesAdicionais: presente ? infoAdicionais : undefined,
      fotoDiarioBordoUrl: presente ? fotoDiarioBordo : undefined,
      currentUser,
    });

    setIsSalvando(false);

    if (!res.success || !res.data) {
      setMensagemErro(res.message);
      return;
    }

    // Salva no IndexedDB com status de sincronização (offline vs online)
    const registroPersistido = await salvarRegistroApoioIdb(res.data.registro, !isOnline);

    onSalvarRegistroApoio(registroPersistido);
    onAddAuditoria(res.data.auditoria);

    const mensagemFeedback = !isOnline
      ? `${res.message} (Salvo com segurança no IndexedDB local • Sincronização pendente)`
      : res.message;

    setFeedbackSucesso(mensagemFeedback);
    setModalRegistroAberto(false);

    setTimeout(() => {
      setFeedbackSucesso(null);
    }, 4000);
  };

  // Upload da foto do aluno
  const handleSelecionarFotoAluno = (estId: string) => {
    setEstudanteIdParaFoto(estId);
    if (fileInputFotoAlunoRef.current) {
      fileInputFotoAlunoRef.current.click();
    }
  };

  const handleProcessarFotoAluno = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !estudanteIdParaFoto) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = associarFotoEstudante({
        studentId: estudanteIdParaFoto,
        fotoBase64: base64,
        currentUser,
        estudantes,
      });

      if (res.success && res.data) {
        const estAtualizado = res.data.estudanteAtualizado;
        onUpdateEstudante(estAtualizado);
        onAddAuditoria(res.data.auditoria);
        if (alunoSelecionado?.id === estudanteIdParaFoto) {
          setAlunoSelecionado(estAtualizado);
        }

        // Se Google Drive estiver conectado, envia para a pasta da série
        if (isGoogleDriveConnected()) {
          const serie = estAtualizado.anoSerie || estAtualizado.turma;
          const cleanName = estAtualizado.nome.replace(/[^a-zA-Z0-9]/g, '_');
          const driveRes = await uploadImageToDrive({
            dataUrl: base64,
            fileName: `Foto_Aluno_${estAtualizado.matricula || 'MAT'}_${cleanName}.jpg`,
            serie,
            studentName: estAtualizado.nome,
            tipo: 'foto_estudante',
          });

          if (driveRes.success) {
            setFeedbackSucesso(`Fotografia do estudante atualizada e enviada para a pasta "${driveRes.folderName}" no Google Drive!`);
          } else {
            setFeedbackSucesso(`Fotografia do estudante atualizada com sucesso.`);
          }
        } else {
          setFeedbackSucesso(`Fotografia do estudante atualizada com sucesso.`);
        }
        setTimeout(() => setFeedbackSucesso(null), 3500);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload da foto do Diário de Bordo
  const handleProcessarFotoDiario = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setFotoDiarioBordo(base64);

      // Se o Google Drive estiver conectado, faz upload automático para a pasta da série
      if (isGoogleDriveConnected() && alunoParaRegistro) {
        setDriveStatusDiario({ salvoNoDrive: false, isEnviando: true });
        const serie = alunoParaRegistro.anoSerie || alunoParaRegistro.turma;
        const cleanName = alunoParaRegistro.nome.replace(/[^a-zA-Z0-9]/g, '_');
        const driveRes = await uploadImageToDrive({
          dataUrl: base64,
          fileName: `DiarioBordo_${dataSelecionadaParaRegistro}_${cleanName}.jpg`,
          serie,
          studentName: alunoParaRegistro.nome,
          tipo: 'diario_bordo',
        });

        if (driveRes.success) {
          setDriveStatusDiario({
            salvoNoDrive: true,
            folderName: driveRes.folderName,
            webViewLink: driveRes.webViewLink,
            isEnviando: false,
          });
        } else {
          setDriveStatusDiario({ salvoNoDrive: false, isEnviando: false });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Alterna disciplina na múltipla seleção
  const toggleDisciplina = (disc: string) => {
    setDisciplinasSelecionadas(prev => 
      prev.includes(disc) ? prev.filter(d => d !== disc) : [...prev, disc]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      
      {/* Inputs ocultos para foto do aluno e diário */}
      <input
        type="file"
        ref={fileInputFotoAlunoRef}
        onChange={handleProcessarFotoAluno}
        accept="image/*"
        capture="user"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputDiarioRef}
        onChange={handleProcessarFotoDiario}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* FEEDBACK DE SUCESSO GLOBAL */}
      {feedbackSucesso && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-950 flex items-center justify-between gap-2 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedbackSucesso}</span>
          </div>
          <button onClick={() => setFeedbackSucesso(null)} className="text-emerald-800 hover:text-emerald-950">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* BANNER INFORMATIVO DE MODO OFFLINE / INDEXEDDB */}
      {!isOnline && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs font-medium text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-200/90 text-amber-900 flex items-center justify-center shrink-0">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="font-black text-amber-950 block text-xs sm:text-sm">
                  Modo Offline Ativo (Persistência IndexedDB Garantida)
                </strong>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                  Offline
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                Você pode continuar preenchendo os diários de bordo normalmente. Todos os registros estão sendo salvos com total segurança no banco IndexedDB deste dispositivo e serão sincronizados automaticamente assim que a conexão retornar.
              </p>
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-950 font-black text-xs border border-amber-400/60 shadow-2xs">
                {pendingCount} registro(s) pendente(s)
              </span>
            </div>
          )}
        </div>
      )}

      {/* CABEÇALHO DO MÓDULO (Seção 6) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Profissional de Apoio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Acompanhamento Diário
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Profissional conectado: <strong className="text-slate-800">{currentUser.name}</strong> • {escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro'}
            </p>
          </div>
        </div>

        {/* Indicadores Resumidos e Ações */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {onOpenCriarPei && (
            <button
              type="button"
              onClick={() => onOpenCriarPei(alunoSelecionado?.id)}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Criar Plano Educacional Individualizado (PEI / SEDUC-GO)"
            >
              <GraduationCap className="h-3.5 w-3.5 text-emerald-200" />
              <span>Criar PEI (SEDUC-GO)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAbrirRelatorioGeral}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Exportar Relatório Mensal em PDF para a Direção"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Relatório Mensal (PDF)</span>
          </button>

          {onVoltarParaCoordenacao && (currentUser.roles.includes('coordinator') || currentUser.roles.includes('superadmin')) && (
            <button
              onClick={onVoltarParaCoordenacao}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Painel Coordenação</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
            <div className="px-2.5 py-1 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Alunos</span>
              <strong className="text-slate-900 font-extrabold">{estudantes.length}</strong>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="px-2.5 py-1 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Hoje Feitos</span>
              <strong className="text-emerald-800 font-extrabold">{totalHojeRealizados}</strong>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="px-2.5 py-1 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Pendentes</span>
              <strong className="text-amber-800 font-extrabold">{totalHojePendentes}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SEÇÃO PRINCIPAL: SE ALUNO ESTIVER SELECIONADO -> TELA DE ACOMPANHAMENTO */}
      {/* ===================================================================== */}
      {alunoSelecionado ? (
        <div className="space-y-4">
          
          {/* Card do Estudante em Foco */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setAlunoSelecionado(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                title="Voltar para a lista de estudantes"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              {/* Foto do Aluno (Seção 7) */}
              <div className="relative group shrink-0">
                {alunoSelecionado.fotoUrl ? (
                  <img
                    src={alunoSelecionado.fotoUrl}
                    alt={alunoSelecionado.nome}
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
                  />
                ) : (
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center font-bold text-lg">
                    {alunoSelecionado.nome.charAt(0)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleSelecionarFotoAluno(alunoSelecionado.id)}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-700 text-white shadow-xs hover:bg-emerald-800 cursor-pointer"
                  title="Alterar ou adicionar foto oficial do estudante"
                >
                  <Camera className="h-3 w-3" />
                </button>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Prontuário Individual de Acompanhamento
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                  {alunoSelecionado.nome}
                </h2>
                <p className="text-xs text-slate-500">
                  Turma: <strong className="text-slate-700">{alunoSelecionado.turma}</strong> • Matrícula: <span className="font-mono">{alunoSelecionado.matricula}</span> • Turno: {alunoSelecionado.turno}
                </p>
              </div>
            </div>

            {/* Ações para o aluno */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleAbrirRelatorioAluno(alunoSelecionado)}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Exportar Relatório Mensal deste Estudante em PDF para a Direção"
              >
                <Printer className="h-4 w-4 text-emerald-700" />
                <span>Exportar Relatório (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => handleBaixarRelatorioConsolidado(alunoSelecionado)}
                disabled={baixandoConsolidado}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                title="Gerar Relatório PDF: Compilar todo o histórico pedagógico, diários de bordo e planos PEI deste estudante segundo as normas da SEDUC-GO"
              >
                {baixandoConsolidado ? (
                  <Loader2 className="h-4 w-4 animate-spin text-sky-200" />
                ) : (
                  <FileDown className="h-4 w-4 text-sky-200" />
                )}
                <span>Gerar Relatório PDF</span>
              </button>

              {onOpenCriarPei && (
                <button
                  type="button"
                  onClick={() => onOpenCriarPei(alunoSelecionado.id)}
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Criar Plano Educacional Individualizado (PEI - SEDUC-GO)"
                >
                  <GraduationCap className="h-4 w-4 text-indigo-700" />
                  <span>Criar PEI (SEDUC-GO)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleAbrirRegistroData(hojeIso, alunoSelecionado)}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <CalendarCheck className="h-4 w-4" />
                <span>Registrar Hoje ({formatarDataPtBr(hojeIso)})</span>
              </button>
            </div>
          </div>

          {notificacaoConsolidado && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 font-bold flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="h-4 w-4 text-sky-700 shrink-0" />
              <span>{notificacaoConsolidado}</span>
            </div>
          )}

          {/* CALENDÁRIO MENSAL INTERATIVO (Componente Modular Especializado) */}
          <CalendarioInterativo
            aluno={alunoSelecionado}
            registros={registrosApoio}
            onSelectDate={(dataIso) => handleAbrirRegistroData(dataIso, alunoSelecionado)}
            onSelectData={(dataIso) => handleAbrirRegistroData(dataIso, alunoSelecionado)}
            dataSelecionada={dataSelecionadaParaRegistro}
            anoInicial={anoAtual}
            mesInicial={mesAtual}
            onMesAnoChange={(ano, mes) => {
              setAnoAtual(ano);
              setMesAtual(mes);
            }}
          />

          {/* Histórico Recente de Registros do Aluno */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-700" />
                <span>Histórico de Registros deste Estudante</span>
              </h3>
              <button
                type="button"
                onClick={() => handleAbrirRelatorioAluno(alunoSelecionado)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title={`Exportar listagem e relatório de acompanhamento de ${alunoSelecionado.nome} em PDF`}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Exportar Relatório em PDF</span>
              </button>
            </div>

            {registrosApoio.filter(r => r.studentId === alunoSelecionado.id).length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Nenhum registro diário lançado ainda para {alunoSelecionado.nome}. Clique em um dia útil no calendário acima para iniciar.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {registrosApoio
                  .filter(r => r.studentId === alunoSelecionado.id)
                  .sort((a, b) => b.data.localeCompare(a.data))
                  .map(reg => (
                    <div key={reg.id} className="p-3 hover:bg-slate-50 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            reg.presente ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {reg.presente ? 'Presente' : 'Ausente'}
                          </span>
                          <strong className="text-slate-900">{formatarDataPtBr(reg.data)} ({reg.diaSemana})</strong>
                          <span className="text-[11px] text-slate-400 font-mono">às {reg.horario}</span>
                        </div>
                        {reg.presente && (
                          <p className="text-[11px] text-slate-600">
                            {reg.demonstrouIrritabilidadeOuSinais === 'Sim' ? (
                              <span className="text-amber-800 font-medium">Sinais observados: {reg.observacaoComportamental} • </span>
                            ) : null}
                            <span>Atividade Adaptada: <strong>{reg.recebeuAtividadeAdaptada}</strong></span>
                            {reg.disciplinasEnvolvidas && reg.disciplinasEnvolvidas.length > 0 && (
                              <span> ({reg.disciplinasEnvolvidas.join(', ')})</span>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {reg.fotoDiarioBordoUrl && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            <span>Diário de Bordo</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAbrirRegistroData(reg.data, alunoSelecionado)}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Ver / Editar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ===================================================================== */
        /* VISÃO GERAL: SELETOR DE ABAS (ESTUDANTES / CALENDÁRIO CRONOLÓGICO)     */
        /* ===================================================================== */
        <div className="space-y-4">
          
          {/* BARRA DE NAVEGAÇÃO ENTRE ESTUDANTES E CALENDÁRIO CRONOLÓGICO */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
              <button
                type="button"
                onClick={() => setModoVisualizacao('alunos')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  modoVisualizacao === 'alunos'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-4 w-4 text-emerald-700" />
                <span>Estudantes Acompanhados ({estudantes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModoVisualizacao('calendario')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  modoVisualizacao === 'calendario'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="h-4 w-4 text-emerald-700" />
                <span>Calendário & Anotações Cronológicas ({registrosApoio.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAbrirRelatorioGeral}
                className="w-full md:w-auto px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Exportar Relatório Mensal Geral da Escola em PDF para a Direção"
              >
                <Printer className="h-3.5 w-3.5 text-emerald-700" />
                <span>Relatório Mensal Oficial (PDF)</span>
              </button>
            </div>
          </div>

          {/* Card de Notificações Push e Lembretes via Service Worker */}
          <LembretesNotificacoesApoioCard
            currentUser={currentUser}
            estudantes={estudantes}
            registrosApoio={registrosApoio}
            onAbrirRegistroData={(dataIso, aluno) => handleAbrirRegistroData(dataIso, aluno)}
          />

          {/* ===================================================================== */}
          {/* MODO 1: GRADE PRINCIPAL DE ESTUDANTES ACOMPANHADOS                     */}
          {/* ===================================================================== */}
          {modoVisualizacao === 'alunos' && (
            <div className="space-y-4">
              {/* Barra de Filtros e Pesquisa */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={buscaEstudante}
                    onChange={e => setBuscaEstudante(e.target.value)}
                    placeholder="Pesquisar aluno por nome ou matrícula..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <select
                    value={filtroTurma}
                    onChange={e => setFiltroTurma(e.target.value)}
                    className="text-xs p-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium"
                  >
                    <option value="todas">Todas as Turmas ({estudantes.length})</option>
                    {turmasDisponiveis.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cards de Alunos (Mobile-First: 1 coluna no celular, 2 em tablet, 3 em desktop) */}
              {estudantesFiltrados.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
                  <User className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Nenhum estudante localizado.</p>
                  <p className="text-[11px] text-slate-400">Verifique os filtros ou busque por outro termo.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {estudantesFiltrados.map(est => {
                    const regHoje = registrosHojeMap.get(est.id);
                    const statusHoje = regHoje 
                      ? (regHoje.presente ? 'Presente' : 'Ausente') 
                      : 'Pendente';

                    return (
                      <div
                        key={est.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          {/* Foto do Estudante */}
                          <div className="relative group shrink-0">
                            {est.fotoUrl ? (
                              <img
                                src={est.fotoUrl}
                                alt={est.nome}
                                className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm">
                                {est.nome.charAt(0)}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSelecionarFotoAluno(est.id)}
                              className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-800 text-white hover:bg-black shadow-xs cursor-pointer"
                              title="Atualizar foto"
                            >
                              <Camera className="h-2.5 w-2.5" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {est.turma}
                              </span>
                              {/* Indicador de registro do dia (Seção 6) */}
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                statusHoje === 'Presente' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                  : statusHoje === 'Ausente'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                                Hoje: {statusHoje}
                              </span>
                            </div>
                            <h3 className="text-xs font-black text-slate-900 tracking-tight mt-1 truncate" title={est.nome}>
                              {est.nome}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Matrícula: {est.matricula}
                            </p>
                          </div>
                        </div>

                        {/* Botão Acompanhar (Seção 6) e Relatório */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setAlunoSelecionado(est)}
                            className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span>Acompanhar</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleAbrirRegistroData(hojeIso, est)}
                            className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                            title="Registro rápido de hoje"
                          >
                            <CalendarCheck className="h-4 w-4 text-emerald-700" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAbrirRelatorioAluno(est)}
                            className="py-2 px-2.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                            title={`Gerar Relatório em PDF de ${est.nome} para a Direção`}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* MODO 2: VISUALIZAÇÃO DE CALENDÁRIO SIMPLES & ANOTAÇÕES CRONOLÓGICAS   */}
          {/* ===================================================================== */}
          {modoVisualizacao === 'calendario' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* CARTÃO DO CALENDÁRIO MENSAL SIMPLES */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                
                {/* Controles de Navegação de Mês/Ano */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight capitalize">
                        {nomesMeses[mesAtual]} de {anoAtual}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Clique em um dia para filtrar as anotações diárias ou visualizar o mês completo
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const h = new Date();
                        setMesAtual(h.getMonth());
                        setAnoAtual(h.getFullYear());
                        setDataFiltroCronologico(hojeIso);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Hoje ({formatarDataPtBr(hojeIso)})
                    </button>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={handleMesAnterior}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                        title="Mês anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleMesSeguinte}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                        title="Próximo mês"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Resumo de Indicadores do Mês */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total no Mês</span>
                    <strong className="text-slate-900 text-sm font-extrabold">{registrosDoMes.length} atendimentos</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Presentes</span>
                    <strong className="text-emerald-900 text-sm font-extrabold">{registrosDoMes.filter(r => r.presente).length}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-amber-700">Ausências</span>
                    <strong className="text-amber-900 text-sm font-extrabold">{registrosDoMes.filter(r => !r.presente).length}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-sky-700">Diários de Bordo</span>
                    <strong className="text-sky-900 text-sm font-extrabold">{registrosDoMes.filter(r => Boolean(r.fotoDiarioBordoUrl)).length} fotos</strong>
                  </div>
                </div>

                {/* Grade do Calendário Mensal */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {/* Cabeçalho dos dias da semana */}
                  <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-center py-2 text-[11px] font-extrabold text-slate-600">
                    <div>Dom</div>
                    <div>Seg</div>
                    <div>Ter</div>
                    <div>Qua</div>
                    <div>Qui</div>
                    <div>Sex</div>
                    <div>Sáb</div>
                  </div>

                  {/* Células dos dias do mês */}
                  <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                    {/* Espaços vazios antes do dia 1 */}
                    {Array.from({ length: diasDoMes.offsetInicio }).map((_, idx) => (
                      <div key={`offset-${idx}`} className="h-16 sm:h-20 bg-slate-50/40 p-1.5" />
                    ))}

                    {/* Dias reais do mês */}
                    {diasDoMes.dias.map(dia => {
                      const isSelected = dataFiltroCronologico === dia.dataIso;
                      const hasRecords = dia.totalRegistros > 0;

                      return (
                        <div
                          key={dia.dataIso}
                          onClick={() => {
                            if (!dia.isUtil) return;
                            // Alterna seleção
                            setDataFiltroCronologico(prev => prev === dia.dataIso ? '' : dia.dataIso);
                          }}
                          className={`h-16 sm:h-20 p-1.5 transition-all flex flex-col justify-between ${
                            !dia.isUtil 
                              ? 'bg-slate-50/70 text-slate-300 cursor-not-allowed select-none' 
                              : isSelected
                              ? 'bg-emerald-50 ring-2 ring-emerald-600 ring-inset border-emerald-400 cursor-pointer shadow-xs'
                              : 'bg-white hover:bg-slate-50 text-slate-800 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${
                              dia.isHoje 
                                ? 'h-6 w-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-extrabold shadow-xs' 
                                : isSelected 
                                ? 'text-emerald-900 font-extrabold' 
                                : dia.isUtil 
                                ? 'text-slate-800' 
                                : 'text-slate-400'
                            }`}>
                              {dia.dia}
                            </span>

                            {dia.totalComFotoDiario > 0 && (
                              <span title={`${dia.totalComFotoDiario} foto(s) de diário de bordo nesta data`}>
                                <ImageIcon className="h-3 w-3 text-sky-600" />
                              </span>
                            )}
                          </div>

                          {dia.isUtil && (
                            <div className="space-y-0.5">
                              {hasRecords ? (
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center justify-center w-full px-1 py-0.5 rounded text-[10px] font-extrabold tracking-tight ${
                                    isSelected
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  }`}>
                                    {dia.totalRegistros} {dia.totalRegistros === 1 ? 'registro' : 'registros'}
                                  </span>

                                  {/* Pontos de status rápido */}
                                  <div className="flex items-center justify-center gap-1">
                                    {dia.totalPresentes > 0 && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title={`${dia.totalPresentes} presente(s)`} />
                                    )}
                                    {dia.totalAusentes > 0 && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title={`${dia.totalAusentes} ausente(s)`} />
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 block text-center">
                                  —
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dica de legenda */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 pt-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Presente</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>Ausente</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="h-3 w-3 text-sky-600" />
                      <span>Foto de Diário</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      <span>Fim de semana</span>
                    </span>
                  </div>

                  {dataFiltroCronologico && (
                    <button
                      type="button"
                      onClick={() => setDataFiltroCronologico('')}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Limpar seleção de data e ver todo o mês
                    </button>
                  )}
                </div>

              </div>

              {/* BARRA DE CONTROLE & FILTROS DA LISTA CRONOLÓGICA */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-700" />
                      {dataFiltroCronologico ? (
                        <span>
                          Anotações de <strong>{formatarDataPtBr(dataFiltroCronologico)} ({getNomeDiaSemana(dataFiltroCronologico)})</strong>
                        </span>
                      ) : (
                        <span>
                          Todas as Anotações de <strong>{nomesMeses[mesAtual]} de {anoAtual}</strong>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {registrosCronologicosFiltrados.length} {registrosCronologicosFiltrados.length === 1 ? 'registro' : 'registros'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Visualização cronológica das anotações pedagógicas, comportamentais e registros diários
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {dataFiltroCronologico && (
                      <button
                        type="button"
                        onClick={() => setDataFiltroCronologico('')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Ver Todo o Mês ({registrosDoMes.length})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setOrdemCronologica(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Alternar ordem de exibição temporal"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                      <span>{ordemCronologica === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}</span>
                    </button>
                  </div>
                </div>

                {/* Filtros da Linha do Tempo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                  {/* Busca textual nas anotações */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={buscaTextoCronologico}
                      onChange={e => setBuscaTextoCronologico(e.target.value)}
                      placeholder="Buscar termo nas anotações..."
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Filtro por Aluno */}
                  <div>
                    <select
                      value={filtroEstudanteCronologico}
                      onChange={e => setFiltroEstudanteCronologico(e.target.value)}
                      className="w-full p-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-700 font-medium"
                    >
                      <option value="todos">Todos os Alunos ({estudantes.length})</option>
                      {estudantes.map(est => (
                        <option key={est.id} value={est.id}>{est.nome} ({est.turma})</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Turma */}
                  <div>
                    <select
                      value={filtroTurmaCronologico}
                      onChange={e => setFiltroTurmaCronologico(e.target.value)}
                      className="w-full p-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-700 font-medium"
                    >
                      <option value="todas">Todas as Turmas</option>
                      {turmasDisponiveis.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Presença */}
                  <div>
                    <select
                      value={filtroPresencaCronologico}
                      onChange={e => setFiltroPresencaCronologico(e.target.value as any)}
                      className="w-full p-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-700 font-medium"
                    >
                      <option value="todos">Presença: Todas</option>
                      <option value="presente">Apenas Presentes</option>
                      <option value="ausente">Apenas Ausentes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* LISTAGEM CRONOLÓGICA DAS ANOTAÇÕES DIÁRIAS */}
              {registrosAgrupadosPorData.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      Nenhum registro localizado para o período ou critérios selecionados
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {dataFiltroCronologico 
                        ? `Não há lançamentos de acompanhamento gravados para o dia ${formatarDataPtBr(dataFiltroCronologico)}.`
                        : 'Nenhuma anotação registrada com os filtros aplicados neste mês.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    {dataFiltroCronologico && isDiaUtil(dataFiltroCronologico) && (
                      <button
                        type="button"
                        onClick={() => setModalNovoRegistroRapidoData(dataFiltroCronologico)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <CalendarCheck className="h-4 w-4" />
                        <span>Novo Registro para {formatarDataPtBr(dataFiltroCronologico)}</span>
                      </button>
                    )}

                    {(buscaTextoCronologico || filtroEstudanteCronologico !== 'todos' || filtroTurmaCronologico !== 'todas' || filtroPresencaCronologico !== 'todos') && (
                      <button
                        type="button"
                        onClick={() => {
                          setBuscaTextoCronologico('');
                          setFiltroEstudanteCronologico('todos');
                          setFiltroTurmaCronologico('todas');
                          setFiltroPresencaCronologico('todos');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {registrosAgrupadosPorData.map(grupo => (
                    <div key={grupo.dataIso} className="space-y-3">
                      
                      {/* Divisor / Cabeçalho do Dia */}
                      <div className="flex items-center justify-between gap-3 bg-slate-100/80 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="h-4 w-4 text-emerald-700" />
                          <strong className="text-slate-900 font-extrabold text-sm">
                            {grupo.dataFormatada}
                          </strong>
                          <span className="text-slate-500 font-medium">
                            • {grupo.diaSemana}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 font-bold border border-slate-200 text-[10px]">
                            {grupo.itens.length} {grupo.itens.length === 1 ? 'estudante acompanhado' : 'estudantes acompanhados'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setModalNovoRegistroRapidoData(grupo.dataIso)}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Registrar outro estudante para ${grupo.dataFormatada}`}
                        >
                          <span>+ Adicionar Aluno</span>
                        </button>
                      </div>

                      {/* Lista de Registros daquele Dia */}
                      <div className="grid grid-cols-1 gap-3">
                        {grupo.itens.map(reg => {
                          const est = estudantes.find(e => e.id === reg.studentId);

                          return (
                            <div
                              key={reg.id}
                              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all space-y-3.5 border-l-4 ${
                                reg.presente ? 'border-l-emerald-600 border-slate-200' : 'border-l-amber-500 border-slate-200'
                              }`}
                            >
                              {/* Topo do Card: Aluno, Turma, Horário e Presença */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-3">
                                  {est?.fotoUrl ? (
                                    <img
                                      src={est.fotoUrl}
                                      alt={reg.nomeEstudante}
                                      className="h-11 w-11 rounded-xl object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="h-11 w-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold flex items-center justify-center shrink-0 text-sm">
                                      {reg.nomeEstudante.charAt(0)}
                                    </div>
                                  )}

                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="text-sm font-black text-slate-900 tracking-tight">
                                        {reg.nomeEstudante}
                                      </h4>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                        {reg.turma}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      Matrícula: {est?.matricula || 'N/I'} • Registro efetuado às <strong className="text-slate-700">{reg.horario}</strong>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                                  {/* Status de Sincronização IndexedDB */}
                                  {reg.syncStatus === 'pending_sync' || reg.syncStatus === 'offline_created' || reg.syncStatus === 'offline_updated' ? (
                                    <span 
                                      className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs"
                                      title="Salvo com segurança no IndexedDB deste dispositivo. Sincronização pendente aguardando internet."
                                    >
                                      <WifiOff className="h-3 w-3 text-amber-700" />
                                      <span>Offline (IndexedDB)</span>
                                    </span>
                                  ) : (
                                    <span 
                                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1"
                                      title="Registro sincronizado com o banco de dados"
                                    >
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      <span>Sincronizado</span>
                                    </span>
                                  )}

                                  <span className={`px-2.5 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${
                                    reg.presente
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'bg-amber-50 text-amber-800 border-amber-300'
                                  }`}>
                                    {reg.presente ? (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Presente</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-3.5 w-3.5 text-amber-600" />
                                        <span>Ausente</span>
                                      </>
                                    )}
                                  </span>

                                  {reg.fotoDiarioBordoUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setFotoAmpliadaModal({
                                        url: reg.fotoDiarioBordoUrl!,
                                        titulo: `Diário de Bordo - ${reg.nomeEstudante}`,
                                        data: `${grupo.dataFormatada} às ${reg.horario}`
                                      })}
                                      className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Visualizar foto do diário de bordo ampliada"
                                    >
                                      <ImageIcon className="h-3.5 w-3.5 text-sky-600" />
                                      <span>Diário Anexo</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Corpo do Registro e Anotações */}
                              {reg.presente ? (
                                <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                                  
                                  {/* 1. Comportamento & Sinais de Irritabilidade */}
                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-bold text-slate-400">
                                        Comportamento & Bem-estar:
                                      </span>
                                      {reg.demonstrouIrritabilidadeOuSinais === 'Sim' ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3 text-amber-700" />
                                          <span>Sinais Observados</span>
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                                          <Smile className="h-3 w-3 text-emerald-700" />
                                          <span>Comportamento Estável</span>
                                        </span>
                                      )}
                                    </div>

                                    {reg.demonstrouIrritabilidadeOuSinais === 'Sim' && reg.observacaoComportamental ? (
                                      <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-950 font-medium italic text-[11px] leading-relaxed">
                                        "{reg.observacaoComportamental}"
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-slate-500">
                                        O estudante não demonstrou sinais de irritabilidade ou desconforto nesta data.
                                      </p>
                                    )}
                                  </div>

                                  {/* 2. Atividade Adaptada */}
                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <span className="text-[10px] uppercase font-bold text-slate-400">
                                        Atividade Pedagógica Adaptada:
                                      </span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        reg.recebeuAtividadeAdaptada === 'Sim'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                          : 'bg-slate-100 text-slate-600 border-slate-300'
                                      }`}>
                                        Recebeu: {reg.recebeuAtividadeAdaptada}
                                      </span>
                                    </div>

                                    {reg.recebeuAtividadeAdaptada === 'Sim' && (
                                      <div className="space-y-2 text-[11px]">
                                        {reg.disciplinasEnvolvidas && reg.disciplinasEnvolvidas.length > 0 && (
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-slate-500 font-medium">Disciplinas:</span>
                                            {reg.disciplinasEnvolvidas.map(d => (
                                              <span key={d} className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-bold text-[10px]">
                                                {d}
                                              </span>
                                            ))}
                                          </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-500 font-medium">Conseguiu Realizar:</span>
                                          <strong className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                                            {reg.conseguiuRealizarAtividade || 'Sim'}
                                          </strong>
                                        </div>

                                        {reg.observacaoAtividade && (
                                          <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 italic text-[11px]">
                                            "{reg.observacaoAtividade}"
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* 3. Anotações Adicionais do Diário */}
                                  {reg.informacoesAdicionais && (
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                                        <FileText className="h-3 w-3 text-slate-500" />
                                        <span>Anotações Adicionais / Ocorrências:</span>
                                      </span>
                                      <p className="text-slate-700 italic text-[11px] leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                                        "{reg.informacoesAdicionais}"
                                      </p>
                                    </div>
                                  )}

                                  {/* 4. Miniatura do Diário de Bordo se anexada */}
                                  {reg.fotoDiarioBordoUrl && (
                                    <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200 flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5">
                                        <img
                                          src={reg.fotoDiarioBordoUrl}
                                          alt="Diário de Bordo"
                                          className="h-12 w-12 rounded-lg object-cover border border-sky-300 shadow-xs cursor-pointer hover:opacity-90"
                                          onClick={() => setFotoAmpliadaModal({
                                            url: reg.fotoDiarioBordoUrl!,
                                            titulo: `Diário de Bordo - ${reg.nomeEstudante}`,
                                            data: `${grupo.dataFormatada} às ${reg.horario}`
                                          })}
                                        />
                                        <div>
                                          <strong className="text-sky-950 block text-xs font-bold">
                                            Fotografia do Diário de Bordo Anexada
                                          </strong>
                                          <span className="text-[10px] text-sky-700">
                                            Registro documental da rotina e atividades do dia
                                          </span>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => setFotoAmpliadaModal({
                                          url: reg.fotoDiarioBordoUrl!,
                                          titulo: `Diário de Bordo - ${reg.nomeEstudante}`,
                                          data: `${grupo.dataFormatada} às ${reg.horario}`
                                        })}
                                        className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>Ampliar</span>
                                      </button>
                                    </div>
                                  )}

                                </div>
                              ) : (
                                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
                                  <strong className="font-bold block">Estudante Ausente</strong>
                                  <p className="text-[11px] text-amber-800 mt-0.5">
                                    A ausência foi formalizada no sistema sem aplicação de atividades adaptadas nesta data.
                                  </p>
                                </div>
                              )}

                              {/* Rodapé do Card com Ações Rápidas */}
                              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                                <span>
                                  Registrado por: <strong className="text-slate-700">{reg.profissionalResponsavelNome || reg.usuarioRegistroNome || currentUser.name}</strong>
                                </span>

                                <div className="flex items-center gap-2">
                                  {est && (
                                    <button
                                      type="button"
                                      onClick={() => setAlunoSelecionado(est)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
                                    >
                                      Ver Prontuário do Aluno
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleAbrirRegistroData(reg.data, est)}
                                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
                                  >
                                    Editar Anotação
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: AMPLIAÇÃO DE FOTO DO DIÁRIO DE BORDO                           */}
      {/* ===================================================================== */}
      {fotoAmpliadaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-extrabold">{fotoAmpliadaModal.titulo}</h3>
                  <p className="text-[11px] text-slate-400">{fotoAmpliadaModal.data}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFotoAmpliadaModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-950/90 min-h-[300px]">
              <img
                src={fotoAmpliadaModal.url}
                alt={fotoAmpliadaModal.titulo}
                className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Fotografia oficial anexada ao diário de bordo
              </span>
              <button
                type="button"
                onClick={() => setFotoAmpliadaModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SELEÇÃO RÁPIDA DE ALUNO PARA NOVO REGISTRO EM DATA ESPECÍFICA */}
      {/* ===================================================================== */}
      {modalNovoRegistroRapidoData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-extrabold">Novo Registro Diário</h3>
                  <p className="text-[11px] text-emerald-100">
                    Data: {formatarDataPtBr(modalNovoRegistroRapidoData)} ({getNomeDiaSemana(modalNovoRegistroRapidoData)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoRegistroRapidoData(null)}
                className="p-1.5 text-emerald-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <p className="text-xs text-slate-600 font-medium">
                Selecione o estudante que deseja registrar ou atualizar nesta data:
              </p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                {estudantes.map(est => {
                  const jaRegistrado = registrosApoio.some(
                    r => r.studentId === est.id && r.data === modalNovoRegistroRapidoData
                  );

                  return (
                    <button
                      key={est.id}
                      type="button"
                      onClick={() => {
                        const targetDate = modalNovoRegistroRapidoData;
                        setModalNovoRegistroRapidoData(null);
                        handleAbrirRegistroData(targetDate, est);
                      }}
                      className="w-full p-3 text-left hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-emerald-200">
                          {est.nome.charAt(0)}
                        </div>
                        <div>
                          <strong className="text-slate-900 block font-bold">{est.nome}</strong>
                          <span className="text-[11px] text-slate-400">Turma: {est.turma} • Matrícula: {est.matricula}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        jaRegistrado 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {jaRegistrado ? 'Já registrado' : 'Pendente'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setModalNovoRegistroRapidoData(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: REGISTRO DIÁRIO DO PROFISSIONAL DE APOIO (Seções 9 a 14)       */}
      {/* ===================================================================== */}
      {modalRegistroAberto && alunoParaRegistro && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Topo do Formulário (Seção 9) */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Registro Diário do Profissional de Apoio
                </span>
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                  {formatarDataPtBr(dataSelecionadaParaRegistro)} • {getNomeDiaSemana(dataSelecionadaParaRegistro)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalRegistroAberto(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cabeçalho de Identificação (Seção 9) */}
            <div className="p-3.5 bg-emerald-50/70 border-b border-emerald-100 text-xs text-slate-700 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[10px]">Aluno:</span>
                <strong className="text-slate-900">{alunoParaRegistro.nome}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Turma:</span>
                <strong className="text-slate-900">{alunoParaRegistro.turma}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Data Selecionada:</span>
                <strong className="text-slate-900">{formatarDataPtBr(dataSelecionadaParaRegistro)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Profissional Responsável:</span>
                <strong className="text-slate-900">{currentUser.name}</strong>
              </div>
            </div>

            {/* Mensagem de Erro se houver */}
            {mensagemErro && (
              <div className="m-3 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-700 shrink-0" />
                <span>{mensagemErro}</span>
              </div>
            )}

            {/* Corpo do Formulário */}
            <form onSubmit={handleSalvarRegistro} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* 1. ALUNO (Seção 10) */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">
                  1. Aluno <span className="text-rose-600">*</span>
                </label>
                <select
                  value={alunoParaRegistro.id}
                  onChange={e => {
                    const sel = estudantes.find(x => x.id === e.target.value);
                    if (sel) setAlunoParaRegistro(sel);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold focus:ring-2 focus:ring-emerald-600"
                >
                  {estudantes.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nome} — {e.turma}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. PRESENÇA (Seção 11) - ESCOLHA EXCLUSIVA */}
              <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block font-black text-slate-900 text-xs">
                  2. O aluno esteve presente? <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPresente(true)}
                    className={`py-3 px-3 rounded-xl font-extrabold flex items-center justify-center gap-2 border text-xs cursor-pointer transition-all ${
                      presente 
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-500' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>PRESENTE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPresente(false)}
                    className={`py-3 px-3 rounded-xl font-extrabold flex items-center justify-center gap-2 border text-xs cursor-pointer transition-all ${
                      !presente 
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-500' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    <span>AUSENTE</span>
                  </button>
                </div>

                {!presente && (
                  <p className="text-[11px] text-amber-800 font-medium pt-1">
                    ℹ️ Aluno ausente. As perguntas adicionais foram desabilitadas e o registro pode ser salvo imediatamente.
                  </p>
                )}
              </div>

              {/* ============================================================= */}
              {/* PERGUNTAS 3, 4, 5 e 6: EXIBIDAS SOMENTE QUANDO PRESENTE (Seção 11) */}
              {/* ============================================================= */}
              {presente && (
                <div className="space-y-4 animate-fadeIn">
                  
                  {/* 3. OBSERVAÇÃO DO ACOMPANHAMENTO (Seção 12) */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block font-bold text-slate-900 leading-snug">
                      3. O aluno demonstrou irritabilidade ou apresentou sinais/comportamentos diferentes do habitual que sejam relevantes para o acompanhamento escolar? <span className="text-rose-600">*</span>
                    </label>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {(['Sim', 'Não', 'Não se aplica'] as const).map(opc => (
                        <button
                          key={opc}
                          type="button"
                          onClick={() => setDemonstrouIrritabilidade(opc)}
                          className={`py-2 px-2 rounded-lg font-bold text-xs border text-center transition-all cursor-pointer ${
                            demonstrouIrritabilidade === opc
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opc}
                        </button>
                      ))}
                    </div>

                    {demonstrouIrritabilidade === 'Sim' && (
                      <div className="pt-2 space-y-1">
                        <label className="block font-bold text-slate-800 text-[11px]">
                          Descreva brevemente o que foi observado:
                        </label>
                        <textarea
                          rows={2}
                          value={obsComportamento}
                          onChange={e => setObsComportamento(e.target.value)}
                          placeholder="Ex: Aluno demonstrou inquietação e dispersão durante o segundo horário..."
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. ATIVIDADE ADAPTADA (Seção 13) */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block font-bold text-slate-900">
                      4. O aluno recebeu atividade adaptada hoje? <span className="text-rose-600">*</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {(['Sim', 'Não'] as const).map(opc => (
                        <button
                          key={opc}
                          type="button"
                          onClick={() => setRecebeuAtividadeAdaptada(opc)}
                          className={`py-2 px-3 rounded-lg font-bold text-xs border text-center transition-all cursor-pointer ${
                            recebeuAtividadeAdaptada === opc
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opc}
                        </button>
                      ))}
                    </div>

                    {recebeuAtividadeAdaptada === 'Sim' && (
                      <div className="space-y-3 pt-2">
                        {/* Em qual(is) disciplina(s)? (Múltipla seleção da Matriz Curricular) */}
                        <div className="space-y-1.5">
                          <label className="block font-bold text-slate-800 text-[11px]">
                            Em qual(is) disciplina(s)? (Selecione uma ou mais)
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {disciplinasDisponiveis.map(disc => {
                              const sel = disciplinasSelecionadas.includes(disc);
                              return (
                                <button
                                  key={disc}
                                  type="button"
                                  onClick={() => toggleDisciplina(disc)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                    sel 
                                      ? 'bg-emerald-700 text-white border-emerald-800' 
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {disc}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* O aluno conseguiu realizar a atividade adaptada? */}
                        <div className="space-y-1">
                          <label className="block font-bold text-slate-800 text-[11px]">
                            O aluno conseguiu realizar a atividade adaptada?
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['Sim', 'Parcialmente', 'Não'] as const).map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setConseguiuRealizar(r)}
                                className={`py-1.5 px-2 rounded-lg font-bold text-xs border text-center transition-all cursor-pointer ${
                                  conseguiuRealizar === r
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Observação sobre a realização */}
                        <div className="space-y-1">
                          <label className="block font-bold text-slate-800 text-[11px]">
                            Observação sobre a realização da atividade:
                          </label>
                          <textarea
                            rows={2}
                            value={obsAtividade}
                            onChange={e => setObsAtividade(e.target.value)}
                            placeholder="Descreva como o estudante interagiu com a atividade adaptada..."
                            className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. INFORMAÇÕES ADICIONAIS */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-800">
                      5. Informações adicionais / Observações gerais do dia:
                    </label>
                    <textarea
                      rows={2}
                      value={infoAdicionais}
                      onChange={e => setInfoAdicionais(e.target.value)}
                      placeholder="Outras informações pertinentes para o acompanhamento escolar..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  {/* 6. FOTOGRAFIA DO DIÁRIO DE BORDO */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-900">
                        6. Fotografia do Diário de Bordo
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
                    </div>

                    {fotoDiarioBordo ? (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden border border-slate-200">
                          <img
                            src={fotoDiarioBordo}
                            alt="Foto do Diário de Bordo"
                            className="w-full max-h-48 object-contain bg-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFotoDiarioBordo('');
                              setDriveStatusDiario(null);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                            title="Remover foto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Status da Imagem no Google Drive */}
                        {driveStatusDiario?.isEnviando && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                            <span>Enviando foto para a pasta da série no Google Drive...</span>
                          </div>
                        )}
                        {driveStatusDiario?.salvoNoDrive && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>Salvo no Google Drive na pasta "{driveStatusDiario.folderName}"</span>
                            </div>
                            {driveStatusDiario.webViewLink && (
                              <a
                                href={driveStatusDiario.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 underline"
                              >
                                <span>Abrir no Drive</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                        {!isGoogleDriveConnected() && (
                          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px]">
                            <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>Google Drive desconectado. Conecte pelo topo da tela para envio automático à pasta da série.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputDiarioRef.current) {
                              fileInputDiarioRef.current.setAttribute('capture', 'environment');
                              fileInputDiarioRef.current.click();
                            }
                          }}
                          className="py-3 px-3 rounded-xl border border-dashed border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Camera className="h-5 w-5 text-emerald-600" />
                          <span>Tirar Foto (Câmera)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputDiarioRef.current) {
                              fileInputDiarioRef.current.removeAttribute('capture');
                              fileInputDiarioRef.current.click();
                            }
                          }}
                          className="py-3 px-3 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <ImageIcon className="h-5 w-5 text-slate-500" />
                          <span>Escolher da Galeria</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Botões do Rodapé */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalRegistroAberto(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSalvando}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSalvando ? 'Salvando...' : 'Salvar Registro Diário'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal de Exportação do Relatório Mensal em PDF para a Direção */}
      {modalRelatorioAberto && (
        <RelatorioMensalApoioModal
          isOpen={modalRelatorioAberto}
          onClose={() => setModalRelatorioAberto(false)}
          registros={registrosApoio}
          estudantes={estudantes}
          escolaConfig={escolaConfig}
          currentUser={currentUser}
          alunoInicial={alunoParaRelatorio}
          anoInicial={anoAtual}
          mesInicial={mesAtual}
        />
      )}

    </div>
  );
};
