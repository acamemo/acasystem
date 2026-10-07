import type { ComponentPropsWithRef, CSSProperties } from 'react';
import { Label } from '../typography/Label';
import { Icon, type IconName } from './Icon';
import { MaterialLayers, kitClass, type KitState } from './Material';

export type TileProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  icon: IconName;
  /** Name engraved at the bottom of the tile. */
  name: string;
  /**
   * Toggle tile: aria-pressed and the orange «on» line. Leave undefined for an action tile
   * (no pressed state).
   */
  on?: boolean;
  /** Other visual state, e.g. current (blue line). «on» wins when both are given. */
  state?: KitState | false | null;
  /**
   * Side as a CSS length (snapped to 4 px). Without it the tile fills the width of its cell,
   * rounded down to 4 px.
   */
  dim?: string;
};

const withDim = (style: CSSProperties | undefined, dim: string | undefined) =>
  dim ? ({ ...style, '--aca-dim': dim } as CSSProperties) : style;

/**
 * Square tile of the kit (ADR-0010): raised square, press and hover light, icon at the top
 * left and the name at the bottom. «aca-m aca-raised aca-square aca-fx-press aca-tile».
 */
export function Tile({ icon, name, on, state, dim, className, style, ...props }: TileProps) {
  return (
    <button
      type="button"
      className={kitClass(
        { shape: 'square', motion: ['press', 'hover-light'], state: on ? 'on' : state },
        'aca-tile',
        className
      )}
      aria-pressed={on}
      style={withDim(style, dim)}
      {...props}
    >
      <MaterialLayers>
        <Icon name={icon} size="lg" />
        <Label>{name}</Label>
      </MaterialLayers>
    </button>
  );
}

export type AddTileProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  /** Visible text under the «+». */
  label?: string;
  dim?: string;
};

/**
 * Free slot with «+»: soft well and press.
 * «aca-m aca-well-soft aca-square aca-fx-press aca-tile aca-tile--add».
 */
export function AddTile({ label = 'Aggiungi', dim, className, style, ...props }: AddTileProps) {
  return (
    <button
      type="button"
      className={kitClass(
        { relief: 'well-soft', shape: 'square', motion: ['press'] },
        'aca-tile',
        'aca-tile--add',
        className
      )}
      style={withDim(style, dim)}
      {...props}
    >
      <MaterialLayers>
        <Icon name="add" size="lg" />
        <Label>{label}</Label>
      </MaterialLayers>
    </button>
  );
}
