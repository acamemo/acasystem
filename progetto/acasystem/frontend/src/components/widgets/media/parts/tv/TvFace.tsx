import type { ReactNode } from 'react';
import { Caption, Text } from '@/components/primitives';
import { MediaIcon } from '../../icons';
import type { ConfirmedCommand } from '../../hooks/commands';
import type { useTvChannel } from '../../hooks/useTvChannel';
import type { useTvVolume } from '../../hooks/useTvVolume';
import { tvCanPower, type TvKind, type TvView } from '../../model/tv';
import { ChannelKey } from '../ChannelKey';
import { PowerButton } from '../Controls';
import { VolumeKnob } from '../VolumeKnob';

export type TvKeySize = 'md' | 'lg' | 'xl';

/** What the face of the TV needs: the widget and the details both provide it. */
export interface TvFaceState {
  kind: TvKind;
  view: TvView;
  power: ConfirmedCommand<boolean>;
  volume: ReturnType<typeof useTvVolume>;
  channel: ReturnType<typeof useTvChannel>;
  togglePower: () => void;
}

interface KeyProps {
  tv: TvFaceState;
  size: TvKeySize;
  /** Edit mode of the launcher: every key is inert. */
  editMode?: boolean;
}

/** Look of a key of the face: `md` is the plain small key (one-row widget), larger ones are the raised keys. */
const keyClass = (size: TvKeySize, waiting: boolean) =>
  [
    size !== 'md' && 'aca-media-key',
    size === 'xl' && 'aca-media-key--xl',
    waiting && 'aca-media-key--waiting',
  ]
    .filter(Boolean)
    .join(' ') || undefined;

/**
 * Power key, always shown. A TV that cannot be switched on over the network (Samsung on Wi-Fi)
 * keeps the key faded and inert while it is off, with no explanation: only the action is shown.
 */
export function TvPowerKey({ tv, size, editMode = false }: KeyProps) {
  const { kind, view, power } = tv;
  const waiting = !power.value && !tvCanPower(kind, view);
  return (
    <PowerButton
      on={power.value}
      action={power.value ? 'turn_off' : 'turn_on'}
      pending={power.pending}
      disabled={editMode || view.unavailable || waiting}
      size={size}
      className={keyClass(size, waiting || view.unavailable)}
      onClick={tv.togglePower}
    />
  );
}

/** Volume knob; off or unavailable it keeps the «waiting» look and is inert. */
export function TvVolumeKey({ tv, size, editMode = false }: KeyProps) {
  const { view, volume } = tv;
  if (volume.mode === null && !volume.canMute) return null;
  const idle = !view.isOn || view.unavailable;
  return (
    <VolumeKnob
      mode={volume.mode}
      level={volume.level}
      muted={volume.muted}
      canMute={volume.canMute}
      disabled={editMode || idle}
      size={size}
      className={keyClass(size, idle)}
      onToggleMute={volume.toggleMute}
      onPreviewLevel={volume.previewLevel}
      onCommitLevel={volume.commitLevel}
      onCancel={volume.cancelLevel}
      onStep={volume.step}
    />
  );
}

/** Channel key: one channel per tap or drag step; a TV with no way to change channel has none. */
export function TvChannelKey({ tv, size, editMode = false }: KeyProps) {
  const { view, channel } = tv;
  if (!channel.available) return null;
  const idle = !view.isOn || view.unavailable;
  return (
    <ChannelKey
      disabled={editMode || idle}
      size={size}
      className={keyClass(size, idle)}
      onStep={channel.step}
    />
  );
}

/** TV icon, name (unless the title already names it) and status line. */
export function TvHeadContent({
  view,
  failed,
  statusLine,
  showName,
}: {
  view: TvView;
  failed: boolean;
  statusLine: string;
  showName: boolean;
}) {
  const status = (
    <Caption tone={failed || view.unavailable ? 'danger' : undefined}>{statusLine}</Caption>
  );
  return (
    <>
      <MediaIcon name="tv" size="md" />
      {showName ? (
        <span className="aca-media-text">
          <Text className="aca-type aca-type--heading-sm" tone="ink">
            {view.deviceName}
          </Text>{' '}
          {status}
        </span>
      ) : (
        status
      )}
    </>
  );
}

/**
 * The face of the TV, as on the widget: head (icon, name, status line) above the three base keys
 * (power, volume knob, channel key). The single source of their sizes, «waiting» look and
 * disabling rules for the widget, the sheet and the console.
 */
export function TvFace({
  tv,
  size,
  statusLine,
  failed,
  showName = true,
  editMode = false,
  head,
  className,
}: {
  tv: TvFaceState;
  size: TvKeySize;
  statusLine: string;
  failed: boolean;
  /** The console header already names the TV: show only its icon and status. */
  showName?: boolean;
  editMode?: boolean;
  /** Replaces the default head (the widget wraps it in its open button). */
  head?: ReactNode;
  className?: string;
}) {
  return (
    <div className={['aca-media-remote', className].filter(Boolean).join(' ')}>
      {head ?? (
        <div className="aca-media-remote__head">
          <TvHeadContent
            view={tv.view}
            failed={failed}
            statusLine={statusLine}
            showName={showName}
          />
        </div>
      )}
      <div className="aca-media-keys">
        <TvPowerKey tv={tv} size={size} editMode={editMode} />
        <TvVolumeKey tv={tv} size={size} editMode={editMode} />
        <TvChannelKey tv={tv} size={size} editMode={editMode} />
      </div>
    </div>
  );
}
