import { Toaster as Sonner } from 'sonner';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useIsDark } from '../hooks/useAccent';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

/**
 * The app's toast region. Toasts are short confirmations ("Done · Undo"),
 * styled with tokens and layered above dialogs. Call `toast()` from `sonner`.
 */
export function Toaster() {
  const isDark = useIsDark();
  return (
    <Sonner
      position="bottom-center"
      theme={isDark ? 'dark' : 'light'}
      gap={8}
      style={{ zIndex: 'var(--z-toast)' }}
      icons={{
        success: <Icon icon={CheckCircle2} className="text-success" />,
        error: <Icon icon={XCircle} className="text-danger" />,
        warning: <Icon icon={AlertTriangle} className="text-warning" />,
        info: <Icon icon={Info} className="text-accent-text" />,
        loading: <Spinner size="sm" className="text-text-secondary" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-lg bg-overlay px-4 py-3 font-sans text-base text-text shadow-overlay',
          content: 'flex min-w-0 flex-1 flex-col gap-0.5',
          title: 'font-medium',
          description: 'text-sm text-text-secondary',
          icon: 'flex shrink-0 items-center',
          actionButton:
            'h-7 shrink-0 rounded-md px-2 text-sm font-medium text-accent-text transition-colors duration-fast hover:bg-accent-soft',
          cancelButton:
            'h-7 shrink-0 rounded-md px-2 text-sm font-medium text-text-secondary transition-colors duration-fast hover:bg-text/5',
        },
      }}
    />
  );
}
