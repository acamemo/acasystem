import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, type ReactNode } from 'react';
import type { HaMessageConnection, HaTodoItem } from '@/@types/ha';
import type { ClientSession } from '@/api/clientSession';
import { setClientSession } from '@/api/clientSession';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { AGENDA_COMMAND_TIMEOUT_MS, AGENDA_READ_TIMEOUT_MS } from '@/components/widgets/home/calendar/agendaRead';
import { useCalendarEvents } from '@/components/widgets/home/calendar/useCalendarEvents';
import { useTodoList } from '@/components/widgets/home/todo/useTodoList';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (failure: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function settle() {
  await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });
}
async function advance(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
const eventResponse = (id: string, summary: string) => ({
  response: { [id]: { events: [{ summary, start: '2026-11-12T10:00:00Z', end: '2026-11-12T11:00:00Z' }] } },
});
const items: HaTodoItem[] = [
  { uid: 'a', summary: 'Latte', status: 'needs_action' },
  { uid: 'b', summary: 'Pane', status: 'needs_action' },
];
function listConnection(initial: HaTodoItem[] = items) {
  let current = initial;
  const sendMessagePromise = vi.fn(async () => ({ items: current }));
  return { conn: { sendMessagePromise } as HaMessageConnection, sendMessagePromise,
    setItems: (next: HaTodoItem[]) => { current = next; } };
}
beforeEach(() => { vi.useFakeTimers(); setClientSession(null); });
afterEach(() => { cleanup(); setClientSession(null); vi.useRealTimers(); });

describe('Agenda · letture calendario isolate', () => {
  it('non confonde una risposta incompleta con nessun evento e riprova soltanto la lettura', async () => {
    const sendMessagePromise = vi.fn().mockResolvedValueOnce({ response: {} })
      .mockResolvedValue(eventResponse('calendar.a', 'Confermato'));
    const conn = { sendMessagePromise };
    const { result } = renderHook(() => useCalendarEvents(conn, ['calendar.a'], { days: 7 }));
    await settle();
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBe(true);
    act(() => result.current.retry()); await settle();
    expect(result.current.events[0]?.title).toBe('Confermato');
  });
  it('il timeout chiude il caricamento senza mostrare un vuoto confermato', async () => {
    const conn = { sendMessagePromise: vi.fn(() => new Promise(() => {})) };
    const { result } = renderHook(() => useCalendarEvents(conn, ['calendar.a'], { days: 7 }));
    await advance(AGENDA_READ_TIMEOUT_MS);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(true);
    expect(result.current.updatedAt).toBeNull();
  });
  it('eventi malformati non vengono scartati per dichiarare un calendario vuoto', async () => {
    const conn = { sendMessagePromise: vi.fn(async () => ({ response: { 'calendar.a': {
      events: [{ start: '2026-02-31', end: '2026-03-01', summary: 'Impossibile' }],
    } } })) };
    const { result } = renderHook(() => useCalendarEvents(conn, ['calendar.a'], { days: 7 }));
    await settle();
    expect(result.current.error).toBe(true); expect(result.current.updatedAt).toBeNull();
  });
  it('scarta la risposta A precedente dopo A → B → A', async () => {
    const pending = [deferred<unknown>(), deferred<unknown>(), deferred<unknown>()];
    const conn = { sendMessagePromise: vi.fn().mockImplementationOnce(() => pending[0]!.promise)
      .mockImplementationOnce(() => pending[1]!.promise).mockImplementationOnce(() => pending[2]!.promise) };
    const { result, rerender } = renderHook((id: string) => useCalendarEvents(conn, [id], { days: 7 }),
      { initialProps: 'calendar.a' });
    rerender('calendar.b'); rerender('calendar.a');
    pending[0]!.resolve(eventResponse('calendar.a', 'Vecchio'));
    await settle();
    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(true);
    pending[2]!.resolve(eventResponse('calendar.a', 'Nuovo'));
    await settle();
    expect(result.current.events[0]?.title).toBe('Nuovo');
  });
  it('conserva l’ultima lettura della stessa provenienza quando un refresh fallisce', async () => {
    const conn = { sendMessagePromise: vi.fn().mockResolvedValueOnce(eventResponse('calendar.a', 'Conservato'))
      .mockRejectedValue(new Error('down')) };
    const { result } = renderHook(() => useCalendarEvents(conn, ['calendar.a'], { days: 7 }));
    await settle();
    act(() => result.current.retry()); await settle();
    expect(result.current.error).toBe(true);
    expect(result.current.events[0]?.title).toBe('Conservato');
    expect(result.current.updatedAt).not.toBeNull();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(2);
  });
  it('nessuna lettura su connessione chiusa', async () => {
    const conn = { connected: false, sendMessagePromise: vi.fn() };
    const { result } = renderHook(() => useCalendarEvents(conn, ['calendar.a'], { days: 7 }));
    await settle();
    expect(result.current.error).toBe(true); expect(result.current.loading).toBe(false);
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
  });
});

describe('Agenda · attività, comandi indipendenti e verifiche', () => {
  it('montaggio e retry inviano soltanto letture', async () => {
    const { conn, sendMessagePromise } = listConnection();
    const call = vi.fn(async () => undefined);
    const { result } = renderHook(() => useTodoList(conn, call, 'todo.a', 120_000));
    await settle(); act(() => result.current.retry()); await settle();
    expect(result.current.items).toHaveLength(2);
    expect(call).not.toHaveBeenCalled(); expect(sendMessagePromise).toHaveBeenCalledTimes(2);
  });
  it('blocca il doppio invio della stessa riga e lascia indipendente la seconda', async () => {
    const { conn } = listConnection();
    const command = deferred<unknown>(), call = vi.fn(() => command.promise);
    const { result } = renderHook(() => useTodoList(conn, call, 'todo.a', 120_000));
    await settle();
    const [first, second] = result.current.items;
    act(() => { result.current.toggle(first!); result.current.toggle(first!); result.current.toggle(second!); });
    await settle();
    expect(call).toHaveBeenCalledTimes(2);
    expect(result.current.pendingIds).toEqual(new Set(['a', 'b']));
    expect(result.current.items.map((item) => item.status)).toEqual(['completed', 'completed']);
  });
  it('una riga confermata libera solo il proprio comando', async () => {
    const source = listConnection(), call = vi.fn(async () => undefined);
    const { result } = renderHook(() => useTodoList(source.conn, call, 'todo.a', 120_000));
    await settle();
    act(() => { result.current.toggle(result.current.items[0]!); result.current.toggle(result.current.items[1]!); });
    await settle();
    source.setItems([{ ...items[0]!, status: 'completed' }, items[1]!]);
    await advance(500);
    expect(result.current.pendingIds).toEqual(new Set(['b']));
    expect(result.current.items.map((item) => item.status)).toEqual(['completed', 'completed']);
  });
  it('la cancellazione resta visibile fino alla lettura che ne conferma l’assenza', async () => {
    const source = listConnection(), call = vi.fn(async () => undefined);
    const { result } = renderHook(() => useTodoList(source.conn, call, 'todo.a', 120_000));
    await settle(); act(() => result.current.remove(result.current.items[0]!)); await settle();
    expect(result.current.items).toHaveLength(2);
    expect(result.current.deletingIds.has('a')).toBe(true);
    source.setItems([items[1]!]); await advance(500);
    expect(result.current.items.map((item) => item.id)).toEqual(['b']);
    expect(result.current.pendingIds.size).toBe(0);
  });
  it('un timeout non permette il reinvio dopo hide/show o dopo una rilettura invariata', async () => {
    const source = listConnection(), call = vi.fn(() => new Promise(() => {}));
    let visible = true;
    const wrapper = ({ children }: { children: ReactNode }) =>
      <PageVisibilityContext.Provider value={visible}>{children}</PageVisibilityContext.Provider>;
    const { result, rerender } = renderHook(() => useTodoList(source.conn, call, 'todo.a', 120_000), { wrapper });
    await settle(); act(() => result.current.toggle(result.current.items[0]!)); await settle();
    await advance(AGENDA_COMMAND_TIMEOUT_MS);
    expect(result.current.uncertainIds.has('a')).toBe(true);
    expect(result.current.actionError).toContain('non sarà reinviato');
    visible = false; rerender(); visible = true; rerender(); await settle();
    act(() => result.current.toggle(result.current.items[0]!));
    act(() => result.current.retry()); await settle();
    expect(call).toHaveBeenCalledTimes(1);
    expect(result.current.pendingIds.has('a')).toBe(true);
  });
  it('la protezione di una mutazione incerta sopravvive alla riapertura dei dettagli', async () => {
    const source = listConnection(), call = vi.fn(() => new Promise(() => {}));
    const first = renderHook(() => useTodoList(source.conn, call, 'todo.a', 120_000));
    await settle(); act(() => first.result.current.toggle(first.result.current.items[0]!)); await settle();
    first.unmount();
    const reopened = renderHook(() => useTodoList(source.conn, call, 'todo.a', 120_000));
    await settle();
    expect(reopened.result.current.uncertainIds.has('a')).toBe(true);
    act(() => reopened.result.current.toggle(reopened.result.current.items[0]!)); await settle();
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('un esito incerto del gateway non è proposto come fallimento da ripetere', async () => {
    const source = listConnection(), call = vi.fn(async () => {
      throw Object.assign(new Error('unknown'), { code: 'RESULT_UNKNOWN' });
    });
    const { result } = renderHook(() => useTodoList(source.conn, call, 'todo.a', 120_000));
    await settle(); act(() => result.current.remove(result.current.items[0]!)); await settle();
    expect(result.current.uncertainIds.has('a')).toBe(true);
    expect(result.current.items).toHaveLength(2);
    act(() => result.current.remove(result.current.items[0]!)); await settle();
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('un rifiuto definitivo ripristina soltanto la propria riga', async () => {
    const source = listConnection(), call = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('rejected'), { code: 'HA_REJECTED' }))
      .mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useTodoList(source.conn, call, 'todo.a', 120_000));
    await settle();
    act(() => { result.current.toggle(result.current.items[0]!); result.current.toggle(result.current.items[1]!); });
    await settle();
    expect(result.current.items.map((item) => item.status)).toEqual(['needs_action', 'completed']);
    expect(result.current.pendingIds).toEqual(new Set(['b']));
  });
  it('un’aggiunta resta protetta finché una nuova identità la conferma', async () => {
    const source = listConnection(), call = vi.fn(async () => undefined);
    const { result } = renderHook(() => useTodoList(source.conn, call, 'todo.a', 120_000));
    await settle();
    await act(async () => { expect(await result.current.add(' Latte ')).toBe(true); });
    await act(async () => { expect(await result.current.add('Latte')).toBe(false); });
    await advance(500);
    expect(result.current.adding).toBe(true);
    source.setItems([...items, { uid: 'new', summary: 'Latte', status: 'needs_action' }]);
    act(() => result.current.retry()); await settle();
    expect(result.current.adding).toBe(false); expect(call).toHaveBeenCalledTimes(1);
  });
  it('risposta priva di items, anche nel fallback, non diventa lista vuota', async () => {
    const conn = { sendMessagePromise: vi.fn(async () => ({ response: { 'todo.other': { items: [] } } })) };
    const { result } = renderHook(() => useTodoList(conn, vi.fn(), 'todo.a', 120_000));
    await settle();
    expect(result.current.loadError).toBe(true);
    expect(result.current.updatedAt).toBeNull();
    expect(result.current.items).toEqual([]);
  });
  it('il fallback resta una lettura della stessa entità', async () => {
    const conn = { sendMessagePromise: vi.fn()
      .mockRejectedValueOnce(new Error('unsupported'))
      .mockResolvedValueOnce({ response: { 'todo.a': { items } } }) };
    const call = vi.fn();
    const { result } = renderHook(() => useTodoList(conn, call, 'todo.a', 120_000));
    await settle(); expect(result.current.items).toHaveLength(2);
    expect(conn.sendMessagePromise.mock.calls[1]?.[0]).toMatchObject({
      domain: 'todo', service: 'get_items', target: { entity_id: 'todo.a' },
    });
    expect(call).not.toHaveBeenCalled();
  });
  it('nessun comando né lettura in connessione chiusa', async () => {
    const conn = { connected: false, sendMessagePromise: vi.fn() }, call = vi.fn();
    const { result } = renderHook(() => useTodoList(conn, call, 'todo.a', 120_000));
    await settle(); await act(async () => { expect(await result.current.add('A')).toBe(false); });
    expect(result.current.loadError).toBe(true);
    expect(conn.sendMessagePromise).not.toHaveBeenCalled(); expect(call).not.toHaveBeenCalled();
  });
  it('le capacità rimosse invalidano un callback di comando già ottenuto', async () => {
    const source = listConnection(), call = vi.fn(async () => undefined);
    const { result, rerender } = renderHook((allowed: boolean) =>
      useTodoList(source.conn, call, 'todo.a', 120_000, { allowUpdate: allowed }), { initialProps: true });
    await settle();
    const staleToggle = result.current.toggle, item = result.current.items[0]!;
    rerender(false); await settle();
    act(() => staleToggle(item)); await settle();
    expect(call).not.toHaveBeenCalled();
  });
  it('una voce della lista precedente non è azionabile con il callback della nuova lista', async () => {
    const source = listConnection(), call = vi.fn(async () => undefined);
    const { result, rerender } = renderHook((id: string) => useTodoList(source.conn, call, id, 120_000),
      { initialProps: 'todo.a' });
    await settle(); const staleItem = result.current.items[0]!;
    rerender('todo.b'); await settle();
    act(() => result.current.toggle(staleItem)); await settle();
    expect(call).not.toHaveBeenCalled();
    act(() => result.current.toggle(result.current.items[0]!)); await settle();
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('StrictMode non recupera una risposta cancellata dal primo montaggio', async () => {
    const source = listConnection(), call = vi.fn();
    const { result } = renderHook(() => useTodoList(source.conn, call, 'todo.a', 120_000),
      { wrapper: ({ children }) => <StrictMode>{children}</StrictMode> });
    await settle();
    expect(result.current.items).toHaveLength(2);
    expect(result.current.loading).toBe(false); expect(call).not.toHaveBeenCalled();
  });
  it('scarta letture del precedente account anche dopo ritorno allo stesso ID', async () => {
    const session = (user: string) => ({
      houseId: 'house', user: { id: user, name: user },
      client: { id: 'client', userId: user, label: 'test', platform: 'web' },
    } as ClientSession);
    setClientSession(session('a'));
    const old = deferred<unknown>(), next = deferred<unknown>();
    const conn = { sendMessagePromise: vi.fn().mockImplementationOnce(() => old.promise)
      .mockResolvedValueOnce({ items: [] }).mockImplementationOnce(() => next.promise) };
    const { result } = renderHook(() => useTodoList(conn, vi.fn(), 'todo.a', 120_000));
    act(() => setClientSession(session('b'))); await settle();
    act(() => setClientSession(session('a')));
    old.resolve({ items: [{ uid: 'old', summary: 'Vecchio', status: 'needs_action' }] });
    await settle(); expect(result.current.items).toEqual([]);
    next.resolve({ items }); await settle();
    expect(result.current.items.map((item) => item.summary)).toEqual(['Latte', 'Pane']);
  });
});
