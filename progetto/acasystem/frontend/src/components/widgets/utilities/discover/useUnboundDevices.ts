import { useEffect, useMemo, useState } from 'react';
import type { HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { usePages } from '@/hooks/context';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { boundDeviceIds, boundEntityIds, unboundDevices } from '@/utils/devices/bound';
import { classifyDevices, type DiscoveredDevice } from '@/utils/devices/classify';
import { identifyActionFor, type IdentifyAction } from '@/utils/devices/identify';

interface Registries {
  devices: HaDeviceRegistryEntry[];
  entityRegistry: HaEntityRegistryEntry[];
}

export type UnboundDevicesState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      devices: DiscoveredDevice[];
      /** «Fai lampeggiare» per device id, for the devices that can show which one they are. */
      identify: ReadonlyMap<string, IdentifyAction>;
    };

/**
 * Devices of Home Assistant that a widget can show and no widget shows yet. The registries are
 * read again when the number of entities changes (a device was added to Home Assistant); the
 * widgets of every page come from the page configuration.
 */
export function useUnboundDevices(): UnboundDevicesState {
  const { conn, entities, entitiesLoaded } = useWidgetRuntime();
  const { pagesConfig, cardSettings } = usePages();
  const [registries, setRegistries] = useState<Registries | 'error' | null>(null);
  const entityCount = Object.keys(entities).length;

  useEffect(() => {
    if (!entitiesLoaded || !conn) return;
    let cancelled = false;
    Promise.all([getDeviceRegistry(conn), getEntityRegistry(conn)]).then(
      ([devices, entityRegistry]) => {
        if (!cancelled) setRegistries({ devices, entityRegistry });
      },
      () => {
        if (!cancelled) setRegistries('error');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [conn, entitiesLoaded, entityCount]);

  return useMemo<UnboundDevicesState>(() => {
    if (!entitiesLoaded) return { status: 'loading' };
    if (!conn || registries === 'error') return { status: 'error' };
    if (!registries) return { status: 'loading' };
    const found = classifyDevices({ ...registries, entities });
    const entityDevice = new Map<string, string>();
    const entitiesOfDevice = new Map<string, string[]>();
    for (const entry of registries.entityRegistry) {
      if (typeof entry.device_id === 'string' && entry.device_id) {
        entityDevice.set(entry.entity_id, entry.device_id);
        entitiesOfDevice.set(entry.device_id, [
          ...(entitiesOfDevice.get(entry.device_id) ?? []),
          entry.entity_id,
        ]);
      }
    }
    const devices = unboundDevices(
      found,
      boundEntityIds(pagesConfig, cardSettings),
      boundDeviceIds(pagesConfig, cardSettings, entityDevice)
    );
    const identify = new Map<string, IdentifyAction>();
    for (const device of devices) {
      const action = identifyActionFor(entitiesOfDevice.get(device.deviceId) ?? [], entities);
      if (action) identify.set(device.deviceId, action);
    }
    return { status: 'ready', devices, identify };
  }, [conn, entities, entitiesLoaded, registries, pagesConfig, cardSettings]);
}
