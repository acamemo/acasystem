import type { EntryDto } from '@/@types/devices';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { useAddWidgetRequest } from '@/hooks/launcher/AddWidgetRequestContext';
import { useDiscoveredFlow } from '@/hooks/launcher/DiscoveredFlowContext';
import { useOptionalLauncher } from '@/hooks/launcher/LauncherContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import type { DeviceFamily, DiscoveredDevice } from '@/utils/devices/classify';
import { selectionForNewEntry } from '@/utils/devices/entrySelection';
import { widgetPages } from '@/utils/launcher/deviceMemory';
import { DeviceFinder } from './DeviceFinder';

/**
 * «Rileva dispositivi»: the screen of «Aggiungi un dispositivo» (`DeviceFinder`) with no family,
 * so it shows everything: the televisions in the network, what Home Assistant found, the devices
 * already in Home Assistant that no widget shows, and the way in by brand. A tap on a ready
 * device closes the details and opens «Aggiungi un widget» with the device selected; a device
 * added from here opens the same sheet on it. The sheet and the flow belong to the launcher
 * screen, which offers them through `AddWidgetRequestContext` and `DiscoveredFlowContext` (a
 * widget cannot import the screen); without a launcher (previews) the rows are inert.
 */
export function DiscoverDetails({ id, onClose }: WidgetDetailsProps) {
  const requestAdd = useAddWidgetRequest();
  const Flow = useDiscoveredFlow();
  const launcher = useOptionalLauncher();
  const runtime = useWidgetRuntime();

  const targetPage = (): string => {
    const pages = launcher?.layout.pages ?? [];
    return (
      [...(launcher ? (widgetPages(launcher.layout).get(id) ?? []) : [])][0] ??
      pages.find((page) => page.kind === 'widgets')?.id ??
      'home'
    );
  };

  const add = (device: DiscoveredDevice) => {
    if (!requestAdd) return;
    const pageId = targetPage();
    onClose();
    requestAdd(pageId, {
      type: device.widgetType,
      entityIds: device.entityIds,
      ...(device.remoteId ? { remoteId: device.remoteId } : {}),
    });
  };

  /** The device is in Home Assistant: find the widget it belongs to and open the add sheet. */
  const finishAdding = async (entry: EntryDto, family: DeviceFamily | null) => {
    const pageId = targetPage();
    const newEntry = {
      deviceId: entry.device?.id ?? null,
      entityIds: entry.entities,
      mediaPlayerEntityId: entry.mediaPlayerEntityId,
    };
    let selection = null;
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
    onClose();
    if (selection && requestAdd) requestAdd(pageId, selection);
  };

  return (
    <DeviceFinder
      label="Trova dispositivi"
      Flow={Flow}
      onUse={requestAdd ? add : null}
      onFlowDone={(entry, family) => void finishAdding(entry, family)}
    />
  );
}
