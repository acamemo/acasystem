import { createElement, type ComponentPropsWithRef } from 'react';
import { classes, withTone, type TextTone } from './tone';

export type HeadingSize = 'sm' | 'md' | 'lg';

export type HeadingProps = ComponentPropsWithRef<'h1'> & {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  tone?: TextTone;
  /** Step of the type scale (500). Without it the heading keeps the caller's classes only. */
  size?: HeadingSize;
};

export function Heading({ level, tone, size, className, ...props }: HeadingProps) {
  return createElement(`h${level}`, {
    ...props,
    className: withTone(tone, classes(size && `aca-type aca-type--heading-${size}`, className)),
  });
}
