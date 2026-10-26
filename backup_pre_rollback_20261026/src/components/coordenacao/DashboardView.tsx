import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Filter, 
  Layers, 
  Calendar, 
  GraduationCap, 
  FileText, 
  Eye, 
  Sparkles, 
  CheckCircle2, 
  Award, 
  HeartHandshake, 
  Clock, 
  Download, 
  School,
  ChevronDown,
  RotateCcw,
  Check
} from 'lucide-react';
import { 
  AtividadeAdaptada, 
  PerfilPedagogico, 
  Estudante, 
  EscolaConfig, 
  RegistroAcompanhamentoApoio 
} from '../../types';

export interface DashboardViewProps {
  atividades: AtividadeAdaptada[];
  registrosApoio?: RegistroAcompanhamentoApoio[];
  estudantes: Estudante[];
  perfisPedagogicos?: PerfilPedagogico[];
  escolaConfig?: EscolaConfig;
  onNavigateToTab?: (tabId: string) => void;
  onVisualizarAtividade?: (atividade: AtividadeAdaptada) => void;
  onOpenRelatorioTrimestral?: () => void;
  onOpenRelatorioPdi?: () => void;
}

export type TipoIntervaloData = 
  | 'mes_atual'
  | 'mes_anterior'
  | 'ultimos_7_dias'
  | 'ultimos_15_dias'
  | 'ultimos_30_dias'
  | 'ano_letivo'
  | 'personalizado';

/**
 * Extrai data canônica no formato YYYY-MM-DD a partir de qualquer string (PT-BR, ISO, Timestamp)
 */
export function extrairDataIso(dataStr?: string): string {
  if (!dataStr) return '';
  const matchPtBr = dataStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchPtBr) {
    const dia = matchPtBr[1].padStart(2, '0');
    const mes = matchPtBr[2].padStart(2, '0');
    const ano = matchPtBr[3];
    return `${ano}-${mes}-${dia}`;
  }
  const matchIso = dataStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return matchIso[0];
  }
  const d = new Date(dataStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return '';
}

/**
 * Formata YYYY-MM-DD para DD/MM
 */
function formatarDiaMes(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return isoDate;
}

/**
 * Normaliza o nome da turma para agrupamentos consistentes
 */
function normalizarTurma(t?: string): string {
  if (!t) return 'Sem turma';
  return t.replace(' Ano ', 'º ').replace(' ano ', 'º ').trim();
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  atividades,
  registrosApoio = [],
  estudantes,
  perfisPedagogicos = [],
  escolaConfig,
  onNavigateToTab,
  onVisualizarAtividade,
  onOpenRelatorioTrimestral,
  onOpenRelatorioPdi,
}) => {
  // Intervalo de Datas — 'mes_atual' como padrão obrigatório
  const [tipoIntervalo, setTipoIntervalo] = useState<TipoIntervaloData>('mes_atual');
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<string>('');
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<string>('');
  
  // Filtro opcional por turma para afunilamento
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [tipoGraficoLinha, setTipoGraficoLinha] = useState<'linha' | 'area'>('linha');

  // Calcula datas de início e fim baseadas no seletor de intervalo
  const { dataInicio, dataFim, rotuloPeriodo } = useMemo(() => {
    const now = new Date();
    const anoAtual = now.getFullYear();
    const mesAtual = now.getMonth(); // 0 a 11

    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    if (tipoIntervalo === 'mes_atual') {
      const primeiroDia = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-01`;
      const ultimoDiaNum = new Date(anoAtual, mesAtual + 1, 0).getDate();
      const ultimoDia = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`;
      return {
        dataInicio: primeiroDia,
        dataFim: ultimoDia,
        rotuloPeriodo: `${mesesNomes[mesAtual]} de ${anoAtual} (Mês Atual)`
      };
    }

    if (tipoIntervalo === 'mes_anterior') {
      const mesAnt = mesAtual === 0 ? 11 : mesAtual - 1;
      const anoAnt = mesAtual === 0 ? anoAtual - 1 : anoAtual;
      const primeiroDia = `${anoAnt}-${String(mesAnt + 1).padStart(2, '0')}-01`;
      const ultimoDiaNum = new Date(anoAnt, mesAnt + 1, 0).getDate();
      const ultimoDia = `${anoAnt}-${String(mesAnt + 1).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`;
      return {
        dataInicio: primeiroDia,
        dataFim: ultimoDia,
        rotuloPeriodo: `${mesesNomes[mesAnt]} de ${anoAnt} (Mês Anterior)`
      };
    }

    if (tipoIntervalo === 'ultimos_7_dias') {
      const dInicio = new Date(now);
      dInicio.setDate(now.getDate() - 6);
      return {
        dataInicio: dInicio.toISOString().split('T')[0],
        dataFim: now.toISOString().split('T')[0],
        rotuloPeriodo: 'Últimos 7 dias'
      };
    }

    if (tipoIntervalo === 'ultimos_15_dias') {
      const dInicio = new Date(now);
      dInicio.setDate(now.getDate() - 14);
      return {
        dataInicio: dInicio.toISOString().split('T')[0],
        dataFim: now.toISOString().split('T')[0],
        rotuloPeriodo: 'Últimos 15 dias'
      };
    }

    if (tipoIntervalo === 'ultimos_30_dias') {
      const dInicio = new Date(now);
      dInicio.setDate(now.getDate() - 29);
      return {
        dataInicio: dInicio.toISOString().split('T')[0],
        dataFim: now.toISOString().split('T')[0],
        rotuloPeriodo: 'Últimos 30 dias'
      };
    }

    if (tipoIntervalo === 'ano_letivo') {
      return {
        dataInicio: `${anoAtual}-01-01`,
        dataFim: `${anoAtual}-12-31`,
        rotuloPeriodo: `Ano Letivo de ${anoAtual}`
      };
    }

    // Personalizado
    const dIni = dataInicioPersonalizada || `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-01`;
    const dFim = dataFimPersonalizada || now.toISOString().split('T')[0];
    return {
      dataInicio: dIni,
      dataFim: dFim,
      rotuloPeriodo: `${formatarDiaMes(dIni)} até ${formatarDiaMes(dFim)} (Personalizado)`
    };
  }, [tipoIntervalo, dataInicioPersonalizada, dataFimPersonalizada]);

  // Lista única de turmas disponíveis
  const turmasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    estudantes.forEach(e => {
      if (e.turma) set.add(normalizarTurma(e.turma));
    });
    atividades.forEach(a => {
      if (a.turma) set.add(normalizarTurma(a.turma));
    });
    registrosApoio.forEach(r => {
      if (r.turma) set.add(normalizarTurma(r.turma));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [estudantes, atividades, registrosApoio]);

  // 1. ATIVIDADES FILTRADAS PELO INTERVALO DE DATAS
  const atividadesFiltradas = useMemo(() => {
    return atividades.filter(ativ => {
      const dataIso = extrairDataIso(ativ.dataCriacao);
      if (dataIso) {
        if (dataIso < dataInicio || dataIso > dataFim) return false;
      }
      if (filtroTurma !== 'todas') {
        if (normalizarTurma(ativ.turma) !== filtroTurma) return false;
      }
      return true;
    });
  }, [atividades, dataInicio, dataFim, filtroTurma]);

  // 2. REGISTROS DO APOIO FILTRADOS PELO INTERVALO DE DATAS
  const registrosApoioFiltrados = useMemo(() => {
    return registrosApoio.filter(reg => {
      const dataIso = extrairDataIso(reg.data);
      if (dataIso) {
        if (dataIso < dataInicio || dataIso > dataFim) return false;
      }
      if (filtroTurma !== 'todas') {
        if (normalizarTurma(reg.turma) !== filtroTurma) return false;
      }
      return true;
    });
  }, [registrosApoio, dataInicio, dataFim, filtroTurma]);

  // 3. GRÁFICO DE BARRAS: VOLUME DE ATIVIDADES GERADAS POR TURMA
  const dadosAtividadesPorTurma = useMemo(() => {
    const mapa = new Map<string, { turma: string; total: number; revisadas: number; alinhadasPei: number; questoes: number }>();

    // Inicializa turmas conhecidas se filtro for 'todas'
    if (filtroTurma === 'todas') {
      turmasDisponiveis.forEach(t => {
        mapa.set(t, { turma: t, total: 0, revisadas: 0, alinhadasPei: 0, questoes: 0 });
      });
    }

    atividadesFiltradas.forEach(a => {
      const tNorm = normalizarTurma(a.turma);
      const atual = mapa.get(tNorm) || { turma: tNorm, total: 0, revisadas: 0, alinhadasPei: 0, questoes: 0 };
      atual.total += 1;
      if (a.status === 'Revisada') atual.revisadas += 1;
      if (a.alinhadaAoPei) atual.alinhadasPei += 1;
      atual.questoes += (a.questoes?.length || 3);
      mapa.set(tNorm, atual);
    });

    const lista = Array.from(mapa.values());
    // Se for 'todas', mantemos turmas com ou sem atividades, ou ordenamos por volume desc
    return lista.sort((a, b) => b.total - a.total || a.turma.localeCompare(b.turma, 'pt-BR', { numeric: true }));
  }, [atividadesFiltradas, turmasDisponiveis, filtroTurma]);

  // 4. GRÁFICO DE LINHAS: ACOMPANHAMENTO DIÁRIO DOS REGISTROS DO PROFISSIONAL DE APOIO
  const dadosAcompanhamentoDiario = useMemo(() => {
    const mapaDias = new Map<string, { dataIso: string; dataFormatada: string; totalRegistros: number; estudantesSet: Set<string>; profissionaisSet: Set<string> }>();

    // Agrupa todos os registros do apoio no período por dia
    registrosApoioFiltrados.forEach(r => {
      const dataIso = extrairDataIso(r.data);
      if (!dataIso) return;

      const atual = mapaDias.get(dataIso) || {
        dataIso,
        dataFormatada: formatarDiaMes(dataIso),
        totalRegistros: 0,
        estudantesSet: new Set<string>(),
        profissionaisSet: new Set<string>(),
      };

      atual.totalRegistros += 1;
      if (r.studentId) atual.estudantesSet.add(r.studentId);
      const profNome = r.profissionalResponsavelNome || r.usuarioRegistroNome;
      if (profNome) atual.profissionaisSet.add(profNome);
      mapaDias.set(dataIso, atual);
    });

    // Se houver poucos dias registrados, preenche os dias intermediários do mês ou intervalo para gráfico suave
    const diasOrdenados = Array.from(mapaDias.keys()).sort();
    
    // Se não houver nenhum registro no período, gera pontos com zero para exibir linha de base
    if (diasOrdenados.length === 0) {
      return [
        { dataIso: dataInicio, dataFormatada: formatarDiaMes(dataInicio), totalRegistros: 0, estudantesAtendidos: 0, profissionaisAtivos: 0 },
        { dataIso: dataFim, dataFormatada: formatarDiaMes(dataFim), totalRegistros: 0, estudantesAtendidos: 0, profissionaisAtivos: 0 },
      ];
    }

    return diasOrdenados.map(dIso => {
      const item = mapaDias.get(dIso)!;
      return {
        dataIso: item.dataIso,
        dataFormatada: item.dataFormatada,
        totalRegistros: item.totalRegistros,
        estudantesAtendidos: item.estudantesSet.size,
        profissionaisAtivos: item.profissionaisSet.size,
      };
    });
  }, [registrosApoioFiltrados, dataInicio, dataFim]);

  // Indicadores Numéricos Consolidados do Período
  const metricasPeriodo = useMemo(() => {
    const totalAtiv = atividadesFiltradas.length;
    const totalRegApoio = registrosApoioFiltrados.length;
    
    const alunosAtendidosApoio = new Set(registrosApoioFiltrados.map(r => r.studentId)).size;
    const alunosComAtividade = new Set(atividadesFiltradas.map(a => a.estudanteId)).size;
    
    // Dias letivos com atendimentos
    const diasComAtendimento = new Set(registrosApoioFiltrados.map(r => extrairDataIso(r.data))).size;
    const mediaDiaria = diasComAtendimento > 0 ? (totalRegApoio / diasComAtendimento).toFixed(1) : '0';

    const turmasAtendidas = new Set([
      ...atividadesFiltradas.map(a => normalizarTurma(a.turma)),
      ...registrosApoioFiltrados.map(r => normalizarTurma(r.turma))
    ]).size;

    return {
      totalAtiv,
      totalRegApoio,
      alunosAtendidosApoio,
      alunosComAtividade,
      mediaDiaria,
      turmasAtendidas,
    };
  }, [atividadesFiltradas, registrosApoioFiltrados]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* CABEÇALHO DO DASHBOARD E SELETOR DE INTERVALO DE DATAS */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <BarChart3 className="h-3 w-3 text-emerald-700" />
              <span>Dashboard Analítico • Recharts</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {rotuloPeriodo}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Volume de Atividades & Acompanhamento do Apoio
          </h2>
          <p className="text-xs text-slate-500">
            {escolaConfig?.nome || 'Colégio Estadual Olynto Pereira de Castro'} • SEDUC-GO
          </p>
        </div>

        {/* CONTROLES DE INTERVALO DE DATAS (MÊS ATUAL COMO PADRÃO) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          {/* Seletor Rápido de Período */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              onClick={() => setTipoIntervalo('mes_atual')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                tipoIntervalo === 'mes_atual'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Filtrar dados pelo mês atual (Padrão do sistema)"
            >
              Mês Atual
            </button>

            <button
              onClick={() => setTipoIntervalo('ultimos_7_dias')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                tipoIntervalo === 'ultimos_7_dias'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              7 dias
            </button>

            <button
              onClick={() => setTipoIntervalo('ultimos_30_dias')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                tipoIntervalo === 'ultimos_30_dias'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              30 dias
            </button>

            <button
              onClick={() => setTipoIntervalo('mes_anterior')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                tipoIntervalo === 'mes_anterior'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Mês Anterior
            </button>

            <button
              onClick={() => setTipoIntervalo('personalizado')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                tipoIntervalo === 'personalizado'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Personalizado
            </button>
          </div>

          {/* Filtro de Turma */}
          <div className="relative">
            <select
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs cursor-pointer focus:ring-2 focus:ring-emerald-500"
            >
              <option value="todas">Todas as Turmas ({turmasDisponiveis.length})</option>
              {turmasDisponiveis.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* INPUTS DE DATA QUANDO 'PERSONALIZADO' ESTIVER SELECIONADO */}
      {tipoIntervalo === 'personalizado' && (
        <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl flex flex-wrap items-center gap-3 text-xs text-emerald-900 animate-slideDown">
          <Calendar className="h-4 w-4 text-emerald-700 shrink-0" />
          <span className="font-bold">Intervalo Personalizado:</span>
          
          <div className="flex items-center gap-1.5">
            <label className="text-slate-600 font-semibold">De:</label>
            <input
              type="date"
              value={dataInicioPersonalizada || dataInicio}
              onChange={(e) => setDataInicioPersonalizada(e.target.value)}
              className="px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-slate-600 font-semibold">Até:</label>
            <input
              type="date"
              value={dataFimPersonalizada || dataFim}
              onChange={(e) => setDataFimPersonalizada(e.target.value)}
              className="px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800"
            />
          </div>
        </div>
      )}

      {/* 4 CARDS DE MÉTRICAS CONSOLIDADAS DO INTERVALO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Atividades no Período</span>
            <FileText className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metricasPeriodo.totalAtiv}</span>
            <span className="text-[11px] text-emerald-700 font-semibold">atividades</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Em {metricasPeriodo.turmasAtendidas} turmas distintas
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Registros do Apoio</span>
            <HeartHandshake className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metricasPeriodo.totalRegApoio}</span>
            <span className="text-[11px] text-indigo-700 font-semibold">diários</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {metricasPeriodo.alunosAtendidosApoio} estudantes com registros
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Média Diária de Apoio</span>
            <Clock className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metricasPeriodo.mediaDiaria}</span>
            <span className="text-[11px] text-teal-700 font-semibold">atendimentos/dia</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Frequência escolar inclusiva
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Estudantes Atendidos</span>
            <Users className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metricasPeriodo.alunosAtendidosApoio || metricasPeriodo.alunosComAtividade}</span>
            <span className="text-[11px] text-slate-500 font-semibold">de {estudantes.length} total</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Alunos com laudo ou PAE ativo
          </span>
        </div>
      </div>

      {/* GRID COM OS DOIS GRÁFICOS PRINCIPAIS RECHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRÁFICO 1: BARRAS - VOLUME DE ATIVIDADES GERADAS POR TURMA */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Volume Curricular
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <span>Atividades Geradas por Turma</span>
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Total: {metricasPeriodo.totalAtiv}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Distribuição quantitativa de atividades adaptadas confeccionadas para cada turma no período selecionado ({rotuloPeriodo}).
            </p>
          </div>

          <div className="h-72 w-full mt-2">
            {dadosAtividadesPorTurma.length > 0 && metricasPeriodo.totalAtiv > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosAtividadesPorTurma.filter(d => d.total > 0 || dadosAtividadesPorTurma.length <= 8)}
                  margin={{ top: 10, right: 10, left: -15, bottom: 35 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="turma" 
                    angle={-30} 
                    textAnchor="end" 
                    interval={0} 
                    height={45}
                    tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} 
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                            <span className="font-bold text-emerald-400 block">{label}</span>
                            <div className="flex justify-between gap-4 text-slate-200">
                              <span>Total de Atividades:</span>
                              <strong className="text-white">{data.total}</strong>
                            </div>
                            <div className="flex justify-between gap-4 text-slate-300 text-[11px]">
                              <span>Revisadas/Aprovadas:</span>
                              <span className="text-teal-300 font-semibold">{data.revisadas}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-slate-300 text-[11px]">
                              <span>Alinhadas ao PEI:</span>
                              <span className="text-indigo-300 font-semibold">{data.alinhadasPei}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: 10, fontSize: 11 }} 
                  />
                  <Bar 
                    dataKey="total" 
                    name="Atividades Geradas" 
                    fill="#059669" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="revisadas" 
                    name="Validadas" 
                    fill="#0d9488" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText className="h-10 w-10 text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-700">Nenhuma atividade gerada neste período</span>
                <span className="text-[11px] text-slate-500 max-w-xs mt-1">
                  Alterne o seletor de datas para "Últimos 30 dias" ou selecione outra turma para visualizar o histórico.
                </span>
                <button
                  onClick={() => setTipoIntervalo('ultimos_30_dias')}
                  className="mt-3 px-3 py-1 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 cursor-pointer shadow-2xs"
                >
                  Ver Últimos 30 Dias
                </button>
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: LINHAS - ACOMPANHAMENTO DOS REGISTROS DIÁRIOS DO PROFISSIONAL DE APOIO */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Acompanhamento Diário
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <span>Registros Diários do Profissional de Apoio</span>
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setTipoGraficoLinha('linha')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                    tipoGraficoLinha === 'linha' ? 'bg-indigo-700 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Linha
                </button>
                <button
                  onClick={() => setTipoGraficoLinha('area')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                    tipoGraficoLinha === 'area' ? 'bg-indigo-700 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Área
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Evolução temporal do preenchimento diário de intervenções pedagógicas e acompanhamento de estudantes inclusos.
            </p>
          </div>

          <div className="h-72 w-full mt-2">
            {dadosAcompanhamentoDiario.length > 0 && metricasPeriodo.totalRegApoio > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {tipoGraficoLinha === 'area' ? (
                  <AreaChart
                    data={dadosAcompanhamentoDiario}
                    margin={{ top: 10, right: 10, left: -15, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="corApoio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="dataFormatada" 
                      tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} 
                    />
                    <YAxis 
                      allowDecimals={false} 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                              <span className="font-bold text-indigo-400 block">{label} ({data.dataIso})</span>
                              <div className="flex justify-between gap-4 text-slate-200">
                                <span>Total de Registros:</span>
                                <strong className="text-white">{data.totalRegistros}</strong>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300 text-[11px]">
                                <span>Alunos Atendidos:</span>
                                <span className="text-emerald-300 font-semibold">{data.estudantesAtendidos}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300 text-[11px]">
                                <span>Profissionais Ativos:</span>
                                <span className="text-amber-300 font-semibold">{data.profissionaisAtivos}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: 10, fontSize: 11 }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="totalRegistros" 
                      name="Registros do Apoio" 
                      stroke="#4f46e5" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#corApoio)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="estudantesAtendidos" 
                      name="Estudantes Atendidos" 
                      stroke="#059669" 
                      strokeWidth={2} 
                      fillOpacity={0} 
                    />
                  </AreaChart>
                ) : (
                  <LineChart
                    data={dadosAcompanhamentoDiario}
                    margin={{ top: 10, right: 10, left: -15, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="dataFormatada" 
                      tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} 
                    />
                    <YAxis 
                      allowDecimals={false} 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                              <span className="font-bold text-indigo-400 block">{label} ({data.dataIso})</span>
                              <div className="flex justify-between gap-4 text-slate-200">
                                <span>Total de Registros:</span>
                                <strong className="text-white">{data.totalRegistros}</strong>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300 text-[11px]">
                                <span>Alunos Atendidos:</span>
                                <span className="text-emerald-300 font-semibold">{data.estudantesAtendidos}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300 text-[11px]">
                                <span>Profissionais Ativos:</span>
                                <span className="text-amber-300 font-semibold">{data.profissionaisAtivos}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: 10, fontSize: 11 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalRegistros" 
                      name="Registros do Apoio" 
                      stroke="#4f46e5" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#4f46e5' }} 
                      activeDot={{ r: 6 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="estudantesAtendidos" 
                      name="Estudantes Atendidos" 
                      stroke="#059669" 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#059669' }} 
                      activeDot={{ r: 5 }} 
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <HeartHandshake className="h-10 w-10 text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-700">Nenhum registro diário do apoio neste período</span>
                <span className="text-[11px] text-slate-500 max-w-xs mt-1">
                  Os profissionais de apoio realizam registros diários na aba Profissional de Apoio.
                </span>
                {onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('apoio')}
                    className="mt-3 px-3 py-1 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    Acessar Módulo Apoio
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABELA DE DETALHAMENTO CONSOLIDADO POR TURMA */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Detalhamento Pedagógico por Turma no Período
            </h4>
            <p className="text-xs text-slate-500">
              Cruzamento entre produção de atividades e registros de acompanhamento dos apoios
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
            {turmasDisponiveis.length} Turmas Cadastradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Turma</th>
                <th className="px-3 py-2.5 text-center">Atividades Geradas</th>
                <th className="px-3 py-2.5 text-center">Validadas</th>
                <th className="px-3 py-2.5 text-center">Registros do Apoio</th>
                <th className="px-3 py-2.5 text-center">Estudantes no Período</th>
                <th className="px-3 py-2.5 text-right">Status de Cobertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {turmasDisponiveis.map((turmaNome, idx) => {
                const ativsDaTurma = atividadesFiltradas.filter(a => normalizarTurma(a.turma) === turmaNome);
                const regsDaTurma = registrosApoioFiltrados.filter(r => normalizarTurma(r.turma) === turmaNome);
                const alunosComRegistro = new Set(regsDaTurma.map(r => r.studentId)).size;
                const totalAlunosTurma = estudantes.filter(e => normalizarTurma(e.turma) === turmaNome).length;

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-slate-900 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-slate-400" />
                      <span>{turmaNome}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-700">
                      {ativsDaTurma.length}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-700 font-semibold">
                      {ativsDaTurma.filter(a => a.status === 'Revisada').length}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-indigo-700">
                      {regsDaTurma.length}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">
                      {alunosComRegistro} de {totalAlunosTurma} alunos
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {ativsDaTurma.length > 0 || regsDaTurma.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Atendido
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          Sem movimentação
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
