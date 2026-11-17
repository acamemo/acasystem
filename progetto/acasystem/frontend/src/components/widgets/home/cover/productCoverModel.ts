import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HassEntity } from '@/@types/ha';
import { isProductDeviceBinding } from '@/utils/devices/productBinding';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';

// Home Assistant core 2026.10.4, cover/const.py and services.yaml.
export const PRODUCT_COVER_FEATURE = {
  open: 1,
  close: 2,
  position: 4,
  stop: 8,
  tilt: 128,
} as const;
const states: Record<string, string> = {
  open: 'Aperta',
  closed: 'Chiusa',
  opening: 'In apertura',
  closing: 'In chiusura',
};
export function coverProductBinding(settings: CardSettings) {
  const binding = settings.productDevice;
  return isProductDeviceBinding(binding) &&
    binding.family === 'cover' &&
    settings.coverId === binding.primaryEntityId
    ? binding
    : null;
}
export function coverPercent(value: unknown): number | null {
  if (!(typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')))
    return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}
export function productCoverView(entity: HassEntity | undefined) {
  const attributes = entity?.attributes ?? {},
    state = entity?.state ?? '';
  const rawFeatures = attributes.supported_features;
  const features =
    typeof rawFeatures === 'number' && Number.isInteger(rawFeatures) && rawFeatures >= 0
      ? rawFeatures
      : 0;
  return {
    available: Boolean(entity && Object.hasOwn(states, state)),
    state,
    stateLabel: Object.hasOwn(states, state) ? states[state]! : 'Non disponibile',
    position: coverPercent(attributes.current_position),
    tilt: coverPercent(attributes.current_tilt_position),
    has: (flag: number) => (features & flag) === flag,
  };
}
export type ProductCoverView = ReturnType<typeof productCoverView>;
export function coverReading(value: number | null) {
  return value === null
    ? 'Non disponibile'
    : `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value)}%`;
}
export function coverLabel(id: string, ids: readonly string[], entities: EntityMap) {
  const name = String(entities[id]?.attributes.friendly_name || id);
  return ids.filter((other) => String(entities[other]?.attributes.friendly_name || other) === name)
    .length > 1
    ? `${name} (${id})`
    : name;
}
export function coverService(services: ServiceCatalog | null, name: string) {
  return Object.hasOwn(services?.cover ?? {}, name);
}
export type CoverAction = 'open' | 'close' | 'stop';
export function coverActionSupported(
  view: ProductCoverView,
  services: ServiceCatalog | null,
  action: CoverAction
) {
  return view.has(PRODUCT_COVER_FEATURE[action]) && coverService(services, `${action}_cover`);
}
export function coverActionCall(
  view: ProductCoverView,
  services: ServiceCatalog | null,
  action: CoverAction
) {
  return view.available && coverActionSupported(view, services, action)
    ? { service: `${action}_cover` }
    : null;
}
export function coverTargetCall(
  view: ProductCoverView,
  services: ServiceCatalog | null,
  key: 'position' | 'tilt',
  next: number
) {
  const service = key === 'position' ? 'set_cover_position' : 'set_cover_tilt_position';
  if (
    !view.available ||
    view[key] === null ||
    !view.has(PRODUCT_COVER_FEATURE[key]) ||
    !coverService(services, service) ||
    coverPercent(next) === null ||
    !Number.isInteger(next)
  )
    return null;
  return { service, data: key === 'position' ? { position: next } : { tilt_position: next } };
}
