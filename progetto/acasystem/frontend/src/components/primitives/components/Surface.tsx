import type { ComponentPropsWithRef } from 'react';
import { MaterialLayers, materialClass, type MaterialOptions } from './Material';

export type SurfaceProps = ComponentPropsWithRef<'div'> &
  MaterialOptions & {
    /** Classes for the content layer; className stays on the socket. */
    contentClassName?: string;
    /** Danger LED on the face; the content explains the problem in text. */
    error?: boolean;
  };

/** Block container made of the material layers: static, pressable or recessed. */
export function Surface({
  behavior = 'static',
  shape = 'card',
  size,
  contentClassName,
  error = false,
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={materialClass({ behavior, shape, size }, error && 'aca-m--error', className)}
      {...props}
    >
      <MaterialLayers element="div" contentClassName={contentClassName}>
        {children}
      </MaterialLayers>
    </div>
  );
}
