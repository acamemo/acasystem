/**
 * What the host reads of a plan from the server (ADR-0014, R1): floors, rooms and their corners,
 * for the still picture of the launcher page, the room list and the floor choice. The plan itself
 * is the bundle's model (`casa3d/src/model.ts`); here it is only looked at, defensively, because it
 * comes from the network: anything that is not as expected is left out, never thrown at.
 */
import { isRecord } from '@/validators/guards';

export interface PlanRoom {
  id: string;
  name: string;
  /** Corners on the floor, in metres: [x, z]. */
  points: ReadonlyArray<readonly number[]>;
}

export interface PlanFloor {
  id: string;
  name: string;
  rooms: PlanRoom[];
}

function pointsOf(value: unknown): Array<readonly number[]> {
  if (!Array.isArray(value)) return [];
  const points: Array<readonly number[]> = [];
  for (const point of value) {
    if (
      Array.isArray(point) &&
      typeof point[0] === 'number' &&
      typeof point[1] === 'number' &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1])
    ) {
      points.push([point[0], point[1]]);
    }
  }
  return points;
}

/** The floors of a plan with their rooms; a room without a name or an id is left out. */
export function floorsOf(building: unknown): PlanFloor[] {
  if (!isRecord(building) || !Array.isArray(building.floors)) return [];
  const floors: PlanFloor[] = [];
  building.floors.forEach((floor: unknown, index: number) => {
    if (!isRecord(floor)) return;
    const id = typeof floor.id === 'string' && floor.id !== '' ? floor.id : `piano-${index + 1}`;
    const name =
      typeof floor.name === 'string' && floor.name !== '' ? floor.name : `Piano ${index + 1}`;
    const rooms: PlanRoom[] = [];
    if (Array.isArray(floor.rooms)) {
      for (const room of floor.rooms as unknown[]) {
        if (!isRecord(room) || typeof room.id !== 'string' || room.id === '') continue;
        rooms.push({
          id: room.id,
          name: typeof room.name === 'string' && room.name !== '' ? room.name : room.id,
          points: pointsOf(room.points),
        });
      }
    }
    floors.push({ id, name, rooms });
  });
  return floors;
}

/** True when the plan has at least one room: a house was drawn. */
export function hasHouse(floors: readonly PlanFloor[]): boolean {
  return floors.some((floor) => floor.rooms.length > 0);
}

/** The rooms the still picture draws: those of the first floor that has any. */
export function previewRoomsOf(floors: readonly PlanFloor[]): PlanRoom[] {
  return floors.find((floor) => floor.rooms.length > 0)?.rooms ?? [];
}
