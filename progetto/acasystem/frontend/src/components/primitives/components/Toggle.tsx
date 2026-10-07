import type { ComponentPropsWithRef } from 'react';
import { Icon } from './Icon';
import { MaterialLayers, materialClass, type MaterialSize } from './Material';

export type ToggleProps = Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'onChange' | 'role'
> & {
  /** State shown by the switch: the requested one while pending, the confirmed one otherwise. */
  checked: boolean;
  size?: MaterialSize;
  /** compact hides the label and shortens the track. */
  compact?: boolean;
  onLabel?: string;
  offLabel?: string;
  /**
   * The change was requested and is not yet confirmed (e.g. by Home Assistant):
   * aria-busy, half-strength fill and a short pulse.
   */
  pending?: boolean;
  /**
   * The last request failed: aria-invalid, danger LED and a mark on the knob.
   * The owner explains the error in text and links it with aria-describedby.
   */
  error?: boolean;
};

/** Switch made of a recessed track and a hosted metal knob; state is in aria-checked. */
export function Toggle({
  checked,
  size = 'md',
  compact = false,
  onLabel = 'Acceso',
  offLabel = 'Spento',
  pending = false,
  error = false,
  type = 'button',
  className,
  ...props
}: ToggleProps) {
  return (
    <button
      type={type}
      role="switch"
      aria-checked={checked}
      aria-busy={pending || undefined}
      aria-invalid={error || undefined}
      className={materialClass(
        { behavior: 'well', shape: 'pill', size },
        'aca-toggle',
        'aca-m-host',
        compact && 'aca-toggle--compact',
        className
      )}
      {...props}
    >
      <MaterialLayers contentClassName="aca-toggle__content">
        {!compact && (
          <span className="aca-m__label aca-toggle__label" aria-hidden="true">
            {checked ? onLabel : offLabel}
          </span>
        )}
        <span
          className={materialClass(
            { behavior: 'static', shape: 'circle', size: 'inherit' },
            'aca-m--hosted',
            'aca-toggle__knob'
          )}
          aria-hidden="true"
        >
          <MaterialLayers>
            {error && (
              <Icon name="warning" className="aca-mark" color="var(--aca-danger-ink-icon)" />
            )}
          </MaterialLayers>
        </span>
      </MaterialLayers>
    </button>
  );
}
