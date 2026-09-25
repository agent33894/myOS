import { Moon } from 'lucide-react';
import { Button } from '../../ui';
import { startRitual } from './store';

/** Opens Close the day. Placed in page headers (Today, Journal); the flow never starts on its own. */
export function CloseDayButton({ className, primary = false }: { className?: string; primary?: boolean }) {
  return (
    <Button variant={primary ? 'primary' : 'ghost'} leadingIcon={Moon} onClick={() => startRitual('close-day')} className={className}>
      Close the day
    </Button>
  );
}
