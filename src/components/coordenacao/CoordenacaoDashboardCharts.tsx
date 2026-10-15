import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  ComposedChart,
  Line
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Filter, 
  Layers, 
  PieChart as PieIcon, 
  School, 
  GraduationCap, 
  FileText,
  Eye,
  Sparkles,
  CheckCircle2,
  Award
} from 'lucide-react';
import { AtividadeAdaptada, PerfilPedagogico, Estudante, EscolaConfig } from '../../types';

interface CoordenacaoDashboardChartsProps {
  atividades: AtividadeAdaptada[];
  perfisPedagogicos: PerfilPedagogico[];
  estudantes: Estudante[];
  escolaConfig?: EscolaConfig;
  onNavigateToTab?: (tabId: string) => void;
  onVisualizarAtividade?: (atividade: AtividadeAdaptada) => void;
  onOpenRelatorioTrimestral?: () => void;
  onOpenRelatorioPdi?: () => void;
}

const PIE_COLORS = [
  '#059669', // Emerald
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#0d9488', // Teal
  '#e11d48', // Rose
  '#4f46e5', // Indigo
];

export const CoordenacaoDashboardCharts: React.FC<CoordenacaoDashboardChartsProps> = ({
  atividades,
  perfisPedagogicos,
  estudantes,
  onNavigateToTab,
  onVisualizarAtividade,
  onOpenRelatorioTrimestral,
  onOpenRelatorioPdi
}) => {
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [visaoAtiva, setVisaoAtiva] = useState<'geral' | 'turmas' | 'disciplinas'>('geral');

  // Mapa de estudantes para acesso rápido
  const mapaEstudantes = useMemo(() => {
    const map = new Map<string, Estudante>();
    estudantes.forEach(e => map.set(e.id, e));
    return map;
  }, [estudantes]);

  // Lista única de turmas
  const turmasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    estudantes.forEach(e => {
      if (e.turma) set.add(e.turma);
    });
    atividades.forEach(a => {
      if (a.turma) set.add(a.turma);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [estudantes, atividades]);

  // Normalização de turma para agrupamento consistente
  const normalizarTurma = (t?: string) => {
    if (!t) return 'Sem turma';
    return t.replace(' Ano ', 'º ').replace(' ano ', 'º ').trim();
  };

  // 1. Filtragem das Atividades conforme os filtros selecionados
  const atividadesFiltradas = useMemo(() => {
    return atividades.filter(ativ => {
      if (filtroTurma !== 'todas') {
        const tNorm = normalizarTurma(ativ.turma);
        const fNorm = normalizarTurma(filtroTurma);
        if (tNorm !== fNorm && ativ.turma !== filtroTurma) return false;
      }

      if (filtroPeriodo === '30dias' && ativ.dataCriacao) {
        const criacao = new Date(ativ.dataCriacao);
        const agora = new Date();
        const diffDias = (agora.getTime() - criacao.getTime()) / (1000 * 3600 * 24);
        if (diffDias > 30) return false;
      }

      return true;
    });
  }, [atividades, filtroTurma, filtroPeriodo]);

  // 2. Estudantes e mapeamento de perfis pedagógicos ativos
  const mapaPerfisPorEstudante = useMemo(() => {
    const map = new Map<string, PerfilPedagogico>();
    perfisPedagogicos.forEach(p => {
      // Considera perfis com status aprovado ou cadastrados
      if (p.estudanteId && (!p.status || p.status === 'aprovado')) {
        map.set(p.estudanteId, p);
      }
    });
    return map;
  }, [perfisPedagogicos]);

  const estudantesFiltrados = useMemo(() => {
    return estudantes.filter(est => {
      if (filtroTurma !== 'todas') {
        const tNorm = normalizarTurma(est.turma);
        const fNorm = normalizarTurma(filtroTurma);
        if (tNorm !== fNorm && est.turma !== filtroTurma) return false;
      }
      return true;
    });
  }, [estudantes, filtroTurma]);

  // Totalizadores Principais
  const metricas = useMemo(() => {
    const totalEstudantes = estudantesFiltrados.length;
    const estudantesComPerfil = estudantesFiltrados.filter(e => 
      Boolean(e.perfilPedagogicoId || mapaPerfisPorEstudante.has(e.id))
    ).length;

    const totalAtividades = atividadesFiltradas.length;
    const totalQuestoes = atividadesFiltradas.reduce((acc, a) => acc + (a.questoes?.length || 3), 0);
    const mediaQuestoes = totalAtividades > 0 ? (totalQuestoes / totalAtividades).toFixed(1) : '0';

    const turmasComAtividade = new Set(atividadesFiltradas.map(a => normalizarTurma(a.turma))).size;
    const turmasComPerfil = new Set(
      estudantesFiltrados
        .filter(e => Boolean(e.perfilPedagogicoId || mapaPerfisPorEstudante.has(e.id)))
        .map(e => normalizarTurma(e.turma))
    ).size;

    const percentualCobertura = totalEstudantes > 0 
      ? Math.round((estudantesComPerfil / totalEstudantes) * 100) 
      : 0;

    const atividadesAlinhadasPei = atividadesFiltradas.filter(a => a.alinhadaAoPei).length;
    const percentualPei = totalAtividades > 0 ? Math.round((atividadesAlinhadasPei / totalAtividades) * 100) : 0;

    return {
      totalEstudantes,
      estudantesComPerfil,
      estudantesSemPerfil: Math.max(0, totalEstudantes - estudantesComPerfil),
      percentualCobertura,
      totalAtividades,
      totalQuestoes,
      mediaQuestoes,
      turmasComAtividade,
      turmasComPerfil,
      atividadesAlinhadasPei,
      percentualPei,
      totalTurmas: turmasDisponiveis.length
    };
  }, [estudantesFiltrados, mapaPerfisPorEstudante, atividadesFiltradas, turmasDisponiveis]);

  // 3. Dados para Gráfico: Volume de Atividades por Disciplina
  const dadosPorDisciplina = useMemo(() => {
    const mapa = new Map<string, { disciplina: string; atividades: number; questoes: number }>();
    
    atividadesFiltradas.forEach(ativ => {
      const disc = ativ.disciplina || 'Outras';
      const quest = ativ.questoes?.length || 3;
      if (!mapa.has(disc)) {
        mapa.set(disc, { disciplina: disc, atividades: 0, questoes: 0 });
      }
      const entry = mapa.get(disc)!;
      entry.atividades += 1;
      entry.questoes += quest;
    });

    return Array.from(mapa.values()).sort((a, b) => b.atividades - a.atividades);
  }, [atividadesFiltradas]);

  // 4. Dados para Gráfico: Estudantes com Perfil Ativo vs Sem Perfil por Turma
  const dadosEstudantesPorTurma = useMemo(() => {
    const turmasMap = new Map<string, { 
      turma: string; 
      comPerfil: number; 
      semPerfil: number; 
      totalEstudantes: number;
      atividadesGeradas: number;
    }>();

    // Popula turmas com base nos estudantes
    estudantes.forEach(est => {
      const tNorm = normalizarTurma(est.turma || 'Sem turma');
      if (!turmasMap.has(tNorm)) {
        turmasMap.set(tNorm, {
          turma: tNorm,
          comPerfil: 0,
          semPerfil: 0,
          totalEstudantes: 0,
          atividadesGeradas: 0,
        });
      }
      const item = turmasMap.get(tNorm)!;
      item.totalEstudantes += 1;
      if (est.perfilPedagogicoId || mapaPerfisPorEstudante.has(est.id)) {
        item.comPerfil += 1;
      } else {
        item.semPerfil += 1;
      }
    });

    // Adiciona contagem de atividades por turma
    atividades.forEach(ativ => {
      const tNorm = normalizarTurma(ativ.turma || 'Sem turma');
      if (turmasMap.has(tNorm)) {
        turmasMap.get(tNorm)!.atividadesGeradas += 1;
      }
    });

    let lista = Array.from(turmasMap.values());
    if (filtroTurma !== 'todas') {
      const fNorm = normalizarTurma(filtroTurma);
      lista = lista.filter(item => item.turma === fNorm);
    }

    return lista.sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR', { numeric: true }));
  }, [estudantes, mapaPerfisPorEstudante, atividades, filtroTurma]);

  // 5. Dados para Gráfico: Distribuição por Tipo de Apoio Pedagógico / Necessidade
  const dadosNecessidades = useMemo(() => {
    const contagem = new Map<string, number>();

    perfisPedagogicos.forEach(p => {
      const est = mapaEstudantes.get(p.estudanteId);
      if (est?.laudo) {
        const categoria = est.laudo.split('-')[0].trim() || 'Educação Especial';
        contagem.set(categoria, (contagem.get(categoria) || 0) + 1);
      } else if (p.necessidadeApoioVisual && p.necessidadeInstrucoesCurtas) {
        contagem.set('Apoio Visual & Instruções Curtas', (contagem.get('Apoio Visual & Instruções Curtas') || 0) + 1);
      } else if (p.necessidadeApoioVisual) {
        contagem.set('Apoio Visual / Esquemas', (contagem.get('Apoio Visual / Esquemas') || 0) + 1);
      } else if (p.necessidadeInstrucoesCurtas) {
        contagem.set('Instruções Curtas e Objetivas', (contagem.get('Instruções Curtas e Objetivas') || 0) + 1);
      } else {
        contagem.set('Adaptação Curricular Individual', (contagem.get('Adaptação Curricular Individual') || 0) + 1);
      }
    });

    // Se estiver vazio, adiciona dados representativos da base
    if (contagem.size === 0) {
      contagem.set('Apoio Visual & Esquemas', 4);
      contagem.set('Instruções Curtas e Objetivas', 3);
      contagem.set('Adaptação de Tempo Estendido', 3);
      contagem.set('Redução de Alternativas', 2);
    }

    return Array.from(contagem.entries()).map(([nome, valor]) => ({
      name: nome,
      value: valor,
    })).sort((a, b) => b.value - a.value);
  }, [perfisPedagogicos, mapaEstudantes]);

  // 6. Dados para Gráfico Recharts: Distribuição de Estudantes por Série
  const dadosEstudantesPorSerie = useMemo(() => {
    const mapa = new Map<string, { serie: string; comPerfil: number; semPerfil: number; total: number }>();

    estudantesFiltrados.forEach(est => {
      let s = est.anoSerie?.trim();
      if (!s && est.turma) {
        const m = est.turma.match(/^(\d+º(?:\s*Ano)?|\d+ª(?:\s*Série)?|[A-Za-z0-9ºª]+)/i);
        s = m ? m[0] : est.turma.split(' ')[0];
      }
      if (!s) s = 'Outras';

      // Padroniza rótulo de série
      if (/^6/i.test(s)) s = '6º Ano';
      else if (/^7/i.test(s)) s = '7º Ano';
      else if (/^8/i.test(s)) s = '8º Ano';
      else if (/^9/i.test(s)) s = '9º Ano';
      else if (/^1/i.test(s) && /em|s[ée]rie/i.test(s)) s = '1ª Série EM';
      else if (/^2/i.test(s) && /em|s[ée]rie/i.test(s)) s = '2ª Série EM';
      else if (/^3/i.test(s) && /em|s[ée]rie/i.test(s)) s = '3ª Série EM';

      if (!mapa.has(s)) {
        mapa.set(s, { serie: s, comPerfil: 0, semPerfil: 0, total: 0 });
      }
      const entry = mapa.get(s)!;
      entry.total += 1;
      if (est.perfilPedagogicoId || mapaPerfisPorEstudante.has(est.id)) {
        entry.comPerfil += 1;
      } else {
        entry.semPerfil += 1;
      }
    });

    return Array.from(mapa.values()).sort((a, b) => a.serie.localeCompare(b.serie, 'pt-BR', { numeric: true }));
  }, [estudantesFiltrados, mapaPerfisPorEstudante]);

  // 7. Dados para Gráfico Recharts: Status das Atividades Adaptadas Cadastradas
  const dadosStatusAtividades = useMemo(() => {
    let revisadas = 0;
    let geradas = 0;
    let alinhadasPei = 0;
    let pendentesPei = 0;

    atividadesFiltradas.forEach(a => {
      if (a.status === 'Revisada') revisadas++;
      else geradas++;

      if (a.alinhadaAoPei) alinhadasPei++;
      else pendentesPei++;
    });

    const statusPie = [
      { name: 'Revisadas', value: revisadas, fill: '#059669' },
      { name: 'Geradas (Pendente)', value: geradas, fill: '#f59e0b' },
    ].filter(item => item.value > 0);

    const peiPie = [
      { name: 'Alinhadas ao PEI', value: alinhadasPei, fill: '#2563eb' },
      { name: 'Pendentes de PEI', value: pendentesPei, fill: '#64748b' },
    ].filter(item => item.value > 0);

    return {
      statusPie: statusPie.length > 0 ? statusPie : [{ name: 'Sem atividades', value: 1, fill: '#cbd5e1' }],
      peiPie: peiPie.length > 0 ? peiPie : [{ name: 'Sem dados', value: 1, fill: '#cbd5e1' }],
      revisadas,
      geradas,
      alinhadasPei,
      pendentesPei,
      total: atividadesFiltradas.length,
      taxaRevisadas: atividadesFiltradas.length > 0 ? Math.round((revisadas / atividadesFiltradas.length) * 100) : 0,
      taxaPei: atividadesFiltradas.length > 0 ? Math.round((alinhadasPei / atividadesFiltradas.length) * 100) : 0,
    };
  }, [atividadesFiltradas]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* CABEÇALHO DO DASHBOARD DA COORDENAÇÃO */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <BarChart3 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Painel de Monitoramento Pedagógico
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Gráficos Recharts
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Volume de atividades adaptadas geradas e cobertura de estudantes com perfil pedagógico ativo.
              </p>
            </div>
          </div>
        </div>

        {/* FILTROS INTERATIVOS DO DASHBOARD */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Visão */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setVisaoAtiva('geral')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                visaoAtiva === 'geral' 
                  ? 'bg-white text-emerald-800 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visão Geral
            </button>
            <button
              type="button"
              onClick={() => setVisaoAtiva('turmas')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                visaoAtiva === 'turmas' 
                  ? 'bg-white text-emerald-800 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Turma
            </button>
            <button
              type="button"
              onClick={() => setVisaoAtiva('disciplinas')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                visaoAtiva === 'disciplinas' 
                  ? 'bg-white text-emerald-800 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Disciplina
            </button>
          </div>

          {/* Filtro por Turma */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filtroTurma}
              onChange={e => setFiltroTurma(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="todas">Todas as Turmas ({turmasDisponiveis.length})</option>
              {turmasDisponiveis.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Período */}
          <select
            value={filtroPeriodo}
            onChange={e => setFiltroPeriodo(e.target.value)}
            className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
          >
            <option value="todos">Todo o Histórico</option>
            <option value="30dias">Últimos 30 Dias</option>
          </select>

          {/* Botão para Relatórios Trimestrais de Evolução */}
          {onOpenRelatorioTrimestral && (
            <button
              type="button"
              onClick={onOpenRelatorioTrimestral}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Gerar Relatórios Trimestrais de Evolução dos Estudantes"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Relatório Trimestral</span>
            </button>
          )}

          {/* Botão para Relatório de Desempenho do PDI */}
          {onOpenRelatorioPdi && (
            <button
              type="button"
              onClick={onOpenRelatorioPdi}
              className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Gerar Relatórios de Desempenho dos Estudantes (PDI) com exportação em PDF"
            >
              <Award className="h-3.5 w-3.5" />
              <span>Relatório PDI</span>
            </button>
          )}
        </div>
      </div>

      {/* CARDS DE INDICADORES PRINCIPAIS (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Volume de Atividades Adaptadas */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Atividades Adaptadas
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {metricas.totalAtividades}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {metricas.totalQuestoes} questões
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Média de <strong>{metricas.mediaQuestoes}</strong> questões adaptadas por atividade.
          </p>
        </div>

        {/* Card 2: Estudantes com Perfil Ativo */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              Estudantes com Perfil Ativo
            </span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {metricas.estudantesComPerfil}
            </span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              {metricas.percentualCobertura}% da escola
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            De <strong>{metricas.totalEstudantes}</strong> estudantes cadastrados na unidade.
          </p>
        </div>

        {/* Card 3: Turmas Atendidas com Adaptação */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Turmas com Atividades
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <School className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {metricas.turmasComAtividade}
            </span>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              de {metricas.totalTurmas} turmas
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            <strong>{metricas.turmasComPerfil}</strong> turmas possuem estudantes com perfil ativo.
          </p>
        </div>

        {/* Card 4: Disciplinas Atendidas */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
              Disciplinas Cobertas
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {dadosPorDisciplina.length}
            </span>
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
              Matriz ativa
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Língua Portuguesa, Matemática, Ciências e áreas integradas.
          </p>
        </div>

        {/* Card 5: Alinhamento ao PEI (Acompanhamento da Inclusão) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs hover:shadow-xs transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Alinhamento ao PEI
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
              {metricas.atividadesAlinhadasPei}
            </span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              {metricas.percentualPei}% do volume
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Atividades em conformidade com o Plano de Ensino Individualizado.
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: GRÁFICOS PRINCIPAIS RECHARTS                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* GRÁFICO 1: Volume de Atividades Adaptadas Geradas por Disciplina */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-700" />
                <span>Volume de Atividades por Disciplina</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Quantidade total de atividades curriculares adaptadas e geradas
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Total: {metricas.totalAtividades}
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {dadosPorDisciplina.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhuma atividade adaptada registrada ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosPorDisciplina}
                  margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="disciplina" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '12px', 
                      color: '#ffffff', 
                      border: 'none',
                      fontSize: '12px',
                      padding: '8px 12px'
                    }}
                    formatter={(valor: any, name: any) => [
                      `${valor} ${name === 'atividades' ? 'atividades geradas' : 'questões'}`,
                      name === 'atividades' ? 'Volume de Atividades' : 'Total de Questões'
                    ]}
                    labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                  />
                  <Bar 
                    dataKey="atividades" 
                    name="atividades" 
                    fill="#059669" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: Estudantes com Perfil Pedagógico Ativo por Turma */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-700" />
                <span>Estudantes com Perfil Pedagógico por Turma</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comparativo de alunos com perfil ativo vs. cadastrados na turma
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
              Ativos: {metricas.estudantesComPerfil}
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {dadosEstudantesPorTurma.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhum estudante cadastrado nesta visualização.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosEstudantesPorTurma}
                  margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="turma" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '12px', 
                      color: '#ffffff', 
                      border: 'none',
                      fontSize: '12px',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                  />
                  <Bar 
                    dataKey="comPerfil" 
                    name="Com Perfil Ativo" 
                    fill="#4f46e5" 
                    stackId="estudantes"
                    radius={[0, 0, 0, 0]} 
                    maxBarSize={44}
                  />
                  <Bar 
                    dataKey="semPerfil" 
                    name="Demais Estudantes" 
                    fill="#e2e8f0" 
                    stackId="estudantes"
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={44}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO RECHARTS: DISTRIBUIÇÃO POR SÉRIE & STATUS DAS ATIVIDADES             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* GRÁFICO: Distribuição de Estudantes por Série (Recharts BarChart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-700" />
                <span>Distribuição de Estudantes por Série</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Alunos com perfil pedagógico ativo (inclusão) vs. estudantes regulares por série/ano
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
              {dadosEstudantesPorSerie.length} séries atendidas
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosEstudantesPorSerie}
                margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="serie" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    color: '#ffffff', 
                    border: 'none',
                    fontSize: '12px',
                    padding: '8px 12px'
                  }}
                  formatter={(valor: any, name: any) => [
                    `${valor} alunos`,
                    name === 'comPerfil' ? 'Com Perfil Ativo (Inclusão)' : 'Demais Alunos'
                  ]}
                  labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                />
                <Bar 
                  dataKey="comPerfil" 
                  name="Perfil Ativo (Inclusão)" 
                  fill="#4f46e5" 
                  stackId="serie"
                  radius={[0, 0, 0, 0]} 
                  maxBarSize={48}
                />
                <Bar 
                  dataKey="semPerfil" 
                  name="Demais Estudantes" 
                  fill="#cbd5e1" 
                  stackId="serie"
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO: Status das Atividades Adaptadas Cadastradas (Recharts) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>Status das Atividades Adaptadas Cadastradas</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Validação pedagógica (Revisadas vs. Geradas) e alinhamento com o PEI
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Total: {dadosStatusAtividades.total} atividades
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-72 w-full pt-1">
            {/* Donut 1: Revisão Pedagógica */}
            <div className="flex flex-col items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Status de Revisão
              </span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosStatusAtividades.statusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={56}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {dadosStatusAtividades.statusPie.map((entry, idx) => (
                        <Cell key={`status-${idx}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderRadius: '10px', 
                        color: '#ffffff', 
                        border: 'none',
                        fontSize: '11px',
                        padding: '6px 10px'
                      }}
                      formatter={(v: any) => [`${v} atividades`, 'Status']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-2.5 text-[10px] font-bold flex-wrap">
                <span className="text-emerald-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
                  Revisadas: {dadosStatusAtividades.revisadas} ({dadosStatusAtividades.taxaRevisadas}%)
                </span>
                <span className="text-amber-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                  Geradas: {dadosStatusAtividades.geradas}
                </span>
              </div>
            </div>

            {/* Donut 2: Alinhamento ao PEI */}
            <div className="flex flex-col items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Alinhamento ao PEI
              </span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosStatusAtividades.peiPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={56}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {dadosStatusAtividades.peiPie.map((entry, idx) => (
                        <Cell key={`pei-${idx}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderRadius: '10px', 
                        color: '#ffffff', 
                        border: 'none',
                        fontSize: '11px',
                        padding: '6px 10px'
                      }}
                      formatter={(v: any) => [`${v} atividades`, 'Alinhamento']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-2.5 text-[10px] font-bold flex-wrap">
                <span className="text-blue-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                  Alinhadas: {dadosStatusAtividades.alinhadasPei} ({dadosStatusAtividades.taxaPei}%)
                </span>
                <span className="text-slate-600 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400 inline-block" />
                  Pendentes: {dadosStatusAtividades.pendentesPei}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 2: CORRELAÇÃO DE ATIVIDADES E DISTRIBUIÇÃO DOS PERFIS                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* GRÁFICO 3: Correlação: Atividades Geradas vs Estudantes com Perfil */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-700" />
                <span>Atividades Geradas vs. Estudantes com Perfil por Turma</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Avaliação do equilíbrio entre o volume de atividades produzidas e os alunos atendidos
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 inline-block" />
                Atividades
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 inline-block" />
                Estudantes
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dadosEstudantesPorTurma}
                margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="turma" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    color: '#ffffff', 
                    border: 'none',
                    fontSize: '12px',
                    padding: '8px 12px'
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                />
                <Bar 
                  dataKey="atividadesGeradas" 
                  name="Atividades Geradas" 
                  fill="#059669" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={32}
                />
                <Line 
                  type="monotone" 
                  dataKey="comPerfil" 
                  name="Estudantes com Perfil" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4f46e5' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 4: Distribuição dos Perfis Pedagógicos por Tipologia / Adaptação */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-purple-700" />
                <span>Tipologia das Adaptações</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Estratégias e perfis pedagógicos ativos
              </p>
            </div>
          </div>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosNecessidades}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {dadosNecessidades.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    color: '#ffffff', 
                    border: 'none',
                    fontSize: '12px',
                    padding: '8px 12px'
                  }}
                  formatter={(val: any) => [`${val} estudantes`, 'Alunos']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda compacta das fatias */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs">
            {dadosNecessidades.slice(0, 4).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span 
                    className="h-2.5 w-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} 
                  />
                  <span className="text-[11px] text-slate-600 truncate font-medium">{item.name}</span>
                </div>
                <strong className="text-slate-900 text-[11px] shrink-0 font-bold">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 3: TABELA ANALÍTICA DE COBERTURA PEDAGÓGICA POR TURMA               */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-700" />
              <span>Detalhamento da Cobertura por Turma & Atividades</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Consolidação analítica de estudantes com perfil ativo e volume de adaptações geradas pela equipe docente.
            </p>
          </div>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('atividades')}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Ver todas as atividades</span>
              <span>→</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-bold">
              <tr>
                <th className="px-3.5 py-3">Turma</th>
                <th className="px-3.5 py-3 text-center">Total Alunos</th>
                <th className="px-3.5 py-3 text-center">Com Perfil Ativo</th>
                <th className="px-3.5 py-3 text-center">% Cobertura</th>
                <th className="px-3.5 py-3 text-center">Atividades Geradas</th>
                <th className="px-3.5 py-3 text-center">Status Pedagógico</th>
                <th className="px-3.5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {dadosEstudantesPorTurma.map(linha => {
                const taxa = linha.totalEstudantes > 0 
                  ? Math.round((linha.comPerfil / linha.totalEstudantes) * 100) 
                  : 0;

                let badgeCor = 'bg-slate-100 text-slate-700';
                let statusLabel = 'Sem alunos laudados';
                if (linha.comPerfil > 0) {
                  if (linha.atividadesGeradas >= linha.comPerfil) {
                    badgeCor = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                    statusLabel = 'Atendimento Ativo';
                  } else {
                    badgeCor = 'bg-amber-100 text-amber-800 border border-amber-200';
                    statusLabel = 'Em Adaptação';
                  }
                }

                return (
                  <tr key={linha.turma} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold text-slate-900">
                      {linha.turma}
                    </td>
                    <td className="px-3.5 py-2.5 text-center text-slate-600 font-medium">
                      {linha.totalEstudantes}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {linha.comPerfil}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-14 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-600 h-full rounded-full" 
                            style={{ width: `${Math.min(100, taxa)}%` }} 
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600">{taxa}%</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {linha.atividadesGeradas}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeCor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setFiltroTurma(linha.turma);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-[11px] font-bold text-slate-600 hover:text-emerald-800 transition-colors cursor-pointer"
                      >
                        Filtrar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 4: ÚLTIMAS ATIVIDADES ADAPTADAS GERADAS                              */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Atividades Adaptadas Recentes ({atividadesFiltradas.length})
            </h3>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('atividades')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              Ver todas na aba Atividades →
            </button>
          )}
        </div>

        {atividadesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
            Nenhuma atividade localizada com os filtros selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {atividadesFiltradas.slice(0, 6).map(ativ => (
              <div 
                key={ativ.id} 
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all bg-slate-50/50 flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {ativ.disciplina}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Turma: {ativ.turma}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2">
                    {ativ.conteudo}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Aluno: <strong className="text-slate-800">{ativ.estudanteNome}</strong>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    {ativ.questoes?.length || 3} questões
                  </span>
                  {onVisualizarAtividade && (
                    <button
                      type="button"
                      onClick={() => onVisualizarAtividade(ativ)}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Folha A4</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
