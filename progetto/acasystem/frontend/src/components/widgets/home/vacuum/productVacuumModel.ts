import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HassEntity } from '@/@types/ha';
import { isProductDeviceBinding } from '@/utils/devices/productBinding';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';

// Home Assistant core 2026.10.4: vacuum/const.py and services.py.
export const PRODUCT_VACUUM_FEATURE = {
  start: 8192,
  pause: 4,
  stop: 8,
  return_to_base: 16,
  set_fan_speed: 32,
  locate: 512,
  clean_spot: 1024,
  clean_area: 16384,
} as const;
export const VACUUM_ACTIONS = [
  { service: 'start', label: 'Avvia pulizia', icon: 'play' },
  { service: 'pause', label: 'Pausa', icon: 'pause' },
  { service: 'stop', label: 'Ferma', icon: 'stop' },
  { service: 'return_to_base', label: 'Torna alla base', icon: 'home' },
  { service: 'locate', label: 'Trova il robot', icon: 'info' },
  { service: 'clean_spot', label: 'Pulizia localizzata', icon: 'vacuum' },
] as const;
export type VacuumAction = (typeof VACUUM_ACTIONS)[number];
const states: Record<string, string> = {
  cleaning: 'Pulizia in corso',
  docked: 'Alla base',
  idle: 'Inattivo',
  paused: 'In pausa',
  returning: 'Ritorno alla base',
  error: 'Richiede attenzione',
};
export function vacuumProductBinding(settings: CardSettings) {
  const binding = settings.productDevice;
  return isProductDeviceBinding(binding) &&
    binding.family === 'vacuum' &&
    settings.bindingEntityId === binding.primaryEntityId
    ? binding
    : null;
}
export function productVacuumView(entity: HassEntity | undefined) {
  const state = entity?.state ?? '',
    attrs = entity?.attributes ?? {};
  const features =
    typeof attrs.supported_features === 'number' &&
    Number.isSafeInteger(attrs.supported_features) &&
    attrs.supported_features >= 0
      ? attrs.supported_features
      : 0;
  const speeds = Array.isArray(attrs.fan_speed_list)
    ? [
        ...new Set(
          attrs.fan_speed_list.filter(
            (value): value is string => typeof value === 'string' && value.trim().length > 0
          )
        ),
      ]
    : [];
  const battery =
    typeof attrs.battery_level === 'number' &&
    Number.isFinite(attrs.battery_level) &&
    attrs.battery_level >= 0 &&
    attrs.battery_level <= 100
      ? attrs.battery_level
      : null;
  return {
    state,
    available: Boolean(entity && Object.hasOwn(states, state)),
    stateLabel: Object.hasOwn(states, state) ? states[state]! : 'Non disponibile',
    speeds,
    fanSpeed:
      typeof attrs.fan_speed === 'string' &&
      !['unknown', 'unavailable', ''].includes(attrs.fan_speed)
        ? attrs.fan_speed
        : null,
    battery,
    has: (flag: number) => (features & flag) === flag,
  };
}
export function vacuumService(services: ServiceCatalog | null, name: string, domain = 'vacuum') {
  return Object.hasOwn(services?.[domain] ?? {}, name);
}
export function vacuumActionSupported(
  view: ReturnType<typeof productVacuumView>,
  services: ServiceCatalog | null,
  service: keyof typeof PRODUCT_VACUUM_FEATURE
) {
  return view.has(PRODUCT_VACUUM_FEATURE[service]) && vacuumService(services, service);
}
export function vacuumLabel(id: string, ids: readonly string[], entities: EntityMap) {
  const label = String(entities[id]?.attributes.friendly_name || id);
  return ids.filter((other) => String(entities[other]?.attributes.friendly_name || other) === label)
    .length > 1
    ? `${label} (${id})`
    : label;
}
export const VACUUM_READINGS = [
  ['batterySensorId', 'Batteria'],
  ['currentRoomSensorId', 'Stanza corrente'],
  ['cleaningTimeSensorId', 'Durata della pulizia'],
  ['cleanedAreaSensorId', 'Area pulita'],
  ['totalCleanTimeSensorId', 'Tempo totale di pulizia'],
  ['totalCleanAreaSensorId', 'Area totale pulita'],
  ['totalCleanCountSensorId', 'Numero totale di pulizie'],
  ['lastCleanStartSensorId', 'Inizio ultima pulizia'],
  ['lastCleanEndSensorId', 'Fine ultima pulizia'],
] as const;

export function vacuumMapUrl(url: string, refresh: number) {
  if (/^(data|blob):/i.test(url)) return url;
  const index = url.indexOf('#'),
    path = index < 0 ? url : url.slice(0, index),
    hash = index < 0 ? '' : url.slice(index);
  return `${path}${path.includes('?') ? '&' : '?'}_aca_refresh=${refresh}${hash}`;
}
