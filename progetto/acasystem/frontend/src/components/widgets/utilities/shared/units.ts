/**
 * Units and currency of the utility widgets from the Home Assistant configuration
 * (`runtime.haConfig`): values are shown in the unit system of HA, as the legacy cards did
 * in «follow HA» mode, not in the unit of the single sensor. While the configuration is not
 * loaded yet (null) the sensor reading is shown as it is, without guessing.
 */
import type { HaConfig } from '@/@types/ha';
import {
  convertValueByKind,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  getUnitModeFromUnit,
  type EffectiveUnitMode,
} from '@/utils/units';
import { currencySymbol } from './format';

export interface UnitReading {
  value: number | null;
  unit: string;
}

type ConvertibleKind = 'length' | 'temperature';

const clean = (unit: string | null | undefined): string => (unit ?? '').trim();

/** Metric or imperial for one kind, from the unit HA declares for it; null until loaded. */
export function haUnitMode(
  kind: ConvertibleKind,
  haConfig: HaConfig | null
): EffectiveUnitMode | null {
  if (!haConfig) return null;
  const declared =
    kind === 'length'
      ? clean(haConfig.unit_system?.length ?? haConfig.length_unit)
      : clean(haConfig.unit_system?.temperature ?? haConfig.temperature_unit);
  return declared
    ? getUnitModeFromUnit(kind, declared)
    : getEffectiveUnitMode('follow_ha', haConfig);
}

/** Unit HA uses for a kind (`km`/`mi`, `°C`/`°F`), or the fallback until the config is loaded. */
export function haUnit(kind: ConvertibleKind, haConfig: HaConfig | null, fallback: string): string {
  const mode = haUnitMode(kind, haConfig);
  return mode ? getDisplayUnitForKind(kind, mode) : fallback;
}

function convertReading(
  kind: ConvertibleKind,
  value: number | null,
  sourceUnit: string | null | undefined,
  defaultUnit: string,
  haConfig: HaConfig | null
): UnitReading {
  const from = clean(sourceUnit) || defaultUnit;
  const mode = haUnitMode(kind, haConfig);
  if (value === null || !mode)
    return { value, unit: mode ? getDisplayUnitForKind(kind, mode) : from };
  return {
    value: convertValueByKind(value, { kind, fromUnit: from, unitMode: mode }),
    unit: getDisplayUnitForKind(kind, mode),
  };
}

/** Distance (range, odometer) in the HA length unit; a sensor without unit is read as km. */
export function lengthReading(
  value: number | null,
  sourceUnit: string | null | undefined,
  haConfig: HaConfig | null
): UnitReading {
  return convertReading('length', value, sourceUnit, 'km', haConfig);
}

/** Temperature in the HA unit; a sensor without unit is read as °C. */
export function temperatureReading(
  value: number | null,
  sourceUnit: string | null | undefined,
  haConfig: HaConfig | null
): UnitReading {
  return convertReading('temperature', value, sourceUnit, '°C', haConfig);
}

/**
 * Currency of the energy widgets (legacy order): the card setting, then the currency of HA.
 * Null when neither is known: the figure is shown without a currency instead of a guess.
 */
export function currencyUnit(
  setting: string | null | undefined,
  haConfig: HaConfig | null
): string | null {
  const chosen = clean(setting) || clean(haConfig?.currency);
  return chosen ? currencySymbol(chosen) : null;
}
