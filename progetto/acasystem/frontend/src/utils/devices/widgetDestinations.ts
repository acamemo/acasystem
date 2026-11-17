import type { CardSettings } from '@/@types/dashboard';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import type { LauncherLayout } from '@/@types/launcher';
import { boundEntityIds } from './bound';
import { widgetPages } from '@/utils/launcher/deviceMemory';
import { logicalPage } from '@/domain/launcher/commonOrder';
import { isProductDeviceBinding } from '../../../../contracts/productDevice';
import { multimediaProductBinding, sensorProductBinding } from './productBinding';
import { BINDING_KEYS } from '../../../../contracts/widgetIdentity';

export interface DeviceWidgetDestination {
  widgetId: string;
  pageId: string;
  logicalPageId: string;
  stackId?: string;
  settingsKey: string;
  settings: CardSettings;
}

/** A derived index only: finding a device never rewrites a layout, stack or saved binding. */
export function deviceWidgetDestinations(
  deviceId: string,
  layout: LauncherLayout,
  registry: readonly HaEntityRegistryEntry[],
  settingsFor: (pageId: string, widgetId: string) => CardSettings,
  settingsKeyFor: (pageId: string, widgetId: string) => string,
): DeviceWidgetDestination[] {
  const entityDevice = new Map(registry.map((entry) => [entry.entity_id, entry.device_id]));
  const result: DeviceWidgetDestination[] = [];
  const seen = new Set<string>();
  for (const [widgetId, pages] of widgetPages(layout)) {
    if (layout.stacks?.[widgetId]) continue;
    for (const pageId of pages) {
      const settings = settingsFor(pageId, widgetId);
      const binding = settings.productDevice;
      const bound = boundEntityIds({ pages: [pageId], header: [], [pageId]: [widgetId] }, { [`${pageId}::${widgetId}`]: settings });
      if (!(isProductDeviceBinding(binding) && binding.deviceId === deviceId && (['tv', 'sonos', 'media'].includes(binding.family) ? multimediaProductBinding(settings) !== null
          : binding.family === 'sensor' ? sensorProductBinding(settings) !== null
          : settings[BINDING_KEYS[binding.family] ?? 'bindingEntityId'] === binding.primaryEntityId))
        && ![...bound].some((entityId) => entityDevice.get(entityId) === deviceId)) continue;
      const logicalPageId = logicalPage(layout, pageId);
      const key = `${logicalPageId}\0${widgetId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const page = layout.pages.find(page => page.id === pageId);
      const pageItems = new Set([...(page?.order ?? []), ...Object.values(page?.placements ?? {}).flatMap(items => Object.keys(items ?? {}))]);
      const stackId = pageItems.has(widgetId) ? undefined : Object.entries(layout.stacks ?? {})
        .find(([stackId, stack]) => pageItems.has(stackId) && stack.ids.includes(widgetId))?.[0];
      result.push({ widgetId, pageId, logicalPageId, ...(stackId ? { stackId } : {}),
        settingsKey: settingsKeyFor(pageId, widgetId), settings });
    }
  }
  return result;
}
