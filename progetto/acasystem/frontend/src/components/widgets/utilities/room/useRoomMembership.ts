import { useEffect, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { Connection } from '@/@types/ha';
import { CLIENT_SESSION_EVENT, getClientSession } from '@/api/clientSession';
import { getAreas, getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { roomMembershipIds, roomTechnicalIds, type RoomRegistry } from './roomMembership';

type RegistryLoad = {
  owner: Connection | null;
  epoch: number;
  status: 'loading' | 'ready' | 'error' | 'offline';
  data: RoomRegistry | null;
};
/** A room owns only read subscriptions; registry changes invalidate membership before reloading. */
export function useRoomRegistry(enabled = true) {
  const { conn } = useWidgetRuntime();
  const [epoch, setEpoch] = useState(0);
  const generation = useRef(0);
  const [load, setLoad] = useState<RegistryLoad>({
    owner: null,
    epoch: -1,
    status: 'loading',
    data: null,
  });
  useEffect(() => {
    const invalidate = () => {
      generation.current++;
      setEpoch((value) => value + 1);
    };
    window.addEventListener(CLIENT_SESSION_EVENT, invalidate);
    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('ready', invalidate);
      conn.addEventListener('disconnected', invalidate);
    }
    return () => {
      window.removeEventListener(CLIENT_SESSION_EVENT, invalidate);
      if (conn && typeof conn.removeEventListener === 'function') {
        conn.removeEventListener('ready', invalidate);
        conn.removeEventListener('disconnected', invalidate);
      }
    };
  }, [conn]);
  useEffect(() => {
    if (!enabled || !conn || conn.connected === false) return;
    let active = true,
      ticket = 0;
    const unsubscribes: Array<() => void> = [];
    const refresh = () => {
      if (!active || conn.connected === false) return;
      generation.current++;
      const current = ++ticket;
      setLoad({ owner: conn, epoch, status: 'loading', data: null });
      Promise.all([getAreas(conn), getEntityRegistry(conn), getDeviceRegistry(conn)]).then(
        ([areas, entities, devices]) => {
          if (active && current === ticket)
            setLoad({ owner: conn, epoch, status: 'ready', data: { areas, entities, devices } });
        },
        () => {
          if (active && current === ticket)
            setLoad({ owner: conn, epoch, status: 'error', data: null });
        }
      );
    };
    if (typeof conn.subscribeEvents === 'function') {
      for (const event of [
        'area_registry_updated',
        'entity_registry_updated',
        'device_registry_updated',
      ]) {
        void conn
          .subscribeEvents(refresh, event)
          .then((unsubscribe) => {
            if (active) unsubscribes.push(unsubscribe);
            else unsubscribe();
          })
          .catch(() => undefined);
      }
    }
    refresh();
    return () => {
      active = false;
      ticket++;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [conn, epoch, enabled]);
  const current =
    enabled && conn && conn.connected !== false && load.owner === conn && load.epoch === epoch
      ? load
      : null;
  const status = !conn || conn.connected === false ? 'offline' : (current?.status ?? 'loading');
  const session = getClientSession();
  return {
    status,
    registry: current?.status === 'ready' ? current.data : null,
    epoch,
    generation,
    controlEpoch: generation.current,
    identity: [session?.houseId ?? '', session?.user.id ?? '', session?.client.id ?? ''].join('|'),
    retry: () => setEpoch((value) => value + 1),
  };
}
export function useRoomMembership(settings: CardSettings) {
  const areaId =
    settings.roomMembershipSource === 'area' &&
    typeof settings.areaId === 'string' &&
    settings.areaId
      ? settings.areaId
      : null;
  const load = useRoomRegistry();
  const missing = Boolean(
    areaId &&
    load.status === 'ready' &&
    !load.registry?.areas.some((area) => area.area_id === areaId)
  );
  const ids = roomMembershipIds(settings, load.registry);
  return {
    ...load,
    registryStatus: load.status,
    ids,
    missing,
    status: areaId ? (missing ? ('missing' as const) : load.status) : ('ready' as const),
    technicalIds: roomTechnicalIds(ids, load.registry),
    areaName: areaId
      ? load.registry?.areas.find((area) => area.area_id === areaId)?.name
      : undefined,
  };
}
