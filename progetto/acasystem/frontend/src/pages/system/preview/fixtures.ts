/** Fixtures of the development preview of the system sheets and pages (preview-system.html). */
import type { CardSettingsMap, PagesConfig, StatusPillConfig } from '@/@types/dashboard';
import type { ProfileRecord } from '@/@types/api';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

export const previewEntities = fixtureEntities([
  fixtureEntity('light.cucina', 'on', { friendly_name: 'Luce cucina', brightness: 180 }),
  fixtureEntity('light.soggiorno', 'off', { friendly_name: 'Lampada soggiorno' }),
  fixtureEntity('light.studio', 'on', { friendly_name: 'Luce studio' }),
  fixtureEntity('light.camera', 'off', { friendly_name: 'Luce camera da letto' }),
  fixtureEntity('climate.soggiorno', 'heat', {
    friendly_name: 'Termostato soggiorno',
    hvac_modes: ['off', 'heat', 'cool', 'auto'],
    current_temperature: 21.5,
  }),
  fixtureEntity('climate.camera', 'off', {
    friendly_name: 'Clima camera',
    hvac_modes: ['off', 'cool', 'dry', 'fan_only'],
  }),
  fixtureEntity('media_player.salotto', 'playing', { friendly_name: 'Altoparlante salotto' }),
  fixtureEntity('sensor.temperatura_esterna', '14.2', {
    friendly_name: 'Temperatura esterna',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  fixtureEntity('sensor.consumo_oggi', '3.4', { friendly_name: 'Costo energia oggi' }),
  fixtureEntity('sensor.consumo_mese', '61.2', { friendly_name: 'Costo energia del mese' }),
  fixtureEntity('binary_sensor.porta_ingresso', 'off', {
    friendly_name: 'Porta d’ingresso',
    device_class: 'door',
  }),
  fixtureEntity('weather.casa', 'sunny', { friendly_name: 'Meteo di casa' }),
  fixtureEntity('calendar.famiglia', 'off', { friendly_name: 'Calendario di famiglia' }),
  fixtureEntity('person.anna', 'home', { friendly_name: 'Anna' }),
  fixtureEntity('person.marco', 'not_home', { friendly_name: 'Marco' }),
]);

export const previewPagesConfig: PagesConfig = {
  pages: ['home', 'studio'],
  header: ['person.anna'],
  home: ['light.cucina', 'climate_card_1', 'media_group_1'],
  studio: [],
};

export const previewCardSettings: CardSettingsMap = {
  'home::climate_card_1': { climateId: 'climate.soggiorno', tapAction: 'modal' },
  'home::media_group_1': { mediaIds: ['media_player.salotto'], artworkMode: 'cover' },
  'home::light.cucina': {
    visibilityCondition: {
      enabled: true,
      logic: 'AND',
      rules: [{ type: 'state', states: ['on'], forSeconds: 0, entityId: 'light.cucina' }],
    },
  },
};

export const previewPills: StatusPillConfig[] = [
  {
    id: 'pill_porta',
    type: 'conditional',
    entityId: 'binary_sensor.porta_ingresso',
    visible: true,
  },
  {
    id: 'pill_esterno',
    type: 'conditional',
    entityId: 'sensor.temperatura_esterna',
    visible: false,
  },
  { id: 'pill_lettori', type: 'media_player', visible: true },
];

export const previewProfiles: ProfileRecord[] = [
  {
    id: 'p1',
    name: 'Tablet dell’ingresso',
    device_label: 'Ingresso',
    updated_at: '2026-10-01T09:30:00Z',
  },
  { id: 'p2', name: 'Telefono', device_label: null, updated_at: '2026-09-22T18:10:00Z' },
];
