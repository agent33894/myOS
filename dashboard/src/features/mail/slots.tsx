import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import { needsYou } from '@shared/mail/select';
import { toMailUrl } from '../../app/navigation';
import { subscribe } from '../../data/ipc';
import { useMail, useMailStore, useMailSync } from '../../data/mail';
import { Button, Icon } from '../../ui';
import { counterpart, displayName } from './format';

/** The sidebar's Mail count: exactly the rows under Needs you. */
export function useMailCount(): number {
  useMailSync();
  return useMailStore((state) => (state.snapshot ? needsYou(state.snapshot.items).length : 0));
}

/** A clicked mail notification opens that message (or Mail) in the running window. */
export function useMailOpen(): void {
  const navigate = useNavigate();
  useEffect(() => subscribe('mail:open', ({ id }) => navigate(toMailUrl(id ? { id } : {}))), [navigate]);
}

/** One quiet line on Today when mail needs you; nothing when it does not. */
export function MailOnToday() {
  const navigate = useNavigate();
  const snapshot = useMail();
  if (!snapshot || snapshot.accounts.length === 0) return null;
  const needs = needsYou(snapshot.items);
  const count = needs.length;
  if (count === 0) return null;
  return (
    <Button
      variant="ghost"
      onClick={() => navigate(toMailUrl())}
      className="h-auto min-h-9 w-full justify-start gap-3 whitespace-normal px-2 py-2 text-left font-normal"
    >
      <span className="text-accent-text">
        <Icon icon={Mail} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-medium text-text">
          {count} {count === 1 ? 'email needs' : 'emails need'} you
        </span>
        <span className="block truncate text-sm text-text-tertiary">
          {needs
            .slice(0, 3)
            .map((item) => `${displayName(counterpart(item)).split(' ')[0]}: ${item.subject}`)
            .join(' · ')}
        </span>
      </span>
      <Icon icon={ArrowRight} size="sm" />
    </Button>
  );
}
