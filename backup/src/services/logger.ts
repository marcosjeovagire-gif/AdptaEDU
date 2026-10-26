/**
 * Sistema Unificado de Logging Profissional - AdaptaEdu Escolar
 * 
 * Implementa arquitetura corporativa de logs com níveis estritos (DEBUG, INFO, WARN, ERROR)
 * e comportamentos especializados por ambiente:
 * 
 * - DEVELOPMENT: Todos os níveis habilitados, formatação visual colorida no navegador e
 *   no terminal Node, rastreamento aprofundado de payloads e diagnóstico interativo de
 *   permissões do Firebase e integridade de build.
 * - STAGING: Níveis INFO, WARN e ERROR habilitados. Logs estruturados com metadados para
 *   depuração pré-produção rápida, validação de latência e conferência de fluxos.
 * - PRODUCTION: Apenas WARN e ERROR habilitados (com suporte a INFO crítico opcional).
 *   Mascara dados sensíveis (PII, tokens JWT, senhas e credenciais) e formata logs de
 *   maneira limpa e resiliente para coletores de telemetria.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type AppEnvironment = 'development' | 'staging' | 'production';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
  environment: AppEnvironment;
}

export interface FirebaseDiagnosticInfo {
  operationType: string;
  path: string | null;
  errorCode?: string | number;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  suggestedAction?: string;
  ruleReference?: string;
}

const LOG_LEVEL_WEIGHTS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class LoggerService {
  private environment: AppEnvironment = 'development';
  private logsBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 400;

  constructor() {
    this.determineEnvironment();
  }

  /**
   * Determina com precisão o ambiente de execução de forma resiliente tanto
   * no navegador (Vite) quanto no servidor Node.js ou suite de testes (tsx/vitest).
   */
  private determineEnvironment(): void {
    try {
      // 1. Verificação via Vite import.meta.env
      if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        const metaEnv = (import.meta as any).env;
        const mode = metaEnv.MODE || (metaEnv.DEV ? 'development' : metaEnv.PROD ? 'production' : '');
        if (mode === 'production') {
          this.environment = 'production';
          return;
        }
        if (mode === 'staging') {
          this.environment = 'staging';
          return;
        }
        if (mode === 'development' || mode === 'test') {
          this.environment = 'development';
          return;
        }
      }
    } catch {
      // Fallback seguro se import.meta não for acessível
    }

    // 2. Verificação via Browser Window Hostname
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname || '';
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
        this.environment = 'development';
        return;
      }
      if (hostname.includes('staging') || hostname.includes('pre-') || hostname.includes('dev-')) {
        this.environment = 'staging';
        return;
      }
      this.environment = 'production';
      return;
    }

    // 3. Verificação via Node.js process.env
    try {
      if (typeof process !== 'undefined' && process.env) {
        const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
        if (nodeEnv === 'production') {
          this.environment = 'production';
          return;
        }
        if (nodeEnv === 'staging') {
          this.environment = 'staging';
          return;
        }
        this.environment = 'development';
        return;
      }
    } catch {
      // Fallback padrão
    }

    this.environment = 'development';
  }

  public getEnvironment(): AppEnvironment {
    return this.environment;
  }

  public setEnvironment(env: AppEnvironment): void {
    this.environment = env;
  }

  /**
   * Limiar de nível mínimo de log por ambiente:
   * - development: DEBUG (permite tudo)
   * - staging: INFO (suprime DEBUG repetitivo)
   * - production: WARN (apenas anomalias e falhas críticas)
   */
  private getMinLevel(): LogLevel {
    switch (this.environment) {
      case 'development':
        return 'DEBUG';
      case 'staging':
        return 'INFO';
      case 'production':
        return 'WARN';
      default:
        return 'INFO';
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const currentWeight = LOG_LEVEL_WEIGHTS[level] ?? 1;
    const minWeight = LOG_LEVEL_WEIGHTS[this.getMinLevel()] ?? 1;
    return currentWeight >= minWeight;
  }

  /**
   * Mascara dados sensíveis (tokens, senhas, chaves de API, credenciais)
   * prevenindo vazamentos de conformidade LGPD/segurança.
   */
  public sanitizeData(data: any, seen = new WeakSet()): any {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
      return data
        .replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza***[CHAVE_REDACTED]')
        .replace(/(Bearer\s+)[A-Za-z0-9-_.]+/gi, '$1***[TOKEN_REDACTED]')
        .replace(/(password|senha|secret|token|apiKey)=[^&\s]+/gi, '$1=***[REDACTED]');
    }

    if (typeof data !== 'object') {
      return data;
    }

    // Prevenção contra referências circulares
    if (seen.has(data)) {
      return '[Circular Reference]';
    }
    seen.add(data);

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, seen));
    }

    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'senha', 'token', 'accesstoken', 'refreshtoken', 'secret', 'apikey', 'privatekey'];

    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '***[PROTEGIDO]***';
      } else {
        sanitized[key] = this.sanitizeData(val, seen);
      }
    }

    return sanitized;
  }

  /**
   * Formata e despacha o log para o console nativo e o buffer interno de auditoria.
   */
  private write(level: LogLevel, context: string, message: string, data?: any): void {
    try {
      const timestamp = new Date().toISOString();
      const sanitizedPayload = data !== undefined ? this.sanitizeData(data) : undefined;

      const entry: LogEntry = {
        timestamp,
        level,
        context,
        message,
        data: sanitizedPayload,
        environment: this.environment,
      };

      // Armazena no buffer circular em memória
      this.logsBuffer.push(entry);
      if (this.logsBuffer.length > this.MAX_BUFFER_SIZE) {
        this.logsBuffer.shift();
      }

      if (!this.shouldLog(level)) {
        return;
      }

      const isBrowser = typeof window !== 'undefined';
      const formattedData = sanitizedPayload !== undefined ? sanitizedPayload : '';

      if (isBrowser) {
        this.writeBrowserConsole(level, timestamp, context, message, formattedData);
      } else {
        this.writeNodeConsole(level, timestamp, context, message, formattedData);
      }
    } catch {
      // O logger nunca deve propagar exceções internas
    }
  }

  private writeBrowserConsole(level: LogLevel, timestamp: string, context: string, message: string, data: any): void {
    const badgeColors: Record<LogLevel, { bg: string; text: string }> = {
      DEBUG: { bg: '#475569', text: '#f8fafc' },
      INFO: { bg: '#0284c7', text: '#ffffff' },
      WARN: { bg: '#d97706', text: '#ffffff' },
      ERROR: { bg: '#dc2626', text: '#ffffff' },
    };

    const cfg = badgeColors[level];
    const badgeStyle = `background: ${cfg.bg}; color: ${cfg.text}; font-size: 10px; font-weight: bold; border-radius: 3px; padding: 1px 5px;`;
    const contextStyle = 'color: #3b82f6; font-weight: 600;';
    const timeStyle = 'color: #94a3b8; font-size: 10px;';

    const header = `%c${level}%c [${context}] %c${timestamp.slice(11, 19)}`;

    switch (level) {
      case 'DEBUG':
        if (data !== '') console.debug(header, badgeStyle, contextStyle, timeStyle, message, data);
        else console.debug(header, badgeStyle, contextStyle, timeStyle, message);
        break;
      case 'INFO':
        if (data !== '') console.info(header, badgeStyle, contextStyle, timeStyle, message, data);
        else console.info(header, badgeStyle, contextStyle, timeStyle, message);
        break;
      case 'WARN':
        if (data !== '') console.warn(header, badgeStyle, contextStyle, timeStyle, message, data);
        else console.warn(header, badgeStyle, contextStyle, timeStyle, message);
        break;
      case 'ERROR':
        if (data !== '') console.error(header, badgeStyle, contextStyle, timeStyle, message, data);
        else console.error(header, badgeStyle, contextStyle, timeStyle, message);
        break;
    }
  }

  private writeNodeConsole(level: LogLevel, timestamp: string, context: string, message: string, data: any): void {
    const ansiCodes: Record<LogLevel, string> = {
      DEBUG: '\x1b[90m', // Cinza
      INFO: '\x1b[36m',  // Ciano
      WARN: '\x1b[33m',  // Amarelo
      ERROR: '\x1b[31m', // Vermelho
    };
    const reset = '\x1b[0m';
    const color = ansiCodes[level] || reset;
    const prefix = `[${timestamp}] ${color}[${level}]${reset} [${context}]`;

    switch (level) {
      case 'DEBUG':
        if (data !== '') console.debug(`${prefix} ${message}`, data);
        else console.debug(`${prefix} ${message}`);
        break;
      case 'INFO':
        if (data !== '') console.info(`${prefix} ${message}`, data);
        else console.info(`${prefix} ${message}`);
        break;
      case 'WARN':
        if (data !== '') console.warn(`${prefix} ${message}`, data);
        else console.warn(`${prefix} ${message}`);
        break;
      case 'ERROR':
        if (data !== '') console.error(`${prefix} ${message}`, data);
        else console.error(`${prefix} ${message}`);
        break;
    }
  }

  /**
   * Assinatura flexível: aceita (context, message, data) ou (message, data)
   */
  private normalizeArgs(contextOrMsg: string, messageOrData?: any, data?: any): { context: string; message: string; data?: any } {
    if (messageOrData === undefined && data === undefined) {
      return { context: 'App', message: contextOrMsg };
    }
    if (typeof messageOrData === 'string' && data !== undefined) {
      return { context: contextOrMsg, message: messageOrData, data };
    }
    if (typeof messageOrData === 'string' && data === undefined) {
      return { context: contextOrMsg, message: messageOrData };
    }
    // Caso: logger.info('Mensagem única', payloadObject)
    return { context: 'App', message: contextOrMsg, data: messageOrData };
  }

  public debug(contextOrMsg: string, messageOrData?: any, data?: any): void {
    const args = this.normalizeArgs(contextOrMsg, messageOrData, data);
    this.write('DEBUG', args.context, args.message, args.data);
  }

  public info(contextOrMsg: string, messageOrData?: any, data?: any): void {
    const args = this.normalizeArgs(contextOrMsg, messageOrData, data);
    this.write('INFO', args.context, args.message, args.data);
  }

  public warn(contextOrMsg: string, messageOrData?: any, data?: any): void {
    const args = this.normalizeArgs(contextOrMsg, messageOrData, data);
    this.write('WARN', args.context, args.message, args.data);
  }

  public error(contextOrMsg: string, messageOrData?: any, data?: any): void {
    const args = this.normalizeArgs(contextOrMsg, messageOrData, data);
    this.write('ERROR', args.context, args.message, args.data);
  }

  /**
   * Diagnóstico especializado para falhas de permissão do Firebase / Firestore.
   * Identifica se a falha decorre de token ausente, regras de firestore.rules,
   * coleção protegida ou restrição de role/claims.
   */
  public firebasePermissionError(
    error: unknown,
    operation: string,
    path: string | null,
    authContext?: { userId?: string | null; email?: string | null; role?: string | null }
  ): FirebaseDiagnosticInfo {
    const errMsg = error instanceof Error ? error.message : String(error || '');
    const isPermissionError = errMsg.includes('PERMISSION_DENIED') || errMsg.includes('Missing or insufficient permissions');

    let suggestedAction = 'Verifique a conectividade de rede e as regras do Firestore.';
    let ruleRef = 'firestore.rules';

    if (isPermissionError) {
      if (!authContext?.userId) {
        suggestedAction = 'Usuário não autenticado no Firebase Auth. Operações de gravação exigem login ativo (isAuthenticated).';
      } else if (path?.startsWith('curriculum') || path?.startsWith('skills')) {
        suggestedAction = 'Coleção curricular restrita: requer perfil de Coordenador, Gestor ou SuperAdmin no firestore.rules.';
        ruleRef = 'firestore.rules -> match /curriculumMatrices e /curriculumSkills';
      } else if (path?.startsWith('students')) {
        suggestedAction = 'Cadastro de alunos restrito: requer perfil Professor, Apoio ou Coordenação autenticado.';
        ruleRef = 'firestore.rules -> match /students/{studentId}';
      } else if (path?.startsWith('authorizedUsers')) {
        suggestedAction = 'Coleção de credenciais: apenas o próprio usuário (request.auth.uid == userId) ou Coordenador/Admin pode salvar.';
        ruleRef = 'firestore.rules -> match /authorizedUsers/{userId}';
      } else if (path?.startsWith('supportRecords') || path?.startsWith('supportLogs')) {
        suggestedAction = 'Registros do Apoio: requer role PROFISSIONAL_DE_APOIO, Coordenador ou SuperAdmin.';
        ruleRef = 'firestore.rules -> match /supportRecords/{recordId}';
      } else {
        suggestedAction = 'Permissão insuficiente para o path solicitado. Inspecione os roles atribuídos ao usuário e as regras do firestore.rules.';
      }
    }

    const diagInfo: FirebaseDiagnosticInfo = {
      operationType: operation,
      path: path || 'desconhecido',
      errorCode: isPermissionError ? 'PERMISSION_DENIED' : 'FIRESTORE_ERROR',
      userId: authContext?.userId || null,
      userEmail: authContext?.email || null,
      userRole: authContext?.role || null,
      suggestedAction,
      ruleReference: ruleRef,
    };

    if (this.environment === 'development') {
      this.warn('Firebase:Permissions', `[Diagnóstico de Permissão] Falha em ${operation.toUpperCase()} no path: '${path}'`, {
        erro: errMsg,
        diagnostico: diagInfo.suggestedAction,
        regra: diagInfo.ruleReference,
        usuario: diagInfo.userEmail || diagInfo.userId || 'Não Autenticado (Anônimo/Offline)',
      });
    } else {
      this.warn('Firebase:Permissions', `Falha de permissão no Firestore: ${operation} '${path}'`, diagInfo);
    }

    return diagInfo;
  }

  /**
   * Registra diagnósticos de compilação, splitting de bundles e inicialização.
   */
  public buildDiagnostic(stage: string, details?: any): void {
    if (this.environment === 'development' || this.environment === 'staging') {
      this.info('BuildDiagnostic', `[${stage}] Verificação de pipeline e bundles`, details);
    }
  }

  /**
   * Monitor de telemetria de latência para operações críticas (Firestore, IA, Geração PDF).
   */
  public performanceMetric(metricName: string, durationMs: number, metadata?: Record<string, any>): void {
    if (this.environment === 'development') {
      this.debug('Performance', `${metricName}: ${durationMs.toFixed(1)}ms`, metadata);
    } else if (this.environment === 'staging' && durationMs > 1500) {
      this.warn('Performance', `Operação lenta detectada: ${metricName} (${durationMs.toFixed(1)}ms)`, metadata);
    }
  }

  /**
   * Retorna os logs mais recentes armazenados no buffer circular.
   */
  public getRecentLogs(limit = 100): LogEntry[] {
    return this.logsBuffer.slice(-Math.max(1, limit));
  }

  /**
   * Permite filtrar o buffer de logs por nível, contexto ou busca textual.
   */
  public filterLogs(filter: { level?: LogLevel; context?: string; search?: string }): LogEntry[] {
    return this.logsBuffer.filter(entry => {
      if (filter.level && entry.level !== filter.level) return false;
      if (filter.context && !entry.context.toLowerCase().includes(filter.context.toLowerCase())) return false;
      if (filter.search) {
        const term = filter.search.toLowerCase();
        const inMsg = entry.message.toLowerCase().includes(term);
        const inData = entry.data ? JSON.stringify(entry.data).toLowerCase().includes(term) : false;
        if (!inMsg && !inData) return false;
      }
      return true;
    });
  }

  /**
   * Exporta os logs do buffer como JSON estruturado para auditoria.
   */
  public exportLogsAsJson(): string {
    return JSON.stringify(this.logsBuffer, null, 2);
  }

  /**
   * Limpa o buffer de logs em memória.
   */
  public clearBuffer(): void {
    this.logsBuffer = [];
  }
}

export const logger = new LoggerService();
export default logger;
