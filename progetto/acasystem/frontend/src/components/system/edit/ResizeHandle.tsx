import type { PointerEvent } from 'react';
import './edit.css';

/** Side or corner of the widget the handle drags: -1 left/top, 1 right/bottom, 0 unchanged. */
export interface HandleEdge {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
}

const NAMES: Record<string, string> = {
  '0,-1': 'n',
  '1,-1': 'ne',
  '1,0': 'e',
  '1,1': 'se',
  '0,1': 's',
  '-1,1': 'sw',
  '-1,0': 'w',
  '-1,-1': 'nw',
};

/** Position name of an edge (n, ne, e, se, s, sw, w, nw). */
export const handleName = (edge: HandleEdge) => NAMES[`${edge.x},${edge.y}`] ?? 'se';

export type FrameSide = 'n' | 'e' | 's' | 'w';

/** The axes a widget can be resized along (min and max of its sizes differ). */
export interface ResizeAxes {
  x: boolean;
  y: boolean;
}

/** The eight dots of the selected widget, clockwise from the top (REP-20261008-001). */
export const RESIZE_DOTS: readonly HandleEdge[] = [
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
];

const SIDES: readonly FrameSide[] = ['n', 'e', 's', 'w'];
/** Reach of the corner dots along a side, at most this many px on long sides. */
const CORNER_REACH_PX = 48;

/**
 * Side or corner dragged from a point of the grip frame: the axis of the side is fixed, the
 * other one comes from the zone of the nearest dot (a quarter of the side, at most 48 px from
 * the corner). An axis the widget cannot be resized along stays 0.
 */
export function edgeFromPoint(
  side: FrameSide,
  point: { x: number; y: number },
  box: { left: number; top: number; width: number; height: number },
  axes: ResizeAxes
): HandleEdge {
  const along = (position: number, length: number): -1 | 0 | 1 => {
    const reach = Math.min(length / 4, CORNER_REACH_PX);
    if (position < reach) return -1;
    if (position > length - reach) return 1;
    return 0;
  };
  if (side === 'n' || side === 's') {
    return {
      x: axes.x ? along(point.x - box.left, box.width) : 0,
      y: side === 'n' ? -1 : 1,
    };
  }
  return {
    x: side === 'w' ? -1 : 1,
    y: axes.y ? along(point.y - box.top, box.height) : 0,
  };
}

/**
 * Grip frame of the selected widget (pointer only; the keyboard and the settings sheet are the
 * alternative): eight visible dots on the selection ring, in its colour, and a continuous frame
 * around the widget whose four sides resize it from wherever they are taken, the opposite side
 * staying. The sides and dots of an axis the widget cannot be resized along are not drawn; a
 * widget of one size shows the ring only.
 */
export function ResizeFrame({
  axes,
  onPointerDown,
}: {
  axes: ResizeAxes;
  onPointerDown: (side: FrameSide, event: PointerEvent<HTMLSpanElement>) => void;
}) {
  if (!axes.x && !axes.y) return null;
  const sides = SIDES.filter((side) => (side === 'n' || side === 's' ? axes.y : axes.x));
  const dots = RESIZE_DOTS.filter((edge) => (edge.x === 0 || axes.x) && (edge.y === 0 || axes.y));
  return (
    <span className="aca-resize-frame" aria-hidden="true">
      {sides.map((side) => (
        <span
          key={side}
          className={`aca-resize-frame__side aca-resize-frame__side--${side}`}
          data-resize-side={side}
          onPointerDown={(event) => onPointerDown(side, event)}
        />
      ))}
      {dots.map((edge) => {
        const name = handleName(edge);
        return (
          <span
            key={name}
            className={`aca-resize-dot aca-resize-dot--${name}`}
            data-resize-edge={name}
          />
        );
      })}
    </span>
  );
}
