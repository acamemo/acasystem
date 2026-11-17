import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIVITY_CHANGED_EVENT, readActivity, type ActivityEvent, type ActivityPage, type ActivityQuery } from '@/api/activityApi';
import { CLIENT_SESSION_EVENT } from '@/api/clientSession';
import { reportDiagnostic } from '@/api/diagnosticApi';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';

export function useActivity(query: ActivityQuery = {}, paused = false) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [page, setPage] = useState<ActivityPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const requestId = useRef(0);
  const visible = usePageVisible();
  const queryKey = JSON.stringify(query);
  const read = useCallback(async (before?: number) => {
    if (paused || !visible) return;
    const version = generation.current;
    const request = ++requestId.current;
    setLoading(true);
    try {
      const result = await readActivity({ ...JSON.parse(queryKey) as ActivityQuery, ...(before ? { before } : {}) });
      if (version !== generation.current || request !== requestId.current) return;
      setPage(result); setError(false);
      setEvents((previous) => {
        const byId = new Map(previous.map((event) => [event.id, event]));
        for (const event of result.events) byId.set(event.id, event);
        if (!result.availableFrom && !result.events.length) return [];
        const serverNow = result.serverNow ? Date.parse(result.serverNow) : Date.now();
        const cutoff = Math.max(serverNow - 7 * 24 * 60 * 60 * 1000, result.availableFrom ? Date.parse(result.availableFrom) - 1 : 0);
        return [...byId.values()].filter((event) => Date.parse(event.at) > cutoff).sort((a, b) => b.id - a.id).slice(0, 5000);
      });
    } catch {
      if (version === generation.current && request === requestId.current) { setError(true); reportDiagnostic('client.activity_unavailable'); }
    } finally { if (version === generation.current && request === requestId.current) setLoading(false); }
  }, [paused, queryKey, visible]);
  useEffect(() => {
    generation.current += 1; setEvents([]); setPage(null);
    void read();
    const refresh = () => { void read(); };
    const session = () => { generation.current += 1; setEvents([]); setPage(null); void read(); };
    window.addEventListener(ACTIVITY_CHANGED_EVENT, refresh);
    window.addEventListener(CLIENT_SESSION_EVENT, session);
    const timer = paused || !visible ? null : setInterval(refresh, 15_000);
    return () => {
      generation.current += 1;
      if (timer) clearInterval(timer);
      window.removeEventListener(ACTIVITY_CHANGED_EVENT, refresh);
      window.removeEventListener(CLIENT_SESSION_EVENT, session);
    };
  }, [paused, read, visible]);
  return { events, page, loading, error, refresh: () => read(),
    loadMore: () => page?.nextCursor ? read(page.nextCursor) : Promise.resolve() };
}
