// @vitest-environment node
import express from 'express';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../models/database.ts';
import { createDataCrypto } from '../helpers/dataCrypto.ts';
import { createCollaborationStore, type V2Identity } from '../v2/store.ts';
import { createCollaborationAuth } from '../v2/auth.ts';
import { createCollaborationRouter } from '../v2/router.ts';
import { createCommandsRouter } from '../v2/commands.ts';
import { createActivityService } from '../v2/activity.ts';
import type { DeviceModule } from '../services/devices/index.ts';
import type { LiveProfile, ProfileUsageLease } from '../../../contracts/collaboration.ts';
import { PROFILE_USAGE_MS, PROFILE_USAGE_HANDOFF_MS } from '../../../contracts/collaboration.ts';

const pc: V2Identity = { userId: 'person', userName: 'Persona', refreshTokenId: 'pc-login', tokenType: 'normal' };
const phone: V2Identity = { ...pc, refreshTokenId: 'phone-login' };
const other: V2Identity = { userId: 'other', userName: 'Altra persona', refreshTokenId: 'other-login', tokenType: 'normal' };
const plain = createDataCrypto({ mode: 'off', key: '', salt: '' });
const configuration = { snapshot: { layout: { pagesConfig: { pages: ['home'], home: ['light.sample'] }, cardSettings: {}, customNames: {} } } };
const occupied = 'questo profilo è in uso su un altro dispositivo chiudi le altre sessioni per usare questo dispositivo';
const proof = (lease: ProfileUsageLease) => ({ leaseId: lease.id, usageSessionId: lease.usageSessionId });

describe('riserva funzionale del profilo distinta dall’editing', () => {
  let db: SqliteDatabase;
  let store: ReturnType<typeof createCollaborationStore>;
  let now: number;
  let profile: LiveProfile;
  beforeEach(() => {
    db = openDatabase(':memory:'); now = 1_800_000_000_000;
    store = createCollaborationStore(db, { crypto: plain, now: () => now });
    store.registerClient(pc, { clientId: 'pc', label: 'PC' });
    store.registerClient(phone, { clientId: 'phone', label: 'Telefono' });
    profile = store.createProfile(store.actor(pc), { name: 'Casa', configuration });
    store.accountSelection(pc.userId);
  });
  afterEach(() => { db.close(); vi.useRealTimers(); });
  it('consente un solo dispositivo o scheda e mantiene l’isolamento fra account', () => {
    const lease = store.acquireUsage(store.actor(pc), profile.id, 'tab-pc');
    expect(lease.expiresAt - lease.serverTime).toBe(PROFILE_USAGE_MS);
    expect(() => store.acquireUsage(store.actor(phone), profile.id, 'tab-phone')).toThrow(occupied);
    expect(() => store.acquireUsage(store.actor(pc), profile.id, 'another-tab')).toThrow(occupied);
    store.registerClient(other, { clientId: 'other', label: 'Altro' });
    const own = store.createProfile(store.actor(other), { name: 'Altra casa', configuration });
    expect(store.acquireUsage(store.actor(other), own.id, 'other-tab').profileId).toBe(own.id);
    expect(() => store.acquireUsage(store.actor(other), profile.id, 'other-tab')).toThrow('non è disponibile');
    expect(JSON.stringify(lease)).not.toContain('login');
  });
  it('un PC in background continua a occupare il profilo quando rinnova', () => {
    const lease = store.acquireUsage(store.actor(pc), profile.id, 'tab-pc');
    for (let tick = 0; tick < 12; tick += 1) {
      now += 20_000;
      expect(store.renewUsage(store.actor(pc), lease.id, 'tab-pc').id).toBe(lease.id);
      expect(() => store.acquireUsage(store.actor(phone), profile.id, 'tab-phone')).toThrow(occupied);
    }
    expect(now - lease.serverTime).toBeGreaterThan(PROFILE_USAGE_MS);
  });
  it('richiede anche il client e la sessione HA verificati per rinnovo e rilascio', () => {
    const lease = store.acquireUsage(store.actor(pc), profile.id, 'tab-pc');
    expect(() => store.renewUsage(store.actor(phone), lease.id, 'tab-pc')).toThrow(occupied);
    expect(() => store.releaseUsage({ ...store.actor(pc), sessionId: 'another-login' }, lease.id, 'tab-pc')).toThrow(occupied);
    expect(() => store.requireUsage(store.actor(pc), { ...proof(lease), usageSessionId: 'another-tab' })).toThrow(occupied);
    expect(store.requireUsage(store.actor(pc), proof(lease)).id).toBe(lease.id);
  });
  it('ogni acquisizione ha un fencing ID nuovo e un rilascio tardivo non elimina il successore', () => {
    const first = store.acquireUsage(store.actor(pc), profile.id, 'tab-pc');
    const second = store.acquireUsage(store.actor(pc), profile.id, 'tab-pc');
    expect(second.id).not.toBe(first.id);
    store.releaseUsage(store.actor(pc), first.id, 'tab-pc');
    expect(() => store.renewUsage(store.actor(pc), first.id, 'tab-pc')).toThrow('scaduta');
    expect(store.requireUsage(store.actor(pc), proof(second)).id).toBe(second.id);
  });
  it('pagehide invalida subito il proof ma permette al reload dello stesso login di precedere gli altri dispositivi', () => {
    const first = store.acquireUsage(store.actor(pc), profile.id, 'old-document');
    store.acquire(store.actor(pc), profile.id, 'edit', { kind: 'structure' });
    store.releaseUsage(store.actor(pc), first.id, 'old-document', { handoff: true });
    expect(() => store.requireUsage(store.actor(pc), proof(first))).toThrow('scaduta');
    expect(() => store.renewUsage(store.actor(pc), first.id, 'old-document')).toThrow('scaduta');
    expect(store.listLeases(pc.userId, profile.id)).toEqual([]);
    expect(() => store.acquireUsage(store.actor(phone), profile.id, 'phone-document')).toThrow(occupied);
    expect(() => store.acquireUsage({ ...store.actor(pc), sessionId: 'another-login' }, profile.id, 'new-document')).toThrow(occupied);
    const next = store.acquireUsage(store.actor(pc), profile.id, 'new-document');
    expect(next.id).not.toBe(first.id);
    store.releaseUsage(store.actor(pc), first.id, 'old-document');
    expect(store.requireUsage(store.actor(pc), proof(next)).id).toBe(next.id);
  });
  it('alla scadenza di tre secondi pubblica la disponibilità senza estendere la grazia per cleanup ripetuti', async () => {
    vi.useFakeTimers();
    const first = store.acquireUsage(store.actor(pc), profile.id, 'old-document');
    const notifications: string[] = [];
    const unsubscribe = store.subscribe(pc.userId, 'phone', event => notifications.push(event.type));
    store.releaseUsage(store.actor(pc), first.id, 'old-document', { handoff: true });
    now += 1000; await vi.advanceTimersByTimeAsync(1000);
    store.releaseUsage(store.actor(pc), first.id, 'old-document');
    now += 1000; await vi.advanceTimersByTimeAsync(1000);
    store.releaseUsage(store.actor(pc), first.id, 'old-document', { handoff: true });
    now += PROFILE_USAGE_HANDOFF_MS - 2001;
    await vi.advanceTimersByTimeAsync(PROFILE_USAGE_HANDOFF_MS - 2001);
    expect(() => store.acquireUsage(store.actor(phone), profile.id, 'phone-document')).toThrow(occupied);
    expect(notifications).toEqual(['usage']);
    now += 1; await vi.advanceTimersByTimeAsync(1);
    expect(notifications).toEqual(['usage', 'usage']);
    expect(store.acquireUsage(store.actor(phone), profile.id, 'phone-document').clientId).toBe('phone');
    unsubscribe();
  });
  it('il timer e un rilascio del vecchio documento non rimuovono il lease riacquisito durante la grazia', async () => {
    vi.useFakeTimers();
    const first = store.acquireUsage(store.actor(pc), profile.id, 'old-document');
    store.releaseUsage(store.actor(pc), first.id, 'old-document', { handoff: true });
    now += 1000; await vi.advanceTimersByTimeAsync(1000);
    const next = store.acquireUsage(store.actor(pc), profile.id, 'new-document');
    now += PROFILE_USAGE_HANDOFF_MS; await vi.advanceTimersByTimeAsync(PROFILE_USAGE_HANDOFF_MS);
    store.releaseUsage(store.actor(pc), first.id, 'old-document', { handoff: true });
    expect(store.requireUsage(store.actor(pc), proof(next)).id).toBe(next.id);
    expect(() => store.acquireUsage(store.actor(phone), profile.id, 'phone-document')).toThrow(occupied);
  });
  it('alla chiusura esplicita libera subito il profilo e le riserve di editing', () => {
    const lease = store.acquireUsage(store.actor(pc), profile.id, 'tab-pc');
    store.acquire(store.actor(pc), profile.id, 'edit', { kind: 'structure' });
    store.releaseUsage(store.actor(pc), lease.id, 'tab-pc');
    expect(store.listLeases(pc.userId, profile.id)).toEqual([]);
    const next = store.acquireUsage(store.actor(phone), profile.id, 'tab-phone');
    store.releaseUsage(store.actor(pc), lease.id, 'tab-pc');
    expect(store.requireUsage(store.actor(phone), proof(next)).id).toBe(next.id);
  });
  it('dopo rete assente o crash scade; il vecchio titolare non può rinnovare o scrivere', () => {
    const lease = store.acquireUsage(store.actor(pc), profile.id, 'tab-pc');
    store.acquire(store.actor(pc), profile.id, 'edit', { kind: 'structure' });
    now += PROFILE_USAGE_MS;
    const next = store.acquireUsage(store.actor(phone), profile.id, 'tab-phone');
    expect(() => store.renewUsage(store.actor(pc), lease.id, 'tab-pc')).toThrow('scaduta');
    expect(() => store.requireUsage(store.actor(pc), proof(lease))).toThrow(occupied);
    expect(store.listLeases(pc.userId, profile.id)).toEqual([]);
    expect(store.requireUsage(store.actor(phone), proof(next)).id).toBe(next.id);
  });
  it('un riavvio invalida i permessi d’uso senza alterare profili o sessioni salvate', () => {
    const lease = store.acquireUsage(store.actor(pc), profile.id, 'tab-pc');
    const restarted = createCollaborationStore(db, { crypto: plain, now: () => now });
    expect(() => restarted.requireUsage(restarted.actor(pc), proof(lease))).toThrow('scaduta');
    expect(restarted.profile(pc.userId, profile.id)).toEqual(profile);
    expect(restarted.sessionClient(phone)?.id).toBe('phone');
    expect(restarted.acquireUsage(restarted.actor(phone), profile.id, 'tab-phone').id).not.toBe(lease.id);
  });
  it('non aggira l’occupazione scegliendo una copia; lo stesso titolare può trasferirsi', () => {
    const copy = store.createProfile(store.actor(pc), { name: 'Copia', configuration });
    const first = store.acquireUsage(store.actor(pc), profile.id, 'tab-pc');
    expect(() => store.acquireUsage(store.actor(phone), copy.id, 'tab-phone')).toThrow(occupied);
    const next = store.acquireUsage(store.actor(pc), copy.id, 'tab-pc');
    expect(() => store.requireUsage(store.actor(pc), proof(first))).toThrow('scaduta');
    expect(store.requireUsage(store.actor(pc), proof(next), copy.id).id).toBe(next.id);
    expect(() => store.requireUsage(store.actor(pc), proof(next))).toThrow('Collega');
    store.updateClient(store.actor(pc), 'pc', { activeProfileId: copy.id });
    expect(store.requireUsage(store.actor(pc), proof(next)).id).toBe(next.id);
  });
  it('la revoca locale del dispositivo libera anche l’uso senza attendere HA', () => {
    store.acquireUsage(store.actor(pc), profile.id, 'tab-pc');
    store.markRevoked(store.actor(phone), 'pc');
    expect(() => store.actor(pc)).toThrow('revocato');
    expect(store.acquireUsage(store.actor(phone), profile.id, 'tab-phone').clientId).toBe('phone');
  });
});

describe('guard API del profilo e dei comandi ACA', () => {
  let db: SqliteDatabase;
  let store: ReturnType<typeof createCollaborationStore>;
  let server: Server;
  let base: string;
  let profile: LiveProfile;
  let sends: number;
  beforeEach(async () => {
    db = openDatabase(':memory:'); sends = 0;
    const activity = createActivityService(db);
    store = createCollaborationStore(db, { crypto: plain, record: activity.record });
    store.registerClient(pc, { clientId: 'pc', label: 'PC' });
    store.registerClient(phone, { clientId: 'phone', label: 'Telefono' });
    profile = store.createProfile(store.actor(pc), { name: 'Casa', configuration });
    const devices = { keeper: { offerAdmin: () => undefined } } as unknown as DeviceModule;
    const auth = createCollaborationAuth(store, devices, async token => ({ user: { id: pc.userId, name: pc.userName, isAdmin: false, isOwner: false }, refreshTokenId: token === 'phone' ? phone.refreshTokenId : pc.refreshTokenId, tokenType: 'normal' }));
    const app = express(); app.use(express.json());
    app.use('/v2', createCollaborationRouter(store, auth, devices));
    app.use('/v2/commands', createCommandsRouter({ database: db, activity, authorize: req => req.method === 'GET' ? auth.authorize(req) : auth.authorizeUsage(req), execute: async () => { sends += 1; } }));
    server = await new Promise<Server>(resolve => { const started = app.listen(0, '127.0.0.1', () => resolve(started)); });
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta mancante');
    base = `http://127.0.0.1:${address.port}/v2`;
  });
  afterEach(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); });
  const request = (path: string, token = 'pc', body?: unknown, method?: string, lease?: ProfileUsageLease) => fetch(base + path, { method: method ?? (body === undefined ? 'GET' : 'POST'), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(lease ? { 'x-aca-usage-lease': lease.id, 'x-aca-usage-session': lease.usageSessionId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const use = async (token = 'pc', id = profile.id, usageSessionId = `tab-${token}`) => {
    const response = await request(`/profiles/${id}/usage`, token, { usageSessionId });
    expect(response.status).toBe(201);
    return response.json() as Promise<ProfileUsageLease>;
  };
  const command = { kind: 'service', domain: 'light', service: 'toggle', data: { entity_id: 'light.sample' } };
  it('bootstrap e letture precedono la concessione, le mutazioni richiedono proof server', async () => {
    expect((await request('/bootstrap')).status).toBe(200);
    expect((await request(`/profiles/${profile.id}`)).status).toBe(200);
    expect((await request(`/profiles/${profile.id}/leases`, 'pc', { editSessionId: 'edit', target: { kind: 'structure' } })).status).toBe(409);
    expect((await request('/commands/prepare', 'pc', { command })).status).toBe(409);
    expect(db.prepare('SELECT COUNT(*) AS n FROM aca_command_intents').get()).toEqual({ n: 0 });
    const lease = await use();
    expect((await request(`/profiles/${profile.id}/leases`, 'pc', { editSessionId: 'edit', target: { kind: 'structure' } }, undefined, lease)).status).toBe(200);
  });
  it('il secondo dispositivo non può acquisire, cambiare selezione o salvare un’operazione', async () => {
    const lease = await use();
    for (const [path, body, method] of [
      [`/profiles/${profile.id}/usage`, { usageSessionId: 'tab-phone' }, 'POST'],
      ['/clients/phone', { activeProfileId: profile.id }, 'PATCH'],
      [`/profiles/${profile.id}/operations`, { operationId: 'forged' }, 'POST'],
      ['/commands/prepare', { command }, 'POST'],
    ] as const) {
      const response = await request(path, 'phone', body, method, lease);
      expect(response.status, path).toBe(423);
      expect(await response.json()).toMatchObject({ code: 'PROFILE_IN_USE', error: occupied });
    }
    expect(store.profile(pc.userId, profile.id)).toEqual(profile);
    expect(sends).toBe(0);
  });
  it('il titolare salva una modifica mirata e dopo il rilascio il nuovo dispositivo rilegge gli stessi dati', async () => {
    const usage = await use();
    const editing = await (await request(`/profiles/${profile.id}/leases`, 'pc', { editSessionId: 'edit', target: { kind: 'structure' } }, undefined, usage)).json() as { id: string };
    const operation = { operationId: 'save', editSessionId: 'edit', leaseId: editing.id, target: { kind: 'structure' }, expected: { profile: 1 }, changes: [{ path: ['snapshot', 'layout', 'headerTitle'], value: 'Casa condivisa' }] };
    const saved = await request(`/profiles/${profile.id}/operations`, 'pc', operation, undefined, usage);
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ revision: 2, configuration: { snapshot: { layout: { headerTitle: 'Casa condivisa' } } } });
    expect((await request(`/usage/${usage.id}`, 'pc', { usageSessionId: usage.usageSessionId }, 'DELETE')).status).toBe(200);
    await use('phone');
    expect(await (await request(`/profiles/${profile.id}`, 'phone')).json()).toMatchObject({ revision: 2, configuration: { snapshot: { layout: { headerTitle: 'Casa condivisa' } } } });
  });
  it('il titolare può rilasciare l’editing anche dopo aver cancellato il proof d’uso locale', async () => {
    const usage = await use();
    const editing = await (await request(`/profiles/${profile.id}/leases`, 'pc', { editSessionId: 'edit', target: { kind: 'structure' } }, undefined, usage)).json() as { id: string };
    expect((await request(`/leases/${editing.id}`, 'phone', { editSessionId: 'edit' }, 'DELETE')).status).toBe(409);
    expect((await request(`/leases/${editing.id}`, 'pc', { editSessionId: 'edit' }, 'DELETE')).status).toBe(200);
    expect(store.listLeases(pc.userId, profile.id)).toEqual([]);
  });
  it('anche execute ricontrolla il possesso e non invia il comando dal dispositivo bloccato', async () => {
    const lease = await use();
    const prepared = await (await request('/commands/prepare', 'pc', { command }, undefined, lease)).json() as { id: string };
    const denied = await request(`/commands/${prepared.id}/execute`, 'phone', { command }, undefined, lease);
    expect(denied.status).toBe(423); expect(sends).toBe(0);
    expect((await request(`/commands/${prepared.id}/execute`, 'pc', { command }, undefined, lease)).status).toBe(200);
    expect((await request(`/commands/${prepared.id}/execute`, 'pc', { command }, undefined, lease)).status).toBe(200);
    expect(sends).toBe(1);
  });
  it('un intento preparato prima di una nuova concessione non viene eseguito con il nuovo proof', async () => {
    const first = await use();
    const prepared = await (await request('/commands/prepare', 'pc', { command }, undefined, first)).json() as { id: string };
    const next = await use();
    expect(next.id).not.toBe(first.id);
    const response = await request(`/commands/${prepared.id}/execute`, 'pc', { command }, undefined, next);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'PROFILE_USAGE_EXPIRED' });
    expect(sends).toBe(0);
    expect((await request(`/commands/${prepared.id}`, 'pc')).status).toBe(200);
  });
  it('il rilascio API di pagehide riserva tre secondi al reload senza autorizzare il vecchio documento', async () => {
    const first = await use('pc', profile.id, 'old-document');
    const prepared = await (await request('/commands/prepare', 'pc', { command }, undefined, first)).json() as { id: string };
    expect((await request(`/usage/${first.id}`, 'pc', { usageSessionId: first.usageSessionId, handoff: true }, 'DELETE')).status).toBe(200);
    expect((await request(`/profiles/${profile.id}/usage`, 'phone', { usageSessionId: 'phone-document' })).status).toBe(423);
    expect((await request(`/commands/${prepared.id}/execute`, 'pc', { command }, undefined, first)).status).toBe(409);
    const next = await use('pc', profile.id, 'new-document');
    expect(next.id).not.toBe(first.id);
    expect((await request(`/usage/${first.id}`, 'pc', { usageSessionId: first.usageSessionId }, 'DELETE')).status).toBe(200);
    expect(store.requireUsage(store.actor(pc), proof(next)).id).toBe(next.id);
    expect(sends).toBe(0);
  });
  it('il titolare può trasferire l’uso e selezionare il nuovo profilo con il proof del target', async () => {
    const first = await use();
    const copy = store.createProfile(store.actor(pc), { name: 'Copia', configuration });
    const next = await use('pc', copy.id);
    const changed = await request('/clients/pc', 'pc', { activeProfileId: copy.id }, 'PATCH', next);
    expect(changed.status).toBe(200);
    expect(store.client(pc.userId, 'phone')?.activeProfileId).toBe(copy.id);
    expect((await request(`/usage/${first.id}`, 'pc', { usageSessionId: first.usageSessionId }, 'DELETE')).status).toBe(200);
    expect(store.requireUsage(store.actor(pc), proof(next)).id).toBe(next.id);
  });
});
