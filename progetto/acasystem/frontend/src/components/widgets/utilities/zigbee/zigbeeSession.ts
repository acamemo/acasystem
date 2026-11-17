import { useCallback, useSyncExternalStore } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import { getBackendOverride } from '@/api/backendClient';
import { getClientSession } from '@/api/clientSession';
import { profileUsageHeaders } from '@/api/usageProof';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';

const scopes = new WeakMap<Connection, { backend: unknown; connected: boolean; owner: string; key: object }>();
const connectionEpochs = new WeakMap<Connection, number>();
let activeConnection: Connection | null = null;
const ownerKey = () => {
  const session = getClientSession();
  const usage = profileUsageHeaders();
  return [session?.houseId, session?.user.id, session?.client.id,
    usage['x-aca-usage-session'], usage['x-aca-usage-lease']].join('|');
};

export function isZigbeeSessionCurrent(conn: Connection, scope: object): boolean {
  const entry = scopes.get(conn);
  return activeConnection === conn && entry?.key === scope && entry.backend === getBackendOverride() &&
    entry.owner === ownerKey() && conn.connected !== false;
}

/** A disconnect or backend switch invalidates an earlier A -> B -> A operation. */
export function useZigbeeSession() {
  const runtime = useWidgetRuntime();
  const { conn } = runtime;
  if (activeConnection !== conn) {
    if (conn) scopes.delete(conn);
    activeConnection = conn;
  }
  const visible = usePageVisible();
  const subscribe = useCallback((change: () => void) => {
    if (!conn?.addEventListener) return () => {};
    const changed = () => {
      scopes.delete(conn);
      connectionEpochs.set(conn, (connectionEpochs.get(conn) ?? 0) + 1);
      change();
    };
    conn.addEventListener('ready', changed);
    conn.addEventListener('disconnected', changed);
    return () => {
      conn.removeEventListener('ready', changed);
      conn.removeEventListener('disconnected', changed);
    };
  }, [conn]);
  const revision = useSyncExternalStore(subscribe, () => conn
    ? (connectionEpochs.get(conn) ?? 0) * 2 + (conn.connected !== false ? 1 : 0) : 0, () => 0);
  const connected = !!conn && revision % 2 === 1;
  const backend = getBackendOverride();
  const owner = ownerKey();
  let scope: object | null = null;
  if (conn) {
    let entry = scopes.get(conn);
    if (!entry || entry.backend !== backend || entry.connected !== connected || entry.owner !== owner) {
      entry = { backend, connected, owner, key: {} };
      scopes.set(conn, entry);
    }
    scope = entry.key;
  }
  return { runtime, visible, connected, scope };
}

export const ZIGBEE_READ_TIMEOUT_MS = 12_000;
export const ZIGBEE_COMMAND_TIMEOUT_MS = 60_000;
