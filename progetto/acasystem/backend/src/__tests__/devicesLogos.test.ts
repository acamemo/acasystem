// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { createHarness } from './devicesHarness.ts';
import type { Harness, HarnessOptions } from './devicesHarness.ts';

/**
 * The logos of the integrations (brands proxy of HA) and the list of the discoveries somebody
 * ignored, with the route that takes one back, against the fake HA: contract, validation,
 * cache, renewal of the brands token and what must not happen.
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

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const DARK_PNG = Buffer.from('89504e470d0a1a0a0000000d49484453', 'hex');

const IMAGE_ROUTE = 'GET /api/brands/integration/{domain}/{image}';
const TOKEN_ROUTE = 'brands/access_token';

describe('GET /loghi/:domain', () => {
  it('serves the icon through HA with the service identity and the headers of a picture', async () => {
    const harness = await harnessFor({});
    harness.fake.seedBrandImage('webostv', 'icon.png', PNG);
    harness.fake.resetCalls();

    const result = await harness.requestBinary('/loghi/webostv');
    expect(result.status).toBe(200);
    expect(result.data.equals(PNG)).toBe(true);
    expect(result.headers.get('content-type')).toBe('image/png');
    expect(result.headers.get('cache-control')).toBe('private, max-age=86400');
    expect(result.headers.get('x-content-type-options')).toBe('nosniff');

    expect(harness.fake.callsFor(TOKEN_ROUTE)).toHaveLength(1);
    expect(harness.fake.callsFor(TOKEN_ROUTE)[0]).toMatchObject({
      userId: harness.serviceUserId,
      tokenKind: 'llat',
    });
    // The image is asked with the brands token, not with the service token.
    const image = harness.fake.callsFor(IMAGE_ROUTE);
    expect(image).toHaveLength(1);
    expect(image[0]).toMatchObject({ target: 'webostv/icon.png', userId: null });
  });

  it('is open to a customer and writes nothing in the registry of actions', async () => {
    const harness = await harnessFor({});
    harness.fake.seedBrandImage('hue', 'icon.png', PNG);

    expect((await harness.requestBinary('/loghi/hue', { user: 'customer' })).status).toBe(200);
    expect((await harness.requestBinary('/loghi/hue', { user: 'customer2' })).status).toBe(200);

    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual([]);
  });

  it('answers 401 without a user', async () => {
    const harness = await harnessFor({});
    const result = await harness.requestBinary('/loghi/hue', { user: null });
    expect(result.status).toBe(401);
  });

  it('answers the service-not-active error when the identity is off', async () => {
    const harness = await harnessFor({ activeService: false });
    const result = await harness.request('/loghi/hue');
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('SERVICE_NOT_ACTIVE');
  });

  it('refuses a domain that is not a domain, and a theme that is not one', async () => {
    const harness = await harnessFor({});
    for (const bad of ['Hue', 'hue-lamp', 'a'.repeat(65), 'hue%20x', '..%2Fapi', 'hue.png']) {
      const result = await harness.request(`/loghi/${bad}`);
      expect(result.status, bad).toBe(400);
      expect(result.body).toMatchObject({ code: 'INVALID_INPUT', field: 'domain' });
    }
    const theme = await harness.request('/loghi/hue?tema=blu');
    expect(theme.status).toBe(400);
    expect(theme.body).toMatchObject({ code: 'INVALID_INPUT', field: 'tema' });
    expect(harness.fake.callsFor(TOKEN_ROUTE)).toHaveLength(0);
  });

  it('keeps the logo for a day: a second call, by anyone, does not reach HA', async () => {
    const harness = await harnessFor({});
    harness.fake.seedBrandImage('hue', 'icon.png', PNG);
    await harness.requestBinary('/loghi/hue');
    harness.fake.resetCalls();

    const again = await harness.requestBinary('/loghi/hue', { user: 'customer2' });
    expect(again.status).toBe(200);
    expect(again.data.equals(PNG)).toBe(true);
    // Only the logo calls count: a check of the identity may run at any time under load.
    expect(harness.fake.callsFor(IMAGE_ROUTE)).toHaveLength(0);
    expect(harness.fake.callsFor(TOKEN_ROUTE)).toHaveLength(0);
  });

  it('asks HA again after a day', async () => {
    let now = 1_000_000;
    const harness = await harnessFor({ module: { now: () => now } });
    harness.fake.seedBrandImage('hue', 'icon.png', PNG);
    await harness.requestBinary('/loghi/hue');

    now += 23 * 3_600_000;
    harness.fake.resetCalls();
    await harness.requestBinary('/loghi/hue');
    expect(harness.fake.callsFor(IMAGE_ROUTE)).toHaveLength(0);

    now += 2 * 3_600_000;
    await harness.requestBinary('/loghi/hue');
    expect(harness.fake.callsFor(IMAGE_ROUTE)).toHaveLength(1);
  });

  it('serves the dark icon with ?tema=scuro and falls back to the normal one', async () => {
    const harness = await harnessFor({});
    harness.fake.seedBrandImage('hue', 'icon.png', PNG);
    harness.fake.seedBrandImage('hue', 'dark_icon.png', DARK_PNG);
    harness.fake.seedBrandImage('esphome', 'icon.png', PNG);

    expect((await harness.requestBinary('/loghi/hue?tema=scuro')).data.equals(DARK_PNG)).toBe(true);
    expect((await harness.requestBinary('/loghi/hue')).data.equals(PNG)).toBe(true);
    expect((await harness.requestBinary('/loghi/hue?tema=chiaro')).data.equals(PNG)).toBe(true);

    // No dark variant: the normal icon.
    const fallback = await harness.requestBinary('/loghi/esphome?tema=scuro');
    expect(fallback.status).toBe(200);
    expect(fallback.data.equals(PNG)).toBe(true);
  });

  it('answers 404 with the usual error for a missing logo and remembers it for an hour', async () => {
    let now = 1_000_000;
    const harness = await harnessFor({ module: { now: () => now } });

    const missing = await harness.request('/loghi/nessuna');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Logo non disponibile.', code: 'LOGO_NOT_FOUND' });
    expect(missing.headers.get('cache-control')).toBe('private, max-age=3600');

    harness.fake.resetCalls();
    expect((await harness.request('/loghi/nessuna')).status).toBe(404);
    expect(harness.fake.calls).toHaveLength(0);

    // The logo shows up in HA: after the hour the facade finds it.
    harness.fake.seedBrandImage('nessuna', 'icon.png', PNG);
    now += 3_600_001;
    expect((await harness.requestBinary('/loghi/nessuna')).status).toBe(200);
  });

  it('renews the brands token once when HA refuses it', async () => {
    const harness = await harnessFor({});
    harness.fake.seedBrandImage('hue', 'icon.png', PNG);
    harness.fake.seedBrandImage('esphome', 'icon.png', PNG);
    expect((await harness.requestBinary('/loghi/hue')).status).toBe(200);

    // HA rotated twice: the token the facade holds is no longer valid (403).
    harness.fake.rotateBrandsToken(false);
    harness.fake.resetCalls();
    const result = await harness.requestBinary('/loghi/esphome');
    expect(result.status).toBe(200);
    expect(result.data.equals(PNG)).toBe(true);
    expect(harness.fake.callsFor(IMAGE_ROUTE)).toHaveLength(2);
    expect(harness.fake.callsFor(TOKEN_ROUTE)).toHaveLength(1);

    // The new token is kept: no further request for it.
    harness.fake.seedBrandImage('lifx', 'icon.png', PNG);
    harness.fake.resetCalls();
    expect((await harness.requestBinary('/loghi/lifx')).status).toBe(200);
    expect(harness.fake.callsFor(TOKEN_ROUTE)).toHaveLength(0);
  });

  it('does not take a refusal of the brands token for a refusal of the service token', async () => {
    const harness = await harnessFor({});
    harness.fake.seedBrandImage('hue', 'icon.png', PNG);
    // Every token the proxy gives is refused: the logo is missing, the identity stays active.
    harness.fake.rotateBrandsToken(false);
    harness.fake.refuseBrandsTokens = true;

    const result = await harness.request('/loghi/hue');
    expect(result.status).toBe(404);
    expect(result.body.code).toBe('LOGO_NOT_FOUND');
    expect(harness.fake.callsFor(IMAGE_ROUTE)).toHaveLength(2);

    harness.fake.refuseBrandsTokens = false;
    expect((await harness.request('/stato')).body).not.toMatchObject({ code: 'SERVICE_NOT_ACTIVE' });
  });

  it('treats an answer that is not a picture, or is too big, as a missing logo', async () => {
    const harness = await harnessFor({});
    harness.fake.seedBrandImage('hue', 'icon.png', PNG);
    harness.fake.knobs.brandsContentType = 'text/html';
    expect((await harness.request('/loghi/hue')).body.code).toBe('LOGO_NOT_FOUND');

    harness.fake.knobs.brandsContentType = 'image/png';
    harness.fake.seedBrandImage('grande', 'icon.png', Buffer.alloc(512 * 1024 + 1));
    expect((await harness.request('/loghi/grande')).body.code).toBe('LOGO_NOT_FOUND');
    harness.fake.seedBrandImage('limite', 'icon.png', Buffer.alloc(512 * 1024));
    expect((await harness.requestBinary('/loghi/limite')).status).toBe(200);
  });

  it('answers 404 on an HA without the brands proxy', async () => {
    const harness = await harnessFor({});
    harness.fake.knobs.brandsMissing = true;
    const result = await harness.request('/loghi/hue');
    expect(result.status).toBe(404);
    expect(result.body.code).toBe('LOGO_NOT_FOUND');
  });

  it('keeps at most 300 logos', async () => {
    const harness = await harnessFor({});
    for (let index = 0; index < 302; index += 1) {
      harness.fake.seedBrandImage(`marca_${index}`, 'icon.png', PNG);
      await harness.requestBinary(`/loghi/marca_${index}`);
    }
    harness.fake.resetCalls();
    // The oldest was pushed out, the newest is still there.
    await harness.requestBinary('/loghi/marca_301');
    expect(harness.fake.callsFor(IMAGE_ROUTE)).toHaveLength(0);
    await harness.requestBinary('/loghi/marca_0');
    expect(harness.fake.callsFor(IMAGE_ROUTE)).toHaveLength(1);
  }, 60_000);
});

describe('GET /scoperti/ignorati', () => {
  it('lists the ignore entries of the integrations a customer can add, with family and name', async () => {
    const harness = await harnessFor({});
    const tv = harness.fake.seedIgnoredEntry('samsungtv', 'Samsung 7 Series (49)');
    const untitled = harness.fake.seedIgnoredEntry('hue', '');
    const address = harness.fake.seedIgnoredEntry('esphome', '192.168.1.40');
    // Not listed: a system integration, and an entry that is set up.
    harness.fake.seedIgnoredEntry('zeroconf', 'Sistema');
    harness.fake.seedTv();

    const result = await harness.request('/scoperti/ignorati');
    expect(result.status).toBe(200);
    expect(result.body.devices).toEqual([
      { entryId: address.entry_id, handler: 'esphome', name: 'ESPHome', family: 'sensor' },
      { entryId: untitled.entry_id, handler: 'hue', name: 'Philips Hue', family: 'light' },
      { entryId: tv.entry_id, handler: 'samsungtv', name: 'Samsung 7 Series (49)', family: 'tv' },
    ]);
  });

  it('answers an empty list and writes nothing in the registry', async () => {
    const harness = await harnessFor({});
    const result = await harness.request('/scoperti/ignorati', { user: 'customer2' });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ devices: [] });
    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual([]);
  });

  it('needs a user and an active service', async () => {
    const harness = await harnessFor({ activeService: false });
    expect((await harness.request('/scoperti/ignorati', { user: null })).status).toBe(401);
    const off = await harness.request('/scoperti/ignorati');
    expect(off.status).toBe(503);
    expect(off.body.code).toBe('SERVICE_NOT_ACTIVE');
  });
});

describe('POST /scoperti/ignorati/:entryId/ripristina', () => {
  it('removes the ignore entry through the service identity and logs it', async () => {
    const harness = await harnessFor({});
    const kept = harness.fake.seedIgnoredEntry('hue', 'Philips Hue');
    const entry = harness.fake.seedIgnoredEntry('samsungtv', 'Samsung 7 Series (49)');
    harness.fake.resetCalls();

    const result = await harness.request(`/scoperti/ignorati/${entry.entry_id}/ripristina`, {
      method: 'POST',
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ restored: true });
    expect(harness.fake.entries.map((candidate) => candidate.entry_id)).toEqual([kept.entry_id]);

    const removal = harness.fake.callsFor('DELETE /api/config/config_entries/entry/{entry_id}');
    expect(removal).toHaveLength(1);
    expect(removal[0]).toMatchObject({ userId: harness.serviceUserId, tokenKind: 'llat' });

    const listed = await harness.request('/scoperti/ignorati');
    expect((listed.body.devices as unknown[]).length).toBe(1);

    const registry = await harness.request('/registro', { user: 'installer' });
    expect(registry.body.actions).toEqual([
      expect.objectContaining({
        action: 'scoperti.ripristina',
        domain: 'samsungtv',
        entryId: entry.entry_id,
        outcome: 'ok',
        user: 'user-customer',
      }),
    ]);
  });

  it('never removes an entry that is not an ignore entry, nor one that does not exist', async () => {
    const harness = await harnessFor({});
    const tv = harness.fake.seedTv();
    const system = harness.fake.seedIgnoredEntry('zeroconf', 'Sistema');
    harness.fake.resetCalls();

    for (const id of [tv.entry_id, system.entry_id, 'ZZZZ', 'non-valido']) {
      const result = await harness.request(`/scoperti/ignorati/${id}/ripristina`, {
        method: 'POST',
      });
      expect(result.status, id).toBe(404);
      expect(result.body.code, id).toBe('ENTRY_NOT_FOUND');
    }
    expect(harness.fake.callsFor('DELETE /api/config/config_entries/entry/{entry_id}')).toEqual([]);
    expect(harness.fake.entries.map((entry) => entry.entry_id)).toEqual(
      expect.arrayContaining([tv.entry_id, system.entry_id])
    );
  });

  it('needs a user and an active service', async () => {
    const harness = await harnessFor({ activeService: false });
    const url = '/scoperti/ignorati/ABCDEF/ripristina';
    expect((await harness.request(url, { method: 'POST', user: null })).status).toBe(401);
    expect((await harness.request(url, { method: 'POST' })).body.code).toBe('SERVICE_NOT_ACTIVE');
  });

  it('is counted against the limit on writes', async () => {
    const harness = await harnessFor({ module: { mutationLimit: { max: 1, windowMs: 60_000 } } });
    const first = harness.fake.seedIgnoredEntry('hue', 'Philips Hue');
    const second = harness.fake.seedIgnoredEntry('esphome', 'ESP');
    const ok = await harness.request(`/scoperti/ignorati/${first.entry_id}/ripristina`, {
      method: 'POST',
    });
    expect(ok.status).toBe(200);
    const refused = await harness.request(`/scoperti/ignorati/${second.entry_id}/ripristina`, {
      method: 'POST',
    });
    expect(refused.status).toBe(429);
    expect(refused.body.code).toBe('RATE_LIMITED');
  });
});
