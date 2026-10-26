import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  FileEdit, 
  UserCheck, 
  Clock, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  Eye, 
  Award, 
  Sparkles,
  BookOpen,
  Filter,
  Users
} from 'lucide-react';
import { AtividadeAdaptada, Estudante, PerfilPedagogico } from '../../types';

export interface AlertasPendenciaNavProps {
  atividades?: AtividadeAdaptada[];
  estudantes?: Estudante[];
  perfisPedagogicos?: PerfilPedagogico[];
  onVisualizarAtividadeA4?: (atividade: AtividadeAdaptada) => void;
  onNavigateToTab?: (tabId: string, estudanteId?: string) => void;
  isCoordenador: boolean;
}

export type TipoAlertaNav = 'atividade_pendente' | 'perfil_ausente' | 'perfil_desatualizado';

export interface AlertaNavItem {
  id: string;
  tipo: TipoAlertaNav;
  titulo: string;
  descricao: string;
  estudanteNome: string;
  estudanteId?: string;
  turma: string;
  severidade: 'alta' | 'media';
  diasAtras?: number;
  dataReferencia?: string;
  atividadeRef?: AtividadeAdaptada;
}

export const AlertasPendenciaNav: React.FC<AlertasPendenciaNavProps> = ({
  atividades = [],
  estudantes = [],
  perfisPedagogicos = [],
  onVisualizarAtividadeA4,
  onNavigateToTab,
  isCoordenador,
}) => {
  const [popoverAberto, setPopoverAberto] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'atividades' | 'perfis'>('todos');
  const [alertasDispensados, setAlertasDispensados] = useState<Set<string>>(() => new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha popover com clique externo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPopoverAberto(false);
      }
    }
    if (popoverAberto) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popoverAberto]);

  // Processa e consolida todas as pendências
  const todosAlertas = useMemo(() => {
    const lista: AlertaNavItem[] = [];
    const agora = new Date().getTime();
    const noventaDiasMs = 90 * 24 * 60 * 60 * 1000;

    // 1. Atividades adaptadas aguardando revisão pedagógica
    atividades.forEach(ativ => {
      if (ativ.status !== 'Revisada') {
        const dataAtiv = ativ.dataCriacao ? new Date(ativ.dataCriacao).getTime() : agora;
        const diffDias = Math.max(0, Math.floor((agora - dataAtiv) / (1000 * 60 * 60 * 24)));
        const severidade: 'alta' | 'media' = diffDias >= 2 ? 'alta' : 'media';

        lista.push({
          id: `ativ-${ativ.id}`,
          tipo: 'atividade_pendente',
          titulo: `Atividade de ${ativ.disciplina} aguarda validação`,
          descricao: `Gerada por ${ativ.professorNome || 'Professor'} para ${ativ.estudanteNome} (${ativ.turma || 'Sem turma'}).`,
          estudanteNome: ativ.estudanteNome,
          estudanteId: ativ.estudanteId,
          turma: ativ.turma || '',
          severidade,
          diasAtras: diffDias,
          dataReferencia: ativ.dataCriacao,
          atividadeRef: ativ,
        });
      }
    });

    // 2. Perfis pedagógicos dos estudantes
    const mapaPerfisPorId = new Map<string, PerfilPedagogico>();
    const mapaPerfisPorNome = new Map<string, PerfilPedagogico>();

    perfisPedagogicos.forEach(p => {
      if (p.estudanteId) mapaPerfisPorId.set(p.estudanteId, p);
      if (p.estudanteNome) mapaPerfisPorNome.set(p.estudanteNome.toLowerCase().trim(), p);
    });

    estudantes.forEach(est => {
      // Ignora estudantes arquivados ou transferidos
      if (est.situacao === 'arquivado' || est.situacao === 'transferido') return;

      const perfil = mapaPerfisPorId.get(est.id) || mapaPerfisPorNome.get(est.nome.toLowerCase().trim());

      if (!perfil) {
        // Aluno sem perfil pedagógico cadastrado
        lista.push({
          id: `perfil-ausente-${est.id}`,
          tipo: 'perfil_ausente',
          titulo: `Perfil pedagógico não cadastrado`,
          descricao: `Estudante com diagnóstico "${est.laudo || 'Em investigação'}" ainda não possui perfil cadastrado.`,
          estudanteNome: est.nome,
          estudanteId: est.id,
          turma: est.turma || '',
          severidade: 'alta',
        });
      } else {
        // Verifica se o perfil está desatualizado (mais de 90 dias sem revisão)
        const dataStr = perfil.dataAtualizacao || perfil.dataCriacao || perfil.dataCadastro;
        if (dataStr) {
          const dataTime = new Date(dataStr).getTime();
          if (!isNaN(dataTime) && (agora - dataTime) > noventaDiasMs) {
            const diasDesatualizado = Math.floor((agora - dataTime) / (1000 * 60 * 60 * 24));
            lista.push({
              id: `perfil-antigo-${est.id}`,
              tipo: 'perfil_desatualizado',
              titulo: `Perfil pedagógico desatualizado (${diasDesatualizado} dias)`,
              descricao: `Última revisão em ${new Date(dataStr).toLocaleDateString('pt-BR')}. Recomendada nova avaliação trimestral.`,
              estudanteNome: est.nome,
              estudanteId: est.id,
              turma: est.turma || '',
              severidade: 'media',
              diasAtras: diasDesatualizado,
              dataReferencia: dataStr,
            });
          }
        }
      }
    });

    // Ordenação: Alta severidade primeiro, depois por dias de pendência
    return lista.sort((a, b) => {
      if (a.severidade === 'alta' && b.severidade !== 'alta') return -1;
      if (a.severidade !== 'alta' && b.severidade === 'alta') return 1;
      return (b.diasAtras || 0) - (a.diasAtras || 0);
    });
  }, [atividades, estudantes, perfisPedagogicos]);

  // Alertas ativos excluindo dispensados
  const alertasAtivos = useMemo(() => {
    return todosAlertas.filter(a => !alertasDispensados.has(a.id));
  }, [todosAlertas, alertasDispensados]);

  // Alertas filtrados por categoria
  const alertasFiltrados = useMemo(() => {
    return alertasAtivos.filter(a => {
      if (filtroTipo === 'atividades') return a.tipo === 'atividade_pendente';
      if (filtroTipo === 'perfis') return a.tipo === 'perfil_ausente' || a.tipo === 'perfil_desatualizado';
      return true;
    });
  }, [alertasAtivos, filtroTipo]);

  // Contagens específicas
  const totalAtividades = useMemo(() => {
    return alertasAtivos.filter(a => a.tipo === 'atividade_pendente').length;
  }, [alertasAtivos]);

  const totalPerfis = useMemo(() => {
    return alertasAtivos.filter(a => a.tipo === 'perfil_ausente' || a.tipo === 'perfil_desatualizado').length;
  }, [alertasAtivos]);

  const totalPendencias = alertasAtivos.length;
  const temPendenciasAltas = alertasAtivos.some(a => a.severidade === 'alta');

  const handleDispensar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlertasDispensados(prev => new Set(prev).add(id));
  };

  const handleAcaoAlerta = (alerta: AlertaNavItem) => {
    setPopoverAberto(false);
    if (alerta.tipo === 'atividade_pendente' && alerta.atividadeRef && onVisualizarAtividadeA4) {
      onVisualizarAtividadeA4(alerta.atividadeRef);
    } else if (onNavigateToTab) {
      if (alerta.tipo === 'atividade_pendente') {
        onNavigateToTab('atividades');
      } else {
        onNavigateToTab('perfis', alerta.estudanteId);
      }
    }
  };

  // Se não for coordenador, o sino ainda pode ser exibido de forma neutra ou restrita
  if (!isCoordenador) {
    return null;
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Botão de Sino na Barra de Navegação */}
      <button
        type="button"
        onClick={() => setPopoverAberto(!popoverAberto)}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
          totalPendencias > 0
            ? temPendenciasAltas
              ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 shadow-2xs'
              : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 shadow-2xs'
            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        }`}
        title={
          totalPendencias > 0
            ? `${totalPendencias} alerta(s) de pendência da Coordenação: ${totalAtividades} atividade(s) a revisar e ${totalPerfis} perfil(is) pendente(s)/desatualizado(s).`
            : 'Nenhuma pendência na Coordenação Pedagógica'
        }
      >
        <Bell className={`h-4 w-4 ${totalPendencias > 0 && temPendenciasAltas ? 'animate-bounce' : ''}`} />
        
        {totalPendencias > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center border-2 border-white shadow-xs ${
            temPendenciasAltas ? 'bg-rose-600' : 'bg-amber-600'
          }`}>
            {totalPendencias > 99 ? '99+' : totalPendencias}
          </span>
        )}
      </button>

      {/* Popover Suspenso de Alertas de Pendência */}
      {popoverAberto && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 md:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-slate-800 animate-fadeIn text-xs space-y-3">
          
          {/* Cabeçalho do Popover */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${
                totalPendencias > 0
                  ? temPendenciasAltas ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 tracking-tight">
                  Alertas da Coordenação
                </h3>
                <span className="text-[10px] text-slate-500">
                  {totalPendencias === 0 
                    ? 'Tudo em dia • Nenhuma pendência pedagógica' 
                    : `${totalPendencias} item(ns) requerem atenção`}
                </span>
              </div>
            </div>

            <button
              onClick={() => setPopoverAberto(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Filtros de Categoria */}
          {totalPendencias > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFiltroTipo('todos')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filtroTipo === 'todos' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({alertasAtivos.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('atividades')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  filtroTipo === 'atividades' 
                    ? 'bg-white text-indigo-900 shadow-2xs' 
                    : 'text-slate-600 hover:text-indigo-900'
                }`}
              >
                <span>Atividades</span>
                {totalAtividades > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[9px] font-black">
                    {totalAtividades}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('perfis')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  filtroTipo === 'perfis' 
                    ? 'bg-white text-purple-900 shadow-2xs' 
                    : 'text-slate-600 hover:text-purple-900'
                }`}
              >
                <span>Perfis (PEI)</span>
                {totalPerfis > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[9px] font-black">
                    {totalPerfis}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Conteúdo / Lista de Alertas */}
          {alertasFiltrados.length === 0 ? (
            <div className="p-6 text-center bg-emerald-50/60 rounded-xl border border-emerald-200/60 space-y-1.5">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-xs text-emerald-900">
                Nenhuma pendência encontrada!
              </p>
              <p className="text-[11px] text-emerald-700 max-w-xs mx-auto">
                Todas as atividades adaptadas foram homologadas e os perfis pedagógicos dos estudantes estão em dia.
              </p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {alertasFiltrados.map(alerta => {
                const isAtividade = alerta.tipo === 'atividade_pendente';
                const isPerfilAusente = alerta.tipo === 'perfil_ausente';
                const isAlta = alerta.severidade === 'alta';

                return (
                  <div
                    key={alerta.id}
                    onClick={() => handleAcaoAlerta(alerta)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-2 ${
                      isAlta
                        ? 'bg-rose-50/50 border-rose-200 hover:bg-rose-50 hover:border-rose-300'
                        : isAtividade
                        ? 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                        : 'bg-purple-50/40 border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isAlta 
                            ? 'bg-rose-200 text-rose-800' 
                            : isAtividade 
                            ? 'bg-indigo-200 text-indigo-800' 
                            : 'bg-purple-200 text-purple-800'
                        }`}>
                          {isAtividade ? (
                            <FileEdit className="h-3.5 w-3.5" />
                          ) : (
                            <Award className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900">
                              {alerta.titulo}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                              isAlta 
                                ? 'bg-rose-200 text-rose-900 border border-rose-300' 
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isAlta ? 'Urgente' : 'Revisão'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 leading-snug">
                            {alerta.descricao}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium pt-0.5">
                            <span className="font-bold text-slate-700">{alerta.estudanteNome}</span>
                            {alerta.turma && <span>• {alerta.turma}</span>}
                            {alerta.diasAtras !== undefined && (
                              <span>• Há {alerta.diasAtras} dia(s)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDispensar(alerta.id, e)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-white/60 shrink-0"
                        title="Dispensar alerta nesta sessão"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Botão de Ação Rápida */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-500">
                        {isAtividade ? 'Atividade Adaptada' : 'Diagnóstico / PEI'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcaoAlerta(alerta);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 text-white shadow-2xs transition-colors cursor-pointer ${
                          isAtividade
                            ? 'bg-indigo-700 hover:bg-indigo-800'
                            : isPerfilAusente
                            ? 'bg-purple-700 hover:bg-purple-800'
                            : 'bg-teal-700 hover:bg-teal-800'
                        }`}
                      >
                        {isAtividade ? (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>Revisar na Folha A4</span>
                          </>
                        ) : isPerfilAusente ? (
                          <>
                            <Award className="h-3 w-3" />
                            <span>Cadastrar Perfil</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" />
                            <span>Atualizar Perfil</span>
                          </>
                        )}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Rodapé com Atalho para Painel Completo */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            {onNavigateToTab ? (
              <button
                type="button"
                onClick={() => {
                  setPopoverAberto(false);
                  onNavigateToTab('inicio');
                }}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                <span>Abrir Painel de Gestão da Coordenação</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">Coordenação Pedagógica</span>
            )}

            {alertasDispensados.size > 0 && (
              <button
                type="button"
                onClick={() => setAlertasDispensados(new Set())}
                className="text-[10px] text-slate-500 hover:underline cursor-pointer"
              >
                Restaurar dispensados ({alertasDispensados.size})
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
