import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HaMessageConnection } from '@/@types/ha';
import { CLIENT_SESSION_EVENT, getClientSession } from '@/api/clientSession';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';

/** Local read/command scope: invalidated synchronously before a reconnect or account ABA can settle. */
export function useAgendaScope(conn: HaMessageConnection | null, source: string, enabled = true) {
  const visible = usePageVisible();
  const [epoch, setEpoch] = useState(0);
  const session = getClientSession();
  const owner = session ? JSON.stringify([session.houseId, session.user.id, session.client.id]) : 'local';
  const active = visible && enabled && !!conn && conn.connected !== false && !session?.offline && navigator.onLine !== false;
  const token = useMemo(() => ({ conn, source, owner, active, epoch, valid: true }),
    [conn, source, owner, active, epoch]);
  const latest = useRef(token);
  // Old callbacks fail immediately, including the render before effect cleanup.
  if (latest.current !== token) latest.current.valid = false;
  latest.current = token;
  useEffect(() => {
    token.valid = true;
    const invalidate = () => {
      token.valid = false;
      setEpoch((value) => value + 1);
    };
    const events = conn as (HaMessageConnection & {
      addEventListener?: (name: 'ready' | 'disconnected', callback: () => void) => void;
      removeEventListener?: (name: 'ready' | 'disconnected', callback: () => void) => void;
    }) | null;
    window.addEventListener(CLIENT_SESSION_EVENT, invalidate);
    window.addEventListener('online', invalidate);
    window.addEventListener('offline', invalidate);
    events?.addEventListener?.('ready', invalidate);
    events?.addEventListener?.('disconnected', invalidate);
    return () => {
      token.valid = false;
      window.removeEventListener(CLIENT_SESSION_EVENT, invalidate);
      window.removeEventListener('online', invalidate);
      window.removeEventListener('offline', invalidate);
      events?.removeEventListener?.('ready', invalidate);
      events?.removeEventListener?.('disconnected', invalidate);
    };
  }, [conn, token]);
  const current = useCallback(() => latest.current === token && token.valid && token.active &&
    conn?.connected !== false && document.visibilityState !== 'hidden', [conn, token]);
  return useMemo(() => ({ token, owner, active, current }), [token, owner, active, current]);
}

export const AGENDA_READ_TIMEOUT_MS = 12_000;
export const AGENDA_COMMAND_TIMEOUT_MS = 20_000;

export function boundedAgendaRead<T>(request: Promise<T>, ms = AGENDA_READ_TIMEOUT_MS) {
  let timer: ReturnType<typeof setTimeout>;
  const promise = Promise.race([request, new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('Agenda timeout'), { code: 'RESULT_UNKNOWN' })), ms);
  })]);
  return { promise, clear: () => clearTimeout(timer) };
}
