/**
 * The widget a device just added from «Trovati in rete» belongs to (F2 of the plan «Aggiungi
 * dispositivi»): the classifier applied to the registries, looking for the new entry's device. If
 * the registries do not show it yet, the family the server gave for the integration decides.
 */
import type { AddWidgetSelection } from '@/@types/launcher';
import { nativeTvBrand } from './tvBrand';
import {
  classifyDevices,
  FAMILY_WIDGET_TYPE,
  type ClassifyInput,
  type DeviceFamily,
} from './classify';

export interface NewEntry {
  /** Id of the device in the registry of Home Assistant, when the server described one. */
  deviceId: string | null;
  /** Visible entities of the entry. */
  entityIds: readonly string[];
  mediaPlayerEntityId: string | null;
  /** Integration, maker and title of the entry: a Cast entry of a branded TV gets no widget. */
  domain?: string;
  manufacturer?: string | null;
  title?: string;
}

export function selectionForNewEntry(
  input: ClassifyInput,
  entry: NewEntry,
  family: DeviceFamily | null
): AddWidgetSelection | null {
  const found = classifyDevices(input).find(
    (device) =>
      (entry.deviceId !== null && device.deviceId === entry.deviceId) ||
      device.entityIds.some((entityId) => entry.entityIds.includes(entityId))
  );
  // A TV of a brand with its own integration that only Cast shows has no remote and no real
  // power: no widget is made by itself for it, «Collegati» offers to connect it properly.
  if (
    found?.family === 'tv' &&
    found.platform === 'cast' &&
    nativeTvBrand(found.manufacturer, found.name)
  ) {
    return null;
  }
  if (found) {
    return {
      type: found.widgetType,
      entityIds: found.entityIds,
      ...(found.remoteId ? { remoteId: found.remoteId } : {}),
    };
  }
  if (!family) return null;
  if (
    family === 'tv' &&
    entry.domain === 'cast' &&
    nativeTvBrand(entry.manufacturer, entry.title)
  ) {
    return null;
  }
  const entityIds =
    family === 'tv'
      ? entry.mediaPlayerEntityId
        ? [entry.mediaPlayerEntityId]
        : []
      : [...entry.entityIds];
  return { type: family === 'tv' && entry.domain === 'apple_tv' ? 'appletv' : FAMILY_WIDGET_TYPE[family], entityIds };
}
