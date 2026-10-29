/**
 * Data of the simulated Home Assistant of the demo mode (`#/mockup`, REP-20261028-005): a house
 * of six rooms with the devices a family really owns - Hue lights, a Shelly plug, two TVs, a
 * Sonos, a Reolink camera, a tado thermostat, Somfy covers, a Nuki lock, a Roborock, a Husqvarna
 * mower, sensors, an alarm panel and a car - each one in the device registry with its entities
 * in the entity registry. The entities start from the shared fixtures (`utils/fixtures/
 * adaptiveData.ts`, the same source as the e2e bench) for the attributes the widgets need, with
 * the ids and the Italian names of a house, and a few more for what the fixtures leave out.
 * `mockHouse(scenario)` returns the house in one of the states the demo bar offers.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import {
  adaptiveFixtureEntities,
  adaptiveFixtureServices,
  adaptiveFixtureSettings,
} from '@/utils/fixtures/adaptiveData';
import { artworkUrl } from './images';

type Attributes = Record<string, unknown>;

export const makeEntity = (
  id: string,
  state: string,
  attributes: Attributes = {},
  at: string = new Date().toISOString()
): HassEntity => ({
  entity_id: id,
  state,
  attributes: { friendly_name: id.split('.')[1]?.replaceAll('_', ' ') ?? id, ...attributes },
  last_changed: at,
  last_updated: at,
  context: { id: `mockup-${id}`, parent_id: null, user_id: null },
});

// ── Scenarios ──────────────────────────────────────────────────────────────────────────────

/** The states of the house the demo bar offers (REP-20261028-005, «Scenario»). */
export type MockScenario = 'normal' | 'unreachable' | 'longNames' | 'extremes' | 'empty';

export const MOCK_SCENARIOS: readonly { id: MockScenario; label: string }[] = [
  { id: 'normal', label: 'Casa normale' },
  { id: 'unreachable', label: 'Non raggiungibili' },
  { id: 'longNames', label: 'Nomi lunghi' },
  { id: 'extremes', label: 'Valori estremi' },
  { id: 'empty', label: 'Casa vuota' },
];

export const isMockScenario = (value: unknown): value is MockScenario =>
  MOCK_SCENARIOS.some((scenario) => scenario.id === value);

// ── The house ──────────────────────────────────────────────────────────────────────────────

/** Fixture entity -> [id in the house, Italian name]. Every fixture entity has a place here. */
const FIXTURE_ENTITIES: readonly (readonly [string, string, string])[] = [
  ['sensor.fixture', 'sensor.soggiorno_temperatura', 'Temperatura soggiorno'],
  ['sensor.humidity', 'sensor.soggiorno_umidita', 'Umidità soggiorno'],
  ['light.fixture', 'light.luce_soggiorno', 'Luce soggiorno'],
  ['fan.fixture', 'fan.ventilatore_camera', 'Ventilatore camera'],
  ['climate.fixture', 'climate.termostato_soggiorno', 'Termostato soggiorno'],
  ['cover.fixture', 'cover.tapparella_soggiorno', 'Tapparella soggiorno'],
  ['lock.fixture', 'lock.porta_ingresso', 'Porta d’ingresso'],
  ['alarm_control_panel.fixture', 'alarm_control_panel.allarme_casa', 'Allarme di casa'],
  ['media_player.media', 'media_player.nest_cucina', 'Altoparlante cucina'],
  ['media_player.sonos', 'media_player.sonos_soggiorno', 'Sonos soggiorno'],
  ['media_player.androidtv', 'media_player.tv_soggiorno', 'TV soggiorno'],
  ['media_player.appletv', 'media_player.apple_tv_camera', 'Apple TV camera'],
  ['remote.fixture', 'remote.apple_tv_camera', 'Telecomando Apple TV camera'],
  ['vacuum.fixture', 'vacuum.aspirapolvere', 'Aspirapolvere'],
  ['lawn_mower.fixture', 'lawn_mower.tagliaerba_giardino', 'Tagliaerba giardino'],
  ['camera.fixture', 'camera.videocamera_ingresso', 'Videocamera ingresso'],
  ['binary_sensor.motion', 'binary_sensor.videocamera_ingresso_movimento', 'Movimento ingresso'],
  ['sensor.battery', 'sensor.auto_batteria', 'Batteria auto'],
  ['sensor.range', 'sensor.auto_autonomia', 'Autonomia auto'],
  ['switch.charging', 'switch.auto_ricarica', 'Ricarica auto'],
  ['switch.sonos_alarm', 'switch.sonos_sveglia', 'Sveglia Sonos'],
  ['number.limit', 'number.auto_limite_carica', 'Limite di carica'],
  ['number.height', 'number.tagliaerba_altezza_taglio', 'Altezza taglio'],
  ['select.area', 'select.aspirapolvere_stanza', 'Stanza da pulire'],
  ['select.mop', 'select.aspirapolvere_lavaggio', 'Intensità lavaggio'],
  ['button.maintenance', 'button.aspirapolvere_manutenzione', 'Manutenzione aspirapolvere'],
  ['button.update_car', 'button.auto_aggiorna', 'Aggiorna auto'],
  ['input_number.fixture', 'input_number.soglia', 'Soglia'],
  ['script.fixture', 'script.scenario_sera', 'Scenario sera'],
  ['todo.fixture', 'todo.lista_spesa', 'Lista della spesa'],
  ['sensor.today', 'sensor.costo_oggi', 'Costo di oggi'],
  ['sensor.month', 'sensor.costo_mese', 'Costo del mese'],
  ['sensor.consumption', 'sensor.consumo_oggi', 'Consumo di oggi'],
  ['sensor.nordpool', 'sensor.prezzo_energia', 'Prezzo energia'],
];

/** Id of a fixture entity in the house; an id that is not a fixture one is returned as it is. */
export const FIXTURE_TO_HOUSE: Readonly<Record<string, string>> = Object.fromEntries(
  FIXTURE_ENTITIES.map(([fixtureId, houseId]) => [fixtureId, houseId])
);

/** What the house changes in the fixture entity it starts from (state and attributes). */
const FIXTURE_PATCH: Record<string, { state?: string; attributes?: Attributes }> = {
  'media_player.tv_soggiorno': {
    state: 'playing',
    attributes: {
      device_class: 'tv',
      media_title: 'Telegiornale della sera',
      media_artist: undefined,
      media_content_type: 'tvshow',
      media_content_id: 'mockup:tv:1',
      app_name: 'Rai 1',
      source: 'HDMI 1',
      source_list: ['HDMI 1', 'HDMI 2', 'Netflix', 'YouTube', 'Prime Video'],
      group_members: undefined,
    },
  },
  'media_player.apple_tv_camera': {
    state: 'paused',
    attributes: {
      device_class: 'tv',
      media_title: 'Documentario sul mare',
      media_content_type: 'video',
      media_content_id: 'mockup:tv:2',
      app_name: 'Apple TV',
      source: 'Apple TV+',
      source_list: ['Apple TV+', 'Netflix', 'YouTube'],
      group_members: undefined,
    },
  },
  'media_player.nest_cucina': {
    attributes: { device_class: 'speaker', group_members: ['media_player.nest_cucina'] },
  },
  'media_player.sonos_soggiorno': {
    attributes: { group_members: ['media_player.sonos_soggiorno'] },
  },
  'camera.videocamera_ingresso': {
    attributes: {
      access_token: 'mockup',
      entity_picture: '/api/camera_proxy/camera.videocamera_ingresso',
    },
  },
  'switch.sonos_sveglia': { attributes: { device_class: undefined } },
  'select.aspirapolvere_stanza': {
    state: 'Soggiorno',
    attributes: { options: ['Soggiorno', 'Cucina', 'Camera da letto', 'Bagno', 'Ingresso'] },
  },
  'select.aspirapolvere_lavaggio': { attributes: { options: ['Spento', 'Normale', 'Intenso'] } },
  'binary_sensor.videocamera_ingresso_movimento': { state: 'off' },
  'sensor.auto_batteria': { attributes: { device_class: 'battery' } },
  'sensor.auto_autonomia': { attributes: { device_class: 'distance' } },
  'sensor.costo_oggi': { attributes: { device_class: 'monetary' } },
  'sensor.costo_mese': { attributes: { device_class: 'monetary' } },
  'sensor.consumo_oggi': { attributes: { device_class: 'energy' } },
};

export const MOCK_TRACKS = [
  { title: 'Notte a Milano', artist: 'Archivio locale', album: 'Serate', duration: 214 },
  { title: 'Caffè sul balcone', artist: 'Archivio locale', album: 'Mattine', duration: 187 },
  { title: 'Strada di casa', artist: 'Archivio locale', album: 'Viaggi', duration: 243 },
  { title: 'Pioggia d’estate', artist: 'Archivio locale', album: 'Stagioni', duration: 201 },
];

/** The picture path a media player carries for its current track. */
export const mediaPicturePath = (entityId: string, title: string): string =>
  `/api/media_player_proxy/${entityId}?t=${encodeURIComponent(title)}`;

function withTrack(entity: HassEntity, index: number): HassEntity {
  const track = MOCK_TRACKS[index % MOCK_TRACKS.length]!;
  return {
    ...entity,
    attributes: {
      ...entity.attributes,
      media_title: track.title,
      media_artist: track.artist,
      media_album_name: track.album,
      media_duration: track.duration,
      media_position: 42,
      media_content_id: `mockup:track:${index}`,
      entity_picture: mediaPicturePath(entity.entity_id, track.title),
    },
  };
}

/** Attributes with the `undefined` values left out (a patch uses them to remove a key). */
const without = (attributes: Attributes): Attributes =>
  Object.fromEntries(Object.entries(attributes).filter(([, value]) => value !== undefined));

/** A copy of a fixture entity under its id in the house. */
function fromFixture(fixtureId: string, at: string): HassEntity {
  const row = FIXTURE_ENTITIES.find(([id]) => id === fixtureId)!;
  const [, houseId, name] = row;
  const source = adaptiveFixtureEntities[fixtureId]!;
  const patch = FIXTURE_PATCH[houseId];
  return {
    ...structuredClone(source),
    entity_id: houseId,
    state: patch?.state ?? source.state,
    attributes: without({
      ...structuredClone(source.attributes),
      friendly_name: name,
      ...(patch?.attributes ?? {}),
    }),
    last_changed: at,
    last_updated: at,
    context: { id: `mockup-${houseId}`, parent_id: null, user_id: null },
  };
}

/** Entities of the house that the fixtures do not have. */
function extraEntities(at: string): HassEntity[] {
  const lightAttributes = {
    supported_features: 32,
    supported_color_modes: ['hs', 'color_temp'],
    color_mode: 'color_temp',
    min_color_temp_kelvin: 2200,
    max_color_temp_kelvin: 6500,
  };
  const tvAttributes = {
    device_class: 'tv',
    supported_features: 1048575,
    volume_level: 0.25,
    is_volume_muted: false,
    source_list: ['HDMI 1', 'HDMI 2', 'Netflix', 'YouTube'],
  };
  return [
    makeEntity(
      'light.luce_divano',
      'on',
      {
        friendly_name: 'Luce divano',
        ...lightAttributes,
        brightness: 110,
        color_temp_kelvin: 2700,
      },
      at
    ),
    makeEntity(
      'light.lampada_comodino',
      'off',
      {
        friendly_name: 'Lampada comodino',
        ...lightAttributes,
        brightness: 120,
        color_temp_kelvin: 2700,
      },
      at
    ),
    makeEntity(
      'light.videocamera_ingresso_faro',
      'off',
      {
        friendly_name: 'Faro ingresso',
        supported_features: 0,
        supported_color_modes: ['brightness'],
        color_mode: 'brightness',
        brightness: 255,
      },
      at
    ),
    makeEntity(
      'cover.tenda_soggiorno',
      'open',
      {
        friendly_name: 'Tenda soggiorno',
        device_class: 'curtain',
        supported_features: 15,
        current_position: 100,
      },
      at
    ),
    makeEntity(
      'media_player.tv_cucina',
      'off',
      { friendly_name: 'TV cucina', ...tvAttributes },
      at
    ),
    makeEntity('remote.tv_cucina', 'off', { friendly_name: 'Telecomando TV cucina' }, at),
    makeEntity(
      'switch.presa_lavatrice',
      'on',
      { friendly_name: 'Presa lavatrice', device_class: 'outlet' },
      at
    ),
    makeEntity(
      'sensor.presa_lavatrice_potenza',
      '46.3',
      {
        friendly_name: 'Potenza lavatrice',
        unit_of_measurement: 'W',
        device_class: 'power',
        state_class: 'measurement',
      },
      at
    ),
    makeEntity(
      'sensor.porta_ingresso_batteria',
      '85',
      {
        friendly_name: 'Batteria serratura',
        unit_of_measurement: '%',
        device_class: 'battery',
      },
      at
    ),
    makeEntity(
      'select.tagliaerba_zona',
      'Prato davanti',
      { friendly_name: 'Zona di taglio', options: ['Prato davanti', 'Prato dietro'] },
      at
    ),
    makeEntity(
      'sensor.temperatura_esterna',
      '19.4',
      {
        friendly_name: 'Temperatura esterna',
        unit_of_measurement: '°C',
        device_class: 'temperature',
      },
      at
    ),
    makeEntity(
      'sensor.giardino_umidita',
      '58',
      { friendly_name: 'Umidità giardino', unit_of_measurement: '%', device_class: 'humidity' },
      at
    ),
    makeEntity(
      'weather.home',
      'partlycloudy',
      {
        friendly_name: 'Casa',
        temperature: 21,
        temperature_unit: '°C',
        humidity: 52,
        pressure: 1016,
        pressure_unit: 'hPa',
        wind_speed: 12,
        wind_speed_unit: 'km/h',
        wind_bearing: 220,
        visibility: 18,
        attribution: 'Dati dimostrativi',
        supported_features: 7,
      },
      at
    ),
    makeEntity(
      'calendar.famiglia',
      'off',
      { friendly_name: 'Calendario famiglia', message: 'Cena dai nonni', all_day: false },
      at
    ),
  ];
}

/** Entities of the house in its normal state. */
function normalEntities(): Record<string, HassEntity> {
  const at = new Date().toISOString();
  const entities: Record<string, HassEntity> = {};
  for (const [fixtureId, houseId] of FIXTURE_ENTITIES) {
    entities[houseId] = fromFixture(fixtureId, at);
  }
  for (const entity of extraEntities(at)) entities[entity.entity_id] = entity;
  // Speakers carry a track; the TVs and the Apple TV carry a programme.
  entities['media_player.sonos_soggiorno'] = withTrack(
    entities['media_player.sonos_soggiorno']!,
    1
  );
  entities['media_player.nest_cucina'] = withTrack(entities['media_player.nest_cucina']!, 0);
  return entities;
}

/** Entities of the house in its normal state (the fixture ones plus the extra ones). */
export function createMockEntities(scenario: MockScenario = 'normal'): Record<string, HassEntity> {
  return applyScenarioToEntities(normalEntities(), scenario);
}

/** Services of the simulated Home Assistant: the shared catalogue plus the ones the demo adds. */
export const MOCK_SERVICES = {
  ...adaptiveFixtureServices,
  weather: { get_forecasts: { fields: {} } },
  calendar: { get_events: { fields: {} } },
};

// ── Widget settings bound to the house ─────────────────────────────────────────────────────

/** The fixture settings with every fixture id replaced by the id of the house. */
function renamed<T>(value: T): T {
  if (typeof value === 'string') return (FIXTURE_TO_HOUSE[value] ?? value) as T;
  if (Array.isArray(value)) return value.map((item) => renamed(item)) as T;
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, renamed(item)])
    ) as T;
  }
  return value;
}

/** What the house binds differently from the fixtures, per widget type (after the renaming). */
export const MOCK_EXTRA_SETTINGS: Record<string, CardSettings> = {
  sensor: {
    adaptiveBindings: {
      switch: 'switch.presa_lavatrice',
      script: 'script.scenario_sera',
      number: 'input_number.soglia',
    },
  },
  weather: { weatherId: 'weather.home', tempId: 'sensor.temperatura_esterna' },
  calendar: { calendars: ['calendar.famiglia'] },
  camera: { cameraCastIds: ['media_player.nest_cucina', 'media_player.sonos_soggiorno'] },
  androidtv: { mediaPlayerId: 'media_player.tv_soggiorno' },
  appletv: { mediaPlayerId: 'media_player.apple_tv_camera', remoteId: 'remote.apple_tv_camera' },
  mower: {
    adaptiveBindings: {
      zone: 'select.tagliaerba_zona',
      height: 'number.tagliaerba_altezza_taglio',
    },
  },
  room: {
    areaId: 'soggiorno',
    entityIds: [
      'light.luce_soggiorno',
      'light.luce_divano',
      'cover.tenda_soggiorno',
      'climate.termostato_soggiorno',
      'sensor.soggiorno_temperatura',
      'sensor.soggiorno_umidita',
    ],
    tempEntityId: 'sensor.soggiorno_temperatura',
    climateEntityId: 'climate.termostato_soggiorno',
  },
};

/**
 * The second widget of a type on «Tutti i widget» (the one of another size) shows another device
 * of the house, so the pages cover more of it than one device per type.
 */
export const MOCK_SECOND_BINDINGS: Record<string, CardSettings> = {
  light: { bindingEntityId: 'light.luce_divano' },
  cover: { coverId: 'cover.tenda_soggiorno' },
  androidtv: { mediaPlayerId: 'media_player.tv_cucina', remoteId: 'remote.tv_cucina' },
  sensor: { entityId: 'sensor.temperatura_esterna', adaptiveBindings: {} },
};

/** Settings that bind a widget of each type to the entities of the house. */
export function mockBindingSettings(type: string, second = false): CardSettings {
  const settings: CardSettings = {
    ...renamed(adaptiveFixtureSettings[type]?.settings ?? {}),
    ...(MOCK_EXTRA_SETTINGS[type] ?? {}),
    ...(second ? (MOCK_SECOND_BINDINGS[type] ?? {}) : {}),
  };
  if (type === 'androidtv' && !second) delete settings.remoteId;
  if (type === 'car') {
    // The car has its own battery, charge and update; the thermostat and the door are the house's.
    delete settings.climateId;
    delete settings.lockId;
  }
  return settings;
}

// ── Registries ─────────────────────────────────────────────────────────────────────────────

export interface MockDeviceSpec {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  /** Integration of the device and of its entities. */
  platform: string;
  entityIds: string[];
  areaId?: string;
  /** Second part of the identifier of the device in its integration (a serial number). */
  serial?: string;
  /** MAC address of a device on the network (`connections` of the registry). */
  mac?: string;
}

export interface MockArea {
  area_id: string;
  name: string;
}

export const MOCK_AREAS: readonly MockArea[] = [
  { area_id: 'soggiorno', name: 'Soggiorno' },
  { area_id: 'cucina', name: 'Cucina' },
  { area_id: 'camera_da_letto', name: 'Camera da letto' },
  { area_id: 'bagno', name: 'Bagno' },
  { area_id: 'ingresso', name: 'Ingresso' },
  { area_id: 'giardino', name: 'Giardino' },
];

/** The devices of the house; every entity not listed belongs to no device (templates, helpers). */
export const MOCK_DEVICES: readonly MockDeviceSpec[] = [
  {
    id: 'dev_luce_soggiorno',
    name: 'Luce soggiorno',
    manufacturer: 'Signify Netherlands B.V.',
    model: 'Hue white and color ambiance (LCA001)',
    platform: 'hue',
    entityIds: ['light.luce_soggiorno'],
    areaId: 'soggiorno',
    serial: '00:17:88:01:0b:21:6c:a1-0b',
  },
  {
    id: 'dev_luce_divano',
    name: 'Luce divano',
    manufacturer: 'Signify Netherlands B.V.',
    model: 'Hue white and color ambiance (LCT015)',
    platform: 'hue',
    entityIds: ['light.luce_divano'],
    areaId: 'soggiorno',
    serial: '00:17:88:01:0b:21:6c:a2-0b',
  },
  {
    id: 'dev_lampada_comodino',
    name: 'Lampada comodino',
    manufacturer: 'Signify Netherlands B.V.',
    model: 'Hue Go (7602031U7)',
    platform: 'hue',
    entityIds: ['light.lampada_comodino'],
    areaId: 'camera_da_letto',
    serial: '00:17:88:01:0b:21:6c:a3-0b',
  },
  {
    id: 'dev_sensore_soggiorno',
    name: 'Sensore soggiorno',
    manufacturer: 'Aqara',
    model: 'Temperature and humidity sensor (WSDCGQ11LM)',
    platform: 'zha',
    entityIds: ['sensor.soggiorno_temperatura', 'sensor.soggiorno_umidita'],
    areaId: 'soggiorno',
    mac: '00:15:8d:00:08:a1:5e:42',
  },
  {
    id: 'dev_termostato',
    name: 'Termostato soggiorno',
    manufacturer: 'tado°',
    model: 'Smart Thermostat X (SU04)',
    platform: 'tado',
    entityIds: ['climate.termostato_soggiorno'],
    areaId: 'soggiorno',
    serial: 'SU4521098734',
  },
  {
    id: 'dev_tapparella',
    name: 'Tapparella soggiorno',
    manufacturer: 'Somfy',
    model: 'Oximo io',
    platform: 'somfy',
    entityIds: ['cover.tapparella_soggiorno'],
    areaId: 'soggiorno',
    serial: 'io://0812-1234-5678/10347721',
  },
  {
    id: 'dev_tenda',
    name: 'Tenda soggiorno',
    manufacturer: 'Somfy',
    model: 'Glydea Ultra io',
    platform: 'somfy',
    entityIds: ['cover.tenda_soggiorno'],
    areaId: 'soggiorno',
    serial: 'io://0812-1234-5678/10412905',
  },
  {
    id: 'dev_sonos',
    name: 'Sonos soggiorno',
    manufacturer: 'Sonos',
    model: 'Beam (Gen 2)',
    platform: 'sonos',
    entityIds: ['media_player.sonos_soggiorno', 'switch.sonos_sveglia'],
    areaId: 'soggiorno',
    serial: 'RINCON_5CAAFD8A21B801400',
    mac: '5c:aa:fd:8a:21:b8',
  },
  {
    id: 'dev_tv_soggiorno',
    name: 'TV soggiorno',
    manufacturer: 'LG Electronics',
    model: 'UA751C0LA',
    platform: 'webostv',
    entityIds: ['media_player.tv_soggiorno'],
    areaId: 'soggiorno',
    serial: 'a4:b1:c1:3e:77:20',
    mac: 'a4:b1:c1:3e:77:20',
  },
  {
    id: 'dev_altoparlante',
    name: 'Altoparlante cucina',
    manufacturer: 'Google Inc.',
    model: 'Google Nest Audio',
    platform: 'cast',
    entityIds: ['media_player.nest_cucina'],
    areaId: 'cucina',
    serial: '8f3c6a41-9d20-8b17-7c55-2a1e90d3b4c6',
  },
  {
    id: 'dev_tv_cucina',
    name: 'TV cucina',
    manufacturer: 'Samsung Electronics',
    model: 'QE43Q60CAUXZT',
    platform: 'samsungtv',
    entityIds: ['media_player.tv_cucina', 'remote.tv_cucina'],
    areaId: 'cucina',
    serial: '9b0f3e12-5c64-4f1a-9a7d-0e5b21c8d643',
    mac: '34:e1:a9:5c:1d:07',
  },
  {
    id: 'dev_ventilatore',
    name: 'Ventilatore camera',
    manufacturer: 'Xiaomi',
    model: 'Smart Standing Fan 2',
    platform: 'xiaomi_miio',
    entityIds: ['fan.ventilatore_camera'],
    areaId: 'camera_da_letto',
    serial: '92874510',
  },
  {
    id: 'dev_appletv',
    name: 'Apple TV camera',
    manufacturer: 'Apple',
    model: 'Apple TV 4K (3rd generation)',
    platform: 'apple_tv',
    entityIds: ['media_player.apple_tv_camera', 'remote.apple_tv_camera'],
    areaId: 'camera_da_letto',
    serial: 'D8:1D:62:44:AB:0F',
    mac: 'd8:1d:62:44:ab:0f',
  },
  {
    id: 'dev_presa_lavatrice',
    name: 'Presa lavatrice',
    manufacturer: 'Shelly',
    model: 'Shelly Plug S (SHPLG-S)',
    platform: 'shelly',
    entityIds: ['switch.presa_lavatrice', 'sensor.presa_lavatrice_potenza'],
    areaId: 'bagno',
    serial: '8CAAB5C1E4F2',
    mac: '8c:aa:b5:c1:e4:f2',
  },
  {
    id: 'dev_videocamera',
    name: 'Videocamera ingresso',
    manufacturer: 'Reolink',
    model: 'RLC-810A',
    platform: 'reolink',
    entityIds: [
      'camera.videocamera_ingresso',
      'binary_sensor.videocamera_ingresso_movimento',
      'light.videocamera_ingresso_faro',
    ],
    areaId: 'ingresso',
    serial: '95270006B5J7XK2A',
    mac: 'ec:71:db:2a:90:5e',
  },
  {
    id: 'dev_serratura',
    name: 'Porta d’ingresso',
    manufacturer: 'Nuki Home Solutions GmbH',
    model: 'Smart Lock 4.0 Pro',
    platform: 'nuki',
    entityIds: ['lock.porta_ingresso', 'sensor.porta_ingresso_batteria'],
    areaId: 'ingresso',
    serial: '2D5A91F3',
  },
  {
    id: 'dev_allarme',
    name: 'Allarme di casa',
    manufacturer: 'Ajax Systems',
    model: 'Hub 2 Plus',
    platform: 'ajax',
    entityIds: ['alarm_control_panel.allarme_casa'],
    areaId: 'ingresso',
    serial: '0A41F7C2',
  },
  {
    id: 'dev_aspirapolvere',
    name: 'Aspirapolvere',
    manufacturer: 'Roborock',
    model: 'S8 Pro Ultra',
    platform: 'roborock',
    entityIds: [
      'vacuum.aspirapolvere',
      'select.aspirapolvere_stanza',
      'select.aspirapolvere_lavaggio',
      'button.aspirapolvere_manutenzione',
    ],
    areaId: 'ingresso',
    serial: 'rr-S8PU-30871',
  },
  {
    id: 'dev_tagliaerba',
    name: 'Tagliaerba giardino',
    manufacturer: 'Husqvarna',
    model: 'Automower 430X NERA',
    platform: 'husqvarna_automower',
    entityIds: [
      'lawn_mower.tagliaerba_giardino',
      'number.tagliaerba_altezza_taglio',
      'select.tagliaerba_zona',
    ],
    areaId: 'giardino',
    serial: '2231048577',
  },
  {
    id: 'dev_stazione_meteo',
    name: 'Stazione meteo giardino',
    manufacturer: 'Netatmo',
    model: 'Smart Outdoor Module (NAModule1)',
    platform: 'netatmo',
    entityIds: ['sensor.temperatura_esterna', 'sensor.giardino_umidita'],
    areaId: 'giardino',
    mac: '70:ee:50:7a:3c:19',
  },
  {
    id: 'dev_auto',
    name: 'Auto',
    manufacturer: 'Tesla',
    model: 'Model 3 Long Range',
    platform: 'tesla_fleet',
    entityIds: [
      'sensor.auto_batteria',
      'sensor.auto_autonomia',
      'switch.auto_ricarica',
      'number.auto_limite_carica',
      'button.auto_aggiorna',
    ],
    serial: '5YJ3E1EA7LF000000',
  },
];

export function deviceRegistryEntry(spec: MockDeviceSpec): HaDeviceRegistryEntry {
  return {
    id: spec.id,
    name: spec.name,
    name_by_user: null,
    manufacturer: spec.manufacturer,
    model: spec.model,
    area_id: spec.areaId ?? null,
    disabled_by: null,
    identifiers: [[spec.platform, spec.serial ?? spec.id]],
    connections: spec.mac ? [['mac', spec.mac]] : [],
    config_entries: [`entry_${spec.id}`],
    entry_type: null,
  };
}

export function entityRegistryEntry(
  entity: HassEntity,
  spec?: Pick<MockDeviceSpec, 'id' | 'platform' | 'areaId'>
): HaEntityRegistryEntry {
  const deviceClass = entity.attributes.device_class;
  return {
    entity_id: entity.entity_id,
    device_id: spec?.id ?? null,
    platform: spec?.platform ?? 'template',
    area_id: spec?.areaId ?? null,
    disabled_by: null,
    hidden_by: null,
    name: null,
    original_name: null,
    device_class: null,
    original_device_class: typeof deviceClass === 'string' ? deviceClass : null,
    config_entry_id: spec ? `entry_${spec.id}` : null,
  };
}

export function buildRegistries(
  entities: Record<string, HassEntity>,
  devices: readonly MockDeviceSpec[] = MOCK_DEVICES
): { devices: HaDeviceRegistryEntry[]; entities: HaEntityRegistryEntry[] } {
  const specOf = new Map<string, MockDeviceSpec>();
  for (const spec of devices) for (const id of spec.entityIds) specOf.set(id, spec);
  return {
    devices: devices.map(deviceRegistryEntry),
    entities: Object.values(entities).map((entity) =>
      entityRegistryEntry(entity, specOf.get(entity.entity_id))
    ),
  };
}

// ── Scenarios applied to the house ─────────────────────────────────────────────────────────

/** Devices that do not answer in the scenario «Non raggiungibili». */
const UNREACHABLE_DEVICES = [
  'dev_luce_soggiorno',
  'dev_sonos',
  'dev_tv_soggiorno',
  'dev_aspirapolvere',
  'dev_videocamera',
  'dev_termostato',
  'dev_lampada_comodino',
  'dev_tv_cucina',
];

/** What Home Assistant keeps of an entity that does not answer. */
const KEPT_WHEN_UNAVAILABLE = ['friendly_name', 'supported_features', 'device_class', 'icon'];

/** Tail added to the names in the scenario «Nomi lunghi»; the three lengths alternate. */
const LONG_TAILS = [
  ' principale con il lampadario di cristallo sopra il grande tavolo da pranzo',
  ' accanto alla finestra che affaccia sul giardino e sulla strada',
  ' installata dietro la porta a vetri vicino alla scala che porta al piano di sopra',
];

const LONG_AREAS: Record<string, string> = {
  soggiorno: 'Soggiorno con zona pranzo e angolo lettura vicino al camino',
  cucina: 'Cucina abitabile con isola centrale e dispensa',
  camera_da_letto: 'Camera da letto padronale con cabina armadio e bagno privato',
  bagno: 'Bagno di servizio al piano terra accanto alla lavanderia',
  ingresso: 'Ingresso principale e corridoio verso la zona notte',
  giardino: 'Giardino sul retro con prato, orto e porticato coperto',
};

/** Values at the ends of what each widget can show (REP: «Valori estremi»). */
const EXTREME_VALUES: Record<string, { state?: string; attributes?: Attributes }> = {
  'sensor.soggiorno_temperatura': { state: '-27.4' },
  'sensor.soggiorno_umidita': { state: '100' },
  'sensor.temperatura_esterna': { state: '-40' },
  'sensor.giardino_umidita': { state: '0' },
  'sensor.presa_lavatrice_potenza': { state: '3680.5' },
  'sensor.porta_ingresso_batteria': { state: '0' },
  'light.luce_soggiorno': { attributes: { brightness: 255 } },
  'light.luce_divano': { state: 'on', attributes: { brightness: 1 } },
  'fan.ventilatore_camera': { attributes: { percentage: 100 } },
  'cover.tapparella_soggiorno': { state: 'closed', attributes: { current_position: 0 } },
  'cover.tenda_soggiorno': { attributes: { current_position: 100 } },
  'climate.termostato_soggiorno': {
    state: 'cool',
    attributes: {
      current_temperature: -12.5,
      temperature: 35,
      humidity: 0,
      min_temp: -30,
      max_temp: 35,
    },
  },
  'lock.porta_ingresso': { attributes: { battery_level: 0 } },
  'vacuum.aspirapolvere': { state: 'cleaning', attributes: { battery_level: 0 } },
  'lawn_mower.tagliaerba_giardino': { state: 'mowing', attributes: { battery_level: 100 } },
  'number.tagliaerba_altezza_taglio': { state: '60' },
  'sensor.auto_batteria': { state: '0' },
  'sensor.auto_autonomia': { state: '99999' },
  'number.auto_limite_carica': { state: '100' },
  'sensor.costo_oggi': { state: '99999.99' },
  'sensor.costo_mese': { state: '1234567.89' },
  'sensor.consumo_oggi': { state: '0' },
  'sensor.prezzo_energia': { state: '-0.05' },
  'media_player.sonos_soggiorno': {
    attributes: {
      volume_level: 0,
      is_volume_muted: true,
      media_duration: 36_000,
      media_position: 36_000,
    },
  },
  'media_player.nest_cucina': { attributes: { volume_level: 1 } },
  'media_player.tv_soggiorno': { attributes: { volume_level: 1 } },
  'weather.home': {
    state: 'snowy',
    attributes: {
      temperature: -40,
      humidity: 100,
      pressure: 870,
      wind_speed: 250,
      visibility: 0,
    },
  },
};

function applyScenarioToEntities(
  entities: Record<string, HassEntity>,
  scenario: MockScenario
): Record<string, HassEntity> {
  if (scenario === 'empty') return {};
  const result = { ...entities };
  const set = (id: string, change: (entity: HassEntity) => HassEntity) => {
    const entity = result[id];
    if (entity) result[id] = change(entity);
  };
  if (scenario === 'unreachable') {
    for (const spec of MOCK_DEVICES) {
      if (!UNREACHABLE_DEVICES.includes(spec.id)) continue;
      for (const id of spec.entityIds) {
        set(id, (entity) => ({
          ...entity,
          state: 'unavailable',
          attributes: Object.fromEntries(
            Object.entries(entity.attributes).filter(([key]) => KEPT_WHEN_UNAVAILABLE.includes(key))
          ),
        }));
      }
    }
  }
  if (scenario === 'longNames') {
    let index = 0;
    for (const spec of MOCK_DEVICES) {
      const tail = LONG_TAILS[index % LONG_TAILS.length]!;
      index += 1;
      for (const id of spec.entityIds) {
        set(id, (entity) => ({
          ...entity,
          attributes: {
            ...entity.attributes,
            friendly_name: `${String(entity.attributes.friendly_name ?? id)}${tail}`,
            ...(entity.attributes.media_title
              ? {
                  media_title: `${String(entity.attributes.media_title)} - versione estesa con tutti i movimenti e il bis finale`,
                  media_artist: 'Orchestra Sinfonica Regionale e Coro delle Voci Bianche',
                }
              : {}),
          },
        }));
      }
    }
  }
  if (scenario === 'extremes') {
    for (const [id, change] of Object.entries(EXTREME_VALUES)) {
      set(id, (entity) => ({
        ...entity,
        state: change.state ?? entity.state,
        attributes: { ...entity.attributes, ...(change.attributes ?? {}) },
      }));
    }
  }
  return result;
}

/** The house in a scenario: its entities, its devices and its rooms. */
export function mockHouse(scenario: MockScenario = 'normal'): {
  entities: Record<string, HassEntity>;
  devices: MockDeviceSpec[];
  areas: MockArea[];
} {
  const long = scenario === 'longNames';
  const devices: MockDeviceSpec[] =
    scenario === 'empty'
      ? []
      : MOCK_DEVICES.map((spec, index) => ({
          ...spec,
          entityIds: [...spec.entityIds],
          name: long ? `${spec.name}${LONG_TAILS[index % LONG_TAILS.length]!}` : spec.name,
        }));
  return {
    entities: createMockEntities(scenario),
    devices,
    areas: MOCK_AREAS.map((area) => ({
      ...area,
      name: long ? (LONG_AREAS[area.area_id] ?? area.name) : area.name,
    })),
  };
}

// ── Answers of read commands ───────────────────────────────────────────────────────────────

/** Forecast of the weather entity for `get_forecasts`. */
export function weatherForecast(type: string, now: number): Record<string, unknown>[] {
  const conditions = ['sunny', 'partlycloudy', 'cloudy', 'rainy', 'partlycloudy', 'sunny', 'sunny'];
  const hourly = type === 'hourly';
  const twice = type === 'twice_daily';
  const count = hourly ? 24 : twice ? 8 : 7;
  const step = hourly ? 3_600_000 : twice ? 43_200_000 : 86_400_000;
  const base = new Date(now);
  base.setMinutes(0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const when = new Date(base.getTime() + (index + 1) * step);
    const wave = Math.sin((index / count) * Math.PI * (hourly ? 1.2 : 2));
    const condition = conditions[index % conditions.length]!;
    const entry: Record<string, unknown> = {
      datetime: when.toISOString(),
      condition,
      temperature: Math.round((20 + wave * (hourly ? 4 : 5)) * 10) / 10,
      precipitation: condition === 'rainy' ? 2.4 : 0,
      precipitation_probability: condition === 'rainy' ? 70 : 10,
      wind_speed: 10 + (index % 4) * 2,
    };
    if (!hourly) entry.templow = Math.round((13 + wave * 3) * 10) / 10;
    if (twice) entry.is_daytime = index % 2 === 0;
    return entry;
  });
}

/** Events of the calendar of the family for `calendar.get_events`. */
export function calendarEvents(now: number): Record<string, unknown>[] {
  const day = (offset: number, hour: number, minutes = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    date.setHours(hour, minutes, 0, 0);
    return date;
  };
  const event = (
    summary: string,
    start: Date,
    hours: number,
    extra: Record<string, string> = {}
  ) => ({
    summary,
    start: start.toISOString(),
    end: new Date(start.getTime() + hours * 3_600_000).toISOString(),
    uid: `mockup-${summary}`,
    ...extra,
  });
  return [
    event('Cena dai nonni', day(0, 20), 3, { location: 'Via Roma 12' }),
    event('Dentista', day(1, 9, 30), 1, { description: 'Controllo semestrale' }),
    event('Riunione di condominio', day(2, 18), 2),
    event('Partita di calcetto', day(4, 21), 1.5),
    event('Compleanno di Anna', day(6, 19), 4),
  ];
}

/** Content of `media_player/browse_media`. */
export function browseMedia(): Record<string, unknown> {
  return {
    title: 'Musica',
    media_content_id: 'mockup:root',
    media_content_type: 'library',
    can_play: false,
    can_expand: true,
    children: [
      ...MOCK_TRACKS.map((track, index) => ({
        title: track.title,
        media_content_id: `mockup:track:${index}`,
        media_content_type: 'music',
        can_play: true,
        can_expand: false,
        thumbnail: artworkUrl(track.title),
      })),
      {
        title: 'Serate',
        media_content_id: 'mockup:album:serate',
        media_content_type: 'album',
        can_play: false,
        can_expand: true,
      },
    ],
  };
}
