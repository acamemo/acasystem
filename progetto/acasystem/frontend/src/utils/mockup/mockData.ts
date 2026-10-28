/**
 * Data of the simulated Home Assistant of the demo mode (`#/mockup`, REP-20261028-005, K1): the
 * entities of the shared fixtures (`utils/fixtures/adaptiveData.ts`, the same source as the e2e
 * bench) with Italian names, a few more entities for the widgets the fixtures leave out (weather,
 * calendar), and the registries that make the entities devices of a house.
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

/** Names shown in the house instead of the technical «fixture» ones. */
const FRIENDLY_NAMES: Record<string, string> = {
  'sensor.fixture': 'Temperatura soggiorno',
  'sensor.humidity': 'Umidità soggiorno',
  'light.fixture': 'Luce soggiorno',
  'fan.fixture': 'Ventilatore camera',
  'climate.fixture': 'Termostato soggiorno',
  'cover.fixture': 'Tapparella soggiorno',
  'lock.fixture': 'Porta d’ingresso',
  'alarm_control_panel.fixture': 'Allarme di casa',
  'media_player.media': 'Altoparlante cucina',
  'media_player.sonos': 'Sonos soggiorno',
  'media_player.androidtv': 'TV soggiorno',
  'media_player.appletv': 'Apple TV camera',
  'remote.fixture': 'Telecomando TV soggiorno',
  'vacuum.fixture': 'Aspirapolvere',
  'lawn_mower.fixture': 'Tagliaerba giardino',
  'camera.fixture': 'Videocamera ingresso',
  'binary_sensor.motion': 'Movimento ingresso',
  'sensor.battery': 'Batteria auto',
  'sensor.range': 'Autonomia auto',
  'switch.charging': 'Ricarica auto',
  'switch.sonos_alarm': 'Sveglia Sonos',
  'number.limit': 'Limite di carica',
  'number.height': 'Altezza taglio',
  'select.area': 'Zona',
  'select.mop': 'Intensità lavaggio',
  'button.maintenance': 'Manutenzione aspirapolvere',
  'button.update_car': 'Aggiorna auto',
  'input_number.fixture': 'Soglia',
  'script.fixture': 'Scenario sera',
  'todo.fixture': 'Lista della spesa',
  'sensor.today': 'Costo di oggi',
  'sensor.month': 'Costo del mese',
  'sensor.consumption': 'Consumo di oggi',
  'sensor.nordpool': 'Prezzo energia',
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

const NOW_OF_ENTITIES = () => new Date().toISOString();

/** Entities of the demo house: a copy of the shared fixtures plus the extra ones below. */
export function createMockEntities(): Record<string, HassEntity> {
  const at = NOW_OF_ENTITIES();
  const entities: Record<string, HassEntity> = {};
  let player = 0;
  for (const [id, source] of Object.entries(adaptiveFixtureEntities)) {
    let entity: HassEntity = {
      ...structuredClone(source),
      last_changed: at,
      last_updated: at,
    };
    const name = FRIENDLY_NAMES[id];
    if (name) entity.attributes = { ...entity.attributes, friendly_name: name };
    if (id.startsWith('media_player.')) {
      entity = withTrack(entity, player);
      player += 1;
    }
    entities[id] = entity;
  }
  // The speaker is a speaker, not a TV, whatever integration it comes from.
  entities['media_player.media']!.attributes = {
    ...entities['media_player.media']!.attributes,
    device_class: 'speaker',
  };
  entities['camera.fixture']!.attributes = {
    ...entities['camera.fixture']!.attributes,
    access_token: 'mockup',
  };
  const extras: HassEntity[] = [
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
      'calendar.famiglia',
      'off',
      { friendly_name: 'Calendario famiglia', message: 'Cena dai nonni', all_day: false },
      at
    ),
    // Devices that exist in the house and no widget shows yet: «Trova dispositivi» offers them.
    makeEntity(
      'light.lampada_comodino',
      'off',
      {
        friendly_name: 'Lampada comodino',
        supported_features: 32,
        supported_color_modes: ['hs', 'color_temp'],
        brightness: 120,
        color_temp_kelvin: 2700,
        min_color_temp_kelvin: 2200,
        max_color_temp_kelvin: 6500,
      },
      at
    ),
    makeEntity(
      'switch.presa_lavatrice',
      'on',
      { friendly_name: 'Presa lavatrice', device_class: 'outlet' },
      at
    ),
    makeEntity(
      'sensor.balcone_temperatura',
      '17.8',
      {
        friendly_name: 'Temperatura balcone',
        unit_of_measurement: '°C',
        device_class: 'temperature',
      },
      at
    ),
    makeEntity(
      'sensor.balcone_umidita',
      '63',
      { friendly_name: 'Umidità balcone', unit_of_measurement: '%', device_class: 'humidity' },
      at
    ),
  ];
  for (const entity of extras) entities[entity.entity_id] = entity;
  return entities;
}

/** Services of the simulated Home Assistant: the shared catalogue plus the ones the demo adds. */
export const MOCK_SERVICES = {
  ...adaptiveFixtureServices,
  weather: { get_forecasts: { fields: {} } },
  calendar: { get_events: { fields: {} } },
};

/** Widget settings of the types the shared fixtures do not cover. */
export const MOCK_EXTRA_SETTINGS: Record<string, CardSettings> = {
  weather: { weatherId: 'weather.home', tempId: 'sensor.temperatura_esterna' },
  calendar: { calendars: ['calendar.famiglia'] },
};

/** Settings that bind a widget of each type to the entities of the demo house. */
export function mockBindingSettings(type: string): CardSettings {
  return {
    ...(adaptiveFixtureSettings[type]?.settings ?? {}),
    ...(MOCK_EXTRA_SETTINGS[type] ?? {}),
  };
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
}

export const MOCK_AREAS = [
  { area_id: 'area.fixture', name: 'Soggiorno' },
  { area_id: 'cucina', name: 'Cucina' },
  { area_id: 'camera_da_letto', name: 'Camera da letto' },
];

/** The devices of the house; every entity not listed belongs to no device (templates, helpers). */
export const MOCK_DEVICES: MockDeviceSpec[] = [
  {
    id: 'dev_luce_soggiorno',
    name: 'Luce soggiorno',
    manufacturer: 'Signify',
    model: 'Hue White and Color',
    platform: 'hue',
    entityIds: ['light.fixture'],
    areaId: 'area.fixture',
  },
  {
    id: 'dev_ventilatore',
    name: 'Ventilatore camera',
    manufacturer: 'Xiaomi',
    model: 'Smart Standing Fan 2',
    platform: 'xiaomi_miio',
    entityIds: ['fan.fixture'],
    areaId: 'camera_da_letto',
  },
  {
    id: 'dev_termostato',
    name: 'Termostato soggiorno',
    manufacturer: 'tado°',
    model: 'Smart Thermostat',
    platform: 'tado',
    entityIds: ['climate.fixture'],
    areaId: 'area.fixture',
  },
  {
    id: 'dev_tapparella',
    name: 'Tapparella soggiorno',
    manufacturer: 'Somfy',
    model: 'Oximo io',
    platform: 'somfy',
    entityIds: ['cover.fixture'],
    areaId: 'area.fixture',
  },
  {
    id: 'dev_serratura',
    name: 'Porta d’ingresso',
    manufacturer: 'Nuki',
    model: 'Smart Lock 4',
    platform: 'nuki',
    entityIds: ['lock.fixture'],
  },
  {
    id: 'dev_allarme',
    name: 'Allarme di casa',
    manufacturer: 'Ajax',
    model: 'Hub 2',
    platform: 'ajax',
    entityIds: ['alarm_control_panel.fixture'],
  },
  {
    id: 'dev_videocamera',
    name: 'Videocamera ingresso',
    manufacturer: 'Reolink',
    model: 'RLC-810A',
    platform: 'reolink',
    entityIds: ['camera.fixture'],
  },
  {
    id: 'dev_altoparlante',
    name: 'Altoparlante cucina',
    manufacturer: 'Google',
    model: 'Nest Audio',
    platform: 'cast',
    entityIds: ['media_player.media'],
    areaId: 'cucina',
  },
  {
    id: 'dev_sonos',
    name: 'Sonos soggiorno',
    manufacturer: 'Sonos',
    model: 'Beam',
    platform: 'sonos',
    entityIds: ['media_player.sonos'],
    areaId: 'area.fixture',
  },
  {
    id: 'dev_tv',
    name: 'TV soggiorno',
    manufacturer: 'Sony',
    model: 'Bravia XR',
    platform: 'androidtv_remote',
    entityIds: ['media_player.androidtv', 'remote.fixture'],
    areaId: 'area.fixture',
  },
  {
    id: 'dev_appletv',
    name: 'Apple TV camera',
    manufacturer: 'Apple',
    model: 'Apple TV 4K',
    platform: 'apple_tv',
    entityIds: ['media_player.appletv'],
    areaId: 'camera_da_letto',
  },
  {
    id: 'dev_aspirapolvere',
    name: 'Aspirapolvere',
    manufacturer: 'Roborock',
    model: 'S8 Pro Ultra',
    platform: 'roborock',
    entityIds: ['vacuum.fixture'],
  },
  {
    id: 'dev_tagliaerba',
    name: 'Tagliaerba giardino',
    manufacturer: 'Husqvarna',
    model: 'Automower 430X',
    platform: 'husqvarna_automower',
    entityIds: ['lawn_mower.fixture'],
  },
  // Not shown by any widget yet.
  {
    id: 'dev_lampada_comodino',
    name: 'Lampada comodino',
    manufacturer: 'Signify',
    model: 'Hue Go',
    platform: 'hue',
    entityIds: ['light.lampada_comodino'],
    areaId: 'camera_da_letto',
  },
  {
    id: 'dev_presa_lavatrice',
    name: 'Presa lavatrice',
    manufacturer: 'Shelly',
    model: 'Plug S',
    platform: 'shelly',
    entityIds: ['switch.presa_lavatrice'],
  },
  {
    id: 'dev_sensore_balcone',
    name: 'Sensore balcone',
    manufacturer: 'Aqara',
    model: 'WSDCGQ11LM',
    platform: 'zha',
    entityIds: ['sensor.balcone_temperatura', 'sensor.balcone_umidita'],
  },
];

/** Entities that belong to the area «Soggiorno» (the room widget of the fixtures reads them). */
const ROOM_ENTITIES = new Set([
  'light.fixture',
  'climate.fixture',
  'sensor.fixture',
  'sensor.humidity',
  'binary_sensor.motion',
]);

export function deviceRegistryEntry(spec: MockDeviceSpec): HaDeviceRegistryEntry {
  return {
    id: spec.id,
    name: spec.name,
    name_by_user: null,
    manufacturer: spec.manufacturer,
    model: spec.model,
    area_id: spec.areaId ?? null,
    disabled_by: null,
    identifiers: [[spec.platform, spec.id]],
    config_entries: [`entry_${spec.id}`],
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
    area_id: ROOM_ENTITIES.has(entity.entity_id) ? 'area.fixture' : (spec?.areaId ?? null),
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
