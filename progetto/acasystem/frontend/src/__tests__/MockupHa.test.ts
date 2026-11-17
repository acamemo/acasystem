/**
 * The simulated Home Assistant of the demo mode (REP-20261028-005, K1): the store and its
 * services, the fake connection the widgets use, and the device facade answered in the browser.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DiscoveredDeviceDto,
  EntryDto,
  FlowFormDto,
  FlowResponseDto,
  TvInReteDto,
} from '@/@types/devices';
import { getHistory } from '@/api/haClient';
import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { backendRequest, setBackendOverride } from '@/api/backendClient';
import { fetchBrandLogo, listDiscovered, listIgnored, listTvs } from '@/api/devicesApi';
import { adaptiveFixtureEntities } from '@/utils/fixtures/adaptiveData';
import { boundDeviceIds, boundEntityIds, unboundDevices } from '@/utils/devices/bound';
import { classifyDevices } from '@/utils/devices/classify';
import { createMockBackend } from '@/utils/mockup/backendFacade';
import { createMockDeviceFacade } from '@/utils/mockup/deviceFacade';
import { createMockHaStore, type MockHaStore } from '@/utils/mockup/haStore';
import { demoImageFor } from '@/utils/mockup/images';
import { createMockConnection } from '@/utils/mockup/mockConnection';
import {
  FIXTURE_TO_HOUSE,
  buildRegistries,
  mockBindingSettings,
  mockHouse,
} from '@/utils/mockup/mockData';
import { buildMockupSeed } from '@/utils/mockup/seed';

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
    // Every fixture entity is in the house, under the id and the name of a house.
    for (const id of Object.keys(adaptiveFixtureEntities)) {
      expect(entities[FIXTURE_TO_HOUSE[id]!], id).toBeDefined();
      expect(entities[id], id).toBeUndefined();
    }
    expect(entities['weather.home']).toBeDefined();
    expect(entities['calendar.famiglia']).toBeDefined();
    expect(entity('light.luce_soggiorno').attributes.friendly_name).toBe('Luce soggiorno');
  });

  it('does not share objects with the fixtures it was seeded from', async () => {
    await store.callService('light', 'turn_off', { entity_id: 'light.luce_soggiorno' });
    expect(adaptiveFixtureEntities['light.fixture']!.state).toBe('on');
  });

  it('notifies the subscribers with a new map and stops after unsubscribe', async () => {
    const listener = vi.fn();
    const before = store.getEntities();
    const unsubscribe = store.subscribe(listener);
    await store.callService('switch', 'turn_on', { entity_id: 'switch.auto_ricarica' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getEntities()).not.toBe(before);
    expect(store.getEntities()['light.luce_soggiorno']).toBe(before['light.luce_soggiorno']);
    unsubscribe();
    await store.callService('switch', 'turn_off', { entity_id: 'switch.auto_ricarica' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('store (callService)', () => {
  it('turns lights and switches on and off, with brightness and colour', async () => {
    await store.callService('light', 'turn_off', { entity_id: 'light.luce_soggiorno' });
    expect(entity('light.luce_soggiorno').state).toBe('off');
    await store.callService('light', 'turn_on', {
      entity_id: 'light.luce_soggiorno',
      brightness_pct: 50,
      hs_color: [10, 90],
    });
    expect(entity('light.luce_soggiorno').state).toBe('on');
    expect(entity('light.luce_soggiorno').attributes.brightness).toBe(128);
    expect(entity('light.luce_soggiorno').attributes.hs_color).toEqual([10, 90]);
    await store.callService('light', 'toggle', { entity_id: 'light.luce_soggiorno' });
    expect(entity('light.luce_soggiorno').state).toBe('off');
    await store.callService('switch', 'turn_on', { target: { entity_id: 'switch.auto_ricarica' } });
    expect(entity('switch.auto_ricarica').state).toBe('on');
  });

  it('moves covers and keeps the state in step with the position', async () => {
    await store.callService('cover', 'set_cover_position', {
      entity_id: 'cover.tapparella_soggiorno',
      position: 0,
    });
    expect(entity('cover.tapparella_soggiorno').state).toBe('closed');
    await store.callService('cover', 'open_cover', { entity_id: 'cover.tapparella_soggiorno' });
    expect(entity('cover.tapparella_soggiorno').state).toBe('open');
    expect(entity('cover.tapparella_soggiorno').attributes.current_position).toBe(100);
    await store.callService('cover', 'close_cover', { entity_id: 'cover.tapparella_soggiorno' });
    expect(entity('cover.tapparella_soggiorno').attributes.current_position).toBe(0);
  });

  it('sets the target temperature and the mode of a thermostat', async () => {
    await store.callService('climate', 'set_temperature', {
      entity_id: 'climate.termostato_soggiorno',
      temperature: 23.5,
    });
    expect(entity('climate.termostato_soggiorno').attributes.temperature).toBe(23.5);
    await store.callService('climate', 'set_hvac_mode', {
      entity_id: 'climate.termostato_soggiorno',
      hvac_mode: 'cool',
    });
    expect(entity('climate.termostato_soggiorno').state).toBe('cool');
    await store.callService('climate', 'turn_off', { entity_id: 'climate.termostato_soggiorno' });
    expect(entity('climate.termostato_soggiorno').state).toBe('off');
  });

  it('drives a media player: power, volume, play, pause, source, next track', async () => {
    const id = 'media_player.sonos_soggiorno';
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
    await store.callService('vacuum', 'start', { entity_id: 'vacuum.aspirapolvere' });
    expect(entity('vacuum.aspirapolvere').state).toBe('cleaning');
    await store.callService('vacuum', 'return_to_base', { entity_id: 'vacuum.aspirapolvere' });
    expect(entity('vacuum.aspirapolvere').state).toBe('docked');
    await store.callService('lawn_mower', 'start_mowing', {
      entity_id: 'lawn_mower.tagliaerba_giardino',
    });
    expect(entity('lawn_mower.tagliaerba_giardino').state).toBe('mowing');
    await store.callService('lawn_mower', 'dock', { entity_id: 'lawn_mower.tagliaerba_giardino' });
    expect(entity('lawn_mower.tagliaerba_giardino').state).toBe('docked');
  });

  it('locks, arms the alarm, fans, helpers and buttons', async () => {
    await store.callService('lock', 'unlock', { entity_id: 'lock.porta_ingresso' });
    expect(entity('lock.porta_ingresso').state).toBe('unlocked');
    await store.callService('alarm_control_panel', 'alarm_arm_away', {
      entity_id: 'alarm_control_panel.allarme_casa',
    });
    expect(entity('alarm_control_panel.allarme_casa').state).toBe('armed_away');
    await store.callService('fan', 'set_percentage', {
      entity_id: 'fan.ventilatore_camera',
      percentage: 0,
    });
    expect(entity('fan.ventilatore_camera').state).toBe('off');
    await store.callService('number', 'set_value', {
      entity_id: 'number.auto_limite_carica',
      value: 90,
    });
    expect(entity('number.auto_limite_carica').state).toBe('90');
    await store.callService('select', 'select_option', {
      entity_id: 'select.aspirapolvere_stanza',
      option: 'Cucina',
    });
    expect(entity('select.aspirapolvere_stanza').state).toBe('Cucina');
    await store.callService('button', 'press', { entity_id: 'button.aspirapolvere_manutenzione' });
    expect(entity('button.aspirapolvere_manutenzione').state).not.toBe('unknown');
  });

  it('keeps the shopping list and its count', async () => {
    const before = Number(entity('todo.lista_spesa').state);
    await store.callService('todo', 'add_item', { entity_id: 'todo.lista_spesa', item: 'Uova' });
    expect(store.todoItems('todo.lista_spesa').some((item) => item.summary === 'Uova')).toBe(true);
    expect(Number(entity('todo.lista_spesa').state)).toBe(before + 1);
  });

  it('resolves with no effect for a service or an entity it does not simulate', async () => {
    const before = store.getEntities();
    await expect(
      store.callService('notify', 'send', { entity_id: 'light.luce_soggiorno' })
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
    expect(byFamily('light').map((device) => device.primaryEntityId)).toEqual(
      expect.arrayContaining([
        'light.luce_soggiorno',
        'light.luce_divano',
        'light.lampada_comodino',
      ])
    );
    // Two single outlets and one simulated multichannel power strip.
    expect(byFamily('plug').map(device => device.deviceId).sort()).toEqual(
      ['dev_multipresa_studio', 'dev_presa_lampada_lettura', 'dev_presa_lavatrice'].sort()
    );
    expect(byFamily('sonos').map(device => device.deviceId).sort()).toEqual(['dev_multimedia_sonos', 'dev_multimedia_sonos_single', 'dev_sonos']);
    const tvs = byFamily('tv');
    expect(tvs.map((device) => device.primaryEntityId).sort()).toEqual([
      'media_player.apple_tv_camera',
      'media_player.multimedia_apple_single',
      'media_player.multimedia_tv_a',
      'media_player.multimedia_tv_single',
      'media_player.tv_cucina',
      'media_player.tv_soggiorno',
    ]);
    // The Samsung and the Apple TV bring a remote; the LG webOS one does not.
    expect(tvs.find((device) => device.platform === 'samsungtv')?.remoteId).toBe(
      'remote.tv_cucina'
    );
    expect(tvs.find((device) => device.platform === 'webostv')?.remoteId).toBeUndefined();
    expect(byFamily('camera')).toHaveLength(3);
  });

  it('calls services through call_service and sees the change', async () => {
    const conn = createMockConnection(store);
    await conn.sendMessagePromise({
      type: 'call_service',
      domain: 'light',
      service: 'turn_off',
      target: { entity_id: 'light.luce_soggiorno' },
      service_data: {},
    });
    expect(entity('light.luce_soggiorno').state).toBe('off');
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
    await store.callService('light', 'turn_off', { entity_id: 'light.luce_soggiorno' });
    const change = events[events.length - 1] as { a: Record<string, { s: string }> };
    // `a` (the whole entity): the `c` of Home Assistant is a diff that subscribeEntities applies.
    expect(change.a['light.luce_soggiorno']!.s).toBe('off');
    await unsubscribe();
    const count = events.length;
    await store.callService('light', 'turn_on', { entity_id: 'light.luce_soggiorno' });
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
    clock += 3500;
    expect((await list()).map((device) => device.handler)).toEqual(['hue']);
    clock += 10_000;
    const all = await list();
    expect(all.map((device) => device.handler)).toEqual(['hue', 'reolink', 'home_connect']);
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
    // One device is hidden from the start, the one just ignored joins it.
    expect(ignored.devices.map((device) => device.handler).sort()).toEqual(['cast', 'hue']);
    const hue = ignored.devices.find((device) => device.handler === 'hue')!;
    await post(facade, `/dispositivi/scoperti/ignorati/${hue.entryId}/ripristina`);
    const back = (await get(facade, '/dispositivi/scoperti')).body as {
      devices: DiscoveredDeviceDto[];
    };
    expect(back.devices.map((device) => device.handler)).toContain('hue');
  });

  it('adds a discovered device: the step of its integration, then an entry whose entities exist', async () => {
    const facade = facadeAt();
    await get(facade, '/dispositivi/scoperti');
    clock += 10_000;
    const started = (await post(facade, '/dispositivi/scoperti/flow-demo-hue/aggiungi'))
      .body as FlowFormDto;
    // The Hue bridge asks to press its button: a form with nothing to write.
    expect(started.type).toBe('form');
    expect(started.stepId).toBe('link');
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
    expect(await listDiscovered()).toHaveLength(3);
    expect(await listTvs()).toHaveLength(2);
    expect(await listIgnored()).toHaveLength(1);
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
    const camera = demoImageFor('/api/camera_proxy/camera.videocamera_ingresso?t=1');
    const art = demoImageFor('/api/media_player_proxy/media_player.sonos_soggiorno?t=Notte');
    expect(camera).toMatch(/^data:image\/svg\+xml/);
    expect(art).toMatch(/^data:image\/svg\+xml/);
    expect(demoImageFor('https://example.com/cover.jpg')).toBeNull();
  });
});

describe('the house', () => {
  const classified = (house: ReturnType<typeof mockHouse>) => {
    const registry = buildRegistries(house.entities, house.devices);
    return classifyDevices({
      devices: registry.devices,
      entityRegistry: registry.entities,
      entities: house.entities,
    });
  };

  it('has six rooms and devices of the brands of a real house, each in its room', () => {
    const house = mockHouse();
    expect(house.areas.map((area) => area.name)).toEqual([
      'Soggiorno',
      'Cucina',
      'Camera da letto',
      'Bagno',
      'Ingresso',
      'Giardino',
    ]);
    const maker = (name: string) => house.devices.filter((d) => d.manufacturer.includes(name));
    expect(maker('Signify')).toHaveLength(3);
    expect(maker('Shelly')).toHaveLength(1);
    expect(maker('Somfy')).toHaveLength(2);
    for (const name of ['Sonos', 'Reolink', 'Nuki', 'Roborock', 'Husqvarna', 'tado', 'Tesla']) {
      expect(maker(name).length, name).toBeGreaterThan(0);
    }
    const lg = house.devices.find((device) => device.platform === 'webostv')!;
    expect(lg.model).toBe('UA751C0LA');
    expect(house.devices.some((device) => device.platform === 'samsungtv')).toBe(true);
    const areaIds = new Set(house.areas.map((area) => area.area_id));
    for (const device of house.devices) {
      if (device.areaId) expect(areaIds.has(device.areaId), device.name).toBe(true);
    }
    // Entities in the registry carry the integration of their device and the room.
    const registry = buildRegistries(house.entities, house.devices);
    const camera = registry.entities.find((e) => e.entity_id === 'camera.videocamera_ingresso')!;
    expect(camera).toMatchObject({ platform: 'reolink', area_id: 'ingresso' });
    const lgDevice = registry.devices.find((device) => device.id === lg.id)!;
    expect(lgDevice.identifiers).toEqual([['webostv', expect.any(String)]]);
    expect(lgDevice.connections).toEqual([['mac', expect.any(String)]]);
  });

  it('classifies every device to its family, the Reolink as a camera', () => {
    const house = mockHouse();
    const byDevice = new Map(classified(house).map((device) => [device.deviceId, device]));
    const expected: Record<string, string> = {
      dev_luce_soggiorno: 'light',
      dev_luce_divano: 'light',
      dev_lampada_comodino: 'light',
      dev_sensore_soggiorno: 'sensor',
      dev_termostato: 'climate',
      dev_tapparella: 'cover',
      dev_tenda: 'cover',
      dev_sonos: 'sonos',
      dev_tv_soggiorno: 'tv',
      dev_altoparlante: 'media',
      dev_tv_cucina: 'tv',
      dev_ventilatore: 'fan',
      dev_appletv: 'tv',
      dev_presa_lavatrice: 'plug',
      dev_videocamera: 'camera',
      dev_serratura: 'lock',
      dev_allarme: 'alarm',
      dev_aspirapolvere: 'vacuum',
      dev_tagliaerba: 'mower',
      dev_stazione_meteo: 'sensor',
    };
    for (const [id, family] of Object.entries(expected)) {
      expect(byDevice.get(id)?.family, id).toBe(family);
    }
    // The Reolink has a floodlight and a motion sensor, and is still one camera.
    expect(byDevice.get('dev_videocamera')?.entityIds).toEqual(['camera.videocamera_ingresso']);
    // The car is no family of the finder: its widget is added by hand.
    expect(byDevice.has('dev_auto')).toBe(false);
  });

  it('binds every widget of the seeded pages to entities that exist, and none to a fixture id', () => {
    const house = mockHouse();
    const seed = buildMockupSeed();
    const cardSettings = JSON.parse(seed.storage.tunet_card_settings!) as Record<
      string,
      Record<string, unknown>
    >;
    const ids = (value: unknown): string[] =>
      typeof value === 'string'
        ? /^[a-z_]+\.[a-z0-9_]+$/.test(value)
          ? [value]
          : []
        : Array.isArray(value)
          ? value.flatMap(ids)
          : typeof value === 'object' && value !== null
            ? Object.values(value).flatMap(ids)
            : [];
    let bound = 0;
    for (const [key, settings] of Object.entries(cardSettings)) {
      expect(JSON.stringify(settings), key).not.toContain('fixture');
      for (const id of ids(settings)) {
        expect(house.entities[id], `${key}: ${id}`).toBeDefined();
        bound += 1;
      }
    }
    expect(bound).toBeGreaterThan(100);
    // The widgets read real names: the thermostat widget points at the thermostat.
    const climate = Object.values(cardSettings).find((s) => s.categoryWidgetType === 'climate')!;
    expect(climate.climateId).toBe('climate.termostato_soggiorno');
    expect(mockBindingSettings('room')).toMatchObject({ areaId: 'soggiorno' });
  });

  it('offers unbound products and ordinary physical sensors through «Crea il widget»', () => {
    const house = mockHouse();
    const seed = buildMockupSeed();
    const pagesConfig = JSON.parse(seed.storage.tunet_pages_config!);
    const cardSettings = JSON.parse(seed.storage.tunet_card_settings!);
    const found = classified(house);
    const registry = buildRegistries(house.entities, house.devices);
    const entityDevice = new Map(
      registry.entities.map((e) => [e.entity_id, e.device_id as string])
    );
    const free = unboundDevices(
      found,
      boundEntityIds(pagesConfig, cardSettings),
      boundDeviceIds(pagesConfig, cardSettings, entityDevice)
    ).map((device) => device.name);
    expect(free.sort()).toEqual(['Pulsante ingresso', 'Sensore movimento corridoio', 'Sensore ambiente studio', 'Sensore finestra studio', 'TV studio', 'Apple TV studio', 'Lettore studio', 'Sonos studio', 'TV multicanale', 'Lettore multizona', 'Sonos multicanale', 'Aspirapolvere studio', 'Robot pulizia', 'Tagliaerba esterno', 'Robot giardino', 'Videocamera studio', 'Viste esterno', 'Allarme studio', 'Zone di casa', 'Accessi studio', 'Serratura studio', 'Climatizzatore studio', 'Lampada comodino', 'Multipresa studio', 'Presa lampada lettura', 'Tapparella camera', 'Termostato camera', 'Veneziane studio', 'Ventilatore cucina', 'Ventilazione studio'].sort());
    expect(found.length - free.length).toBeGreaterThan(15);
  });
});

describe('connection flows', () => {
  let clock: number;
  const facadeAt = () =>
    createMockDeviceFacade(store, {
      now: () => clock,
      delays: { consentMs: 0, progressMs: 3000, checkMs: 0 },
    });
  type Facade = ReturnType<typeof facadeAt>;
  const call = (facade: Facade, method: string, path: string, body?: unknown) =>
    facade.handle({ method, path, body: body === undefined ? null : JSON.stringify(body) });
  const answer = (facade: Facade, flowId: string, input: Record<string, unknown>) =>
    call(facade, 'POST', `/dispositivi/flussi/${flowId}`, { input });
  const classifiedNow = (deviceId: string) =>
    classifyDevices({
      devices: store.registries().devices,
      entityRegistry: store.registries().entities,
      entities: store.getEntities(),
    }).find((device) => device.deviceId === deviceId);
  const tvs = async (facade: Facade) =>
    ((await call(facade, 'GET', '/dispositivi/tv-in-rete')).body as { tvs: TvInReteDto[] }).tvs;

  beforeEach(() => {
    clock = 1_000_000;
  });

  it('Samsung TV: a code shown on the TV is asked, a wrong one is refused, then the entry', async () => {
    const facade = facadeAt();
    await tvs(facade);
    clock += 5000;
    const samsung = (await tvs(facade)).find((tv) => tv.handler === 'samsungtv')!;
    expect(samsung.conferma).toBe('pin');
    const step = (await call(facade, 'POST', `/dispositivi/tv-in-rete/${samsung.id}/collega`))
      .body as FlowFormDto;
    expect(step.type).toBe('form');
    expect(step.fields).toEqual([expect.objectContaining({ name: 'pin', kind: 'text' })]);
    const refused = (await answer(facade, step.flowId, { pin: '0000' })).body as FlowFormDto;
    expect(refused.type).toBe('form');
    expect(refused.errors[0]).toMatchObject({ field: 'pin' });
    const done = (await answer(facade, step.flowId, { pin: '4821' })).body as {
      type: string;
      entry: EntryDto;
    };
    expect(done.type).toBe('create_entry');
    expect(done.entry.mediaPlayerEntityId).toBeTruthy();
    expect(done.entry.entities.some((id) => id.startsWith('remote.'))).toBe(true);
    expect(classifiedNow(done.entry.device!.id)).toMatchObject({ family: 'tv' });
    expect((await tvs(facade)).map((tv) => tv.handler)).not.toContain('samsungtv');
  });

  it('LG TV: accept on the TV, a wait of a few seconds, then the entry', async () => {
    const facade = facadeAt();
    await tvs(facade);
    clock += 2000;
    const [lg] = await tvs(facade);
    expect(lg).toMatchObject({ model: 'NANO81T6A', handler: 'webostv', conferma: 'consenti' });
    const step = (await call(facade, 'POST', `/dispositivi/tv-in-rete/${lg!.id}/collega`))
      .body as FlowFormDto;
    expect(step.type).toBe('form');
    expect(step.fields).toHaveLength(0);
    const waiting = (await answer(facade, step.flowId, {})).body as { type: string };
    expect(waiting.type).toBe('progress');
    clock += 1000;
    const still = (await call(facade, 'GET', `/dispositivi/flussi/${step.flowId}`))
      .body as FlowResponseDto;
    expect(still.type).toBe('progress');
    clock += 3000;
    const done = (await call(facade, 'GET', `/dispositivi/flussi/${step.flowId}`)).body as {
      type: string;
      entry: EntryDto;
    };
    expect(done.type).toBe('create_entry');
    expect(done.entry.device).toMatchObject({
      model: 'NANO81T6A',
      manufacturer: 'LG Electronics',
    });
    expect(classifiedNow(done.entry.device!.id)).toMatchObject({
      family: 'tv',
      platform: 'webostv',
    });
  });

  it('Hue bridge: press the button, then the lights of the bridge arrive', async () => {
    const facade = facadeAt();
    await call(facade, 'GET', '/dispositivi/scoperti');
    clock += 10_000;
    const step = (await call(facade, 'POST', '/dispositivi/scoperti/flow-demo-hue/aggiungi'))
      .body as FlowFormDto;
    expect(step.title).toMatch(/Hue/);
    expect(step.description).toMatch(/pulsante/);
    const done = (await answer(facade, step.flowId, {})).body as { entry: EntryDto };
    expect(classifiedNow(done.entry.device!.id)).toMatchObject({ family: 'light' });
    expect(store.registries().devices.some((device) => device.name === 'Philips Hue Bridge')).toBe(
      true
    );
    const left = (await call(facade, 'GET', '/dispositivi/scoperti')).body as {
      devices: DiscoveredDeviceDto[];
    };
    expect(left.devices.map((device) => device.handler)).not.toContain('hue');
  });

  it('a form flow with a field: a wrong value is refused on the step, then the entry', async () => {
    const facade = facadeAt();
    const step = (await call(facade, 'POST', '/dispositivi/flussi', { handler: 'shelly' }))
      .body as FlowFormDto;
    expect(step.fields).toEqual([expect.objectContaining({ name: 'host', required: true })]);
    const refused = (await answer(facade, step.flowId, { host: '' })).body as FlowFormDto;
    expect(refused.errors[0]).toMatchObject({ field: 'host' });
    const done = (await answer(facade, step.flowId, { host: '192.168.1.40' })).body as {
      entry: EntryDto;
    };
    expect(classifiedNow(done.entry.device!.id)).toMatchObject({ family: 'plug' });
  });

  it('Reolink doorbell: user and password, and the camera comes with its motion sensor', async () => {
    const facade = facadeAt();
    await call(facade, 'GET', '/dispositivi/scoperti');
    clock += 10_000;
    const step = (
      await call(facade, 'POST', '/dispositivi/scoperti/flow-demo-reolink-campanello/aggiungi')
    ).body as FlowFormDto;
    expect(step.fields.map((field) => field.kind)).toEqual(['text', 'password']);
    const refused = (await answer(facade, step.flowId, { username: 'admin', password: '' }))
      .body as FlowFormDto;
    expect(refused.errors[0]).toMatchObject({ field: 'password' });
    const done = (await answer(facade, step.flowId, { username: 'admin', password: 'segreta' }))
      .body as { entry: EntryDto };
    expect(done.entry.entities).toHaveLength(2);
    expect(classifiedNow(done.entry.device!.id)).toMatchObject({ family: 'camera' });
  });
});

describe('scenarios', () => {
  it('the normal house has every entity answering', () => {
    const { entities } = mockHouse('normal');
    expect(Object.values(entities).some((entity) => entity.state === 'unavailable')).toBe(false);
  });

  it('«Non raggiungibili» makes some devices unavailable and keeps their names', () => {
    const { entities } = mockHouse('unreachable');
    const down = Object.values(entities).filter((entity) => entity.state === 'unavailable');
    expect(down.length).toBeGreaterThan(8);
    expect(entities['light.luce_soggiorno']!.state).toBe('unavailable');
    expect(entities['light.luce_soggiorno']!.attributes.friendly_name).toBe('Luce soggiorno');
    expect(entities['light.luce_soggiorno']!.attributes.brightness).toBeUndefined();
    expect(entities['lock.porta_ingresso']!.state).toBe('unavailable');
    expect(entities['lock.porta_ingresso']!.attributes.friendly_name).toBe('Porta d’ingresso');
    expect(entities['lock.serratura_studio']!.state).not.toBe('unavailable');
    expect(entities['lawn_mower.tagliaerba_giardino']!.state).toBe('unavailable');
    expect(entities['lawn_mower.tagliaerba_esterno']!.state).not.toBe('unavailable');
    // A device without a widget that does not answer is still offered, last, with its tag.
    expect(entities['light.lampada_comodino']!.state).toBe('unavailable');
  });

  it('«Nomi lunghi» makes the names of entities, devices and rooms very long', () => {
    const house = mockHouse('longNames');
    for (const id of [
      'light.luce_soggiorno',
      'climate.termostato_soggiorno',
      'media_player.sonos_soggiorno',
    ]) {
      expect(String(house.entities[id]!.attributes.friendly_name).length, id).toBeGreaterThan(60);
    }
    expect(house.devices.every((device) => device.name.length > 50)).toBe(true);
    expect(house.areas.every((area) => area.name.length > 35)).toBe(true);
    const title = house.entities['media_player.sonos_soggiorno']!.attributes.media_title;
    expect(String(title).length).toBeGreaterThan(50);
  });

  it('«Valori estremi» puts numbers at the ends of their range', () => {
    const { entities } = mockHouse('extremes');
    const state = (id: string) => entities[id]!.state;
    expect(Number(state('sensor.soggiorno_temperatura'))).toBeLessThan(-20);
    expect(state('sensor.soggiorno_umidita')).toBe('100');
    expect(state('sensor.auto_batteria')).toBe('0');
    expect(Number(state('sensor.costo_mese'))).toBeGreaterThan(1_000_000);
    expect(entities['light.luce_soggiorno']!.attributes.brightness).toBe(255);
    expect(entities['fan.ventilatore_camera']!.attributes.percentage).toBe(100);
    expect(entities['cover.tapparella_soggiorno']!.attributes.current_position).toBe(0);
    expect(
      Number(entities['climate.termostato_soggiorno']!.attributes.current_temperature)
    ).toBeLessThan(0);
    expect(entities['media_player.sonos_soggiorno']!.attributes.volume_level).toBe(0);
  });

  it('«Casa vuota» has the rooms and nothing else, and its pages are empty', () => {
    const house = mockHouse('empty');
    expect(Object.keys(house.entities)).toHaveLength(0);
    expect(house.devices).toHaveLength(0);
    expect(house.areas).toHaveLength(6);
    const seed = buildMockupSeed('empty');
    const pagesConfig = JSON.parse(seed.storage.tunet_pages_config!) as Record<string, unknown>;
    expect((pagesConfig.pages as string[]).length).toBeGreaterThan(5);
    for (const pageId of pagesConfig.pages as string[]) expect(pagesConfig[pageId]).toEqual([]);
    expect(JSON.parse(seed.storage.tunet_card_settings!)).toEqual({});
    const empty = createMockHaStore({ scenario: 'empty' });
    expect(empty.registries().devices).toHaveLength(0);
    empty.dispose();
  });

  it('the store is built from the scenario it is given', () => {
    const extremes = createMockHaStore({ scenario: 'extremes' });
    expect(extremes.getEntities()['sensor.auto_batteria']!.state).toBe('0');
    extremes.dispose();
  });
});

describe('TVs of the demo (states of the widget)', () => {
  const LG = 'media_player.tv_soggiorno';
  const APPLE = 'media_player.apple_tv_camera';
  const call = (id: string, service: string) =>
    store.callService('media_player', service, { entity_id: id });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const bits = (id: string) => Number(entity(id).attributes.supported_features);
  const KITCHEN = 'media_player.tv_cucina';
  const has = (id: string, feature: number) => (bits(id) & feature) === feature;

  it('the LG starts on live TV: the channel is the title, with no programme, app or position', () => {
    const attributes = entity(LG).attributes;
    expect(entity(LG).state).toBe('on');
    expect(attributes.source).toBe('Live TV');
    expect(attributes.media_title).toBe('Rai 1');
    expect(attributes.media_content_type).toBe('channel');
    for (const key of [
      'app_name',
      'media_position',
      'media_duration',
      'shuffle',
      'repeat',
      'media_artist',
      'media_content_id',
    ]) {
      expect(attributes[key]).toBeUndefined();
    }
    expect(attributes.source_list).toEqual([
      'Live TV',
      'HDMI 1',
      'HDMI 2',
      'Netflix',
      'YouTube',
      'Prime Video',
    ]);
  });

  it('the LG declares what webostv declares and nothing else; no demo TV declares everything', () => {
    // TURN_OFF, NEXT, PAUSE, PREVIOUS, SELECT_SOURCE, PLAY_MEDIA, PLAY, STOP, mute, step, set,
    // and TURN_ON because its power-on recipe is set up.
    expect(bits(LG)).toBe(256 | 32 | 1 | 16 | 2048 | 512 | 16384 | 4096 | 8 | 1024 | 4 | 128);
    // No SEEK (2), SHUFFLE_SET (32768), REPEAT_SET (262144) or BROWSE_MEDIA (131072).
    expect(bits(LG) & (2 | 32768 | 262144 | 131072)).toBe(0);
    expect(bits(KITCHEN)).toBe(32 | 1 | 16384 | 512 | 16 | 2048 | 4096 | 256 | 8 | 4 | 1024);
    expect(bits(KITCHEN)).not.toBe(1048575);
  });

  it('channel up and down walk the list, by the media keys and by webostv.button', async () => {
    await call(LG, 'media_next_track');
    expect(entity(LG).attributes.media_title).toBe('Rai 2');
    await store.callService('webostv', 'button', { entity_id: LG, button: 'CHANNELUP' });
    expect(entity(LG).attributes.media_title).toBe('Rai 3');
    await store.callService('webostv', 'button', { entity_id: LG, button: 'CHANNELDOWN' });
    await call(LG, 'media_previous_track');
    await call(LG, 'media_previous_track');
    // Before Rai 1 comes La7, the end of the list.
    expect(entity(LG).attributes.media_title).toBe('La7');
    expect(entity(LG).state).toBe('on');
    await call(LG, 'media_next_track');
    expect(entity(LG).attributes.media_title).toBe('Rai 1');
  });

  it('play_media of a channel matches the number, then the name, then a part of it', async () => {
    const play = (media_content_id: string, media_content_type = 'channel') =>
      store.callService('media_player', 'play_media', {
        entity_id: LG,
        media_content_type,
        media_content_id,
      });
    await play('4');
    expect(entity(LG).attributes.media_title).toBe('Rete 4');
    await play('la7');
    expect(entity(LG).attributes.media_title).toBe('La7');
    await play('canale');
    expect(entity(LG).attributes.media_title).toBe('Canale 5');
    // A channel that is not in the list, or another type, changes nothing.
    await play('Rai 9');
    await play('Rai 2', 'music');
    expect(entity(LG).attributes.media_title).toBe('Canale 5');
  });

  it('an app source clears the channel and keeps the state; Live TV brings the channel back', async () => {
    await call(LG, 'media_next_track');
    await store.callService('media_player', 'select_source', { entity_id: LG, source: 'Netflix' });
    expect(entity(LG).state).toBe('on');
    expect(entity(LG).attributes.source).toBe('Netflix');
    expect(entity(LG).attributes.media_title).toBeUndefined();
    expect(entity(LG).attributes.media_content_type).toBeUndefined();
    // Previous/next are fast forward and rewind there: no channel moves.
    await call(LG, 'media_next_track');
    expect(entity(LG).attributes.media_title).toBeUndefined();
    await store.callService('media_player', 'select_source', { entity_id: LG, source: 'Live TV' });
    expect(entity(LG).attributes.media_title).toBe('Rai 2');
    expect(entity(LG).attributes.media_content_type).toBe('channel');
  });

  it('the sound output moves the volume features of the LG, lineout drops mute and steps too', async () => {
    const output = (sound_output: string) =>
      store.callService('webostv', 'select_sound_output', { entity_id: LG, sound_output });
    await output('external_speaker');
    expect(has(LG, 4)).toBe(false);
    expect(has(LG, 8 | 1024)).toBe(true);
    await output('lineout');
    expect(bits(LG) & (4 | 8 | 1024)).toBe(0);
    expect(has(LG, 128)).toBe(true);
    await output('tv_speaker');
    expect(has(LG, 4 | 8 | 1024)).toBe(true);
  });

  it('with the power-on recipe the LG is off (and declares TURN_ON); it wakes ~3 s after turn_on', async () => {
    await call(LG, 'turn_off');
    expect(entity(LG).state).toBe('off');
    expect(has(LG, 128)).toBe(true);
    expect(entity(LG).attributes.media_title).toBeUndefined();
    expect(entity(LG).attributes.friendly_name).toBe('TV soggiorno');
    // A TV that is off takes nothing.
    await call(LG, 'volume_up');
    await call(LG, 'media_next_track');
    expect(entity(LG).state).toBe('off');
    await call(LG, 'turn_on');
    vi.advanceTimersByTime(2900);
    expect(entity(LG).state).toBe('off');
    vi.advanceTimersByTime(200);
    expect(entity(LG).state).toBe('on');
    expect(entity(LG).attributes.source).toBe('Live TV');
    expect(entity(LG).attributes.media_title).toBe('Rai 1');
    expect(entity(LG).attributes.source_list).toBeDefined();
  });

  it('without the recipe the LG goes unavailable; saving the recipe turns it into off with TURN_ON', async () => {
    store.setWakeRecipe(LG, false);
    expect(has(LG, 128)).toBe(false);
    await call(LG, 'turn_off');
    expect(entity(LG).state).toBe('unavailable');
    await call(LG, 'turn_on');
    vi.advanceTimersByTime(4000);
    expect(entity(LG).state).toBe('unavailable');
    store.setWakeRecipe(LG, true);
    expect(entity(LG).state).toBe('off');
    expect(has(LG, 128)).toBe(true);
  });

  it('the Samsung TV: no volume level, mute toggles, channel keys change nothing visible', async () => {
    const attributes = () => entity(KITCHEN).attributes;
    expect(entity(KITCHEN).state).toBe('off');
    expect(attributes().volume_level).toBeUndefined();
    expect(attributes().source_list).toEqual(['TV', 'HDMI', 'Netflix', 'YouTube']);
    expect(attributes().media_title).toBeUndefined();
    // It cannot be woken without a recipe.
    await call(KITCHEN, 'turn_on');
    expect(entity(KITCHEN).state).toBe('off');
    store.setWakeRecipe(KITCHEN, true);
    expect(has(KITCHEN, 128)).toBe(true);
    await call(KITCHEN, 'turn_on');
    expect(entity(KITCHEN).state).toBe('on');
    expect(attributes().source).toBe('TV');
    await call(KITCHEN, 'volume_mute');
    expect(attributes().is_volume_muted).toBe(true);
    await call(KITCHEN, 'volume_mute');
    expect(attributes().is_volume_muted).toBe(false);
    await call(KITCHEN, 'volume_up');
    await call(KITCHEN, 'media_next_track');
    expect(attributes().volume_level).toBeUndefined();
    expect(attributes().media_title).toBeUndefined();
    expect(attributes().source).toBe('TV');
    await call(KITCHEN, 'turn_off');
    expect(entity(KITCHEN).state).toBe('off');
  });

  it('the LG declares TURN_ON and its power-on recipe reads as configured, the Samsung one not', async () => {
    expect(has('media_player.tv_cucina', 128)).toBe(false);
    const facade = createMockBackend(createMockDeviceFacade(store));
    const power = async (entry: string) =>
      (await facade.handle({ path: `/dispositivi/accensione/${entry}` })).body as {
        configured: boolean;
      };
    expect((await power('entry_dev_tv_soggiorno')).configured).toBe(true);
    expect((await power('entry_dev_tv_cucina')).configured).toBe(false);
    const registry = buildRegistries(store.getEntities()).entities;
    expect(registry.find((entry) => entry.entity_id === LG)?.config_entry_id).toBe(
      'entry_dev_tv_soggiorno'
    );
  });

  it('setting up the power-on recipe makes the next read say configured (kitchen TV)', async () => {
    const facade = createMockBackend(createMockDeviceFacade(store));
    const path = '/dispositivi/accensione/entry_dev_tv_cucina';
    const read = async (method?: string) =>
      (await facade.handle({ path, ...(method ? { method } : {}) })).body as {
        entryId: string;
        configured: boolean;
        active: boolean | null;
        message: string | null;
      };
    expect((await read()).configured).toBe(false);
    expect(Number(entity('media_player.tv_cucina').attributes.supported_features) & 128).toBe(0);
    expect(await read('POST')).toEqual({
      entryId: 'entry_dev_tv_cucina',
      configured: true,
      active: true,
      message: null,
    });
    expect((await read()).configured).toBe(true);
    // The TV now declares TURN_ON, as Home Assistant does once a turn-on action exists.
    expect(Number(entity('media_player.tv_cucina').attributes.supported_features) & 128).toBe(128);
  });

  it('the Apple TV starts paused, buffers for a second when played, then plays', async () => {
    expect(entity(APPLE).state).toBe('paused');
    await call(APPLE, 'media_play_pause');
    expect(entity(APPLE).state).toBe('buffering');
    vi.advanceTimersByTime(1100);
    expect(entity(APPLE).state).toBe('playing');
    await call(APPLE, 'media_play_pause');
    expect(entity(APPLE).state).toBe('paused');
  });

  it('«TV che non risponde»: the LG turn_off is accepted and never takes effect', async () => {
    const silent = createMockHaStore({ scenario: 'tvSilent' });
    await silent.callService('media_player', 'turn_off', { entity_id: LG });
    expect(silent.getEntities()[LG]!.state).toBe('on');
    // Only that call: the rest of the house answers as usual.
    await silent.callService('media_player', 'volume_set', { entity_id: LG, volume_level: 0.4 });
    expect(silent.getEntities()[LG]!.attributes.volume_level).toBe(0.4);
    // The record the tester reads has the calls, in order.
    expect(silent.calls().map((entry) => entry.service)).toEqual(['turn_off', 'volume_set']);
    silent.dispose();
  });
});

describe('TVs of the demo (sound output and content)', () => {
  const LG = 'media_player.tv_soggiorno';
  const APPLE = 'media_player.apple_tv_camera';
  const VOLUME_SET = 4;
  const BROWSE_MEDIA = 131072;
  const output = (sound_output: string) =>
    store.callService('webostv', 'select_sound_output', { entity_id: LG, sound_output });
  const browse = async (entity_id: string, media_content_id?: string) =>
    (await createMockConnection(store).sendMessagePromise({
      type: 'media_player/browse_media',
      entity_id,
      ...(media_content_id ? { media_content_id } : {}),
    })) as { children?: { title: string; media_content_id: string; media_content_type: string }[] };

  it('the LG reports tv_speaker, and select_sound_output moves it', async () => {
    expect(entity(LG).attributes.sound_output).toBe('tv_speaker');
    await output('external_arc');
    expect(entity(LG).attributes.sound_output).toBe('external_arc');
    expect(Number(entity(LG).attributes.supported_features) & VOLUME_SET).toBe(VOLUME_SET);
    await output('tv_speaker');
    expect(entity(LG).attributes.sound_output).toBe('tv_speaker');
  });

  it('an external speaker drops VOLUME_SET and the TV speakers bring it back', async () => {
    await output('external_speaker');
    expect(entity(LG).attributes.sound_output).toBe('external_speaker');
    expect(Number(entity(LG).attributes.supported_features) & VOLUME_SET).toBe(0);
    await output('tv_speaker');
    expect(Number(entity(LG).attributes.supported_features) & VOLUME_SET).toBe(VOLUME_SET);
  });

  it('an output the TV does not have changes nothing', async () => {
    await output('external_optical');
    expect(entity(LG).attributes.sound_output).toBe('tv_speaker');
  });

  it('the Apple TV declares BROWSE_MEDIA; the LG and the Samsung TV do not', () => {
    const declares = (id: string) =>
      Number(entity(id).attributes.supported_features) & BROWSE_MEDIA;
    expect(declares(APPLE)).toBe(BROWSE_MEDIA);
    expect(declares(LG)).toBe(0);
    expect(declares('media_player.tv_cucina')).toBe(0);
  });

  it('browse on the Apple TV lists the apps folder first, then the video', async () => {
    const root = await browse(APPLE);
    expect(root.children?.map((child) => child.media_content_id)).toEqual([
      'apps',
      'media-source://mockup/video',
    ]);
    const apps = await browse(APPLE, 'apps');
    expect(apps.children?.map((child) => child.title)).toEqual(['Apple TV+', 'Netflix', 'YouTube']);
    expect(new Set(apps.children?.map((child) => child.media_content_type))).toEqual(
      new Set(['app'])
    );
    // A player that is not a TV keeps the music tree.
    expect((await browse('media_player.sonos_soggiorno')).children?.[0]?.title).toBe(
      'Notte a Milano'
    );
  });

  it('play_media shows the title of the content as the playing one', async () => {
    const video = (await browse(APPLE, 'media-source://mockup/video')).children?.[1];
    expect(video?.title).toBe('Concerto dal vivo');
    await store.callService('media_player', 'play_media', {
      entity_id: APPLE,
      media_content_id: video?.media_content_id,
      media_content_type: video?.media_content_type,
    });
    expect(entity(APPLE).state).toBe('playing');
    expect(entity(APPLE).attributes.media_title).toBe('Concerto dal vivo');
    await store.callService('media_player', 'play_media', {
      entity_id: APPLE,
      media_content_id: 'mockup:app:Netflix',
      media_content_type: 'app',
    });
    expect(entity(APPLE).attributes.app_name).toBe('Netflix');
  });
});
