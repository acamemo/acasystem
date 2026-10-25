import { useId, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { MaterialLayers, materialClass } from '@/components/primitives';
import { ControlIcon, type ControlIconName } from '../shared/ControlIcon';
import type { LightControl } from './useLightControl';

/** Movement before a press becomes a brightness gesture instead of a tap. */
export const DRAG_THRESHOLD_PX = 6;
/** Vertical travel for the whole 0–100% range. */
export const PX_PER_FULL_RANGE = 160;

export interface BrightnessKnobProps {
  control: LightControl;
  name: string;
  icon?: ControlIconName;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

interface Gesture {
  pointerId: number;
  startY: number;
  startPercent: number;
  moved: boolean;
}

/**
 * The light icon as a metal knob: a tap switches the light, a vertical drag sets the
 * brightness with an immediate preview (inner glow and the percentage of the widget).
 * Keyboard: Enter/Space switch, arrows ±10%. The +/− buttons and the detail slider are the
 * single-pointer alternatives (WCAG 2.5.7).
 */
export function BrightnessKnob({
  control,
  name,
  icon = 'light',
  size = 'lg',
  disabled = false,
  className,
}: BrightnessKnobProps) {
  const hintId = `luce-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-aiuto`;
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const blocked = disabled || !control.available;
  const canDim = control.dimmable && !blocked;

  const valueAt = (current: Gesture, clientY: number) =>
    current.startPercent + ((current.startY - clientY) / PX_PER_FULL_RANGE) * 100;

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false;
    if (!canDim || (event.pointerType === 'mouse' && event.button !== 0)) return;
    // The gesture belongs to the knob: no page swipe or long press of the launcher from here.
    event.stopPropagation();
    gesture.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startPercent: control.percent,
      moved: false,
    };
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
    const travel = current.startY - event.clientY;
    if (!current.moved) {
      if (Math.abs(travel) < DRAG_THRESHOLD_PX) return;
      current.moved = true;
    }
    control.setPercent(valueAt(current, event.clientY), 'move');
  };

  const endGesture = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (!current.moved) return;
    suppressClick.current = true;
    control.setPercent(valueAt(current, event.clientY), 'end');
  };

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    control.toggle();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!canDim) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault();
      control.step(1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault();
      control.step(-1);
    }
  };

  // Intensity preview: the requested brightness at once; a non-dimmable light on is at full.
  const level = !control.on ? 0 : control.dimmable ? Math.max(0.12, control.percent / 100) : 1;

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={control.on}
        aria-busy={control.pending || undefined}
        aria-invalid={control.failed || undefined}
        aria-label={name}
        aria-describedby={control.dimmable ? hintId : undefined}
        // The vertical drag holds the pointer: the launcher must not read it as a long press.
        data-no-long-press={canDim || undefined}
        disabled={blocked}
        className={materialClass(
          { behavior: 'press', shape: 'circle', size },
          'ctl-knob',
          control.on && 'ctl-knob--on',
          canDim && 'ctl-knob--dimmable',
          control.failed && 'aca-m--error',
          className
        )}
        style={{ '--aca-ctl-level': level } as CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <MaterialLayers contentClassName="ctl-knob__content">
          <span className="ctl-knob__glow" aria-hidden="true" />
          <ControlIcon name={control.available ? icon : 'warning'} size="md" />
        </MaterialLayers>
      </button>
      {control.dimmable && (
        <span id={hintId} className="sr-only">
          {`Luminosità ${control.percent}%. Trascina in verticale sull'icona o usa le frecce per regolarla.`}
        </span>
      )}
    </>
  );
}
