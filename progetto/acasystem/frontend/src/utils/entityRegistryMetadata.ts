import { isObject, readKey, type UnknownRecord } from '@/validators/guards';

const hasText = (value: unknown): boolean =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim().length > 0 : false;

const getPreferredDeviceName = (device: UnknownRecord | null | undefined): unknown =>
  device?.name_by_user || device?.name || null;

export type RegistryLookupMap = Map<string, UnknownRecord>;

export const buildRegistryLookupMap = (entries: unknown, key: string): RegistryLookupMap => {
  const map: RegistryLookupMap = new Map();
  if (!Array.isArray(entries) || !key) return map;

  entries.forEach((entry: unknown) => {
    if (!isObject(entry)) return;
    const value = entry[key];
    if (hasText(value)) {
      map.set(String(value), entry);
    }
  });

  return map;
};

const lookup = (map: ReadonlyMap<string, UnknownRecord>, key: unknown) =>
  typeof key === 'string' ? map.get(key) : undefined;

export const enrichEntitiesWithRegistryMetadata = <T>(
  entities: Record<string, T> | null | undefined,
  entityRegistryById: ReadonlyMap<string, UnknownRecord> = new Map(),
  deviceRegistryById: ReadonlyMap<string, UnknownRecord> = new Map()
): Record<string, T> => {
  if (!entities || typeof entities !== 'object') return {};

  let changed = false;
  const nextEntities: Record<string, T> = {};

  Object.entries(entities).forEach(([entityId, entity]) => {
    if (!isObject(entity)) {
      nextEntities[entityId] = entity;
      return;
    }

    const rawAttributes = entity.attributes || {};
    const attributes: UnknownRecord = isObject(rawAttributes) ? rawAttributes : {};
    const entityRegistryEntry = entityRegistryById.get(entityId);
    const deviceId = entityRegistryEntry?.device_id;
    const deviceRegistryEntry = deviceId ? lookup(deviceRegistryById, deviceId) : null;

    const metadata: UnknownRecord = {};
    const assignIfMissing = (key: string, value: unknown) => {
      if (!hasText(value)) return;
      if (hasText(attributes[key])) return;
      metadata[key] = value;
    };

    assignIfMissing('platform', entityRegistryEntry?.platform);
    assignIfMissing('integration', entityRegistryEntry?.platform);
    assignIfMissing('manufacturer', readKey(deviceRegistryEntry, 'manufacturer'));
    assignIfMissing('device_manufacturer', readKey(deviceRegistryEntry, 'manufacturer'));
    assignIfMissing('model', readKey(deviceRegistryEntry, 'model'));
    assignIfMissing('device_model', readKey(deviceRegistryEntry, 'model'));
    assignIfMissing('device_name', getPreferredDeviceName(deviceRegistryEntry));
    assignIfMissing(
      'area_id',
      entityRegistryEntry?.area_id || readKey(deviceRegistryEntry, 'area_id')
    );

    if (Object.keys(metadata).length === 0) {
      nextEntities[entityId] = entity;
      return;
    }

    changed = true;
    nextEntities[entityId] = {
      ...entity,
      attributes: {
        ...attributes,
        ...metadata,
      },
    };
  });

  return changed ? nextEntities : entities;
};
