import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIVITY_CHANGED_EVENT, readActivity, type ActivityPage, type ActivityQuery } from '@/api/activityApi';
import { CLIENT_SESSION_EVENT } from '@/api/clientSession';
import { reportDiagnostic } from '@/api/diagnosticApi';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { isObject } from '@/validators/guards';

export const ACTIVITY_PAGE_SIZE = 30;
type Cursor = number | undefined;
interface PageState { key: string; page: ActivityPage | null; cursors: Cursor[]; index: number }

/** A bounded server page. The recent-widget feed deliberately keeps its independent hook. */
export function useActivityPage(query: ActivityQuery, paused = false) {
  const key = JSON.stringify(query);
  const [state, setState] = useState<PageState>({ key, page: null, cursors: [undefined], index: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [unsupportedAge, setUnsupportedAge] = useState(false);
  const [invalidAnchor, setInvalidAnchor] = useState(false);
  const visible = usePageVisible();
  const generation = useRef(0);
  const requestId = useRef(0);
  const currentKey = useRef(key);
  const current = useRef(state);
  currentKey.current = key;
  current.current = state;

  const read = useCallback(async (cursors: Cursor[], index: number, asOf?: string) => {
    if (paused || !visible) return;
    const version = generation.current;
    const request = ++requestId.current;
    const filters = JSON.parse(key) as ActivityQuery;
    setLoading(true);
    try {
      const result = await readActivity({ ...filters, limit: ACTIVITY_PAGE_SIZE,
        ...(cursors[index] !== undefined ? { before: cursors[index] } : {}), ...(asOf ? { asOf } : {}) });
      if (version !== generation.current || request !== requestId.current || key !== currentKey.current) return;
      // An older central must not silently present unfiltered results as an age bucket.
      if (filters.ageDays !== undefined && (!result.asOf || !result.serverNow)) {
        setUnsupportedAge(true); setError(true);
        setState({ key, page: null, cursors: [undefined], index: 0 });
        return;
      }
      setState({ key, page: result, cursors, index });
      setUnsupportedAge(false); setInvalidAnchor(false); setError(false);
    } catch (failure) {
      if (version === generation.current && request === requestId.current && key === currentKey.current) {
        if (isObject(failure) && isObject(failure.body) && failure.body.code === 'INVALID_ANCHOR') {
          const fresh: PageState = { key, page: null, cursors: [undefined], index: 0 };
          current.current = fresh; setState(fresh); setInvalidAnchor(true);
        }
        setError(true); reportDiagnostic('client.activity_unavailable');
      }
    } finally {
      if (version === generation.current && request === requestId.current && key === currentKey.current) setLoading(false);
    }
  }, [key, paused, visible]);

  const refreshCurrent = useCallback(() => {
    const value = current.current;
    const same = value.key === key;
    const index = same ? value.index : 0;
    // Page one refreshes the server clock; older pages keep the same age-window anchor.
    return read(same ? value.cursors : [undefined], index, index ? value.page?.asOf : undefined);
  }, [key, read]);

  useEffect(() => {
    generation.current += 1;
    const fresh: PageState = { key, page: null, cursors: [undefined], index: 0 };
    current.current = fresh; setState(fresh); setLoading(false);
    setError(false); setUnsupportedAge(false); setInvalidAnchor(false);
    void read([undefined], 0);
    const session = () => {
      generation.current += 1;
      const fresh: PageState = { key, page: null, cursors: [undefined], index: 0 };
      current.current = fresh; setState(fresh);
      void read([undefined], 0);
    };
    const update = () => { void refreshCurrent(); };
    window.addEventListener(CLIENT_SESSION_EVENT, session);
    window.addEventListener(ACTIVITY_CHANGED_EVENT, update);
    const timer = paused || !visible ? null : setInterval(update, 15_000);
    return () => {
      generation.current += 1;
      if (timer) clearInterval(timer);
      window.removeEventListener(CLIENT_SESSION_EVENT, session);
      window.removeEventListener(ACTIVITY_CHANGED_EVENT, update);
    };
  }, [key, paused, read, refreshCurrent, visible]);

  const active = state.key === key ? state : null;
  return {
    events: active?.page?.events ?? [], page: active?.page ?? null,
    pageNumber: (active?.index ?? 0) + 1, loading, error, unsupportedAge, invalidAnchor,
    hasPrevious: Boolean(active && active.index > 0), hasNext: active?.page?.nextCursor != null,
    exportQuery: { ...query, ...(active?.page?.asOf ? { asOf: active.page.asOf } : {}) },
    // The explicit recovery action always obtains a fresh first page and server anchor.
    refresh: () => read([undefined], 0),
    previous: () => active && active.index > 0
      ? read(active.cursors, active.index - 1, active.page?.asOf) : Promise.resolve(),
    next: () => active?.page?.nextCursor != null
      ? read([...active.cursors.slice(0, active.index + 1), active.page.nextCursor], active.index + 1, active.page.asOf)
      : Promise.resolve(),
  };
}
