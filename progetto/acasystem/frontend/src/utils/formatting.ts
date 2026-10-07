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
