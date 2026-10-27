// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { classifyTvs, tvIdFor, withoutKnown } from '../services/devices/tvClassify.ts';
import type { TvExclusions } from '../services/devices/tvClassify.ts';
import { brandForMac } from '../services/devices/tvOui.ts';
import { createHarness, everythingVisible } from './devicesHarness.ts';
import type { Harness, HarnessOptions } from './devicesHarness.ts';
import type { ScriptedStep } from './fakeHomeAssistant.ts';

/**
 * F5 (REP-20261026-006): «Televisori in rete». The lists that HA keeps of what it saw (SSDP,
 * zeroconf, DHCP) become television candidates; one tap starts the integration with the address
 * already filled in. Samples: the real Samsung from the DHCP list of HA 2026.10.4, an LG and a
 * Fire TV from SSDP, a Chromecast from zeroconf.
 */

const open: Harness[] = [];
const harnessFor = async (options: HarnessOptions = {}): Promise<Harness> => {
  const harness = await createHarness(options);
  harness.fake.knobs.version = '2026.10.4';
  open.push(harness);
  return harness;
};

afterEach(async () => {
  while (open.length) await open.pop()?.close();
});

const SAMSUNG_DHCP = { mac_address: '14:BB:6E:00:00:10', hostname: 'localhost', ip_address: '192.168.1.10' };
const PHONE_DHCP = { mac_address: '14:BB:6E:00:00:01', hostname: 'Galaxy-S21', ip_address: '192.168.1.55' };
const LG_SSDP = {
  name: 'LG',
  ssdp_usn: 'uuid:lg-1::urn:schemas-upnp-org:device:MediaRenderer:1',
  ssdp_location: 'http://192.168.1.20:1/lg.xml',
  upnp: {
    deviceType: 'urn:schemas-upnp-org:device:MediaRenderer:1',
    friendlyName: '[LG] webOS TV OLED55C1',
    manufacturer: 'LG Electronics',
    modelName: 'OLED55C1',
    UDN: 'uuid:lg-1',
  },
  x_homeassistant_matching_domains: ['webostv'],
};
const FIRE_SSDP = {
  name: 'Fire TV',
  ssdp_location: 'http://192.168.1.21:60000/upnp/dev/fire.xml',
  upnp: {
    deviceType: 'urn:schemas-upnp-org:device:MediaRenderer:1',
    friendlyName: 'Fire TV Stick',
    manufacturer: 'Amazon',
    modelName: 'AFTMM',
    UDN: 'uuid:fire-1',
  },
  x_homeassistant_matching_domains: [],
};
const ROUTER_SSDP = {
  name: 'Router',
  ssdp_location: 'http://192.168.1.1:49000/igd.xml',
  upnp: {
    deviceType: 'urn:schemas-upnp-org:device:InternetGatewayDevice:1',
    friendlyName: 'FRITZ!Box',
    manufacturer: 'AVM',
    modelName: 'FRITZ!Box 7590',
    UDN: 'uuid:router-1',
  },
};
const CHROMECAST_ZEROCONF = {
  name: 'Chromecast-abc._googlecast._tcp.local.',
  type: '_googlecast._tcp.local.',
  ip_addresses: ['192.168.1.30'],
  properties: { fn: 'Salotto', md: 'Chromecast' },
};
const ROKU_DHCP = { mac_address: '08:05:81:11:22:33', hostname: 'Roku-Express', ip_address: '192.168.1.40' };

const entry = {
  title: 'UE50J6200',
  manufacturer: 'Samsung',
  model: 'UE50J6200',
  entityId: 'media_player.tv_samsung_50_j6200',
};

const samsungSteps: ScriptedStep[] = [
  { stepId: 'user', schema: [{ type: 'string', name: 'host', required: true }] },
  {
    stepId: 'encrypted_pairing',
    schema: [{ type: 'string', name: 'pin', required: true, secret: true }],
    placeholders: { device: 'UE50J6200 (UE50J6200)' },
    check: (body) => (body.pin === '4321' ? null : 'invalid_pin'),
  },
];

const seedNetwork = (harness: Harness) => {
  harness.fake.knobs.network.dhcp = [SAMSUNG_DHCP, PHONE_DHCP, ROKU_DHCP];
  harness.fake.knobs.network.ssdp = [LG_SSDP, FIRE_SSDP, ROUTER_SSDP];
  harness.fake.knobs.network.zeroconf = [CHROMECAST_ZEROCONF];
};

interface TvRow {
  id: string;
  brandKey: string;
  brand: string;
  name: string;
  model: string | null;
  handler: string | null;
  conferma: string;
  collegabile: boolean;
  motivo?: string;
}

const listTvs = async (harness: Harness, user: 'customer' | 'installer' = 'customer') => {
  const result = await harness.request('/tv-in-rete', { user });
  expect(result.status).toBe(200);
  return (result.body as { tvs: TvRow[] }).tvs;
};

const byBrand = (tvs: TvRow[], brandKey: string): TvRow => {
  const found = tvs.find((tv) => tv.brandKey === brandKey);
  if (!found) throw new Error(`no ${brandKey} in ${JSON.stringify(tvs)}`);
  return found;
};

describe('the television makers table', () => {
  it('knows the Samsung from the real DHCP list, by the prefix of its MAC', () => {
    expect(brandForMac('14:bb:6e:00:00:10')).toBe('samsung');
    expect(brandForMac('14-BB-6E-00-00-10')).toBe('samsung');
    expect(brandForMac('08:05:81:11:22:33')).toBe('roku');
    expect(brandForMac('02:00:00:00:00:01')).toBeNull();
  });
});

describe('the classification of what HA saw', () => {
  it('finds the televisions among SSDP, zeroconf and DHCP, and leaves the rest', () => {
    const candidates = classifyTvs([
      ...[SAMSUNG_DHCP, PHONE_DHCP, ROKU_DHCP].map((item) => ({
        source: 'dhcp' as const,
        host: item.ip_address,
        mac: item.mac_address.toLowerCase(),
        hostname: item.hostname,
        manufacturer: null,
        modelName: null,
        friendlyName: null,
        deviceType: null,
        uid: null,
        serviceType: null,
        domains: [],
      })),
      {
        source: 'ssdp',
        host: '192.168.1.20',
        mac: null,
        hostname: null,
        manufacturer: 'LG Electronics',
        modelName: 'OLED55C1',
        friendlyName: '[LG] webOS TV OLED55C1',
        deviceType: 'urn:schemas-upnp-org:device:MediaRenderer:1',
        uid: 'uuid:lg-1',
        serviceType: null,
        domains: ['webostv'],
      },
      {
        source: 'ssdp',
        host: '192.168.1.1',
        mac: null,
        hostname: null,
        manufacturer: 'AVM',
        modelName: 'FRITZ!Box 7590',
        friendlyName: 'FRITZ!Box',
        deviceType: 'urn:schemas-upnp-org:device:InternetGatewayDevice:1',
        uid: 'uuid:router-1',
        serviceType: null,
        domains: [],
      },
    ]);
    expect(candidates.map((candidate) => [candidate.brandKey, candidate.handler])).toEqual([
      ['lg', 'webostv'],
      ['roku', 'roku'],
      ['samsung', 'samsungtv'],
    ]);
  });

  it('merges the same television seen in two lists, keeping the MAC and the description', () => {
    const base = {
      mac: null,
      hostname: null,
      manufacturer: null,
      modelName: null,
      friendlyName: null,
      deviceType: null,
      uid: null,
      serviceType: null,
      domains: [],
    };
    const [one, ...rest] = classifyTvs([
      { ...base, source: 'dhcp', host: '192.168.1.10', mac: '14:bb:6e:00:00:10', hostname: 'localhost' },
      {
        ...base,
        source: 'ssdp',
        host: '192.168.1.10',
        manufacturer: 'Samsung Electronics',
        modelName: 'UE50J6200',
        deviceType: 'urn:schemas-upnp-org:device:MediaRenderer:1',
        uid: 'uuid:s-1',
        domains: ['samsungtv'],
      },
    ]);
    expect(rest).toEqual([]);
    expect(one).toMatchObject({
      brandKey: 'samsung',
      model: 'UE50J6200',
      mac: '14:bb:6e:00:00:10',
      host: '192.168.1.10',
    });
    expect(one?.id).toBe(tvIdFor('14:bb:6e:00:00:10'));
  });

  it('hides what is configured and as many candidates as there are discoveries of the handler', () => {
    const tv = (brandKey: 'samsung' | 'lg', mac: string | null, model: string | null, host: string) =>
      classifyTvs([
        {
          source: mac ? 'dhcp' : 'ssdp',
          host,
          mac,
          hostname: mac ? 'localhost' : null,
          manufacturer: mac ? null : brandKey === 'lg' ? 'LG Electronics' : 'Samsung',
          modelName: model,
          friendlyName: null,
          deviceType: 'urn:schemas-upnp-org:device:MediaRenderer:1',
          uid: mac ? null : `uuid:${host}`,
          serviceType: null,
          domains: [],
        },
      ])[0];
    const first = tv('samsung', '14:bb:6e:00:00:0a', null, '192.168.1.11');
    const second = tv('samsung', '14:bb:6e:00:00:0b', null, '192.168.1.12');
    const lg = tv('lg', null, 'OLED55C1', '192.168.1.13');
    if (!first || !second || !lg) throw new Error('sample not classified');
    const none: TvExclusions = {
      configuredMacs: new Set(),
      configuredModels: new Set(),
      discoveredByHandler: new Map(),
    };
    expect(withoutKnown([first, second, lg], none)).toHaveLength(3);
    expect(
      withoutKnown([first, second, lg], { ...none, configuredMacs: new Set(['14:bb:6e:00:00:0a']) })
    ).toEqual([second, lg]);
    expect(
      withoutKnown([first, second, lg], { ...none, configuredModels: new Set(['lg|oled55c1']) })
    ).toEqual([first, second]);
    expect(
      withoutKnown([first, second, lg], { ...none, discoveredByHandler: new Map([['samsungtv', 1]]) })
    ).toEqual([second, lg]);
  });
});

describe('GET /tv-in-rete', () => {
  it('lists the televisions with brand, name, handler and what the TV will ask, without addresses', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    await harness.module.start();

    const tvs = await listTvs(harness);
    expect(tvs.map((tv) => tv.brandKey).sort()).toEqual(
      ['amazon', 'google', 'lg', 'roku', 'samsung'].sort()
    );
    expect(byBrand(tvs, 'samsung')).toMatchObject({
      brand: 'Samsung',
      name: 'Televisore Samsung',
      handler: 'samsungtv',
      conferma: 'pin',
      collegabile: true,
    });
    expect(byBrand(tvs, 'lg')).toMatchObject({
      name: '[LG] webOS TV OLED55C1',
      model: 'OLED55C1',
      handler: 'webostv',
      conferma: 'consenti',
    });
    expect(byBrand(tvs, 'google')).toMatchObject({
      name: 'Salotto',
      model: 'Chromecast',
      handler: 'cast',
      conferma: 'nessuno',
    });
    expect(byBrand(tvs, 'roku')).toMatchObject({ handler: 'roku', conferma: 'nessuno' });
    expect(byBrand(tvs, 'amazon')).toMatchObject({
      handler: null,
      collegabile: false,
      motivo: expect.stringContaining('ADB'),
    });
    // The phone with a Samsung prefix and the router are not televisions.
    expect(tvs).toHaveLength(5);

    // No address and no MAC reach the browser; the id is an opaque hash.
    const visible = everythingVisible(harness);
    for (const secret of ['192.168.1.10', '192.168.1.20', '14:bb:6e', '14:BB:6E', '08:05:81']) {
      expect(visible).not.toContain(secret);
    }
    expect(byBrand(tvs, 'samsung').id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('reads the three lists of HA once in 30 seconds, as the service, and sends nothing itself', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    await harness.module.start();

    await listTvs(harness);
    await listTvs(harness, 'installer');
    for (const route of ['ssdp', 'zeroconf', 'dhcp']) {
      const calls = harness.fake.callsFor(`${route}/subscribe_discovery`);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ userId: harness.serviceUserId, tokenKind: 'llat' });
    }
    // Every subscription is closed again.
    expect(harness.fake.callsFor('unsubscribe_events')).toHaveLength(3);
    // Reading the list is polled, so it is not written to the registry.
    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual([]);
  });

  it('works with a list missing and fails when none can be read', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    harness.fake.knobs.networkMissing = ['ssdp', 'zeroconf'];
    await harness.module.start();
    expect((await listTvs(harness)).map((tv) => tv.brandKey).sort()).toEqual(['roku', 'samsung']);

    const none = await harnessFor({});
    none.fake.knobs.networkMissing = ['ssdp', 'zeroconf', 'dhcp'];
    await none.module.start();
    const failed = await none.request('/tv-in-rete');
    expect(failed.status).toBeGreaterThanOrEqual(400);
    expect(failed.body.error).toEqual(expect.any(String));
  });

  it('hides a television already in Home Assistant by its MAC, and a discovery HA already offers', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    harness.fake.seedTv({ host: '192.168.1.99', mac: '14:bb:6e:00:00:10' });
    harness.fake.seedDiscovery({
      handler: 'cast',
      source: 'zeroconf',
      name: 'Salotto',
      steps: [{ stepId: 'confirm' }],
      entry: { title: 'Salotto', manufacturer: 'Google', model: 'Chromecast', entityId: 'media_player.salotto' },
    });
    await harness.module.start();

    const brands = (await listTvs(harness)).map((tv) => tv.brandKey);
    expect(brands).not.toContain('samsung');
    expect(brands).not.toContain('google');
    expect(brands).toContain('lg');
  });

  it('needs the service identity', async () => {
    const harness = await harnessFor({ activeService: false });
    seedNetwork(harness);
    await harness.module.start();
    const result = await harness.request('/tv-in-rete');
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('SERVICE_NOT_ACTIVE');
    expect(harness.fake.callsFor('dhcp/subscribe_discovery')).toHaveLength(0);
  });

  it('refuses a request without a user', async () => {
    const harness = await harnessFor({});
    const result = await harness.request('/tv-in-rete', { user: null });
    expect(result.status).toBe(401);
  });
});

describe('POST /tv-in-rete/:id/collega', () => {
  const scriptSamsung = (harness: Harness) =>
    harness.fake.scriptHandler('samsungtv', { steps: samsungSteps, entry });

  const connectSamsung = async (harness: Harness) => {
    const tv = byBrand(await listTvs(harness), 'samsung');
    return harness.request(`/tv-in-rete/${tv.id}/collega`, { method: 'POST' });
  };

  it('starts the integration, fills in the address and answers with the PIN step', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    scriptSamsung(harness);
    await harness.module.start();

    const step = await connectSamsung(harness);
    expect(step.status).toBe(201);
    expect(step.body).toMatchObject({
      type: 'form',
      handler: 'samsungtv',
      stepId: 'encrypted_pairing',
      fields: [{ name: 'pin' }],
    });
    expect(harness.fake.received.map((item) => item.body)).toEqual([{ host: '192.168.1.10' }]);
    // The address went to HA only: nothing of it in what the browser or the logs saw.
    expect(everythingVisible(harness)).not.toContain('192.168.1.10');

    // The flow is the customer's own: another customer cannot answer it.
    const flowId = step.body.flowId as string;
    const other = await harness.request(`/flussi/${flowId}`, {
      method: 'POST',
      user: 'customer2',
      body: { input: { pin: '4321' } },
    });
    expect(other.status).toBe(403);
  });

  it('answers a wrong PIN with the same step and an error, then creates the device', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    scriptSamsung(harness);
    await harness.module.start();

    const step = await connectSamsung(harness);
    const flowId = step.body.flowId as string;
    const answer = (pin: string) =>
      harness.request(`/flussi/${flowId}`, { method: 'POST', body: { input: { pin } } });

    const wrong = await answer('0000');
    expect(wrong.body).toMatchObject({
      type: 'form',
      stepId: 'encrypted_pairing',
      errors: [{ code: 'invalid_pin' }],
    });

    const done = await answer('4321');
    expect(done.body).toMatchObject({
      type: 'create_entry',
      domain: 'samsungtv',
      pending: false,
      entry: { loaded: true, mediaPlayerEntityId: 'media_player.tv_samsung_50_j6200' },
    });

    // Once connected the television leaves the list... and the device is the customer's own.
    const created = done.body as { entryId: string };
    expect((await harness.request(`/voci/${created.entryId}`)).status).toBe(200);
    const rename = await harness.request(
      `/dispositivi/${(done.body as { entry: { device: { id: string } } }).entry.device.id}`,
      { method: 'PATCH', body: { name: 'Sala' } }
    );
    expect(rename.status).toBe(200);
  });

  it('writes the tap to the registry of actions with the person and the integration', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    scriptSamsung(harness);
    await harness.module.start();

    await connectSamsung(harness);
    const registry = await harness.request('/registro', { user: 'installer' });
    const actions = registry.body.actions as { action: string; domain: string; user: string }[];
    expect(actions).toEqual([
      expect.objectContaining({ action: 'tv.collega', domain: 'samsungtv', user: 'user-customer' }),
    ]);
  });

  it('starts over when the same person taps again, without a second open flow', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    scriptSamsung(harness);
    await harness.module.start();

    const first = await connectSamsung(harness);
    const second = await connectSamsung(harness);
    expect(second.status).toBe(201);
    expect(second.body.flowId).not.toBe(first.body.flowId);
    const flows = await harness.request('/flussi');
    expect((flows.body as { flows: unknown[] }).flows).toHaveLength(1);
  });

  it('fills an optional name with the brand and the model, and leaves the step to the person when more is required', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    harness.fake.scriptHandler('roku', {
      steps: [
        {
          stepId: 'user',
          schema: [
            { type: 'string', name: 'host', required: true },
            { type: 'string', name: 'name', optional: true },
          ],
        },
      ],
      entry: { title: 'Roku', manufacturer: 'Roku', model: 'Express', entityId: 'media_player.roku' },
    });
    await harness.module.start();

    const roku = byBrand(await listTvs(harness), 'roku');
    const done = await harness.request(`/tv-in-rete/${roku.id}/collega`, { method: 'POST' });
    expect(done.body).toMatchObject({ type: 'create_entry', domain: 'roku' });
    expect(harness.fake.received.map((item) => item.body)).toEqual([
      { host: '192.168.1.40', name: 'Televisore Roku' },
    ]);

    // A required field besides the address: the step comes back for the person.
    const more = await harnessFor({});
    seedNetwork(more);
    more.fake.scriptHandler('cast', {
      steps: [
        {
          stepId: 'user',
          schema: [
            { type: 'string', name: 'host', required: true },
            { type: 'string', name: 'access_token', required: true },
          ],
        },
      ],
      entry: { title: 'Cast', manufacturer: 'Google', model: 'Chromecast', entityId: 'media_player.cast' },
    });
    await more.module.start();
    const cast = byBrand(await listTvs(more), 'google');
    const step = await more.request(`/tv-in-rete/${cast.id}/collega`, { method: 'POST' });
    expect(step.body).toMatchObject({ type: 'form', stepId: 'user' });
    expect(more.fake.received).toEqual([]);
  });

  it('says it needs the installer for a brand that cannot be connected from here', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    await harness.module.start();
    const fire = byBrand(await listTvs(harness), 'amazon');
    const result = await harness.request(`/tv-in-rete/${fire.id}/collega`, { method: 'POST' });
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('REQUIRES_INSTALLER');
    expect(result.body.error).toContain('ADB');
  });

  it('answers not found for a television that is not in the list and for a malformed id', async () => {
    const harness = await harnessFor({});
    seedNetwork(harness);
    await harness.module.start();
    const unknown = await harness.request(`/tv-in-rete/${'a'.repeat(16)}/collega`, {
      method: 'POST',
    });
    expect(unknown.status).toBe(404);
    expect(unknown.body.code).toBe('TV_NOT_FOUND');
    const malformed = await harness.request('/tv-in-rete/not-an-id/collega', { method: 'POST' });
    expect(malformed.status).toBe(404);
    expect(malformed.body.code).toBe('TV_NOT_FOUND');
  });

  it('needs the service identity', async () => {
    const harness = await harnessFor({ activeService: false });
    seedNetwork(harness);
    await harness.module.start();
    const result = await harness.request(`/tv-in-rete/${'b'.repeat(16)}/collega`, {
      method: 'POST',
    });
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('SERVICE_NOT_ACTIVE');
  });
});
