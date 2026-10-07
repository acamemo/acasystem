import type { CSSProperties, ComponentPropsWithRef } from 'react';
import { Icon } from './Icon';
import { MaterialLayers, materialClass, type MaterialSize } from './Material';

export type SliderProps = Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'size' | 'min' | 'max'
> & {
  /** Value shown: the requested one while pending, the confirmed one otherwise. */
  value: number;
  min?: number;
  max?: number;
  onValueChange: (value: number) => void;
  /** Accessible name of the range input. */
  label: string;
  /** Human-readable value announced by assistive technology. */
  valueText?: string;
  size?: MaterialSize;
  /** Requested, not yet confirmed: aria-busy, half-strength fill and a short pulse. */
  pending?: boolean;
  /** The last request failed: aria-invalid, danger LED in the track and a mark on the thumb. */
  error?: boolean;
  /** vertical: bottom = min, the fill rises (thermometer). */
  orientation?: 'horizontal' | 'vertical';
  /**
   * thumb: thin track with the metal thumb; column: thick track the fill occupies, no thumb
   * (bar, thermometer). Both are dragged and used from the keyboard the same way.
   */
  variant?: 'thumb' | 'column';
};

/**
 * Native range input (keyboard, pointer, assistive technology) laid over a recessed track,
 * an orange fill and a hosted metal thumb.
 */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  label,
  valueText,
  size = 'md',
  pending = false,
  error = false,
  orientation = 'horizontal',
  variant = 'thumb',
  className,
  ...props
}: SliderProps) {
  const span = max - min;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0;
  return (
    <div
      className={[
        'aca-slider',
        'aca-m-host',
        size !== 'inherit' && `aca-m--${size}`,
        orientation === 'vertical' && 'aca-slider--vertical',
        variant === 'column' && 'aca-slider--column',
        pending && 'aca-slider--pending',
        error && 'aca-slider--error',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--aca-ratio': ratio } as CSSProperties}
    >
      <span
        className={materialClass(
          { behavior: 'well', shape: 'pill', size: 'inherit' },
          'aca-slider__track',
          error && 'aca-m--error'
        )}
        aria-hidden="true"
      >
        <MaterialLayers>
          <span className="aca-slider__fill" />
        </MaterialLayers>
      </span>
      {variant === 'thumb' && (
        <span
          className={materialClass(
            { behavior: 'static', shape: 'circle', size: 'inherit' },
            'aca-m--hosted',
            'aca-slider__knob'
          )}
          aria-hidden="true"
        >
          <MaterialLayers>
            {error && (
              <Icon name="warning" className="aca-mark" color="var(--aca-danger-ink-icon)" />
            )}
          </MaterialLayers>
        </span>
      )}
      <input
        type="range"
        className="aca-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
        aria-valuetext={valueText}
        aria-busy={pending || undefined}
        aria-invalid={error || undefined}
        onChange={(event) => onValueChange(Number(event.target.value))}
        {...props}
      />
    </div>
  );
}
