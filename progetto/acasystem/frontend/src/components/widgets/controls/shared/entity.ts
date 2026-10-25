import type { HassEntity } from 'home-assistant-js-websocket';
import type { CellSize, WidgetRuntime } from '@/@types/launcher';
import { readKey } from '@/validators/guards';

/** How much a widget shows, from its size in cells. */
export type Density = 'compact' | 'wide' | 'tall' | 'large';

export function densityOf(size: CellSize): Density {
  const wide = size.w >= 2;
  const tall = size.h >= 2;
  if (wide && tall) return 'large';
  if (wide) return 'wide';
  if (tall) return 'tall';
  return 'compact';
}

export const domainOf = (entityId: string | null | undefined): string =>
  entityId?.split('.')[0] ?? '';

export function isUnavailableState(state: string | null | undefined): boolean {
  return !state || state === 'unavailable' || state === 'unknown';
}

export function attr(entity: HassEntity | null | undefined, key: string): unknown {
  return entity?.attributes ? entity.attributes[key] : undefined;
}

export function numberAttr(entity: HassEntity | null | undefined, key: string): number | null {
  const value = attr(entity, key);
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return typeof value !== 'boolean' &&
    value !== null &&
    value !== undefined &&
    Number.isFinite(parsed)
    ? parsed
    : null;
}

export function stringAttr(entity: HassEntity | null | undefined, key: string): string {
  const value = attr(entity, key);
  return typeof value === 'string' ? value : '';
}

export function stringListAttr(entity: HassEntity | null | undefined, key: string): string[] {
  const value = attr(entity, key);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function featuresOf(entity: HassEntity | null | undefined): number {
  const value = Number(attr(entity, 'supported_features') ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export const hasFeature = (features: number, mask: number): boolean => (features & mask) !== 0;

/** Display name: custom name of the card, then friendly_name, then the id without domain. */
export function entityName(
  runtime: Pick<WidgetRuntime, 'customNames'>,
  cardId: string,
  entity: HassEntity | null | undefined,
  fallbackId?: string
): string {
  const custom = runtime.customNames[cardId];
  if (custom) return custom;
  const friendly = stringAttr(entity, 'friendly_name');
  if (friendly) return friendly;
  const id = fallbackId ?? entity?.entity_id ?? cardId;
  return (id.split('.')[1] ?? id).replace(/_/g, ' ');
}

/** Reads a string setting saved in cardSettings. */
export function settingString(settings: unknown, key: string): string {
  const value = readKey(settings, key);
  return typeof value === 'string' ? value.trim() : '';
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
