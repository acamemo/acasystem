/**
 * Nordpool price sensor (HACS integration): settings, price slots, level and the Norwegian
 * support calculation, from the legacy GenericNordpoolCard, NordpoolModal and
 * `@/api/nordpoolUtils`.
 *
 * Deliberate difference from the legacy: the current slot is found from the slot times
 * (`raw_today` start/end, as the legacy `useEnergyData` hook did) and the current price is the
 * sensor state. The legacy fixed offset (`hour + 47`) pointed outside 24- and 96-slot days.
 */
import type { CardSettings } from '@/@types/dashboard';
import type { HaConfig } from '@/@types/ha';
import type { PricePoint } from '../shared/charts';
import {
  attr,
  numericState,
  settingNumber,
  settingString,
  type MaybeEntity,
} from '../shared/entity';
import { parseNumber } from '../shared/format';
import { currencyUnit } from '../shared/units';
import { readKey, toDate } from '@/validators/guards';

export interface NordpoolSettings {
  nordpoolId: string | null;
  /** Decimals of the price (legacy default 2). */
  decimals: number;
  currency: string | null;
  graphStyle: 'bar' | 'line';
  showWithSupport: boolean;
}

export function readNordpoolSettings(settings: CardSettings): NordpoolSettings {
  const decimals = settingNumber(settings, 'decimals');
  return {
    nordpoolId: settingString(settings, 'nordpoolId'),
    decimals: decimals === null ? 2 : Math.max(0, Math.min(6, Math.round(decimals))),
    currency: settingString(settings, 'currency'),
    graphStyle: settings.graphStyle === 'bar' ? 'bar' : 'line',
    showWithSupport: settings.showWithSupport === true,
  };
}

/**
 * Currency of the prices (legacy order): the card setting, then the currency of Home
 * Assistant; null while neither is known (no guessed currency, no sensor unit).
 */
export function priceUnit(settings: NordpoolSettings, haConfig: HaConfig | null): string | null {
  return currencyUnit(settings.currency, haConfig);
}

function rawSlots(value: unknown): PricePoint[] {
  if (!Array.isArray(value)) return [];
  const slots: PricePoint[] = [];
  for (const item of value) {
    const start = toDate(readKey(item, 'start'));
    const end = toDate(readKey(item, 'end'));
    const price = parseNumber(readKey(item, 'value'));
    if (price === null || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    slots.push({ start, end, value: price });
  }
  return slots;
}

function arraySlots(value: unknown, dayStart: Date): PricePoint[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  const minutes = 1440 / value.length;
  const slots: PricePoint[] = [];
  value.forEach((item, index) => {
    const price = parseNumber(item);
    if (price === null) return;
    const start = new Date(dayStart.getTime() + index * minutes * 60_000);
    slots.push({ start, end: new Date(start.getTime() + minutes * 60_000), value: price });
  });
  return slots;
}

export interface PriceSeries {
  points: PricePoint[];
  /** Index of the slot containing now, -1 when no slot does. */
  currentIndex: number;
  /** Current price: the sensor state, else the current slot. */
  current: number | null;
  stats: { min: number; max: number; avg: number } | null;
}

/** Today's slots, plus tomorrow's when `tomorrow_valid` is true (legacy rule). */
export function priceSeries(entity: MaybeEntity, now: Date = new Date()): PriceSeries {
  const tomorrowValid = attr(entity, 'tomorrow_valid') === true;
  let today = rawSlots(attr(entity, 'raw_today'));
  let tomorrow = tomorrowValid ? rawSlots(attr(entity, 'raw_tomorrow')) : [];
  if (today.length === 0) {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const nextMidnight = new Date(midnight);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    today = arraySlots(attr(entity, 'today'), midnight);
    tomorrow = tomorrowValid ? arraySlots(attr(entity, 'tomorrow'), nextMidnight) : [];
  }
  const points = [...today, ...tomorrow];
  const time = now.getTime();
  const currentIndex = points.findIndex(
    (point) => time >= point.start.getTime() && time < point.end.getTime()
  );
  const values = points.map((point) => point.value);
  const stats =
    values.length > 0
      ? {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, value) => sum + value, 0) / values.length,
        }
      : null;
  const current = numericState(entity) ?? points[currentIndex]?.value ?? null;
  return { points, currentIndex, current, stats };
}

export type PriceLevel = 'low' | 'normal' | 'high' | 'veryHigh';

/** Level of the current price against the average (legacy thresholds 0.9 / 1.15 / 1.4). */
export function priceLevel(current: number | null, avg: number | null | undefined): PriceLevel {
  if (current === null || !avg || avg <= 0 || !Number.isFinite(current)) return 'normal';
  if (current >= avg * 1.4) return 'veryHigh';
  if (current >= avg * 1.15) return 'high';
  if (current <= avg * 0.9) return 'low';
  return 'normal';
}

export const PRICE_LEVEL_LABEL: Record<PriceLevel, string> = {
  low: 'Prezzo basso',
  normal: 'Prezzo nella media',
  high: 'Prezzo alto',
  veryHigh: 'Prezzo molto alto',
};

/**
 * Norwegian electricity support 2025/2026 (legacy NordpoolModal): prices with VAT in øre;
 * above 93.75 øre the state covers 90% of the excess (excluding VAT).
 */
export function withSupport(priceInclVat: number): number {
  const threshold = 93.75;
  if (priceInclVat <= threshold) return priceInclVat;
  const priceExVat = priceInclVat / 1.25;
  const support = (priceExVat - 75) * 0.9 * 1.25;
  return priceInclVat - support;
}
