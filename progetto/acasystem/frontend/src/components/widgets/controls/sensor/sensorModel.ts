/**
 * Display model of the sensor/entity widget, ported from the legacy SensorCard: status mode,
 * units (converted to the unit system of Home Assistant), binary wording, numeric variants and
 * the action resolved by sensorCardConfig.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityLike, EntityLikeMap, HaConfig } from '@/@types/ha';
import {
  canSensorUseNumericVariants,
  isSensorEntityActive,
  resolveSensorCardConfig,
  type SensorCardConfig,
} from '@/utils/sensorCardConfig';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  getUnitModeFromUnit,
  inferUnitKind,
  type EffectiveUnitMode,
  type UnitKind,
} from '@/utils/units';
import { readKey } from '@/validators/guards';
import { aliasIcon, type ControlIconName } from '../shared/ControlIcon';
import { italianNumber } from '../shared/format';
import { BINARY_STATE_LABELS, GENERIC_STATE_LABELS } from '../shared/labels';

export type SensorVariant = 'default' | 'gauge' | 'donut' | 'bar' | 'number';
export type ThresholdTone = 'danger' | 'active' | 'info';

const TOGGLE_LABEL_DOMAINS = ['automation', 'input_boolean', 'switch', 'input_number', 'light', 'climate'];
const MANAGED_DOMAINS = ['scene', 'script', 'button', 'input_button', 'climate'];
const TOGGLE_DOMAINS = ['input_boolean', 'switch', 'automation', 'light'];
const DEFAULT_THRESHOLDS = [
  { limit: 20, color: 'red' },
  { limit: 60, color: 'amber' },
  { limit: 100, color: 'green' },
];
/** Legacy threshold colours on the Metallo accents: red → danger, amber → orange, green → blue. */
const THRESHOLD_TONES: Record<string, ThresholdTone> = { red: 'danger', amber: 'active', green: 'info' };

export interface SensorModel {
  config: SensorCardConfig;
  primaryDomain: string;
  displayEntity: EntityLike | null | undefined;
  /** Display state as text (raw). */
  state: string | undefined;
  domain: string;
  deviceClass: string | undefined;
  isNumeric: boolean;
  isUnavailable: boolean;
  isBinaryLike: boolean;
  isActiveState: boolean;
  /** Converted numeric value, or null. */
  numericValue: number | null;
  /** Main text: the value (Italian format) or the state wording. */
  displayState: string;
  unit: string;
  variant: SensorVariant;
  valueMode: 'actual' | 'percent';
  isRangeVariant: boolean;
  chartMin: number;
  chartMax: number;
  chartValue: number | null;
  chartDisplay: string;
  thresholdTone: ThresholdTone;
  showControls: boolean;
  showName: boolean;
  showIcon: boolean;
  showStatus: boolean;
  /** Sparkline/history graph allowed by the settings (the size decides the rest). */
  graphAllowed: boolean;
  showVariant: boolean;
  isSelectDomain: boolean;
  selectOptions: string[];
  managedAction: boolean;
  isToggleDomain: boolean;
  actionActive: boolean;
  actionUnavailable: boolean;
  actionLabel: string;
  actionIcon: ControlIconName;
  icon: ControlIconName;
}

const stringOf = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function defaultIcon(domain: string, deviceClass: string | undefined): ControlIconName {
  switch (deviceClass) {
    case 'temperature':
      return 'thermostat';
    case 'humidity':
      return 'humidity';
    case 'moisture':
      return 'humidity';
    case 'power':
    case 'energy':
    case 'current':
    case 'voltage':
      return 'energy';
    case 'battery':
      return 'battery';
    case 'illuminance':
      return 'sun';
    case 'motion':
    case 'occupancy':
      return 'motion';
    case 'presence':
      return 'presence';
    case 'door':
    case 'garage_door':
      return 'room';
    case 'window':
      return 'blinds';
    case 'smoke':
      return 'smoke';
    case 'carbon_dioxide':
    case 'pm25':
    case 'aqi':
      return 'cloud';
    case 'lock':
      return 'lock';
    default:
      break;
  }
  switch (domain) {
    case 'input_number':
      return 'number';
    case 'input_boolean':
      return 'toggle';
    case 'switch':
      return 'power';
    case 'select':
    case 'input_select':
      return 'select';
    case 'light':
      return 'light';
    case 'automation':
      return 'automation';
    case 'script':
      return 'script';
    case 'scene':
      return 'scene';
    case 'button':
    case 'input_button':
      return 'play';
    case 'climate':
      return 'thermostat';
    case 'fan':
      return 'fan';
    case 'lock':
      return 'lock';
    case 'cover':
      return 'blinds';
    default:
      return 'activity';
  }
}

function actionLabelOf(config: SensorCardConfig, active: boolean): string {
  const action = config.action;
  const custom = (active ? action.labelOn : action.labelOff) || action.label;
  if (custom) return custom;
  switch (action.type) {
    case 'scene':
      return 'Attiva la scena';
    case 'script':
      return 'Esegui';
    case 'toggle':
      return active ? 'Spegni' : 'Accendi';
    case 'turn_on':
      return 'Accendi';
    case 'turn_off':
      return 'Spegni';
    case 'more-info':
      return 'Dettagli';
    case 'press':
      return 'Premi';
    default:
      return 'Attiva';
  }
}

/**
 * Unit system of the displayed values. Units follow Home Assistant (ADR-0007), as the legacy
 * card did with «follow HA»: its `unit_system` decides metric or imperial. Until the HA
 * configuration is loaded the value keeps the unit system of its source (no wrong conversion).
 */
export function displayUnitMode(
  kind: UnitKind,
  sourceUnit: string,
  haConfig: HaConfig | null
): EffectiveUnitMode {
  return haConfig ? getEffectiveUnitMode('follow_ha', haConfig) : getUnitModeFromUnit(kind, sourceUnit);
}

function resolveRangeValue(
  type: unknown,
  value: unknown,
  entityId: unknown,
  entities: EntityLikeMap,
  haConfig: HaConfig | null
): number | null {
  if (type === 'entity' && typeof entityId === 'string' && entities[entityId]) {
    const source = entities[entityId];
    const parsed = Number.parseFloat(String(source?.state));
    if (Number.isNaN(parsed)) return null;
    const unit = stringOf(source?.attributes?.unit_of_measurement) ?? '';
    const kind = inferUnitKind(source?.attributes?.device_class, unit);
    if (!kind) return parsed;
    return convertValueByKind(parsed, {
      kind,
      fromUnit: unit,
      unitMode: displayUnitMode(kind, unit, haConfig),
    });
  }
  return typeof value === 'number' ? value : null;
}

export function buildSensorModel(
  settings: Record<string, unknown>,
  entity: HassEntity,
  entities: EntityLikeMap,
  /** HA configuration (`WidgetRuntime.haConfig`); null until loaded. */
  haConfig: HaConfig | null
): SensorModel {
  const config = resolveSensorCardConfig(settings, entity, entities);
  const primaryDomain = entity.entity_id.split('.')[0] ?? '';
  const displayEntity = ['entity', 'attribute'].includes(config.statusMode)
    ? config.statusEntity
    : entity;
  const rawState =
    config.statusMode === 'attribute'
      ? displayEntity?.attributes?.[config.statusAttribute]
      : displayEntity?.state;
  const state = stringOf(rawState);
  const isClimateAttribute =
    config.statusMode === 'attribute' &&
    !!displayEntity?.entity_id?.startsWith('climate.') &&
    ['current_temperature', 'temperature', 'target_temp_high', 'target_temp_low'].includes(
      config.statusAttribute
    );
  const rawUnit =
    config.statusMode === 'attribute'
      ? isClimateAttribute
        ? stringOf(displayEntity?.attributes?.temperature_unit) ||
          haConfig?.unit_system?.temperature ||
          haConfig?.temperature_unit ||
          ''
        : ''
      : (stringOf(displayEntity?.attributes?.unit_of_measurement) ?? '');
  const isNumeric =
    config.statusMode !== 'text' && state !== undefined && /^\s*-?\d+(\.\d+)?\s*$/.test(state);
  const domain = displayEntity?.entity_id?.split('.')[0] ?? '';
  const deviceClassRaw = isClimateAttribute
    ? 'temperature'
    : config.statusMode === 'attribute'
      ? undefined
      : displayEntity?.attributes?.device_class;
  const deviceClass = typeof deviceClassRaw === 'string' ? deviceClassRaw : undefined;
  const isOnOff = state === 'on' || state === 'off';
  const isUnavailable = state === 'unavailable' || state === 'unknown';
  const numericState = isNumeric && state !== undefined ? Number.parseFloat(state) : null;
  const isBinaryNumeric = isNumeric && !rawUnit && (numericState === 0 || numericState === 1);
  const isBinaryLike = isOnOff || isBinaryNumeric;
  const kind = inferUnitKind(deviceClass, rawUnit);
  const unitMode: EffectiveUnitMode = kind ? displayUnitMode(kind, rawUnit, haConfig) : 'metric';
  const numericValue =
    numericState !== null && !isBinaryNumeric && kind
      ? convertValueByKind(numericState, { kind, fromUnit: rawUnit, unitMode })
      : numericState;
  const unit =
    config.statusMode === 'text'
      ? ''
      : isNumeric && !isBinaryNumeric && kind
        ? getDisplayUnitForKind(kind, unitMode)
        : rawUnit;
  const isActiveState = isOnOff ? state === 'on' : isBinaryNumeric ? numericState === 1 : false;

  const binaryText =
    domain === 'binary_sensor' && isOnOff && state
      ? (BINARY_STATE_LABELS[deviceClass ?? '']?.[state as 'on' | 'off'] ??
        (state === 'on' ? 'Acceso' : 'Spento'))
      : null;
  const toggleText =
    isOnOff && TOGGLE_LABEL_DOMAINS.includes(domain) ? (state === 'on' ? 'Acceso' : 'Spento') : null;
  const sceneText = config.statusMode === 'auto' && domain === 'scene' ? 'Scena' : null;
  const buttonText =
    config.statusMode === 'auto' && ['button', 'input_button'].includes(domain) ? 'Pulsante' : null;
  const customScript = String(readKey(settings, 'scriptStatusText') ?? '').trim();
  const scriptText =
    config.statusMode === 'auto' && domain === 'script'
      ? customScript || (state === 'on' ? 'In esecuzione' : 'Pronto')
      : null;
  const automatic = isNumeric
    ? italianNumber(formatUnitValue(numericValue, { fallback: '--' }))
    : (binaryText ??
      toggleText ??
      sceneText ??
      buttonText ??
      scriptText ??
      (state !== undefined ? (GENERIC_STATE_LABELS[state.toLowerCase()] ?? state) : undefined));
  const displayState =
    config.statusMode === 'text' ? config.statusText || (automatic ?? '--') : (automatic ?? '--');

  const variantRaw = readKey(settings, 'sensorVariant');
  const variant: SensorVariant =
    variantRaw === 'gauge' || variantRaw === 'donut' || variantRaw === 'bar' || variantRaw === 'number'
      ? variantRaw
      : 'default';
  const isRangeVariant = variant === 'gauge' || variant === 'donut' || variant === 'bar';
  const valueMode = readKey(settings, 'sensorValueMode') === 'percent' ? 'percent' : 'actual';
  let chartMin = 0;
  let chartMax = 100;
  if (isNumeric && numericState !== null && isRangeVariant) {
    chartMin =
      resolveRangeValue(
        readKey(settings, 'sensorMinType') ?? 'value',
        readKey(settings, 'sensorMin'),
        readKey(settings, 'sensorMinEntity'),
        entities,
        haConfig
      ) ?? 0;
    chartMax =
      resolveRangeValue(
        readKey(settings, 'sensorMaxType') ?? 'value',
        readKey(settings, 'sensorMax'),
        readKey(settings, 'sensorMaxEntity'),
        entities,
        haConfig
      ) ?? 100;
  }
  const safeMax = chartMax <= chartMin ? chartMin + 1 : chartMax;
  const normalized = numericValue;
  const chartValue =
    variant !== 'default' && isNumeric && normalized !== null
      ? valueMode === 'percent'
        ? Math.max(0, Math.min(100, ((normalized - chartMin) / (safeMax - chartMin || 1)) * 100))
        : normalized
      : null;
  const chartDisplay =
    valueMode === 'percent' && chartValue !== null
      ? `${Math.round(chartValue)}%`
      : isNumeric
        ? italianNumber(formatUnitValue(normalized, { fallback: displayState }))
        : displayState;

  const useThresholds = readKey(settings, 'sensorUseColorThresholds') !== false;
  const storedThresholds = readKey(settings, 'sensorColorThresholds');
  const thresholds = (
    Array.isArray(storedThresholds) && storedThresholds.length === 3
      ? storedThresholds
      : DEFAULT_THRESHOLDS
  )
    .map((item: unknown, index) => {
      const limit = Number.parseFloat(String(readKey(item, 'limit')));
      const color = readKey(item, 'color');
      return {
        limit: Number.isFinite(limit) ? limit : (DEFAULT_THRESHOLDS[index]?.limit ?? 100),
        color: typeof color === 'string' ? color : (DEFAULT_THRESHOLDS[index]?.color ?? 'green'),
      };
    })
    .sort((a, b) => a.limit - b.limit);
  const thresholdInput = valueMode === 'percent' ? chartValue : normalized;
  let thresholdTone: ThresholdTone = 'active';
  if (useThresholds && isRangeVariant && thresholdInput !== null && Number.isFinite(thresholdInput)) {
    const match =
      thresholds.find((threshold) => thresholdInput <= threshold.limit) ??
      thresholds[thresholds.length - 1];
    thresholdTone = THRESHOLD_TONES[match?.color ?? ''] ?? 'active';
  }

  const showControls = readKey(settings, 'showControls') !== false;
  const showStatus = config.statusMode !== 'hidden';
  const graphAllowed =
    isNumeric &&
    showStatus &&
    config.statusMode !== 'attribute' &&
    domain !== 'input_number' &&
    readKey(settings, 'showGraph') !== false &&
    variant === 'default';
  const showVariant =
    variant !== 'default' &&
    canSensorUseNumericVariants(config, displayEntity, entity) &&
    showStatus &&
    (variant === 'number' || (isNumeric && normalized !== null));

  const action = config.action;
  const managedAction =
    !action.isAutomatic ||
    Boolean(action.label || action.labelOn || action.labelOff || action.icon) ||
    action.trigger !== 'button' ||
    action.entityId !== entity.entity_id ||
    MANAGED_DOMAINS.includes(primaryDomain);
  const isToggleDomain = !managedAction && TOGGLE_DOMAINS.includes(primaryDomain);
  const actionActive = isSensorEntityActive(action.targetEntity);
  const targetState = action.targetEntity?.state;
  const actionUnavailable =
    action.type !== 'service' &&
    !!action.entityId &&
    (!action.targetEntity ||
      !action.targetSupported ||
      targetState === 'unavailable' ||
      (targetState === 'unknown' && ['toggle', 'turn_on', 'turn_off'].includes(action.type)));
  const actionIcon: ControlIconName =
    aliasIcon(action.icon) ??
    (['toggle', 'turn_on', 'turn_off'].includes(action.type)
      ? 'power'
      : action.type === 'more-info'
        ? 'chevronRight'
        : 'play');
  const isSelectDomain = primaryDomain === 'select' || primaryDomain === 'input_select';
  const options = entity.attributes?.options;

  return {
    config,
    primaryDomain,
    displayEntity,
    state,
    domain,
    deviceClass,
    isNumeric,
    isUnavailable,
    isBinaryLike,
    isActiveState,
    numericValue: normalized,
    displayState,
    unit,
    variant,
    valueMode,
    isRangeVariant,
    chartMin,
    chartMax: safeMax,
    chartValue,
    chartDisplay,
    thresholdTone,
    showControls,
    showName: readKey(settings, 'showName') !== false,
    showIcon: readKey(settings, 'showIcon') !== false,
    showStatus,
    graphAllowed,
    showVariant,
    isSelectDomain,
    selectOptions: Array.isArray(options)
      ? options.filter((option): option is string => typeof option === 'string')
      : [],
    managedAction,
    isToggleDomain,
    actionActive,
    actionUnavailable,
    actionLabel: actionLabelOf(config, actionActive),
    actionIcon,
    icon: defaultIcon(primaryDomain, deviceClass),
  };
}
