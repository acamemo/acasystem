// @vitest-environment node
import express from 'express';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../models/database.ts';
import { createDataCrypto } from '../helpers/dataCrypto.ts';
import { createCollaborationStore, type V2Identity } from '../v2/store.ts';
import { createCollaborationAuth } from '../v2/auth.ts';
import { createCollaborationRouter } from '../v2/router.ts';
import type { DeviceModule } from '../services/devices/index.ts';
import { PROFILE_USAGE_HANDOFF_MS, PROFILE_USAGE_MS } from '../../../contracts/collaboration.ts';

const pc: V2Identity = { userId: 'person', userName: 'Persona', refreshTokenId: 'pc-login', tokenType: 'normal' };
const phone: V2Identity = { ...pc, refreshTokenId: 'phone-login' };
const plain = createDataCrypto({ mode: 'off', key: '', salt: '' });
const configuration = { snapshot: { layout: {} } };
const proof = (usage: { id: string; usageSessionId: string }) => ({ leaseId: usage.id, usageSessionId: usage.usageSessionId });
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};

describe('presenza SSE dell’istanza che usa il profilo', () => {
  let db: SqliteDatabase;
  let store: ReturnType<typeof createCollaborationStore>;
  let now: number;
  let profileId: string;
  const tick = async (ms: number) => { now += ms; await vi.advanceTimersByTimeAsync(ms); };
  beforeEach(() => {
    vi.useFakeTimers(); now = 1_800_000_000_000;
    db = openDatabase(':memory:');
    store = createCollaborationStore(db, { crypto: plain, now: () => now });
    store.registerClient(pc, { clientId: 'pc', label: 'PC' });
    store.registerClient(phone, { clientId: 'phone', label: 'Telefono' });
    profileId = store.createProfile(store.actor(pc), { name: 'Casa', configuration }).id;
    store.accountSelection(pc.userId);
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); db.close(); });
  it('l’ultimo EOF libera in tre secondi anche senza pagehide e notifica chi attende', async () => {
    const disconnect = store.connectUsage(store.actor(pc), 'pc-document');
    const lease = store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    store.acquire(store.actor(pc), profileId, 'editing', { kind: 'structure' });
    const events: string[] = [];
    store.subscribe(pc.userId, 'phone', event => events.push(event.type));
    disconnect();
    await tick(PROFILE_USAGE_HANDOFF_MS - 1);
    expect(() => store.acquireUsage(store.actor(phone), profileId, 'phone-document')).toThrow('in uso');
    expect(store.requireUsage(store.actor(pc), proof(lease)).id).toBe(lease.id);
    await tick(1);
    expect(events).toContain('usage');
    expect(store.listLeases(pc.userId, profileId)).toEqual([]);
    expect(() => store.requireUsage(store.actor(pc), proof(lease))).toThrow('scaduta');
    expect(store.acquireUsage(store.actor(phone), profileId, 'phone-document').clientId).toBe('phone');
  });
  it('più stream della stessa istanza tengono occupato il profilo finché l’ultimo rimane aperto', async () => {
    const first = store.connectUsage(store.actor(pc), 'pc-document');
    const second = store.connectUsage(store.actor(pc), 'pc-document');
    const lease = store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    first(); first();
    await tick(PROFILE_USAGE_HANDOFF_MS + 1);
    expect(store.requireUsage(store.actor(pc), proof(lease)).id).toBe(lease.id);
    expect(() => store.acquireUsage(store.actor(phone), profileId, 'phone-document')).toThrow('in uso');
    second();
    await tick(1000); second();
    await tick(PROFILE_USAGE_HANDOFF_MS - 1000);
    expect(store.acquireUsage(store.actor(phone), profileId, 'phone-document').clientId).toBe('phone');
  });
  it('una nuova SSE della stessa istanza annulla la grazia senza ruotare il permesso', async () => {
    const disconnect = store.connectUsage(store.actor(pc), 'pc-document');
    const lease = store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    disconnect();
    await tick(1000);
    const reconnected = store.connectUsage(store.actor(pc), 'pc-document');
    await tick(PROFILE_USAGE_HANDOFF_MS);
    expect(store.renewUsage(store.actor(pc), lease.id, 'pc-document').id).toBe(lease.id);
    expect(() => store.acquireUsage(store.actor(phone), profileId, 'phone-document')).toThrow('in uso');
    reconnected();
  });
  it('un rinnovo HTTP tardivo non annulla né prolunga il termine dopo l’EOF', async () => {
    const disconnect = store.connectUsage(store.actor(pc), 'pc-document');
    const lease = store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    disconnect();
    await tick(2000);
    expect(store.renewUsage(store.actor(pc), lease.id, 'pc-document').expiresAt).toBe(now + PROFILE_USAGE_MS);
    await tick(1000);
    expect(() => store.renewUsage(store.actor(pc), lease.id, 'pc-document')).toThrow('scaduta');
    expect(store.acquireUsage(store.actor(phone), profileId, 'phone-document').clientId).toBe('phone');
  });
  it('follower, altra scheda, altro client o altro login non tengono viva l’istanza titolare', async () => {
    const owner = store.connectUsage(store.actor(pc), 'pc-document');
    const otherStreams = [
      store.connectUsage(store.actor(phone), 'phone-document'),
      store.connectUsage(store.actor(pc), 'another-document'),
      store.connectUsage(store.actor(phone), 'pc-document'),
      store.connectUsage({ ...store.actor(pc), sessionId: 'another-login' }, 'pc-document'),
    ];
    store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    owner();
    await tick(PROFILE_USAGE_HANDOFF_MS);
    expect(store.acquireUsage(store.actor(phone), profileId, 'phone-document').clientId).toBe('phone');
    otherStreams.forEach(close => close());
  });
  it('la rotazione del fencing durante la grazia eredita il termine originale', async () => {
    const disconnect = store.connectUsage(store.actor(pc), 'pc-document');
    const first = store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    disconnect();
    await tick(2000);
    const next = store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    expect(next.id).not.toBe(first.id);
    await tick(PROFILE_USAGE_HANDOFF_MS - 2000);
    expect(() => store.requireUsage(store.actor(pc), proof(next))).toThrow('scaduta');
    expect(store.acquireUsage(store.actor(phone), profileId, 'phone-document').clientId).toBe('phone');
  });
  it('uno stream vivo rimane legato all’istanza attraverso la rotazione e il suo EOF riguarda il nuovo fencing', async () => {
    const disconnect = store.connectUsage(store.actor(pc), 'pc-document');
    store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    const next = store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    await tick(PROFILE_USAGE_HANDOFF_MS + 1);
    expect(store.requireUsage(store.actor(pc), proof(next)).id).toBe(next.id);
    disconnect();
    await tick(PROFILE_USAGE_HANDOFF_MS);
    const successor = store.acquireUsage(store.actor(phone), profileId, 'phone-document');
    disconnect();
    await tick(PROFILE_USAGE_HANDOFF_MS);
    expect(store.requireUsage(store.actor(phone), proof(successor)).id).toBe(successor.id);
  });
  it('prima della prima presenza SSE mantiene il fallback180s, anche con stream legacy senza header', async () => {
    const legacy = store.connectUsage(store.actor(pc), undefined);
    const lease = store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    legacy();
    await tick(PROFILE_USAGE_HANDOFF_MS);
    expect(store.requireUsage(store.actor(pc), proof(lease)).id).toBe(lease.id);
    expect(() => store.acquireUsage(store.actor(phone), profileId, 'phone-document')).toThrow('in uso');
    await tick(PROFILE_USAGE_MS - PROFILE_USAGE_HANDOFF_MS);
    expect(store.acquireUsage(store.actor(phone), profileId, 'phone-document').clientId).toBe('phone');
  });
  it('una SSE rientrata non annulla il rilascio esplicito hard di pagehide', async () => {
    const disconnect = store.connectUsage(store.actor(pc), 'pc-document');
    const lease = store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    store.releaseUsage(store.actor(pc), lease.id, 'pc-document', { handoff: true });
    disconnect();
    store.connectUsage(store.actor(pc), 'pc-document');
    expect(() => store.requireUsage(store.actor(pc), proof(lease))).toThrow('scaduta');
    await tick(PROFILE_USAGE_HANDOFF_MS);
    expect(store.acquireUsage(store.actor(phone), profileId, 'phone-document').clientId).toBe('phone');
  });
  it('pagehide dopo un EOF usa un solo termine senza riavviare la grazia già cominciata', async () => {
    const disconnect = store.connectUsage(store.actor(pc), 'pc-document');
    const lease = store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    disconnect();
    await tick(1000);
    store.releaseUsage(store.actor(pc), lease.id, 'pc-document', { handoff: true });
    expect(() => store.requireUsage(store.actor(pc), proof(lease))).toThrow('scaduta');
    await tick(PROFILE_USAGE_HANDOFF_MS - 1001);
    expect(() => store.acquireUsage(store.actor(phone), profileId, 'phone-document')).toThrow('in uso');
    await tick(1);
    expect(store.acquireUsage(store.actor(phone), profileId, 'phone-document').clientId).toBe('phone');
  });
  it('il reload riacquisito dopo EOF e pagehide rimane valido quando scadevano i vecchi timer', async () => {
    const disconnect = store.connectUsage(store.actor(pc), 'old-document');
    const lease = store.acquireUsage(store.actor(pc), profileId, 'old-document');
    disconnect();
    await tick(1000);
    store.releaseUsage(store.actor(pc), lease.id, 'old-document', { handoff: true });
    await tick(1500);
    const next = store.acquireUsage(store.actor(pc), profileId, 'new-document');
    store.connectUsage(store.actor(pc), 'new-document');
    await tick(PROFILE_USAGE_HANDOFF_MS);
    expect(store.requireUsage(store.actor(pc), proof(next)).id).toBe(next.id);
    expect(() => store.acquireUsage(store.actor(phone), profileId, 'phone-document')).toThrow('in uso');
  });
});

describe('aggancio SSE nel router dopo autenticazione', () => {
  let db: SqliteDatabase;
  let store: ReturnType<typeof createCollaborationStore>;
  let server: Server;
  let base: string;
  let profileId: string;
  let now: number;
  let delayAuthentication: boolean;
  let authStarted: ReturnType<typeof deferred>;
  let authGate: ReturnType<typeof deferred>;
  let nextClose: ReturnType<typeof deferred>;
  const controllers: AbortController[] = [];
  beforeEach(async () => {
    db = openDatabase(':memory:'); now = 1_800_000_000_000;
    store = createCollaborationStore(db, { crypto: plain, now: () => now });
    store.registerClient(pc, { clientId: 'pc', label: 'PC' });
    store.registerClient(phone, { clientId: 'phone', label: 'Telefono' });
    profileId = store.createProfile(store.actor(pc), { name: 'Casa', configuration }).id;
    const devices = { keeper: { offerAdmin: () => undefined } } as unknown as DeviceModule;
    const auth = createCollaborationAuth(store, devices, async token => ({ user: { id: pc.userId, name: pc.userName, isAdmin: false, isOwner: false }, refreshTokenId: token === 'phone' ? phone.refreshTokenId : pc.refreshTokenId, tokenType: 'normal' }));
    const authorize = auth.authorize;
    delayAuthentication = false; authStarted = deferred(); authGate = deferred(); nextClose = deferred();
    auth.authorize = async req => {
      if (req.path === '/events' && delayAuthentication) { authStarted.resolve(); await authGate.promise; }
      return authorize(req);
    };
    const app = express(); app.use(express.json());
    app.use('/v2/events', (_req, res, next) => { const closed = nextClose; res.once('close', closed.resolve); next(); });
    app.use('/v2', createCollaborationRouter(store, auth, devices));
    server = await new Promise<Server>(resolve => { const started = app.listen(0, '127.0.0.1', () => resolve(started)); });
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta mancante');
    base = `http://127.0.0.1:${address.port}/v2`;
  });
  afterEach(async () => {
    authGate.resolve(); controllers.splice(0).forEach(controller => controller.abort());
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close();
  });
  const openStream = async () => {
    const controller = new AbortController(); controllers.push(controller);
    nextClose = deferred(); const closed = nextClose.promise;
    const response = await fetch(`${base}/events`, { headers: { Authorization: 'Bearer pc', 'x-aca-usage-session': 'pc-document' }, signal: controller.signal });
    expect(response.status).toBe(200);
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('resync');
    return { controller, closed, reader };
  };
  it('un abort della SSE registrata arma la grazia senza bisogno di DELETEpagehide', async () => {
    const stream = await openStream();
    store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    stream.controller.abort(); await stream.closed;
    expect(() => store.acquireUsage(store.actor(phone), profileId, 'phone-document')).toThrow('in uso');
    now += PROFILE_USAGE_HANDOFF_MS;
    expect(store.acquireUsage(store.actor(phone), profileId, 'phone-document').clientId).toBe('phone');
  });
  it('una richiesta chiusa durante auth non lascia una presenza fantasma che blocca il successivo EOF', async () => {
    delayAuthentication = true;
    const controller = new AbortController(); controllers.push(controller);
    nextClose = deferred(); const closed = nextClose.promise;
    const opening = fetch(`${base}/events`, { headers: { Authorization: 'Bearer pc', 'x-aca-usage-session': 'pc-document' }, signal: controller.signal });
    const aborted = opening.catch(() => null);
    await authStarted.promise;
    controller.abort(); await aborted; await closed;
    delayAuthentication = false; authGate.resolve();
    const fresh = await openStream();
    store.acquireUsage(store.actor(pc), profileId, 'pc-document');
    fresh.controller.abort(); await fresh.closed;
    now += PROFILE_USAGE_HANDOFF_MS;
    expect(store.acquireUsage(store.actor(phone), profileId, 'phone-document').clientId).toBe('phone');
  });
});
