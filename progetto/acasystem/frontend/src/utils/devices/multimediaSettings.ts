import type { CardSettings } from '@/@types/dashboard';
import { isProductDeviceBinding, type ProductDeviceBinding } from './productBinding';

/** Keep the historical identity keys; a physical player is not a user-defined group. */
export function multimediaAssociationPatch(binding: ProductDeviceBinding, previous?: CardSettings): Partial<CardSettings> {
  if (binding.family === 'tv') {
    const sameDevice = typeof previous?.mediaPlayerId === 'string'
      && binding.channelEntityIds.includes(previous.mediaPlayerId)
      && (!isProductDeviceBinding(previous.productDevice) || previous.productDevice.deviceId === binding.deviceId);
    return { mediaPlayerId: binding.primaryEntityId, bindingEntityId: null,
      ...(!sameDevice ? { remoteId: null, linkedMediaPlayers: [] } : {}) };
  }
  if (binding.family === 'media' || binding.family === 'sonos') return {
    mediaIds: [binding.primaryEntityId, ...binding.channelEntityIds.filter(id => id !== binding.primaryEntityId)],
    bindingEntityId: null,
  };
  return {};
}
