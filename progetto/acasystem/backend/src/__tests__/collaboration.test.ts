// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataCrypto } from '../helpers/dataCrypto.ts';
import { openDatabase, type SqliteDatabase } from '../models/database.ts';
import { createCollaborationStore, type V2Actor, type V2Identity } from '../v2/store.ts';
import type { Configuration, EditLease, ProfileChange, ProfileOperation } from '../../../contracts/collaboration.ts';
import { resourcesForChanges, applyChanges } from '../../../contracts/profileResources.ts';

const plain = createDataCrypto({ mode: 'off', key: '', salt: '' });
const a: V2Identity = { userId: 'mario', userName: 'Mario', refreshTokenId: 'refresh-pc', tokenType: 'normal' };
const b: V2Identity = { ...a, refreshTokenId: 'refresh-phone' };
const other: V2Identity = { userId: 'anna', userName: 'Anna', refreshTokenId: 'refresh-anna', tokenType: 'normal' };
const initial = (): Configuration => ({ snapshot: { version: 1, layout: { pagesConfig: { pages: ['home'], home: ['light.a', 'light.b'] }, cardSettings: { 'home::light.a': { title: 'A' }, 'home::light.b': { title: 'B' } }, customNames: {}, customIcons: {}, widgetMemory: { touched: {}, entries: {} } }, appearance: {} }, appearance: {} });
const change = (id: string, value: string): ProfileChange[] => [{ path: ['snapshot', 'layout', 'customNames', id], value }];

describe('profili personali live, riserve e migrazione', () => {
  let db: SqliteDatabase;
  let now: number;
  let failAudit: boolean;
  let events: string[];
  let store: ReturnType<typeof createCollaborationStore>;
  let pc: V2Actor;
  let phone: V2Actor;
  beforeEach(() => {
    db = openDatabase(':memory:'); now = 1_800_000_000_000; failAudit = false; events = [];
    store = createCollaborationStore(db, { crypto: plain, now: () => now, record: event => { if (failAudit) throw new Error('Disco pieno'); events.push(event.action); } });
    store.registerClient(a, { clientId: 'pc', label: 'PC studio', platform: 'windows' });
    store.registerClient(b, { clientId: 'phone', label: 'iPhone', platform: 'web' });
    pc = store.actor(a); phone = store.actor(b);
  });
  afterEach(() => db.close());
  const operation = (who: V2Actor, profileId: string, lease: EditLease, changes: ProfileChange[], op = 'operation-1'): ProfileOperation => {
    const current = store.profile(who.userId, profileId);
    const resources = resourcesForChanges(current.configuration, applyChanges(current.configuration, changes), changes);
    return { operationId: op, editSessionId: lease.editSessionId, leaseId: lease.id, target: lease.resources.includes('profile') ? { kind: 'structure' } : { kind: 'widget', pageId: 'home', widgetId: lease.resources.find(v => v.startsWith('widget:'))!.slice(7) }, expected: Object.fromEntries([...resources, 'profile'].map(key => [key, current.resourceRevisions[key] ?? 0])), changes };
  };
  it('lega client al refresh verificato senza copiare la sessione e conserva nomi indipendenti', () => {
    expect(store.sessionClient(a)?.label).toBe('PC studio'); expect(store.sessionClient(b)?.label).toBe('iPhone');
    expect(store.registerClient(a, { clientId: 'attacker', label: 'Altro' }).id).toBe('pc');
    expect(store.clients(a.userId)).toHaveLength(2);
    expect(store.actor(a).sessionId).not.toBe(a.refreshTokenId);
    expect(() => store.registerClient({ ...other, tokenType: 'long_lived_access_token' }, { clientId: 'x', label: 'X' })).toThrow('Accedi');
  });
  it('isola i profili fra account e condivide la selezione sui client della stessa persona', () => {
    const profile = store.createProfile(pc, { name: 'Casa', configuration: initial() });
    store.updateClient(pc, 'pc', { activeProfileId: profile.id, label: 'PC nuovo' });
    expect(store.client(a.userId, 'phone')?.activeProfileId).toBe(profile.id);
    store.registerClient(other, { clientId: 'anna', label: 'Telefono Anna' });
    expect(() => store.profile(other.userId, profile.id)).toThrow('non è disponibile');
    expect(() => store.updateClient(store.actor(other), 'anna', { activeProfileId: profile.id })).toThrow();
    expect(store.profile(a.userId, profile.id).name).toBe('Casa');
  });
  it('mantiene il protocollo attivato anche eliminando l’ultimo profilo e non tronca nomi lunghi', () => {
    const p = store.createProfile(pc, { name: 'Casa', configuration: initial() });
    expect(store.migrated(a.userId)).toBe(true);
    store.deleteProfile(pc, p.id);
    expect(store.profiles(a.userId)).toEqual([]);
    expect(store.migrated(a.userId)).toBe(true);
    expect(() => store.updateClient(pc, pc.clientId, { label: 'X'.repeat(81) })).toThrow('massimo');
  });
  it('consente modifiche indipendenti preservando entrambi i widget anche su basi globali diverse', () => {
    const p = store.createProfile(pc, { name: 'Casa', configuration: initial() });
    const la = store.acquire(pc, p.id, 'edit-pc', { kind: 'widget', pageId: 'home', widgetId: 'light.a' });
    const lb = store.acquire(phone, p.id, 'edit-phone', { kind: 'widget', pageId: 'home', widgetId: 'light.b' });
    const oa = operation(pc, p.id, la, change('light.a', 'Salotto'), 'save-a');
    const ob = operation(phone, p.id, lb, change('light.b', 'Cucina'), 'save-b');
    store.commit(pc, p.id, oa); const saved = store.commit(phone, p.id, ob);
    expect((saved.configuration.snapshot as { layout: { customNames: unknown } }).layout.customNames).toEqual({ 'light.a': 'Salotto', 'light.b': 'Cucina' });
    expect(saved.revision).toBe(3);
  });
  it('esclude due editor dello stesso widget e una riserva strutturale durante editing', () => {
    const p = store.createProfile(pc, { name: 'Casa', configuration: initial() });
    store.acquire(pc, p.id, 'tab-one', { kind: 'widget', pageId: 'home', widgetId: 'light.a' });
    expect(() => store.acquire(pc, p.id, 'tab-two', { kind: 'widget', pageId: 'home', widgetId: 'light.a' })).toThrow();
    expect(() => store.acquire(phone, p.id, 'phone-edit', { kind: 'structure' })).toThrow();
    expect(store.listLeases(a.userId, p.id)[0]).toMatchObject({ clientName: 'PC studio', userName: 'Mario' });
  });
  it('rifiuta il vecchio titolare dopo scadenza e dopo riavvio della centrale', () => {
    const p = store.createProfile(pc, { name: 'Casa', configuration: initial() });
    const lease = store.acquire(pc, p.id, 'edit-pc', { kind: 'widget', pageId: 'home', widgetId: 'light.a' });
    const op = operation(pc, p.id, lease, change('light.a', 'Vecchio'));
    now += 45_001;
    store.acquire(phone, p.id, 'edit-phone', { kind: 'widget', pageId: 'home', widgetId: 'light.a' });
    expect(() => store.commit(pc, p.id, op)).toThrow('scaduto');
    expect(() => store.renew(pc, lease.id, lease.editSessionId)).toThrow('scaduto');
    const restarted = createCollaborationStore(db, { crypto: plain, now: () => now });
    expect(restarted.listLeases(a.userId, p.id)).toEqual([]);
    expect(() => restarted.commit(pc, p.id, op)).toThrow('scaduto');
  });
  it('rifiuta un salvataggio con revisione superata e rende disponibile il profilo corrente', () => {
    const p = store.createProfile(pc, { name: 'Casa', configuration: initial() });
    const lease = store.acquire(pc, p.id, 'edit', { kind: 'widget', pageId: 'home', widgetId: 'light.a' });
    const old = operation(pc, p.id, lease, change('light.a', 'Vecchio'), 'old');
    store.commit(pc, p.id, operation(pc, p.id, lease, change('light.a', 'Nuovo'), 'new'));
    expect(() => store.commit(pc, p.id, old)).toThrow('bozza');
    expect(store.profile(pc.userId, p.id).revision).toBe(2);
  });
  it('ripete una risposta persa senza salvare o registrare due volte', () => {
    const p = store.createProfile(pc, { name: 'Casa', configuration: initial() });
    const lease = store.acquire(pc, p.id, 'edit', { kind: 'widget', pageId: 'home', widgetId: 'light.a' });
    const op = operation(pc, p.id, lease, change('light.a', 'Titolo'));
    const first = store.commit(pc, p.id, op); now += 60_000;
    expect(store.commit(pc, p.id, op)).toEqual(first);
    const reacquired = store.acquire(pc, p.id, 'another-edit-session', { kind: 'widget', pageId: 'home', widgetId: 'light.a' });
    expect(store.commit(pc, p.id, { ...op, leaseId: reacquired.id, editSessionId: reacquired.editSessionId })).toEqual(first);
    expect(events.filter(v => v === 'profile.saved')).toHaveLength(1);
    expect(() => store.commit(pc, p.id, { ...op, changes: change('light.a', 'Altro') })).toThrow('già stato utilizzato');
  });
  it('annulla la scrittura se il registro della modifica confermata non è salvabile', () => {
    const p = store.createProfile(pc, { name: 'Casa', configuration: initial() });
    const lease = store.acquire(pc, p.id, 'edit', { kind: 'widget', pageId: 'home', widgetId: 'light.a' });
    failAudit = true;
    expect(() => store.commit(pc, p.id, operation(pc, p.id, lease, change('light.a', 'Non salvato')))).toThrow('Disco pieno');
    expect(store.profile(pc.userId, p.id)).toEqual(p);
    expect(db.prepare('SELECT 1 FROM aca_v2_operations').all()).toHaveLength(0);
  });
  it('non ricrea un widget cancellato e non permette patch al prototipo', () => {
    const p = store.createProfile(pc, { name: 'Casa', configuration: initial() });
    const lease = store.acquire(pc, p.id, 'structure', { kind: 'structure' });
    store.commit(pc, p.id, operation(pc, p.id, lease, [{ path: ['snapshot', 'layout', 'pagesConfig', 'home'], value: ['light.b'] }]));
    store.release(pc, lease.id, 'structure');
    expect(() => store.acquire(pc, p.id, 'widget', { kind: 'widget', pageId: 'home', widgetId: 'light.a' })).toThrow('non è più presente');
    const next = store.acquire(pc, p.id, 'structure-2', { kind: 'structure' });
    const invalid = { ...operation(pc, p.id, next, change('light.b', 'Sicuro')), changes: [{ path: ['snapshot', '__proto__', 'x'], value: true }] };
    expect(() => store.commit(pc, p.id, invalid)).toThrow();
    expect(({} as { x?: boolean }).x).toBeUndefined();
  });
  it('preserva sorgenti divergenti e ID storici con migrazione idempotente', () => {
    const legacy = { version: 1, layout: { pagesConfig: { pages: ['home'], home: ['light.old'] } } };
    db.prepare('INSERT INTO profiles(id,ha_user_id,name,device_label,data) VALUES(?,?,?,?,?)').run('old-profile', a.userId, 'Vecchio', 'Tablet', JSON.stringify(legacy));
    db.prepare('INSERT INTO current_settings(ha_user_id,device_id,data,revision) VALUES(?,?,?,1)').run(a.userId, 'legacy-phone', JSON.stringify({ ...legacy, device: { casa3dQuality: 'low' } }));
    const sources = store.sources(a.userId); expect(sources).toHaveLength(2);
    const source = sources.find(v => v.profileId === 'old-profile')!;
    const migrated = store.createProfile(pc, { name: source.name, configuration: source.configuration, sourceId: source.id, sourceClass: 'tablet' });
    expect(migrated.id).toBe('old-profile');
    expect(store.createProfile(phone, { name: 'Diverso', configuration: initial(), sourceId: source.id }).id).toBe('old-profile');
    expect(store.profiles(a.userId)).toHaveLength(1);
    expect(store.sources(a.userId)).toHaveLength(2);
    expect(db.prepare('SELECT data FROM profiles WHERE id=?').get('old-profile')).toEqual({ data: JSON.stringify(legacy) });
  });
  it('revoca un accesso senza eliminare profili o revocare il PC e impedisce nuova registrazione al vecchio token', () => {
    const p = store.createProfile(pc, { name: 'Casa', configuration: initial() });
    store.acquire(phone, p.id, 'phone-editor', { kind: 'widget', pageId: 'home', widgetId: 'light.a' });
    store.noteAccessToken(b, 'phone-access-token');
    store.noteAccessToken(a, 'pc-access-token');
    store.markRevoked(pc, 'phone');
    expect(() => store.assertAccessTokenActive('phone-access-token')).toThrow('revocato');
    expect(() => store.assertAccessTokenActive('pc-access-token')).not.toThrow();
    expect(db.prepare('SELECT token_hash FROM aca_v2_access_tokens').all().every(row => !JSON.stringify(row).includes('access-token'))).toBe(true);
    expect(() => store.actor(b)).toThrow('revocato');
    expect(() => store.registerClient(b, { clientId: 'new', label: 'Nuovo' })).toThrow('revocato');
    expect(store.actor(a).clientId).toBe('pc'); expect(store.profile(a.userId, p.id).id).toBe(p.id);
    expect(store.listLeases(a.userId, p.id)).toHaveLength(0);
    expect(store.client(a.userId, 'phone')?.revocationPending).toBe(true);
  });
  it('conserva anche una versione legacy cambiata dopo la prima anteprima della migrazione', () => {
    const legacy = { version: 1, layout: { pagesConfig: { pages: ['home'], home: ['light.old'] } } };
    db.prepare('INSERT INTO profiles(id,ha_user_id,name,data) VALUES(?,?,?,?)').run('original', a.userId, 'Originale', JSON.stringify(legacy));
    const first = store.sources(a.userId)[0]!;
    db.prepare('UPDATE profiles SET data=? WHERE id=?').run(JSON.stringify({ ...legacy, layout: { ...legacy.layout, customNames: { 'light.old': 'Aggiornato altrove' } } }), 'original');
    const all = store.sources(a.userId); expect(all).toHaveLength(2);
    const next = all.find(v => v.id !== first.id)!;
    expect(next.name).toContain('versione 2');
    expect(store.createProfile(pc, { name: first.name, configuration: first.configuration, sourceId: first.id }).id).toBe('original');
    expect(store.createProfile(pc, { name: next.name, configuration: next.configuration, sourceId: next.id }).id).not.toBe('original');
    expect(store.sources(a.userId)).toHaveLength(2);
  });
  it('rispetta enc_only per configurazione, fonti e risposta idempotente', () => {
    const encrypted = createCollaborationStore(db, { crypto: createDataCrypto({ mode: 'enc_only', key: 'ab'.repeat(32), salt: '' }) });
    const p = encrypted.createProfile(pc, { name: 'Cifrato', configuration: initial() });
    const row = db.prepare('SELECT data,data_enc FROM aca_v2_profiles WHERE id=?').get(p.id) as { data: string; data_enc: string };
    expect(row.data).not.toContain('light.a'); expect(row.data_enc).toBeTruthy();
    expect(encrypted.profile(a.userId, p.id).configuration).toEqual(initial());
  });
});
