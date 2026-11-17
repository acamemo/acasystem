import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CallService, HaMessageConnection } from '@/@types/ha';
import { getTodoItems } from '@/api';
import { isTodoItem } from '@/validators/haPayloads';
import { readKey } from '@/validators/guards';
import { AGENDA_COMMAND_TIMEOUT_MS, boundedAgendaRead, useAgendaScope } from '../calendar/agendaRead';
import {
  addItemCall, nextStatus, removeItemCall, toItemViews, updateItemCall,
  type TodoCall, type TodoItemView, type TodoStatus,
} from './todoModel';

export const CARD_REFRESH_MS = 2 * 60 * 1000;
export const DETAILS_REFRESH_MS = 30 * 1000;
export const REFRESH_AFTER_CHANGE_MS = 500;

type Changes = { rename?: string; due_date?: string | null; due_datetime?: string | null; description?: string };
type Operation = {
  key: string; source: string; id: string; kind: 'add' | 'toggle' | 'remove' | 'edit';
  phase: 'pending' | 'accepted' | 'uncertain'; afterRead: number;
  status?: TodoStatus; summary?: string; beforeIds?: string[]; changes?: Changes;
};
/** Shared only by this family: Home/details cannot duplicate an unresolved mutation. */
const operations = new Map<string, Operation>();
const listeners = new Set<() => void>();
let revision = 0, stamp = 0, connectionId = 0;
const connections = new WeakMap<object, number>();
const itemScopes = new WeakMap<TodoItemView, object>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => revision;
function changed() { revision += 1; listeners.forEach((listener) => listener()); }
function connectionKey(conn: HaMessageConnection | null) {
  if (!conn) return 0;
  if (!connections.has(conn)) connections.set(conn, ++connectionId);
  return connections.get(conn)!;
}
function editConfirmed(item: TodoItemView | undefined, changes: Changes): boolean {
  return !!item &&
    (changes.rename === undefined || item.summary === changes.rename) &&
    (changes.description === undefined || (item.description ?? '') === changes.description) &&
    (changes.due_date === undefined || (item.due ?? null) === changes.due_date) &&
    (changes.due_datetime === undefined || (changes.due_datetime === null ? !item.due :
      new Date(item.due ?? '').getTime() === new Date(changes.due_datetime).getTime()));
}
function reconcile(source: string, items: TodoItemView[], readStamp: number) {
  let didChange = false;
  for (const [key, operation] of operations) {
    if (operation.source !== source || readStamp <= operation.afterRead) continue;
    const actual = items.find((item) => item.id === operation.id);
    const confirmed = operation.kind === 'toggle' ? actual?.status === operation.status :
      operation.kind === 'remove' ? !actual :
      operation.kind === 'edit' ? editConfirmed(actual, operation.changes ?? {}) :
      items.some((item) => item.summary === operation.summary && !operation.beforeIds?.includes(item.id));
    if (confirmed) { operations.delete(key); didChange = true; }
  }
  if (didChange) changed();
  return didChange;
}
function uncertain(error: unknown) {
  return readKey(error, 'code') === 'RESULT_UNKNOWN' ||
    readKey(error, 'name') === 'AbortError' || error instanceof TypeError;
}
function payloadItems(value: unknown, entityId: string, websocket: boolean): unknown[] | null {
  const candidates = websocket ? [readKey(value, 'items')] : [
    readKey(readKey(value, entityId), 'items'),
    readKey(readKey(readKey(value, 'service_response'), entityId), 'items'),
    readKey(readKey(readKey(value, 'response'), entityId), 'items'),
    readKey(readKey(readKey(value, 'result'), entityId), 'items'),
    readKey(value, 'items'),
  ];
  const items = candidates.find(Array.isArray);
  return Array.isArray(items) && items.every(isTodoItem) ? items : null;
}

export interface TodoListState {
  sourceKey: string;
  items: TodoItemView[];
  loading: boolean;
  loadError: boolean;
  pendingIds: ReadonlySet<string>;
  togglingIds: ReadonlySet<string>;
  deletingIds: ReadonlySet<string>;
  uncertainIds: ReadonlySet<string>;
  adding: boolean;
  actionError: string | null;
  writable: boolean;
  updatedAt: Date | null;
  retry: () => void;
  toggle: (item: TodoItemView) => void;
  add: (summary: string) => Promise<boolean>;
  remove: (item: TodoItemView) => void;
  update: (item: TodoItemView, changes: Changes) => Promise<boolean>;
}
export function useTodoList(
  conn: HaMessageConnection | null, callService: CallService, entityId: string | undefined,
  refreshMs: number,
  { readable = true, allowAdd = true, allowUpdate = true, allowRemove = true, extendedFeatures = 0 }: {
    readable?: boolean; allowAdd?: boolean; allowUpdate?: boolean; allowRemove?: boolean;
    extendedFeatures?: number;
  } = {}
): TodoListState {
  const scope = useAgendaScope(conn, JSON.stringify([entityId, allowAdd, allowUpdate, allowRemove, extendedFeatures]), readable && !!entityId);
  const source = JSON.stringify([connectionKey(conn), scope.owner, entityId]);
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const [fetched, setFetched] = useState<{
    token: object; items: TodoItemView[]; error: boolean; updatedAt: Date | null;
  } | null>(null);
  const [error, setError] = useState<{ token: object; message: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const latest = useRef(scope);
  latest.current = scope;
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const clearRequests = useRef(new Set<() => void>());
  const inFlight = useRef<{ token: object; promise: Promise<TodoItemView[] | undefined> } | null>(null);
  const current = fetched?.token === scope.token ? fetched : null;
  const currentRef = useRef(current);
  currentRef.current = current;
  useEffect(() => () => {
    timers.current.forEach(clearTimeout); timers.current.clear();
    clearRequests.current.forEach((clear) => clear()); clearRequests.current.clear();
    if (inFlight.current?.token === scope.token) inFlight.current = null;
    let invalidated = false;
    for (const entry of operations.values()) {
      if (entry.source === source && entry.phase !== 'uncertain') {
        entry.phase = 'uncertain'; invalidated = true;
      }
    }
    if (invalidated) changed();
  }, [scope.token, source]);
  const refresh = useCallback((): Promise<TodoItemView[] | undefined> => {
    if (!conn || !entityId || !scope.current() || latest.current.token !== scope.token)
      return Promise.resolve(undefined);
    if (inFlight.current?.token === scope.token) return inFlight.current.promise;
    const readStamp = ++stamp;
    let live = true;
    const valid = () => live && scope.current() && latest.current.token === scope.token;
    const promise = (async () => {
      let clearRead = () => {};
      let cancelRead = () => {};
      try {
        const guarded: HaMessageConnection = {
          get connected() { return conn.connected; },
          sendMessagePromise: async (message) => {
            if (!valid()) throw new Error('Agenda scope changed');
            const response = await conn.sendMessagePromise(message);
            if (!valid()) throw new Error('Agenda scope changed');
            const websocket = message.type === 'todo/item/list';
            const items = payloadItems(response, entityId, websocket);
            if (!items) throw new Error('Invalid todo response');
            // Prevent the broad legacy fallback extractor from taking another list's data.
            return websocket ? { items } : { [entityId]: { items } };
          },
        };
        const request = boundedAgendaRead(getTodoItems(guarded, entityId));
        clearRead = request.clear;
        cancelRead = () => { live = false; clearRead(); };
        clearRequests.current.add(cancelRead);
        const items = toItemViews(await request.promise);
        if (!valid()) return undefined;
        setFetched({ token: scope.token, items, error: false, updatedAt: new Date() });
        if (reconcile(source, items, readStamp)) setError(null);
        return items;
      } catch {
        if (valid()) setFetched((previous) => previous?.token === scope.token
          ? { ...previous, error: true }
          : { token: scope.token, items: [], error: true, updatedAt: null });
        return undefined;
      } finally {
        live = false; clearRead(); clearRequests.current.delete(cancelRead);
        if (inFlight.current?.token === scope.token) inFlight.current = null;
      }
    })();
    inFlight.current = { token: scope.token, promise };
    return promise;
  }, [conn, entityId, scope, source]);
  useEffect(() => {
    if (!scope.active) return;
    void refresh();
    const timer = setInterval(() => void refresh(), refreshMs);
    return () => clearInterval(timer);
  }, [scope.token, scope.active, refresh, refreshMs, retryCount]);
  const laterRead = () => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      if (scope.current() && latest.current.token === scope.token) void refresh();
    }, REFRESH_AFTER_CHANGE_MS);
    timers.current.add(timer);
  };
  const ready = () => scope.current() && latest.current.token === scope.token &&
    !!currentRef.current && !currentRef.current.error && navigator.onLine !== false;
  const send = async (operation: Operation, call: TodoCall): Promise<boolean> => {
    if (!ready() || operations.has(operation.key)) return false;
    operations.set(operation.key, operation); changed();
    setError(null);
    const request = boundedAgendaRead(
      Promise.resolve().then(() => {
        // Recheck after the microtask before crossing the existing tracked-command gateway.
        if (!ready()) throw Object.assign(new Error('Not sent'), { code: 'NOT_SENT' });
        return callService(call.domain, call.service, call.data);
      }), AGENDA_COMMAND_TIMEOUT_MS
    );
    try {
      await request.promise;
      if (operations.get(operation.key) === operation) {
        operation.phase = scope.current() ? 'accepted' : 'uncertain'; changed();
        const timer = setTimeout(() => {
          timers.current.delete(timer);
          if (operations.get(operation.key) !== operation) return;
          operation.phase = 'uncertain'; changed();
        }, AGENDA_COMMAND_TIMEOUT_MS);
        timers.current.add(timer);
      }
      if (scope.current() && latest.current.token === scope.token) laterRead();
      return true;
    } catch (failure) {
      if (operations.get(operation.key) === operation) {
        if (uncertain(failure)) operation.phase = 'uncertain';
        else operations.delete(operation.key);
        changed();
      }
      if (scope.current() && latest.current.token === scope.token) {
        setError({ token: scope.token, message: uncertain(failure)
          ? 'Esito da verificare. Aggiorna la lista: il comando non sarà reinviato.'
          : operation.kind === 'add' ? 'Attività non aggiunta. Riprova.'
          : operation.kind === 'remove' ? 'Attività non eliminata. Riprova.'
          : 'Attività non aggiornata. Riprova.' });
        void refresh();
      }
      return false;
    } finally { request.clear(); }
  };
  const operation = (id: string, kind: Operation['kind']): Operation => ({
    key: JSON.stringify([source, id]), source, id, kind, phase: 'pending', afterRead: ++stamp,
  });
  const ownsItem = (item: TodoItemView) => itemScopes.get(item) === scope.token &&
    !!currentRef.current?.items.some((actual) => actual.id === item.id &&
      actual.commandId === item.commandId && actual.summary === item.summary);
  const toggle = (item: TodoItemView) => {
    if (!allowUpdate || !entityId || !item.commandId || item.status === 'unknown' || !ownsItem(item)) return;
    if (!currentRef.current?.items.some((actual) => actual.id === item.id && actual.status === item.status)) return;
    void send({ ...operation(item.id, 'toggle'), status: nextStatus(item.status) },
      updateItemCall(entityId, item.commandId, nextStatus(item.status)));
  };
  const add = async (summary: string) => {
    const text = summary.trim();
    if (!allowAdd || !entityId || !text) return false;
    return send({ ...operation('__add__', 'add'), summary: text,
      beforeIds: currentRef.current?.items.map((item) => item.id) ?? [] }, addItemCall(entityId, text));
  };
  const remove = (item: TodoItemView) => {
    if (!allowRemove || !entityId || !item.commandId || !ownsItem(item)) return;
    void send(operation(item.id, 'remove'), removeItemCall(entityId, item.commandId));
  };
  const update = async (item: TodoItemView, changes: Changes) => {
    if (!allowUpdate || !entityId || !item.commandId || !ownsItem(item)) return false;
    if (changes.rename !== undefined && !changes.rename.trim()) return false;
    if (changes.due_date !== undefined && !(extendedFeatures & 16)) return false;
    if (changes.due_datetime !== undefined && !(extendedFeatures & 32)) return false;
    if (changes.description !== undefined && !(extendedFeatures & 64)) return false;
    if (changes.due_date !== undefined && changes.due_datetime !== undefined) return false;
    if (Object.keys(changes).length === 0) return false;
    return send({ ...operation(item.id, 'edit'), changes }, {
      domain: 'todo', service: 'update_item',
      data: { target: { entity_id: entityId }, item: item.commandId, ...changes },
    });
  };
  const pending = [...operations.values()].filter((entry) => entry.source === source);
  const byId = new Map(pending.map((entry) => [entry.id, entry]));
  const items = (current?.items ?? []).map((item) => {
    const op = byId.get(item.id);
    const view = op?.kind === 'toggle' && op.status ? { ...item, status: op.status } : item;
    itemScopes.set(view, scope.token);
    return view;
  });
  const unresolved = pending.some((entry) => entry.phase === 'uncertain');
  return {
    sourceKey: source, items, loading: !!entityId && readable && scope.active && !current,
    loadError: readable && !!entityId && (!conn || conn.connected === false || navigator.onLine === false || !!current?.error),
    pendingIds: new Set(pending.filter((entry) => entry.kind !== 'add').map((entry) => entry.id)),
    togglingIds: new Set(pending.filter((entry) => entry.kind === 'toggle').map((entry) => entry.id)),
    deletingIds: new Set(pending.filter((entry) => entry.kind === 'remove').map((entry) => entry.id)),
    uncertainIds: new Set(pending.filter((entry) => entry.phase === 'uncertain').map((entry) => entry.id)),
    adding: byId.has('__add__'),
    actionError: error?.token === scope.token ? error.message : unresolved
      ? 'Esito da verificare. Aggiorna la lista: il comando non sarà reinviato.' : null,
    writable: ready(), updatedAt: current?.updatedAt ?? null,
    retry: () => { setError(null); setRetryCount((value) => value + 1); }, toggle, add, remove, update,
  };
}
