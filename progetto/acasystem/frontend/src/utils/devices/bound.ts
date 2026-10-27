/**
 * Entities and devices that a widget of the launcher already shows (F1 of the plan «Aggiungi
 * dispositivi»): what «Rileva dispositivi» must not offer again.
 */
import type { CardSettings, CardSettingsMap, PagesConfig } from '@/@types/dashboard';
import { BINDING_KEYS } from '@/utils/launcher/bindingKeys';
import { widgetDeviceKey } from '@/utils/launcher/deviceMemory';
import type { DiscoveredDevice } from './classify';

const ENTITY_ID = /^[a-z0-9_]+\.[A-Za-z0-9_]+$/;

/** Settings that link a widget to a second entity of its device (the remote of a television). */
const EXTRA_BINDING_KEYS = ['remoteId'];

const settingsOf = (
  cardSettings: CardSettingsMap,
  pageId: string,
  widgetId: string
): CardSettings => cardSettings[`${pageId}::${widgetId}`] ?? cardSettings[widgetId] ?? {};

/** Every entity id a setting holds, whether it is one id or a list. */
function entityIdsIn(value: unknown): string[] {
  if (typeof value === 'string') return ENTITY_ID.test(value) ? [value] : [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && ENTITY_ID.test(item));
  }
  return [];
}

/**
 * Entities linked to a widget on any page: the device of the widget (`widgetDeviceKey`), every
 * entity of its binding (a player group links several), the remote of a television and the
 * widget id itself when the card is an entity (`media_player.sala`, `light.cucina`).
 */
export function boundEntityIds(
  pagesConfig: PagesConfig,
  cardSettings: CardSettingsMap
): Set<string> {
  const bound = new Set<string>();
  for (const [pageId, widgetIds] of Object.entries(pagesConfig)) {
    if (pageId === 'pages' || !Array.isArray(widgetIds)) continue;
    for (const widgetId of widgetIds) {
      const settings = settingsOf(cardSettings, pageId, widgetId);
      if (ENTITY_ID.test(widgetId)) bound.add(widgetId);
      const device = widgetDeviceKey(widgetId, settings);
      if (device && ENTITY_ID.test(device)) bound.add(device);
      const keys = new Set([...Object.values(BINDING_KEYS), ...EXTRA_BINDING_KEYS]);
      for (const key of keys) entityIdsIn(settings[key]).forEach((id) => bound.add(id));
    }
  }
  return bound;
}

/**
 * Devices (of the device registry) with at least one entity already shown by a widget.
 * `entityDevice` maps an entity id to its device id (from the entity registry).
 */
export function boundDeviceIds(
  pagesConfig: PagesConfig,
  cardSettings: CardSettingsMap,
  entityDevice: ReadonlyMap<string, string>
): Set<string> {
  const devices = new Set<string>();
  for (const entityId of boundEntityIds(pagesConfig, cardSettings)) {
    const deviceId = entityDevice.get(entityId);
    if (deviceId) devices.add(deviceId);
  }
  return devices;
}

/** The devices no widget shows yet: none of their entities is bound, nor is the device. */
export function unboundDevices(
  found: readonly DiscoveredDevice[],
  boundEntities: ReadonlySet<string>,
  boundDevices: ReadonlySet<string>
): DiscoveredDevice[] {
  return found.filter(
    (device) =>
      !boundDevices.has(device.deviceId) &&
      !device.entityIds.some((id) => boundEntities.has(id)) &&
      !(device.remoteId && boundEntities.has(device.remoteId))
  );
}
