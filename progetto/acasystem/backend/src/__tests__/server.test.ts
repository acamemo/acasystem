// @vitest-environment node

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Express } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocketServer } from 'ws';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createApp } from '../server.ts';
import type { CreateAppOptions } from '../server.ts';
import { createProfileService } from '../services/profileService.ts';

const openServers: Server[] = [];
const openDatabases: SqliteDatabase[] = [];
const tempDirs: string[] = [];

const closeServer = async (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const createDistFixture = (): string => {
  const distPath = mkdtempSync(join(tmpdir(), 'tunet-server-dist-'));
  mkdirSync(join(distPath, 'assets'));
  writeFileSync(
    join(distPath, 'index.html'),
    '<!doctype html><html><head><title>Tunet Test</title></head><body><div id="root"></div></body></html>',
    'utf8'
  );
  tempDirs.push(distPath);
  return distPath;
};

/** App with an in-memory database, so the tests never touch backend/data/tunet.db. */
const createTestApp = (options: CreateAppOptions = {}): Express => {
  const database = openDatabase(':memory:');
  openDatabases.push(database);
  return createApp({ database, ...options });
};

const startHarness = async (app: Express) => {
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  openServers.push(server);

  return {
    async request(path: string, init?: RequestInit) {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('Test server has no TCP address');
      }
      return fetch(`http://127.0.0.1:${address.port}${path}`, init);
    },
  };
};

interface FakeHomeAssistant {
  url: string;
  connections: number;
  close(): Promise<void>;
}

const fakeHomeAssistants: FakeHomeAssistant[] = [];

/**
 * Finto HA WebSocket minimo (auth_required, auth_ok o auth_invalid, auth/current_user),
 * come nella prova di concetto di SEC-1: con `userId` accetta qualsiasi token e
 * dichiara di essere quell'utente; con null rifiuta ogni token.
 */
const startFakeHomeAssistant = async (userId: string | null): Promise<FakeHomeAssistant> => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0, path: '/api/websocket' });
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Fake HA has no address');

  const fake: FakeHomeAssistant = {
    url: `http://127.0.0.1:${address.port}`,
    connections: 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.clients.forEach((client) => client.terminate());
        server.close(() => resolve());
      }),
  };
  fakeHomeAssistants.push(fake);

  server.on('connection', (socket) => {
    fake.connections += 1;
    socket.send(JSON.stringify({ type: 'auth_required', ha_version: '2026.10.0' }));
    socket.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === 'auth') {
        socket.send(
          JSON.stringify(
            userId
              ? { type: 'auth_ok', ha_version: '2026.10.0' }
              : { type: 'auth_invalid', message: 'Invalid access token or password' }
          )
        );
      } else if (message.type === 'auth/current_user') {
        socket.send(
          JSON.stringify({
            id: message.id,
            type: 'result',
            success: true,
            result: { id: userId, name: 'Finto', is_admin: true, is_owner: true },
          })
        );
      } else if (message.type === 'supported_features') {
        socket.send(
          JSON.stringify({ id: message.id, type: 'result', success: true, result: null })
        );
      }
    });
  });

  return fake;
};

/** Porta TCP locale libera e chiusa: un HA configurato ma irraggiungibile. */
const findClosedLocalPort = async (): Promise<number> => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', () => resolve()));
  const address = probe.address();
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  if (address === null || typeof address === 'string') throw new Error('No TCP port');
  return address.port;
};

afterEach(async () => {
  vi.unstubAllEnvs();

  while (fakeHomeAssistants.length > 0) {
    await fakeHomeAssistants.pop()?.close();
  }

  while (openServers.length > 0) {
    const server = openServers.pop();
    if (server) await closeServer(server);
  }

  while (openDatabases.length > 0) {
    openDatabases.pop()?.close();
  }

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('createApp SPA fallback', () => {
  it('serves the SPA shell for the production root path', async () => {
    const harness = await startHarness(
      createTestApp({
        appVersion: 'test-version',
        distPath: createDistFixture(),
        isProduction: true,
      })
    );

    const response = await harness.request('/');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    await expect(response.text()).resolves.toContain('<title>Tunet Test</title>');
  });

  it('does not rewrite missing API routes to the SPA shell', async () => {
    const harness = await startHarness(
      createTestApp({
        appVersion: 'test-version',
        distPath: createDistFixture(),
        isProduction: true,
      })
    );

    const response = await harness.request('/api/does-not-exist');

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.not.toContain('Tunet Test');
  });
});

describe('createApp API surface', () => {
  // Same directives, in the same order, as the original Tunet server.
  const EXPECTED_CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: http: https: https://cdn.jsdelivr.net https://cdn.simpleicons.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org",
    "connect-src 'self' ws: wss: http: https:",
    'frame-src https://www.openstreetmap.org',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  it('reports health with the given version, CSP and no X-Powered-By', async () => {
    const harness = await startHarness(createTestApp({ appVersion: '9.9.9', isProduction: false }));

    const response = await harness.request('/api/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      version: '9.9.9',
    });
    expect(response.headers.get('content-security-policy')).toBe(EXPECTED_CSP);
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('ratelimit-policy')).toBeTruthy();
  });

  it('reads the default version from backend/package.json', async () => {
    const harness = await startHarness(createTestApp({ isProduction: false }));

    const response = await harness.request('/api/health');

    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      version: '0.1.0',
    });
  });

  it('fails closed on profiles and settings without a server-side HA URL', async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', '');
    vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', '');
    const harness = await startHarness(createTestApp({ isProduction: false }));

    for (const path of ['/api/profiles?ha_user_id=user-1', '/api/settings/devices?ha_user_id=u']) {
      const response = await harness.request(path, {
        headers: { authorization: 'Bearer token-1', 'x-ha-url': 'http://127.0.0.1:9' },
      });
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({
        error: 'Acasystem backend has no Home Assistant URL configured (TUNET_INTERNAL_HA_URL).',
        code: 'HA_URL_NOT_CONFIGURED',
      });
    }
  });

  it('keeps the icon endpoints public', async () => {
    const harness = await startHarness(createTestApp({ isProduction: false }));

    const icon = await harness.request('/api/icons/mdi/lightbulb');
    expect(icon.status).toBe(200);
    await expect(icon.json()).resolves.toMatchObject({ name: 'mdi:lightbulb' });

    const invalid = await harness.request('/api/icons/mdi/Bad_Name!');
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({
      error: 'Invalid icon name',
    });
  });

  it('strips the ingress path prefix before routing', async () => {
    const harness = await startHarness(createTestApp({ appVersion: 'v', isProduction: false }));

    const response = await harness.request('/api/hassio_ingress/abc/api/health', {
      headers: { 'x-ingress-path': '/api/hassio_ingress/abc' },
    });

    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      version: 'v',
    });
  });

  it('serves the current hashed asset in place of a stale hash', async () => {
    const distPath = createDistFixture();
    writeFileSync(join(distPath, 'assets', 'index-NEW123.js'), 'console.log(1);', 'utf8');
    const harness = await startHarness(createTestApp({ distPath, isProduction: true }));

    const response = await harness.request('/assets/index-OLD999.js');

    expect(response.status).toBe(200);
    expect(response.headers.get('x-tunet-asset-fallback')).toBe('index-NEW123.js');
    await expect(response.text()).resolves.toBe('console.log(1);');
  });
});

describe('SEC-1: the HA configured on the server is the only identity source', () => {
  const startVictimHarness = async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', '');
    vi.stubEnv('TUNET_TRUST_SUPERVISOR_INGRESS', '');
    const database = openDatabase(':memory:');
    openDatabases.push(database);
    const created = createProfileService(database).create({
      haUserId: 'victim-user-id',
      name: 'Casa',
      deviceLabel: null,
      data: { pagesConfig: { segreto: 'layout della vittima' } },
    });
    if (!created.ok) throw new Error('Victim profile not created');
    const harness = await startHarness(createApp({ database, isProduction: false }));
    const attacker = await startFakeHomeAssistant('victim-user-id');
    const attackerHeaders = {
      authorization: 'Bearer token-inventato-qualsiasi',
      'x-ha-url': attacker.url,
      'x-ha-fallback-url': attacker.url,
    };
    const victimProfiles = () => createProfileService(database).list('victim-user-id');
    return { harness, attacker, attackerHeaders, profileId: created.value.id, victimProfiles };
  };

  it('never returns 200 for the verifier PoC when the configured HA is unreachable', async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', `http://127.0.0.1:${await findClosedLocalPort()}`);
    const { harness, attacker, attackerHeaders } = await startVictimHarness();

    const response = await harness.request('/api/profiles?ha_user_id=victim-user-id', {
      headers: attackerHeaders,
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toHaveProperty('code', 'HA_VALIDATION_UNREACHABLE');
    expect(attacker.connections).toBe(0);
  }, 20_000);

  it('answers 401 when the configured HA rejects the token, without asking the client HA', async () => {
    const trusted = await startFakeHomeAssistant(null);
    vi.stubEnv('TUNET_INTERNAL_HA_URL', trusted.url);
    const { harness, attacker, attackerHeaders, profileId, victimProfiles } =
      await startVictimHarness();
    const before = victimProfiles();

    for (const [method, path, body] of [
      ['GET', '/api/profiles?ha_user_id=victim-user-id', undefined],
      ['PUT', `/api/profiles/${profileId}`, JSON.stringify({ name: 'Alterato', data: {} })],
      ['DELETE', `/api/profiles/${profileId}`, undefined],
    ] as const) {
      const response = await harness.request(path, {
        method,
        headers: { ...attackerHeaders, 'content-type': 'application/json' },
        body,
      });
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toHaveProperty('code', 'HA_AUTH_INVALID');
    }

    expect(trusted.connections).toBe(1);
    expect(attacker.connections).toBe(0);
    expect(victimProfiles()).toEqual(before);
  });

  it('takes the user id from the configured HA, not from the HA named by the client', async () => {
    const trusted = await startFakeHomeAssistant('owner-user-id');
    vi.stubEnv('TUNET_INTERNAL_HA_URL', trusted.url);
    const { harness, attacker, attackerHeaders } = await startVictimHarness();

    const victim = await harness.request('/api/profiles?ha_user_id=victim-user-id', {
      headers: attackerHeaders,
    });
    expect(victim.status).toBe(403);
    await expect(victim.json()).resolves.toEqual({ error: 'Forbidden: user mismatch' });

    const own = await harness.request('/api/profiles?ha_user_id=owner-user-id', {
      headers: attackerHeaders,
    });
    expect(own.status).toBe(200);
    await expect(own.json()).resolves.toEqual([]);
    expect(trusted.connections).toBeGreaterThan(0);
    expect(attacker.connections).toBe(0);
  });
});
