import { useCallback, useEffect, useRef, useState } from 'react';
import type { HaMessageConnection } from '@/@types/ha';
import { getCalendarEvents } from '@/api';
import { isCalendarEvent } from '@/validators/haPayloads';
import { readKey } from '@/validators/guards';
import { addDays } from '../shared/format';
import { boundedAgendaRead, useAgendaScope } from './agendaRead';
import {
  calendarDay, calendarMidnight, mergeEvents, toEventView, type CalendarEventView,
} from './calendarModel';

/** Validate before the broad legacy adapter can discard malformed entries as an empty array. */
function hasCalendarResponse(value: unknown, ids: string[]): boolean {
  const at = (...path: string[]) => path.reduce<unknown>((current, key) => readKey(current, key), value);
  const containers = [at('service_response', 'calendar'), at('service_response'), at('response', 'calendar'),
    at('response'), at('result', 'calendar'), at('result'), at('calendar'), value];
  return ids.every((id) => {
    let events: unknown;
    for (const container of containers) {
      const candidate = readKey(container, id);
      const list = Array.isArray(candidate) ? candidate : readKey(candidate, 'events');
      if (Array.isArray(list)) { events = list; break; }
    }
    if (!Array.isArray(events) && ids.length === 1) events = at('events');
    return Array.isArray(events) && events.every((event, index) =>
      isCalendarEvent(event) && toEventView(event, id, index) !== null);
  });
}

export const CARD_WINDOW_DAYS = 7;
export const CARD_REFRESH_MS = 15 * 60 * 1000;
export const DETAILS_WINDOW_DAYS = 30;

export interface CalendarEventsState {
  events: CalendarEventView[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  updatedAt: Date | null;
}
export function useCalendarEvents(
  conn: HaMessageConnection | null, calendarIds: readonly string[],
  { days, fromStartOfDay = false, refreshMs, enabled = true, timeZone }: {
    days: number; fromStartOfDay?: boolean; refreshMs?: number;
    enabled?: boolean; timeZone?: string;
  }
): CalendarEventsState {
  const idsKey = JSON.stringify([...new Set(calendarIds)]);
  const scope = useAgendaScope(conn, JSON.stringify([idsKey, days, fromStartOfDay, timeZone]),
    enabled && calendarIds.length > 0);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const [state, setState] = useState<{
    token: object; events: CalendarEventView[]; error: boolean; updatedAt: Date | null;
  } | null>(null);
  const latest = useRef(scope);
  latest.current = scope;
  useEffect(() => {
    if (!scope.active || !conn) return;
    let cancelled = false, inFlight = false;
    let clearRead = () => {};
    const load = async () => {
      if (cancelled || inFlight || !latest.current.current()) return;
      inFlight = true;
      const current = () => !cancelled && scope.token === latest.current.token && scope.current();
      try {
        const now = new Date();
        const start = fromStartOfDay ? calendarMidnight(calendarDay(now, timeZone), timeZone) : now;
        const end = calendarMidnight(addDays(calendarDay(now, timeZone), days), timeZone);
        // A rolling window retains the actual time-of-day; whole-day details stop at midnight.
        if (!fromStartOfDay) end.setTime(end.getTime() +
          now.getTime() - calendarMidnight(calendarDay(now, timeZone), timeZone).getTime());
        const ids: string[] = JSON.parse(idsKey);
        const guarded: HaMessageConnection = {
          get connected() { return conn.connected; },
          sendMessagePromise: async (message) => {
            if (!current()) throw new Error('Agenda scope changed');
            const response = await conn.sendMessagePromise(message);
            if (!current()) throw new Error('Agenda scope changed');
            if (!hasCalendarResponse(response, ids)) throw new Error('Invalid calendar response');
            return response;
          },
        };
        const request = boundedAgendaRead(getCalendarEvents(guarded, { start, end, entityIds: ids }));
        clearRead = request.clear;
        const result = await request.promise;
        if (!ids.every((id) => Object.hasOwn(result, id) && Array.isArray(result[id]?.events)))
          throw new Error('Incomplete calendar response');
        if (current()) setState({
          token: scope.token, events: mergeEvents(result, ids, timeZone), error: false, updatedAt: new Date(),
        });
      } catch {
        if (current()) setState((previous) => previous?.token === scope.token
          ? { ...previous, error: true }
          : { token: scope.token, events: [], error: true, updatedAt: null });
      } finally { clearRead(); inFlight = false; }
    };
    void load();
    const timer = refreshMs ? setInterval(() => void load(), refreshMs) : undefined;
    return () => { cancelled = true; clearRead(); if (timer) clearInterval(timer); };
  }, [scope, conn, idsKey, days, fromStartOfDay, timeZone, refreshMs, revision]);
  if (!calendarIds.length || !enabled)
    return { events: [], loading: false, error: false, retry, updatedAt: null };
  if (!scope.active)
    return { events: [], loading: false, error: !conn || conn.connected === false || navigator.onLine === false, retry, updatedAt: null };
  if (state?.token !== scope.token)
    return { events: [], loading: true, error: false, retry, updatedAt: null };
  return { ...state, loading: false, retry };
}
