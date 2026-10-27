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
import { useStepQueue, signedSteps } from '../hooks/useStepQueue';
import { MediaIcon } from '../icons';
import { testi } from '../testi';
import { VOLUME_DEAD_ZONE_PX, VOLUME_PX_PER_STEP, VOLUME_STEP_INTERVAL_MS } from './VolumeKnob';

export interface ChannelKeyProps {
  disabled?: boolean;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
  /** One channel up (1) or down (−1). */
  onStep: (direction: 1 | -1) => void;
}

interface Gesture {
  pointerId: number;
  startY: number;
  moved: boolean;
}

/**
 * The channel of a TV as one key, with the gesture of the volume in step mode: a tap is one
 * channel up, a vertical press-and-drag turns every VOLUME_PX_PER_STEP of travel into one channel
 * (up when dragging up, down when dragging down), paced and queued like the volume steps, with a
 * «+1» / «−1» bubble. Keyboard: arrows one channel, Enter/Space one up. The «Canale +» and
 * «Canale −» buttons of the details are the single-pointer alternative (WCAG 2.5.7).
 */
export function ChannelKey({ disabled = false, size = 'lg', className, onStep }: ChannelKeyProps) {
  const hintId = `canale-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-aiuto`;
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const { queue, clear, drain } = useStepQueue(onStep, VOLUME_STEP_INTERVAL_MS);
  const [bubble, setBubble] = useState({ text: '', visible: false });

  const cancelGesture = useCallback(() => {
    if (!gesture.current) return;
    gesture.current = null;
    suppressClick.current = true;
    clear();
    setBubble((current) => ({ ...current, visible: false }));
  }, [clear]);

  // The TV went off (or edit mode began) in the middle of a gesture: stop sending.
  useEffect(() => {
    if (disabled) cancelGesture();
  }, [disabled, cancelGesture]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false;
    if (disabled || gesture.current || (event.pointerType === 'mouse' && event.button !== 0))
      return;
    // The gesture belongs to the key: no page swipe or long press of the launcher from here.
    event.stopPropagation();
    gesture.current = { pointerId: event.pointerId, startY: event.clientY, moved: false };
    clear();
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
    queue.current.target = Math.trunc(travel / VOLUME_PX_PER_STEP);
    setBubble({ text: signedSteps(queue.current.target), visible: true });
    drain();
  };

  const endGesture = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (!current.moved) return;
    suppressClick.current = true;
    // The steps still queued go out at the same pace after the release.
    setBubble((previous) => ({ ...previous, visible: false }));
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // The tile behind may have its own tap: the key's click is its own.
    event.stopPropagation();
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (!disabled) onStep(1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const direction =
      event.key === 'ArrowUp' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!direction) return;
    event.preventDefault();
    onStep(direction);
  };

  return (
    <span
      className={['aca-vknob', `aca-vknob--${size}`, className].filter(Boolean).join(' ')}
      data-dragging={bubble.visible ? true : undefined}
    >
      <button
        type="button"
        aria-label={testi.canale}
        aria-describedby={hintId}
        data-no-long-press={disabled ? undefined : true}
        disabled={disabled}
        className={materialClass({ behavior: 'press', shape: 'circle', size }, 'aca-vknob__button')}
        style={{ '--aca-vknob-fill': '0%' } as CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={cancelGesture}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <MaterialLayers contentClassName="aca-vknob__content">
          {/* Channel up and down: two chevrons, one above the other. */}
          <span className="aca-chkey__glyph" aria-hidden="true">
            <MediaIcon name="up" size="sm" />
            <MediaIcon name="down" size="sm" />
          </span>
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
        {testi.canaleSuggerimento}
      </span>
    </span>
  );
}
