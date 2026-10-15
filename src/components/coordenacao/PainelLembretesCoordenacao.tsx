import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  FileEdit, 
  UserCheck, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  ShieldAlert, 
  Filter, 
  Eye, 
  ExternalLink,
  Sparkles,
  UserX,
  FileText,
  Search,
  RotateCcw,
  CheckCheck
} from 'lucide-react';
import { 
  AtividadeAdaptada, 
  Estudante, 
  RegistroAcompanhamentoApoio, 
  AuthorizedUser,
  PeiDocumento
} from '../../types';

export interface PainelLembretesCoordenacaoProps {
  atividades: AtividadeAdaptada[];
  estudantes: Estudante[];
  registrosApoio?: RegistroAcompanhamentoApoio[];
  peisArmazenados?: PeiDocumento[];
  usuariosAutorizados?: AuthorizedUser[];
  onVisualizarAtividade: (atividade: AtividadeAdaptada) => void;
  onNavigateToApoio?: () => void;
  onNavigateToTab?: (tabId: string) => void;
  onMarcarAtividadeRevisada?: (atividadeId: string) => void;
  onVisualizarPei?: (pei: PeiDocumento) => void;
  onCriarPeiParaEstudante?: (estudanteId: string) => void;
  onNavigateToEstudante?: (estudanteId: string, turma?: string) => void;
}

export type TipoLembrete = 
  | 'pei_vencendo'
  | 'apoio_sem_registro_15d'
  | 'atividade_pendente'
  | 'apoio_sem_registro_recente';

export type FiltroLembrete = 'todos' | 'prazos_pei' | 'apoio_15_dias' | 'atividades';

export interface LembreteItem {
  id: string;
  tipo: TipoLembrete;
  titulo: string;
  descricao: string;
  estudanteNome: string;
  estudanteId?: string;
  turma?: string;
  responsavelNome?: string;
  responsavelEmail?: string;
  dataReferencia: string;
  diasPendente: number; // Dias pendente ou dias restantes até expirar
  severidade: 'alta' | 'media' | 'baixa';
  badgeTexto?: string;
  atividadeRef?: AtividadeAdaptada;
  peiRef?: PeiDocumento;
}

export const PainelLembretesCoordenacao: React.FC<PainelLembretesCoordenacaoProps> = ({
  atividades,
  estudantes,
  registrosApoio = [],
  peisArmazenados = [],
  usuariosAutorizados = [],
  onVisualizarAtividade,
  onNavigateToApoio,
  onNavigateToTab,
  onMarcarAtividadeRevisada,
  onVisualizarPei,
  onCriarPeiParaEstudante,
  onNavigateToEstudante,
}) => {
  const [expandido, setExpandido] = useState<boolean>(true);
  const [filtroTipo, setFiltroTipo] = useState<FiltroLembrete>('todos');
  const [buscaTexto, setBuscaTexto] = useState<string>('');
  const [lembretesIgnorados, setLembretesIgnorados] = useState<Set<string>>(new Set());

  // Calcula todas as notificações pedagógicas em tempo real
  const lembretes = useMemo(() => {
    const lista: LembreteItem[] = [];
    const agora = new Date();

    // 1. PRAZOS DE PEIS PRESTES A VENCER OU EXPIRADOS (Aviso de 15 dias ou menos)
    peisArmazenados.forEach((pei) => {
      let dataValidade: Date;
      if (pei.dataValidade) {
        dataValidade = new Date(pei.dataValidade);
      } else if (pei.dataRevisao) {
        dataValidade = new Date(pei.dataRevisao);
      } else {
        // Ciclo oficial bimestral de 60 dias a partir da criação
        const dataCriacao = pei.createdAt ? new Date(pei.createdAt) : agora;
        dataValidade = new Date(dataCriacao.getTime() + 60 * 24 * 3600 * 1000);
      }

      const diffMs = dataValidade.getTime() - agora.getTime();
      const diasRestantes = Math.round(diffMs / (1000 * 3600 * 24));

      // Dispara alerta se faltarem 15 dias ou menos, ou se já estiver vencido (< 0)
      if (diasRestantes <= 15) {
        const isVencido = diasRestantes < 0;
        const diasAbs = Math.abs(diasRestantes);
        
        let severidade: 'alta' | 'media' | 'baixa' = 'media';
        let titulo = '';
        let badgeTexto = '';

        if (isVencido) {
          severidade = 'alta';
          titulo = `PEI com prazo de vigência vencido há ${diasAbs} dia(s)`;
          badgeTexto = `Vencido há ${diasAbs}d`;
        } else if (diasRestantes === 0) {
          severidade = 'alta';
          titulo = `PEI vence hoje! Requer renovação bimestral`;
          badgeTexto = `Vence hoje`;
        } else {
          severidade = diasRestantes <= 5 ? 'alta' : 'media';
          titulo = `PEI prestes a vencer em ${diasRestantes} dia(s)`;
          badgeTexto = `Vence em ${diasRestantes}d`;
        }

        lista.push({
          id: `pei-prazo-${pei.id}`,
          tipo: 'pei_vencendo',
          titulo,
          descricao: `Plano de Ensino Individualizado de ${pei.studentName} (${pei.grade || 'Ano'} - ${pei.classRoom || 'Turma'}). Validade prevista: ${dataValidade.toLocaleDateString('pt-BR')}. Disciplina: ${pei.subject || 'Geral'}.`,
          estudanteNome: pei.studentName,
          estudanteId: pei.studentId,
          turma: pei.classRoom || pei.grade || 'Sem turma',
          responsavelNome: pei.supportTeacher || pei.regentTeacher || 'Prof. Regente / PAE',
          dataReferencia: dataValidade.toISOString(),
          diasPendente: diasRestantes,
          severidade,
          badgeTexto,
          peiRef: pei,
        });
      }
    });

    // 2. ESTUDANTES QUE NÃO POSSUEM REGISTROS DE ACOMPANHAMENTO NOS ÚLTIMOS 15 DIAS
    const estudantesComNecessidadeApoio = estudantes.filter((est) => {
      return (
        est.situacao === 'ativo' &&
        (Boolean(est.paeResponsavelNome) ||
         Boolean(est.profissionaisApoioIds && est.profissionaisApoioIds.length > 0) ||
         Boolean(est.laudo) ||
         est.statusLaudo === 'aprovado' ||
         est.statusLaudo === 'investigacao')
      );
    });

    // Agrupa registros de apoio por estudante e encontra a data mais recente
    const mapaUltimoRegistroPorEstudante = new Map<string, { data: string; diasAtras: number }>();
    registrosApoio.forEach((reg) => {
      if (!reg.studentId) return;
      const dataReg = new Date(reg.data);
      const dias = Math.max(0, Math.floor((agora.getTime() - dataReg.getTime()) / (1000 * 3600 * 24)));
      const atual = mapaUltimoRegistroPorEstudante.get(reg.studentId);
      if (!atual || dias < atual.diasAtras) {
        mapaUltimoRegistroPorEstudante.set(reg.studentId, { data: reg.data, diasAtras: dias });
      }
    });

    estudantesComNecessidadeApoio.forEach((est) => {
      const ultimoReg = mapaUltimoRegistroPorEstudante.get(est.id);
      const responsavel = est.paeResponsavelNome || 'Profissional de Apoio Escolar (PAE)';

      if (!ultimoReg) {
        // NUNCA teve registro de apoio preenchido (mais de 15 dias de defasagem)
        lista.push({
          id: `apoio-15d-nunca-${est.id}`,
          tipo: 'apoio_sem_registro_15d',
          titulo: `Estudante sem nenhum registro de acompanhamento nos últimos 15 dias`,
          descricao: `O aluno ${est.nome} possui acompanhamento especial previsto (${est.laudo || 'AEE / Necessidades Especiais'}), porém nenhum diário de bordo foi registrado pela equipe de apoio.`,
          estudanteNome: est.nome,
          estudanteId: est.id,
          turma: est.turma || est.anoSerie || 'Turma não informada',
          responsavelNome: responsavel,
          responsavelEmail: est.paeResponsavelEmail,
          dataReferencia: est.dataImportacao || new Date().toISOString(),
          diasPendente: 15,
          severidade: 'alta',
          badgeTexto: 'Sem diário há >15 dias'
        });
      } else if (ultimoReg.diasAtras >= 15) {
        // TEVE registro, mas há 15 DIAS OU MAIS não é preenchido
        lista.push({
          id: `apoio-15d-desatualizado-${est.id}`,
          tipo: 'apoio_sem_registro_15d',
          titulo: `Sem registro de apoio há ${ultimoReg.diasAtras} dias (Limite de 15 dias excedido)`,
          descricao: `Último diário de bordo foi preenchido em ${new Date(ultimoReg.data).toLocaleDateString('pt-BR')}. Há mais de duas semanas o estudante não possui acompanhamento registrado.`,
          estudanteNome: est.nome,
          estudanteId: est.id,
          turma: est.turma || est.anoSerie || 'Turma não informada',
          responsavelNome: responsavel,
          responsavelEmail: est.paeResponsavelEmail,
          dataReferencia: ultimoReg.data,
          diasPendente: ultimoReg.diasAtras,
          severidade: 'alta',
          badgeTexto: `${ultimoReg.diasAtras}d sem registro`
        });
      } else if (ultimoReg.diasAtras >= 5) {
        // Aviso preventivo recente (<15 dias)
        lista.push({
          id: `apoio-recente-${est.id}`,
          tipo: 'apoio_sem_registro_recente',
          titulo: `Diário de apoio sem atualização há ${ultimoReg.diasAtras} dias`,
          descricao: `Último acompanhamento registrado em ${new Date(ultimoReg.data).toLocaleDateString('pt-BR')}. Manter diários em dia evita acúmulo de pendências.`,
          estudanteNome: est.nome,
          estudanteId: est.id,
          turma: est.turma || est.anoSerie || 'Turma não informada',
          responsavelNome: responsavel,
          responsavelEmail: est.paeResponsavelEmail,
          dataReferencia: ultimoReg.data,
          diasPendente: ultimoReg.diasAtras,
          severidade: 'media',
          badgeTexto: `Há ${ultimoReg.diasAtras}d`
        });
      }
    });

    // 3. ATIVIDADES ADAPTADAS PENDENTES DE REVISÃO PEDAGÓGICA
    atividades.forEach((ativ) => {
      const isRevisada = ativ.status === 'Revisada';
      if (!isRevisada) {
        const dataCriacao = ativ.dataCriacao ? new Date(ativ.dataCriacao) : agora;
        const diffDias = Math.max(0, Math.floor((agora.getTime() - dataCriacao.getTime()) / (1000 * 3600 * 24)));
        
        let severidade: 'alta' | 'media' | 'baixa' = 'baixa';
        if (diffDias >= 7) severidade = 'alta';
        else if (diffDias >= 3) severidade = 'media';

        lista.push({
          id: `ativ-${ativ.id}`,
          tipo: 'atividade_pendente',
          titulo: `Atividade adaptada aguardando revisão: ${ativ.disciplina || 'Disciplina'}`,
          descricao: `Conteúdo: "${ativ.conteudo || ativ.habilidadeDescricao || 'Sem descrição'}" gerado pelo professor(a) ${ativ.professorNome || 'não identificado'}.`,
          estudanteNome: ativ.estudanteNome || 'Estudante',
          estudanteId: ativ.estudanteId,
          turma: ativ.turma || 'Sem turma',
          responsavelNome: ativ.professorNome || 'Professor Responsável',
          dataReferencia: ativ.dataCriacao || new Date().toISOString(),
          diasPendente: diffDias,
          severidade,
          badgeTexto: `Aguardando ${diffDias}d`,
          atividadeRef: ativ
        });
      }
    });

    // Ordenação: Severidade alta primeiro, depois PEIs vencendo, depois registros 15d
    return lista.sort((a, b) => {
      const pesoSev = { alta: 3, media: 2, baixa: 1 };
      if (pesoSev[b.severidade] !== pesoSev[a.severidade]) {
        return pesoSev[b.severidade] - pesoSev[a.severidade];
      }
      return b.diasPendente - a.diasPendente;
    });
  }, [peisArmazenados, estudantes, registrosApoio, atividades]);

  // Filtra itens com base na aba e no texto de busca
  const lembretesFiltrados = useMemo(() => {
    return lembretes.filter((item) => {
      if (lembretesIgnorados.has(item.id)) return false;

      // Filtro de Categoria
      if (filtroTipo === 'prazos_pei') {
        if (item.tipo !== 'pei_vencendo') return false;
      } else if (filtroTipo === 'apoio_15_dias') {
        if (item.tipo !== 'apoio_sem_registro_15d' && item.tipo !== 'apoio_sem_registro_recente') return false;
      } else if (filtroTipo === 'atividades') {
        if (item.tipo !== 'atividade_pendente') return false;
      }

      // Filtro de Texto
      if (buscaTexto.trim()) {
        const termo = buscaTexto.toLowerCase();
        const coincide =
          item.titulo.toLowerCase().includes(termo) ||
          item.descricao.toLowerCase().includes(termo) ||
          item.estudanteNome.toLowerCase().includes(termo) ||
          (item.turma && item.turma.toLowerCase().includes(termo)) ||
          (item.responsavelNome && item.responsavelNome.toLowerCase().includes(termo));
        if (!coincide) return false;
      }

      return true;
    });
  }, [lembretes, filtroTipo, buscaTexto, lembretesIgnorados]);

  // Contadores analíticos
  const totalPeisVencendo = lembretes.filter((l) => l.tipo === 'pei_vencendo').length;
  const totalApoio15Dias = lembretes.filter((l) => l.tipo === 'apoio_sem_registro_15d').length;
  const totalAtividadesPendentes = lembretes.filter((l) => l.tipo === 'atividade_pendente').length;
  const totalCriticos = lembretes.filter((l) => l.severidade === 'alta').length;

  const handleIgnorarLembrete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLembretesIgnorados((prev) => new Set([...prev, id]));
  };

  const handleRestaurarTodos = () => {
    setLembretesIgnorados(new Set());
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200/90 shadow-sm overflow-hidden transition-all duration-300">
      
      {/* Barra de Título / Cabeçalho da Central de Notificações */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50 border-b border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Bell className="h-5 w-5 animate-bounce-gentle" />
            </div>
            {lembretesFiltrados.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
                {lembretesFiltrados.length}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Central de Notificações & Prazos Pedagógicos</span>
              </h3>
              {totalCriticos > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{totalCriticos} alta prioridade</span>
                </span>
              ) : lembretes.length === 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Todos os prazos em dia</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Atenção necessária
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Alertas automáticos para prazos de PEIs prestes a vencer, estudantes sem diário nos últimos 15 dias e revisões pendentes.
            </p>
          </div>
        </div>

        {/* Controles de Ação do Cabeçalho */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {lembretesIgnorados.size > 0 && (
            <button
              onClick={handleRestaurarTodos}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Restaurar notificações dispensadas"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restaurar ({lembretesIgnorados.size})</span>
            </button>
          )}

          <button
            onClick={() => setExpandido(!expandido)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <span>{expandido ? 'Recolher Alertas' : 'Expandir Central'}</span>
            {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Conteúdo Expansível */}
      {expandido && (
        <div className="p-4 sm:p-5 space-y-4 animate-fadeIn">
          
          {/* Cards de Resumo e Filtros Rápidos (4 Categorias Estratégicas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* 1. Todas as Notificações */}
            <button
              type="button"
              onClick={() => setFiltroTipo('todos')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                filtroTipo === 'todos'
                  ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Total de Avisos
                </span>
                <Bell className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {lembretes.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Todas as pendências ativas
              </p>
            </button>

            {/* 2. Prazos de PEI prestes a vencer */}
            <button
              type="button"
              onClick={() => setFiltroTipo('prazos_pei')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                filtroTipo === 'prazos_pei'
                  ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
                  PEIs a Vencer / Vencidos
                </span>
                <FileText className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
                <span>{totalPeisVencendo}</span>
                {totalPeisVencendo > 0 && (
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-md">
                    Prazo ≤15 dias
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Planos individuais expirando
              </p>
            </button>

            {/* 3. Sem Acompanhamento nos últimos 15 dias */}
            <button
              type="button"
              onClick={() => setFiltroTipo('apoio_15_dias')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                filtroTipo === 'apoio_15_dias'
                  ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Sem Diário (15+ dias)
                </span>
                <UserX className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
                <span>{totalApoio15Dias}</span>
                {totalApoio15Dias > 0 && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">
                    Ação urgente
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Alunos sem registro de apoio
              </p>
            </button>

            {/* 4. Atividades Adaptadas a Revisar */}
            <button
              type="button"
              onClick={() => setFiltroTipo('atividades')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                filtroTipo === 'atividades'
                  ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  Atividades a Revisar
                </span>
                <FileEdit className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {totalAtividadesPendentes}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Folhas A4 aguardando validação
              </p>
            </button>
          </div>

          {/* Barra de Busca de Notificações */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="Buscar alertas por nome de estudante, turma, disciplina ou profissional responsável..."
              className="w-full text-xs bg-transparent border-0 focus:outline-hidden text-slate-800 placeholder-slate-400"
            />
            {buscaTexto && (
              <button
                onClick={() => setBuscaTexto('')}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-bold px-1"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Lista de Alertas / Notificações */}
          {lembretesFiltrados.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-200/60 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-900">
                Nenhuma pendência encontrada nesta categoria!
              </p>
              <p className="text-[11px] text-emerald-700 max-w-md mx-auto">
                Todos os prazos de PEIs estão vigentes, o acompanhamento diário de apoio está atualizado e as atividades adaptadas foram validadas.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {lembretesFiltrados.map((item) => {
                const isPei = item.tipo === 'pei_vencendo';
                const isApoio15d = item.tipo === 'apoio_sem_registro_15d';
                const isAtividade = item.tipo === 'atividade_pendente';
                const isAlta = item.severidade === 'alta';

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isApoio15d
                        ? 'bg-rose-50/60 border-rose-300 hover:bg-rose-50'
                        : isPei
                        ? isAlta
                          ? 'bg-orange-50/70 border-orange-300 hover:bg-orange-50'
                          : 'bg-amber-50/60 border-amber-300 hover:bg-amber-50'
                        : isAtividade
                        ? 'bg-indigo-50/30 border-indigo-200/80 hover:bg-indigo-50/50'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {/* Informações da Notificação */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                          isApoio15d
                            ? 'bg-rose-100 text-rose-700'
                            : isPei
                            ? 'bg-orange-100 text-orange-700'
                            : isAtividade
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isPei ? (
                          <FileText className="h-4 w-4" />
                        ) : isApoio15d ? (
                          <UserX className="h-4 w-4" />
                        ) : isAtividade ? (
                          <FileEdit className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.titulo}
                          </span>
                          
                          {/* Badges de Destaque */}
                          {item.badgeTexto && (
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                isApoio15d
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : isPei
                                  ? isAlta
                                    ? 'bg-orange-100 text-orange-900 border-orange-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                  : isAlta
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {item.badgeTexto}
                            </span>
                          )}

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {item.turma}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                          {item.descricao}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
                          <span>
                            Estudante: <strong className="text-slate-800">{item.estudanteNome}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Responsável: <strong className="text-slate-800">{item.responsavelNome}</strong>
                          </span>
                          {item.dataReferencia && (
                            <>
                              <span>•</span>
                              <span>Data ref: {new Date(item.dataReferencia).toLocaleDateString('pt-BR')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação Rápida */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                      {/* Ações para PEIs prestes a vencer */}
                      {isPei && (
                        <>
                          {item.peiRef && onVisualizarPei && (
                            <button
                              type="button"
                              onClick={() => onVisualizarPei(item.peiRef!)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Baixar ou visualizar PEI em PDF oficial"
                            >
                              <FileText className="h-3.5 w-3.5 text-orange-600" />
                              <span>Ver PEI</span>
                            </button>
                          )}
                          {item.estudanteId && onCriarPeiParaEstudante && (
                            <button
                              type="button"
                              onClick={() => onCriarPeiParaEstudante(item.estudanteId!)}
                              className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Abrir gerador do PEI para renovar ou revisar metas"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Renovar PEI</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Ações para Registros de Apoio (15+ dias sem diário) */}
                      {(isApoio15d || item.tipo === 'apoio_sem_registro_recente') && (
                        <>
                          {item.estudanteId && onNavigateToEstudante && (
                            <button
                              type="button"
                              onClick={() => onNavigateToEstudante(item.estudanteId!, item.turma)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Ver ficha completa do estudante"
                            >
                              <span>Ver Aluno</span>
                            </button>
                          )}
                          {onNavigateToApoio && (
                            <button
                              type="button"
                              onClick={onNavigateToApoio}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Acessar painel do profissional de apoio para registrar diário"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Registrar Diário</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Ações para Atividades a Revisar */}
                      {isAtividade && item.atividadeRef && (
                        <button
                          type="button"
                          onClick={() => onVisualizarAtividade(item.atividadeRef!)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="Abrir folha de atividade A4 para revisar"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Revisar Atividade</span>
                        </button>
                      )}

                      {/* Botão Dispensar Notificação */}
                      <button
                        type="button"
                        onClick={(e) => handleIgnorarLembrete(item.id, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Ocultar notificação temporariamente"
                      >
                        <span className="text-[10px] font-bold px-1 text-slate-400 hover:text-slate-600">Dispensar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rodapé Informativo da Central */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
            <span>
              💡 Dica da Coordenação: Acompanhamentos com mais de 15 dias sem diário afetam os relatórios bimestrais oficiais da SEDUC-GO.
            </span>
            {onNavigateToTab && (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => onNavigateToTab('estudantes')}
                  className="font-bold text-orange-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Módulo de Estudantes</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
                {onNavigateToApoio && (
                  <button
                    onClick={onNavigateToApoio}
                    className="font-bold text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Módulo de Apoio</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => onNavigateToTab('atividades')}
                  className="font-bold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Atividades</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
