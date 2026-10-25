/**
 * Italian number, currency and time formatting for the utility widgets.
 * `@/utils/formatting` has no currency or locale-aware number helpers yet: these live here
 * until the orchestrator moves them to the shared utilities (see the wave-2 report).
 */

const LOCALE = 'it-IT';

const numberFormats = new Map<number, Intl.NumberFormat>();

function numberFormat(decimals: number): Intl.NumberFormat {
  const digits = Math.max(0, Math.min(6, Math.round(decimals)));
  let format = numberFormats.get(digits);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE, {
      // true = always: Italian groups four-digit figures too («8.989,30»).
      useGrouping: true,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    numberFormats.set(digits, format);
  }
  return format;
}

/** Number with a fixed count of decimals and the Italian separators (e.g. «8.989,30»). */
export function formatNumber(value: number | null | undefined, decimals = 0, fallback = '--') {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return numberFormat(decimals).format(value);
}

/** Like formatNumber, but drops trailing zeros (1 decimal at most by default): «12,5», «12». */
export function formatCompact(value: number | null | undefined, maxDecimals = 1, fallback = '--') {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return new Intl.NumberFormat(LOCALE, {
    useGrouping: true,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/** Parses a Home Assistant state or attribute, accepting a decimal comma. */
export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

const symbolCache = new Map<string, string>();

/**
 * Display unit of a currency: ISO codes become their narrow symbol (EUR → €, USD → $); any
 * other text (e.g. «kr», «øre», «c») is shown as written. The choice of the currency (card
 * setting, then Home Assistant) is `currencyUnit` in `./units`.
 */
export function currencySymbol(currency: string): string {
  const raw = currency.trim();
  if (!/^[A-Za-z]{3}$/.test(raw)) return raw;
  const code = raw.toUpperCase();
  const cached = symbolCache.get(code);
  if (cached) return cached;
  let symbol = code;
  try {
    const part = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((item) => item.type === 'currency');
    if (part?.value) symbol = part.value;
  } catch {
    symbol = raw;
  }
  symbolCache.set(code, symbol);
  return symbol;
}

/** First letter upper case, the rest unchanged: HA states become sentence case. */
export function sentenceCase(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Readable form of a raw HA state such as `going_home`: «Going home». */
export function humanizeState(state: string): string {
  return sentenceCase(state.replace(/_/g, ' '));
}

const relativeFormat = new Intl.RelativeTimeFormat('it', { numeric: 'auto' });

/** «adesso», «5 minuti fa», «ieri», then the date: for last-updated and last-clean values. */
export function formatRelative(value: unknown, now: Date = new Date()): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date =
    value instanceof Date
      ? value
      : typeof value === 'number'
        ? new Date(value < 1e12 ? value * 1000 : value)
        : new Date(String(value));
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : null;
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return 'adesso';
  if (abs < 3600) return relativeFormat.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return relativeFormat.format(Math.round(diffSeconds / 3600), 'hour');
  if (abs < 7 * 86400) return relativeFormat.format(Math.round(diffSeconds / 86400), 'day');
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
}

/** «1 luce accesa», «3 luci accese». */
export function lightsOnText(count: number): string {
  return count === 1 ? '1 luce accesa' : `${count} luci accese`;
}

/** «14:00». */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

/** Axis label of a time series for a range in hours. */
export function formatAxisTime(date: Date, rangeHours: number): string {
  if (rangeHours >= 168)
    return date.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric' });
  if (rangeHours >= 48)
    return `${date.toLocaleDateString(LOCALE, { weekday: 'short' })} ${formatClock(date)}`;
  return formatClock(date);
}

/** Durations from vacuum statistics: minutes below 2 hours, then hours. */
export function formatDuration(value: number | null, unit: string | null | undefined): string {
  if (value === null) return '--';
  const normalized = (unit ?? '').trim().toLowerCase();
  let minutes = value;
  if (['s', 'sec', 'secs', 'second', 'seconds'].includes(normalized)) minutes = value / 60;
  else if (['h', 'hr', 'hrs', 'hour', 'hours'].includes(normalized)) minutes = value * 60;
  else if (!normalized) minutes = value;
  if (minutes < 120) return `${formatCompact(minutes, 0)} min`;
  return `${formatCompact(minutes / 60, 1)} h`;
}
