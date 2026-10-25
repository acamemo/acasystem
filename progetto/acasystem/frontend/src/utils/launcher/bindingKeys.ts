/**
 * Which card setting holds the device (entity) a widget type is linked to. Kept apart from the
 * sheets so the widget memory (ADR-0019) can read it without loading the widget registry.
 */
import type { CardSettings } from '@/@types/dashboard';

export const BINDING_KEYS: Record<string, string> = {
  light: 'bindingEntityId',
  fan: 'bindingEntityId',
  vacuum: 'bindingEntityId',
  mower: 'bindingEntityId',
  sensor: 'entityId',
  lock: 'lockId',
  camera: 'cameraId',
  climate: 'climateId',
  cover: 'coverId',
  alarm: 'alarmId',
  androidtv: 'mediaPlayerId',
  appletv: 'mediaPlayerId',
  media: 'mediaIds',
  sonos: 'mediaIds',
  weather: 'weatherId',
  calendar: 'calendars',
  todo: 'todoEntityId',
  cost: 'todayId',
  nordpool: 'nordpoolId',
  room: 'areaId',
  car: 'batteryId',
};

export function categoryEntityId(type: string, settings: CardSettings): string | undefined {
  const key = BINDING_KEYS[type];
  if (key) {
    const val = settings[key];
    if (Array.isArray(val)) {
      if (typeof val[0] === 'string' && val[0]) return val[0];
    } else if (typeof val === 'string' && val) {
      return val;
    }
  }
  if (typeof settings.bindingEntityId === 'string' && settings.bindingEntityId) {
    return settings.bindingEntityId;
  }
  return undefined;
}
