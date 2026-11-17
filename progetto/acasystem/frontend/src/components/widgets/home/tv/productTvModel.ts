import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { multimediaProductBinding } from '@/utils/devices/productBinding';
import { MEDIA_FEATURE, declaredFeatures } from '../../media/model/features';
import { stringList } from '../../media/model/entity';

export function tvProductBinding(settings: CardSettings): ProductDeviceBinding | null {
  const value = multimediaProductBinding(settings);
  return value?.family === 'tv' ? value : null;
}

function productTvFeatures(entity: EntityMap[string] | undefined): number {
  const bits = declaredFeatures(entity);
  return bits !== null && Number.isSafeInteger(bits) && bits >= 0 ? bits : 0;
}

/** The selected channel never silently changes to another TV with a similar name. */
export function productTvScope(
  settings: CardSettings,
  binding: ProductDeviceBinding,
  active: string,
  all: EntityMap
) {
  const explicitRemote = typeof settings.remoteId === 'string' ? settings.remoteId : '';
  const remotes = binding.secondaryEntityIds.filter(
    (id) => id.startsWith('remote.') && !binding.technicalEntityIds?.includes(id) && all[id]
  );
  const remoteId = explicitRemote || (remotes.length === 1 ? remotes[0]! : '');
  const linked = stringList(settings.linkedMediaPlayers).filter((id) => id !== active);
  const allowed = new Set([
    active,
    ...binding.secondaryEntityIds.filter((id) => !/^(media_player|remote)\./.test(id)),
    remoteId,
    ...linked,
  ]);
  const entities: EntityMap = {};
  for (const id of allowed) {
    const entity = all[id];
    if (!entity) continue;
    entities[id] = id.startsWith('media_player.')
      ? {
          ...entity,
          attributes: { ...entity.attributes, supported_features: productTvFeatures(entity) },
        }
      : entity;
  }
  return {
    entities,
    settings: { ...settings, mediaPlayerId: active, remoteId, linkedMediaPlayers: linked },
  };
}

export function tvChannelName(id: string, entities: EntityMap): string {
  const name = entities[id]?.attributes.friendly_name;
  return typeof name === 'string' && name.trim() ? name : id;
}

export function tvChannelStatus(id: string, entities: EntityMap): string {
  const state = entities[id]?.state;
  const labels: Record<string, string> = {
    playing: 'In riproduzione',
    paused: 'In pausa',
    buffering: 'Caricamento',
    on: 'Accesa',
    idle: 'Pronta',
    off: 'Spenta',
    standby: 'In standby',
    unknown: 'Stato sconosciuto',
  };
  return typeof state === 'string' && Object.hasOwn(labels, state)
    ? labels[state]!
    : 'Non disponibile';
}

export function tvPowerSupported(
  entities: EntityMap,
  id: string,
  on: boolean,
  remoteId = '',
  wakeable = false
): boolean {
  const entity = entities[id];
  if (!entity || entity.state === 'unknown' || !entity.state) return false;
  if (entity.state === 'unavailable') return wakeable && !on;
  if (!['on', 'off', 'standby', 'idle', 'playing', 'paused', 'buffering'].includes(entity.state))
    return false;
  return (
    (productTvFeatures(entity) & (on ? MEDIA_FEATURE.TURN_OFF : MEDIA_FEATURE.TURN_ON)) !== 0 ||
    (on && Boolean(remoteId) && entity.attributes.platform === 'samsungtv')
  );
}
