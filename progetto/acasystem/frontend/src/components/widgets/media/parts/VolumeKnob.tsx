import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { MaterialLayers, materialClass } from '@/components/primitives';
import { useStepQueue, signedSteps as signed } from '../hooks/useStepQueue';
import { MediaIcon } from '../icons';
import type { TvVolumeMode } from '../model/tv';
import { testi } from '../testi';

/** Movement before a press becomes a volume gesture instead of a tap. */
export const VOLUME_DEAD_ZONE_PX = 8;
/** Level mode: vertical travel for the whole 0–100 % range (same as the light knob). */
export const VOLUME_PX_PER_FULL_RANGE = 160;
/** Step mode: vertical travel for one `volume_up`/`volume_down`. */
export const VOLUME_PX_PER_STEP = 22;
/** Step mode: at most one step every this many ms (5 per second). */
export const VOLUME_STEP_INTERVAL_MS = 200;
/** Keyboard in level mode. */
export const VOLUME_KEY_STEP_PERCENT = 5;

export interface VolumeKnobProps {
  /** null: the TV only has mute, so the knob is a plain toggle. */
  mode: TvVolumeMode | null;
  /** Level 0–1 (level mode); null in step mode. */
  level: number | null;
  muted: boolean;
  /** A tap mutes; otherwise the knob only adjusts the volume. */
  canMute: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
  onToggleMute: () => void;
  onPreviewLevel: (level: number) => void;
  onCommitLevel: (level: number) => void;
  onCancel: () => void;
  onStep: (direction: 1 | -1) => void;
}

interface Gesture {
  pointerId: number;
  startY: number;
  startPercent: number;
  moved: boolean;
}

const clampPercent = (value: number) => Math.round(Math.min(100, Math.max(0, value)));

/**
 * The volume of a TV as one knob (Android ToggleRange / iOS Control Center pattern): a tap mutes
 * or unmutes, a vertical press-and-drag adjusts. Level mode follows the finger (fill and «35 %»
 * bubble, throttled `volume_set`, final value on release). Step mode, for a TV that reports no
 * level, turns every VOLUME_PX_PER_STEP of travel into one volume_up/down, paced and queued, with
 * a «+2» bubble: never a made-up percentage. Keyboard: Enter/Space mute, arrows ±5 % or one step.
 * The −/+ buttons of the details are the single-pointer alternative (WCAG 2.5.7).
 */
export function VolumeKnob({
  mode,
  level,
  muted,
  canMute,
  disabled = false,
  size = 'lg',
  className,
  onToggleMute,
  onPreviewLevel,
  onCommitLevel,
  onCancel,
  onStep,
}: VolumeKnobProps) {
  const hintId = `volume-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-aiuto`;
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const { queue, clear: clearQueue, drain } = useStepQueue(onStep, VOLUME_STEP_INTERVAL_MS);
  const [bubble, setBubble] = useState({ text: '', visible: false });
  const [announcement, setAnnouncement] = useState('');

  const cancelGesture = useCallback(() => {
    if (!gesture.current) return;
    gesture.current = null;
    suppressClick.current = true;
    clearQueue();
    onCancel();
    setBubble((current) => ({ ...current, visible: false }));
  }, [clearQueue, onCancel]);

  // The TV went off (or edit mode began) in the middle of a gesture: stop sending.
  useEffect(() => {
    if (disabled) cancelGesture();
  }, [disabled, cancelGesture]);

  const adjustable = mode !== null;
  const percent = level === null ? 0 : clampPercent(level * 100);

  const levelAt = (current: Gesture, clientY: number) =>
    clampPercent(
      current.startPercent + ((current.startY - clientY) / VOLUME_PX_PER_FULL_RANGE) * 100
    );

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false;
    if (
      !adjustable ||
      disabled ||
      gesture.current ||
      (event.pointerType === 'mouse' && event.button !== 0)
    )
      return;
    // The gesture belongs to the knob: no page swipe or long press of the launcher from here.
    event.stopPropagation();
    gesture.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startPercent: percent,
      moved: false,
    };
    // A new gesture drops the steps a previous one had still queued.
    clearQueue();
    const target = event.currentTarget;
    if (typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic events (tests) have no active pointer to capture.
      }
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const travel = current.startY - event.clientY;
    if (!current.moved) {
      if (Math.abs(travel) < VOLUME_DEAD_ZONE_PX) return;
      current.moved = true;
    }
    if (mode === 'level') {
      const next = levelAt(current, event.clientY);
      setBubble({ text: `${next} %`, visible: true });
      onPreviewLevel(next / 100);
      return;
    }
    queue.current.target = Math.trunc(travel / VOLUME_PX_PER_STEP);
    setBubble({ text: signed(queue.current.target), visible: true });
    drain();
  };

  const endGesture = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (!current.moved) return;
    suppressClick.current = true;
    setBubble((previous) => ({ ...previous, visible: false }));
    if (mode === 'level') {
      const final = levelAt(current, event.clientY);
      onCommitLevel(final / 100);
      setAnnouncement(testi.volumePercento(final));
      return;
    }
    // The steps still queued go out at the same pace after the release.
    setAnnouncement(signed(queue.current.target));
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // The tile behind may have its own tap (Apple TV tap-to-toggle): the knob's click is its own.
    event.stopPropagation();
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (disabled || !canMute) return;
    onToggleMute();
    setAnnouncement(muted ? testi.audioRiattivato : testi.audioDisattivato);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || !adjustable) return;
    const direction =
      event.key === 'ArrowUp' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!direction) return;
    event.preventDefault();
    if (mode === 'level') {
      const next = clampPercent(percent + direction * VOLUME_KEY_STEP_PERCENT);
      onCommitLevel(next / 100);
      setAnnouncement(testi.volumePercento(next));
    } else {
      onStep(direction);
      setAnnouncement(signed(direction));
    }
  };

  const filled = mode === 'level' && !muted ? percent : 0;
  // Sound on: the speaker with its waves; muted: the speaker with an X, faded.
  const iconName = muted ? 'volumeCross' : 'volume';
  const valueText =
    mode === 'level'
      ? muted
        ? testi.volumeSenzaAudio(percent)
        : testi.volumePercento(percent)
      : muted
        ? testi.volumeDisattivato
        : testi.volumeAttivo;

  return (
    <span
      className={['aca-vknob', `aca-vknob--${size}`, className].filter(Boolean).join(' ')}
      data-dragging={bubble.visible ? true : undefined}
    >
      <button
        type="button"
        role={adjustable ? 'slider' : undefined}
        aria-pressed={adjustable ? undefined : muted}
        aria-label={testi.volume}
        aria-orientation={adjustable ? 'vertical' : undefined}
        aria-valuemin={mode === 'level' ? 0 : undefined}
        aria-valuemax={mode === 'level' ? 100 : undefined}
        aria-valuenow={mode === 'level' ? percent : undefined}
        aria-valuetext={valueText}
        aria-describedby={hintId}
        // The vertical drag holds the pointer: the launcher must not read it as a long press.
        data-no-long-press={disabled || !adjustable ? undefined : true}
        disabled={disabled}
        className={materialClass(
          { behavior: 'press', shape: 'circle', size },
          'aca-vknob__button',
          muted && 'aca-vknob__button--muted'
        )}
        style={{ '--aca-vknob-fill': `${filled}%` } as CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={cancelGesture}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <MaterialLayers contentClassName="aca-vknob__content">
          <span
            className="aca-vknob__fill"
            aria-hidden="true"
            data-filled={filled >= 50 ? true : undefined}
          />
          <MediaIcon name={iconName} size="md" />
        </MaterialLayers>
      </button>
      <span
        className="aca-vknob__bubble"
        aria-hidden="true"
        data-visible={bubble.visible ? true : undefined}
      >
        {bubble.text}
      </span>
      <span id={hintId} className="sr-only">
        {!adjustable
          ? testi.volumeSuggerimentoSenzaVolume
          : canMute
            ? testi.volumeSuggerimento
            : testi.volumeSuggerimentoSenzaMuto}
      </span>
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </span>
  );
}
