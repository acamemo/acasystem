/**
 * The widget a device just added from «Trovati in rete» belongs to (F2 of the plan «Aggiungi
 * dispositivi»): the classifier applied to the registries, looking for the new entry's device. If
 * the registries do not show it yet, the family the server gave for the integration decides.
 */
import type { AddWidgetSelection } from '@/@types/launcher';
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
  if (found) {
    return {
      type: found.widgetType,
      entityIds: found.entityIds,
      ...(found.remoteId ? { remoteId: found.remoteId } : {}),
    };
  }
  if (!family) return null;
  const entityIds =
    family === 'tv'
      ? entry.mediaPlayerEntityId
        ? [entry.mediaPlayerEntityId]
        : []
      : [...entry.entityIds];
  return { type: FAMILY_WIDGET_TYPE[family], entityIds };
}
