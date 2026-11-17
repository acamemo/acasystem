import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Body, Button, Caption, Skeleton } from '@/components/primitives';
import type { Connection } from '@/@types/ha';
import { getAreas, getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { CLIENT_SESSION_EVENT, getClientSession } from '@/api/clientSession';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { roomAreaIds, type RoomRegistry } from '@/components/widgets/utilities/room/roomMembership';
import { PickRow } from './parts/EntityPicker';
import { Notice } from './parts/Form';
import { useDomId } from './parts/hooks';
import type { RoomArea } from '@/domain/launcher/roomCards';

export interface RoomSelection {
  areas: RoomArea[];
  entitiesById: Record<string, string[]>;
}
export const ROOM_PICKER_TIMEOUT_MS = 15_000;
const sessionKey = () => {
  const session = getClientSession();
  return [session?.houseId ?? '', session?.user.id ?? '', session?.client.id ?? ''].join('|');
};

/** Invalidation is synchronous, including an owner/connection ABA cycle between React commits. */
export function useRoomAssociationScope(conn: Connection | null, source = '') {
  const live = useOptionalLiveProfiles(),
    visible = usePageVisible();
  const [, setEpoch] = useState(0),
    generation = useRef(0),
    mounted = useRef(false);
  const owner = useCallback(() => {
    const snapshot = live?.coordinator.snapshot();
    return [
      snapshot?.profile?.id ?? '',
      snapshot?.editor?.id ?? '',
      snapshot?.offline === true ? 'offline' : 'online',
    ].join('|');
  }, [live?.coordinator]);
  const signature = JSON.stringify([source, owner(), sessionKey(), visible, conn?.connected]);
  const previous = useRef({ conn, signature, coordinator: live?.coordinator });
  if (
    previous.current.conn !== conn ||
    previous.current.signature !== signature ||
    previous.current.coordinator !== live?.coordinator
  ) {
    generation.current++;
    previous.current = { conn, signature, coordinator: live?.coordinator };
  }
  const writable = () => live?.coordinator.snapshot().offline !== true;
  const latest = useRef({
    conn,
    owner: owner(),
    session: sessionKey(),
    visible,
    ownerNow: owner,
    writable,
  });
  latest.current = {
    conn,
    owner: owner(),
    session: sessionKey(),
    visible,
    ownerNow: owner,
    writable,
  };
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const invalidate = () => {
      generation.current++;
      setEpoch((value) => value + 1);
    };
    window.addEventListener(CLIENT_SESSION_EVENT, invalidate);
    document.addEventListener('visibilitychange', invalidate);
    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('ready', invalidate);
      conn.addEventListener('disconnected', invalidate);
    }
    let previousOwner = owner();
    const unsubscribe =
      typeof live?.coordinator.subscribe === 'function'
        ? live.coordinator.subscribe(() => {
            const now = owner();
            if (now !== previousOwner) {
              previousOwner = now;
              invalidate();
            }
          })
        : undefined;
    return () => {
      window.removeEventListener(CLIENT_SESSION_EVENT, invalidate);
      document.removeEventListener('visibilitychange', invalidate);
      if (conn && typeof conn.removeEventListener === 'function') {
        conn.removeEventListener('ready', invalidate);
        conn.removeEventListener('disconnected', invalidate);
      }
      unsubscribe?.();
    };
  }, [conn, live?.coordinator, owner]);
  const isCurrent = useCallback((token: number) => {
    const now = latest.current,
      session = getClientSession();
    return (
      mounted.current &&
      generation.current === token &&
      !!now.conn &&
      now.conn.connected !== false &&
      now.visible &&
      document.visibilityState !== 'hidden' &&
      now.ownerNow() === now.owner &&
      now.writable() &&
      sessionKey() === now.session &&
      !session?.offline &&
      !session?.client.revokedAt
    );
  }, []);
  const session = getClientSession();
  return {
    token: generation.current,
    isCurrent,
    available: Boolean(
      conn &&
      conn.connected !== false &&
      writable() &&
      !session?.offline &&
      !session?.client.revokedAt
    ),
  };
}

/** An area choice never commits a partially loaded registry snapshot. */
export function RoomPicker({
  conn,
  query,
  selection,
  onChange,
  onAvailabilityChange,
}: {
  conn: Connection | null;
  query: string;
  selection: RoomSelection;
  onChange: (next: RoomSelection | ((previous: RoomSelection) => RoomSelection)) => void;
  onAvailabilityChange?: (available: boolean) => void;
}) {
  const labelId = useDomId('stanze'),
    scope = useRoomAssociationScope(conn);
  const scopeToken = scope.token,
    isScopeCurrent = scope.isCurrent;
  const [retry, setRetry] = useState(0);
  const [load, setLoad] = useState<{
    token: number;
    status: 'loading' | 'ready' | 'error';
    registry?: RoomRegistry;
  }>({ token: -1, status: 'loading' });
  const latest = useRef({ onChange, onAvailabilityChange });
  latest.current = { onChange, onAvailabilityChange };
  useEffect(() => {
    const token = scopeToken;
    if (!conn || !isScopeCurrent(token)) {
      latest.current.onAvailabilityChange?.(false);
      return;
    }
    let active = true,
      request = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>(),
      unsubscribes: Array<() => void> = [];
    const refresh = () => {
      if (!active || !isScopeCurrent(token)) return;
      const current = ++request;
      latest.current.onAvailabilityChange?.(false);
      setLoad({ token, status: 'loading' });
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Tempo scaduto')), ROOM_PICKER_TIMEOUT_MS);
        timers.add(timer);
      });
      void Promise.race([
        Promise.all([getAreas(conn), getEntityRegistry(conn), getDeviceRegistry(conn)]),
        timeout,
      ])
        .then(
          ([areas, entities, devices]) => {
            if (!active || current !== request || !isScopeCurrent(token)) return;
            const registry = { areas, entities, devices };
            setLoad({ token, status: 'ready', registry });
            latest.current.onChange((previousSelection) => {
              if (!previousSelection.areas.length) return previousSelection;
              const currentAreas = previousSelection.areas.flatMap((area) => {
                const entry = areas.find((candidate) => candidate.area_id === area.area_id);
                return entry
                  ? [
                      {
                        area_id: entry.area_id,
                        name: entry.name,
                        icon: typeof entry.icon === 'string' ? entry.icon : null,
                      },
                    ]
                  : [];
              });
              return {
                areas: currentAreas,
                entitiesById: Object.fromEntries(
                  currentAreas.map((area) => [area.area_id, roomAreaIds(area.area_id, registry)])
                ),
              };
            });
            latest.current.onAvailabilityChange?.(true);
          },
          () => {
            if (active && current === request && isScopeCurrent(token))
              setLoad({ token, status: 'error' });
          }
        )
        .finally(() => {
          clearTimeout(timer);
          timers.delete(timer);
        });
    };
    if (typeof conn.subscribeEvents === 'function')
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
    refresh();
    return () => {
      active = false;
      request++;
      timers.forEach(clearTimeout);
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [conn, scopeToken, isScopeCurrent, retry]);

  if (!conn || conn.connected === false || !scope.available)
    return <Notice>Collega la casa per vedere le sue aree.</Notice>;
  const current = load.token === scope.token ? load : null;
  if (!current || current.status === 'loading')
    return <Skeleton rows={3} label="Caricamento delle stanze…" />;
  if (current.status === 'error' || !current.registry)
    return (
      <Notice tone="danger">
        Impossibile caricare le aree.
        <Button variant="control" onClick={() => setRetry((value) => value + 1)}>
          Riprova
        </Button>
      </Notice>
    );
  const registry = current.registry;
  const areas = registry.areas
    .map((area) => ({
      area_id: area.area_id,
      name: area.name,
      icon: typeof area.icon === 'string' ? area.icon : null,
    }))
    .sort((left, right) =>
      (left.name || left.area_id).localeCompare(right.name || right.area_id, 'it')
    );
  const needle = query.trim().toLocaleLowerCase('it-IT');
  const visible = areas.filter(
    (area) => !needle || (area.name || area.area_id).toLocaleLowerCase('it-IT').includes(needle)
  );
  return (
    <div className="aca-pick" role="group" aria-labelledby={labelId}>
      <Body as="span" size="sm" id={labelId} className="aca-form-row__label">
        Aree della casa
      </Body>
      {areas.length === 0 ? (
        <Caption as="p" className="aca-pick__empty">
          Nessuna area trovata.
        </Caption>
      ) : visible.length === 0 ? (
        <Caption as="p" className="aca-pick__empty">
          Nessuna area per «{query.trim()}».
        </Caption>
      ) : (
        <ul className="aca-pick__list">
          {visible.map((area) => {
            const selected = selection.areas.some((item) => item.area_id === area.area_id);
            const ids = roomAreaIds(area.area_id, registry);
            return (
              <li key={area.area_id}>
                <PickRow
                  title={area.name || area.area_id}
                  subtitle={
                    selected
                      ? `${ids.length} ${ids.length === 1 ? 'entità trovata' : 'entità trovate'}`
                      : area.area_id
                  }
                  selected={selected}
                  disabled={!scope.isCurrent(scope.token)}
                  onClick={() => {
                    if (!scope.isCurrent(scope.token)) return;
                    onChange((previousSelection) => ({
                      areas: selected
                        ? previousSelection.areas.filter((item) => item.area_id !== area.area_id)
                        : [...previousSelection.areas, area],
                      entitiesById: { ...previousSelection.entitiesById, [area.area_id]: ids },
                    }));
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
