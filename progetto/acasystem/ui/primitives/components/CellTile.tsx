import {
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { classes } from '../classes';

/**
 * The formats of the Home grid (REP-20261127-001). One square cell is the unit; every widget
 * that uses these primitives draws exactly one layout per format:
 * - `round`: 1×1, the icon alone;
 * - `pill`: 2×1, icon in a circle, then name and state;
 * - `tall`: 1×2, a vertical fill (a slider) or icon above and text below;
 * - `square`: 2×2 and larger, icon at the top left, name and state at the bottom, or a module
 *   of up to four round controls.
 */
export type CellFormat = 'round' | 'pill' | 'tall' | 'square';

/** Format for a size in cells: 1×1 round, wider than tall a pill, taller than wide tall. */
export function cellFormat(size: { w: number; h: number }): CellFormat {
  if (size.w <= 1 && size.h <= 1) return 'round';
  if (size.h <= 1) return 'pill';
  if (size.w <= 1) return 'tall';
  return 'square';
}

export type CellTone = 'accent' | 'warm';

export type CellTileProps = ComponentPropsWithoutRef<'div'> & {
  format: CellFormat;
  /** The controlled thing is on: the round format fills itself. */
  on?: boolean;
  tone?: CellTone;
  /** Square format holding a module of round controls instead of icon and text. */
  module?: boolean;
};

/** Layout of one tile's content inside the grid frame; it draws no frame of its own. */
export function CellTile({ format, on, tone = 'accent', module, className, children, ...props }: CellTileProps) {
  return (
    <div
      className={classes(
        'aca-cell-tile',
        `aca-cell-tile--${format}`,
        module && 'aca-cell-tile--module',
        on && 'is-on',
        `aca-cell-tone--${tone}`,
        className
      )}
      data-cell-format={format}
      {...props}
    >
      {children}
    </div>
  );
}

export type CellOrbProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  /** The glyph, already sized by the caller (an Icon). */
  icon: ReactNode;
  /** Accessible name of the command, e.g. «Accendi Cucina». */
  label: string;
  on: boolean;
  tone?: CellTone;
  pending?: boolean;
  /** Bigger orb: the whole 1×1 tile or a module cell. */
  size?: 'md' | 'lg';
};

/** Round command with the state in its fill: the circle of the pill, square and module. */
export function CellOrb({
  icon,
  label,
  on,
  tone = 'accent',
  pending,
  size = 'md',
  className,
  ...props
}: CellOrbProps) {
  return (
    <button
      type="button"
      className={classes(
        'aca-cell-orb',
        `aca-cell-orb--${size}`,
        `aca-cell-tone--${tone}`,
        on && 'is-on',
        pending && 'is-pending',
        className
      )}
      aria-pressed={on}
      aria-label={label}
      aria-busy={pending || undefined}
      data-no-long-press=""
      {...props}
    >
      {icon}
    </button>
  );
}

export interface CellLabelProps {
  name: string;
  state?: ReactNode;
  /** Lines the name may take before it is cut. */
  nameLines?: 1 | 2;
  className?: string;
}

/** Name and state of a tile: one weight for the name, the state muted under it. */
export function CellLabel({ name, state, nameLines = 1, className }: CellLabelProps) {
  return (
    <span className={classes('aca-cell-label', className)}>
      <span className={classes('aca-cell-label__name', `aca-cell-clamp-${nameLines}`)}>{name}</span>
      {state !== undefined && state !== null && state !== '' && (
        <span className="aca-cell-label__state">{state}</span>
      )}
    </span>
  );
}

/** Movement before a press on the fill becomes a drag instead of a tap. */
export const FILL_DRAG_THRESHOLD_PX = 6;

export type FillPhase = 'move' | 'end' | 'step';

export interface FillSliderProps {
  /** 0–100. */
  value: number;
  /** Accessible name, e.g. «Luminosità di Cucina». */
  label: string;
  valueText?: string;
  disabled?: boolean;
  pending?: boolean;
  tone?: CellTone;
  /** Arrow keys and the page step. */
  step?: number;
  onValueChange: (value: number, phase: FillPhase) => void;
  /** A press that did not move (or Enter/Space): e.g. switch the light. */
  onTap?: () => void;
  /** Drawn over the fill at the bottom (the icon). */
  children?: ReactNode;
  className?: string;
}

interface Drag {
  pointerId: number;
  startY: number;
  moved: boolean;
  top: number;
  height: number;
}

/**
 * Vertical fill that rises from the bottom, the 1×2 slider of the grid: drag anywhere on it
 * to set the value, a tap runs `onTap`. Keyboard: arrows and Page Up/Down change the value,
 * Home/End go to 0/100, Enter and Space tap.
 */
export function FillSlider({
  value,
  label,
  valueText,
  disabled,
  pending,
  tone = 'accent',
  step = 10,
  onValueChange,
  onTap,
  children,
  className,
}: FillSliderProps) {
  const drag = useRef<Drag | null>(null);
  const clamped = Math.min(100, Math.max(0, Math.round(value)));

  const at = (current: Drag, clientY: number) =>
    Math.min(100, Math.max(0, ((current.top + current.height - clientY) / current.height) * 100));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    // The gesture is the slider's: no page swipe or long press of the launcher from here.
    event.stopPropagation();
    const box = event.currentTarget.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      moved: false,
      top: box.top,
      height: box.height || 1,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    if (!current.moved && Math.abs(event.clientY - current.startY) < FILL_DRAG_THRESHOLD_PX) return;
    current.moved = true;
    onValueChange(at(current, event.clientY), 'move');
  };
  const finish = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (current.moved) onValueChange(cancelled ? clamped : at(current, event.clientY), 'end');
    else if (!cancelled) onTap?.();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const keys: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: step * 2,
      PageDown: -step * 2,
    };
    if (event.key in keys) {
      event.preventDefault();
      onValueChange(Math.min(100, Math.max(0, clamped + keys[event.key]!)), 'step');
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      onValueChange(event.key === 'Home' ? 0 : 100, 'step');
    } else if ((event.key === 'Enter' || event.key === ' ') && onTap) {
      event.preventDefault();
      onTap();
    }
  };

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      aria-busy={pending || undefined}
      data-no-long-press=""
      data-level={clamped < 22 ? 'low' : clamped > 72 ? 'high' : 'mid'}
      className={classes(
        'aca-cell-fill',
        `aca-cell-tone--${tone}`,
        pending && 'is-pending',
        disabled && 'is-disabled',
        className
      )}
      style={{ '--aca-cell-fill': `${clamped}%` } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event, false)}
      onPointerCancel={(event) => finish(event, true)}
      onKeyDown={onKeyDown}
    >
      <span className="aca-cell-fill__level" aria-hidden="true" />
      {children && <span className="aca-cell-fill__content">{children}</span>}
    </div>
  );
}
