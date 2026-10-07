import type { HassEntity } from 'home-assistant-js-websocket';
import { clamp, featuresOf, numberAttr, stringListAttr } from '../shared/entity';

/** HA brightness runs 0–255 (legacy service data); the UI shows percent. */
export const toPercent = (brightness: number): number => Math.round((brightness / 255) * 100);
export const toBrightness = (percent: number): number =>
  Math.round((clamp(percent, 0, 100) * 255) / 100);

/** Brightness step of the +/− buttons and of the arrow keys, in percent. */
export const BRIGHTNESS_STEP = 10;

/** Same rule as the legacy LightCard/LightModal. */
export function isDimmable(entity: HassEntity | null | undefined): boolean {
  const modes = entity?.attributes?.supported_color_modes;
  if (Array.isArray(modes)) return !modes.includes('onoff') || modes.length > 1;
  return (featuresOf(entity) & 1) === 1;
}

export function supportsColorTemp(entity: HassEntity | null | undefined): boolean {
  const modes = stringListAttr(entity, 'supported_color_modes');
  return modes.includes('color_temp') || modes.includes('color_temp_kelvin');
}

export function supportsColor(entity: HassEntity | null | undefined): boolean {
  return stringListAttr(entity, 'supported_color_modes').some((mode) =>
    ['hs', 'rgb', 'xy'].includes(mode)
  );
}

/** Kelvin range with the legacy fallbacks (mireds, then 2000–6500 K). */
export function kelvinRange(entity: HassEntity | null | undefined): { min: number; max: number } {
  const maxMireds = numberAttr(entity, 'max_mireds');
  const minMireds = numberAttr(entity, 'min_mireds');
  const min =
    numberAttr(entity, 'min_color_temp_kelvin') ??
    (maxMireds ? Math.round(1_000_000 / maxMireds) : 2000);
  const max =
    numberAttr(entity, 'max_color_temp_kelvin') ??
    (minMireds ? Math.round(1_000_000 / minMireds) : 6500);
  return { min, max: max > min ? max : min + 1 };
}

export function currentKelvin(entity: HassEntity | null | undefined): number {
  const kelvin = numberAttr(entity, 'color_temp_kelvin');
  if (kelvin) return kelvin;
  const mireds = numberAttr(entity, 'color_temp');
  if (mireds) return Math.round(1_000_000 / mireds);
  const { min, max } = kelvinRange(entity);
  return Math.round((min + max) / 2);
}

export function currentHue(entity: HassEntity | null | undefined): number {
  const hs = entity?.attributes?.hs_color;
  return Array.isArray(hs) && typeof hs[0] === 'number' ? Math.round(hs[0]) : 0;
}

/** Ids of the members of a light group (attribute `entity_id`). */
export const groupMembers = (entity: HassEntity | null | undefined): string[] =>
  stringListAttr(entity, 'entity_id');

/** What Home Assistant reports, or what the user asked for. */
export interface LightReading {
  on: boolean;
  /** 0–255; null when unknown (off lights often omit it). */
  brightness: number | null;
}

export function lightReading(entity: HassEntity | null | undefined): LightReading {
  const on = entity?.state === 'on';
  return { on, brightness: on ? numberAttr(entity, 'brightness') : 0 };
}

/** Brightness tolerance when HA rounds the requested value (about 2%). */
const TOLERANCE = 5;

export function lightMatches(requested: LightReading, confirmed: LightReading): boolean {
  if (requested.on !== confirmed.on) return false;
  if (!requested.on || requested.brightness === null || confirmed.brightness === null) return true;
  return Math.abs(requested.brightness - confirmed.brightness) <= TOLERANCE;
}
