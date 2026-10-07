import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { PageVisibilityContext, usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useCalendarEvents } from '@/components/widgets/home/calendar/useCalendarEvents';
import { useTodoList } from '@/components/widgets/home/todo/useTodoList';
import { useCardWeather } from '@/components/widgets/home/weather/useWeatherData';
import { CameraWidget } from '@/components/widgets/media/widgets/Camera';
import { useNow } from '@/components/widgets/media/hooks/commands';
import { useQuarterHour } from '@/components/widgets/utilities/energy/NordpoolWidget';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush } from './ControlsHarness';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function pageWrapper() {
  let visible = false;
  function Wrapper({ children }: { children: ReactNode }) {
    return <PageVisibilityContext value={visible}>{children}</PageVisibilityContext>;
  }
  return { Wrapper, show: () => { visible = true; }, hide: () => { visible = false; } };
}

describe('PERF-2: richieste passive soltanto sulla pagina visibile', () => {
  it('calendario: fermo fuori pagina, polling visibile e lettura immediata al ritorno', async () => {
    const { conn, sendMessagePromise } = fakeConnection(() => ({
      response: { 'calendar.ufficio': { events: [] } },
    }));
    const page = pageWrapper();
    const view = renderHook(() => useCalendarEvents(conn, ['calendar.ufficio'], {
      days: 7, refreshMs: 60_000,
    }), { wrapper: page.Wrapper });
    await flush();
    expect(sendMessagePromise).not.toHaveBeenCalled();
    page.show(); view.rerender(); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(60_000)); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(2);
    page.hide(); view.rerender();
    act(() => vi.advanceTimersByTime(5 * 60_000)); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(2);
    expect(view.result.current.loading).toBe(false);
    page.show(); view.rerender(); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(3);
  });

  it('attività: sospende il polling conservando i dati e rilegge la lista al ritorno', async () => {
    const { conn, sendMessagePromise } = fakeConnection(() => ({
      items: [{ uid: 'a', summary: 'Prova', status: 'needs_action' }],
    }));
    const page = pageWrapper();
    const view = renderHook(() => useTodoList(conn, async () => undefined, 'todo.ufficio', 60_000), {
      wrapper: page.Wrapper,
    });
    await flush(); expect(sendMessagePromise).not.toHaveBeenCalled();
    page.show(); view.rerender(); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(1);
    expect(view.result.current.items[0].summary).toBe('Prova');
    page.hide(); view.rerender();
    act(() => vi.advanceTimersByTime(5 * 60_000)); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(1);
    expect(view.result.current.items[0].summary).toBe('Prova');
    page.show(); view.rerender(); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(2);
  });

  it('meteo: nessuna previsione fuori pagina; interrompe entrambi i timer condivisi', async () => {
    const { conn, sendMessagePromise } = fakeConnection(() => ({}));
    const weather = fixtureEntity('weather.ufficio', 'sunny');
    const page = pageWrapper();
    const view = renderHook(() => useCardWeather(conn, 'w', weather.entity_id, undefined, weather), {
      wrapper: page.Wrapper,
    });
    await flush(); expect(sendMessagePromise).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    page.show(); view.rerender(); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(2);
    page.hide(); view.rerender();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(60 * 60_000)); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(2);
    page.show(); view.rerender(); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(4);
  });

  it('lo storico meteo già in volo non avvia una nuova lettura dopo aver nascosto la pagina', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    let finishStatistics: (value: unknown) => void = () => undefined;
    const statistics = new Promise<unknown>((resolve) => { finishStatistics = resolve; });
    const { conn, sendMessagePromise } = fakeConnection((message) =>
      message.type === 'recorder/statistics_during_period' ? statistics : {}
    );
    const weather = fixtureEntity('weather.ufficio', 'sunny');
    const page = pageWrapper();
    const view = renderHook(() => useCardWeather(conn, 'w', weather.entity_id, 'sensor.temperatura', weather), {
      wrapper: page.Wrapper,
    });
    page.show(); view.rerender();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(sendMessagePromise.mock.calls.some(([message]) =>
      message.type === 'recorder/statistics_during_period'
    )).toBe(true);
    page.hide(); view.rerender();
    finishStatistics({}); await flush();
    expect(sendMessagePromise.mock.calls.some(([message]) =>
      message.type === 'history/history_during_period'
    )).toBe(false);
  });

  it('videocamera: non firma né scarica istantanee nascosta, poi aggiorna al ritorno', async () => {
    const { conn, sendMessagePromise } = fakeConnection(() => ({ path: '/api/camera_proxy/camera.ufficio?authSig=fixture' }));
    const runtime = createFixtureRuntime({ conn, entities: fixtureEntities([
      fixtureEntity('camera.ufficio', 'idle', { friendly_name: 'Ufficio', access_token: 'fixture' }),
    ]) });
    const node = (visible: boolean) => (
      <PageVisibilityContext value={visible}>
        <WidgetRuntimeProvider value={runtime}>
          <CameraWidget id="camera_card_1" settingsKey="k" settings={{
            cameraId: 'camera.ufficio', cameraRefreshInterval: 5,
          }} size={{ w: 2, h: 2 }} editMode={false} />
        </WidgetRuntimeProvider>
      </PageVisibilityContext>
    );
    const view = render(node(false));
    await flush(); expect(sendMessagePromise).not.toHaveBeenCalled();
    expect(view.container.querySelector('img')).toBeNull();
    act(() => vi.advanceTimersByTime(10_000)); await flush();
    expect(sendMessagePromise).not.toHaveBeenCalled();
    view.rerender(node(true)); await flush();
    expect(view.container.querySelector('img')).not.toBeNull();
    const afterShow = sendMessagePromise.mock.calls.length;
    act(() => vi.advanceTimersByTime(5000)); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(afterShow + 1);
    view.rerender(node(false));
    const afterHide = sendMessagePromise.mock.calls.length;
    act(() => vi.advanceTimersByTime(60_000)); await flush();
    expect(sendMessagePromise).toHaveBeenCalledTimes(afterHide);
    view.rerender(node(true)); await flush();
    expect(sendMessagePromise.mock.calls.length).toBeGreaterThan(afterHide);
  });

  it('media e Nordpool: nessun timer fuori pagina e tempo riallineato appena torna visibile', () => {
    const page = pageWrapper();
    const view = renderHook(() => {
      const visible = usePageVisible();
      return { media: useNow(1000, visible), prices: useQuarterHour() };
    }, { wrapper: page.Wrapper });
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(20 * 60_000));
    page.show(); view.rerender();
    expect(view.result.current.media).toBe(Date.now());
    expect(view.result.current.prices.getTime()).toBe(Date.now());
    expect(vi.getTimerCount()).toBe(2);
    page.hide(); view.rerender();
    expect(vi.getTimerCount()).toBe(0);
  });
});
