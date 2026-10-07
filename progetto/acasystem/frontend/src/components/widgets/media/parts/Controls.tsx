import { useState, type CSSProperties } from 'react';
import { Button, Caption, IconText, Numeric, Slider } from '@/components/primitives';
import { formatDuration } from '@/utils/formatting';
import { MediaIcon } from '../icons';
import { testi } from '../testi';
import type { MediaControls } from '../hooks/useMediaControls';
import { stop } from './WidgetShell';

export interface TransportProps {
  controls: MediaControls;
  /** play: only play/pause; basic: previous, play/pause, next; full adds shuffle and repeat. */
  variant: 'play' | 'basic' | 'full';
  showPower?: boolean;
  disabled?: boolean;
  align?: 'center' | 'start';
  className?: string;
  /** Width from which previous/next are shown (container query class); none in the details. */
  skipClassName?: string;
  /** Width from which the power button is shown. */
  powerClassName?: string;
}

/** Transport buttons of a media_player, shown only when the entity supports them. */
export function Transport({
  controls,
  variant,
  showPower = false,
  disabled = false,
  align = 'center',
  className,
  skipClassName,
  powerClassName,
}: TransportProps) {
  const { caps, playing, power, powerAction, shuffle, repeat, busy } = controls;
  const full = variant === 'full';
  const withSkip = variant !== 'play';
  const repeatMode = repeat.value;
  return (
    <div
      className={['aca-media-transport', align === 'start' && 'aca-media-transport--start', className]
        .filter(Boolean)
        .join(' ')}
      onClick={stop}
    >
      {full && caps.shuffle && (
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={testi.casuale}
          aria-pressed={shuffle.value}
          loading={shuffle.pending}
          disabled={disabled}
          onClick={controls.toggleShuffle}
        >
          <MediaIcon name="shuffle" size="sm" />
        </Button>
      )}
      {withSkip && caps.previous && (
        <Button
          variant="control"
          shape="circle"
          size="md"
          className={skipClassName}
          aria-label={testi.precedente}
          loading={busy === 'previous'}
          disabled={disabled}
          onClick={controls.previous}
        >
          <MediaIcon name="previous" size="md" />
        </Button>
      )}
      {caps.playPause && (
        <Button
          variant="primary"
          shape="circle"
          size="lg"
          aria-label={playing.value ? testi.pausa : testi.riproduci}
          loading={playing.pending}
          disabled={disabled}
          onClick={controls.togglePlay}
        >
          <MediaIcon name={playing.value ? 'pause' : 'play'} size="md" />
        </Button>
      )}
      {withSkip && caps.next && (
        <Button
          variant="control"
          shape="circle"
          size="md"
          className={skipClassName}
          aria-label={testi.successivo}
          loading={busy === 'next'}
          disabled={disabled}
          onClick={controls.next}
        >
          <MediaIcon name="next" size="md" />
        </Button>
      )}
      {full && caps.repeat && (
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={`${testi.ripeti}: ${testi.ripetiModo[repeatMode] ?? repeatMode}`}
          aria-pressed={repeatMode !== 'off'}
          loading={repeat.pending}
          disabled={disabled}
          onClick={controls.cycleRepeat}
        >
          <MediaIcon name={repeatMode === 'one' ? 'repeatOne' : 'repeat'} size="sm" />
        </Button>
      )}
      {showPower && powerAction && (
        <PowerButton
          on={power.value}
          action={powerAction}
          pending={power.pending}
          disabled={disabled}
          className={powerClassName}
          onClick={controls.togglePower}
        />
      )}
    </div>
  );
}

export function PowerButton({
  on,
  action,
  pending,
  disabled,
  className,
  onClick,
}: {
  /** Shown state: on means the device is on (orange icon). */
  on: boolean;
  action: 'turn_on' | 'turn_off';
  pending: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="control"
      shape="circle"
      size="md"
      className={className}
      aria-label={action === 'turn_on' ? testi.accendi : testi.spegni}
      loading={pending}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <MediaIcon name="power" size="md" tone={on ? 'active' : undefined} />
    </Button>
  );
}

export function VolumeControl({
  controls,
  disabled = false,
  steps = true,
}: {
  controls: MediaControls;
  disabled?: boolean;
  /** − and + buttons (details); the widget keeps only the slider and mute. */
  steps?: boolean;
}) {
  const { caps, volume, muted } = controls;
  if (!caps.volumeSet && !caps.volumeMute) return null;
  const percent = Math.round((Number(volume.value) || 0) * 100);
  return (
    <div className="aca-media-volume" onClick={stop}>
      {steps && caps.volumeSet && (
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={testi.volumeGiu}
          disabled={disabled}
          onClick={() => controls.stepVolume(-1)}
        >
          <MediaIcon name="minus" size="sm" />
        </Button>
      )}
      {caps.volumeMute && (
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={muted.value ? testi.riattivaAudio : testi.muto}
          aria-pressed={muted.value}
          loading={muted.pending}
          disabled={disabled}
          onClick={controls.toggleMute}
        >
          <MediaIcon name={muted.value ? 'mute' : percent < 50 ? 'volumeLow' : 'volume'} size="sm" />
        </Button>
      )}
      {caps.volumeSet && (
        <Slider
          value={percent}
          min={0}
          max={100}
          step={1}
          label={testi.volume}
          valueText={`${percent}%`}
          size="md"
          pending={volume.pending}
          error={volume.error}
          disabled={disabled}
          data-no-long-press
          onValueChange={controls.setVolume}
        />
      )}
      {steps && caps.volumeSet && (
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={testi.volumeSu}
          disabled={disabled}
          onClick={() => controls.stepVolume(1)}
        >
          <MediaIcon name="add" size="sm" />
        </Button>
      )}
    </div>
  );
}

/** Read-only playhead for the widget: elapsed time, bar and duration on one row. */
export function ProgressView({ position, duration }: { position: number; duration: number }) {
  if (!duration) return null;
  const ratio = Math.min(1, Math.max(0, position / duration));
  const text = testi.durata(formatDuration(position), formatDuration(duration));
  return (
    <div className="aca-media-progress-row">
      <Caption className="aca-media-show-13" aria-hidden="true">
        <Numeric>{formatDuration(position)}</Numeric>
      </Caption>
      <div
        className="aca-media-progress"
        role="progressbar"
        aria-label={testi.posizione}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        aria-valuetext={text}
        style={{ '--aca-ratio': ratio } as CSSProperties}
      >
        <span className="aca-media-progress__fill" />
      </div>
      <Caption className="aca-media-show-13" aria-hidden="true">
        <Numeric>{formatDuration(duration)}</Numeric>
      </Caption>
    </div>
  );
}

/** Seek slider of the details: keeps the dragged value until Home Assistant reports the jump. */
export function SeekBar({
  controls,
  position,
  duration,
  now,
  disabled = false,
}: {
  controls: MediaControls;
  position: number;
  duration: number;
  now: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<{ value: number; at: number } | null>(null);
  const shown = draft && now - draft.at < 2500 ? draft.value : position;
  const canSeek = controls.caps.seek && duration > 0;
  return (
    <div className="aca-media-section" onClick={stop}>
      <Slider
        value={Math.round(shown)}
        min={0}
        max={Math.max(1, Math.round(duration || 100))}
        step={1}
        label={testi.posizione}
        valueText={testi.durata(formatDuration(shown), formatDuration(duration))}
        size="md"
        disabled={disabled || !canSeek}
        data-no-long-press
        onValueChange={(value) => {
          setDraft({ value, at: Date.now() });
          controls.seek(value);
        }}
      />
      <div className="aca-media-times" aria-hidden="true">
        <Caption>
          <Numeric>{formatDuration(shown)}</Numeric>
        </Caption>
        <Caption>
          <Numeric>{formatDuration(duration)}</Numeric>
        </Caption>
      </div>
    </div>
  );
}

/** Live region for command failures; empty (but present) when everything is fine. */
export function CommandStatus({ error, id }: { error: boolean; id?: string }) {
  return (
    <p className="aca-media-status" role="status" id={id}>
      {error && (
        <IconText icon="warning" iconTone="danger" tone="danger" iconSize="sm">
          {testi.comandoNonRiuscito}
        </IconText>
      )}
    </p>
  );
}
