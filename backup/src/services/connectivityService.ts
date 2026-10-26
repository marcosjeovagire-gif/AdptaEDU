/**
 * Serviço Central de Conectividade e Saúde do Sistema (AdaptaEdu)
 *
 * Responsável por:
 * 1. Diferenciar queda real de internet de oscilação do servidor de desenvolvimento / WebSocket do Vite.
 * 2. Estabilizar transições online/offline com debounce para evitar oscilações rápidas ("flapping").
 * 3. Validar a conectividade real via probe leve para GET /api/health com timeout (AbortController).
 * 4. Centralizar os listeners em uma única fonte de verdade para prevenir vazamentos de memória.
 */

export type ConnectionStatus =
  | 'online'
  | 'offline'
  | 'checking'
  | 'server-unavailable';

export interface ConnectivityDetails {
  status: ConnectionStatus;
  isOnline: boolean;
  isOffline: boolean;
  isServerUnavailable: boolean;
  isChecking: boolean;
  lastCheckedAt: string | null;
  lastOnlineAt: string | null;
}

type ConnectivityListener = (status: ConnectionStatus, details: ConnectivityDetails) => void;

const LISTENERS = new Set<ConnectivityListener>();

// Configurações de tempo e estabilização
const OFFLINE_DEBOUNCE_MS = 2500; // Aguarda 2.5s antes de confirmar offline
const ONLINE_STABILIZATION_MS = 2000; // Aguarda 2s de conexão estável antes de declarar online
const HEALTH_CHECK_TIMEOUT_MS = 3000; // Timeout máximo para probe de saúde
const HEALTH_ENDPOINT = '/api/health';

let currentStatus: ConnectionStatus = 'online';
let lastOnlineAt: string | null = null;
let lastCheckedAt: string | null = null;

let isMonitoringActive = false;
let isCheckInProgress = false;

let offlineTimer: any = null;
let onlineTimer: any = null;
let probeAbortController: AbortController | null = null;

/**
 * Retorna o status de conexão atual
 */
export function getConnectionStatus(): ConnectionStatus {
  return currentStatus;
}

/**
 * Retorna verdadeiro se o status atual for comprovadamente 'online'
 */
export function isRealOnline(): boolean {
  return currentStatus === 'online';
}

/**
 * Retorna os detalhes completos do estado de conectividade
 */
export function getConnectivityDetails(): ConnectivityDetails {
  return {
    status: currentStatus,
    isOnline: currentStatus === 'online',
    isOffline: currentStatus === 'offline',
    isServerUnavailable: currentStatus === 'server-unavailable',
    isChecking: currentStatus === 'checking',
    lastCheckedAt,
    lastOnlineAt,
  };
}

/**
 * Notifica todos os listeners registrados
 */
function notificarListeners() {
  const details = getConnectivityDetails();
  LISTENERS.forEach((listener) => {
    try {
      listener(currentStatus, details);
    } catch (err) {
      console.warn('[ConnectivityService] Erro ao notificar listener:', err);
    }
  });
}

/**
 * Atualiza o status interno se houver alteração real
 */
function definirStatus(novoStatus: ConnectionStatus) {
  if (currentStatus === novoStatus) return;

  const statusAnterior = currentStatus;
  currentStatus = novoStatus;
  lastCheckedAt = new Date().toISOString();

  if (novoStatus === 'online') {
    lastOnlineAt = lastCheckedAt;
    console.info(`[ConnectivityService] Conexão ESTÁVEL confirmada: status alterado de "${statusAnterior}" para "online".`);
  } else if (novoStatus === 'offline') {
    console.warn(`[ConnectivityService] Modo OFFLINE ativado após confirmação de indisponibilidade (status anterior: "${statusAnterior}").`);
  } else if (novoStatus === 'server-unavailable') {
    console.warn(`[ConnectivityService] Servidor local/API temporariamente inacessível, mas interface de rede ativa (status anterior: "${statusAnterior}").`);
  }

  notificarListeners();
}

/**
 * Executa requisição leve ao endpoint /api/health usando AbortController
 */
async function probeHealthEndpoint(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return true;
  }

  if (probeAbortController) {
    try {
      probeAbortController.abort();
    } catch {
      // Ignora abort prévio
    }
  }

  probeAbortController = new AbortController();
  const timeoutId = setTimeout(() => {
    if (probeAbortController) {
      probeAbortController.abort();
    }
  }, HEALTH_CHECK_TIMEOUT_MS);

  try {
    // Adiciona timestamp na query para evitar cache agressivo de proxy/navegador
    const url = `${HEALTH_ENDPOINT}?t=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
      signal: probeAbortController.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) return false;

    const data = await res.json().catch(() => null);
    return Boolean(data && (data.status === 'ok' || data.status === 'healthy'));
  } catch {
    clearTimeout(timeoutId);
    return false;
  } finally {
    probeAbortController = null;
  }
}

/**
 * Executa verificação controlada com até 2 tentativas e backoff progressivo
 */
export async function verificarConectividade(options?: { force?: boolean }): Promise<ConnectionStatus> {
  if (typeof window === 'undefined') {
    return 'online';
  }

  // 1. Checagem imediata de hardware/navegador
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    definirStatus('offline');
    return 'offline';
  }

  if (isCheckInProgress && !options?.force) {
    return currentStatus;
  }

  isCheckInProgress = true;

  try {
    // Primeira tentativa de probe
    let probeSucesso = await probeHealthEndpoint();

    // Se falhou, aplica pequeno backoff de 400ms e realiza a 2ª verificação antes de concluir indisponibilidade
    if (!probeSucesso) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      probeSucesso = await probeHealthEndpoint();
    }

    if (probeSucesso) {
      definirStatus('online');
      return 'online';
    } else {
      // Se o navegador diz estar com rede mas o endpoint de saúde não responde:
      // Diferenciamos: pode ser reinicialização de servidor Vite/API ou falha de internet real
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        definirStatus('server-unavailable');
        return 'server-unavailable';
      } else {
        definirStatus('offline');
        return 'offline';
      }
    }
  } finally {
    isCheckInProgress = false;
  }
}

/**
 * Handler de evento window 'online' com debounce e estabilização
 */
function handleWindowOnline() {
  if (offlineTimer) {
    clearTimeout(offlineTimer);
    offlineTimer = null;
  }

  if (onlineTimer) {
    clearTimeout(onlineTimer);
  }

  // Aguarda estabilização de 2 segundos antes de confirmar online
  onlineTimer = setTimeout(async () => {
    onlineTimer = null;
    await verificarConectividade({ force: true });
  }, ONLINE_STABILIZATION_MS);
}

/**
 * Handler de evento window 'offline' com debounce de 2.5s para evitar oscilações transitórias
 */
function handleWindowOffline() {
  if (onlineTimer) {
    clearTimeout(onlineTimer);
    onlineTimer = null;
  }

  if (offlineTimer) {
    clearTimeout(offlineTimer);
  }

  offlineTimer = setTimeout(async () => {
    offlineTimer = null;
    // Se após 2.5s o navegador continuar offline, confirma
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      definirStatus('offline');
    } else {
      await verificarConectividade({ force: true });
    }
  }, OFFLINE_DEBOUNCE_MS);
}

/**
 * Inicializa os monitores centrais de eventos de rede no navegador
 */
export function iniciarMonitorConectividade(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (!isMonitoringActive) {
    isMonitoringActive = true;
    window.addEventListener('online', handleWindowOnline);
    window.addEventListener('offline', handleWindowOffline);

    // Verificação inicial rápida sem bloquear
    verificarConectividade().catch(() => {});
  }

  return pararMonitorConectividade;
}

/**
 * Para e limpa os monitores centrais
 */
export function pararMonitorConectividade(): void {
  if (typeof window === 'undefined') return;

  if (offlineTimer) {
    clearTimeout(offlineTimer);
    offlineTimer = null;
  }
  if (onlineTimer) {
    clearTimeout(onlineTimer);
    onlineTimer = null;
  }
  if (probeAbortController) {
    try {
      probeAbortController.abort();
    } catch {
      // Ignora
    }
    probeAbortController = null;
  }

  window.removeEventListener('online', handleWindowOnline);
  window.removeEventListener('offline', handleWindowOffline);
  isMonitoringActive = false;
}

/**
 * Registra um ouvinte para alterações no estado de conectividade centralizado
 */
export function adicionarListenerConectividade(listener: ConnectivityListener): () => void {
  LISTENERS.add(listener);

  // Garante que o monitor esteja em execução
  iniciarMonitorConectividade();

  // Emite estado atual imediatamente para o novo assinante
  try {
    listener(currentStatus, getConnectivityDetails());
  } catch (err) {
    console.warn('[ConnectivityService] Erro ao disparar listener inicial:', err);
  }

  return () => {
    LISTENERS.delete(listener);
  };
}

// Inicialização automática protegida em ambiente de browser
if (typeof window !== 'undefined') {
  iniciarMonitorConectividade();
}
