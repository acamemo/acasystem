/** Rooms page (legacy RoomExplorerPage): areas, their entities, statistics, sorting and domains. */
import type { EntityMap, HaAreaEntry, HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import { stringAttr } from '../shared/entity';

export type RoomSort = 'name-az' | 'name-za' | 'entity-count' | 'active-count';

export const ROOM_SORTS: Array<{ value: RoomSort; label: string }> = [
  { value: 'name-az', label: 'Nome A–Z' },
  { value: 'name-za', label: 'Nome Z–A' },
  { value: 'entity-count', label: 'Più dispositivi' },
  { value: 'active-count', label: 'Più attive' },
];

export function isRoomSort(value: unknown): value is RoomSort {
  return ROOM_SORTS.some((option) => option.value === value);
}

/** Domain display order of the legacy explorer. */
const DOMAIN_ORDER = [
  'light',
  'climate',
  'media_player',
  'cover',
  'fan',
  'lock',
  'switch',
  'vacuum',
  'automation',
  'scene',
  'script',
  'sensor',
  'binary_sensor',
  'camera',
  'person',
];

export function domainPriority(domain: string): number {
  const index = DOMAIN_ORDER.indexOf(domain);
  return index === -1 ? 999 : index;
}

/**
 * Entities of every area: directly assigned or through their device, without disabled or
 * hidden ones (same rule as `getEntitiesForArea`, with the two registries read once).
 */
export function entitiesByArea(
  areas: HaAreaEntry[],
  entityRegistry: HaEntityRegistryEntry[],
  deviceRegistry: HaDeviceRegistryEntry[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const area of areas) {
    const devices = new Set(deviceRegistry.filter((device) => device.area_id === area.area_id).map((device) => device.id));
    result[area.area_id] = entityRegistry
      .filter((entry) => entry.area_id === area.area_id || (typeof entry.device_id === 'string' && devices.has(entry.device_id)))
      .filter((entry) => !entry.disabled_by && !entry.hidden_by)
      .map((entry) => entry.entity_id);
  }
  return result;
}

export interface AreaStats {
  lightsOn: number;
  lightsTotal: number;
  activeCount: number;
  totalCount: number;
  temperature: number | null;
  /** Unit of the temperature sensor, for the conversion to the unit of Home Assistant. */
  temperatureUnit: string | null;
  humidity: number | null;
  unavailableCount: number;
}

export const EMPTY_STATS: AreaStats = {
  lightsOn: 0,
  lightsTotal: 0,
  activeCount: 0,
  totalCount: 0,
  temperature: null,
  temperatureUnit: null,
  humidity: null,
  unavailableCount: 0,
};

export function areaStats(ids: string[], entities: EntityMap): AreaStats {
  const stats: AreaStats = { ...EMPTY_STATS, totalCount: ids.length };
  for (const id of ids) {
    const entity = entities[id];
    if (!entity) continue;
    const domain = id.split('.')[0];
    if (entity.state === 'unavailable' || entity.state === 'unknown') {
      stats.unavailableCount += 1;
      continue;
    }
    if (domain === 'light') {
      stats.lightsTotal += 1;
      if (entity.state === 'on') stats.lightsOn += 1;
    }
    if (['on', 'playing', 'cleaning', 'open'].includes(entity.state)) stats.activeCount += 1;
    const deviceClass = stringAttr(entity, 'device_class');
    if (domain === 'sensor' && deviceClass === 'temperature' && stats.temperature === null) {
      const value = Number.parseFloat(entity.state);
      if (!Number.isNaN(value)) {
        stats.temperature = Math.round(value * 10) / 10;
        stats.temperatureUnit = stringAttr(entity, 'unit_of_measurement');
      }
    }
    if (domain === 'sensor' && deviceClass === 'humidity' && stats.humidity === null) {
      const value = Number.parseFloat(entity.state);
      if (!Number.isNaN(value)) stats.humidity = Math.round(value);
    }
  }
  return stats;
}

export function sortAreas(areas: HaAreaEntry[], sort: RoomSort, stats: Record<string, AreaStats>): HaAreaEntry[] {
  const sorted = [...areas];
  const name = (area: HaAreaEntry) => area.name ?? '';
  switch (sort) {
    case 'name-za':
      return sorted.sort((a, b) => name(b).localeCompare(name(a), 'it'));
    case 'entity-count':
      return sorted.sort((a, b) => (stats[b.area_id]?.totalCount ?? 0) - (stats[a.area_id]?.totalCount ?? 0));
    case 'active-count':
      return sorted.sort((a, b) => (stats[b.area_id]?.activeCount ?? 0) - (stats[a.area_id]?.activeCount ?? 0));
    default:
      return sorted.sort((a, b) => name(a).localeCompare(name(b), 'it'));
  }
}
