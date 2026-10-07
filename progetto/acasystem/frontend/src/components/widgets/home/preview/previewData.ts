/**
 * Fictitious home for the development preview of the comfort widgets (preview-home.html):
 * entities, forecasts, calendar events and a to-do list, plus a fake Home Assistant that
 * confirms commands after a short delay so «requested vs confirmed» is visible.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityMap, HaMessage, HaTodoItem } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

const now = new Date();
const at = (dayOffset: number, hours: number, minutes = 0) =>
  new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + dayOffset,
    hours,
    minutes
  ).toISOString();
const inHours = (hours: number) => new Date(now.getTime() + hours * 3600 * 1000).toISOString();
const dateOnly = (dayOffset: number) => {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const conditions = [
  'sunny',
  'sunny',
  'partlycloudy',
  'cloudy',
  'rainy',
  'rainy',
  'cloudy',
  'partlycloudy',
];
export const hourlyForecast = Array.from({ length: 24 }, (_, index) => ({
  datetime: inHours(index + 1),
  condition: conditions[index % conditions.length],
  temperature: Math.round((17 + 4 * Math.sin((index - 2) / 4)) * 10) / 10,
  precipitation: conditions[index % conditions.length] === 'rainy' ? 1.4 : 0,
}));
export const dailyForecast = Array.from({ length: 7 }, (_, index) => ({
  datetime: inHours(24 * (index + 1)),
  condition: ['sunny', 'partlycloudy', 'rainy', 'cloudy', 'sunny', 'windy', 'sunny'][index],
  temperature: [22, 21, 17, 18, 23, 20, 24][index],
  templow: [12, 11, 10, 9, 13, 12, 14][index],
}));

const statistics = Array.from({ length: 48 }, (_, index) => ({
  start: now.getTime() - (48 - index) * 15 * 60 * 1000,
  mean: Math.round((14 + 3 * Math.sin(index / 7)) * 10) / 10,
}));

export const calendarEvents: Record<string, { events: Record<string, unknown>[] }> = {
  'calendar.famiglia': {
    events: [
      { summary: 'Colazione con i nonni', start: at(0, 8), end: at(0, 9) },
      { summary: 'Dentista', start: at(0, 17, 30), end: at(0, 18, 15), location: 'Via Roma 3' },
      { summary: 'Compleanno di Anna', start: dateOnly(1), end: dateOnly(2) },
      { summary: 'Cena al ristorante', start: at(1, 20), end: at(1, 22) },
      { summary: 'Mercato', start: at(3, 9), end: at(3, 11) },
    ],
  },
  'calendar.lavoro': {
    events: [
      { summary: 'Riunione di progetto', start: at(0, 11), end: at(0, 12) },
      { summary: 'Revisione impianto', start: at(2, 14), end: at(2, 16), location: 'Ufficio' },
      { summary: 'Trasferta a Milano', start: at(5, 8), end: at(5, 19) },
    ],
  },
};

export const initialTodos: HaTodoItem[] = [
  { uid: 't1', summary: 'Latte', status: 'needs_action' },
  { uid: 't2', summary: 'Pane integrale', status: 'needs_action', due: dateOnly(0) },
  { uid: 't3', summary: 'Pile per il telecomando', status: 'needs_action', due: dateOnly(-2) },
  { uid: 't4', summary: 'Detersivo', status: 'needs_action' },
  { uid: 't5', summary: 'Caffè', status: 'completed' },
  { uid: 't6', summary: 'Mele', status: 'completed' },
];

export function initialEntities(): EntityMap {
  return fixtureEntities([
    fixtureEntity('climate.soggiorno', 'heat', {
      friendly_name: 'Soggiorno',
      current_temperature: 20.5,
      temperature: 21.5,
      min_temp: 7,
      max_temp: 30,
      hvac_action: 'heating',
      hvac_modes: ['off', 'heat', 'cool', 'auto'],
      fan_modes: ['auto', 'low', 'medium', 'high'],
      fan_mode: 'auto',
      swing_modes: ['off', 'vertical'],
      swing_mode: 'off',
      preset_modes: ['none', 'eco', 'comfort', 'away'],
      preset_mode: 'comfort',
      supported_features: 1 + 8 + 16 + 32 + 128 + 256,
    }),
    fixtureEntity('climate.camera', 'off', {
      friendly_name: 'Camera da letto',
      current_temperature: 19,
      temperature: 18,
      min_temp: 7,
      max_temp: 30,
      hvac_modes: ['off', 'heat'],
    }),
    fixtureEntity('climate.bagno', 'unavailable', { friendly_name: 'Bagno' }),
    // Reported in the unit system of HA (no unit on the entity): shown with the imperial case.
    fixtureEntity('climate.studio', 'heat', {
      friendly_name: 'Studio',
      current_temperature: 68,
      temperature: 70,
      min_temp: 45,
      max_temp: 95,
      hvac_action: 'heating',
      hvac_modes: ['off', 'heat'],
    }),
    fixtureEntity('weather.casa', 'partlycloudy', {
      friendly_name: 'Casa',
      temperature: 17.4,
      temperature_unit: '°C',
      humidity: 64,
      pressure: 1016,
      pressure_unit: 'hPa',
      wind_speed: 11,
      wind_gust_speed: 24,
      wind_speed_unit: 'km/h',
      dew_point: 10.2,
      precipitation: 0,
      precipitation_unit: 'mm',
    }),
    fixtureEntity('sensor.temperatura_giardino', '16.8', {
      friendly_name: 'Giardino',
      unit_of_measurement: '°C',
      device_class: 'temperature',
    }),
    fixtureEntity('calendar.famiglia', 'off', { friendly_name: 'Famiglia' }),
    fixtureEntity('calendar.lavoro', 'off', { friendly_name: 'Lavoro' }),
    fixtureEntity('todo.spesa', '4', { friendly_name: 'Spesa' }),
    fixtureEntity('alarm_control_panel.casa', 'disarmed', {
      friendly_name: 'Casa',
      supported_features: 1 + 2 + 4,
      code_format: 'number',
      code_arm_required: false,
      changed_by: 'Marta',
    }),
    fixtureEntity('alarm_control_panel.garage', 'armed_away', {
      friendly_name: 'Garage',
      supported_features: 1 + 2,
      code_format: 'number',
    }),
    fixtureEntity('alarm_control_panel.cantina', 'triggered', {
      friendly_name: 'Cantina',
      supported_features: 2,
      code_format: null,
    }),
  ]);
}

/** Answers to the read-only messages the widgets send. */
export function answerMessage(message: HaMessage, todos: readonly HaTodoItem[]): unknown {
  if (message.type === 'todo/item/list') return { items: todos };
  if (message.type === 'recorder/statistics_during_period') {
    return { 'sensor.temperatura_giardino': statistics };
  }
  if (message.type === 'call_service' && message.service === 'get_forecasts') {
    const type = (message.service_data as { type?: string } | undefined)?.type;
    return {
      response: { 'weather.casa': { forecast: type === 'daily' ? dailyForecast : hourlyForecast } },
    };
  }
  if (message.type === 'call_service' && message.service === 'get_events') {
    return { response: calendarEvents };
  }
  return null;
}

/** New state of an entity after a command, as HA would report it. */
export function applyCommand(
  entity: HassEntity,
  service: string,
  data: Record<string, unknown>
): HassEntity {
  const attributes = { ...entity.attributes };
  let state = entity.state;
  const actionFor = (mode: string) =>
    mode === 'off' ? 'off' : mode === 'cool' ? 'cooling' : mode === 'heat' ? 'heating' : 'idle';
  switch (service) {
    case 'set_temperature':
      attributes.temperature = data.temperature;
      break;
    case 'set_hvac_mode':
      state = String(data.hvac_mode);
      attributes.hvac_action = actionFor(state);
      break;
    case 'turn_on':
      state = 'heat';
      attributes.hvac_action = 'heating';
      break;
    case 'turn_off':
      state = 'off';
      attributes.hvac_action = 'off';
      break;
    case 'set_fan_mode':
      attributes.fan_mode = data.fan_mode;
      break;
    case 'set_swing_mode':
      attributes.swing_mode = data.swing_mode;
      break;
    case 'set_preset_mode':
      attributes.preset_mode = data.preset_mode;
      break;
    case 'alarm_disarm':
      state = 'disarmed';
      break;
    default:
      if (service.startsWith('alarm_arm_')) state = `armed_${service.slice('alarm_arm_'.length)}`;
  }
  return { ...entity, state, attributes, last_updated: new Date().toISOString() };
}
