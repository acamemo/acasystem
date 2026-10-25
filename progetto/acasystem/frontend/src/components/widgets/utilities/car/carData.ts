/**
 * Car card: entity mappings and readings, from the legacy CarCard, LeafModal and
 * `resolveCarSettings` (rendering/ModalOrchestrator.jsx). Same setting keys; the suggested
 * mappings of `@/utils/carEntityMatcher` are applied by the settings sheet, not here.
 */
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HaConfig } from '@/@types/ha';
import {
  entityOf,
  isUnavailableState,
  numberAttr,
  numericState,
  safeState,
  stringAttr,
  type MaybeEntity,
} from '../shared/entity';
import { lengthReading } from '../shared/units';

const ENTITY_KEYS = [
  'batteryId',
  'rangeId',
  'odometerId',
  'fuelLevelId',
  'locationId',
  'latitudeId',
  'longitudeId',
  'pluggedId',
  'chargingPowerId',
  'chargeRateId',
  'timeToFullId',
  'chargeEndTimeId',
  'chargeLimitNumberId',
  'chargeLimitSelectId',
  'climateId',
  'lockId',
  'ignitionSwitchId',
  'engineStatusId',
  'lastUpdatedId',
  'apiStatusId',
  'updateButtonId',
  'tempId',
  'chargeControlId',
] as const;

export type CarEntityKey = (typeof ENTITY_KEYS)[number] | 'chargingStateId' | 'chargingId';

export interface CarSettings {
  ids: Partial<Record<CarEntityKey, string>>;
  chargeControlIds: string[];
  imageUrl: string | null;
}

const asId = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

/** Legacy resolveCarSettings: `chargingStateId` falls back to the older `chargingId`. */
export function readCarSettings(settings: CardSettings): CarSettings {
  const ids: Partial<Record<CarEntityKey, string>> = {};
  for (const key of ENTITY_KEYS) {
    const id = asId(settings[key]);
    if (id) ids[key] = id;
  }
  const chargingState = asId(settings.chargingStateId) ?? asId(settings.chargingId);
  if (chargingState) {
    ids.chargingStateId = chargingState;
    ids.chargingId = asId(settings.chargingId) ?? chargingState;
  }
  const controls = Array.isArray(settings.chargeControlIds)
    ? settings.chargeControlIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      )
    : [];
  const single = ids.chargeControlId;
  return {
    ids,
    chargeControlIds: [...new Set(single ? [...controls, single] : controls)],
    imageUrl: asId(settings.imageUrl) ?? null,
  };
}

export interface CarReadings {
  battery: number | null;
  range: number | null;
  rangeUnit: string;
  location: MaybeEntity;
  isCharging: boolean;
  isPlugged: boolean;
  /** Climate on (legacy «heating»): any state but off/unavailable/unknown. */
  isClimateOn: boolean;
}

/**
 * Units follow Home Assistant (ADR-0007): the range is converted from its sensor unit (km
 * when it has none) to the length unit of `haConfig`; until that is loaded it is shown as read.
 */
export function readCar(
  entities: EntityMap,
  car: CarSettings,
  haConfig: HaConfig | null
): CarReadings {
  const { ids } = car;
  const rangeEntity = entityOf(entities, ids.rangeId);
  const range = lengthReading(
    numericState(rangeEntity),
    stringAttr(rangeEntity, 'unit_of_measurement'),
    haConfig
  );
  const charging = safeState(entityOf(entities, ids.chargingStateId));
  const plugged = safeState(entityOf(entities, ids.pluggedId));
  const climate = entityOf(entities, ids.climateId);
  return {
    battery: numericState(entityOf(entities, ids.batteryId)),
    range: range.value,
    rangeUnit: range.unit,
    location: entityOf(entities, ids.locationId),
    isCharging: charging === 'on' || charging === 'charging',
    isPlugged: plugged === 'on' || plugged === 'plugged' || plugged === 'true',
    isClimateOn:
      Boolean(climate) && !isUnavailableState(climate?.state) && climate?.state !== 'off',
  };
}

/** Position for the map: the tracker's coordinates, else the latitude/longitude sensors. */
export function carPosition(
  entities: EntityMap,
  car: CarSettings
): { lat: number; lon: number } | null {
  const tracker = entityOf(entities, car.ids.locationId);
  const lat =
    numberAttr(tracker, 'latitude') ?? numericState(entityOf(entities, car.ids.latitudeId));
  const lon =
    numberAttr(tracker, 'longitude') ?? numericState(entityOf(entities, car.ids.longitudeId));
  if (lat === null || lon === null) return null;
  return { lat, lon };
}

/** Service of a charge control by domain (legacy handleChargeControl). */
export function chargeControlCall(
  entityId: string,
  state: string | undefined
): { domain: string; service: string } | null {
  const domain = entityId.split('.')[0];
  if (domain === 'switch') return { domain, service: state === 'on' ? 'turn_off' : 'turn_on' };
  if (domain === 'button' || domain === 'input_button') return { domain, service: 'press' };
  if (domain === 'script') return { domain, service: 'turn_on' };
  return null;
}

/** Legacy formatValue: at most one decimal. */
export function oneDecimal(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}
