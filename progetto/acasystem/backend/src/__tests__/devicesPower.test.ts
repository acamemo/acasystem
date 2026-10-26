// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { CANARY, createHarness, dumpDatabase, everythingVisible } from './devicesHarness.ts';
import type { Harness, HarnessOptions } from './devicesHarness.ts';

/**
 * The power-on recipe (D1b): a Wake on LAN entry plus one automation with the turn-on trigger
 * of webostv, built by the server from ids it reads in the registries of HA. The MAC comes
 * from HA or from the installer and is never stored, logged or returned.
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

const AUTOMATION_PUT = 'POST /api/config/automation/config/{id}';
const MAC_FORMS = [
  CANARY.mac,
  CANARY.mac.replaceAll(':', ''),
  CANARY.mac.replaceAll(':', '_'),
  CANARY.mac.replaceAll(':', '-'),
];

const addTv = async (harness: Harness) => {
  const started = await harness.request('/flussi', {
    method: 'POST',
    body: { handler: 'webostv' },
  });
  const flowId = started.body.flowId as string;
  await harness.request(`/flussi/${flowId}`, {
    method: 'POST',
    body: { input: { host: CANARY.tvHost } },
  });
  const created = await harness.request(`/flussi/${flowId}`, {
    method: 'POST',
    body: { input: {} },
  });
  return (created.body.entry as { entryId: string }).entryId;
};

const expectNoMac = (text: string): void => {
  for (const form of MAC_FORMS) expect(text.toLowerCase()).not.toContain(form.toLowerCase());
};

describe('setting up the power-on recipe', () => {
  it('answers with the sentence about the power-on recipe when HA refuses to write it', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    const entryId = await addTv(harness);
    harness.fake.knobs.automationPutFails = true;

    const result = await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    expect(result.status).toBe(502);
    expect(result.body.code).toBe('RECIPE_FAILED');
    expect(String(result.body.error)).toContain('accensione');
  });

  it('builds the recipe for a customer when HA knows the MAC of the TV', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    const entryId = await addTv(harness);
    harness.fake.resetCalls();

    const result = await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      entryId,
      configured: true,
      active: true,
      message: null,
      macSource: 'home_assistant',
    });

    // A Wake on LAN entry exists in HA, its button is hidden, and one automation was written.
    const wol = harness.fake.entries.find((entry) => entry.domain === 'wake_on_lan');
    expect(wol?.mac).toBe(CANARY.mac);
    const button = harness.fake.entities.find((entity) => entity.platform === 'wake_on_lan');
    expect(button?.hidden_by).toBe('user');

    const [automationId, automation] = [...harness.fake.automations.entries()][0] ?? [];
    expect(automationId).toBe(`acasystem_accensione_${entryId.toLowerCase()}`);
    const tv = harness.fake.devices.find((device) => device.primary_config_entry === entryId);
    expect(automation).toMatchObject({
      id: automationId,
      mode: 'single',
      triggers: [
        { trigger: 'device', domain: 'webostv', type: 'webostv.turn_on', device_id: tv?.id },
      ],
      conditions: [],
      actions: [{ action: 'button.press', target: { entity_id: button?.entity_id } }],
    });

    // The body was validated before it was written, and everything was done as the service user.
    const order = harness.fake.calls.map((call) => call.route);
    expect(order.indexOf('validate_config')).toBeGreaterThan(-1);
    expect(order.indexOf('validate_config')).toBeLessThan(order.indexOf(AUTOMATION_PUT));
    expect(
      harness.fake.calls
        .filter((call) => call.userId !== null)
        .every((call) => call.userId === harness.serviceUserId)
    ).toBe(true);

    // The link row has ids only. The MAC is in HA and nowhere in Acasystem.
    expect(harness.database.prepare('SELECT * FROM device_power_links').all()).toEqual([
      expect.objectContaining({
        webostv_entry_id: entryId,
        wol_entry_id: wol?.entry_id,
        automation_id: automationId,
        device_id: tv?.id,
        media_player_entity_id: 'media_player.lg_webos_tv_ua751c0la',
        trigger_form: 'device',
        created_by: 'user-customer',
      }),
    ]);
    expectNoMac(dumpDatabase(harness.database));
    expectNoMac(everythingVisible(harness));

    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'power.setup',
          domain: 'webostv',
          entryId,
          outcome: 'ok',
          code: 'mac_from_ha',
        }),
      ])
    );
  });

  it('asks the installer for the MAC when HA has none, and never invents one', async () => {
    const harness = await harnessFor({});
    const entryId = await addTv(harness);
    harness.fake.resetCalls();

    const result = await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    expect(result.status).toBe(409);
    expect(result.body.code).toBe('MAC_REQUIRED');
    expect(String(result.body.error)).toContain("Lo inserisce l'installatore");
    expect(harness.fake.entries.filter((entry) => entry.domain === 'wake_on_lan')).toHaveLength(0);
    expect(harness.fake.automations.size).toBe(0);
    expect(harness.fake.callsFor('POST /api/config/config_entries/flow')).toHaveLength(0);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_power_links').get()).toEqual({
      n: 0,
    });
  });

  it('takes the MAC from the installer only, and checks it', async () => {
    const harness = await harnessFor({});
    const entryId = await addTv(harness);

    const byCustomer = await harness.request(`/accensione/${entryId}`, {
      method: 'POST',
      body: { mac: CANARY.mac },
    });
    expect(byCustomer.status).toBe(403);
    expect(byCustomer.body.code).toBe('REQUIRES_INSTALLER');
    const byCustomerBroadcast = await harness.request(`/accensione/${entryId}`, {
      method: 'POST',
      body: { broadcastAddress: '192.168.1.255' },
    });
    expect(byCustomerBroadcast.status).toBe(403);
    expect(harness.fake.entries.filter((entry) => entry.domain === 'wake_on_lan')).toHaveLength(0);

    for (const [body, field] of [
      [{ mac: 'not a mac' }, 'mac'],
      [{ mac: 'ff:ff:ff:ff:ff:ff' }, 'mac'],
      [{ mac: CANARY.mac, broadcastAddress: '127.0.0.1' }, 'broadcastAddress'],
      [{ mac: CANARY.mac, broadcastPort: 70000 }, 'broadcastPort'],
    ] as const) {
      const invalid = await harness.request(`/accensione/${entryId}`, {
        method: 'POST',
        user: 'installer',
        body,
      });
      expect(invalid.status).toBe(400);
      expect(invalid.body).toMatchObject({ code: 'INVALID_INPUT', field });
    }
    expect(harness.fake.entries.filter((entry) => entry.domain === 'wake_on_lan')).toHaveLength(0);

    const ok = await harness.request(`/accensione/${entryId}`, {
      method: 'POST',
      user: 'installer',
      body: { mac: CANARY.mac.toUpperCase(), broadcastAddress: '192.168.1.255', broadcastPort: 9 },
    });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ configured: true, active: true, macSource: 'installer' });
    expect(harness.fake.entries.find((entry) => entry.domain === 'wake_on_lan')?.mac).toBe(
      CANARY.mac
    );
    expectNoMac(JSON.stringify(ok.body));
    expectNoMac(everythingVisible(harness));
  });

  it('refuses ids in the body: the server finds the device and the entities itself', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    const entryId = await addTv(harness);

    for (const key of ['deviceId', 'entityId', 'automationId', 'id', 'buttonEntityId', 'trigger']) {
      const result = await harness.request(`/accensione/${entryId}`, {
        method: 'POST',
        user: 'installer',
        body: { [key]: 'foreign' },
      });
      expect(result.status).toBe(400);
      expect(result.body).toMatchObject({ code: 'INVALID_INPUT', field: key });
    }
    expect(harness.fake.automations.size).toBe(0);
  });

  it('answers 404 for an entry that is not a TV of the list', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    await addTv(harness);
    const wol = harness.fake.seedWakeOnLan(CANARY.mac);

    for (const entryId of ['NOSUCHENTRY1', wol.entry_id]) {
      const result = await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
      expect(result.status).toBe(404);
      expect(result.body.code).toBe('ENTRY_NOT_FOUND');
    }
    expect(
      (await harness.request('/accensione/bad%20id', { method: 'POST', body: {} })).status
    ).toBe(404);
    expect(harness.fake.automations.size).toBe(0);
  });

  it('waits for the TV entry to be loaded, then gives up with a clear message', async () => {
    const harness = await harnessFor({ module: { entryLoadTimeoutMs: 300 } });
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    const entryId = await addTv(harness);
    const tvEntry = harness.fake.entries.find((entry) => entry.entry_id === entryId);
    if (!tvEntry) throw new Error('missing TV entry');
    tvEntry.loadedAt = Date.now() + 60_000;

    const result = await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    expect(result.status).toBe(409);
    expect(result.body.code).toBe('ENTRY_NOT_READY');
    expect(harness.fake.automations.size).toBe(0);
  });

  it('is repeatable: the second setup reuses the Wake on LAN entry and the automation', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    const entryId = await addTv(harness);

    await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    const again = await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ configured: true, active: true });
    expect(harness.fake.entries.filter((entry) => entry.domain === 'wake_on_lan')).toHaveLength(1);
    expect(harness.fake.automations.size).toBe(1);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_power_links').get()).toEqual({
      n: 1,
    });
    // Setting up again does not need the MAC any more.
    harness.fake.devices.forEach((device) => {
      device.connections = [];
    });
    expect(
      (await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} })).status
    ).toBe(200);
  });

  it('reuses a Wake on LAN entry for the same MAC that already exists in HA', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    const entryId = await addTv(harness);
    const existing = harness.fake.seedWakeOnLan(CANARY.mac);

    const result = await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    expect(result.status).toBe(200);
    expect(harness.fake.entries.filter((entry) => entry.domain === 'wake_on_lan')).toHaveLength(1);
    expect(harness.database.prepare('SELECT wol_entry_id FROM device_power_links').get()).toEqual({
      wol_entry_id: existing.entry_id,
    });
  });

  it('tries the other trigger form when the TV does not show the turn-on feature (RD-08)', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    harness.fake.knobs.acceptedTriggerForms = ['platform'];
    const entryId = await addTv(harness);

    const result = await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    expect(result.body).toMatchObject({ configured: true, active: true });
    const automation = [...harness.fake.automations.values()][0];
    expect(automation?.triggers).toEqual([
      { trigger: 'webostv.turn_on', entity_id: ['media_player.lg_webos_tv_ua751c0la'] },
    ]);
    expect(harness.database.prepare('SELECT trigger_form FROM device_power_links').get()).toEqual({
      trigger_form: 'platform',
    });
    // Both forms were written to the same id: still one automation.
    expect(harness.fake.automations.size).toBe(1);
  });

  it('says the power-on is not active when no form works, and records it', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    harness.fake.knobs.acceptedTriggerForms = [];
    const entryId = await addTv(harness);

    const result = await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      configured: true,
      active: false,
      message: "L'accensione da spento non è attiva.",
    });

    const status = await harness.request(`/accensione/${entryId}`);
    expect(status.body).toMatchObject({
      configured: true,
      active: false,
      message: "L'accensione da spento non è attiva.",
    });
    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'power.setup', outcome: 'error', code: 'RD-08' }),
      ])
    );
  });
});

describe('state and removal of the recipe', () => {
  const configured = async (harness: Harness) => {
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    const entryId = await addTv(harness);
    await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    return entryId;
  };

  it('reports "not configured" before and "works" after, from the live state of HA', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.tvMacInRegistry = CANARY.mac;
    const entryId = await addTv(harness);

    expect((await harness.request(`/accensione/${entryId}`)).body).toEqual({
      entryId,
      configured: false,
      active: null,
      message: null,
    });

    await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    expect((await harness.request(`/accensione/${entryId}`)).body).toEqual({
      entryId,
      configured: true,
      active: true,
      message: null,
    });
    expect((await harness.request(`/voci/${entryId}`)).body).toMatchObject({
      power: { configured: true },
    });
  });

  it('notices an automation that was deleted in HA and puts it back without a second Wake on LAN entry', async () => {
    const harness = await harnessFor({});
    const entryId = await configured(harness);
    harness.fake.automations.clear();

    const broken = await harness.request(`/accensione/${entryId}`);
    expect(broken.body).toMatchObject({ configured: false, active: false });

    const repaired = await harness.request(`/accensione/${entryId}`, { method: 'POST', body: {} });
    expect(repaired.body).toMatchObject({ configured: true, active: true });
    expect(harness.fake.entries.filter((entry) => entry.domain === 'wake_on_lan')).toHaveLength(1);
    expect(harness.fake.automations.size).toBe(1);
  });

  it('leaves the removal to the installer and removes everything the link records', async () => {
    const harness = await harnessFor({});
    const entryId = await configured(harness);
    const wolEntryId = harness.fake.entries.find(
      (entry) => entry.domain === 'wake_on_lan'
    )?.entry_id;

    const byCustomer = await harness.request(`/accensione/${entryId}`, { method: 'DELETE' });
    expect(byCustomer.status).toBe(403);
    expect(harness.fake.automations.size).toBe(1);

    const removed = await harness.request(`/accensione/${entryId}`, {
      method: 'DELETE',
      user: 'installer',
    });
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ removed: true });
    expect(harness.fake.automations.size).toBe(0);
    expect(harness.fake.entries.some((entry) => entry.entry_id === wolEntryId)).toBe(false);
    expect(harness.fake.entities.some((entity) => entity.platform === 'wake_on_lan')).toBe(false);
    // The TV itself is untouched, and the link row is gone: complete removal.
    expect(harness.fake.entries.some((entry) => entry.entry_id === entryId)).toBe(true);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_power_links').get()).toEqual({
      n: 0,
    });

    const again = await harness.request(`/accensione/${entryId}`, {
      method: 'DELETE',
      user: 'installer',
    });
    expect(again.status).toBe(404);
    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'power.remove', entryId, outcome: 'ok' }),
      ])
    );
  });

  it('removes only what it created: a foreign id never reaches HA', async () => {
    const harness = await harnessFor({});
    const entryId = await configured(harness);
    harness.fake.automations.set('user_own_automation', { triggers: [], actions: [] });
    harness.fake.resetCalls();

    await harness.request('/accensione/OTHERENTRY1', { method: 'DELETE', user: 'installer' });
    expect(harness.fake.calls.filter((call) => call.userId !== null)).toHaveLength(0);
    expect(harness.fake.automations.has('user_own_automation')).toBe(true);

    await harness.request(`/accensione/${entryId}`, { method: 'DELETE', user: 'installer' });
    expect(harness.fake.automations.has('user_own_automation')).toBe(true);
    expect(harness.fake.automations.size).toBe(1);
  });

  it('keeps the link when HA is unreachable during the removal', async () => {
    const harness = await harnessFor({});
    const entryId = await configured(harness);

    await harness.fake.stop();
    const failed = await harness.request(`/accensione/${entryId}`, {
      method: 'DELETE',
      user: 'installer',
    });
    expect(failed.status).toBe(503);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_power_links').get()).toEqual({
      n: 1,
    });
  });
});

describe('the MAC does not leave HA', () => {
  it('is in no response, log, console message, registry row, link row or table of tunet.db', async () => {
    const harness = await harnessFor({});
    const entryId = await addTv(harness);

    await harness.request(`/accensione/${entryId}`, {
      method: 'POST',
      user: 'installer',
      body: { mac: CANARY.mac, broadcastAddress: '192.168.1.255' },
    });
    await harness.request(`/accensione/${entryId}`);
    await harness.request(`/voci/${entryId}`);
    await harness.request('/registro', { user: 'installer' });
    const wol = harness.fake.entries.find((entry) => entry.domain === 'wake_on_lan');
    await harness.request(`/voci/${wol?.entry_id}`);

    const visible = everythingVisible(harness);
    expectNoMac(visible);
    expect(visible).not.toContain(CANARY.tvHost);
    expect(visible).not.toContain(harness.serviceToken);
    expect(visible).not.toContain('192.168.1.255');
  });
});
