// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PLATFORM_FAMILY } from '../config/deviceFamilies.ts';
import { SOURCE_DIR } from '../config/paths.ts';
import { createHarness, dumpDatabase, everythingVisible } from './devicesHarness.ts';
import type { Harness, HarnessOptions } from './devicesHarness.ts';
import type { DiscoveryOptions } from './fakeHomeAssistant.ts';

/**
 * Devices that HA found on the network (F2, ADR-0024) and the pairing of each family (F3),
 * against the fake HA: the list, taking a discovery over, ignoring it, ownership, the steps
 * Acasystem refuses, the registry of actions and what must not leak.
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

// HA 2026.10.4 lists the flows only on the WebSocket (the REST GET answers 405).
const FLOW_LIST = 'config_entries/flow/progress';
const FLOW_READ = 'GET /api/config/config_entries/flow/{flow_id}';
const FLOW_DELETE = 'DELETE /api/config/config_entries/flow/{flow_id}';

const samsung = (overrides: Partial<DiscoveryOptions> = {}): DiscoveryOptions => ({
  handler: 'samsungtv',
  name: 'Samsung 7 Series (49)',
  model: 'UE49NU7100',
  steps: [{ stepId: 'confirm', schema: [] }],
  entry: {
    title: 'Samsung 7 Series (49)',
    manufacturer: 'Samsung',
    model: 'UE49NU7100',
    entityId: 'media_player.samsung_7_series_49',
  },
  ...overrides,
});

const hue = (overrides: Partial<DiscoveryOptions> = {}): DiscoveryOptions => ({
  handler: 'hue',
  name: 'Philips Hue',
  model: 'BSB002',
  steps: [{ stepId: 'link', schema: [] }],
  entry: {
    title: 'Philips Hue',
    manufacturer: 'Signify',
    model: 'BSB002',
    entityId: 'light.hue_lamp',
  },
  ...overrides,
});

const homekit = (overrides: Partial<DiscoveryOptions> = {}): DiscoveryOptions => ({
  handler: 'homekit_controller',
  source: 'zeroconf',
  name: 'Termostato soggiorno',
  steps: [
    {
      stepId: 'pair',
      schema: [{ name: 'pairing_code', required: true, selector: { text: { type: 'text' } } }],
      check: (body) => (body.pairing_code === '314-15-926' ? null : 'authentication_error'),
    },
  ],
  entry: {
    title: 'Termostato soggiorno',
    manufacturer: 'Ecobee',
    model: 'T1',
    entityId: 'climate.soggiorno',
  },
  ...overrides,
});

interface DiscoveredItem {
  flowId: string;
  handler: string;
  source: string;
  name: string;
  model: string | null;
  family: string | null;
  addable: boolean;
  reason?: string;
}

const listDiscovered = async (harness: Harness, user: 'customer' | 'customer2' = 'customer') => {
  const result = await harness.request('/scoperti', { user });
  return { ...result, devices: (result.body.devices ?? []) as DiscoveredItem[] };
};

describe('the list of discovered devices', () => {
  it('lists the discoveries only, with family, model and what can be added', async () => {
    const harness = await harnessFor({});
    for (const source of ['zeroconf', 'ssdp', 'dhcp', 'usb', 'bluetooth', 'homekit', 'mqtt']) {
      harness.fake.seedDiscovery(hue({ source, uniqueId: `u-${source}` }));
    }
    harness.fake.seedDiscovery(samsung({ source: 'integration_discovery' }));
    harness.fake.seedDiscovery(samsung({ source: 'discovery', uniqueId: 'u-discovery' }));
    // Somebody else's flows and the system's: never listed.
    for (const source of ['reauth', 'reconfigure', 'import', 'system', 'hassio', 'unignore']) {
      harness.fake.seedDiscovery(hue({ source, uniqueId: `x-${source}` }));
    }

    const { status, devices } = await listDiscovered(harness);
    expect(status).toBe(200);
    expect(devices).toHaveLength(9);
    expect(devices.map((device) => device.source).sort()).toEqual(
      [
        'bluetooth',
        'dhcp',
        'discovery',
        'homekit',
        'integration_discovery',
        'mqtt',
        'ssdp',
        'usb',
        'zeroconf',
      ].sort()
    );

    const tv = devices.find((device) => device.handler === 'samsungtv');
    expect(tv).toMatchObject({
      name: 'Samsung 7 Series (49)',
      model: 'UE49NU7100',
      family: 'tv',
      addable: true,
    });
    expect(tv).not.toHaveProperty('reason');
    expect(devices.find((device) => device.handler === 'hue')).toMatchObject({
      family: 'light',
      addable: true,
    });

    // A customer reads the list through the service token, not through anything of their own.
    const calls = harness.fake.callsFor(FLOW_LIST);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ userId: harness.serviceUserId, tokenKind: 'llat' });
    // Reading the list is not written to the registry (it is polled).
    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual([]);
  });

  it('orders by integration and falls back on a name for a person when HA gives none', async () => {
    const harness = await harnessFor({});
    harness.fake.seedDiscovery(samsung({ name: undefined, model: undefined }));
    harness.fake.seedDiscovery(hue({ name: undefined }));

    const { devices } = await listDiscovered(harness);
    expect(devices.map((device) => device.handler)).toEqual(['hue', 'samsungtv']);
    expect(devices.map((device) => device.name)).toEqual(['Philips Hue', 'Televisore Samsung']);
    expect(devices[1]?.model).toBeNull();
  });

  it('never shows an address or a MAC as the name of a device', async () => {
    const harness = await harnessFor({});
    harness.fake.seedDiscovery(samsung({ name: 'TV 192.168.1.77', model: '02:00:00:00:00:09' }));

    const { devices } = await listDiscovered(harness);
    expect(devices[0]).toMatchObject({ name: 'Televisore Samsung', model: null });
    expect(JSON.stringify(devices)).not.toContain('192.168');
    expect(JSON.stringify(devices)).not.toContain('02:00');
  });

  it('lists every integration as addable but the ones of Home Assistant, which it hides (F4)', async () => {
    const harness = await harnessFor({});
    for (const handler of ['nest', 'netatmo', 'tado', 'google', 'spotify', 'zha', 'mqtt']) {
      harness.fake.seedDiscovery(
        hue({ handler, name: handler, uniqueId: `u-${handler}`, steps: [{ stepId: 'confirm' }] })
      );
    }
    harness.fake.seedDiscovery(
      hue({ handler: 'matter', name: 'Presa', uniqueId: 'u-matter', steps: [{ stepId: 'x' }] })
    );
    harness.fake.seedDiscovery(hue({ handler: 'shelly', steps: [{ stepId: 'weird_step' }] }));
    harness.fake.seedDiscovery(hue({ name: 'Bridge', uniqueId: 'ok' }));
    // Home Assistant's own integrations are not devices: never listed.
    harness.fake.seedDiscovery(hue({ handler: 'hassio', name: 'Supervisor', uniqueId: 'u-hassio' }));
    harness.fake.seedDiscovery(hue({ handler: 'met', name: 'Meteo', uniqueId: 'u-met' }));

    const { devices } = await listDiscovered(harness);
    const byHandler = (handler: string) => devices.filter((device) => device.handler === handler);
    for (const handler of ['nest', 'netatmo', 'tado', 'google', 'spotify', 'zha', 'mqtt']) {
      expect(byHandler(handler)[0], handler).toMatchObject({ addable: true });
    }
    // An integration the facade does not know has no family, and can be added all the same.
    expect(byHandler('matter')[0]).toMatchObject({ family: null, addable: true });
    expect(byHandler('shelly')[0]).toMatchObject({ family: 'plug', addable: true });
    expect(byHandler('hue')[0]).toMatchObject({ addable: true });
    expect(byHandler('hassio')).toHaveLength(0);
    expect(byHandler('met')).toHaveLength(0);
  });

  it('answers "servizio non attivo" without calling HA when the service identity is missing', async () => {
    const harness = await harnessFor({ activeService: false });
    harness.fake.seedDiscovery(hue());
    harness.fake.resetCalls();

    const list = await harness.request('/scoperti');
    expect(list.status).toBe(503);
    expect(list.body.code).toBe('SERVICE_NOT_ACTIVE');
    expect(String(list.body.error)).toMatch(/^Servizio non attivo/);

    const flowId = [...harness.fake.flows.keys()][0] ?? '';
    for (const action of ['aggiungi', 'ignora']) {
      const refused = await harness.request(`/scoperti/${flowId}/${action}`, { method: 'POST' });
      expect(refused.status).toBe(503);
      expect(refused.body.code).toBe('SERVICE_NOT_ACTIVE');
    }
    expect(harness.fake.calls).toHaveLength(0);
    expect(harness.fake.flows.size).toBe(1);
  });

  it('needs a person logged in', async () => {
    const harness = await harnessFor({});
    const anonymous = await harness.request('/scoperti', { user: null });
    expect(anonymous.status).toBe(401);
  });
});

describe('taking a discovery over', () => {
  it("registers the flow as the person's own and carries it to a loaded, renamable entry", async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.loadDelayMs = 150;
    const flowId = harness.fake.seedDiscovery(samsung());
    harness.fake.resetCalls();

    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(added.status).toBe(200);
    expect(added.body).toMatchObject({
      type: 'form',
      flowId,
      handler: 'samsungtv',
      stepId: 'confirm',
      title: 'Accetta sul televisore',
      waitSeconds: 30,
      fields: [],
    });
    // The flow was read with the service token, nothing was cancelled or answered yet.
    expect(harness.fake.callsFor(FLOW_READ)[0]).toMatchObject({
      userId: harness.serviceUserId,
      tokenKind: 'llat',
    });
    expect(harness.fake.received).toEqual([]);

    // The flow is the person's: the existing endpoints accept it.
    expect(harness.database.prepare('SELECT ha_user_id, handler FROM device_flows').all()).toEqual([
      { ha_user_id: 'user-customer', handler: 'samsungtv' },
    ]);
    const own = await harness.request('/flussi');
    expect((own.body.flows as { flowId: string }[]).map((flow) => flow.flowId)).toEqual([flowId]);
    const read = await harness.request(`/flussi/${flowId}`);
    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({ stepId: 'confirm' });

    const done = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({
      type: 'create_entry',
      domain: 'samsungtv',
      pending: false,
      entry: {
        domain: 'samsungtv',
        loaded: true,
        entities: ['media_player.samsung_7_series_49'],
        mediaPlayerEntityId: 'media_player.samsung_7_series_49',
        device: { name: 'Samsung 7 Series (49)', manufacturer: 'Samsung' },
      },
    });
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });

    // Name and room work on the new device, because HA kept the discovery as its origin.
    const entry = done.body.entry as { device: { id: string } };
    const renamed = await harness.request(`/dispositivi/${entry.device.id}`, {
      method: 'PATCH',
      body: { name: 'Televisore camera' },
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ name: 'Televisore camera' });

    const registry = await harness.request('/registro', { user: 'installer' });
    const actions = (
      registry.body.actions as { action: string; outcome: string; domain: string | null }[]
    ).map((row) => `${row.action}:${row.outcome}:${row.domain}`);
    expect(actions).toEqual(
      expect.arrayContaining([
        'scoperti.aggiungi:ok:samsungtv',
        'flow.step:ok:samsungtv',
        'device.update:ok:samsungtv',
      ])
    );
  });

  it('can be resumed: taking the same discovery over again returns the same flow', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(hue());

    const first = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    const second = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.flowId).toBe(flowId);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 1,
    });
  });

  it('keeps the discovery of one person away from another', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(hue());
    expect((await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' })).status).toBe(
      200
    );
    harness.fake.resetCalls();

    const takeOver = await harness.request(`/scoperti/${flowId}/aggiungi`, {
      method: 'POST',
      user: 'customer2',
    });
    expect(takeOver.status).toBe(403);
    expect(takeOver.body.code).toBe('FORBIDDEN');

    const step = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      user: 'customer2',
      body: { input: {} },
    });
    expect(step.status).toBe(403);
    expect((await harness.request(`/flussi/${flowId}`, { user: 'customer2' })).status).toBe(403);
    expect(
      (await harness.request(`/flussi/${flowId}`, { method: 'DELETE', user: 'customer2' })).status
    ).toBe(403);
    const ignored = await harness.request(`/scoperti/${flowId}/ignora`, {
      method: 'POST',
      user: 'customer2',
    });
    expect(ignored.status).toBe(403);
    expect(harness.fake.ignored).toEqual([]);

    // The other person sees it in the list, but cannot take it.
    const listed = await listDiscovered(harness, 'customer2');
    expect(listed.devices[0]).toMatchObject({
      addable: false,
      reason: 'Aggiunta già in corso da un altro utente.',
    });
    expect((await listDiscovered(harness)).devices[0]).toMatchObject({ addable: true });
  });

  it('takes over only what HA lists as a discovery', async () => {
    const harness = await harnessFor({});
    // A TV flow somebody started by hand (source user) is not in the list in progress.
    const started = await harness.request('/flussi', {
      method: 'POST',
      user: 'customer2',
      body: { handler: 'webostv' },
    });
    const foreign = started.body.flowId as string;
    const reauth = harness.fake.seedDiscovery(hue({ source: 'reauth' }));
    harness.fake.resetCalls();

    for (const flowId of [foreign, reauth, 'does-not-exist']) {
      for (const action of ['aggiungi', 'ignora']) {
        const result = await harness.request(`/scoperti/${flowId}/${action}`, { method: 'POST' });
        expect(result.status, `${flowId} ${action}`).toBe(404);
        expect(result.body.code).toBe('FLOW_NOT_FOUND');
      }
    }
    expect((await harness.request('/scoperti/bad id!/aggiungi', { method: 'POST' })).status).toBe(
      404
    );
    // No flow of anybody was read, answered or cancelled by these requests.
    expect(harness.fake.callsFor(FLOW_READ)).toHaveLength(0);
    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(0);
    expect(harness.fake.ignored).toEqual([]);
  });

  it('does not list, read or take the discovery of a system integration', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(
      hue({ handler: 'hassio', name: 'Supervisor', steps: [{ stepId: 'confirm', schema: [] }] })
    );
    harness.fake.resetCalls();

    const refused = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(refused.status).toBe(404);
    expect(refused.body.code).toBe('FLOW_NOT_FOUND');
    expect(harness.fake.callsFor(FLOW_READ)).toHaveLength(0);
    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(0);
    expect(harness.fake.flows.has(flowId)).toBe(true);
  });

  it('refuses a discovery whose step has a field Acasystem cannot draw, and leaves it in HA', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(
      hue({
        handler: 'shelly',
        name: 'Shelly',
        steps: [{ stepId: 'weird', schema: [{ name: 'blob', selector: { object: {} } }] }],
      })
    );
    harness.fake.resetCalls();

    const refused = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('REQUIRES_INSTALLER');
    expect(harness.fake.callsFor(FLOW_READ)).toHaveLength(1);
    // The discovery stays in HA for the installer: it was not cancelled, and it is not ours.
    expect(harness.fake.callsFor(FLOW_DELETE)).toHaveLength(0);
    expect(harness.fake.flows.has(flowId)).toBe(true);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });

    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'scoperti.aggiungi',
          outcome: 'denied',
          code: 'REQUIRES_INSTALLER',
        }),
      ])
    );
  });

  it.each([
    ['an external login', { stepId: 'confirm_discovery', type: 'external' as const }, 'external'],
    ['a menu', { stepId: 'confirm_discovery', type: 'menu' as const }, 'menu'],
  ])('takes over a flow that opens %s (F4)', async (_label, step, type) => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(
      hue({ handler: 'shelly', name: 'Shelly', steps: [step] })
    );

    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(added.status).toBe(200);
    expect(added.body).toMatchObject({ type, flowId, handler: 'shelly' });
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 1,
    });
  });

  it('answers "not found" when the discovery is gone from HA', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(hue());
    harness.fake.forgetFlows();

    const gone = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(gone.status).toBe(404);
    expect(gone.body.code).toBe('FLOW_NOT_FOUND');
  });

  it('limits the flows a person can have open', async () => {
    const harness = await harnessFor({ module: { maxOpenFlowsPerUser: 1 } });
    const first = harness.fake.seedDiscovery(hue({ uniqueId: 'a' }));
    const second = harness.fake.seedDiscovery(hue({ uniqueId: 'b' }));
    expect((await harness.request(`/scoperti/${first}/aggiungi`, { method: 'POST' })).status).toBe(
      200
    );
    const refused = await harness.request(`/scoperti/${second}/aggiungi`, { method: 'POST' });
    expect(refused.status).toBe(429);
    expect(refused.body.code).toBe('TOO_MANY_FLOWS');
  });

  it('cancels a discovery the person leaves, like any flow of theirs', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(hue());
    await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });

    const cancelled = await harness.request(`/flussi/${flowId}`, { method: 'DELETE' });
    expect(cancelled.status).toBe(200);
    expect(harness.fake.flows.has(flowId)).toBe(false);
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });
  });
});

describe('«Non mi interessa»', () => {
  it('asks HA to ignore the discovery and drops it from the list', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(samsung());
    harness.fake.seedDiscovery(hue());
    harness.fake.resetCalls();

    const result = await harness.request(`/scoperti/${flowId}/ignora`, { method: 'POST' });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ignored: true });

    const calls = harness.fake.callsFor('config_entries/ignore_flow');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ userId: harness.serviceUserId, tokenKind: 'llat' });
    expect(harness.fake.ignored).toEqual([{ flowId, title: 'Samsung 7 Series (49)' }]);

    const { devices } = await listDiscovered(harness);
    expect(devices.map((device) => device.handler)).toEqual(['hue']);

    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'scoperti.ignora',
          domain: 'samsungtv',
          outcome: 'ok',
          user: 'user-customer',
        }),
      ])
    );
  });

  it('forgets a flow of the person that is ignored, and says so when HA cannot ignore it', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(hue());
    await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect((await harness.request(`/scoperti/${flowId}/ignora`, { method: 'POST' })).status).toBe(
      200
    );
    expect(harness.database.prepare('SELECT COUNT(*) AS n FROM device_flows').get()).toEqual({
      n: 0,
    });

    // A discovery with no unique id cannot be ignored: HA refuses, the customer is told so.
    const noId = harness.fake.seedDiscovery(hue({ uniqueId: null }));
    const refused = await harness.request(`/scoperti/${noId}/ignora`, { method: 'POST' });
    expect(refused.status).toBe(502);
    expect(refused.body.code).toBe('HA_REFUSED');
  });
});

describe('pairing, family by family', () => {
  it('LG webostv: asks for the OK on the TV with the ten-second wait', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery({
      handler: 'webostv',
      source: 'ssdp',
      name: 'LG TV',
      steps: [{ stepId: 'pairing', schema: [] }],
      entry: { title: 'LG TV', manufacturer: 'LG', model: 'UA751', entityId: 'media_player.lg_tv' },
    });
    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(added.body).toMatchObject({
      type: 'form',
      stepId: 'pairing',
      title: 'Accetta sul televisore',
      waitSeconds: 10,
      fields: [],
    });
    const done = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(done.body).toMatchObject({ type: 'create_entry', domain: 'webostv', pending: false });
  });

  it('Samsung: «Consenti» on the TV, then a PIN on the older models', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(
      samsung({
        steps: [
          { stepId: 'confirm', schema: [] },
          {
            stepId: 'encrypted_pairing',
            schema: [{ name: 'pin', required: true, selector: { text: { type: 'text' } } }],
            check: (body) => (body.pin === '4721' ? null : 'invalid_pin'),
          },
        ],
      })
    );
    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(added.body).toMatchObject({ stepId: 'confirm', waitSeconds: 30 });

    const pin = await harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: {} } });
    expect(pin.body).toMatchObject({
      type: 'form',
      stepId: 'encrypted_pairing',
      title: 'Scrivi il codice',
      waitSeconds: null,
      fields: [
        { name: 'pin', kind: 'text', required: true, label: 'Codice mostrato sul televisore' },
      ],
    });

    // A PIN that is not four digits never reaches HA; a wrong one is answered in Italian.
    const malformed = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { pin: '12ab' } },
    });
    expect(malformed.status).toBe(400);
    expect(malformed.body).toMatchObject({ code: 'INVALID_INPUT', field: 'pin' });
    const wrong = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { pin: '0000' } },
    });
    expect(wrong.body).toMatchObject({
      type: 'form',
      stepId: 'encrypted_pairing',
      errors: [
        {
          code: 'invalid_pin',
          message: 'Il codice non è quello mostrato sul televisore. Riprova.',
        },
      ],
    });
    const right = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { pin: '4721' } },
    });
    expect(right.body).toMatchObject({ type: 'create_entry', domain: 'samsungtv' });
    expect(harness.fake.received.map((item) => item.body)).toEqual([
      {},
      { pin: '0000' },
      { pin: '4721' },
    ]);
  });

  it('Android TV: the PIN on the screen, six characters, sent in capitals', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery({
      handler: 'androidtv_remote',
      name: 'Android TV',
      steps: [
        { stepId: 'zeroconf_confirm', schema: [] },
        {
          stepId: 'pair',
          schema: [{ name: 'pin', required: true, selector: { text: { type: 'text' } } }],
          check: (body) => (body.pin === 'A1B2C3' ? null : 'invalid_pin'),
        },
      ],
      entry: {
        title: 'Android TV',
        manufacturer: 'Sony',
        model: 'X',
        entityId: 'media_player.android_tv',
      },
    });
    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(added.body).toMatchObject({ stepId: 'zeroconf_confirm', title: 'Aggiungi Android TV' });
    const pair = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(pair.body).toMatchObject({ stepId: 'pair', fields: [{ name: 'pin', required: true }] });
    const done = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { pin: 'a1b2c3' } },
    });
    expect(done.body).toMatchObject({ type: 'create_entry', domain: 'androidtv_remote' });
  });

  it('Cast and Sonos: one confirmation, nothing to do on the device', async () => {
    const harness = await harnessFor({});
    for (const handler of ['cast', 'sonos']) {
      const flowId = harness.fake.seedDiscovery({
        handler,
        name: handler,
        uniqueId: `u-${handler}`,
        steps: [{ stepId: 'confirm', schema: [] }],
        entry: {
          title: handler,
          manufacturer: 'X',
          model: 'Y',
          entityId: `media_player.${handler}`,
        },
      });
      const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
      expect(added.body).toMatchObject({
        type: 'form',
        stepId: 'confirm',
        fields: [],
        waitSeconds: null,
      });
      const done = await harness.request(`/flussi/${flowId}`, {
        method: 'POST',
        body: { input: {} },
      });
      expect(done.body).toMatchObject({ type: 'create_entry', domain: handler });
    }
  });

  it('Hue: press the button of the bridge, then confirm', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(hue());
    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(added.body).toMatchObject({
      type: 'form',
      stepId: 'link',
      title: 'Premi il pulsante del bridge',
      description: expect.stringContaining('pulsante rotondo') as string,
      fields: [],
    });
    const done = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(done.body).toMatchObject({
      type: 'create_entry',
      domain: 'hue',
      entry: { entities: ['light.hue_lamp'], mediaPlayerEntityId: null },
    });
  });

  it.each([
    ['nanoleaf', 'link', 'Prepara Nanoleaf'],
    ['wiz', 'discovery_confirm', 'Aggiungi la luce WiZ'],
    ['yeelight', 'discovery_confirm', 'Aggiungi la luce Yeelight'],
    ['lifx', 'confirm', 'Aggiungi la luce LIFX'],
    ['shelly', 'confirm_discovery', 'Aggiungi Shelly'],
    ['tplink', 'discovery_confirm', 'Aggiungi TP-Link'],
    ['esphome', 'discovery_confirm', 'Aggiungi il dispositivo ESPHome'],
  ])('%s: a confirmation at the step %s', async (handler, stepId, title) => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery({
      handler,
      name: handler,
      steps: [{ stepId, schema: [] }],
      entry: { title: handler, manufacturer: 'X', model: 'Y', entityId: `light.${handler}` },
    });
    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(added.body).toMatchObject({ type: 'form', stepId, title, fields: [] });
    const done = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: {} },
    });
    expect(done.body).toMatchObject({ type: 'create_entry', domain: handler });
  });

  it('Nanoleaf tells the person to hold the power button for 5-7 seconds', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery({
      handler: 'nanoleaf',
      name: 'Nanoleaf',
      steps: [{ stepId: 'link', schema: [] }],
      entry: {
        title: 'Nanoleaf',
        manufacturer: 'Nanoleaf',
        model: 'Shapes',
        entityId: 'light.nano',
      },
    });
    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(String(added.body.description)).toContain('5-7 secondi');
  });

  it('Shelly with a password: user name and password reach HA as typed and are never kept', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery({
      handler: 'shelly',
      name: 'Shelly Plug',
      steps: [
        {
          stepId: 'credentials',
          schema: [
            { name: 'username', required: true, selector: { text: { type: 'text' } } },
            { name: 'password', required: true, selector: { text: { type: 'password' } } },
          ],
        },
      ],
      entry: {
        title: 'Shelly Plug',
        manufacturer: 'Shelly',
        model: 'Plug',
        entityId: 'switch.shelly',
      },
    });
    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(added.body).toMatchObject({
      stepId: 'credentials',
      fields: [
        { name: 'username', label: 'Nome utente', required: true },
        { name: 'password', label: 'Password', required: true },
      ],
    });
    const done = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { username: 'admin', password: 'canary-shelly-pass-9921' } },
    });
    expect(done.body).toMatchObject({ type: 'create_entry', domain: 'shelly' });
    expect(harness.fake.received[0]?.body).toEqual({
      username: 'admin',
      password: 'canary-shelly-pass-9921',
    });
    expect(everythingVisible(harness)).not.toContain('canary-shelly-pass-9921');
  });

  it('HomeKit: a form for the setup code, sent as XXX-XX-XXX, wrong codes answered in Italian', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(homekit());
    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(added.body).toMatchObject({
      type: 'form',
      stepId: 'pair',
      title: 'Codice di abbinamento',
      fields: [
        { name: 'pairing_code', kind: 'text', required: true, label: 'Codice di abbinamento' },
      ],
    });

    const short = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { pairing_code: '1234' } },
    });
    expect(short.status).toBe(400);
    expect(short.body).toMatchObject({ code: 'INVALID_INPUT', field: 'pairing_code' });

    const wrong = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { pairing_code: '11122333' } },
    });
    expect(wrong.body).toMatchObject({
      type: 'form',
      stepId: 'pair',
      errors: [
        {
          code: 'authentication_error',
          message: 'Il codice non è corretto. Controlla le cifre e riprova.',
        },
      ],
    });

    const right = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { pairing_code: '31415926' } },
    });
    expect(right.body).toMatchObject({
      type: 'create_entry',
      domain: 'homekit_controller',
      entry: { entities: ['climate.soggiorno'] },
    });
    expect(harness.fake.received.map((item) => item.body)).toEqual([
      { pairing_code: '111-22-333' },
      { pairing_code: '314-15-926' },
    ]);
    // The code is not kept anywhere on the server's side.
    expect(everythingVisible(harness)).not.toContain('314-15-926');
    expect(everythingVisible(harness)).not.toContain('31415926');
  });

  it("an integration with an external step (a login on the maker's site) shows the page to open", async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(
      hue({
        handler: 'tplink',
        name: 'Cloud',
        steps: [{ stepId: 'discovery_confirm', type: 'external' }],
      })
    );
    const added = await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    expect(added.status).toBe(200);
    expect(added.body).toMatchObject({
      type: 'external',
      url: 'https://login.example.test/authorize',
    });
  });
});

describe('what must not leak', () => {
  it('keeps names, addresses, codes and tokens out of the registry, the database and the logs', async () => {
    const harness = await harnessFor({});
    const flowId = harness.fake.seedDiscovery(homekit({ name: 'Rete Casa-Bianchi 192.168.1.50' }));
    await harness.request(`/scoperti/${flowId}/aggiungi`, { method: 'POST' });
    await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      body: { input: { pairing_code: '31415926' } },
    });
    const ignoredFlow = harness.fake.seedDiscovery(samsung({ name: 'TV Rossi' }));
    await harness.request(`/scoperti/${ignoredFlow}/ignora`, { method: 'POST' });

    const registry = await harness.request('/registro', { user: 'installer' });
    const dump = JSON.stringify(registry.body) + dumpDatabase(harness.database);
    for (const secret of ['192.168.1.50', 'Casa-Bianchi', 'TV Rossi', '31415926', '314-15-926']) {
      expect(dump, secret).not.toContain(secret);
    }
    const visible = everythingVisible(harness);
    expect(visible).not.toContain(harness.serviceToken);
    expect(visible).not.toContain('192.168.1.50');
    expect(visible).not.toContain('TV Rossi');
  });
});

describe('the table of families', () => {
  it('has the same keys and values as the table of the browser', () => {
    const source = readFileSync(
      join(SOURCE_DIR, '..', '..', 'frontend', 'src', 'utils', 'devices', 'classify.ts'),
      'utf8'
    );
    const block = /export const PLATFORM_FAMILY[^=]*=\s*\{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
    const browser = Object.fromEntries(
      [...block.matchAll(/^\s*([a-z0-9_]+):\s*'([a-z]+)',?\s*$/gm)].map((match) => [
        match[1],
        match[2],
      ])
    );
    expect(Object.keys(browser).length).toBeGreaterThan(10);
    expect(browser).toEqual({ ...PLATFORM_FAMILY });
  });
});
