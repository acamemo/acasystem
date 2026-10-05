import type { ComponentPropsWithRef } from 'react';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'plain' | 'primary' | 'secondary';
};

const actionStyle =
  'flex items-center gap-3 rounded-2xl px-8 py-4 text-sm font-bold tracking-widest uppercase shadow-lg transition-all duration-200 active:scale-95';
const variants = {
  plain: '',
  primary: 'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color)]',
  secondary:
    'border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]',
};

export function Button({ type = 'button', variant = 'plain', className = '', ...props }: ButtonProps) {
  const classes = [variant === 'plain' ? '' : actionStyle, variants[variant], className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes || undefined} {...props} />;
}
