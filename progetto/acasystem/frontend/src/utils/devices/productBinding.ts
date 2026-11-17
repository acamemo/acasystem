import type { EntityMap, HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import { isProductDeviceBinding } from '../../../../contracts/productDevice';
import { TV_PLATFORMS, SENSOR_HELPER_PLATFORMS, selectSensorDeviceChannels } from './classify';
import type { ProductDeviceBinding } from '../../../../contracts/productDevice';
export { isProductDeviceBinding } from '../../../../contracts/productDevice';
export type { ProductDeviceBinding } from '../../../../contracts/productDevice';

const secondaryDomains = new Set(['sensor', 'binary_sensor', 'switch', 'number', 'select', 'button', 'event', 'update']);
const technical = (entry: HaEntityRegistryEntry) => entry.entity_category === 'diagnostic' || entry.entity_category === 'config';
const compare = (a: HaEntityRegistryEntry, b: HaEntityRegistryEntry) => Number(technical(a)) - Number(technical(b))
  || (a.entity_id < b.entity_id ? -1 : a.entity_id > b.entity_id ? 1 : 0);

/** No registry changes or commands: all associations stay inside the exact physical device. */
export function resolveLightDeviceBinding(
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => entry.entity_id.startsWith('light.'));
  // A registry row may precede its first state; keep the other channels, but don't invent one.
  const primary = channels.find(entry => entities[entry.entity_id]);
  if (!primary) return null;
  const secondary = own.filter(entry => secondaryDomains.has(entry.entity_id.split('.')[0]!));
  return { version: 1, deviceId, family: 'light', primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: [...channels, ...secondary].filter(technical).map(entry => entry.entity_id) };
}

/** Ordinary outputs of one physical device; technical switches stay in the technical area. */
export function resolvePlugDeviceBinding(
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => {
    const deviceClass = entities[entry.entity_id]?.attributes.device_class || entry.device_class || entry.original_device_class || '';
    return entry.entity_id.startsWith('switch.') && !technical(entry) && ['', 'outlet', 'switch'].includes(String(deviceClass));
  });
  const primary = channels.find(entry => ['on', 'off'].includes(entities[entry.entity_id]?.state ?? ''))
    ?? channels.find(entry => entities[entry.entity_id]);
  if (!primary) return null;
  const channelIds = new Set(channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || entry.entity_id.startsWith('light.') && technical(entry)));
  return { version: 1, deviceId, family: 'plug', primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}

/** A thermostat or air conditioner keeps its ordinary channels and exact-device auxiliaries. */
export function resolveClimateDeviceBinding(
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => entry.entity_id.startsWith('climate.') && !technical(entry));
  const primary = channels.find(entry => entities[entry.entity_id] && !['unknown', 'unavailable', ''].includes(entities[entry.entity_id]!.state))
    ?? channels.find(entry => entities[entry.entity_id]);
  if (!primary) return null;
  const channelIds = new Set(channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || technical(entry) && ['climate', 'light'].includes(entry.entity_id.split('.')[0]!)));
  return { version: 1, deviceId, family: 'climate', primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}

/** Covers keep ordinary channels and exact-device auxiliaries without merging their hub. */
export function resolveCoverDeviceBinding(
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => entry.entity_id.startsWith('cover.') && !technical(entry));
  const primary = channels.find(entry => entities[entry.entity_id] && !['unknown', 'unavailable', ''].includes(entities[entry.entity_id]!.state))
    ?? channels.find(entry => entities[entry.entity_id]);
  if (!primary) return null;
  const channelIds = new Set(channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || technical(entry) && ['cover', 'light'].includes(entry.entity_id.split('.')[0]!)));
  return { version: 1, deviceId, family: 'cover', primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}

/** Ordinary fan channels and auxiliaries of one device, without merging an integration's hub. */
export function resolveFanDeviceBinding(
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => entry.entity_id.startsWith('fan.') && !technical(entry));
  const primary = channels.find(entry => ['on', 'off'].includes(entities[entry.entity_id]?.state ?? ''))
    ?? channels.find(entry => entities[entry.entity_id]);
  if (!primary) return null;
  const channelIds = new Set(channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || technical(entry) && ['fan', 'light'].includes(entry.entity_id.split('.')[0]!)));
  return { version: 1, deviceId, family: 'fan', primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}

/** Lock identity only: codes and channel attributes never enter the persisted binding. */
export function resolveLockDeviceBinding(
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => entry.entity_id.startsWith('lock.') && !technical(entry));
  const primary = channels.find(entry => ['locked', 'unlocked', 'locking', 'unlocking', 'open', 'opening', 'jammed'].includes(entities[entry.entity_id]?.state ?? ''))
    ?? channels.find(entry => entities[entry.entity_id]);
  if (!primary) return null;
  const channelIds = new Set(channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || technical(entry) && ['lock', 'light'].includes(entry.entity_id.split('.')[0]!)));
  return { version: 1, deviceId, family: 'lock', primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}

/** Alarm panels retain their exact-device zones and permitted auxiliaries. */
export function resolveAlarmDeviceBinding(
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => entry.entity_id.startsWith('alarm_control_panel.') && !technical(entry));
  const primary = channels.find(entry => ['disarmed', 'armed_home', 'armed_away', 'armed_night', 'armed_vacation', 'armed_custom_bypass', 'pending', 'arming', 'disarming', 'triggered'].includes(entities[entry.entity_id]?.state ?? ''))
    ?? channels.find(entry => entities[entry.entity_id]);
  if (!primary) return null;
  const channelIds = new Set(channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || technical(entry) && ['alarm_control_panel', 'light'].includes(entry.entity_id.split('.')[0]!)));
  return { version: 1, deviceId, family: 'alarm', primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}

/** Camera metadata contains identity only, never stream URLs, pictures or access tokens. */
export function resolveCameraDeviceBinding(
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => entry.entity_id.startsWith('camera.') && !technical(entry));
  const primary = channels.find(entry => ['idle', 'streaming', 'recording'].includes(entities[entry.entity_id]?.state ?? ''))
    ?? channels.find(entry => entities[entry.entity_id]);
  if (!primary) return null;
  const channelIds = new Set(channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || entry.entity_id.startsWith('light.')
      || technical(entry) && entry.entity_id.startsWith('camera.')));
  return { version: 1, deviceId, family: 'camera', primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}

/** Vacuum channels and map identities stay inside the exact device; no image/stream attributes are persisted. */
export function resolveVacuumDeviceBinding(
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => entry.entity_id.startsWith('vacuum.') && !technical(entry));
  // Prefer an official activity, then a present non-unknown state, without fabricating availability.
  const primary = channels.find(entry => ['cleaning', 'docked', 'idle', 'paused', 'returning', 'error'].includes(entities[entry.entity_id]?.state ?? ''))
    ?? channels.find(entry => entities[entry.entity_id] && !['unknown', 'unavailable', ''].includes(entities[entry.entity_id]!.state))
    ?? channels.find(entry => entities[entry.entity_id]);
  if (!primary) return null;
  const channelIds = new Set(channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || ['image', 'camera'].includes(entry.entity_id.split('.')[0]!)
      || technical(entry) && ['vacuum', 'light'].includes(entry.entity_id.split('.')[0]!)));
  return { version: 1, deviceId, family: 'vacuum', primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}

/** Mower channels and map identities stay inside the exact device; no image/stream attributes are persisted. */
export function resolveMowerDeviceBinding(
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => entry.entity_id.startsWith('lawn_mower.') && !technical(entry));
  // Prefer an official activity, then a present non-unknown state, without fabricating availability.
  const primary = channels.find(entry => ['mowing', 'docked', 'idle', 'paused', 'returning', 'error'].includes(entities[entry.entity_id]?.state ?? ''))
    ?? channels.find(entry => entities[entry.entity_id] && !['unknown', 'unavailable', ''].includes(entities[entry.entity_id]!.state))
    ?? channels.find(entry => entities[entry.entity_id]);
  if (!primary) return null;
  const channelIds = new Set(channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || ['image', 'camera'].includes(entry.entity_id.split('.')[0]!)
      || technical(entry) && ['lawn_mower', 'light'].includes(entry.entity_id.split('.')[0]!)));
  return { version: 1, deviceId, family: 'mower', primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}


/** Read only coherent new multimedia metadata; explicit legacy groups keep their own identity. */
export function multimediaProductBinding(settings: {
  productDevice?: unknown;
  mediaPlayerId?: unknown;
  mediaIds?: unknown;
}): ProductDeviceBinding | null {
  const binding = settings.productDevice;
  if (!isProductDeviceBinding(binding) || !['tv', 'sonos', 'media'].includes(binding.family)) return null;
  if (binding.family === 'tv') return settings.mediaPlayerId === binding.primaryEntityId ? binding : null;
  const ids = settings.mediaIds;
  return Array.isArray(ids) && ids[0] === binding.primaryEntityId
    && ids.length === binding.channelEntityIds.length && new Set(ids).size === ids.length
    && ids.every(id => typeof id === 'string' && binding.channelEntityIds.includes(id)) ? binding : null;
}

function resolveMultimediaDeviceBinding(
  family: 'tv' | 'sonos' | 'media',
  deviceId: string,
  deviceRegistry: readonly HaDeviceRegistryEntry[],
  entityRegistry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = deviceRegistry.find(item => item.id === deviceId);
  if (!device || device.disabled_by) return null;
  const seen = new Set<string>();
  const own = entityRegistry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channels = own.filter(entry => entry.entity_id.startsWith('media_player.') && !technical(entry));
  const tv = channels.filter(entry => {
    const deviceClass = entities[entry.entity_id]?.attributes.device_class || entry.device_class || entry.original_device_class || '';
    return deviceClass === 'tv' || TV_PLATFORMS.includes(typeof entry.platform === 'string' ? entry.platform : '') && !['speaker', 'receiver'].includes(String(deviceClass));
  });
  const sonos = channels.filter(entry => entry.platform === 'sonos');
  const resolvedFamily = sonos.length > 0 ? 'sonos' : tv.length > 0 ? 'tv' : 'media';
  if (resolvedFamily !== family) return null;
  const nativeTv = tv.filter(entry => entry.platform !== 'cast');
  const groups = family === 'sonos' ? [sonos, channels] : family === 'tv' ? [nativeTv, tv, channels] : [channels];
  const primary = groups.map(group => group.find(entry => ['off', 'on', 'idle', 'playing', 'paused', 'standby', 'buffering'].includes(entities[entry.entity_id]?.state ?? ''))
    ?? group.find(entry => entities[entry.entity_id] && !['unknown', 'unavailable', ''].includes(entities[entry.entity_id]!.state))
    ?? group.find(entry => entities[entry.entity_id])).find(Boolean);
  if (!primary) return null;
  const channelIds = new Set(channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || entry.entity_id.startsWith('remote.')
      || technical(entry) && ['media_player', 'light'].includes(entry.entity_id.split('.')[0]!)));
  return { version: 1, deviceId, family, primaryEntityId: primary.entity_id,
    channelEntityIds: channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}

/** One TV device, including its own remote identities, never a similarly named neighbour. */
export function resolveTvDeviceBinding(
  deviceId: string, devices: readonly HaDeviceRegistryEntry[], registry: readonly HaEntityRegistryEntry[], entities: EntityMap
): ProductDeviceBinding | null {
  return resolveMultimediaDeviceBinding('tv', deviceId, devices, registry, entities);
}

/** Sonos is identified by the entity registry integration, not a name or shared household. */
export function resolveSonosDeviceBinding(
  deviceId: string, devices: readonly HaDeviceRegistryEntry[], registry: readonly HaEntityRegistryEntry[], entities: EntityMap
): ProductDeviceBinding | null {
  return resolveMultimediaDeviceBinding('sonos', deviceId, devices, registry, entities);
}

/** Ordinary generic player channels belonging to exactly one registered device. */
export function resolveMediaDeviceBinding(
  deviceId: string, devices: readonly HaDeviceRegistryEntry[], registry: readonly HaEntityRegistryEntry[], entities: EntityMap
): ProductDeviceBinding | null {
  return resolveMultimediaDeviceBinding('media', deviceId, devices, registry, entities);
}


/** A manual helper never activates stale physical-device metadata. */
export function sensorProductBinding(settings: {
  productDevice?: unknown;
  entityId?: unknown;
  sensorBindingMode?: unknown;
}): ProductDeviceBinding | null {
  const binding = settings.productDevice;
  return settings.sensorBindingMode !== 'helper' && isProductDeviceBinding(binding)
    && binding.family === 'sensor' && settings.entityId === binding.primaryEntityId ? binding : null;
}

/** Ordinary physical readings and exact-device auxiliaries; no helper or integration-wide grouping. */
export function resolveSensorDeviceBinding(
  deviceId: string,
  devices: readonly HaDeviceRegistryEntry[],
  registry: readonly HaEntityRegistryEntry[],
  entities: EntityMap
): ProductDeviceBinding | null {
  const device = devices.find(item => item.id === deviceId);
  if (!device) return null;
  const selected = selectSensorDeviceChannels(device, registry, entities);
  if (!selected?.primary) return null;
  const seen = new Set<string>();
  const own = registry.filter(entry => {
    if (entry.device_id !== deviceId || entry.disabled_by || entry.hidden_by
      || SENSOR_HELPER_PLATFORMS.includes(typeof entry.platform === 'string' ? entry.platform : '') || seen.has(entry.entity_id)) return false;
    seen.add(entry.entity_id); return true;
  }).sort(compare);
  const channelIds = new Set(selected.channels.map(entry => entry.entity_id));
  const secondary = own.filter(entry => !channelIds.has(entry.entity_id)
    && (secondaryDomains.has(entry.entity_id.split('.')[0]!) || technical(entry) && entry.entity_id.startsWith('light.')));
  return { version: 1, deviceId, family: 'sensor', primaryEntityId: selected.primary.entity_id,
    channelEntityIds: selected.channels.map(entry => entry.entity_id), secondaryEntityIds: secondary.map(entry => entry.entity_id),
    technicalEntityIds: secondary.filter(technical).map(entry => entry.entity_id) };
}
