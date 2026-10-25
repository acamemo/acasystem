/**
 * The example plan of the Casa 3D development page (ADR-0014, T3): an invented flat of 9 by 8 m
 * with six rooms, written for Acasystem (it is not the data of any demo). Its rooms are tied to the
 * areas of the Home Assistant in use, so that the real states show in them: an area whose name is
 * the name of a room goes to that room, the other areas take the remaining rooms in alphabetical
 * order. The devices of a tied area are laid out as pins in its room. Without areas (or for a user
 * who may not read them) the rooms keep their own names and carry no devices.
 */
import type { Casa3dArea, Casa3dDevice, Casa3dEntityEntry } from './contract';
import plan from './casa-esempio.json';

export type ExampleBuilding = typeof plan;
type Room = ExampleBuilding['floors'][number]['rooms'][number];

/** The registries the plan is tied with (the parts of the adapter's hass object it needs). */
export interface ExampleSource {
  areas: Record<string, Casa3dArea>;
  devices?: Record<string, Casa3dDevice>;
  entities?: Record<string, Casa3dEntityEntry>;
}

export interface ExamplePlan {
  building: ExampleBuilding;
  /** Rooms tied to a Home Assistant area. */
  bound: number;
  /** Device pins laid out in the tied rooms. */
  pins: number;
}

/** Domains that make a pin: what a person switches or watches in a room. */
const PIN_DOMAINS = new Set([
  'light',
  'switch',
  'cover',
  'climate',
  'media_player',
  'camera',
  'lock',
  'fan',
  'binary_sensor',
]);
/** Most pins in one room: the view is a picture of the house, not a list. */
const MAX_PINS_PER_ROOM = 8;
const PIN_STEP = 0.7;

const normalize = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Entities of an area: those placed in it directly and those of its devices; hidden and technical ones left out. */
function areaEntities(areaId: string, source: ExampleSource): string[] {
  const devices = source.devices ?? {};
  const ids: string[] = [];
  for (const entry of Object.values(source.entities ?? {})) {
    if (entry.hidden || entry.entity_category) continue;
    if (!PIN_DOMAINS.has(entry.entity_id.split('.')[0] ?? '')) continue;
    const area = entry.area_id ?? (entry.device_id ? devices[entry.device_id]?.area_id : null);
    if (area === areaId) ids.push(entry.entity_id);
  }
  return ids.sort();
}

function pinsFor(room: Room, entityIds: string[]) {
  const xs = room.points.map((point) => point[0]);
  const zs = room.points.map((point) => point[1]);
  const x0 = Math.min(...xs) + 0.6;
  const z0 = Math.min(...zs) + 0.6;
  const columns = Math.max(1, Math.floor((Math.max(...xs) - 0.6 - x0) / PIN_STEP) + 1);
  return entityIds.slice(0, MAX_PINS_PER_ROOM).map((entityId, index) => ({
    entity_id: entityId,
    x: Math.round((x0 + (index % columns) * PIN_STEP) * 100) / 100,
    z: Math.round((z0 + Math.floor(index / columns) * PIN_STEP) * 100) / 100,
    y: null,
    mount: null,
    rotation: 0,
    // a light stays a pin on purpose: the model would turn it into a lamp of the furniture otherwise
    pin: entityId.startsWith('light.') || undefined,
  }));
}

/** A fresh copy of the example plan, with its rooms tied to the given areas. */
export function buildExamplePlan(source: ExampleSource): ExamplePlan {
  const building = JSON.parse(JSON.stringify(plan)) as ExampleBuilding;
  const floor = building.floors[0];
  const rooms = floor?.rooms ?? [];
  const areas = Object.values(source.areas).sort((a, b) => a.name.localeCompare(b.name, 'it'));

  // 1. an area with the name of a room; 2. the other areas, in order, into the rooms left
  const tied = new Map<string, Casa3dArea>();
  const free: Casa3dArea[] = [];
  for (const area of areas) {
    const room = rooms.find(
      (candidate) => !tied.has(candidate.id) && normalize(candidate.name) === normalize(area.name)
    );
    if (room) tied.set(room.id, area);
    else free.push(area);
  }
  for (const room of rooms) {
    if (tied.has(room.id)) continue;
    const area = free.shift();
    if (area) tied.set(room.id, area);
  }

  let pins = 0;
  for (const room of rooms) {
    const area = tied.get(room.id);
    if (!area) continue;
    room.area_id = area.area_id as never;
    room.name = area.name;
    const placements = pinsFor(room, areaEntities(area.area_id, source));
    pins += placements.length;
    (floor?.placements as unknown[] | undefined)?.push(...placements);
  }
  return { building, bound: tied.size, pins };
}
