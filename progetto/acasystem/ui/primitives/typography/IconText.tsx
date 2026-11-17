import { createElement, type ComponentPropsWithRef } from 'react';
import { Icon, type IconName, type IconSize } from '../components/Icon';
import { classes, withTone, type TextTone } from './tone';

export type IconTone = 'active' | 'info' | 'danger';

/** Icons need ≥ 3:1: the -icon inks. The colour goes inline, as mx-icons sets color inline. */
const iconInk: Record<IconTone, string> = {
  active: 'var(--aca-orange-ink-icon)',
  info: 'var(--aca-blue-ink-icon)',
  danger: 'var(--aca-danger-ink-icon)',
};

export type IconTextProps = ComponentPropsWithRef<'span'> & {
  icon: IconName;
  as?: 'span' | 'p' | 'div';
  iconSize?: IconSize;
  /** Accent of the icon only, with the ≥ 3:1 icon inks; the text keeps its tone. */
  iconTone?: IconTone;
  tone?: TextTone;
};

/** Decorative icon followed by the text that carries the meaning. */
export function IconText({
  icon,
  as = 'span',
  iconSize = 'md',
  iconTone,
  tone,
  className,
  children,
  ...props
}: IconTextProps) {
  return createElement(
    as,
    { ...props, className: withTone(tone, classes('aca-icon-text', className)) },
    <Icon name={icon} size={iconSize} color={iconTone && iconInk[iconTone]} />,
    <span>{children}</span>
  );
}
