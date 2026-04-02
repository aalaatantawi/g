import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  private handleGlobalError = (event: ErrorEvent) => {
    if (event.message?.includes('WebSocket closed without opened') || event.message?.includes('failed to connect to websocket')) return;
    this.setState({ hasError: true, error: event.error || new Error(event.message) });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reasonStr = String(event.reason);
    if (reasonStr.includes('WebSocket closed without opened') || reasonStr.includes('failed to connect to websocket')) return;
    this.setState({ hasError: true, error: event.reason instanceof Error ? event.reason : new Error(reasonStr) });
  };

  public componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  public componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'An unexpected error occurred.';
      let isFirestoreError = false;
      
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed && parsed.operationType) {
          isFirestoreError = true;
          errorMessage = `Database Error (${parsed.operationType} on ${parsed.path}): ${parsed.error}`;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border border-red-100">
            <div className="text-red-500 text-5xl mb-4">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <h2 className="text-2xl font-bold text-[#1C1C1E] mb-4">Something went wrong</h2>
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm mb-6 text-left overflow-auto max-h-48 font-mono">
              {errorMessage}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-[#1C1C1E] text-white rounded-full font-semibold hover:bg-black/80 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
