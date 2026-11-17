import { createElement, type ComponentPropsWithRef } from 'react';
import { withTone, type TextTone } from './tone';

export type TextProps = ComponentPropsWithRef<'span'> & { as?: 'span' | 'p'; tone?: TextTone };

/** Unstyled text with an optional ink tone; the scale lives in Body, Caption and the others. */
export function Text({ as = 'span', tone, className, ...props }: TextProps) {
  return createElement(as, { ...props, className: withTone(tone, className) });
}
