import { useCallback } from 'react';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { getMediaPlayerPowerAction } from '@/utils/mediaPlayerFeatures';
import { mediaCapabilities, type MediaCapabilities } from '../model/features';
import {
  attrBoolean,
  attrNumber,
  attrString,
  clampVolume,
  nextRepeatMode,
  VOLUME_STEP,
  type Entity,
} from '../model/entity';
import {
  useConfirmedCommand,
  useServiceActions,
  useThrottled,
  type ConfirmedCommand,
} from './commands';

export interface MediaControls {
  entity: Entity | undefined;
  caps: MediaCapabilities;
  playing: ConfirmedCommand<boolean>;
  power: ConfirmedCommand<boolean>;
  powerAction: 'turn_on' | 'turn_off' | null;
  volume: ConfirmedCommand<number>;
  muted: ConfirmedCommand<boolean>;
  shuffle: ConfirmedCommand<boolean>;
  repeat: ConfirmedCommand<string>;
  busy: string | null;
  /** Any command of this player failed. */
  error: boolean;
  togglePlay: () => void;
  togglePower: () => void;
  previous: () => void;
  next: () => void;
  /** Volume 0–100 from the slider (volume_set with level / 100). */
  setVolume: (percent: number) => void;
  stepVolume: (direction: 1 | -1) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  seek: (seconds: number) => void;
}

const sameVolume = (confirmed: number, requested: number) => Math.abs(confirmed - requested) < 0.01;

/**
 * Commands of a media_player with «requested vs confirmed» state. Services and data are those of
 * MediaCards.jsx and MediaModal.jsx (media_play_pause, media_previous_track, volume_set…).
 */
export function useMediaControls(entityId: string | null): MediaControls {
  const { entities, callService } = useWidgetRuntime();
  const entity = entityId ? entities[entityId] : undefined;
  const caps = mediaCapabilities(entity);
  const powerAction = getMediaPlayerPowerAction(entity);

  const playing = useConfirmedCommand(entity?.state === 'playing');
  const power = useConfirmedCommand(Boolean(entity && entity.state !== 'off'), {
    ignoreWhilePending: true,
  });
  const volume = useConfirmedCommand(attrNumber(entity, 'volume_level') ?? 0, {
    equals: sameVolume,
  });
  const muted = useConfirmedCommand(attrBoolean(entity, 'is_volume_muted'));
  const shuffle = useConfirmedCommand(attrBoolean(entity, 'shuffle'));
  const repeat = useConfirmedCommand(attrString(entity, 'repeat') || 'off');
  const actions = useServiceActions();

  const call = useCallback(
    (service: string, data: Record<string, unknown> = {}) =>
      entityId ? callService('media_player', service, { entity_id: entityId, ...data }) : undefined,
    [callService, entityId]
  );

  const sendVolume = useThrottled((level: number) => {
    volume.track(() => call('volume_set', { volume_level: level }));
  });
  const sendSeek = useThrottled((seconds: number) => {
    actions.run('seek', () => call('media_seek', { seek_position: seconds }));
  });

  return {
    entity,
    caps,
    playing,
    power,
    powerAction,
    volume,
    muted,
    shuffle,
    repeat,
    busy: actions.busy,
    error:
      playing.error ||
      power.error ||
      volume.error ||
      muted.error ||
      shuffle.error ||
      repeat.error ||
      actions.failed !== null,
    togglePlay: () => playing.request(!playing.value, () => call('media_play_pause')),
    togglePower: () => {
      if (!powerAction) return;
      power.request(powerAction === 'turn_on', () => call(powerAction));
    },
    previous: () => actions.run('previous', () => call('media_previous_track')),
    next: () => actions.run('next', () => call('media_next_track')),
    setVolume: (percent: number) => {
      const level = percent / 100;
      volume.request(level);
      sendVolume(level);
    },
    stepVolume: (direction: 1 | -1) => {
      const level = clampVolume((Number(volume.value) || 0) + direction * VOLUME_STEP);
      volume.request(level, () => call('volume_set', { volume_level: level }));
    },
    toggleMute: () => {
      const target = !muted.value;
      muted.request(target, () => call('volume_mute', { is_volume_muted: target }));
    },
    toggleShuffle: () => {
      const target = !shuffle.value;
      shuffle.request(target, () => call('shuffle_set', { shuffle: target }));
    },
    cycleRepeat: () => {
      const target = nextRepeatMode(repeat.value);
      repeat.request(target, () => call('repeat_set', { repeat: target }));
    },
    seek: (seconds: number) => sendSeek(seconds),
  };
}
