/**
 * Tipi Home Assistant usati dal nucleo. Le entità e la connessione arrivano da
 * home-assistant-js-websocket; le forme «Like» descrivono gli input tolleranti
 * delle funzioni pure (entità parziali, sintetiche o di test).
 */
import type {
  Auth,
  AuthData,
  Connection,
  HassConfig,
  HassEntities,
  HassEntity,
} from 'home-assistant-js-websocket';

export type { Auth, AuthData, Connection, HassConfig, HassEntities, HassEntity };

/** Mappa delle entità pubblicata dal contesto Home Assistant. */
export type EntityMap = HassEntities;

/** Entità parziale accettata dalle funzioni pure. */
export interface EntityLike {
  entity_id?: string;
  state?: string;
  attributes?: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

/** Mappa di entità parziali; i valori mancanti sono ammessi. */
export type EntityLikeMap = Record<string, EntityLike | null | undefined>;

/**
 * Configurazione di sistema di HA (`get_config`): i campi letti dalle card,
 * compresi quelli legacy (`temperature_unit`, `length_unit`).
 */
export interface HaConfig {
  unit_system?: Partial<HassConfig['unit_system']>;
  temperature_unit?: string;
  length_unit?: string;
  currency?: string;
  language?: string;
  time_zone?: string;
  location_name?: string;
  country?: string | null;
  [key: string]: unknown;
}

export interface HaUser {
  id?: string;
  name?: string;
  is_owner?: boolean;
  is_admin?: boolean;
}

/** Messaggio WebSocket verso HA. */
export interface HaMessage {
  type: string;
  [key: string]: unknown;
}

/** Sottoinsieme della connessione HA usato dai client: basta `sendMessagePromise`. */
export interface HaMessageConnection {
  /** A retained HA connection may have a closed socket: never enqueue requests then. */
  readonly connected?: boolean;
  sendMessagePromise: (message: HaMessage) => Promise<unknown>;
}

/** Target di una chiamata di servizio. */
export interface ServiceTarget {
  entity_id?: string | string[];
  device_id?: string | string[];
  area_id?: string | string[];
  [key: string]: unknown;
}

/** Dati di una chiamata di servizio; `target` viene separato prima dell'invio. */
export interface ServiceData {
  target?: ServiceTarget;
  entity_id?: unknown;
  [key: string]: unknown;
}

export type CallService = (domain: string, service: string, data?: ServiceData) => Promise<unknown>;

/** Voce del registro aree (`config/area_registry/list`). */
export interface HaAreaEntry {
  area_id: string;
  name?: string;
  [key: string]: unknown;
}

/** Voce del registro entità (`config/entity_registry/list`). */
export interface HaEntityRegistryEntry {
  entity_id: string;
  [key: string]: unknown;
}

/** Voce del registro dispositivi (`config/device_registry/list`). */
export interface HaDeviceRegistryEntry {
  id: string;
  [key: string]: unknown;
}

// ── Risposte di Home Assistant (forme documentate; guardie in validators/haPayloads) ──

type UnknownRecord = Record<string, unknown>;

/** Voce dello storico, formato completo o compresso (`s`, `a`, `lc`, `lu`). */
export interface HaHistoryEntry {
  entity_id?: string | null;
  state?: string | null;
  s?: string | null;
  attributes?: UnknownRecord | null;
  a?: UnknownRecord | null;
  last_changed?: string | null;
  last_updated?: string | null;
  last_reported?: string | null;
  timestamp?: string | number | null;
  lc?: number | null;
  lu?: number | null;
  l?: number | null;
  [key: string]: unknown;
}

export interface HaStatistic {
  statistic_id?: string | null;
  start?: number | string | null;
  end?: number | string | null;
  last_reset?: number | string | null;
  mean?: number | null;
  min?: number | null;
  max?: number | null;
  state?: number | null;
  sum?: number | null;
  change?: number | null;
  [key: string]: unknown;
}

export interface HaForecastEntry {
  datetime?: string | null;
  condition?: string | null;
  temperature?: number | null;
  templow?: number | null;
  precipitation?: number | null;
  precipitation_probability?: number | null;
  wind_speed?: number | null;
  wind_bearing?: number | string | null;
  humidity?: number | null;
  is_daytime?: boolean | null;
  [key: string]: unknown;
}

export interface HaCalendarEvent {
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: string | UnknownRecord | null;
  end?: string | UnknownRecord | null;
  uid?: string | null;
  [key: string]: unknown;
}

export interface HaCalendarEvents {
  events: HaCalendarEvent[];
  [key: string]: unknown;
}

export interface HaTodoItem {
  uid?: string | null;
  summary?: string | null;
  status?: string | null;
  due?: string | null;
  description?: string | null;
  [key: string]: unknown;
}
