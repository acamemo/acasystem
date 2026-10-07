/**
 * Energy cost card: settings and history series, ported from the legacy
 * GenericEnergyCostCard and CostModal (same settings keys, same series rules).
 */
import type { CardSettings } from '@/@types/dashboard';
import type { HaHistoryEntry, HaStatistic } from '@/@types/ha';
import type { TimePoint } from '../shared/charts';
import { parseNumber } from '../shared/format';
import { settingNumber, settingString } from '../shared/entity';

export interface CostSettings {
  todayId: string | null;
  monthId: string | null;
  /** Decimals of today's value (legacy default 0). */
  decimals: number;
  currency: string | null;
  todayLabel: string;
  monthLabel: string;
}

export function readCostSettings(settings: CardSettings): CostSettings {
  const decimals = settingNumber(settings, 'decimals');
  return {
    todayId: settingString(settings, 'todayId'),
    monthId: settingString(settings, 'monthId'),
    decimals: decimals === null ? 0 : Math.max(0, Math.min(6, Math.round(decimals))),
    currency: settingString(settings, 'currency'),
    todayLabel: settingString(settings, 'todayLabel') ?? 'Oggi',
    monthLabel: settingString(settings, 'monthLabel') ?? 'Questo mese',
  };
}

export type CostRange = 24 | 48 | 72 | 168;
export type CostView = 'line' | 'bars';
export type CostMetric = 'value' | 'delta';

const HOUR_MS = 60 * 60 * 1000;

function toDateSafe(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const date = new Date(value < 1e12 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      const date = new Date(numeric < 1e12 ? numeric * 1000 : numeric);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
}

/** History entries (full or compressed) → numeric points. */
export function historyPoints(entries: HaHistoryEntry[]): TimePoint[] {
  const points: TimePoint[] = [];
  for (const entry of entries) {
    const value = parseNumber(entry.state ?? entry.s);
    const time = toDateSafe(
      entry.last_changed ??
        entry.last_updated ??
        entry.last_reported ??
        entry.timestamp ??
        entry.lc ??
        entry.lu
    );
    if (value !== null && time) points.push({ value, time });
  }
  return points;
}

/** Long-term statistics → points (mean, else state, else sum: same order as the legacy). */
export function statisticPoints(stats: HaStatistic[]): TimePoint[] {
  const points: TimePoint[] = [];
  for (const stat of stats) {
    const raw = typeof stat.mean === 'number' ? stat.mean : typeof stat.state === 'number' ? stat.state : stat.sum;
    const value = parseNumber(raw);
    const time = toDateSafe(stat.start);
    if (value !== null && time) points.push({ value, time });
  }
  return points;
}

/** Last value of each hour (≤ 48 h) or day (> 48 h): the cost accumulates within a period. */
export function buildBuckets(points: TimePoint[], rangeHours: number, now: number): TimePoint[] {
  if (points.length === 0) return [];
  const bucketMs = rangeHours > 48 ? 24 * HOUR_MS : HOUR_MS;
  const startMs = now - rangeHours * HOUR_MS;
  const buckets = new Map<number, { value: number; lastTime: number; time: Date }>();
  for (const point of points) {
    const time = point.time.getTime();
    if (!Number.isFinite(time) || time < startMs) continue;
    const bucketStart = Math.floor((time - startMs) / bucketMs) * bucketMs + startMs;
    const entry = buckets.get(bucketStart) ?? {
      value: point.value,
      lastTime: time,
      time: new Date(bucketStart),
    };
    if (time >= entry.lastTime) {
      entry.value = point.value;
      entry.lastTime = time;
    }
    buckets.set(bucketStart, entry);
  }
  return [...buckets.values()]
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .map((bucket) => ({ time: bucket.time, value: bucket.value }));
}

/** Change from one period to the next (the first period has no previous value). */
export function buildDeltaSeries(series: TimePoint[]): TimePoint[] {
  if (series.length < 2) return series;
  return series.slice(1).map((point, index) => ({
    ...point,
    value: point.value - (series[index]?.value ?? point.value),
  }));
}

/** Extends the first and last value to the edges of the range, for a full-width line. */
export function ensureRangeCoverage(data: TimePoint[], start: Date, end: Date): TimePoint[] {
  if (data.length === 0) return data;
  const sorted = [...data].sort((a, b) => a.time.getTime() - b.time.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first && first.time > start) sorted.unshift({ ...first, time: start });
  if (last && last.time < end) sorted.push({ ...last, time: end });
  return sorted;
}

/** Series shown for a combination of view and metric (legacy CostModal rules). */
export function buildCostSeries(
  points: TimePoint[],
  { rangeHours, view, metric, start, end }: { rangeHours: number; view: CostView; metric: CostMetric; start: Date; end: Date }
): TimePoint[] {
  const raw = [...points].sort((a, b) => a.time.getTime() - b.time.getTime());
  const bucketed = buildBuckets(raw, rangeHours, end.getTime());
  if (metric === 'delta') return buildDeltaSeries(bucketed);
  if (view === 'bars') return bucketed;
  return ensureRangeCoverage(raw, start, end);
}

export interface CostStats {
  last: number;
  min: number;
  max: number;
  avg: number;
}

export function costStats(series: TimePoint[]): CostStats | null {
  if (series.length === 0) return null;
  const values = series.map((point) => point.value);
  return {
    last: values[values.length - 1] ?? 0,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}
