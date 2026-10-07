/** Typed readers of Home Assistant entities for the utility widgets (no `any` leaks). */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import { parseNumber, sentenceCase } from './format';

export type MaybeEntity = HassEntity | null | undefined;

/** Unknown or unavailable states, or no state at all. */
export function isUnavailableState(state: unknown): boolean {
  return state === undefined || state === null || state === '' || state === 'unavailable' || state === 'unknown';
}

export function attr(entity: MaybeEntity, key: string): unknown {
  const attributes: Record<string, unknown> | undefined = entity?.attributes;
  return attributes ? attributes[key] : undefined;
}

export function stringAttr(entity: MaybeEntity, key: string): string | null {
  const value = attr(entity, key);
  return typeof value === 'string' && value.trim() ? value : null;
}

export function numberAttr(entity: MaybeEntity, key: string): number | null {
  return parseNumber(attr(entity, key));
}

export function listAttr(entity: MaybeEntity, key: string): string[] {
  const value = attr(entity, key);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Numeric state, or null when unavailable or not a number. */
export function numericState(entity: MaybeEntity): number | null {
  if (!entity || isUnavailableState(entity.state)) return null;
  return parseNumber(entity.state);
}

/** Usable state string, or null when unavailable. */
export function safeState(entity: MaybeEntity): string | null {
  if (!entity || isUnavailableState(entity.state)) return null;
  return entity.state;
}

export function friendlyName(entity: MaybeEntity, fallback: string): string {
  return stringAttr(entity, 'friendly_name') ?? fallback;
}

/** Legacy `getS`: «A casa» / «Fuori casa» for trackers, otherwise the state in sentence case. */
export function readableState(entity: MaybeEntity, fallback = '--'): string {
  const state = safeState(entity);
  if (state === null) return fallback;
  if (state === 'home') return 'A casa';
  if (state === 'not_home') return 'Fuori casa';
  return sentenceCase(state);
}

/** String setting, or null when missing or blank. */
export function settingString(settings: CardSettings, key: string): string | null {
  const value = settings[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export function settingNumber(settings: CardSettings, key: string): number | null {
  return parseNumber(settings[key]);
}

/** Legacy flags default to true: only an explicit `false` hides the element. */
export function settingFlag(settings: CardSettings, key: string): boolean {
  return settings[key] !== false;
}

export function entityOf(entities: EntityMap, id: string | null | undefined): HassEntity | undefined {
  return id ? entities[id] : undefined;
}

export function domainOf(entityId: string): string {
  return entityId.split('.')[0] ?? '';
}
