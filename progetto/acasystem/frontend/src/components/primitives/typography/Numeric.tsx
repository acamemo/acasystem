import { createElement, type ComponentPropsWithRef } from 'react';
import { classes, withTone, type TextTone } from './tone';

export type NumericProps = ComponentPropsWithRef<'data'> & {
  /** data with a machine-readable value, time with dateTime, span otherwise. */
  as?: 'span' | 'data' | 'time';
  tone?: TextTone;
  dateTime?: string;
};

/** Figures with tabular digits that never wrap away from their unit (e.g. «8.989,30 €»). */
export function Numeric({ as = 'span', tone, className, ...props }: NumericProps) {
  return createElement(as, {
    ...props,
    className: withTone(tone, classes('aca-numeric', className)),
  });
}
