import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  FileText, 
  Users, 
  CheckCircle2, 
  Calendar, 
  ArrowRight, 
  Search, 
  Filter, 
  Eye, 
  Edit2, 
  Printer, 
  Sparkles, 
  BookOpen, 
  Layers, 
  Award, 
  School, 
  Clock, 
  Plus, 
  HelpCircle, 
  TrendingUp, 
  Tag, 
  Check,
  X,
  CircleDashed,
  BookmarkCheck,
  MessageSquare
} from 'lucide-react';
import { 
  AtividadeAdaptada, 
  Estudante, 
  AuthorizedUser, 
  PerfilPedagogico 
} from '../../types';

interface ProfessorActivityDashboardProps {
  atividades: AtividadeAdaptada[];
  currentUser: AuthorizedUser | null;
  estudantes: Estudante[];
  perfisPedagogicos: PerfilPedagogico[];
  onVisualizarA4: (atividade: AtividadeAdaptada) => void;
  onRevisarQuestao: (atividade: AtividadeAdaptada) => void;
  onNovaAtividadeParaAluno?: (estudanteId: string) => void;
  onIrParaFormulario: () => void;
  onGerarExemploDemonstracao?: () => void;
  onAtualizarAtividade?: (atividade: AtividadeAdaptada) => void;
}

export const ProfessorActivityDashboard: React.FC<ProfessorActivityDashboardProps> = ({
  atividades,
  currentUser,
  estudantes,
  perfisPedagogicos,
  onVisualizarA4,
  onRevisarQuestao,
  onNovaAtividadeParaAluno,
  onIrParaFormulario,
  onGerarExemploDemonstracao,
  onAtualizarAtividade,
}) => {
  const [buscaTexto, setBuscaTexto] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState<string>('todas');
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPei, setFiltroPei] = useState<'todos' | 'alinhados' | 'nao_alinhados'>('todos');
  const [apenasMinhas, setApenasMinhas] = useState<boolean>(false);
  const [feedbackPei, setFeedbackPei] = useState<{ id: string; mensagem: string; alinhada: boolean } | null>(null);
  const [modalNotaPeiAtiv, setModalNotaPeiAtiv] = useState<AtividadeAdaptada | null>(null);
  const [notaPeiEditando, setNotaPeiEditando] = useState<string>('');

  // Atividades deste professor ou todas se for visualização geral
  const atividadesDoProfessor = useMemo(() => {
    if (!currentUser) return atividades;
    if (!apenasMinhas) return atividades;
    return atividades.filter(
      a => a.professorId === currentUser.id || 
           a.professorId === currentUser.uid || 
           !a.professorId || 
           a.professorId === 'prof-default'
    );
  }, [atividades, currentUser, apenasMinhas]);

  // Estatísticas Principais
  const estatisticas = useMemo(() => {
    const total = atividadesDoProfessor.length;
    const estudantesComAtividade = new Set(atividadesDoProfessor.map(a => a.estudanteId)).size;
    const turmasComAtividade = new Set(atividadesDoProfessor.map(a => a.turma)).size;
    const totalQuestoes = atividadesDoProfessor.reduce((acc, a) => acc + (a.quantidadeQuestoes || a.questoes?.length || 0), 0);
    const revisadas = atividadesDoProfessor.filter(a => a.status === 'Revisada').length;
    const taxaRevisao = total > 0 ? Math.round((revisadas / total) * 100) : 0;
    const mediaQuestoes = total > 0 ? (totalQuestoes / total).toFixed(1) : '0';

    // Alinhamento ao PEI
    const totalAlinhadasPei = atividadesDoProfessor.filter(a => a.alinhadaAoPei).length;
    const percentualPei = total > 0 ? Math.round((totalAlinhadasPei / total) * 100) : 0;

    // Agrupamento por disciplina
    const disciplinasMap = new Map<string, number>();
    atividadesDoProfessor.forEach(a => {
      const disc = a.disciplina || 'Outras';
      disciplinasMap.set(disc, (disciplinasMap.get(disc) || 0) + 1);
    });
    const porDisciplina = Array.from(disciplinasMap.entries())
      .map(([nome, quantidade]) => ({
        nome,
        quantidade,
        percentual: total > 0 ? Math.round((quantidade / total) * 100) : 0
      }))
      .sort((a, b) => b.quantidade - a.quantidade);

    // Agrupamento por turma
    const turmasMap = new Map<string, number>();
    atividadesDoProfessor.forEach(a => {
      const turma = a.turma || 'Sem turma';
      turmasMap.set(turma, (turmasMap.get(turma) || 0) + 1);
    });
    const porTurma = Array.from(turmasMap.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);

    // Agrupamento por tipo de questões
    const tiposMap = new Map<string, number>();
    atividadesDoProfessor.forEach(a => {
      const tipo = a.tipoQuestoes || 'multipla_escolha';
      const label = tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 
                    tipo === 'discursiva' ? 'Discursiva' : 
                    tipo === 'verdadeiro_falso' ? 'Verdadeiro ou Falso' : 'Associação';
      tiposMap.set(label, (tiposMap.get(label) || 0) + 1);
    });
    const porTipo = Array.from(tiposMap.entries()).map(([tipo, quantidade]) => ({ tipo, quantidade }));

    return {
      total,
      estudantesComAtividade,
      turmasComAtividade,
      totalQuestoes,
      revisadas,
      taxaRevisao,
      mediaQuestoes,
      totalAlinhadasPei,
      percentualPei,
      porDisciplina,
      porTurma,
      porTipo
    };
  }, [atividadesDoProfessor]);

  // Função para marcar/desmarcar atividade como Alinhada ao PEI
  const handleToggleAlinhamentoPei = (ativ: AtividadeAdaptada) => {
    const novoStatus = !ativ.alinhadaAoPei;
    const agora = new Date().toISOString();
    const professorNome = currentUser?.name || ativ.professorNome || 'Professor Regente';

    const atualizada: AtividadeAdaptada = {
      ...ativ,
      alinhadaAoPei: novoStatus,
      peiAlinhadoEm: novoStatus ? agora : undefined,
      peiAlinhadoPor: novoStatus ? professorNome : undefined,
      peiAlinhamentoDetalhes: novoStatus 
        ? (ativ.peiAlinhamentoDetalhes || `Atividade alinhada aos objetivos e adaptações do PEI de ${ativ.estudanteNome}.`)
        : undefined
    };

    onAtualizarAtividade?.(atualizada);

    setFeedbackPei({
      id: ativ.id,
      mensagem: novoStatus 
        ? `Atividade de ${ativ.estudanteNome} marcada como "Alinhada ao PEI"!` 
        : `Marcação de alinhamento ao PEI removida da atividade de ${ativ.estudanteNome}.`,
      alinhada: novoStatus
    });

    setTimeout(() => {
      setFeedbackPei(null);
    }, 3500);
  };

  // Lista de disciplinas e turmas para os selects de filtro
  const disciplinasDisponiveis = useMemo(() => {
    return Array.from(new Set(atividadesDoProfessor.map(a => a.disciplina).filter(Boolean))).sort();
  }, [atividadesDoProfessor]);

  const turmasDisponiveis = useMemo(() => {
    return Array.from(new Set(atividadesDoProfessor.map(a => a.turma).filter(Boolean))).sort();
  }, [atividadesDoProfessor]);

  // Lista filtrada e ordenada (mais recentes primeiro)
  const atividadesFiltradas = useMemo(() => {
    return atividadesDoProfessor
      .filter(a => {
        if (filtroDisciplina !== 'todas' && a.disciplina !== filtroDisciplina) return false;
        if (filtroTurma !== 'todas' && a.turma !== filtroTurma) return false;
        if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false;
        if (filtroPei === 'alinhados' && !a.alinhadaAoPei) return false;
        if (filtroPei === 'nao_alinhados' && a.alinhadaAoPei) return false;
        if (buscaTexto.trim()) {
          const t = buscaTexto.toLowerCase();
          const matchAluno = a.estudanteNome?.toLowerCase().includes(t);
          const matchConteudo = a.conteudo?.toLowerCase().includes(t);
          const matchDisc = a.disciplina?.toLowerCase().includes(t);
          const matchHab = a.habilidadeCodigo?.toLowerCase().includes(t);
          const matchTurma = a.turma?.toLowerCase().includes(t);
          return matchAluno || matchConteudo || matchDisc || matchHab || matchTurma;
        }
        return true;
      })
      .sort((a, b) => {
        const dataA = new Date(a.dataCriacao || 0).getTime();
        const dataB = new Date(b.dataCriacao || 0).getTime();
        return dataB - dataA;
      });
  }, [atividadesDoProfessor, filtroDisciplina, filtroTurma, filtroStatus, filtroPei, buscaTexto]);

  const formatarDataHora = (isoStr: string) => {
    if (!isoStr) return 'Data recente';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. CABEÇALHO DO DASHBOARD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              <span>Painel de Atividades Adaptadas</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Espaço do Professor
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Estatísticas & Histórico de Atividades Adaptadas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas de produção pedagógica, cobertura por estudantes e acesso rápido às adaptações mais recentes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onIrParaFormulario}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Criar Nova Atividade</span>
          </button>
        </div>
      </div>

      {/* BANNER DE FEEDBACK VISUAL DE ALINHAMENTO AO PEI */}
      {feedbackPei && (
        <div className={`p-4 rounded-2xl border text-xs shadow-xs flex items-center justify-between gap-3 transition-all animate-fadeIn ${
          feedbackPei.alinhada
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
              feedbackPei.alinhada ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-amber-500 text-white shadow-2xs'
            }`}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm flex items-center gap-2">
                <span>{feedbackPei.mensagem}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  feedbackPei.alinhada ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-200/80 text-amber-900'
                }`}>
                  {feedbackPei.alinhada ? 'Inclusão PEI Ativa' : 'Atualizado'}
                </span>
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {feedbackPei.alinhada
                  ? 'A atividade foi vinculada ao acompanhamento da inclusão e validada com os objetivos individuais do estudante.'
                  : 'A marcação de inclusão ao PEI foi removida da atividade.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackPei(null)}
            className="p-1.5 rounded-xl hover:bg-black/5 cursor-pointer text-slate-500 transition-colors"
            title="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. CARDS DE MÉTRICAS PRINCIPAIS (STAT CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total de Atividades */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Atividades Criadas</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
              {estatisticas.total}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              {estatisticas.total === 1 ? '1 atividade registrada' : `${estatisticas.total} atividades registradas`}
            </span>
          </div>
        </div>

        {/* Estudantes Atendidos */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Alunos Atendidos</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 leading-none">
              {estatisticas.estudantesComAtividade}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              de {estudantes.length} estudantes autorizados
            </span>
          </div>
        </div>

        {/* Questões Adaptadas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Questões Geradas</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <HelpCircle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-indigo-700 leading-none">
              {estatisticas.totalQuestoes}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Média de {estatisticas.mediaQuestoes} questões / atividade
            </span>
          </div>
        </div>

        {/* Revisadas / Concluídas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Revisão Pedagógica</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-amber-700 leading-none">
              {estatisticas.revisadas}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              {estatisticas.taxaRevisao}% com revisão concluída
            </span>
          </div>
        </div>

        {/* Alinhadas ao PEI (Acompanhamento da Inclusão) */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <span>Alinhadas ao PEI</span>
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 leading-none">
                {estatisticas.totalAlinhadasPei}
              </span>
              <span className="text-xs font-bold text-emerald-800">
                de {estatisticas.total}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${estatisticas.percentualPei}%` }}
                />
              </div>
              <span className="text-[10px] font-extrabold text-emerald-800">
                {estatisticas.percentualPei}%
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. DISTRIBUIÇÃO PEDAGÓGICA (DISCIPLINAS & TURMAS) */}
      {estatisticas.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Distribuição por Disciplina */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-sky-700" />
                <span>Distribuição por Disciplina</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">
                {estatisticas.porDisciplina.length} disciplinas atendidas
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {estatisticas.porDisciplina.map((item) => (
                <div key={item.nome} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{item.nome}</span>
                    <span className="text-slate-500 font-semibold text-[11px]">
                      {item.quantidade} {item.quantidade === 1 ? 'atividade' : 'atividades'} ({item.percentual}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-sky-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percentual}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distribuição por Turma / Sala & Tipos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <School className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Salas / Turmas Cobertas</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {estatisticas.turmasComAtividade} salas com atividades
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {estatisticas.porTurma.map((turma) => (
                  <span
                    key={turma.nome}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
                  >
                    <span>{turma.nome}</span>
                    <span className="bg-emerald-100 text-emerald-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                      {turma.quantidade}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-2">
                Tipos de Questões Criadas:
              </span>
              <div className="flex flex-wrap gap-2">
                {estatisticas.porTipo.map((item) => (
                  <div 
                    key={item.tipo}
                    className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
                    <span>{item.tipo}:</span>
                    <span className="font-bold text-slate-900">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. LISTA DAS ADAPTAÇÕES MAIS RECENTES (RECENT ADAPTATIONS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Cabeçalho da Lista & Filtros de Busca */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-700" />
                <span>Adaptações Recentes</span>
                <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                  {atividadesFiltradas.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Acesse diretamente as folhas A4, revise enunciados ou gere novas atividades para o mesmo aluno.
              </p>
            </div>
          </div>

          {/* Barra de Filtros Rápidos */}
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
            <div className="relative flex-1 w-full">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por estudante, conteúdo, disciplina ou turma..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-sky-600 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setApenasMinhas(false)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    !apenasMinhas ? 'bg-white text-sky-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas ({atividades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setApenasMinhas(true)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    apenasMinhas ? 'bg-white text-sky-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Minhas
                </button>
              </div>

              {disciplinasDisponiveis.length > 0 && (
                <select
                  value={filtroDisciplina}
                  onChange={(e) => setFiltroDisciplina(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold text-xs"
                >
                  <option value="todas">Todas as Disciplinas</option>
                  {disciplinasDisponiveis.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}

              {turmasDisponiveis.length > 0 && (
                <select
                  value={filtroTurma}
                  onChange={(e) => setFiltroTurma(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold text-xs"
                >
                  <option value="todas">Todas as Turmas</option>
                  {turmasDisponiveis.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold text-xs"
              >
                <option value="todos">Todos os Status</option>
                <option value="Gerada">Geradas</option>
                <option value="Revisada">Revisadas</option>
              </select>

              <select
                value={filtroPei}
                onChange={(e) => setFiltroPei(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold text-xs font-medium"
              >
                <option value="todos">Todos os Alinhamentos</option>
                <option value="alinhados">✓ Alinhadas ao PEI ({estatisticas.totalAlinhadasPei})</option>
                <option value="nao_alinhados">Pendentes PEI ({estatisticas.total - estatisticas.totalAlinhadasPei})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela / Lista de Adaptações Recentes */}
        {atividadesFiltradas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center mx-auto">
              <FileText className="h-6 w-6 text-sky-700" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {atividadesDoProfessor.length === 0 
                ? 'Nenhuma atividade adaptada registrada ainda'
                : 'Nenhuma atividade encontrada com os filtros selecionados'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {atividadesDoProfessor.length === 0
                ? 'Selecione um estudante com perfil pedagógico aprovado para gerar a primeira atividade individualizada em conformidade com as diretrizes da escola.'
                : 'Tente alterar os termos de busca ou remover os filtros de disciplina e turma.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onIrParaFormulario}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Criar Primeira Atividade</span>
              </button>

              {onGerarExemploDemonstracao && atividades.length === 0 && (
                <button
                  type="button"
                  onClick={onGerarExemploDemonstracao}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-300 flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>Gerar Exemplos de Demonstração</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {atividadesFiltradas.map((ativ) => {
              const qtdQuestoes = ativ.quantidadeQuestoes || ativ.questoes?.length || 0;
              const isRevisada = ativ.status === 'Revisada';

              return (
                <div 
                  key={ativ.id} 
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 truncate">
                        {ativ.conteudo}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-bold text-[10px]">
                        {ativ.disciplina}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        Sala: {ativ.turma}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        isRevisada 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {ativ.status}
                      </span>

                      {/* Badge / Botão Interativo de Alinhamento ao PEI */}
                      <button
                        type="button"
                        onClick={() => handleToggleAlinhamentoPei(ativ)}
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-2xs ${
                          ativ.alinhadaAoPei
                            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
                        }`}
                        title={ativ.alinhadaAoPei ? 'Clique para desmarcar do PEI' : 'Clique para marcar como Alinhada ao PEI'}
                      >
                        <CheckCircle2 className={`h-3 w-3 ${ativ.alinhadaAoPei ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span>{ativ.alinhadaAoPei ? 'Alinhada ao PEI ✓' : 'Pendente PEI'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-slate-600 text-xs">
                      <span>
                        Estudante: <strong>{ativ.estudanteNome}</strong>
                      </span>
                      <span>•</span>
                      {ativ.habilidadeCodigo && (
                        <>
                          <span className="font-mono text-slate-500 font-semibold">
                            Habilidade: {ativ.habilidadeCodigo}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span>
                        {qtdQuestoes} {qtdQuestoes === 1 ? 'questão' : 'questões'} ({ativ.tipoQuestoes || 'múltipla escolha'})
                      </span>
                      <span>•</span>
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatarDataHora(ativ.dataCriacao)}</span>
                      </span>
                    </div>

                    {ativ.observacaoProfessor && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                        Obs: {ativ.observacaoProfessor}
                      </p>
                    )}

                    {/* Detalhamento do Alinhamento ao PEI */}
                    {ativ.alinhadaAoPei && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>PEI: {ativ.peiAlinhamentoDetalhes || `Objetivos pedagógicos e adaptações validadas para ${ativ.estudanteNome}.`}</span>
                        </span>
                        {ativ.peiAlinhadoEm && (
                          <span className="text-[10px] text-slate-400">
                            (Validado por {ativ.peiAlinhadoPor || 'Professor'} em {formatarDataHora(ativ.peiAlinhadoEm)})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setModalNotaPeiAtiv(ativ);
                            setNotaPeiEditando(ativ.peiAlinhamentoDetalhes || `Atividade alinhada aos objetivos e adaptações do PEI de ${ativ.estudanteNome}.`);
                          }}
                          className="text-[10px] text-sky-700 hover:text-sky-900 font-bold underline cursor-pointer"
                        >
                          Editar nota PEI
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ações da Atividade */}
                  <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
                    {/* Botão de Toggle PEI Rápido */}
                    <button
                      type="button"
                      onClick={() => handleToggleAlinhamentoPei(ativ)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                        ativ.alinhadaAoPei
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                      }`}
                      title={ativ.alinhadaAoPei ? 'Clique para desmarcar do PEI' : 'Clique para marcar esta atividade como Alinhada ao PEI'}
                    >
                      <CheckCircle2 className={`h-3.5 w-3.5 ${ativ.alinhadaAoPei ? 'text-emerald-200' : 'text-emerald-600'}`} />
                      <span>{ativ.alinhadaAoPei ? 'Alinhada ao PEI ✓' : 'Marcar PEI'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onVisualizarA4(ativ)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="Visualizar e imprimir Folha A4 oficial"
                    >
                      <Printer className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Folha A4</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRevisarQuestao(ativ)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Revisar enunciados e alternativas"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                      <span>Revisar</span>
                    </button>

                    {onNovaAtividadeParaAluno && (
                      <button
                        type="button"
                        onClick={() => onNovaAtividadeParaAluno(ativ.estudanteId)}
                        className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Criar nova adaptação para este estudante"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Nova p/ Aluno</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MODAL DE EDIÇÃO DE DETALHES PEDAGÓGICOS DO PEI */}
      {modalNotaPeiAtiv && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Alinhamento ao PEI da Atividade
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Estudante: <strong>{modalNotaPeiAtiv.estudanteNome}</strong> ({modalNotaPeiAtiv.turma})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNotaPeiAtiv(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Observação Pedagógica / Metas do PEI Atendidas:
              </label>
              <textarea
                rows={4}
                value={notaPeiEditando}
                onChange={(e) => setNotaPeiEditando(e.target.value)}
                placeholder="Ex: Atividade adaptada com recursos visuais e enunciados curtos, em conformidade com as metas do PEI do 2º bimestre."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400">
                Esta anotação facilita o acompanhamento pela Coordenação Pedagógica e pelo Professor de Apoio.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalNotaPeiAtiv(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const atualizada: AtividadeAdaptada = {
                    ...modalNotaPeiAtiv,
                    alinhadaAoPei: true,
                    peiAlinhamentoDetalhes: notaPeiEditando.trim() || undefined,
                    peiAlinhadoEm: new Date().toISOString(),
                    peiAlinhadoPor: currentUser?.name || modalNotaPeiAtiv.professorNome || 'Professor'
                  };
                  onAtualizarAtividade?.(atualizada);
                  setFeedbackPei({
                    id: modalNotaPeiAtiv.id,
                    mensagem: `Nota do PEI atualizada para a atividade de ${modalNotaPeiAtiv.estudanteNome}!`,
                    alinhada: true
                  });
                  setModalNotaPeiAtiv(null);
                  setTimeout(() => setFeedbackPei(null), 3500);
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Salvar Alinhamento ao PEI
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
