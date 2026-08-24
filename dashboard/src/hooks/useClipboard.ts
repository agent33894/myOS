import { useState, useCallback } from 'react';

interface UseClipboardOptions {
  timeout?: number;
  onSuccess?: (text: string) => void;
  onError?: (error: Error) => void;
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeout = 2000, onSuccess, onError } = options;
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onSuccess?.(text);
      setTimeout(() => setCopied(false), timeout);
    } catch (_err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand('copy');
        setCopied(true);
        onSuccess?.(text);
        setTimeout(() => setCopied(false), timeout);
      } catch (fallbackErr) {
        onError?.(fallbackErr instanceof Error ? fallbackErr : new Error('Copy failed'));
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }, [timeout, onSuccess, onError]);

  return { copied, copyToClipboard };
}
