/**
 * Memory of the configuration of a widget per device (ADR-0019).
 *
 * The configuration of a widget (name, icon, settings; never its place or page) belongs to the
 * device it shows. When a widget linked to a device is removed, its configuration is kept here
 * under (widget type, device); when a widget of the same type is linked to that device again,
 * the most recent configuration (the one of another widget on the same device, or the one in
 * memory) is copied once. After the copy the widgets are independent.
 *
 * Everything here is pure: it takes the stored state and returns the new one. Reading and
 * writing the browser storage is done by `widgetStateStorage.ts`.
 */
import type { CardSettings, CardSettingsMap, PagesConfig } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import { CAR_KEYS, kindOf } from '@/templates/sheets/editTarget';
import { isObject } from '@/validators/guards';
import { BINDING_KEYS, categoryEntityId } from './bindingKeys';

/** Storage key of the memory (and of the field of a snapshot, `widgetMemory`). */
export const WIDGET_MEMORY_STORAGE_KEY = 'tunet_widget_memory';
/** At most this many (type, device) entries are kept: the least recently edited go first. */
export const MEMORY_ENTRY_LIMIT = 100;
/** A saved setting whose JSON is longer than this (characters) is not kept (e.g. a picture). */
export const MEMORY_VALUE_LIMIT = 2000;
/** At most this many edit times are kept (they only decide which configuration is newer). */
export const TOUCHED_LIMIT = 400;

/** Said next to every setting of the device in the sheets (ADR-0019). */
export const DEVICE_SCOPE_NOTE = 'Vale per tutti i widget di questo dispositivo';

/**
 * Settings «of the device» (ADR-0019): one value for the device, the same on all its widgets of
 * the same type. A setting is of the device when it says which Home Assistant entities make the
 * device up or how to reach it (associations, camera connection), or is a default sent with
 * every command to it (light transition, Sonos sleep timer): two widgets with different values
 * would contradict each other about the same device. Everything else (name, heading, icon,
 * appearance, tap action, visible controls and their order, status text, graph, labels,
 * decimals, favourite modes, navigation, visibility rules) is of the widget and stays free.
 * The sheets show `DEVICE_SCOPE_NOTE` next to these; the lists follow the settings sheets
 * (`CAR_KEYS`, `VACUUM_MAPPINGS`) and a test checks them against those.
 */
export const DEVICE_SCOPED_SETTINGS: ReadonlySet<string> = new Set([
  // Associations of entities
  'adaptiveBindings',
  'sonosAlarmIds',
  'remoteId',
  'linkedMediaPlayers',
  'roomScripts',
  'batterySensorId',
  'currentRoomSensorId',
  'cleaningTimeSensorId',
  'cleanedAreaSensorId',
  'totalCleanTimeSensorId',
  'totalCleanAreaSensorId',
  'totalCleanCountSensorId',
  'lastCleanStartSensorId',
  'lastCleanEndSensorId',
  'roomSelectEntityId',
  'mopIntensityControlEntityId',
  'mapImageEntityId',
  ...CAR_KEYS.filter((key) => key !== 'batteryId'),
  'chargingStateId',
  'chargingId',
  'chargeControlIds',
  // Connection of a camera
  'cameraStreamEngine',
  'cameraWebrtcUrl',
  'cameraGo2rtcMode',
  'cameraRefreshMode',
  'cameraRefreshInterval',
  'cameraMotionSensor',
  'cameraCastIds',
  'cameraPtz',
  'cameraCaptureDirectory',
  'cameraRecordDuration',
  // Defaults sent with the commands
  'lightTransition',
  'sonosSleepMinutes',
]);

export interface MemoryEntry {
  /** Widget type (`light`, `appletv`…), as `widgetTypeOf` reads it. */
  type: string;
  /** entity_id of the device the widget showed (the first one for a widget of several). */
  deviceKey: string;
  /** When the configuration was last edited (ms since the epoch). */
  updatedAt: number;
  /** Name of the widget when it was removed, for the notice on a copy. */
  label: string | null;
  name?: string;
  icon?: string;
  /** Settings of the widget without the device it is linked to. */
  settings: CardSettings;
}

export interface WidgetMemory {
  entries: Record<string, MemoryEntry>;
  /** Last edit time of the configuration of each widget (by widget id); none: never edited. */
  touched: Record<string, number>;
}

export const emptyWidgetMemory = (): WidgetMemory => ({ entries: {}, touched: {} });

export const memoryKey = (type: string, deviceKey: string): string => `${type}|${deviceKey}`;

// ── Reading what was stored ───────────────────────────────────────────────────────────────

const isTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const keepSmall = (settings: CardSettings): CardSettings => {
  const kept: CardSettings = {};
  for (const [name, value] of Object.entries(settings)) {
    if (value === undefined) continue;
    let size = 0;
    try {
      size = JSON.stringify(value)?.length ?? 0;
    } catch {
      continue;
    }
    if (size <= MEMORY_VALUE_LIMIT) kept[name] = value;
  }
  return kept;
};

function trimEntries(entries: Record<string, MemoryEntry>, limit: number) {
  const keys = Object.keys(entries);
  if (keys.length <= limit) return entries;
  const newest = keys
    .sort((a, b) => entries[b]!.updatedAt - entries[a]!.updatedAt || (a < b ? -1 : 1))
    .slice(0, limit);
  const trimmed: Record<string, MemoryEntry> = {};
  for (const key of newest) trimmed[key] = entries[key]!;
  return trimmed;
}

/** The memory read from storage, a profile or the server: bad parts are dropped. */
export function sanitizeWidgetMemory(value: unknown): WidgetMemory {
  const memory = emptyWidgetMemory();
  if (!isObject(value)) return memory;
  if (isObject(value.entries)) {
    for (const [key, raw] of Object.entries(value.entries)) {
      if (!isObject(raw)) continue;
      const { type, deviceKey, updatedAt, label, name, icon, settings } = raw;
      if (typeof type !== 'string' || !type || typeof deviceKey !== 'string' || !deviceKey)
        continue;
      if (key !== memoryKey(type, deviceKey) || !isTime(updatedAt) || !isObject(settings)) continue;
      memory.entries[key] = {
        type,
        deviceKey,
        updatedAt,
        label: typeof label === 'string' && label ? label : null,
        ...(typeof name === 'string' && name ? { name } : {}),
        ...(typeof icon === 'string' && icon ? { icon } : {}),
        settings: keepSmall(settings),
      };
    }
    memory.entries = trimEntries(memory.entries, MEMORY_ENTRY_LIMIT);
  }
  if (isObject(value.touched)) {
    const times = Object.entries(value.touched).filter(
      (pair): pair is [string, number] => Boolean(pair[0]) && isTime(pair[1])
    );
    times.sort((a, b) => b[1] - a[1]);
    for (const [id, time] of times.slice(0, TOUCHED_LIMIT)) memory.touched[id] = time;
  }
  return memory;
}

// ── What a widget is and which device it shows ──────────────────────────────────────────

/** Widget types that are an entity themselves: their id is the device when nothing else is. */
const ENTITY_WIDGET_TYPES = new Set(['light', 'fan', 'vacuum', 'mower', 'lock', 'media', 'sensor']);
const ENTITY_ID = /^[a-z0-9_]+\.[A-Za-z0-9_]+$/;

/** Type of a widget: its category type, else the kind the legacy id rules give it. */
export function widgetTypeOf(widgetId: string, settings: CardSettings): string {
  const category =
    typeof settings.categoryWidgetType === 'string' ? settings.categoryWidgetType : '';
  if (category) return category;
  if (widgetId.startsWith('lawn_mower.')) return 'mower';
  return kindOf(widgetId, settings);
}

/**
 * The device a widget shows, or null when it shows none (not linked yet, a spacer, the clock…).
 * A widget of a category is linked through its binding; a widget added from an entity is that
 * entity.
 */
export function widgetDeviceKey(widgetId: string, settings: CardSettings): string | null {
  const type = widgetTypeOf(widgetId, settings);
  if (!Object.hasOwn(BINDING_KEYS, type)) return null;
  const bound = categoryEntityId(type, settings);
  if (bound) return bound;
  if (settings.categoryWidgetType) return null;
  return ENTITY_WIDGET_TYPES.has(type) && ENTITY_ID.test(widgetId) ? widgetId : null;
}

/**
 * A setting that says what the widget is or which device it is linked to, not how it is
 * configured: it is never copied from one widget to another and it does not count as an edit.
 * The binding is the one of the widget's type (a car's `climateId` is configuration, a
 * climate's is its device).
 */
export function isStructuralSetting(type: string, name: string): boolean {
  if (name === 'categoryWidgetType' || name === 'type') return true;
  if (isBindingSetting(type, name)) return true;
  return type === 'room' && (name === 'entityIds' || name === 'areaName');
}

/** The setting that links a widget of this type to its device (the moment it is set is the link). */
export const isBindingSetting = (type: string, name: string): boolean =>
  Object.hasOwn(BINDING_KEYS, type) && BINDING_KEYS[type] === name;

/** The settings that are configuration (everything but the structural ones), small values only. */
export function configOf(type: string, settings: CardSettings): CardSettings {
  const config: CardSettings = {};
  for (const [name, value] of Object.entries(settings)) {
    if (!isStructuralSetting(type, name)) config[name] = value;
  }
  return keepSmall(config);
}

// ── Where the widgets are ───────────────────────────────────────────────────────────────

/** For each widget id, the pages it is on (in any device class; stack members: the stack's page). */
export function widgetPages(layout: LauncherLayout): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const add = (widgetId: string, pageId: string) => {
    const pages = result.get(widgetId) ?? new Set<string>();
    pages.add(pageId);
    result.set(widgetId, pages);
  };
  for (const page of layout.pages) {
    for (const placements of Object.values(page.placements)) {
      for (const widgetId of Object.keys(placements ?? {})) {
        add(widgetId, page.id);
        for (const member of layout.stacks?.[widgetId]?.ids ?? []) add(member, page.id);
      }
    }
  }
  return result;
}

/** The widgets of a page (a stack counts as its members), for the removal of the page. */
export function pageWidgetIds(layout: LauncherLayout, pageId: string): string[] {
  const ids = new Set<string>();
  for (const [widgetId, pages] of widgetPages(layout)) {
    if (pages.has(pageId)) ids.add(widgetId);
  }
  return [...ids].filter((id) => !layout.stacks?.[id]);
}

const settingsKeyOf = (pageId: string, widgetId: string) => `${pageId}::${widgetId}`;

const settingsOf = (cardSettings: CardSettingsMap, pageId: string | null, widgetId: string) =>
  (pageId ? cardSettings[settingsKeyOf(pageId, widgetId)] : undefined) ??
  cardSettings[widgetId] ??
  {};

/** Every key of the card settings that belongs to a widget (one per page it was ever on). */
const keysOfWidget = (cardSettings: CardSettingsMap, widgetId: string): string[] =>
  Object.keys(cardSettings).filter((key) => key === widgetId || key.endsWith(`::${widgetId}`));

// ── Remembering a widget ────────────────────────────────────────────────────────────────

export interface CaptureInput {
  widgetId: string;
  settings: CardSettings;
  name?: string;
  icon?: string;
  label?: string | null;
  updatedAt: number;
}

/** What a removed widget leaves in memory; null when it shows no device or has no configuration. */
export function captureWidget(input: CaptureInput): MemoryEntry | null {
  const { widgetId, settings, name, icon, label, updatedAt } = input;
  const deviceKey = widgetDeviceKey(widgetId, settings);
  if (!deviceKey) return null;
  const type = widgetTypeOf(widgetId, settings);
  const config = configOf(type, settings);
  const cleanName = name?.trim() || undefined;
  if (Object.keys(config).length === 0 && !cleanName && !icon) return null;
  return {
    type,
    deviceKey,
    updatedAt,
    label: label?.trim() || cleanName || null,
    ...(cleanName ? { name: cleanName } : {}),
    ...(icon ? { icon } : {}),
    settings: config,
  };
}

/**
 * Puts an entry in memory. An entry for the same (type, device) that was edited later stays;
 * beyond the limit the least recently edited entries are dropped.
 */
export function rememberEntry(
  memory: WidgetMemory,
  entry: MemoryEntry,
  limit = MEMORY_ENTRY_LIMIT
): WidgetMemory {
  const key = memoryKey(entry.type, entry.deviceKey);
  const existing = memory.entries[key];
  if (existing && existing.updatedAt >= entry.updatedAt) return memory;
  return { ...memory, entries: trimEntries({ ...memory.entries, [key]: entry }, limit) };
}

export interface WidgetState {
  layout: LauncherLayout | null;
  pagesConfig: PagesConfig | null;
  cardSettings: CardSettingsMap;
  customNames: Record<string, string>;
  customIcons: Record<string, string>;
  memory: WidgetMemory;
}

/** True when widget `widgetId` is also on a page other than `pageId` (so it is not leaving). */
function staysElsewhere(state: WidgetState, pageId: string, widgetId: string): boolean {
  if (state.layout) {
    return [...(widgetPages(state.layout).get(widgetId) ?? [])].some((id) => id !== pageId);
  }
  return Object.entries(state.pagesConfig ?? {}).some(
    ([id, list]) => id !== pageId && id !== 'pages' && id !== 'header' && list.includes(widgetId)
  );
}

/** The memory without the edit times of `ids`: they stopped being widgets, a new one may reuse the id. */
function withoutTouched(memory: WidgetMemory, ids: Iterable<string>): WidgetMemory {
  let touched: Record<string, number> | null = null;
  for (const id of ids) {
    if (!(id in memory.touched)) continue;
    touched ??= { ...memory.touched };
    delete touched[id];
  }
  return touched ? { ...memory, touched } : memory;
}

/**
 * Remembers the widgets about to be removed from a page (a stack: its members). A widget that
 * leaves every page also loses its edit time, once it is in the entry: a widget made later for
 * the same entity (a light's id is its entity) starts as new and can take the configuration back.
 * One that was never edited enters with time 0, so it never outranks a configuration somebody
 * took care of.
 */
export function rememberWidgets(
  state: WidgetState,
  pageId: string,
  widgetIds: readonly string[],
  _now: number,
  labelOf?: (widgetId: string) => string | null
): WidgetMemory {
  let memory = state.memory;
  const ids = widgetIds.flatMap((id) => state.layout?.stacks?.[id]?.ids ?? [id]);
  for (const widgetId of ids) {
    const entry = captureWidget({
      widgetId,
      settings: settingsOf(state.cardSettings, pageId, widgetId),
      name: state.customNames[widgetId],
      icon: state.customIcons[widgetId],
      label: labelOf?.(widgetId) ?? null,
      updatedAt: state.memory.touched[widgetId] ?? 0,
    });
    if (entry) memory = rememberEntry(memory, entry);
  }
  return withoutTouched(
    memory,
    ids.filter((widgetId) => !staysElsewhere(state, pageId, widgetId))
  );
}

/**
 * A snapshot arrives (a profile, a file, another device) and replaces the pages: the linked
 * widgets of the outgoing state that the incoming pages (`keptIds`) do not have go to the memory,
 * with the rule of `rememberWidgets`, and so do not get lost with the pages.
 */
export function rememberLeavingWidgets(
  state: WidgetState,
  keptIds: ReadonlySet<string>
): WidgetMemory {
  let memory = state.memory;
  const leaving = new Set<string>();
  for (const { pageId, widgetId } of liveWidgets(state)) {
    if (keptIds.has(widgetId)) continue;
    leaving.add(widgetId);
    const entry = captureWidget({
      widgetId,
      settings: settingsOf(state.cardSettings, pageId, widgetId),
      name: state.customNames[widgetId],
      icon: state.customIcons[widgetId],
      updatedAt: state.memory.touched[widgetId] ?? 0,
    });
    if (entry) memory = rememberEntry(memory, entry);
  }
  return withoutTouched(memory, leaving);
}

/**
 * The memory of an incoming snapshot added to the one of this device, entry by entry (the one
 * edited later stays, as in `rememberEntry`); of an edit time the later one stays.
 */
export function mergeWidgetMemory(local: WidgetMemory, incoming: WidgetMemory): WidgetMemory {
  let merged = local;
  for (const entry of Object.values(incoming.entries)) merged = rememberEntry(merged, entry);
  const touched = { ...local.touched };
  for (const [id, time] of Object.entries(incoming.touched)) {
    touched[id] = Math.max(time, touched[id] ?? 0);
  }
  return sanitizeWidgetMemory({ entries: merged.entries, touched });
}

// ── Taking a configuration back ───────────────────────────────────────────────────────────

/** Records that the configuration of a widget was edited at `now`. */
export function touchWidget(memory: WidgetMemory, widgetId: string, now: number): WidgetMemory {
  const touched = { ...memory.touched, [widgetId]: now };
  const ids = Object.keys(touched);
  if (ids.length > TOUCHED_LIMIT) {
    ids.sort((a, b) => touched[b]! - touched[a]!);
    for (const id of ids.slice(TOUCHED_LIMIT)) delete touched[id];
  }
  return { ...memory, touched };
}

export interface AdoptionSource {
  kind: 'widget' | 'memory';
  /** Name of the widget the configuration comes from, when it had one. */
  label: string | null;
  deviceKey: string;
}

export interface AdoptionResult {
  cardSettings: CardSettingsMap;
  customNames: Record<string, string>;
  customIcons: Record<string, string>;
  memory: WidgetMemory;
  /** Where the configuration was copied from; null: only the settings of the device were aligned. */
  source: AdoptionSource | null;
}

interface Candidate {
  kind: 'widget' | 'memory';
  updatedAt: number;
  config: CardSettings;
  name?: string;
  icon?: string;
  label: string | null;
}

/** The widgets on the pages, as (page, id) pairs; without a layout, every key of the settings. */
function liveWidgets(state: WidgetState): Array<{ pageId: string | null; widgetId: string }> {
  if (state.layout) {
    const live: Array<{ pageId: string | null; widgetId: string }> = [];
    for (const [widgetId, pages] of widgetPages(state.layout)) {
      for (const pageId of pages) live.push({ pageId, widgetId });
    }
    return live;
  }
  return Object.keys(state.cardSettings).map((key) => {
    const at = key.indexOf('::');
    return at < 0
      ? { pageId: null, widgetId: key }
      : { pageId: key.slice(0, at), widgetId: key.slice(at + 2) };
  });
}

/**
 * The settings «of the device» (`DEVICE_SCOPED_SETTINGS`) as the device has them now: for each,
 * the value of the most recent other widget of the same type on the device that has one, else the
 * one in memory. `candidates` come widgets first, then the memory.
 */
function deviceValues(candidates: readonly Candidate[]): CardSettings {
  const live = candidates
    .filter((item) => item.kind === 'widget')
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const values: CardSettings = {};
  for (const item of [...live, ...candidates.filter((other) => other.kind === 'memory')]) {
    for (const [name, value] of Object.entries(item.config)) {
      if (DEVICE_SCOPED_SETTINGS.has(name) && !(name in values)) values[name] = value;
    }
  }
  return values;
}

/**
 * The link of widget `widgetId` to a device was just made. Two things follow:
 *
 * 1. a widget never edited copies the most recent configuration for that device and type.
 *    Sources are the other widgets of the same type on the same device and the memory; on a tie
 *    a widget wins over the memory. The widget's own values (what it was created with) are kept,
 *    except for a room, whose creation fills in every setting with a default: there the copy wins;
 * 2. whether edited or not, the widget takes the settings of the device (one value per device,
 *    ADR-0019) from the device as it is now, over its own.
 *
 * Returns null when there is nothing to copy. Place, page and the device itself are never copied.
 * `source` is null when only the settings of the device were aligned.
 */
export function adoptDeviceConfig(
  state: WidgetState,
  pageId: string | null,
  widgetId: string,
  now: number
): AdoptionResult | null {
  const edited = Boolean(state.memory.touched[widgetId]);
  const own = settingsOf(state.cardSettings, pageId, widgetId);
  const deviceKey = widgetDeviceKey(widgetId, own);
  if (!deviceKey) return null;
  const type = widgetTypeOf(widgetId, own);

  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (const live of liveWidgets(state)) {
    if (live.widgetId === widgetId || seen.has(live.widgetId)) continue;
    const settings = settingsOf(state.cardSettings, live.pageId, live.widgetId);
    if (widgetTypeOf(live.widgetId, settings) !== type) continue;
    if (widgetDeviceKey(live.widgetId, settings) !== deviceKey) continue;
    seen.add(live.widgetId);
    const config = configOf(type, settings);
    const name = state.customNames[live.widgetId]?.trim() || undefined;
    const icon = state.customIcons[live.widgetId] || undefined;
    if (Object.keys(config).length === 0 && !name && !icon) continue;
    const heading = typeof settings.heading === 'string' ? settings.heading.trim() : '';
    candidates.push({
      kind: 'widget',
      updatedAt: state.memory.touched[live.widgetId] ?? 0,
      config,
      name,
      icon,
      label: name || heading || null,
    });
  }
  const remembered = state.memory.entries[memoryKey(type, deviceKey)];
  if (remembered) {
    candidates.push({
      kind: 'memory',
      updatedAt: remembered.updatedAt,
      config: remembered.settings,
      name: remembered.name,
      icon: remembered.icon,
      label: remembered.label,
    });
  }
  // The most recent; on a tie the first, and the widgets come before the memory.
  const source = edited
    ? null
    : candidates.reduce<Candidate | null>(
        (best, item) => (best && best.updatedAt >= item.updatedAt ? best : item),
        null
      );
  const shared = deviceValues(candidates);
  if (!source && Object.keys(shared).length === 0) return null;

  // The copy shares nothing with its source: the two widgets are independent from here on.
  const copy: CardSettings = source ? JSON.parse(JSON.stringify(source.config)) : {};
  const aligned: CardSettings = JSON.parse(JSON.stringify(shared));
  const copyWins = type === 'room';
  const keys = new Set(keysOfWidget(state.cardSettings, widgetId));
  if (pageId) keys.add(settingsKeyOf(pageId, widgetId));
  let cardSettings = state.cardSettings;
  let changed = false;
  for (const key of keys) {
    const current = state.cardSettings[key] ?? {};
    const next = { ...(copyWins ? { ...current, ...copy } : { ...copy, ...current }), ...aligned };
    const differs =
      Object.keys(next).length !== Object.keys(current).length ||
      Object.keys(next).some(
        (name) => JSON.stringify(next[name]) !== JSON.stringify(current[name])
      );
    if (differs) {
      if (cardSettings === state.cardSettings) cardSettings = { ...state.cardSettings };
      cardSettings[key] = next;
      changed = true;
    }
  }
  let customNames = state.customNames;
  if (source?.name && (copyWins || !customNames[widgetId])) {
    if (customNames[widgetId] !== source.name) {
      customNames = { ...customNames, [widgetId]: source.name };
      changed = true;
    }
  }
  let customIcons = state.customIcons;
  if (source?.icon && !customIcons[widgetId]) {
    customIcons = { ...customIcons, [widgetId]: source.icon };
    changed = true;
  }
  if (!changed) return null;
  return {
    cardSettings,
    customNames,
    customIcons,
    // Only a copy counts as an edit; aligning the settings of the device does not.
    memory: source ? touchWidget(state.memory, widgetId, now) : state.memory,
    source: source ? { kind: source.kind, label: source.label || null, deviceKey } : null,
  };
}

/**
 * A device-scoped setting (`scope`) changed on one widget: every other widget of the same type
 * on the same device takes the same value, so the device has one value. Without a scoped
 * setting nothing changes (the map comes back as it is).
 */
export function propagateDeviceScoped(
  cardSettings: CardSettingsMap,
  changedKey: string,
  setting: string,
  value: unknown,
  scope: ReadonlySet<string> = DEVICE_SCOPED_SETTINGS
): CardSettingsMap {
  if (!scope.has(setting)) return cardSettings;
  const widgetOf = (key: string) => (key.includes('::') ? key.slice(key.indexOf('::') + 2) : key);
  const changed = cardSettings[changedKey];
  if (!changed) return cardSettings;
  const deviceKey = widgetDeviceKey(widgetOf(changedKey), changed);
  if (!deviceKey) return cardSettings;
  const type = widgetTypeOf(widgetOf(changedKey), changed);
  // The setting that links the widget is its own: another device has another value.
  if (isStructuralSetting(type, setting)) return cardSettings;
  let next = cardSettings;
  for (const [key, settings] of Object.entries(cardSettings)) {
    if (key === changedKey || Object.is(settings[setting], value)) continue;
    const id = widgetOf(key);
    if (widgetTypeOf(id, settings) !== type || widgetDeviceKey(id, settings) !== deviceKey)
      continue;
    if (next === cardSettings) next = { ...cardSettings };
    next[key] = { ...settings, [setting]: value };
  }
  return next;
}

// ── Load-time migration and clean-up ──────────────────────────────────────────────────────

export interface NormalizeOptions {
  /** Also move the settings of widgets that left the pages into the memory (see below). */
  sweep: boolean;
}

/** Removes `ids` from the placements and stacks of a layout (a stack left empty goes too). */
function withoutWidgets(layout: LauncherLayout, ids: ReadonlySet<string>): LauncherLayout {
  const gone = new Set(ids);
  let stacks = layout.stacks;
  let changed = false;
  if (stacks) {
    const rest: NonNullable<LauncherLayout['stacks']> = {};
    for (const [stackId, stack] of Object.entries(stacks)) {
      const members = stack.ids.filter((id) => !ids.has(id));
      if (members.length === 0) gone.add(stackId);
      else rest[stackId] = members.length === stack.ids.length ? stack : { ...stack, ids: members };
      if (members.length !== stack.ids.length) changed = true;
    }
    if (changed) stacks = Object.keys(rest).length > 0 ? rest : undefined;
  }
  const pages = layout.pages.map((page) => {
    let pageChanged = false;
    const placements: typeof page.placements = {};
    for (const [key, rects] of Object.entries(page.placements)) {
      if (!rects) continue;
      const kept = Object.fromEntries(Object.entries(rects).filter(([id]) => !gone.has(id)));
      if (Object.keys(kept).length !== Object.keys(rects).length) pageChanged = true;
      placements[key as keyof typeof placements] = kept;
    }
    if (!pageChanged) return page;
    changed = true;
    return { ...page, placements };
  });
  if (!changed) return layout;
  const { stacks: _previous, ...others } = layout;
  return { ...others, pages, ...(stacks ? { stacks } : {}) };
}

/**
 * Brings the stored state to the shape of ADR-0019, idempotently and without losing data:
 *
 * 1. every widget in `hiddenIds` (the retired «Nascondi il widget» list) leaves the pages, in
 *    every device class and stack and in the legacy page lists; if it showed a device, its
 *    configuration goes to the memory; if it showed none there is nothing worth keeping and
 *    only its place is freed;
 * 2. with `options.sweep`, the settings left behind by widgets that are no longer on any page
 *    are tidied up (ISSUE-114): of a widget that is still on another page the old copy is
 *    dropped; of a widget that left the pages, the configuration goes to the memory when it
 *    showed a device, and the entry is dropped if it was linked or holds nothing but the
 *    structure; an unlinked entry with real settings is left alone.
 *
 * The same object comes back when nothing changed.
 */
export function normalizeWidgetState(
  state: WidgetState,
  hiddenIds: readonly string[],
  _now: number,
  options: NormalizeOptions
): WidgetState {
  let { layout, pagesConfig, cardSettings, memory } = state;
  const hidden = new Set(hiddenIds.filter((id) => typeof id === 'string' && id));

  if (hidden.size > 0) {
    const pagesOfWidget = layout ? widgetPages(layout) : new Map<string, Set<string>>();
    for (const widgetId of hidden) {
      const pages = new Set(pagesOfWidget.get(widgetId));
      if (pagesConfig) {
        for (const [pageId, list] of Object.entries(pagesConfig)) {
          if (pageId !== 'pages' && pageId !== 'header' && list.includes(widgetId))
            pages.add(pageId);
        }
      }
      const found =
        pages.size > 0
          ? [...pages].map((pageId) => settingsKeyOf(pageId, widgetId))
          : keysOfWidget(cardSettings, widgetId);
      // A widget on a page with no settings entry can still have a name and an icon. One that is
      // on no page and has no entry left was migrated before: nothing is read again.
      for (const key of found) {
        const entry = captureWidget({
          widgetId,
          settings: cardSettings[key] ?? cardSettings[widgetId] ?? {},
          name: state.customNames[widgetId],
          icon: state.customIcons[widgetId],
          updatedAt: memory.touched[widgetId] ?? 0,
        });
        if (entry) memory = rememberEntry(memory, entry);
      }
    }
    // They are no widgets any more: a new one with the same id starts as new.
    memory = withoutTouched(memory, hidden);
    if (layout) layout = withoutWidgets(layout, hidden);
    if (pagesConfig) {
      let next: PagesConfig | null = null;
      for (const [pageId, list] of Object.entries(pagesConfig)) {
        if (pageId === 'pages' || pageId === 'header' || !list.some((id) => hidden.has(id)))
          continue;
        next ??= { ...pagesConfig };
        next[pageId] = list.filter((id) => !hidden.has(id));
      }
      if (next) pagesConfig = next;
    }
  }

  if (options.sweep && layout) {
    const onPages = widgetPages(layout);
    const known = new Map(layout.pages.map((page) => [page.id, page.kind]));
    for (const key of Object.keys(cardSettings)) {
      const at = key.indexOf('::');
      if (at < 0) continue;
      const pageId = key.slice(0, at);
      const widgetId = key.slice(at + 2);
      const kind = known.get(pageId);
      if (kind !== 'widgets' && kind !== 'cover') continue;
      const pages = onPages.get(widgetId);
      if (pages?.has(pageId)) continue;
      const settings = cardSettings[key]!;
      let drop: boolean;
      if (pages && pages.size > 0) {
        // Still on another page: this is the copy a move left behind (or an undone move).
        drop = true;
      } else {
        const entry = captureWidget({
          widgetId,
          settings,
          name: state.customNames[widgetId],
          icon: state.customIcons[widgetId],
          updatedAt: memory.touched[widgetId] ?? 0,
        });
        if (entry) memory = rememberEntry(memory, entry);
        drop =
          widgetDeviceKey(widgetId, settings) !== null ||
          Object.keys(configOf(widgetTypeOf(widgetId, settings), settings)).length === 0;
      }
      if (drop) {
        if (cardSettings === state.cardSettings) cardSettings = { ...state.cardSettings };
        delete cardSettings[key];
      }
    }
    // Edit times of widgets that are gone are not needed any more.
    const alive = new Set<string>(onPages.keys());
    for (const key of Object.keys(cardSettings)) alive.add(key.slice(key.indexOf('::') + 2));
    const touched = Object.fromEntries(
      Object.entries(memory.touched).filter(([id]) => alive.has(id))
    );
    if (Object.keys(touched).length !== Object.keys(memory.touched).length) {
      memory = { ...memory, touched };
    }
  }

  if (
    layout === state.layout &&
    pagesConfig === state.pagesConfig &&
    cardSettings === state.cardSettings &&
    memory === state.memory
  ) {
    return state;
  }
  return { ...state, layout, pagesConfig, cardSettings, memory };
}
