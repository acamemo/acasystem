import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONFIRM_TIMEOUT_MS,
  FAILURE_MESSAGE_MS,
  useRequestedState,
} from '@/components/widgets/controls/shared/useRequestedState';
import {
  GESTURE_SEND_INTERVAL_MS,
  useThrottledSender,
} from '@/components/widgets/controls/shared/useThrottledSender';
import { italianNumber } from '@/components/widgets/controls/shared/format';
import { densityOf } from '@/components/widgets/controls/shared/entity';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useThrottledSender (invii limitati durante il gesto)', () => {
  it('intervallo tra 150 e 200 ms come chiede design.md', () => {
    expect(GESTURE_SEND_INTERVAL_MS).toBeGreaterThanOrEqual(150);
    expect(GESTURE_SEND_INTERVAL_MS).toBeLessThanOrEqual(200);
  });

  it('primo valore subito, poi l’ultimo a ogni intervallo, poi quello finale', () => {
    const send = vi.fn();
    const { result } = renderHook(() => useThrottledSender<number>(send, 180));
    act(() => result.current.push(10));
    expect(send.mock.calls).toEqual([[10]]);
    act(() => {
      vi.advanceTimersByTime(60);
      result.current.push(20);
      vi.advanceTimersByTime(60);
      result.current.push(30);
    });
    expect(send).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(send.mock.calls).toEqual([[10], [30]]);
    act(() => {
      vi.advanceTimersByTime(20);
      result.current.push(40);
      result.current.flush(45);
    });
    expect(send.mock.calls).toEqual([[10], [30], [45]]);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('il valore finale uguale all’ultimo inviato non viene ripetuto', () => {
    const send = vi.fn();
    const { result } = renderHook(() => useThrottledSender<number>(send, 180));
    act(() => {
      result.current.push(50);
      result.current.flush(50);
    });
    expect(send.mock.calls).toEqual([[50]]);
  });

  it('cancel scarta il valore in attesa', () => {
    const send = vi.fn();
    const { result } = renderHook(() => useThrottledSender<number>(send, 180));
    act(() => {
      result.current.push(1);
      result.current.push(2);
      result.current.cancel();
      vi.advanceTimersByTime(500);
    });
    expect(send.mock.calls).toEqual([[1]]);
  });
});

describe('useRequestedState (richiesto vs confermato)', () => {
  const same = (a: number, b: number) => a === b;

  it('mostra il valore richiesto fino alla conferma', () => {
    const { result, rerender } = renderHook(
      ({ confirmed }) => useRequestedState<number>({ confirmed, matches: same }),
      { initialProps: { confirmed: 1 } }
    );
    act(() => {
      result.current.request(5);
      result.current.settle();
    });
    expect(result.current).toMatchObject({ value: 5, pending: true, status: 'pending' });
    rerender({ confirmed: 3 });
    expect(result.current.value).toBe(5);
    rerender({ confirmed: 5 });
    expect(result.current).toMatchObject({ value: 5, pending: false, status: 'idle' });
  });

  it('durante il gesto non conferma valori intermedi', () => {
    const { result, rerender } = renderHook(
      ({ confirmed }) => useRequestedState<number>({ confirmed, matches: same }),
      { initialProps: { confirmed: 0 } }
    );
    act(() => {
      result.current.hold(true);
      result.current.request(4);
    });
    rerender({ confirmed: 4 });
    expect(result.current.pending).toBe(true);
    act(() => result.current.hold(false));
    expect(result.current.pending).toBe(false);
  });

  it('errore: torna il valore confermato con il messaggio, che poi sparisce', async () => {
    const { result } = renderHook(() => useRequestedState<number>({ confirmed: 1, matches: same }));
    act(() => {
      result.current.request(2);
      result.current.track(Promise.reject(new Error('no')));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toMatchObject({ value: 1, status: 'error', failed: true });
    expect(result.current.message).toBe('Comando non riuscito');
    act(() => {
      vi.advanceTimersByTime(FAILURE_MESSAGE_MS);
    });
    expect(result.current).toMatchObject({ status: 'idle', message: null });
  });

  it('timeout: nessuna conferma in tempo', () => {
    const { result } = renderHook(() => useRequestedState<number>({ confirmed: 1, matches: same }));
    act(() => {
      result.current.request(2);
      result.current.settle();
    });
    act(() => {
      vi.advanceTimersByTime(CONFIRM_TIMEOUT_MS);
    });
    expect(result.current).toMatchObject({ value: 1, status: 'timeout' });
    expect(result.current.message).toBe('Nessuna conferma da Home Assistant');
  });

  it('un errore di una richiesta superata non cancella quella nuova', async () => {
    const { result } = renderHook(() => useRequestedState<number>({ confirmed: 1, matches: same }));
    let fail: (reason: unknown) => void = () => undefined;
    act(() => {
      result.current.request(2);
      result.current.track(
        new Promise((_, reject) => {
          fail = reject;
        })
      );
      result.current.request(3);
    });
    await act(async () => {
      fail(new Error('vecchia'));
      await Promise.resolve();
    });
    expect(result.current).toMatchObject({ value: 3, status: 'pending' });
  });
});

describe('utilità', () => {
  it('densità dalla dimensione in celle', () => {
    expect(densityOf({ w: 1, h: 1 })).toBe('compact');
    expect(densityOf({ w: 2, h: 1 })).toBe('wide');
    expect(densityOf({ w: 1, h: 2 })).toBe('tall');
    expect(densityOf({ w: 2, h: 2 })).toBe('large');
    expect(densityOf({ w: 4, h: 2 })).toBe('large');
  });

  it('numeri in formato italiano', () => {
    expect(italianNumber('21.5')).toBe('21,5');
    expect(italianNumber('-3')).toBe('-3');
    expect(italianNumber('12345.6')).toBe('12.345,6');
    expect(italianNumber('acceso')).toBe('acceso');
  });
});
