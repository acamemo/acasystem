/**
 * Data of the development preview: a legacy Tunet configuration (migrated by the launcher on
 * first load) and a few fixture entities. Ids of real cards (light.cucina, climate_card_1)
 * show the real widgets when their group exists, or the «Widget non disponibile» fallback.
 */
import type {
  CardSettingsMap,
  PagesConfig,
  PageSettingsMap,
  StatusPillConfig,
} from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

export const previewPagesConfig: PagesConfig = {
  header: ['person.mario', 'person.giulia'],
  pages: ['home', 'luci', 'clima', 'media_salotto'],
  home: [
    'preview_note_benvenuto',
    'preview_value_temperatura',
    'preview_toggle_soggiorno',
    'preview_toggle_cucina',
    'light.cucina',
    'preview_value_energia',
  ],
  luci: [
    'preview_toggle_studio',
    'preview_toggle_camera',
    'preview_toggle_bagno',
    'preview_toggle_ingresso',
    'preview_toggle_giardino',
  ],
  clima: ['climate_card_1', 'preview_value_umidita', 'preview_value_temperatura'],
  media_salotto: [],
};

export const previewPageSettings: PageSettingsMap = {
  home: { label: 'Casa', icon: 'Home' },
  luci: { label: 'LUCI', icon: 'Lightbulb' },
  clima: { label: 'Clima' },
  media_salotto: { label: 'Multimedia', type: 'media', mediaIds: ['media_player.salotto'] },
};

/** Legacy sizes: they show the migration (colSpan 2 → 4 cells, small → 1 row). */
export const previewCardSettings: CardSettingsMap = {
  'home::preview_note_benvenuto': { colSpan: 2 },
  'home::preview_value_temperatura': { entityId: 'sensor.temperatura' },
  'home::preview_toggle_soggiorno': { entityId: 'light.soggiorno', size: 'small' },
  'home::preview_toggle_cucina': { entityId: 'light.cucina', size: 'small' },
  'home::preview_value_energia': { entityId: 'sensor.energia' },
  'luci::preview_toggle_studio': { entityId: 'light.studio', size: 'small' },
  'luci::preview_toggle_camera': { entityId: 'light.camera', size: 'small' },
  'luci::preview_toggle_bagno': { entityId: 'light.bagno', size: 'small' },
  'luci::preview_toggle_ingresso': { entityId: 'light.ingresso', size: 'small' },
  'luci::preview_toggle_giardino': { entityId: 'light.giardino' },
  'clima::climate_card_1': { climateId: 'climate.soggiorno' },
  'clima::preview_value_umidita': { entityId: 'sensor.umidita' },
  'clima::preview_value_temperatura': { entityId: 'sensor.temperatura' },
  'header::person.giulia': { showState: true },
};

export const previewPills: StatusPillConfig[] = [
  {
    id: 'pill-media',
    type: 'media_player',
    visible: true,
    clickable: true,
    showCount: true,
    conditionEnabled: true,
  },
];

export function previewEntities(): EntityMap {
  return fixtureEntities([
    fixtureEntity('person.mario', 'home', { friendly_name: 'Mario' }),
    fixtureEntity('person.giulia', 'lavoro', { friendly_name: 'Giulia' }),
    fixtureEntity('light.soggiorno', 'on', { friendly_name: 'Soggiorno', brightness: 180 }),
    fixtureEntity('light.cucina', 'off', { friendly_name: 'Cucina' }),
    fixtureEntity('light.studio', 'on', { friendly_name: 'Studio' }),
    fixtureEntity('light.camera', 'off', { friendly_name: 'Camera' }),
    fixtureEntity('light.bagno', 'off', { friendly_name: 'Bagno' }),
    fixtureEntity('light.ingresso', 'on', { friendly_name: 'Ingresso' }),
    fixtureEntity('light.giardino', 'off', { friendly_name: 'Giardino' }),
    fixtureEntity('sensor.temperatura', '21.5', {
      friendly_name: 'Temperatura soggiorno',
      unit_of_measurement: '°C',
      device_class: 'temperature',
    }),
    fixtureEntity('sensor.umidita', '48', {
      friendly_name: 'Umidità',
      unit_of_measurement: '%',
      device_class: 'humidity',
    }),
    fixtureEntity('sensor.energia', '1.2', {
      friendly_name: 'Consumo casa',
      unit_of_measurement: 'kW',
      device_class: 'power',
    }),
    fixtureEntity('climate.soggiorno', 'heat', {
      friendly_name: 'Clima soggiorno',
      current_temperature: 20.5,
      temperature: 21,
      hvac_modes: ['off', 'heat'],
    }),
    fixtureEntity('media_player.salotto', 'playing', {
      friendly_name: 'Salotto',
      media_title: 'Concerto per archi',
      media_artist: 'Orchestra da camera',
    }),
  ]);
}
