import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  Settings, 
  UserCheck, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AuthorizedUser, Estudante, RegistroAcompanhamentoApoio } from '../../types';
import { 
  isPushNotificationSupported, 
  obterPermissaoNotificacao, 
  solicitarPermissaoNotificacao, 
  dispararNotificacaoTeste, 
  calcularPendenciasHojeProfissionalApoio,
  verificarENotificarPendenciasApoio,
  obterConfiguracoesNotificacao,
  salvarConfiguracoesNotificacao,
  ConfiguracoesNotificacaoApoio,
  registrarServiceWorker
} from '../../services/pushNotificationService';

interface LembretesNotificacoesApoioCardProps {
  currentUser: AuthorizedUser;
  estudantes: Estudante[];
  registrosApoio: RegistroAcompanhamentoApoio[];
  onAbrirRegistroData: (dataIso: string, aluno?: Estudante) => void;
}

export const LembretesNotificacoesApoioCard: React.FC<LembretesNotificacoesApoioCardProps> = ({
  currentUser,
  estudantes,
  registrosApoio,
  onAbrirRegistroData,
}) => {
  const [permissao, setPermissao] = useState<NotificationPermission>(() => obterPermissaoNotificacao());
  const [suportado, setSuportado] = useState<boolean>(() => isPushNotificationSupported());
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesNotificacaoApoio>(() => obterConfiguracoesNotificacao());
  const [painelConfigAberto, setPainelConfigAberto] = useState(false);
  const [isEnviandoTeste, setIsEnviandoTeste] = useState(false);
  const [feedbackMensagem, setFeedbackMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Calcula pendências de hoje
  const pendencias = calcularPendenciasHojeProfissionalApoio(currentUser, estudantes, registrosApoio);

  // Registra Service Worker e verifica permissões na inicialização
  useEffect(() => {
    if (suportado) {
      registrarServiceWorker();
      setPermissao(obterPermissaoNotificacao());
    }
  }, [suportado]);

  // Se a permissão estiver concedida e houver pendências em dia útil, avalia lembrete automático
  useEffect(() => {
    if (permissao === 'granted' && configuracoes.habilitado && pendencias.isDiaUtilHoje && pendencias.totalPendentes > 0) {
      verificarENotificarPendenciasApoio(currentUser, estudantes, registrosApoio, false);
    }
  }, [permissao, configuracoes.habilitado, pendencias.totalPendentes]);

  const handleSolicitarPermissao = async () => {
    const novaPermissao = await solicitarPermissaoNotificacao();
    setPermissao(novaPermissao);
    if (novaPermissao === 'granted') {
      setFeedbackMensagem({
        tipo: 'sucesso',
        texto: 'Notificações push via Service Worker ativadas com sucesso! Você receberá lembretes automáticos sobre diários pendentes.',
      });
      setTimeout(() => setFeedbackMensagem(null), 5000);
    } else if (novaPermissao === 'denied') {
      setFeedbackMensagem({
        tipo: 'erro',
        texto: 'Permissão bloqueada no navegador. Permita o envio de notificações nas configurações de privacidade para receber alertas.',
      });
      setTimeout(() => setFeedbackMensagem(null), 6000);
    }
  };

  const handleDispararTeste = async () => {
    setIsEnviandoTeste(true);
    try {
      const res = await dispararNotificacaoTeste(currentUser);
      setFeedbackMensagem({
        tipo: res.success ? 'sucesso' : 'erro',
        texto: res.message,
      });
      setTimeout(() => setFeedbackMensagem(null), 5000);
    } finally {
      setIsEnviandoTeste(false);
    }
  };

  const handleDispararAlertaPendencias = async () => {
    if (permissao !== 'granted') {
      await handleSolicitarPermissao();
      return;
    }

    const enviou = await verificarENotificarPendenciasApoio(currentUser, estudantes, registrosApoio, true);
    if (enviou) {
      setFeedbackMensagem({
        tipo: 'sucesso',
        texto: `Notificação push de alerta com ${pendencias.totalPendentes} pendência(s) enviada pelo Service Worker!`,
      });
    } else {
      setFeedbackMensagem({
        tipo: 'erro',
        texto: 'Não foi possível disparar o alerta. Verifique se há pendências na data de hoje.',
      });
    }
    setTimeout(() => setFeedbackMensagem(null), 5000);
  };

  const handleToggleHabilitado = (habilitar: boolean) => {
    const nova = salvarConfiguracoesNotificacao({ habilitado: habilitar });
    setConfiguracoes(nova);
  };

  const handleMudarHorario = (horario: string) => {
    const nova = salvarConfiguracoesNotificacao({ horarioPreferencial: horario });
    setConfiguracoes(nova);
  };

  if (!suportado) {
    return null;
  }

  const porcentagemConcluida = pendencias.alunosVinculados.length > 0 
    ? Math.round((pendencias.totalAtendidos / pendencias.alunosVinculados.length) * 100) 
    : 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
      
      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
            permissao === 'granted'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            {permissao === 'granted' ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Lembretes Push de Acompanhamento</span>
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                permissao === 'granted'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : permissao === 'denied'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {permissao === 'granted' 
                  ? 'Service Worker Ativo' 
                  : permissao === 'denied' 
                  ? 'Bloqueado no Navegador' 
                  : 'Aguardando Permissão'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Notificações nativas do sistema para evitar esquecimento de diários de bordo antes do término do turno.
            </p>
          </div>
        </div>

        {/* Botões de Ação do Cabeçalho */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {permissao !== 'granted' ? (
            <button
              type="button"
              onClick={handleSolicitarPermissao}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <BellRing className="h-3.5 w-3.5" />
              <span>Ativar Notificações</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDispararTeste}
                disabled={isEnviandoTeste}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Disparar notificação de teste para verificar funcionamento"
              >
                <Send className="h-3 w-3 text-slate-500" />
                <span>{isEnviandoTeste ? 'Enviando...' : 'Testar Notificação'}</span>
              </button>

              {pendencias.totalPendentes > 0 && (
                <button
                  type="button"
                  onClick={handleDispararAlertaPendencias}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                  title="Enviar notificação push com os alunos pendentes de hoje"
                >
                  <BellRing className="h-3 w-3" />
                  <span>Notificar Pendências ({pendencias.totalPendentes})</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setPainelConfigAberto(!painelConfigAberto)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            title="Configurações de horário e frequência dos lembretes"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* FEEDBACK TEMPORÁRIO */}
      {feedbackMensagem && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
          feedbackMensagem.tipo === 'sucesso'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-rose-50 border-rose-300 text-rose-950'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMensagem.tipo === 'sucesso' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-700 shrink-0" />
            )}
            <span>{feedbackMensagem.texto}</span>
          </div>
          <button onClick={() => setFeedbackMensagem(null)} className="text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
      )}

      {/* STATUS DE PREENCHIMENTO DO DIA ATUAL */}
      {pendencias.isDiaUtilHoje ? (
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <strong className="text-xs font-extrabold text-slate-800">
                Acompanhamento de Hoje ({new Date().toLocaleDateString('pt-BR')})
              </strong>
              <span className="text-[11px] text-slate-500">
                • {pendencias.totalAtendidos} de {pendencias.alunosVinculados.length} concluído(s)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black ${
                pendencias.totalPendentes === 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {pendencias.totalPendentes === 0 
                  ? 'Todos os registros de hoje preenchidos!' 
                  : `${pendencias.totalPendentes} aluno(s) aguardando registro`}
              </span>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                porcentagemConcluida === 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${porcentagemConcluida}%` }}
            />
          </div>

          {/* Lista de Estudantes Pendentes de Hoje com Atalho Rápido */}
          {pendencias.totalPendentes > 0 && (
            <div className="pt-2 border-t border-slate-200/60 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Estudantes que ainda não receberam registro hoje:
              </span>

              <div className="flex flex-wrap gap-2">
                {pendencias.alunosPendentes.map(aluno => (
                  <button
                    key={aluno.id}
                    type="button"
                    onClick={() => onAbrirRegistroData(pendencias.hojeIso, aluno)}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs group"
                    title={`Preencher diário de bordo de hoje para ${aluno.nome}`}
                  >
                    <span>{aluno.nome}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 font-normal">
                      ({aluno.turma || 'Sem turma'})
                    </span>
                    <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-emerald-700" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span>
            Hoje não é dia letivo útil (fim de semana). Lembretes push automáticos são programados de segunda a sexta-feira.
          </span>
        </div>
      )}

      {/* PAINEL DE CONFIGURAÇÕES DE HORÁRIO E PREFERÊNCIAS (EXPANSÍVEL) */}
      {painelConfigAberto && (
        <div className="p-3.5 bg-slate-100/70 rounded-xl border border-slate-200 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200 pb-2">
            <span>Preferências de Notificações do Profissional de Apoio</span>
            <button
              onClick={() => setPainelConfigAberto(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={configuracoes.habilitado}
                onChange={(e) => handleToggleHabilitado(e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded cursor-pointer"
              />
              <span className="font-semibold text-slate-700">
                Ativar lembretes automáticos diários
              </span>
            </label>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-700">Horário do Lembrete:</span>
              <select
                value={configuracoes.horarioPreferencial}
                onChange={(e) => handleMudarHorario(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-md px-2 py-1 font-bold focus:outline-none cursor-pointer"
              >
                <option value="11:00">11:00 (Pré-saída matutino)</option>
                <option value="11:30">11:30 (Fechamento matutino)</option>
                <option value="16:30">16:30 (Pré-saída vespertino)</option>
                <option value="17:00">17:00 (Fechamento vespertino)</option>
              </select>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
