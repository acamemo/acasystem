import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HaConfig, HassEntity } from '@/@types/ha';
import { isProductDeviceBinding } from '@/utils/devices/productBinding';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';
import { hvacActionLabel, hvacModeLabel } from './climateModel';

// HA core 2026.10.4, climate/const.py. Features alone never authorize a missing service.
export const CLIMATE_FEATURE = {
  temperature: 1,
  range: 2,
  humidity: 4,
  fan: 8,
  preset: 16,
  swing: 32,
  off: 128,
  on: 256,
  horizontal: 512,
} as const;
export function climateProductBinding(settings: CardSettings) {
  const binding = settings.productDevice;
  return isProductDeviceBinding(binding) &&
    binding.family === 'climate' &&
    settings.climateId === binding.primaryEntityId
    ? binding
    : null;
}
export const climateNumber = (value: unknown): number | null =>
  (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) &&
  Number.isFinite(Number(value))
    ? Number(value)
    : null;
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
const options = (value: unknown): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter((item): item is string => typeof item === 'string' && !!item.trim())
        ),
      ]
    : [];
export function climateLabel(id: string, ids: readonly string[], entities: EntityMap) {
  const name = String(entities[id]?.attributes.friendly_name || id);
  return ids.filter((other) => String(entities[other]?.attributes.friendly_name || other) === name)
    .length > 1
    ? `${name} (${id})`
    : name;
}
export function productClimateView(entity: HassEntity | undefined, config?: HaConfig | null) {
  const a = entity?.attributes ?? {};
  const features = climateNumber(a.supported_features) ?? 0;
  const has = (flag: number) => (features & flag) !== 0;
  const unit =
    text(a.temperature_unit) ??
    text(config?.unit_system?.temperature) ??
    text(config?.temperature_unit);
  return {
    available: Boolean(entity && !['unknown', 'unavailable', ''].includes(entity.state)),
    mode: text(entity?.state),
    action: text(a.hvac_action),
    unit,
    current: climateNumber(a.current_temperature),
    target: climateNumber(a.temperature),
    low: climateNumber(a.target_temp_low),
    high: climateNumber(a.target_temp_high),
    min: climateNumber(a.min_temp),
    max: climateNumber(a.max_temp),
    step: climateNumber(a.target_temp_step),
    humidity: climateNumber(a.humidity),
    currentHumidity: climateNumber(a.current_humidity),
    minHumidity: climateNumber(a.min_humidity),
    maxHumidity: climateNumber(a.max_humidity),
    humidityStep: climateNumber(a.target_humidity_step),
    has,
    modes: options(a.hvac_modes),
    fanModes: options(a.fan_modes),
    presets: options(a.preset_modes),
    swings: options(a.swing_modes),
    horizontalSwings: options(a.swing_horizontal_modes),
    fan: text(a.fan_mode),
    preset: text(a.preset_mode),
    swing: text(a.swing_mode),
    horizontalSwing: text(a.swing_horizontal_mode),
  };
}
export type ProductClimateView = ReturnType<typeof productClimateView>;
export function climateState(view: ProductClimateView) {
  return view.available && view.mode ? hvacModeLabel(view.mode) : 'Non disponibile';
}
export function climateActivity(view: ProductClimateView) {
  return view.available && view.action ? hvacActionLabel(view.action) : 'Attività non disponibile';
}
export function climateReading(value: number | null, unit: string | null) {
  return value === null
    ? 'Non disponibile'
    : `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(value)}${unit ? ` ${unit}` : ''}`;
}
export function climateService(services: ServiceCatalog | null, name: string) {
  return Object.hasOwn(services?.climate ?? {}, name);
}
export function climateUsesRange(view: ProductClimateView) {
  return (
    view.has(CLIMATE_FEATURE.range) &&
    (view.mode === 'heat_cool' || !view.has(CLIMATE_FEATURE.temperature))
  );
}
export function temperatureLimits(view: ProductClimateView) {
  return (
    view.unit !== null &&
    view.min !== null &&
    view.max !== null &&
    view.min < view.max &&
    view.step !== null &&
    view.step > 0
  );
}
export function climateTargetCall(
  view: ProductClimateView,
  services: ServiceCatalog | null,
  key: 'temperature' | 'target_temp_low' | 'target_temp_high' | 'humidity',
  next: number
) {
  if (!view.available || !Number.isFinite(next)) return null;
  if (key === 'humidity') {
    if (
      !view.has(CLIMATE_FEATURE.humidity) ||
      !climateService(services, 'set_humidity') ||
      view.humidity === null ||
      view.minHumidity === null ||
      view.maxHumidity === null ||
      view.minHumidity >= view.maxHumidity ||
      view.humidityStep === null ||
      view.humidityStep <= 0 ||
      next < view.minHumidity ||
      next > view.maxHumidity
    )
      return null;
    return { service: 'set_humidity', data: { humidity: next } };
  }
  if (
    !temperatureLimits(view) ||
    !climateService(services, 'set_temperature') ||
    next < view.min! ||
    next > view.max!
  )
    return null;
  if (key === 'temperature')
    return !climateUsesRange(view) && view.has(CLIMATE_FEATURE.temperature) && view.target !== null
      ? { service: 'set_temperature', data: { temperature: next } }
      : null;
  if (!climateUsesRange(view) || view.low === null || view.high === null || view.low > view.high)
    return null;
  const low = key === 'target_temp_low' ? next : view.low;
  const high = key === 'target_temp_high' ? next : view.high;
  return low <= high
    ? { service: 'set_temperature', data: { target_temp_low: low, target_temp_high: high } }
    : null;
}
export function climatePowerCall(
  view: ProductClimateView,
  services: ServiceCatalog | null,
  on: boolean
) {
  if (!view.available) return null;
  const service = on ? 'turn_on' : 'turn_off';
  if (view.has(on ? CLIMATE_FEATURE.on : CLIMATE_FEATURE.off) && climateService(services, service))
    return { service, data: {} };
  if (!climateService(services, 'set_hvac_mode')) return null;
  const modes = view.modes.filter((mode) => mode !== 'off');
  const mode = on
    ? modes.length === 1
      ? modes[0]
      : null
    : view.modes.includes('off')
      ? 'off'
      : null;
  return mode ? { service: 'set_hvac_mode', data: { hvac_mode: mode } } : null;
}
