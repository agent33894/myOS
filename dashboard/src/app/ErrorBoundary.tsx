import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, ErrorState, cn } from '../ui';

interface Props {
  children: ReactNode;
  /** When this changes (e.g. the route), a failed subtree gets another try. */
  resetKey?: string;
  /** `screen` fills the window (app root); `page` fills the content area. */
  variant?: 'screen' | 'page';
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 bg-canvas p-6',
          this.props.variant === 'screen' ? 'h-screen' : 'h-full',
        )}
      >
        <ErrorState
          description="This part of myOS hit a problem. Your files are safe."
          onRetry={() => this.setState({ error: null })}
        />
        <Button variant="ghost" size="sm" leadingIcon={RefreshCw} onClick={() => window.location.reload()}>
          Reload myOS
        </Button>
        <p className="max-w-md text-center font-mono text-xs text-text-tertiary">{error.message}</p>
      </div>
    );
  }
}
