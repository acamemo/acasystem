/** Italian formatting of values and times for the control widgets (locale it-IT). */

const DECIMAL = /^-?\d+(?:\.(\d+))?$/;

/** «21.5» → «21,5», «1234» → «1234»; anything that is not a plain number stays as it is. */
export function italianNumber(value: string): string {
  const match = DECIMAL.exec(value.trim());
  if (!match) return value;
  const decimals = match[1]?.length ?? 0;
  return Number(value).toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: Math.abs(Number(value)) >= 10000,
  });
}

export const percentText = (value: number): string => `${Math.round(value)}%`;

const dateTime = new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' });
const timeOnly = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
const relative = new Intl.RelativeTimeFormat('it', { numeric: 'auto' });

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const date = new Date(value < 1e12 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string' && value) {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return toDate(numeric);
  }
  return null;
}

export function formatDateTime(value: unknown): string {
  const date = toDate(value);
  return date ? dateTime.format(date) : '--';
}

export function formatClock(value: unknown): string {
  const date = toDate(value);
  return date ? timeOnly.format(date) : '--';
}

/** «adesso», «5 minuti fa», «2 ore fa», «ieri». */
export function formatRelative(value: unknown, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return '--';
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'adesso';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  return relative.format(Math.round(seconds / 86400), 'day');
}
