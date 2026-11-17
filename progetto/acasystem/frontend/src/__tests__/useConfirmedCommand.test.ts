import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfirmedCommand } from '@/components/widgets/media/hooks/commands';

/** «Requested vs confirmed»: the timeout drops the request, or reports it when asked to. */

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('useConfirmedCommand timeout', () => {
  it('drops the request silently by default (the other users keep their behaviour)', () => {
    const { result } = renderHook(() => useConfirmedCommand(false));
    act(() => result.current.request(true, () => undefined));
    expect(result.current.value).toBe(true);
    expect(result.current.pending).toBe(true);
    wait(10_000);
    expect(result.current.pending).toBe(false);
    expect(result.current.value).toBe(false);
    expect(result.current.timedOut).toBeNull();
    expect(result.current.error).toBe(false);
  });

  it('reports the message when one is given, and keeps the confirmed value', () => {
    const { result } = renderHook(() =>
      useConfirmedCommand(false, { timeoutMessage: 'Nessuna risposta' })
    );
    act(() => result.current.request(true, () => undefined));
    expect(result.current.confirmed).toBe(false);
    wait(10_000);
    expect(result.current.timedOut).toBe('Nessuna risposta');
    expect(result.current.pending).toBe(false);
  });

  it('retry sends the last request again and clears the message', () => {
    const send = vi.fn();
    const { result } = renderHook(() =>
      useConfirmedCommand(false, { timeoutMessage: 'Nessuna risposta', ignoreWhilePending: true })
    );
    act(() => result.current.request(true, send));
    wait(10_000);
    act(() => result.current.retry());
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.current.timedOut).toBeNull();
    expect(result.current.pending).toBe(true);
  });

  it('a confirmation before the timeout leaves no message', () => {
    const { result, rerender } = renderHook(
      ({ on }) => useConfirmedCommand(on, { timeoutMessage: 'Nessuna risposta' }),
      { initialProps: { on: false } }
    );
    act(() => result.current.request(true, () => undefined));
    rerender({ on: true });
    wait(10_000);
    expect(result.current.timedOut).toBeNull();
    expect(result.current.pending).toBe(false);
  });
});
