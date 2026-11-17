import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HassEntity } from '@/@types/ha';
import { isProductDeviceBinding } from '@/utils/devices/productBinding';
import { readCameraSettings } from '../../media/model/camera';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';

// Home Assistant core 2026.10.4: camera/const.py and camera/__init__.py.
export const PRODUCT_CAMERA_FEATURE = { power: 1, stream: 2 } as const;
const states: Record<string, string> = {
  idle: 'Inattiva',
  streaming: 'Trasmissione in corso',
  recording: 'Registrazione in corso',
  off: 'Spenta',
};
export function cameraProductBinding(settings: CardSettings) {
  const binding = settings.productDevice;
  return isProductDeviceBinding(binding) &&
    binding.family === 'camera' &&
    settings.cameraId === binding.primaryEntityId
    ? binding
    : null;
}
export function productCameraView(entity: HassEntity | undefined) {
  const state = entity?.state ?? '',
    attributes = entity?.attributes ?? {};
  const features =
    typeof attributes.supported_features === 'number' &&
    Number.isSafeInteger(attributes.supported_features) &&
    attributes.supported_features >= 0
      ? attributes.supported_features
      : 0;
  return {
    state,
    available: Boolean(entity && Object.hasOwn(states, state)),
    stateLabel: Object.hasOwn(states, state) ? states[state]! : 'Non disponibile',
    motion: typeof attributes.motion_detection === 'boolean' ? attributes.motion_detection : null,
    has: (flag: number) => (features & flag) === flag,
  };
}
export function cameraService(services: ServiceCatalog | null, name: string, domain = 'camera') {
  return Object.hasOwn(services?.[domain] ?? {}, name);
}
export function cameraLabel(id: string, ids: readonly string[], entities: EntityMap) {
  const label = String(entities[id]?.attributes.friendly_name || id);
  return ids.filter((other) => String(entities[other]?.attributes.friendly_name || other) === label)
    .length > 1
    ? `${label} (${id})`
    : label;
}
/** A fixed custom source belongs to the primary lens. A template can address each lens. */
export function cameraChannelSettings(settings: CardSettings, entityId: string) {
  const camera = readCameraSettings({ ...settings, cameraId: entityId });
  const template = /\{entity_(?:id|object_id)\}/.test(camera.webrtcUrl);
  if (entityId !== cameraProductBinding(settings)?.primaryEntityId && !template) {
    camera.webrtcUrl = '';
    if (camera.engine === 'go2rtc') camera.engine = 'auto';
  }
  return camera;
}
export function privateCameraDirectory(value: unknown) {
  if (typeof value !== 'string') return null;
  const directory = value.trim().replace(/\/$/, '');
  const segments = directory.slice(1).split('/');
  return directory.startsWith('/') &&
    segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..') &&
    !directory.startsWith('/config/www') &&
    !directory.startsWith('/www') &&
    !directory.includes('\\') &&
    ![...directory].some(character => character.charCodeAt(0) < 32)
    ? directory
    : null;
}
