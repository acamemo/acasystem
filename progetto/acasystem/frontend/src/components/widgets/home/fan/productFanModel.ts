import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HassEntity } from '@/@types/ha';
import { isProductDeviceBinding } from '@/utils/devices/productBinding';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';

// Home Assistant core 2026.10.4: fan/const.py and fan/services.py.
export const PRODUCT_FAN_FEATURE = {
  speed: 1,
  oscillation: 2,
  direction: 4,
  preset: 8,
  off: 16,
  on: 32,
} as const;
export function fanProductBinding(settings: CardSettings) {
  const binding = settings.productDevice;
  return isProductDeviceBinding(binding) &&
    binding.family === 'fan' &&
    settings.bindingEntityId === binding.primaryEntityId
    ? binding
    : null;
}
export function fanNumber(value: unknown): number | null {
  if (!(typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')))
    return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}
export function fanPercentage(value: unknown) {
  const number = fanNumber(value);
  return number !== null && number >= 0 && number <= 100 ? number : null;
}
const string = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
export function productFanView(entity: HassEntity | undefined) {
  const attributes = entity?.attributes ?? {},
    state = entity?.state ?? '';
  const features =
    typeof attributes.supported_features === 'number' &&
    Number.isSafeInteger(attributes.supported_features) &&
    attributes.supported_features >= 0
      ? attributes.supported_features
      : 0;
  const step = fanNumber(attributes.percentage_step),
    direction = attributes.direction;
  const presets = Array.isArray(attributes.preset_modes)
    ? [
        ...new Set(
          attributes.preset_modes.filter(
            (mode): mode is string => typeof mode === 'string' && !!mode.trim()
          )
        ),
      ]
    : [];
  return {
    state,
    available: Boolean(entity && (state === 'on' || state === 'off')),
    stateLabel: state === 'on' ? 'Acceso' : state === 'off' ? 'Spento' : 'Non disponibile',
    percentage: fanPercentage(attributes.percentage),
    step: step !== null && step > 0 && step <= 100 ? step : null,
    preset: string(attributes.preset_mode),
    presets,
    oscillating: typeof attributes.oscillating === 'boolean' ? attributes.oscillating : null,
    direction: direction === 'forward' || direction === 'reverse' ? direction : null,
    has: (flag: number) => (features & flag) === flag,
  };
}
export type ProductFanView = ReturnType<typeof productFanView>;
export function fanReading(value: number | null) {
  return value === null
    ? 'Non disponibile'
    : `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(value)}%`;
}
const presetLabels: Record<string, string> = {
  normal: 'Normale',
  natural: 'Naturale',
  sleep: 'Notte',
  auto: 'Automatico',
  eco: 'Eco',
};
export function productFanPresetLabel(value: string | null) {
  return value === null
    ? 'Non impostata'
    : Object.hasOwn(presetLabels, value)
      ? presetLabels[value]!
      : value;
}
export function fanLabel(id: string, ids: readonly string[], entities: EntityMap) {
  const name = String(entities[id]?.attributes.friendly_name || id);
  return ids.filter((other) => String(entities[other]?.attributes.friendly_name || other) === name)
    .length > 1
    ? `${name} (${id})`
    : name;
}
export function fanService(services: ServiceCatalog | null, name: string) {
  return Object.hasOwn(services?.fan ?? {}, name);
}
export function fanPowerSupported(
  view: ProductFanView,
  services: ServiceCatalog | null,
  on: boolean
) {
  return (
    view.has(on ? PRODUCT_FAN_FEATURE.on : PRODUCT_FAN_FEATURE.off) &&
    fanService(services, on ? 'turn_on' : 'turn_off')
  );
}
export function fanPowerCall(view: ProductFanView, services: ServiceCatalog | null, on: boolean) {
  return view.available && fanPowerSupported(view, services, on)
    ? { service: on ? 'turn_on' : 'turn_off' }
    : null;
}
/** The reported step selects a hardware level; HA's percentage service requires an integer. */
export function fanSpeedCall(view: ProductFanView, services: ServiceCatalog | null, raw: number) {
  if (
    !view.available ||
    view.percentage === null ||
    view.step === null ||
    !view.has(PRODUCT_FAN_FEATURE.speed) ||
    !fanService(services, 'set_percentage') ||
    fanPercentage(raw) === null
  )
    return null;
  const level = raw === 100 ? 100 : Math.min(100, Math.round(raw / view.step) * view.step);
  const percentage = level >= 100 - 1e-7 ? 100 : Math.floor(level + 1e-7);
  return { service: 'set_percentage', data: { percentage } };
}
export function fanPresetSupported(view: ProductFanView, services: ServiceCatalog | null) {
  // The pinned service accepts SET_SPEED or PRESET_MODE, not guessed modes.
  return (
    (view.has(PRODUCT_FAN_FEATURE.speed) || view.has(PRODUCT_FAN_FEATURE.preset)) &&
    view.presets.length > 0 &&
    fanService(services, 'set_preset_mode')
  );
}
export function fanPresetCall(
  view: ProductFanView,
  services: ServiceCatalog | null,
  preset: string
) {
  return view.available && fanPresetSupported(view, services) && view.presets.includes(preset)
    ? { service: 'set_preset_mode', data: { preset_mode: preset } }
    : null;
}
export function fanOscillationCall(
  view: ProductFanView,
  services: ServiceCatalog | null,
  oscillating: boolean
) {
  return view.available &&
    view.oscillating !== null &&
    view.has(PRODUCT_FAN_FEATURE.oscillation) &&
    fanService(services, 'oscillate')
    ? { service: 'oscillate', data: { oscillating } }
    : null;
}
export function fanDirectionCall(
  view: ProductFanView,
  services: ServiceCatalog | null,
  direction: string
) {
  return view.available &&
    view.direction !== null &&
    view.has(PRODUCT_FAN_FEATURE.direction) &&
    fanService(services, 'set_direction') &&
    (direction === 'forward' || direction === 'reverse')
    ? { service: 'set_direction', data: { direction } }
    : null;
}
