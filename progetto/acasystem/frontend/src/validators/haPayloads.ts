/**
 * Validatori delle risposte di Home Assistant (WebSocket e REST).
 * Ogni guardia controlla che i campi noti, se presenti, abbiano il tipo
 * documentato da HA; i campi aggiuntivi restano `unknown`.
 */
import type {
  HaAreaEntry,
  HaCalendarEvent,
  HaDeviceRegistryEntry,
  HaEntityRegistryEntry,
  HaForecastEntry,
  HaHistoryEntry,
  HaStatistic,
  HaTodoItem,
} from '@/@types/ha';
import { isObject, isRecord, type UnknownRecord } from './guards';

export type {
  HaCalendarEvent,
  HaCalendarEvents,
  HaForecastEntry,
  HaHistoryEntry,
  HaStatistic,
  HaTodoItem,
} from '@/@types/ha';

type FieldKind = 'string' | 'number' | 'boolean' | 'object' | 'numberOrString' | 'stringOrObject';

const matchesKind = (value: unknown, kind: FieldKind): boolean => {
  if (value === undefined || value === null) return true;
  switch (kind) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return isRecord(value);
    case 'numberOrString':
      return typeof value === 'number' || typeof value === 'string';
    case 'stringOrObject':
      return typeof value === 'string' || isRecord(value);
  }
};

const fieldsMatch = (value: UnknownRecord, schema: Record<string, FieldKind>): boolean =>
  Object.entries(schema).every(([field, kind]) => matchesKind(value[field], kind));

// ── Storico ─────────────────────────────────────────────────────────────────

const HISTORY_SCHEMA: Record<string, FieldKind> = {
  entity_id: 'string',
  state: 'string',
  s: 'string',
  attributes: 'object',
  a: 'object',
  last_changed: 'string',
  last_updated: 'string',
  last_reported: 'string',
  timestamp: 'numberOrString',
  lc: 'number',
  lu: 'number',
  l: 'number',
};

export function isHistoryEntry(value: unknown): value is HaHistoryEntry {
  return isRecord(value) && fieldsMatch(value, HISTORY_SCHEMA);
}

// ── Statistiche ─────────────────────────────────────────────────────────────

const STATISTIC_SCHEMA: Record<string, FieldKind> = {
  statistic_id: 'string',
  start: 'numberOrString',
  end: 'numberOrString',
  last_reset: 'numberOrString',
  mean: 'number',
  min: 'number',
  max: 'number',
  state: 'number',
  sum: 'number',
  change: 'number',
};

export function isStatistic(value: unknown): value is HaStatistic {
  return isRecord(value) && fieldsMatch(value, STATISTIC_SCHEMA);
}

// ── Previsioni ──────────────────────────────────────────────────────────────

const FORECAST_SCHEMA: Record<string, FieldKind> = {
  datetime: 'string',
  condition: 'string',
  temperature: 'number',
  templow: 'number',
  precipitation: 'number',
  precipitation_probability: 'number',
  wind_speed: 'number',
  wind_bearing: 'numberOrString',
  humidity: 'number',
  is_daytime: 'boolean',
};

export function isForecastEntry(value: unknown): value is HaForecastEntry {
  return isRecord(value) && fieldsMatch(value, FORECAST_SCHEMA);
}

// ── Calendari ───────────────────────────────────────────────────────────────

const CALENDAR_EVENT_SCHEMA: Record<string, FieldKind> = {
  summary: 'string',
  description: 'string',
  location: 'string',
  start: 'stringOrObject',
  end: 'stringOrObject',
  uid: 'string',
};

export function isCalendarEvent(value: unknown): value is HaCalendarEvent {
  return isRecord(value) && fieldsMatch(value, CALENDAR_EVENT_SCHEMA);
}

// ── Liste di cose da fare ───────────────────────────────────────────────────

const TODO_SCHEMA: Record<string, FieldKind> = {
  uid: 'string',
  summary: 'string',
  status: 'string',
  due: 'string',
  description: 'string',
};

export function isTodoItem(value: unknown): value is HaTodoItem {
  return isRecord(value) && fieldsMatch(value, TODO_SCHEMA);
}

// ── Registri ────────────────────────────────────────────────────────────────

export function isAreaEntry(value: unknown): value is HaAreaEntry {
  return (
    isObject(value) &&
    typeof value.area_id === 'string' &&
    (value.name === undefined || typeof value.name === 'string')
  );
}

export function isEntityRegistryEntry(value: unknown): value is HaEntityRegistryEntry {
  return isObject(value) && typeof value.entity_id === 'string';
}

export function isDeviceRegistryEntry(value: unknown): value is HaDeviceRegistryEntry {
  return isObject(value) && typeof value.id === 'string';
}

const listOf =
  <T>(guard: (value: unknown) => value is T) =>
  (value: unknown): T[] =>
    Array.isArray(value) ? value.filter(guard) : [];

/** Elementi validi di una lista; `[]` se il valore non è una lista. */
export const parseHistoryEntries = listOf(isHistoryEntry);
export const parseStatistics = listOf(isStatistic);
export const parseForecastEntries = listOf(isForecastEntry);
export const parseCalendarEvents = listOf(isCalendarEvent);
export const parseTodoItems = listOf(isTodoItem);
export const parseAreaList = listOf(isAreaEntry);
export const parseEntityRegistry = listOf(isEntityRegistryEntry);
export const parseDeviceRegistry = listOf(isDeviceRegistryEntry);
