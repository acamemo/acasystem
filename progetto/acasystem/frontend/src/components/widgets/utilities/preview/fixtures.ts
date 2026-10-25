/**
 * Fictitious home for the development preview of the utility widgets (no Home Assistant):
 * entities, card settings and the answers of a fake connection.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

const hour = 3_600_000;

function nordpoolDay(): Array<{ start: string; end: string; value: number }> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return Array.from({ length: 24 }, (_, index) => {
    const start = new Date(midnight.getTime() + index * hour);
    const base = 0.11 + 0.05 * Math.sin(((index - 6) / 24) * Math.PI * 2);
    const peak = index >= 17 && index <= 20 ? 0.09 : 0;
    return {
      start: start.toISOString(),
      end: new Date(start.getTime() + hour).toISOString(),
      value: Number((base + peak).toFixed(3)),
    };
  });
}

export function previewEntities(): EntityMap {
  const list: HassEntity[] = [
    fixtureEntity('sensor.costo_oggi', '3.84', {
      friendly_name: 'Costo di oggi',
      unit_of_measurement: 'EUR',
    }),
    fixtureEntity('sensor.costo_mese', '86.2', {
      friendly_name: 'Costo del mese',
      unit_of_measurement: 'EUR',
    }),
    fixtureEntity('sensor.nordpool_it', '0.14', {
      friendly_name: 'Prezzo zona Nord',
      currency: 'EUR',
      unit_of_measurement: 'EUR/kWh',
      raw_today: nordpoolDay(),
      tomorrow_valid: false,
    }),
    fixtureEntity('sensor.auto_batteria', '68', {
      device_class: 'battery',
      friendly_name: 'Batteria auto',
      unit_of_measurement: '%',
    }),
    fixtureEntity('sensor.auto_autonomia', '243', { unit_of_measurement: 'km' }),
    fixtureEntity('device_tracker.auto', 'home', { latitude: 45.0703, longitude: 7.6869 }),
    fixtureEntity('binary_sensor.auto_in_carica', 'on'),
    fixtureEntity('binary_sensor.auto_collegata', 'on'),
    fixtureEntity('climate.auto', 'off', {
      temperature: 21,
      current_temperature: 13.5,
      temperature_unit: '°C',
    }),
    fixtureEntity('number.auto_limite', '80', {
      friendly_name: 'Limite di carica',
      min: 50,
      max: 100,
      step: 5,
    }),
    fixtureEntity('lock.auto', 'locked', { friendly_name: 'Portiere' }),
    fixtureEntity('button.auto_aggiorna', 'unknown'),
    fixtureEntity('vacuum.roborock', 'docked', {
      friendly_name: 'Roborock',
      battery_level: 92,
      current_room: 'Soggiorno',
      fan_speed: 'Standard',
      fan_speed_list: ['Silenzioso', 'Standard', 'Forte', 'Turbo'],
      supported_features: 16383,
    }),
    fixtureEntity('sensor.roborock_filter_left', '96', {
      friendly_name: 'Roborock filtro',
      unit_of_measurement: 'h',
    }),
    fixtureEntity('sensor.roborock_main_brush_left', '41', {
      friendly_name: 'Roborock spazzola principale',
      unit_of_measurement: 'h',
    }),
    fixtureEntity('button.roborock_reset_filter', 'unknown'),
    fixtureEntity('binary_sensor.roborock_dustbin', 'on', { friendly_name: 'Roborock dustbin' }),
    fixtureEntity('lawn_mower.giardino', 'mowing', {
      friendly_name: 'Tosaerba',
      battery_level: 47,
      current_zone: 'Prato davanti',
    }),
    fixtureEntity('light.soggiorno', 'on', {
      friendly_name: 'Lampadario',
      brightness: 180,
      supported_color_modes: ['brightness'],
    }),
    fixtureEntity('light.lettura', 'off', {
      friendly_name: 'Lampada da lettura',
      supported_color_modes: ['brightness'],
    }),
    fixtureEntity('sensor.soggiorno_temperatura', '21.6', {
      device_class: 'temperature',
      unit_of_measurement: '°C',
      friendly_name: 'Temperatura soggiorno',
    }),
    fixtureEntity('sensor.soggiorno_umidita', '48', {
      device_class: 'humidity',
      unit_of_measurement: '%',
      friendly_name: 'Umidità soggiorno',
    }),
    fixtureEntity('binary_sensor.soggiorno_presenza', 'on', { device_class: 'occupancy' }),
    fixtureEntity('media_player.soggiorno', 'playing', {
      friendly_name: 'Televisore',
      media_title: 'Telegiornale',
    }),
    fixtureEntity('cover.soggiorno', 'open', { friendly_name: 'Tapparella' }),
    fixtureEntity('climate.soggiorno', 'heat', {
      friendly_name: 'Termostato',
      temperature: 21,
      current_temperature: 20.4,
      hvac_modes: ['off', 'heat', 'auto'],
      min_temp: 7,
      max_temp: 30,
    }),
    fixtureEntity('sensor.porta_batteria', '14', {
      device_class: 'battery',
      friendly_name: 'Sensore porta',
      area_id: 'ingresso',
    }),
    fixtureEntity('sensor.telecomando_batteria', 'unavailable', {
      device_class: 'battery',
      friendly_name: 'Telecomando',
    }),
    fixtureEntity('sensor.termostato_batteria', '77', {
      device_class: 'battery',
      friendly_name: 'Termostato',
      area_id: 'soggiorno',
    }),
  ];
  return fixtureEntities(list);
}

export const previewSettings: CardSettingsMap = {
  'home::cost_card_1': {
    todayId: 'sensor.costo_oggi',
    monthId: 'sensor.costo_mese',
    currency: 'EUR',
    decimals: 2,
  },
  'home::cost_card_2': {},
  'home::nordpool_card_1': { nordpoolId: 'sensor.nordpool_it', decimals: 3, graphStyle: 'bar' },
  'home::car_card_1': {
    batteryId: 'sensor.auto_batteria',
    rangeId: 'sensor.auto_autonomia',
    locationId: 'device_tracker.auto',
    chargingId: 'binary_sensor.auto_in_carica',
    pluggedId: 'binary_sensor.auto_collegata',
    climateId: 'climate.auto',
    chargeLimitNumberId: 'number.auto_limite',
    lockId: 'lock.auto',
    updateButtonId: 'button.auto_aggiorna',
  },
  'home::room_card_1': {
    areaName: 'Soggiorno',
    areaId: 'soggiorno',
    entityIds: [
      'light.soggiorno',
      'light.lettura',
      'sensor.soggiorno_temperatura',
      'sensor.soggiorno_umidita',
      'binary_sensor.soggiorno_presenza',
      'media_player.soggiorno',
      'cover.soggiorno',
      'climate.soggiorno',
      'vacuum.roborock',
    ],
  },
  'home::spacer_card_1': { variant: 'divider', heading: 'Esterno', headingAlign: 'left' },
  'home::spacer_card_2': {},
};

const areas = [
  { area_id: 'soggiorno', name: 'Soggiorno' },
  { area_id: 'cucina', name: 'Cucina' },
  { area_id: 'ingresso', name: 'Ingresso' },
];

/** Answers of the fake connection, by message type. */
export function previewAnswer(message: Record<string, unknown>, entities: EntityMap): unknown {
  switch (message.type) {
    case 'config/area_registry/list':
      return areas;
    case 'config/device_registry/list':
      return [];
    case 'config/entity_registry/list':
      return [
        {
          entity_id: 'vacuum.roborock',
          device_id: 'robot',
          options: { vacuum: { area_mapping: { soggiorno: [16], cucina: [17] } } },
        },
        { entity_id: 'sensor.roborock_filter_left', device_id: 'robot' },
        { entity_id: 'sensor.roborock_main_brush_left', device_id: 'robot' },
        { entity_id: 'button.roborock_reset_filter', device_id: 'robot' },
        { entity_id: 'binary_sensor.roborock_dustbin', device_id: 'robot' },
        ...[
          'light.soggiorno',
          'light.lettura',
          'sensor.soggiorno_temperatura',
          'media_player.soggiorno',
          'cover.soggiorno',
          'climate.soggiorno',
        ].map((entity_id) => ({ entity_id, area_id: 'soggiorno' })),
        { entity_id: 'sensor.porta_batteria', area_id: 'ingresso' },
      ];
    case 'history/history_during_period': {
      const id = Array.isArray(message.entity_ids) ? String(message.entity_ids[0]) : '';
      const now = Date.now();
      const last = Number.parseFloat(entities[id]?.state ?? '0');
      const points = Array.from({ length: 24 }, (_, index) => ({
        s: ((last * (index + 1)) / 24).toFixed(2),
        lu: (now - (23 - index) * hour) / 1000,
      }));
      return { [id]: points };
    }
    case 'recorder/statistics_during_period':
      return {};
    default:
      throw new Error(`Messaggio non simulato: ${String(message.type)}`);
  }
}

/** State an entity reaches after a service call, to show requested → confirmed. */
export function simulatedState(
  domain: string,
  service: string,
  entity: HassEntity | undefined
): Partial<HassEntity> | null {
  if (!entity) return null;
  const on = ['turn_on', 'unlock', 'open_cover'].includes(service);
  switch (`${domain}.${service}`) {
    case 'vacuum.start':
      return { state: 'cleaning' };
    case 'vacuum.pause':
    case 'vacuum.stop':
      return { state: 'paused' };
    case 'vacuum.return_to_base':
    case 'lawn_mower.dock':
      return { state: 'returning' };
    case 'lawn_mower.start_mowing':
      return { state: 'mowing' };
    case 'lawn_mower.pause':
      return { state: 'paused' };
    case 'lock.lock':
      return { state: 'locked' };
    case 'lock.unlock':
      return { state: 'unlocked' };
    case 'cover.open_cover':
      return { state: 'open' };
    case 'cover.close_cover':
      return { state: 'closed' };
    case 'climate.turn_on':
      return { state: 'heat' };
    case 'climate.turn_off':
      return { state: 'off' };
    default:
      if (
        ['light', 'switch', 'fan', 'input_boolean', 'automation'].includes(domain) &&
        (service === 'turn_on' || service === 'turn_off')
      ) {
        return { state: on ? 'on' : 'off' };
      }
      return null;
  }
}
