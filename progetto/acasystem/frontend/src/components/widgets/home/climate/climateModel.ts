/**
 * Climate entity read as the legacy GenericClimateCard/GenericClimateModal did, with the same
 * service calls: set_temperature, set_hvac_mode, set_fan_mode, set_swing_mode and the power
 * call of `resolveSensorCardActionCall` (turn_on/turn_off or the hvac mode fallback).
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { ServiceData } from '@/@types/ha';
import { resolveClimateFavoriteModes } from '@/utils/climateFavorites';
import { resolveSensorCardActionCall } from '@/utils/sensorCardConfig';
import {
  attributeList,
  attributeNumber,
  attributeString,
  isUnavailableState,
} from '../shared/entity';
import { humanizeToken } from '../shared/format';
import type { HomeIconName } from '../shared/HomeIcon';

/** Step of the ± buttons and of the slider, as in the legacy card and modal. */
export const CLIMATE_STEP = 0.5;
/** Legacy fallbacks: target 21 for the ± buttons, slider 16–30. */
export const CLIMATE_DEFAULT_TARGET = 21;
export const CLIMATE_DEFAULT_MIN = 16;
export const CLIMATE_DEFAULT_MAX = 30;

const HVAC_MODE_LABELS: Record<string, string> = {
  off: 'Spento',
  heat: 'Caldo',
  cool: 'Freddo',
  heat_cool: 'Caldo e freddo',
  auto: 'Automatico',
  dry: 'Deumidifica',
  fan_only: 'Solo ventola',
};

const HVAC_ACTION_LABELS: Record<string, string> = {
  heating: 'Riscalda',
  cooling: 'Raffresca',
  drying: 'Deumidifica',
  fan: 'Ventila',
  idle: 'In pausa',
  off: 'Spento',
  preheating: 'Preriscalda',
  defrosting: 'Sbrina',
};

/** Fan and swing modes are free strings in HA: known tokens are compared without case. */
const FAN_MODE_LABELS: Record<string, string> = {
  auto: 'Automatica',
  automatic: 'Automatica',
  low: 'Bassa',
  lowmid: 'Medio-bassa',
  mid: 'Media',
  medium: 'Media',
  middle: 'Media',
  highmid: 'Medio-alta',
  high: 'Alta',
  quiet: 'Silenziosa',
  silent: 'Silenziosa',
  turbo: 'Turbo',
  on: 'Accesa',
  off: 'Spenta',
  focus: 'Concentrata',
  diffuse: 'Diffusa',
};

const SWING_MODE_LABELS: Record<string, string> = {
  auto: 'Automatica',
  on: 'Attiva',
  off: 'Ferma',
  swing: 'Oscillazione',
  up: 'Alto',
  upmid: 'Medio-alto',
  mid: 'Centro',
  middle: 'Centro',
  downmid: 'Medio-basso',
  down: 'Basso',
  vertical: 'Verticale',
  horizontal: 'Orizzontale',
  both: 'Entrambe',
};

const PRESET_LABELS: Record<string, string> = {
  none: 'Nessuno',
  eco: 'Eco',
  away: 'Fuori casa',
  boost: 'Massima potenza',
  comfort: 'Comfort',
  home: 'In casa',
  sleep: 'Notte',
  activity: 'Attività',
};

const token = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const lookup = (labels: Record<string, string>, value: string, normalise = false) =>
  labels[normalise ? token(value) : value] ?? humanizeToken(value);

export const hvacModeLabel = (mode: string) => lookup(HVAC_MODE_LABELS, mode);
export const hvacActionLabel = (action: string) => lookup(HVAC_ACTION_LABELS, action);
export const fanModeLabel = (mode: string) => lookup(FAN_MODE_LABELS, mode, true);
export const swingModeLabel = (mode: string) => lookup(SWING_MODE_LABELS, mode, true);
export const presetLabel = (preset: string) => lookup(PRESET_LABELS, preset, true);

export function hvacModeIcon(mode: string): HomeIconName {
  if (mode === 'off') return 'power';
  if (mode === 'heat') return 'sun';
  if (mode === 'cool') return 'cool';
  if (mode === 'dry') return 'humidity';
  if (mode === 'fan_only') return 'fan';
  return 'thermostat';
}

export function hvacActionIcon(action: string): HomeIconName {
  if (action === 'heating' || action === 'preheating') return 'sun';
  if (action === 'cooling') return 'cool';
  if (action === 'drying') return 'humidity';
  if (action === 'fan') return 'fan';
  return 'thermostat';
}

export interface ClimateView {
  entityId: string;
  entity: HassEntity;
  unavailable: boolean;
  /** Legacy: on unless the state is off (or unavailable). */
  isOn: boolean;
  mode: string;
  /** hvac_action, `idle` when missing, `off` when the device is off. */
  action: string;
  current: number | null;
  target: number | null;
  min: number;
  max: number;
  unit: string;
  hvacModes: string[];
  fanModes: string[];
  swingModes: string[];
  presetModes: string[];
  fanMode: string | undefined;
  swingMode: string | undefined;
  presetMode: string | undefined;
}

/**
 * `systemUnit` is the temperature unit of the HA unit system (runtime.haConfig): HA reports
 * climate temperatures in it and does not put a unit on climate entities (some integrations do).
 */
export function readClimate(entityId: string, entity: HassEntity, systemUnit: string): ClimateView {
  const unavailable = isUnavailableState(entity.state);
  const isOn = !unavailable && entity.state !== 'off';
  return {
    entityId,
    entity,
    unavailable,
    isOn,
    mode: entity.state,
    action: isOn ? (attributeString(entity, 'hvac_action') ?? 'idle') : 'off',
    current: attributeNumber(entity, 'current_temperature'),
    target: attributeNumber(entity, 'temperature'),
    min: attributeNumber(entity, 'min_temp') ?? CLIMATE_DEFAULT_MIN,
    max: attributeNumber(entity, 'max_temp') ?? CLIMATE_DEFAULT_MAX,
    unit: attributeString(entity, 'temperature_unit') ?? systemUnit,
    hvacModes: attributeList(entity, 'hvac_modes'),
    fanModes: attributeList(entity, 'fan_modes'),
    swingModes: attributeList(entity, 'swing_modes'),
    presetModes: attributeList(entity, 'preset_modes'),
    fanMode: attributeString(entity, 'fan_mode'),
    swingMode: attributeString(entity, 'swing_mode'),
    presetMode: attributeString(entity, 'preset_mode'),
  };
}

/** Up to two shortcut modes from the card settings (legacy `climateFavoriteModes`). */
export const favoriteModes = (view: ClimateView, configured: unknown): string[] =>
  resolveClimateFavoriteModes(configured, view.hvacModes);

/** Limits reported by the entity; without them the value is not clamped (legacy card). */
export function clampTarget(view: ClimateView, value: number): number {
  const min = attributeNumber(view.entity, 'min_temp');
  const max = attributeNumber(view.entity, 'max_temp');
  let next = value;
  if (max !== null) next = Math.min(max, next);
  if (min !== null) next = Math.max(min, next);
  return next;
}

/** Next target of the ± buttons: from the shown value, legacy fallback 21. */
export const stepTarget = (view: ClimateView, from: number | null, delta: number): number =>
  clampTarget(view, (from ?? CLIMATE_DEFAULT_TARGET) + delta);

/** The ± button would not change the value (limit reached). */
export const atLimit = (view: ClimateView, from: number | null, delta: number): boolean =>
  from !== null && stepTarget(view, from, delta) === from;

export interface ClimateCall {
  domain: string;
  service: string;
  data: ServiceData;
}

export const setTemperatureCall = (entityId: string, temperature: number): ClimateCall => ({
  domain: 'climate',
  service: 'set_temperature',
  data: { entity_id: entityId, temperature },
});

export const setHvacModeCall = (entityId: string, mode: string): ClimateCall => ({
  domain: 'climate',
  service: 'set_hvac_mode',
  data: { entity_id: entityId, hvac_mode: mode },
});

export const setFanModeCall = (entityId: string, mode: string): ClimateCall => ({
  domain: 'climate',
  service: 'set_fan_mode',
  data: { entity_id: entityId, fan_mode: mode },
});

export const setSwingModeCall = (entityId: string, mode: string): ClimateCall => ({
  domain: 'climate',
  service: 'set_swing_mode',
  data: { entity_id: entityId, swing_mode: mode },
});

/** HA preset (eco, comfort, away…): not in the legacy UI, shown only when the entity has presets. */
export const setPresetCall = (entityId: string, preset: string): ClimateCall => ({
  domain: 'climate',
  service: 'set_preset_mode',
  data: { entity_id: entityId, preset_mode: preset },
});

/**
 * Power call of the legacy card (usePowerToggle + resolveSensorCardActionCall):
 * climate.turn_on/turn_off when supported, otherwise set_hvac_mode (auto, heat_cool or the
 * first mode to switch on, off to switch off); plain turn_on/turn_off when nothing resolves.
 */
export function powerCall(view: ClimateView, turnOn: boolean): ClimateCall {
  const fallback: ClimateCall = {
    domain: 'climate',
    service: turnOn ? 'turn_on' : 'turn_off',
    data: { entity_id: view.entityId },
  };
  try {
    const call = resolveSensorCardActionCall(
      { type: turnOn ? 'turn_on' : 'turn_off', entityId: view.entityId },
      view.entity
    );
    return call ? { domain: call.domain, service: call.service, data: { ...call.data } } : fallback;
  } catch {
    return fallback;
  }
}
