// @vitest-environment node
import express from 'express';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createClientBundleRouter } from '../clientBundleRoutes.ts';

const directories: string[] = [];
const servers: Server[] = [];
const fixture = (patch: Record<string, unknown> = {}) => {
  const directory = mkdtempSync(join(tmpdir(), 'aca-client-bundle-'));
  directories.push(directory);
  const archive = Buffer.from('test-bundle-bytes');
  const manifest = { schema: 1, version: '0.9.31', archive: { name: 'acasystem-web-0.9.31.zip',
    sha256: createHash('sha256').update(archive).digest('hex'), size: archive.byteLength }, minServer: '0.9.31', minShell: '0.1.0', ...patch };
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest));
  writeFileSync(join(directory, 'acasystem-web-0.9.31.zip'), archive);
  return { directory, archive, manifest };
};
const start = async (directory: string) => {
  const app = express();
  app.use('/api/client-bundle', createClientBundleRouter(directory));
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test address');
  return `http://127.0.0.1:${address.port}/api/client-bundle`;
};
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => {
    server.closeAllConnections(); server.close(() => resolve());
  })));
  directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
});

describe('local client bundle', () => {
  it('serves the verified manifest and matching archive before login, with only two fixed routes', async () => {
    const { directory, archive, manifest } = fixture();
    const origin = await start(directory);
    const response = await fetch(`${origin}/manifest`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual(manifest);
    const binary = await fetch(`${origin}/archive?path=elsewhere`);
    expect(binary.status).toBe(200);
    expect(Buffer.from(await binary.arrayBuffer())).toEqual(archive);
    expect((await fetch(`${origin}/manifest.json`)).status).toBe(404);
    expect((await fetch(`${origin}/${manifest.archive.name}`)).status).toBe(404);
    expect((await fetch(`${origin}/manifest`, { method: 'POST' })).status).toBe(404);
  });
  it('refuses missing, tampered or unsafe bundle files', async () => {
    const missing = fixture();
    rmSync(join(missing.directory, 'acasystem-web-0.9.31.zip'));
    expect((await fetch(`${await start(missing.directory)}/manifest`)).status).toBe(404);
    const tampered = fixture();
    const changed = Buffer.from(tampered.archive);
    changed[0] = changed[0]! ^ 1;
    writeFileSync(join(tampered.directory, 'acasystem-web-0.9.31.zip'), changed);
    expect((await fetch(`${await start(tampered.directory)}/archive`)).status).toBe(404);
    const unsafe = fixture({ archive: { name: '../outside.zip', sha256: '0'.repeat(64), size: 10 } });
    expect((await fetch(`${await start(unsafe.directory)}/manifest`)).status).toBe(404);
  });
});
