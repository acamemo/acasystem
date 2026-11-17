/**
 * The simulated Home Assistant of the demo mode (`#/mockup`, REP-20261028-005, K1): a store of
 * entities with subscribers, seeded from the shared fixtures, and `callService` for the common
 * domains. A service it does not simulate resolves with no effect. Nothing here touches the
 * network or the storage of the browser.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityMap, HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import {
  LG_CHANNELS,
  LIVE_TV_SOURCE,
  MOCK_TRACKS,
  lgFeatures,
  buildRegistries,
  deviceRegistryEntry,
  entityRegistryEntry,
  mediaPicturePath,
  mockHouse,
  mockMediaTitle,
  zigbeeJoinedDevice,
  type MockDeviceSpec,
  type MockScenario,
} from './mockData';

type Attributes = Record<string, unknown>;
type Data = Record<string, unknown>;

/** What a service changes in an entity. */
interface Patch {
  state?: string;
  /** Merged into the attributes of the entity. */
  attributes?: Attributes;
  /** Replaces them (an entity that goes `unavailable` keeps almost none). */
  replace?: Attributes;
}

/** A service call the store received (the demo's record, for the tester). */
export interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
  at: number;
}

/**
 * The LG webOS TV and the Samsung TV of the house. Off, an LG with its power-on recipe reports
 * `off` and declares TURN_ON (the recipe is the turn-on trigger automation of the docs); without
 * it, it reports `unavailable`. `turn_on` wakes it after a few seconds.
 */
const HOUSE_LG_TVS = ['media_player.tv_soggiorno'];
const HOUSE_SAMSUNG_TVS = ['media_player.tv_cucina'];
const WAKE_MS = 3000;
const KEPT_WHEN_ASLEEP = ['friendly_name', 'device_class', 'icon'];

/** An Apple TV that buffers for a second before it plays again. */
const BUFFERING_PLAYERS: ReadonlySet<string> = new Set(['media_player.apple_tv_camera']);
const BUFFER_MS = 1000;

/**
 * Scenario «TV che non risponde»: Home Assistant accepts these calls and nothing changes, so the
 * widget waits for a confirmation that never comes.
 */
const SILENT_CALLS: ReadonlySet<string> = new Set(['media_player.tv_soggiorno:turn_off']);
const CALL_LOG_SIZE = 200;

/** After how long a Zigbee device joins once `zha.permit` opens joining. */
const ZIGBEE_JOIN_MS = 6000;

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
  /** The state of the house (the demo bar's «Scenario»); the normal house when omitted. */
  scenario?: MockScenario;
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
  /**
   * Sets up or removes the power-on recipe of a TV (the facade calls it with «Configura
   * l’accensione»): an LG with it is `off` when it sleeps and declares TURN_ON, without it
   * `unavailable`; a Samsung declares TURN_ON only with it.
   */
  setWakeRecipe: (entityId: string, on: boolean) => void;
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
  /** The last service calls received, oldest first. */
  calls: () => readonly ServiceCall[];
  /** Cancels the timers of the simulation (leaving the demo). */
  dispose: () => void;
}

/** Attributes without the `undefined` values (a patch uses them to remove a key). */
const defined = (attributes: Attributes): Attributes =>
  Object.fromEntries(Object.entries(attributes).filter(([, value]) => value !== undefined));

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
  if (state === 'on' && (Number(entity.attributes.supported_features) & 1) !== 0
    && !entity.attributes.percentage && data.percentage === undefined) {
    attributes.percentage = 50;
  }
  if (state) return { state, attributes };
  if (Object.keys(attributes).length > 0) return { attributes };
  return null;
}

function coverPatch(entity: HassEntity, service: string, data: Data): Patch | null {
  switch (service) {
    case 'open_cover':
      return { state: 'open', attributes: { current_position: 100 } };
    case 'close_cover':
      return { state: 'closed', attributes: { current_position: 0 } };
    case 'stop_cover': {
      // The demo preserves the last reported position; it does not infer physical travel.
      const position = entity.attributes.current_position;
      return ['opening', 'closing'].includes(entity.state) && typeof position === 'number'
        && Number.isFinite(position) && position >= 0 && position <= 100
        ? { state: position === 0 ? 'closed' : 'open' } : null;
    }
    case 'stop_cover_tilt':
      return null;
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
    case 'stop':
      return { state: 'idle' };
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
    return { attributes: { motion_detection: true, motion_detection_enabled: true } };
  if (service === 'disable_motion_detection') {
    return { attributes: { motion_detection: false, motion_detection_enabled: false } };
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
    case 'media_play_pause':
      return { state: entity.state === 'playing' ? 'paused' : 'playing' };
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
    case 'play_media': {
      if (data.media_content_id !== undefined) attributes.media_content_id = data.media_content_id;
      const title = mockMediaTitle(data.media_content_id);
      if (title) {
        attributes.media_title = title;
        // An app opens as the app; anything else plays inside the one that is open.
        if (data.media_content_type === 'app') attributes.app_name = title;
      }
      return { state: 'playing', attributes };
    }
    case 'clear_playlist':
      return { state: 'idle' };
    default:
      return null;
  }
}

/** What the LG TV accepts as sound output; the others are not connected to it. */
const LG_OUTPUTS: ReadonlySet<string> = new Set([
  'tv_speaker',
  'external_arc',
  'external_speaker',
  'lineout',
]);

/**
 * `webostv.select_sound_output` moves the sound to the output, when the TV has it. With an
 * external speaker Home Assistant drops VOLUME_SET and only the volume steps remain; with
 * `lineout` it drops mute and steps too (`lgFeatures`).
 */
function webosPatch(
  entity: HassEntity,
  service: string,
  data: Data,
  wakeRecipe: boolean
): Patch | null {
  if (service !== 'select_sound_output' || entity.state === 'unavailable') return null;
  const output = String(data.sound_output ?? '');
  if (!LG_OUTPUTS.has(output)) return null;
  return {
    attributes: { sound_output: output, supported_features: lgFeatures(output, wakeRecipe) },
  };
}

function switchLikePatch(entity: HassEntity, service: string): Patch | null {
  const state = onOff(entity, service);
  return state ? { state } : null;
}

/** The change a service makes to one entity of its domain; null when it makes none. */
function patchFor(
  entity: HassEntity,
  domain: string,
  service: string,
  data: Data,
  wakeRecipe: boolean
): Patch | null {
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
    case 'webostv':
      return webosPatch(entity, service, data, wakeRecipe);
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
  const house = mockHouse(options.scenario ?? 'normal');
  let entities: EntityMap = house.entities;
  const listeners = new Set<() => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const devices: MockDeviceSpec[] = house.devices;
  const extraEntries: HaEntityRegistryEntry[] = [];
  const areas = house.areas;
  let todo: TodoItem[] = [
    { uid: 'mockup-1', summary: 'Latte e pane', status: 'needs_action' },
    { uid: 'mockup-2', summary: 'Chiamare l’idraulico', status: 'needs_action', due: '2026-10-30' },
    { uid: 'mockup-3', summary: 'Ritirare il pacco', status: 'completed' },
  ];
  if (options.scenario === 'longNames') todo = todo.map(item => ({ ...item, summary: `${item.summary} per tutta la famiglia, compresa la spesa del fine settimana e le consegne della casa di montagna` }));
  let areaCounter = 0;
  const callLog: ServiceCall[] = [];
  const silent = options.scenario === 'tvSilent' ? SILENT_CALLS : new Set<string>();
  /** What an LG TV looked like when it went to sleep, and the ones on their way back. */
  const awake = new Map<string, Attributes>();
  const waking = new Set<string>();
  const lgTvs = new Set<string>(HOUSE_LG_TVS);
  const samsungTvs = new Set<string>(HOUSE_SAMSUNG_TVS);
  /** TVs whose power-on recipe is set up (the LG of the living room has it from the start). */
  const wakeRecipe = new Set<string>(HOUSE_LG_TVS);
  /** The channel an LG TV was on when it left live TV. */
  const lastChannel = new Map<string, string>();
  /** The device that joins while Zigbee joining is open, and how many joined so far. */
  let zigbeeJoin: ReturnType<typeof setTimeout> | null = null;
  let zigbeeJoined = 0;

  const notify = () => listeners.forEach((listener) => listener());
  const stamp = () => new Date(now()).toISOString();

  const apply = (entityId: string, patch: Patch): boolean => {
    const entity = entities[entityId];
    if (!entity) return false;
    const attributes =
      patch.replace ??
      (patch.attributes
        ? defined({ ...entity.attributes, ...patch.attributes })
        : entity.attributes);
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
    if (entities[entityId]?.state === 'unavailable') return;
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

  const keptWhenAsleep = (entity: HassEntity): Attributes =>
    Object.fromEntries(
      Object.entries(entity.attributes).filter(([key]) => KEPT_WHEN_ASLEEP.includes(key))
    );

  const liveChannel = (id: string, title: string): boolean =>
    apply(id, {
      state: 'on',
      attributes: { source: LIVE_TV_SOURCE, media_title: title, media_content_type: 'channel' },
    });

  /**
   * What an LG webOS TV does with a call (webostv/media_player.py): turn off, wake, channel
   * keys, source, `play_media` of a channel. Returns whether it changed, or null when the call
   * goes on to the generic path (volume, sound output).
   */
  const lgCall = (
    id: string,
    entity: HassEntity,
    domain: string,
    service: string,
    input: Data
  ): boolean | null => {
    const output = String(entity.attributes.sound_output ?? 'tv_speaker');
    const recipe = wakeRecipe.has(id);
    const asleep = entity.state === 'unavailable' || entity.state === 'off';
    if (domain === 'media_player' && service === 'turn_off' && !asleep) {
      awake.set(id, entity.attributes);
      const kept = keptWhenAsleep(entity);
      return recipe
        ? apply(id, {
            state: 'off',
            replace: { ...kept, supported_features: lgFeatures(output, true) },
          })
        : apply(id, { state: 'unavailable', replace: kept });
    }
    if (domain === 'media_player' && service === 'turn_on' && entity.state === 'off') {
      if (waking.has(id)) return false;
      waking.add(id);
      later(WAKE_MS, () => {
        waking.delete(id);
        apply(id, {
          state: 'on',
          replace: { ...awake.get(id), supported_features: lgFeatures(output, wakeRecipe.has(id)) },
        });
      });
      return false;
    }
    // Home Assistant skips an entity that does not answer, and a TV that is off takes nothing.
    if (asleep) return false;
    const live = entity.attributes.source === LIVE_TV_SOURCE;
    const stepChannel = (step: number): boolean => {
      if (!live) return false; // elsewhere previous/next are rewind and fast forward
      const at = LG_CHANNELS.indexOf(String(entity.attributes.media_title));
      const next = (Math.max(at, 0) + step + LG_CHANNELS.length) % LG_CHANNELS.length;
      return liveChannel(id, LG_CHANNELS[next]!);
    };
    if (domain === 'webostv' && service === 'button') {
      const button = String(input.button ?? '').toUpperCase();
      if (button === 'CHANNELUP') return stepChannel(1);
      if (button === 'CHANNELDOWN') return stepChannel(-1);
      return false;
    }
    if (domain !== 'media_player') return null;
    switch (service) {
      case 'media_next_track':
        return stepChannel(1);
      case 'media_previous_track':
        return stepChannel(-1);
      case 'media_play':
      case 'media_pause':
      case 'media_stop':
      case 'media_play_pause':
        // The state follows what the TV reports, and live TV reports none.
        return false;
      case 'select_source': {
        const source = String(input.source ?? '');
        const list = entity.attributes.source_list;
        if (!Array.isArray(list) || !list.includes(source)) return false;
        if (source === LIVE_TV_SOURCE) {
          return liveChannel(id, lastChannel.get(id) ?? LG_CHANNELS[0]!);
        }
        if (live) lastChannel.set(id, String(entity.attributes.media_title));
        return apply(id, {
          state: 'on',
          attributes: { source, media_title: undefined, media_content_type: undefined },
        });
      }
      case 'play_media': {
        // Only channels: the number, then the exact name, then a part of the name.
        if (input.media_content_type !== 'channel') return false;
        const wanted = String(input.media_content_id ?? '')
          .trim()
          .toLowerCase();
        const found =
          LG_CHANNELS[Number(wanted) - 1] ??
          LG_CHANNELS.find((name) => name.toLowerCase() === wanted) ??
          LG_CHANNELS.find((name) => wanted !== '' && name.toLowerCase().includes(wanted));
        return found ? liveChannel(id, found) : false;
      }
      default:
        return null;
    }
  };

  /**
   * A Samsung TV (samsungtv/media_player.py): previous/next are KEY_CHUP/KEY_CHDOWN and mute is a
   * toggle; without UPnP it reports no volume level, so set and step change nothing visible.
   */
  const samsungCall = (
    id: string,
    entity: HassEntity,
    service: string,
    input: Data
  ): boolean | null => {
    if (service === 'turn_on') {
      if (entity.state !== 'off' || !wakeRecipe.has(id)) return false;
      return apply(id, { state: 'on', attributes: { source: 'TV' } });
    }
    if (entity.state === 'off' || entity.state === 'unavailable') return false;
    switch (service) {
      case 'turn_off':
        return apply(id, { state: 'off' });
      case 'volume_mute':
        return apply(id, {
          attributes: { is_volume_muted: entity.attributes.is_volume_muted !== true },
        });
      case 'select_source': {
        const list = entity.attributes.source_list;
        const source = String(input.source ?? '');
        return Array.isArray(list) && list.includes(source)
          ? apply(id, { attributes: { source } })
          : false;
      }
      case 'media_next_track':
      case 'media_previous_track':
      case 'media_play':
      case 'media_pause':
      case 'media_stop':
      case 'media_play_pause':
      case 'volume_set':
      case 'volume_up':
      case 'volume_down':
        return false;
      default:
        return null;
    }
  };

  const callService = async (
    domain: string,
    service: string,
    data: Data | null = null
  ): Promise<unknown> => {
    const input: Data = data ?? {};
    const ids = targetsOf(input);
    callLog.push({ domain, service, data: input, at: now() });
    if (callLog.length > CALL_LOG_SIZE) callLog.splice(0, callLog.length - CALL_LOG_SIZE);
    // ZHA opens joining: one new device joins a few seconds later; duration 0 closes it.
    if (domain === 'zha' && service === 'permit') {
      if (zigbeeJoin) {
        clearTimeout(zigbeeJoin);
        timers.delete(zigbeeJoin);
        zigbeeJoin = null;
      }
      if (num(input.duration, 60) > 0) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          zigbeeJoin = null;
          zigbeeJoined += 1;
          addDevice(zigbeeJoinedDevice(zigbeeJoined, stamp()));
        }, ZIGBEE_JOIN_MS);
        timers.add(timer);
        zigbeeJoin = timer;
      }
      return { context: { id: 'mockup' } };
    }
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
      if (domain === 'media_player' && silent.has(`${id}:${service}`)) continue;
      if (lgTvs.has(id) && (domain === 'media_player' || domain === 'webostv')) {
        const done = lgCall(id, entity, domain, service, input);
        if (done !== null) {
          touched = done || touched;
          continue;
        }
      }
      if (samsungTvs.has(id) && domain === 'media_player') {
        const done = samsungCall(id, entity, service, input);
        if (done !== null) {
          touched = done || touched;
          continue;
        }
      }
      if (
        domain === 'media_player' &&
        BUFFERING_PLAYERS.has(id) &&
        entity.state === 'paused' &&
        (service === 'media_play' || service === 'media_play_pause')
      ) {
        touched = apply(id, { state: 'buffering' }) || touched;
        later(BUFFER_MS, () => apply(id, { state: 'playing' }));
        continue;
      }
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
        patch = patchFor(entity, domain, service, input, wakeRecipe.has(id));
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
      let stored = entity;
      if (entity.entity_id.startsWith('media_player.')) {
        // A TV added from the flows comes with its power-on recipe (the step «Accensione»).
        if (spec.platform === 'webostv') {
          lgTvs.add(entity.entity_id);
          wakeRecipe.add(entity.entity_id);
          awake.set(entity.entity_id, entity.attributes);
          stored = {
            ...entity,
            attributes: {
              ...keptWhenAsleep(entity),
              supported_features: lgFeatures('tv_speaker', true),
            },
          };
        } else if (spec.platform === 'samsungtv') {
          samsungTvs.add(entity.entity_id);
          wakeRecipe.add(entity.entity_id);
        }
      }
      next[entity.entity_id] = stored;
      extraEntries.push(entityRegistryEntry(stored, spec));
    }
    entities = next;
    notify();
  };

  const setWakeRecipe = (entityId: string, on: boolean) => {
    const entity = entities[entityId];
    if (!entity || !(lgTvs.has(entityId) || samsungTvs.has(entityId))) return;
    if (on === wakeRecipe.has(entityId)) return;
    if (on) wakeRecipe.add(entityId);
    else wakeRecipe.delete(entityId);
    if (samsungTvs.has(entityId)) {
      const bits = num(entity.attributes.supported_features, 0);
      apply(entityId, {
        attributes: { supported_features: on ? bits | 128 : bits & ~128 },
      });
    } else {
      const output = String(entity.attributes.sound_output ?? 'tv_speaker');
      if (entity.state === 'unavailable' && on && awake.has(entityId)) {
        // Home Assistant now knows the turn-on trigger: the sleeping TV is off, not gone.
        apply(entityId, {
          state: 'off',
          replace: { ...keptWhenAsleep(entity), supported_features: lgFeatures(output, true) },
        });
      } else if (entity.state === 'off' && !on) {
        apply(entityId, { state: 'unavailable', replace: keptWhenAsleep(entity) });
      } else if (entity.state !== 'unavailable') {
        apply(entityId, { attributes: { supported_features: lgFeatures(output, on) } });
      }
    }
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
  syncTodo('todo.lista_spesa');

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
    setWakeRecipe,
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
    calls: () => callLog.map((call) => ({ ...call })),
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
