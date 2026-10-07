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
  PLAY_MEDIA: 512,
  SELECT_SOURCE: 2048,
  PLAY: 16384,
  SHUFFLE_SET: 32768,
  BROWSE_MEDIA: 131072,
  REPEAT_SET: 262144,
} as const;

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
