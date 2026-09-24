import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/** Copy text to the clipboard; `copied` stays true briefly so the button can confirm. */
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Couldn’t copy to the clipboard');
    }
  }, []);

  return { copied, copy };
}
