/**
 * Validatori delle entità Home Assistant e dei dati di sessione (utente, configurazione).
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityMap, HaConfig, HaUser } from '@/@types/ha';
import { isObject, isRecord, readKey } from './guards';

/** Entità completa come pubblicata da `subscribeEntities`. */
export function isHassEntity(value: unknown): value is HassEntity {
  if (!isRecord(value)) return false;
  const { context } = value;
  return (
    typeof value.entity_id === 'string' &&
    typeof value.state === 'string' &&
    typeof value.last_changed === 'string' &&
    typeof value.last_updated === 'string' &&
    isRecord(value.attributes) &&
    isRecord(context) &&
    typeof context.id === 'string' &&
    (context.user_id === null || typeof context.user_id === 'string') &&
    (context.parent_id === null || typeof context.parent_id === 'string')
  );
}

/** Mappa entità da una fonte non controllata (per esempio la cache di sessione). */
export function sanitizeEntityMap(value: unknown): EntityMap {
  if (!isObject(value)) return {};
  const result: EntityMap = {};
  Object.entries(value).forEach(([entityId, entity]) => {
    if (isHassEntity(entity)) result[entityId] = entity;
  });
  return result;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const optionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

/** Utente autenticato (`auth/current_user`). */
export function toHaUser(user: unknown): HaUser {
  return {
    id: optionalString(readKey(user, 'id')),
    name: optionalString(readKey(user, 'name')),
    is_owner: optionalBoolean(readKey(user, 'is_owner')),
    is_admin: optionalBoolean(readKey(user, 'is_admin')),
  };
}

const CONFIG_STRING_FIELDS = [
  'temperature_unit',
  'length_unit',
  'currency',
  'language',
  'time_zone',
  'location_name',
] as const;

/**
 * Configurazione di HA (`get_config`): i campi noti con un tipo inatteso
 * vengono scartati, gli altri restano invariati.
 */
export function toHaConfig(conf: unknown): HaConfig | null {
  if (!isRecord(conf)) return null;
  const result: HaConfig = { ...conf };

  CONFIG_STRING_FIELDS.forEach((field) => {
    if (result[field] !== undefined && typeof result[field] !== 'string') delete result[field];
  });
  if (
    result.country !== undefined &&
    result.country !== null &&
    typeof result.country !== 'string'
  ) {
    delete result.country;
  }

  const unitSystem = conf.unit_system;
  if (unitSystem !== undefined) {
    if (isRecord(unitSystem)) {
      const units: Record<string, string> = {};
      Object.entries(unitSystem).forEach(([key, unit]) => {
        if (typeof unit === 'string') units[key] = unit;
      });
      result.unit_system = units;
    } else {
      delete result.unit_system;
    }
  }

  return result;
}
