/**
 * Still picture of the plan, drawn in SVG from the rooms (ADR-0014, R1): no canvas, no WebGL, no 3D
 * code. It is the picture of the launcher page and the one under the live view of the house screen
 * until the canvas exists. Neutral on purpose (no lights, no states). The text alternative of the
 * picture is the list of rooms, which the house screen offers in its menu.
 */
import { useId } from 'react';
import './casa3dPlanPreview.css';

export interface PreviewRoom {
  id: string;
  name: string;
  /** Corners on the floor, in metres: [x, z]. */
  points: ReadonlyArray<readonly number[]>;
}

const MARGIN = 0.5;

function bounds(rooms: readonly PreviewRoom[]) {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const room of rooms) {
    for (const [x = 0, z = 0] of room.points) {
      minX = Math.min(minX, x);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxZ = Math.max(maxZ, z);
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, minZ: 0, width: 1, height: 1 };
  return { minX, minZ, width: Math.max(maxX - minX, 1), height: Math.max(maxZ - minZ, 1) };
}

/**
 * `decorative` hides the picture from assistive technology: while the live view is on screen it
 * is the picture, so the still plan under it must not be read as a second image.
 */
export function Casa3dPlanPreview({
  rooms,
  decorative = false,
}: {
  rooms: readonly PreviewRoom[];
  decorative?: boolean;
}) {
  const titleId = useId();
  const box = bounds(rooms);
  const viewBox = `${box.minX - MARGIN} ${box.minZ - MARGIN} ${box.width + MARGIN * 2} ${
    box.height + MARGIN * 2
  }`;
  return (
    <svg
      className="c3d-plan"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-labelledby': titleId })}
    >
      {!decorative && <title id={titleId}>Anteprima della pianta della casa</title>}
      {rooms.map((room) => (
        <polygon
          key={room.id}
          className="c3d-plan__room"
          points={room.points.map(([x = 0, z = 0]) => `${x},${z}`).join(' ')}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
