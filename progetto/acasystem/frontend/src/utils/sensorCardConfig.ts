import type { SensorActionType } from '@/@types/dashboard';
import type { EntityLike, EntityLikeMap } from '@/@types/ha';
import { hasOwnKey, isRecord, readKey, type UnknownRecord } from '@/validators/guards';

export type SensorStatusMode = 'auto' | 'text' | 'entity' | 'attribute' | 'hidden';
export type SensorActionTrigger = 'button' | 'icon' | 'card';
export type SensorTargetMode = 'entity' | 'none';

export const SENSOR_STATUS_MODES: SensorStatusMode[] = [
  'auto',
  'text',
  'entity',
  'attribute',
  'hidden',
];
export const SENSOR_ACTION_TYPES: SensorActionType[] = [
  'auto',
  'more-info',
  'toggle',
  'turn_on',
  'turn_off',
  'scene',
  'script',
  'press',
  'service',
  'none',
];

const AUTOMATIC_TOGGLE_DOMAINS = ['input_boolean', 'switch', 'light', 'automation', 'climate'];
const POWER_DOMAINS = [
  ...AUTOMATIC_TOGGLE_DOMAINS,
  'fan',
  'humidifier',
  'media_player',
  'remote',
  'siren',
];
const ACTION_TARGET_DOMAINS = {
  scene: ['scene'],
  script: ['script'],
  press: ['button', 'input_button'],
  toggle: POWER_DOMAINS,
  turn_on: POWER_DOMAINS,
  turn_off: POWER_DOMAINS,
};
const CLIMATE_TURN_OFF = 128;
const CLIMATE_TURN_ON = 256;
const SENSOR_TRIGGERS: SensorActionTrigger[] = ['button', 'icon', 'card'];
const textValue = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const objectValue = isRecord;

export function isSensorActionType(value: unknown): value is SensorActionType {
  return SENSOR_ACTION_TYPES.some((type) => type === value);
}

export function isSensorStatusMode(value: unknown): value is SensorStatusMode {
  return SENSOR_STATUS_MODES.some((mode) => mode === value);
}

const isSensorTrigger = (value: unknown): value is SensorActionTrigger =>
  SENSOR_TRIGGERS.some((trigger) => trigger === value);

export function getSensorActionTargetDomains(type: unknown): string[] | null {
  return typeof type === 'string' && hasOwnKey(ACTION_TARGET_DOMAINS, type)
    ? ACTION_TARGET_DOMAINS[type]
    : null;
}

export function getSensorAutomaticActionType(
  entity: EntityLike | null | undefined
): 'toggle' | 'scene' | 'script' | 'press' | 'none' {
  const domain = entity?.entity_id?.split('.')[0];
  if (domain !== undefined && AUTOMATIC_TOGGLE_DOMAINS.includes(domain)) return 'toggle';
  if (domain === 'scene' || domain === 'script') return domain;
  if (domain === 'button' || domain === 'input_button') return 'press';
  return 'none';
}

export function isSensorEntityActive(entity: EntityLike | null | undefined): boolean {
  if (
    !entity ||
    entity.state === 'unknown' ||
    entity.state === 'unavailable' ||
    entity.state === 'off'
  )
    return false;
  if (entity.entity_id?.startsWith('climate.')) return Boolean(entity.state);
  if (entity.entity_id?.startsWith('media_player.'))
    return Boolean(entity.state) && entity.state !== 'standby';
  return entity.state === 'on';
}

export interface SensorActionConfig {
  type: SensorActionType;
  configuredType: SensorActionType;
  isAutomatic: boolean;
  targetMode: SensorTargetMode;
  entityId: string;
  targetEntity: EntityLike | null | undefined;
  targetSupported: boolean;
  trigger: SensorActionTrigger;
  label: string;
  labelOn: string;
  labelOff: string;
  icon: string;
  service: string;
  data: UnknownRecord;
}

export interface SensorCardConfig {
  entityId: string;
  statusMode: SensorStatusMode;
  statusEntity: EntityLike | null | undefined;
  statusEntityId: string;
  statusText: string;
  statusAttribute: string;
  showLegacyControls: boolean;
  action: SensorActionConfig;
}

export function resolveSensorCardConfig(
  settings: unknown = {},
  entity?: EntityLike | null,
  entities: EntityLikeMap = {}
): SensorCardConfig {
  const entityId = textValue(readKey(settings, 'entityId')) || entity?.entity_id || '';
  const primaryEntity = entities[entityId] || (entity?.entity_id === entityId ? entity : undefined);
  const rawAction = readKey(settings, 'sensorAction');
  const storedAction: UnknownRecord = objectValue(rawAction) ? rawAction : {};
  const configuredType = isSensorActionType(storedAction.type) ? storedAction.type : 'auto';
  const targetMode: SensorTargetMode =
    configuredType === 'service' && storedAction.targetMode === 'none' ? 'none' : 'entity';
  const actionEntityId = targetMode === 'none' ? '' : textValue(storedAction.entityId) || entityId;
  const targetEntity =
    entities[actionEntityId] ||
    (primaryEntity?.entity_id === actionEntityId ? primaryEntity : undefined);
  const statusEntityId = textValue(readKey(settings, 'sensorStatusEntityId')) || entityId;
  const statusEntity =
    entities[statusEntityId] ||
    (primaryEntity?.entity_id === statusEntityId ? primaryEntity : undefined);
  const legacyStatusText = primaryEntity?.entity_id?.startsWith('script.')
    ? textValue(readKey(settings, 'scriptStatusText'))
    : '';
  const statusText = textValue(readKey(settings, 'sensorStatusText')) || legacyStatusText;
  const rawStatusMode = readKey(settings, 'sensorStatusMode');
  let statusMode: SensorStatusMode = isSensorStatusMode(rawStatusMode) ? rawStatusMode : 'auto';
  if (readKey(settings, 'showStatus') === false) statusMode = 'hidden';
  if (statusMode === 'text' && !statusText) statusMode = 'auto';

  const resolvedActionType =
    configuredType === 'auto' ? getSensorAutomaticActionType(targetEntity) : configuredType;
  const allowedTargetDomains = getSensorActionTargetDomains(resolvedActionType);
  const storedData = storedAction.data;

  return {
    entityId,
    statusMode,
    statusEntity,
    statusEntityId,
    statusText,
    statusAttribute: textValue(readKey(settings, 'sensorStatusAttribute')),
    showLegacyControls: configuredType === 'auto',
    action: {
      type: resolvedActionType,
      configuredType,
      isAutomatic: configuredType === 'auto',
      targetMode,
      entityId: actionEntityId,
      targetEntity,
      targetSupported:
        !allowedTargetDomains || allowedTargetDomains.includes(actionEntityId.split('.')[0]),
      trigger: isSensorTrigger(storedAction.trigger) ? storedAction.trigger : 'button',
      label: textValue(storedAction.label),
      labelOn: textValue(storedAction.labelOn),
      labelOff: textValue(storedAction.labelOff),
      icon: textValue(storedAction.icon),
      service: textValue(storedAction.service),
      data: objectValue(storedData) ? { ...storedData } : {},
    },
  };
}

export function canSensorUseNumericVariants(
  config: { action?: { configuredType?: string } } | null | undefined,
  displayEntity: EntityLike | null | undefined,
  primaryEntity: EntityLike | null | undefined
): boolean {
  const domain = displayEntity?.entity_id?.split('.')[0];
  return (
    domain !== 'input_number' ||
    displayEntity?.entity_id !== primaryEntity?.entity_id ||
    config?.action?.configuredType !== 'auto'
  );
}

function actionError(code: string): Error {
  return new Error(code);
}

/** Azione accettata dalla risoluzione della chiamata: config risolta o parziale. */
export interface SensorActionInput {
  type?: string;
  targetMode?: string;
  entityId?: unknown;
  service?: unknown;
  data?: unknown;
  targetEntity?: EntityLike | null;
}

export interface SensorActionExpectation {
  entityId: string;
  active: boolean;
  /** Stato atteso; `null` quando si confronta solo acceso/spento. */
  state: unknown;
}

export interface SensorActionCall {
  domain: string;
  service: string;
  data: UnknownRecord;
  expectation: SensorActionExpectation | null;
  type: string;
}

export function resolveSensorCardActionCall(
  action: SensorActionInput | null | undefined,
  entity: EntityLike | null | undefined = action?.targetEntity
): SensorActionCall | null {
  const type = action?.type === 'auto' ? getSensorAutomaticActionType(entity) : action?.type;
  if (type === 'none' || type === 'more-info') return null;
  const entityId =
    type === 'service' && action?.targetMode === 'none'
      ? ''
      : textValue(action?.entityId) || entity?.entity_id;

  if (type === 'service') {
    const parts = textValue(action?.service).split('.');
    if (parts.length !== 2 || parts.some((part) => !/^[a-z][a-z0-9_]*$/.test(part))) {
      throw actionError('invalid_service');
    }
    const rawData = action?.data;
    if (rawData !== undefined && !objectValue(rawData)) throw actionError('invalid_data');
    const data: UnknownRecord = objectValue(rawData) ? { ...rawData } : {};
    if (!data.target && data.entity_id === undefined && entityId) data.entity_id = entityId;
    return { domain: parts[0], service: parts[1], data, expectation: null, type };
  }

  if (!entityId || !entity || entity.entity_id !== entityId || entity.state === 'unavailable') {
    throw actionError('unavailable');
  }
  const domain = entityId.split('.')[0];
  if (type === 'scene' || type === 'script' || type === 'press') {
    const validDomain =
      type === 'press' ? ['button', 'input_button'].includes(domain) : domain === type;
    if (!validDomain) throw actionError('unsupported');
    return {
      domain,
      service: type === 'press' ? 'press' : 'turn_on',
      data: { entity_id: entityId },
      expectation: null,
      type,
    };
  }

  if (
    (type !== 'toggle' && type !== 'turn_on' && type !== 'turn_off') ||
    !POWER_DOMAINS.includes(domain)
  ) {
    throw actionError('unsupported');
  }
  if (entity.state === 'unknown') throw actionError('unavailable');
  const active = type === 'toggle' ? !isSensorEntityActive(entity) : type === 'turn_on';
  const expectation: SensorActionExpectation = {
    entityId,
    active,
    state: ['climate', 'media_player'].includes(domain) ? null : active ? 'on' : 'off',
  };
  const service = active ? 'turn_on' : 'turn_off';
  if (domain !== 'climate') {
    return { domain, service, data: { entity_id: entityId }, expectation, type };
  }

  const features = Number(entity.attributes?.supported_features) || 0;
  if (features & (active ? CLIMATE_TURN_ON : CLIMATE_TURN_OFF)) {
    return { domain, service, data: { entity_id: entityId }, expectation, type };
  }
  const hvacModes = entity.attributes?.hvac_modes;
  const modes: unknown[] = Array.isArray(hvacModes) ? hvacModes : [];
  const mode: unknown = active
    ? ['auto', 'heat_cool'].find((candidate) => modes.includes(candidate)) ||
      modes.find((candidate) => candidate !== 'off')
    : modes.includes('off')
      ? 'off'
      : null;
  if (!mode) throw actionError('unsupported');
  return {
    domain,
    service: 'set_hvac_mode',
    data: { entity_id: entityId, hvac_mode: mode },
    expectation: { ...expectation, state: mode },
    type,
  };
}

export function sensorActionExpectationMatches(
  expectation: SensorActionExpectation | null | undefined,
  entities: EntityLikeMap | null | undefined
): boolean {
  if (!expectation) return false;
  const entity = entities?.[expectation.entityId];
  if (!entity || entity.state === 'unavailable' || entity.state === 'unknown') return false;
  return expectation.state !== null
    ? entity.state === expectation.state
    : isSensorEntityActive(entity) === expectation.active;
}
