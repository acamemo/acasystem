import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Body } from '../typography/Body';

export type StatusMessageProps = ComponentPropsWithRef<'div'> & {
  message: ReactNode;
  messageRole?: 'status' | 'alert';
};

/** Plain recovery content; the caller owns the full-page position and existing actions. */
export function StatusMessage({ message, messageRole = 'status', children, className = '', ...props }: StatusMessageProps) {
  return <div className={`aca-status-message ${className}`.trim()} {...props}>
    <Body role={messageRole}>{message}</Body>
    {children}
  </div>;
}
