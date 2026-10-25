// Lightweight HA WebSocket client helpers
// All functions assume a valid Home Assistant connection `conn`
// via home-assistant-js-websocket createConnection.

import type {
  HaAreaEntry,
  HaCalendarEvents,
  HaDeviceRegistryEntry,
  HaEntityRegistryEntry,
  HaForecastEntry,
  HaHistoryEntry,
  HaMessage,
  HaMessageConnection,
  HaStatistic,
  HaTodoItem,
  ServiceData,
} from '@/@types/ha';
import { isObject, readKey, type UnknownRecord } from '@/validators/guards';
import {
  parseAreaList,
  parseCalendarEvents,
  parseDeviceRegistry,
  parseEntityRegistry,
  parseForecastEntries,
  parseHistoryEntries,
  parseStatistics,
  parseTodoItems,
} from '@/validators/haPayloads';

export type {
  HaCalendarEvent,
  HaCalendarEvents,
  HaForecastEntry,
  HaHistoryEntry,
  HaStatistic,
  HaTodoItem,
} from '@/@types/ha';

type MaybeConnection = HaMessageConnection | null | undefined;

const isUsableConnection = (conn: MaybeConnection): conn is HaMessageConnection =>
  Boolean(conn) && conn?.connected !== false && typeof conn?.sendMessagePromise === 'function';

function requireConnection(conn: MaybeConnection): HaMessageConnection {
  if (!isUsableConnection(conn)) {
    throw new Error('Invalid or disconnected HA connection');
  }
  return conn;
}

export function callService(
  conn: MaybeConnection,
  domain: string,
  service: string,
  service_data?: ServiceData | null
): Promise<unknown> {
  if (!isUsableConnection(conn)) {
    return Promise.reject(new Error('Invalid or disconnected HA connection'));
  }

  const { target, ...restData } = service_data || {};
  const message: HaMessage = {
    type: 'call_service',
    domain,
    service,
  };

  if (target) {
    message.target = target;
    message.service_data = restData;
  } else if (service_data && service_data.entity_id && service === 'clean_area') {
    message.target = { entity_id: service_data.entity_id };
    const { entity_id: _entityId, ...rest } = service_data;
    message.service_data = rest;
  } else {
    message.service_data = service_data;
  }

  return conn.sendMessagePromise(message).catch((error: unknown) => {
    console.error(`Service call failed (${domain}.${service}):`, error);
    throw error;
  });
}

export interface HistoryQuery {
  start: Date;
  end: Date;
  entityId: string;
  minimal_response?: boolean;
  no_attributes?: boolean;
}

export async function getHistory(
  conn: MaybeConnection,
  { start, end, entityId, minimal_response = false, no_attributes = true }: HistoryQuery
): Promise<HaHistoryEntry[]> {
  const connection = requireConnection(conn);
  const res = await connection.sendMessagePromise({
    type: 'history/history_during_period',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    entity_ids: [entityId],
    minimal_response,
    no_attributes,
  });
  let payload: unknown = res;
  if (isObject(payload) && !Array.isArray(payload)) {
    if (Array.isArray(payload.result)) payload = payload.result;
    else if (Array.isArray(payload.response)) payload = payload.response;
    else if (Array.isArray(payload.data)) payload = payload.data;
    else if (Array.isArray(payload.history)) payload = payload.history;
  }

  // Support both object keyed by entity_id and array formats
  let historyData: unknown = payload && readKey(payload, entityId);
  if (!historyData && Array.isArray(payload) && payload.length > 0) {
    historyData = Array.isArray(payload[0]) ? payload[0] : payload;
  }
  return parseHistoryEntries(historyData);
}

export function canUseHistoryRest(
  baseUrl: string | null | undefined,
  currentOrigin: string | undefined = globalThis?.window?.location?.origin
): boolean {
  if (!baseUrl) return false;
  if (!currentOrigin) return true;

  try {
    const targetUrl = new URL(baseUrl, currentOrigin);
    return targetUrl.origin === currentOrigin;
  } catch {
    return false;
  }
}

export interface HistoryRestQuery extends HistoryQuery {
  significant_changes_only?: boolean;
}

export async function getHistoryRest(
  baseUrl: string,
  token: string | null | undefined,
  {
    start,
    end: _end,
    entityId,
    minimal_response = false,
    no_attributes = false,
    significant_changes_only = false,
  }: HistoryRestQuery
): Promise<HaHistoryEntry[]> {
  if (!baseUrl) throw new Error('Missing HA url');
  const root = String(baseUrl).replace(/\/$/, '');
  const startIso = start.toISOString();
  const params = new URLSearchParams({
    filter_entity_id: entityId,
    minimal_response: minimal_response ? '1' : '0',
    no_attributes: no_attributes ? '1' : '0',
    significant_changes_only: significant_changes_only ? '1' : '0',
  });
  const url = `${root}/api/history/period/${startIso}?${params.toString()}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`History REST failed: ${res.status} ${text}`);
  }
  const data: unknown = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return parseHistoryEntries(Array.isArray(data[0]) ? data[0] : data);
  }
  return [];
}

export interface StatisticsQuery {
  start: Date;
  end: Date;
  statisticId: string;
  period?: string;
}

export async function getStatistics(
  conn: MaybeConnection,
  { start, end, statisticId, period = '5minute' }: StatisticsQuery
): Promise<HaStatistic[]> {
  const connection = requireConnection(conn);
  const res = await connection.sendMessagePromise({
    type: 'recorder/statistics_during_period',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    statistic_ids: [statisticId],
    period,
  });
  const stats = res && readKey(res, statisticId);
  return parseStatistics(stats);
}

export interface ForecastQuery {
  entityId: string;
  type?: string;
}

export async function getForecast(
  conn: MaybeConnection,
  { entityId, type = 'hourly' }: ForecastQuery
): Promise<HaForecastEntry[]> {
  const connection = requireConnection(conn);
  const res = await connection.sendMessagePromise({
    type: 'call_service',
    domain: 'weather',
    service: 'get_forecasts',
    target: { entity_id: entityId },
    service_data: { type },
    return_response: true,
  });

  const extractForecast = (obj: unknown): unknown[] | null => {
    if (!isObject(obj)) return null;
    if (Array.isArray(obj.forecast)) return obj.forecast;
    return null;
  };

  const at = (...path: string[]) => path.reduce<unknown>((value, key) => readKey(value, key), res);

  const candidates = [
    at('service_response', 'weather', entityId),
    at('service_response', entityId),
    at('response', 'weather', entityId),
    at('response', entityId),
    at('result', 'weather', entityId),
    at('result', entityId),
    at('weather', entityId),
    at(entityId),
    res,
  ];

  for (const candidate of candidates) {
    const forecast = extractForecast(candidate);
    if (Array.isArray(forecast)) return parseForecastEntries(forecast);
  }

  return [];
}

export interface CalendarQuery {
  start: Date;
  end: Date;
  entityIds: string | string[];
}

export async function getCalendarEvents(
  conn: MaybeConnection,
  { start, end, entityIds }: CalendarQuery
): Promise<Record<string, HaCalendarEvents>> {
  const connection = requireConnection(conn);
  const res = await connection.sendMessagePromise({
    type: 'call_service',
    domain: 'calendar',
    service: 'get_events',
    target: { entity_id: entityIds },
    service_data: {
      start_date_time: start.toISOString(),
      end_date_time: end.toISOString(),
    },
    return_response: true,
  });

  const normalized: Record<string, HaCalendarEvents> = {};
  const addEntries = (obj: unknown) => {
    if (!isObject(obj)) return;
    Object.entries(obj).forEach(([key, value]) => {
      if (isObject(value) && Array.isArray(value.events)) {
        normalized[key] = { ...value, events: parseCalendarEvents(value.events) };
      } else if (Array.isArray(value)) {
        normalized[key] = { events: parseCalendarEvents(value) };
      }
    });
  };

  const at = (...path: string[]) => path.reduce<unknown>((value, key) => readKey(value, key), res);

  // Common response shapes
  addEntries(at('service_response', 'calendar'));
  addEntries(at('service_response'));
  addEntries(at('response', 'calendar'));
  addEntries(at('response'));
  addEntries(at('result', 'calendar'));
  addEntries(at('result'));
  addEntries(at('calendar'));
  addEntries(res);

  // If still empty but single calendar returns events directly
  const directEvents = at('events');
  if (!Object.keys(normalized).length && directEvents && Array.isArray(directEvents)) {
    const key = Array.isArray(entityIds) && entityIds.length === 1 ? entityIds[0] : 'calendar';
    normalized[key] = { events: parseCalendarEvents(directEvents) };
  }

  return normalized;
}

// ─── Todo helpers ─────────────────────────────────────────────

export async function getTodoItems(conn: MaybeConnection, entityId: string): Promise<HaTodoItem[]> {
  const connection = requireConnection(conn);

  // Try the dedicated WebSocket command first (preferred for frontends)
  try {
    const res = await connection.sendMessagePromise({
      type: 'todo/item/list',
      entity_id: entityId,
    });
    const items = readKey(res, 'items');
    if (res && Array.isArray(items)) {
      return parseTodoItems(items);
    }
  } catch {
    // If todo/item/list is not available or fails, fall back to service call
  }

  const res = await connection.sendMessagePromise({
    type: 'call_service',
    domain: 'todo',
    service: 'get_items',
    target: { entity_id: entityId },
    service_data: { status: ['needs_action', 'completed'] },
    return_response: true,
  });

  // HA can wrap the response in several layers
  const extract = (obj: unknown): unknown[] | undefined => {
    if (!isObject(obj)) return undefined;
    if (Array.isArray(obj.items)) return obj.items;
    const inner =
      obj[entityId] || readKey(obj.response, entityId) || readKey(obj.service_response, entityId);
    const innerItems = readKey(inner, 'items');
    if (inner && Array.isArray(innerItems)) return innerItems;
    // Walk first level
    for (const val of Object.values(obj)) {
      const valueItems = readKey(val, 'items');
      if (val && Array.isArray(valueItems)) return valueItems;
    }
    return undefined;
  };

  return parseTodoItems(
    extract(readKey(res, 'service_response')) ??
      extract(readKey(res, 'response')) ??
      extract(readKey(res, 'result')) ??
      extract(res) ??
      []
  );
}

export async function addTodoItem(
  conn: MaybeConnection,
  entityId: string,
  summary: string
): Promise<unknown> {
  const connection = requireConnection(conn);
  return connection.sendMessagePromise({
    type: 'call_service',
    domain: 'todo',
    service: 'add_item',
    target: { entity_id: entityId },
    service_data: { item: summary },
  });
}

export async function updateTodoItem(
  conn: MaybeConnection,
  entityId: string,
  uid: string,
  status: string
): Promise<unknown> {
  const connection = requireConnection(conn);
  return connection.sendMessagePromise({
    type: 'call_service',
    domain: 'todo',
    service: 'update_item',
    target: { entity_id: entityId },
    service_data: { item: uid, status },
  });
}

export async function removeTodoItem(
  conn: MaybeConnection,
  entityId: string,
  uid: string
): Promise<unknown> {
  const connection = requireConnection(conn);
  return connection.sendMessagePromise({
    type: 'call_service',
    domain: 'todo',
    service: 'remove_item',
    target: { entity_id: entityId },
    service_data: { item: uid },
  });
}

// ─── Area / Room registry helpers ─────────────────────────────

const unwrapList = (res: unknown): unknown =>
  Array.isArray(res) ? res : readKey(res, 'result') || [];

export async function getAreas(conn: MaybeConnection): Promise<HaAreaEntry[]> {
  const connection = requireConnection(conn);
  const res = await connection.sendMessagePromise({ type: 'config/area_registry/list' });
  return parseAreaList(unwrapList(res));
}

export async function getDeviceRegistry(conn: MaybeConnection): Promise<HaDeviceRegistryEntry[]> {
  const connection = requireConnection(conn);
  const res = await connection.sendMessagePromise({ type: 'config/device_registry/list' });
  return parseDeviceRegistry(unwrapList(res));
}

export async function getEntityRegistry(conn: MaybeConnection): Promise<HaEntityRegistryEntry[]> {
  const connection = requireConnection(conn);
  const res = await connection.sendMessagePromise({ type: 'config/entity_registry/list' });
  return parseEntityRegistry(unwrapList(res));
}

const configEntryIdsOf = (entry: UnknownRecord): unknown[] =>
  [
    entry.config_entry_id,
    ...(Array.isArray(entry.config_entry_ids) ? entry.config_entry_ids : []),
  ].filter(Boolean);

/**
 * Get related entity IDs for a source entity using HA registry linkage.
 * Relations are determined by shared device_id and/or config entry id.
 */
export async function getRelatedEntityIds(
  conn: MaybeConnection,
  sourceEntityId: string | null | undefined,
  options: { domains?: unknown } = {}
): Promise<string[]> {
  if (!sourceEntityId) return [];

  const domains: unknown[] | null = Array.isArray(options.domains) ? options.domains : null;
  const [entityReg] = await Promise.all([getEntityRegistry(conn)]);
  if (!Array.isArray(entityReg) || entityReg.length === 0) return [];

  const source = entityReg.find((entry) => entry?.entity_id === sourceEntityId);
  if (!source) return [];

  const sourceDeviceId = source.device_id || null;
  const sourceConfigEntries = new Set(configEntryIdsOf(source));

  const related = entityReg.filter((entry) => {
    if (!entry?.entity_id) return false;
    if (entry.disabled_by || entry.hidden_by) return false;

    const sameDevice = sourceDeviceId && entry.device_id === sourceDeviceId;
    const entryConfigIds = configEntryIdsOf(entry);
    const sameConfigEntry =
      sourceConfigEntries.size > 0 &&
      entryConfigIds.some((configId) => sourceConfigEntries.has(configId));

    if (!sameDevice && !sameConfigEntry) return false;

    if (!domains || domains.length === 0) return true;
    return domains.some((domain) => entry.entity_id.startsWith(`${String(domain)}.`));
  });

  return related.map((entry) => entry.entity_id);
}

/**
 * Get all entity IDs that belong to a given area.
 * Resolves via entity registry (direct area_id) and device registry (device -> area).
 */
export async function getEntitiesForArea(conn: MaybeConnection, areaId: string): Promise<string[]> {
  const [entityReg, deviceReg] = await Promise.all([
    getEntityRegistry(conn),
    getDeviceRegistry(conn),
  ]);

  // Devices in the area
  const deviceIds = new Set<unknown>(
    deviceReg.filter((d) => d.area_id === areaId).map((d) => d.id)
  );

  // Entities directly in area OR belonging to a device in the area
  const entityIds = entityReg
    .filter((e) => e.area_id === areaId || (e.device_id && deviceIds.has(e.device_id)))
    .filter((e) => !e.disabled_by && !e.hidden_by)
    .map((e) => e.entity_id);

  return entityIds;
}
