import type { EntityLike } from '@/@types/ha';

/**
 * MediaPlayerEntityFeature bits of Home Assistant (media_player/const.py). `@/utils/mediaPlayerFeatures`
 * covers only TURN_ON/TURN_OFF for the power action; the other controls are gated here.
 */
export const MEDIA_FEATURE = {
  PAUSE: 1,
  SEEK: 2,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  PLAY_MEDIA: 512,
  VOLUME_STEP: 1024,
  SELECT_SOURCE: 2048,
  STOP: 4096,
  CLEAR_PLAYLIST: 8192,
  PLAY: 16384,
  SHUFFLE_SET: 32768,
  SELECT_SOUND_MODE: 65536,
  BROWSE_MEDIA: 131072,
  REPEAT_SET: 262144,
} as const;

/**
 * `supported_features` of the entity, or null when it does not declare any. For the controls that
 * must be explicitly declared (stop, sound mode, seek), unlike `mediaCapabilities`.
 */
export function declaredFeatures(entity: EntityLike | null | undefined): number | null {
  const raw = entity?.attributes?.supported_features;
  const bits =
    typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
  return Number.isFinite(bits) ? bits : null;
}

/** The entity explicitly declares at least one bit of `mask`. */
export const declares = (entity: EntityLike | null | undefined, mask: number): boolean => {
  const bits = declaredFeatures(entity);
  return bits !== null && (bits & mask) !== 0;
};

export interface MediaCapabilities {
  playPause: boolean;
  seek: boolean;
  volumeSet: boolean;
  volumeMute: boolean;
  previous: boolean;
  next: boolean;
  playMedia: boolean;
  shuffle: boolean;
  repeat: boolean;
}

/**
 * Controls offered by the entity. Without `supported_features` (older integrations, templates)
 * every control stays available, as in Tunet, which never checked these bits.
 */
export function mediaCapabilities(entity: EntityLike | null | undefined): MediaCapabilities {
  const raw = entity?.attributes?.supported_features;
  const bits =
    typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
  const known = Number.isFinite(bits);
  const has = (bit: number) => !known || (bits & bit) !== 0;
  return {
    playPause: has(MEDIA_FEATURE.PAUSE) || has(MEDIA_FEATURE.PLAY),
    seek: has(MEDIA_FEATURE.SEEK),
    volumeSet: has(MEDIA_FEATURE.VOLUME_SET),
    volumeMute: has(MEDIA_FEATURE.VOLUME_MUTE),
    previous: has(MEDIA_FEATURE.PREVIOUS_TRACK),
    next: has(MEDIA_FEATURE.NEXT_TRACK),
    playMedia: has(MEDIA_FEATURE.PLAY_MEDIA) || has(MEDIA_FEATURE.BROWSE_MEDIA),
    shuffle: has(MEDIA_FEATURE.SHUFFLE_SET),
    repeat: has(MEDIA_FEATURE.REPEAT_SET),
  };
}
