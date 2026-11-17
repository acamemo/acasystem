// @vitest-environment node
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../server.ts';
import { openDatabase, type SqliteDatabase } from '../models/database.ts';
import { createHaAdapter } from '../services/devices/haAdapter.ts';
import { createHaTransport } from '../services/devices/haTransport.ts';
import { FakeHomeAssistant } from './fakeHomeAssistant.ts';
import type { ProfileUsageLease } from '../../../contracts/collaboration.ts';

describe('revoca v2 e isolamento dei writer nel server completo', () => {
  let fake: FakeHomeAssistant; let db: SqliteDatabase; let server: Server; let url: string;
  let pc: string; let phone: string;
  beforeEach(async () => {
    fake = new FakeHomeAssistant(); fake.knobs.version = '2026.10.4'; await fake.start();
    fake.addUser({ name: 'Mario', username: 'mario', password: 'fixture-password', isAdmin: false });
    vi.stubEnv('TUNET_INTERNAL_HA_URL', fake.url); vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', '');
    const adapter = createHaAdapter({ transport: createHaTransport({ baseUrls: () => [fake.url] }), callTimeoutMs: 1000, flowStepTimeoutMs: 1000 });
    const login = async () => {
      const clientId = 'http://127.0.0.1/'; const start = await adapter.loginStart(clientId);
      if (start.kind !== 'form') throw new Error('Flusso atteso');
      const done = await adapter.loginStep(start.flowId, clientId, { username: 'mario', password: 'fixture-password' });
      if (done.kind !== 'done') throw new Error('Accesso atteso');
      return (await adapter.exchangeCode(done.code, clientId)).accessToken;
    };
    pc = await login(); phone = await login();
    db = openDatabase(':memory:');
    const app = createApp({ database: db, isProduction: false, devices: { haUrls: () => [fake.url], supervisor: null, secretPath: () => 'backup/nonexistent-fixture-service.json' } });
    server = await new Promise<Server>(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta attesa'); url = `http://127.0.0.1:${address.port}`;
    await call('/api/v2/clients', pc, { clientId: 'pc', label: 'PC', platform: 'windows' });
    await call('/api/v2/clients', phone, { clientId: 'phone', label: 'Telefono', platform: 'web' });
  });
  afterEach(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await fake.stop(); db.close(); vi.unstubAllEnvs(); });
  const call = (path: string, token: string, body?: unknown, method?: string, usage?: ProfileUsageLease) => fetch(url + path, { method: method ?? (body === undefined ? 'GET' : 'POST'), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(usage ? { 'x-aca-usage-lease': usage.id, 'x-aca-usage-session': usage.usageSessionId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  it('blocca il telefono sui percorsi legacy e proxy anche quando HA non conferma la revoca', async () => {
    fake.knobs.tokenDeletionFails = true;
    const answer = await call('/api/v2/clients/phone/revoke', pc, {});
    expect(answer.status).toBe(200); expect(await answer.json()).toMatchObject({ revocationPending: true });
    for (const path of ['/api/v2/bootstrap', '/api/dispositivi/registro', '/api/casa3d', '/ha/api/states']) {
      const denied = await call(path, phone); expect(denied.status, path).toBe(401);
      expect(await denied.json()).toMatchObject({ code: 'CLIENT_REVOKED' });
    }
    expect((await call('/api/v2/bootstrap', pc)).status).toBe(200);
  });
  it('rifiuta vecchi snapshot globali dopo la migrazione senza alterare i dati originali', async () => {
    const created = await call('/api/v2/profiles', pc, { name: 'Casa', configuration: { snapshot: { version: 1, layout: {} }, appearance: {} } });
    expect(created.status).toBe(201);
    for (const path of ['/api/settings/current', '/api/profiles/unused', '/api/pairing/settings']) {
      const answer = await call(path, phone, { configuration: {}, baseRevision: 0 }, 'PUT');
      expect(answer.status, path).toBe(426); expect(await answer.json()).toMatchObject({ code: 'PROFILE_SYNC_UPGRADE_REQUIRED' });
    }
    expect(db.prepare('SELECT COUNT(*) AS n FROM aca_v2_profiles').get()).toEqual({ n: 1 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM current_settings').get()).toEqual({ n: 0 });
  });
  it('il profilo occupato blocca comandi e writer della facciata senza impedire bootstrap e letture', async () => {
    const created = await (await call('/api/v2/profiles', pc, { name: 'Casa', configuration: { snapshot: { version: 1, layout: {} } } })).json() as { id: string };
    const usageResponse = await call(`/api/v2/profiles/${created.id}/usage`, pc, { usageSessionId: 'pc-tab' });
    expect(usageResponse.status).toBe(201);
    const usage = await usageResponse.json() as ProfileUsageLease;
    expect((await call('/api/v2/bootstrap', phone)).status).toBe(200);
    expect((await call('/api/dispositivi/registro', phone)).status).toBe(200);
    const command = { kind: 'service', domain: 'light', service: 'toggle', data: { entity_id: 'light.sample' } };
    for (const [path, body, method] of [
      ['/api/v2/commands/prepare', { command }, 'POST'],
      ['/api/dispositivi/stanze', { name: 'Sala' }, 'POST'],
      ['/api/casa3d/building', { baseRevision: 0 }, 'PUT'],
    ] as const) {
      const denied = await call(path, phone, body, method);
      expect(denied.status, path).toBe(423);
      expect(await denied.json()).toMatchObject({ code: 'PROFILE_IN_USE' });
    }
    const accepted = await call('/api/v2/commands/prepare', pc, { command }, undefined, usage);
    expect(accepted.status).toBe(201);
    expect(db.prepare("SELECT COUNT(*) AS n FROM aca_command_intents WHERE state='prepared'").get()).toEqual({ n: 1 });
  });
});
