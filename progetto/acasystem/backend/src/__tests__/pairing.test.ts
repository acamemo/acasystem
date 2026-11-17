// @vitest-environment node
import Database from 'better-sqlite3';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createPairingService, PAIRING_TTL_MS, parsePairingEndpoint, sanitizeSharedConfiguration } from '../pairing.ts';
import { createPairingRouter } from '../pairingRoutes.ts';
import type { HomeAssistantAuthMiddleware } from '../middlewares/homeAssistantAuth.ts';

const configuration = () => sanitizeSharedConfiguration({
  snapshot: { version: 1, layout: {
    launcherLayout: { version: 1, cover: { enabled: true }, homePageId: 'cucina', pages: [{
      id: 'cucina', label: 'Cucina', kind: 'widgets', placements: {
        tablet: { 'light.cucina': { x: 0, y: 0, w: 2, h: 2 } },
      },
    }] },
    cardSettings: { 'cucina::light.cucina': { categoryWidgetType: 'light', bindingEntityId: 'light.cucina', deviceId: 'device-secret', password: 'secret' } },
    customNames: { 'light.cucina': 'Lampada' }, headerSettings: { showClock: true, personId: 'person.secret' },
    statusPillsConfig: [{ entityId: 'person.secret' }],
  }, device: { id: 'phone-secret', casa3dQuality: 'high' }, token: 'permanent-secret' },
  appearance: { theme: 'dark', accent: 'cyan', wallpaper: 'photo', wallpaperHue: 100 },
})!;

const databases: Database.Database[] = [];
const servers: Server[] = [];
const database = () => { const db = new Database(':memory:'); databases.push(db); return db; };
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => {
    server.closeAllConnections(); server.close(() => resolve());
  })));
  databases.splice(0).forEach((db) => db.close());
});

describe('QR pairing and account settings', () => {
  it('requires a private LAN endpoint and refuses loopback, credentials and URL paths', () => {
    expect(parsePairingEndpoint('http://192.168.1.5:3002')).toBe('http://192.168.1.5:3002');
    for (const value of ['http://127.0.0.1:3002', 'https://192.168.1.5:3002', 'http://8.8.8.8', 'http://u:p@192.168.1.5', 'http://192.168.1.5/ha']) {
      expect(parsePairingEndpoint(value)).toBeNull();
    }
  });
  it('keeps the house identity across restarts, but drops invitations', () => {
    const db = database();
    const first = createPairingService(db);
    const invitation = first.issue('user-a', 'http://192.168.1.5:3002', configuration());
    const restarted = createPairingService(db);
    expect(restarted.houseId).toBe(first.houseId);
    expect(restarted.accept(invitation.invite, invitation.houseId, 'account')).toBeNull();
  });
  it('expires invitations, consumes them once and invalidates a regenerated code', () => {
    let clock = 1000;
    const service = createPairingService(database(), { now: () => clock });
    const first = service.issue('user-a', 'http://192.168.1.5:3002', configuration());
    const second = service.issue('user-a', first.endpoint, configuration());
    expect(service.accept(first.invite, first.houseId, 'account')).toBeNull();
    const accepted = service.accept(second.invite, second.houseId, 'account');
    expect(accepted).toMatchObject({ mode: 'account', accountUserId: 'user-a', loginRequired: true });
    expect(accepted).not.toHaveProperty('configuration');
    expect(accepted).not.toHaveProperty('accessToken');
    expect(service.accept(second.invite, second.houseId, 'account')).toBeNull();
    const third = service.issue('user-a', first.endpoint, configuration());
    clock += PAIRING_TTL_MS;
    expect(service.accept(third.invite, third.houseId, 'account')).toBeNull();
  });
  it('copies portable structure and style with fresh widget/page ids and no source bindings', () => {
    const service = createPairingService(database());
    const invitation = service.issue('user-a', 'http://192.168.1.5:3002', configuration());
    const accepted = service.accept(invitation.invite, invitation.houseId, 'configuration');
    expect(accepted).toMatchObject({ mode: 'configuration', configuration: { appearance: { theme: 'dark', wallpaper: 'none' } } });
    expect(accepted).not.toHaveProperty('accountUserId');
    const json = JSON.stringify(accepted?.configuration);
    for (const secret of ['light.cucina', 'device-secret', 'person.secret', 'phone-secret', 'permanent-secret', 'bindingEntityId', 'password', 'casa3dQuality']) {
      expect(json).not.toContain(secret);
    }
    expect(json).toContain('light.aca_copy_1');
    expect(json).toContain('categoryWidgetType');
    expect(json).toContain('qr_page_1');
  });
  it('isolates accounts, rejects stale writes and pushes revisions to the right account', () => {
    const service = createPairingService(database());
    const events: number[] = [];
    const unsubscribe = service.subscribe('user-a', (revision) => events.push(revision));
    expect(service.writeSettings('user-a', 0, configuration())?.revision).toBe(1);
    expect(service.readSettings('user-b')).toBeNull();
    expect(service.writeSettings('user-a', 0, configuration())).toBeNull();
    service.writeSettings('user-b', 0, configuration());
    expect(events).toEqual([1]);
    unsubscribe();
    service.writeSettings('user-a', 1, configuration());
    expect(events).toEqual([1]);
  });
  it('protects invite creation and settings, while redeeming an opaque invitation without HA credentials', async () => {
    const app = express();
    app.use(express.json());
    const authenticate: HomeAssistantAuthMiddleware = async (req, res, next) => {
      const token = req.get('authorization');
      if (token !== 'Bearer user-a' && token !== 'Bearer user-b') { res.status(401).json({ error: 'Unauthenticated' }); return; }
      req.authenticatedHaUser = { id: token.slice(7), name: 'Test', is_admin: false, is_owner: false };
      next();
    };
    app.use('/api/pairing', createPairingRouter(database(), authenticate));
    const server = app.listen(0, '127.0.0.1'); servers.push(server);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test address');
    const origin = `http://127.0.0.1:${address.port}/api/pairing`;
    expect((await fetch(`${origin}/invites`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status).toBe(401);
    const issued = await fetch(`${origin}/invites`, { method: 'POST', headers: { Authorization: 'Bearer user-a', 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'http://192.168.1.5:3002', configuration: configuration() }) });
    const invite = await issued.json();
    // Visiting a page/link is a GET: only the explicit POST may consume the invitation.
    expect((await fetch(`${origin}/accept`)).status).toBe(404);
    const accept = () => fetch(`${origin}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      invite: invite.invite, houseId: invite.houseId, action: 'configuration',
    }) });
    expect((await accept()).status).toBe(200);
    expect((await accept()).status).toBe(410);
    expect((await fetch(`${origin}/settings`)).status).toBe(401);
  });
  it('requires the destination login and sanitizes an imported file without creating shared account settings', async () => {
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    const authenticate: HomeAssistantAuthMiddleware = async (req, res, next) => {
      if (req.get('authorization') !== 'Bearer own-user') { res.status(401).json({ error: 'Unauthenticated' }); return; }
      req.authenticatedHaUser = { id: 'own-user', name: 'Test', is_admin: false, is_owner: false };
      next();
    };
    app.use('/api/pairing', createPairingRouter(database(), authenticate));
    const server = app.listen(0, '127.0.0.1'); servers.push(server);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test address');
    const origin = `http://127.0.0.1:${address.port}/api/pairing`;
    const send = (body: unknown, authorized = true) => fetch(`${origin}/configuration/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: 'Bearer own-user' } : {}) },
      body: JSON.stringify(body),
    });
    const body = { format: 'acasystem-layout', schema: 1, configuration: configuration(),
      houseId: 'source-house', accountUserId: 'source-user', token: 'source-token' };
    expect((await send(body, false)).status).toBe(401);
    expect((await send({ ...body, schema: 2 })).status).toBe(400);
    expect((await send({ ...body, configuration: {} })).status).toBe(400);
    expect((await send({ ...body, padding: 'x'.repeat(512 * 1024) })).status).toBe(413);
    const response = await send(body);
    expect(response.status).toBe(200);
    const imported = await response.json();
    expect(imported).toMatchObject({ schema: 1, configuration: { appearance: { theme: 'dark', wallpaper: 'none' } } });
    const text = JSON.stringify(imported);
    for (const secret of ['source-house', 'source-user', 'source-token', 'bindingEntityId', 'light.cucina', 'device-secret', 'person.secret', 'password']) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain('light.aca_copy_1');
    expect(await (await fetch(`${origin}/settings`, { headers: { Authorization: 'Bearer own-user' } })).json()).toBeNull();
  });
  it('streams account revisions over HTTP without disclosing another user’s changes', async () => {
    const app = express();
    app.use(express.json());
    const authenticate: HomeAssistantAuthMiddleware = async (req, res, next) => {
      const token = req.get('authorization');
      if (token !== 'Bearer user-a' && token !== 'Bearer user-b') { res.status(401).json({ error: 'Unauthenticated' }); return; }
      req.authenticatedHaUser = { id: token.slice(7), name: 'Test', is_admin: false, is_owner: false };
      next();
    };
    app.use('/api/pairing', createPairingRouter(database(), authenticate));
    const server = app.listen(0, '127.0.0.1'); servers.push(server);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test address');
    const origin = `http://127.0.0.1:${address.port}/api/pairing`;
    const save = (user: string, baseRevision: number) => fetch(`${origin}/settings`, {
      method: 'PUT', headers: { Authorization: `Bearer ${user}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseRevision, configuration: configuration() }),
    });
    for (let revision = 0; revision < 3; revision++) expect((await save('user-b', revision)).status).toBe(200);
    const controller = new AbortController();
    const response = await fetch(`${origin}/events`, { headers: { Authorization: 'Bearer user-a' }, signal: controller.signal });
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const nextRevision = async () => {
      while (!buffer.includes('\n\n')) {
        const part = await reader.read();
        if (part.done) throw new Error('Stream ended');
        buffer += decoder.decode(part.value, { stream: true });
      }
      const boundary = buffer.indexOf('\n\n');
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = event.split('\n').find((line) => line.startsWith('data: '));
      return JSON.parse(data!.slice(6)).revision;
    };
    expect(await nextRevision()).toBe(0);
    expect((await save('user-b', 3)).status).toBe(200);
    expect((await save('user-a', 0)).status).toBe(200);
    expect(await nextRevision()).toBe(1);
    controller.abort();
    reader.releaseLock();
  });
});
