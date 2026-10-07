import type { ComponentPropsWithRef } from 'react';
import {
  MaterialLayers,
  engrave,
  materialClass,
  type MaterialShape,
  type MaterialSize,
} from './Material';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  /**
   * plain: no material; primary: the orange action, one per view; secondary and control: metal
   * pills; danger: a destructive action, red ink on metal (never the orange of «primary»).
   */
  variant?: 'plain' | 'primary' | 'secondary' | 'control' | 'danger';
  shape?: MaterialShape;
  size?: MaterialSize;
  /** Classes for the content layer (layout of icon and label). className stays on the socket. */
  contentClassName?: string;
  /**
   * The action is running: aria-busy, a short pulse of the content, clicks ignored.
   * The button stays focusable, so focus is not lost while waiting.
   */
  loading?: boolean;
};

const variants = {
  primary: { shape: 'pill', size: 'lg', extra: 'aca-m--primary' },
  secondary: { shape: 'pill', size: 'lg', extra: 'aca-m--quiet' },
  control: { shape: 'pill', size: 'sm', extra: undefined },
  danger: { shape: 'pill', size: 'lg', extra: 'aca-m--danger' },
} as const;

export function Button({
  type = 'button',
  variant = 'plain',
  shape,
  size,
  contentClassName,
  loading = false,
  className = '',
  onClick,
  children,
  ...props
}: ButtonProps) {
  const busy = loading ? { 'aria-busy': true as const } : {};
  const handleClick = loading ? undefined : onClick;
  if (variant === 'plain') {
    return (
      <button
        type={type}
        className={className || undefined}
        onClick={handleClick}
        {...busy}
        {...props}
      >
        {children}
      </button>
    );
  }
  const preset = variants[variant];
  const classes = materialClass(
    { behavior: 'press', shape: shape ?? preset.shape, size: size ?? preset.size },
    preset.extra,
    className
  );
  return (
    <button type={type} className={classes} onClick={handleClick} {...busy} {...props}>
      <MaterialLayers contentClassName={contentClassName}>{engrave(children)}</MaterialLayers>
    </button>
  );
}
