import { createElement, type ComponentPropsWithRef } from 'react';

export type HeadingProps = ComponentPropsWithRef<'h1'> & { level: 1 | 2 | 3 | 4 | 5 | 6 };

export function Heading({ level, ...props }: HeadingProps) {
  return createElement(`h${level}`, props);
}
