// @vitest-environment node

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_ERROR_DEFINITIONS } from '../services/devices/deviceErrors.ts';
import { readSupervisorAccess } from '../config/devices.ts';
import { openDatabase } from '../models/database.ts';
import { createDeviceModule } from '../services/devices/index.ts';
import { CANARY, createHarness, everythingVisible } from './devicesHarness.ts';
import type { Harness, HarnessOptions } from './devicesHarness.ts';
import { FakeHomeAssistant } from './fakeHomeAssistant.ts';

/**
 * Automatic activation and self-repair of the service identity (REP-20261028-004): on HA OS with
 * the Supervisor token (a fake proxy at `<fake>/core`), elsewhere with the token of an
 * administrator who is using the app; the repair endpoint for every user; no installer in the
 * texts. The real Supervisor and a real HA OS app are not available here.
 */

const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  while (cleanups.length) await cleanups.pop()?.();
  vi.unstubAllEnvs();
});

const until = async (check: () => Promise<boolean> | boolean, ms = 6_000): Promise<void> => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('condition not reached in time');
};

const SERVICE_NAME = 'Acasystem (servizio)';

/** A harness whose service is off and whose app runs as the HA OS app (fake Supervisor proxy). */
const onHaOs = async (options: HarnessOptions = {}) => {
  const fake = new FakeHomeAssistant();
  await fake.start();
  const supervisor = fake.addUser({ name: 'Supervisor', isAdmin: true });
  const harness = await createHarness({
    fake,
    activeService: false,
    ...options,
    module: {
      supervisor: { coreUrl: `${fake.url}/core`, token: supervisor.token },
      serviceCheckIntervalMs: 40,
      serviceQuickCheckMs: 40,
      ...options.module,
    },
  });
  cleanups.push(async () => {
    await harness.close();
    await fake.stop();
  });
  return { harness, fake, supervisor };
};

const plain = async (options: HarnessOptions = {}): Promise<Harness> => {
  const harness = await createHarness(options);
  cleanups.push(() => harness.close());
  return harness;
};

const isActive = async (harness: Harness): Promise<boolean> => {
  const status = await harness.request('/stato');
  return (status.body.service as { active: boolean }).active === true;
};

const savedToken = (harness: Harness): string => {
  const loaded = harness.module.identity.store.load();
  if (!loaded.ok) throw new Error('no secret');
  return loaded.secret.token;
};

describe('HA OS: the Supervisor activates the service by itself (T1)', () => {
  it('creates and verifies the service identity at start-up, with no person and no password', async () => {
    const { harness, fake, supervisor } = await onHaOs();
    expect(await isActive(harness)).toBe(false);

    await harness.module.start();
    await until(() => isActive(harness));

    const status = await harness.request('/stato');
    expect(status.body.service).toMatchObject({ state: 'active', active: true, repairable: true });
    // The administrative commands went through the proxy as the Supervisor user, and the
    // test flow of step 6 ran as the service user.
    const listing = fake.callsFor('config/auth/list');
    expect(listing.length).toBeGreaterThan(0);
    expect(listing.every((call) => call.userId === supervisor.user.id)).toBe(true);
    expect(fake.calls.some((call) => call.route === 'POST /api/config/config_entries/flow')).toBe(
      true
    );
    // The service token is the service user's, not the Supervisor's.
    const token = savedToken(harness);
    expect(token).not.toBe(supervisor.token);
    expect(fake.tokens.get(token)?.userId).toBe(harness.serviceUserId);

    const registry = await harness.request('/registro');
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'service.repair',
          outcome: 'ok',
          source: expect.stringMatching(/^(startup|timer)$/),
        }),
      ])
    );
    const visible = everythingVisible(harness);
    expect(visible).not.toContain(supervisor.token);
    expect(visible).not.toContain(token);
    expect(readFileSync(harness.secretPath, 'utf8')).not.toContain(supervisor.token);
  });

  it('opens the proxy address from the environment (SUPERVISOR_TOKEN, ACASYSTEM_SUPERVISOR_URL)', async () => {
    const fake = new FakeHomeAssistant();
    await fake.start();
    cleanups.push(() => fake.stop());
    const supervisor = fake.addUser({ name: 'Supervisor', isAdmin: true });
    vi.stubEnv('SUPERVISOR_TOKEN', supervisor.token);
    vi.stubEnv('ACASYSTEM_SUPERVISOR_URL', `${fake.url}/`);
    expect(readSupervisorAccess()).toEqual({ coreUrl: `${fake.url}/core`, token: supervisor.token });

    const directory = mkdtempSync(join(tmpdir(), 'aca-keeper-'));
    const database = openDatabase(':memory:');
    const module = createDeviceModule(database, {
      haUrls: () => [fake.url],
      secretPath: () => join(directory, 'secrets', 'service-identity.json'),
      log: () => undefined,
      identityCacheMs: 50,
      serviceCheckIntervalMs: 60_000,
      serviceQuickCheckMs: 60_000,
    });
    cleanups.push(async () => {
      module.stop();
      database.close();
      rmSync(directory, { recursive: true, force: true });
    });
    await module.start();
    expect((await module.identity.status({ force: true })).state).toBe('active');
    expect(fake.userByName(SERVICE_NAME)?.localOnly).toBe(true);
  });

  it('has no proxy without SUPERVISOR_TOKEN', () => {
    vi.stubEnv('SUPERVISOR_TOKEN', '');
    expect(readSupervisorAccess()).toBeNull();
  });

  it('still tries on a version of HA nobody verified, and proves it with the test flow (T8)', async () => {
    const { harness, fake } = await onHaOs();
    fake.knobs.version = '2030.1.0';
    await harness.module.start();
    await until(() => isActive(harness));
    // The activation is proven, and the probes keep the writes on (REP-20261028-004, T8).
    const status = await harness.request('/stato');
    expect(status.body).toMatchObject({ service: { active: true }, features: { flows: true } });
  });

  it('writes the failure to the registry, keeps nothing, and tries again at the next check (T8)', async () => {
    let clock = Date.now();
    const { harness, fake } = await onHaOs({ module: { now: () => clock } });
    // The test flow does not open: the proof of step 6 fails.
    fake.knobs.overrideNextResult = { type: 'abort', reason: 'not_supported' };
    await harness.module.start();

    const repairErrors = (): number =>
      harness.database
        .prepare<[], { n: number }>(
          `SELECT COUNT(*) AS n FROM device_actions WHERE action = 'service.repair' AND outcome = 'error'`
        )
        .get()?.n ?? 0;
    await until(() => repairErrors() > 0);
    expect(await isActive(harness)).toBe(false);
    expect(harness.module.identity.store.load().ok).toBe(false);

    // Backoff: the periodic check does not try again before the pause, and the registry does
    // not fill with the same error.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(repairErrors()).toBe(1);

    clock += 11 * 60_000;
    await until(() => isActive(harness), 3_000);
    expect(harness.module.identity.store.load().ok).toBe(true);
  });
});

describe('self-repair (T2)', () => {
  const activeOnHaOs = async (options: HarnessOptions = {}) => {
    const context = await onHaOs({ activeService: true, ...options });
    return context;
  };

  it('repairs a token that was revoked, as soon as somebody uses the service', async () => {
    const { harness, fake } = await activeOnHaOs();
    const before = savedToken(harness);
    fake.tokens.delete(before);

    const refused = await harness.request('/stanze');
    expect(refused.status).toBe(503);
    expect(refused.body.code).toBe('SERVICE_NOT_ACTIVE');

    await until(() => isActive(harness));
    expect(savedToken(harness)).not.toBe(before);
    expect((await harness.request('/stanze')).status).toBe(200);
    const registry = await harness.request('/registro');
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'service.repair', outcome: 'ok' })])
    );
  });

  it('reactivates a service user that somebody suspended', async () => {
    const { harness, fake } = await activeOnHaOs();
    const user = fake.users.get(harness.serviceUserId);
    if (!user) throw new Error('missing service user');
    user.active = false;

    await harness.request('/stanze');
    await until(() => isActive(harness));
    expect(user.active).toBe(true);
    expect(user.isAdmin).toBe(true);
    expect(user.localOnly).toBe(true);
  });

  it('recreates a service user that was deleted', async () => {
    const { harness, fake } = await activeOnHaOs();
    fake.users.delete(harness.serviceUserId);

    await harness.request('/stanze');
    await until(() => isActive(harness));
    const recreated = fake.userByName(SERVICE_NAME);
    expect(recreated?.id).toBeDefined();
    expect(recreated?.id).not.toBe(harness.serviceUserId);
    expect(recreated?.username).toBe('acasystem_servizio');
    expect(fake.tokens.get(savedToken(harness))?.userId).toBe(recreated?.id);
  });

  it('renews the token before it runs out', async () => {
    const { harness, fake } = await activeOnHaOs();
    const before = savedToken(harness);
    const loaded = harness.module.identity.store.load();
    if (!loaded.ok) throw new Error('no secret');
    harness.module.identity.store.save({
      ...loaded.secret,
      expiresAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    });
    harness.module.identity.invalidate();
    expect(await isActive(harness)).toBe(true);

    await harness.module.start();
    await until(() => savedToken(harness) !== before);
    const renewed = harness.module.identity.store.load();
    if (!renewed.ok) throw new Error('no secret');
    expect(Date.parse(renewed.secret.expiresAt ?? '')).toBeGreaterThan(Date.now() + 365 * 86_400_000);
    expect(fake.tokens.get(renewed.secret.token)?.userId).toBe(harness.serviceUserId);
    expect(await isActive(harness)).toBe(true);
  });

  it('does nothing, and writes nothing, while the service is healthy', async () => {
    const { harness } = await activeOnHaOs();
    await harness.module.start();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const registry = await harness.request('/registro');
    expect(JSON.stringify(registry.body)).not.toContain('service.repair');
  });
});

describe('elsewhere: the token of an administrator who uses the app activates the service (T1)', () => {
  it('waits for an administrator, uses their token once and never keeps it', async () => {
    const harness = await plain({ activeService: false, adminActivates: true });

    // Anybody else changes nothing.
    expect(await isActive(harness)).toBe(false);
    expect((await harness.request('/stato')).body.service).toMatchObject({ repairable: false });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await isActive(harness)).toBe(false);

    const asAdmin = await harness.request('/stato', { user: 'installer' });
    expect(asAdmin.body.service).toMatchObject({ repairable: true });
    await until(() => isActive(harness));

    const adminToken = harness.accessTokenOf('installer');
    const registry = await harness.request('/registro');
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'service.repair',
          outcome: 'ok',
          source: 'api',
          userName: 'Installatore',
        }),
      ])
    );
    expect(everythingVisible(harness)).not.toContain(adminToken);
    expect(readFileSync(harness.secretPath, 'utf8')).not.toContain(adminToken);
    expect(savedToken(harness)).not.toBe(adminToken);
  });

  it('does not touch HA again when the service is already healthy', async () => {
    const harness = await plain({ adminActivates: true });
    await harness.request('/stato', { user: 'installer' });
    harness.fake.resetCalls();
    await harness.request('/stato', { user: 'installer' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(harness.fake.callsFor('config/auth/list')).toHaveLength(0);
  });
});

describe('POST /servizio/ripara (T3)', () => {
  it('repairs now for a user who is not an administrator, on HA OS', async () => {
    const { harness } = await onHaOs();
    const answer = await harness.request('/servizio/ripara', { method: 'POST', user: 'customer' });
    expect(answer.status).toBe(200);
    expect(answer.body).toEqual({ active: true, message: 'Servizio attivo.' });
    expect(await isActive(harness)).toBe(true);
    // Again: nothing to do, same answer.
    const again = await harness.request('/servizio/ripara', { method: 'POST', user: 'customer' });
    expect(again.body).toEqual({ active: true, message: 'Servizio attivo.' });
  });

  it('says plainly what to do when there is no automatic means, never naming the installer', async () => {
    const harness = await plain({ activeService: false });
    const answer = await harness.request('/servizio/ripara', { method: 'POST', user: 'customer' });
    expect(answer.status).toBe(200);
    expect(answer.body.active).toBe(false);
    expect(answer.body.message).toBe(
      "Apri Acasystem con l'account che hai creato per primo in Home Assistant e tocca di nuovo «Ripara il servizio»."
    );
    expect(String(answer.body.message)).not.toMatch(/installatore/i);
    expect(await isActive(harness)).toBe(false);
  });

  it('uses the administrator’s own token when an administrator taps it', async () => {
    const harness = await plain({ activeService: false });
    const answer = await harness.request('/servizio/ripara', { method: 'POST', user: 'installer' });
    expect(answer.body).toEqual({ active: true, message: 'Servizio attivo.' });
    expect(await isActive(harness)).toBe(true);
  });

  it('tells a person to create the first account while HA is not set up', async () => {
    const harness = await plain({ activeService: false });
    harness.fake.knobs.onboarded = false;
    const answer = await harness.request('/servizio/ripara', { method: 'POST', user: 'customer' });
    expect(answer.body).toMatchObject({ active: false });
    expect(String(answer.body.message)).toContain('Crea il primo account di Home Assistant');
  });

  it('is rate limited like a mutation, and needs a user', async () => {
    const harness = await plain({ module: { mutationLimit: { max: 2, windowMs: 60_000 } } });
    const first = await harness.request('/servizio/ripara', { method: 'POST' });
    const second = await harness.request('/servizio/ripara', { method: 'POST' });
    const third = await harness.request('/servizio/ripara', { method: 'POST' });
    expect([first.status, second.status, third.status]).toEqual([200, 200, 429]);
    expect(third.body.code).toBe('RATE_LIMITED');
    expect((await harness.request('/servizio/ripara', { method: 'POST', user: null })).status).toBe(
      401
    );
  });

  it('says that HA cannot be reached', async () => {
    const harness = await plain({ activeService: false });
    await harness.fake.stop();
    const answer = await harness.request('/servizio/ripara', { method: 'POST', user: 'installer' });
    expect(answer.body.active).toBe(false);
    expect(String(answer.body.message)).toContain('non è raggiungibile');
    await harness.fake.start(harness.fake.port);
  });
});

describe('everybody can do everything (T4, T5, T6)', () => {
  it('lets a user who is not an administrator read the registry and remove a power recipe', async () => {
    const harness = await plain();
    expect((await harness.request('/registro')).status).toBe(200);
    expect((await harness.request('/accensione/ABCDEF1234', { method: 'DELETE' })).status).toBe(
      404
    );
  });

  it('keeps the Wake on LAN entry of a recipe protected, with a plain sentence', async () => {
    const harness = await plain();
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    const started = await harness.request('/flussi', { method: 'POST', body: { handler: 'webostv' } });
    const flowId = started.body.flowId as string;
    await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: { host: CANARY.tvHost } } });
    const created = await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: {} } });
    const tvEntry = (created.body.entry as { entryId: string }).entryId;
    expect((await harness.request(`/accensione/${tvEntry}`, { method: 'POST', body: {} })).status).toBe(
      200
    );
    const wol = harness.fake.entries.find((entry) => entry.domain === 'wake_on_lan');
    const refused = await harness.request(`/voci/${wol?.entry_id}`, { method: 'DELETE' });
    expect(refused.status).toBe(403);
    expect(String(refused.body.error)).toContain('rimuovi il televisore');
    expect(String(refused.body.error)).not.toMatch(/installatore/i);
  });

  it('reads the MAC of the television from what HA saw on the network when its registry has none', async () => {
    const harness = await plain();
    harness.fake.knobs.network.dhcp = [
      { mac_address: '58:96:0A:00:00:77', hostname: 'lgwebostv', ip_address: '192.168.1.20' },
    ];
    const started = await harness.request('/flussi', { method: 'POST', body: { handler: 'webostv' } });
    const flowId = started.body.flowId as string;
    await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: { host: CANARY.tvHost } } });
    const created = await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: {} } });
    const tvEntry = (created.body.entry as { entryId: string }).entryId;

    const setup = await harness.request(`/accensione/${tvEntry}`, { method: 'POST', body: {} });
    expect(setup.status).toBe(200);
    expect(setup.body).toMatchObject({ configured: true, macSource: 'network' });
    expect(harness.fake.entries.find((entry) => entry.domain === 'wake_on_lan')?.mac).toBe(
      '58:96:0a:00:00:77'
    );
    expect(JSON.stringify(setup.body)).not.toContain('58:96');
  });

  it('never guesses between two televisions of the same brand', async () => {
    const harness = await plain();
    harness.fake.knobs.network.dhcp = [
      { mac_address: '58:96:0A:00:00:77', hostname: 'lgwebostv', ip_address: '192.168.1.20' },
      { mac_address: '58:96:0A:00:00:78', hostname: 'lgwebostv', ip_address: '192.168.1.21' },
    ];
    const started = await harness.request('/flussi', { method: 'POST', body: { handler: 'webostv' } });
    const flowId = started.body.flowId as string;
    await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: { host: CANARY.tvHost } } });
    const created = await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: {} } });
    const tvEntry = (created.body.entry as { entryId: string }).entryId;
    const setup = await harness.request(`/accensione/${tvEntry}`, { method: 'POST', body: {} });
    expect(setup.status).toBe(409);
    expect(setup.body.code).toBe('MAC_REQUIRED');
  });
});

const listSources = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : listSources(path);
    return name.endsWith('.ts') ? [path] : [];
  });

describe('no installer in the texts of the backend', () => {
  it('has no «installatore» in the error table', () => {
    for (const [code, definition] of Object.entries(DEVICE_ERROR_DEFINITIONS)) {
      expect(definition.message, code).not.toMatch(/installatore/i);
    }
  });

  it('has none in any string of the backend sources (comments aside)', () => {
    const offenders: string[] = [];
    for (const file of listSources(join(import.meta.dirname, '..'))) {
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, index) => {
          const code = line.trim();
          if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) return;
          if (/installatore/i.test(code)) offenders.push(`${file}:${index + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
