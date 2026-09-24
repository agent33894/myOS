const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const compactFormat = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

export const formatNumber = (value: number) => numberFormat.format(value);

/** Axis ticks: 12,400 becomes 12.4K so labels stay short. */
export const formatTick = (value: unknown) =>
  typeof value === 'number' ? (Math.abs(value) >= 10_000 ? compactFormat.format(value) : numberFormat.format(value)) : String(value ?? '');
