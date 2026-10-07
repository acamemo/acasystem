import { createElement, type ComponentPropsWithRef } from 'react';
import { classes, withTone, type TextTone } from './tone';

export type DisplayProps = ComponentPropsWithRef<'p'> & {
  as?: 'p' | 'span' | 'div' | 'h1' | 'time';
  /** sm 2.07rem, md 2.49rem, lg 2.99rem; light weight. */
  size?: 'sm' | 'md' | 'lg';
  tone?: TextTone;
  /** Machine-readable value when rendered as time. */
  dateTime?: string;
};

/** Large light figures and words: date of the cover, clock, the main value of a widget. */
export function Display({ as = 'p', size = 'md', tone, className, ...props }: DisplayProps) {
  return createElement(as, {
    ...props,
    className: withTone(tone, classes('aca-type', `aca-type--display-${size}`, className)),
  });
}
