import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Spinamp Error Boundary caught an exception:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-[#090a0f] text-neutral-100 flex flex-col items-center justify-center p-6 font-sans select-none">
          <div className="max-w-md w-full bg-[#12131a] border border-amber-500/40 rounded-xl p-6 shadow-2xl relative overflow-hidden">
            {/* Retro Winamp style header */}
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold text-amber-400 uppercase tracking-wide">
                  Spinamp System Diagnostics
                </h3>
                <p className="text-xs text-neutral-400">
                  A temporary runtime exception occurred
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed mb-4">
              The application encountered an unexpected state. You can reload or reset saved settings to restore normal audio playback.
            </p>

            {this.state.error && (
              <div className="bg-[#0a0b0f] border border-neutral-800 rounded p-3 mb-5 font-mono text-[11px] text-red-400 overflow-x-auto max-h-32">
                <div className="font-bold mb-1 text-red-300">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-neutral-500 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                onClick={this.handleResetStorage}
                className="w-full py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer border border-neutral-700"
              >
                <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
                Clear Local Cache & Reset State
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
