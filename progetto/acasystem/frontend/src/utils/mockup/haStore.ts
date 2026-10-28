/**
 * The simulated Home Assistant of the demo mode (`#/mockup`, REP-20261028-005, K1): a store of
 * entities with subscribers, seeded from the shared fixtures, and `callService` for the common
 * domains. A service it does not simulate resolves with no effect. Nothing here touches the
 * network or the storage of the browser.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityMap, HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import {
  MOCK_AREAS,
  MOCK_DEVICES,
  MOCK_TRACKS,
  buildRegistries,
  createMockEntities,
  deviceRegistryEntry,
  entityRegistryEntry,
  mediaPicturePath,
  type MockDeviceSpec,
} from './mockData';

type Attributes = Record<string, unknown>;
type Data = Record<string, unknown>;

/** What a service changes in an entity. */
interface Patch {
  state?: string;
  attributes?: Attributes;
}

export interface TodoItem {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
  due?: string;
  description?: string;
}

export interface MockHaStoreOptions {
  /** Clock in ms, for the time stamps of the changes (tests pass a fixed one). */
  now?: () => number;
  /**
   * How long the vacuum and the mower take to reach the dock after «torna alla base», in ms;
   * 0 docks them at once.
   */
  settleMs?: number;
}

export interface AddedDevice {
  spec: MockDeviceSpec;
  entities: HassEntity[];
}

export interface MockHaStore {
  getEntities: () => EntityMap;
  subscribe: (listener: () => void) => () => void;
  callService: (domain: string, service: string, data?: Data | null) => Promise<unknown>;
  /** Adds a device and its entities (a flow of the facade ended). */
  addDevice: (added: AddedDevice) => void;
  /** Removes a device and its entities. */
  removeDevice: (deviceId: string) => void;
  registries: () => {
    devices: HaDeviceRegistryEntry[];
    entities: HaEntityRegistryEntry[];
    areas: { area_id: string; name: string }[];
  };
  addArea: (name: string) => { area_id: string; name: string };
  renameDevice: (
    deviceId: string,
    changes: { name?: string | null; areaId?: string | null }
  ) => void;
  todoItems: (entityId: string) => TodoItem[];
  /** Applies a change made outside a service (a scenario, a test). */
  patchEntity: (entityId: string, patch: Patch) => void;
  /** Cancels the timers of the simulation (leaving the demo). */
  dispose: () => void;
}

const num = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const targetsOf = (data: Data): string[] => {
  const target = (data.target as { entity_id?: unknown } | undefined)?.entity_id ?? data.entity_id;
  if (Array.isArray(target)) return target.filter((id): id is string => typeof id === 'string');
  return typeof target === 'string' && target ? [target] : [];
};

const onOff = (entity: HassEntity, service: string): string | null => {
  if (service === 'turn_on') return 'on';
  if (service === 'turn_off') return 'off';
  if (service === 'toggle') return entity.state === 'on' ? 'off' : 'on';
  return null;
};

const ALARM_STATES: Record<string, string> = {
  alarm_disarm: 'disarmed',
  alarm_arm_home: 'armed_home',
  alarm_arm_away: 'armed_away',
  alarm_arm_night: 'armed_night',
  alarm_arm_vacation: 'armed_vacation',
  alarm_arm_custom_bypass: 'armed_custom_bypass',
};

function lightPatch(entity: HassEntity, service: string, data: Data): Patch | null {
  const state = onOff(entity, service);
  if (!state) return null;
  const attributes: Attributes = {};
  if (state === 'on') {
    if (data.brightness_pct !== undefined) {
      attributes.brightness = Math.round((num(data.brightness_pct, 100) / 100) * 255);
    } else if (data.brightness !== undefined) {
      attributes.brightness = Math.round(num(data.brightness, 255));
    } else if (!entity.attributes.brightness) {
      attributes.brightness = 255;
    }
    if (data.hs_color !== undefined) {
      attributes.hs_color = data.hs_color;
      attributes.color_mode = 'hs';
    }
    if (data.rgb_color !== undefined) {
      attributes.rgb_color = data.rgb_color;
      attributes.color_mode = 'rgb';
    }
    if (data.color_temp_kelvin !== undefined) {
      attributes.color_temp_kelvin = data.color_temp_kelvin;
      attributes.color_mode = 'color_temp';
    }
    if (data.effect !== undefined) attributes.effect = data.effect;
  }
  return { state, attributes };
}

function fanPatch(entity: HassEntity, service: string, data: Data): Patch | null {
  const attributes: Attributes = {};
  for (const key of ['oscillating', 'direction', 'preset_mode'] as const) {
    if (data[key] !== undefined) attributes[key] = data[key];
  }
  if (service === 'set_percentage') {
    const percentage = Math.round(num(data.percentage, 0));
    return { state: percentage > 0 ? 'on' : 'off', attributes: { percentage } };
  }
  const state = onOff(entity, service);
  if (state === 'on' && data.percentage !== undefined) {
    attributes.percentage = Math.round(num(data.percentage, 0));
  }
  if (state === 'on' && !entity.attributes.percentage && data.percentage === undefined) {
    attributes.percentage = 50;
  }
  if (state) return { state, attributes };
  if (Object.keys(attributes).length > 0) return { attributes };
  return null;
}

function coverPatch(_entity: HassEntity, service: string, data: Data): Patch | null {
  switch (service) {
    case 'open_cover':
      return { state: 'open', attributes: { current_position: 100 } };
    case 'close_cover':
      return { state: 'closed', attributes: { current_position: 0 } };
    case 'set_cover_position': {
      const position = Math.min(100, Math.max(0, Math.round(num(data.position, 0))));
      return {
        state: position > 0 ? 'open' : 'closed',
        attributes: { current_position: position },
      };
    }
    case 'open_cover_tilt':
      return { attributes: { current_tilt_position: 100 } };
    case 'close_cover_tilt':
      return { attributes: { current_tilt_position: 0 } };
    case 'set_cover_tilt_position':
      return {
        attributes: {
          current_tilt_position: Math.min(100, Math.max(0, num(data.tilt_position, 0))),
        },
      };
    default:
      return null;
  }
}

function climatePatch(entity: HassEntity, service: string, data: Data): Patch | null {
  const attributes: Attributes = {};
  switch (service) {
    case 'turn_off':
      return { state: 'off' };
    case 'turn_on': {
      const modes = entity.attributes.hvac_modes;
      const first = Array.isArray(modes)
        ? modes.find((mode): mode is string => typeof mode === 'string' && mode !== 'off')
        : undefined;
      return { state: first ?? 'heat' };
    }
    case 'set_hvac_mode':
      return typeof data.hvac_mode === 'string' ? { state: data.hvac_mode } : null;
    case 'set_temperature':
      for (const key of ['temperature', 'target_temp_low', 'target_temp_high'] as const) {
        if (data[key] !== undefined) attributes[key] = data[key];
      }
      return {
        ...(typeof data.hvac_mode === 'string' ? { state: data.hvac_mode } : {}),
        attributes,
      };
    case 'set_humidity':
      return { attributes: { humidity: data.humidity } };
    case 'set_fan_mode':
      return { attributes: { fan_mode: data.fan_mode } };
    case 'set_preset_mode':
      return { attributes: { preset_mode: data.preset_mode } };
    case 'set_swing_mode':
      return { attributes: { swing_mode: data.swing_mode } };
    case 'set_swing_horizontal_mode':
      return { attributes: { swing_horizontal_mode: data.swing_horizontal_mode } };
    default:
      return null;
  }
}

function vacuumPatch(_entity: HassEntity, service: string, data: Data): Patch | null {
  switch (service) {
    case 'start':
    case 'clean_spot':
    case 'clean_area':
      return { state: 'cleaning' };
    case 'pause':
      return { state: 'paused' };
    case 'stop':
      return { state: 'idle' };
    case 'return_to_base':
      return { state: 'returning' };
    case 'set_fan_speed':
      return { attributes: { fan_speed: data.fan_speed } };
    default:
      return null;
  }
}

function mowerPatch(_entity: HassEntity, service: string): Patch | null {
  switch (service) {
    case 'start_mowing':
      return { state: 'mowing' };
    case 'pause':
      return { state: 'paused' };
    case 'dock':
      return { state: 'returning' };
    default:
      return null;
  }
}

function lockPatch(_entity: HassEntity, service: string): Patch | null {
  if (service === 'lock') return { state: 'locked' };
  if (service === 'unlock') return { state: 'unlocked' };
  if (service === 'open') return { state: 'open' };
  return null;
}

function alarmPatch(_entity: HassEntity, service: string): Patch | null {
  const state = ALARM_STATES[service];
  return state ? { state } : null;
}

function cameraPatch(entity: HassEntity, service: string): Patch | null {
  if (service === 'enable_motion_detection')
    return { attributes: { motion_detection_enabled: true } };
  if (service === 'disable_motion_detection') {
    return { attributes: { motion_detection_enabled: false } };
  }
  if (service === 'turn_on') return { state: 'idle', attributes: { is_on: true } };
  if (service === 'turn_off') return { state: entity.state, attributes: { is_on: false } };
  return null;
}

const MEDIA_STATES: Record<string, string> = {
  media_play: 'playing',
  media_pause: 'paused',
  media_stop: 'idle',
};

function mediaPatch(entity: HassEntity, service: string, data: Data): Patch | null {
  const state = MEDIA_STATES[service];
  if (state) return { state };
  const attributes: Attributes = {};
  switch (service) {
    case 'turn_on':
      return { state: 'idle' };
    case 'turn_off':
      return { state: 'off' };
    case 'toggle':
      return { state: entity.state === 'off' ? 'idle' : 'off' };
    case 'volume_set':
      return { attributes: { volume_level: num(data.volume_level, 0.5), is_volume_muted: false } };
    case 'volume_up':
      return {
        attributes: { volume_level: Math.min(1, num(entity.attributes.volume_level, 0.5) + 0.05) },
      };
    case 'volume_down':
      return {
        attributes: { volume_level: Math.max(0, num(entity.attributes.volume_level, 0.5) - 0.05) },
      };
    case 'volume_mute':
      return { attributes: { is_volume_muted: Boolean(data.is_volume_muted) } };
    case 'select_source':
      return { attributes: { source: data.source } };
    case 'select_sound_mode':
      return { attributes: { sound_mode: data.sound_mode } };
    case 'shuffle_set':
      return { attributes: { shuffle: Boolean(data.shuffle) } };
    case 'repeat_set':
      return { attributes: { repeat: data.repeat } };
    case 'media_seek':
      return { attributes: { media_position: num(data.seek_position, 0) } };
    case 'join':
      return {
        attributes: {
          group_members: [
            entity.entity_id,
            ...(Array.isArray(data.group_members) ? data.group_members : []),
          ],
        },
      };
    case 'unjoin':
      return { attributes: { group_members: [entity.entity_id] } };
    case 'play_media':
      if (data.media_content_id !== undefined) attributes.media_content_id = data.media_content_id;
      return { state: 'playing', attributes };
    case 'clear_playlist':
      return { state: 'idle' };
    default:
      return null;
  }
}

function switchLikePatch(entity: HassEntity, service: string): Patch | null {
  const state = onOff(entity, service);
  return state ? { state } : null;
}

/** The change a service makes to one entity of its domain; null when it makes none. */
function patchFor(entity: HassEntity, domain: string, service: string, data: Data): Patch | null {
  switch (domain) {
    case 'light':
      return lightPatch(entity, service, data);
    case 'switch':
    case 'input_boolean':
    case 'automation':
    case 'remote':
      return switchLikePatch(entity, service);
    case 'fan':
      return fanPatch(entity, service, data);
    case 'cover':
      return coverPatch(entity, service, data);
    case 'climate':
      return climatePatch(entity, service, data);
    case 'media_player':
      return mediaPatch(entity, service, data);
    case 'vacuum':
      return vacuumPatch(entity, service, data);
    case 'lawn_mower':
      return mowerPatch(entity, service);
    case 'lock':
      return lockPatch(entity, service);
    case 'alarm_control_panel':
      return alarmPatch(entity, service);
    case 'camera':
      return cameraPatch(entity, service);
    case 'number':
    case 'input_number':
      return service === 'set_value' ? { state: String(data.value) } : null;
    case 'select':
    case 'input_select':
      return service === 'select_option' && typeof data.option === 'string'
        ? { state: data.option }
        : null;
    default:
      return null;
  }
}

export function createMockHaStore(options: MockHaStoreOptions = {}): MockHaStore {
  const now = options.now ?? Date.now;
  const settleMs = options.settleMs ?? 4000;
  let entities: EntityMap = createMockEntities();
  const listeners = new Set<() => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const devices: MockDeviceSpec[] = MOCK_DEVICES.map((spec) => ({ ...spec }));
  const extraEntries: HaEntityRegistryEntry[] = [];
  const areas = MOCK_AREAS.map((area) => ({ ...area }));
  let todo: TodoItem[] = [
    { uid: 'mockup-1', summary: 'Latte e pane', status: 'needs_action' },
    { uid: 'mockup-2', summary: 'Chiamare l’idraulico', status: 'needs_action', due: '2026-10-30' },
    { uid: 'mockup-3', summary: 'Ritirare il pacco', status: 'completed' },
  ];
  let areaCounter = 0;

  const notify = () => listeners.forEach((listener) => listener());
  const stamp = () => new Date(now()).toISOString();

  const apply = (entityId: string, patch: Patch): boolean => {
    const entity = entities[entityId];
    if (!entity) return false;
    const attributes = patch.attributes
      ? { ...entity.attributes, ...patch.attributes }
      : entity.attributes;
    const at = stamp();
    entities = {
      ...entities,
      [entityId]: {
        ...entity,
        state: patch.state ?? entity.state,
        attributes,
        last_updated: at,
        last_changed:
          patch.state !== undefined && patch.state !== entity.state ? at : entity.last_changed,
      },
    };
    return true;
  };

  const later = (ms: number, task: () => void) => {
    if (ms <= 0) {
      task();
      return;
    }
    const timer = setTimeout(() => {
      timers.delete(timer);
      task();
      notify();
    }, ms);
    timers.add(timer);
  };

  const countOpen = () => todo.filter((item) => item.status === 'needs_action').length;
  const syncTodo = (entityId: string) => {
    apply(entityId, { state: String(countOpen()) });
  };

  const nextTrack = (entity: HassEntity, step: number): Patch => {
    const current = Number(
      /^mockup:track:(\d+)$/.exec(String(entity.attributes.media_content_id))?.[1] ?? 0
    );
    const index = (current + step + MOCK_TRACKS.length * 8) % MOCK_TRACKS.length;
    const track = MOCK_TRACKS[index]!;
    return {
      state: 'playing',
      attributes: {
        media_title: track.title,
        media_artist: track.artist,
        media_album_name: track.album,
        media_duration: track.duration,
        media_position: 0,
        media_content_id: `mockup:track:${index}`,
        entity_picture: mediaPicturePath(entity.entity_id, track.title),
      },
    };
  };

  const callService = async (
    domain: string,
    service: string,
    data: Data | null = null
  ): Promise<unknown> => {
    const input: Data = data ?? {};
    const ids = targetsOf(input);
    // The list of the shopping is kept by the store, not by the entity.
    if (domain === 'todo') {
      const id = ids[0];
      if (service === 'add_item' && typeof input.item === 'string') {
        todo = [
          ...todo,
          { uid: `mockup-${now()}-${todo.length}`, summary: input.item, status: 'needs_action' },
        ];
      } else if (service === 'update_item') {
        todo = todo.map((item) =>
          item.uid === input.item
            ? {
                ...item,
                ...(typeof input.rename === 'string' ? { summary: input.rename } : {}),
                ...(input.status === 'completed' || input.status === 'needs_action'
                  ? { status: input.status }
                  : {}),
                ...(typeof input.due_date === 'string' ? { due: input.due_date } : {}),
                ...(typeof input.description === 'string'
                  ? { description: input.description }
                  : {}),
              }
            : item
        );
      } else if (service === 'remove_item') {
        todo = todo.filter((item) => item.uid !== input.item);
      } else if (service === 'remove_completed_items') {
        todo = todo.filter((item) => item.status !== 'completed');
      }
      if (id) syncTodo(id);
      notify();
      return { context: { id: 'mockup' } };
    }
    let touched = false;
    for (const id of ids) {
      const entity = entities[id];
      if (!entity) continue;
      let patch: Patch | null;
      if (
        domain === 'media_player' &&
        (service === 'media_next_track' || service === 'media_previous_track')
      ) {
        patch = nextTrack(entity, service === 'media_next_track' ? 1 : -1);
      } else if (domain === 'button' || domain === 'input_button') {
        patch = service === 'press' ? { state: stamp() } : null;
      } else if (domain === 'sonos' && service === 'update_alarm') {
        const alarm = Object.values(entities).find(
          (item) => String(item.attributes.alarm_id) === String(input.alarm_id)
        );
        if (alarm) {
          const attributes: Attributes = {};
          for (const key of ['time', 'volume', 'include_linked_zones'] as const) {
            if (input[key] !== undefined) attributes[key] = input[key];
          }
          touched = apply(alarm.entity_id, { attributes }) || touched;
        }
        patch = null;
      } else {
        patch = patchFor(entity, domain, service, input);
      }
      if (!patch) continue;
      touched = apply(id, patch) || touched;
      if (domain === 'vacuum' && service === 'return_to_base') {
        later(settleMs, () => apply(id, { state: 'docked' }));
      }
      if (domain === 'lawn_mower' && service === 'dock') {
        later(settleMs, () => apply(id, { state: 'docked' }));
      }
    }
    if (touched) notify();
    return { context: { id: 'mockup' } };
  };

  const addDevice = ({ spec, entities: added }: AddedDevice) => {
    devices.push(spec);
    const next: EntityMap = { ...entities };
    for (const entity of added) {
      next[entity.entity_id] = entity;
      extraEntries.push(entityRegistryEntry(entity, spec));
    }
    entities = next;
    notify();
  };

  const removeDevice = (deviceId: string) => {
    const index = devices.findIndex((spec) => spec.id === deviceId);
    if (index < 0) return;
    const [spec] = devices.splice(index, 1);
    const next: EntityMap = { ...entities };
    for (const id of spec!.entityIds) delete next[id];
    entities = next;
    for (let at = extraEntries.length - 1; at >= 0; at -= 1) {
      if (extraEntries[at]!.device_id === deviceId) extraEntries.splice(at, 1);
    }
    notify();
  };

  const registries = () => {
    const base = buildRegistries(entities, devices);
    const known = new Set(base.entities.map((entry) => entry.entity_id));
    return {
      devices: devices.map(deviceRegistryEntry),
      entities: [...base.entities, ...extraEntries.filter((entry) => !known.has(entry.entity_id))],
      areas: areas.map((area) => ({ ...area })),
    };
  };

  // The count of the list is the one the entity shows from the start.
  syncTodo('todo.fixture');

  return {
    getEntities: () => entities,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    callService,
    addDevice,
    removeDevice,
    registries,
    addArea(name) {
      areaCounter += 1;
      const area = { area_id: `area_demo_${areaCounter}`, name };
      areas.push(area);
      return { ...area };
    },
    renameDevice(deviceId, changes) {
      const spec = devices.find((item) => item.id === deviceId);
      if (!spec) return;
      if (typeof changes.name === 'string' && changes.name.trim()) spec.name = changes.name.trim();
      if (changes.areaId !== undefined) spec.areaId = changes.areaId ?? undefined;
      notify();
    },
    todoItems: () => todo.map((item) => ({ ...item })),
    patchEntity(entityId, patch) {
      if (apply(entityId, patch)) notify();
    },
    dispose() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      listeners.clear();
    },
  };
}
