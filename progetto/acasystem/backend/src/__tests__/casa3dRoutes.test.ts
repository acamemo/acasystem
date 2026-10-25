// @vitest-environment node

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../config/security.ts';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createApp } from '../server.ts';

/** Servizio statico della Casa 3D sotto /casa3d/ (ADR-0014, D16, T2b). */

const INDEX_HTML = '<!doctype html><html><body><div id="root"></div></body></html>';
const MAIN = 'casa3d-0123456789ab.js';
const VIEWER = 'casa3d-3d-fedcba987654.js';

const openServers: Server[] = [];
const openDatabases: SqliteDatabase[] = [];
const tempDirs: string[] = [];

const makeTemp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};

const createFrontendDist = (): string => {
  const dist = makeTemp('aca-casa3d-frontend-');
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'index.html'), INDEX_HTML, 'utf8');
  return dist;
};

/** Come l'output di casa3d/build.mjs: bundle con impronta nel nome, manifest, lingue, licenze. */
const createCasa3dDist = (): string => {
  const dist = makeTemp('aca-casa3d-dist-');
  mkdirSync(join(dist, 'lang'));
  writeFileSync(join(dist, MAIN), 'export const main = 1;\n', 'utf8');
  writeFileSync(join(dist, `${MAIN}.LEGAL.txt`), '@license BSD-3-Clause\n', 'utf8');
  writeFileSync(join(dist, VIEWER), 'export const viewer = 1;\n', 'utf8');
  writeFileSync(join(dist, 'manifest.json'), JSON.stringify({ entry: MAIN }), 'utf8');
  writeFileSync(join(dist, 'NOTICE.txt'), 'notice\n', 'utf8');
  writeFileSync(join(dist, 'lang', 'en.json'), '{"a":"b"}', 'utf8');
  writeFileSync(join(dist, '.hidden.js'), 'secret', 'utf8');
  return dist;
};

const start = async (casa3dPath: string) => {
  const database = openDatabase(':memory:');
  openDatabases.push(database);
  const app = createApp({
    database,
    isProduction: true,
    distPath: createFrontendDist(),
    casa3dPath,
  });
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  openServers.push(server);
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Test server has no TCP address');
  return (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${address.port}${path}`, init);
};

afterEach(async () => {
  await Promise.all(
    openServers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
  for (const database of openDatabases.splice(0)) database.close();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('Casa 3D static service', () => {
  it('serves a bundle with the hash in its name as immutable JavaScript on the same origin', async () => {
    const request = await start(createCasa3dDist());
    const res = await request(`/casa3d/${MAIN}`);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/javascript/);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await res.text()).toContain('export const main');

    const viewer = await request(`/casa3d/${VIEWER}`);
    expect(viewer.status).toBe(200);
    expect(viewer.headers.get('cache-control')).toContain('immutable');
  });

  it('keeps the licence file next to a bundle immutable too', async () => {
    const request = await start(createCasa3dDist());
    const res = await request(`/casa3d/${MAIN}.LEGAL.txt`);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/plain/);
    expect(res.headers.get('cache-control')).toContain('immutable');
  });

  it('never caches the manifest, the only way in to the current names', async () => {
    const request = await start(createCasa3dDist());
    const res = await request('/casa3d/manifest.json');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(await res.json()).toEqual({ entry: MAIN });
  });

  it('revalidates files without a hash in the name (languages, notices)', async () => {
    const request = await start(createCasa3dDist());

    for (const path of ['/casa3d/lang/en.json?v=abc', '/casa3d/NOTICE.txt']) {
      const res = await request(path);
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('no-cache');
      expect(res.headers.get('etag')).toBeTruthy();
    }
  });

  it('answers an explicit 404, not the SPA index, for a missing or superseded file', async () => {
    const request = await start(createCasa3dDist());

    for (const path of [
      '/casa3d/casa3d-3d-000000000000.js',
      '/casa3d/casa3d-aaaaaaaaaaaa.js',
      '/casa3d/missing.js',
      '/casa3d/lang/fr.json',
      '/casa3d/no-extension',
    ]) {
      const res = await request(path);
      expect(res.status, path).toBe(404);
      expect(res.headers.get('content-type'), path).toMatch(/text\/plain/);
      expect(await res.text(), path).toBe('Not found');
    }
  });

  it('answers 404 for the folder itself, folders inside it, hidden files and other methods', async () => {
    const request = await start(createCasa3dDist());

    for (const path of ['/casa3d', '/casa3d/', '/casa3d/lang', '/casa3d/lang/', '/casa3d/.hidden.js']) {
      const res = await request(path);
      expect(res.status, path).toBe(404);
      expect(await res.text(), path).not.toContain('<div id="root">');
    }
    const post = await request(`/casa3d/${MAIN}`, { method: 'POST' });
    expect(post.status).toBe(404);
  });

  it('does not leave /casa3d/ through a path with dots', async () => {
    const request = await start(createCasa3dDist());

    for (const path of ['/casa3d/..%2f..%2fpackage.json', '/casa3d/%2e%2e%2f%2e%2e%2fpackage.json', '/casa3d/lang/..%2f..%2findex.html']) {
      const res = await request(path);
      expect(res.status, path).toBe(404);
      expect(await res.text(), path).not.toContain('<div id="root">');
    }
  });

  it('keeps the Content-Security-Policy of the app on /casa3d/ (no change for the bundles)', async () => {
    const request = await start(createCasa3dDist());

    expect((await request(`/casa3d/${MAIN}`)).headers.get('content-security-policy')).toBe(CONTENT_SECURITY_POLICY);
    expect((await request('/casa3d/missing.js')).headers.get('content-security-policy')).toBe(CONTENT_SECURITY_POLICY);
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/unsafe-eval|wasm-unsafe-eval/);
  });

  it('answers 404 under /casa3d/ also when the build folder is missing, and leaves the SPA alone', async () => {
    const request = await start(join(tmpdir(), 'aca-casa3d-does-not-exist'));

    const res = await request(`/casa3d/${MAIN}`);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Not found');

    const spa = await request('/sistema');
    expect(spa.status).toBe(200);
    expect(await spa.text()).toContain('<div id="root">');
  });
});
