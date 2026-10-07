import type { ComponentPropsWithRef } from 'react';

export type BadgeProps = ComponentPropsWithRef<'span'>;

/** Decorative notification dot; the owner's accessible name must carry the information. */
export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={['aca-badge', className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
