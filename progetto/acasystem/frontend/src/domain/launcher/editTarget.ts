/**
 * What the settings sheet can edit for a widget: the same id rules as the legacy
 * useEditModalProps and resolveCarSettings (rendering/), typed for the sheet.
 */
import type { CardSettings, CardSettingsMap } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';

export type { WidgetKind as EditKind } from '../../../../contracts/widgetIdentity';
import type { WidgetKind as EditKind } from '../../../../contracts/widgetIdentity';
export { CAR_KEYS, kindOf } from '../../../../contracts/widgetIdentity';
import { CAR_KEYS, kindOf } from '../../../../contracts/widgetIdentity';

export interface EditTarget {
  kind: EditKind;
  settings: CardSettings;
  /** Entity whose friendly name is the default name of the widget. */
  nameEntityId: string | null;
  canEditName: boolean;
  canEditIcon: boolean;
  canEditStatus: boolean;
}

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
  if (raw.categoryWidgetType === 'plug') nameEntityId = textSetting(raw, 'bindingEntityId');
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
    raw.categoryWidgetType === 'plug' || iconKinds.includes(kind) ||
    widgetId.startsWith('automation.') ||
    (Boolean(entity) && kind !== 'media');

  const canEditStatus =
    kind === 'sensor' || (Boolean(entity) && settingsKey.startsWith('settings::'));

  return { kind, settings, nameEntityId, canEditName, canEditIcon, canEditStatus };
}
