import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button'

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-6">
          <div className="max-w-2xl w-full bg-card border border-[hsl(var(--ed-error)/0.35)] shadow-chronicle-overlay p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-[hsl(var(--ed-error))]" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Something went wrong
                </h2>
                <p className="text-muted-foreground mb-4">
                  An unexpected error occurred. You can try refreshing the page or contact support if
                  the problem persists.
                </p>
                {this.state.error && (
                  <div className="mb-4">
                    <details className="text-sm">
                      <summary className="cursor-pointer text-foreground hover:text-foreground mb-2 active:opacity-75">
                        Error details
                      </summary>
                      <div className="mt-2 p-3 bg-secondary border border-border">
                        <div className="font-mono text-xs text-[hsl(var(--ed-error))] mb-2">
                          {this.state.error.toString()}
                        </div>
                        {this.state.errorInfo && (
                          <div className="font-mono text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64">
                            {this.state.errorInfo.componentStack}
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={this.handleReset}
                    variant="destructive"
                    className="flex items-center gap-2 px-4 py-2 transition-[color,background-color,border-color,box-shadow,transform] shadow-chronicle-lifted active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="px-4 py-2 transition-[color,background-color,border-color,box-shadow,transform] active:scale-95"
                  >
                    Reload Page
                  </Button>
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
