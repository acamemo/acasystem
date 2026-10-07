/**
 * What the settings sheet can edit for a widget: the same id rules as the legacy
 * useEditModalProps and resolveCarSettings (rendering/), typed for the sheet.
 */
import type { CardSettings, CardSettingsMap } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';

export type EditKind =
  | 'sensor'
  | 'light'
  | 'media'
  | 'calendar'
  | 'todo'
  | 'cost'
  | 'nordpool'
  | 'androidtv'
  | 'appletv'
  | 'vacuum'
  | 'car'
  | 'room'
  | 'lock'
  | 'cover'
  | 'alarm'
  | 'spacer'
  | 'camera'
  | 'fan'
  | 'climate'
  | 'weather'
  | 'person'
  | 'other';

export interface EditTarget {
  kind: EditKind;
  settings: CardSettings;
  /** Entity whose friendly name is the default name of the widget. */
  nameEntityId: string | null;
  canEditName: boolean;
  canEditIcon: boolean;
  canEditStatus: boolean;
}

const CAR_KEYS = [
  'batteryId',
  'rangeId',
  'odometerId',
  'fuelLevelId',
  'locationId',
  'latitudeId',
  'longitudeId',
  'pluggedId',
  'chargingPowerId',
  'chargeRateId',
  'timeToFullId',
  'chargeEndTimeId',
  'chargeLimitNumberId',
  'chargeLimitSelectId',
  'climateId',
  'lockId',
  'ignitionSwitchId',
  'engineStatusId',
  'lastUpdatedId',
  'apiStatusId',
  'updateButtonId',
] as const;

/** Car settings with every mapping present (null when unset), as the legacy edit modal read them. */
export function resolveCarSettings(settings: CardSettings): CardSettings {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(settings, key);
  const chargingStateId = has('chargingStateId')
    ? settings.chargingStateId
    : has('chargingId')
      ? settings.chargingId
      : null;
  const resolved: CardSettings = { ...settings };
  CAR_KEYS.forEach((key) => {
    resolved[key] = has(key) ? settings[key] : null;
  });
  resolved.chargingStateId = chargingStateId;
  resolved.chargingId = has('chargingId') ? settings.chargingId : chargingStateId;
  resolved.chargeControlIds = has('chargeControlIds') ? settings.chargeControlIds : [];
  return resolved;
}

const textSetting = (settings: CardSettings, key: string): string | null => {
  const value = settings[key];
  return typeof value === 'string' && value ? value : null;
};

function kindOf(id: string, settings: CardSettings): EditKind {
  const isSensor =
    id.startsWith('entity_card_') ||
    (settings.type === 'sensor' &&
      !/^(light[_.]|lock\.|vacuum\.|lawn_mower\.|fan\.|media_player\.)/.test(id));
  if (isSensor) return 'sensor';
  if (id.startsWith('light_') || id.startsWith('light.')) return 'light';
  if (
    id.startsWith('media_player.') ||
    id === 'media_player' ||
    id.startsWith('media_group_') ||
    id.startsWith('sonos_group_')
  )
    return 'media';
  if (id.startsWith('calendar_card_')) return 'calendar';
  if (id.startsWith('todo_card_')) return 'todo';
  if (id.startsWith('cost_card_')) return 'cost';
  if (id.startsWith('nordpool_card_')) return 'nordpool';
  if (id.startsWith('androidtv_card_')) return 'androidtv';
  if (id.startsWith('appletv_card_')) return 'appletv';
  if (id.startsWith('vacuum.')) return 'vacuum';
  if (id === 'car' || id.startsWith('car_card_')) return 'car';
  if (id.startsWith('room_card_')) return 'room';
  if (id.startsWith('lock_card_') || id.startsWith('lock.')) return 'lock';
  if (id.startsWith('cover_card_')) return 'cover';
  if (id.startsWith('alarm_card_')) return 'alarm';
  if (id.startsWith('spacer_card_')) return 'spacer';
  if (id.startsWith('camera_card_')) return 'camera';
  if (id.startsWith('fan.') || id.startsWith('fan_card_')) return 'fan';
  if (id.startsWith('climate_card_')) return 'climate';
  if (id.startsWith('weather_temp_')) return 'weather';
  if (id.startsWith('person.')) return 'person';
  return 'other';
}

export function resolveEditTarget(
  widgetId: string,
  settingsKey: string,
  cardSettings: CardSettingsMap,
  entities: EntityMap
): EditTarget {
  const raw: CardSettings = cardSettings[settingsKey] ?? cardSettings[widgetId] ?? {};
  const kind = kindOf(widgetId, raw);
  const settings = kind === 'car' ? resolveCarSettings(raw) : raw;
  const sensorEntityId = textSetting(raw, 'entityId') ?? widgetId;
  const entityId = kind === 'sensor' ? sensorEntityId : widgetId;
  const entity = entities[entityId] ?? null;

  let nameEntityId: string | null = widgetId;
  if (kind === 'sensor') nameEntityId = sensorEntityId;
  else if (kind === 'cover') nameEntityId = textSetting(settings, 'coverId');
  else if (kind === 'climate') nameEntityId = textSetting(settings, 'climateId');
  else if (kind === 'appletv' || kind === 'androidtv')
    nameEntityId = textSetting(settings, 'mediaPlayerId');
  else if (kind === 'lock') nameEntityId = textSetting(settings, 'lockId') ?? widgetId;

  const canEditName =
    kind !== 'weather' && kind !== 'spacer' && widgetId !== 'media_player' && widgetId !== 'sonos';

  const iconKinds: readonly EditKind[] = [
    'light',
    'sensor',
    'media',
    'calendar',
    'todo',
    'room',
    'lock',
    'cover',
    'alarm',
    'nordpool',
    'vacuum',
    'climate',
    'cost',
    'camera',
    'car',
    'fan',
  ];
  const canEditIcon =
    iconKinds.includes(kind) ||
    widgetId.startsWith('automation.') ||
    (Boolean(entity) && kind !== 'media');

  const canEditStatus =
    kind === 'sensor' || (Boolean(entity) && settingsKey.startsWith('settings::'));

  return { kind, settings, nameEntityId, canEditName, canEditIcon, canEditStatus };
}
