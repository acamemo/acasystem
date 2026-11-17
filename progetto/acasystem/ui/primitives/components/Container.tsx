import type { ComponentPropsWithRef } from 'react';

export type ContainerProps = ComponentPropsWithRef<'div'> & {
  surface?: 'raised' | 'inset';
};

export function Container({ surface, className = '', ...props }: ContainerProps) {
  const classes = [surface ? `aca-surface aca-surface--${surface}` : '', className]
    .filter(Boolean)
    .join(' ');
  return <div className={classes || undefined} {...props} />;
}
