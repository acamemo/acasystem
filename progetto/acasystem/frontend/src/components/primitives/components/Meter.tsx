import type { CSSProperties, ComponentPropsWithRef } from 'react';
import { MaterialLayers, materialClass, type MaterialSize } from './Material';

export type MeterProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  value: number;
  min?: number;
  max?: number;
  /** Accessible name. */
  label: string;
  /** Human-readable value, e.g. «22 °C». */
  valueText?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: MaterialSize;
};

/**
 * Read-only bar or column (ADR-0010): the slider's recessed track and orange fill, no input.
 * «aca-slider aca-slider--column aca-meter» (+ aca-slider--vertical).
 */
export function Meter({
  value,
  min = 0,
  max = 100,
  label,
  valueText,
  orientation = 'horizontal',
  size = 'md',
  className,
  style,
  ...props
}: MeterProps) {
  const span = max - min;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={[
        'aca-slider',
        'aca-slider--column',
        orientation === 'vertical' && 'aca-slider--vertical',
        'aca-meter',
        size !== 'inherit' && `aca-${size}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ...style, '--aca-ratio': ratio } as CSSProperties}
      {...props}
    >
      <span
        className={materialClass(
          { behavior: 'well', shape: 'pill', size: 'inherit' },
          'aca-slider__track'
        )}
        aria-hidden="true"
      >
        <MaterialLayers>
          <span className="aca-slider__fill" />
        </MaterialLayers>
      </span>
    </div>
  );
}
