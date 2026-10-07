import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { MaterialLayers, materialClass, type MaterialSize } from './Material';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type ProgressRingProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  value: number;
  max?: number;
  /** Accessible name of the progress bar. */
  label: string;
  /** Content of the raised core, e.g. value and caption. */
  children?: ReactNode;
  size?: MaterialSize;
};

/** Recessed disc with an ink arc and a raised metal core. */
export function ProgressRing({
  value,
  max = 100,
  label,
  children,
  size = 'md',
  className,
  ...props
}: ProgressRingProps) {
  const gradientId = `aca-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={materialClass({ behavior: 'well', shape: 'circle', size }, 'aca-ring', className)}
      {...props}
    >
      <MaterialLayers element="div" contentClassName="aca-ring__content">
        <svg className="aca-ring__arc" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--aca-arc-from)' }} />
              <stop offset="100%" style={{ stopColor: 'var(--aca-arc-to)' }} />
            </linearGradient>
          </defs>
          <circle className="aca-ring__track" cx="50" cy="50" r={RADIUS} />
          <circle
            className="aca-ring__value"
            cx="50"
            cy="50"
            r={RADIUS}
            stroke={`url(#${gradientId})`}
            strokeDasharray={`${ratio * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div
          className={materialClass(
            { behavior: 'static', shape: 'circle', size: 'inherit' },
            'aca-ring__core'
          )}
        >
          <MaterialLayers element="div" contentClassName="aca-ring__core-content">
            {children}
          </MaterialLayers>
        </div>
      </MaterialLayers>
    </div>
  );
}
