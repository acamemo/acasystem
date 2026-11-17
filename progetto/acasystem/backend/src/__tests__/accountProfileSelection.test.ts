// @vitest-environment node
import express from 'express';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataCrypto } from '../helpers/dataCrypto.ts';
import { openDatabase, type SqliteDatabase } from '../models/database.ts';
import { createCollaborationStore, type V2Identity } from '../v2/store.ts';
import { createCollaborationAuth } from '../v2/auth.ts';
import { createCollaborationRouter } from '../v2/router.ts';
import type { DeviceModule } from '../services/devices/index.ts';
import type { CollaborationBootstrap } from '../../../contracts/collaboration.ts';

const pc: V2Identity = { userId: 'person', userName: 'Persona', refreshTokenId: 'pc-session', tokenType: 'normal' };
const phone: V2Identity = { ...pc, refreshTokenId: 'phone-session' };
const tablet: V2Identity = { ...pc, refreshTokenId: 'tablet-session' };
const other: V2Identity = { userId: 'other', userName: 'Altra persona', refreshTokenId: 'other-session', tokenType: 'normal' };
const plain = createDataCrypto({ mode: 'off', key: '', salt: '' });
const configuration = (label: string) => ({ snapshot: { layout: { customNames: { sample: label } } } });

describe('interfaccia condivisa dell’account senza copie al collegamento', () => {
  let db: SqliteDatabase;
  let store: ReturnType<typeof createCollaborationStore>;
  let failAudit: boolean;
  beforeEach(() => {
    db = openDatabase(':memory:');
    failAudit = false;
    store = createCollaborationStore(db, { crypto: plain, record: () => { if (failAudit) throw new Error('Registro non disponibile'); } });
    store.registerClient(pc, { clientId: 'pc', label: 'PC', platform: 'windows' });
    store.registerClient(phone, { clientId: 'phone', label: 'Telefono', platform: 'web' });
  });
  afterEach(() => db.close());
  const create = (label: string) => store.createProfile(store.actor(pc), { name: label, configuration: configuration(label) });
  const legacySelection = (id: string, profileId: string | null) => db.prepare('UPDATE aca_v2_clients SET active_profile_id=? WHERE user_id=? AND id=?').run(profileId, pc.userId, id);

  it('riapre l’unico profilo senza crearne copie e ripete la migrazione senza altre scritture', () => {
    const saved = create('Casa');
    expect(store.accountSelection(pc.userId)).toEqual({ activeProfileId: saved.id, selectionRequired: false });
    expect(store.client(pc.userId, 'pc')?.activeProfileId).toBe(saved.id);
    expect(store.client(pc.userId, 'phone')?.activeProfileId).toBe(saved.id);
    const changes = db.prepare('SELECT total_changes() AS n').get();
    expect(store.accountSelection(pc.userId)).toEqual({ activeProfileId: saved.id, selectionRequired: false });
    expect(db.prepare('SELECT total_changes() AS n').get()).toEqual(changes);
    expect(store.profiles(pc.userId)).toEqual([saved]);
  });
  it('conserva la scelta concorde anche con una copia più recente', () => {
    const active = create('Casa');
    const copy = create('Copia');
    legacySelection('pc', active.id);
    legacySelection('phone', active.id);
    expect(store.accountSelection(pc.userId).activeProfileId).toBe(active.id);
    expect(store.profile(pc.userId, copy.id).configuration).toEqual(configuration('Copia'));
    expect(store.profiles(pc.userId)).toHaveLength(2);
  });
  it('non sceglie arbitrariamente fra configurazioni precedenti divergenti', () => {
    const first = create('Prima');
    const second = create('Seconda');
    legacySelection('pc', first.id);
    legacySelection('phone', second.id);
    expect(store.accountSelection(pc.userId)).toEqual({ activeProfileId: null, selectionRequired: true });
    expect(store.accountSelection(pc.userId)).toEqual({ activeProfileId: null, selectionRequired: true });
    expect(store.client(pc.userId, 'pc')?.activeProfileId).toBe(first.id);
    expect(store.client(pc.userId, 'phone')?.activeProfileId).toBe(second.id);
    expect(store.profile(pc.userId, first.id).configuration).toEqual(configuration('Prima'));
    expect(store.profile(pc.userId, second.id).configuration).toEqual(configuration('Seconda'));
  });
  it('la scelta esplicita allinea i client e viene ereditata da un nuovo accesso dopo riavvio', () => {
    const first = create('Prima');
    const second = create('Seconda');
    legacySelection('pc', first.id);
    legacySelection('phone', second.id);
    store.accountSelection(pc.userId);
    const notifications: string[] = [];
    const stop = store.subscribe(pc.userId, 'phone', event => notifications.push(event.type));
    store.updateClient(store.actor(pc), 'pc', { activeProfileId: second.id });
    stop();
    expect(notifications).toContain('client');
    expect(store.client(pc.userId, 'pc')?.activeProfileId).toBe(second.id);
    expect(store.client(pc.userId, 'phone')?.activeProfileId).toBe(second.id);
    store = createCollaborationStore(db, { crypto: plain });
    const connected = store.registerClient(tablet, { clientId: 'tablet', label: 'Tablet' });
    expect(connected.activeProfileId).toBe(second.id);
    expect(store.accountSelection(pc.userId)).toEqual({ activeProfileId: second.id, selectionRequired: false });
    expect(store.sessionClient(pc)?.id).toBe('pc');
    expect(store.sessionClient(phone)?.id).toBe('phone');
    expect(store.sessionClient(tablet)?.id).toBe('tablet');
    expect(store.profiles(pc.userId)).toHaveLength(2);
  });
  it('ignora i client revocati nella scelta iniziale senza riattivarli', () => {
    const first = create('Prima');
    const second = create('Seconda');
    legacySelection('pc', first.id);
    legacySelection('phone', second.id);
    store.markRevoked(store.actor(pc), 'phone');
    expect(store.accountSelection(pc.userId).activeProfileId).toBe(first.id);
    expect(store.client(pc.userId, 'phone')?.activeProfileId).toBe(second.id);
    expect(() => store.sessionClient(phone)).toThrow('revocato');
  });
  it('mantiene il primo ingresso senza profili e richiede scelta se esistono più copie senza selezione', () => {
    expect(store.accountSelection(pc.userId)).toEqual({ activeProfileId: null, selectionRequired: false });
    create('Prima');
    create('Seconda');
    expect(store.accountSelection(pc.userId)).toEqual({ activeProfileId: null, selectionRequired: true });
    expect(store.client(pc.userId, 'pc')?.activeProfileId).toBeNull();
  });
  it('isola la selezione fra account e rifiuta il profilo di un’altra persona', () => {
    const saved = create('Casa');
    store.registerClient(other, { clientId: 'other', label: 'Altro' });
    expect(store.accountSelection(other.userId)).toEqual({ activeProfileId: null, selectionRequired: false });
    expect(() => store.updateClient(store.actor(other), 'other', { activeProfileId: saved.id })).toThrow('non è disponibile');
    store.updateClient(store.actor(pc), 'pc', { activeProfileId: saved.id });
    expect(store.client(other.userId, 'other')?.activeProfileId).toBeNull();
  });
  it('non modifica la scelta condivisa cambiando soltanto il nome interno di un client', () => {
    const saved = create('Casa');
    store.accountSelection(pc.userId);
    store.updateClient(store.actor(pc), 'pc', { label: 'PC studio' });
    expect(store.accountSelection(pc.userId).activeProfileId).toBe(saved.id);
    expect(store.client(pc.userId, 'phone')?.label).toBe('Telefono');
    expect(store.client(pc.userId, 'phone')?.activeProfileId).toBe(saved.id);
  });
  it('una selezione fallita nel registro ripristina anche scelta account e client', () => {
    const first = create('Prima');
    const second = create('Seconda');
    legacySelection('pc', first.id);
    legacySelection('phone', first.id);
    store.accountSelection(pc.userId);
    failAudit = true;
    expect(() => store.updateClient(store.actor(pc), 'pc', { activeProfileId: second.id })).toThrow('Registro');
    expect(store.accountSelection(pc.userId).activeProfileId).toBe(first.id);
    expect(store.client(pc.userId, 'pc')?.activeProfileId).toBe(first.id);
    expect(store.client(pc.userId, 'phone')?.activeProfileId).toBe(first.id);
  });
  it('eliminare il profilo attivo richiede una nuova scelta senza attivare una copia arbitraria', () => {
    const first = create('Prima');
    const second = create('Seconda');
    store.updateClient(store.actor(pc), 'pc', { activeProfileId: first.id });
    store.deleteProfile(store.actor(pc), first.id);
    expect(store.accountSelection(pc.userId)).toEqual({ activeProfileId: null, selectionRequired: true });
    expect(store.client(pc.userId, 'phone')?.activeProfileId).toBeNull();
    expect(store.profile(pc.userId, second.id).configuration).toEqual(configuration('Seconda'));
    store.deleteProfile(store.actor(pc), second.id);
    expect(store.accountSelection(pc.userId)).toEqual({ activeProfileId: null, selectionRequired: false });
    const next = create('Nuova');
    expect(store.accountSelection(pc.userId).activeProfileId).toBe(next.id);
  });
});

describe('bootstrap della selezione condivisa', () => {
  let db: SqliteDatabase;
  let store: ReturnType<typeof createCollaborationStore>;
  let server: Server;
  let base: string;
  beforeEach(async () => {
    db = openDatabase(':memory:');
    store = createCollaborationStore(db, { crypto: plain });
    store.registerClient(pc, { clientId: 'pc', label: 'PC' });
    store.registerClient(phone, { clientId: 'phone', label: 'Telefono' });
    const devices = { keeper: { offerAdmin: () => undefined } } as unknown as DeviceModule;
    const auth = createCollaborationAuth(store, devices, async token => ({ user: { id: pc.userId, name: pc.userName, isAdmin: false, isOwner: false }, refreshTokenId: token === 'phone' ? phone.refreshTokenId : pc.refreshTokenId, tokenType: 'normal' }));
    const app = express();
    app.use(express.json());
    app.use('/api/v2', createCollaborationRouter(store, auth, devices));
    server = await new Promise<Server>(resolve => { const opened = app.listen(0, '127.0.0.1', () => resolve(opened)); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Porta mancante');
    base = `http://127.0.0.1:${address.port}/api/v2`;
  });
  afterEach(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); });
  const bootstrap = async (token: string) => {
    const response = await fetch(`${base}/bootstrap`, { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status).toBe(200);
    return response.json() as Promise<CollaborationBootstrap>;
  };
  it('espone sul nuovo accesso lo stesso profilo del PC senza chiedere una copia', async () => {
    const saved = store.createProfile(store.actor(pc), { name: 'Casa', configuration: configuration('Casa') });
    const value = await bootstrap('phone');
    expect(value.accountProfileId).toBe(saved.id);
    expect(value.profileSelectionRequired).toBe(false);
    expect(value.client?.activeProfileId).toBe(saved.id);
    expect(value.profiles).toHaveLength(1);
  });
  it('le divergenze restano recuperabili finché una scelta esplicita non allinea entrambi gli accessi', async () => {
    const first = store.createProfile(store.actor(pc), { name: 'Prima', configuration: configuration('Prima') });
    const second = store.createProfile(store.actor(pc), { name: 'Seconda', configuration: configuration('Seconda') });
    db.prepare('UPDATE aca_v2_clients SET active_profile_id=? WHERE id=?').run(first.id, 'pc');
    db.prepare('UPDATE aca_v2_clients SET active_profile_id=? WHERE id=?').run(second.id, 'phone');
    expect(await bootstrap('phone')).toMatchObject({ accountProfileId: null, profileSelectionRequired: true, client: { activeProfileId: null } });
    expect(store.client(pc.userId, 'phone')?.activeProfileId).toBe(second.id);
    const usage = store.acquireUsage(store.actor(phone), first.id, 'phone-tab');
    const response = await fetch(`${base}/clients/phone`, { method: 'PATCH', headers: { Authorization: 'Bearer phone', 'Content-Type': 'application/json', 'x-aca-usage-lease': usage.id, 'x-aca-usage-session': usage.usageSessionId }, body: JSON.stringify({ activeProfileId: first.id }) });
    expect(response.status).toBe(200);
    expect(await bootstrap('pc')).toMatchObject({ accountProfileId: first.id, profileSelectionRequired: false, client: { activeProfileId: first.id } });
    expect(store.profile(pc.userId, second.id).configuration).toEqual(configuration('Seconda'));
  });
});
