import { useEffect, useMemo, useState } from 'react';
import type { HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { usePages } from '@/hooks/context';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { boundDeviceIds, boundEntityIds, unboundDevices } from '@/utils/devices/bound';
import { classifyDevices, type DiscoveredDevice } from '@/utils/devices/classify';

export type ConnectedDevice = DiscoveredDevice & {
  /** A widget of some page already shows the device. */
  bound: boolean;
};

export type ConnectedDevicesState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; devices: ConnectedDevice[] };

interface Registries {
  devices: HaDeviceRegistryEntry[];
  entityRegistry: HaEntityRegistryEntry[];
}

/**
 * Every device of Home Assistant that a widget can show, the ones a widget shows already and the
 * ones it does not («Collegati» of «Dispositivi trovati»): those the person connected and those
 * Home Assistant added by itself (Cast...). Same reading as `useUnboundDevices`, without leaving
 * out the bound ones.
 */
export function useConnectedDevices(): ConnectedDevicesState {
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

  return useMemo<ConnectedDevicesState>(() => {
    if (!entitiesLoaded) return { status: 'loading' };
    if (!conn || registries === 'error') return { status: 'error' };
    if (!registries) return { status: 'loading' };
    const entityDevice = new Map<string, string>();
    for (const entry of registries.entityRegistry) {
      if (typeof entry.device_id === 'string' && entry.device_id) {
        entityDevice.set(entry.entity_id, entry.device_id);
      }
    }
    const found = classifyDevices({ ...registries, entities });
    const unbound = new Set(
      unboundDevices(
        found,
        boundEntityIds(pagesConfig, cardSettings),
        boundDeviceIds(pagesConfig, cardSettings, entityDevice)
      ).map((device) => device.deviceId)
    );
    return {
      status: 'ready',
      devices: found.map((device) => ({ ...device, bound: !unbound.has(device.deviceId) })),
    };
  }, [conn, entities, entitiesLoaded, registries, pagesConfig, cardSettings]);
}
