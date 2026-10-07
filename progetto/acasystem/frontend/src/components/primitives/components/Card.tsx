import type { ComponentPropsWithRef } from 'react';

export type CardProps = ComponentPropsWithRef<'div'> & {
  /** aca applies the pressure material; none leaves the caller's own styling (e.g. edit mode). */
  material?: 'aca' | 'none';
};

export function Card({ material = 'aca', className = '', ...props }: CardProps) {
  const classes = [material === 'aca' ? 'aca-card' : '', className].filter(Boolean).join(' ');
  return <div className={classes || undefined} {...props} />;
}
