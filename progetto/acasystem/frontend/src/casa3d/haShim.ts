/**
 * Read-only Home Assistant adapter for the Casa 3D bundle (ADR-0014, T3).
 *
 * The Casa 3D elements expect the `hass` object of the Home Assistant frontend. Acasystem has no
 * such object: it holds a websocket connection (through the `/ha` proxy), the entity map, the
 * signed-in user and the system config. This module builds the object from them, and nothing
 * else: it takes plain data and callbacks, so it is tested without a browser or React.
 *
 * Rules of this step:
 * - Nothing can be switched while the switch of `commandSwitch.ts` is off (it is, until step R7):
 *   every `callService` is refused, whatever the host gives.
 * - Otherwise nothing can be switched unless the host gives `commands` (T7): the page does so only
 *   for Esplora. `callService` is present (the bundle calls it from its taps) and rejects with
 *   `Casa3dReadOnlyError` when there are no commands or their barrier is closed (`isOpen`);
 *   when it is open the call goes to the command path of the page (`commandPath.ts`), which lets
 *   through a closed list of services and asks first for the risky ones. Home Assistant gets
 *   nothing else from here: `callWS` and the subscriptions stay read-only. `callApi`,
 *   `fetchWithAuth` and `sendWS` do not exist, so the code paths that need them stay off.
 * - `callWS` and `subscribeMessage` let only reading commands through (a closed list); every other
 *   command is refused. The plan commands (`casa3d/*`) never reach Home Assistant: with a plan API
 *   (T6, `planApi.ts`) they go to the REST routes of the Acasystem backend, which alone writes the
 *   plan; without one they are answered locally from the plan the host provides (the example plan
 *   of the page and of the test page), read-only.
 * - No user (not loaded yet, or refused) means not an administrator.
 * - Pictures come from Home Assistant through `/ha` only: a picture address outside Home
 *   Assistant (cover art on another host) is dropped, so the page never calls a third party.
 */
import type { EntityMap, HaConfig, HaMessageConnection, HaUser } from '@/@types/ha';
import { isRecord } from '@/validators/guards';
import type {
  Casa3dArea,
  Casa3dDevice,
  Casa3dEntity,
  Casa3dEntityEntry,
  Casa3dFloor,
  Casa3dHass,
  Casa3dRegistries,
} from './contract';
import { casa3dCommandsEnabled } from './commandSwitch';
import type { Casa3dPlanApi } from './planApi';
import type { Casa3dCallOptions } from './contract';

export type { Casa3dHass, Casa3dRegistries } from './contract';

/** Language of the interface: Italian only (ADR-0014, D10). */
export const CASA3D_LANGUAGE = 'it';

/** Why a command did not go out: the adapter does not take commands now (outside Esplora, T7). */
export class Casa3dReadOnlyError extends Error {
  readonly code = 'read_only';
  readonly what: string;

  constructor(what: string) {
    super(`Casa 3D è in sola lettura: ${what}`);
    this.name = 'Casa3dReadOnlyError';
    this.what = what;
  }
}

/** Websocket commands that only read and that the views use (a closed list). */
export const READ_COMMANDS: ReadonlySet<string> = new Set([
  'energy/get_prefs',
  'history/history_during_period',
  'recorder/statistics_during_period',
]);

/** Plan commands answered by the host instead of Home Assistant (see `Casa3dPlan`). */
const PLAN_READS = new Set(['casa3d/building/get', 'casa3d/packs/list', 'casa3d/history/list']);
const PLAN_SUBSCRIPTIONS = new Set(['casa3d/building/subscribe']);

/** A plan the host provides in place of the backend one (the example plan): read-only, never saved. */
export interface Casa3dPlan {
  /** The building as the bundle's model reads it (normalised by the bundle). */
  building: unknown;
  packs?: unknown[];
  revision?: number;
}

/** The commands the page lets through (T7): the second barrier, after the one of the shell. */
export interface Casa3dCommands {
  /** True only while the page is in Esplora and still; read at every call. */
  isOpen: () => boolean;
  /** The command path: the closed list of services, the questions, the limit of 350 ms. */
  run: (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    options?: Casa3dCallOptions
  ) => Promise<unknown>;
}

export interface Casa3dHassInput {
  states: EntityMap;
  registries: Casa3dRegistries;
  /** The signed-in Home Assistant user; null while unknown or when Home Assistant refused it. */
  user: HaUser | null;
  config: HaConfig | null;
  /** The websocket connection of the app; null while there is none. */
  conn: HaMessageConnection | null;
  /** Address of Home Assistant seen by the browser: origin and path of the proxy, no trailing slash. */
  hassUrl: string;
  plan?: Casa3dPlan | null;
  /**
   * The plan commands as REST calls to the Acasystem backend (T6). When it is given it answers
   * every `casa3d/*` command it handles, and `plan` is not used for them.
   */
  planApi?: Casa3dPlanApi | null;
  /** Called with what was refused (a service call or a command), to tell the person. */
  onRefused?: (what: string) => void;
  /** Present only on the Casa 3D page: without it, with the barrier closed or the switch off (commandSwitch.ts), every service call is refused. */
  commands?: Casa3dCommands | null;
}

export const EMPTY_REGISTRIES: Casa3dRegistries = {
  areas: {},
  floors: {},
  devices: {},
  entities: {},
};

// ── Pictures ────────────────────────────────────────────────────────────────

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * The address a picture attribute is shown from, or null when it must not be shown. A path of Home
 * Assistant (`/api/camera_proxy/...`) goes under the proxy; a full address is kept only on the app's
 * own origin; a `data:image/` address is kept; anything else (another host, a protocol-relative
 * address, a script address) is dropped.
 */
export function rewriteEntityPicture(value: unknown, hassUrl: string): string | null {
  if (typeof value !== 'string') return null;
  const picture = value.trim();
  if (!picture) return null;
  const base = stripTrailingSlash(hassUrl);
  if (picture.startsWith('//')) return null;
  if (picture.startsWith('/')) return `${base}${picture}`;
  if (/^data:image\//i.test(picture)) return picture;
  if (/^https?:\/\//i.test(picture)) {
    const own = originOf(base);
    return own !== null && originOf(picture) === own ? picture : null;
  }
  return null;
}

interface CachedEntity {
  hassUrl: string;
  out: Casa3dEntity;
}

/** The same source object keeps the same result, so the 3D view (which compares objects) sees only real changes. */
const entityCache = new WeakMap<object, CachedEntity>();

function withPicture(state: Casa3dEntity, hassUrl: string): Casa3dEntity {
  const attrs = state.attributes;
  if (!attrs || !('entity_picture' in attrs)) return state;
  const cached = entityCache.get(state);
  if (cached && cached.hassUrl === hassUrl) return cached.out;
  // Media players: when the cover is on another host, Home Assistant's own proxy of it is used.
  const picture =
    rewriteEntityPicture(attrs.entity_picture, hassUrl) ??
    rewriteEntityPicture(attrs.entity_picture_local, hassUrl);
  const attributes = { ...attrs };
  if (picture === null) delete attributes.entity_picture;
  else attributes.entity_picture = picture;
  const out = { ...state, attributes };
  entityCache.set(state, { hassUrl, out });
  return out;
}

/** The entity map with every picture address made safe; entities without a picture are the same objects. */
export function mapStates(states: EntityMap, hassUrl: string): Record<string, Casa3dEntity> {
  const out: Record<string, Casa3dEntity> = {};
  for (const id of Object.keys(states)) {
    const state = states[id];
    if (state) out[id] = withPicture(state as Casa3dEntity, hassUrl);
  }
  return out;
}

// ── Registries ──────────────────────────────────────────────────────────────

const str = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const optionalStr = (value: unknown): string | null | undefined =>
  value === null ? null : typeof value === 'string' ? value : undefined;

/** `config/area_registry/list`. */
export function parseAreas(raw: unknown): Record<string, Casa3dArea> {
  const out: Record<string, Casa3dArea> = {};
  if (!Array.isArray(raw)) return out;
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = str(item.area_id);
    if (!id) continue;
    out[id] = { area_id: id, name: str(item.name) ?? id, floor_id: optionalStr(item.floor_id) };
  }
  return out;
}

/** `config/floor_registry/list`. */
export function parseFloors(raw: unknown): Record<string, Casa3dFloor> {
  const out: Record<string, Casa3dFloor> = {};
  if (!Array.isArray(raw)) return out;
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = str(item.floor_id);
    if (!id) continue;
    out[id] = {
      floor_id: id,
      name: str(item.name) ?? id,
      level: typeof item.level === 'number' && Number.isFinite(item.level) ? item.level : null,
    };
  }
  return out;
}

/** `config/device_registry/list`. */
export function parseDevices(raw: unknown): Record<string, Casa3dDevice> {
  const out: Record<string, Casa3dDevice> = {};
  if (!Array.isArray(raw)) return out;
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = str(item.id);
    if (!id) continue;
    out[id] = {
      id,
      area_id: optionalStr(item.area_id),
      name: optionalStr(item.name),
      name_by_user: optionalStr(item.name_by_user),
    };
  }
  return out;
}

/** Category names by index: `{ "0": "config" }`, or the reverse `{ config: 0 }`. */
function categoryNames(raw: unknown): Record<string, 'config' | 'diagnostic'> {
  const names: Record<string, 'config' | 'diagnostic'> = {};
  if (!isRecord(raw)) return names;
  for (const [key, value] of Object.entries(raw)) {
    if (value === 'config' || value === 'diagnostic') names[key] = value;
    else if (typeof value === 'number' && (key === 'config' || key === 'diagnostic'))
      names[String(value)] = key;
  }
  return names;
}

/**
 * `config/entity_registry/list_for_display`: the compact form that every user may read (the full
 * `config/entity_registry/list` is for administrators). Keys: `ei` entity, `di` device, `ai` area,
 * `en` name, `ec` category index, `hb` hidden, `tk` translation key, `dp` display precision.
 */
export function parseEntityDisplay(raw: unknown): Record<string, Casa3dEntityEntry> {
  const out: Record<string, Casa3dEntityEntry> = {};
  if (!isRecord(raw) || !Array.isArray(raw.entities)) return out;
  const categories = categoryNames(raw.entity_categories);
  for (const item of raw.entities) {
    if (!isRecord(item)) continue;
    const id = str(item.ei);
    if (!id) continue;
    const category = typeof item.ec === 'number' ? categories[String(item.ec)] : undefined;
    out[id] = {
      entity_id: id,
      name: optionalStr(item.en),
      device_id: optionalStr(item.di),
      area_id: optionalStr(item.ai),
      hidden: Boolean(item.hb),
      entity_category: category ?? null,
      translation_key: optionalStr(item.tk),
      display_precision: typeof item.dp === 'number' && Number.isFinite(item.dp) ? item.dp : null,
    };
  }
  return out;
}

export type RegistryName = keyof Casa3dRegistries;

export interface LoadedRegistries {
  registries: Casa3dRegistries;
  /** Registries Home Assistant refused or could not deliver (a user without the right to read them). */
  failed: RegistryName[];
}

const REGISTRY_COMMANDS: { name: RegistryName; type: string; parse: (raw: unknown) => unknown }[] =
  [
    { name: 'areas', type: 'config/area_registry/list', parse: parseAreas },
    { name: 'floors', type: 'config/floor_registry/list', parse: parseFloors },
    { name: 'devices', type: 'config/device_registry/list', parse: parseDevices },
    {
      name: 'entities',
      type: 'config/entity_registry/list_for_display',
      parse: parseEntityDisplay,
    },
  ];

/**
 * Reads the four registries once. A refusal of one (a user who may not read it, an old Home
 * Assistant) leaves that registry empty and is reported in `failed`: the others still load, and
 * the views then work with what the entity states carry.
 */
export async function loadRegistries(conn: HaMessageConnection): Promise<LoadedRegistries> {
  const registries: Casa3dRegistries = { areas: {}, floors: {}, devices: {}, entities: {} };
  const failed: RegistryName[] = [];
  const results = await Promise.allSettled(
    REGISTRY_COMMANDS.map(({ type }) => conn.sendMessagePromise({ type }))
  );
  REGISTRY_COMMANDS.forEach(({ name, parse }, index) => {
    const result = results[index];
    if (result?.status === 'fulfilled') {
      (registries as unknown as Record<RegistryName, unknown>)[name] = parse(result.value);
    } else {
      failed.push(name);
    }
  });
  return { registries, failed };
}

// ── The hass object ─────────────────────────────────────────────────────────

function hassConfig(config: HaConfig | null): Casa3dHass['config'] {
  const out: Casa3dHass['config'] = {};
  if (!config) return out;
  const units = isRecord(config.unit_system) ? config.unit_system : {};
  const temperature =
    typeof units.temperature === 'string' ? units.temperature : str(config.temperature_unit);
  const length = typeof units.length === 'string' ? units.length : str(config.length_unit);
  if (temperature || length) {
    out.unit_system = {};
    if (temperature) out.unit_system.temperature = temperature;
    if (length) out.unit_system.length = length;
  }
  if (typeof config.latitude === 'number') out.latitude = config.latitude;
  if (typeof config.longitude === 'number') out.longitude = config.longitude;
  if (typeof config.time_zone === 'string') out.time_zone = config.time_zone;
  return out;
}

/** A rejection nobody awaits (the bundle calls `void hass.callService(...)`) must not become an unhandled one. */
function refuse(what: string, onRefused?: (what: string) => void): Promise<never> {
  try {
    onRefused?.(what);
  } catch {
    // A faulty listener must not turn a refusal into a crash.
  }
  const rejection = Promise.reject<never>(new Casa3dReadOnlyError(what));
  rejection.catch(() => undefined);
  return rejection;
}

function notFound(what: string): Promise<never> {
  const rejection = Promise.reject<never>(Object.assign(new Error(what), { code: 'not_found' }));
  rejection.catch(() => undefined);
  return rejection;
}

/** Answers the plan commands from the host's plan; undefined when the command is not a plan command. */
function answerPlan(
  type: string,
  plan: Casa3dPlan | null | undefined
): Promise<unknown> | undefined {
  if (!PLAN_READS.has(type) && type !== 'casa3d/image/get') return undefined;
  if (type === 'casa3d/building/get') {
    return plan
      ? Promise.resolve({ building: plan.building, revision: plan.revision ?? 1, version: 'prova' })
      : notFound(type);
  }
  if (type === 'casa3d/packs/list') return Promise.resolve({ packs: plan?.packs ?? [] });
  if (type === 'casa3d/history/list') return Promise.resolve({ snapshots: [] });
  return notFound(type);
}

/**
 * The `hass` object of the Casa 3D elements, read-only. Call it again when the states, the
 * registries, the user or the config change; the pictures of unchanged entities keep their object.
 */
export function createCasa3dHass(input: Casa3dHassInput): Casa3dHass {
  const { conn, plan, planApi, onRefused, commands } = input;
  const hassUrl = stripTrailingSlash(input.hassUrl);

  const callWS = <T>(msg: Record<string, unknown>): Promise<T> => {
    const type = typeof msg.type === 'string' ? msg.type : '';
    // The plan lives in the Acasystem backend, never in Home Assistant.
    if (planApi?.handles(type)) return planApi.call<T>(msg);
    const local = answerPlan(type, plan);
    if (local) return local as Promise<T>;
    if (!READ_COMMANDS.has(type)) return refuse(type || 'comando senza tipo', onRefused);
    if (!conn) return Promise.reject(new Error('Nessuna connessione a Home Assistant'));
    return conn.sendMessagePromise(msg as { type: string }) as Promise<T>;
  };

  const subscribeMessage = <T>(
    callback: (msg: T) => void,
    msg: Record<string, unknown>
  ): Promise<() => Promise<void>> => {
    const type = typeof msg.type === 'string' ? msg.type : '';
    if (planApi?.handles(type)) return planApi.subscribe<T>(callback, msg);
    // A plan the host provides does not change under the view: nothing to follow.
    if (PLAN_SUBSCRIPTIONS.has(type)) return Promise.resolve(() => Promise.resolve());
    return refuse(type || 'sottoscrizione senza tipo', onRefused);
  };

  const user = input.user;
  return {
    language: CASA3D_LANGUAGE,
    user: { is_admin: user?.is_admin === true, name: user?.name ?? '' },
    areas: input.registries.areas,
    floors: input.registries.floors,
    entities: input.registries.entities,
    devices: input.registries.devices,
    states: mapStates(input.states, hassUrl),
    config: hassConfig(input.config),
    connection: { subscribeMessage },
    callWS,
    callService: (
      domain: string,
      service: string,
      data?: Record<string, unknown>,
      options?: Casa3dCallOptions
    ) => {
      // The barrier is read now, not when the object was made: Esplora can end after the view got it.
      // The switch is read now too: off, nothing goes to Home Assistant (read-only until R7).
      if (casa3dCommandsEnabled() && commands?.isOpen()) {
        return commands.run(domain, service, data, options);
      }
      return refuse(`${domain}.${service}`, onRefused);
    },
  };
}
