import type { EntryDto } from '@/@types/devices';
import type { AddWidgetSelection, WidgetRuntime } from '@/@types/launcher';
import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { FAMILY_WIDGET_TYPE, type DeviceFamily } from '@/utils/devices/classify';
import { selectionForNewEntry } from '@/utils/devices/entrySelection';

/**
 * The widget a device just added belongs to, found like «Rileva dispositivi» does when its flow
 * ends: the classifier on the registries read now, looking for the new entry's device; if the
 * registries are not there or do not show it yet, the family of the integration decides. Null when
 * neither knows a widget for it: no widget is made by itself.
 */
export async function selectionAfterAdd(
  runtime: Pick<WidgetRuntime, 'conn' | 'entities'>,
  entry: EntryDto,
  family: DeviceFamily | null
): Promise<AddWidgetSelection | null> {
  const newEntry = {
    deviceId: entry.device?.id ?? null,
    entityIds: entry.entities,
    mediaPlayerEntityId: entry.mediaPlayerEntityId,
    domain: entry.domain,
    manufacturer: entry.device?.manufacturer ?? null,
    title: entry.title,
  };
  let selection: AddWidgetSelection | null = null;
  try {
    if (runtime.conn) {
      const [devices, entityRegistry] = await Promise.all([
        getDeviceRegistry(runtime.conn),
        getEntityRegistry(runtime.conn),
      ]);
      selection = selectionForNewEntry(
        { devices, entityRegistry, entities: runtime.entities },
        newEntry,
        family
      );
    }
  } catch {
    // The registries are a way to be precise; the family of the integration still decides.
  }
  selection ??= selectionForNewEntry(
    { devices: [], entityRegistry: [], entities: runtime.entities },
    newEntry,
    family
  );
  return selection;
}

/**
 * One device, one widget: a camera with two streams (Reolink «fluent» and «clear») would otherwise
 * get a widget per stream. The stream kept is the one the classifier put first.
 */
export function oneWidgetPerDevice(selection: AddWidgetSelection): AddWidgetSelection {
  return selection.type === FAMILY_WIDGET_TYPE.camera && selection.entityIds.length > 1
    ? { ...selection, entityIds: selection.entityIds.slice(0, 1) }
    : selection;
}
