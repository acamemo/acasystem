// @vitest-environment node

import { writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CANARY, createHarness, everythingVisible } from './devicesHarness.ts';
import type { Harness, HarnessOptions } from './devicesHarness.ts';

/**
 * Service identity, closed list of operations, catalogue, names and rooms, compatibility
 * check and status of the device facade, against a fake HA.
 */

const open: Harness[] = [];
const harnessFor = async (options: HarnessOptions = {}): Promise<Harness> => {
  const harness = await createHarness(options);
  open.push(harness);
  return harness;
};

afterEach(async () => {
  while (open.length) await open.pop()?.close();
});

const FLOW_START = 'POST /api/config/config_entries/flow';
const FLOW_STEP = 'POST /api/config/config_entries/flow/{flow_id}';
const SLEEP_PAST_CACHE_MS = 120;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Adds a TV through the facade and returns the entry and device ids. */
const addTv = async (harness: Harness, host = CANARY.tvHost) => {
  const started = await harness.request('/flussi', {
    method: 'POST',
    body: { handler: 'webostv' },
  });
  const flowId = started.body.flowId as string;
  await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: { host } } });
  const created = await harness.request(`/flussi/${flowId}`, {
    method: 'POST',
    body: { input: {} },
  });
  const entry = created.body.entry as { entryId: string; device: { id: string } };
  return { entryId: entry.entryId, deviceId: entry.device.id };
};

describe('the service identity: no identity, no function', () => {
  it('says "servizio non attivo" when there is no secret, and makes no write call to HA', async () => {
    const harness = await harnessFor({ activeService: false });

    const status = await harness.request('/stato');
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({
      user: { isAdmin: false },
      service: { state: 'missing', active: false },
      features: { catalog: false, flows: false, power: false },
    });
    expect(String((status.body.service as { message: string }).message)).toContain(
      'Servizio non attivo'
    );

    const attempts = [
      await harness.request('/flussi', { method: 'POST', body: { handler: 'webostv' } }),
      await harness.request('/catalogo'),
      await harness.request('/stanze'),
      await harness.request('/accensione/ABCDEF1234', { method: 'POST', body: {} }),
    ];
    for (const attempt of attempts) {
      expect(attempt.status).toBe(503);
      expect(attempt.body.code).toBe('SERVICE_NOT_ACTIVE');
      expect(String(attempt.body.error)).toContain('Servizio non attivo');
    }
    expect(harness.fake.callsFor(FLOW_START)).toHaveLength(0);
    expect(harness.fake.calls.filter((call) => call.tokenKind === 'llat')).toHaveLength(0);
  });

  it.each([
    ['not JSON', 'this is not json'],
    ['JSON without a token', JSON.stringify({ version: 1, userId: 'x' })],
    ['a token that is too short', JSON.stringify({ version: 1, token: 'abc', userId: 'x' })],
  ])('treats a secret file that is %s as not active', async (_label, content) => {
    const harness = await harnessFor({});
    writeFileSync(harness.secretPath, content, 'utf8');

    const result = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('SERVICE_NOT_ACTIVE');
  });

  it('turns off when the service user is suspended in HA, never falls back, and comes back when reactivated', async () => {
    const harness = await harnessFor({});
    expect(
      (await harness.request('/flussi', { method: 'POST', body: { handler: 'webostv' } })).status
    ).toBe(201);
    harness.fake.resetCalls();

    // The installer suspends "Acasystem (servizio)" in HA.
    const serviceUser = harness.fake.users.get(harness.serviceUserId);
    if (!serviceUser) throw new Error('service user missing in the fake');
    serviceUser.active = false;
    await sleep(SLEEP_PAST_CACHE_MS);

    const denied = await harness.request('/catalogo');
    expect(denied.status).toBe(503);
    expect(denied.body.code).toBe('SERVICE_NOT_ACTIVE');
    const adminView = await harness.request('/stato', { user: 'installer' });
    expect(adminView.body).toMatchObject({ service: { state: 'rejected', active: false } });
    expect(String((adminView.body.service as { detail: string }).detail)).toContain('sospeso');
    const customerView = await harness.request('/stato');
    expect((customerView.body.service as { detail?: string }).detail).toBeUndefined();

    // The rest of the facade that needs no HA still answers.
    expect((await harness.request('/flussi')).status).toBe(200);
    // Nothing was sent to HA as anyone else.
    expect(harness.fake.calls.filter((call) => call.userId !== null)).toHaveLength(0);

    serviceUser.active = true;
    await sleep(SLEEP_PAST_CACHE_MS);
    expect((await harness.request('/catalogo')).status).toBe(200);
  });

  it('turns off when HA refuses the token in the middle of a call', async () => {
    const harness = await harnessFor({ module: { identityCacheMs: 60_000 } });
    const started = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    const flowId = started.body.flowId as string;

    // The token is revoked while the cached state still says "active".
    harness.fake.tokens.delete(harness.serviceToken);
    const result = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { host: CANARY.tvHost } },
    });
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('SERVICE_NOT_ACTIVE');

    // The identity is now closed without waiting for the next probe.
    const next = await harness.request('/catalogo');
    expect(next.body.code).toBe('SERVICE_NOT_ACTIVE');
  });

  it('turns off when the service user is no longer an administrator', async () => {
    const harness = await harnessFor({});
    const serviceUser = harness.fake.users.get(harness.serviceUserId);
    if (!serviceUser) throw new Error('service user missing in the fake');
    serviceUser.isAdmin = false;

    const result = await harness.request('/catalogo');
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('SERVICE_NOT_ACTIVE');
    const status = await harness.request('/stato', { user: 'installer' });
    expect(status.body).toMatchObject({ service: { state: 'not_admin' } });
  });

  it('turns off when the token belongs to another user than the declared one', async () => {
    const harness = await harnessFor({});
    const stranger = harness.fake.addUser({ name: 'Altro', isAdmin: true });
    const strangerToken = harness.fake.tokenFor(stranger.user.id, 'llat');
    harness.module.identity.store.save({
      version: 1,
      token: strangerToken,
      userId: harness.serviceUserId,
      userName: 'Acasystem (servizio)',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      haVersion: null,
    });

    const status = await harness.request('/stato', { user: 'installer' });
    expect(status.body).toMatchObject({ service: { state: 'mismatch', active: false } });
  });

  it('turns off when the token has expired', async () => {
    const harness = await harnessFor({});
    harness.module.identity.store.save({
      version: 1,
      token: harness.serviceToken,
      userId: harness.serviceUserId,
      userName: 'Acasystem (servizio)',
      createdAt: new Date(Date.now() - 4_000_000_000).toISOString(),
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
      haVersion: null,
    });
    const status = await harness.request('/stato', { user: 'installer' });
    expect(status.body).toMatchObject({ service: { state: 'expired', active: false } });
  });

  it('picks up a new secret without restarting the backend', async () => {
    const harness = await harnessFor({ activeService: false });
    expect((await harness.request('/catalogo')).status).toBe(503);

    harness.module.identity.store.save({
      version: 1,
      token: harness.serviceToken,
      userId: harness.serviceUserId,
      userName: 'Acasystem (servizio)',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      haVersion: null,
    });
    expect((await harness.request('/catalogo')).status).toBe(200);
  });

  it('answers that HA is unreachable (503, in Italian) and recovers when it is back', async () => {
    const harness = await harnessFor({});
    await harness.fake.stop();
    await sleep(SLEEP_PAST_CACHE_MS);

    const down = await harness.request('/flussi', { method: 'POST', body: { handler: 'webostv' } });
    expect(down.status).toBe(503);
    expect(down.body.code).toBe('HA_UNREACHABLE');
    expect(String(down.body.error)).toContain('Home Assistant non è raggiungibile');
    const status = await harness.request('/stato');
    expect(status.body).toMatchObject({
      homeAssistant: { reachable: false },
      features: { flows: false },
    });

    await harness.fake.start(harness.fake.port);
    harness.module.compat.invalidate();
    await sleep(SLEEP_PAST_CACHE_MS);
    expect(
      (await harness.request('/flussi', { method: 'POST', body: { handler: 'webostv' } })).status
    ).toBe(201);
  });

  it('refuses everything while HA has not been set up', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.onboarded = false;

    const result = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('HA_NOT_READY');
    expect(String(result.body.error)).toContain('non è ancora stato configurato');
  });

  it('uses the service identity for every administrator call, never another token', async () => {
    const harness = await harnessFor({});
    const { entryId, deviceId } = await addTv(harness);
    await harness.request('/stanze', { method: 'POST', body: { name: 'Soggiorno' } });
    await harness.request(`/dispositivi/${deviceId}`, { method: 'PATCH', body: { name: 'TV' } });
    await harness.request('/catalogo');
    await harness.request(`/voci/${entryId}`);

    const adminCalls = harness.fake.calls.filter((call) =>
      [
        FLOW_START,
        'POST /api/config/config_entries/flow/{flow_id}',
        'GET /api/config/config_entries/flow_handlers',
        'config/device_registry/update',
        'config/area_registry/create',
      ].includes(call.route)
    );
    expect(adminCalls.length).toBeGreaterThanOrEqual(5);
    // The fake knows no customer token at all: every authenticated call is the service user.
    expect(
      harness.fake.calls
        .filter((call) => call.userId !== null)
        .every((call) => call.userId === harness.serviceUserId)
    ).toBe(true);
    expect(adminCalls.every((call) => call.tokenKind === 'llat')).toBe(true);
  });
});

describe('the closed list', () => {
  it('lists the flow handlers of HA but starts only the TV: the others need the installer', async () => {
    const harness = await harnessFor({});

    const catalogue = await harness.request('/catalogo');
    expect(catalogue.status).toBe(200);
    const items = catalogue.body.items as {
      domain: string;
      startable: boolean;
      requiresInstaller: boolean;
      brand: string | null;
    }[];
    // D1 lists the flow handlers only: no brands, no integrations without a flow.
    expect(items.map((item) => item.domain).sort()).toEqual([
      'esphome',
      'hue',
      'wake_on_lan',
      'webostv',
    ]);
    expect(items.every((item) => item.brand === null)).toBe(true);
    expect(items.filter((item) => item.startable).map((item) => item.domain)).toEqual(['webostv']);
    // The Wake on LAN entry is created by the server recipe, never started by a person.
    expect(items.find((item) => item.domain === 'wake_on_lan')).toMatchObject({
      startable: false,
      requiresInstaller: true,
    });
    expect(items.find((item) => item.domain === 'hue')).toMatchObject({
      startable: false,
      requiresInstaller: true,
    });
    expect(catalogue.body).toMatchObject({ degraded: true });
    // The full index (internal admin command) is not used in D1.
    expect(harness.fake.callsFor('integration/descriptions')).toHaveLength(0);

    harness.fake.resetCalls();
    for (const user of ['customer', 'installer'] as const) {
      for (const handler of ['hue', 'wake_on_lan']) {
        const refused = await harness.request('/flussi', {
          method: 'POST',
          user,
          body: { handler },
        });
        expect(refused.status).toBe(403);
        expect(refused.body).toMatchObject({
          code: 'REQUIRES_INSTALLER',
          error: "Richiede l'installatore.",
        });
      }
    }
    expect(harness.fake.callsFor(FLOW_START)).toHaveLength(0);

    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'flow.start',
          domain: 'hue',
          outcome: 'denied',
          code: 'REQUIRES_INSTALLER',
        }),
      ])
    );
  });

  it('refuses a handler outside the list even when the service is not active', async () => {
    const harness = await harnessFor({ activeService: false });
    const refused = await harness.request('/flussi', { method: 'POST', body: { handler: 'hue' } });
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('REQUIRES_INSTALLER');
  });

  it('filters the listed handlers by name and limits the answer', async () => {
    const harness = await harnessFor({});

    const hue = await harness.request('/catalogo?q=hue');
    expect((hue.body.items as { domain: string }[]).map((item) => item.domain)).toEqual(['hue']);
    expect(hue.body.total).toBe(1);

    const limited = await harness.request('/catalogo?limit=1');
    expect(limited.body.items).toHaveLength(1);
    expect(limited.body.total).toBeGreaterThan(1);
    expect((limited.body.items as { startable: boolean }[])[0]?.startable).toBe(true);

    expect((await harness.request('/catalogo?limit=0')).status).toBe(400);
    expect((await harness.request('/catalogo?limit=abc')).status).toBe(400);
    expect((await harness.request(`/catalogo?q=${'x'.repeat(100)}`)).status).toBe(400);
  });

  it('reads the flow handlers only, and says the list of brands is not there yet', async () => {
    const harness = await harnessFor({});

    await harness.module.start();
    harness.fake.resetCalls();
    const catalogue = await harness.request('/catalogo');
    expect(catalogue.status).toBe(200);
    expect(catalogue.body).toMatchObject({ degraded: true });
    expect(String(catalogue.body.message)).toContain("L'elenco completo delle marche non è ancora");
    expect(harness.fake.callsFor('GET /api/config/config_entries/flow_handlers')).toHaveLength(1);
    expect(harness.fake.callsFor('integration/descriptions')).toHaveLength(0);
  });

  it('tells a refusal of HA in general words, and talks about the TV only for the power-on recipe', async () => {
    const harness = await harnessFor({});
    const { deviceId } = await addTv(harness);

    harness.fake.knobs.areaCreateRefused = true;
    const room = await harness.request('/stanze', { method: 'POST', body: { name: 'Camera' } });
    expect(room.status).toBe(409);
    expect(room.body).toMatchObject({ code: 'AREA_EXISTS' });

    harness.fake.knobs.deviceUpdateFails = true;
    const renamed = await harness.request(`/dispositivi/${deviceId}`, {
      method: 'PATCH',
      body: { name: 'TV camera' },
    });
    expect(renamed.status).toBe(502);
    expect(renamed.body).toMatchObject({ code: 'HA_REFUSED' });
    expect(String(renamed.body.error)).not.toContain('accensione');
    expect(String(renamed.body.error)).toContain('Home Assistant ha rifiutato');
  });

  it('gives a customer no way to start Wake on LAN or to pass its MAC, port or broadcast address', async () => {
    const harness = await harnessFor({});
    harness.fake.resetCalls();

    // The flow of Wake on LAN cannot be started by anybody through the facade...
    for (const user of ['customer', 'installer'] as const) {
      const refused = await harness.request('/flussi', {
        method: 'POST',
        user,
        body: { handler: 'wake_on_lan' },
      });
      expect(refused.status).toBe(403);
      expect(refused.body.code).toBe('REQUIRES_INSTALLER');
    }
    expect(harness.fake.callsFor(FLOW_START)).toHaveLength(0);

    // ...and the fields of its flow are refused on the one flow a customer can run.
    const started = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    const flowId = started.body.flowId as string;
    for (const input of [
      { host: CANARY.tvHost, mac: CANARY.mac },
      { host: CANARY.tvHost, broadcast_address: '8.8.8.8', broadcast_port: 53 },
      { mac: CANARY.mac, broadcast_address: '192.168.1.255', broadcast_port: 9 },
    ]) {
      const refusedInput = await harness.request(`/flussi/${flowId}`, {
        method: 'POST',
        body: { input },
      });
      expect(refusedInput.status).toBe(400);
    }
    expect(harness.fake.entries.filter((entry) => entry.domain === 'wake_on_lan')).toHaveLength(0);
    expect(harness.fake.callsFor(FLOW_STEP)).toHaveLength(0);
  });

  it('refuses an address that is not on the local network, and a name', async () => {
    const harness = await harnessFor({});
    const started = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    const flowId = started.body.flowId as string;
    for (const host of ['8.8.8.8', '127.0.0.1', '172.30.32.1', 'tv.local', 'localhost']) {
      const refused = await harness.request(`/flussi/${flowId}`, {
        method: 'POST',
        body: { input: { host } },
      });
      expect(refused.status).toBe(400);
      expect(refused.body).toMatchObject({ code: 'INVALID_INPUT', field: 'host' });
    }
    expect(harness.fake.callsFor(FLOW_STEP)).toHaveLength(0);
  });

  it('has no other route: unknown paths are 404, unknown body keys are 400', async () => {
    const harness = await harnessFor({});
    for (const path of ['/config', '/integrazioni', '/utenti', '/flussi/x/y', '/voci']) {
      const result = await harness.request(path);
      expect(result.status).toBe(404);
    }
    expect(
      (
        await harness.request('/flussi', {
          method: 'POST',
          body: { handler: 'webostv', domain: 'hue' },
        })
      ).status
    ).toBe(400);
    expect(
      (await harness.request('/flussi', { method: 'POST', body: { handler: 'Web OS' } })).status
    ).toBe(400);
    expect((await harness.request('/flussi', { method: 'POST', body: {} })).status).toBe(400);
    expect((await harness.request('/flussi/bad id!', { method: 'DELETE' })).status).toBe(404);
  });

  it('reserves the registry and the removal of the recipe to the installer', async () => {
    const harness = await harnessFor({});

    const customer = await harness.request('/registro');
    expect(customer.status).toBe(403);
    expect(customer.body.code).toBe('REQUIRES_INSTALLER');
    expect((await harness.request('/accensione/ABCDEF1234', { method: 'DELETE' })).status).toBe(
      403
    );

    const installer = await harness.request('/registro?limit=5', { user: 'installer' });
    expect(installer.status).toBe(200);
    expect(installer.body.actions).toBeInstanceOf(Array);
    expect((await harness.request('/registro?limit=1000', { user: 'installer' })).status).toBe(400);
  });

  it('answers 401 when the request carries no Home Assistant user', async () => {
    const harness = await harnessFor({});
    const result = await harness.request('/stato', { user: null });
    expect(result.status).toBe(401);
  });
});

describe('names and rooms', () => {
  it('names the device and puts it in a room created or chosen through the registries', async () => {
    const harness = await harnessFor({});
    const { entryId, deviceId } = await addTv(harness);

    const empty = await harness.request('/stanze');
    expect(empty.body).toEqual({ areas: [] });

    const created = await harness.request('/stanze', {
      method: 'POST',
      body: { name: 'Soggiorno' },
    });
    expect(created.status).toBe(201);
    const areaId = (created.body as { id: string }).id;
    // The same name again is the same room, not a second one.
    const same = await harness.request('/stanze', { method: 'POST', body: { name: 'soggiorno' } });
    expect((same.body as { id: string }).id).toBe(areaId);
    expect(harness.fake.areas).toHaveLength(1);

    const updated = await harness.request(`/dispositivi/${deviceId}`, {
      method: 'PATCH',
      body: { name: 'TV del soggiorno', areaId },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: deviceId,
      name: 'TV del soggiorno',
      areaId,
      areaName: 'Soggiorno',
    });

    const entry = await harness.request(`/voci/${entryId}`);
    expect(entry.body).toMatchObject({
      device: { name: 'TV del soggiorno', areaName: 'Soggiorno' },
    });

    // Resetting the name and removing the room.
    const reset = await harness.request(`/dispositivi/${deviceId}`, {
      method: 'PATCH',
      body: { name: null, areaId: null },
    });
    expect(reset.body).toMatchObject({
      name: 'LG webOS TV UA751C0LA',
      areaId: null,
      areaName: null,
    });
  });

  it.each([
    ['an unknown room', { areaId: 'does_not_exist' }, 404, 'AREA_NOT_FOUND'],
    ['an empty name', { name: '   ' }, 400, 'INVALID_INPUT'],
    ['a name with control characters', { name: 'TV\u0007' }, 400, 'INVALID_INPUT'],
    ['a name that is too long', { name: 'x'.repeat(61) }, 400, 'INVALID_INPUT'],
    ['a name that is not text', { name: 5 }, 400, 'INVALID_INPUT'],
    ['an extra key', { name: 'TV', hidden: true }, 400, 'INVALID_INPUT'],
    ['nothing to change', {}, 400, 'INVALID_INPUT'],
  ])('refuses %s', async (_label, body, status, code) => {
    const harness = await harnessFor({});
    const { deviceId } = await addTv(harness);
    const result = await harness.request(`/dispositivi/${deviceId}`, { method: 'PATCH', body });
    expect(result.status).toBe(status);
    expect(result.body.code).toBe(code);
  });

  it('does not touch devices that belong to other integrations', async () => {
    const harness = await harnessFor({});
    // A device of an integration outside the list, and a device shared with one.
    harness.fake.entries.push({
      entry_id: 'HUE0000001',
      domain: 'hue',
      title: 'Hue',
      loadedAt: 0,
      host: null,
      mac: null,
    });
    harness.fake.devices.push({
      id: 'hue-device-1',
      name: 'Lampada',
      name_by_user: null,
      manufacturer: 'Philips',
      model: 'Bridge',
      area_id: null,
      primary_config_entry: 'HUE0000001',
      connections: [],
      serial_number: '',
    });

    const result = await harness.request('/dispositivi/hue-device-1', {
      method: 'PATCH',
      body: { name: 'Nuovo' },
    });
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('REQUIRES_INSTALLER');
    expect(harness.fake.callsFor('config/device_registry/update')).toHaveLength(0);

    expect(
      (
        await harness.request('/dispositivi/unknown-device', {
          method: 'PATCH',
          body: { name: 'Nuovo' },
        })
      ).status
    ).toBe(404);
    expect((await harness.request('/voci/HUE0000001')).status).toBe(403);
    expect((await harness.request('/voci/NOSUCHENTRY1')).status).toBe(404);
  });

  it('keeps the Wake on LAN device out of sight: its name would carry the MAC', async () => {
    const harness = await harnessFor({});
    const entry = harness.fake.seedWakeOnLan(CANARY.mac);

    const described = await harness.request(`/voci/${entry.entry_id}`);
    expect(described.status).toBe(200);
    expect(described.body).toMatchObject({
      domain: 'wake_on_lan',
      title: 'Accensione via rete',
      device: { name: 'Accensione via rete' },
    });
    expect(JSON.stringify(described.body)).not.toContain(CANARY.mac);
    expect(JSON.stringify(described.body)).not.toContain('wake_on_lan_0200');
  });
});

describe('compatibility check with the Home Assistant in use', () => {
  it('logs the verified version at start-up and switches nothing off', async () => {
    const harness = await harnessFor({});
    await harness.module.start();

    expect(
      harness.logs.some(
        (line) => line.includes('Home Assistant 2026.9.4') && line.includes('verified version')
      )
    ).toBe(true);
    const status = await harness.request('/stato', { user: 'installer' });
    expect(status.body).toMatchObject({
      homeAssistant: { reachable: true, version: '2026.9.4', verified: true, onboarded: true },
      features: { catalog: true, flows: true, power: true },
      warnings: [],
      startableHandlers: ['webostv'],
    });
  });

  it('warns the installer, and only the installer, about a version that was not verified', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.version = '2026.10.2';
    await harness.module.start();

    expect(harness.logs.some((line) => line.includes('unverified version'))).toBe(true);
    const installer = await harness.request('/stato', { user: 'installer' });
    expect(installer.body).toMatchObject({
      homeAssistant: { version: '2026.10.2', verified: false },
    });
    expect(String((installer.body.warnings as string[])[0])).toContain(
      'non è stata ancora provata'
    );

    const customer = await harness.request('/stato');
    expect(customer.body.warnings).toBeUndefined();
    expect((customer.body.homeAssistant as { version?: string }).version).toBeUndefined();
    // The function itself stays on: the probes are the real test.
    expect(customer.body).toMatchObject({ features: { flows: true } });
  });

  it('switches adding off, with a message, when the flow handlers lack the listed integrations (RD-02)', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.hiddenHandlers = ['webostv'];
    await harness.module.start();

    const status = await harness.request('/stato', { user: 'installer' });
    expect(status.body).toMatchObject({ features: { catalog: false, flows: false, power: false } });
    expect(JSON.stringify(status.body.warnings)).toContain('RD-02');

    const result = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('FEATURE_UNAVAILABLE');
    expect(String(result.body.error)).toContain(
      'Su questo sistema non è possibile aggiungere dispositivi da qui'
    );
    expect(harness.fake.callsFor(FLOW_START)).toHaveLength(0);
  });

  it('keeps everything off while the service is not active, and checks before the first write once it is', async () => {
    const harness = await harnessFor({ activeService: false });
    await harness.module.start();

    const before = await harness.request('/stato', { user: 'installer' });
    expect(before.body).toMatchObject({ features: { catalog: false, flows: false, power: false } });

    // The person runs `activate`: the secret appears, with no restart of the backend.
    harness.module.identity.store.save({
      version: 1,
      token: harness.serviceToken,
      userId: harness.serviceUserId,
      userName: 'Acasystem (servizio)',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3650 * 86_400_000).toISOString(),
      haVersion: harness.fake.knobs.version,
    });
    harness.fake.knobs.flowDeleteBodyChanged = true;
    await sleep(SLEEP_PAST_CACHE_MS);

    // The report made without the service is not reused: the probes run now, RD-03 fails,
    // and the first write is refused although the identity is already working.
    const refused = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(refused.status).toBe(503);
    expect(refused.body.code).toBe('FEATURE_UNAVAILABLE');
    expect(harness.fake.callsFor(FLOW_START)).toHaveLength(0);

    harness.fake.knobs.flowDeleteBodyChanged = false;
    harness.module.compat.invalidate();
    const accepted = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(accepted.status).toBe(201);
  });

  it('keeps the flows off when a probe could not run, and runs it again soon', async () => {
    let offset = 0;
    const harness = await harnessFor({ module: { now: () => Date.now() + offset } });
    harness.fake.knobs.flowDeleteServerError = true;
    await harness.module.start();

    const status = await harness.request('/stato', { user: 'installer' });
    expect(status.body).toMatchObject({ features: { catalog: true, flows: false, power: false } });
    expect(JSON.stringify(status.body.warnings)).toContain('RD-03');
    const refused = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(refused.status).toBe(503);

    // The report with a probe that did not run is trusted for a few seconds only.
    harness.fake.knobs.flowDeleteServerError = false;
    offset += 10_000;
    const accepted = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(accepted.status).toBe(201);
  });

  it('keeps the power-on recipe off when its probe could not run (RD-07)', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.automationGetServerError = true;
    await harness.module.start();

    const status = await harness.request('/stato', { user: 'installer' });
    expect(status.body).toMatchObject({ features: { flows: true, power: false } });
    expect(JSON.stringify(status.body.warnings)).toContain('RD-07');
    const power = await harness.request('/accensione/ABCDEF1234', { method: 'POST', body: {} });
    expect(power.status).toBe(503);
    expect(power.body.code).toBe('FEATURE_UNAVAILABLE');
  });

  it('keeps the writes off on a version that was neither verified nor compared, unless the installer allows them', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.version = '2099.1.0';
    await harness.module.start();

    const status = await harness.request('/stato', { user: 'installer' });
    expect(status.body).toMatchObject({ features: { catalog: true, flows: false, power: false } });
    expect(JSON.stringify(status.body.warnings)).toContain('DEVICES_ALLOW_UNVERIFIED_HA_VERSION');
    const refused = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(refused.status).toBe(503);
    expect(harness.fake.callsFor(FLOW_START)).toHaveLength(0);

    vi.stubEnv('DEVICES_ALLOW_UNVERIFIED_HA_VERSION', '1');
    harness.module.compat.invalidate();
    const accepted = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(accepted.status).toBe(201);
  });

  it('switches adding off when the flow route does not answer as expected (RD-03)', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.flowDeleteBodyChanged = true;
    await harness.module.start();

    const result = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('FEATURE_UNAVAILABLE');
  });

  it('switches only the power-on recipe off when the automation route changed (RD-07)', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.automationRouteChanged = true;
    await harness.module.start();

    const status = await harness.request('/stato', { user: 'installer' });
    expect(status.body).toMatchObject({ features: { flows: true, power: false } });
    expect(
      (await harness.request('/flussi', { method: 'POST', body: { handler: 'webostv' } })).status
    ).toBe(201);
    const power = await harness.request('/accensione/ABCDEF1234', { method: 'POST', body: {} });
    expect(power.status).toBe(503);
    expect(power.body.code).toBe('FEATURE_UNAVAILABLE');
  });

  it('closes the whole facade while HA is not set up (RD-01)', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.onboarded = false;
    await harness.module.start();

    const status = await harness.request('/stato', { user: 'installer' });
    expect(status.body).toMatchObject({
      homeAssistant: { onboarded: false },
      features: { catalog: false, flows: false, power: false },
    });
    expect(JSON.stringify(status.body.warnings)).toContain('non è ancora stato configurato');
  });

  it('logs that HA is unreachable at start-up instead of failing', async () => {
    const harness = await harnessFor({});
    await harness.fake.stop();
    await expect(harness.module.start()).resolves.toBeUndefined();
    expect(harness.logs.some((line) => line.includes('unreachable'))).toBe(true);
  });

  it('keeps the secret and the registry free of what must not be there', async () => {
    const harness = await harnessFor({});
    await harness.module.start();
    await addTv(harness);

    const visible = everythingVisible(harness);
    expect(visible).not.toContain(harness.serviceToken);
    expect(visible).not.toContain(CANARY.tvHost);
  });
});

describe('a TV that does not answer after pairing', () => {
  it('returns the entry as not ready, with a sentence for the person, and does not wait forever', async () => {
    const harness = await harnessFor({ module: { entryLoadTimeoutMs: 200 } });
    harness.fake.knobs.loadDelayMs = 60_000;

    const started = await harness.request('/flussi', {
      method: 'POST',
      body: { handler: 'webostv' },
    });
    const flowId = started.body.flowId as string;
    await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { host: CANARY.tvHost } },
    });
    const begun = Date.now();
    const created = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });

    expect(Date.now() - begun).toBeLessThan(2_000);
    expect(created.body).toMatchObject({
      type: 'create_entry',
      pending: true,
      entry: { loaded: false, state: 'setup_in_progress', device: null, entities: [] },
    });
    expect(String((created.body.entry as { message: string }).message)).toContain(
      'si sta avviando'
    );

    const entryId = created.body.entryId as string;
    const tv = harness.fake.entries.find((entry) => entry.entry_id === entryId);
    if (!tv) throw new Error('missing TV entry');
    tv.forcedState = 'setup_retry';
    const unplugged = await harness.request(`/voci/${entryId}`);
    expect(unplugged.body).toMatchObject({ loaded: false, state: 'setup_retry' });
    expect(String(unplugged.body.message)).toContain('controlla che sia acceso');

    tv.forcedState = 'setup_error';
    expect(String((await harness.request(`/voci/${entryId}`)).body.message)).toContain(
      "Chiedi all'installatore"
    );

    tv.forcedState = 'loaded';
    const ready = await harness.request(`/voci/${entryId}`);
    expect(ready.body).toMatchObject({ loaded: true, message: null });
  });
});
