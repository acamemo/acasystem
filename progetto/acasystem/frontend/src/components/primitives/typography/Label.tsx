import { createElement, type ComponentPropsWithRef } from 'react';
import { classes } from './tone';

export type LabelProps = ComponentPropsWithRef<'label'> & {
  /** label to name a form control (with htmlFor), span elsewhere. */
  as?: 'span' | 'label';
  /** Step of the scale; without it the label follows its material's size. */
  size?: 'sm' | 'md' | 'lg';
};

/** Engraved label of the kit: gradient ink, weight 500, the kit's -0.05em tracking. */
export function Label({ as = 'span', size, htmlFor, className, ...props }: LabelProps) {
  return createElement(as, {
    ...props,
    ...(as === 'label' ? { htmlFor } : {}),
    className: classes('aca-m__label', size && `aca-type--label-${size}`, className),
  });
}
