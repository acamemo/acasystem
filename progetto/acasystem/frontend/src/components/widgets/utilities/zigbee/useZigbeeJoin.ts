import { useEffect, useSyncExternalStore } from 'react';
import { useNow } from '@/hooks/launcher/useNow';
import type { ZigbeeDevice, ZigbeeNetwork } from './zigbeeData';
import { isZigbeeSessionCurrent, useZigbeeSession, ZIGBEE_COMMAND_TIMEOUT_MS } from './zigbeeSession';

/** ZHA and Zigbee2MQTT's existing permit-join command both bound this window. */
export const JOIN_SECONDS = 254;
export type JoinError = 'refused' | 'failed' | 'unknown' | 'unconfirmed' | null;
interface JoinRecord {
  until: number | null;
  knownIds: readonly string[];
  pending: boolean;
  opening: boolean;
  acknowledged: boolean;
  observed?: true;
  error: JoinError;
}
let windows = new WeakMap<object, Map<string, JoinRecord>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const recordOf = (scope: object | null, key: string) => scope ? windows.get(scope)?.get(key) ?? null : null;
const setRecord = (scope: object, key: string, next: JoinRecord | null) => {
  let records = windows.get(scope);
  if (!records) { records = new Map(); windows.set(scope, records); }
  if (next) records.set(key, next);
  else records.delete(key);
  emit();
};
export function resetZigbeeJoinWindows() { windows = new WeakMap(); emit(); }
export interface ZigbeeJoin {
  open: boolean;
  remainingMs: number | null;
  newDevices: ZigbeeDevice[];
  pending: boolean;
  error: JoinError;
  canStart: boolean;
  canStop: boolean;
  estimated: boolean;
  start: () => void;
  stop: () => void;
}
const errorOf = (error: unknown): JoinError => {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : null;
  return code === 'unauthorized' || code === 'forbidden' ? 'refused'
    : code === 'RESULT_UNKNOWN' ? 'unknown' : 'failed';
};

/** All consumers of one gateway share a synchronous lock; observing never sends a command. */
export function useZigbeeJoin(network: ZigbeeNetwork | null, enabled = true): ZigbeeJoin {
  const { runtime: { conn, callService, entities, editMode, services }, connected, visible, scope } = useZigbeeSession();
  const key = `${network?.integration}:${network?.gatewayId}`;
  const record = useSyncExternalStore(subscribe, () => recordOf(scope, key), () => null);
  const permitJoinId = network?.permitJoinId ?? null;
  const switchState = permitJoinId ? entities[permitJoinId]?.state : null;
  const usableSwitch = switchState === 'on' || switchState === 'off';
  const now = useNow(1000, visible && Boolean(record?.until)).getTime();
  const remainingMs = record?.until ? Math.max(0, record.until - now) : null;
  const open = network?.integration === 'zigbee2mqtt' ? switchState === 'on'
    : Boolean(record?.acknowledged && record.opening && remainingMs !== null && remainingMs > 0);
  const available = Boolean(network && conn && connected && visible && enabled && !editMode && network.online !== false);
  const zhaPermit = services === undefined || Boolean(services.zha?.permit);
  const canStart = available && !record?.pending && record?.error !== 'unknown' &&
    !(record?.acknowledged && record.opening && (remainingMs ?? 0) > 0) && !open &&
    (network?.integration === 'zha' ? zhaPermit : (usableSwitch && switchState === 'off'));
  const canStop = available && !record?.pending && !(record && !record.opening && (record.acknowledged || record.error === 'unknown')) &&
    (open || Boolean(record?.opening && record.error === 'unknown')) &&
    (network?.integration === 'zha' ? zhaPermit : usableSwitch);

  // These effects reconcile observed state; expiry/unmount never writes to the radio.
  useEffect(() => {
    if (scope && record && !record.pending && network?.integration === 'zha' &&
      record.acknowledged && record.until !== null && record.until <= now) setRecord(scope, key, null);
  }, [scope, key, record, network?.integration, now]);
  useEffect(() => {
    if (!scope || !record || record.pending || network?.integration !== 'zigbee2mqtt') return;
    if (record.observed && record.opening && switchState === 'off') { setRecord(scope, key, null); return; }
    if (record.acknowledged && (record.opening ? switchState === 'on' : switchState === 'off')) {
      if (!record.opening) setRecord(scope, key, null);
      else if (record.error || !record.observed) setRecord(scope, key, { ...record, observed: true, error: null });
      return;
    }
    if (!record.acknowledged || record.error) return;
    const timer = setTimeout(() => {
      if (recordOf(scope, key) === record) setRecord(scope, key, { ...record, error: 'unconfirmed' });
    }, 30_000);
    return () => clearTimeout(timer);
  }, [scope, key, record, network?.integration, switchState]);

  const run = (opening: boolean) => {
    const latest = recordOf(scope, key);
    if (!scope || !network || !conn || !isZigbeeSessionCurrent(conn, scope) ||
      latest?.pending || !(opening ? canStart : canStop)) return;
    // Also check the shared state synchronously, before every consumer has re-rendered.
    if (opening && (latest?.error === 'unknown' || (latest?.acknowledged && latest.opening &&
      latest.until !== null && latest.until > Date.now()))) return;
    if (!opening && latest && !latest.opening && (latest.acknowledged || latest.error === 'unknown')) return;
    const next: JoinRecord = { until: opening ? Date.now() + JOIN_SECONDS * 1000 : null,
      knownIds: network.devices.map((device) => device.id), pending: true,
      opening, acknowledged: false, error: null };
    setRecord(scope, key, next);
    const valid = () => isZigbeeSessionCurrent(conn, scope) && recordOf(scope, key) === next;
    const timer = setTimeout(() => {
      if (recordOf(scope, key) === next)
        setRecord(scope, key, { ...next, pending: false, error: 'unknown' });
    }, ZIGBEE_COMMAND_TIMEOUT_MS);
    let call: Promise<unknown>;
    try {
      call = network.integration === 'zha'
        ? callService('zha', 'permit', { duration: opening ? JOIN_SECONDS : 0 })
        : callService('switch', opening ? 'turn_on' : 'turn_off', { entity_id: permitJoinId });
    } catch (error) { call = Promise.reject(error); }
    Promise.resolve(call).then(() => {
      if (!valid()) return;
      setRecord(scope, key, { ...next, pending: false, acknowledged: true });
    }, (error: unknown) => {
      if (valid()) setRecord(scope, key, { ...next, pending: false, error: errorOf(error) });
    }).finally(() => { clearTimeout(timer); });
  };
  const known = new Set(record?.knownIds ?? []);
  return { open, remainingMs: open ? remainingMs : null,
    newDevices: open && record?.acknowledged && network ? network.devices.filter((device) => !known.has(device.id)) : [],
    pending: record?.pending ?? false, error: record?.error ?? null,
    canStart, canStop, estimated: network?.integration === 'zha',
    start: () => run(true), stop: () => run(false) };
}
