/**
 * Tells whether a plan from the server is the example house that the T6 test left on the bench
 * (revision 6, written from `casa-esempio.json`): one floor with the example's floor id and exactly
 * its rooms, by id. Names and areas are not compared, because the old page tied them to Home
 * Assistant areas before saving. A house someone drew has other ids, so it is never taken for it.
 */
import example from './casa-esempio.json';
import { floorsOf } from './planModel';

const EXAMPLE_FLOORS = floorsOf(example);

export function isLeftoverExample(building: unknown): boolean {
  const floors = floorsOf(building);
  if (floors.length !== EXAMPLE_FLOORS.length || floors.length === 0) return false;
  return floors.every((floor, index) => {
    const reference = EXAMPLE_FLOORS[index];
    if (!reference || floor.id !== reference.id || floor.rooms.length !== reference.rooms.length) {
      return false;
    }
    const ids = new Set(reference.rooms.map((room) => room.id));
    return floor.rooms.every((room) => ids.has(room.id));
  });
}
