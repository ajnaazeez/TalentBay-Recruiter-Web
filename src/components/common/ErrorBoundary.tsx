import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TalentBay ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4 shadow-sm border border-red-100">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-600 max-w-md mb-6">
            An unexpected error occurred in this view. You can reload the section or return to the dashboard.
          </p>
          {this.state.error?.message && (
            <div className="mb-6 p-3 bg-slate-100 text-slate-700 text-xs font-mono rounded-lg max-w-lg overflow-x-auto text-left border border-slate-200">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
