import type { CardSettings } from '@/@types/dashboard';
import type { HaAreaEntry, HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import { getEffectiveRoomEntityIds } from '@/utils/roomEntities';

export interface RoomRegistry {
  areas: HaAreaEntry[];
  entities: HaEntityRegistryEntry[];
  devices: HaDeviceRegistryEntry[];
}
export const ROOM_ROLES = [
  'mainLightEntityId',
  'tempEntityId',
  'humidityEntityId',
  'motionEntityId',
  'doorEntityId',
  'climateEntityId',
  'vacuumEntityId',
] as const;
const list = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string' && !!id.trim())
    : [];
export function roomAreaIds(areaId: string, registry: RoomRegistry): string[] {
  if (!registry.areas.some((area) => area.area_id === areaId)) return [];
  const devices = new Map(registry.devices.map((device) => [device.id, device.area_id]));
  return [
    ...new Set(
      registry.entities
        .filter((entry) => {
          if (entry.disabled_by || entry.hidden_by) return false;
          const direct = typeof entry.area_id === 'string' && entry.area_id ? entry.area_id : null;
          return (
            (direct ??
              (typeof entry.device_id === 'string' ? devices.get(entry.device_id) : null)) ===
            areaId
          );
        })
        .map((entry) => entry.entity_id)
    ),
  ];
}
/** Saved entityIds stay explicit until an area association records its provenance. */
export function roomMembershipIds(settings: CardSettings, registry: RoomRegistry | null): string[] {
  const areaId = typeof settings.areaId === 'string' && settings.areaId ? settings.areaId : null;
  const excluded = new Set(list(settings.excludedEntityIds));
  const roles = ROOM_ROLES.flatMap((key) => {
    const value = settings[key];
    return typeof value === 'string' && value ? [value] : [];
  });
  if (!areaId || settings.roomMembershipSource !== 'area')
    return [...new Set([...getEffectiveRoomEntityIds(settings), ...roles])].filter(
      (id) => !excluded.has(id)
    );
  if (!registry || !registry.areas.some((area) => area.area_id === areaId)) return [];
  const explicit = [...list(settings.includedEntityIds), ...roles];
  const entries = new Map(registry.entities.map((entry) => [entry.entity_id, entry]));
  return [...new Set([...roomAreaIds(areaId, registry), ...explicit])].filter((id) => {
    const entry = entries.get(id);
    return !excluded.has(id) && !entry?.disabled_by && !entry?.hidden_by;
  });
}
export function roomTechnicalIds(ids: readonly string[], registry: RoomRegistry | null): string[] {
  const technical = new Set(
    registry?.entities
      .filter(
        (entry) => entry.entity_category === 'diagnostic' || entry.entity_category === 'config'
      )
      .map((entry) => entry.entity_id)
  );
  return ids.filter((id) => technical.has(id));
}
