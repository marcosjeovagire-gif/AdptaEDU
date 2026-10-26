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
  Cell
} from 'recharts';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  CheckCircle2, 
  FileDown, 
  Filter, 
  Search, 
  Sparkles, 
  BookOpen, 
  HeartHandshake, 
  ArrowRight, 
  FileText, 
  Loader2,
  TrendingUp,
  Award,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { 
  AtividadeAdaptada, 
  Estudante, 
  AuthorizedUser, 
  EscolaConfig, 
  RegistroAcompanhamentoApoio,
  PerfilPedagogico 
} from '../../types';
import { 
  exportarRelatorioProgressoPdf, 
  calcularMetricasEstudantes 
} from '../../services/dashboardExportService';

export interface DashboardViewProps {
  atividades: AtividadeAdaptada[];
  estudantes: Estudante[];
  perfisPedagogicos?: PerfilPedagogico[];
  registrosApoio?: RegistroAcompanhamentoApoio[];
  currentUser: AuthorizedUser | null;
  escolaConfig?: EscolaConfig;
  onCriarAtividade?: (estudanteId?: string) => void;
  onVisualizarA4?: (atividade: AtividadeAdaptada) => void;
  onIrParaListaAtividades?: () => void;
}

type PeriodoOpcao = 'mes_atual' | 'bimestre_atual' | 'ultimos_30_dias' | 'ano_letivo' | 'personalizado';

const CORES_PIE = ['#059669', '#0284c7', '#d97706', '#dc2626', '#8b5cf6'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  atividades,
  estudantes,
  perfisPedagogicos = [],
  registrosApoio = [],
  currentUser,
  escolaConfig,
  onCriarAtividade,
  onVisualizarA4,
  onIrParaListaAtividades,
}) => {
  // 1. Estados de Filtro de Período (Padrão: Mês Atual, conforme decisão do usuário)
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoOpcao>('mes_atual');
  
  // Datas personalizadas
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<string>(primeiroDiaMes);
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<string>(ultimoDiaMes);

  // 2. Filtro por Turma
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>('todas');

  // 3. Busca por texto
  const [buscaTexto, setBuscaTexto] = useState<string>('');

  // 4. Estados de Exportação PDF
  const [exportandoPdf, setExportandoPdf] = useState<boolean>(false);
  const [mensagemSucessoPdf, setMensagemSucessoPdf] = useState<string | null>(null);
  const [mensagemErroPdf, setMensagemErroPdf] = useState<string | null>(null);

  // Lista de Turmas Únicas disponíveis a partir dos estudantes
  const turmasDisponiveis = useMemo(() => {
    const setT = new Set<string>();
    estudantes.forEach(e => {
      if (e.turma) setT.add(e.turma);
      else if (e.anoSerie) setT.add(e.anoSerie);
    });
    return Array.from(setT).sort();
  }, [estudantes]);

  // Intervalo de Datas Efetivo calculado conforme a seleção
  const { dataInicioEfetiva, dataFimEfetiva, descricaoPeriodo } = useMemo(() => {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth(); // 0 a 11

    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    if (periodoSelecionado === 'mes_atual') {
      const ini = new Date(ano, mes, 1).toISOString().split('T')[0];
      const fim = new Date(ano, mes + 1, 0).toISOString().split('T')[0];
      return {
        dataInicioEfetiva: ini,
        dataFimEfetiva: fim,
        descricaoPeriodo: `Mês Atual (${mesesNomes[mes]}/${ano})`,
      };
    }

    if (periodoSelecionado === 'bimestre_atual') {
      // 1º Bim: Jan-Mar, 2º Bim: Abr-Jun, 3º Bim: Jul-Set, 4º Bim: Out-Dez
      const bimIdx = Math.floor(mes / 3);
      const ini = new Date(ano, bimIdx * 3, 1).toISOString().split('T')[0];
      const fim = new Date(ano, (bimIdx + 1) * 3, 0).toISOString().split('T')[0];
      return {
        dataInicioEfetiva: ini,
        dataFimEfetiva: fim,
        descricaoPeriodo: `${bimIdx + 1}º Bimestre Letivo (${ano})`,
      };
    }

    if (periodoSelecionado === 'ultimos_30_dias') {
      const d30 = new Date();
      d30.setDate(d30.getDate() - 30);
      const ini = d30.toISOString().split('T')[0];
      const fim = agora.toISOString().split('T')[0];
      return {
        dataInicioEfetiva: ini,
        dataFimEfetiva: fim,
        descricaoPeriodo: 'Últimos 30 Dias',
      };
    }

    if (periodoSelecionado === 'ano_letivo') {
      const ini = `${ano}-01-01`;
      const fim = `${ano}-12-31`;
      return {
        dataInicioEfetiva: ini,
        dataFimEfetiva: fim,
        descricaoPeriodo: `Ano Letivo ${ano}`,
      };
    }

    // Personalizado
    const fIni = dataInicioPersonalizada ? dataInicioPersonalizada.split('-').reverse().join('/') : '';
    const fFim = dataFimPersonalizada ? dataFimPersonalizada.split('-').reverse().join('/') : '';
    return {
      dataInicioEfetiva: dataInicioPersonalizada,
      dataFimEfetiva: dataFimPersonalizada,
      descricaoPeriodo: `Período Personalizado: ${fIni} até ${fFim}`,
    };
  }, [periodoSelecionado, dataInicioPersonalizada, dataFimPersonalizada]);

  // Cálculo das métricas consolidadas dos estudantes e resumo
  const { alunosMetricas, resumoGeral } = useMemo(() => {
    return calcularMetricasEstudantes(
      estudantes,
      atividades,
      registrosApoio,
      turmaSelecionada,
      dataInicioEfetiva,
      dataFimEfetiva
    );
  }, [estudantes, atividades, registrosApoio, turmaSelecionada, dataInicioEfetiva, dataFimEfetiva]);

  // Filtro adicional por busca de texto na tabela de alunos
  const alunosFiltradosBusca = useMemo(() => {
    if (!buscaTexto.trim()) return alunosMetricas;
    const termo = buscaTexto.toLowerCase();
    return alunosMetricas.filter(a => 
      a.estudante.nome.toLowerCase().includes(termo) ||
      (a.estudante.turma && a.estudante.turma.toLowerCase().includes(termo)) ||
      (a.estudante.laudo && a.estudante.laudo.toLowerCase().includes(termo))
    );
  }, [alunosMetricas, buscaTexto]);

  // Dados para Gráfico 1: Conclusão por Estudante (Top 8 para visualização limpa)
  const dadosGraficoConclusao = useMemo(() => {
    return alunosMetricas.slice(0, 8).map(a => ({
      nome: a.estudante.nome.split(' ')[0] + ' ' + (a.estudante.nome.split(' ')[1] ? a.estudante.nome.split(' ')[1][0] + '.' : ''),
      Atribuídas: a.totalAtividades,
      Concluídas: a.atividadesConcluidas,
      taxa: a.taxaConclusao,
    }));
  }, [alunosMetricas]);

  // Dados para Gráfico 2: Distribuição de Níveis de Engajamento / Autonomia com Apoio
  const dadosGraficoEngajamento = useMemo(() => {
    const mapa = new Map<string, number>();
    alunosMetricas.forEach(a => {
      mapa.set(a.nivelEngajamento, (mapa.get(a.nivelEngajamento) || 0) + 1);
    });
    return Array.from(mapa.entries()).map(([name, value]) => ({ name, value }));
  }, [alunosMetricas]);

  // Dados para Gráfico 3: Distribuição por Disciplina
  const dadosGraficoDisciplinas = useMemo(() => {
    const mapa = new Map<string, { total: number; pei: number }>();
    atividades.forEach(ativ => {
      if (turmaSelecionada !== 'todas' && ativ.turma !== turmaSelecionada) return;
      const d = ativ.disciplina || 'Outras';
      const cur = mapa.get(d) || { total: 0, pei: 0 };
      cur.total += 1;
      if (ativ.alinhadaAoPei) cur.pei += 1;
      mapa.set(d, cur);
    });

    return Array.from(mapa.entries()).slice(0, 6).map(([disciplina, vals]) => ({
      disciplina: disciplina.length > 14 ? disciplina.slice(0, 12) + '...' : disciplina,
      Atividades: vals.total,
      AlinhadasPEI: vals.pei,
    }));
  }, [atividades, turmaSelecionada]);

  // Manipulador de Exportação em PDF
  const handleExportarPdf = async () => {
    setExportandoPdf(true);
    setMensagemSucessoPdf(null);
    setMensagemErroPdf(null);

    try {
      const res = await exportarRelatorioProgressoPdf({
        escolaConfig,
        turmaSelecionada,
        periodoDescricao: descricaoPeriodo,
        dataInicio: dataInicioEfetiva,
        dataFim: dataFimEfetiva,
        estudantes,
        atividades,
        registrosApoio,
        perfisPedagogicos,
        currentUser,
      });

      if (res.success) {
        setMensagemSucessoPdf(`Relatório exportado com sucesso: ${res.fileName}`);
        setTimeout(() => setMensagemSucessoPdf(null), 5000);
      }
    } catch (err: any) {
      console.error('Erro na exportação do relatório do Dashboard:', err);
      setMensagemErroPdf(`Falha ao gerar o PDF: ${err.message || 'Erro inesperado'}`);
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header do Dashboard com Ações Rápidas */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Dashboard de Aprendizagem e Engajamento
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Acompanhamento do progresso em atividades adaptadas, alinhamento ao PEI e engajamento com diário do apoio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onIrParaListaAtividades && (
            <button
              onClick={onIrParaListaAtividades}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Ver Atividades</span>
            </button>
          )}

          {onCriarAtividade && (
            <button
              onClick={() => onCriarAtividade()}
              className="py-2.5 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Atividade</span>
            </button>
          )}

          <button
            onClick={handleExportarPdf}
            disabled={exportandoPdf}
            className="py-2.5 px-4 bg-sky-700 hover:bg-sky-800 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-60"
            title="Exportar relatório consolidado com dados de progresso e assinaturas oficiais da SEDUC-GO"
          >
            {exportandoPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span>Exportar Relatório PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback de Exportação */}
      {mensagemSucessoPdf && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{mensagemSucessoPdf}</span>
        </div>
      )}
      {mensagemErroPdf && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-700 shrink-0" />
          <span>{mensagemErroPdf}</span>
        </div>
      )}

      {/* 2. Barra de Filtros: Intervalo de Datas e Turma */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Seletor de Período */}
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>Intervalo de Datas (Relatório de Progresso)</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPeriodoSelecionado('mes_atual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  periodoSelecionado === 'mes_atual'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Mês Atual (Padrão)
              </button>

              <button
                type="button"
                onClick={() => setPeriodoSelecionado('bimestre_atual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  periodoSelecionado === 'bimestre_atual'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Bimestre Letivo
              </button>

              <button
                type="button"
                onClick={() => setPeriodoSelecionado('ultimos_30_dias')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  periodoSelecionado === 'ultimos_30_dias'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Últimos 30 dias
              </button>

              <button
                type="button"
                onClick={() => setPeriodoSelecionado('ano_letivo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  periodoSelecionado === 'ano_letivo'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Ano Letivo
              </button>

              <button
                type="button"
                onClick={() => setPeriodoSelecionado('personalizado')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  periodoSelecionado === 'personalizado'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Personalizado...
              </button>
            </div>
          </div>

          {/* Filtro por Turma */}
          <div className="w-full lg:w-64">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-sky-700" />
              <span>Agrupar / Filtrar por Turma</span>
            </label>
            <select
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="todas">Todas as Turmas (Visão Geral)</option>
              {turmasDisponiveis.map(t => (
                <option key={t} value={t}>
                  Turma: {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inputs de Data Personalizada se selecionado */}
        {periodoSelecionado === 'personalizado' && (
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">De:</span>
              <input
                type="date"
                value={dataInicioPersonalizada}
                onChange={(e) => setDataInicioPersonalizada(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Até:</span>
              <input
                type="date"
                value={dataFimPersonalizada}
                onChange={(e) => setDataFimPersonalizada(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-500 italic">
              ({descricaoPeriodo})
            </span>
          </div>
        )}
      </div>

      {/* 3. Cards com KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Atividades */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Atividades no Período</span>
            <FileText className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {resumoGeral.totalAtividades}
          </p>
          <span className="text-[11px] text-slate-500 block">
            {resumoGeral.totalConcluidas} concluídas/revisadas
          </span>
        </div>

        {/* Taxa Média de Conclusão */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Taxa de Conclusão</span>
            <TrendingUp className="h-4 w-4 text-sky-700" />
          </div>
          <p className="text-2xl font-black text-sky-950 tracking-tight">
            {resumoGeral.taxaMediaConclusao}%
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div 
              className="bg-sky-600 h-1.5 rounded-full transition-all"
              style={{ width: `${resumoGeral.taxaMediaConclusao}%` }}
            />
          </div>
        </div>

        {/* Alinhamento ao PEI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Alinhamento ao PEI</span>
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-black text-emerald-950 tracking-tight">
            {resumoGeral.taxaAlinhamentoPei}%
          </p>
          <span className="text-[11px] text-emerald-800 font-medium block">
            Conforme Matriz SEDUC-GO
          </span>
        </div>

        {/* Estudantes Atendidos */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Alunos no Escopo</span>
            <Users className="h-4 w-4 text-amber-700" />
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {resumoGeral.totalAlunos}
          </p>
          <span className="text-[11px] text-slate-500 block">
            {alunosMetricas.filter(a => a.totalAtividades > 0).length} com tarefas geradas
          </span>
        </div>
      </div>

      {/* 4. Visualizações Gráficas com Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Gráfico 1: Atividades Atribuídas vs Concluídas por Estudante (8 colunas) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Progresso e Conclusão de Atividades por Estudante
              </h2>
              <p className="text-xs text-slate-500">
                Comparativo entre atividades atribuídas e concluídas no período
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
              {turmaSelecionada === 'todas' ? 'Geral' : turmaSelecionada}
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {dadosGraficoConclusao.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGraficoConclusao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Atribuídas" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Concluídas" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <FileText className="h-8 w-8 mb-1 text-slate-300" />
                <span>Nenhuma atividade cadastrada para esta turma ou período</span>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Nível de Engajamento e Apoio (4 colunas) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <HeartHandshake className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Engajamento & Mediação
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Taxa de autonomia com base no diário de bordo do Profissional de Apoio
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {dadosGraficoEngajamento.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGraficoEngajamento}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {dadosGraficoEngajamento.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_PIE[index % CORES_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">Sem registros de engajamento</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            {dadosGraficoEngajamento.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CORES_PIE[idx % CORES_PIE.length] }}
                />
                <span>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Tabela Detalhada de Acompanhamento por Estudante */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Barra de título da tabela com pesquisa */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Acompanhamento Individual por Estudante ({alunosFiltradosBusca.length})
            </h2>
            <p className="text-xs text-slate-500">
              Filtro ativo: {turmaSelecionada === 'todas' ? 'Todas as turmas' : `Turma ${turmaSelecionada}`} • {descricaoPeriodo}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="Buscar aluno, turma ou laudo..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Tabela Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Estudante</th>
                <th className="py-3 px-3">Turma</th>
                <th className="py-3 px-3">Laudo / CID</th>
                <th className="py-3 px-3">Tipografia Acessível</th>
                <th className="py-3 px-3 text-center">Atividades</th>
                <th className="py-3 px-3">Progresso</th>
                <th className="py-3 px-3">Engajamento (Apoio)</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {alunosFiltradosBusca.length > 0 ? (
                alunosFiltradosBusca.map((item) => (
                  <tr key={item.estudante.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Nome do Estudante */}
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {item.estudante.nome}
                    </td>

                    {/* Turma */}
                    <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                      {item.estudante.turma || item.estudante.anoSerie || '-'}
                    </td>

                    {/* Laudo */}
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={item.estudante.laudo}>
                      {item.estudante.laudo || 'Em avaliação'}
                    </td>

                    {/* Tipografia */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {item.formatoLetra === 'bastao' ? (
                        <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                          BASTÃO (LEXEND)
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          Cursiva
                        </span>
                      )}
                    </td>

                    {/* Atividades */}
                    <td className="py-3 px-3 text-center font-bold text-slate-800 whitespace-nowrap">
                      {item.atividadesConcluidas}/{item.totalAtividades}
                    </td>

                    {/* Progresso % */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${
                              item.taxaConclusao >= 70 ? 'bg-emerald-600' :
                              item.taxaConclusao >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${item.taxaConclusao}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px]">
                          {item.taxaConclusao}%
                        </span>
                      </div>
                    </td>

                    {/* Engajamento */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-slate-700 font-medium text-[11px]">
                        {item.nivelEngajamento}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {onCriarAtividade && (
                        <button
                          onClick={() => onCriarAtividade(item.estudante.id)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                          title="Gerar atividade adaptada para este aluno"
                        >
                          + Atividade
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhum aluno localizado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
