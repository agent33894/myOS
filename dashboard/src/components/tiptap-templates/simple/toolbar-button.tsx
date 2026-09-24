import { Editor } from '@tiptap/react';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button'

interface ToolbarButtonProps {
  editor: Editor;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
  className,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-8 w-8 p-0',
        isActive && 'bg-secondary ',
        className
      )}
    >
      <span className={cn('h-4 w-4', isActive && 'text-accent-text')}>
        {children}
      </span>
    </Button>
  );
}
