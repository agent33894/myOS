import { attempt, fail, jsonObject, text, toJson, type BlockModel } from '../model';

// `error` is the stored name for the danger tone; files written by earlier
// versions use it, so it stays the on-disk value.
export const CALLOUT_TONES = ['info', 'success', 'warning', 'error', 'neutral'] as const;
export type CalloutTone = (typeof CALLOUT_TONES)[number];

export interface Callout {
  tone: CalloutTone;
  title?: string;
  body?: string;
  items?: string[];
}

function parseTone(value: unknown): CalloutTone {
  if (value === undefined) return 'info';
  const tone = text(value)?.toLowerCase();
  if (!CALLOUT_TONES.includes(tone as CalloutTone)) {
    fail(`“${String(value)}” isn’t a callout tone. Use info, success, warning, error, or neutral.`);
  }
  return tone as CalloutTone;
}

export const calloutModel: BlockModel<Callout> = {
  parse: (raw) =>
    attempt(() => {
      const source = jsonObject(raw);
      const items = Array.isArray(source.items) ? source.items.map(text).filter((item): item is string => !!item) : [];
      return {
        tone: parseTone(source.tone),
        title: text(source.title),
        body: text(source.body),
        items: items.length ? items : undefined,
      };
    }),
  serialize: ({ tone, title, body, items }) =>
    toJson({ tone, title, body, items: items?.map((item) => item.trim()).filter(Boolean) }),
};

export const newCallout = (): Callout => ({ tone: 'info' });
