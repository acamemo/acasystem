/**
 * Which widget a device of Home Assistant belongs to (F1 of the plan «Aggiungi dispositivi»).
 *
 * Pure: it takes the registries and the live states and returns, for each device, the type of the
 * add-widget sheet (`ADD_WIDGET_TYPES`) that shows it and the entities to hand to that type. The
 * filters are the ones of `candidateEntityIds` (domain of the entity), refined by the device
 * class and the integration, which only the registries know.
 */
import type { EntityMap, HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import { isSonosMediaEntity } from '@/utils/mediaEntityClassification';

export type DeviceFamily =
  | 'tv'
  | 'sonos'
  | 'media'
  | 'light'
  | 'plug'
  | 'climate'
  | 'sensor'
  | 'cover'
  | 'lock'
  | 'camera'
  | 'vacuum'
  | 'mower'
  | 'fan'
  | 'alarm';

/** Integrations whose media players are televisions (the class `tv` is enough for the others). */
export const TV_PLATFORMS: readonly string[] = [
  'webostv',
  'samsungtv',
  'androidtv_remote',
  'androidtv',
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
  // «Sensori e comandi» takes switches too (the sheet has no separate type for them).
  plug: 'sensor',
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
  plug: 'Prese',
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
  /** Remote of a television, attached here instead of being a device of its own. */
  remoteId?: string;
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
}

function candidateOf(entry: HaEntityRegistryEntry, entities: EntityMap): Candidate | null {
  if (entry.disabled_by || entry.hidden_by) return null;
  const state = entities[entry.entity_id];
  if (!state) return null;
  const attributes: Record<string, unknown> = state.attributes ?? {};
  return {
    entityId: entry.entity_id,
    domain: domainOf(entry.entity_id),
    platform: text(entry.platform),
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
  entities: EntityMap
): { family: DeviceFamily; picked: Candidate[] } | null {
  const of = (domain: string) => candidates.filter((candidate) => candidate.domain === domain);
  const players = of('media_player');
  const sonos = players.filter(
    (candidate) =>
      candidate.platform === 'sonos' || isSonosMediaEntity(entities[candidate.entityId])
  );
  if (sonos.length > 0) return { family: 'sonos', picked: sonos };
  const tv = players.filter(isTv);
  if (tv.length > 0) return { family: 'tv', picked: tv.slice(0, 1) };
  if (players.length > 0) return { family: 'media', picked: players };
  const direct: [string, DeviceFamily][] = [
    ['climate', 'climate'],
    ['light', 'light'],
    ['cover', 'cover'],
    ['lock', 'lock'],
    ['camera', 'camera'],
    ['vacuum', 'vacuum'],
    ['lawn_mower', 'mower'],
    ['fan', 'fan'],
    ['alarm_control_panel', 'alarm'],
  ];
  for (const [domain, family] of direct) {
    const found = of(domain);
    if (found.length > 0) return { family, picked: found };
  }
  const outlets = of('switch').filter((candidate) => candidate.deviceClass === 'outlet');
  if (outlets.length > 0) return { family: 'plug', picked: outlets };
  const readings = of('sensor').filter(
    (candidate) => candidate.deviceClass === 'temperature' || candidate.deviceClass === 'humidity'
  );
  if (readings.length > 0) return { family: 'sensor', picked: readings };
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
  for (const entry of entityRegistry) {
    const deviceId = text(entry.device_id);
    if (!deviceId) continue;
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

    const found = familyOf(candidates, entities);
    if (!found) continue;
    const entityIds = found.picked.map((candidate) => candidate.entityId);
    const primaryEntityId = entityIds[0];
    if (!primaryEntityId) continue;
    const remote =
      found.family === 'tv'
        ? candidates.find((candidate) => candidate.domain === 'remote')?.entityId
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
      widgetType: FAMILY_WIDGET_TYPE[found.family],
      entityIds,
      primaryEntityId,
      ...(remote ? { remoteId: remote } : {}),
    });
  }

  return result.sort(
    (a, b) =>
      FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) ||
      a.name.localeCompare(b.name)
  );
}
