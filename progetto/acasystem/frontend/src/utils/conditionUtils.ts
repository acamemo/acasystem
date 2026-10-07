import type { EntityLike, EntityLikeMap } from '@/@types/ha';
import type { VisibilityLogic } from '@/@types/dashboard';
import { isObject, readKey, type UnknownRecord } from '@/validators/guards';

const CONDITION_NUMERIC_OPERATORS = new Set(['>', '<', '>=', '<=', '==']);
const VISIBILITY_LOGIC_VALUES = new Set(['AND', 'OR']);

const ENTITY_SETTING_KEYS = [
  'entityId',
  'entity',
  'sensorId',
  'todoEntityId',
  'todayId',
  'monthId',
  'batteryEntity',
  'deviceTracker',
  'calendarEntity',
  'climateEntity',
  'coverEntity',
  'alarmId',
  'cameraEntity',
  'weatherEntity',
  'weatherId',
  'tempEntity',
  'tempId',
  'remoteEntityId',
  'mediaEntityId',
  'batteryId',
  'rangeId',
  'odometerId',
  'locationId',
  'latitudeId',
  'longitudeId',
  'chargingId',
  'chargingStateId',
  'pluggedId',
  'chargingPowerId',
  'chargeRateId',
  'timeToFullId',
  'chargeEndTimeId',
  'chargeControlId',
  'chargeLimitNumberId',
  'chargeLimitSelectId',
  'climateId',
  'lockId',
  'ignitionSwitchId',
  'engineStatusId',
  'lastUpdatedId',
  'apiStatusId',
  'updateButtonId',
];

const ENTITY_ARRAY_SETTING_KEYS = [
  'entityIds',
  'mediaIds',
  'linkedMediaPlayers',
  'calendars',
  'chargeControlIds',
];

const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+(?:[a-z0-9_\-.]*)$/i;

const DOMAIN_PREFIXES = [
  'light',
  'switch',
  'sensor',
  'binary_sensor',
  'fan',
  'cover',
  'climate',
  'vacuum',
  'lawn_mower',
  'media_player',
  'camera',
  'person',
  'automation',
  'input_boolean',
  'input_number',
  'lock',
  'button',
];

/** Regola normalizzata: copia della regola salvata con `type` garantito (altri campi da verificare). */
export interface ConditionRule {
  type: string;
  entityId?: unknown;
  states?: unknown;
  attribute?: unknown;
  value?: unknown;
  operator?: unknown;
  forSeconds?: unknown;
  enabled?: unknown;
  logic?: unknown;
  rules?: unknown;
}

export interface NormalizedVisibilityCondition {
  entityId: string | null;
  /** 'AND' | 'OR' dopo la normalizzazione; tipizzato `string` per le configurazioni scritte dalla UI. */
  logic: VisibilityLogic | string;
  enabled: boolean;
  rules: ConditionRule[];
}

/** Lettura di un attributo per id entità (i dati arrivano da HA, quindi `unknown`). */
export type AttributeGetter = (entityId: string | undefined, attribute: string) => unknown;

const isLogic = (value: unknown): value is VisibilityLogic =>
  typeof value === 'string' && VISIBILITY_LOGIC_VALUES.has(value);

const isRuleObject = (rule: unknown): rule is UnknownRecord & ConditionRule =>
  isObject(rule) && typeof rule.type === 'string' && rule.type.trim().length > 0;

export function isConditionConfigured(condition: unknown): boolean {
  const normalized = normalizeVisibilityConditionConfig(condition);
  return normalized.enabled && normalized.rules.length > 0;
}

export function normalizeVisibilityConditionConfig(
  condition: unknown
): NormalizedVisibilityCondition {
  if (!isObject(condition)) {
    return { entityId: null, logic: 'AND', enabled: false, rules: [] };
  }

  if (Array.isArray(condition.rules)) {
    const rules = condition.rules
      .filter(isRuleObject)
      .slice(0, 2)
      .map((rule) => ({ ...rule }));
    const enabled = condition.enabled !== false;

    return {
      entityId: typeof condition.entityId === 'string' ? condition.entityId : null,
      logic: isLogic(condition.logic) ? condition.logic : 'AND',
      enabled,
      rules,
    };
  }

  if (isRuleObject(condition)) {
    return {
      entityId: typeof condition.entityId === 'string' ? condition.entityId : null,
      logic: 'AND',
      enabled: condition.enabled !== false,
      rules: [{ ...condition }],
    };
  }

  return { entityId: null, logic: 'AND', enabled: false, rules: [] };
}

function parseStates(states: unknown): string[] {
  if (Array.isArray(states)) {
    return states.map((state) => String(state).trim()).filter(Boolean);
  }

  if (typeof states === 'string') {
    return states
      .split(',')
      .map((state) => state.trim())
      .filter(Boolean);
  }

  return [];
}

function evaluateNumeric(operator: string, left: number, right: number): boolean {
  switch (operator) {
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
    case '==':
      return left === right;
    default:
      return false;
  }
}

export interface EvaluateEntityConditionInput {
  condition: unknown;
  entity?: EntityLike | null;
  getAttribute?: AttributeGetter;
}

export function evaluateEntityCondition({
  condition,
  entity,
  getAttribute,
}: EvaluateEntityConditionInput): boolean {
  const normalized = normalizeVisibilityConditionConfig(condition);
  const activeRule = normalized.rules[0];
  if (!activeRule) return true;
  if (!entity) return false;

  const { type, states, attribute, value, operator, forSeconds } = activeRule;
  const readAttribute = (name: string): unknown =>
    getAttribute ? getAttribute(entity.entity_id, name) : entity.attributes?.[name];
  const stateMatches = (expectedStates: string[]) =>
    typeof entity.state === 'string' && expectedStates.includes(entity.state);
  let matchesBase = true;

  if (type === 'state') {
    const expectedStates = parseStates(states);
    matchesBase = expectedStates.length === 0 ? true : stateMatches(expectedStates);
  } else if (type === 'not_state') {
    const expectedStates = parseStates(states);
    matchesBase = expectedStates.length === 0 ? true : !stateMatches(expectedStates);
  } else if (type === 'numeric') {
    const sourceValue = attribute ? readAttribute(String(attribute)) : entity.state;
    const numericValue = parseFloat(String(sourceValue));
    const compareValue = parseFloat(String(value));
    const usedOperator =
      typeof operator === 'string' && CONDITION_NUMERIC_OPERATORS.has(operator) ? operator : '>';
    matchesBase = !(Number.isNaN(numericValue) || Number.isNaN(compareValue))
      ? evaluateNumeric(usedOperator, numericValue, compareValue)
      : false;
  } else if (type === 'attribute') {
    const attrName = typeof attribute === 'string' ? attribute.trim() : '';
    if (!attrName) {
      matchesBase = false;
    } else {
      const attrValue = readAttribute(attrName);
      if (value === undefined || value === null || value === '') {
        matchesBase =
          attrValue !== undefined && attrValue !== null && String(attrValue).trim() !== '';
      } else {
        matchesBase = String(attrValue) === String(value);
      }
    }
  }

  if (!matchesBase) return false;

  const durationSeconds = Number(forSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return true;

  const referenceTimestampRaw =
    type === 'attribute' || (type === 'numeric' && attribute)
      ? entity.last_updated || entity.last_changed
      : entity.last_changed;
  if (!referenceTimestampRaw) return false;

  const referenceTimestamp = Date.parse(referenceTimestampRaw);
  if (!Number.isFinite(referenceTimestamp)) return false;

  return Date.now() - referenceTimestamp >= durationSeconds * 1000;
}

export interface EvaluateVisibilityConditionInput {
  condition: unknown;
  entity?: EntityLike | null;
  entities?: EntityLikeMap | null;
  getAttribute?: AttributeGetter;
  fallbackEntityId?: string | null;
}

export function evaluateVisibilityConditionConfig({
  condition,
  entity,
  entities,
  getAttribute,
  fallbackEntityId,
}: EvaluateVisibilityConditionInput): boolean {
  const normalized = normalizeVisibilityConditionConfig(condition);
  if (!normalized.enabled) return true;
  if (normalized.rules.length === 0) return true;
  const resolvedFallbackEntityId = fallbackEntityId || entity?.entity_id || null;

  const resolveRuleEntity = (rule: ConditionRule): EntityLike | null => {
    const explicitRuleEntityId =
      typeof rule?.entityId === 'string' && rule.entityId.trim() ? rule.entityId.trim() : null;
    const explicitConfigEntityId =
      typeof normalized.entityId === 'string' && normalized.entityId.trim()
        ? normalized.entityId.trim()
        : null;
    const targetEntityId =
      explicitRuleEntityId || explicitConfigEntityId || resolvedFallbackEntityId;

    const targetEntity = targetEntityId && entities ? entities[targetEntityId] : null;
    if (targetEntity) {
      return targetEntity;
    }

    if (entity && (!targetEntityId || entity.entity_id === targetEntityId)) {
      return entity;
    }

    return null;
  };

  const results = normalized.rules.map((rule) =>
    evaluateEntityCondition({
      condition: rule,
      entity: resolveRuleEntity(rule),
      getAttribute,
    })
  );
  if (results.length === 1) return results[0];

  if (normalized.logic === 'OR') {
    return results.some(Boolean);
  }

  return results.every(Boolean);
}

function toEntityIdFromDomainPrefix(cardId: string): string | null {
  for (const domain of DOMAIN_PREFIXES) {
    const prefix = `${domain}_`;
    if (!cardId.startsWith(prefix)) continue;
    const suffix = cardId.slice(prefix.length);
    if (!suffix) return null;
    return `${domain}.${suffix}`;
  }
  return null;
}

function isLikelyEntityId(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes('.')) return false;
  return ENTITY_ID_PATTERN.test(trimmed);
}

function pickEntityLikeValue(
  value: unknown,
  entities: EntityLikeMap | null | undefined
): string | null {
  if (typeof value === 'string') {
    const candidate = value.trim();
    if (!candidate || !isLikelyEntityId(candidate)) return null;
    if (entities && Object.keys(entities).length > 0 && !entities[candidate]) return null;
    return candidate;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = pickEntityLikeValue(item, entities);
      if (found) return found;
    }
  }

  return null;
}

export function resolveConditionEntityId(
  cardId: unknown,
  cardSettings: unknown = {},
  entities: EntityLikeMap = {}
): string | null {
  const condition = readKey(cardSettings, 'visibilityCondition');
  const conditionEntityId = readKey(condition, 'entityId');
  if (typeof conditionEntityId === 'string' && conditionEntityId.trim()) {
    return conditionEntityId.trim();
  }

  for (const key of ENTITY_SETTING_KEYS) {
    const candidate = readKey(cardSettings, key);
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const key of ENTITY_ARRAY_SETTING_KEYS) {
    const list = readKey(cardSettings, key);
    if (!Array.isArray(list)) continue;
    const first: unknown = list.find((item) => typeof item === 'string' && item.trim());
    if (typeof first === 'string') return first.trim();
  }

  if (isObject(cardSettings)) {
    for (const value of Object.values(cardSettings)) {
      const fromSetting = pickEntityLikeValue(value, entities);
      if (fromSetting) return fromSetting;
    }
  }

  if (typeof cardId === 'string' && cardId.includes('.')) {
    return cardId;
  }

  if (typeof cardId === 'string') {
    const converted = toEntityIdFromDomainPrefix(cardId);
    if (converted && (entities[converted] || !Object.keys(entities).length)) return converted;
  }

  return null;
}
