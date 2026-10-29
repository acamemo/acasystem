import type { HistorySource } from './operationalProfile';

/**
 * Card types whose history is a continuous measurement: a trend over time says something the
 * current value does not. Everything else (switches, lock, alarm, presence, cover position, volume,
 * brightness, a set point) is a state or a command the user gave, and a line of it only repeats
 * the word already on the card.
 */
const MEASURED_TYPES: ReadonlySet<string> = new Set([
  'sensor',
  'room',
  'car',
  'vacuum',
  'mower',
  'cost',
  'nordpool',
]);

export interface ChartWish {
  type: string;
  history?: Pick<HistorySource, 'entityId' | 'states'>;
  /** The card brings its own series (the hourly prices), no history is fetched. */
  hasSeries?: boolean;
}

/**
 * Whether the card keeps a slot for a trend chart. Decided from the kind of data alone, never from
 * whether the history has arrived, so the card has the same layout while it loads and after.
 */
export function wantsTrendChart({ type, history, hasSeries = false }: ChartWish): boolean {
  if (!MEASURED_TYPES.has(type)) return false;
  if (hasSeries) return true;
  if (!history || history.states) return false;
  // A sensor type also carries switches and numbers to set: only a reading has a trend.
  return type !== 'sensor' || history.entityId.startsWith('sensor.');
}

/** A trend needs a few points that differ: a flat line is a battery on the dock, not information. */
export function hasTrend(points: readonly { value: number }[] | undefined): boolean {
  if (!points || points.length < 2) return false;
  const values = points.map((point) => point.value);
  return Math.max(...values) > Math.min(...values);
}

/** The range, in words, only where the user moved it off the default 24 hours. */
export function rangeCaption(hours: number): string | null {
  if (hours === 24) return null;
  if (hours > 24) return `${Math.round(hours / 24)} giorni`;
  return `${hours} ore`;
}
