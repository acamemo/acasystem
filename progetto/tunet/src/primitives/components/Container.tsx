import type { ComponentPropsWithRef } from 'react';

export type ContainerProps = ComponentPropsWithRef<'div'>;

export function Container(props: ContainerProps) {
  return <div {...props} />;
}
