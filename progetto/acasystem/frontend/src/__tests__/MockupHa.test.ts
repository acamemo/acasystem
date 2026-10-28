/**
 * The simulated Home Assistant of the demo mode (REP-20261028-005, K1): the store and its
 * services, the fake connection the widgets use, and the device facade answered in the browser.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiscoveredDeviceDto, EntryDto, FlowFormDto, TvInReteDto } from '@/@types/devices';
import { getHistory } from '@/api/haClient';
import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { backendRequest, setBackendOverride } from '@/api/backendClient';
import { fetchBrandLogo, listDiscovered, listIgnored, listTvs } from '@/api/devicesApi';
import { adaptiveFixtureEntities } from '@/utils/fixtures/adaptiveData';
import { classifyDevices } from '@/utils/devices/classify';
import { createMockBackend } from '@/utils/mockup/backendFacade';
import { createMockDeviceFacade } from '@/utils/mockup/deviceFacade';
import { createMockHaStore, type MockHaStore } from '@/utils/mockup/haStore';
import { demoImageFor } from '@/utils/mockup/images';
import { createMockConnection } from '@/utils/mockup/mockConnection';

let store: MockHaStore;

beforeEach(() => {
  store = createMockHaStore({ settleMs: 0 });
});

afterEach(() => {
  store.dispose();
  setBackendOverride(null);
  vi.unstubAllGlobals();
});

const entity = (id: string) => store.getEntities()[id]!;

describe('store (seed)', () => {
  it('starts from the shared fixtures and adds the entities they lack', () => {
    const entities = store.getEntities();
    for (const id of Object.keys(adaptiveFixtureEntities)) expect(entities[id]).toBeDefined();
    expect(entities['weather.home']).toBeDefined();
    expect(entities['calendar.famiglia']).toBeDefined();
    expect(entity('light.fixture').attributes.friendly_name).toBe('Luce soggiorno');
  });

  it('does not share objects with the fixtures it was seeded from', async () => {
    await store.callService('light', 'turn_off', { entity_id: 'light.fixture' });
    expect(adaptiveFixtureEntities['light.fixture']!.state).toBe('on');
  });

  it('notifies the subscribers with a new map and stops after unsubscribe', async () => {
    const listener = vi.fn();
    const before = store.getEntities();
    const unsubscribe = store.subscribe(listener);
    await store.callService('switch', 'turn_on', { entity_id: 'switch.charging' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getEntities()).not.toBe(before);
    expect(store.getEntities()['light.fixture']).toBe(before['light.fixture']);
    unsubscribe();
    await store.callService('switch', 'turn_off', { entity_id: 'switch.charging' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('store (callService)', () => {
  it('turns lights and switches on and off, with brightness and colour', async () => {
    await store.callService('light', 'turn_off', { entity_id: 'light.fixture' });
    expect(entity('light.fixture').state).toBe('off');
    await store.callService('light', 'turn_on', {
      entity_id: 'light.fixture',
      brightness_pct: 50,
      hs_color: [10, 90],
    });
    expect(entity('light.fixture').state).toBe('on');
    expect(entity('light.fixture').attributes.brightness).toBe(128);
    expect(entity('light.fixture').attributes.hs_color).toEqual([10, 90]);
    await store.callService('light', 'toggle', { entity_id: 'light.fixture' });
    expect(entity('light.fixture').state).toBe('off');
    await store.callService('switch', 'turn_on', { target: { entity_id: 'switch.charging' } });
    expect(entity('switch.charging').state).toBe('on');
  });

  it('moves covers and keeps the state in step with the position', async () => {
    await store.callService('cover', 'set_cover_position', {
      entity_id: 'cover.fixture',
      position: 0,
    });
    expect(entity('cover.fixture').state).toBe('closed');
    await store.callService('cover', 'open_cover', { entity_id: 'cover.fixture' });
    expect(entity('cover.fixture').state).toBe('open');
    expect(entity('cover.fixture').attributes.current_position).toBe(100);
    await store.callService('cover', 'close_cover', { entity_id: 'cover.fixture' });
    expect(entity('cover.fixture').attributes.current_position).toBe(0);
  });

  it('sets the target temperature and the mode of a thermostat', async () => {
    await store.callService('climate', 'set_temperature', {
      entity_id: 'climate.fixture',
      temperature: 23.5,
    });
    expect(entity('climate.fixture').attributes.temperature).toBe(23.5);
    await store.callService('climate', 'set_hvac_mode', {
      entity_id: 'climate.fixture',
      hvac_mode: 'cool',
    });
    expect(entity('climate.fixture').state).toBe('cool');
    await store.callService('climate', 'turn_off', { entity_id: 'climate.fixture' });
    expect(entity('climate.fixture').state).toBe('off');
  });

  it('drives a media player: power, volume, play, pause, source, next track', async () => {
    const id = 'media_player.sonos';
    await store.callService('media_player', 'media_pause', { entity_id: id });
    expect(entity(id).state).toBe('paused');
    await store.callService('media_player', 'volume_set', { entity_id: id, volume_level: 0.8 });
    expect(entity(id).attributes.volume_level).toBe(0.8);
    await store.callService('media_player', 'select_source', { entity_id: id, source: 'Radio' });
    expect(entity(id).attributes.source).toBe('Radio');
    const title = entity(id).attributes.media_title;
    await store.callService('media_player', 'media_next_track', { entity_id: id });
    expect(entity(id).state).toBe('playing');
    expect(entity(id).attributes.media_title).not.toBe(title);
    await store.callService('media_player', 'turn_off', { entity_id: id });
    expect(entity(id).state).toBe('off');
    await store.callService('media_player', 'turn_on', { entity_id: id });
    expect(entity(id).state).toBe('idle');
  });

  it('starts and docks the vacuum and the mower', async () => {
    await store.callService('vacuum', 'start', { entity_id: 'vacuum.fixture' });
    expect(entity('vacuum.fixture').state).toBe('cleaning');
    await store.callService('vacuum', 'return_to_base', { entity_id: 'vacuum.fixture' });
    expect(entity('vacuum.fixture').state).toBe('docked');
    await store.callService('lawn_mower', 'start_mowing', { entity_id: 'lawn_mower.fixture' });
    expect(entity('lawn_mower.fixture').state).toBe('mowing');
    await store.callService('lawn_mower', 'dock', { entity_id: 'lawn_mower.fixture' });
    expect(entity('lawn_mower.fixture').state).toBe('docked');
  });

  it('locks, arms the alarm, fans, helpers and buttons', async () => {
    await store.callService('lock', 'unlock', { entity_id: 'lock.fixture' });
    expect(entity('lock.fixture').state).toBe('unlocked');
    await store.callService('alarm_control_panel', 'alarm_arm_away', {
      entity_id: 'alarm_control_panel.fixture',
    });
    expect(entity('alarm_control_panel.fixture').state).toBe('armed_away');
    await store.callService('fan', 'set_percentage', { entity_id: 'fan.fixture', percentage: 0 });
    expect(entity('fan.fixture').state).toBe('off');
    await store.callService('number', 'set_value', { entity_id: 'number.limit', value: 90 });
    expect(entity('number.limit').state).toBe('90');
    await store.callService('select', 'select_option', {
      entity_id: 'select.area',
      option: 'Cucina',
    });
    expect(entity('select.area').state).toBe('Cucina');
    await store.callService('button', 'press', { entity_id: 'button.maintenance' });
    expect(entity('button.maintenance').state).not.toBe('unknown');
  });

  it('keeps the shopping list and its count', async () => {
    const before = Number(entity('todo.fixture').state);
    await store.callService('todo', 'add_item', { entity_id: 'todo.fixture', item: 'Uova' });
    expect(store.todoItems('todo.fixture').some((item) => item.summary === 'Uova')).toBe(true);
    expect(Number(entity('todo.fixture').state)).toBe(before + 1);
  });

  it('resolves with no effect for a service or an entity it does not simulate', async () => {
    const before = store.getEntities();
    await expect(
      store.callService('notify', 'send', { entity_id: 'light.fixture' })
    ).resolves.toBeDefined();
    await expect(
      store.callService('light', 'turn_on', { entity_id: 'light.non_esiste' })
    ).resolves.toBeDefined();
    await expect(
      store.callService('scene', 'turn_on', { entity_id: 'scene.x' })
    ).resolves.toBeDefined();
    expect(store.getEntities()).toBe(before);
  });
});

describe('connection', () => {
  it('answers the registries consistently with the entities, so the classifier works', async () => {
    const conn = createMockConnection(store);
    const [devices, entityRegistry] = await Promise.all([
      getDeviceRegistry(conn),
      getEntityRegistry(conn),
    ]);
    for (const entry of entityRegistry) expect(store.getEntities()[entry.entity_id]).toBeDefined();
    const found = classifyDevices({ devices, entityRegistry, entities: store.getEntities() });
    const byFamily = (family: string) => found.filter((device) => device.family === family);
    expect(byFamily('light').map((device) => device.primaryEntityId)).toContain(
      'light.lampada_comodino'
    );
    expect(byFamily('plug')).toHaveLength(1);
    expect(byFamily('sonos')).toHaveLength(1);
    expect(byFamily('tv')[0]?.remoteId).toBe('remote.fixture');
    expect(byFamily('camera')).toHaveLength(1);
  });

  it('calls services through call_service and sees the change', async () => {
    const conn = createMockConnection(store);
    await conn.sendMessagePromise({
      type: 'call_service',
      domain: 'light',
      service: 'turn_off',
      target: { entity_id: 'light.fixture' },
      service_data: {},
    });
    expect(entity('light.fixture').state).toBe('off');
  });

  it('answers the reads the widgets make: services, config, history, forecast, calendar', async () => {
    const conn = createMockConnection(store);
    const services = (await conn.sendMessagePromise({ type: 'get_services' })) as Record<
      string,
      unknown
    >;
    expect(services.light).toBeDefined();
    const config = (await conn.sendMessagePromise({ type: 'get_config' })) as {
      unit_system: { temperature: string };
    };
    expect(config.unit_system.temperature).toBe('°C');
    const history = await getHistory(conn, {
      start: new Date('2026-10-28T00:00:00Z'),
      end: new Date('2026-10-28T12:00:00Z'),
      entityId: 'sensor.temperatura_esterna',
    });
    expect(history.length).toBeGreaterThan(5);
    const forecast = (await conn.sendMessagePromise({
      type: 'call_service',
      domain: 'weather',
      service: 'get_forecasts',
      target: { entity_id: 'weather.home' },
      service_data: { type: 'daily' },
      return_response: true,
    })) as { response: Record<string, { forecast: unknown[] }> };
    expect(forecast.response['weather.home']!.forecast).toHaveLength(7);
    const events = (await conn.sendMessagePromise({
      type: 'call_service',
      domain: 'calendar',
      service: 'get_events',
      target: { entity_id: 'calendar.famiglia' },
      service_data: {},
      return_response: true,
    })) as { response: Record<string, { events: unknown[] }> };
    expect(events.response['calendar.famiglia']!.events.length).toBeGreaterThan(0);
  });

  it('refuses a command it does not know like Home Assistant does', async () => {
    const conn = createMockConnection(store);
    await expect(conn.sendMessagePromise({ type: 'nonsense/command' })).rejects.toMatchObject({
      code: 'unknown_command',
    });
  });

  it('pushes the changes of the store to a subscribe_entities subscription', async () => {
    const conn = createMockConnection(store);
    const events: Record<string, unknown>[] = [];
    const unsubscribe = await conn.subscribeMessage<Record<string, unknown>>(
      (event) => events.push(event),
      { type: 'subscribe_entities' }
    );
    expect(events[0]).toHaveProperty('a');
    await store.callService('light', 'turn_off', { entity_id: 'light.fixture' });
    const change = events[events.length - 1] as { c: Record<string, { s: string }> };
    expect(change.c['light.fixture']!.s).toBe('off');
    await unsubscribe();
    const count = events.length;
    await store.callService('light', 'turn_on', { entity_id: 'light.fixture' });
    expect(events).toHaveLength(count);
  });
});

describe('device facade', () => {
  let clock: number;
  const facadeAt = () => createMockDeviceFacade(store, { now: () => clock });
  const get = (facade: ReturnType<typeof facadeAt>, path: string) =>
    facade.handle({ path, method: 'GET' });
  const post = (facade: ReturnType<typeof facadeAt>, path: string, body?: unknown) =>
    facade.handle({ path, method: 'POST', body: body === undefined ? null : JSON.stringify(body) });

  beforeEach(() => {
    clock = 1_000_000;
  });

  it('reports the service active', async () => {
    const answer = await get(facadeAt(), '/dispositivi/stato');
    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({
      service: { active: true },
      features: { flows: true, catalog: true },
    });
  });

  it('discovers devices over a few seconds and leaves one not addable, with its reason', async () => {
    const facade = facadeAt();
    const list = async () =>
      ((await get(facade, '/dispositivi/scoperti')).body as { devices: DiscoveredDeviceDto[] })
        .devices;
    expect(await list()).toHaveLength(0);
    clock += 2000;
    expect((await list()).map((device) => device.handler)).toEqual(['webostv']);
    clock += 10_000;
    const all = await list();
    expect(all.map((device) => device.handler)).toEqual(['webostv', 'reolink', 'hue', 'roborock']);
    const blocked = all.find((device) => !device.addable)!;
    expect(blocked.reason).toBeTruthy();
    const refused = await post(facade, `/dispositivi/scoperti/${blocked.flowId}/aggiungi`);
    expect(refused.status).toBe(409);
  });

  it('ignores a discovery and restores it', async () => {
    const facade = facadeAt();
    await get(facade, '/dispositivi/scoperti');
    clock += 10_000;
    await post(facade, '/dispositivi/scoperti/flow-demo-hue/ignora');
    const left = (await get(facade, '/dispositivi/scoperti')).body as {
      devices: DiscoveredDeviceDto[];
    };
    expect(left.devices.map((device) => device.handler)).not.toContain('hue');
    const ignored = (await get(facade, '/dispositivi/scoperti/ignorati')).body as {
      devices: { entryId: string; handler: string }[];
    };
    expect(ignored.devices).toHaveLength(1);
    await post(facade, `/dispositivi/scoperti/ignorati/${ignored.devices[0]!.entryId}/ripristina`);
    const back = (await get(facade, '/dispositivi/scoperti')).body as {
      devices: DiscoveredDeviceDto[];
    };
    expect(back.devices.map((device) => device.handler)).toContain('hue');
  });

  it('adds a discovered device: one confirmation, then an entry whose entities exist', async () => {
    const facade = facadeAt();
    await get(facade, '/dispositivi/scoperti');
    clock += 10_000;
    const started = (await post(facade, '/dispositivi/scoperti/flow-demo-hue/aggiungi'))
      .body as FlowFormDto;
    expect(started.type).toBe('form');
    expect(started.fields).toHaveLength(0);
    const done = (await post(facade, `/dispositivi/flussi/${started.flowId}`, { input: {} }))
      .body as { type: string; entryId: string; entry: EntryDto };
    expect(done.type).toBe('create_entry');
    expect(done.entry.entities.length).toBeGreaterThan(0);
    for (const id of done.entry.entities) expect(store.getEntities()[id]).toBeDefined();
    const classified = classifyDevices({
      devices: store.registries().devices,
      entityRegistry: store.registries().entities,
      entities: store.getEntities(),
    }).find((device) => device.deviceId === done.entry.device!.id);
    expect(classified?.widgetType).toBe('light');
    const after = (await get(facade, '/dispositivi/scoperti')).body as {
      devices: DiscoveredDeviceDto[];
    };
    expect(after.devices.map((device) => device.handler)).not.toContain('hue');
    // «Rimuovi dispositivo» takes the entry and its entities away again.
    const removed = await facade.handle({
      method: 'DELETE',
      path: `/dispositivi/voci/${done.entryId}`,
    });
    expect(removed.status).toBe(200);
    for (const id of done.entry.entities) expect(store.getEntities()[id]).toBeUndefined();
  });

  it('connects the Samsung TV of the network with its remote', async () => {
    const facade = facadeAt();
    const tvs = (await get(facade, '/dispositivi/tv-in-rete')).body as { tvs: TvInReteDto[] };
    expect(tvs.tvs).toHaveLength(1);
    expect(tvs.tvs[0]!.brandKey).toBe('samsung');
    const step = (await post(facade, `/dispositivi/tv-in-rete/${tvs.tvs[0]!.id}/collega`))
      .body as FlowFormDto;
    const done = (await post(facade, `/dispositivi/flussi/${step.flowId}`, { input: {} })).body as {
      entry: EntryDto;
    };
    expect(done.entry.mediaPlayerEntityId).toBeTruthy();
    expect(done.entry.entities.some((id) => id.startsWith('remote.'))).toBe(true);
    const left = (await get(facade, '/dispositivi/tv-in-rete')).body as { tvs: TvInReteDto[] };
    expect(left.tvs).toHaveLength(0);
  });

  it('has no brand logos (404) and refuses anything outside the backend', async () => {
    const facade = facadeAt();
    expect((await get(facade, '/dispositivi/loghi/hue')).status).toBe(404);
    expect((await get(facade, '/settings/current')).status).toBe(404);
    expect((await get(facade, '/dispositivi/flussi/inesistente')).status).toBe(404);
  });

  it('serves the screens through backendRequest without any fetch, and the logos as null', async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('fetch must not be called')));
    vi.stubGlobal('fetch', fetchSpy);
    const facade = facadeAt();
    setBackendOverride(({ method, path, body }) => facade.handle({ method, path, body }));
    await listDiscovered();
    clock += 10_000;
    expect(await listDiscovered()).toHaveLength(4);
    expect(await listTvs()).toHaveLength(1);
    expect(await listIgnored()).toHaveLength(0);
    expect(await fetchBrandLogo('hue', false)).toBeNull();
    await expect(backendRequest('/settings/current')).rejects.toMatchObject({ status: 404 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('backend facade (health, settings, profiles)', () => {
  const backend = () => createMockBackend(createMockDeviceFacade(store, { now: () => 1_000_000 }));
  const call = (facade: ReturnType<typeof backend>, method: string, path: string, body?: unknown) =>
    facade.handle({ method, path, body: body === undefined ? null : JSON.stringify(body) });
  const put = (facade: ReturnType<typeof backend>, data: unknown, base: number | null) =>
    call(facade, 'PUT', '/settings/current', {
      ha_user_id: 'u1',
      device_id: 'tab',
      data,
      base_revision: base,
      device_label: 'Tablet',
    });

  it('answers the health check with the version', async () => {
    const answer = await call(backend(), 'GET', '/health');
    expect(answer).toEqual({ status: 200, body: { status: 'ok', version: __APP_VERSION__ } });
  });

  it('keeps the settings in memory with the revision rule of the server', async () => {
    const facade = backend();
    const query = '?ha_user_id=u1&device_id=tab';
    expect((await call(facade, 'GET', `/settings/current${query}`)).body).toBeNull();
    expect((await put(facade, { a: 1 }, null)).body).toMatchObject({ revision: 1 });
    // A write on a stale revision is refused with the current one, like the server does.
    const stale = await put(facade, { a: 2 }, 5);
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ revision: 1 });
    expect((await put(facade, { a: 2 }, 1)).body).toMatchObject({ revision: 2 });
    const current = (await call(facade, 'GET', `/settings/current${query}`)).body;
    expect(current).toMatchObject({ revision: 2, data: { a: 2 }, device_label: 'Tablet' });
    const old = (await call(facade, 'GET', `/settings/current${query}&revision=1`)).body;
    expect(old).toMatchObject({ revision: 1, data: { a: 1 } });
    const history = (await call(facade, 'GET', `/settings/history${query}`)).body as unknown[];
    expect(history).toHaveLength(2);
    const devices = (await call(facade, 'GET', '/settings/devices?ha_user_id=u1')).body;
    expect(devices).toEqual([expect.objectContaining({ device_id: 'tab', revision: 2 })]);
    await call(facade, 'DELETE', `/settings/history${query}&keep_latest=1`);
    expect(
      ((await call(facade, 'GET', `/settings/history${query}`)).body as unknown[]).length
    ).toBe(1);
  });

  it('creates, lists, updates and deletes profiles in memory', async () => {
    const facade = backend();
    const created = (
      await call(facade, 'POST', '/profiles', { ha_user_id: 'u1', name: 'Sera', data: { x: 1 } })
    ).body as { id: string };
    expect(created.id).toBeTruthy();
    const list = () => call(facade, 'GET', '/profiles?ha_user_id=u1');
    expect((await list()).body).toEqual([expect.objectContaining({ name: 'Sera' })]);
    const renamed = await call(facade, 'PUT', `/profiles/${created.id}`, { name: 'Notte' });
    expect(renamed.body).toMatchObject({ name: 'Notte', data: { x: 1 } });
    await call(facade, 'DELETE', `/profiles/${created.id}`);
    expect((await list()).body).toEqual([]);
  });

  it('serves the device paths through the same facade', async () => {
    expect((await call(backend(), 'GET', '/dispositivi/stato')).status).toBe(200);
  });
});

describe('local pictures', () => {
  it('draws the camera frames and the artwork as inline SVG, never as a network address', () => {
    const camera = demoImageFor('/api/camera_proxy/camera.fixture?t=1');
    const art = demoImageFor('/api/media_player_proxy/media_player.sonos?t=Notte');
    expect(camera).toMatch(/^data:image\/svg\+xml/);
    expect(art).toMatch(/^data:image\/svg\+xml/);
    expect(demoImageFor('https://example.com/cover.jpg')).toBeNull();
  });
});
