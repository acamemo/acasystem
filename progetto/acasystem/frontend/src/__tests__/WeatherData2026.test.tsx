import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { HaMessageConnection } from '@/@types/ha';
import { getForecast, getHistory } from '@/api';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import {
  useCardWeather,
  useForecast,
  useSensorHistory,
} from '@/components/widgets/home/weather/useWeatherData';
import { fixtureEntity } from '@/utils/fixtures/runtime';
vi.mock('@/api', () => ({ getForecast: vi.fn(), getHistory: vi.fn() }));
const conn: HaMessageConnection = { sendMessagePromise: async () => null };
const forecast = [{ datetime: '2026-11-13T12:00:00Z', temperature: 12 }];
const entity = (id = 'weather.home', features = 3) =>
  fixtureEntity(id, 'sunny', {
    temperature: 18,
    temperature_unit: '°C',
    supported_features: features,
  });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.mocked(getForecast).mockResolvedValue(forecast);
  vi.mocked(getHistory).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});
describe('Weather scoped data .69', () => {
  it('does not request unsupported forecasts', () => {
    const view = renderHook(() => useForecast(conn, entity('weather.home', 1), 'hourly'));
    expect(view.result.current.status).toBe('unsupported');
    expect(getForecast).not.toHaveBeenCalled();
  });
  it('returns a successful empty result rather than old legacy data', async () => {
    vi.mocked(getForecast).mockResolvedValue([]);
    const e = fixtureEntity('weather.home', 'sunny', {
      supported_features: 2,
      forecast: [
        { datetime: '2026-11-13T12:00:00Z', temperature: 12 },
        { datetime: '2026-11-13T13:00:00Z', temperature: 13 },
      ],
    });
    const view = renderHook(() => useForecast(conn, e, 'hourly'));
    await waitFor(() => expect(view.result.current.status).toBe('empty'));
    expect(view.result.current.forecast).toEqual([]);
    expect(view.result.current.source).toBe('ha');
  });
  it('keeps a labelled legacy fallback on failed reads, with explicit retry', async () => {
    vi.mocked(getForecast).mockRejectedValueOnce(new Error('failed'));
    const e = fixtureEntity('weather.home', 'sunny', {
      forecast: [
        { datetime: '2026-11-13T12:00:00Z', temperature: 12 },
        { datetime: '2026-11-13T13:00:00Z', temperature: 13 },
      ],
    });
    const view = renderHook(() => useForecast(conn, e, 'hourly'));
    await waitFor(() => expect(view.result.current.error).toBe(true));
    expect(view.result.current.source).toBe('legacy');
    expect(view.result.current.forecast).toHaveLength(2);
    act(() => view.result.current.retry());
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    expect(view.result.current.error).toBe(false);
    expect(view.result.current.source).toBe('ha');
  });
  it('retains a same-source HA forecast on failed refresh; an authoritative empty retry clears it', async () => {
    vi.useFakeTimers();
    vi.mocked(getForecast)
      .mockResolvedValueOnce(forecast)
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockResolvedValueOnce([]);
    const view = renderHook(() => useForecast(conn, entity(), 'hourly'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.result.current.status).toBe('ready');
    await act(async () => vi.advanceTimersByTimeAsync(30 * 60 * 1000));
    expect(view.result.current.error).toBe(true);
    expect(view.result.current.forecast).toEqual(forecast);
    expect(view.result.current.source).toBe('ha');
    await act(async () => view.result.current.retry());
    expect(view.result.current.status).toBe('empty');
    expect(view.result.current.forecast).toEqual([]);
    expect(view.result.current.error).toBe(false);
  });
  it('does not refetch after ordinary temperature entity-object updates', async () => {
    const view = renderHook(({ e }) => useForecast(conn, e, 'hourly'), {
      initialProps: { e: entity() },
    });
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    view.rerender({ e: { ...entity(), attributes: { ...entity().attributes, temperature: 19 } } });
    expect(getForecast).toHaveBeenCalledTimes(1);
  });
  it('does not expose retained A data when connection changes A -> B -> A', async () => {
    const a = deferred<typeof forecast>();
    const b = deferred<typeof forecast>();
    const fresh = deferred<typeof forecast>();
    vi.mocked(getForecast)
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise)
      .mockReturnValueOnce(fresh.promise);
    const other = { sendMessagePromise: async () => null };
    const view = renderHook(({ c }) => useForecast(c, entity(), 'hourly'), {
      initialProps: { c: conn },
    });
    await act(async () => a.resolve(forecast));
    expect(view.result.current.status).toBe('ready');
    view.rerender({ c: other });
    view.rerender({ c: conn });
    expect(view.result.current.status).toBe('loading');
    expect(view.result.current.forecast).toEqual([]);
    await act(async () => b.resolve([{ ...forecast[0], temperature: 999 }]));
    expect(view.result.current.status).toBe('loading');
    await act(async () => fresh.resolve([{ ...forecast[0], temperature: 21 }]));
    expect(view.result.current.forecast[0].temperature).toBe(21);
  });
  it('drops late responses after entity/type changes', async () => {
    const old = deferred<typeof forecast>();
    vi.mocked(getForecast).mockReturnValueOnce(old.promise);
    const view = renderHook(
      ({ e, t }: { e: ReturnType<typeof entity>; t: 'hourly' | 'daily' }) =>
        useForecast(conn, e, t),
      { initialProps: { e: entity(), t: 'hourly' } }
    );
    view.rerender({ e: entity('weather.garden'), t: 'daily' });
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    await act(async () => old.resolve([{ ...forecast[0], temperature: 999 }]));
    expect(view.result.current.forecast[0].temperature).toBe(12);
  });
  it('hides requests, timers and old results off page; rereads on return', async () => {
    let visible = true;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PageVisibilityContext value={visible}>{children}</PageVisibilityContext>
    );
    const view = renderHook(() => useForecast(conn, entity(), 'hourly'), { wrapper });
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    visible = false;
    view.rerender();
    expect(view.result.current.status).toBe('inactive');
    expect(view.result.current.forecast).toEqual([]);
    visible = true;
    view.rerender();
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    expect(getForecast).toHaveBeenCalledTimes(2);
  });
  it('never queues reads on a closed connection or unavailable entity', () => {
    const view = renderHook(() => useForecast({ ...conn, connected: false }, entity(), 'hourly'));
    expect(view.result.current.error).toBe(true);
    expect(getForecast).not.toHaveBeenCalled();
    view.unmount();
    renderHook(() => useForecast(conn, { ...entity(), state: 'unavailable' }, 'hourly'));
    expect(getForecast).not.toHaveBeenCalled();
  });
  it('bounds a hung forecast at 12 seconds and ignores its late answer', async () => {
    vi.useFakeTimers();
    const pending = deferred<typeof forecast>();
    vi.mocked(getForecast).mockReturnValueOnce(pending.promise);
    const view = renderHook(() => useForecast(conn, entity(), 'hourly'));
    await act(async () => vi.advanceTimersByTimeAsync(12000));
    expect(view.result.current.error).toBe(true);
    await act(async () => pending.resolve(forecast));
    expect(view.result.current.status).toBe('error');
    expect(view.result.current.forecast).toEqual([]);
  });
  it('history preserves only real samples with the exact expected unit and window', async () => {
    const now = Date.now();
    const row = (offset: number, state: string, unit?: string) => ({
      state,
      last_updated: new Date(now + offset * 3600000).toISOString(),
      attributes: unit ? { unit_of_measurement: unit } : {},
    });
    vi.mocked(getHistory).mockResolvedValue([
      row(-2, '10', '°C'),
      row(-1, '50', '°F'),
      row(-1, '20'),
      row(1, '30', '°C'),
      row(-13, '40', '°C'),
      row(-1, '12x', '°C'),
    ]);
    const view = renderHook(() => useSensorHistory(conn, 'sensor.temp', 12, '°C'));
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    expect(view.result.current.points.map((p) => p.value)).toEqual([10]);
    expect(getHistory).toHaveBeenCalledWith(
      conn,
      expect.objectContaining({ minimal_response: false, no_attributes: false })
    );
  });
  it('does not issue an unbounded history query from malformed legacy settings', () => {
    const view = renderHook(() => useSensorHistory(conn, 'sensor.temp', 169, '°C'));
    expect(view.result.current.status).toBe('inactive');
    expect(getHistory).not.toHaveBeenCalled();
  });
  it('history without a verifiable display unit stays inactive', () => {
    const view = renderHook(() => useSensorHistory(conn, 'sensor.temp', 12));
    expect(view.result.current.status).toBe('inactive');
    expect(getHistory).not.toHaveBeenCalled();
  });
  it('history reports errors, retry and a bounded hung request', async () => {
    vi.mocked(getHistory).mockRejectedValueOnce(new Error('history failed'));
    const view = renderHook(() => useSensorHistory(conn, 'sensor.temp', 12, '°C'));
    await waitFor(() => expect(view.result.current.error).toBe(true));
    act(() => view.result.current.retry());
    await waitFor(() => expect(view.result.current.status).toBe('empty'));
    view.unmount();
    vi.useFakeTimers();
    vi.mocked(getHistory).mockReturnValueOnce(new Promise(() => {}));
    const hung = renderHook(() => useSensorHistory(conn, 'sensor.temp', 12, '°C'));
    await act(async () => vi.advanceTimersByTimeAsync(12000));
    expect(hung.result.current.status).toBe('error');
  });
  it('Home requests the configured history window, preserving the default only for old callers', async () => {
    const view = renderHook(() =>
      useCardWeather(conn, 'w', 'weather.home', 'sensor.temp', entity(), '°C', 24)
    );
    await waitFor(() => expect(view.result.current.historyStatus).toBe('empty'));
    const query = vi.mocked(getHistory).mock.calls[0][1];
    expect(query.end.getTime() - query.start.getTime()).toBe(24 * 3600000);
  });
  it('Home only requests supported kinds and exposes provenance independently', async () => {
    const view = renderHook(() =>
      useCardWeather(conn, 'w', 'weather.home', undefined, entity('weather.home', 1))
    );
    await waitFor(() => expect(view.result.current.forecastStatus.daily).toBe('ready'));
    expect(view.result.current.forecastStatus.hourly).toBe('unsupported');
    expect(view.result.current.forecastSource.daily).toBe('ha');
    expect(getForecast).toHaveBeenCalledTimes(1);
  });
});
