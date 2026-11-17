import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HassEntity } from '@/@types/ha';
import { isProductDeviceBinding } from '@/utils/devices/productBinding';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';

// Home Assistant core 2026.10.4: alarm_control_panel/const.py, services.py and __init__.py.
export const PRODUCT_ALARM_ACTIONS = [
  { key: 'disarm', label: 'Disinserisci', target: 'disarmed', feature: 0 },
  { key: 'arm_home', label: 'Inserisci in casa', target: 'armed_home', feature: 1 },
  { key: 'arm_away', label: 'Inserisci fuori casa', target: 'armed_away', feature: 2 },
  { key: 'arm_night', label: 'Inserisci notte', target: 'armed_night', feature: 4 },
  {
    key: 'arm_custom_bypass',
    label: 'Inserisci con esclusioni',
    target: 'armed_custom_bypass',
    feature: 16,
  },
  { key: 'arm_vacation', label: 'Inserisci vacanza', target: 'armed_vacation', feature: 32 },
] as const;
export type ProductAlarmAction = (typeof PRODUCT_ALARM_ACTIONS)[number];
const states: Record<string, string> = {
  disarmed: 'Disinserito',
  armed_home: 'Inserito in casa',
  armed_away: 'Inserito fuori casa',
  armed_night: 'Inserito notte',
  armed_vacation: 'Inserito vacanza',
  armed_custom_bypass: 'Inserito con esclusioni',
  arming: 'Inserimento in corso',
  disarming: 'Disinserimento in corso',
  pending: 'In attesa',
  triggered: 'Allarme scattato',
};
export function alarmProductBinding(settings: CardSettings) {
  const binding = settings.productDevice;
  return isProductDeviceBinding(binding) &&
    binding.family === 'alarm' &&
    settings.alarmId === binding.primaryEntityId
    ? binding
    : null;
}
export const productAlarmStateLabel = (state: string) =>
  Object.hasOwn(states, state) ? states[state]! : 'Non disponibile';
export function productAlarmView(entity: HassEntity | undefined) {
  const state = entity?.state ?? '',
    attributes = entity?.attributes ?? {};
  const rawFeatures = attributes.supported_features;
  const features =
    typeof rawFeatures === 'number' && Number.isSafeInteger(rawFeatures) && rawFeatures >= 0
      ? rawFeatures
      : 0;
  const codeFormat = attributes.code_format;
  return {
    state,
    features,
    available: !!entity && Object.hasOwn(states, state),
    stateLabel: productAlarmStateLabel(state),
    transitional: ['arming', 'pending', 'disarming'].includes(state),
    armed: state.startsWith('armed_') && Object.hasOwn(states, state),
    codeFormat: codeFormat === 'number' || codeFormat === 'text' ? codeFormat : null,
    codeFormatKnown: codeFormat == null || codeFormat === 'number' || codeFormat === 'text',
    armCodeRequired:
      typeof attributes.code_arm_required === 'boolean' ? attributes.code_arm_required : null,
    has: (feature: number) => feature === 0 || (features & feature) === feature,
  };
}
export type ProductAlarmView = ReturnType<typeof productAlarmView>;
export type AlarmCodePolicy = { prompt: boolean; required: boolean; mode: 'numeric' | 'text' };
export function alarmCodePolicy(
  view: ProductAlarmView,
  action: ProductAlarmAction
): AlarmCodePolicy {
  const mode = view.codeFormat === 'number' ? 'numeric' : 'text';
  if (action.key === 'disarm')
    return { prompt: view.codeFormat !== null, required: view.codeFormat !== null, mode };
  if (view.armCodeRequired === false) return { prompt: false, required: false, mode };
  // None/default code is decided by HA. An absent requirement never invents permission or a PIN rule.
  return {
    prompt: true,
    required: view.armCodeRequired === true && view.codeFormat !== null,
    mode,
  };
}
export const alarmPolicyKey = (policy: AlarmCodePolicy) =>
  `${policy.prompt}:${policy.required}:${policy.mode}`;
export function alarmActionSupported(
  view: ProductAlarmView,
  services: ServiceCatalog | null,
  action: ProductAlarmAction
) {
  return (
    view.has(action.feature) &&
    Object.hasOwn(services?.alarm_control_panel ?? {}, `alarm_${action.key}`)
  );
}
export function alarmActionAllowed(
  view: ProductAlarmView,
  services: ServiceCatalog | null,
  action: ProductAlarmAction,
  armPending = false
) {
  return (
    view.available &&
    view.codeFormatKnown &&
    alarmActionSupported(view, services, action) &&
    (view.state !== action.target || (action.key === 'disarm' && armPending)) &&
    (action.key === 'disarm'
      ? view.state !== 'disarming'
      : !view.transitional && view.state !== 'triggered')
  );
}
export function productAlarmLabel(id: string, ids: readonly string[], entities: EntityMap) {
  const name = String(entities[id]?.attributes.friendly_name || id);
  return ids.filter((other) => String(entities[other]?.attributes.friendly_name || other) === name)
    .length > 1
    ? `${name} (${id})`
    : name;
}
