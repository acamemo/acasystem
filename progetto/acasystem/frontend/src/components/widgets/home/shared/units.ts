/**
 * Units of the comfort widgets (ADR-0007): the unit an entity reports wins; without it, the
 * unit system of Home Assistant (`get_config`, runtime.haConfig); the legacy metric default
 * only while HA has not told us (configuration not loaded or not readable). No conversion.
 */
import type { HaConfig } from '@/@types/ha';
import { isNonEmptyString } from '@/validators/guards';

export type SystemUnitKind =
  'temperature' | 'pressure' | 'wind_speed' | 'accumulated_precipitation' | 'length';

/** Defaults of the legacy cards, used only when HA reports no unit system. */
const LEGACY_DEFAULTS: Record<SystemUnitKind, string> = {
  temperature: '°C',
  pressure: 'hPa',
  wind_speed: 'km/h',
  accumulated_precipitation: 'mm',
  length: 'km',
};

/** Unit of the HA unit system for a quantity. */
export function systemUnit(haConfig: HaConfig | null | undefined, kind: SystemUnitKind): string {
  const fromSystem = haConfig?.unit_system?.[kind];
  if (isNonEmptyString(fromSystem)) return fromSystem;
  // Older payloads flatten the two units the legacy code read.
  const flat =
    kind === 'temperature'
      ? haConfig?.temperature_unit
      : kind === 'length'
        ? haConfig?.length_unit
        : undefined;
  return isNonEmptyString(flat) ? flat : LEGACY_DEFAULTS[kind];
}

/** First unit an entity reports, else the unit system of HA. */
export function unitOr(
  reported: ReadonlyArray<string | undefined>,
  haConfig: HaConfig | null | undefined,
  kind: SystemUnitKind
): string {
  return reported.find(isNonEmptyString) ?? systemUnit(haConfig, kind);
}
