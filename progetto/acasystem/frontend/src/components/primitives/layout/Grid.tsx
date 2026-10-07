import type { ComponentPropsWithRef } from 'react';

export type GridProps = ComponentPropsWithRef<'div'> & {
  /** Minimum column width of the auto-filled grid. */
  min?: string;
  gap?: string;
};

export function Grid({ min = '12rem', gap = '1.5rem', className, style, ...props }: GridProps) {
  return (
    <div
      className={['grid', className].filter(Boolean).join(' ')}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}, 1fr))`, gap, ...style }}
      {...props}
    />
  );
}
