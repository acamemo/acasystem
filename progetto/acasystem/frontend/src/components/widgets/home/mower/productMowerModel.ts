import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HassEntity } from '@/@types/ha';
import { isProductDeviceBinding } from '@/utils/devices/productBinding';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';

// Home Assistant core 2026.10.4: lawn_mower/const.py and services.py.
export const MOWER_ACTIONS = [
  { service: 'start_mowing', label: 'Avvia taglio', target: 'mowing', bit: 1, icon: 'play' },
  { service: 'pause', label: 'Pausa', target: 'paused', bit: 2, icon: 'pause' },
  { service: 'stop', label: 'Ferma', target: 'idle', bit: 8, icon: 'stop' },
  { service: 'dock', label: 'Torna alla base', target: 'docked', bit: 4, icon: 'home' },
] as const;
export type MowerAction = (typeof MOWER_ACTIONS)[number];
const states: Record<string, string> = {
  mowing: 'Taglio in corso',
  paused: 'In pausa',
  returning: 'Ritorno alla base',
  docked: 'Alla base',
  idle: 'Inattivo',
  error: 'Richiede attenzione',
};
export function mowerProductBinding(settings: CardSettings) {
  const binding = settings.productDevice;
  return isProductDeviceBinding(binding) &&
    binding.family === 'mower' &&
    settings.bindingEntityId === binding.primaryEntityId
    ? binding
    : null;
}
export function productMowerView(entity: HassEntity | undefined) {
  const state = entity?.state ?? '',
    attrs = entity?.attributes ?? {};
  const features =
    typeof attrs.supported_features === 'number' &&
    Number.isSafeInteger(attrs.supported_features) &&
    attrs.supported_features >= 0
      ? attrs.supported_features
      : 0;
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
    battery,
    has: (bit: number) => (features & bit) === bit,
  };
}
export function mowerActionSupported(
  view: ReturnType<typeof productMowerView>,
  services: ServiceCatalog | null,
  action: MowerAction
) {
  return view.has(action.bit) && Object.hasOwn(services?.lawn_mower ?? {}, action.service);
}
export function mowerActionAllowed(
  view: ReturnType<typeof productMowerView>,
  services: ServiceCatalog | null,
  action: MowerAction,
  startPending = false
) {
  return (
    view.available &&
    mowerActionSupported(view, services, action) &&
    (view.state !== action.target || (action.service !== 'start_mowing' && startPending))
  );
}
export function mowerLabel(id: string, ids: readonly string[], entities: EntityMap) {
  const label = String(entities[id]?.attributes.friendly_name || id);
  return ids.filter((other) => String(entities[other]?.attributes.friendly_name || other) === label)
    .length > 1
    ? `${label} (${id})`
    : label;
}
/** No synthetic 0–100 range: native number controls require all advertised limits. */
export function mowerNumericControlReady(entity: HassEntity | undefined) {
  if (!entity || !/^(number|input_number)\./.test(entity.entity_id) || !entity.state.trim())
    return false;
  const { min, max, step } = entity.attributes,
    current = Number(entity.state);
  return (
    typeof min === 'number' &&
    typeof max === 'number' &&
    typeof step === 'number' &&
    [min, max, step, current].every(Number.isFinite) &&
    min < max &&
    step > 0 &&
    current >= min &&
    current <= max
  );
}
