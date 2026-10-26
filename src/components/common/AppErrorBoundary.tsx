import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * AppErrorBoundary - Captura falhas críticas de renderização e módulos dinâmicos.
 * Mantém o visual institucional do AdaptaEdu Escolar.
 */
export class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary] Erro crítico capturado:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    // Limpa falhas de rede de módulos dinâmicos recarregando a página de forma controlada
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-600 p-6 flex flex-col items-center text-white">
              <div className="bg-white/20 p-3 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Ops! Algo não carregou corretamente</h2>
              <p className="text-emerald-50 text-xs mt-2 text-center">
                O sistema AdaptaEdu detectou uma falha na renderização de um módulo pedagógico.
              </p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">Detalhes Técnicos:</p>
                <p className="text-[10px] text-amber-700 font-mono break-all leading-relaxed">
                  {this.state.error?.name}: {this.state.error?.message || 'Erro desconhecido na árvore de componentes.'}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 active:scale-95"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Recarregar Módulo Automaticamente</span>
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Home className="h-4 w-4" />
                  <span>Voltar ao Início do Sistema</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-medium">
                  Seus dados salvos no dispositivo (IndexedDB) não foram afetados por esta falha.
                </p>
                <div className="mt-2 flex justify-center gap-4 text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                  <span>AdaptaEdu Escolar</span>
                  <span>•</span>
                  <span>SEDUC-GO 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
