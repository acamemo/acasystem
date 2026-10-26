// @vitest-environment node

import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { attachHomeAssistantWebSocketProxy } from '../routes/homeAssistantProxy.ts';
import { createApp } from '../server.ts';
import type { DeviceModule } from '../services/devices/index.ts';
import { FakeHomeAssistant } from './fakeHomeAssistant.ts';

/**
 * The facade inside the real app: authentication by the Home Assistant token of the browser
 * (checked by the server against HA), configuration from the environment, and the invariant
 * that the /ha tunnel carries only the token of the user, never the service token.
 */

let fake: FakeHomeAssistant;
let database: SqliteDatabase;
let server: Server;
let directory: string;
let base: string;
let serviceToken: string;
let tabletToken: string;
let tabletUserId: string;
let installerToken: string;

beforeEach(async () => {
  fake = new FakeHomeAssistant();
  await fake.start();
  database = openDatabase(':memory:');
  directory = mkdtempSync(join(tmpdir(), 'aca-wiring-'));

  vi.stubEnv('TUNET_INTERNAL_HA_URL', fake.url);
  vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', '');
  vi.stubEnv('TUNET_TRUST_SUPERVISOR_INGRESS', '');
  vi.stubEnv('TUNET_SERVICE_SECRET_FILE', join(directory, 'secrets', 'service-identity.json'));
  vi.stubEnv('DEVICES_RATE_LIMIT_MAX', '5000');
  vi.stubEnv('API_RATE_LIMIT_MAX', '5000');

  const tablet = fake.addUser({ name: 'Tablet cliente', isAdmin: false });
  tabletToken = tablet.token;
  tabletUserId = tablet.user.id;
  installerToken = fake.addUser({ name: 'Installatore', isAdmin: true }).token;
  const service = fake.addUser({
    name: 'Acasystem (servizio)',
    username: 'acasystem_servizio',
    isAdmin: true,
    localOnly: true,
  });
  serviceToken = fake.tokenFor(service.user.id, 'llat');

  // The app reads the HA address and the secret path from the environment, as in production.
  const app = createApp({ database, isProduction: false });
  const devices = app.locals.devices as DeviceModule;
  devices.identity.store.save({
    version: 1,
    token: serviceToken,
    userId: service.user.id,
    userName: 'Acasystem (servizio)',
    createdAt: new Date().toISOString(),
    expiresAt: null,
    haVersion: '2026.9.4',
  });

  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  attachHomeAssistantWebSocketProxy(server);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  vi.unstubAllEnvs();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await fake.stop();
  database.close();
  rmSync(directory, { recursive: true, force: true });
});

const api = (path: string, token: string | null, init: RequestInit = {}) =>
  fetch(`${base}/api/dispositivi${path}`, {
    ...init,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });

describe('/api/dispositivi in the real app', () => {
  it('needs a Home Assistant token that HA accepts, checked by the server', async () => {
    expect((await api('/stato', null)).status).toBe(401);
    expect((await api('/stato', 'not-a-token-of-this-ha')).status).toBe(401);

    const ok = await api('/stato', tabletToken);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({
      user: { isAdmin: false },
      service: { state: 'active', active: true },
    });
    expect(ok.headers.get('cache-control')).toBe('no-store');
  });

  it('knows the role of the user from HA, not from the browser', async () => {
    const asInstaller = await api('/registro', installerToken);
    expect(asInstaller.status).toBe(200);
    const asTablet = await api('/registro', tabletToken);
    expect(asTablet.status).toBe(403);
    expect(await asTablet.json()).toMatchObject({ code: 'REQUIRES_INSTALLER' });
  });

  it('adds a TV end to end with the tablet account, which is not an administrator', async () => {
    const started = await api('/flussi', tabletToken, {
      method: 'POST',
      body: JSON.stringify({ handler: 'webostv' }),
    });
    expect(started.status).toBe(201);
    const { flowId } = (await started.json()) as { flowId: string };

    const addressed = await api(`/flussi/${flowId}`, tabletToken, {
      method: 'POST',
      body: JSON.stringify({ input: { host: '192.168.1.10' } }),
    });
    expect(((await addressed.json()) as { stepId: string }).stepId).toBe('pairing');
    const paired = await api(`/flussi/${flowId}`, tabletToken, {
      method: 'POST',
      body: JSON.stringify({ input: {} }),
    });
    expect(((await paired.json()) as { type: string }).type).toBe('create_entry');

    expect(fake.entries.filter((entry) => entry.domain === 'webostv')).toHaveLength(1);
    // HA saw the write as the service user, and the registry names the person.
    const writes = fake.calls.filter(
      (call) => call.route === 'POST /api/config/config_entries/flow'
    );
    expect(writes.every((call) => call.tokenKind === 'llat')).toBe(true);
    const registry = await (await api('/registro', installerToken)).json();
    expect(registry).toMatchObject({
      actions: expect.arrayContaining([
        expect.objectContaining({ action: 'flow.start', user: tabletUserId, source: 'api' }),
      ]),
    });
  });

  it('does not run its timers or touch HA when the app is only created', async () => {
    const app = createApp({ database: openDatabase(':memory:'), isProduction: false });
    expect(app.locals.devices).toBeDefined();
    const callsBefore = fake.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fake.calls.length).toBe(callsBefore);
  });
});

describe('the /ha tunnel carries only the user token', () => {
  const tunnel = async (
    token: string,
    message: Record<string, unknown>
  ): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
      const socket = new WebSocket(`${base.replace('http', 'ws')}/ha/api/websocket`);
      socket.on('error', reject);
      socket.on('message', (data) => {
        const parsed = JSON.parse(data.toString()) as Record<string, unknown>;
        if (parsed.type === 'auth_required') {
          socket.send(JSON.stringify({ type: 'auth', access_token: token }));
        } else if (parsed.type === 'auth_ok') {
          socket.send(JSON.stringify({ id: 1, ...message }));
        } else if (parsed.type === 'result') {
          socket.close();
          resolve(parsed);
        }
      });
    });

  it('forwards the tablet token as it is and HA refuses an administrator command from it', async () => {
    fake.resetCalls();
    const result = await tunnel(tabletToken, { type: 'config/auth/list' });

    expect(result).toMatchObject({ success: false, error: { code: 'unauthorized' } });
    const seen = fake.calls.filter((call) => call.route === 'config/auth/list');
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ userId: tabletUserId, tokenKind: 'access' });
    expect(fake.calls.some((call) => call.tokenKind === 'llat')).toBe(false);
  });

  it('does not let the tunnel borrow the service identity: a message without a valid token fails at HA', async () => {
    const tokenless = new Promise<string>((resolve) => {
      const socket = new WebSocket(`${base.replace('http', 'ws')}/ha/api/websocket`);
      socket.on('message', (data) => {
        const parsed = JSON.parse(data.toString()) as { type: string };
        if (parsed.type === 'auth_required')
          socket.send(JSON.stringify({ type: 'auth', access_token: 'x' }));
        else {
          socket.close();
          resolve(parsed.type);
        }
      });
    });
    expect(await tokenless).toBe('auth_invalid');
    expect(fake.calls.some((call) => call.tokenKind === 'llat')).toBe(false);
  });

  it('keeps the configuration routes of HA out of the REST proxy', async () => {
    fake.resetCalls();
    for (const [method, path] of [
      ['POST', '/ha/api/config/config_entries/flow'],
      ['GET', '/ha/api/config/config_entries/flow_handlers'],
      ['POST', '/ha/api/config/automation/config/x'],
      ['DELETE', '/ha/api/config/config_entries/entry/x'],
      ['POST', '/ha/auth/long_lived_access_token'],
    ] as const) {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { authorization: `Bearer ${installerToken}`, 'content-type': 'application/json' },
        ...(method === 'POST' ? { body: '{}' } : {}),
      });
      expect(response.status).toBe(404);
    }
    expect(fake.calls).toHaveLength(0);
  });

  it('never shows the service token in any response of the app', async () => {
    const bodies: string[] = [];
    for (const path of ['/stato', '/catalogo', '/flussi', '/stanze']) {
      const response = await api(path, tabletToken);
      bodies.push(JSON.stringify([...response.headers.entries()]), await response.text());
    }
    const admin = await api('/stato', installerToken);
    bodies.push(JSON.stringify([...admin.headers.entries()]), await admin.text());
    expect(bodies.join('\n')).not.toContain(serviceToken);
  });
});
