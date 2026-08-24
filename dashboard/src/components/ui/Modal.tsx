import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { CommandSurface } from './CommandSurface';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  layout?: 'default' | 'tall';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-2xl',
  layout = 'default',
}: ModalProps) {
  const titleId = useId();
  const subtitleId = useId();
  const isTall = layout === 'tall';

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // A popover/menu inside the modal owns this Escape — it closes itself.
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-radix-popper-content-wrapper]')) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <CommandSurface
      title={title}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={subtitle ? subtitleId : undefined}
      variant={isTall ? 'tall' : 'dialog'}
      className={`relative flex w-full ${maxWidth} min-h-0 flex-col ${isTall ? 'max-h-[92vh]' : 'max-h-[80vh]'}`}
    >
      <header className="chronicle-modal-header flex-shrink-0">
        <div className="min-w-0">
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p id={subtitleId}>{subtitle}</p>}
        </div>
        <Button variant="icon" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
      </header>
      <div className="chronicle-modal-body space-y-4">{children}</div>
      {footer && <footer className="chronicle-modal-footer flex-shrink-0">{footer}</footer>}
    </CommandSurface>
  );
}
