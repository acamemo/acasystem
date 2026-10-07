/** Guarded readers of HA entities and card settings for the comfort widgets. */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import { asStringList, isNonEmptyString } from '@/validators/guards';
import { toFiniteNumber } from './format';

export const isUnavailableState = (state: string | undefined): boolean =>
  !state || state === 'unavailable' || state === 'unknown';

export function readAttribute(entity: HassEntity | undefined, key: string): unknown {
  return entity?.attributes?.[key];
}

export function attributeString(entity: HassEntity | undefined, key: string): string | undefined {
  const value = readAttribute(entity, key);
  return isNonEmptyString(value) ? value : undefined;
}

export function attributeNumber(entity: HassEntity | undefined, key: string): number | null {
  return toFiniteNumber(readAttribute(entity, key));
}

export function attributeList(entity: HassEntity | undefined, key: string): string[] {
  return asStringList(readAttribute(entity, key)).filter(isNonEmptyString);
}

/** Entity configured in a card setting (e.g. `climateId`), when present in HA. */
export function settingEntity(
  entities: EntityMap,
  settings: CardSettings,
  key: string
): { entityId: string | undefined; entity: HassEntity | undefined } {
  const raw = settings[key];
  const entityId = isNonEmptyString(raw) ? raw : undefined;
  return { entityId, entity: entityId ? entities[entityId] : undefined };
}

/** Custom name of the card, then the friendly name, then the entity id (legacy order). */
export function displayName(
  customNames: Record<string, string>,
  widgetId: string,
  entity: HassEntity | undefined,
  fallback: string
): string {
  const custom = customNames[widgetId];
  if (isNonEmptyString(custom)) return custom;
  return attributeString(entity, 'friendly_name') ?? fallback;
}

export function settingString(settings: CardSettings, key: string): string | undefined {
  const value = settings[key];
  return isNonEmptyString(value) ? value : undefined;
}
