import type { ReactNode } from 'react';
import { Button, Caption, Text } from '@/components/primitives';
import type { ConfirmedCommand } from '../../hooks/commands';
import type { useTvChannel } from '../../hooks/useTvChannel';
import type { useTvVolume } from '../../hooks/useTvVolume';
import { tvPowerWaiting, type TvKind, type TvView } from '../../model/tv';
import { testi } from '../../testi';
import { ChannelKey } from '../ChannelKey';
import { PowerButton } from '../Controls';
import { VolumeKnob } from '../VolumeKnob';
import { TvBrandMark } from './TvBrandMark';
import { classes } from '@/components/primitives/classes';

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
  classes(
    size !== 'md' && 'aca-media-key',
    size === 'xl' && 'aca-media-key--xl',
    waiting && 'aca-media-key--waiting'
  );

/** The power key is inert and the widget says why (`TvHeadContent` shows the sentence). */
export const tvKeyWaiting = (tv: TvFaceState): boolean =>
  tvPowerWaiting(tv.kind, tv.view, tv.power.confirmed);

/**
 * Power key, always shown. It shows what Home Assistant reports, never the requested state: while
 * a request waits for confirmation the key pulses (Button `loading`) and the icon stays as it
 * was. A TV that cannot be switched on over the network (Samsung on Wi-Fi) keeps the key faded
 * and inert while it is off; the head of the face says what it needs.
 */
export function TvPowerKey({ tv, size, editMode = false }: KeyProps) {
  const { view, power } = tv;
  const waiting = tvKeyWaiting(tv);
  return (
    <PowerButton
      on={power.confirmed}
      action={power.confirmed ? 'turn_off' : 'turn_on'}
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

/** Brand logo (or TV icon), name (unless the title already names it) and status line. */
export function TvHeadContent({
  view,
  failed,
  statusLine,
  showName,
  hint,
}: {
  view: TvView;
  failed: boolean;
  statusLine: string;
  showName: boolean;
  /** Why the power key is inert, under the status line. */
  hint?: string;
}) {
  // Danger only for a fault: «Non raggiungibile» or a command that failed, never off or standby.
  const status = (
    <Caption tone={failed || view.unavailable ? 'danger' : undefined}>{statusLine}</Caption>
  );
  const note = hint ? <Caption className="aca-media-hint">{hint}</Caption> : null;
  return (
    <>
      <TvBrandMark view={view} />
      {showName ? (
        <span className="aca-media-text">
          <Text className="aca-type aca-type--heading-sm" tone="ink">
            {view.deviceName}
          </Text>{' '}
          {status} {note}
        </span>
      ) : (
        <span className="aca-media-text">
          {status} {note}
        </span>
      )}
    </>
  );
}

/** «Riprova» after a request that Home Assistant never confirmed. */
export function TvRetry({ tv }: { tv: TvFaceState }) {
  if (tv.power.timedOut === null) return null;
  return (
    <Button
      variant="control"
      size="md"
      className="aca-media-retry"
      onClick={(event) => {
        event.stopPropagation();
        tv.power.retry();
      }}
    >
      {testi.riprova}
    </Button>
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
            hint={tvKeyWaiting(tv) && !editMode ? testi.tvAccensioneDaRete : undefined}
          />
        </div>
      )}
      <div className="aca-media-keys">
        <TvPowerKey tv={tv} size={size} editMode={editMode} />
        <TvVolumeKey tv={tv} size={size} editMode={editMode} />
        <TvChannelKey tv={tv} size={size} editMode={editMode} />
      </div>
      <TvRetry tv={tv} />
    </div>
  );
}
