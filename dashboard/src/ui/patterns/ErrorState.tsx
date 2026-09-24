import type { ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../Button';
import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Shows a "Try again" button. */
  onRetry?: () => void;
  className?: string;
}

/** A failure in place of content, with an optional retry. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'myOS couldn’t load this. Your files are safe.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={className}>
      <EmptyState
        tone="danger"
        icon={AlertCircle}
        title={title}
        description={description}
        action={
          onRetry ? (
            <Button leadingIcon={RotateCcw} onClick={onRetry}>
              Try again
            </Button>
          ) : null
        }
      />
    </div>
  );
}
