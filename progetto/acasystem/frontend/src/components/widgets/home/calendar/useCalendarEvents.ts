import { useEffect, useState } from 'react';
import type { HaMessageConnection } from '@/@types/ha';
import { getCalendarEvents } from '@/api';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { mergeEvents, type CalendarEventView } from './calendarModel';

/** Legacy card: next 7 days, refreshed every 15 minutes. */
export const CARD_WINDOW_DAYS = 7;
export const CARD_REFRESH_MS = 15 * 60 * 1000;
/** Legacy modal: from today 00:00 for 30 days. */
export const DETAILS_WINDOW_DAYS = 30;

export interface CalendarEventsState {
  events: CalendarEventView[];
  /** First fetch for the current calendars still running. */
  loading: boolean;
  /** The last fetch failed; earlier events (if any) are kept. */
  error: boolean;
}

interface FetchState {
  key: string;
  events: CalendarEventView[];
  error: boolean;
}

export function useCalendarEvents(
  conn: HaMessageConnection | null,
  calendarIds: readonly string[],
  {
    days,
    fromStartOfDay = false,
    refreshMs,
  }: { days: number; fromStartOfDay?: boolean; refreshMs?: number }
): CalendarEventsState {
  const idsKey = calendarIds.join('|');
  const visible = usePageVisible();
  const [state, setState] = useState<FetchState | null>(null);

  useEffect(() => {
    if (!conn || !idsKey || !visible) return undefined;
    const ids = idsKey.split('|');
    let cancelled = false;
    const load = () => {
      const start = new Date();
      if (fromStartOfDay) start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() + days);
      getCalendarEvents(conn, { start, end, entityIds: ids })
        .then((result) => {
          if (!cancelled) setState({ key: idsKey, events: mergeEvents(result), error: false });
        })
        .catch(() => {
          if (!cancelled) {
            setState((current) => ({
              key: idsKey,
              events: current?.key === idsKey ? current.events : [],
              error: true,
            }));
          }
        });
    };
    load();
    const interval = refreshMs ? setInterval(load, refreshMs) : undefined;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [conn, idsKey, days, fromStartOfDay, refreshMs, visible]);

  if (!idsKey) return { events: [], loading: false, error: false };
  if (!conn) return { events: [], loading: true, error: false };
  if (state?.key !== idsKey) return { events: [], loading: true, error: false };
  return { events: state.events, loading: false, error: state.error };
}
