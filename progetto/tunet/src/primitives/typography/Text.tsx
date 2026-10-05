import { createElement, type ComponentPropsWithRef } from 'react';

export type TextProps = ComponentPropsWithRef<'span'> & { as?: 'span' | 'p' };

export function Text({ as = 'span', ...props }: TextProps) {
  return createElement(as, props);
}
