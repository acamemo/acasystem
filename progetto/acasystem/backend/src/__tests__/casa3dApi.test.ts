// @vitest-environment node

import express from 'express';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import type { HomeAssistantUser } from '../@types/homeAssistant.ts';
import { createDataCrypto } from '../helpers/dataCrypto.ts';
import { MAX_IMAGE_BYTES } from '../helpers/casa3dImage.ts';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createCasa3dApiRouter } from '../routes/casa3dApi.ts';
import {
  CASA3D_HOME_ID,
  HISTORY_INTERVAL_S,
  HISTORY_MAX,
  MAX_IMAGES,
  createCasa3dService,
} from '../services/casa3dService.ts';
import { createApp } from '../server.ts';
import { building, floor, makeJpeg, makePng, makeWebp, room, sofa } from './casa3dFixtures.ts';

/** Rotte /api/casa3d: compare-and-swap, utente verificato dal server (scrive chiunque sia autenticato, ISSUE-102), immagini sicure, cronologia, backup (T6). */

const USERS: Record<string, HomeAssistantUser> = {
  installer: { id: 'u-admin', name: 'Installatore', is_admin: true, is_owner: false },
  owner: { id: 'u-owner', name: 'Proprietario', is_admin: false, is_owner: true },
  guest: { id: 'u-guest', name: 'Ospite', is_admin: false, is_owner: false },
};

const servers: Server[] = [];
const databases: SqliteDatabase[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))
  );
  databases.splice(0).forEach((database) => database.close());
});

interface Harness {
  database: SqliteDatabase;
  /** Request as one of the users (the `x-test-user` header stands for the token Home Assistant would verify). */
  call: (
    as: keyof typeof USERS | null,
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ) => Promise<{ status: number; json: any; headers: Headers; bytes: Buffer }>;
}

const start = async (crypto = createDataCrypto({ mode: 'off', key: '', salt: '' })): Promise<Harness> => {
  const database = openDatabase(':memory:');
  databases.push(database);
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use((req, _res, next) => {
    const name = req.get('x-test-user');
    if (name && USERS[name]) req.authenticatedHaUser = USERS[name];
    next();
  });
  app.use('/api/casa3d', createCasa3dApiRouter(database, crypto));
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  servers.push(server);
  const { port } = server.address() as { port: number };

  return {
    database,
    call: async (as, method, path, body, headers = {}) => {
      const isBuffer = Buffer.isBuffer(body);
      const response = await fetch(`http://127.0.0.1:${port}/api/casa3d${path}`, {
        method,
        headers: {
          ...(as ? { 'x-test-user': as } : {}),
          ...(body !== undefined && !isBuffer ? { 'content-type': 'application/json' } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : isBuffer ? new Uint8Array(body) : JSON.stringify(body),
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      let json: unknown = null;
      try {
        json = JSON.parse(bytes.toString('utf8'));
      } catch {
        // binary answer
      }
      return { status: response.status, json, headers: response.headers, bytes };
    },
  };
};

const imageHeaders = (type: string): Record<string, string> => ({ 'content-type': type });

describe('casa3d plan: revision and compare-and-swap', () => {
  it('starts empty at revision 0 and saves the first plan from revision 0', async () => {
    const { call } = await start();
    const empty = await call('guest', 'GET', '/building');
    expect(empty.status).toBe(200);
    expect(empty.json).toMatchObject({ revision: 0, building: { version: 1, floors: [] } });

    const saved = await call('installer', 'PUT', '/building', { building: building(), base_revision: 0 });
    expect(saved.status).toBe(200);
    expect(saved.json).toMatchObject({ revision: 1 });
    expect((await call('guest', 'GET', '/building/revision')).json).toEqual({ revision: 1 });
  });

  it('answers 409 with the current revision when the base revision is old, and keeps the stored plan', async () => {
    const { call } = await start();
    await call('installer', 'PUT', '/building', { building: building(), base_revision: 0 });
    const second = await call('installer', 'PUT', '/building', {
      building: building([floor('f1', { name: 'Primo' })]),
      base_revision: 1,
    });
    expect(second.json).toMatchObject({ revision: 2 });

    const stale = await call('installer', 'PUT', '/building', {
      building: building([floor('f1', { name: 'Perso' })]),
      base_revision: 1,
    });
    expect(stale.status).toBe(409);
    expect(stale.json).toEqual({ error: 'Revision conflict', revision: 2 });
    const again = await call('installer', 'PUT', '/building', { building: building(), base_revision: 0 });
    expect(again.status).toBe(409);
    const read = await call('guest', 'GET', '/building');
    expect(read.json.revision).toBe(2);
    expect(read.json.building.floors[0].name).toBe('Primo');
  });

  it('lets only one of two writes with the same base revision win', async () => {
    const { call } = await start();
    await call('installer', 'PUT', '/building', { building: building(), base_revision: 0 });
    const [a, b] = await Promise.all([
      call('installer', 'PUT', '/building', { building: building([floor('a')]), base_revision: 1 }),
      call('owner', 'PUT', '/building', { building: building([floor('b')]), base_revision: 1 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });

  it('rejects a missing or malformed base revision and an invalid plan with 400', async () => {
    const { call } = await start();
    expect((await call('installer', 'PUT', '/building', { building: building() })).status).toBe(400);
    expect((await call('installer', 'PUT', '/building', { building: building(), base_revision: 'x' })).status).toBe(400);
    const invalid = await call('installer', 'PUT', '/building', {
      building: building([floor('f1', { rooms: [room('r1', { name: 'x'.repeat(101) })] })]),
      base_revision: 0,
    });
    expect(invalid.status).toBe(400);
    expect(invalid.json.error).toMatch(/name/);
    expect((await call('installer', 'GET', '/building')).json.revision).toBe(0);
  });

  it('answers 413 to a body over the JSON limit', async () => {
    const { call } = await start();
    const huge = await call('installer', 'PUT', '/building', {
      building: building(),
      base_revision: 0,
      padding: 'x'.repeat(2.2 * 1024 * 1024),
    });
    expect(huge.status).toBe(413);
  });

  it('answers 400, not 500, to a plan nested too deeply or with a key that pollutes prototypes', async () => {
    const { call } = await start();
    const json = { 'content-type': 'application/json' };
    const plan = JSON.stringify(building()).slice(0, -1);
    const nested = await call(
      'installer',
      'PUT',
      '/building',
      Buffer.from(`{"building":${plan},"extra":${'{"a":'.repeat(5000)}1${'}'.repeat(5000)}},"base_revision":0}`),
      json
    );
    expect(nested.status).toBe(400);
    expect(nested.json.error).toMatch(/deeper/);
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      const polluted = await call(
        'installer',
        'PUT',
        '/building',
        Buffer.from(`{"building":${plan},"extra":{"deep":[{"${key}":{"polluted":1}}]}},"base_revision":0}`),
        json
      );
      expect(polluted.status, key).toBe(400);
      expect(polluted.json.error).toContain(key);
    }
    expect((await call('installer', 'GET', '/building')).json.revision).toBe(0);
  });

  it('is read by a second client as stored by the first (two clients, one database)', async () => {
    const { call } = await start();
    const plan = building([floor('f1', { furniture: [sofa('m1')] })]);
    await call('installer', 'PUT', '/building', { building: plan, base_revision: 0 });
    const asGuest = await call('guest', 'GET', '/building');
    const asOwner = await call('owner', 'GET', '/building');
    expect(asGuest.json.building).toEqual(plan);
    expect(asOwner.json.building).toEqual(plan);
    expect(asGuest.headers.get('cache-control')).toBe('no-store');
  });
});

describe('casa3d role: everyone who is signed in may edit (ISSUE-102)', () => {
  const writes = (): [string, string, unknown?][] => [
    ['PUT', '/building', { building: building(), base_revision: 0 }],
    ['PUT', '/images/pic_1', makePng()],
    ['DELETE', '/images/pic_1'],
    ['GET', '/history'],
    ['POST', '/history'],
    ['POST', '/history/abc/restore'],
    ['GET', '/backup'],
    ['POST', '/backup', { building: building() }],
  ];
  const headersFor = (body: unknown) => (body instanceof Buffer ? imageHeaders('image/png') : {});

  it('answers 401 without a user, on every write and on the history and backup routes', async () => {
    const { call } = await start();
    for (const [method, path, body] of writes()) {
      const anonymous = await call(null, method, path, body, headersFor(body));
      expect(anonymous.status, `${method} ${path} without user`).toBe(401);
    }
    expect((await call(null, 'GET', '/building')).status).toBe(401);
    expect((await call(null, 'GET', '/building/revision')).status).toBe(401);
  });

  it('never answers 403 to a signed-in user who is neither administrator nor owner', async () => {
    const { call } = await start();
    for (const [method, path, body] of writes()) {
      const guest = await call('guest', method, path, body, headersFor(body));
      expect(guest.status, `${method} ${path} as guest`).not.toBe(403);
      expect(guest.status, `${method} ${path} as guest`).not.toBe(401);
    }
  });

  it('lets a plain user save a plan and read it back, like an administrator and an owner', async () => {
    const { call } = await start();
    const saved = await call('guest', 'PUT', '/building', { building: building([floor('a')]), base_revision: 0 });
    expect(saved.status).toBe(200);
    expect(saved.json.revision).toBe(1);
    expect((await call('installer', 'PUT', '/building', { building: building(), base_revision: 1 })).status).toBe(200);
    expect((await call('owner', 'PUT', '/building', { building: building(), base_revision: 2 })).status).toBe(200);
    expect((await call('guest', 'GET', '/building')).json.revision).toBe(3);
  });

  it('keeps the checks on the data for a plain user: conflict, validation and pictures', async () => {
    const { call } = await start();
    await call('guest', 'PUT', '/building', { building: building(), base_revision: 0 });
    // an old base revision is a 409 for everybody, and the plan stays
    const stale = await call('guest', 'PUT', '/building', { building: building([floor('b')]), base_revision: 0 });
    expect(stale.status).toBe(409);
    expect(stale.json.revision).toBe(1);
    // an invalid plan is a 400
    const invalid = await call('guest', 'PUT', '/building', { building: { version: 1, floors: 'no' }, base_revision: 1 });
    expect(invalid.status).toBe(400);
    // a picture is judged on its bytes, whoever sends it
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    expect((await call('guest', 'PUT', '/images/a', svg, imageHeaders('image/png'))).status).toBe(415);
    expect((await call('guest', 'PUT', '/images/a', makePng(), imageHeaders('image/png'))).status).toBe(200);
    expect((await call('installer', 'GET', '/building')).json.revision).toBe(1);
  });

  it('takes nothing from what the client claims: the user comes from the verified token', async () => {
    const { call } = await start();
    const claims = { 'x-ha-admin': 'true', 'x-user-role': 'installer' };
    // allowed because the user is signed in, not because of the headers
    const forged = await call('guest', 'PUT', '/building', { building: building(), base_revision: 0, is_admin: true }, claims);
    expect(forged.status).toBe(200);
    const anonymous = await call(null, 'PUT', '/building', { building: building(), base_revision: 1, is_admin: true }, claims);
    expect(anonymous.status).toBe(401);
  });

  it('is behind the Home Assistant authentication in the real app', async () => {
    const database = openDatabase(':memory:');
    databases.push(database);
    const app = createApp({ database, isProduction: false });
    const server = await new Promise<Server>((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    servers.push(server);
    const { port } = server.address() as { port: number };
    const response = await fetch(`http://127.0.0.1:${port}/api/casa3d/building`);
    expect([401, 503]).toContain(response.status);
    const write = await fetch(`http://127.0.0.1:${port}/api/casa3d/building`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: 'Bearer nope' },
      body: JSON.stringify({ building: building(), base_revision: 0 }),
    });
    expect([401, 503]).toContain(write.status);
    expect(database.prepare('SELECT COUNT(*) AS n FROM casa3d_building').get()).toEqual({ n: 0 });
  });
});

describe('casa3d images', () => {
  it('stores a PNG, a JPEG and a WebP and serves them with the detected type, nosniff and a closed CSP', async () => {
    const { call } = await start();
    const files: [string, Buffer, string][] = [
      ['pic_png', makePng(), 'image/png'],
      ['pic_jpg', makeJpeg(), 'image/jpeg'],
      ['pic_web', makeWebp(), 'image/webp'],
    ];
    for (const [id, bytes, type] of files) {
      const put = await call('installer', 'PUT', `/images/${id}`, bytes, imageHeaders(type));
      expect(put.status, id).toBe(200);
      expect(put.json).toMatchObject({ id, mime: type });
      const get = await call('guest', 'GET', `/images/${id}`);
      expect(get.status).toBe(200);
      expect(get.headers.get('content-type')).toBe(type);
      expect(get.headers.get('x-content-type-options')).toBe('nosniff');
      expect(get.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
      expect(get.bytes.equals(bytes)).toBe(true);
    }
    const etag = (await call('guest', 'GET', '/images/pic_png')).headers.get('etag');
    expect((await call('guest', 'GET', '/images/pic_png', undefined, { 'if-none-match': etag ?? '' })).status).toBe(304);
    expect((await call('guest', 'GET', '/images/none')).status).toBe(404);
  });

  it('rejects SVG, whatever the header says', async () => {
    const { call, database } = await start();
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
    expect((await call('installer', 'PUT', '/images/a', svg, imageHeaders('image/svg+xml'))).status).toBe(415);
    expect((await call('installer', 'PUT', '/images/a', svg, imageHeaders('image/png'))).status).toBe(415);
    expect((await call('installer', 'PUT', '/images/a', svg, imageHeaders('text/html'))).status).toBe(415);
    expect(database.prepare('SELECT COUNT(*) AS n FROM casa3d_image').get()).toEqual({ n: 0 });
  });

  it('rejects an external address sent as an image, a JSON body and an image id that is an address', async () => {
    const { call } = await start();
    const json = await call('installer', 'PUT', '/images/a', { url: 'https://example.com/a.png' });
    expect(json.status).toBe(415);
    expect((await call('installer', 'PUT', '/images/https:%2F%2Fexample.com%2Fa.png', makePng(), imageHeaders('image/png'))).status).toBe(400);
    expect((await call('installer', 'GET', '/images/a%2Fb')).status).toBe(400);
  });

  it('rejects a truncated image and a damaged one', async () => {
    const { call, database } = await start();
    const png = makePng();
    const cut = png.subarray(0, png.length - 14);
    expect((await call('installer', 'PUT', '/images/a', cut, imageHeaders('image/png'))).status).toBe(422);
    expect((await call('installer', 'PUT', '/images/b', makeJpeg(8, 8, { eoi: false }), imageHeaders('image/jpeg'))).status).toBe(422);
    const web = makeWebp();
    expect((await call('installer', 'PUT', '/images/c', web.subarray(0, web.length - 2), imageHeaders('image/webp'))).status).toBe(422);
    expect(database.prepare('SELECT COUNT(*) AS n FROM casa3d_image').get()).toEqual({ n: 0 });
  });

  it('rejects a type that does not match the bytes and keeps the stored image', async () => {
    const { call } = await start();
    const png = makePng();
    await call('installer', 'PUT', '/images/a', png, imageHeaders('image/png'));
    const mismatch = await call('installer', 'PUT', '/images/a', makeJpeg(), imageHeaders('image/png'));
    expect(mismatch.status).toBe(415);
    const kept = await call('guest', 'GET', '/images/a');
    expect(kept.bytes.equals(png)).toBe(true);
  });

  it('limits the size of an image, its sides, the count and the total', async () => {
    const { call, database } = await start();
    const big = await call('installer', 'PUT', '/images/big', Buffer.alloc(MAX_IMAGE_BYTES + 10, 7), imageHeaders('image/png'));
    expect(big.status).toBe(413);
    expect(big.json).toEqual({ error: 'The request body is too large' });
    expect((await call('installer', 'PUT', '/images/wide', makePng(2049, 1), imageHeaders('image/png'))).status).toBe(422);

    const png = makePng();
    const insert = database.prepare(
      `INSERT INTO casa3d_image (home_id, image_id, mime, width, height, bytes, size, sha256) VALUES (?, ?, 'image/png', 4, 4, ?, ?, 'x')`
    );
    for (let index = 0; index < MAX_IMAGES; index += 1) insert.run(CASA3D_HOME_ID, `fill_${index}`, png, png.length);
    expect((await call('installer', 'PUT', '/images/one_more', png, imageHeaders('image/png'))).status).toBe(413);
    // a replacement of a stored image does not count twice
    expect((await call('installer', 'PUT', '/images/fill_0', png, imageHeaders('image/png'))).status).toBe(200);
  });

  describe('pictures no plan or restore point uses any more', () => {
    const withBackground = (imageId: string | null): Record<string, unknown> =>
      building([
        floor('f1', {
          background: imageId ? { image_id: imageId, x: 0, z: 0, width: 4, opacity: 0.5 } : null,
        }),
      ]);
    /** Makes the stored pictures older than the grace period, as they are after an hour. */
    const age = (database: SqliteDatabase): void => {
      database.prepare(`UPDATE casa3d_image SET updated_at = '2020-01-01T00:00:00.000Z'`).run();
    };
    const ids = (database: SqliteDatabase): string[] =>
      database
        .prepare<[], { image_id: string }>(`SELECT image_id FROM casa3d_image ORDER BY image_id`)
        .all()
        .map((row) => row.image_id);

    it('drops a replaced or removed background once no restore point shows it, and no longer serves it', async () => {
      const { call, database } = await start();
      const png = makePng();
      await call('installer', 'PUT', '/images/old', png, imageHeaders('image/png'));
      await call('installer', 'PUT', '/building', { building: withBackground('old'), base_revision: 0 });
      await call('installer', 'PUT', '/images/new', png, imageHeaders('image/png'));
      age(database);
      await call('installer', 'PUT', '/building', { building: withBackground('new'), base_revision: 1 });
      // the automatic restore point taken by this save still shows the old background
      expect(ids(database)).toEqual(['new', 'old']);
      database.prepare(`DELETE FROM casa3d_history`).run();
      await call('installer', 'PUT', '/building', { building: withBackground('new'), base_revision: 2 });
      expect(ids(database)).toEqual(['new']);
      expect((await call('guest', 'GET', '/images/old')).status).toBe(404);
      expect((await call('guest', 'GET', '/images/new')).status).toBe(200);
    });

    it('keeps a picture used by a restore point, and drops it when the point is gone', async () => {
      const { call, database } = await start();
      const png = makePng();
      await call('installer', 'PUT', '/images/a', png, imageHeaders('image/png'));
      await call('installer', 'PUT', '/building', { building: withBackground('a'), base_revision: 0 });
      const snap = await call('installer', 'POST', '/history');
      await call('installer', 'PUT', '/building', { building: withBackground(null), base_revision: 1 });
      age(database);
      await call('installer', 'PUT', '/building', { building: withBackground(null), base_revision: 2 });
      expect(ids(database)).toEqual(['a']); // the restore point still shows it
      // restoring brings the picture back into use
      await call('installer', 'POST', `/history/${snap.json.snapshot.id}/restore`);
      expect((await call('guest', 'GET', '/images/a')).status).toBe(200);
      database.prepare(`DELETE FROM casa3d_history`).run();
      await call('installer', 'PUT', '/building', { building: withBackground(null), base_revision: 4 });
      database.prepare(`DELETE FROM casa3d_history`).run(); // the save above took a point of the plan with the picture
      age(database);
      await call('installer', 'PUT', '/building', { building: withBackground(null), base_revision: 5 });
      expect(ids(database)).toEqual([]);
    });

    it('does not drop a picture just uploaded for a plan not saved yet', async () => {
      const { call, database } = await start();
      await call('installer', 'PUT', '/building', { building: withBackground(null), base_revision: 0 });
      await call('installer', 'PUT', '/images/fresh', makePng(), imageHeaders('image/png'));
      await call('installer', 'PUT', '/building', { building: withBackground(null), base_revision: 1 });
      expect(ids(database)).toEqual(['fresh']);
    });

    it('lets the upload after 200 replacements of a background succeed', async () => {
      const { database } = await start();
      const service = createCasa3dService(database);
      const png = makePng();
      let revision = 0;
      for (let index = 0; index < MAX_IMAGES; index += 1) {
        const id = `bg_${index}`;
        expect(service.putImage(id, png, 'u-admin', 'image/png').ok).toBe(true);
        const saved = service.saveBuilding({ building: withBackground(id), baseRevision: revision, userId: 'u-admin' });
        if (!saved.ok) throw new Error(saved.error);
        revision = saved.revision;
      }
      database.prepare(`DELETE FROM casa3d_history`).run();
      age(database);
      // the archive is full of pictures nothing uses: the next upload makes room by itself
      expect(service.putImage('bg_next', png, 'u-admin', 'image/png').ok).toBe(true);
      expect(ids(database)).toEqual(['bg_199', 'bg_next']);
    });

    it('does not drop anything while a restore point cannot be read', async () => {
      const { call, database } = await start();
      await call('installer', 'PUT', '/images/a', makePng(), imageHeaders('image/png'));
      await call('installer', 'PUT', '/building', { building: withBackground('a'), base_revision: 0 });
      await call('installer', 'POST', '/history');
      database.prepare(`UPDATE casa3d_history SET data = 'not json'`).run();
      age(database);
      await call('installer', 'PUT', '/building', { building: withBackground(null), base_revision: 1 });
      expect(ids(database)).toEqual(['a']);
    });
  });

  it('moves a full set of pictures one by one without hitting the limit of the other routes', async () => {
    const { call } = await start();
    const png = makePng();
    for (let index = 0; index < 130; index += 1) {
      expect((await call('installer', 'PUT', `/images/p_${index}`, png, imageHeaders('image/png'))).status).toBe(200);
    }
    for (let index = 0; index < 130; index += 1) {
      expect((await call('installer', 'GET', `/images/p_${index}`)).status).toBe(200);
    }
    // the other routes keep their limit (120 a minute)
    let last = 0;
    for (let index = 0; index < 125; index += 1) last = (await call('guest', 'GET', '/building/revision')).status;
    expect(last).toBe(429);
  });

  it('deletes an image', async () => {
    const { call } = await start();
    await call('installer', 'PUT', '/images/a', makePng(), imageHeaders('image/png'));
    expect((await call('installer', 'DELETE', '/images/a')).status).toBe(200);
    expect((await call('installer', 'DELETE', '/images/a')).status).toBe(404);
  });
});

describe('casa3d history, restore, export and import', () => {
  it('keeps a restore point on demand, lists it newest first and restores it', async () => {
    const { call } = await start();
    await call('installer', 'PUT', '/building', { building: building([floor('f1', { name: 'Uno' })]), base_revision: 0 });
    const snap = await call('installer', 'POST', '/history');
    expect(snap.json.snapshot).toMatchObject({ revision: 1, floors: 1, rooms: 1, furniture: 0 });
    await call('installer', 'PUT', '/building', { building: building([floor('f1', { name: 'Due' })]), base_revision: 1 });

    const list = await call('installer', 'GET', '/history');
    expect(list.json.snapshots).toHaveLength(1);
    const restored = await call('installer', 'POST', `/history/${snap.json.snapshot.id}/restore`);
    expect(restored.status).toBe(200);
    expect(restored.json).toEqual({ revision: 3 });
    expect((await call('guest', 'GET', '/building')).json.building.floors[0].name).toBe('Uno');
    // the state before the restore became a restore point itself
    expect((await call('installer', 'GET', '/history')).json.snapshots).toHaveLength(2);
    expect((await call('installer', 'POST', '/history/unknown/restore')).status).toBe(404);
    expect((await call('installer', 'POST', '/history/a%2Fb/restore')).status).toBe(400);
  });

  it('takes an automatic restore point only when the last one is older than the interval', async () => {
    const { database } = await start();
    const service = createCasa3dService(database);
    const t0 = 1_800_000_000;
    const save = (name: string, base: number, now: number) =>
      service.saveBuilding({ building: building([floor('f1', { name })]), baseRevision: base, userId: 'u', now });
    expect(save('a', 0, t0)).toMatchObject({ ok: true, revision: 1 });
    // the first change of a plan with floors keeps the state before it (no earlier point exists)
    expect(save('b', 1, t0 + 10)).toMatchObject({ ok: true, revision: 2 });
    expect(service.listHistory()).toHaveLength(1);
    expect(service.listHistory()[0]).toMatchObject({ revision: 1, saved_at: t0 + 10 });
    // inside the interval: no new point
    expect(save('c', 2, t0 + 20)).toMatchObject({ ok: true, revision: 3 });
    expect(service.listHistory()).toHaveLength(1);
    // past the interval: a new point with the state before the save
    expect(save('d', 3, t0 + 10 + HISTORY_INTERVAL_S + 1)).toMatchObject({ ok: true, revision: 4 });
    expect(service.listHistory()).toHaveLength(2);
    expect(service.listHistory()[0]).toMatchObject({ revision: 3 });
  });

  it('does not make a restore point of an empty plan', async () => {
    const { database } = await start();
    const service = createCasa3dService(database);
    service.saveBuilding({ building: building([]), baseRevision: 0, userId: 'u', now: 1_800_000_000 });
    service.saveBuilding({ building: building([floor()]), baseRevision: 1, userId: 'u', now: 1_800_001_000 });
    expect(service.listHistory()).toHaveLength(0);
  });

  it('keeps at most the newest restore points', async () => {
    const { call } = await start();
    await call('installer', 'PUT', '/building', { building: building(), base_revision: 0 });
    for (let index = 0; index < HISTORY_MAX + 5; index += 1) await call('installer', 'POST', '/history');
    expect((await call('installer', 'GET', '/history')).json.snapshots).toHaveLength(HISTORY_MAX);
  });

  it('exports the plan in a versioned file and imports it as a replacement with a restore point', async () => {
    const { call } = await start();
    const plan = building([floor('f1', { furniture: [sofa('m1')] })]);
    await call('installer', 'PUT', '/building', { building: plan, base_revision: 0 });
    const exported = await call('installer', 'GET', '/backup');
    expect(exported.json).toMatchObject({ format: 'acasystem-casa3d-backup', version: 1, building: plan, packs: [] });

    const other = building([floor('g1', { name: 'Importato' })]);
    const imported = await call('installer', 'POST', '/backup', {
      building: other,
      packs: [{ id: 'mobili.pro', features: ['pool'] }, {}],
    });
    expect(imported.status).toBe(200);
    expect(imported.json).toMatchObject({
      revision: 2,
      packs: 0,
      skipped: [
        { id: 'mobili.pro', reason: 'unsupported' },
        { id: '#2', reason: 'unsupported' },
      ],
    });
    expect((await call('guest', 'GET', '/building')).json.building).toEqual(other);
    expect((await call('installer', 'GET', '/history')).json.snapshots[0]).toMatchObject({ revision: 1 });
    expect((await call('installer', 'POST', '/backup', { building: { version: 1 } })).status).toBe(400);
  });
});

describe('casa3d encryption at rest', () => {
  it('writes the plan only encrypted in enc_only mode and reads it back', async () => {
    const crypto = createDataCrypto({ mode: 'enc_only', key: 'ab'.repeat(32), salt: '' });
    const { call, database } = await start(crypto);
    const plan = building([floor('f1', { name: 'Segreto' })]);
    expect((await call('installer', 'PUT', '/building', { building: plan, base_revision: 0 })).status).toBe(200);
    const row = database.prepare('SELECT data, data_enc FROM casa3d_building').get() as { data: string; data_enc: string };
    expect(row.data).toBe('{"_enc_only":true}');
    expect(row.data_enc).toMatch(/^enc:v1:/);
    expect(row.data_enc).not.toContain('Segreto');
    expect((await call('guest', 'GET', '/building')).json.building).toEqual(plan);
    await call('installer', 'POST', '/history');
    const point = database.prepare('SELECT data FROM casa3d_history').get() as { data: string };
    expect(point.data).toBe('{"_enc_only":true}');
  });
});
