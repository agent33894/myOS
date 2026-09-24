import { isFiniteNumber } from '../model';
import type { CartesianChart } from './model';

/** Round steps (1, 2, 2.5, 5 × 10ⁿ) so the value axis reads 0, 50, 100 rather than 0, 45, 90. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  const low = Math.min(0, min);
  const high = Math.max(0, max);
  const raw = (high - low) / count || 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((multiple) => multiple * magnitude).find((candidate) => candidate >= raw)!;
  const ticks: number[] = [];
  for (let tick = Math.floor(low / step) * step; tick <= Math.ceil(high / step) * step + step / 2; tick += step) {
    ticks.push(Number(tick.toPrecision(12)));
  }
  return ticks;
}

/** The value range a chart plots: stacked series add up per row. */
export function valueRange(chart: CartesianChart): [number, number] {
  const rows = chart.data.map((row) => chart.series.map((series) => row[series.key]).filter(isFiniteNumber));
  const values = chart.stacked ? rows.map((row) => row.reduce((sum, value) => sum + value, 0)) : rows.flat();
  const thresholds = (chart.thresholds ?? []).map((threshold) => threshold.value);
  const all = [...values, ...thresholds];
  return all.length ? [Math.min(...all), Math.max(...all)] : [0, 1];
}
