import { createElement, type ComponentPropsWithRef } from 'react';
import { classes, withTone, type TextTone } from './tone';

export type CaptionProps = ComponentPropsWithRef<'span'> & {
  as?: 'span' | 'p' | 'figcaption';
  tone?: TextTone;
};

/** Secondary text: units, hints, timestamps. Muted ink by default (≥ 4.5:1 on metal). */
export function Caption({ as = 'span', tone = 'muted', className, ...props }: CaptionProps) {
  return createElement(as, {
    ...props,
    className: withTone(tone, classes('aca-type', 'aca-type--caption', className)),
  });
}
