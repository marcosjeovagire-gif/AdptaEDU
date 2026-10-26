import { Estudante, RegistroAcompanhamentoApoio, AuthorizedUser } from '../types';
import { isDiaUtil } from '../server/apoioService';

export interface ConfiguracoesNotificacaoApoio {
  habilitado: boolean;
  lembreteInicioSessao: boolean;
  lembreteFimTurno: boolean;
  horarioPreferencial: string; // Ex: '11:30' ou '16:30'
  ultimoEnvioTimestamp: number | null;
}

const STORAGE_KEY_CONFIG = 'adaptaedu_notificacoes_config';
const STORAGE_KEY_ULTIMO_AVISO = 'adaptaedu_ultimo_aviso_pendencias';

export const CONFIG_PADRAO: ConfiguracoesNotificacaoApoio = {
  habilitado: true,
  lembreteInicioSessao: true,
  lembreteFimTurno: true,
  horarioPreferencial: '11:30',
  ultimoEnvioTimestamp: null,
};

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Verifica se o navegador atual suporta Service Workers e API de Notificações
 */
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    'Notification' in window;
}

/**
 * Retorna o status atual da permissão de notificação do navegador
 */
export function obterPermissaoNotificacao(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Solicita permissão do usuário para envio de notificações nativas
 */
export async function solicitarPermissaoNotificacao(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    console.warn('API de Notificações não suportada pelo navegador.');
    return 'denied';
  }

  try {
    const permissao = await Notification.requestPermission();
    if (permissao === 'granted') {
      await registrarServiceWorker();
    }
    return permissao;
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificações:', error);
    return 'denied';
  }
}

/**
 * Registra o Service Worker principal (/sw.js)
 */
export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (swRegistration) {
    return swRegistration;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    swRegistration = registration;
    return registration;
  } catch (error) {
    console.warn('Falha ao registrar Service Worker para notificações:', error);
    return null;
  }
}

/**
 * Dispara uma notificação utilizando o Service Worker ativo (ou fallback nativo)
 */
export async function dispararNotificacaoServiceWorker(
  titulo: string, 
  opcoes: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    actions?: Array<{ action: string; title: string }>;
    requireInteraction?: boolean;
  }
): Promise<boolean> {
  if (obterPermissaoNotificacao() !== 'granted') {
    return false;
  }

  try {
    let registration = swRegistration;
    if (!registration && 'serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.ready;
      swRegistration = registration;
    }

    if (registration && typeof registration.showNotification === 'function') {
      await (registration as any).showNotification(titulo, {
        body: opcoes.body,
        icon: opcoes.icon || '/branding/logo-escola-2026.png',
        badge: opcoes.badge || '/branding/logo-escola-2026.png',
        tag: opcoes.tag || 'adaptaedu-lembrete-apoio',
        data: opcoes.data || { url: '/apoio-preview' },
        actions: opcoes.actions || [
          { action: 'preencher_agora', title: 'Preencher Diário' }
        ],
        requireInteraction: opcoes.requireInteraction ?? false,
      } as any);
      return true;
    }

    // Fallback nativo simples
    new Notification(titulo, {
      body: opcoes.body,
      icon: opcoes.icon || '/branding/logo-escola-2026.png',
      tag: opcoes.tag || 'adaptaedu-lembrete-apoio',
      data: opcoes.data,
    } as any);
    return true;
  } catch (error) {
    console.error('Erro ao exibir notificação:', error);
    return false;
  }
}

/**
 * Identifica os estudantes com registros de apoio pendentes para a data de hoje
 */
export function calcularPendenciasHojeProfissionalApoio(
  currentUser: AuthorizedUser,
  estudantes: Estudante[],
  registrosApoio: RegistroAcompanhamentoApoio[]
): {
  hojeIso: string;
  isDiaUtilHoje: boolean;
  alunosVinculados: Estudante[];
  alunosPendentes: Estudante[];
  totalPendentes: number;
  totalAtendidos: number;
} {
  const agora = new Date();
  const hojeIso = agora.toISOString().split('T')[0];
  const isDiaUtilHoje = isDiaUtil(hojeIso);

  // Estudantes vinculados ao profissional de apoio ou todos sob cuidado pedagógico
  const alunosVinculados = estudantes.filter(est => {
    if (est.situacao === 'arquivado' || est.situacao === 'transferido') return false;
    
    // Se há lista de profissionais de apoio vinculados explicitamente
    if (est.profissionaisApoioIds && est.profissionaisApoioIds.length > 0) {
      return est.profissionaisApoioIds.includes(currentUser.id) || 
             est.paeResponsavelEmail?.toLowerCase() === currentUser.email.toLowerCase();
    }
    
    // Se o PAE é o responsável oficial registrado na ficha
    if (est.paeResponsavelEmail && currentUser.email) {
      return est.paeResponsavelEmail.toLowerCase() === currentUser.email.toLowerCase();
    }

    // Caso não haja vínculo individual fechado, considera todos os estudantes da escola atendidos pelo apoio
    return true;
  });

  // Registros já concluídos para o dia de hoje
  const idsAtendidosHoje = new Set(
    registrosApoio
      .filter(r => r.data === hojeIso)
      .map(r => r.studentId)
  );

  const alunosPendentes = alunosVinculados.filter(est => !idsAtendidosHoje.has(est.id));

  return {
    hojeIso,
    isDiaUtilHoje,
    alunosVinculados,
    alunosPendentes,
    totalPendentes: alunosPendentes.length,
    totalAtendidos: alunosVinculados.length - alunosPendentes.length,
  };
}

/**
 * Dispara uma notificação push de teste para confirmar o funcionamento
 */
export async function dispararNotificacaoTeste(currentUser: AuthorizedUser): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      message: 'Seu navegador não oferece suporte à API de Notificações e Service Workers.',
    };
  }

  const permissao = await solicitarPermissaoNotificacao();
  if (permissao !== 'granted') {
    return {
      success: false,
      message: 'Permissão de notificação negada. Ative as permissões nas configurações do navegador.',
    };
  }

  const sucesso = await dispararNotificacaoServiceWorker(
    'AdaptaEdu - Notificação Push Ativa!',
    {
      body: `Olá, ${currentUser.name}! O canal de lembretes automáticos para o Diário de Bordo do Profissional de Apoio está funcionando perfeitamente via Service Worker.`,
      tag: 'adaptaedu-teste-push',
      requireInteraction: false,
      data: { url: '/apoio-preview' },
      actions: [
        { action: 'ok', title: 'Entendido' }
      ]
    }
  );

  return {
    success: sucesso,
    message: sucesso 
      ? 'Notificação push enviada com sucesso pelo Service Worker!' 
      : 'Não foi possível enviar a notificação.',
  };
}

/**
 * Avalia se é o momento de alertar o profissional de apoio sobre pendências de hoje
 */
export async function verificarENotificarPendenciasApoio(
  currentUser: AuthorizedUser,
  estudantes: Estudante[],
  registrosApoio: RegistroAcompanhamentoApoio[],
  forcar = false
): Promise<boolean> {
  const config = obterConfiguracoesNotificacao();
  if (!config.habilitado && !forcar) return false;

  const { isDiaUtilHoje, alunosPendentes, totalPendentes, hojeIso } = 
    calcularPendenciasHojeProfissionalApoio(currentUser, estudantes, registrosApoio);

  // Somente dias úteis possuem registros de frequência/diário obrigatórios
  if (!isDiaUtilHoje && !forcar) return false;
  if (totalPendentes === 0) return false;

  // Controle de frequência: evita notificações repetidas dentro de 3 horas no mesmo dia
  const agora = Date.now();
  const tresHorasMs = 3 * 60 * 60 * 1000;
  const ultimoAviso = localStorage.getItem(STORAGE_KEY_ULTIMO_AVISO);

  if (!forcar && ultimoAviso) {
    const ultimoAvisoData = JSON.parse(ultimoAviso);
    if (ultimoAvisoData.data === hojeIso && (agora - ultimoAvisoData.timestamp) < tresHorasMs) {
      return false;
    }
  }

  const nomesAlunos = alunosPendentes.slice(0, 3).map(a => a.nome.split(' ')[0]).join(', ');
  const maisTexto = totalPendentes > 3 ? ` e mais ${totalPendentes - 3} aluno(s)` : '';

  const titulo = `AdaptaEdu: ${totalPendentes} registro(s) pendente(s) hoje`;
  const corpo = `Você ainda não preencheu o acompanhamento de ${nomesAlunos}${maisTexto}. Clique para acessar o diário de bordo antes do encerramento do turno.`;

  const enviou = await dispararNotificacaoServiceWorker(titulo, {
    body: corpo,
    tag: `lembrete-apoio-${hojeIso}`,
    requireInteraction: true,
    data: { url: '/apoio-preview', dataReferencia: hojeIso },
    actions: [
      { action: 'preencher_agora', title: 'Preencher Diário de Bordo' }
    ]
  });

  if (enviou) {
    localStorage.setItem(STORAGE_KEY_ULTIMO_AVISO, JSON.stringify({
      data: hojeIso,
      timestamp: agora,
    }));
  }

  return enviou;
}

/**
 * Lê configurações de notificação salvas
 */
export function obterConfiguracoesNotificacao(): ConfiguracoesNotificacaoApoio {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      return { ...CONFIG_PADRAO, ...JSON.parse(saved) };
    }
  } catch {}
  return CONFIG_PADRAO;
}

/**
 * Grava preferências de notificação
 */
export function salvarConfiguracoesNotificacao(novasConfig: Partial<ConfiguracoesNotificacaoApoio>): ConfiguracoesNotificacaoApoio {
  const atual = obterConfiguracoesNotificacao();
  const atualizada: ConfiguracoesNotificacaoApoio = { ...atual, ...novasConfig };
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(atualizada));
  } catch {}
  return atualizada;
}
