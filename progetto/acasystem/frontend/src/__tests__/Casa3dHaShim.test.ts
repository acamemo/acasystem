import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityMap, HaMessage, HaMessageConnection } from '@/@types/ha';
import {
  Casa3dReadOnlyError,
  EMPTY_REGISTRIES,
  createCasa3dHass,
  loadRegistries,
  mapStates,
  parseAreas,
  parseDevices,
  parseEntityDisplay,
  parseFloors,
  rewriteEntityPicture,
  type Casa3dHassInput,
} from '@/casa3d/haShim';
import { casa3dCommandsEnabled } from '@/casa3d/commandSwitch';

/**
 * Adapter of the Casa 3D bundle (ADR-0014, T3): the shape of the hass object, the pictures under
 * /ha, no user = not an administrator, read-only (no service call, no writing command), and the
 * registries read with a user who may or may not read them.
 */

const HASS_URL = 'https://aca.test/ha';

const entity = (
  id: string,
  state = 'on',
  attributes: Record<string, unknown> = {}
): HassEntity => ({
  entity_id: id,
  state,
  attributes,
  last_changed: '2026-10-20T10:00:00Z',
  last_updated: '2026-10-20T10:00:00Z',
  context: { id: 'ctx', parent_id: null, user_id: null },
});

const entities = (...list: HassEntity[]): EntityMap =>
  Object.fromEntries(list.map((item) => [item.entity_id, item]));

function fakeConn(
  answer: (message: HaMessage) => unknown = () => ({})
): HaMessageConnection & { sent: HaMessage[] } {
  const sent: HaMessage[] = [];
  return {
    sent,
    sendMessagePromise: (message: HaMessage) => {
      sent.push(message);
      try {
        return Promise.resolve(answer(message));
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}

function build(overrides: Partial<Casa3dHassInput> = {}) {
  return createCasa3dHass({
    states: entities(entity('light.sala')),
    registries: EMPTY_REGISTRIES,
    user: { id: 'u1', name: 'Mario', is_admin: true },
    config: null,
    conn: fakeConn(),
    hassUrl: HASS_URL,
    ...overrides,
  });
}

describe('Casa 3D adapter: shape of the hass object', () => {
  it('has what the bundle reads, in Italian', () => {
    const registries = {
      areas: { sala: { area_id: 'sala', name: 'Sala', floor_id: 'pt' } },
      floors: { pt: { floor_id: 'pt', name: 'Piano terra', level: 0 } },
      devices: { d1: { id: 'd1', area_id: 'sala', name: 'Lampada' } },
      entities: { 'light.sala': { entity_id: 'light.sala', device_id: 'd1', area_id: null } },
    };
    const hass = build({
      registries,
      config: {
        unit_system: { temperature: '°C', length: 'km' },
        latitude: 45.1,
        longitude: 9.2,
        time_zone: 'Europe/Rome',
        currency: 'EUR',
      },
    });

    expect(hass.language).toBe('it');
    expect(hass.areas).toBe(registries.areas);
    expect(hass.floors).toBe(registries.floors);
    expect(hass.devices).toBe(registries.devices);
    expect(hass.entities).toBe(registries.entities);
    expect(Object.keys(hass.states)).toEqual(['light.sala']);
    expect(hass.states['light.sala']?.state).toBe('on');
    expect(hass.config).toEqual({
      unit_system: { temperature: '°C', length: 'km' },
      latitude: 45.1,
      longitude: 9.2,
      time_zone: 'Europe/Rome',
    });
    expect(typeof hass.callWS).toBe('function');
    expect(typeof hass.callService).toBe('function');
    expect(typeof hass.connection.subscribeMessage).toBe('function');
  });

  it('does not offer the REST API, the raw websocket or authenticated fetch', () => {
    const hass = build() as unknown as Record<string, unknown>;
    for (const name of ['callApi', 'callApiRaw', 'fetchWithAuth', 'sendWS', 'auth', 'hassUrl']) {
      expect(name in hass).toBe(false);
    }
    expect('socket' in (hass.connection as object)).toBe(false);
  });

  it('reads the units of the legacy config fields and survives a missing config', () => {
    expect(build({ config: { temperature_unit: '°F', length_unit: 'mi' } }).config).toEqual({
      unit_system: { temperature: '°F', length: 'mi' },
    });
    expect(build({ config: null }).config).toEqual({});
  });
});

describe('Casa 3D adapter: user', () => {
  it('a missing user is not an administrator', () => {
    const hass = build({ user: null });
    expect(hass.user.is_admin).toBe(false);
    expect(hass.user.name).toBe('');
  });

  it('only a true is_admin makes an administrator', () => {
    expect(build({ user: { name: 'A', is_admin: true } }).user).toEqual({
      is_admin: true,
      name: 'A',
    });
    expect(build({ user: { name: 'B', is_admin: false } }).user.is_admin).toBe(false);
    expect(build({ user: { name: 'C' } }).user.is_admin).toBe(false);
    expect(build({ user: { name: 'D', is_owner: true } }).user.is_admin).toBe(false);
    const odd = { name: 'E', is_admin: 'true' } as unknown as Casa3dHassInput['user'];
    expect(build({ user: odd }).user.is_admin).toBe(false);
  });
});

describe('Casa 3D adapter: pictures stay under /ha', () => {
  it('rewrites a Home Assistant path under the proxy', () => {
    expect(rewriteEntityPicture('/api/camera_proxy/camera.porta?token=abc', HASS_URL)).toBe(
      'https://aca.test/ha/api/camera_proxy/camera.porta?token=abc'
    );
    expect(rewriteEntityPicture('/local/foto.png', 'https://aca.test/acasystem/ha/')).toBe(
      'https://aca.test/acasystem/ha/local/foto.png'
    );
  });

  it('keeps an address of the app origin and an inline image, drops everything else', () => {
    expect(rewriteEntityPicture('https://aca.test/ha/api/x.png', HASS_URL)).toBe(
      'https://aca.test/ha/api/x.png'
    );
    expect(rewriteEntityPicture('data:image/png;base64,AAAA', HASS_URL)).toBe(
      'data:image/png;base64,AAAA'
    );
    for (const bad of [
      'https://cdn.example.com/cover.jpg',
      'http://aca.test.evil.example/x.png',
      '//cdn.example.com/cover.jpg',
      'javascript:alert(1)',
      'data:text/html,<script>1</script>',
      'blob:https://aca.test/uuid',
      'api/relative.png',
      '',
      '   ',
      42,
      null,
      undefined,
    ]) {
      expect(rewriteEntityPicture(bad, HASS_URL)).toBeNull();
    }
  });

  it('rewrites the attribute on the states and drops pictures from other hosts', () => {
    const source = entities(
      entity('camera.porta', 'idle', {
        entity_picture: '/api/camera_proxy/camera.porta?token=t',
        friendly_name: 'Porta',
      }),
      entity('media_player.sala', 'playing', {
        entity_picture: 'https://i.scdn.co/cover.jpg',
        media_title: 'Brano',
      }),
      entity('media_player.cucina', 'playing', {
        entity_picture: 'https://i.scdn.co/cover.jpg',
        entity_picture_local: '/api/media_player_proxy/media_player.cucina?token=m',
      }),
      entity('light.sala', 'on', { brightness: 120 })
    );
    const states = mapStates(source, HASS_URL);

    expect(states['camera.porta']?.attributes.entity_picture).toBe(
      'https://aca.test/ha/api/camera_proxy/camera.porta?token=t'
    );
    expect(states['camera.porta']?.attributes.friendly_name).toBe('Porta');
    expect('entity_picture' in (states['media_player.sala']?.attributes ?? {})).toBe(false);
    expect(states['media_player.sala']?.attributes.media_title).toBe('Brano');
    expect(states['media_player.cucina']?.attributes.entity_picture).toBe(
      'https://aca.test/ha/api/media_player_proxy/media_player.cucina?token=m'
    );
    // no picture, no copy
    expect(states['light.sala']).toBe(source['light.sala']);
    // the source states are left untouched
    expect(source['camera.porta']?.attributes.entity_picture).toBe(
      '/api/camera_proxy/camera.porta?token=t'
    );
    expect(source['media_player.sala']?.attributes.entity_picture).toBe(
      'https://i.scdn.co/cover.jpg'
    );
  });

  it('an unchanged state keeps the same object, a changed one gets a new object', () => {
    const camera = entity('camera.porta', 'idle', {
      entity_picture: '/api/camera_proxy/camera.porta?token=t',
    });
    const first = mapStates(entities(camera), HASS_URL)['camera.porta'];
    const again = mapStates(entities(camera), HASS_URL)['camera.porta'];
    expect(again).toBe(first);

    const changed = entity('camera.porta', 'recording', {
      entity_picture: '/api/camera_proxy/camera.porta?token=t',
    });
    expect(mapStates(entities(changed), HASS_URL)['camera.porta']).not.toBe(first);
  });
});

describe('Casa 3D adapter: nothing is switched', () => {
  it('callService rejects with a read-only error and tells who is listening', async () => {
    const onRefused = vi.fn();
    const hass = build({ onRefused });
    await expect(
      hass.callService('light', 'turn_on', { entity_id: 'light.sala' })
    ).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    expect(onRefused).toHaveBeenCalledWith('light.turn_on');
  });

  it('a call nobody awaits does not become an unhandled rejection', async () => {
    // Vitest fails the whole run on an unhandled rejection, so reaching the end is the proof.
    const hass = build();
    void hass.callService('cover', 'open_cover', { entity_id: 'cover.tapparella' });
    void hass.callWS({ type: 'config/entity_registry/update' });
    void hass.connection.subscribeMessage(() => undefined, { type: 'subscribe_events' });
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  it('a faulty listener does not break the refusal', async () => {
    const hass = build({
      onRefused: () => {
        throw new Error('boom');
      },
    });
    await expect(hass.callService('switch', 'toggle')).rejects.toBeInstanceOf(Casa3dReadOnlyError);
  });

  it('callWS passes only the reading commands to Home Assistant', async () => {
    const conn = fakeConn(() => ({ ok: true }));
    const hass = build({ conn });
    await expect(hass.callWS({ type: 'energy/get_prefs' })).resolves.toEqual({ ok: true });
    await expect(
      hass.callWS({ type: 'history/history_during_period', entity_ids: ['sensor.t'] })
    ).resolves.toEqual({ ok: true });
    await expect(hass.callWS({ type: 'recorder/statistics_during_period' })).resolves.toEqual({
      ok: true,
    });
    expect(conn.sent.map((m) => m.type)).toEqual([
      'energy/get_prefs',
      'history/history_during_period',
      'recorder/statistics_during_period',
    ]);

    conn.sent.length = 0;
    for (const type of [
      'call_service',
      'fire_event',
      'config/entity_registry/update',
      'config/area_registry/delete',
      'conversation/process',
      'assist_pipeline/run',
      'auth/long_lived_access_token',
      'subscribe_events',
      'casa3d/building/save',
      'casa3d/image/set',
      'casa3d/history/restore',
      'casa3d/backup/import',
      '',
    ]) {
      await expect(hass.callWS({ type })).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    }
    await expect(hass.callWS({})).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    expect(conn.sent).toEqual([]);
  });

  it('a reading command without a connection fails with a plain error', async () => {
    const hass = build({ conn: null });
    await expect(hass.callWS({ type: 'energy/get_prefs' })).rejects.toThrow('Nessuna connessione');
  });

  it('subscriptions: only the plan one is answered, and it follows nothing', async () => {
    const hass = build();
    const unsubscribe = await hass.connection.subscribeMessage(() => undefined, {
      type: 'casa3d/building/subscribe',
    });
    await expect(unsubscribe()).resolves.toBeUndefined();
    for (const type of [
      'subscribe_events',
      'subscribe_trigger',
      'render_template',
      'casa3d/other',
    ]) {
      await expect(
        hass.connection.subscribeMessage(() => undefined, { type })
      ).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    }
  });

  it('answers the plan commands from the plan of the host', async () => {
    const building = { version: 1, floors: [] };
    const hass = build({ plan: { building, packs: [{ id: 'p' }], revision: 4 } });
    await expect(hass.callWS({ type: 'casa3d/building/get' })).resolves.toEqual({
      building,
      revision: 4,
      version: 'prova',
    });
    await expect(hass.callWS({ type: 'casa3d/packs/list' })).resolves.toEqual({
      packs: [{ id: 'p' }],
    });
    await expect(hass.callWS({ type: 'casa3d/history/list' })).resolves.toEqual({ snapshots: [] });
    await expect(hass.callWS({ type: 'casa3d/image/get', image_id: 'x' })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('without a plan the building is not found', async () => {
    const hass = build({ plan: null });
    await expect(hass.callWS({ type: 'casa3d/building/get' })).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(hass.callWS({ type: 'casa3d/packs/list' })).resolves.toEqual({ packs: [] });
  });
});

describe('Casa 3D adapter: registry parsers', () => {
  it('areas, floors and devices from the list commands', () => {
    expect(
      parseAreas([
        { area_id: 'sala', name: 'Sala', floor_id: 'pt', aliases: [] },
        { area_id: 'orto' },
        { name: 'senza id' },
        null,
        'x',
      ])
    ).toEqual({
      sala: { area_id: 'sala', name: 'Sala', floor_id: 'pt' },
      orto: { area_id: 'orto', name: 'orto', floor_id: undefined },
    });
    expect(
      parseFloors([
        { floor_id: 'pt', name: 'Piano terra', level: 0 },
        { floor_id: 'p1', name: 'Primo' },
      ])
    ).toEqual({
      pt: { floor_id: 'pt', name: 'Piano terra', level: 0 },
      p1: { floor_id: 'p1', name: 'Primo', level: null },
    });
    expect(
      parseDevices([
        { id: 'd1', area_id: 'sala', name: 'Lampada', name_by_user: null, manufacturer: 'X' },
        {},
      ])
    ).toEqual({ d1: { id: 'd1', area_id: 'sala', name: 'Lampada', name_by_user: null } });
    expect(parseAreas('no')).toEqual({});
    expect(parseFloors(undefined)).toEqual({});
    expect(parseDevices({})).toEqual({});
  });

  it('entity registry in the compact display form', () => {
    const entries = parseEntityDisplay({
      entity_categories: { '0': 'config', '1': 'diagnostic' },
      entities: [
        { ei: 'light.sala', di: 'd1', ai: 'sala', en: 'Luce sala', pl: 'hue' },
        { ei: 'sensor.batteria', ec: 1, hb: true, tk: 'battery', dp: 1 },
        { ei: 'switch.cfg', ec: 0 },
        { en: 'senza id' },
      ],
    });
    expect(entries['light.sala']).toEqual({
      entity_id: 'light.sala',
      name: 'Luce sala',
      device_id: 'd1',
      area_id: 'sala',
      hidden: false,
      entity_category: null,
      translation_key: undefined,
      display_precision: null,
    });
    expect(entries['sensor.batteria']).toMatchObject({
      hidden: true,
      entity_category: 'diagnostic',
      translation_key: 'battery',
      display_precision: 1,
    });
    expect(entries['switch.cfg']?.entity_category).toBe('config');
    expect(Object.keys(entries)).toHaveLength(3);
  });

  it('reads the categories in the reverse form too, and survives odd answers', () => {
    const entries = parseEntityDisplay({
      entity_categories: { config: 0, diagnostic: 1 },
      entities: [{ ei: 'sensor.x', ec: 1 }],
    });
    expect(entries['sensor.x']?.entity_category).toBe('diagnostic');
    expect(parseEntityDisplay(null)).toEqual({});
    expect(parseEntityDisplay({ entities: 'no' })).toEqual({});
    expect(
      parseEntityDisplay({ entities: [{ ei: 'a.b', ec: 9 }] })['a.b']?.entity_category
    ).toBeNull();
  });
});

describe('Casa 3D adapter: registries with an administrator and with a user who may not read them', () => {
  const answers: Record<string, unknown> = {
    'config/area_registry/list': [{ area_id: 'sala', name: 'Sala', floor_id: 'pt' }],
    'config/floor_registry/list': [{ floor_id: 'pt', name: 'Piano terra', level: 0 }],
    'config/device_registry/list': [{ id: 'd1', area_id: 'sala', name: 'Lampada' }],
    'config/entity_registry/list_for_display': {
      entity_categories: {},
      entities: [{ ei: 'light.sala', di: 'd1', ai: 'sala' }],
    },
  };
  const refusal = Object.assign(new Error('Unauthorized'), { code: 'unauthorized' });

  it('administrator: all four registries load, with the commands every user may send', async () => {
    const conn = fakeConn((message) => answers[message.type]);
    const { registries, failed } = await loadRegistries(conn);
    expect(failed).toEqual([]);
    expect(Object.keys(registries.areas)).toEqual(['sala']);
    expect(Object.keys(registries.floors)).toEqual(['pt']);
    expect(Object.keys(registries.devices)).toEqual(['d1']);
    expect(Object.keys(registries.entities)).toEqual(['light.sala']);
    expect(conn.sent.map((m) => m.type).sort()).toEqual(Object.keys(answers).sort());
  });

  it('reads only: no registry command that writes, and not the administrators-only full entity list', async () => {
    const conn = fakeConn((message) => answers[message.type]);
    await loadRegistries(conn);
    for (const message of conn.sent) {
      expect(message.type).toMatch(/\/list(_for_display)?$/);
    }
    expect(conn.sent.map((m) => m.type)).not.toContain('config/entity_registry/list');
  });

  it('non-administrator: a refused registry stays empty, the others still load', async () => {
    const conn = fakeConn((message) => {
      if (message.type === 'config/device_registry/list') throw refusal;
      return answers[message.type];
    });
    const { registries, failed } = await loadRegistries(conn);
    expect(failed).toEqual(['devices']);
    expect(registries.devices).toEqual({});
    expect(Object.keys(registries.areas)).toEqual(['sala']);
    expect(Object.keys(registries.entities)).toEqual(['light.sala']);

    // the hass built on it works with what is there
    const hass = createCasa3dHass({
      states: entities(entity('light.sala')),
      registries,
      user: { name: 'Ospite', is_admin: false },
      config: null,
      conn,
      hassUrl: HASS_URL,
    });
    expect(hass.user.is_admin).toBe(false);
    expect(hass.devices).toEqual({});
    expect(hass.areas.sala?.name).toBe('Sala');
  });

  it('every registry refused: empty registries, all reported, nothing thrown', async () => {
    const conn = fakeConn(() => {
      throw refusal;
    });
    const { registries, failed } = await loadRegistries(conn);
    expect(failed.sort()).toEqual(['areas', 'devices', 'entities', 'floors']);
    expect(registries).toEqual({ areas: {}, floors: {}, devices: {}, entities: {} });
  });
});

describe('Casa 3D adapter: commands (T7), the second barrier', () => {
  // The switch is off by default (commandSwitch.ts): these tests are about the barriers behind it.
  beforeEach(() => {
    vi.stubEnv('VITE_CASA3D_COMMANDS', 'on');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  const makeCommands = (isOpen: () => boolean) => {
    const run = vi.fn(() => Promise.resolve('sent'));
    return { commands: { isOpen, run }, run };
  };

  it('with commands but the barrier closed, a service call is refused and never reaches the path', async () => {
    const onRefused = vi.fn();
    const { commands, run } = makeCommands(() => false);
    const hass = build({ commands, onRefused });
    await expect(
      hass.callService('light', 'toggle', { entity_id: 'light.sala' })
    ).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    expect(run).not.toHaveBeenCalled();
    expect(onRefused).toHaveBeenCalledWith('light.toggle');
  });

  it('with the barrier open the call goes to the path, with the options of the view', async () => {
    const { commands, run } = makeCommands(() => true);
    const hass = build({ commands });
    await expect(
      hass.callService('light', 'toggle', { entity_id: 'light.sala' }, { ask: true })
    ).resolves.toBe('sent');
    expect(run).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.sala' }, { ask: true });
  });

  it('reads the barrier at every call, not when the object was made', async () => {
    let esplora = true;
    const { commands, run } = makeCommands(() => esplora);
    const hass = build({ commands });
    await hass.callService('light', 'toggle', { entity_id: 'light.sala' });
    esplora = false;
    await expect(
      hass.callService('light', 'toggle', { entity_id: 'light.sala' })
    ).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    esplora = true;
    await hass.callService('light', 'toggle', { entity_id: 'light.sala' });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('without commands every call is refused, as before', async () => {
    const hass = build({ commands: null });
    await expect(
      hass.callService('light', 'toggle', { entity_id: 'light.sala' })
    ).rejects.toBeInstanceOf(Casa3dReadOnlyError);
  });

  it('even with the barrier open nothing else is written: the websocket stays read-only', async () => {
    const conn = fakeConn(() => ({ ok: true }));
    const { commands } = makeCommands(() => true);
    const hass = build({ commands, conn });
    for (const type of [
      'call_service',
      'config/entity_registry/update',
      'auth/long_lived_access_token',
    ]) {
      await expect(
        hass.callWS({ type, domain: 'light', service: 'turn_on' })
      ).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    }
    await expect(
      hass.connection.subscribeMessage(() => undefined, { type: 'subscribe_events' })
    ).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    expect(conn.sent).toEqual([]);
  });
});

describe('Casa 3D adapter: the switch of the commands (read-only until R7)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  const open = () => {
    const run = vi.fn(() => Promise.resolve('sent'));
    return { commands: { isOpen: () => true, run }, run };
  };

  it('is off by default: with commands and the barrier open, nothing is sent', async () => {
    const onRefused = vi.fn();
    const { commands, run } = open();
    const hass = build({ commands, onRefused });
    await expect(
      hass.callService('light', 'toggle', { entity_id: 'light.sala' })
    ).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    expect(run).not.toHaveBeenCalled();
    expect(onRefused).toHaveBeenCalledWith('light.toggle');
  });

  it('only the exact value "on" turns it on', async () => {
    for (const value of ['', 'true', '1', 'ON', 'off', ' on']) {
      vi.stubEnv('VITE_CASA3D_COMMANDS', value);
      expect(casa3dCommandsEnabled()).toBe(false);
    }
    vi.stubEnv('VITE_CASA3D_COMMANDS', 'on');
    expect(casa3dCommandsEnabled()).toBe(true);
  });

  it('is read at every call: switched off after the object was made, the next call is refused', async () => {
    vi.stubEnv('VITE_CASA3D_COMMANDS', 'on');
    const { commands, run } = open();
    const hass = build({ commands });
    await hass.callService('light', 'toggle', { entity_id: 'light.sala' });
    vi.stubEnv('VITE_CASA3D_COMMANDS', 'off');
    await expect(
      hass.callService('light', 'toggle', { entity_id: 'light.sala' })
    ).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
