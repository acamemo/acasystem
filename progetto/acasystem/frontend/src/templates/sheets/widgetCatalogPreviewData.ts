import type { CardSettings } from '@/@types/dashboard';
import type { HassEntity } from '@/@types/ha';
import type { WidgetRuntime } from '@/@types/launcher';

/** Private catalogue examples: never copy an account, its settings or its runtime here. */
const entity = (id: string, name: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({
  entity_id: id, state, attributes: { friendly_name: name, ...attributes },
  last_changed: '2026-01-01T10:00:00Z', last_updated: '2026-01-01T10:00:00Z',
  context: { id: 'catalogue-example', parent_id: null, user_id: null },
});
const examples = [
  entity('sensor.catalogue_temperature', 'Temperatura ambiente', '21.5', { unit_of_measurement: '°C', device_class: 'temperature' }),
  entity('light.catalogue', 'Luce soggiorno', 'on', { brightness: 160, supported_color_modes: ['brightness'] }),
  entity('switch.catalogue', 'Presa studio', 'on', { device_class: 'outlet' }),
  entity('fan.catalogue', 'Ventilatore', 'on', { supported_features: 1, percentage: 60 }),
  entity('climate.catalogue', 'Clima', 'heat', { supported_features: 1, current_temperature: 21.5, temperature: 22, min_temp: 7, max_temp: 35, target_temp_step: 0.5, hvac_modes: ['off', 'heat', 'cool'] }),
  entity('cover.catalogue', 'Tapparella', 'open', { supported_features: 15, current_position: 60 }),
  entity('camera.catalogue', 'Ingresso', 'idle', { supported_features: 3 }),
  entity('lock.catalogue', 'Porta ingresso', 'locked', { supported_features: 1, code_format: 'none' }),
  entity('alarm_control_panel.catalogue', 'Allarme', 'disarmed', { supported_features: 3, code_arm_required: false, code_disarm_required: false }),
  entity('vacuum.catalogue', 'Aspirapolvere', 'docked', { supported_features: 8192 | 4 | 8 | 16 | 32, battery_level: 78 }),
  entity('lawn_mower.catalogue', 'Tagliaerba', 'docked', { supported_features: 15, battery_level: 80 }),
  entity('media_player.catalogue', 'Musica', 'playing', { supported_features: 512 | 1 | 2 | 4 | 16 | 32, media_title: 'Musica di esempio', media_artist: 'Raccolta demo', volume_level: 0.5, is_volume_muted: false }),
  entity('sensor.catalogue_battery', 'Batteria', '82', { unit_of_measurement: '%' }),
  entity('sensor.catalogue_range', 'Autonomia', '360', { unit_of_measurement: 'km' }),
  entity('sensor.catalogue_power', 'Potenza della casa', '830', { unit_of_measurement: 'W', device_class: 'power' }),
  entity('sensor.catalogue_consumption', 'Energia misurata', '8.4', { unit_of_measurement: 'kWh', device_class: 'energy' }),
  entity('sensor.catalogue_today', 'Costo di oggi', '2.84', { unit_of_measurement: '€' }),
  entity('sensor.catalogue_month', 'Costo del mese', '48.20', { unit_of_measurement: '€' }),
  entity('sensor.catalogue_energy', 'Prezzo energia', '0.18', { unit_of_measurement: '€/kWh' }),
];

// Service names only make the real controls visible. No connection or executing callback exists.
const serviceNames: Record<string, readonly string[]> = {
  light: ['turn_on', 'turn_off'], fan: ['turn_on', 'turn_off', 'set_percentage'],
  switch: ['turn_on', 'turn_off'],
  climate: ['set_temperature', 'set_hvac_mode'], cover: ['open_cover', 'close_cover', 'stop_cover', 'set_cover_position'],
  camera: ['turn_on', 'turn_off', 'enable_motion_detection', 'disable_motion_detection', 'snapshot', 'record', 'play_stream'],
  lock: ['lock', 'unlock', 'open'], alarm_control_panel: ['alarm_arm_home', 'alarm_arm_away', 'alarm_disarm'],
  vacuum: ['start', 'pause', 'stop', 'return_to_base'], lawn_mower: ['start_mowing', 'pause', 'dock', 'stop'],
  media_player: ['turn_on', 'turn_off', 'media_play_pause', 'media_next_track', 'media_previous_track', 'volume_set', 'volume_mute'],
};
const noop = () => undefined;
export const catalogPreviewRuntime: WidgetRuntime = {
  entities: Object.fromEntries(examples.map((item) => [item.entity_id, item])), entitiesLoaded: true,
  services: Object.fromEntries(Object.entries(serviceNames).map(([domain, names]) => [domain, Object.fromEntries(names.map((name) => [name, {}]))])),
  conn: null, callService: async () => undefined, t: (key) => key, language: 'it',
  cardSettings: {}, saveCardSetting: noop, customNames: {}, customIcons: {},
  getEntityImageUrl: () => null, openDetails: noop, editMode: true,
  haConfig: { language: 'it', currency: 'EUR', time_zone: 'Europe/Rome', unit_system: { temperature: '°C' } },
};

interface Example { entityId: string; settings: CardSettings }
export const catalogPreviewExamples: Readonly<Record<string, Example>> = {
  sensor: { entityId: 'sensor.catalogue_temperature', settings: { entityId: 'sensor.catalogue_temperature', sensorBindingMode: 'device',
    productDevice: { version: 1, family: 'sensor', deviceId: 'catalogue-sensor', primaryEntityId: 'sensor.catalogue_temperature',
      channelEntityIds: ['sensor.catalogue_temperature'], secondaryEntityIds: [], technicalEntityIds: [] } } },
  light: { entityId: 'light.catalogue', settings: { bindingEntityId: 'light.catalogue' } },
  plug: { entityId: 'switch.catalogue', settings: { bindingEntityId: 'switch.catalogue' } },
  fan: { entityId: 'fan.catalogue', settings: { bindingEntityId: 'fan.catalogue',
    productDevice: { version: 1, family: 'fan', deviceId: 'catalogue-fan', primaryEntityId: 'fan.catalogue',
      channelEntityIds: ['fan.catalogue'], secondaryEntityIds: [], technicalEntityIds: [] } } },
  climate: { entityId: 'climate.catalogue', settings: { climateId: 'climate.catalogue',
    productDevice: { version: 1, family: 'climate', deviceId: 'catalogue-climate', primaryEntityId: 'climate.catalogue',
      channelEntityIds: ['climate.catalogue'], secondaryEntityIds: [], technicalEntityIds: [] } } },
  cover: { entityId: 'cover.catalogue', settings: { coverId: 'cover.catalogue',
    productDevice: { version: 1, family: 'cover', deviceId: 'catalogue-cover', primaryEntityId: 'cover.catalogue',
      channelEntityIds: ['cover.catalogue'], secondaryEntityIds: [], technicalEntityIds: [] } } },
  camera: { entityId: 'camera.catalogue', settings: { cameraId: 'camera.catalogue',
    productDevice: { version: 1, family: 'camera', deviceId: 'catalogue-camera', primaryEntityId: 'camera.catalogue',
      channelEntityIds: ['camera.catalogue'], secondaryEntityIds: [], technicalEntityIds: [] } } },
  lock: { entityId: 'lock.catalogue', settings: { lockId: 'lock.catalogue',
    productDevice: { version: 1, family: 'lock', deviceId: 'catalogue-lock', primaryEntityId: 'lock.catalogue',
      channelEntityIds: ['lock.catalogue'], secondaryEntityIds: [], technicalEntityIds: [] } } },
  alarm: { entityId: 'alarm_control_panel.catalogue', settings: { alarmId: 'alarm_control_panel.catalogue',
    productDevice: { version: 1, family: 'alarm', deviceId: 'catalogue-alarm', primaryEntityId: 'alarm_control_panel.catalogue',
      channelEntityIds: ['alarm_control_panel.catalogue'], secondaryEntityIds: [], technicalEntityIds: [] } } },
  vacuum: { entityId: 'vacuum.catalogue', settings: { bindingEntityId: 'vacuum.catalogue',
    productDevice: { version: 1, family: 'vacuum', deviceId: 'catalogue-vacuum', primaryEntityId: 'vacuum.catalogue',
      channelEntityIds: ['vacuum.catalogue'], secondaryEntityIds: [], technicalEntityIds: [] } } },
  mower: { entityId: 'lawn_mower.catalogue', settings: { bindingEntityId: 'lawn_mower.catalogue',
    productDevice: { version: 1, family: 'mower', deviceId: 'catalogue-mower', primaryEntityId: 'lawn_mower.catalogue',
      channelEntityIds: ['lawn_mower.catalogue'], secondaryEntityIds: [], technicalEntityIds: [] } } },
  car: { entityId: 'sensor.catalogue_battery', settings: { batteryId: 'sensor.catalogue_battery', rangeId: 'sensor.catalogue_range' } },
  media: { entityId: 'media_player.catalogue', settings: { mediaIds: ['media_player.catalogue'], productDevice: { version: 1, family: 'media', deviceId: 'catalogue-media', primaryEntityId: 'media_player.catalogue', channelEntityIds: ['media_player.catalogue'], secondaryEntityIds: [] } } },
  sonos: { entityId: 'media_player.catalogue', settings: { mediaIds: ['media_player.catalogue'], productDevice: { version: 1, family: 'sonos', deviceId: 'catalogue-sonos', primaryEntityId: 'media_player.catalogue', channelEntityIds: ['media_player.catalogue'], secondaryEntityIds: [] } } },
  androidtv: { entityId: 'media_player.catalogue', settings: { mediaPlayerId: 'media_player.catalogue', productDevice: { version: 1, family: 'tv', deviceId: 'catalogue-tv', primaryEntityId: 'media_player.catalogue', channelEntityIds: ['media_player.catalogue'], secondaryEntityIds: [] } } },
  appletv: { entityId: 'media_player.catalogue', settings: { mediaPlayerId: 'media_player.catalogue', productDevice: { version: 1, family: 'tv', deviceId: 'catalogue-tv', primaryEntityId: 'media_player.catalogue', channelEntityIds: ['media_player.catalogue'], secondaryEntityIds: [] } } },
  cost: { entityId: 'sensor.catalogue_today', settings: { powerId: 'sensor.catalogue_power', consumptionId: 'sensor.catalogue_consumption', todayId: 'sensor.catalogue_today', monthId: 'sensor.catalogue_month' } },
  nordpool: { entityId: 'sensor.catalogue_energy', settings: { nordpoolId: 'sensor.catalogue_energy' } },
  room: { entityId: 'catalogue_room', settings: { entityIds: ['light.catalogue', 'climate.catalogue', 'sensor.catalogue_temperature'], tempEntityId: 'sensor.catalogue_temperature', climateEntityId: 'climate.catalogue', heading: 'Soggiorno' } },
  spacer: { entityId: '', settings: { variant: 'divider', heading: 'Casa', adaptiveSpacing: 16 } },
};
