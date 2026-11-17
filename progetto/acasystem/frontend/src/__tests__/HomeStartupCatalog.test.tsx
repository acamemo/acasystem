import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WidgetRuntime } from '@/@types/launcher';
import { useRuntimeServiceCatalogState } from '@/components/widgets/adaptive/useServiceCatalog';

type Catalog = NonNullable<WidgetRuntime['services']>;
function deferred() {
  let resolve!: (value: Catalog) => void, reject!: (reason: Error) => void;
  const promise = new Promise<Catalog>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const connection = (send: () => Promise<Catalog>) => ({ sendMessagePromise: vi.fn(send) }) as unknown as NonNullable<WidgetRuntime['conn']>;
afterEach(() => cleanup());

describe('initial Home service catalog owner', () => {
  it('distinguishes a received empty catalog from failure and retries only that request', async () => {
    const first = deferred(), second = deferred();
    const send = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const conn = connection(send);
    const { result } = renderHook(() => useRuntimeServiceCatalogState({ conn }));
    expect(result.current.status).toBe('loading');
    await act(async () => { first.reject(new Error('Rete')); await first.promise.catch(() => undefined); });
    expect(result.current.status).toBe('error');
    expect(result.current.services).toBeNull();
    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');
    await act(async () => { second.resolve({}); await second.promise; });
    expect(result.current.status).toBe('ready');
    expect(result.current.services).toEqual({});
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.every((call) => call[0]?.type === 'get_services')).toBe(true);
  });
  it('ignores the old attempt after retry and shares the successful current request with another consumer', async () => {
    const first = deferred(), second = deferred();
    const send = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const conn = connection(send);
    const one = renderHook(() => useRuntimeServiceCatalogState({ conn }));
    act(() => one.result.current.retry());
    await act(async () => { first.resolve({ obsolete: {} }); await first.promise; });
    expect(one.result.current.status).toBe('loading');
    await act(async () => { second.resolve({ light: {} }); await second.promise; });
    const two = renderHook(() => useRuntimeServiceCatalogState({ conn }));
    await act(async () => { await second.promise; });
    expect(two.result.current.services).toEqual({ light: {} });
    expect(send).toHaveBeenCalledTimes(2);
  });
  it('does not label an absent connection as a received empty catalog', () => {
    const { result } = renderHook(() => useRuntimeServiceCatalogState({ conn: null }));
    expect(result.current.status).toBe('idle');
    expect(result.current.services).toBeNull();
  });
});
