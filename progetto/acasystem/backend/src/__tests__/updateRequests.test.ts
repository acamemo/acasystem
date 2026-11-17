// @vitest-environment node
import express from 'express';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createUpdateRequests } from '../updateRequests.ts';

const resources: Array<{ directory: string; server: Server }> = [];
afterEach(async () => {
  for (const { directory, server } of resources.splice(0)) {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
async function harness(enabled = true) {
  const directory = mkdtempSync(join(tmpdir(), 'aca-update-request-'));
  const requests = createUpdateRequests(directory, '0.9.73', enabled);
  const app = express(); app.use('/api/updates', requests.router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  resources.push({ directory, server });
  return { requests, directory, get: (path: string) => fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/updates/${path}`) };
}
describe('startup update request metadata', () => {
  it('stays unconfigured without an executor and does not write files', async () => {
    const h = await harness(false);
    expect(await (await h.get('check?shellVersion=0.1.1')).json()).toEqual({ status: 'unconfigured', version: '0.9.73' });
    expect(readdirSync(h.directory)).toEqual([]);
  });
  it('does not accept artifact URLs, arbitrary versions or request commands', async () => {
    const h = await harness();
    expect((await h.get('check?shellVersion=../../run')).status).toBe(400);
    await h.get('check?shellVersion=0.1.1&url=https://example.com&token=secret');
    expect(h.requests.current()?.shellVersion).toBe('0.1.1');
    const content = readFileSync(join(h.directory, 'aca-update-request.json'), 'utf8');
    expect(content).not.toContain('secret'); expect(content).not.toContain('example');
  });
  it('coalesces concurrent checks and only exposes validated status fields', async () => {
    const h = await harness(); await h.get('check?shellVersion=0.1.1');
    const first = h.requests.current();
    await Promise.all([h.get('check?shellVersion=0.1.1'), h.get('check?shellVersion=0.1.1')]);
    expect(h.requests.current()).toEqual(first);
    expect(h.requests.publish({ status: 'updating', version: '0.9.73', checkedAt: new Date().toISOString(), token: 'private', url: 'private' })).toBe(true);
    const response = await h.get('status'); expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json(); expect(body.status).toBe('updating'); expect(body.token).toBeUndefined(); expect(body.url).toBeUndefined();
    expect(h.requests.publish({ status: 'arbitrary', version: '0.9.73', checkedAt: new Date().toISOString() })).toBe(false);
  });
  it('ignores stale results from a previous startup', async () => {
    const h = await harness();
    h.requests.publish({ status: 'current', version: '0.9.73', checkedAt: '2020-01-01T00:00:00.000Z' });
    expect((await (await h.get('check?shellVersion=0.1.1')).json()).status).toBe('checking');
  });
  it('allows a browser to request a check without inventing a native shell version', async () => {
    const h = await harness();
    expect((await h.get('check')).status).toBe(200);
    expect(h.requests.current()?.clientKind).toBe('browser'); expect(h.requests.current()?.shellVersion).toBeUndefined();
  });
});
