import type { ComponentPropsWithRef } from 'react';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'plain' | 'primary' | 'secondary' | 'control';
};

const variants = {
  plain: '',
  primary: 'aca-control aca-action aca-action--primary',
  secondary: 'aca-control aca-action',
  control: 'aca-control',
};

export function Button({
  type = 'button',
  variant = 'plain',
  className = '',
  ...props
}: ButtonProps) {
  const classes = [variants[variant], className].filter(Boolean).join(' ');
  return <button type={type} className={classes || undefined} {...props} />;
}
