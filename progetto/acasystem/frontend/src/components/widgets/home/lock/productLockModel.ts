import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HassEntity } from '@/@types/ha';
import { isProductDeviceBinding } from '@/utils/devices/productBinding';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';

// Home Assistant core 2026.10.4: lock/__init__.py, const.py and services.yaml.
export const PRODUCT_LOCK_OPEN = 1;
export type ProductLockAction = 'lock' | 'unlock' | 'open';
const states: Record<string, string> = {
  locked: 'Bloccata',
  unlocked: 'Sbloccata',
  open: 'Aperta',
  locking: 'Blocco in corso',
  unlocking: 'Sblocco in corso',
  opening: 'Apertura in corso',
  jammed: 'Inceppata',
};
export function lockProductBinding(settings: CardSettings) {
  const binding = settings.productDevice;
  return isProductDeviceBinding(binding) &&
    binding.family === 'lock' &&
    settings.lockId === binding.primaryEntityId
    ? binding
    : null;
}
export function productLockView(entity: HassEntity | undefined) {
  const state = entity?.state ?? '',
    attributes = entity?.attributes ?? {};
  const known = !!entity && Object.hasOwn(states, state);
  const codeFormat = attributes.code_format;
  const features =
    typeof attributes.supported_features === 'number' &&
    Number.isSafeInteger(attributes.supported_features)
      ? attributes.supported_features
      : 0;
  return {
    state,
    available: known,
    stateLabel: known ? states[state]! : 'Non disponibile',
    moving: ['locking', 'unlocking', 'opening'].includes(state),
    requiresCode: typeof codeFormat === 'string' && codeFormat.length > 0,
    codeRequirementKnown: codeFormat == null || typeof codeFormat === 'string',
    codeFormat: typeof codeFormat === 'string' ? codeFormat : null,
    canOpen: features >= 0 && (features & PRODUCT_LOCK_OPEN) === PRODUCT_LOCK_OPEN,
  };
}
export type ProductLockView = ReturnType<typeof productLockView>;
export const lockActionLabel = (action: ProductLockAction) =>
  ({ lock: 'Blocca', unlock: 'Sblocca', open: 'Apri' })[action];
export const lockActionTarget = (action: ProductLockAction) =>
  ({ lock: 'locked', unlock: 'unlocked', open: 'open' })[action];
export function lockActionSupported(
  view: ProductLockView,
  services: ServiceCatalog | null,
  action: ProductLockAction
) {
  return Object.hasOwn(services?.lock ?? {}, action) && (action !== 'open' || view.canOpen);
}
export function lockActionAllowed(
  view: ProductLockView,
  services: ServiceCatalog | null,
  action: ProductLockAction
) {
  return (
    view.available &&
    !view.moving &&
    view.codeRequirementKnown &&
    lockActionSupported(view, services, action) &&
    view.state !== lockActionTarget(action) &&
    !(action === 'unlock' && view.state === 'open')
  );
}
export function lockPrimaryAction(view: ProductLockView): ProductLockAction | null {
  return view.state === 'locked'
    ? 'unlock'
    : ['unlocked', 'open'].includes(view.state)
      ? 'lock'
      : null;
}
export function lockLabel(id: string, ids: readonly string[], entities: EntityMap) {
  const name = String(entities[id]?.attributes.friendly_name || id);
  return ids.filter((other) => String(entities[other]?.attributes.friendly_name || other) === name)
    .length > 1
    ? `${name} (${id})`
    : name;
}
