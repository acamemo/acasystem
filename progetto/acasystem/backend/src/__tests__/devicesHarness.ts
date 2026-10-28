import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';
import type { HomeAssistantUser } from '../@types/homeAssistant.ts';
import { createHomeAssistantAuthMiddleware } from '../middlewares/homeAssistantAuth.ts';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createDevicesRouter } from '../routes/devices.ts';
import { createDeviceModule } from '../services/devices/index.ts';
import type { DeviceModule, DeviceModuleOptions } from '../services/devices/index.ts';
import { FakeHomeAssistant } from './fakeHomeAssistant.ts';

/**
 * Test rig for the device facade: a fake HA, an in-memory database, a temporary secret file
 * and the real router behind the real authentication middleware (each test user has a bearer
 * token that a stub validator maps to the user; the installer's is a real admin token of the fake HA). Everything the browser would see, every log line and every
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
  /** The bearer token the harness sends for this user (what the server sees as the access token). */
  accessTokenOf(user: TestUser): string;
  /** Log lines of the facade plus every console message. */
  logs: string[];
  request(
    path: string,
    options?: { method?: string; user?: TestUser | null; body?: unknown; raw?: Buffer }
  ): Promise<ApiResult>;
  /** A GET whose answer is a file (a logo): status, headers and the bytes. */
  requestBinary(
    path: string,
    options?: { user?: TestUser | null }
  ): Promise<{ status: number; headers: Headers; data: Buffer }>;
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
  /**
   * An administrator's request lends its token to the keeper, as in the real app (server.ts).
   * Off by default so a test that looks at an inactive service is not changed by the installer.
   */
  adminActivates?: boolean;
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
  // The real authentication middleware runs behind the harness: it reads this URL.
  vi.stubEnv('TUNET_INTERNAL_HA_URL', fake.url);

  const consoleSpies = (['log', 'info', 'warn', 'error'] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      logs.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
    })
  );

  const moduleOptions = (extra: DeviceModuleOptions = {}): DeviceModuleOptions => ({
    ...FAST,
    haUrls: () => [fake.url],
    // No Supervisor unless the test asks for it: the environment of the machine must not matter.
    supervisor: null,
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

  // Each test user has an access token. The installer's is a real administrator of the fake HA
  // (created on first use), so the token the server sees can activate the service.
  const accessTokens = new Map<TestUser, string>();
  const tokenOf = (name: TestUser): string => {
    let token = accessTokens.get(name);
    if (!token) {
      token =
        name === 'installer'
          ? fake.addUser({ name: 'Installatore', isAdmin: true }).token
          : `test-token-${name}`;
      accessTokens.set(name, token);
    }
    return token;
  };
  const userOfToken = (token: string): HomeAssistantUser | null => {
    for (const [name, candidate] of accessTokens) if (candidate === token) return USERS[name];
    return null;
  };
  const authentication = createHomeAssistantAuthMiddleware({
    validateHomeAssistantUser: async ({ accessToken }) => {
      const user = userOfToken(accessToken);
      if (!user) throw new Error('unknown test token');
      return user;
    },
    onAdministrator: ({ user, accessToken }) => {
      if (options.adminActivates) {
        current.keeper.offerAdmin({ token: accessToken, user: { id: user.id, name: user.name } });
      }
    },
  });
  const app = express();
  app.use(express.json());
  app.use('/api/dispositivi', authentication);
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
    accessTokenOf: tokenOf,
    logs,

    async request(path, { method = 'GET', user = 'customer', body, raw } = {}) {
      const headers: Record<string, string> = {};
      if (user) headers.authorization = `Bearer ${tokenOf(user)}`;
      if (body !== undefined) headers['content-type'] = 'application/json';
      if (raw !== undefined) headers['content-type'] = 'application/octet-stream';
      const response = await fetch(`${baseUrl}/api/dispositivi${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        ...(raw !== undefined ? { body: new Uint8Array(raw) } : {}),
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

    async requestBinary(path, { user = 'customer' } = {}) {
      const headers: Record<string, string> = {};
      if (user) headers.authorization = `Bearer ${tokenOf(user)}`;
      const response = await fetch(`${baseUrl}/api/dispositivi${path}`, { headers });
      return {
        status: response.status,
        headers: response.headers,
        data: Buffer.from(await response.arrayBuffer()),
      };
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
