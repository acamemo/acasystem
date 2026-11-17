import { createElement, type ComponentPropsWithRef } from 'react';
import { classes, withTone, type TextTone } from './tone';

export type TitleProps = ComponentPropsWithRef<'h1'> & {
  level?: 1 | 2 | 3;
  tone?: TextTone;
};

/** Title of a page or of a sheet: 1.73rem, regular weight. */
export function Title({ level = 1, tone, className, ...props }: TitleProps) {
  return createElement(`h${level}`, {
    ...props,
    className: withTone(tone, classes('aca-type', 'aca-type--title', className)),
  });
}
