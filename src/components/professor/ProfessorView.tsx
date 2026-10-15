import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sliders, 
  Printer, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  ArrowRight,
  Eye,
  Edit2,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  BarChart3,
  Plus,
  GraduationCap,
  FileDown,
  Loader2,
  HeartHandshake
} from 'lucide-react';
import { 
  Estudante, 
  AuthorizedUser, 
  HabilidadeAprovada, 
  PerfilPedagogico, 
  AtividadeAdaptada, 
  EscolaConfig, 
  QuestaoAdaptada,
  CurriculumMatrix,
  CurriculumSkill,
  RegistroAcompanhamentoApoio,
  PeiDocumento
} from '../../types';
import { gerarAtividadeEstruturada, validarRequisitosAtividade } from '../../utils/activityGenerator';
import { buildActivityContext } from '../../server/pedagogicalContextService';
import { consultarMatriz } from '../../data/matrizesOficiaisSeduc2026';
import { A4SheetPreview } from '../a4/A4SheetPreview';
import { ProfessorActivityDashboard } from './ProfessorActivityDashboard';
import { baixarRelatorioConsolidadoEstudantePdf } from '../../services/relatorioConsolidadoService';
import { obterTodosPeis } from '../../services/peiService';

export type EtapaProfessor = 'dashboard' | 'formulario' | 'validar_contexto' | 'revisar' | 'folha_a4';

export interface ProfessorViewProps {
  currentUser: AuthorizedUser | null;
  escolaConfig: EscolaConfig;
  estudantes: Estudante[];
  perfisPedagogicos: PerfilPedagogico[];
  habilidadesAprovadas: HabilidadeAprovada[];
  matrizesCurriculares?: CurriculumMatrix[];
  habilidadesCurriculares?: CurriculumSkill[];
  atividades: AtividadeAdaptada[];
  registrosApoio?: RegistroAcompanhamentoApoio[];
  peisArmazenados?: PeiDocumento[];
  onSalvarAtividade: (nova: AtividadeAdaptada) => void;
  onAtualizarAtividade: (atualizada: AtividadeAdaptada) => void;
  onVisualizarAtividadeA4?: (atividade: AtividadeAdaptada) => void;
  initialEstudanteId?: string;
  initialAtividadeId?: string;
  initialEtapa?: EtapaProfessor;
  onOpenCriarPei?: (estudanteId?: string) => void;
}

export const ProfessorView: React.FC<ProfessorViewProps> = ({
  currentUser,
  escolaConfig,
  estudantes,
  perfisPedagogicos,
  habilidadesAprovadas,
  matrizesCurriculares = [],
  habilidadesCurriculares = [],
  atividades,
  registrosApoio = [],
  peisArmazenados = [],
  onSalvarAtividade,
  onAtualizarAtividade,
  onVisualizarAtividadeA4,
  initialEstudanteId,
  initialAtividadeId,
  initialEtapa,
  onOpenCriarPei,
}) => {
  // Etapas da tela do professor
  const [etapa, setEtapa] = useState<EtapaProfessor>(() => {
    if (initialEtapa) return initialEtapa;
    if (initialAtividadeId) return 'folha_a4';
    if (initialEstudanteId) return 'formulario';
    return 'dashboard';
  });

  const [estudanteId, setEstudanteId] = useState<string>(() => initialEstudanteId || '');
  const [disciplina, setDisciplina] = useState<string>('Língua Portuguesa');
  const [conteudo, setConteudo] = useState<string>('');
  const [habilidadeId, setHabilidadeId] = useState<string>('');
  const [tipoQuestoes, setTipoQuestoes] = useState<string>('multipla_escolha');
  const [quantidadeQuestoes, setQuantidadeQuestoes] = useState<number>(3);
  const [observacaoProfessor, setObservacaoProfessor] = useState<string>('');
  const [alinhadaAoPei, setAlinhadaAoPei] = useState<boolean>(true);
  const [peiAlinhamentoDetalhes, setPeiAlinhamentoDetalhes] = useState<string>('');
  const [feedbackVisualPei, setFeedbackVisualPei] = useState<{ mensagem: string; alinhada: boolean } | null>(null);

  // Modos Pedagógicos da Folha A4
  const [estiloTipograficoVisual, setEstiloTipograficoVisual] = useState<'letra_bastao' | 'letra_bastao_desenho_matriz' | 'so_desenhos' | 'letra_cursiva' | 'letra_bastao_e_cursiva'>('letra_bastao');
  const [estiloDesenho, setEstiloDesenho] = useState<'preto_e_branco_colorir' | 'colorido'>('preto_e_branco_colorir');

  // Estados de acessibilidade e comunicação com Apoio / Laudo
  const [avisoLetraBastaoAuto, setAvisoLetraBastaoAuto] = useState<string | null>(null);
  const [relatoApoioDetectado, setRelatoApoioDetectado] = useState<{
    registro: RegistroAcompanhamentoApoio;
    texto: string;
    houveDificuldade: boolean;
  } | null>(null);
  const [aplicarAjusteApoio, setAplicarAjusteApoio] = useState<boolean>(true);
  const [baixandoConsolidado, setBaixandoConsolidado] = useState<boolean>(false);
  const [feedbackDownloadConsolidado, setFeedbackDownloadConsolidado] = useState<string | null>(null);
  const [peisLocais, setPeisLocais] = useState<PeiDocumento[]>(peisArmazenados || []);

  useEffect(() => {
    if (peisArmazenados && peisArmazenados.length > 0) {
      setPeisLocais(peisArmazenados);
    } else {
      obterTodosPeis().then((lista) => setPeisLocais(lista));
    }
  }, [peisArmazenados]);

  // Monitora seleção de estudante para detecção automática de Letra Bastão e diário do apoio
  useEffect(() => {
    if (!estudanteId) {
      setAvisoLetraBastaoAuto(null);
      setRelatoApoioDetectado(null);
      return;
    }

    const est = estudantes.find(e => e.id === estudanteId);
    if (!est) return;

    const pei = peisLocais.find(p => p.studentId === est.id);
    const perfil = perfisPedagogicos.find(p => p.estudanteId === est.id);

    // 1. Verificação de recomendação de Letra BASTÃO
    const laudoCompleto = `${est.laudo || ''} ${est.observacoesAcessibilidade || ''} ${pei?.diagnosis || ''} ${perfil?.recursosAcessibilidade || ''}`.toLowerCase();
    const indicaBastao = laudoCompleto.includes('tea') || 
                         laudoCompleto.includes('autis') || 
                         laudoCompleto.includes('intelect') || 
                         laudoCompleto.includes('di') || 
                         laudoCompleto.includes('motora') || 
                         laudoCompleto.includes('disgraf') || 
                         laudoCompleto.includes('bastao') ||
                         laudoCompleto.includes('paralis') ||
                         laudoCompleto.includes('down');

    if (indicaBastao) {
      setEstiloTipograficoVisual('letra_bastao');
      setAvisoLetraBastaoAuto(`Identificado no laudo/PEI do(a) estudante ${est.nome}: Recomendação pedagógica de LETRA BASTÃO (Caixa Alta) para acessibilidade curricular (Diretrizes SEDUC-GO). Formato pré-selecionado automaticamente.`);
    } else {
      setAvisoLetraBastaoAuto(null);
    }

    // 2. Verificação de relatos do Diário de Bordo do Profissional de Apoio
    if (registrosApoio && registrosApoio.length > 0) {
      const regsAluno = registrosApoio
        .filter(r => r.studentId === est.id || r.nomeEstudante === est.nome)
        .sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());

      if (regsAluno.length > 0) {
        const ultimo = regsAluno[0];
        const textoObs = `${ultimo.observacaoAtividade || ''} ${ultimo.observacaoComportamental || ''} ${ultimo.barreirasEnfrentadas || ''}`.toLowerCase();
        
        const naoFez = ultimo.conseguiuRealizarAtividade === 'Não' || 
                       ultimo.conseguiuRealizarAtividade === 'Parcialmente' || 
                       textoObs.includes('não fez') || 
                       textoObs.includes('não deu conta') || 
                       textoObs.includes('dificuldade') || 
                       textoObs.includes('recusa') || 
                       textoObs.includes('sobrecarga') ||
                       textoObs.includes('frustra');

        const textoDestaque = ultimo.observacaoAtividade || ultimo.observacaoComportamental || ultimo.barreirasEnfrentadas || (ultimo.conseguiuRealizarAtividade === 'Não' ? 'Estudante não conseguiu concluir a atividade proposta no dia.' : 'Acompanhamento registrado.');

        setRelatoApoioDetectado({
          registro: ultimo,
          texto: textoDestaque,
          houveDificuldade: naoFez
        });
        setAplicarAjusteApoio(naoFez);
      } else {
        setRelatoApoioDetectado(null);
        setAplicarAjusteApoio(false);
      }
    }
  }, [estudanteId, estudantes, peisLocais, perfisPedagogicos, registrosApoio]);

  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [contextoValidado, setContextoValidado] = useState<any | null>(null);
  const [atividadeAtiva, setAtividadeAtiva] = useState<AtividadeAdaptada | null>(() => {
    if (initialAtividadeId) {
      const found = atividades.find(a => a.id === initialAtividadeId);
      if (found) return found;
    }
    return null;
  });

  // Sincronização reativa de parâmetros compartilhados via link
  React.useEffect(() => {
    if (initialEstudanteId) {
      setEstudanteId(initialEstudanteId);
      if (!initialEtapa && !initialAtividadeId) {
        setEtapa('formulario');
      }
    }
  }, [initialEstudanteId, initialEtapa, initialAtividadeId]);

  React.useEffect(() => {
    if (initialAtividadeId) {
      const found = atividades.find(a => a.id === initialAtividadeId);
      if (found) {
        setAtividadeAtiva(found);
        setEtapa('folha_a4');
      }
    }
  }, [initialAtividadeId, atividades]);

  React.useEffect(() => {
    if (initialEtapa) {
      setEtapa(initialEtapa);
    }
  }, [initialEtapa]);

  // Filtrar apenas estudantes ativos vinculados ao UID ou ID do professor
  const estudantesAutorizados = estudantes.filter((est) => {
    if (est.situacao !== 'ativo') return false;
    if (!currentUser) return true;
    if (est.professoresAutorizadosIds && est.professoresAutorizadosIds.length > 0) {
      return est.professoresAutorizadosIds.includes(currentUser.id) || 
             (currentUser.uid && est.professoresAutorizadosIds.includes(currentUser.uid));
    }
    return true;
  });

  const estudanteSelecionado = estudantes.find(e => e.id === estudanteId);
  const perfilAutorizado = perfisPedagogicos.find(p => p.estudanteId === estudanteId && p.status === 'aprovado');

  // Recupera automaticamente a série do estudante (Seção 18)
  const serieEstudante = estudanteSelecionado?.anoSerie || estudanteSelecionado?.turma?.split(' ')[0] || '';

  // Filtra matrizes aprovadas da série do estudante e disciplina selecionada
  const matrizesFiltradas = useMemo(() => {
    if (!serieEstudante || !disciplina) return [];
    return matrizesCurriculares.filter(m => 
      m.active && 
      m.status === 'approved' &&
      m.subject.toLowerCase() === disciplina.toLowerCase() &&
      (m.grade.toLowerCase().includes(serieEstudante.toLowerCase()) || serieEstudante.toLowerCase().includes(m.grade.toLowerCase()))
    );
  }, [matrizesCurriculares, serieEstudante, disciplina]);

  // Filtra habilidades correspondentes à matriz, série e disciplina
  const habilidadesFiltradas = useMemo(() => {
    const listCurriculares = habilidadesCurriculares.filter(h =>
      h.active &&
      h.status === 'approved' &&
      h.subject.toLowerCase() === disciplina.toLowerCase() &&
      (!serieEstudante || h.grade.toLowerCase().includes(serieEstudante.toLowerCase()) || serieEstudante.toLowerCase().includes(h.grade.toLowerCase()))
    );

    const listLegadas = habilidadesAprovadas.filter(h =>
      h.status === 'aprovada' &&
      h.disciplina.toLowerCase() === disciplina.toLowerCase() &&
      (!serieEstudante || h.serie.toLowerCase().includes(serieEstudante.toLowerCase()) || serieEstudante.toLowerCase().includes(h.serie.toLowerCase()))
    );

    // Consulta direta e estruturada à Matriz Oficial SEDUC-GO 2026 (3º e 4º Bimestres)
    const resConsulta = consultarMatriz({
      anoSerie: serieEstudante,
      componente: disciplina,
    });
    const listMatrizOficial = resConsulta.habilidades.map(m => ({
      id: m.id,
      codigo: m.skillCode,
      skillCode: m.skillCode,
      descricao: m.skillDescription,
      skillDescription: m.skillDescription,
      disciplina: m.subject,
      serie: m.grade,
      grade: m.grade,
      subject: m.subject,
      unidadeTematica: m.thematicUnit,
      thematicUnit: m.thematicUnit,
      objetoConhecimento: m.knowledgeObject,
      knowledgeObject: m.knowledgeObject,
      sourcePage: m.sourcePage,
      status: 'approved' as const,
      active: true,
    }));

    // Se houver habilidades importadas, junta com as oficiais sem duplicar códigos
    const mapa = new Map<string, any>();
    [...listCurriculares, ...listLegadas, ...listMatrizOficial].forEach(h => {
      const cod = ('skillCode' in h ? h.skillCode : h.codigo) || h.id;
      if (!mapa.has(cod)) {
        mapa.set(cod, h);
      }
    });

    // Se ainda estiver vazio por filtro restrito de disciplina, busca todas as oficiais da série
    if (mapa.size === 0 && serieEstudante) {
      consultarMatriz({ anoSerie: serieEstudante }).habilidades.forEach(m => {
        const cod = m.skillCode || m.id;
        if (!mapa.has(cod)) {
          mapa.set(cod, {
            id: m.id,
            codigo: m.skillCode,
            skillCode: m.skillCode,
            descricao: m.skillDescription,
            skillDescription: m.skillDescription,
            disciplina: m.subject,
            serie: m.grade,
            grade: m.grade,
            subject: m.subject,
            unidadeTematica: m.thematicUnit,
            thematicUnit: m.thematicUnit,
            objetoConhecimento: m.knowledgeObject,
            knowledgeObject: m.knowledgeObject,
            sourcePage: m.sourcePage,
            status: 'approved',
            active: true,
          });
        }
      });
    }

    return Array.from(mapa.values());
  }, [habilidadesCurriculares, habilidadesAprovadas, disciplina, serieEstudante]);

  // Habilidade selecionada
  const habilidadeSelecionada = habilidadesFiltradas.find(h => 
    h.id === habilidadeId || ('skillCode' in h && h.skillCode === habilidadeId) || ('codigo' in h && h.codigo === habilidadeId)
  );

  // Minhas atividades (criadas por este professor)
  const minhasAtividades = atividades.filter(a => !currentUser || a.professorId === currentUser.id || a.professorId === currentUser.uid);

  // Validação do contexto antes de prosseguir (Seção 20)
  const handleValidarContexto = () => {
    setErroValidacao(null);

    if (!estudanteSelecionado) {
      setErroValidacao('Selecione um estudante autorizado.');
      return;
    }
    if (!disciplina.trim()) {
      setErroValidacao('Informe a disciplina.');
      return;
    }
    if (!conteudo.trim()) {
      setErroValidacao('Informe o conteúdo da atividade.');
      return;
    }
    if (!habilidadeId) {
      setErroValidacao('Selecione uma habilidade curricular aprovada.');
      return;
    }

    try {
      const contexto = buildActivityContext({
        studentId: estudanteSelecionado.id,
        teacherId: currentUser?.id,
        subject: disciplina,
        skillId: habilidadeId,
        content: conteudo,
        questionCount: quantidadeQuestoes,
        questionTypes: [tipoQuestoes],
        teacherObservation: observacaoProfessor,
        students: estudantes,
        teachers: currentUser ? [currentUser] : [],
        matrices: matrizesCurriculares,
        skills: habilidadesCurriculares,
        habilidadesLegadas: habilidadesAprovadas,
        profiles: perfisPedagogicos,
        schoolConfig: escolaConfig,
      });

      setContextoValidado(contexto);
      setEtapa('validar_contexto');
    } catch (err: any) {
      setErroValidacao(err.message || 'Erro ao validar contexto.');
    }
  };

  const handleConfirmarGeracaoAtividade = () => {
    if (!estudanteSelecionado || !habilidadeSelecionada) return;

    const habCodigo = 'skillCode' in habilidadeSelecionada ? habilidadeSelecionada.skillCode : habilidadeSelecionada.codigo;
    const habDesc = 'skillDescription' in habilidadeSelecionada ? habilidadeSelecionada.skillDescription : habilidadeSelecionada.descricao;

    const nova = gerarAtividadeEstruturada({
      estudante: estudanteSelecionado,
      perfilPedagogico: perfilAutorizado || {
        id: 'perfil-temp',
        estudanteId: estudanteSelecionado.id,
        estudanteNome: estudanteSelecionado.nome,
        nivelLeitura: 'Padrão',
        nivelEscrita: 'Padrão',
        conhecimentosMatematicos: 'Padrão',
        habilidadesConsolidadas: '',
        habilidadesEmDesenvolvimento: '',
        barreirasPedagogicas: '',
        estrategiasRecomendadas: 'Adaptação universal com apoio visual',
        recursosAcessibilidade: 'Linguagem clara e objetiva',
        adaptacoesAvaliativas: 'Padrão',
        extensaoEnunciados: 'Curto',
        quantidadeAlternativas: 4,
        necessidadeApoioVisual: true,
        necessidadeInstrucoesCurtas: true,
        tempoAdicionalAutorizado: '15 minutos',
        observacoesPedagogicas: '',
        status: 'aprovado',
        dataCadastro: new Date().toISOString(),
      },
      professorId: currentUser ? (currentUser.uid || currentUser.id) : 'prof-default',
      professorNome: currentUser ? currentUser.name : 'Professor(a) Responsável',
      disciplina,
      conteudo,
      habilidade: {
        id: habilidadeSelecionada.id,
        codigo: habCodigo,
        descricao: habDesc,
        disciplina,
        serie: serieEstudante,
        unidadeTematica: 'unidadeTematica' in habilidadeSelecionada ? habilidadeSelecionada.unidadeTematica : '',
        objetoConhecimento: 'objetoConhecimento' in habilidadeSelecionada ? habilidadeSelecionada.objetoConhecimento : '',
        documentoOrigem: '',
        paginaOrigem: '',
        status: 'aprovada',
      },
      quantidadeQuestoes,
      tipoQuestoes: estiloTipograficoVisual === 'so_desenhos' ? 'associacao' : tipoQuestoes,
      observacaoProfessor,
      alinhadaAoPei,
      peiAlinhamentoDetalhes: peiAlinhamentoDetalhes.trim() || undefined,
      tipoAtividade: estiloTipograficoVisual === 'so_desenhos' 
        ? 'desenhos' 
        : estiloTipograficoVisual === 'letra_bastao_desenho_matriz' 
        ? 'desenhos' 
        : (estiloTipograficoVisual === 'letra_cursiva' || estiloTipograficoVisual === 'letra_bastao_e_cursiva') 
        ? 'cursiva' 
        : 'multipla_escolha',
      estiloTipograficoVisual,
      estiloDesenho,
      apoioVisual: (estiloTipograficoVisual === 'so_desenhos' || estiloTipograficoVisual === 'letra_bastao_desenho_matriz') ? {
        habilitado: true,
        tipo: estiloTipograficoVisual === 'so_desenhos' ? 'desenhos' : (estiloDesenho === 'preto_e_branco_colorir' ? 'colorir' : 'desenhos'),
        estilo: estiloDesenho === 'colorido' ? 'colorido' : 'preto_e_branco',
        quantidadePorPagina: quantidadeQuestoes,
      } : undefined,
      opcoesCursiva: (estiloTipograficoVisual === 'letra_cursiva' || estiloTipograficoVisual === 'letra_bastao_e_cursiva') ? {
        tipoPauta: 'caligrafica',
        tracadoPontilhado: true,
        ladoALadoForma: estiloTipograficoVisual === 'letra_bastao_e_cursiva',
        tamanho: 'medio',
        contrastado: true,
      } : undefined,
      ajusteRelatoApoio: (relatoApoioDetectado?.houveDificuldade && aplicarAjusteApoio) ? {
        houveDificuldadeRelatada: true,
        relatoTexto: `Diário de Bordo do Apoio (${new Date(relatoApoioDetectado.registro.data).toLocaleDateString('pt-BR')}): ${relatoApoioDetectado.texto}`,
        recomendacao: 'Fragmentação de comandos, maior suporte visual ilustrado e redução de alternativas.'
      } : undefined,
    });

    setAtividadeAtiva(nova);
    onSalvarAtividade(nova);
    setEtapa('revisar');
  };

  const handleBaixarRelatorioConsolidado = (aluno: Estudante) => {
    try {
      setBaixandoConsolidado(true);
      const peiAluno = peisLocais.find(p => p.studentId === aluno.id);
      const perfilAluno = perfisPedagogicos.find(p => p.estudanteId === aluno.id);
      const { fileName } = baixarRelatorioConsolidadoEstudantePdf(
        aluno,
        atividades,
        registrosApoio || [],
        peiAluno,
        perfilAluno,
        escolaConfig,
        currentUser?.name || 'Professor(a) Regente'
      );
      setFeedbackDownloadConsolidado(`Relatório Consolidado (${fileName}) baixado com sucesso!`);
      setTimeout(() => setFeedbackDownloadConsolidado(null), 4500);
    } catch (err: any) {
      console.error('Erro ao baixar relatório consolidado:', err);
      alert('Não foi possível gerar o relatório consolidado.');
    } finally {
      setBaixandoConsolidado(false);
    }
  };

  const handleTogglePeiAtividadeAtiva = () => {
    if (!atividadeAtiva) return;
    const novoStatus = !atividadeAtiva.alinhadaAoPei;
    const agora = new Date().toISOString();
    const professorNome = currentUser?.name || atividadeAtiva.professorNome || 'Professor Regente';

    const atualizada: AtividadeAdaptada = {
      ...atividadeAtiva,
      alinhadaAoPei: novoStatus,
      peiAlinhadoEm: novoStatus ? agora : undefined,
      peiAlinhadoPor: novoStatus ? professorNome : undefined,
      peiAlinhamentoDetalhes: novoStatus 
        ? (atividadeAtiva.peiAlinhamentoDetalhes || `Atividade alinhada aos objetivos pedagógicos e adaptações do PEI de ${atividadeAtiva.estudanteNome}.`)
        : undefined
    };

    setAtividadeAtiva(atualizada);
    onAtualizarAtividade(atualizada);

    setFeedbackVisualPei({
      mensagem: novoStatus 
        ? `Atividade de ${atividadeAtiva.estudanteNome} marcada como "Alinhada ao PEI" com sucesso!`
        : `Marcação de alinhamento ao PEI removida da atividade de ${atividadeAtiva.estudanteNome}.`,
      alinhada: novoStatus
    });

    setTimeout(() => {
      setFeedbackVisualPei(null);
    }, 3500);
  };

  const handleEditQuestao = (questaoAtualizada: QuestaoAdaptada) => {
    if (!atividadeAtiva) return;
    const novas = atividadeAtiva.questoes.map(q => q.id === questaoAtualizada.id ? questaoAtualizada : q);
    const atualizada = { ...atividadeAtiva, questoes: novas, status: 'Revisada' as const };
    setAtividadeAtiva(atualizada);
    onAtualizarAtividade(atualizada);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Toast Flutuante de Feedback Visual do PEI */}
      {feedbackVisualPei && (
        <div className={`no-print mb-4 p-4 rounded-2xl border text-xs shadow-md flex items-center justify-between gap-3 transition-all animate-fadeIn ${
          feedbackVisualPei.alinhada 
            ? 'bg-emerald-800 text-white border-emerald-700' 
            : 'bg-amber-700 text-white border-amber-600'
        }`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" />
            <div>
              <p className="font-bold text-sm">{feedbackVisualPei.mensagem}</p>
              <p className="text-[11px] text-white/80">
                {feedbackVisualPei.alinhada 
                  ? 'A inclusão pedagógica foi registrada no histórico e refletida no painel de acompanhamento.' 
                  : 'A atividade foi desvinculada do acompanhamento do PEI.'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedbackVisualPei(null)} 
            className="p-1 rounded-lg hover:bg-white/20 cursor-pointer text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Banner de Identificação do Professor */}
      <div className="no-print mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
              Espaço do Professor
            </span>
            {currentUser && (
              <span className="text-xs font-semibold text-slate-700">
                • {currentUser.name} ({currentUser.email})
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Preparação & Geração de Atividades Adaptadas
          </h1>
          <p className="text-xs text-slate-500">
            Acesso restrito exclusivamente aos estudantes autorizados pela Coordenação.
          </p>
        </div>
      </div>

      {/* ESTADO VAZIO: SEM ESTUDANTES AUTORIZADOS */}
      {estudantesAutorizados.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-amber-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            Você ainda não possui estudantes autorizados.
          </h3>
          <p className="text-xs text-slate-500">
            Procure a Coordenação.
          </p>
        </div>
      ) : (
        <>
          {/* Navegação entre Etapas do Professor */}
          <div className="no-print mb-6 flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              onClick={() => setEtapa('dashboard')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                etapa === 'dashboard' ? 'bg-sky-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Painel & Estatísticas</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                etapa === 'dashboard' ? 'bg-sky-900 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {atividades.length}
              </span>
            </button>

            <button
              onClick={() => setEtapa('formulario')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                etapa === 'formulario' || etapa === 'validar_contexto' ? 'bg-sky-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>Nova Atividade</span>
            </button>

            {onOpenCriarPei && (
              <button
                type="button"
                onClick={() => onOpenCriarPei(estudanteId || undefined)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 ml-auto"
                title="Criar Plano Educacional Individualizado (PEI - SEDUC-GO)"
              >
                <GraduationCap className="h-4 w-4 text-emerald-700" />
                <span>Criar PEI (SEDUC-GO)</span>
              </button>
            )}

            {atividadeAtiva && (
              <>
                <button
                  onClick={() => setEtapa('revisar')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                    etapa === 'revisar' ? 'bg-sky-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Revisar Questões</span>
                </button>

                <button
                  onClick={() => setEtapa('folha_a4')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                    etapa === 'folha_a4' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Visualizar Folha A4</span>
                </button>
              </>
            )}
          </div>

          {/* ETAPA 0: PAINEL & RESUMO DE ATIVIDADES (SUMMARY DASHBOARD) */}
          {etapa === 'dashboard' && (
            <ProfessorActivityDashboard
              atividades={atividades}
              currentUser={currentUser}
              estudantes={estudantesAutorizados}
              perfisPedagogicos={perfisPedagogicos}
              onVisualizarA4={(ativ) => {
                setAtividadeAtiva(ativ);
                setEtapa('folha_a4');
                if (onVisualizarAtividadeA4) {
                  onVisualizarAtividadeA4(ativ);
                }
              }}
              onRevisarQuestao={(ativ) => {
                setAtividadeAtiva(ativ);
                setEtapa('revisar');
              }}
              onNovaAtividadeParaAluno={(alunoId) => {
                setEstudanteId(alunoId);
                setEtapa('formulario');
              }}
              onIrParaFormulario={() => setEtapa('formulario')}
              onAtualizarAtividade={onAtualizarAtividade}
            />
          )}

          {/* ETAPA 1: FORMULÁRIO DE SELEÇÃO E PARÂMETROS */}
          {etapa === 'formulario' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                
                {erroValidacao && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{erroValidacao}</span>
                  </div>
                )}

                {/* 1. Selecionar Estudante Autorizado */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      1. Selecionar Estudante Autorizado *:
                    </label>
                    {estudanteSelecionado && (
                      <button
                        type="button"
                        onClick={() => handleBaixarRelatorioConsolidado(estudanteSelecionado)}
                        disabled={baixandoConsolidado}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center gap-1.5 border border-sky-300 transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-60 shadow-2xs"
                        title="Baixar Relatório Consolidado em PDF de todo o histórico pedagógico e acompanhamento de apoio"
                      >
                        {baixandoConsolidado ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-700" />
                        ) : (
                          <FileDown className="h-3.5 w-3.5 text-sky-700" />
                        )}
                        <span>Gerar Relatório PDF</span>
                      </button>
                    )}
                  </div>

                  {feedbackDownloadConsolidado && (
                    <div className="mb-2 p-2.5 bg-sky-100 border border-sky-300 rounded-xl text-xs text-sky-900 font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-sky-700 shrink-0" />
                      <span>{feedbackDownloadConsolidado}</span>
                    </div>
                  )}

                  <select
                    value={estudanteId}
                    onChange={(e) => setEstudanteId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-white"
                  >
                    <option value="">Selecione o estudante</option>
                    {estudantesAutorizados.map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.nome} — Turma: {est.turma} ({est.anoSerie})
                      </option>
                    ))}
                  </select>

                  {/* Banner de Detecção Automática de Letra Bastão (Diretriz SEDUC-GO) */}
                  {avisoLetraBastaoAuto && (
                    <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-start gap-2 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <strong className="block text-[11px] uppercase tracking-wide text-emerald-900 font-black">
                          Acessibilidade Pedagógica Oficial (SEDUC-GO):
                        </strong>
                        <p className="mt-0.5 leading-snug">{avisoLetraBastaoAuto}</p>
                      </div>
                    </div>
                  )}

                  {/* Comunicação e Retroalimentação com o Diário de Bordo do Profissional de Apoio */}
                  {relatoApoioDetectado && (
                    <div className={`mt-2.5 p-3 rounded-xl border text-xs space-y-2 shadow-2xs ${
                      relatoApoioDetectado.houveDificuldade 
                        ? 'bg-amber-50/95 border-amber-300 text-amber-950' 
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-amber-950">
                          <HeartHandshake className="h-4 w-4 text-amber-700 shrink-0" />
                          <span>Retroalimentação do Diário de Bordo do Apoio (PAE):</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold">
                          {new Date(relatoApoioDetectado.registro.data).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-[11.5px] italic leading-relaxed text-slate-700 bg-white/80 p-2 rounded-lg border border-slate-200">
                        "{relatoApoioDetectado.texto}"
                      </p>
                      {relatoApoioDetectado.houveDificuldade ? (
                        <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-[11px] font-extrabold text-amber-950 flex items-center gap-1">
                            <span>⚠️ Apoio relatou dificuldade/não realização na aula anterior.</span>
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-[11px] text-amber-950 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                            <input
                              type="checkbox"
                              checked={aplicarAjusteApoio}
                              onChange={(e) => setAplicarAjusteApoio(e.target.checked)}
                              className="rounded text-amber-700"
                            />
                            <span>Calibrar Próxima Atividade Automaticamente</span>
                          </label>
                        </div>
                      ) : (
                        <p className="text-[10.5px] text-emerald-800 font-medium">
                          ✓ Último atendimento registrado com participação pedagógica satisfatória.
                        </p>
                      )}
                    </div>
                  )}

                  {estudanteId && !perfilAutorizado && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-medium">
                      Atenção: Este estudante ainda não possui Perfil Pedagógico aprovado pela Coordenação. A geração da atividade requer o perfil cadastrado.
                    </div>
                  )}

                  {perfilAutorizado && (
                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase">
                        Adaptações Autorizadas pelo Perfil Pedagógico:
                      </span>
                      <p className="text-slate-600">
                        <strong>Estratégia:</strong> {perfilAutorizado.estrategiasRecomendadas || 'Padrão'}
                      </p>
                      <p className="text-slate-600">
                        <strong>Alternativas recomendadas:</strong> {perfilAutorizado.quantidadeAlternativas} opções • 
                        <strong> Enunciados:</strong> {perfilAutorizado.extensaoEnunciados}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Selecionar Disciplina */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    2. Disciplina *:
                  </label>
                  <input
                    type="text"
                    value={disciplina}
                    onChange={(e) => setDisciplina(e.target.value)}
                    placeholder="Informe a disciplina (ex: Ciências, História, Matemática)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold"
                  />
                </div>

                {/* 3. Informar Conteúdo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    3. Conteúdo a ser trabalhado *:
                  </label>
                  <input
                    type="text"
                    value={conteudo}
                    onChange={(e) => setConteudo(e.target.value)}
                    placeholder="Digite o conteúdo (ex: Fotossíntese e respiração celular)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold"
                  />
                </div>

                {/* 4. Selecionar Habilidade da Matriz Curricular SEDUC-GO */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      4. Habilidade da Matriz Curricular SEDUC-GO 2026 *:
                    </label>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      {habilidadesFiltradas.length} habilidades disponíveis
                    </span>
                  </div>

                  {habilidadesFiltradas.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold">
                      Aguardando seleção do estudante ou digite a disciplina para buscar na matriz.
                    </div>
                  ) : (
                    <select
                      value={habilidadeId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHabilidadeId(val);
                        const sel = habilidadesFiltradas.find(h => h.id === val || h.codigo === val || h.skillCode === val);
                        if (sel && sel.objetoConhecimento && !conteudo) {
                          setConteudo(sel.objetoConhecimento);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-white"
                    >
                      <option value="">Selecione a habilidade da matriz</option>
                      {habilidadesFiltradas.map((hab) => {
                        const cod = 'skillCode' in hab ? hab.skillCode : hab.codigo;
                        const disc = 'subject' in hab ? hab.subject : hab.disciplina;
                        const serie = 'grade' in hab ? hab.grade : hab.serie;
                        const desc = 'skillDescription' in hab ? hab.skillDescription : hab.descricao;
                        const pag = hab.sourcePage ? ` • Pág. ${hab.sourcePage}` : '';
                        const idVal = hab.id || cod;
                        return (
                          <option key={idVal} value={idVal}>
                            [{cod}] {disc} ({serie}){pag}: {desc.slice(0, 90)}...
                          </option>
                        );
                      })}
                    </select>
                  )}
                  {habilidadeSelecionada && (
                    <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-0.5">
                      <div className="font-bold flex items-center justify-between">
                        <span>Código: {'skillCode' in habilidadeSelecionada ? habilidadeSelecionada.skillCode : habilidadeSelecionada.codigo}</span>
                        {habilidadeSelecionada.sourcePage && (
                          <span className="text-[10px] bg-emerald-200/80 px-1.5 py-0.2 rounded font-bold">
                            Matriz Oficial SEDUC-GO • Pág. {habilidadeSelecionada.sourcePage}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 italic">
                        {'skillDescription' in habilidadeSelecionada ? habilidadeSelecionada.skillDescription : habilidadeSelecionada.descricao}
                      </p>
                      {habilidadeSelecionada.objetoConhecimento && (
                        <p className="text-[11px] text-slate-600 font-medium">
                          <strong>Objeto de Conhecimento:</strong> {habilidadeSelecionada.objetoConhecimento}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Formato Tipográfico Pedagógico e Apoio Visual (A4) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      5. Formato Tipográfico e Apoio Visual da Folha A4 *:
                    </label>
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">
                      Acessibilidade Pedagógica
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Opção 1: Somente Letra Bastão */}
                    <button
                      type="button"
                      onClick={() => setEstiloTipograficoVisual('letra_bastao')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        estiloTipograficoVisual === 'letra_bastao'
                          ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-black text-sm text-sky-900 bg-sky-100 px-1.5 py-0.5 rounded">
                          A B C
                        </span>
                        <strong className="text-xs font-bold text-slate-900">
                          Somente Letra Bastão (CAIXA ALTA)
                        </strong>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Enunciados e alternativas em letras de fôrma maiúsculas para facilitar a decodificação imediata.
                      </p>
                    </button>

                    {/* Opção 2: Letra Bastão com Desenho Temático da Matriz */}
                    <button
                      type="button"
                      onClick={() => setEstiloTipograficoVisual('letra_bastao_desenho_matriz')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        estiloTipograficoVisual === 'letra_bastao_desenho_matriz'
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">🎨</span>
                        <strong className="text-xs font-bold text-slate-900">
                          Bastão + Desenho Temático da Matriz
                        </strong>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Ilustração vetorial SVG nítida ligada ao conteúdo da matriz para ancoragem visual e compreensão.
                      </p>
                    </button>

                    {/* Opção 3: Letra Cursiva com Pauta Caligráfica */}
                    <button
                      type="button"
                      onClick={() => setEstiloTipograficoVisual('letra_cursiva')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        estiloTipograficoVisual === 'letra_cursiva'
                          ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">✍️</span>
                        <strong className="text-xs font-bold text-slate-900">
                          Letra Cursiva (Pauta & Pontilhado)
                        </strong>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Pauta de 4 linhas com traçado pontilhado para desenvolvimento motor e caligrafia guiada.
                      </p>
                    </button>

                    {/* Opção 4: Letra Bastão e Cursiva Lado a Lado */}
                    <button
                      type="button"
                      onClick={() => setEstiloTipograficoVisual('letra_bastao_e_cursiva')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        estiloTipograficoVisual === 'letra_bastao_e_cursiva'
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">🔀</span>
                        <strong className="text-xs font-bold text-slate-900">
                          Bastão e Cursiva Lado a Lado
                        </strong>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Formato de transição: modelo de leitura em bastão com espaço de treino cursivo pareado.
                      </p>
                    </button>

                    {/* Opção 5: Somente com Desenhos / Apoio Visual Lúdico (Pictográfico / Pareamento / Colorir) */}
                    <button
                      type="button"
                      onClick={() => setEstiloTipograficoVisual('so_desenhos')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer sm:col-span-2 ${
                        estiloTipograficoVisual === 'so_desenhos'
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">🖼️</span>
                        <strong className="text-xs font-bold text-slate-900">
                          Somente com Desenhos / Apoio Visual Lúdico (Atividade Pictográfica / Pareamento / Colorir)
                        </strong>
                        <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                          TEA / DI / Alfabetização Inicial
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">
                        Atividade com foco 100% visual: desenhos temáticos alinhados à matriz para colorir, ligar, contornar e associar sem sobrecarga de leitura textual.
                      </p>
                    </button>
                  </div>

                  {/* Sub-opção de estilo do desenho quando desenho está ativo */}
                  {(estiloTipograficoVisual === 'letra_bastao_desenho_matriz' || estiloTipograficoVisual === 'so_desenhos') && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Estilo das Ilustrações SVG:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEstiloDesenho('preto_e_branco_colorir')}
                          className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer transition-colors ${
                            estiloDesenho === 'preto_e_branco_colorir'
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          ★ Preto e Branco (para Colorir)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEstiloDesenho('colorido')}
                          className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer transition-colors ${
                            estiloDesenho === 'colorido'
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          ★ Colorido Didático
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Quantidade e Tipo de Questões */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      6. Tipo de Questões *:
                    </label>
                    <select
                      value={tipoQuestoes}
                      onChange={(e) => setTipoQuestoes(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold bg-white"
                    >
                      <option value="multipla_escolha">Múltipla Escolha Adaptada</option>
                      <option value="verdadeiro_falso">Verdadeiro ou Falso</option>
                      <option value="discursiva">Discursiva Guiada com Pauta</option>
                      <option value="associacao">Associação de Colunas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Quantidade de Questões:
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((qtd) => (
                        <button
                          key={qtd}
                          type="button"
                          onClick={() => setQuantidadeQuestoes(qtd)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                            quantidadeQuestoes === qtd ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
                          }`}
                        >
                          {qtd}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6. Observação Adicional */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    6. Observação Adicional do Professor:
                  </label>
                  <textarea
                    rows={2}
                    value={observacaoProfessor}
                    onChange={(e) => setObservacaoProfessor(e.target.value)}
                    placeholder="Instrução específica ou recomendação da aula"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                {/* 7. Alinhamento ao PEI (Plano de Ensino Individualizado) */}
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setAlinhadaAoPei(!alinhadaAoPei)}
                        className={`mt-0.5 h-5 w-5 rounded-md flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs ${
                          alinhadaAoPei 
                            ? 'bg-emerald-700 text-white' 
                            : 'bg-white border border-slate-300 text-transparent hover:border-emerald-500'
                        }`}
                        title="Alternar marcação de alinhamento ao PEI"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </button>
                      <div>
                        <div 
                          onClick={() => setAlinhadaAoPei(!alinhadaAoPei)}
                          className="cursor-pointer flex items-center gap-2 flex-wrap"
                        >
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Atividade Alinhada ao PEI
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            alinhadaAoPei ? 'bg-emerald-200/90 text-emerald-900' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {alinhadaAoPei ? 'Inclusão Ativa' : 'Opcional'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          Marcar esta atividade como alinhada ao Plano de Ensino Individualizado (PEI) para facilitar o acompanhamento da inclusão e auditoria pedagógica.
                        </p>
                      </div>
                    </div>
                  </div>

                  {alinhadaAoPei && (
                    <div className="pt-2 border-t border-emerald-200/60">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Metas específicas do PEI atendidas nesta atividade (opcional):
                      </label>
                      <input
                        type="text"
                        value={peiAlinhamentoDetalhes}
                        onChange={(e) => setPeiAlinhamentoDetalhes(e.target.value)}
                        placeholder="Ex: Habilidade adaptada com apoio visual e vocabulário acessível conforme metas do PEI."
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>
                  )}
                </div>

                {/* Botão de Validação e Geração */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleValidarContexto}
                    disabled={habilidadesAprovadas.length === 0}
                    className="w-full py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <span>8. Validar e Gerar Atividade</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

              </div>

              {/* Coluna Direita: Minhas Atividades */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Minhas Atividades Criadas ({minhasAtividades.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEtapa('dashboard')}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 cursor-pointer flex items-center gap-1"
                    >
                      <BarChart3 className="h-3 w-3" />
                      <span>Ver Painel</span>
                    </button>
                  </div>

                  {minhasAtividades.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Nenhuma atividade criada por este professor ainda.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {minhasAtividades.map((ativ) => (
                        <div
                          key={ativ.id}
                          onClick={() => {
                            setAtividadeAtiva(ativ);
                            setEtapa('folha_a4');
                          }}
                          className="p-3 border border-slate-200 rounded-xl text-xs hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800 truncate">{ativ.conteudo}</span>
                            <div className="flex items-center gap-1">
                              {ativ.alinhadaAoPei && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300" title="Alinhada ao PEI">
                                  PEI ✓
                                </span>
                              )}
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{ativ.turma}</span>
                            </div>
                          </div>
                          <p className="text-slate-500 text-[11px]">Aluno: {ativ.estudanteNome}</p>
                          <span className="text-[10px] text-emerald-700 font-semibold mt-1 inline-block">
                            Ver folha A4 →
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: REVISAR QUESTÕES */}
          {etapa === 'revisar' && atividadeAtiva && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Revisão da Atividade Gerada
                  </h2>
                  <p className="text-xs text-slate-500">
                    Estudante: {atividadeAtiva.estudanteNome} • {atividadeAtiva.disciplina} • {atividadeAtiva.conteudo}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePeiAtividadeAtiva}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                      atividadeAtiva.alinhadaAoPei
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                    }`}
                    title="Alternar alinhamento ao PEI"
                  >
                    <CheckCircle2 className={`h-3.5 w-3.5 ${atividadeAtiva.alinhadaAoPei ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{atividadeAtiva.alinhadaAoPei ? 'Alinhada ao PEI ✓' : 'Marcar Alinhada ao PEI'}</span>
                  </button>
                  <button
                    onClick={() => setEtapa('folha_a4')}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Avançar para Folha A4</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Card Destacado de Status do PEI durante Revisão */}
              <div className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                atividadeAtiva.alinhadaAoPei 
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                    atividadeAtiva.alinhadaAoPei ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm block">
                      {atividadeAtiva.alinhadaAoPei ? 'Atividade Vinculada ao PEI' : 'Atividade Não Vinculada ao PEI'}
                    </span>
                    <span className="text-[11px] opacity-80 block">
                      {atividadeAtiva.alinhadaAoPei 
                        ? (atividadeAtiva.peiAlinhamentoDetalhes || `Objetivos e adaptações alinhados para ${atividadeAtiva.estudanteNome}.`)
                        : 'Clique no botão ao lado para vincular esta atividade às metas do PEI do aluno.'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePeiAtividadeAtiva}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs shrink-0 ${
                    atividadeAtiva.alinhadaAoPei
                      ? 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{atividadeAtiva.alinhadaAoPei ? 'Desmarcar do PEI' : 'Vincular ao PEI Agora'}</span>
                </button>
              </div>

              <div className="space-y-4">
                {atividadeAtiva.questoes.map((q) => (
                  <div key={q.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2 text-xs">
                    <span className="font-bold text-slate-800">Questão {q.numero} ({q.tipo}):</span>
                    <textarea
                      rows={2}
                      value={q.enunciado}
                      onChange={(e) => handleEditQuestao({ ...q, enunciado: e.target.value })}
                      className="w-full p-2 border rounded bg-white text-xs"
                    />
                    {q.alternativas && (
                      <div className="space-y-1 pl-2">
                        {q.alternativas.map((alt, idx) => (
                          <p key={idx} className="text-slate-700 font-mono text-[11px]">{alt}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ETAPA 3: VISUALIZAR FOLHA A4 & GERAR PDF */}
          {etapa === 'folha_a4' && atividadeAtiva && (
            <div className="flex flex-col items-center">
              <div className="no-print mb-4 w-full max-w-4xl flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEtapa('dashboard')}
                    className="text-xs font-bold text-slate-700 hover:text-sky-800 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    <BarChart3 className="h-3.5 w-3.5 text-sky-700" />
                    <span>Voltar ao Painel</span>
                  </button>
                  <button
                    onClick={() => setEtapa('formulario')}
                    className="text-xs font-bold text-slate-600 hover:text-sky-700 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Parâmetros</span>
                  </button>

                  {/* Botão de Toggle PEI direto na Folha A4 */}
                  <button
                    onClick={handleTogglePeiAtividadeAtiva}
                    className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer shadow-2xs transition-colors ${
                      atividadeAtiva.alinhadaAoPei
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700'
                        : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-300'
                    }`}
                    title="Alternar marcação de alinhamento ao PEI"
                  >
                    <CheckCircle2 className={`h-3.5 w-3.5 ${atividadeAtiva.alinhadaAoPei ? 'text-white' : 'text-emerald-600'}`} />
                    <span>{atividadeAtiva.alinhadaAoPei ? 'Alinhada ao PEI ✓' : 'Marcar Alinhada ao PEI'}</span>
                  </button>
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  Folha A4 formatada com margens de 15 mm e cabeçalho oficial
                </span>
              </div>

              <A4SheetPreview
                atividade={atividadeAtiva}
                escolaConfig={escolaConfig}
                onEditQuestao={handleEditQuestao}
              />
            </div>
          )}
        </>
      )}

    </div>
  );
};
