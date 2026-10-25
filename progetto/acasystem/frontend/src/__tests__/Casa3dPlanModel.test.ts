import { describe, expect, it } from 'vitest';
import { casaOpenState, isCasaPath, readCasaState } from '@/casa3d/casaNav';
import { emptyBuilding } from '@/casa3d/emptyBuilding';
import { isLeftoverExample } from '@/casa3d/leftoverExample';
import { floorsOf, hasHouse, previewRoomsOf } from '@/casa3d/planModel';
import { drawnHouse, exampleHouse } from './casa3dFakeServer';

/** What the host reads of a plan from the network, and the state of the house in the history (R1). */

describe('floorsOf: a plan from the network is only looked at', () => {
  it('reads floors, rooms and corners', () => {
    const floors = floorsOf(drawnHouse());
    expect(floors.map((floor) => [floor.id, floor.name, floor.rooms.length])).toEqual([
      ['piano_1', 'Piano terra', 2],
      ['piano_2', 'Primo piano', 1],
    ]);
    expect(floors[0]?.rooms[0]).toEqual({
      id: 'sala',
      name: 'Sala',
      points: [
        [0, 0],
        [4, 0],
        [4, 3],
        [0, 3],
      ],
    });
  });

  it('leaves out what is not as expected and never throws', () => {
    for (const bad of [
      null,
      undefined,
      3,
      'x',
      [],
      {},
      { floors: 'no' },
      { floors: [1, null, 'a'] },
    ]) {
      expect(floorsOf(bad)).toEqual([]);
    }
    const floors = floorsOf({
      floors: [
        {
          rooms: [
            { id: '', name: 'senza id', points: [] },
            { name: 'senza id' },
            { id: 'a', points: [[1, 2], [3], ['x', 1], [Infinity, 0], null, [5, 6]] },
            'no',
          ],
        },
      ],
    });
    expect(floors).toEqual([
      {
        id: 'piano-1',
        name: 'Piano 1',
        rooms: [
          {
            id: 'a',
            name: 'a',
            points: [
              [1, 2],
              [5, 6],
            ],
          },
        ],
      },
    ]);
  });

  it('knows whether a house was drawn, and draws the first floor that has rooms', () => {
    expect(hasHouse(floorsOf(emptyBuilding()))).toBe(false);
    expect(hasHouse(floorsOf({ floors: [{ id: 'a', rooms: [] }] }))).toBe(false);
    const floors = floorsOf({
      floors: [
        { id: 'cantina', rooms: [] },
        { id: 'terra', rooms: [{ id: 'sala', name: 'Sala', points: [] }] },
      ],
    });
    expect(hasHouse(floors)).toBe(true);
    expect(previewRoomsOf(floors).map((room) => room.id)).toEqual(['sala']);
    expect(previewRoomsOf([])).toEqual([]);
  });
});

describe('emptyBuilding', () => {
  it('is a plan with no floors, as the server starts from', () => {
    expect(emptyBuilding()).toMatchObject({
      version: 1,
      floors: [],
      settings: { wall_exterior: 0.24, wall_interior: 0.12, grid: 0.05 },
      presence: [],
    });
    expect(emptyBuilding()).not.toBe(emptyBuilding());
  });
});

describe('isLeftoverExample: the house the T6 test left on the bench', () => {
  it('recognises the example, with or without the names the old page gave its rooms', () => {
    expect(isLeftoverExample(exampleHouse())).toBe(true);
    const renamed = exampleHouse() as { floors: Array<{ rooms: Array<{ name: string }> }> };
    renamed.floors[0]?.rooms.forEach((room, index) => (room.name = `Area ${index}`));
    expect(isLeftoverExample(renamed)).toBe(true);
  });

  it('does not take a house somebody drew, a changed example or an empty plan for it', () => {
    expect(isLeftoverExample(drawnHouse())).toBe(false);
    expect(isLeftoverExample(emptyBuilding())).toBe(false);
    expect(isLeftoverExample(null)).toBe(false);
    const fewer = exampleHouse() as { floors: Array<{ rooms: unknown[] }> };
    fewer.floors[0]?.rooms.pop();
    expect(isLeftoverExample(fewer)).toBe(false);
    const extra = exampleHouse() as { floors: Array<{ rooms: unknown[] }> };
    extra.floors[0]?.rooms.push({ id: 'studio', name: 'Studio', points: [] });
    expect(isLeftoverExample(extra)).toBe(false);
    const other = exampleHouse() as { floors: Array<{ id: string }> };
    other.floors[0]!.id = 'piano_1';
    expect(isLeftoverExample(other)).toBe(false);
    const two = exampleHouse() as { floors: unknown[] };
    two.floors.push({ id: 'primo', rooms: [] });
    expect(isLeftoverExample(two)).toBe(false);
  });
});

describe('the state of the house in a history entry', () => {
  it('knows the addresses of the house, with or without a slash at the end', () => {
    for (const path of ['/casa', '/casa/', '/casa/piantina', '/casa/piantina/']) {
      expect(isCasaPath(path), path).toBe(true);
    }
    for (const path of ['/', '/sistema', '/casa/altro', '/casa3d-prova', '/casa/piantina/x']) {
      expect(isCasaPath(path), path).toBe(false);
    }
  });

  it('reads what the house wrote and nothing else', () => {
    expect(readCasaState(casaOpenState())).toEqual({ depth: 1 });
    expect(
      readCasaState({ casa: { depth: 3, overlay: 'stanze', fromHouse: true, other: 1 } })
    ).toEqual({ depth: 3, overlay: 'stanze', fromHouse: true });
    // anything else is an entry the house did not make
    for (const bad of [
      undefined,
      null,
      'x',
      4,
      {},
      { casa: 1 },
      { casa: { depth: -1 } },
      { casa: { depth: 1.5 } },
    ]) {
      expect(readCasaState(bad)).toEqual({ depth: 0 });
    }
    expect(readCasaState({ casa: { depth: 2, overlay: 'altro' } })).toEqual({ depth: 2 });
  });
});
