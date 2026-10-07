import type { EntityLike } from '@/@types/ha';

const MEDIA_PLAYER_FEATURE = {
  TURN_ON: 128,
  TURN_OFF: 256,
};

const supportsMediaPlayerFeature = (supportedFeatures: number, bitMask: number): boolean => {
  if (!Number.isFinite(supportedFeatures)) return false;
  return (supportedFeatures & bitMask) !== 0;
};

const getMediaPlayerSupportedFeatures = (entity: EntityLike | null | undefined): number =>
  Number(entity?.attributes?.supported_features || 0);

export const canTurnMediaPlayerOn = (entity: EntityLike | null | undefined): boolean =>
  supportsMediaPlayerFeature(getMediaPlayerSupportedFeatures(entity), MEDIA_PLAYER_FEATURE.TURN_ON);

export const canTurnMediaPlayerOff = (entity: EntityLike | null | undefined): boolean =>
  supportsMediaPlayerFeature(
    getMediaPlayerSupportedFeatures(entity),
    MEDIA_PLAYER_FEATURE.TURN_OFF
  );

export const getMediaPlayerPowerAction = (
  entity: EntityLike | null | undefined
): 'turn_on' | 'turn_off' | null => {
  if (!entity) return null;
  const state = String(entity.state || '').toLowerCase();
  if (!state || state === 'unavailable' || state === 'unknown') return null;

  const canTurnOn = canTurnMediaPlayerOn(entity);
  const canTurnOff = canTurnMediaPlayerOff(entity);

  if (state === 'off') {
    return canTurnOn ? 'turn_on' : null;
  }

  if (canTurnOff) return 'turn_off';
  return null;
};
