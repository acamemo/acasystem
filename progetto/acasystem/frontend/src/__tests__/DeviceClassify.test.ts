/**
 * «Rileva dispositivi» (F1): the family and widget type of the devices of Home Assistant, and the
 * entities and devices that a widget already shows.
 */
import { describe, expect, it } from 'vitest';
import type { PagesConfig } from '@/@types/dashboard';
import type { HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import { ADD_WIDGET_TYPES } from '@/templates/sheets/catalog';
import { boundDeviceIds, boundEntityIds, unboundDevices } from '@/utils/devices/bound';
import {
  FAMILY_WIDGET_TYPE,
  PLATFORM_FAMILY,
  SERVICE_PLATFORMS,
  TV_PLATFORMS,
  classifyDevices,
} from '@/utils/devices/classify';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

const device = (id: string, name: string, extra: Record<string, unknown> = {}) =>
  ({ id, name, ...extra }) as HaDeviceRegistryEntry;
const registered = (
  entityId: string,
  deviceId: string,
  platform: string,
  extra: Record<string, unknown> = {}
) => ({ entity_id: entityId, device_id: deviceId, platform, ...extra }) as HaEntityRegistryEntry;

const classify = (
  devices: HaDeviceRegistryEntry[],
  entityRegistry: HaEntityRegistryEntry[],
  states: ReturnType<typeof fixtureEntity>[]
) => classifyDevices({ devices, entityRegistry, entities: fixtureEntities(states) });

describe('classificatore dei dispositivi', () => {
  it.each([
    ['LG webOS TV via webostv', 'webostv', {}, 'tv', 'androidtv'],
    ['Samsung via samsungtv', 'samsungtv', {}, 'tv', 'androidtv'],
    ['TV via cast con device_class tv', 'cast', { device_class: 'tv' }, 'tv', 'androidtv'],
    ['TV Android via androidtv_remote', 'androidtv_remote', {}, 'tv', 'androidtv'],
    ['altro lettore multimediale', 'dlna_dmr', {}, 'media', 'media'],
    ['Sonos', 'sonos', {}, 'sonos', 'sonos'],
  ])('%s', (_label, platform, attributes, family, widgetType) => {
    const [found] = classify(
      [device('d1', 'Salotto')],
      [registered('media_player.salotto', 'd1', platform)],
      [fixtureEntity('media_player.salotto', 'off', attributes)]
    );
    expect(found).toMatchObject({
      deviceId: 'd1',
      name: 'Salotto',
      family,
      widgetType,
      entityIds: ['media_player.salotto'],
      primaryEntityId: 'media_player.salotto',
    });
  });

  it('un altoparlante Cast non è un televisore', () => {
    const [found] = classify(
      [device('d1', 'Cucina')],
      [registered('media_player.cucina', 'd1', 'cast')],
      [fixtureEntity('media_player.cucina', 'idle', { device_class: 'speaker' })]
    );
    expect(found?.family).toBe('media');
  });

  it('riconosce il Sonos dagli attributi anche con un’altra integrazione', () => {
    const [found] = classify(
      [device('d1', 'Camera')],
      [registered('media_player.camera', 'd1', 'upnp')],
      [fixtureEntity('media_player.camera', 'idle', { friendly_name: 'Sonos Camera' })]
    );
    expect(found?.family).toBe('sonos');
  });

  it.each([
    ['luce Hue', registered('light.studio', 'd1', 'hue'), 'light.studio', 'light', 'light'],
    [
      'presa Shelly',
      registered('switch.presa', 'd1', 'shelly', { original_device_class: 'outlet' }),
      'switch.presa',
      'plug',
      'sensor',
    ],
    ['termostato', registered('climate.zona', 'd1', 'tado'), 'climate.zona', 'climate', 'climate'],
    [
      'sensore di temperatura',
      registered('sensor.temp', 'd1', 'shelly', { original_device_class: 'temperature' }),
      'sensor.temp',
      'sensor',
      'sensor',
    ],
    [
      'sensore di umidità',
      registered('sensor.umid', 'd1', 'shelly', { original_device_class: 'humidity' }),
      'sensor.umid',
      'sensor',
      'sensor',
    ],
    ['tapparella', registered('cover.sala', 'd1', 'somfy'), 'cover.sala', 'cover', 'cover'],
    ['serratura', registered('lock.porta', 'd1', 'nuki'), 'lock.porta', 'lock', 'lock'],
    [
      'telecamera',
      registered('camera.giardino', 'd1', 'onvif'),
      'camera.giardino',
      'camera',
      'camera',
    ],
    [
      'aspirapolvere',
      registered('vacuum.robot', 'd1', 'roborock'),
      'vacuum.robot',
      'vacuum',
      'vacuum',
    ],
    ['ventilatore', registered('fan.soffitto', 'd1', 'tuya'), 'fan.soffitto', 'fan', 'fan'],
    [
      'allarme',
      registered('alarm_control_panel.casa', 'd1', 'ajax'),
      'alarm_control_panel.casa',
      'alarm',
      'alarm',
    ],
    [
      'tosaerba',
      registered('lawn_mower.prato', 'd1', 'husqvarna'),
      'lawn_mower.prato',
      'mower',
      'mower',
    ],
  ])('%s', (_label, entry, entityId, family, widgetType) => {
    const [found] = classify(
      [device('d1', 'Dispositivo')],
      [entry],
      [fixtureEntity(entityId, 'on')]
    );
    expect(found).toMatchObject({ family, widgetType, primaryEntityId: entityId });
  });

  it('ogni tipo di widget prodotto esiste in ADD_WIDGET_TYPES', () => {
    const types = new Set(ADD_WIDGET_TYPES.map((item) => item.type));
    for (const widgetType of Object.values(FAMILY_WIDGET_TYPE))
      expect(types.has(widgetType)).toBe(true);
  });

  it('una presa senza device_class outlet, o un sensore di altro tipo, non è un dispositivo', () => {
    const found = classify(
      [device('d1', 'Interruttore'), device('d2', 'Pressione')],
      [
        registered('switch.luce', 'd1', 'shelly'),
        registered('sensor.pressione', 'd2', 'shelly', { original_device_class: 'pressure' }),
      ],
      [fixtureEntity('switch.luce', 'on'), fixtureEntity('sensor.pressione', '1012')]
    );
    expect(found).toEqual([]);
  });

  it('esclude i dispositivi di servizio', () => {
    const platforms = SERVICE_PLATFORMS.map((platform, index) => ({
      platform,
      deviceId: `s${index}`,
      entityId: `sensor.servizio_${index}`,
    }));
    const found = classify(
      platforms.map(({ deviceId }) => device(deviceId, 'Servizio')),
      platforms.map(({ entityId, deviceId, platform }) =>
        registered(entityId, deviceId, platform, { original_device_class: 'temperature' })
      ),
      platforms.map(({ entityId }) => fixtureEntity(entityId, '20'))
    );
    expect(found).toEqual([]);
  });

  it('esclude un dispositivo di servizio riconosciuto dai suoi identificatori', () => {
    const found = classify(
      [device('d1', 'Sole', { identifiers: [['sun', 'x']] })],
      [registered('sensor.sole', 'd1', '', { original_device_class: 'temperature' })],
      [fixtureEntity('sensor.sole', '20')]
    );
    expect(found).toEqual([]);
  });

  it('esclude le entità disabilitate, nascoste o senza stato, e i dispositivi disabilitati', () => {
    const found = classify(
      [
        device('d1', 'Spento'),
        device('d2', 'Nascosto'),
        device('d3', 'Senza stato'),
        device('d4', 'Disabilitato', { disabled_by: 'user' }),
      ],
      [
        registered('light.spenta', 'd1', 'hue', { disabled_by: 'integration' }),
        registered('light.nascosta', 'd2', 'hue', { hidden_by: 'user' }),
        registered('light.fantasma', 'd3', 'hue'),
        registered('light.altra', 'd4', 'hue'),
      ],
      [
        fixtureEntity('light.spenta', 'on'),
        fixtureEntity('light.nascosta', 'on'),
        fixtureEntity('light.altra', 'on'),
      ]
    );
    expect(found).toEqual([]);
  });

  it('allega il telecomando al televisore dello stesso dispositivo', () => {
    const found = classify(
      [device('d1', 'LG webOS TV')],
      [registered('media_player.lg', 'd1', 'webostv'), registered('remote.lg', 'd1', 'webostv')],
      [fixtureEntity('media_player.lg', 'on'), fixtureEntity('remote.lg', 'on')]
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      family: 'tv',
      entityIds: ['media_player.lg'],
      remoteId: 'remote.lg',
    });
  });

  it('un telecomando senza televisore non produce un dispositivo', () => {
    const found = classify(
      [device('d1', 'Telecomando')],
      [registered('remote.sola', 'd1', 'harmony')],
      [fixtureEntity('remote.sola', 'on')]
    );
    expect(found).toEqual([]);
  });

  it('usa il nome scelto dall’utente e ordina per famiglia e nome', () => {
    const found = classify(
      [
        device('d1', 'Zeta', { name_by_user: 'Lampada' }),
        device('d2', 'Samsung'),
        device('d3', 'Alfa'),
      ],
      [
        registered('light.z', 'd1', 'hue'),
        registered('media_player.s', 'd2', 'samsungtv'),
        registered('light.a', 'd3', 'hue'),
      ],
      [
        fixtureEntity('light.z', 'on'),
        fixtureEntity('media_player.s', 'on'),
        fixtureEntity('light.a', 'on'),
      ]
    );
    expect(found.map((item) => item.name)).toEqual(['Samsung', 'Alfa', 'Lampada']);
  });

  it('espone la tabella integrazione → famiglia per la scoperta in rete', () => {
    for (const platform of TV_PLATFORMS) expect(PLATFORM_FAMILY[platform]).toBe('tv');
    expect(PLATFORM_FAMILY.sonos).toBe('sonos');
  });
});

describe('entità e dispositivi già in un widget', () => {
  const pagesConfig = {
    header: [],
    pages: ['home', 'sala'],
    home: ['media_player.salotto', 'light.cucina', 'androidtv_card_1', 'media_group_1'],
    sala: ['climate_card_1', 'entity_card_1', 'spacer_card_1'],
  } as PagesConfig;
  const cardSettings = {
    'home::androidtv_card_1': { mediaPlayerId: 'media_player.lg', remoteId: 'remote.lg' },
    'home::media_group_1': { mediaIds: ['media_player.a', 'media_player.b'] },
    'sala::climate_card_1': { climateId: 'climate.zona' },
    'sala::entity_card_1': { type: 'sensor', entityId: 'sensor.temp' },
  };

  it('raccoglie le entità di tutte le pagine', () => {
    expect([...boundEntityIds(pagesConfig, cardSettings)].sort()).toEqual([
      'climate.zona',
      'light.cucina',
      'media_player.a',
      'media_player.b',
      'media_player.lg',
      'media_player.salotto',
      'remote.lg',
      'sensor.temp',
    ]);
  });

  it('trova le impostazioni anche senza il prefisso della pagina', () => {
    const bound = boundEntityIds(
      { header: [], pages: ['home'], home: ['climate_card_9'] } as PagesConfig,
      { climate_card_9: { climateId: 'climate.studio' } }
    );
    expect(bound.has('climate.studio')).toBe(true);
  });

  it('un widget non ancora collegato non lega nulla', () => {
    const bound = boundEntityIds(
      { header: [], pages: ['home'], home: ['androidtv_card_2'] } as PagesConfig,
      { 'home::androidtv_card_2': { categoryWidgetType: 'androidtv' } }
    );
    expect([...bound]).toEqual([]);
  });

  it('boundDeviceIds traduce le entità nei dispositivi del registro', () => {
    const entityDevice = new Map([
      ['media_player.lg', 'tv'],
      ['light.cucina', 'lampada'],
      ['light.libera', 'libera'],
    ]);
    expect([...boundDeviceIds(pagesConfig, cardSettings, entityDevice)].sort()).toEqual([
      'lampada',
      'tv',
    ]);
  });

  it('unboundDevices toglie chi ha un’entità, il telecomando o il dispositivo già legati', () => {
    const found = classify(
      [
        device('tv', 'LG'),
        device('lampada', 'Cucina'),
        device('nuova', 'Nuova'),
        device('altro', 'Altro'),
      ],
      [
        registered('media_player.lg', 'tv', 'webostv'),
        registered('light.cucina', 'lampada', 'hue'),
        registered('light.nuova', 'nuova', 'hue'),
        registered('light.altro', 'altro', 'hue'),
      ],
      [
        fixtureEntity('media_player.lg', 'on'),
        fixtureEntity('light.cucina', 'on'),
        fixtureEntity('light.nuova', 'on'),
        fixtureEntity('light.altro', 'on'),
      ]
    );
    const rest = unboundDevices(
      found,
      boundEntityIds(pagesConfig, cardSettings),
      new Set(['altro'])
    );
    expect(rest.map((item) => item.deviceId)).toEqual(['nuova']);
  });
});
