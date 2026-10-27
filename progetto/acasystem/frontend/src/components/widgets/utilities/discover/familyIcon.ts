import type { DeviceFamily } from '@/utils/devices/classify';
import type { UtilityIconName } from '../shared/UtilityIcon';

/** Icon of each family of devices in the list of «Rileva dispositivi». */
export const FAMILY_ICON: Readonly<Record<DeviceFamily, UtilityIconName>> = {
  tv: 'tv',
  sonos: 'speaker',
  media: 'music',
  light: 'light',
  plug: 'plug',
  climate: 'thermostat',
  sensor: 'sensor',
  cover: 'blinds',
  lock: 'lock',
  camera: 'camera',
  vacuum: 'vacuum',
  mower: 'mower',
  fan: 'fan',
  alarm: 'shield',
};
