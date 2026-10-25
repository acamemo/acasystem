import type { ComponentPropsWithRef } from 'react';
import { Icon } from './Icon';
import type { MaterialSize } from './Material';

export type ToggleProps = Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'onChange' | 'role'
> & {
  /** State shown by the switch: the requested one while pending, the confirmed one otherwise. */
  checked: boolean;
  size?: MaterialSize;
  /** compact: the smaller switch of bars and rows. */
  compact?: boolean;
  /** Names of the two states, kept as hidden text (the switch role announces the state). */
  onLabel?: string;
  offLabel?: string;
  /**
   * The change was requested and is not yet confirmed (e.g. by Home Assistant):
   * aria-busy, half-strength fill and a short pulse.
   */
  pending?: boolean;
  /**
   * The last request failed: aria-invalid, danger ring and a mark on the knob.
   * The owner explains the error in text and links it with aria-describedby.
   */
  error?: boolean;
};

const GRIP = Array.from({ length: 12 }, (_, index) => index);

/**
 * Switch (REP-20261007-021), after the grip-knob switch shared by the user and adapted to Kit 2:
 * a raised rim, a recessed track (the accent fill when on) and a round knob with a 3×4 grip.
 * Geometry in em: track 3 × 1.5, knob 1.375 centred, so the gap around the knob is 0.0625 on
 * every side, on and off. State is in aria-checked; the knob moves with a transform.
 */
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
      className={[
        'aca-toggle',
        size !== 'inherit' && `aca-toggle--${size}`,
        compact && 'aca-toggle--compact',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <span className="aca-toggle__track" aria-hidden="true">
        <span className="aca-toggle__knob">
          {error ? (
            <Icon name="warning" className="aca-mark" color="var(--aca-danger-ink-icon)" />
          ) : (
            <span className="aca-toggle__grip">
              {GRIP.map((dot) => (
                <span key={dot} className="aca-toggle__dot" />
              ))}
            </span>
          )}
        </span>
      </span>
      {/* State name kept for the page (tests, copies); the switch role already announces it. */}
      <span className="aca-toggle__label" aria-hidden="true">
        {checked ? onLabel : offLabel}
      </span>
    </button>
  );
}
