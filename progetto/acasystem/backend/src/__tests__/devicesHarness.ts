import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';
import type { HomeAssistantUser } from '../@types/homeAssistant.ts';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createDevicesRouter } from '../routes/devices.ts';
import { createDeviceModule } from '../services/devices/index.ts';
import type { DeviceModule, DeviceModuleOptions } from '../services/devices/index.ts';
import { FakeHomeAssistant } from './fakeHomeAssistant.ts';

/**
 * Test rig for the device facade: a fake HA, an in-memory database, a temporary secret file
 * and the real router behind a stub of the Home Assistant authentication (the user comes from
 * the `x-test-user` header). Everything the browser would see, every log line and every
 * console message is recorded so the tests can search it for values that must not leak.
 */

export const CANARY = {
  tvHost: '192.168.1.10',
  mac: '02:00:00:00:00:01',
  ownerPassword: 'owner-password-canary-7731',
  ownerName: 'proprietario',
};

export type TestUser = 'customer' | 'customer2' | 'installer';

const USERS: Record<TestUser, HomeAssistantUser> = {
  customer: { id: 'user-customer', name: 'Cliente', is_admin: false, is_owner: false },
  customer2: { id: 'user-customer-2', name: 'Cliente 2', is_admin: false, is_owner: false },
  installer: { id: 'user-installer', name: 'Installatore', is_admin: true, is_owner: false },
};

export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
  headers: Headers;
}

export interface Harness {
  fake: FakeHomeAssistant;
  database: SqliteDatabase;
  module: DeviceModule;
  secretPath: string;
  serviceToken: string;
  serviceUserId: string;
  /** Everything sent to the browser (status line, headers, body) as text. */
  transcript: string[];
  /** Log lines of the facade plus every console message. */
  logs: string[];
  request(
    path: string,
    options?: { method?: string; user?: TestUser | null; body?: unknown }
  ): Promise<ApiResult>;
  /** A new module on the same database, secret and HA: what a restart of the backend does. */
  restartBackend(options?: DeviceModuleOptions): DeviceModule;
  close(): Promise<void>;
}

export interface HarnessOptions {
  module?: DeviceModuleOptions;
  /** Write the secret of an active service identity. Default true. */
  activeService?: boolean;
  fake?: FakeHomeAssistant;
  /** Requests per minute allowed by the router limiter. Default: very high. */
  rateLimitMax?: number;
}

const FAST: DeviceModuleOptions = {
  pollIntervalMs: 10,
  entryLoadTimeoutMs: 2_000,
  powerStateTimeoutMs: 300,
  callTimeoutMs: 3_000,
  flowStepTimeoutMs: 5_000,
  identityCacheMs: 50,
  compatCacheMs: 60_000,
};

export const createHarness = async (options: HarnessOptions = {}): Promise<Harness> => {
  vi.stubEnv('DEVICES_RATE_LIMIT_MAX', String(options.rateLimitMax ?? 5000));
  const fake = options.fake ?? new FakeHomeAssistant();
  if (!options.fake) await fake.start();

  const directory = mkdtempSync(join(tmpdir(), 'aca-devices-harness-'));
  const secretPath = join(directory, 'secrets', 'service-identity.json');
  const database = openDatabase(':memory:');
  const transcript: string[] = [];
  const logs: string[] = [];

  const consoleSpies = (['log', 'info', 'warn', 'error'] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      logs.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
    })
  );

  const moduleOptions = (extra: DeviceModuleOptions = {}): DeviceModuleOptions => ({
    ...FAST,
    haUrls: () => [fake.url],
    secretPath: () => secretPath,
    log: (line) => logs.push(line),
    ...options.module,
    ...extra,
  });

  let module = createDeviceModule(database, moduleOptions());

  // The declared service user, as the activation command would have created it.
  const service = fake.addUser({
    name: 'Acasystem (servizio)',
    username: 'acasystem_servizio',
    isAdmin: true,
    localOnly: true,
  });
  const serviceToken = fake.tokenFor(service.user.id, 'llat');
  if (options.activeService !== false) {
    module.identity.store.save({
      version: 1,
      token: serviceToken,
      userId: service.user.id,
      userName: 'Acasystem (servizio)',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3650 * 86_400_000).toISOString(),
      haVersion: fake.knobs.version,
    });
  }

  let current = module;
  let router = createDevicesRouter(current);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const name = req.get('x-test-user') as TestUser | undefined;
    if (name && USERS[name]) req.authenticatedHaUser = USERS[name];
    next();
  });
  // The router is looked up on every request so `restartBackend` swaps the module under it.
  app.use('/api/dispositivi', (req, res, next) => router(req, res, next));

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const harness: Harness = {
    fake,
    database,
    get module() {
      return current;
    },
    secretPath,
    serviceToken,
    serviceUserId: service.user.id,
    transcript,
    logs,

    async request(path, { method = 'GET', user = 'customer', body } = {}) {
      const headers: Record<string, string> = {};
      if (user) headers['x-test-user'] = user;
      if (body !== undefined) headers['content-type'] = 'application/json';
      const response = await fetch(`${baseUrl}/api/dispositivi${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const text = await response.text();
      transcript.push(
        `${method} ${path} -> ${response.status}\n${[...response.headers.entries()].map(([key, value]) => `${key}: ${value}`).join('\n')}\n${text}`
      );
      let parsed: Record<string, unknown> = {};
      try {
        parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        parsed = { raw: text };
      }
      return { status: response.status, body: parsed, headers: response.headers };
    },

    restartBackend(extra) {
      current.stop();
      current = createDeviceModule(database, moduleOptions(extra));
      module = current;
      router = createDevicesRouter(current);
      return current;
    },

    async close() {
      current.stop();
      await new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      });
      if (!options.fake) await fake.stop();
      database.close();
      rmSync(directory, { recursive: true, force: true });
      consoleSpies.forEach((spy) => spy.mockRestore());
      vi.unstubAllEnvs();
    },
  };

  return harness;
};

/** Every table of tunet.db as text, to search for values that must not be stored. */
export const dumpDatabase = (database: SqliteDatabase): string => {
  const tables = database
    .prepare<[], { name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
    )
    .all();
  return tables
    .map(
      ({ name }) => `${name}: ${JSON.stringify(database.prepare(`SELECT * FROM ${name}`).all())}`
    )
    .join('\n');
};

/** The facade's own searchable output: responses, logs, console, database. */
export const everythingVisible = (harness: Harness): string =>
  [...harness.transcript, ...harness.logs, dumpDatabase(harness.database)].join('\n');
