/** Battery page: detection, status, filters and sorting of the legacy BatteryPage. */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityMap } from '@/@types/ha';
import { stringAttr } from '../shared/entity';

export const LOW_BATTERY_THRESHOLD = 20;

export type BatteryStatus = 'low' | 'ok' | 'unavailable';
export type BatteryFilter = 'all' | BatteryStatus;
export type BatterySort = 'level' | 'name-az' | 'name-za' | 'area' | 'unavailable';

export const BATTERY_SORTS: Array<{ value: BatterySort; label: string }> = [
  { value: 'level', label: 'Livello' },
  { value: 'name-az', label: 'Nome A–Z' },
  { value: 'name-za', label: 'Nome Z–A' },
  { value: 'area', label: 'Stanza' },
  { value: 'unavailable', label: 'Non disponibili prima' },
];

export const BATTERY_FILTERS: Array<{ value: BatteryFilter; label: string }> = [
  { value: 'all', label: 'Tutte' },
  { value: 'low', label: 'Scariche' },
  { value: 'ok', label: 'Cariche' },
  { value: 'unavailable', label: 'Non disponibili' },
];

export function isBatterySort(value: unknown): value is BatterySort {
  return BATTERY_SORTS.some((option) => option.value === value);
}

export function isBatteryFilter(value: unknown): value is BatteryFilter {
  return BATTERY_FILTERS.some((option) => option.value === value);
}

/** Level 0–100, or null when the state is not a number. */
export function batteryLevel(entity: HassEntity): number | null {
  const value = Number.parseFloat(entity.state);
  if (Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function batteryStatus(entity: HassEntity): BatteryStatus {
  if (entity.state === 'unavailable' || entity.state === 'unknown') return 'unavailable';
  const level = batteryLevel(entity);
  if (level === null) return 'unavailable';
  return level <= LOW_BATTERY_THRESHOLD ? 'low' : 'ok';
}

export function isCharging(entity: HassEntity): boolean {
  const attributes: Record<string, unknown> = entity.attributes;
  return (
    attributes.is_charging === true ||
    (attributes.charging !== undefined && Boolean(attributes.charging)) ||
    entity.entity_id.includes('charging')
  );
}

/** Every entity with `device_class: battery` (sensors and binary sensors). */
export function batteryEntities(entities: EntityMap): HassEntity[] {
  return Object.values(entities).filter((entity) => stringAttr(entity, 'device_class') === 'battery');
}

export const batteryName = (entity: HassEntity) =>
  stringAttr(entity, 'friendly_name') ?? entity.entity_id.split('.')[1] ?? entity.entity_id;

/** Area of a battery: `area_id` resolved with the area registry, else `area_name`. */
export function batteryArea(entity: HassEntity, areas: Map<string, string>): string | null {
  const areaId = stringAttr(entity, 'area_id');
  if (areaId && areas.has(areaId)) return areas.get(areaId) ?? null;
  return stringAttr(entity, 'area_name');
}

const compareNames = (a: HassEntity, b: HassEntity) => batteryName(a).localeCompare(batteryName(b), 'it');

/** Filter, search and sort with the legacy rules (lowest level first by default). */
export function arrangeBatteries(
  list: HassEntity[],
  { filter, search, sort, areaOf }: { filter: BatteryFilter; search: string; sort: BatterySort; areaOf: (entity: HassEntity) => string | null }
): HassEntity[] {
  let result = filter === 'all' ? list : list.filter((entity) => batteryStatus(entity) === filter);
  const term = search.trim().toLowerCase();
  if (term) {
    result = result.filter(
      (entity) =>
        batteryName(entity).toLowerCase().includes(term) ||
        (areaOf(entity) ?? '').toLowerCase().includes(term) ||
        entity.entity_id.toLowerCase().includes(term)
    );
  }
  const sorted = [...result];
  const level = (entity: HassEntity) => batteryLevel(entity) ?? -1;
  switch (sort) {
    case 'name-az':
      sorted.sort(compareNames);
      break;
    case 'name-za':
      sorted.sort((a, b) => compareNames(b, a));
      break;
    case 'area':
      sorted.sort((a, b) => {
        const areaA = areaOf(a) ?? '￿';
        const areaB = areaOf(b) ?? '￿';
        if (areaA !== areaB) return areaA.localeCompare(areaB, 'it');
        return level(a) - level(b);
      });
      break;
    case 'unavailable':
      sorted.sort((a, b) => {
        const rank = (entity: HassEntity) => (batteryStatus(entity) === 'unavailable' ? 0 : 1);
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        return compareNames(a, b);
      });
      break;
    default:
      sorted.sort((a, b) => (level(a) !== level(b) ? level(a) - level(b) : compareNames(a, b)));
  }
  return sorted;
}
