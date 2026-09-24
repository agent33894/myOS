import { Field, Input, SegmentedControl, Textarea } from '../../../ui';
import { CALLOUT_TONES, type Callout } from './model';
import { TONE_STYLE } from './View';

const TONE_OPTIONS = CALLOUT_TONES.map((tone) => ({ value: tone, label: TONE_STYLE[tone].label }));

export default function CalloutEditor({ value, onChange }: { value: Callout; onChange: (next: Callout) => void }) {
  const set = (patch: Partial<Callout>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl aria-label="Tone" size="sm" options={TONE_OPTIONS} value={value.tone} onValueChange={(tone) => set({ tone })} />
      <Field label="Title">
        <Input value={value.title ?? ''} placeholder="Worth knowing" onChange={(event) => set({ title: event.target.value })} />
      </Field>
      <Field label="Text">
        <Textarea
          autosize
          value={value.body ?? ''}
          placeholder="The key takeaway, in a sentence or two"
          onChange={(event) => set({ body: event.target.value })}
        />
      </Field>
      <Field label="Bullet points" hint="One per line">
        <Textarea
          autosize
          value={(value.items ?? []).join('\n')}
          onChange={(event) => set({ items: event.target.value.split('\n') })}
        />
      </Field>
    </div>
  );
}
