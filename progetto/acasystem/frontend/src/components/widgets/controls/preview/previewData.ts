/**
 * Fictitious house of the development preview (preview-controls.html): entities, cards and a
 * simulated Home Assistant that confirms commands after a short delay. Not in the build.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { CellSize } from '@/@types/launcher';
import { fixtureEntity } from '@/utils/fixtures/runtime';

export interface PreviewCard {
  id: string;
  size: CellSize;
  settings?: CardSettings;
  note?: string;
}

export const previewEntities: HassEntity[] = [
  fixtureEntity('light.cucina', 'on', {
    friendly_name: 'Cucina',
    supported_color_modes: ['color_temp', 'hs'],
    brightness: 166,
    color_temp_kelvin: 3200,
    min_color_temp_kelvin: 2200,
    max_color_temp_kelvin: 6500,
    hs_color: [32, 80],
  }),
  fixtureEntity('light.soggiorno', 'off', {
    friendly_name: 'Lampada del soggiorno',
    supported_color_modes: ['brightness'],
    area_name: 'Soggiorno',
  }),
  fixtureEntity('light.ingresso', 'on', {
    friendly_name: 'Ingresso',
    supported_color_modes: ['onoff'],
    area_name: 'Ingresso',
  }),
  fixtureEntity('light.giardino', 'unavailable', { friendly_name: 'Giardino' }),
  fixtureEntity('light.zona_giorno', 'on', {
    friendly_name: 'Zona giorno',
    entity_id: ['light.cucina', 'light.soggiorno'],
    supported_color_modes: ['brightness'],
    brightness: 120,
  }),
  fixtureEntity('sensor.temperatura', '21.4', {
    friendly_name: 'Temperatura del soggiorno',
    unit_of_measurement: '°C',
    device_class: 'temperature',
    state_class: 'measurement',
  }),
  fixtureEntity('sensor.umidita', '48', {
    friendly_name: 'Umidità',
    unit_of_measurement: '%',
    device_class: 'humidity',
  }),
  fixtureEntity('sensor.consumo', '1840', {
    friendly_name: 'Consumo della casa',
    unit_of_measurement: 'W',
    device_class: 'power',
  }),
  fixtureEntity('binary_sensor.porta', 'on', {
    friendly_name: 'Porta d’ingresso',
    device_class: 'door',
  }),
  // States in words, as on the real 2×2 of the office demo (L-19): short and long.
  fixtureEntity('sensor.backup_manager', 'idle', { friendly_name: 'Backup Backup Manager state' }),
  fixtureEntity('sensor.lavatrice', 'Risciacquo e centrifuga finale in corso', {
    friendly_name: 'Programma della lavatrice',
  }),
  fixtureEntity('switch.presa', 'on', { friendly_name: 'Presa della lavatrice' }),
  fixtureEntity('script.buonanotte', 'off', { friendly_name: 'Buonanotte' }),
  fixtureEntity('input_number.volume', '6', {
    friendly_name: 'Volume dell’allarme',
    min: 0,
    max: 10,
    step: 1,
  }),
  fixtureEntity('select.caldaia', 'Eco', {
    friendly_name: 'Modalità caldaia',
    options: ['Eco', 'Comfort', 'Spento'],
  }),
  fixtureEntity('automation.luci_notte', 'on', {
    friendly_name: 'Luci della notte',
    last_triggered: '2026-10-06T06:30:00Z',
  }),
  fixtureEntity('automation.irrigazione', 'off', { friendly_name: 'Irrigazione' }),
  fixtureEntity('fan.soffitto', 'on', {
    friendly_name: 'Ventilatore a soffitto',
    supported_features: 63,
    percentage: 40,
    percentage_step: 10,
    oscillating: false,
    direction: 'forward',
    preset_mode: 'normale',
    preset_modes: ['normale', 'notte', 'turbo'],
  }),
  fixtureEntity('fan.bagno', 'off', {
    friendly_name: 'Aspiratore del bagno',
    supported_features: 48,
  }),
  fixtureEntity('fan.guasto', 'on', {
    friendly_name: 'Ventilatore dello studio',
    supported_features: 49,
    percentage: 30,
  }),
  fixtureEntity('cover.salotto', 'open', {
    friendly_name: 'Tapparella del salotto',
    supported_features: 1 | 2 | 4 | 8 | 128,
    current_position: 65,
    current_tilt_position: 40,
    device_class: 'shutter',
  }),
  fixtureEntity('cover.camera', 'closing', {
    friendly_name: 'Tenda della camera',
    supported_features: 15,
    current_position: 20,
    device_class: 'curtain',
  }),
  fixtureEntity('lock.ingresso', 'locked', {
    friendly_name: 'Porta di casa',
    supported_features: 1,
  }),
  fixtureEntity('lock.garage', 'jammed', { friendly_name: 'Garage' }),
];

export const previewSections: Array<{ title: string; cards: PreviewCard[] }> = [
  {
    title: 'Luci: gesto sull’icona, +/− e cursore',
    cards: [
      { id: 'light.cucina', size: { w: 1, h: 1 } },
      { id: 'light.cucina', size: { w: 2, h: 1 } },
      { id: 'light.soggiorno', size: { w: 1, h: 2 } },
      { id: 'light.zona_giorno', size: { w: 2, h: 2 } },
      { id: 'light.ingresso', size: { w: 1, h: 1 } },
      { id: 'light.giardino', size: { w: 1, h: 1 } },
    ],
  },
  {
    title: 'Sensori ed entità',
    cards: [
      { id: 'entity_card_1', size: { w: 1, h: 1 }, settings: { entityId: 'sensor.temperatura' } },
      { id: 'entity_card_2', size: { w: 2, h: 1 }, settings: { entityId: 'sensor.consumo' } },
      { id: 'entity_card_3', size: { w: 2, h: 1 }, settings: { entityId: 'binary_sensor.porta' } },
      { id: 'entity_card_4', size: { w: 2, h: 1 }, settings: { entityId: 'switch.presa' } },
      { id: 'entity_card_5', size: { w: 1, h: 1 }, settings: { entityId: 'switch.presa' } },
      { id: 'entity_card_6', size: { w: 2, h: 1 }, settings: { entityId: 'script.buonanotte' } },
      { id: 'entity_card_7', size: { w: 2, h: 1 }, settings: { entityId: 'input_number.volume' } },
      { id: 'entity_card_8', size: { w: 2, h: 1 }, settings: { entityId: 'select.caldaia' } },
      {
        id: 'entity_card_9',
        size: { w: 2, h: 2 },
        settings: {
          entityId: 'sensor.umidita',
          sensorVariant: 'gauge',
          sensorMin: 0,
          sensorMax: 100,
        },
      },
      { id: 'entity_card_10', size: { w: 1, h: 2 }, settings: { entityId: 'sensor.temperatura' } },
    ],
  },
  {
    title: 'Due poli del 2×2: nome in alto, lettura in basso',
    cards: [
      {
        id: 'entity_card_11',
        size: { w: 2, h: 2 },
        settings: { entityId: 'sensor.backup_manager' },
      },
      { id: 'entity_card_12', size: { w: 2, h: 2 }, settings: { entityId: 'sensor.lavatrice' } },
      {
        id: 'entity_card_13',
        size: { w: 2, h: 2 },
        settings: { entityId: 'sensor.consumo', showGraph: false },
      },
      { id: 'entity_card_14', size: { w: 2, h: 2 }, settings: { entityId: 'sensor.temperatura' } },
      { id: 'entity_card_15', size: { w: 2, h: 2 }, settings: { entityId: 'switch.presa' } },
      { id: 'light.ingresso', size: { w: 2, h: 2 } },
      { id: 'light.giardino', size: { w: 2, h: 2 } },
      { id: 'fan.bagno', size: { w: 2, h: 2 } },
    ],
  },
  {
    title: 'Automazioni, ventilatori, tapparelle e serrature',
    cards: [
      { id: 'automation.luci_notte', size: { w: 2, h: 1 } },
      { id: 'automation.irrigazione', size: { w: 1, h: 1 } },
      { id: 'fan.soffitto', size: { w: 2, h: 1 } },
      { id: 'fan.soffitto', size: { w: 2, h: 2 } },
      { id: 'fan.bagno', size: { w: 1, h: 1 } },
      { id: 'cover_card_1', size: { w: 2, h: 1 }, settings: { coverId: 'cover.salotto' } },
      { id: 'cover_card_2', size: { w: 2, h: 2 }, settings: { coverId: 'cover.camera' } },
      { id: 'lock.ingresso', size: { w: 2, h: 1 } },
      { id: 'lock_card_1', size: { w: 2, h: 2 }, settings: { lockId: 'lock.ingresso' } },
      { id: 'lock.garage', size: { w: 1, h: 1 } },
    ],
  },
  {
    title: 'Stati: caricamento, mancante, modifica, errore',
    cards: [
      { id: 'light.cucina', size: { w: 2, h: 1 }, note: 'loading' },
      { id: 'entity_card_99', size: { w: 2, h: 1 }, settings: { entityId: 'sensor.sparito' } },
      { id: 'light.cucina', size: { w: 2, h: 1 }, note: 'edit' },
      { id: 'fan.guasto', size: { w: 2, h: 1 }, note: 'Tocca l’icona: il comando fallisce' },
    ],
  },
];

/** History of the fake connection: a day of a slowly changing value. */
export function previewHistory(entityId: string, state: string | undefined) {
  const base = Number.parseFloat(String(state));
  if (Number.isNaN(base)) {
    const now = Date.now() / 1000;
    return {
      [entityId]: [
        { s: 'off', lc: now - 7200 },
        { s: 'on', lc: now - 3000 },
        { s: 'off', lc: now - 1200 },
        { s: state ?? 'on', lc: now - 300 },
      ],
    };
  }
  const now = Date.now() / 1000;
  return {
    [entityId]: Array.from({ length: 48 }, (_, index) => ({
      s: String(
        Math.round((base + Math.sin(index / 6) * base * 0.08 + (index % 5) * 0.05) * 10) / 10
      ),
      lc: now - (48 - index) * 1800,
    })),
  };
}
