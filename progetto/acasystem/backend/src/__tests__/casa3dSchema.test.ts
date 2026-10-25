// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  checkBuilding,
  isAllowedPictureRef,
  referencedImageIds,
  summarizeBuilding,
} from '../validators/casa3dSchema.ts';
import { MAX_BUILDING_BYTES, validateBuilding, validateSaveBody } from '../validators/casa3dValidators.ts';
import { building, floor, room, sofa } from './casa3dFixtures.ts';

const examplePath = fileURLToPath(
  new URL('../../../frontend/src/casa3d/casa-esempio.json', import.meta.url)
);

const many = <T>(count: number, make: (index: number) => T): T[] => Array.from({ length: count }, (_, i) => make(i));

describe('casa3d plan schema', () => {
  it('accepts a minimal plan, the example plan and an empty plan', () => {
    expect(checkBuilding(building())).toBeNull();
    expect(checkBuilding(building([]))).toBeNull();
    const example: unknown = JSON.parse(readFileSync(examplePath, 'utf8'));
    expect(checkBuilding(example)).toBeNull();
    expect(summarizeBuilding(example).rooms).toBe(6);
  });

  it('keeps unknown fields (a newer frontend) and rejects a wrong version', () => {
    expect(checkBuilding({ ...building(), newer: { a: 1 } })).toBeNull();
    expect(checkBuilding(building([floor('f1', { extra: true })]))).toBeNull();
    expect(checkBuilding({ ...building(), version: 2 })).toMatch(/version/);
  });

  it('rejects a missing required field and a wrong type', () => {
    const { settings: _settings, ...noSettings } = building();
    expect(checkBuilding(noSettings)).toMatch(/settings: required/);
    expect(checkBuilding(building([floor('f1', { elevation: '0' })]))).toMatch(/elevation/);
    expect(checkBuilding(building([floor('f1', { rooms: 'x' })]))).toMatch(/rooms: expected a list/);
    expect(checkBuilding([])).toMatch(/expected an object/);
  });

  it('limits the floors, rooms, points and items like the original schema', () => {
    expect(checkBuilding(building(many(20, (i) => floor(`f${i}`))))).toBeNull();
    expect(checkBuilding(building(many(21, (i) => floor(`f${i}`))))).toMatch(/floors/);

    const rooms = (count: number) => many(count, (i) => room(`r${i}`));
    expect(checkBuilding(building([floor('f1', { rooms: rooms(200) })]))).toBeNull();
    expect(checkBuilding(building([floor('f1', { rooms: rooms(201) })]))).toMatch(/rooms/);

    const polygon = (count: number) => many(count, (i) => [i * 0.01, (i % 2) * 0.01]);
    expect(checkBuilding(building([floor('f1', { rooms: [room('r1', { points: polygon(200) })] })]))).toBeNull();
    expect(checkBuilding(building([floor('f1', { rooms: [room('r1', { points: polygon(201) })] })]))).toMatch(/points/);
    expect(checkBuilding(building([floor('f1', { rooms: [room('r1', { points: polygon(2) })] })]))).toMatch(/points/);

    const furniture = (count: number) => many(count, (i) => sofa(`m${i}`));
    expect(checkBuilding(building([floor('f1', { furniture: furniture(1000) })]))).toBeNull();
    expect(checkBuilding(building([floor('f1', { furniture: furniture(1001) })]))).toMatch(/furniture/);
  });

  it('checks ranges, lengths and ids', () => {
    const withRoom = (overrides: Record<string, unknown>) =>
      building([floor('f1', { rooms: [room('r1', overrides)] })]);
    expect(checkBuilding(withRoom({ points: [[0, 0], [1001, 0], [1, 1]] }))).toMatch(/must be between/);
    expect(checkBuilding(withRoom({ name: 'x'.repeat(100) }))).toBeNull();
    expect(checkBuilding(withRoom({ name: 'x'.repeat(101) }))).toMatch(/length/);
    expect(checkBuilding(withRoom({ id: 'bad id' }))).toMatch(/not a valid id/);
    expect(checkBuilding(withRoom({ id: 'x'.repeat(65) }))).toMatch(/length/);
    expect(checkBuilding(withRoom({ area_id: 'a'.repeat(256) }))).toMatch(/length/);
    expect(checkBuilding(withRoom({ wall_thickness: [0.01] }))).toMatch(/must be between/);
    expect(checkBuilding(building([floor('f1', { height: 0.5 })]))).toMatch(/height/);
    expect(checkBuilding(building([floor('f1', { furniture: [sofa('m1', { w: Number.NaN })] })]))).toMatch(/expected a number/);
  });

  it('keeps the strict objects of the original (a screen picture rule takes no extra key)', () => {
    const rule = { entity: 'media_player.tv', attribute: null, state: 'playing', image: '' };
    const plan = (picture: Record<string, unknown>) =>
      building([floor('f1', { furniture: [sofa('m1', { pictures: [picture] })] })]);
    expect(checkBuilding(plan(rule))).toBeNull();
    expect(checkBuilding(plan({ ...rule, extra: 1 }))).toMatch(/extra key/);
  });
});

describe('casa3d plan images: no external addresses', () => {
  const plan = (image: string) =>
    building([
      floor('f1', {
        furniture: [
          sofa('m1', { pictures: [{ entity: 'media_player.tv', attribute: null, state: 'on', image }] }),
        ],
      }),
    ]);

  it('accepts a stored image id, a camera and an empty rule', () => {
    for (const image of ['', 'pic_ab12cd', 'camera:camera.ingresso']) {
      expect(isAllowedPictureRef(image)).toBe(true);
      expect(checkBuilding(plan(image))).toBeNull();
    }
  });

  it('rejects every address', () => {
    for (const image of [
      'http://example.com/a.png',
      'https://example.com/a.png',
      '//example.com/a.png',
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      'javascript:alert(1)',
      '/local/a.png',
      'file:///etc/passwd',
      'camera:camera.x/../../y',
    ]) {
      expect(isAllowedPictureRef(image)).toBe(false);
      expect(checkBuilding(plan(image))).toMatch(/not allowed/);
    }
  });

  it('rejects an address in a floor background (the image id is a plain id)', () => {
    const background = (image_id: string) =>
      building([floor('f1', { background: { image_id, x: 0, z: 0, width: 5, opacity: 0.5 } })]);
    expect(checkBuilding(background('bg_1'))).toBeNull();
    expect(checkBuilding(background('https://example.com/plan.png'))).toMatch(/image_id/);
    expect(checkBuilding(background('//example.com/plan.png'))).toMatch(/image_id/);
  });

  it('lists the stored images a plan uses', () => {
    const used = building([
      floor('f1', {
        background: { image_id: 'bg_1', x: 0, z: 0, width: 5, opacity: 1 },
        furniture: [
          sofa('m1', {
            pictures: [
              { entity: 'e.x', attribute: null, state: 'on', image: 'pic_1' },
              { entity: 'e.x', attribute: null, state: 'off', image: 'camera:camera.a' },
              { entity: 'e.x', attribute: null, state: 'idle', image: '' },
            ],
          }),
        ],
      }),
    ]);
    expect([...referencedImageIds(used)].sort()).toEqual(['bg_1', 'pic_1']);
  });
});

describe('casa3d plan size', () => {
  it('rejects a plan over the size limit with 413 and an invalid one with 400', () => {
    const filler = 'e'.repeat(255);
    const heavy = building([
      floor('f1', {
        furniture: many(1000, (i) =>
          sofa(`m${i}`, { entity: filler, power: filler, soc: filler, status: filler, door_left: filler, door_right: filler })
        ),
      }),
      floor('f2', {
        furniture: many(400, (i) =>
          sofa(`n${i}`, { entity: filler, power: filler, soc: filler, status: filler, door_left: filler, door_right: filler })
        ),
      }),
    ]);
    expect(Buffer.byteLength(JSON.stringify(heavy))).toBeGreaterThan(MAX_BUILDING_BYTES);
    const tooLarge = validateBuilding(heavy);
    expect(tooLarge).toMatchObject({ ok: false, failure: { status: 413 } });
    expect(validateBuilding({ version: 1 })).toMatchObject({ ok: false, failure: { status: 400 } });
  });

  it('needs an integer base revision', () => {
    for (const base_revision of [undefined, -1, 1.5, '1', null]) {
      expect(validateSaveBody({ building: building(), base_revision })).toMatchObject({
        ok: false,
        failure: { status: 400 },
      });
    }
    expect(validateSaveBody({ building: building(), base_revision: 0 }).ok).toBe(true);
  });
});
