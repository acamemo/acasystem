import { useEffect, useState } from 'react';
import { getAreas, getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { useOptionalWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { entitiesByArea } from '@/components/widgets/utilities/fullpage/roomsData';

type RoomOf = Record<string, string>;

const CACHE_MS = 30_000;
const cache = new WeakMap<object, { at: number; rooms: Promise<RoomOf> }>();

function readRooms(conn: NonNullable<ReturnType<typeof useOptionalWidgetRuntime>>['conn']) {
  const previous = conn ? cache.get(conn) : undefined;
  if (previous && Date.now() - previous.at < CACHE_MS) return previous.rooms;
  const rooms = Promise.all([
    getAreas(conn),
    getEntityRegistry(conn),
    getDeviceRegistry(conn),
  ]).then(([areas, entityRegistry, devices]) => {
    const byArea = entitiesByArea(areas, entityRegistry, devices);
    const result: RoomOf = {};
    for (const area of areas) {
      for (const id of byArea[area.area_id] ?? []) {
        if (area.name && !(id in result)) result[id] = area.name;
      }
    }
    return result;
  });
  if (conn) cache.set(conn, { at: Date.now(), rooms });
  return rooms;
}

/**
 * Room (area) name of each entity, so a list can say «Salotto» instead of showing an id.
 * Empty until the registries are read, and when there is no connection or no areas.
 */
export function useEntityRooms(): RoomOf {
  const conn = useOptionalWidgetRuntime()?.conn ?? null;
  const [rooms, setRooms] = useState<RoomOf>({});
  useEffect(() => {
    if (!conn) return;
    let cancelled = false;
    readRooms(conn).then(
      (result) => {
        if (!cancelled) setRooms(result);
      },
      () => {
        if (!cancelled) setRooms({});
      }
    );
    return () => {
      cancelled = true;
    };
  }, [conn]);
  return rooms;
}
