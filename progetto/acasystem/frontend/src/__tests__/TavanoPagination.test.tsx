import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityEvent, ActivityPage, ActivityQuery } from '@/api/activityApi';
const mocks = vi.hoisted(() => ({ read: vi.fn(), diagnostic: vi.fn() }));
vi.mock('@/api/activityApi', () => ({ readActivity: mocks.read, ACTIVITY_CHANGED_EVENT: 'test:activity' }));
vi.mock('@/api/diagnosticApi', () => ({ reportDiagnostic: mocks.diagnostic }));
import { useActivityPage } from '@/components/widgets/utilities/tavano/useActivityPage';
import { CLIENT_SESSION_EVENT } from '@/api/clientSession';

const anchor = '2026-11-04T12:00:00.000Z';
const event = (id: number): ActivityEvent => ({ id, at: anchor, kind: 'configuration', action: 'profile.saved', outcome: 'accepted', actor: null });
const page = (ids: number[], nextCursor: number | null = null): ActivityPage => ({ events: ids.map(event), nextCursor,
  availableFrom: anchor, retentionDays: 7, quotaBytes: 50 * 1024 * 1024, serverNow: anchor, asOf: anchor });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(() => { mocks.read.mockReset(); mocks.diagnostic.mockReset(); });

describe('paginazione Tavano con clock della centrale', () => {
  it('sostituisce le pagine, riusa il cursore per tornare indietro e rinnova il clock solo in prima pagina', async () => {
    mocks.read.mockImplementation(async (query: ActivityQuery) => query.before ? page([1]) : page([3, 2], 2));
    const { result } = renderHook(() => useActivityPage({ ageDays: 0 }));
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    expect(mocks.read).toHaveBeenLastCalledWith({ ageDays: 0, limit: 30 });
    await act(async () => result.current.next());
    expect(result.current.events.map((row) => row.id)).toEqual([1]);
    expect(result.current.pageNumber).toBe(2);
    expect(mocks.read).toHaveBeenLastCalledWith({ ageDays: 0, limit: 30, before: 2, asOf: anchor });
    await act(async () => window.dispatchEvent(new Event('test:activity')));
    expect(mocks.read).toHaveBeenLastCalledWith({ ageDays: 0, limit: 30, before: 2, asOf: anchor });
    expect(result.current.exportQuery).toEqual({ ageDays: 0, asOf: anchor });
    await act(async () => result.current.previous());
    expect(result.current.events.map((row) => row.id)).toEqual([3, 2]);
    expect(mocks.read).toHaveBeenLastCalledWith({ ageDays: 0, limit: 30, asOf: anchor });
    await act(async () => result.current.refresh());
    expect(mocks.read).toHaveBeenLastCalledWith({ ageDays: 0, limit: 30 });
  });
  it('Aggiorna riallinea una pagina se il clock centrale è arretrato e il server rifiuta il riferimento futuro', async () => {
    mocks.read.mockResolvedValueOnce(page([3, 2], 2)).mockResolvedValueOnce(page([1]));
    const { result } = renderHook(() => useActivityPage({ ageDays: 6 }));
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    await act(async () => result.current.next());
    expect(result.current.pageNumber).toBe(2);
    mocks.read.mockRejectedValueOnce(Object.assign(new Error('old anchor'), { body: { code: 'INVALID_ANCHOR' }, status: 400 }));
    await act(async () => window.dispatchEvent(new Event('test:activity')));
    expect(result.current.invalidAnchor).toBe(true);
    expect(result.current.events).toEqual([]);
    expect(result.current.page).toBeNull();
    const realigned = { ...page([9]), asOf: '2026-11-04T11:00:00.000Z', serverNow: '2026-11-04T11:00:00.000Z' };
    mocks.read.mockResolvedValueOnce(realigned);
    await act(async () => result.current.refresh());
    expect(mocks.read).toHaveBeenLastCalledWith({ ageDays: 6, limit: 30 });
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.events.map((row) => row.id)).toEqual([9]);
    expect(result.current.error).toBe(false);
    expect(result.current.invalidAnchor).toBe(false);
    expect(result.current.page?.asOf).toBe(realigned.asOf);
  });
  it('il cambio filtro invalida la risposta di una pagina precedente ancora in volo', async () => {
    const pending = deferred<ActivityPage>();
    mocks.read.mockResolvedValueOnce(page([3, 2], 2)).mockReturnValueOnce(pending.promise).mockResolvedValue(page([9]));
    const { result, rerender } = renderHook(({ query }) => useActivityPage(query), { initialProps: { query: {} as ActivityQuery } });
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    act(() => { void result.current.next(); });
    rerender({ query: { kind: 'diagnostic' } });
    await waitFor(() => expect(result.current.events[0]?.id).toBe(9));
    await act(async () => pending.resolve(page([1])));
    expect(result.current.events.map((row) => row.id)).toEqual([9]);
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.hasPrevious).toBe(false);
    expect(mocks.read).toHaveBeenLastCalledWith({ kind: 'diagnostic', limit: 30 });
  });
  it('ignora una risposta iniziale obsoleta e mantiene la pagina confermata in caso di errore', async () => {
    const pending = deferred<ActivityPage>();
    mocks.read.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(page([8]));
    const { result, rerender } = renderHook(({ query }) => useActivityPage(query), { initialProps: { query: {} as ActivityQuery } });
    rerender({ query: { ageDays: 6 } });
    await waitFor(() => expect(result.current.events[0]?.id).toBe(8));
    await act(async () => pending.resolve(page([1, 2])));
    expect(result.current.events.map((row) => row.id)).toEqual([8]);
    mocks.read.mockRejectedValueOnce(new Error('offline'));
    await act(async () => result.current.refresh());
    expect(result.current.error).toBe(true);
    expect(result.current.events.map((row) => row.id)).toEqual([8]);
  });
  it('il cambio account cancella pagina e cursori prima di accettare nuove risposte', async () => {
    const pending = deferred<ActivityPage>();
    mocks.read.mockResolvedValueOnce(page([3], 3)).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(page([9]));
    const { result } = renderHook(() => useActivityPage({}));
    await waitFor(() => expect(result.current.events[0]?.id).toBe(3));
    act(() => { void result.current.next(); });
    act(() => window.dispatchEvent(new Event(CLIENT_SESSION_EVENT)));
    await waitFor(() => expect(result.current.events[0]?.id).toBe(9));
    await act(async () => pending.resolve(page([2])));
    expect(result.current.events.map((row) => row.id)).toEqual([9]);
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.exportQuery).toEqual({ asOf: anchor });
  });
  it('non finge un filtro età quando una centrale precedente non espone il proprio clock', async () => {
    const old = page([3]); delete old.serverNow; delete old.asOf;
    mocks.read.mockResolvedValue(old);
    const { result } = renderHook(() => useActivityPage({ ageDays: 4 }));
    await waitFor(() => expect(result.current.unsupportedAge).toBe(true));
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBe(true);
  });
});
