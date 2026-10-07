/**
 * Alarm control panel as the legacy AlarmCard, AlarmModal and AlarmActionPinModal used it:
 * actions from `supported_features`, PIN rules from `code_format`, `code_arm_required` and
 * `code_disarm_required`, services `alarm_control_panel.alarm_*` with `{ entity_id, code? }`.
 * The PIN only ever travels in the service data: it is never stored or logged.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { ServiceData } from '@/@types/ha';
import { attributeString, isUnavailableState, readAttribute } from '../shared/entity';
import { humanizeToken } from '../shared/format';
import type { HomeIconName } from '../shared/HomeIcon';

export type AlarmActionKey =
  'arm_home' | 'arm_away' | 'arm_night' | 'arm_vacation' | 'arm_custom_bypass' | 'disarm';

export interface AlarmAction {
  key: AlarmActionKey;
  label: string;
  icon: HomeIconName;
  service: string;
  /** Feature bit of alarm_control_panel; disarm has none. */
  feature: number;
  /** States that confirm the request (the panel may go through arming/pending first). */
  confirms: readonly string[];
}

export const ARM_ACTIONS: readonly AlarmAction[] = [
  {
    key: 'arm_home',
    label: 'Inserisci in casa',
    icon: 'home',
    service: 'alarm_arm_home',
    feature: 1,
    confirms: ['armed_home', 'arming', 'pending'],
  },
  {
    key: 'arm_away',
    label: 'Inserisci fuori casa',
    icon: 'logout',
    service: 'alarm_arm_away',
    feature: 2,
    confirms: ['armed_away', 'arming', 'pending'],
  },
  {
    key: 'arm_night',
    label: 'Inserisci notte',
    icon: 'moon',
    service: 'alarm_arm_night',
    feature: 4,
    confirms: ['armed_night', 'arming', 'pending'],
  },
  {
    key: 'arm_vacation',
    label: 'Inserisci vacanza',
    icon: 'sun',
    service: 'alarm_arm_vacation',
    feature: 32,
    confirms: ['armed_vacation', 'arming', 'pending'],
  },
  {
    key: 'arm_custom_bypass',
    label: 'Inserisci con esclusioni',
    icon: 'shieldSecurity',
    service: 'alarm_arm_custom_bypass',
    feature: 16,
    confirms: ['armed_custom_bypass', 'arming', 'pending'],
  },
];

export const DISARM_ACTION: AlarmAction = {
  key: 'disarm',
  label: 'Disinserisci',
  icon: 'unlock',
  service: 'alarm_disarm',
  feature: 0,
  confirms: ['disarmed', 'disarming'],
};

export const ALL_ACTIONS: readonly AlarmAction[] = [DISARM_ACTION, ...ARM_ACTIONS];

export function actionByKey(key: string | null | undefined): AlarmAction | undefined {
  return ALL_ACTIONS.find((action) => action.key === key);
}

const STATE_LABELS: Record<string, string> = {
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
  unavailable: 'Non disponibile',
  unknown: 'Stato sconosciuto',
};

export const alarmStateLabel = (state: string | undefined): string =>
  state ? (STATE_LABELS[state] ?? humanizeToken(state)) : 'Stato sconosciuto';

export const TRANSITION_STATES: ReadonlySet<string> = new Set(['arming', 'pending', 'disarming']);

export function alarmStateIcon(state: string): HomeIconName {
  if (state === 'disarmed') return 'shieldCross';
  if (state === 'triggered' || isUnavailableState(state)) return 'warning';
  if (TRANSITION_STATES.has(state)) return 'shieldSecurity';
  return 'shield';
}

/** Arm actions enabled by `supported_features`, in the legacy order. */
export function availableArmActions(entity: HassEntity): AlarmAction[] {
  const features = Number(readAttribute(entity, 'supported_features') ?? 0) || 0;
  return ARM_ACTIONS.filter((action) => (features & action.feature) !== 0);
}

/** Legacy parseBooleanLike. */
function booleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return undefined;
}

const codeFormat = (entity: HassEntity): string => attributeString(entity, 'code_format') ?? 'none';

/** Legacy requiresCode: disarm needs the code unless told otherwise, arming only if required. */
export function requiresCode(action: AlarmActionKey, entity: HassEntity): boolean {
  if (codeFormat(entity) === 'none') return false;
  if (action === 'disarm')
    return booleanLike(readAttribute(entity, 'code_disarm_required')) ?? true;
  return booleanLike(readAttribute(entity, 'code_arm_required')) ?? false;
}

/** Text codes are not supported by the keypad (legacy): such actions stay disabled. */
export const unsupportedCode = (entity: HassEntity): boolean => {
  const format = codeFormat(entity);
  return format !== 'none' && format !== 'number';
};

/** Up to 12 digits, as the legacy keypad. */
export const MAX_PIN_LENGTH = 12;
export const sanitizePin = (value: string): string =>
  value.replace(/\D/g, '').slice(0, MAX_PIN_LENGTH);

export interface AlarmCall {
  domain: 'alarm_control_panel';
  service: string;
  data: ServiceData;
}

/** `{ entity_id }`, plus the trimmed code when one is given (legacy runAction). */
export function alarmCall(entityId: string, action: AlarmAction, code?: string): AlarmCall {
  const data: ServiceData = { entity_id: entityId };
  const trimmed = code?.trim();
  if (trimmed) data.code = trimmed;
  return { domain: 'alarm_control_panel', service: action.service, data };
}

/** Quick actions of the card: arm actions when disarmed (1 or 2), disarm otherwise. */
export function quickActions(entity: HassEntity, max: number): AlarmAction[] {
  const state = entity.state;
  if (TRANSITION_STATES.has(state) || isUnavailableState(state)) return [];
  if (state === 'disarmed') return availableArmActions(entity).slice(0, max);
  return [DISARM_ACTION];
}

/** Actions of the detail sheet: disarm (unless disarmed) and every supported arm action. */
export function detailActions(entity: HassEntity): AlarmAction[] {
  const canDisarm = !isUnavailableState(entity.state) && entity.state !== 'disarmed';
  return [...(canDisarm ? [DISARM_ACTION] : []), ...availableArmActions(entity)];
}
