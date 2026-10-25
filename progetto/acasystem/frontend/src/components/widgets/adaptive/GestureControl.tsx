import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Button, Caption, Display, Icon, Numeric } from '@/components/primitives';
import {
  DRAG_THRESHOLD_PX,
  PX_PER_FULL_RANGE,
} from '@/components/widgets/controls/light/BrightnessKnob';
import {
  GESTURE_SEND_INTERVAL_MS,
  useThrottledSender,
} from '@/components/widgets/controls/shared/useThrottledSender';
import { normalizedValue, type Capability } from './widgetDesignModel';

export type RangeCapability = Extract<Capability, { kind: 'range' }>;
export function controlColour(
  capability: RangeCapability,
  value: number,
  saturation = 100
): string {
  if (capability.colour === 'hue') return `hsl(${value} ${saturation}% 45%)`;
  const ratio = (value - capability.min) / (capability.max - capability.min);
  if (capability.colour === 'white')
    return `color-mix(in oklab, hsl(35 70% 45%), hsl(215 40% 45%) ${ratio * 100}%)`;
  return `color-mix(in oklab, var(--aca-ink-muted), var(--k2-accent, var(--aca-blue)) ${ratio * 100}%)`;
}

export interface GestureControlProps {
  capability: RangeCapability;
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number, phase: 'move' | 'end') => void;
  onCancel?: () => void;
  disabled?: boolean;
  saturation?: number;
  throttleIntervalMs?: number;
}
interface Gesture {
  pointerId: number;
  y: number;
  value: number;
  moved: boolean;
}

/** Range knob for kit specimens and operational widgets. Pointer preview, throttled commit, keyboard. */
export function GestureControl({
  capability,
  value,
  onChange,
  onCommit,
  onCancel,
  disabled = false,
  saturation,
  throttleIntervalMs,
}: GestureControlProps) {
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [pressing, setPressing] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const lastSent = useRef<number | null>(null);

  const sender = useThrottledSender<number>((val) => {
    lastSent.current = val;
    onCommitRef.current?.(val, 'move');
  }, throttleIntervalMs ?? GESTURE_SEND_INTERVAL_MS);

  useEffect(() => {
    if (disabled && gesture.current) {
      sender.cancel();
      changeRef.current(gesture.current.value);
      gesture.current = null;
      setPressing(false);
    }
  }, [disabled, sender]);
  useEffect(
    () => () => {
      if (gesture.current) changeRef.current(gesture.current.value);
    },
    []
  );
  const at = (current: Gesture, y: number) =>
    normalizedValue(
      capability,
      current.value + ((current.y - y) / PX_PER_FULL_RANGE) * (capability.max - capability.min)
    );
  const end = (event: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    setPressing(false);
    suppressClick.current = current.moved || cancelled;
    const next = cancelled
      ? current.value
      : current.moved
        ? at(current, event.clientY)
        : current.value;
    onChange(next);
    setAnnouncement(cancelled ? 'Regolazione annullata' : `${next} ${capability.unit}`);
    if (cancelled) {
      sender.cancel();
      onCancel?.();
    } else if (current.moved) {
      sender.cancel();
      if (lastSent.current !== next) onCommitRef.current?.(next, 'end');
    }
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const formatted = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value);
  return (
    <div className="uikw-gesture" data-control-id={capability.id}>
      <Button
        variant="control"
        shape="circle"
        size="lg"
        role="slider"
        aria-label={capability.label}
        aria-valuemin={capability.min}
        aria-valuemax={
          capability.colour === 'hue' ? capability.max - capability.step : capability.max
        }
        aria-valuenow={value}
        aria-valuetext={`${formatted} ${capability.unit}`}
        aria-orientation="vertical"
        disabled={disabled}
        data-no-long-press
        title="Premi e trascina in verticale, oppure usa le frecce"
        className={`uikw-gesture__knob${pressing ? 'uikw-gesture__knob--pressed' : ''}`}
        style={
          { '--uikw-control-colour': controlColour(capability, value, saturation) } as CSSProperties
        }
        onPointerDown={(event) => {
          if (disabled || event.button !== 0 || gesture.current) return;
          event.stopPropagation();
          suppressClick.current = false;
          lastSent.current = null;
          gesture.current = { pointerId: event.pointerId, y: event.clientY, value, moved: false };
          setPressing(true);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const current = gesture.current;
          if (!current || current.pointerId !== event.pointerId) return;
          event.stopPropagation();
          if (!current.moved && Math.abs(current.y - event.clientY) < DRAG_THRESHOLD_PX) return;
          current.moved = true;
          const next = at(current, event.clientY);
          onChange(next);
          sender.push(next);
        }}
        onPointerUp={(event) => end(event, false)}
        onPointerCancel={(event) => end(event, true)}
        onLostPointerCapture={(event) => end(event, true)}
        onClick={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          const direction = ['ArrowUp', 'ArrowRight'].includes(event.key)
            ? 1
            : ['ArrowDown', 'ArrowLeft'].includes(event.key)
              ? -1
              : 0;
          if (!direction && event.key !== 'Home' && event.key !== 'End') return;
          event.preventDefault();
          const next = normalizedValue(
            capability,
            event.key === 'Home'
              ? capability.min
              : event.key === 'End'
                ? capability.max - (capability.colour === 'hue' ? capability.step : 0)
                : value + direction * capability.step * (event.shiftKey ? 10 : 1)
          );
          onChange(next);
          sender.cancel();
          onCommitRef.current?.(next, 'end');
          setAnnouncement(`${next} ${capability.unit}`);
        }}
      >
        <Icon name={capability.icon} size="lg" color="var(--uikw-control-colour)" />
      </Button>
      <Display as="span" size="sm">
        <Numeric>{formatted}</Numeric>
        <span className="uikw-unit"> {capability.unit}</span>
      </Display>
      <Caption tone="muted">{capability.label}</Caption>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
