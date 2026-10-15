import React, { useState, useMemo } from 'react';
import {
  School,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Plus,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Sparkles,
  FileText,
  Layers,
  HeartHandshake,
  CheckCircle,
  FileCheck,
  Percent,
  TrendingUp,
  LayoutGrid,
  ListFilter
} from 'lucide-react';
import { Estudante, PeiDocumento, DocumentoImportado, PerfilPedagogico, EscolaConfig } from '../../types';
import { baixarPeiComoPdf } from '../../services/peiPdfService';

export interface CardCoberturaPeiPorTurmaProps {
  estudantes: Estudante[];
  peisArmazenados: PeiDocumento[];
  documentos?: DocumentoImportado[];
  perfisPedagogicos?: PerfilPedagogico[];
  escolaConfig?: EscolaConfig;
  onNavigateToEstudantesComTurma?: (turma: string) => void;
  onCriarPeiParaEstudante?: (estudanteId: string) => void;
  onVisualizarPei?: (pei: PeiDocumento) => void;
}

interface DadosTurmaCobertura {
  turma: string;
  anoSerie: string;
  turno: string;
  totalEstudantes: number;
  estudantesComPei: number;
  estudantesSemPei: number;
  percentualCobertura: number;
  estudantes: {
    estudante: Estudante;
    pei?: PeiDocumento;
    perfil?: PerfilPedagogico;
    temPei: boolean;
  }[];
  profissionaisApoio: string[];
}

export const CardCoberturaPeiPorTurma: React.FC<CardCoberturaPeiPorTurmaProps> = ({
  estudantes,
  peisArmazenados,
  documentos = [],
  perfisPedagogicos = [],
  escolaConfig,
  onNavigateToEstudantesComTurma,
  onCriarPeiParaEstudante,
  onVisualizarPei
}) => {
  const [buscaTurma, setBuscaTurma] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'completa' | 'parcial' | 'sem_pei'>('todas');
  const [filtroTurno, setFiltroTurno] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<'urgencia' | 'cobertura_desc' | 'nome' | 'estudantes_desc'>('urgencia');
  const [turmasExpandidas, setTurmasExpandidas] = useState<Record<string, boolean>>({});
  const [modoVisualizacao, setModoVisualizacao] = useState<'cards' | 'tabela'>('cards');
  const [baixandoPeiId, setBaixandoPeiId] = useState<string | null>(null);

  // Mapeador de PEI para cada estudante (peisArmazenados + documentos de tipo 'pei')
  const obterPeiDoEstudante = useMemo(() => {
    return (estId: string, estNome: string): PeiDocumento | undefined => {
      const direto = peisArmazenados.find(
        p => p.studentId === estId || (p.studentName && p.studentName.toLowerCase().trim() === estNome.toLowerCase().trim())
      );
      if (direto) return direto;

      const docPei = documentos.find(d => {
        if (d.tipo !== 'pei' && !d.peiDados) return false;
        if (d.peiDados?.studentId === estId) return true;
        if (d.peiDados?.studentName && d.peiDados.studentName.toLowerCase().trim() === estNome.toLowerCase().trim()) return true;
        const campoAluno = d.camposExtraidos?.find(
          (c: { campo: string; valor: string }) => c.campo.toLowerCase().includes('aluno') || c.campo.toLowerCase().includes('estudante')
        );
        if (campoAluno && campoAluno.valor.toLowerCase().trim() === estNome.toLowerCase().trim()) return true;
        return false;
      });
      return docPei?.peiDados;
    };
  }, [peisArmazenados, documentos]);

  // Mapa de perfis pedagógicos por ID de estudante
  const mapaPerfis = useMemo(() => {
    const map = new Map<string, PerfilPedagogico>();
    perfisPedagogicos.forEach(p => {
      if (p.estudanteId) map.set(p.estudanteId, p);
    });
    return map;
  }, [perfisPedagogicos]);

  // Agrupamento completo dos dados de cobertura por turma
  const dadosPorTurma = useMemo(() => {
    const mapa = new Map<string, DadosTurmaCobertura>();

    estudantes.forEach(est => {
      if (est.situacao === 'transferido') return; // Considerar apenas estudantes ativos na escola
      const nomeTurma = (est.turma || 'Sem Turma').trim();
      const pei = obterPeiDoEstudante(est.id, est.nome);
      const perfil = mapaPerfis.get(est.id);
      const temPei = Boolean(pei);

      if (!mapa.has(nomeTurma)) {
        mapa.set(nomeTurma, {
          turma: nomeTurma,
          anoSerie: est.anoSerie || 'Série Geral',
          turno: est.turno || 'Matutino',
          totalEstudantes: 0,
          estudantesComPei: 0,
          estudantesSemPei: 0,
          percentualCobertura: 0,
          estudantes: [],
          profissionaisApoio: []
        });
      }

      const item = mapa.get(nomeTurma)!;
      item.totalEstudantes += 1;
      if (temPei) {
        item.estudantesComPei += 1;
      } else {
        item.estudantesSemPei += 1;
      }

      item.estudantes.push({
        estudante: est,
        pei,
        perfil,
        temPei
      });

      if (est.paeResponsavelNome && !item.profissionaisApoio.includes(est.paeResponsavelNome)) {
        item.profissionaisApoio.push(est.paeResponsavelNome);
      }
    });

    // Calcular percentuais
    const lista = Array.from(mapa.values()).map(item => {
      const perc = item.totalEstudantes > 0 
        ? Math.round((item.estudantesComPei / item.totalEstudantes) * 100)
        : 0;
      return {
        ...item,
        percentualCobertura: perc
      };
    });

    return lista;
  }, [estudantes, obterPeiDoEstudante, mapaPerfis]);

  // Métricas Globais da Escola
  const metricasGlobais = useMemo(() => {
    const totalTurmas = dadosPorTurma.length;
    let totalEstudantes = 0;
    let totalComPei = 0;
    let turmasCompletas = 0;
    let turmasParciais = 0;
    let turmasSemPei = 0;

    dadosPorTurma.forEach(t => {
      totalEstudantes += t.totalEstudantes;
      totalComPei += t.estudantesComPei;
      if (t.percentualCobertura === 100) {
        turmasCompletas++;
      } else if (t.percentualCobertura > 0) {
        turmasParciais++;
      } else {
        turmasSemPei++;
      }
    });

    const taxaGeral = totalEstudantes > 0 
      ? Math.round((totalComPei / totalEstudantes) * 100) 
      : 0;

    return {
      totalTurmas,
      totalEstudantes,
      totalComPei,
      totalSemPei: totalEstudantes - totalComPei,
      taxaGeral,
      turmasCompletas,
      turmasParciais,
      turmasSemPei
    };
  }, [dadosPorTurma]);

  // Turnos disponíveis
  const turnosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    dadosPorTurma.forEach(d => {
      if (d.turno) set.add(d.turno);
    });
    return Array.from(set).sort();
  }, [dadosPorTurma]);

  // Filtros e ordenação aplicados às turmas
  const turmasFiltradas = useMemo(() => {
    return dadosPorTurma
      .filter(t => {
        // Busca textual
        if (buscaTurma.trim()) {
          const termo = buscaTurma.toLowerCase().trim();
          const matchTurma = t.turma.toLowerCase().includes(termo);
          const matchSerie = t.anoSerie.toLowerCase().includes(termo);
          const matchAluno = t.estudantes.some(e => e.estudante.nome.toLowerCase().includes(termo));
          const matchPae = t.profissionaisApoio.some(p => p.toLowerCase().includes(termo));
          if (!matchTurma && !matchSerie && !matchAluno && !matchPae) return false;
        }

        // Filtro de status de cobertura
        if (filtroStatus === 'completa' && t.percentualCobertura < 100) return false;
        if (filtroStatus === 'parcial' && (t.percentualCobertura === 100 || t.percentualCobertura === 0)) return false;
        if (filtroStatus === 'sem_pei' && t.percentualCobertura > 0) return false;

        // Filtro de turno
        if (filtroTurno !== 'todos' && t.turno !== filtroTurno) return false;

        return true;
      })
      .sort((a, b) => {
        if (ordenacao === 'urgencia') {
          // Menor cobertura primeiro, priorizando salas com mais alunos sem PEI
          if (a.percentualCobertura !== b.percentualCobertura) {
            return a.percentualCobertura - b.percentualCobertura;
          }
          return b.estudantesSemPei - a.estudantesSemPei;
        }
        if (ordenacao === 'cobertura_desc') {
          return b.percentualCobertura - a.percentualCobertura;
        }
        if (ordenacao === 'estudantes_desc') {
          return b.totalEstudantes - a.totalEstudantes;
        }
        // nome A-Z
        return a.turma.localeCompare(b.turma, 'pt-BR', { numeric: true });
      });
  }, [dadosPorTurma, buscaTurma, filtroStatus, filtroTurno, ordenacao]);

  const toggleTurmaExpandida = (turma: string) => {
    setTurmasExpandidas(prev => ({
      ...prev,
      [turma]: !prev[turma]
    }));
  };

  const expandirTodas = () => {
    const mapa: Record<string, boolean> = {};
    turmasFiltradas.forEach(t => {
      mapa[t.turma] = true;
    });
    setTurmasExpandidas(mapa);
  };

  const recolherTodas = () => {
    setTurmasExpandidas({});
  };

  const handleBaixarPdf = async (pei: PeiDocumento, estudanteId: string) => {
    setBaixandoPeiId(pei.id || estudanteId);
    try {
      await baixarPeiComoPdf(pei, escolaConfig);
    } catch (e) {
      console.error('Erro ao baixar PEI PDF:', e);
    } finally {
      setBaixandoPeiId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Cabeçalho do Card */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-900/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <School className="h-3 w-3 text-emerald-400" />
              <span>Monitoramento de Cobertura Pedagógica</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-300 bg-slate-800/80 border border-slate-700 px-2.5 py-0.5 rounded-full">
              Ano Letivo 2026 • SEDUC-GO
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Estudantes por Turma & Cobertura de Planos de Ensino (PEI)</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Acompanhe em tempo real a proporção de alunos com Planos de Ensino Individualizados ativos em cada sala de aula da escola, identificando gargalos e assegurando a equidade inclusiva.
          </p>
        </div>

        {/* Resumo Dinâmico da Taxa Geral */}
        <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl flex items-center gap-4 w-full md:w-auto shrink-0 justify-between md:justify-start">
          <div>
            <span className="text-[10px] font-bold text-slate-300 uppercase block tracking-wider">
              Cobertura Geral da Escola
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-white">{metricasGlobais.taxaGeral}%</span>
              <span className="text-xs text-slate-300 font-semibold">
                ({metricasGlobais.totalComPei} de {metricasGlobais.totalEstudantes} PEIs ativos)
              </span>
            </div>
            {/* Mini barra de progresso */}
            <div className="w-36 h-2 bg-slate-700/80 rounded-full overflow-hidden mt-1.5 border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  metricasGlobais.taxaGeral >= 80
                    ? 'bg-emerald-400'
                    : metricasGlobais.taxaGeral >= 50
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, metricasGlobais.taxaGeral))}%` }}
              />
            </div>
          </div>

          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-emerald-300" />
          </div>
        </div>
      </div>

      {/* Grid de Métricas Globais (KPIs por Sala) */}
      <div className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Salas Ativas */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block truncate">
              Salas Atendidas
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-slate-900">{metricasGlobais.totalTurmas}</span>
              <span className="text-[11px] text-slate-500 font-medium">turmas</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1 truncate">
              Matutino e Vespertino
            </span>
          </div>

          {/* 2. Total Estudantes */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block truncate">
              Total de Estudantes
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-slate-900">{metricasGlobais.totalEstudantes}</span>
              <span className="text-[11px] text-slate-500 font-medium">alunos AEE</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1 truncate">
              Com laudo ou avaliação
            </span>
          </div>

          {/* 3. PEIs Ativos */}
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block truncate">
              PEIs Ativos (SIAP)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-emerald-700">{metricasGlobais.totalComPei}</span>
              <span className="text-[11px] text-emerald-800 font-semibold">homologados</span>
            </div>
            <span className="text-[10px] text-emerald-800 block mt-1 truncate">
              Planos adaptados ativos
            </span>
          </div>

          {/* 4. PEIs Pendentes */}
          <div className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 block truncate">
              PEIs Pendentes
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-rose-700">{metricasGlobais.totalSemPei}</span>
              <span className="text-[11px] text-rose-800 font-semibold">a elaborar</span>
            </div>
            <span className="text-[10px] text-rose-800 block mt-1 truncate">
              Necessitam de PEI
            </span>
          </div>

          {/* 5. Salas 100% Cobertas */}
          <div className="bg-white p-3.5 rounded-xl border border-teal-200/80 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 block truncate">
              Salas 100% Cobertas
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-teal-700">{metricasGlobais.turmasCompletas}</span>
              <span className="text-[11px] text-teal-800 font-semibold">de {metricasGlobais.totalTurmas}</span>
            </div>
            <span className="text-[10px] text-teal-800 block mt-1 truncate">
              Todos alunos com PEI
            </span>
          </div>

          {/* 6. Salas com Pendência */}
          <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block truncate">
              Salas com Pendência
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-amber-700">
                {metricasGlobais.turmasParciais + metricasGlobais.turmasSemPei}
              </span>
              <span className="text-[11px] text-amber-800 font-semibold">em atenção</span>
            </div>
            <span className="text-[10px] text-amber-800 block mt-1 truncate">
              Requerem ação pedagógica
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Pesquisa e Controles de Visualização */}
      <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Campo de Busca Rápida por Turma */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por sala, turma (ex: 8º B, 6º A), estudante ou PAE..."
              value={buscaTurma}
              onChange={(e) => setBuscaTurma(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
            />
            {buscaTurma && (
              <button
                type="button"
                onClick={() => setBuscaTurma('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Alternar Visualização: Cards vs Tabela */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setModoVisualizacao('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  modoVisualizacao === 'cards'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualizar em formato de grade com cartões dinâmicos"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Cards por Turma</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('tabela')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  modoVisualizacao === 'tabela'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualizar em formato de tabela consolidada"
              >
                <ListFilter className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Tabela Resumida</span>
              </button>
            </div>

            {/* Expandir / Recolher Todas */}
            {modoVisualizacao === 'cards' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={expandirTodas}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  title="Expandir estudantes de todas as turmas"
                >
                  Expandir Todos
                </button>
                <button
                  type="button"
                  onClick={recolherTodas}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  title="Recolher detalhes"
                >
                  Recolher
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Linha de Filtros de Estado e Turno */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          {/* Filtros de Cobertura */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Filtro:
            </span>
            {[
              { id: 'todas', label: `Todas as Salas (${dadosPorTurma.length})` },
              { id: 'completa', label: `100% Cobertas (${metricasGlobais.turmasCompletas})` },
              { id: 'parcial', label: `Parciais (${metricasGlobais.turmasParciais})` },
              { id: 'sem_pei', label: `Sem PEI (${metricasGlobais.turmasSemPei})` }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroStatus(f.id as typeof filtroStatus)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filtroStatus === f.id
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Turno e Ordenação */}
          <div className="flex items-center gap-2">
            <select
              value={filtroTurno}
              onChange={(e) => setFiltroTurno(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium cursor-pointer"
            >
              <option value="todos">Todos os Turnos</option>
              {turnosDisponiveis.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as typeof ordenacao)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium cursor-pointer"
            >
              <option value="urgencia">Prioridade (Menor Cobertura)</option>
              <option value="cobertura_desc">Maior Cobertura</option>
              <option value="estudantes_desc">Mais Estudantes</option>
              <option value="nome">Ordem da Turma (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal: Visualização em Cards ou Tabela */}
      <div className="p-4 sm:p-6">
        {turmasFiltradas.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Nenhuma turma encontrada</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Nenhuma sala corresponde aos critérios de pesquisa ou filtros selecionados.
            </p>
            <button
              type="button"
              onClick={() => {
                setBuscaTurma('');
                setFiltroStatus('todas');
                setFiltroTurno('todos');
              }}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 cursor-pointer"
            >
              Redefinir Filtros
            </button>
          </div>
        ) : modoVisualizacao === 'cards' ? (
          /* ========================================================================= */
          /* MODO CARDS DINÂMICOS */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {turmasFiltradas.map((t) => {
              const isExpanded = Boolean(turmasExpandidas[t.turma]);
              const eh100 = t.percentualCobertura === 100;
              const ehZero = t.percentualCobertura === 0;

              return (
                <div
                  key={t.turma}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    eh100
                      ? 'border-emerald-200 hover:border-emerald-400 shadow-2xs hover:shadow-xs'
                      : ehZero
                      ? 'border-rose-200 hover:border-rose-400 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Cabeçalho do Card da Turma */}
                  <div className="p-4 border-b border-slate-100 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black text-slate-900 tracking-tight">
                            {t.turma}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {t.turno}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {t.anoSerie}
                        </p>
                      </div>

                      {/* Badge de Status de Cobertura */}
                      {eh100 ? (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>100% Coberta</span>
                        </span>
                      ) : ehZero ? (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shrink-0">
                          <AlertTriangle className="h-3 w-3 text-rose-600" />
                          <span>Sem PEI Ativo</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3 text-amber-600" />
                          <span>{t.percentualCobertura}% Coberta</span>
                        </span>
                      )}
                    </div>

                    {/* Barra de Progresso Visual de Cobertura da Sala */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500 text-[11px]">Cobertura Pedagógica</span>
                        <span className={`font-black text-xs ${
                          eh100 ? 'text-emerald-700' : ehZero ? 'text-rose-700' : 'text-slate-800'
                        }`}>
                          {t.estudantesComPei} de {t.totalEstudantes} alunos ({t.percentualCobertura}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            eh100
                              ? 'bg-emerald-500'
                              : t.percentualCobertura >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(4, t.percentualCobertura)}%` }}
                        />
                      </div>
                    </div>

                    {/* Indicadores Numéricos em Mini Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Total</span>
                        <span className="text-sm font-black text-slate-800">{t.totalEstudantes}</span>
                      </div>
                      <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-200/60">
                        <span className="text-[10px] font-bold text-emerald-800 block uppercase">PEI Ativo</span>
                        <span className="text-sm font-black text-emerald-700">{t.estudantesComPei}</span>
                      </div>
                      <div className="p-2 bg-rose-50/70 rounded-xl border border-rose-200/60">
                        <span className="text-[10px] font-bold text-rose-800 block uppercase">Pendente</span>
                        <span className="text-sm font-black text-rose-700">{t.estudantesSemPei}</span>
                      </div>
                    </div>

                    {/* Profissional PAE vinculada à sala */}
                    {t.profissionaisApoio.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                        <HeartHandshake className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span className="font-bold text-slate-700 truncate">
                          PAE: {t.profissionaisApoio.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Seção Expansível com a Lista de Estudantes da Sala */}
                  <div className="p-3 bg-slate-50/40 border-t border-slate-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleTurmaExpandida(t.turma)}
                      className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{isExpanded ? 'Ocultar Estudantes' : `Ver ${t.totalEstudantes} Estudante(s)`}</span>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="pt-2 space-y-2 max-h-72 overflow-y-auto pr-1">
                        {t.estudantes.map(({ estudante, pei, temPei }) => (
                          <div
                            key={estudante.id}
                            className={`p-2.5 rounded-xl border bg-white transition-all text-xs space-y-1.5 ${
                              temPei
                                ? 'border-emerald-200 hover:border-emerald-300'
                                : 'border-rose-200 hover:border-rose-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 block leading-tight">
                                  {estudante.nome}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  Matrícula: {estudante.matricula || '—'}
                                </span>
                              </div>

                              {temPei ? (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                  PEI ATIVO
                                </span>
                              ) : (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                  SEM PEI
                                </span>
                              )}
                            </div>

                            {/* Laudo / Diagnóstico */}
                            {estudante.laudo && (
                              <p className="text-[10px] text-slate-600 line-clamp-1 bg-slate-50 p-1 rounded font-medium">
                                {estudante.laudo}
                              </p>
                            )}

                            {/* Ações para o Estudante */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                              {temPei && pei ? (
                                <div className="flex items-center gap-1.5 w-full justify-between">
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    {pei.period || '1º Bimestre'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {onVisualizarPei && (
                                      <button
                                        type="button"
                                        onClick={() => onVisualizarPei(pei)}
                                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[10px] cursor-pointer"
                                        title="Visualizar documento do PEI"
                                      >
                                        Ver
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleBaixarPdf(pei, estudante.id)}
                                      disabled={baixandoPeiId === (pei.id || estudante.id)}
                                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                      title="Baixar PEI em formato PDF oficial A4"
                                    >
                                      <Download className="h-2.5 w-2.5" />
                                      <span>PDF</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-[10px] text-rose-700 font-medium">
                                    Plano pendente
                                  </span>
                                  {onCriarPeiParaEstudante && (
                                    <button
                                      type="button"
                                      onClick={() => onCriarPeiParaEstudante(estudante.id)}
                                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer shadow-2xs"
                                      title="Abrir gerador oficial de PEI para este aluno"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                      <span>Criar PEI</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Botão para Navegar até a Aba de Estudantes com Filtro desta Turma */}
                    {onNavigateToEstudantesComTurma && (
                      <button
                        type="button"
                        onClick={() => onNavigateToEstudantesComTurma(t.turma)}
                        className="w-full mt-1 py-1.5 text-center text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center justify-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>Abrir módulo de Estudantes ({t.turma})</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* MODO TABELA CONSOLIDADA */
          /* ========================================================================= */
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Turma / Sala</th>
                  <th className="p-3">Série & Turno</th>
                  <th className="p-3 text-center">Total Alunos</th>
                  <th className="p-3 text-center">PEIs Ativos</th>
                  <th className="p-3 text-center">Pendentes</th>
                  <th className="p-3">Cobertura Pedagógica</th>
                  <th className="p-3">Apoio (PAE)</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {turmasFiltradas.map((t) => {
                  const eh100 = t.percentualCobertura === 100;
                  const ehZero = t.percentualCobertura === 0;

                  return (
                    <tr
                      key={t.turma}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-3 font-bold text-slate-900">
                        {t.turma}
                      </td>
                      <td className="p-3 text-slate-600">
                        <div className="space-y-0.5">
                          <span className="block font-medium">{t.anoSerie}</span>
                          <span className="text-[10px] text-slate-400">{t.turno}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-black text-slate-900">
                        {t.totalEstudantes}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-700">
                        {t.estudantesComPei}
                      </td>
                      <td className="p-3 text-center font-bold text-rose-700">
                        {t.estudantesSemPei}
                      </td>
                      <td className="p-3">
                        <div className="w-36 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={eh100 ? 'text-emerald-700' : ehZero ? 'text-rose-700' : 'text-slate-700'}>
                              {t.percentualCobertura}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {t.estudantesComPei}/{t.totalEstudantes}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                eh100 ? 'bg-emerald-500' : t.percentualCobertura >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.max(4, t.percentualCobertura)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 text-[11px]">
                        {t.profissionaisApoio.length > 0 ? t.profissionaisApoio.join(', ') : '—'}
                      </td>
                      <td className="p-3 text-right">
                        {onNavigateToEstudantesComTurma && (
                          <button
                            type="button"
                            onClick={() => onNavigateToEstudantesComTurma(t.turma)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Ver Sala</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rodapé Informativo e Diretrizes Oficiais SEDUC-GO */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Diretriz SEDUC-GO: Todo estudante público-alvo da Educação Especial com matrícula ativa deve dispor de PEI bimestral homologado pela equipe gestora e pedagógica.
          </span>
        </div>
        <div className="font-bold text-slate-700 shrink-0">
          Atualizado com base nos registros do sistema
        </div>
      </div>
    </div>
  );
};
