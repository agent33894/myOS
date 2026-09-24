import { AlertCircle, AlertTriangle, CheckCircle2, Info, Lightbulb, type LucideIcon } from 'lucide-react';
import { cn, Icon } from '../../../ui';
import type { Callout, CalloutTone } from './model';

export const TONE_STYLE: Record<CalloutTone, { icon: LucideIcon; label: string; surface: string; glyph: string }> = {
  info: { icon: Info, label: 'Info', surface: 'bg-accent-soft', glyph: 'text-accent-text' },
  success: { icon: CheckCircle2, label: 'Success', surface: 'bg-success-soft', glyph: 'text-success' },
  warning: { icon: AlertTriangle, label: 'Warning', surface: 'bg-warning-soft', glyph: 'text-warning' },
  error: { icon: AlertCircle, label: 'Danger', surface: 'bg-danger-soft', glyph: 'text-danger' },
  neutral: { icon: Lightbulb, label: 'Note', surface: 'bg-sunken', glyph: 'text-text-secondary' },
};

export default function CalloutView({ value }: { value: Callout }) {
  const tone = TONE_STYLE[value.tone];
  const empty = !value.title && !value.body && !value.items?.length;
  return (
    <aside className={cn('flex gap-3 rounded-lg px-4 py-3', tone.surface)} aria-label={tone.label}>
      <Icon icon={tone.icon} className={cn('mt-1', tone.glyph)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-md text-text">
        {value.title ? <div className="font-sans font-semibold">{value.title}</div> : null}
        {value.body ? <div className="whitespace-pre-wrap">{value.body}</div> : null}
        {value.items?.length ? (
          <ul className="list-disc pl-5 marker:text-text-tertiary">
            {value.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : null}
        {empty ? <div className="text-text-tertiary">Empty callout</div> : null}
      </div>
    </aside>
  );
}
