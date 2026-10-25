import { useCallback, useEffect, useRef, useState } from 'react';
import type { CallService, HaMessageConnection } from '@/@types/ha';
import { getTodoItems } from '@/api';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { CONFIRM_TIMEOUT_MS } from '../shared/useRequested';
import {
  addItemCall,
  nextStatus,
  removeItemCall,
  toItemViews,
  updateItemCall,
  type TodoCall,
  type TodoItemView,
  type TodoStatus,
} from './todoModel';

/** Legacy card: refresh every 2 minutes; legacy modal: every 30 seconds. */
export const CARD_REFRESH_MS = 2 * 60 * 1000;
export const DETAILS_REFRESH_MS = 30 * 1000;
/** Legacy: read the list again 500 ms after a change. */
export const REFRESH_AFTER_CHANGE_MS = 500;

export interface TodoListState {
  /** Items with the requested status while HA has not confirmed it. */
  items: TodoItemView[];
  loading: boolean;
  loadError: boolean;
  /** Item ids whose change is waiting for confirmation. */
  pendingIds: ReadonlySet<string>;
  adding: boolean;
  /** Message of the last failed command, null when none. */
  actionError: string | null;
  toggle: (item: TodoItemView) => void;
  add: (summary: string) => Promise<boolean>;
  remove: (item: TodoItemView) => void;
  update: (
    item: TodoItemView,
    changes: {
      rename?: string;
      due_date?: string | null;
      due_datetime?: string | null;
      description?: string;
    }
  ) => Promise<boolean>;
}

interface Fetched {
  key: string;
  items: TodoItemView[];
  error: boolean;
}

export function useTodoList(
  conn: HaMessageConnection | null,
  callService: CallService,
  entityId: string | undefined,
  refreshMs: number
): TodoListState {
  const visible = usePageVisible();
  const visibleRef = useRef(visible);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [requested, setRequested] = useState<Record<string, TodoStatus>>({});
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const mounted = useRef(true);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    mounted.current = true;
    const pendingTimers = timers.current;
    return () => {
      mounted.current = false;
      pendingTimers.forEach(clearTimeout);
    };
  }, []);

  const later = useCallback((callback: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      if (mounted.current) callback();
    }, ms);
    timers.current.add(timer);
  }, []);

  const refresh = useCallback(async () => {
    if (!conn || !entityId || !visibleRef.current) return;
    try {
      const items = toItemViews(await getTodoItems(conn, entityId));
      if (!mounted.current || !visibleRef.current) return;
      setFetched({ key: entityId, items, error: false });
      // Confirmed by HA: drop the requests that now match and the removals that took effect.
      setRequested((current) => {
        const next = { ...current };
        for (const item of items) if (next[item.id] === item.status) delete next[item.id];
        return next;
      });
      setRemoved(
        (current) => new Set([...current].filter((id) => items.some((item) => item.id === id)))
      );
      return items;
    } catch {
      if (mounted.current && visibleRef.current) {
        setFetched((current) => ({
          key: entityId,
          items: current?.key === entityId ? current.items : [],
          error: true,
        }));
      }
    }
  }, [conn, entityId]);

  useEffect(() => {
    if (!conn || !entityId || !visible) return undefined;
    refresh();
    const interval = setInterval(refresh, refreshMs);
    return () => clearInterval(interval);
  }, [conn, entityId, refresh, refreshMs, visible]);

  const send = (call: TodoCall) => callService(call.domain, call.service, call.data);

  const toggle = (item: TodoItemView) => {
    if (!entityId) return;
    const status = nextStatus(requested[item.id] ?? item.status);
    setRequested((current) => ({ ...current, [item.id]: status }));
    setActionError(null);
    Promise.resolve(send(updateItemCall(entityId, item.id, status)))
      .then(() => {
        later(refresh, REFRESH_AFTER_CHANGE_MS);
        later(() => {
          setRequested((current) => {
            if (current[item.id] !== status) return current;
            const next = { ...current };
            delete next[item.id];
            return next;
          });
        }, CONFIRM_TIMEOUT_MS);
      })
      .catch(() => {
        if (!mounted.current) return;
        setRequested((current) => {
          const next = { ...current };
          delete next[item.id];
          return next;
        });
        setActionError(`«${item.summary}» non aggiornata. Riprova.`);
        refresh();
      });
  };

  const add = async (summary: string): Promise<boolean> => {
    const text = summary.trim();
    if (!text || !entityId || adding) return false;
    setAdding(true);
    setActionError(null);
    try {
      await send(addItemCall(entityId, text));
      await refresh();
      return true;
    } catch {
      if (mounted.current) setActionError('Attività non aggiunta. Riprova.');
      return false;
    } finally {
      if (mounted.current) setAdding(false);
    }
  };

  const remove = (item: TodoItemView) => {
    if (!entityId) return;
    setRemoved((current) => new Set(current).add(item.id));
    setActionError(null);
    Promise.resolve(send(removeItemCall(entityId, item.id)))
      .then(() => later(refresh, REFRESH_AFTER_CHANGE_MS))
      .catch(() => {
        if (!mounted.current) return;
        setRemoved((current) => new Set([...current].filter((id) => id !== item.id)));
        setActionError(`«${item.summary}» non eliminata. Riprova.`);
        refresh();
      });
  };

  const current = fetched?.key === entityId ? fetched : null;
  const update = async (
    item: TodoItemView,
    changes: {
      rename?: string;
      due_date?: string | null;
      due_datetime?: string | null;
      description?: string;
    }
  ): Promise<boolean> => {
    if (!entityId) return false;
    setActionError(null);
    try {
      await send({
        domain: 'todo',
        service: 'update_item',
        data: { target: { entity_id: entityId }, item: item.id, ...changes },
      });
      await new Promise((resolve) => setTimeout(resolve, REFRESH_AFTER_CHANGE_MS));
      if (!mounted.current) return false;
      const actual = (await refresh())?.find((candidate) => candidate.id === item.id);
      const confirmed =
        actual &&
        (changes.rename === undefined || actual.summary === changes.rename) &&
        (changes.description === undefined || (actual.description ?? '') === changes.description) &&
        (changes.due_date === undefined ||
          (actual.due?.slice(0, 10) ?? null) === changes.due_date) &&
        (changes.due_datetime === undefined ||
          (changes.due_datetime === null
            ? !actual.due
            : new Date(actual.due ?? '').getTime() === new Date(changes.due_datetime).getTime()));
      if (!confirmed) setActionError('Home Assistant non ha confermato la modifica.');
      return Boolean(confirmed);
    } catch {
      if (mounted.current) setActionError('Attività non aggiornata. Riprova.');
      return false;
    }
  };
  const items = (current?.items ?? [])
    .filter((item) => !removed.has(item.id))
    .map((item) => (requested[item.id] ? { ...item, status: requested[item.id] } : item));
  const pendingIds = new Set(
    Object.keys(requested).filter((id) =>
      current?.items.some((item) => item.id === id && item.status !== requested[id])
    )
  );

  return {
    items,
    loading: Boolean(entityId) && !current,
    loadError: Boolean(current?.error),
    pendingIds,
    adding,
    actionError,
    toggle,
    add,
    remove,
    update,
  };
}
