import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isObject } from '@/validators/guards';
import { readZigbeeNetworks, type ZigbeeNetwork, type ZigbeeRegistries } from './zigbeeData';
import { isZigbeeSessionCurrent, useZigbeeSession, ZIGBEE_READ_TIMEOUT_MS } from './zigbeeSession';

export type ZigbeeNetworkState = {
  status: 'loading' | 'none' | 'error' | 'inactive'; retry: () => void;
} | {
  status: 'ready'; network: ZigbeeNetwork; stale: boolean; refreshing: boolean;
  isAdmin: boolean | null; retry: () => void;
};

async function loadRegistries(
  send: (message: Record<string, unknown>) => Promise<unknown>
): Promise<ZigbeeRegistries> {
  const [devices, entities, zhaEntries, user] = await Promise.all([
    send({ type: 'config/device_registry/list' }),
    send({ type: 'config/entity_registry/list' }),
    send({ type: 'config_entries/get', domain: 'zha' }).catch(() => null),
    send({ type: 'auth/current_user' }).catch(() => null),
  ]);
  if (!Array.isArray(devices) || !Array.isArray(entities)) throw new Error('Invalid Zigbee registries');
  const entry = Array.isArray(zhaEntries) ? zhaEntries.find(isObject) : undefined;
  return {
    devices, entities,
    zhaEntryState: typeof entry?.state === 'string' ? entry.state : null,
    isAdmin: isObject(user) && typeof user.is_admin === 'boolean' ? user.is_admin : null,
  };
}

/** Registry membership is observed, never inferred from a successful permit call. */
export function useZigbeeNetwork(): ZigbeeNetworkState {
  const { runtime: { conn, entities, entitiesLoaded }, visible, connected, scope: sessionScope } = useZigbeeSession();
  const scope = useMemo(() => sessionScope ? { sessionScope } : null, [sessionScope]);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const [snapshot, setSnapshot] = useState<{
    scope: object; registries: ZigbeeRegistries | null; failed: boolean; refreshing: boolean;
  } | null>(null);
  const entityKey = Object.keys(entities).sort().join('|');
  const entityKeyRef = useRef(entityKey);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (entityKeyRef.current === entityKey) return;
    entityKeyRef.current = entityKey;
    refreshRef.current();
  }, [entityKey]);

  useEffect(() => {
    if (!conn || !scope || !visible || !connected || !entitiesLoaded) return;
    let active = true;
    let running = false;
    let queued = false;
    let requestTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribes: Array<() => unknown> = [];
    const load = async () => {
      if (!active || !sessionScope || !isZigbeeSessionCurrent(conn, sessionScope)) return;
      if (running) { queued = true; return; }
      running = true;
      setSnapshot((previous) => ({ scope,
        registries: previous?.scope === scope ? previous.registries : null,
        failed: previous?.scope === scope ? previous.failed : false, refreshing: true }));
      try {
        const registries = await Promise.race([
          loadRegistries((message) => conn.sendMessagePromise(message as never)),
          new Promise<never>((_resolve, reject) => {
            requestTimer = setTimeout(() => reject(new Error('Zigbee read timeout')), ZIGBEE_READ_TIMEOUT_MS);
          }),
        ]);
        if (active && sessionScope && isZigbeeSessionCurrent(conn, sessionScope))
          setSnapshot({ scope, registries, failed: false, refreshing: false });
      } catch {
        if (active && sessionScope && isZigbeeSessionCurrent(conn, sessionScope)) setSnapshot((previous) => ({ scope,
          registries: previous?.scope === scope ? previous.registries : null,
          failed: true, refreshing: false }));
      } finally {
        clearTimeout(requestTimer);
        running = false;
        if (active && queued) { queued = false; void load(); }
      }
    };
    refreshRef.current = () => void load();
    void load();
    if (typeof conn.subscribeEvents === 'function') {
      for (const event of ['device_registry_updated', 'entity_registry_updated']) {
        void conn.subscribeEvents(() => { if (active) void load(); }, event).then((unsubscribe) => {
          if (active) unsubscribes.push(unsubscribe);
          else void Promise.resolve().then(unsubscribe).catch(() => {});
        }).catch(() => {});
      }
    }
    const timer = setInterval(() => void load(), 60_000);
    return () => {
      active = false;
      refreshRef.current = () => {};
      clearTimeout(requestTimer);
      clearInterval(timer);
      unsubscribes.forEach((unsubscribe) => { void Promise.resolve().then(unsubscribe).catch(() => {}); });
    };
  }, [conn, scope, sessionScope, visible, connected, entitiesLoaded, revision]);

  const current = snapshot?.scope === scope ? snapshot : null;
  const network = useMemo(() => current?.registries
    ? readZigbeeNetworks(current.registries, entities)[0] ?? null : null, [current, entities]);
  if (network) return { status: 'ready', network, stale: current!.failed || !connected || !visible,
    refreshing: current!.refreshing, isAdmin: current!.registries!.isAdmin ?? null, retry };
  if (!visible) return { status: 'inactive', retry };
  if (!connected || current?.failed) return { status: 'error', retry };
  if (current?.registries) return { status: 'none', retry };
  return { status: 'loading', retry };
}
