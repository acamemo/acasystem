// @vitest-environment node
import Database from 'better-sqlite3';
import express from 'express';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createUpdateMaintenance, updateDataFingerprint } from '../updateMaintenance.ts';

const token = 'a'.repeat(64), transactionId = '12345678-1234-1234-1234-123456789abc';
const resources: Array<{ server: Server; database: Database.Database; directory: string }> = [];
afterEach(async () => {
  for (const resource of resources.splice(0)) {
    resource.server.closeAllConnections();
    await new Promise<void>(resolve => resource.server.close(() => resolve()));
    resource.database.close(); rmSync(resource.directory, { recursive: true, force: true });
  }
});
async function harness() {
  const directory = mkdtempSync(join(tmpdir(), 'aca-maintenance-'));
  const database = new Database(':memory:');
  database.exec("CREATE TABLE aca_command_intents(state TEXT); CREATE TABLE profiles(id TEXT PRIMARY KEY,data TEXT); INSERT INTO profiles VALUES('p','original');");
  let editors = 0;
  const options = { directory, targetId: 'pilot', token, database, version: '0.9.73', appVersion: '0.9.73.1',
    bundle: () => ({ version: '0.9.73' }), activeEditors: () => editors };
  const maintenance = createUpdateMaintenance(options);
  const app = express();
  let finishWrite: (() => void) | undefined;
  app.use('/api/internal/update', maintenance.router); app.use(maintenance.middleware);
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/profiles', (_req, res) => res.json({ profiles: [] }));
  app.post('/api/save', (_req, res) => res.json({ saved: true }));
  app.post('/api/slow', (_req, res) => { finishWrite = () => res.json({ saved: true }); });
  app.get('/api/events', (_req, res) => {
    res.locals.acaUpdateStreamReady(); res.set('Content-Type', 'text/event-stream'); res.flushHeaders(); res.write(': ready\n\n');
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  resources.push({ server, database, directory });
  const address = server.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  const request = (path: string, body?: unknown, authorization = `Bearer ${token}`) => fetch(`${origin}/api/internal/update/${path}`, {
    method: body ? 'POST' : 'GET', headers: { authorization, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { options, maintenance, origin, request, database, directory, setEditors: (count: number) => { editors = count; },
    finishWrite: () => finishWrite?.() };
}
const command = { targetId: 'pilot', transactionId };
describe('external updater maintenance boundary', () => {
  it('requires its separate credential and never returns it', async () => {
    const h = await harness();
    expect((await h.request('state', undefined, 'Bearer ha-user-token')).status).toBe(401);
    expect((await h.request('state', undefined, token)).status).toBe(401);
    const state = await (await h.request('state')).json();
    expect(state.targetId).toBe('pilot'); expect(JSON.stringify(state)).not.toContain(token);
    expect(state.dataFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
  it('persists the transaction, blocks API and proxy writes, and keeps health reachable', async () => {
    const h = await harness();
    expect((await h.request('drain', command)).status).toBe(200);
    expect(createUpdateMaintenance(h.options).blocked()).toBe(true);
    expect((await fetch(`${h.origin}/api/save`, { method: 'POST' })).status).toBe(503);
    expect((await fetch(`${h.origin}/api/profiles`)).status).toBe(503);
    expect((await fetch(`${h.origin}/ha/api/services/light/turn_on`, { method: 'POST' })).status).toBe(503);
    expect((await fetch(`${h.origin}/api/hassio_ingress/test/api/save`, { method: 'POST', headers: { 'x-ingress-path': '/api/hassio_ingress/test' } })).status).toBe(503);
    expect((await fetch(`${h.origin}/api/health`)).status).toBe(200);
    expect((await h.request('resume', command)).status).toBe(200);
    expect((await fetch(`${h.origin}/api/save`, { method: 'POST' })).status).toBe(200);
  });
  it('rejects other targets, transactions, and unsafe identifiers', async () => {
    const h = await harness();
    expect((await h.request('drain', { ...command, targetId: 'other' })).status).toBe(400);
    expect((await h.request('drain', { ...command, transactionId: '../x' })).status).toBe(400);
    await h.request('drain', command);
    expect((await h.request('resume', { ...command, transactionId: 'aaaaaaaa-1234-1234-1234-123456789abc' })).status).toBe(409);
    expect(h.maintenance.blocked()).toBe(true);
  });
  it('defers active editors and commands without leaving maintenance enabled', async () => {
    const h = await harness(); h.setEditors(1);
    expect((await h.request('drain', command)).status).toBe(409); expect(h.maintenance.blocked()).toBe(false);
    h.setEditors(0); h.database.exec("INSERT INTO aca_command_intents VALUES('pending')");
    expect((await h.request('drain', command)).status).toBe(409);
    h.database.exec('DELETE FROM aca_command_intents');
    expect((await h.request('drain', command)).status).toBe(200);
  });
  it('defers open HA websocket tunnels rather than interrupting unknown in-flight actions', async () => {
    const h = await harness(), socket = new PassThrough();
    expect(h.maintenance.acceptSocket(socket)).toBe(true);
    expect((await h.request('drain', command)).status).toBe(409);
    socket.destroy(); await new Promise<void>(resolve => setImmediate(resolve));
    expect((await h.request('drain', command)).status).toBe(200);
    const rejected = new PassThrough(); expect(h.maintenance.acceptSocket(rejected)).toBe(false); rejected.destroy();
  });
  it('waits for an HTTP write to finish before acknowledging drain', async () => {
    const h = await harness(), saving = fetch(`${h.origin}/api/slow`, { method: 'POST' });
    let pending = 0;
    for (let attempt = 0; attempt < 30; attempt++) {
      pending = (await (await h.request('state')).json()).activity.pendingWrites;
      if (pending) break;
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    expect(pending).toBe(1);
    expect((await h.request('drain', command)).status).toBe(409);
    h.finishWrite(); expect((await saving).status).toBe(200);
    expect((await h.request('drain', command)).status).toBe(200);
  });
  it('releases an SSE connection on close without treating it as a lost unfinished write', async () => {
    const h = await harness(), abort = new AbortController();
    const response = await fetch(`${h.origin}/api/events`, { signal: abort.signal });
    expect(response.status).toBe(200);
    expect((await h.request('drain', command)).status).toBe(409);
    abort.abort();
    let connections = 1;
    for (let attempt = 0; attempt < 30; attempt++) {
      const state = await (await h.request('state')).json();
      connections = state.activity.activeConnections;
      if (!connections) { expect(state.activity.pendingWrites).toBe(0); break; }
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    expect(connections).toBe(0); expect((await h.request('drain', command)).status).toBe(200);
  });
  it('keeps resume idempotent and rejects corrupt persisted state', async () => {
    const h = await harness();
    expect((await h.request('resume', command)).status).toBe(200);
    writeFileSync(join(h.directory, 'aca-update-maintenance.json'), '{broken');
    expect(h.maintenance.blocked()).toBe(true);
    expect((await h.request('state')).status).toBe(503);
    expect(() => createUpdateMaintenance(h.options)).toThrow();
    expect(readFileSync(join(h.directory, 'aca-update-maintenance.json'), 'utf8')).toBe('{broken');
  });
  it('fingerprints personal data without returning it or hashing volatile command receipts', async () => {
    const h = await harness(), before = updateDataFingerprint(h.database);
    h.database.exec("INSERT INTO aca_command_intents VALUES('pending')");
    expect(updateDataFingerprint(h.database)).toBe(before);
    h.database.exec("UPDATE profiles SET data='changed'");
    expect(updateDataFingerprint(h.database)).not.toBe(before);
    h.database.exec('CREATE TABLE aca_v2_account_images(user_id TEXT, data TEXT);');
    const emptyImage = updateDataFingerprint(h.database);
    h.database.exec("INSERT INTO aca_v2_account_images VALUES('user','private-image')");
    expect(updateDataFingerprint(h.database)).not.toBe(emptyImage);
  });
});
