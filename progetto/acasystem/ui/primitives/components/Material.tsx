import { Children, type ReactNode } from 'react';

/** Behaviour of a material: reference hover/press, rest only, or permanently recessed. */
export type MaterialBehavior = 'press' | 'static' | 'well';
export type MaterialShape = 'pill' | 'circle' | 'rounded' | 'square' | 'card';
/** inherit keeps the parent's font size, so a nested material scales with its host. */
export type MaterialSize = 'sm' | 'md' | 'lg' | 'xl' | 'inherit';

export interface MaterialOptions {
  behavior?: MaterialBehavior;
  shape?: MaterialShape;
  size?: MaterialSize;
}

/*
 * Families of the composable kit (ADR-0010): one value per family, combined like utilities.
 */
export type KitRelief = 'raised' | 'well' | 'well-soft';
export type KitTone = 'primary' | 'quiet' | 'danger';
export type KitMotion = 'press' | 'hover-light' | 'wiggle';
export type KitState = 'on' | 'current' | 'selected' | 'error';

export interface KitOptions {
  relief?: KitRelief;
  shape?: MaterialShape;
  size?: MaterialSize;
  tone?: KitTone;
  motion?: readonly KitMotion[];
  state?: KitState | false | null;
  /** Fills the parent's height (.aca-stretch). */
  stretch?: boolean;
}

type Extra = Array<string | false | null | undefined>;

const join = (classes: Extra) => classes.filter(Boolean).join(' ');

/**
 * Class list of a composed material: base, relief, shape, size, tone, motion, state.
 * e.g. kitClass({ relief: 'raised', shape: 'square', motion: ['press'], state: 'on' }, 'aca-tile')
 */
export function kitClass(
  {
    relief = 'raised',
    shape = 'pill',
    size = 'md',
    tone,
    motion = [],
    state,
    stretch = false,
  }: KitOptions,
  ...extra: Extra
) {
  return join([
    'aca-m',
    `aca-${relief}`,
    `aca-${shape}`,
    size !== 'inherit' && `aca-${size}`,
    tone && `aca-tone-${tone}`,
    ...motion.map((name) => `aca-fx-${name}`),
    state && `aca-${state}`,
    stretch && 'aca-stretch',
    ...extra,
  ]);
}

const reliefOf: Record<MaterialBehavior, KitRelief> = {
  press: 'raised',
  static: 'raised',
  well: 'well',
};

/**
 * Class list of a material socket from the first kit's options. It emits the composed families
 * (press = raised + press + hover light) and, until the app is migrated, the aca-m--* aliases
 * the CSS answers to as well.
 */
export function materialClass(
  { behavior = 'static', shape = 'pill', size = 'md' }: MaterialOptions,
  ...extra: Extra
) {
  return join([
    kitClass({
      relief: reliefOf[behavior],
      shape,
      size,
      motion: behavior === 'press' ? ['press', 'hover-light'] : [],
    }),
    `aca-m--${behavior}`,
    shape !== 'square' && `aca-m--${shape}`,
    size !== 'inherit' && size !== 'xl' && `aca-m--${size}`,
    ...extra,
  ]);
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
