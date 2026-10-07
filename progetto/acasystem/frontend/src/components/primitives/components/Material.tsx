import { Children, type ReactNode } from 'react';

/** Behaviour of a material: reference hover/press, rest only, or permanently recessed. */
export type MaterialBehavior = 'press' | 'static' | 'well';
export type MaterialShape = 'pill' | 'circle' | 'rounded' | 'card';
/** inherit keeps the parent's font size, so a nested material scales with its host. */
export type MaterialSize = 'sm' | 'md' | 'lg' | 'inherit';

export interface MaterialOptions {
  behavior?: MaterialBehavior;
  shape?: MaterialShape;
  size?: MaterialSize;
}

/** Class list of a material socket (.aca-m) plus any extra classes. */
export function materialClass(
  { behavior = 'static', shape = 'pill', size = 'md' }: MaterialOptions,
  ...extra: Array<string | false | null | undefined>
) {
  return [
    'aca-m',
    `aca-m--${behavior}`,
    `aca-m--${shape}`,
    size !== 'inherit' && `aca-m--${size}`,
    ...extra,
  ]
    .filter(Boolean)
    .join(' ');
}

export interface MaterialLayersProps {
  /** span inside buttons and other phrasing content, div for block containers. */
  element?: 'span' | 'div';
  contentClassName?: string;
  children?: ReactNode;
}

/** Shell, face and content layers placed inside a material socket. */
export function MaterialLayers({
  element = 'span',
  contentClassName,
  children,
}: MaterialLayersProps) {
  const Layer = element;
  return (
    <Layer className="aca-m__outer">
      <Layer className="aca-m__face">
        <Layer className={['aca-m__content', contentClassName].filter(Boolean).join(' ')}>
          {children}
        </Layer>
      </Layer>
    </Layer>
  );
}

/** Wraps bare text in an engraved label, as the reference does with its span. */
export function engrave(children: ReactNode) {
  return Children.map(children, (child) =>
    typeof child === 'string' || typeof child === 'number' ? (
      <span className="aca-m__label">{child}</span>
    ) : (
      child
    )
  );
}
