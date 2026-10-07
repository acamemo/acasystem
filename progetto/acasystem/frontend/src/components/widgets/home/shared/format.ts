/**
 * Formatting shared by the comfort widgets: Italian numbers, temperatures and dates.
 * Units follow Home Assistant (ADR-0007): values are shown in the unit HA reports, no conversion.
 */
import { getLocaleForLanguage } from '@/utils/i18n';

/** Placeholder for a value that is not known. */
export const MISSING_VALUE = '—';

export const localeFor = (language: string): string => getLocaleForLanguage(language || 'it');

/** Number from an HA attribute or state (numbers and numeric strings); null otherwise. */
export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatNumber(value: number | null, locale: string, maxFractionDigits = 1): string {
  if (value === null) return MISSING_VALUE;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/** «21,5 °C»; the unit is kept as HA reports it. */
export function formatWithUnit(
  value: number | null,
  unit: string,
  locale: string,
  maxFractionDigits = 1
): string {
  if (value === null) return MISSING_VALUE;
  const number = formatNumber(value, locale, maxFractionDigits);
  if (!unit) return number;
  return unit === '%' ? `${number}%` : `${number} ${unit}`;
}

/** First letter in capital, the rest untouched (sentence case for labels from HA or Intl). */
export function sentenceCase(text: string, locale = 'it-IT'): string {
  if (!text) return text;
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/** Readable fallback for an HA token such as `fan_only` → «Fan only». */
export function humanizeToken(token: string): string {
  return sentenceCase(token.replace(/_/g, ' ').trim());
}

/** Local calendar day, `YYYY-MM-DD`, used to group events and forecast entries. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** «Oggi», «Domani» or «Lunedì 12 ott». */
export function formatDayLabel(date: Date, locale: string, now: Date = new Date()): string {
  const day = startOfDay(date).getTime();
  const today = startOfDay(now).getTime();
  if (day === today) return 'Oggi';
  if (day === addDays(startOfDay(now), 1).getTime()) return 'Domani';
  return sentenceCase(
    date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' }),
    locale
  );
}

export function formatTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}
