// @vitest-environment node
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../models/database.ts';
import { ActivityError, createActivityService, type ActivityService } from '../v2/activity.ts';
import { createActivityRouter } from '../v2/activityRoutes.ts';
import { ACTIVITY_DAY_MS as DAY, ACTIVITY_FACET_LIMIT, ACTIVITY_RETENTION_MS, activityAgeDays } from '../../../contracts/activity.ts';
import type { ActivityActor, ActivityInput, ActivityQuery } from '../../../contracts/activity.ts';

const NOW = 1_800_000_000_000;
const actor: ActivityActor = { userId: 'test-user', userName: 'Persona prova', clientId: 'test-client', clientName: 'Client prova', sessionId: 'test-session' };
let database: SqliteDatabase;
let activity: ActivityService;
let time: number;
let server: Server | undefined;
const record = (age: number, extra: Partial<ActivityInput> = {}) => {
  const previous = time; time = NOW - age;
  try { return activity.record({ kind: 'configuration', action: 'profile.saved', outcome: 'accepted', actor, ...extra }); }
  finally { time = previous; }
};
const requestServer = async () => {
  const app = express();
  app.use('/activity', createActivityRouter({ activity, authorize: async (request) => {
    if (request.get('x-test-user') !== 'yes') throw new ActivityError(401, 'AUTH_REQUIRED', 'Accesso necessario.');
    return { actor, accessToken: 'unused-test-value' };
  } }));
  server = await new Promise<Server>((resolve) => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  return (query: string, authorized = true) => fetch(`http://127.0.0.1:${(server!.address() as AddressInfo).port}/activity${query}`, {
    headers: authorized ? { 'x-test-user': 'yes' } : {},
  });
};
beforeEach(() => { database = openDatabase(':memory:'); time = NOW; activity = createActivityService(database, { now: () => time }); });
afterEach(async () => {
  if (server) { server.closeAllConnections(); await new Promise<void>((resolve) => server!.close(() => resolve())); server = undefined; }
  database.close(); vi.restoreAllMocks();
});

describe('giorni mobili e orologio centrale Tavano', () => {
  it('separa esattamente 0–6 giorni a intervalli di 24 ore e cancella a168 ore', () => {
    const ages = [0, DAY - 1, DAY, DAY + 1, 2 * DAY - 1, 2 * DAY, 6 * DAY, 7 * DAY - 1, 7 * DAY];
    ages.forEach((age, revision) => record(age, { revision }));
    expect(activity.list({ ageDays: 0 }).events.map((event) => event.revision)).toEqual([1, 0]);
    expect(activity.list({ ageDays: 1 }).events.map((event) => event.revision)).toEqual([4, 3, 2]);
    expect(activity.list({ ageDays: 2 }).events.map((event) => event.revision)).toEqual([5]);
    expect(activity.list({ ageDays: 6 }).events.map((event) => event.revision)).toEqual([7, 6]);
    expect(database.prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM aca_activity').get()?.n).toBe(8);
    for (const age of ages) expect(activityAgeDays(new Date(NOW - age).toISOString(), NOW)).toBe(age >= ACTIVITY_RETENTION_MS ? null : Math.floor(age / DAY));
    expect(activityAgeDays('invalid', NOW)).toBeNull();
    expect(activityAgeDays(new Date(NOW + 1).toISOString(), NOW)).toBeNull();
  });
  it('usa un solo istante per timestamp registrato, query e metadati della risposta', () => {
    let clock = NOW;
    activity = createActivityService(database, { now: () => clock++ });
    const event = activity.record({ kind: 'configuration', action: 'profile.saved', outcome: 'accepted', actor });
    const stored = database.prepare<[number], { at: number }>('SELECT at FROM aca_activity WHERE id=?').get(event.id)!;
    expect(Date.parse(event.at)).toBe(stored.at);
    const page = activity.list();
    expect(page.asOf).toBe(page.serverNow);
    expect(Date.parse(page.serverNow!)).toBe(clock - 1);
  });
  it('conserva il timestamp JSON storico quando una riga legacy differisce di millisecondi dalla colonna SQL', () => {
    const event = record(DAY);
    database.prepare('UPDATE aca_activity SET at=at+1 WHERE id=?').run(event.id);
    const page = activity.list({ ageDays: 0 });
    expect(page.events[0]?.at).toBe(event.at);
    expect(activityAgeDays(event.at, page.asOf!)).toBe(1);
    expect(activity.exportData({ ageDays: 0, asOf: page.asOf }).events[0]?.at).toBe(event.at);
    expect(database.prepare<[number], { at: number }>('SELECT at FROM aca_activity WHERE id=?').get(event.id)?.at).toBe(NOW - DAY + 1);
  });
  it('mantiene il bucket durante le pagine ma applica sempre la scadenza attuale', () => {
    const oldest = record(DAY - 1000, { revision: 1 });
    const middle = record(DAY - 900, { revision: 2 });
    const newest = record(DAY - 800, { revision: 3 });
    const first = activity.list({ ageDays: 0, limit: 2 });
    expect(first.events.map((event) => event.id)).toEqual([newest.id, middle.id]);
    time += 2000;
    activity.record({ kind: 'configuration', action: 'profile.saved', outcome: 'accepted', actor, revision: 4 });
    const next = activity.list({ ageDays: 0, asOf: first.asOf, before: first.nextCursor!, limit: 2 });
    expect(next.events.map((event) => event.id)).toEqual([oldest.id]);
    expect(activity.list({ ageDays: 0, asOf: first.asOf, limit: 2 }).events.map((event) => event.id)).toEqual([newest.id, middle.id]);
    expect(activity.list({ ageDays: 0 }).events.map((event) => event.revision)).toEqual([4]);
    time = NOW + ACTIVITY_RETENTION_MS;
    expect(activity.list({ ageDays: 0, asOf: first.asOf }).events).toEqual([]);
    expect(activity.exportData({ ageDays: 0, asOf: first.asOf }).events).toEqual([]);
    expect(database.prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM aca_activity').get()?.n).toBe(1);
  });
  it('l’aggiornamento di un intento non azzera l’età e originAt non sostituisce la ricezione', () => {
    const original = record(DAY, { operationId: 'test-operation' });
    activity.record({ kind: 'configuration', action: 'profile.saved', outcome: 'error', actor, operationId: 'test-operation' });
    const updated = activity.list({ ageDays: 1 }).events[0]!;
    expect(updated.id).toBe(original.id); expect(updated.at).toBe(original.at); expect(updated.updatedAt).toBe(new Date(NOW).toISOString());
    expect(activity.list({ ageDays: 0 }).events).toEqual([]);
    activity.recordDiagnostic(actor, { eventId: 'delayed-report', code: 'client.error', occurredAt: new Date(NOW - 10 * DAY).toISOString() });
    expect(activity.list({ ageDays: 0, kind: 'diagnostic' }).events).toHaveLength(1);
  });
  it('interseca giorni con i filtri precedenti senza cambiare ordinamento o date inclusive', () => {
    record(DAY + 1, { kind: 'command', action: 'ha.light.turn_on', profileId: 'profile-a', widgetId: 'widget-a', outcome: 'error' });
    record(DAY, { profileId: 'profile-b' });
    const query: ActivityQuery = { ageDays: 1, kind: 'command', profileId: 'profile-a', widgetId: 'widget-a', userId: actor.userId, clientId: actor.clientId!, outcome: 'error',
      from: new Date(NOW - DAY - 1).toISOString(), to: new Date(NOW - DAY - 1).toISOString() };
    expect(activity.list(query).events).toHaveLength(1);
    expect(activity.list({ from: new Date(NOW - DAY).toISOString(), to: new Date(NOW - DAY).toISOString() }).events).toHaveLength(1);
    expect(activity.list({ ...query, ageDays: 0 }).events).toEqual([]);
  });
  it.each([-1, 7, 1.5, NaN, Infinity, '1', true, null, {}])('rifiuta ageDays non numerico/intero o fuori intervallo: %s', (ageDays) => {
    expect(() => activity.list({ ageDays } as unknown as ActivityQuery)).toThrow(ActivityError);
    expect(() => activity.exportData({ ageDays } as unknown as ActivityQuery)).toThrow(ActivityError);
  });
  it.each(['invalid', '2026-01-01', '2026-01-01T00:00:00Z', new Date(NOW + 1).toISOString()])('rifiuta anchor non canonico o futuro: %s', (asOf) => {
    expect(() => activity.list({ asOf })).toThrow(ActivityError);
  });
  it('esporta lo stesso bucket con pseudonimi e senza faccette o payload sensibili', () => {
    record(DAY, { profileId: 'private-profile', widgetId: 'private-widget', targetId: 'private-target' });
    record(0);
    const first = activity.list({ ageDays: 1 });
    time += 1000;
    const output = activity.exportData({ ageDays: 1, asOf: first.asOf });
    expect(output.events).toHaveLength(1); expect(output.asOf).toBe(first.asOf);
    expect(output.generatedAt).toBe(new Date(time).toISOString());
    expect(output.events[0]?.actor?.sessionId).toBeNull();
    expect(JSON.stringify(output)).not.toMatch(/Persona prova|Client prova|test-user|test-client|test-session|private-profile|private-widget|private-target|facets/);
    expect(output.versions?.ha).toBeNull(); expect(output.versions?.client).toBeNull();
    time = NOW + 6 * DAY;
    expect(activity.exportData({ ageDays: 1, asOf: first.asOf }).events).toEqual([]);
  });
});

describe('faccette storiche del registro', () => {
  it('offre scelte fuori dalla pagina e dai filtri, conservando nomi storici e soli ID di profilo/widget', () => {
    const old = { ...actor, userId: 'older-user', userName: 'Nome storico', clientId: 'older-client', clientName: 'Client storico' };
    record(DAY, { actor: old, profileId: 'profile-hidden-data', widgetId: 'widget-id' });
    record(0, { kind: 'command', action: 'ha.light.turn_on' });
    old.userName = 'Nome cambiato fuori dal registro';
    const page = activity.list({ limit: 1, kind: 'command' });
    expect(page.events).toHaveLength(1);
    expect(page.facets?.users).toContainEqual({ id: 'older-user', label: 'Nome storico' });
    expect(page.facets?.clients).toContainEqual({ id: 'older-client', label: 'Client storico' });
    expect(page.facets?.profiles).toEqual([{ id: 'profile-hidden-data', label: 'profile-hidden-data' }]);
    expect(page.facets?.widgets).toEqual([{ id: 'widget-id', label: 'widget-id' }]);
    expect(page.facets?.truncated).toBe(false);
  });
  it('limita e deduplica le scelte, includendo la selezione valida fuori dal limite', () => {
    for (let index = 0; index <= ACTIVITY_FACET_LIMIT; index++) {
      const id = String(index).padStart(3, '0');
      record(0, { actor: { ...actor, userId: `user-${id}`, clientId: `client-${id}` }, profileId: `profile-${id}`, widgetId: `widget-${id}` });
    }
    const parse = vi.spyOn(JSON, 'parse');
    const page = activity.list({ limit: 1 });
    const firstReads = parse.mock.calls.length;
    expect(page.facets?.users).toHaveLength(ACTIVITY_FACET_LIMIT); expect(page.facets?.truncated).toBe(true);
    const selected = activity.list({ limit: 1, userId: 'user-100', clientId: 'client-100', profileId: 'profile-100', widgetId: 'widget-100' });
    expect(parse.mock.calls.length - firstReads).toBeLessThan(firstReads);
    expect(firstReads).toBeLessThanOrEqual(4 * ACTIVITY_FACET_LIMIT + 1);
    for (const key of ['users', 'clients', 'profiles', 'widgets'] as const) expect(selected.facets?.[key]).toHaveLength(ACTIVITY_FACET_LIMIT + 1);
    expect(selected.facets?.users.at(-1)?.id).toBe('user-100');
    const plan = database.prepare<[], { detail: string }>(`EXPLAIN QUERY PLAN SELECT DISTINCT user_id FROM aca_activity INDEXED BY aca_activity_facet_user_id
      WHERE user_id IS NOT NULL AND at>0 AND at<=${NOW} ORDER BY user_id LIMIT 101`).all();
    expect(plan.some(({ detail }) => detail.includes('COVERING INDEX aca_activity_facet_user_id'))).toBe(true);
  });
  it('invalida cache su eventi, scadenza e rollback senza conservare autori cancellati', () => {
    record(0); expect(activity.list().facets?.users).toHaveLength(1);
    expect(() => database.transaction(() => {
      record(0, { actor: { ...actor, userId: 'rolled-back' } });
      expect(activity.list().facets?.users.some((item) => item.id === 'rolled-back')).toBe(true);
      throw new Error('rollback');
    })()).toThrow('rollback');
    expect(activity.list().facets?.users.map((item) => item.id)).toEqual([actor.userId]);
    time += ACTIVITY_RETENTION_MS;
    expect(activity.list().facets?.users).toEqual([]);
  });
  it('non tiene metadati di eventi futuri e li rende disponibili quando l’ora centrale li raggiunge', () => {
    time = NOW + 1000;
    activity.record({ kind: 'configuration', action: 'profile.saved', outcome: 'accepted', actor });
    time = NOW;
    expect(activity.list().events).toEqual([]); expect(activity.list().facets?.users).toEqual([]);
    time = NOW + 1000;
    expect(activity.list().facets?.users).toHaveLength(1);
  });
  it('rispetta le quote anche con letture/faccette e registra soltanto dati trattenuti', () => {
    activity = createActivityService(database, { now: () => time, quotaBytes: 1500, diagnosticQuotaBytes: 500 });
    for (let index = 0; index < 20; index++) record(0, { actor: { ...actor, userId: `user-${index}` }, kind: index % 2 ? 'diagnostic' : 'configuration' });
    const page = activity.list({ limit: 100 });
    const retained = new Set(page.events.map((event) => event.actor?.userId));
    expect(page.facets?.users.every((item) => retained.has(item.id))).toBe(true);
    const total = database.prepare<[], { bytes: number }>('SELECT SUM(bytes) AS bytes FROM aca_activity').get()?.bytes ?? 0;
    const diagnostics = database.prepare<[], { bytes: number }>("SELECT SUM(bytes) AS bytes FROM aca_activity WHERE kind='diagnostic'").get()?.bytes ?? 0;
    expect(total).toBeLessThanOrEqual(1500); expect(diagnostics).toBeLessThanOrEqual(500);
  });
});

describe('query HTTP dei giorni', () => {
  it('mantiene autenticazione, cursori e il valore zero esplicito', async () => {
    record(0); const request = await requestServer();
    expect((await request('?ageDays=0', false)).status).toBe(401);
    const response = await request('?ageDays=0&limit=1');
    expect(response.status).toBe(200); expect((await response.json()).events).toHaveLength(1);
    expect((await request('?before=0')).status).toBe(400);
    expect((await request('?limit=101')).status).toBe(400);
  });
  it.each(['-1', '7', '1.1', '1.0', '1e0', '00', '0x1', '', 'true', ' ', 'NaN', 'Infinity'])('rifiuta filtro giorni HTTP non canonico: %s', async (value) => {
    const request = await requestServer();
    expect((await request(`?ageDays=${encodeURIComponent(value)}`)).status).toBe(400);
    expect((await request(`/export?ageDays=${encodeURIComponent(value)}`)).status).toBe(400);
  });
  it('rifiuta parametri duplicati o anchor futuri', async () => {
    const request = await requestServer();
    expect((await request('?ageDays=0&ageDays=1')).status).toBe(400);
    expect((await request(`?asOf=${encodeURIComponent(new Date(NOW + 1).toISOString())}`)).status).toBe(400);
  });
  it.each(['ageDays[]=0', 'ageDays[value]=0', 'asOf[]=value', 'asOf[value]=value'])('rifiuta oggetti/array serializzati: %s', async (query) => {
    const request = await requestServer();
    expect((await request(`?${query}`)).status).toBe(400);
  });
});
