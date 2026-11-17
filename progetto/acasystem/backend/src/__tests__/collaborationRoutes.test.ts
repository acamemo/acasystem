// @vitest-environment node
import express from 'express';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../models/database.ts';
import { createDataCrypto } from '../helpers/dataCrypto.ts';
import { createCollaborationStore } from '../v2/store.ts';
import { createCollaborationAuth } from '../v2/auth.ts';
import { createCollaborationRouter } from '../v2/router.ts';
import { createActivityService } from '../v2/activity.ts';
import { createActivityRouter } from '../v2/activityRoutes.ts';
import { createAccountRouter } from '../v2/account.ts';
import { makePng } from './casa3dFixtures.ts';
import type { DeviceModule } from '../services/devices/index.ts';
import { HaError } from '../services/devices/haTransport.ts';
import type { ClientRecord, CollaborationBootstrap, LiveProfile } from '../../../contracts/collaboration.ts';

describe('protocollo v2 autenticato e confini tra account', () => {
  let db: SqliteDatabase;
  let server: Server;
  let base: string;
  let deleted: { token: string; refreshId: string }[];
  let store: ReturnType<typeof createCollaborationStore>;
  beforeEach(async () => {
    db = openDatabase(':memory:'); deleted = [];
    const activity = createActivityService(db);
    store = createCollaborationStore(db, { crypto: createDataCrypto({ mode: 'off', key: '', salt: '' }), record: activity.record });
    const devices = { keeper: { offerAdmin: () => undefined }, adapter: { withWs: async (token: string, run: (api: { deleteRefreshToken: (id: string) => Promise<void> }) => Promise<void>) => run({ deleteRefreshToken: async refreshId => { deleted.push({ token, refreshId }); } }) } } as unknown as DeviceModule;
    const auth = createCollaborationAuth(store, devices, async token => {
      if (token === 'offline') throw new HaError('unreachable');
      if (!['pc-token', 'phone-token', 'anna-token'].includes(token)) throw new HaError('unauthorized');
      const anna = token === 'anna-token';
      return { user: { id: anna ? 'anna' : 'mario', name: anna ? 'Anna' : 'Mario', isAdmin: false, isOwner: false }, refreshTokenId: `refresh:${token}`, tokenType: 'normal' };
    });
    const app = express(); app.use(express.json());
    app.use('/api/v2', createCollaborationRouter(store, auth, devices));
    app.use('/api/v2/activity', createActivityRouter({ activity, authorize: auth.authorize }));
    app.use('/api/v2/account', createAccountRouter({ database: db, collaboration: store, activity, authorize: auth.authorize }));
    server = await new Promise<Server>(resolve => { const opened = app.listen(0, '127.0.0.1', () => resolve(opened)); });
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta mancante');
    base = `http://127.0.0.1:${address.port}/api/v2`;
  });
  afterEach(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); });
  const request = (path: string, token: string | null = 'pc-token', body?: unknown, method?: string) => fetch(`${base}${path}`, { method: method ?? (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const register = async (token: string, id: string) => (await (await request('/clients', token, { clientId: id, label: id === 'pc' ? 'PC studio' : 'Telefono', platform: 'web' })).json()) as ClientRecord;
  const create = async () => {
    await register('pc-token', 'pc');
    return await (await request('/profiles', 'pc-token', { name: 'Casa', configuration: { snapshot: { version: 1, layout: { pagesConfig: { pages: ['home'], home: ['light.a'] }, customNames: {} } }, appearance: {} } })).json() as LiveProfile;
  };
  it('rifiuta header ingress/client inventati senza bearer verificato', async () => {
    const answer = await fetch(`${base}/bootstrap`, { headers: { 'x-remote-user-id': 'mario', 'x-client-id': 'pc', 'x-ingress-path': '/trusted' } });
    expect(answer.status).toBe(401);
    expect((await request('/bootstrap', 'invented')).status).toBe(401);
  });
  it('conserva la distinzione tra sessione rifiutata e Home Assistant temporaneamente irraggiungibile', async () => {
    const answer = await request('/bootstrap', 'offline'); expect(answer.status).toBe(503);
    expect(await answer.json()).toMatchObject({ code: 'HA_SESSION_UNAVAILABLE' });
  });
  it('non accetta identità dichiarate nel body e non espone metadati token', async () => {
    const result = await request('/clients', 'pc-token', { clientId: 'pc', label: 'PC studio', userId: 'anna', refreshTokenId: 'stolen' });
    expect(result.status).toBe(201);
    const client = await result.json() as ClientRecord; expect(client.userId).toBe('mario');
    const bootstrap = await (await request('/bootstrap')).json() as CollaborationBootstrap;
    expect(bootstrap.client?.id).toBe('pc'); expect(bootstrap.user).toMatchObject({ id: 'mario', color: expect.stringMatching(/^#[0-9a-f]{6}$/) });
    expect(JSON.stringify(bootstrap)).not.toContain('refresh:');
  });
  it('condivide Tavano nella casa ma non l’accesso ai profili degli altri', async () => {
    const p = await create(); await register('anna-token', 'anna-phone');
    expect((await request(`/profiles/${p.id}`, 'anna-token')).status).toBe(404);
    expect((await request(`/profiles/${p.id}`, 'anna-token', { name: 'Altrui' }, 'PATCH')).status).toBe(404);
    const activities = await (await request('/activity', 'anna-token')).json() as { events: { action: string; actor: { userId: string } }[] };
    expect(activities.events.some(event => event.action === 'profile.created' && event.actor.userId === 'mario')).toBe(true);
  });
  it('revoca il telefono usando la sessione personale del PC', async () => {
    await register('pc-token', 'pc'); await register('phone-token', 'phone');
    const answer = await request('/clients/phone/revoke', 'pc-token', {}); expect(answer.status).toBe(200);
    expect(deleted).toEqual([{ token: 'pc-token', refreshId: 'refresh:phone-token' }]);
    expect((await request('/bootstrap', 'phone-token')).status).toBe(401);
    expect((await request('/bootstrap', 'pc-token')).status).toBe(200);
  });
  it('emette resync iniziale e notifiche SSE senza credenziali nell’URL', async () => {
    const p = await create();
    const abort = new AbortController();
    const stream = await fetch(`${base}/events`, { headers: { Authorization: 'Bearer pc-token' }, signal: abort.signal });
    expect(stream.headers.get('content-type')).toContain('text/event-stream');
    const reader = stream.body!.getReader(); const decoder = new TextDecoder();
    expect(decoder.decode((await reader.read()).value)).toContain('"type":"resync"');
    store.publish('mario', { type: 'profile', profileId: p.id, revision: 2 });
    expect(decoder.decode((await reader.read()).value)).toContain(`"profileId":"${p.id}"`);
    abort.abort(); await reader.cancel().catch(() => undefined);
  });
  it('mostra l’avatar ai membri senza consentire modifiche o lettura della cover altrui', async () => {
    await register('pc-token', 'pc'); await register('anna-token', 'anna-phone');
    const image = `data:image/png;base64,${makePng(16, 16).toString('base64')}`;
    const saved = await request('/account/images/avatar', 'pc-token', { baseRevision: 0, userId: 'anna', dataUrl: image }, 'PUT');
    expect(saved.status).toBe(200); expect(await saved.json()).toMatchObject({ userId: 'mario', avatarRevision: 1 });
    const visible = await request('/account/users/mario/avatar', 'anna-token');
    expect(visible.status).toBe(200); expect(visible.headers.get('content-type')).toContain('image/png');
    expect((await request('/account/images/avatar', 'anna-token')).status).toBe(404);
    expect((await request('/account/users/mario/cover', 'anna-token')).status).toBe(404);
    expect((await request('/account/users/mario/avatar', null)).status).toBe(401);
    const all = await (await request('/activity/export', 'anna-token')).text();
    expect(all).not.toContain('data:image'); expect(all).not.toContain(image.split(',')[1]);
  });
});
