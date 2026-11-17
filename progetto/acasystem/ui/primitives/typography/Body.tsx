import { createElement, type ComponentPropsWithRef } from 'react';
import { classes, withTone, type TextTone } from './tone';

export type BodyProps = ComponentPropsWithRef<'p'> & {
  as?: 'p' | 'span' | 'div';
  /** md 1rem, sm 0.83rem. */
  size?: 'sm' | 'md';
  tone?: TextTone;
};

/** Running text: regular weight, comfortable line height. */
export function Body({ as = 'p', size = 'md', tone, className, ...props }: BodyProps) {
  return createElement(as, {
    ...props,
    className: withTone(tone, classes('aca-type', `aca-type--body-${size}`, className)),
  });
}
