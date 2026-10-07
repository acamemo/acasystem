import type { CardSettings, CardSettingsMap, GetCardSettingsKey } from '@/@types/dashboard';
import type { EntityLike, EntityLikeMap } from '@/@types/ha';

export interface NordpoolContext {
  getCardSettingsKey: GetCardSettingsKey;
  cardSettings: CardSettingsMap;
  entities: EntityLikeMap;
  customNames?: Record<string, string> | null;
}

export interface NordpoolPricePoint {
  start: string;
  end: string;
  value: unknown;
}

export interface NordpoolPriceStats {
  min: number;
  max: number;
  avg: number;
}

export interface NordpoolData {
  entity: EntityLike;
  settings: CardSettings;
  fullPriceData: NordpoolPricePoint[];
  currentPriceIndex: number;
  priceStats: NordpoolPriceStats;
  name: string;
}

/**
 * Prepare Nordpool price data for the NordpoolModal.
 * Returns { fullPriceData, currentPriceIndex, priceStats, name } or null if entity missing.
 */
export function prepareNordpoolData(
  cardId: string,
  { getCardSettingsKey, cardSettings, entities, customNames }: NordpoolContext
): NordpoolData | null {
  const settingsKey = getCardSettingsKey(cardId);
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const entity = entities[String(settings.nordpoolId)];
  if (!entity) return null;

  const todayRaw = entity.attributes?.today;
  const tomorrowRaw = entity.attributes?.tomorrow;
  const todayPrices: unknown[] = Array.isArray(todayRaw) ? todayRaw : [];
  const tomorrowPrices: unknown[] = Array.isArray(tomorrowRaw) ? tomorrowRaw : [];
  const tomorrowValid = entity.attributes?.tomorrow_valid === true;

  const allPrices = [
    ...todayPrices,
    ...(tomorrowValid && Array.isArray(tomorrowPrices) ? tomorrowPrices : []),
  ];

  const now = new Date();
  const currentHour = now.getHours();
  const currentPriceIndex = currentHour + 47;

  const fullPriceData = allPrices.map((price, idx) => {
    const actualHour = (idx - currentPriceIndex + currentHour) % 24;
    const dayOffset = Math.floor((idx - currentPriceIndex + currentHour) / 24);

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + dayOffset);
    startTime.setHours(actualHour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    return {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      value: price,
    };
  });

  const numericalPrices = allPrices.filter(
    (p): p is number => typeof p === 'number' && !Number.isNaN(p)
  );
  const priceStats =
    numericalPrices.length > 0
      ? {
          min: Math.min(...numericalPrices),
          max: Math.max(...numericalPrices),
          avg: numericalPrices.reduce((a, b) => a + b, 0) / numericalPrices.length,
        }
      : { min: 0, max: 0, avg: 0 };

  const friendlyName = entity.attributes?.friendly_name;
  const name =
    customNames?.[cardId] || (typeof friendlyName === 'string' && friendlyName) || cardId;

  return { entity, settings, fullPriceData, currentPriceIndex, priceStats, name };
}
