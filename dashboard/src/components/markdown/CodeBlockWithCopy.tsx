import type { ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { useClipboard } from '../../hooks/useClipboard';
import { extractCodeText } from '../../utils/extractCodeText';
import ShikiCode from '../ui/ShikiCode';
import { Button } from '../ui/button';

interface CodeBlockWithCopyProps {
  children: ReactNode;
  className?: string;
}

export default function CodeBlockWithCopy({ children, className }: CodeBlockWithCopyProps) {
  const { copied, copyToClipboard } = useClipboard();
  const codeText = extractCodeText(children);
  const language = className?.match(/language-(\w+)/)?.[1] ?? 'text';

  return (
    <div className="group relative overflow-hidden rounded-md border border-[var(--rule-standard)] bg-secondary">
      <ShikiCode code={codeText} language={language} className={className} />
      <Button
        onClick={() => copyToClipboard(codeText)}
        type="button"
        variant="icon"
        size="icon"
        className="absolute right-2 top-2 bg-card opacity-0 transition-[color,background-color,box-shadow,opacity,transform] duration-200 focus-visible:opacity-100 group-hover:opacity-100"
        title={copied ? 'Copied!' : 'Copy code'}
        aria-label="Copy code"
      >
        {copied ? <Check className="h-4 w-4 ed-text-success" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
