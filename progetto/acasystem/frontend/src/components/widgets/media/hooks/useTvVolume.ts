import { useCallback, useState } from 'react';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useThrottledSender } from '../../controls/shared/useThrottledSender';
import {
  tvReportsMute,
  tvShowsMute,
  tvVolumeLevel,
  tvVolumeMode,
  type TvKind,
  type TvView,
  type TvVolumeMode,
} from '../model/tv';
import { sendSafely, useConfirmedCommand } from './commands';

/** Interval between `volume_set` calls while the knob is dragged (level mode). */
export const VOLUME_SEND_INTERVAL_MS = 250;

export interface TvVolume {
  /** `level`: the TV reports its level; `step`: only volume_up/down; null: no volume declared. */
  mode: TvVolumeMode | null;
  /** The knob can mute (the TV declares VOLUME_MUTE). */
  canMute: boolean;
  /** Requested level 0–1 (level mode only). */
  level: number | null;
  muted: boolean;
  failed: boolean;
  /** Level preview while dragging: shows it at once and sends it at most every interval. */
  previewLevel: (level: number) => void;
  /** Final level at the end of a drag or a key: sent at once. */
  commitLevel: (level: number) => void;
  /** The drag was cancelled: nothing more is sent. */
  cancelLevel: () => void;
  step: (direction: 1 | -1) => void;
  toggleMute: () => void;
}

const roundLevel = (level: number) => Math.round(Math.min(1, Math.max(0, level)) * 100) / 100;
const sameLevel = (confirmed: number, requested: number) => Math.abs(confirmed - requested) < 0.01;

/**
 * Volume of a TV for the single knob: level (`volume_set`) when the entity reports one, steps
 * (`volume_up`/`volume_down`) otherwise, and mute. A TV that does not report `is_volume_muted`
 * (Samsung) keeps the mute state locally, so the icon still follows the taps.
 */
export function useTvVolume(
  kind: TvKind,
  view: TvView,
  mediaPlayerId: string,
  hasRemote: boolean
): TvVolume {
  const { callService } = useWidgetRuntime();
  const mode = tvVolumeMode(kind, view, hasRemote);
  const reportsMute = tvReportsMute(view);
  const volume = useConfirmedCommand(tvVolumeLevel(view) ?? 0, { equals: sameLevel });
  const muted = useConfirmedCommand(view.muted);
  const [localMuted, setLocalMuted] = useState(false);
  const [stepFailed, setStepFailed] = useState(false);

  const call = useCallback(
    (service: string, data: Record<string, unknown> = {}) =>
      callService('media_player', service, { entity_id: mediaPlayerId, ...data }),
    [callService, mediaPlayerId]
  );

  const sender = useThrottledSender<number>(
    (level) => volume.track(() => call('volume_set', { volume_level: level })),
    VOLUME_SEND_INTERVAL_MS
  );

  const isMuted = reportsMute ? muted.value : localMuted;
  return {
    mode,
    canMute: tvShowsMute(kind, view),
    level: mode === 'level' ? volume.value : null,
    muted: isMuted,
    failed: volume.error || muted.error || stepFailed,
    previewLevel: (level) => {
      const next = roundLevel(level);
      volume.request(next);
      sender.push(next);
    },
    commitLevel: (level) => {
      const next = roundLevel(level);
      volume.request(next);
      sender.flush(next);
    },
    cancelLevel: () => sender.cancel(),
    step: (direction) => {
      setStepFailed(false);
      sendSafely(
        () => call(direction > 0 ? 'volume_up' : 'volume_down'),
        () => setStepFailed(true)
      );
    },
    toggleMute: () => {
      const target = !isMuted;
      if (reportsMute) {
        muted.request(target, () => call('volume_mute', { is_volume_muted: target }));
        return;
      }
      setLocalMuted(target);
      sendSafely(
        () => call('volume_mute', { is_volume_muted: target }),
        () => setLocalMuted(!target)
      );
    },
  };
}
