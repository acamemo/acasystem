// @vitest-environment node
import express from 'express';
import type { Server } from 'node:http';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { ActivityError, createActivityService } from '../v2/activity.ts';
import type { ActivityService, AuthorizeActivity } from '../v2/activity.ts';
import { createActivityRouter } from '../v2/activityRoutes.ts';
import { createCommandsRouter } from '../v2/commands.ts';
import type { ActivityActor, CommandIntent, HaUserCommand } from '../../../contracts/activity.ts';
import { ACTIVITY_RETENTION_MS } from '../../../contracts/activity.ts';

let database: SqliteDatabase;
let activity: ActivityService;
let server: Server;
let base: string;
let time: number;
let actor: ActivityActor;
let execute: ReturnType<typeof vi.fn<(token: string, command: HaUserCommand) => Promise<unknown>>>;
const user: ActivityActor = { userId: 'user-a', userName: 'Mario Rossi', clientId: 'phone-a', clientName: 'Telefono Mario', sessionId: 'session-a', userColor: '#2563eb' };
const authorize: AuthorizeActivity = async (req) => {
  if (req.get('authorization') !== 'Bearer user-token') throw new ActivityError(401, 'AUTH_REQUIRED', 'Accesso necessario.');
  return { actor, accessToken: 'user-token' };
};
const start = async (useDefaultTransport = false) => {
  const app = express(); app.use(express.json());
  app.use('/activity', createActivityRouter({ activity, authorize }));
  const commands = createCommandsRouter({ database, activity, authorize, now: () => time,
    ...(useDefaultTransport ? {} : { execute }) });
  app.use('/commands', commands);
  server = await new Promise<Server>((resolve) => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return commands;
};
const request = (path: string, body?: unknown, token = 'user-token') => fetch(`${base}${path}`, {
  method: body === undefined ? 'GET' : 'POST',
  headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const command: HaUserCommand = { kind: 'service', domain: 'light', service: 'turn_on', data: { entity_id: 'light.cucina' } };
const prepare = async (value: HaUserCommand = command): Promise<CommandIntent> => {
  const res = await request('/commands/prepare', { command: value }); expect(res.status).toBe(201); return res.json();
};
beforeEach(() => {
  database = openDatabase(':memory:'); time = 1_800_000_000_000; actor = { ...user };
  activity = createActivityService(database, { now: () => time }); execute = vi.fn(async () => null);
});
afterEach(async () => {
  if (server) { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  database.close(); vi.unstubAllEnvs();
});

describe('Tavano centrale', () => {
  it('partecipa alla transazione del salvataggio e pubblica solo dopo richiesta esplicita', () => {
    const listener = vi.fn(); activity.subscribe(listener);
    expect(() => database.transaction(() => {
      activity.record({ kind: 'configuration', actor, action: 'profile.save', outcome: 'accepted' }); throw new Error('rollback');
    })()).toThrow('rollback');
    expect(activity.list().events).toEqual([]); expect(listener).not.toHaveBeenCalled();
    activity.record({ kind: 'configuration', actor, action: 'profile.save', outcome: 'accepted' });
    expect(listener).not.toHaveBeenCalled(); activity.publish(); expect(listener).toHaveBeenCalledOnce();
  });
  it('pagina per cursore senza spostare le righe quando arrivano nuove attività', () => {
    for (let i = 0; i < 4; i += 1) activity.record({ kind: 'configuration', actor, action: 'profile.save', outcome: 'accepted', revision: i });
    const first = activity.list({ limit: 2 });
    activity.record({ kind: 'command', actor, action: 'ha.light.turn_on', outcome: 'accepted' });
    const next = activity.list({ limit: 2, before: first.nextCursor! });
    expect(first.events.map((event) => event.revision)).toEqual([3, 2]);
    expect(next.events.map((event) => event.revision)).toEqual([1, 0]);
    expect(activity.list({ kind: 'command' }).events).toHaveLength(1);
    expect(() => activity.list({ before: 0 })).toThrow();
  });
  it('un ID operazione riutilizzato da un’altra persona o profilo non riscrive la cronologia altrui', () => {
    const input = { kind: 'configuration' as const, actor, action: 'profile.saved', outcome: 'accepted' as const,
      profileId: 'profile-a', operationId: 'same-client-generated-id' };
    activity.record(input);
    activity.record({ ...input, actor: { ...actor, userId: 'user-b' } });
    activity.record({ ...input, profileId: 'profile-b' });
    expect(activity.list().events).toHaveLength(3);
    expect(activity.list({ userId: 'user-b' }).events).toHaveLength(1);
    expect(activity.list({ profileId: 'profile-a' }).events).toHaveLength(2);
  });
  it('scade dopo sette giorni anche senza altri inserimenti e applica le quote', () => {
    activity.record({ kind: 'configuration', actor, action: 'profile.save', outcome: 'accepted' });
    time += ACTIVITY_RETENTION_MS + 1;
    expect(activity.list().events).toEqual([]); activity.prune();
    expect(database.prepare('SELECT COUNT(*) AS count FROM aca_activity').get()).toEqual({ count: 0 });
    const small = createActivityService(database, { now: () => time, quotaBytes: 1500, diagnosticQuotaBytes: 500 });
    for (let i = 0; i < 20; i += 1) small.record({ kind: i % 2 ? 'diagnostic' : 'configuration', actor, action: 'client.error', outcome: 'error', revision: i });
    const sizes = database.prepare<[], { kind: string; bytes: number }>('SELECT kind,SUM(bytes) AS bytes FROM aca_activity GROUP BY kind').all();
    expect(sizes.reduce((sum, row) => sum + row.bytes, 0)).toBeLessThanOrEqual(1500);
    expect(sizes.find((row) => row.kind === 'diagnostic')?.bytes ?? 0).toBeLessThanOrEqual(500);
  });
  it('legge il diario domestico dopo autenticazione e depura export e diagnostica duplicata', async () => {
    await start();
    expect((await request('/activity', undefined, 'wrong')).status).toBe(401);
    activity.record({ kind: 'configuration', actor, action: 'profile.save', outcome: 'accepted', profileId: 'private-profile', code: 'token with spaces' });
    actor = { ...user, userId: 'user-b', clientId: 'phone-b' };
    expect((await (await request('/activity')).json()).events).toHaveLength(1);
    const diagnostic = { eventId: 'diagnostic-1', code: 'client.error', occurredAt: new Date(time - 1000).toISOString(), password: 'NEVER_STORE_THIS' };
    expect(await (await request('/activity/diagnostics', { events: [diagnostic] })).json()).toEqual({ accepted: 1 });
    expect(await (await request('/activity/diagnostics', { events: [diagnostic] })).json()).toEqual({ accepted: 0 });
    expect((await request('/activity/diagnostics', { events: [{ ...diagnostic, code: 'secret-password' }] })).status).toBe(400);
    const output = JSON.stringify(await (await request('/activity/export')).json());
    expect(output).not.toMatch(/Mario|Telefono|session-a|private-profile|NEVER_STORE_THIS|token with spaces/);
    expect(output).toContain('utente_'); expect(output).toContain('CLIENT_REPORTED');
  });
});

describe('comandi online monouso', () => {
  it('non invia durante prepare, non conserva il PIN e inoltra il token utente una sola volta', async () => {
    await start();
    const value: HaUserCommand = { kind: 'service', domain: 'alarm_control_panel', service: 'alarm_disarm', data: { entity_id: 'alarm_control_panel.casa', code: 'PIN_SUPER_SEGRETO' } };
    const intent = await prepare(value); expect(execute).not.toHaveBeenCalled();
    expect(JSON.stringify(database.prepare('SELECT * FROM aca_command_intents').all())).not.toContain('PIN_SUPER_SEGRETO');
    expect((await (await request(`/commands/${intent.id}/execute`, { command: value })).json()).state).toBe('accepted');
    expect((await (await request(`/commands/${intent.id}/execute`, { command: value })).json()).state).toBe('accepted');
    expect(execute).toHaveBeenCalledExactlyOnceWith('user-token', value);
    expect(activity.list().events).toHaveLength(1);
    expect(activity.list().events[0]?.outcome).toBe('accepted');
    expect(JSON.stringify(activity.exportData())).not.toContain('PIN_SUPER_SEGRETO');
  });
  it('riserva pending atomicamente anche con execute concorrenti', async () => {
    let finish!: () => void;
    execute.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    await start(); const intent = await prepare();
    const first = request(`/commands/${intent.id}/execute`, { command });
    await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
    const second = await request(`/commands/${intent.id}/execute`, { command });
    expect((await second.json()).state).toBe('pending');
    finish(); expect((await (await first).json()).state).toBe('accepted'); expect(execute).toHaveBeenCalledOnce();
  });
  it('rifiuta intent scaduti, eliminati, di altra sessione e contenuti diversi', async () => {
    await start(); const intent = await prepare();
    expect((await request(`/commands/${intent.id}/execute`, { command: { ...command, service: 'turn_off' } })).status).toBe(409);
    actor = { ...user, sessionId: 'other-session' };
    expect((await request(`/commands/${intent.id}`)).status).toBe(410);
    actor = { ...user }; time += 60_001;
    expect((await (await request(`/commands/${intent.id}/execute`, { command })).json()).code).toBe('INTENT_EXPIRED');
    database.prepare('DELETE FROM aca_command_intents WHERE id=?').run(intent.id);
    expect((await request(`/commands/${intent.id}/execute`, { command })).status).toBe(410);
    expect(execute).not.toHaveBeenCalled();
  });
  it('mantiene unknown dopo risposta persa e dopo riavvio senza rieseguire', async () => {
    execute.mockRejectedValue(new Error('connection lost after sending'));
    await start(); const intent = await prepare();
    expect((await (await request(`/commands/${intent.id}/execute`, { command })).json()).state).toBe('unknown');
    expect((await (await request(`/commands/${intent.id}/execute`, { command })).json()).state).toBe('unknown');
    const pending = await prepare();
    database.prepare("UPDATE aca_command_intents SET state='pending' WHERE id=?").run(pending.id);
    createCommandsRouter({ database, activity, authorize, execute, now: () => time });
    expect((await (await request(`/commands/${pending.id}`)).json()).state).toBe('unknown');
    expect(execute).toHaveBeenCalledOnce();
  });
  it('dopo 24 ore rifiuta il ledger e la manutenzione lo elimina senza riabilitare l’ID', async () => {
    const commands = await start(); const intent = await prepare();
    await request(`/commands/${intent.id}/execute`, { command });
    time += 24 * 60 * 60 * 1000 + 1;
    expect((await request(`/commands/${intent.id}`)).status).toBe(410);
    commands.prune();
    expect(database.prepare('SELECT COUNT(*) AS count FROM aca_command_intents').get()).toEqual({ count: 0 });
    expect((await request(`/commands/${intent.id}/execute`, { command })).status).toBe(410);
    expect(execute).toHaveBeenCalledOnce();
  });
  it('il trasporto reale usa solo il token dell’utente e conserva i divieti HA', async () => {
    const ha = createServer(); const sockets = new WebSocketServer({ server: ha });
    const tokens: string[] = []; const commands: unknown[] = [];
    sockets.on('connection', (socket) => {
      socket.send(JSON.stringify({ type: 'auth_required', ha_version: '2026.10.4' }));
      socket.on('message', (data) => {
        const message = JSON.parse(data.toString()) as Record<string, unknown>;
        if (message.type === 'auth') { tokens.push(String(message.access_token)); socket.send(JSON.stringify({ type: 'auth_ok', ha_version: '2026.10.4' })); }
        else { commands.push(message); socket.send(JSON.stringify({ id: message.id, type: 'result', success: false, error: { code: 'unauthorized', message: 'forbidden' } })); }
      });
    });
    await new Promise<void>((resolve) => ha.listen(0, '127.0.0.1', resolve));
    vi.stubEnv('TUNET_INTERNAL_HA_URL', `http://127.0.0.1:${(ha.address() as AddressInfo).port}`); vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', '');
    try {
      await start(true); const intent = await prepare();
      const response = await (await request(`/commands/${intent.id}/execute`, { command })).json();
      expect(response.state).toBe('error'); expect(response.code).toBe('HA_REJECTED');
      expect(tokens).toEqual(['user-token']); expect(commands).toEqual([expect.objectContaining({ type: 'call_service', domain: 'light' })]);
    } finally {
      for (const socket of sockets.clients) socket.terminate();
      await new Promise<void>((resolve) => sockets.close(() => resolve())); await new Promise<void>((resolve) => ha.close(() => resolve()));
    }
  });
});
