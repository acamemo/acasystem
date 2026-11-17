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
export type MockScenario =
  'normal' | 'unreachable' | 'tvSilent' | 'longNames' | 'extremes' | 'empty';

export const MOCK_SCENARIOS: readonly { id: MockScenario; label: string }[] = [
  { id: 'normal', label: 'Casa normale' },
  { id: 'unreachable', label: 'Non raggiungibili' },
  { id: 'tvSilent', label: 'TV che non risponde' },
  { id: 'longNames', label: 'Nomi lunghi' },
  { id: 'extremes', label: 'Valori estremi' },
  { id: 'empty', label: 'Casa vuota' },
];

export const isMockScenario = (value: unknown): value is MockScenario =>
  MOCK_SCENARIOS.some((scenario) => scenario.id === value);

// ── The house ──────────────────────────────────────────────────────────────────────────────

/**
 * MediaPlayerEntityFeature bits the TVs of the house declare (Home Assistant `media_player/
 * const.py`). The demo declares only what the integration does: webOS (`webostv/media_player.py`)
 * and Samsung (`samsungtv/media_player.py`) have no seek, shuffle, repeat or browse.
 */
const BIT = {
  PAUSE: 1,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  PLAY_MEDIA: 512,
  VOLUME_STEP: 1024,
  SELECT_SOURCE: 2048,
  STOP: 4096,
  PLAY: 16384,
} as const;

/**
 * Features of an LG webOS TV: always turn off, previous/next, pause, play, stop, source and play
 * media; mute and step unless the sound goes to `lineout`; set volume unless it goes to an
 * external speaker or `lineout`; turn on only when a power-on recipe (automation) exists.
 */
export function lgFeatures(soundOutput: string, wakeRecipe: boolean): number {
  let bits =
    BIT.TURN_OFF |
    BIT.NEXT_TRACK |
    BIT.PAUSE |
    BIT.PREVIOUS_TRACK |
    BIT.SELECT_SOURCE |
    BIT.PLAY_MEDIA |
    BIT.PLAY |
    BIT.STOP;
  if (soundOutput !== 'lineout') bits |= BIT.VOLUME_MUTE | BIT.VOLUME_STEP;
  if (soundOutput !== 'external_speaker' && soundOutput !== 'lineout') bits |= BIT.VOLUME_SET;
  if (wakeRecipe) bits |= BIT.TURN_ON;
  return bits;
}

/** Features of a Samsung TV: turn on only when a turn-on action is configured. */
export function samsungFeatures(wakeRecipe: boolean): number {
  const bits =
    BIT.NEXT_TRACK |
    BIT.PAUSE |
    BIT.PLAY |
    BIT.PLAY_MEDIA |
    BIT.PREVIOUS_TRACK |
    BIT.SELECT_SOURCE |
    BIT.STOP |
    BIT.TURN_OFF |
    BIT.VOLUME_MUTE |
    BIT.VOLUME_SET |
    BIT.VOLUME_STEP;
  return wakeRecipe ? bits | BIT.TURN_ON : bits;
}

/** The channels of the LG TV, in the order of its channel keys (the number is the position). */
export const LG_CHANNELS: readonly string[] = [
  'Rai 1',
  'Rai 2',
  'Rai 3',
  'Rete 4',
  'Canale 5',
  'Italia 1',
  'La7',
];
/** The source of the TV's own channels, as webOS names it. */
export const LIVE_TV_SOURCE = 'Live TV';
export const LG_SOURCES: readonly string[] = [
  LIVE_TV_SOURCE,
  'HDMI 1',
  'HDMI 2',
  'Netflix',
  'YouTube',
  'Prime Video',
];
export const SAMSUNG_SOURCES: readonly string[] = ['TV', 'HDMI', 'Netflix', 'YouTube'];

/**
 * Devices whose power-on recipe is not set up (`GET /accensione/:entry` says `configured:
 * false`): the TV of the kitchen cannot be woken, which shows the inert power key.
 */
export const NO_WAKE_ENTRIES: readonly string[] = ['entry_dev_tv_cucina'];

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
    state: 'on',
    attributes: {
      device_class: 'tv',
      // The power-on recipe (accensione) is set up: the TV declares TURN_ON, as webOS does when
      // the turn-on automation exists. The sound goes out of the TV; `webostv.select_sound_output`
      // moves it (see haStore).
      supported_features: lgFeatures('tv_speaker', true),
      sound_output: 'tv_speaker',
      // On live TV webOS reports the channel name as title and no programme, app or position.
      media_title: LG_CHANNELS[0],
      media_content_type: 'channel',
      source: LIVE_TV_SOURCE,
      source_list: [...LG_SOURCES],
      media_artist: undefined,
      media_album_name: undefined,
      media_content_id: undefined,
      media_duration: undefined,
      media_position: undefined,
      app_name: undefined,
      shuffle: undefined,
      repeat: undefined,
      queue_position: undefined,
      sound_mode: undefined,
      sound_mode_list: undefined,
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
      supported_features: 3, motion_detection: true,
    },
  },
  'lawn_mower.tagliaerba_giardino': { attributes: { supported_features: 15 } },
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

// Explicit synthetic HA tariff intervals, never a production fallback for missing timestamps.
function mockEnergyPrices(at: string): Attributes {
  const day = new Date(at); day.setUTCHours(0, 0, 0, 0);
  const slots = (offset: number) => Array.from({ length: 24 }, (_, hour) => ({
    start: new Date(day.getTime() + (offset + hour) * 3600000).toISOString(),
    end: new Date(day.getTime() + (offset + hour + 1) * 3600000).toISOString(),
    value: Math.round((0.18 + Math.sin(hour / 4) * 0.06) * 1000) / 1000,
  }));
  return { raw_today: slots(0), raw_tomorrow: slots(24), tomorrow_valid: true, unit_of_measurement: '€/kWh' };
}

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
      ...(houseId === 'sensor.prezzo_energia' ? mockEnergyPrices(at) : {}),
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
    // The Samsung TV of the kitchen cannot be switched on from the network (no TURN_ON) and has
    // no UPnP: it reports no `volume_level`, only the mute, and the volume moves in steps.
    supported_features: samsungFeatures(false),
    is_volume_muted: false,
    source_list: [...SAMSUNG_SOURCES],
  };
  return [
    makeEntity('sensor.potenza_casa', '830', { friendly_name: 'Potenza della casa', device_class: 'power', state_class: 'measurement', unit_of_measurement: 'W' }, at),
    makeEntity('sensor.prezzo_senza_fasce', '-0.02', { friendly_name: 'Prezzo registrato senza fasce', device_class: 'monetary', unit_of_measurement: '€/kWh' }, at),
    makeEntity('sensor.studio_temperatura', '21.7', { friendly_name: 'Temperatura studio', device_class: 'temperature', unit_of_measurement: '°C' }, at),
    makeEntity('sensor.studio_umidita', '47', { friendly_name: 'Umidità studio', device_class: 'humidity', unit_of_measurement: '%' }, at),
    makeEntity('sensor.studio_co2', '430', { friendly_name: 'CO₂ studio', device_class: 'carbon_dioxide', unit_of_measurement: 'ppm' }, at),
    makeEntity('sensor.studio_batteria', '86', { friendly_name: 'Batteria studio', device_class: 'battery', unit_of_measurement: '%' }, at),
    makeEntity('binary_sensor.finestra_studio', 'off', { friendly_name: 'Finestra studio', device_class: 'window' }, at),
    makeEntity('sensor.finestra_studio_batteria', '73', { friendly_name: 'Batteria finestra studio', device_class: 'battery', unit_of_measurement: '%' }, at),
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
    makeEntity('switch.multipresa_studio_1', 'on', { friendly_name: 'Monitor', device_class: 'outlet' }, at),
    makeEntity('switch.multipresa_studio_2', 'off', { friendly_name: 'Caricatore', device_class: 'outlet' }, at),
    makeEntity('switch.multipresa_studio_3', 'off', { friendly_name: 'Lampada da tavolo', device_class: 'outlet' }, at),
    makeEntity('device_tracker.auto_posizione', 'home', { friendly_name: 'Posizione auto', source_type: 'gps', latitude: 45.07, longitude: 7.68 }, at),
    makeEntity('sensor.auto_chilometraggio', '28462', { friendly_name: 'Chilometraggio', device_class: 'distance', unit_of_measurement: 'km' }, at),
    makeEntity('sensor.auto_potenza_ricarica', '3.6', { friendly_name: 'Potenza di ricarica', device_class: 'power', unit_of_measurement: 'kW' }, at),
    makeEntity('sensor.auto_tempo_ricarica', '42', { friendly_name: 'Tempo rimanente', device_class: 'duration', unit_of_measurement: 'min' }, at),
    makeEntity('sensor.auto_temperatura', '18.5', { friendly_name: 'Temperatura abitacolo', device_class: 'temperature', unit_of_measurement: '°C' }, at),
    makeEntity('binary_sensor.auto_collegata', 'on', { friendly_name: 'Cavo collegato', device_class: 'plug' }, at),
    makeEntity('binary_sensor.auto_in_carica', 'off', { friendly_name: 'In carica', device_class: 'battery_charging' }, at),
    makeEntity('climate.auto_abitacolo', 'off', { friendly_name: 'Clima abitacolo', supported_features: 385, hvac_modes: ['off', 'heat_cool'], temperature: 21, current_temperature: 18.5, min_temp: 15, max_temp: 28, target_temp_step: 0.5 }, at),
    makeEntity('lock.auto_porte', 'locked', { friendly_name: 'Porte auto', supported_features: 0 }, at),
    makeEntity('sensor.multipresa_studio_potenza', '38.2', { friendly_name: 'Potenza multipresa', device_class: 'power', unit_of_measurement: 'W' }, at),
    makeEntity('sensor.multipresa_studio_energia', '12.6', { friendly_name: 'Energia registrata', device_class: 'energy', unit_of_measurement: 'kWh', state_class: 'total_increasing' }, at),
    makeEntity('media_player.multimedia_tv_single', 'playing', { friendly_name: 'TV studio', device_class: 'tv', supported_features: 1 | 4 | 8 | 128 | 256 | 512 | 1024 | 16384 | 4096, volume_level: 0.4, is_volume_muted: false, media_title: 'Programma dimostrativo' }, at),
    makeEntity('media_player.multimedia_apple_single', 'paused', { friendly_name: 'Apple TV studio', device_class: 'tv', supported_features: 1 | 2 | 4 | 8 | 16 | 32 | 128 | 256 | 512 | 16384 | 4096, volume_level: 0.4, is_volume_muted: false }, at),
    makeEntity('remote.multimedia_apple_single', 'on', { friendly_name: 'Telecomando Apple TV studio', supported_features: 0 }, at),
    makeEntity('media_player.multimedia_audio_single', 'paused', { friendly_name: 'Lettore studio', device_class: 'speaker', supported_features: 1 | 4 | 8 | 512 | 16384 | 4096, volume_level: 0.4, is_volume_muted: false }, at),
    makeEntity('media_player.multimedia_sonos_single', 'playing', { friendly_name: 'Sonos studio', device_class: 'speaker', supported_features: 1 | 4 | 8 | 16 | 32 | 512 | 16384 | 4096, volume_level: 0.4, is_volume_muted: false, media_title: 'Brano dimostrativo' }, at),
    makeEntity('media_player.multimedia_tv_a', 'playing', { friendly_name: 'Schermo principale', device_class: 'tv', supported_features: 1 | 2 | 4 | 8 | 16 | 32 | 128 | 256 | 512 | 1024 | 2048 | 16384 | 4096, volume_level: 0.4, is_volume_muted: false, source: 'HDMI 1', source_list: ['HDMI 1', 'TV'], media_title: 'Programma dimostrativo' }, at),
    makeEntity('media_player.multimedia_tv_b', 'paused', { friendly_name: 'Secondo canale', device_class: 'tv', supported_features: 1 | 512 | 16384, media_title: 'Canale simulato' }, at),
    makeEntity('remote.multimedia_tv', 'on', { friendly_name: 'Telecomando', supported_features: 0 }, at),
    makeEntity('media_player.multimedia_audio_a', 'playing', { friendly_name: 'Zona principale', device_class: 'receiver', supported_features: 1 | 2 | 4 | 8 | 16 | 32 | 512 | 2048 | 16384 | 32768 | 131072 | 4096 | 262144, volume_level: 0.4, is_volume_muted: false, source: 'Radio', source_list: ['Radio', 'Aux'], media_title: 'Brano dimostrativo', media_artist: 'Raccolta ACA', repeat: 'off', shuffle: false, media_duration: 240, media_position: 60 }, at),
    makeEntity('media_player.multimedia_audio_b', 'idle', { friendly_name: 'Zona secondaria', device_class: 'speaker', supported_features: 512 | 1 | 16384 }, at),
    makeEntity('sensor.multimedia_audio_segnale', '-55', { friendly_name: 'Segnale', unit_of_measurement: 'dBm' }, at),
    makeEntity('media_player.multimedia_sonos_a', 'playing', { friendly_name: 'Uscita principale', device_class: 'speaker', supported_features: 512 | 1 | 4 | 8 | 16 | 32 | 2 | 16384 | 4096, volume_level: 0.5, is_volume_muted: false, media_title: 'Playlist dimostrativa' }, at),
    makeEntity('media_player.multimedia_sonos_b', 'paused', { friendly_name: 'Uscita secondaria', device_class: 'speaker', supported_features: 512 | 1 | 16384 }, at),
    makeEntity('vacuum.aspirapolvere_studio', 'docked', { friendly_name: 'Aspirapolvere studio', supported_features: 8192 | 4096 | 4 | 8 | 16, battery_level: 78 }, at),
    makeEntity('vacuum.robot_piano_terra', 'paused', { friendly_name: 'Robot piano terra', supported_features: 8192 | 4096 | 4 | 8 | 16 | 32 | 512 | 1024 | 16384, battery_level: 62, fan_speed: 'Bilanciata', fan_speed_list: ['Silenziosa', 'Bilanciata', 'Turbo'] }, at),
    makeEntity('vacuum.robot_piano_primo', 'docked', { friendly_name: 'Robot piano primo', supported_features: 8192 | 4096 | 4 | 16, battery_level: 95 }, at),
    makeEntity('sensor.robot_pulizia_tempo', '24', { friendly_name: 'Durata della pulizia', device_class: 'duration', unit_of_measurement: 'min' }, at),
    makeEntity('sensor.robot_pulizia_segnale', '-56', { friendly_name: 'Segnale Wi-Fi', device_class: 'signal_strength', unit_of_measurement: 'dBm' }, at),
    makeEntity('button.robot_pulizia_manutenzione', 'unknown', { friendly_name: 'Ripristina manutenzione' }, at),
    makeEntity('image.robot_pulizia_mappa', at, { friendly_name: 'Mappa piano terra', entity_picture: '/api/image_proxy/image.robot_pulizia_mappa' }, at),
    makeEntity('lawn_mower.tagliaerba_esterno', 'docked', { friendly_name: 'Tagliaerba esterno', supported_features: 15, battery_level: 80 }, at),
    makeEntity('lawn_mower.robot_prato', 'paused', { friendly_name: 'Robot prato', supported_features: 15, battery_level: 66 }, at),
    makeEntity('lawn_mower.robot_bordo', 'docked', { friendly_name: 'Robot bordo', supported_features: 7, battery_level: 91 }, at),
    makeEntity('sensor.robot_giardino_tempo', '35', { friendly_name: 'Tempo di taglio', device_class: 'duration', unit_of_measurement: 'min' }, at),
    makeEntity('select.robot_giardino_zona', 'Prato davanti', { friendly_name: 'Zona di taglio', options: ['Prato davanti', 'Prato dietro'] }, at),
    makeEntity('number.robot_giardino_altezza', '4', { friendly_name: 'Altezza di taglio', unit_of_measurement: 'cm', min: 2, max: 6, step: 1 }, at),
    makeEntity('sensor.robot_giardino_segnale', '-58', { friendly_name: 'Segnale Wi-Fi', device_class: 'signal_strength', unit_of_measurement: 'dBm' }, at),
    makeEntity('button.robot_giardino_lame', 'unknown', { friendly_name: 'Ripristina contatore lame' }, at),
    makeEntity('camera.videocamera_studio', 'idle', { friendly_name: 'Videocamera studio', supported_features: 3, motion_detection: true, entity_picture: '/api/camera_proxy/camera.videocamera_studio' }, at),
    makeEntity('camera.vista_ingresso', 'idle', { friendly_name: 'Vista ingresso', supported_features: 3, motion_detection: true, entity_picture: '/api/camera_proxy/camera.vista_ingresso' }, at),
    makeEntity('camera.vista_giardino', 'recording', { friendly_name: 'Vista giardino', supported_features: 2, entity_picture: '/api/camera_proxy/camera.vista_giardino' }, at),
    makeEntity('light.viste_faro', 'off', { friendly_name: 'Faro esterno', supported_color_modes: ['onoff'] }, at),
    makeEntity('sensor.viste_segnale', '-58', { friendly_name: 'Segnale Wi-Fi', device_class: 'signal_strength', unit_of_measurement: 'dBm' }, at),
    makeEntity('switch.viste_led', 'off', { friendly_name: 'LED di stato' }, at),
    makeEntity('alarm_control_panel.allarme_studio', 'disarmed', { friendly_name: 'Allarme studio', supported_features: 3, code_format: null, code_arm_required: false }, at),
    makeEntity('alarm_control_panel.piano_terra', 'armed_home', { friendly_name: 'Piano terra', supported_features: 55, code_format: 'number', code_arm_required: true }, at),
    makeEntity('alarm_control_panel.garage', 'armed_away', { friendly_name: 'Garage', supported_features: 2, code_format: 'text', code_arm_required: false }, at),
    makeEntity('binary_sensor.zone_ingresso', 'off', { friendly_name: 'Ingresso delle zone', device_class: 'door' }, at),
    makeEntity('sensor.zone_batteria', '95', { friendly_name: 'Batteria zone', device_class: 'battery', unit_of_measurement: '%' }, at),
    makeEntity('lock.serratura_studio', 'unlocked', { friendly_name: 'Serratura studio', supported_features: 0 }, at),
    makeEntity('lock.accesso_esterno', 'locked', { friendly_name: 'Accesso esterno', supported_features: 1, code_format: '[A-Za-z0-9 ]{4,32}' }, at),
    makeEntity('lock.accesso_interno', 'unlocked', { friendly_name: 'Accesso interno', supported_features: 0 }, at),
    makeEntity('binary_sensor.accesso_porta', 'off', { friendly_name: 'Porta esterna', device_class: 'door' }, at),
    makeEntity('sensor.accesso_batteria', '80', { friendly_name: 'Batteria accessi', device_class: 'battery', unit_of_measurement: '%' }, at),
    makeEntity('fan.ventilatore_cucina', 'off', { friendly_name: 'Ventilatore cucina', supported_features: 48 }, at),
    makeEntity('fan.ventilazione_studio', 'on', { friendly_name: 'Ventola principale', supported_features: 63, percentage: 50, percentage_step: 25,
      oscillating: false, direction: 'forward', preset_mode: 'normal', preset_modes: ['normal', 'natural', 'sleep'] }, at),
    makeEntity('fan.ventilazione_studio_secondaria', 'on', { friendly_name: 'Ventola secondaria', supported_features: 49, percentage: 30, percentage_step: 1 }, at),
    makeEntity('sensor.ventilazione_potenza', '18.5', { friendly_name: 'Potenza ventilazione', device_class: 'power', unit_of_measurement: 'W' }, at),
    makeEntity('sensor.ventilazione_segnale', '-58', { friendly_name: 'Segnale Wi-Fi', device_class: 'signal_strength', unit_of_measurement: 'dBm' }, at),
    makeEntity('switch.ventilazione_led', 'off', { friendly_name: 'Spia del dispositivo' }, at),
    makeEntity('cover.tapparella_camera', 'closed', { friendly_name: 'Tapparella camera', device_class: 'shutter', supported_features: 3 }, at),
    makeEntity('cover.veneziana_studio', 'open', { friendly_name: 'Veneziana principale', device_class: 'blind', supported_features: 255,
      current_position: 40, current_tilt_position: 30 }, at),
    makeEntity('cover.veneziana_studio_secondaria', 'open', { friendly_name: 'Tenda secondaria', device_class: 'curtain', supported_features: 15,
      current_position: 65 }, at),
    makeEntity('sensor.veneziana_potenza', '14', { friendly_name: 'Potenza motore', device_class: 'power', unit_of_measurement: 'W' }, at),
    makeEntity('sensor.veneziana_segnale', '-60', { friendly_name: 'Segnale Wi-Fi', device_class: 'signal_strength', unit_of_measurement: 'dBm' }, at),
    makeEntity('button.veneziana_calibrazione', '2026-11-10T00:00:00+00:00', { friendly_name: 'Calibrazione' }, at),
    makeEntity('climate.termostato_camera', 'heat', { friendly_name: 'Termostato camera', current_temperature: 19.5,
      temperature: 20.5, min_temp: 15, max_temp: 25, target_temp_step: 0.5, supported_features: 385,
      hvac_modes: ['off', 'heat'], hvac_action: 'heating', temperature_unit: '°C' }, at),
    makeEntity('climate.climatizzatore_studio', 'heat_cool', { friendly_name: 'Zona principale', current_temperature: 22.2,
      target_temp_low: 20, target_temp_high: 24, min_temp: 16, max_temp: 30, target_temp_step: 1,
      supported_features: 958, hvac_modes: ['off', 'heat_cool', 'cool', 'fan_only'], hvac_action: 'idle',
      fan_modes: ['auto', 'low', 'high'], fan_mode: 'auto', preset_modes: ['none', 'eco', 'boost'], preset_mode: 'none',
      swing_modes: ['off', 'vertical'], swing_mode: 'off', swing_horizontal_modes: ['off', 'horizontal'], swing_horizontal_mode: 'off',
      current_humidity: 45, humidity: 50, min_humidity: 30, max_humidity: 70, target_humidity_step: 5, temperature_unit: '°C' }, at),
    makeEntity('climate.climatizzatore_studio_secondario', 'heat', { friendly_name: 'Zona secondaria', current_temperature: 19,
      temperature: 21, min_temp: 15, max_temp: 25, target_temp_step: 0.5, supported_features: 385,
      hvac_modes: ['off', 'heat'], hvac_action: 'heating', temperature_unit: '°C' }, at),
    makeEntity('sensor.climatizzatore_potenza', '630', { friendly_name: 'Potenza climatizzatore', device_class: 'power', unit_of_measurement: 'W' }, at),
    makeEntity('sensor.climatizzatore_energia', '18.6', { friendly_name: 'Energia climatizzatore', device_class: 'energy', unit_of_measurement: 'kWh' }, at),
    makeEntity('sensor.climatizzatore_segnale', '-54', { friendly_name: 'Segnale Wi-Fi', device_class: 'signal_strength', unit_of_measurement: 'dBm' }, at),
    makeEntity('select.climatizzatore_avvio', 'Eco', { friendly_name: 'Comportamento all’avvio', options: ['Eco', 'Comfort'] }, at),
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
        visibility_unit: 'km',
        precipitation_unit: 'mm',
        attribution: 'Dati dimostrativi',
        supported_features: 7,
      },
      at
    ),
    // Alternate weather service for explicit source selection in the demo only.
    makeEntity(
      'weather.giardino',
      'rainy',
      {
        friendly_name: 'Stazione giardino',
        temperature: 14,
        temperature_unit: '°C',
        humidity: 78,
        precipitation_unit: 'mm',
        supported_features: 1,
        attribution: 'Dati dimostrativi',
      },
      at
    ),
    makeEntity(
      'calendar.famiglia',
      'off',
      { friendly_name: 'Calendario famiglia', message: 'Cena dai nonni', all_day: false },
      at
    ),
    // The Zigbee devices of the ZHA coordinator (REP-20261029-003).
    makeEntity(
      'sensor.pulsante_ingresso_batteria',
      '12',
      {
        friendly_name: 'Batteria pulsante ingresso',
        unit_of_measurement: '%',
        device_class: 'battery',
      },
      at
    ),
    makeEntity(
      'binary_sensor.movimento_corridoio',
      'off',
      { friendly_name: 'Movimento corridoio', device_class: 'motion' },
      at
    ),
    makeEntity(
      'sensor.movimento_corridoio_batteria',
      '64',
      {
        friendly_name: 'Batteria sensore corridoio',
        unit_of_measurement: '%',
        device_class: 'battery',
      },
      at
    ),
    makeEntity(
      'switch.presa_lampada_lettura',
      'off',
      { friendly_name: 'Presa lampada lettura', device_class: 'outlet' },
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
  vacuum: { ...adaptiveFixtureServices.vacuum, locate: { fields: {} } },
  lawn_mower: { ...adaptiveFixtureServices.lawn_mower, stop: { fields: {} } },
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
  alarm: { alarmId: 'alarm_control_panel.allarme_casa', name: 'Allarme di casa',
    productDevice: { version: 1, family: 'alarm', deviceId: 'dev_allarme', primaryEntityId: 'alarm_control_panel.allarme_casa',
      channelEntityIds: ['alarm_control_panel.allarme_casa'], secondaryEntityIds: [], technicalEntityIds: [] } },
  lock: { lockId: 'lock.porta_ingresso', name: 'Porta ingresso',
    productDevice: { version: 1, family: 'lock', deviceId: 'dev_serratura', primaryEntityId: 'lock.porta_ingresso',
      channelEntityIds: ['lock.porta_ingresso'], secondaryEntityIds: ['sensor.porta_ingresso_batteria'], technicalEntityIds: [] } },
  fan: { bindingEntityId: 'fan.ventilatore_camera', name: 'Ventilatore camera',
    productDevice: { version: 1, family: 'fan', deviceId: 'dev_ventilatore', primaryEntityId: 'fan.ventilatore_camera',
      channelEntityIds: ['fan.ventilatore_camera'], secondaryEntityIds: [], technicalEntityIds: [] } },
  cover: { coverId: 'cover.tapparella_soggiorno', name: 'Tapparella soggiorno',
    productDevice: { version: 1, family: 'cover', deviceId: 'dev_tapparella', primaryEntityId: 'cover.tapparella_soggiorno',
      channelEntityIds: ['cover.tapparella_soggiorno'], secondaryEntityIds: [], technicalEntityIds: [] } },
  climate: { climateId: 'climate.termostato_soggiorno', name: 'Termostato soggiorno',
    productDevice: { version: 1, family: 'climate', deviceId: 'dev_termostato', primaryEntityId: 'climate.termostato_soggiorno',
      channelEntityIds: ['climate.termostato_soggiorno'], secondaryEntityIds: [], technicalEntityIds: [] } },
  plug: {
    bindingEntityId: 'switch.presa_lavatrice', name: 'Presa lavatrice',
    productDevice: { version: 1, family: 'plug', deviceId: 'dev_presa_lavatrice', primaryEntityId: 'switch.presa_lavatrice',
      channelEntityIds: ['switch.presa_lavatrice'], secondaryEntityIds: ['sensor.presa_lavatrice_potenza'], technicalEntityIds: [] },
  },
  sensor: { entityId: 'sensor.soggiorno_temperatura', name: 'Sensore soggiorno', sensorBindingMode: 'device',
    productDevice: { version: 1, family: 'sensor', deviceId: 'dev_sensore_soggiorno', primaryEntityId: 'sensor.soggiorno_temperatura',
      channelEntityIds: ['sensor.soggiorno_temperatura', 'sensor.soggiorno_umidita'], secondaryEntityIds: [], technicalEntityIds: [] } },
  cost: { powerId: 'sensor.potenza_casa', consumptionId: 'sensor.consumo_oggi', todayId: 'sensor.costo_oggi', monthId: 'sensor.costo_mese' },
  weather: { weatherId: 'weather.home', tempId: 'sensor.temperatura_esterna' },
  calendar: { calendars: ['calendar.famiglia'] },
  camera: { cameraId: 'camera.videocamera_ingresso', name: 'Videocamera ingresso',
    cameraCastIds: ['media_player.nest_cucina', 'media_player.sonos_soggiorno'],
    productDevice: { version: 1, family: 'camera', deviceId: 'dev_videocamera', primaryEntityId: 'camera.videocamera_ingresso',
      channelEntityIds: ['camera.videocamera_ingresso'], secondaryEntityIds: ['binary_sensor.videocamera_ingresso_movimento', 'light.videocamera_ingresso_faro'], technicalEntityIds: [] } },
  androidtv: { mediaPlayerId: 'media_player.tv_soggiorno', name: 'TV soggiorno', productDevice: { version: 1, family: 'tv', deviceId: 'dev_tv_soggiorno', primaryEntityId: 'media_player.tv_soggiorno', channelEntityIds: ['media_player.tv_soggiorno'], secondaryEntityIds: [] } },
  appletv: { mediaPlayerId: 'media_player.apple_tv_camera', remoteId: 'remote.apple_tv_camera', name: 'Apple TV camera', productDevice: { version: 1, family: 'tv', deviceId: 'dev_appletv', primaryEntityId: 'media_player.apple_tv_camera', channelEntityIds: ['media_player.apple_tv_camera'], secondaryEntityIds: ['remote.apple_tv_camera'] } },
  media: { mediaIds: ['media_player.nest_cucina'], name: 'Altoparlante cucina', productDevice: { version: 1, family: 'media', deviceId: 'dev_altoparlante', primaryEntityId: 'media_player.nest_cucina', channelEntityIds: ['media_player.nest_cucina'], secondaryEntityIds: [] } },
  sonos: { mediaIds: ['media_player.sonos_soggiorno'], name: 'Sonos soggiorno', productDevice: { version: 1, family: 'sonos', deviceId: 'dev_sonos', primaryEntityId: 'media_player.sonos_soggiorno', channelEntityIds: ['media_player.sonos_soggiorno'], secondaryEntityIds: ['switch.sonos_sveglia'] } },
  vacuum: { bindingEntityId: 'vacuum.aspirapolvere', name: 'Aspirapolvere',
    productDevice: { version: 1, family: 'vacuum', deviceId: 'dev_aspirapolvere', primaryEntityId: 'vacuum.aspirapolvere',
      channelEntityIds: ['vacuum.aspirapolvere'], secondaryEntityIds: ['select.aspirapolvere_stanza', 'select.aspirapolvere_lavaggio', 'button.aspirapolvere_manutenzione'], technicalEntityIds: [] } },
  mower: { bindingEntityId: 'lawn_mower.tagliaerba_giardino', name: 'Tagliaerba giardino',
    productDevice: { version: 1, family: 'mower', deviceId: 'dev_tagliaerba', primaryEntityId: 'lawn_mower.tagliaerba_giardino',
      channelEntityIds: ['lawn_mower.tagliaerba_giardino'], secondaryEntityIds: ['number.tagliaerba_altezza_taglio', 'select.tagliaerba_zona'], technicalEntityIds: [] },
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
  cover: { coverId: 'cover.tenda_soggiorno', productDevice: undefined, name: undefined },
  androidtv: { mediaPlayerId: 'media_player.tv_cucina', remoteId: 'remote.tv_cucina', name: undefined, productDevice: undefined },
  appletv: { productDevice: undefined, name: undefined },
  media: { mediaIds: ['media_player.nest_cucina', 'media_player.sonos_soggiorno'], productDevice: undefined, name: undefined },
  sonos: { mediaIds: ['media_player.sonos_soggiorno', 'media_player.nest_cucina'], productDevice: undefined, name: undefined },
  sensor: { entityId: 'sensor.temperatura_esterna', adaptiveBindings: {}, productDevice: undefined, name: undefined, sensorBindingMode: 'helper' },
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
    // Explicit simulated vehicle sources; the house's thermostat and lock are never reused.
    Object.assign(settings, {
      locationId: 'device_tracker.auto_posizione', odometerId: 'sensor.auto_chilometraggio',
      chargingPowerId: 'sensor.auto_potenza_ricarica', timeToFullId: 'sensor.auto_tempo_ricarica',
      tempId: 'sensor.auto_temperatura', pluggedId: 'binary_sensor.auto_collegata',
      chargingStateId: 'binary_sensor.auto_in_carica',
      climateId: 'climate.auto_abitacolo', lockId: 'lock.auto_porte',
    });
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
  /** Registry roles for simulated configuration/diagnostic entities; never inferred from names. */
  entityCategories?: Record<string, 'config' | 'diagnostic'>;
  areaId?: string;
  /** Second part of the identifier of the device in its integration (a serial number). */
  serial?: string;
  /** MAC address of a device on the network (`connections` of the registry). */
  mac?: string;
  /** Device it reaches Home Assistant through (a Zigbee device and its coordinator). */
  viaDeviceId?: string;
  swVersion?: string;
  hwVersion?: string;
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

/** The ZHA coordinator of the house, which its Zigbee devices are linked to. */
export const ZIGBEE_COORDINATOR_ID = 'dev_zigbee_coordinatore';

/** The devices of the house; every entity not listed belongs to no device (templates, helpers). */
export const MOCK_DEVICES: readonly MockDeviceSpec[] = [
  { id: 'dev_sensor_environment', name: 'Sensore ambiente studio', manufacturer: 'ACA Demo', model: 'Sensore ambiente simulato', platform: 'zha', areaId: 'soggiorno',
    entityIds: ['sensor.studio_temperatura', 'sensor.studio_umidita', 'sensor.studio_co2', 'sensor.studio_batteria'],
    entityCategories: { 'sensor.studio_batteria': 'diagnostic' } },
  { id: 'dev_sensor_contact', name: 'Sensore finestra studio', manufacturer: 'ACA Demo', model: 'Sensore apertura simulato', platform: 'zha', areaId: 'soggiorno',
    entityIds: ['binary_sensor.finestra_studio', 'sensor.finestra_studio_batteria'],
    entityCategories: { 'sensor.finestra_studio_batteria': 'diagnostic' } },
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
    viaDeviceId: ZIGBEE_COORDINATOR_ID,
  },
  // The ZHA coordinator, a USB stick; it has no entity of its own (its counters are disabled).
  {
    id: ZIGBEE_COORDINATOR_ID,
    name: 'Zigbee Coordinator',
    manufacturer: 'ITead',
    model: 'SONOFF Zigbee 3.0 USB Dongle Plus V2',
    platform: 'zha',
    entityIds: [],
    serial: '00:12:4b:00:2a:5f:31:c7',
    swVersion: '7.4.4.0 build 0',
  },
  {
    id: 'dev_pulsante_ingresso',
    name: 'Pulsante ingresso',
    manufacturer: 'Aqara',
    model: 'Wireless mini switch (WXKG11LM)',
    platform: 'zha',
    entityIds: ['sensor.pulsante_ingresso_batteria'],
    areaId: 'ingresso',
    serial: '00:15:8d:00:06:7b:20:9e',
    viaDeviceId: ZIGBEE_COORDINATOR_ID,
  },
  {
    id: 'dev_movimento_corridoio',
    name: 'Sensore movimento corridoio',
    manufacturer: 'IKEA of Sweden',
    model: 'TRADFRI motion sensor (E1745)',
    platform: 'zha',
    entityIds: ['binary_sensor.movimento_corridoio', 'sensor.movimento_corridoio_batteria'],
    areaId: 'ingresso',
    serial: '00:0d:6f:ff:fe:41:9a:12',
    viaDeviceId: ZIGBEE_COORDINATOR_ID,
  },
  {
    id: 'dev_presa_lampada_lettura',
    name: 'Presa lampada lettura',
    manufacturer: 'IKEA of Sweden',
    model: 'TRADFRI control outlet (E1603)',
    platform: 'zha',
    entityIds: ['switch.presa_lampada_lettura'],
    areaId: 'soggiorno',
    serial: '00:0d:6f:ff:fe:77:c3:05',
    viaDeviceId: ZIGBEE_COORDINATOR_ID,
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
    id: 'dev_multipresa_studio',
    name: 'Multipresa studio',
    manufacturer: 'Dimostrazione ACA',
    model: 'Tre uscite simulate',
    platform: 'mqtt',
    entityIds: ['switch.multipresa_studio_1', 'switch.multipresa_studio_2', 'switch.multipresa_studio_3',
      'sensor.multipresa_studio_potenza', 'sensor.multipresa_studio_energia'],
    areaId: 'soggiorno',
  },
  {
    id: 'dev_multimedia_tv_single', name: 'TV studio', manufacturer: 'Dimostrazione ACA', model: 'TV singola simulata',
    platform: 'androidtv_remote', entityIds: ['media_player.multimedia_tv_single'], areaId: 'soggiorno',
  },
  {
    id: 'dev_multimedia_apple_single', name: 'Apple TV studio', manufacturer: 'Dimostrazione ACA', model: 'Apple TV simulata',
    platform: 'apple_tv', entityIds: ['media_player.multimedia_apple_single', 'remote.multimedia_apple_single'], areaId: 'soggiorno',
  },
  {
    id: 'dev_multimedia_audio_single', name: 'Lettore studio', manufacturer: 'Dimostrazione ACA', model: 'Lettore singolo simulato',
    platform: 'dlna_dmr', entityIds: ['media_player.multimedia_audio_single'], areaId: 'soggiorno',
  },
  {
    id: 'dev_multimedia_sonos_single', name: 'Sonos studio', manufacturer: 'Dimostrazione ACA', model: 'Sonos singolo simulato',
    platform: 'sonos', entityIds: ['media_player.multimedia_sonos_single'], areaId: 'soggiorno',
  },
  {
    id: 'dev_multimedia_tv', name: 'TV multicanale', manufacturer: 'Dimostrazione ACA', model: 'TV simulata a due canali',
    platform: 'androidtv_remote', entityIds: ['media_player.multimedia_tv_a', 'media_player.multimedia_tv_b', 'remote.multimedia_tv'], areaId: 'soggiorno',
  },
  {
    id: 'dev_multimedia_audio', name: 'Lettore multizona', manufacturer: 'Dimostrazione ACA', model: 'Lettore simulato a due canali',
    platform: 'dlna_dmr', entityIds: ['media_player.multimedia_audio_a', 'media_player.multimedia_audio_b', 'sensor.multimedia_audio_segnale'],
    areaId: 'soggiorno', entityCategories: { 'sensor.multimedia_audio_segnale': 'diagnostic' },
  },
  {
    id: 'dev_multimedia_sonos', name: 'Sonos multicanale', manufacturer: 'Dimostrazione ACA', model: 'Due uscite simulate',
    platform: 'sonos', entityIds: ['media_player.multimedia_sonos_a', 'media_player.multimedia_sonos_b'], areaId: 'soggiorno',
  },
  {
    id: 'dev_aspirapolvere_studio', name: 'Aspirapolvere studio', manufacturer: 'Dimostrazione ACA', model: 'Robot singolo simulato',
    platform: 'mqtt', entityIds: ['vacuum.aspirapolvere_studio'], areaId: 'soggiorno',
  },
  {
    id: 'dev_robot_pulizia', name: 'Robot pulizia', manufacturer: 'Dimostrazione ACA', model: 'Due canali pulizia simulati',
    platform: 'mqtt', entityIds: ['vacuum.robot_piano_terra', 'vacuum.robot_piano_primo', 'sensor.robot_pulizia_tempo', 'sensor.robot_pulizia_segnale', 'button.robot_pulizia_manutenzione', 'image.robot_pulizia_mappa'],
    areaId: 'soggiorno', entityCategories: { 'sensor.robot_pulizia_segnale': 'diagnostic', 'button.robot_pulizia_manutenzione': 'config' },
  },
  {
    id: 'dev_tagliaerba_esterno', name: 'Tagliaerba esterno', manufacturer: 'Dimostrazione ACA', model: 'Robot giardino singolo simulato',
    platform: 'mqtt', entityIds: ['lawn_mower.tagliaerba_esterno'], areaId: 'giardino',
  },
  {
    id: 'dev_robot_giardino', name: 'Robot giardino', manufacturer: 'Dimostrazione ACA', model: 'Due canali giardino simulati',
    platform: 'mqtt', entityIds: ['lawn_mower.robot_prato', 'lawn_mower.robot_bordo', 'sensor.robot_giardino_tempo', 'select.robot_giardino_zona', 'number.robot_giardino_altezza', 'sensor.robot_giardino_segnale', 'button.robot_giardino_lame'],
    areaId: 'giardino', entityCategories: { 'sensor.robot_giardino_segnale': 'diagnostic', 'button.robot_giardino_lame': 'config' },
  },
  {
    id: 'dev_videocamera_studio', name: 'Videocamera studio', manufacturer: 'Dimostrazione ACA', model: 'Videocamera singola simulata',
    platform: 'onvif', entityIds: ['camera.videocamera_studio'], areaId: 'soggiorno',
  },
  {
    id: 'dev_viste_esterno', name: 'Viste esterno', manufacturer: 'Dimostrazione ACA', model: 'Due viste simulate',
    platform: 'onvif', entityIds: ['camera.vista_ingresso', 'camera.vista_giardino', 'light.viste_faro', 'sensor.viste_segnale', 'switch.viste_led'],
    areaId: 'giardino', entityCategories: { 'sensor.viste_segnale': 'diagnostic', 'switch.viste_led': 'config' },
  },
  {
    id: 'dev_allarme_studio', name: 'Allarme studio', manufacturer: 'Dimostrazione ACA', model: 'Allarme semplice simulato',
    platform: 'mqtt', entityIds: ['alarm_control_panel.allarme_studio'], areaId: 'soggiorno',
  },
  {
    id: 'dev_zone_casa', name: 'Zone di casa', manufacturer: 'Dimostrazione ACA', model: 'Due zone simulate',
    platform: 'mqtt', entityIds: ['alarm_control_panel.piano_terra', 'alarm_control_panel.garage', 'binary_sensor.zone_ingresso', 'sensor.zone_batteria'],
    areaId: 'soggiorno', entityCategories: { 'sensor.zone_batteria': 'diagnostic' },
  },
  {
    id: 'dev_serratura_studio', name: 'Serratura studio', manufacturer: 'Dimostrazione ACA', model: 'Serratura semplice simulata',
    platform: 'mqtt', entityIds: ['lock.serratura_studio'], areaId: 'soggiorno',
  },
  {
    id: 'dev_accessi_studio', name: 'Accessi studio', manufacturer: 'Dimostrazione ACA', model: 'Due accessi simulati',
    platform: 'mqtt', entityIds: ['lock.accesso_esterno', 'lock.accesso_interno', 'binary_sensor.accesso_porta', 'sensor.accesso_batteria'],
    areaId: 'soggiorno', entityCategories: { 'sensor.accesso_batteria': 'diagnostic' },
  },
  {
    id: 'dev_ventilatore_cucina', name: 'Ventilatore cucina', manufacturer: 'Dimostrazione ACA', model: 'Ventilatore semplice simulato',
    platform: 'mqtt', areaId: 'cucina', entityIds: ['fan.ventilatore_cucina'],
  },
  {
    id: 'dev_ventilazione_studio', name: 'Ventilazione studio', manufacturer: 'Dimostrazione ACA', model: 'Due ventole simulate',
    platform: 'mqtt', areaId: 'soggiorno', entityIds: ['fan.ventilazione_studio', 'fan.ventilazione_studio_secondaria',
      'sensor.ventilazione_potenza', 'sensor.ventilazione_segnale', 'switch.ventilazione_led'],
    entityCategories: { 'sensor.ventilazione_segnale': 'diagnostic', 'switch.ventilazione_led': 'config' },
  },
  {
    id: 'dev_tapparella_camera', name: 'Tapparella camera', manufacturer: 'Dimostrazione ACA', model: 'Tapparella essenziale simulata',
    platform: 'mqtt', areaId: 'camera_da_letto', entityIds: ['cover.tapparella_camera'],
  },
  {
    id: 'dev_veneziane_studio', name: 'Veneziane studio', manufacturer: 'Dimostrazione ACA', model: 'Due aperture simulate',
    platform: 'mqtt', areaId: 'soggiorno', entityIds: ['cover.veneziana_studio', 'cover.veneziana_studio_secondaria',
      'sensor.veneziana_potenza', 'sensor.veneziana_segnale', 'button.veneziana_calibrazione'],
    entityCategories: { 'sensor.veneziana_segnale': 'diagnostic', 'button.veneziana_calibrazione': 'config' },
  },
  {
    id: 'dev_termostato_camera', name: 'Termostato camera', manufacturer: 'Dimostrazione ACA', model: 'Termostato semplice simulato',
    platform: 'mqtt', areaId: 'camera_da_letto', entityIds: ['climate.termostato_camera'],
  },
  {
    id: 'dev_climatizzatore_studio', name: 'Climatizzatore studio', manufacturer: 'Dimostrazione ACA', model: 'Due canali simulati',
    platform: 'mqtt', areaId: 'soggiorno', entityIds: ['climate.climatizzatore_studio', 'climate.climatizzatore_studio_secondario',
      'sensor.climatizzatore_potenza', 'sensor.climatizzatore_energia', 'sensor.climatizzatore_segnale', 'select.climatizzatore_avvio'],
    entityCategories: { 'sensor.climatizzatore_segnale': 'diagnostic', 'select.climatizzatore_avvio': 'config' },
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
      'device_tracker.auto_posizione',
      'sensor.auto_autonomia',
      'switch.auto_ricarica',
      'number.auto_limite_carica',
      'button.auto_aggiorna',
      'sensor.auto_chilometraggio', 'sensor.auto_potenza_ricarica', 'sensor.auto_tempo_ricarica',
      'sensor.auto_temperatura', 'binary_sensor.auto_collegata', 'binary_sensor.auto_in_carica',
      'climate.auto_abitacolo', 'lock.auto_porte',
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
    ...(spec.viaDeviceId ? { via_device_id: spec.viaDeviceId } : {}),
    ...(spec.swVersion ? { sw_version: spec.swVersion } : {}),
    ...(spec.hwVersion ? { hw_version: spec.hwVersion } : {}),
  };
}

/**
 * A Zigbee device that joins the coordinator while joining is open (`zha.permit`): the door
 * sensor of the demo, numbered from the second one on.
 */
export function zigbeeJoinedDevice(
  nth: number,
  at: string = new Date().toISOString()
): { spec: MockDeviceSpec; entities: HassEntity[] } {
  const suffix = nth > 1 ? `_${nth}` : '';
  const name = nth > 1 ? `Sensore finestra ${nth}` : 'Sensore finestra';
  const opening = `binary_sensor.sensore_finestra${suffix}`;
  const battery = `sensor.sensore_finestra${suffix}_batteria`;
  return {
    spec: {
      id: `dev_sensore_finestra${suffix}`,
      name,
      manufacturer: 'Aqara',
      model: 'Door and window sensor (MCCGQ11LM)',
      platform: 'zha',
      entityIds: [opening, battery],
      serial: `00:15:8d:00:09:12:4c:${String(nth).padStart(2, '0')}`,
      viaDeviceId: ZIGBEE_COORDINATOR_ID,
    },
    entities: [
      makeEntity(opening, 'off', { friendly_name: name, device_class: 'window' }, at),
      makeEntity(
        battery,
        '100',
        {
          friendly_name: `Batteria ${name.toLowerCase()}`,
          unit_of_measurement: '%',
          device_class: 'battery',
        },
        at
      ),
    ],
  };
}

export function entityRegistryEntry(
  entity: HassEntity,
  spec?: Pick<MockDeviceSpec, 'id' | 'platform' | 'areaId' | 'entityCategories'>
): HaEntityRegistryEntry {
  const deviceClass = entity.attributes.device_class;
  return {
    entity_id: entity.entity_id,
    device_id: spec?.id ?? null,
    platform: spec?.platform ?? 'template',
    area_id: spec?.areaId ?? null,
    disabled_by: null,
    hidden_by: null,
    entity_category: spec?.entityCategories?.[entity.entity_id] ?? null,
    ...(['vacuum.aspirapolvere', 'vacuum.robot_piano_terra'].includes(entity.entity_id)
      ? { options: { vacuum: { area_mapping: { soggiorno: ['segment_16'], cucina: ['segment_17', 'segment_18'] } } } }
      : entity.entity_id === 'vacuum.robot_piano_primo'
        ? { options: { vacuum: { area_mapping: { camera_da_letto: ['segment_21'] } } } } : {}),
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
  'dev_auto',
  'dev_sensore_soggiorno', 'dev_sensor_environment', 'dev_sensor_contact',
  'dev_appletv',
  'dev_tagliaerba',
  'dev_allarme',
  'dev_serratura',
  'dev_luce_soggiorno',
  'dev_altoparlante',
  'dev_sonos',
  'dev_tv_soggiorno',
  'dev_aspirapolvere',
  'dev_videocamera',
  'dev_termostato',
  'dev_tapparella',
  'dev_ventilatore',
  'dev_lampada_comodino',
  'dev_tv_cucina',
  'dev_presa_lampada_lettura',
  'dev_movimento_corridoio',
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
    for (const id of ['weather.home', 'weather.giardino', 'calendar.famiglia', 'todo.lista_spesa', 'sensor.pulsante_ingresso_batteria', 'sensor.movimento_corridoio_batteria'])
      set(id, entity => ({ ...entity, state: 'unavailable' }));
    for (const id of ['sensor.potenza_casa', 'sensor.consumo_oggi', 'sensor.costo_oggi', 'sensor.costo_mese', 'sensor.prezzo_energia', 'sensor.prezzo_senza_fasce'])
      set(id, entity => ({ ...entity, state: 'unavailable' }));
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
    for (const id of ['calendar.famiglia', 'todo.lista_spesa'])
      set(id, entity => ({ ...entity, attributes: { ...entity.attributes, friendly_name: `${String(entity.attributes.friendly_name)} della famiglia con appuntamenti e attività condivisi della casa di montagna` } }));
    set('weather.home', entity => ({ ...entity, attributes: { ...entity.attributes, friendly_name: 'Meteo della casa di montagna e del giardino sul versante nord' } }));
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
  const dateOnly = (offset: number) => {
    const date = day(offset, 0);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  return [
    event('Cena dai nonni', day(0, 20), 3, { location: 'Via Roma 12' }),
    event('Dentista: controllo semestrale e visita di famiglia presso lo studio del centro', day(1, 9, 30), 1, { description: 'Controllo semestrale' }),
    event('Riunione di condominio', day(2, 18), 2),
    event('Partita di calcetto', day(4, 21), 1.5),
    { summary: 'Compleanno di Anna', start: dateOnly(6), end: dateOnly(7), uid: 'mockup-compleanno-annuale' },
  ];
}

/**
 * The Apple TV browses like the integration does: the root lists the apps first (folder «apps»,
 * children of type `app`), then the media source with some films.
 */
const TV_APPS = ['Apple TV+', 'Netflix', 'YouTube'];
const TV_VIDEOS = ['Documentario sul mare', 'Concerto dal vivo', 'Cartoni del sabato'];
const TV_VIDEO_FOLDER = 'media-source://mockup/video';

const tvNode = (title: string, id: string, type: string, extra: Record<string, unknown> = {}) => ({
  title,
  media_content_id: id,
  media_content_type: type,
  can_play: false,
  can_expand: false,
  ...extra,
});

function browseTv(contentId: string): Record<string, unknown> {
  if (contentId === 'apps') {
    return tvNode('App', 'apps', 'apps', {
      can_expand: true,
      children: TV_APPS.map((name) =>
        tvNode(name, `mockup:app:${name}`, 'app', { can_play: true })
      ),
    });
  }
  if (contentId === TV_VIDEO_FOLDER) {
    return tvNode('Video', TV_VIDEO_FOLDER, 'directory', {
      can_expand: true,
      children: TV_VIDEOS.map((title, index) =>
        tvNode(title, `mockup:video:${index}`, 'video', {
          can_play: true,
          thumbnail: artworkUrl(title),
        })
      ),
    });
  }
  return tvNode('Apple TV', '', 'library', {
    can_expand: true,
    children: [
      tvNode('App', 'apps', 'apps', { can_expand: true }),
      tvNode('Video', TV_VIDEO_FOLDER, 'directory', { can_expand: true }),
    ],
  });
}

/** The title of a content the demo can play (`play_media` shows it as the playing title). */
export function mockMediaTitle(contentId: unknown): string | undefined {
  const id = String(contentId ?? '');
  const app = /^mockup:app:(.+)$/.exec(id);
  if (app) return app[1];
  const video = /^mockup:video:(\d+)$/.exec(id);
  if (video) return TV_VIDEOS[Number(video[1])];
  const track = /^mockup:track:(\d+)$/.exec(id);
  return track ? MOCK_TRACKS[Number(track[1])]?.title : undefined;
}

/** Content of `media_player/browse_media`. */
export function browseMedia(entityId = '', contentId = ''): Record<string, unknown> {
  if (entityId === 'media_player.apple_tv_camera') return browseTv(contentId);
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
