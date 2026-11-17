import { createContext, useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { WidgetRuntime } from '@/@types/launcher';
import { getClientSession } from '@/api/clientSession';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useWidgetRuntime, WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { useRuntimeServiceCatalog } from '../../adaptive/useServiceCatalog';
import { roomServiceAllowed } from './roomCapabilities';
import { useRoomMembership } from './useRoomMembership';
import { ROOM_ROLES } from './roomMembership';

type Membership = ReturnType<typeof useRoomMembership>;
const RoomContext = createContext<Membership | null>(null);
export const useRoomContext = () => useContext(RoomContext);

function RoomSession({
  membership,
  settings,
  visible,
  current,
  token,
  children,
}: {
  membership: Membership;
  settings: CardSettings;
  visible: boolean;
  current: { current: number };
  token: number;
  children: (settings: CardSettings) => ReactNode;
}) {
  const runtime = useWidgetRuntime();
  const session = getClientSession();
  const services = useRuntimeServiceCatalog(runtime);
  const mounted = useRef(false);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const live = useRef({ runtime, membership, visible, services });
  live.current = { runtime, membership, visible, services };
  useLayoutEffect(() => {
    const activeTimers = timers.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, []);
  const pending = useRef(new Map<string, Promise<unknown>>());
  const callService = useMemo<WidgetRuntime['callService']>(
    () =>
      (domain, service, data = {}) => {
        const now = live.current;
        const session = getClientSession();
        const sessionIdentity = [
          session?.houseId ?? '',
          session?.user.id ?? '',
          session?.client.id ?? '',
        ].join('|');
        const raw = data.entity_id;
        const ids = typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw : [];
        if (
          !mounted.current ||
          current.current !== token ||
          !now.visible ||
          document.visibilityState === 'hidden' ||
          now.membership.status !== 'ready' ||
          now.membership.registryStatus !== 'ready' ||
          now.membership.controlEpoch !== now.membership.generation.current ||
          sessionIdentity !== now.membership.identity ||
          session?.offline ||
          session?.client.revokedAt ||
          now.runtime.editMode ||
          !now.runtime.entitiesLoaded ||
          !now.runtime.conn ||
          now.runtime.conn.connected === false ||
          data.target !== undefined ||
          ids.length === 0 ||
          ids.some(
            (id) =>
              typeof id !== 'string' ||
              !now.membership.ids.includes(id) ||
              !id.startsWith(`${domain}.`) ||
              !roomServiceAllowed(now.runtime.entities[id], now.services, domain, service, data)
          )
        ) {
          return Promise.reject(new Error('Comando non disponibile per questa stanza.'));
        }
        const signature = JSON.stringify([domain, service, data]);
        const existing = pending.current.get(signature);
        if (existing) return existing;
        // The existing tracked control owns its timeout. The in-flight lock must also expire so a
        // lost service reply cannot prevent a deliberate retry after that visible timeout.
        const timeout = setTimeout(() => {
          pending.current.delete(signature);
          timers.current.delete(timeout);
        }, 30_000);
        timers.current.add(timeout);
        const request = new Promise<unknown>((resolve) =>
          resolve(now.runtime.callService(domain, service, data))
        ).finally(() => {
          clearTimeout(timeout);
          timers.current.delete(timeout);
          if (pending.current.get(signature) === request) pending.current.delete(signature);
        });
        pending.current.set(signature, request);
        return request;
      },
    [current, token]
  );
  const scopedSettings = {
    ...settings,
    entityIds: membership.ids,
    includedEntityIds: [],
    excludedEntityIds: [],
  };
  const entities = Object.fromEntries(
    membership.ids.flatMap((id) => (runtime.entities[id] ? [[id, runtime.entities[id]]] : []))
  );
  return (
    <RoomContext.Provider value={membership}>
      <WidgetRuntimeProvider
        value={{
          ...runtime,
          entities,
          services: services ?? {},
          callService,
          conn:
            visible &&
            membership.status === 'ready' &&
            membership.registryStatus === 'ready' &&
            !session?.offline &&
            !session?.client.revokedAt
              ? runtime.conn
              : null,
        }}
      >
        {children(scopedSettings)}
      </WidgetRuntimeProvider>
    </RoomContext.Provider>
  );
}

/** Old callbacks retain their own generation; returning to the same account/connection cannot revive them. */
export function RoomScope({
  settings,
  children,
}: {
  settings: CardSettings;
  children: (settings: CardSettings) => ReactNode;
}) {
  const runtime = useWidgetRuntime(),
    visible = usePageVisible();
  const membership = useRoomMembership(settings);
  const signature = JSON.stringify([
    settings.areaId,
    settings.roomMembershipSource,
    ROOM_ROLES.map(key => settings[key]),
    membership.ids,
    membership.status,
    membership.registryStatus,
    membership.controlEpoch,
    membership.epoch,
    membership.identity,
    visible,
    runtime.entitiesLoaded,
    runtime.editMode,
    runtime.conn?.connected,
  ]);
  const previous = useRef({ signature, conn: runtime.conn, call: runtime.callService });
  const generation = useRef(0);
  if (
    previous.current.signature !== signature ||
    previous.current.conn !== runtime.conn ||
    previous.current.call !== runtime.callService
  ) {
    generation.current++;
    previous.current = { signature, conn: runtime.conn, call: runtime.callService };
  }
  return (
    <RoomSession
      key={generation.current}
      membership={membership}
      settings={settings}
      visible={visible}
      current={generation}
      token={generation.current}
    >
      {children}
    </RoomSession>
  );
}
