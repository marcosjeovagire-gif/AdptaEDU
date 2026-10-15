import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Calendar, 
  CalendarDays, 
  User, 
  Users, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Clock, 
  ArrowRight, 
  RotateCcw, 
  LayoutGrid, 
  List, 
  Eye, 
  Copy, 
  Check, 
  X, 
  Activity, 
  HeartHandshake, 
  GraduationCap, 
  HardDrive, 
  BookOpen, 
  Lock,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { RegistroAuditoria, RegistroHistorico, EscolaConfig } from '../../types';
import { exportAuditoriaToCSV, exportAuditoriaToPDF } from '../../services/auditExportService';

interface PainelAuditoriaAvancadaProps {
  auditoria: RegistroAuditoria[];
  historico: RegistroHistorico[];
  escolaConfig: EscolaConfig;
  currentUserName?: string;
  onOpenRelatorioFormalModal?: () => void;
  onExecutarTestesLgpd?: () => void;
}

type PeriodoRapido = 'todos' | 'hoje' | '7dias' | '30dias' | 'mes_atual' | 'personalizado';
type ModoVisualizacao = 'cards' | 'tabela';
type AbaAtivaPainel = 'auditoria' | 'historico';

/**
 * Converte qualquer representação de dataHora (pt-BR "DD/MM/YYYY HH:mm:ss", ISO, timestamp de ID)
 * para a string canônica "YYYY-MM-DD" para comparação estável de datas.
 */
function extrairDataIso(dataHoraStr?: string, idStr?: string): string {
  if (!dataHoraStr) {
    if (idStr) {
      const matchNum = idStr.match(/\d{10,13}/);
      if (matchNum) {
        const timestamp = parseInt(matchNum[0].length === 10 ? matchNum[0] + '000' : matchNum[0], 10);
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
    }
    return '';
  }

  // Padrão brasileiro: DD/MM/YYYY ou DD/MM/YYYY, HH:mm:ss
  const matchPtBr = dataHoraStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchPtBr) {
    const dia = matchPtBr[1].padStart(2, '0');
    const mes = matchPtBr[2].padStart(2, '0');
    const ano = matchPtBr[3];
    return `${ano}-${mes}-${dia}`;
  }

  // Padrão ISO: YYYY-MM-DD
  const matchIso = dataHoraStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return matchIso[0];
  }

  // Fallback via Date.parse
  const parsed = Date.parse(dataHoraStr);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }

  return '';
}

/**
 * Identifica a categoria temática da ação para classificação e filtragem
 */
function categorizarAcao(detalhes: string): {
  categoria: string;
  corBadge: string;
  icone: React.ElementType;
} {
  const texto = detalhes.toLowerCase();

  if (texto.includes('apoio') || texto.includes('diário') || texto.includes('diario') || texto.includes('pae') || texto.includes('acompanhamento')) {
    return { categoria: 'Acompanhamento de Apoio', corBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200', icone: HeartHandshake };
  }
  if (texto.includes('estudante') || texto.includes('aluno') || texto.includes('matrícula') || texto.includes('ficha') || texto.includes('importação de estudantes') || texto.includes('pei')) {
    return { categoria: 'Estudantes & Matrícula', corBadge: 'bg-indigo-50 text-indigo-800 border-indigo-200', icone: GraduationCap };
  }
  if (texto.includes('professor') || texto.includes('usuário') || texto.includes('acesso') || texto.includes('perfil') || texto.includes('autenticação') || texto.includes('login')) {
    return { categoria: 'Usuários & Permissões', corBadge: 'bg-sky-50 text-sky-800 border-sky-200', icone: Users };
  }
  if (texto.includes('drive') || texto.includes('backup') || texto.includes('google drive') || texto.includes('nuvem')) {
    return { categoria: 'Backup & Google Drive', corBadge: 'bg-amber-50 text-amber-800 border-amber-200', icone: HardDrive };
  }
  if (texto.includes('matriz') || texto.includes('habilidade') || texto.includes('bncc') || texto.includes('currículo')) {
    return { categoria: 'Matriz Curricular', corBadge: 'bg-purple-50 text-purple-800 border-purple-200', icone: BookOpen };
  }
  if (texto.includes('segurança') || texto.includes('lgpd') || texto.includes('bloqueio') || texto.includes('duplic')) {
    return { categoria: 'Segurança & LGPD', corBadge: 'bg-rose-50 text-rose-800 border-rose-200', icone: Lock };
  }

  return { categoria: 'Operação Administrativa', corBadge: 'bg-slate-50 text-slate-800 border-slate-200', icone: Activity };
}

export const PainelAuditoriaAvancada: React.FC<PainelAuditoriaAvancadaProps> = ({
  auditoria,
  historico,
  escolaConfig,
  currentUserName,
  onOpenRelatorioFormalModal,
  onExecutarTestesLgpd,
}) => {
  // Aba ativa: Auditoria detalhada vs Histórico do Sistema
  const [abaAtiva, setAbaAtiva] = useState<AbaAtivaPainel>('auditoria');

  // Modo de visualização: cards detalhados vs tabela condensada
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>('cards');

  // Estados de Filtro
  const [busca, setBusca] = useState('');
  const [periodoRapido, setPeriodoRapido] = useState<PeriodoRapido>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('todos');
  const [filtroAlvo, setFiltroAlvo] = useState<string>('todos');
  const [filtroResultado, setFiltroResultado] = useState<'todos' | 'Sucesso' | 'Bloqueado'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [ordemTemporal, setOrdemTemporal] = useState<'desc' | 'asc'>('desc');

  // Itens por página
  const [itensPorPagina, setItensPorPagina] = useState<number>(25);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);

  // Modal de Detalhes de Registro Específico
  const [registroSelecionadoModal, setRegistroSelecionadoModal] = useState<RegistroAuditoria | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Feedback de Exportação
  const [isExportando, setIsExportando] = useState<'csv' | 'pdf' | null>(null);

  // Lista dinâmica de Usuários Responsáveis com contagem
  const usuariosResponsaveis = useMemo(() => {
    const mapa = new Map<string, number>();
    auditoria.forEach(reg => {
      const nome = reg.usuarioResponsavel?.trim() || 'Sistema / Não informado';
      mapa.set(nome, (mapa.get(nome) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count);
  }, [auditoria]);

  // Lista dinâmica de Alvos / Usuários Alterados
  const alvosAlterados = useMemo(() => {
    const mapa = new Map<string, number>();
    auditoria.forEach(reg => {
      const alvo = reg.usuarioAlterado?.trim() || 'Geral / Múltiplos';
      mapa.set(alvo, (mapa.get(alvo) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count);
  }, [auditoria]);

  // Lista de Categorias
  const categoriasDisponiveis = [
    'Acompanhamento de Apoio',
    'Estudantes & Matrícula',
    'Usuários & Permissões',
    'Backup & Google Drive',
    'Matriz Curricular',
    'Segurança & LGPD',
    'Operação Administrativa'
  ];

  // Aplicação do atalho de período rápido
  const handleSelecionarPeriodoRapido = (periodo: PeriodoRapido) => {
    setPeriodoRapido(periodo);
    setPaginaAtual(1);

    const hoje = new Date();
    const hojeIso = hoje.toISOString().split('T')[0];

    if (periodo === 'todos') {
      setDataInicio('');
      setDataFim('');
    } else if (periodo === 'hoje') {
      setDataInicio(hojeIso);
      setDataFim(hojeIso);
    } else if (periodo === '7dias') {
      const seteDiasAtras = new Date(hoje);
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      setDataInicio(seteDiasAtras.toISOString().split('T')[0]);
      setDataFim(hojeIso);
    } else if (periodo === '30dias') {
      const trintaDiasAtras = new Date(hoje);
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      setDataInicio(trintaDiasAtras.toISOString().split('T')[0]);
      setDataFim(hojeIso);
    } else if (periodo === 'mes_atual') {
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      setDataInicio(primeiroDia.toISOString().split('T')[0]);
      setDataFim(ultimoDia.toISOString().split('T')[0]);
    }
  };

  // Limpeza de todos os filtros
  const handleLimparFiltros = () => {
    setBusca('');
    setPeriodoRapido('todos');
    setDataInicio('');
    setDataFim('');
    setFiltroResponsavel('todos');
    setFiltroAlvo('todos');
    setFiltroResultado('todos');
    setFiltroCategoria('todas');
    setPaginaAtual(1);
  };

  // Verifica se há algum filtro ativo diferente do padrão
  const temFiltroAtivo = useMemo(() => {
    return Boolean(
      busca.trim() || 
      dataInicio || 
      dataFim || 
      periodoRapido !== 'todos' || 
      filtroResponsavel !== 'todos' || 
      filtroAlvo !== 'todos' || 
      filtroResultado !== 'todos' || 
      filtroCategoria !== 'todas'
    );
  }, [busca, dataInicio, dataFim, periodoRapido, filtroResponsavel, filtroAlvo, filtroResultado, filtroCategoria]);

  // FILTRAGEM EFETIVA DOS REGISTROS DE AUDITORIA
  const registrosAuditoriaFiltrados = useMemo(() => {
    const lista = auditoria.filter(reg => {
      // 1. Filtro por Resultado
      if (filtroResultado !== 'todos' && reg.resultado !== filtroResultado) {
        return false;
      }

      // 2. Filtro por Usuário Responsável
      if (filtroResponsavel !== 'todos') {
        const resp = reg.usuarioResponsavel?.trim() || '';
        if (resp !== filtroResponsavel) return false;
      }

      // 3. Filtro por Alvo
      if (filtroAlvo !== 'todos') {
        const alvo = reg.usuarioAlterado?.trim() || '';
        if (alvo !== filtroAlvo) return false;
      }

      // 4. Filtro por Categoria Temática
      if (filtroCategoria !== 'todas') {
        const { categoria } = categorizarAcao(reg.detalhes || '');
        if (categoria !== filtroCategoria) return false;
      }

      // 5. Filtro por Data (Início e Fim)
      if (dataInicio || dataFim) {
        const dataRegIso = extrairDataIso(reg.dataHora, reg.id);
        if (dataRegIso) {
          if (dataInicio && dataRegIso < dataInicio) return false;
          if (dataFim && dataRegIso > dataFim) return false;
        }
      }

      // 6. Busca textual abrangente
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const bateu = 
          (reg.detalhes && reg.detalhes.toLowerCase().includes(termo)) ||
          (reg.usuarioResponsavel && reg.usuarioResponsavel.toLowerCase().includes(termo)) ||
          (reg.usuarioAlterado && reg.usuarioAlterado.toLowerCase().includes(termo)) ||
          (reg.dataHora && reg.dataHora.toLowerCase().includes(termo)) ||
          (reg.situacaoAnterior && reg.situacaoAnterior.toLowerCase().includes(termo)) ||
          (reg.situacaoPosterior && reg.situacaoPosterior.toLowerCase().includes(termo)) ||
          (reg.id && reg.id.toLowerCase().includes(termo));
        if (!bateu) return false;
      }

      return true;
    });

    // Ordenação temporal
    return lista.sort((a, b) => {
      const dataA = extrairDataIso(a.dataHora, a.id);
      const dataB = extrairDataIso(b.dataHora, b.id);
      return ordemTemporal === 'desc' 
        ? dataB.localeCompare(dataA) 
        : dataA.localeCompare(dataB);
    });
  }, [auditoria, filtroResultado, filtroResponsavel, filtroAlvo, filtroCategoria, dataInicio, dataFim, busca, ordemTemporal]);

  // FILTRAGEM DO HISTÓRICO GERAL DO SISTEMA
  const registrosHistoricoFiltrados = useMemo(() => {
    return historico.filter(h => {
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const bateu = 
          (h.descricao && h.descricao.toLowerCase().includes(termo)) ||
          (h.tipo && h.tipo.toLowerCase().includes(termo)) ||
          (h.usuario && h.usuario.toLowerCase().includes(termo)) ||
          (h.data && h.data.toLowerCase().includes(termo));
        if (!bateu) return false;
      }
      if (filtroResponsavel !== 'todos' && h.usuario !== filtroResponsavel) {
        return false;
      }
      return true;
    });
  }, [historico, busca, filtroResponsavel]);

  // Contadores analíticos
  const totalAuditados = auditoria.length;
  const totalSucessos = useMemo(() => auditoria.filter(a => a.resultado === 'Sucesso').length, [auditoria]);
  const totalBloqueados = useMemo(() => auditoria.filter(a => a.resultado === 'Bloqueado').length, [auditoria]);
  const totalResponsaveisUnicos = usuariosResponsaveis.length;

  // Paginação
  const totalPaginas = Math.ceil(registrosAuditoriaFiltrados.length / itensPorPagina) || 1;
  const registrosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return registrosAuditoriaFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [registrosAuditoriaFiltrados, paginaAtual, itensPorPagina]);

  // Exportação com os registros estritamente filtrados
  const handleExportarCsvFiltrado = () => {
    setIsExportando('csv');
    try {
      exportAuditoriaToCSV(registrosAuditoriaFiltrados, escolaConfig, currentUserName);
    } finally {
      setTimeout(() => setIsExportando(null), 500);
    }
  };

  const handleExportarPdfFiltrado = () => {
    setIsExportando('pdf');
    try {
      exportAuditoriaToPDF(registrosAuditoriaFiltrados, escolaConfig, currentUserName);
    } finally {
      setTimeout(() => setIsExportando(null), 800);
    }
  };

  const handleCopiarIdRegistro = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2500);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DO MÓDULO & AÇÕES DE EXPORTAÇÃO */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <span>Auditoria e Rastreabilidade do Sistema</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Conformidade LGPD
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico e imutável de todas as operações administrativas, importações, cadastros e acessos.
          </p>
        </div>

        {/* Botões de Exportação e Ferramentas */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          <button
            type="button"
            onClick={handleExportarCsvFiltrado}
            disabled={registrosAuditoriaFiltrados.length === 0 || isExportando === 'csv'}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all disabled:opacity-50"
            title={`Exportar ${registrosAuditoriaFiltrados.length} registros filtrados em planilha CSV (Excel)`}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span>CSV ({registrosAuditoriaFiltrados.length})</span>
          </button>

          <button
            type="button"
            onClick={handleExportarPdfFiltrado}
            disabled={registrosAuditoriaFiltrados.length === 0 || isExportando === 'pdf'}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50"
            title={`Exportar ${registrosAuditoriaFiltrados.length} registros filtrados em relatório formal PDF`}
          >
            <FileText className="h-4 w-4 text-white" />
            <span>PDF ({registrosAuditoriaFiltrados.length})</span>
          </button>

          {onOpenRelatorioFormalModal && (
            <button
              type="button"
              onClick={onOpenRelatorioFormalModal}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              title="Visualizar e personalizar relatório formal impresso em A4"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span className="hidden sm:inline">Relatório Formal</span>
            </button>
          )}

          {onExecutarTestesLgpd && (
            <button
              type="button"
              onClick={onExecutarTestesLgpd}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Executar bateria de testes de conformidade LGPD e segurança de dados"
            >
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Testes LGPD</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARDS DE INDICADORES ANALÍTICOS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total de Ações</span>
            <strong className="text-base sm:text-lg font-black text-slate-900">{totalAuditados}</strong>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Sucesso</span>
            <strong className="text-base sm:text-lg font-black text-emerald-900">
              {totalSucessos} <span className="text-[10px] text-slate-400 font-normal">({totalAuditados > 0 ? Math.round((totalSucessos / totalAuditados) * 100) : 100}%)</span>
            </strong>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Bloqueados</span>
            <strong className="text-base sm:text-lg font-black text-rose-900">{totalBloqueados}</strong>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Usuários Ativos</span>
            <strong className="text-base sm:text-lg font-black text-indigo-900">{totalResponsaveisUnicos}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PAINEL DE CONTROLE DE FILTROS AVANÇADOS (DATA, USUÁRIO E CRITÉRIOS)     */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        
        {/* Barra Superior: Abas e Busca Geral */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setAbaAtiva('auditoria'); setPaginaAtual(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                abaAtiva === 'auditoria'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>Logs de Auditoria ({auditoria.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setAbaAtiva('historico'); setPaginaAtual(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                abaAtiva === 'historico'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Histórico do Sistema ({historico.length})</span>
            </button>
          </div>

          {/* Campo de Busca Livre */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={e => { setBusca(e.target.value); setPaginaAtual(1); }}
              placeholder="Buscar por usuário, ação, estudante ou termo..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50 focus:bg-white transition-all"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Linha 1 de Filtros: Filtros por Data */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Atalhos Rápidos de Período */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Período:</span>
              </span>

              {[
                { id: 'todos', label: 'Todos' },
                { id: 'hoje', label: 'Hoje' },
                { id: '7dias', label: 'Últimos 7 dias' },
                { id: '30dias', label: 'Últimos 30 dias' },
                { id: 'mes_atual', label: 'Mês Atual' },
                { id: 'personalizado', label: 'Personalizado' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelecionarPeriodoRapido(p.id as PeriodoRapido)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                    periodoRapido === p.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Intervalo Exato de Datas (Data Inicial e Data Final) */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">De:</span>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => {
                    setDataInicio(e.target.value);
                    setPeriodoRapido('personalizado');
                    setPaginaAtual(1);
                  }}
                  className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">Até:</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={e => {
                    setDataFim(e.target.value);
                    setPeriodoRapido('personalizado');
                    setPaginaAtual(1);
                  }}
                  className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none"
                />
              </div>

              {(dataInicio || dataFim) && (
                <button
                  type="button"
                  onClick={() => {
                    setDataInicio('');
                    setDataFim('');
                    setPeriodoRapido('todos');
                    setPaginaAtual(1);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Limpar filtro de data"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Linha 2 de Filtros: Filtros por Usuário e Categoria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 text-xs">
          
          {/* 1. Filtro por Usuário Responsável */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <User className="h-3 w-3 text-slate-500" />
              <span>Usuário Responsável:</span>
            </label>
            <select
              value={filtroResponsavel}
              onChange={e => { setFiltroResponsavel(e.target.value); setPaginaAtual(1); }}
              className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="todos">Todos os Usuários ({usuariosResponsaveis.length})</option>
              {usuariosResponsaveis.map(u => (
                <option key={u.nome} value={u.nome}>
                  {u.nome} ({u.count})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filtro por Usuário / Alvo Alterado */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Tag className="h-3 w-3 text-slate-500" />
              <span>Alvo / Entidade:</span>
            </label>
            <select
              value={filtroAlvo}
              onChange={e => { setFiltroAlvo(e.target.value); setPaginaAtual(1); }}
              className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="todos">Todos os Alvos ({alvosAlterados.length})</option>
              {alvosAlterados.map(a => (
                <option key={a.nome} value={a.nome}>
                  {a.nome} ({a.count})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filtro por Categoria Temática */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Activity className="h-3 w-3 text-slate-500" />
              <span>Categoria de Ação:</span>
            </label>
            <select
              value={filtroCategoria}
              onChange={e => { setFiltroCategoria(e.target.value); setPaginaAtual(1); }}
              className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="todas">Todas as Categorias</option>
              {categoriasDisponiveis.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 4. Filtro por Resultado / Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-slate-500" />
              <span>Resultado da Ação:</span>
            </label>
            <select
              value={filtroResultado}
              onChange={e => { setFiltroResultado(e.target.value as any); setPaginaAtual(1); }}
              className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="todos">Todos os Resultados</option>
              <option value="Sucesso">Apenas Sucesso ({totalSucessos})</option>
              <option value="Bloqueado">Apenas Bloqueados ({totalBloqueados})</option>
            </select>
          </div>

        </div>

        {/* Barra de Status dos Filtros Ativos e Alternância de Visualização */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-700">
              {abaAtiva === 'auditoria'
                ? `Exibindo ${registrosAuditoriaFiltrados.length} de ${auditoria.length} logs de auditoria`
                : `Exibindo ${registrosHistoricoFiltrados.length} de ${historico.length} registros de histórico`}
            </span>

            {temFiltroAtivo && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          {/* Controles de Visualização: Ordem e Formato (Cards / Tabela) */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setOrdemTemporal(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Inverter ordem cronológica"
            >
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{ordemTemporal === 'desc' ? 'Mais recentes' : 'Mais antigos'}</span>
            </button>

            {abaAtiva === 'auditoria' && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setModoVisualizacao('cards')}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                    modoVisualizacao === 'cards' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Exibir em cards detalhados"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setModoVisualizacao('tabela')}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                    modoVisualizacao === 'tabela' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Exibir em tabela compacta"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. LISTAGEM PRINCIPAL: AUDITORIA DETALHADA                                */}
      {/* ========================================================================= */}
      {abaAtiva === 'auditoria' ? (
        registrosAuditoriaFiltrados.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Filter className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                Nenhum registro de auditoria corresponde aos filtros
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tente ajustar o intervalo de datas, selecionar outro usuário responsável ou limpar os termos da pesquisa.
              </p>
            </div>
            {temFiltroAtivo && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar Todos os Logs</span>
              </button>
            )}
          </div>
        ) : modoVisualizacao === 'cards' ? (
          /* ========================================== */
          /* MODO CARDS DETALHADOS COM METADADOS RICOS */
          /* ========================================== */
          <div className="space-y-3">
            {registrosPaginados.map(reg => {
              const { categoria, corBadge, icone: IconeCat } = categorizarAcao(reg.detalhes || '');
              const iniciaisResponsavel = (reg.usuarioResponsavel || 'US')
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={reg.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all p-4 space-y-3"
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Badge de Resultado */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 border ${
                        reg.resultado === 'Sucesso'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        {reg.resultado === 'Sucesso' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-700 shrink-0" />
                        ) : (
                          <ShieldAlert className="h-3 w-3 text-rose-700 shrink-0" />
                        )}
                        <span>{reg.resultado}</span>
                      </span>

                      {/* Badge de Categoria */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${corBadge}`}>
                        <IconeCat className="h-3 w-3 shrink-0" />
                        <span>{categoria}</span>
                      </span>

                      {/* ID do Log de Auditoria */}
                      <button
                        type="button"
                        onClick={() => handleCopiarIdRegistro(reg.id)}
                        className="text-[10px] font-mono text-slate-400 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                        title="Clique para copiar o ID deste registro"
                      >
                        <span>ID: {reg.id.slice(0, 16)}...</span>
                        {copiadoId === reg.id ? (
                          <Check className="h-2.5 w-2.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-2.5 w-2.5 opacity-60" />
                        )}
                      </button>
                    </div>

                    {/* Data e Hora Exata */}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 shrink-0 self-start sm:self-auto">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{reg.dataHora}</span>
                    </div>
                  </div>

                  {/* Descrição Detalhada da Operação */}
                  <div className="text-xs text-slate-900 font-bold leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {reg.detalhes}
                  </div>

                  {/* Informações dos Usuários Envolvidos e Transição de Estados */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs">
                    
                    {/* Responsável pela Execução */}
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-[11px] shrink-0 border border-emerald-200">
                        {iniciaisResponsavel}
                      </div>
                      <div className="leading-tight truncate">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Responsável</span>
                        <strong className="text-slate-800 text-xs truncate block" title={reg.usuarioResponsavel}>
                          {reg.usuarioResponsavel || 'Sistema'}
                        </strong>
                      </div>
                    </div>

                    {/* Alvo / Registro Alterado */}
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center text-[11px] shrink-0 border border-slate-200">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="leading-tight truncate">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Alvo / Estudante</span>
                        <strong className="text-slate-800 text-xs truncate block" title={reg.usuarioAlterado}>
                          {reg.usuarioAlterado || 'Geral'}
                        </strong>
                      </div>
                    </div>

                    {/* Botão de Ver Detalhes Completos */}
                    <div className="flex items-center justify-start sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setRegistroSelecionadoModal(reg)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        <span>Ver Detalhes do Log</span>
                      </button>
                    </div>

                  </div>

                  {/* Transição de Situação (se houver) */}
                  {(reg.situacaoAnterior || reg.situacaoPosterior) && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Transição de Situação:</span>
                      <span className="px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium">
                        {reg.situacaoAnterior || 'Inexistente'}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                        {reg.situacaoPosterior || 'Concluído'}
                      </span>
                    </div>
                  )}

                  {/* Transição de Perfis (se houver) */}
                  {((reg.perfisAnteriores && reg.perfisAnteriores.length > 0) || (reg.perfisPosteriores && reg.perfisPosteriores.length > 0)) && (
                    <div className="p-2.5 bg-sky-50/60 rounded-xl border border-sky-100 flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-[10px] uppercase font-bold text-sky-700">Perfis Atribuídos:</span>
                      <span className="font-mono text-[11px] text-slate-600">
                        {reg.perfisAnteriores?.join(', ') || 'Nenhum'}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-sky-400" />
                      <span className="font-mono text-[11px] text-sky-900 font-bold">
                        {reg.perfisPosteriores?.join(', ') || 'Nenhum'}
                      </span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================== */
          /* MODO TABELA CONDENSADA                     */
          /* ========================================== */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Resultado</th>
                    <th className="p-3">Data e Hora</th>
                    <th className="p-3">Responsável</th>
                    <th className="p-3">Alvo</th>
                    <th className="p-3">Detalhes da Ação</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrosPaginados.map(reg => (
                    <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit border ${
                          reg.resultado === 'Sucesso'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {reg.resultado === 'Sucesso' ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-700 shrink-0" />
                          ) : (
                            <ShieldAlert className="h-3 w-3 text-rose-700 shrink-0" />
                          )}
                          <span>{reg.resultado}</span>
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {reg.dataHora}
                      </td>

                      <td className="p-3 whitespace-nowrap font-bold text-slate-800">
                        {reg.usuarioResponsavel}
                      </td>

                      <td className="p-3 whitespace-nowrap text-slate-600">
                        {reg.usuarioAlterado || 'Geral'}
                      </td>

                      <td className="p-3 text-slate-800 font-medium max-w-md truncate" title={reg.detalhes}>
                        {reg.detalhes}
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setRegistroSelecionadoModal(reg)}
                          className="px-2.5 py-1 text-emerald-800 hover:bg-emerald-50 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* MODO HISTÓRICO GERAL DO SISTEMA                                           */
        /* ========================================================================= */
        registrosHistoricoFiltrados.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Nenhum evento no histórico</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Nenhuma entrada de histórico foi localizada com os filtros atuais.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
            {registrosHistoricoFiltrados.map(h => (
              <div key={h.id} className="p-3.5 hover:bg-slate-50/80 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase">
                      {h.tipo}
                    </span>
                    <strong className="text-slate-800 text-xs">{h.descricao}</strong>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Usuário executor: <strong className="text-slate-700">{h.usuario || 'Sistema'}</strong>
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 shrink-0 self-start sm:self-auto">
                  {h.data}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 5. BARRA DE PAGINAÇÃO                                                     */}
      {/* ========================================================================= */}
      {abaAtiva === 'auditoria' && registrosAuditoriaFiltrados.length > 0 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span>Mostrar</span>
            <select
              value={itensPorPagina}
              onChange={e => { setItensPorPagina(Number(e.target.value)); setPaginaAtual(1); }}
              className="p-1 rounded-lg border border-slate-200 font-bold text-slate-700 bg-slate-50"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>por página</span>
          </div>

          <div className="flex items-center gap-1.5 self-center">
            <button
              type="button"
              disabled={paginaAtual <= 1}
              onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-slate-700 font-bold">
              Página {paginaAtual} de {totalPaginas}
            </span>
            <button
              type="button"
              disabled={paginaAtual >= totalPaginas}
              onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE DETALHES COMPLETOS DO LOG DE AUDITORIA                            */}
      {/* ========================================================================= */}
      {registroSelecionadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Ficha Detalhada do Registro de Auditoria
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRegistroSelecionadoModal(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400">Identificador Imutável (ID)</span>
                <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-slate-800 font-bold">
                  <span className="break-all">{registroSelecionadoModal.id}</span>
                  <button
                    type="button"
                    onClick={() => handleCopiarIdRegistro(registroSelecionadoModal.id)}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600 shrink-0"
                    title="Copiar ID"
                  >
                    {copiadoId === registroSelecionadoModal.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Data e Hora</span>
                  <strong className="text-slate-900 font-mono text-xs">{registroSelecionadoModal.dataHora}</strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Resultado</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold inline-block mt-0.5 ${
                    registroSelecionadoModal.resultado === 'Sucesso'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-rose-100 text-rose-900'
                  }`}>
                    {registroSelecionadoModal.resultado}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Usuário Executor</span>
                  <strong className="text-slate-900 text-xs">{registroSelecionadoModal.usuarioResponsavel}</strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Alvo Afetado</span>
                  <strong className="text-slate-900 text-xs">{registroSelecionadoModal.usuarioAlterado || 'Geral'}</strong>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Descrição Completa da Operação</span>
                <p className="text-slate-800 text-xs font-medium leading-relaxed">
                  {registroSelecionadoModal.detalhes}
                </p>
              </div>

              {(registroSelecionadoModal.situacaoAnterior || registroSelecionadoModal.situacaoPosterior) && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Mudança de Situação</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px]">
                      {registroSelecionadoModal.situacaoAnterior || 'Inexistente'}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[11px] font-bold">
                      {registroSelecionadoModal.situacaoPosterior || 'Concluído'}
                    </span>
                  </div>
                </div>
              )}

              {((registroSelecionadoModal.perfisAnteriores && registroSelecionadoModal.perfisAnteriores.length > 0) || 
                (registroSelecionadoModal.perfisPosteriores && registroSelecionadoModal.perfisPosteriores.length > 0)) && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Transição de Perfis</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-600">
                      {registroSelecionadoModal.perfisAnteriores?.join(', ') || 'Nenhum'}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="font-mono text-[11px] text-sky-900 font-bold">
                      {registroSelecionadoModal.perfisPosteriores?.join(', ') || 'Nenhum'}
                    </span>
                  </div>
                </div>
              )}

            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRegistroSelecionadoModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
