import type { DeviceFamily } from './devices';

/** One ACA widget represents one physical HA device; an integration may own many devices. */
export interface ProductDeviceBinding {
  version: 1;
  deviceId: string;
  family: DeviceFamily;
  primaryEntityId: string;
  channelEntityIds: string[];
  secondaryEntityIds: string[];
  /** Registry classification, never inferred from an entity's name. */
  technicalEntityIds?: string[];
}

const families: readonly DeviceFamily[] = ['tv', 'sonos', 'media', 'light', 'plug', 'climate', 'sensor', 'cover', 'lock', 'camera', 'vacuum', 'mower', 'fan', 'alarm'];
const entityIds = (value: unknown): value is string[] => Array.isArray(value)
  && value.every(id => typeof id === 'string' && /^[a-z0-9_]+\.[A-Za-z0-9_]+$/.test(id))
  && new Set(value).size === value.length;

export function isProductDeviceBinding(value: unknown): value is ProductDeviceBinding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const binding = value as Record<string, unknown>;
  if (binding.version !== 1 || typeof binding.deviceId !== 'string' || !binding.deviceId.trim()
    || !families.includes(binding.family as DeviceFamily) || typeof binding.primaryEntityId !== 'string'
    || !entityIds(binding.channelEntityIds) || !binding.channelEntityIds.includes(binding.primaryEntityId)
    || !entityIds(binding.secondaryEntityIds)) return false;
  const channels = binding.channelEntityIds;
  if (binding.secondaryEntityIds.some(id => channels.includes(id))) return false;
  if (['tv', 'sonos', 'media'].includes(String(binding.family)) && binding.channelEntityIds.some(id => !id.startsWith('media_player.'))) return false;
  if (binding.family === 'sensor' && binding.channelEntityIds.some(id => !/^(sensor|binary_sensor)\./.test(id))) return false;
  if (binding.family === 'light' && binding.channelEntityIds.some(id => !id.startsWith('light.'))) return false;
  if (binding.family === 'plug' && binding.channelEntityIds.some(id => !id.startsWith('switch.'))) return false;
  if (binding.family === 'climate' && binding.channelEntityIds.some(id => !id.startsWith('climate.'))) return false;
  if (binding.family === 'cover' && binding.channelEntityIds.some(id => !id.startsWith('cover.'))) return false;
  if (binding.family === 'fan' && binding.channelEntityIds.some(id => !id.startsWith('fan.'))) return false;
  if (binding.family === 'lock' && binding.channelEntityIds.some(id => !id.startsWith('lock.'))) return false;
  if (binding.family === 'camera' && binding.channelEntityIds.some(id => !id.startsWith('camera.'))) return false;
  if (binding.family === 'alarm' && binding.channelEntityIds.some(id => !id.startsWith('alarm_control_panel.'))) return false;
  if (binding.family === 'vacuum' && binding.channelEntityIds.some(id => !id.startsWith('vacuum.'))) return false;
  if (binding.family === 'mower' && binding.channelEntityIds.some(id => !id.startsWith('lawn_mower.'))) return false;
  const all = new Set([...binding.channelEntityIds, ...binding.secondaryEntityIds]);
  return binding.technicalEntityIds === undefined || entityIds(binding.technicalEntityIds)
    && binding.technicalEntityIds.every(id => all.has(id))
    && !((['tv', 'sonos', 'media'].includes(String(binding.family)) || binding.family === 'sensor' || binding.family === 'plug' || binding.family === 'climate' || binding.family === 'cover' || binding.family === 'fan' || binding.family === 'lock' || binding.family === 'alarm' || binding.family === 'camera' || binding.family === 'vacuum' || binding.family === 'mower') && binding.technicalEntityIds.some(id => channels.includes(id)));
}
