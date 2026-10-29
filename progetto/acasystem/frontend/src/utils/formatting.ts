import type { Translate } from '@/@types/dashboard';

export type TimestampInput = string | number | Date | null | undefined;

/** Traduzione sicura: usa `t` se è una funzione, altrimenti restituisce la chiave. */
export const toTranslate =
  (t: unknown): Translate =>
  (key) => {
    if (typeof t !== 'function') return key;
    const translated: unknown = t(key);
    return typeof translated === 'string' ? translated : String(translated);
  };

export const formatRelativeTime = (timestamp: TimestampInput, t?: unknown): string => {
  if (!timestamp || timestamp === 'unavailable' || timestamp === 'unknown' || timestamp === '--')
    return '--';
  // Fallback t function if not provided
  const translate: Translate = toTranslate(t);

  try {
    const past = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return translate('time.justNow');
    if (diffMins < 60) return translate('time.minutesAgo').replace('{minutes}', String(diffMins));
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    if (remainingMins === 0)
      return translate('time.hoursAgo').replace('{hours}', String(diffHours));
    return translate('time.hoursMinutesAgo')
      .replace('{hours}', String(diffHours))
      .replace('{minutes}', String(remainingMins));
  } catch (_e) {
    return translate('time.unknown');
  }
};

export const formatDuration = (seconds: unknown): string => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const TOGGLE_DOMAINS = ['automation', 'switch', 'input_boolean', 'script', 'fan'];

/** Check if an entity belongs to a togglable domain. */
export const isToggleEntity = (id: string | null | undefined): boolean => {
  const domain = id?.split('.')?.[0];
  return domain !== undefined && TOGGLE_DOMAINS.includes(domain);
};

const READING_FORMAT = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

/**
 * A value as the person reads it, in Italian: «21,5», «2,84». Numbers and strings written with a
 * decimal point («21.5») get the comma; any other text («Acceso», «12:30», ids) stays as it is.
 */
export const formatReading = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isFinite(value) ? READING_FORMAT.format(value) : '—';
  const text = String(value);
  return /^-?\d+\.\d+$/.test(text.trim()) ? READING_FORMAT.format(Number(text)) : text;
};

/** The unit after a value: a space before it («21,5 °C», «2,84 €»), none before «%» or a bare «°» («63%», «240°»). */
export const unitSuffix = (unit: string | null | undefined): string => {
  const trimmed = (unit ?? '').trim();
  if (!trimmed) return '';
  return trimmed === '%' || trimmed === '°' ? trimmed : ` ${trimmed}`;
};

/** The same, with a no-break space: for a unit in its own box, where a normal space would collapse. */
export const unitSuffixBox = (unit: string | null | undefined): string =>
  unitSuffix(unit).replace(' ', '\u00a0');

/** Value and unit as one text: «21,5 °C», «2,84 €», «63%». */
export const formatReadingWithUnit = (value: unknown, unit?: string | null): string =>
  formatReading(value) + unitSuffix(unit);
