import type { DeviceFamily } from '../../../../contracts/devices';
export type { DeviceFamily } from '../../../../contracts/devices';
/**
 * Which widget a device of Home Assistant belongs to (F1 of the plan «Aggiungi dispositivi»).
 *
 * Pure: it takes the registries and the live states and returns, for each device, the type of the
 * add-widget sheet (`ADD_WIDGET_TYPES`) that shows it and the entities to hand to that type. The
 * filters are the ones of `candidateEntityIds` (domain of the entity), refined by the device
 * class and the integration, which only the registries know.
 */
import type { EntityMap, HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';



/** Integrations whose media players are televisions (the class `tv` is enough for the others). */
export const TV_PLATFORMS: readonly string[] = [
  'webostv',
  'samsungtv',
  'androidtv_remote',
  'androidtv',
  'apple_tv',
  'cast',
  'braviatv',
  'philips_js',
];

/**
 * Family of the devices of an integration, when the integration alone says it. Shared with the
 * discovery of the network (F2), which knows the integration (`handler`) before any entity.
 */
export const PLATFORM_FAMILY: Readonly<Record<string, DeviceFamily>> = {
  webostv: 'tv',
  samsungtv: 'tv',
  androidtv_remote: 'tv',
  androidtv: 'tv',
  apple_tv: 'tv',
  cast: 'tv',
  braviatv: 'tv',
  philips_js: 'tv',
  sonos: 'sonos',
  spotify: 'media',
  hue: 'light',
  lifx: 'light',
  wiz: 'light',
  nanoleaf: 'light',
  yeelight: 'light',
  shelly: 'plug',
  tplink: 'plug',
  esphome: 'sensor',
  homekit_controller: 'sensor',
  zha: 'sensor',
  mqtt: 'sensor',
  tado: 'climate',
  nest: 'climate',
  ecobee: 'climate',
  netatmo: 'climate',
  google: 'media',
};

/** Integrations that are services of the house, not devices: never offered. */
export const SERVICE_PLATFORMS: readonly string[] = [
  'sun',
  'backup',
  'met',
  'google_translate',
  'hassio',
  'supervisor',
  'shopping_list',
  'radio_browser',
  'go2rtc',
  'person',
  'zone',
  'conversation',
];

/** Type of the add-widget sheet (`ADD_WIDGET_TYPES`) that shows each family. */
export const FAMILY_WIDGET_TYPE: Readonly<Record<DeviceFamily, string>> = {
  tv: 'androidtv',
  sonos: 'sonos',
  media: 'media',
  light: 'light',
  plug: 'plug',
  climate: 'climate',
  sensor: 'sensor',
  cover: 'cover',
  lock: 'lock',
  camera: 'camera',
  vacuum: 'vacuum',
  mower: 'mower',
  fan: 'fan',
  alarm: 'alarm',
};

/** Plural name of each family, for the groups of the list. */
export const FAMILY_LABEL: Readonly<Record<DeviceFamily, string>> = {
  tv: 'Televisori',
  sonos: 'Sonos',
  media: 'Lettori multimediali',
  light: 'Luci',
  plug: 'Prese e interruttori',
  climate: 'Clima',
  sensor: 'Sensori',
  cover: 'Tapparelle',
  lock: 'Serrature',
  camera: 'Videocamere',
  vacuum: 'Aspirapolvere',
  mower: 'Tagliaerba',
  fan: 'Ventilatori',
  alarm: 'Allarmi',
};

/** Order of the families in the list: what a house is used for most first. */
export const FAMILY_ORDER: readonly DeviceFamily[] = [
  'tv',
  'sonos',
  'media',
  'light',
  'plug',
  'climate',
  'sensor',
  'cover',
  'lock',
  'camera',
  'vacuum',
  'mower',
  'fan',
  'alarm',
];

export interface DiscoveredDevice {
  deviceId: string;
  name: string;
  family: DeviceFamily;
  /** Type of `ADD_WIDGET_TYPES` that shows the device. */
  widgetType: string;
  /** Entities to preselect in that type. */
  entityIds: string[];
  /** The entity that stands for the device (the one a widget is linked to). */
  primaryEntityId: string;
  /** Integration of that entity (`hue`, `cast`...): the brand of the logo of the device. */
  platform?: string;
  /** Remote of a television, attached here instead of being a device of its own. */
  remoteId?: string;
  /** Maker and model of the device in the registry, when it has them. */
  manufacturer?: string;
  model?: string;
}

export interface ClassifyInput {
  devices: readonly HaDeviceRegistryEntry[];
  entityRegistry: readonly HaEntityRegistryEntry[];
  entities: EntityMap;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const domainOf = (entityId: string): string => entityId.split('.')[0] ?? '';

interface Candidate {
  entityId: string;
  domain: string;
  platform: string;
  deviceClass: string;
  entityCategory: string;
}

function candidateOf(entry: HaEntityRegistryEntry, entities: EntityMap, allowMissing = false): Candidate | null {
  if (entry.disabled_by || entry.hidden_by) return null;
  const state = entities[entry.entity_id];
  if (!state && !allowMissing) return null;
  const attributes: Record<string, unknown> = state?.attributes ?? {};
  return {
    entityId: entry.entity_id,
    domain: domainOf(entry.entity_id),
    platform: text(entry.platform),
    entityCategory: text(entry.entity_category),
    deviceClass:
      text(attributes.device_class) ||
      text(entry.device_class) ||
      text(entry.original_device_class),
  };
}

/** Integration domains a device declares (its identifiers), for devices whose entities say none. */
function identifierDomains(device: HaDeviceRegistryEntry): string[] {
  const identifiers: unknown = device.identifiers;
  if (!Array.isArray(identifiers)) return [];
  return identifiers
    .map((pair: unknown) => (Array.isArray(pair) ? text(pair[0]) : ''))
    .filter(Boolean);
}

const isTv = (candidate: Candidate): boolean =>
  candidate.domain === 'media_player' &&
  (candidate.deviceClass === 'tv' ||
    (TV_PLATFORMS.includes(candidate.platform) &&
      // A Cast speaker or receiver shares the integration of the Chromecast.
      candidate.deviceClass !== 'speaker' &&
      candidate.deviceClass !== 'receiver'));

/** The family of the entities of one device, with the entities that make it up. */
function familyOf(
  candidates: readonly Candidate[],
  entities: EntityMap,
  ordinaryLightRegistered: boolean,
  registeredPlayers: readonly Candidate[] = []
): { family: DeviceFamily; picked: Candidate[] } | null {
  const of = (domain: string) => candidates.filter((candidate) => candidate.domain === domain);
  const ordinary = registeredPlayers.filter(candidate => !['config', 'diagnostic'].includes(candidate.entityCategory))
    .sort((a, b) => a.entityId < b.entityId ? -1 : a.entityId > b.entityId ? 1 : 0);
  const players = ordinary.some(candidate => entities[candidate.entityId]) ? ordinary : [];
  const picked = (preferred: readonly Candidate[]) => {
    const present = preferred.filter(candidate => entities[candidate.entityId]);
    const pool = present.length > 0 ? present : players.filter(candidate => entities[candidate.entityId]);
    const primary = pool.find(candidate => ['off', 'on', 'idle', 'playing', 'paused', 'standby', 'buffering'].includes(entities[candidate.entityId]?.state ?? ''))
      ?? pool.find(candidate => !['unknown', 'unavailable', ''].includes(entities[candidate.entityId]?.state ?? ''))
      ?? pool[0];
    return primary ? [primary, ...players.filter(candidate => candidate !== primary)] : players;
  };
  // Registry integration identifies the product; names and playback metadata do not.
  const sonos = players.filter(candidate => candidate.platform === 'sonos');
  if (sonos.length > 0) return { family: 'sonos', picked: picked(sonos) };
  // Native TV control remains preferred over Cast on the same physical device.
  const tv = players.filter(isTv);
  const nativeTv = tv.filter(candidate => candidate.platform !== 'cast');
  if (tv.length > 0) return { family: 'tv', picked: picked(nativeTv.length > 0 ? nativeTv : tv) };
  if (players.length > 0) return { family: 'media', picked: picked(players) };
  // The first domain present gives the family, so the order is the main function of a device with
  // several: a camera comes before the light, the cover and the lock, because a camera with a
  // floodlight or a siren (Reolink) is a camera with extras, not a light (REP-20261028-003).
  const switches = of('switch').filter((candidate) =>
    !['config', 'diagnostic'].includes(candidate.entityCategory) && ['', 'outlet', 'switch'].includes(candidate.deviceClass)
  );
  // An accessory switch does not turn an unsupported vehicle/heater/valve into a plug.
  const otherProduct = candidates.some(candidate => ['device_tracker', 'valve', 'water_heater', 'humidifier'].includes(candidate.domain));
  const plug = switches.length > 0 && (!otherProduct || switches.some(candidate => candidate.deviceClass === 'outlet'));
  const direct: [string, DeviceFamily][] = [
    ['climate', 'climate'],
    ['camera', 'camera'],
    ['light', 'light'],
    ['cover', 'cover'],
    ['lock', 'lock'],
    ['vacuum', 'vacuum'],
    ['lawn_mower', 'mower'],
    ['fan', 'fan'],
    ['alarm_control_panel', 'alarm'],
  ];
  for (const [domain, family] of direct) {
    const found = of(domain).filter(candidate => !['climate', 'cover', 'fan', 'lock', 'alarm_control_panel', 'camera', 'vacuum', 'lawn_mower'].includes(domain)
      || !['config', 'diagnostic'].includes(candidate.entityCategory));
    if (domain === 'light' && (plug || ['lock', 'alarm_control_panel', 'vacuum', 'lawn_mower'].some(securityDomain => of(securityDomain).some(candidate => !['config', 'diagnostic'].includes(candidate.entityCategory))))
      && !ordinaryLightRegistered && found.length > 0
      && found.every(candidate => ['config', 'diagnostic'].includes(candidate.entityCategory))) continue;
    if (found.length > 0) return { family, picked: found };
  }
  if (plug) return { family: 'plug', picked: switches };
  return null;
}

/**
 * Devices of Home Assistant that a widget can show, one item per device. Disabled and hidden
 * entities, entities without a live state and the service devices (`SERVICE_PLATFORMS`) are left
 * out; a `remote` of a television is attached to it.
 */
export function classifyDevices({
  devices,
  entityRegistry,
  entities,
}: ClassifyInput): DiscoveredDevice[] {
  const byDevice = new Map<string, Candidate[]>();
  const mediaByDevice = new Map<string, Candidate[]>();
  const ordinaryLightDevices = new Set<string>();
  for (const entry of entityRegistry) {
    const deviceId = text(entry.device_id);
    if (!deviceId) continue;
    if (domainOf(entry.entity_id) === 'light' && !entry.disabled_by && !entry.hidden_by
      && !['config', 'diagnostic'].includes(text(entry.entity_category))) ordinaryLightDevices.add(deviceId);
    if (domainOf(entry.entity_id) === 'media_player') {
      const player = candidateOf(entry, entities, true);
      if (player) mediaByDevice.set(deviceId, [...(mediaByDevice.get(deviceId) ?? []), player]);
    }
    const candidate = candidateOf(entry, entities);
    if (!candidate) continue;
    byDevice.set(deviceId, [...(byDevice.get(deviceId) ?? []), candidate]);
  }

  const result: DiscoveredDevice[] = [];
  for (const device of devices) {
    if (device.disabled_by) continue;
    const candidates = byDevice.get(device.id);
    if (!candidates || candidates.length === 0) continue;
    const platforms = [
      ...candidates.map((candidate) => candidate.platform),
      ...identifierDomains(device),
    ];
    if (platforms.some((platform) => SERVICE_PLATFORMS.includes(platform))) continue;

    const registeredPlayers = mediaByDevice.get(device.id) ?? [];
    let found = familyOf(candidates, entities, ordinaryLightDevices.has(device.id), registeredPlayers);
    const technicalLight = found?.family === 'light' && found.picked.every(candidate => ['config', 'diagnostic'].includes(candidate.entityCategory));
    const selected = !found || technicalLight ? selectSensorDeviceChannels(device, entityRegistry, entities) : null;
    if (technicalLight && selected) found = null;
    if (!found) {
      if (selected?.primary) {
        const ordered = [selected.primary, ...selected.channels.filter(entry => entry !== selected.primary)];
        found = { family: 'sensor', picked: ordered.map(entry => candidateOf(entry, entities, true)).filter((item): item is Candidate => item !== null) };
      }
    }
    if (!found) continue;
    const entityIds = found.picked.map((candidate) => candidate.entityId);
    const primaryEntityId = entityIds[0];
    if (!primaryEntityId) continue;
    const remote =
      found.family === 'tv'
        ? [...candidates].sort((a, b) => a.entityId < b.entityId ? -1 : a.entityId > b.entityId ? 1 : 0)
          .find(candidate => candidate.domain === 'remote' && !['config', 'diagnostic'].includes(candidate.entityCategory))?.entityId
        : undefined;
    const friendly: unknown = entities[primaryEntityId]?.attributes?.friendly_name;
    result.push({
      deviceId: device.id,
      name:
        text(device.name_by_user).trim() ||
        text(device.name).trim() ||
        text(friendly).trim() ||
        primaryEntityId,
      family: found.family,
      widgetType: found.family === 'tv' && registeredPlayers.some(candidate => candidate.platform === 'apple_tv' && isTv(candidate) && !['config', 'diagnostic'].includes(candidate.entityCategory)) ? 'appletv' : FAMILY_WIDGET_TYPE[found.family],
      entityIds,
      primaryEntityId,
      ...(found.picked[0]?.platform ? { platform: found.picked[0].platform } : {}),
      ...(remote ? { remoteId: remote } : {}),
      ...(text(device.manufacturer).trim()
        ? { manufacturer: text(device.manufacturer).trim() }
        : {}),
      ...(text(device.model).trim() ? { model: text(device.model).trim() } : {}),
    });
  }

  return result.sort(
    (a, b) =>
      FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) ||
      a.name.localeCompare(b.name)
  );
}


/** HA2026.10.4 manifests identify these helpers/calculated services; their manual route stays available. */
export const SENSOR_HELPER_PLATFORMS: readonly string[] = [
  'template', 'group', 'statistics', 'derivative', 'integration', 'utility_meter',
  'min_max', 'filter', 'history_stats', 'threshold', 'trend', 'bayesian',
];

/** Sensor-only fallback; never reclassify the telemetry of another registered product. */
export function selectSensorDeviceChannels(
  device: HaDeviceRegistryEntry,
  registry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): { primary: HaEntityRegistryEntry | undefined; channels: HaEntityRegistryEntry[] } | null {
  if (device.disabled_by || device.entry_type === 'service') return null;
  const own = registry.filter(entry => entry.device_id === device.id);
  const category = (entry: HaEntityRegistryEntry) => ['config', 'diagnostic'].includes(text(entry.entity_category));
  const deviceClass = (entry: HaEntityRegistryEntry) => text(entities[entry.entity_id]?.attributes.device_class)
    || text(entry.device_class) || text(entry.original_device_class);
  // Hidden/disabled primary rows still identify a TV, robot, light... even before its first state.
  if (own.some(entry => !category(entry) && (['media_player', 'light', 'climate', 'cover', 'fan', 'lock', 'alarm_control_panel', 'camera', 'vacuum', 'lawn_mower'].includes(domainOf(entry.entity_id))
    || domainOf(entry.entity_id) === 'switch' && ['', 'outlet', 'switch'].includes(deviceClass(entry))))) return null;
  const seen = new Set<string>();
  const channels = own.filter(entry => {
    if (!['sensor', 'binary_sensor'].includes(domainOf(entry.entity_id)) || entry.disabled_by || entry.hidden_by
      || category(entry) || SENSOR_HELPER_PLATFORMS.includes(text(entry.platform)) || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort((a, b) => a.entity_id < b.entity_id ? -1 : a.entity_id > b.entity_id ? 1 : 0);
  const readings = channels.filter(entry => !['battery', 'battery_charging'].includes(deviceClass(entry)));
  const preferred = readings.length > 0 ? readings : channels;
  const primary = preferred.find(entry => entities[entry.entity_id] && !['unknown', 'unavailable', ''].includes(entities[entry.entity_id]!.state))
    ?? preferred.find(entry => entities[entry.entity_id]);
  return channels.length > 0 ? { primary, channels } : null;
}
