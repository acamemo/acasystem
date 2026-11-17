import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LauncherLayout, DeviceClass } from '@/@types/launcher';
import { useLauncherController } from '@/hooks/launcher/useLauncherController';

const initial: LauncherLayout = {
  version: 1,
  commonOrderVersion: 1,
  cover: { enabled: false },
  pages: [
    {
      id: 'home',
      label: 'Casa',
      kind: 'widgets',
      placements: {},
      order: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    },
  ],
};
describe('controller con ordine comune', () => {
  it('un write negato non contamina l’azione successiva quando il documento accepted mantiene la stessa identità', () => {
    const persistLayout = vi.fn();
    const store = {
      ready: true,
      layout: initial,
      persistLayout,
      pagesConfig: { header: [], pages: ['home'], home: [] },
      pageSettings: {},
      cardSettings: {},
    };
    const { result, rerender } = renderHook(() =>
      useLauncherController({ store, deviceClass: 'phone' })
    );
    act(() => result.current.moveWidget('home', 'b', { x: 0, y: 0, w: 2, h: 2 }));
    expect(persistLayout.mock.calls[0]?.[0].pages[0].order.slice(0, 2)).toEqual(['b', 'a']);
    rerender();
    act(() => result.current.resizeWidget('home', 'c', { w: 1, h: 1 }));
    const next = persistLayout.mock.calls[1]?.[0] as LauncherLayout;
    expect(next.pages[0]?.order).toEqual(initial.pages[0]!.order);
    expect(next.pages[0]?.sizeHints?.c).toBeDefined();
  });
  it('crea e scioglie una pila in un segmento pieno senza creare pagine persistenti', () => {
    const { result } = renderHook(() => {
      const [layout, persistLayout] = useState<LauncherLayout | null>(initial);
      const controller = useLauncherController({
        store: {
          ready: true,
          layout,
          persistLayout,
          pagesConfig: { header: [], pages: ['home'], home: [] },
          pageSettings: {},
          cardSettings: {},
        },
        deviceClass: 'phone',
      });
      return { controller, layout };
    });
    let stackId: string | null = null;
    act(() => {
      stackId = result.current.controller.stackWidgets('home', 'b', 'a');
    });
    expect(stackId).toBeTruthy();
    expect(result.current.layout?.pages).toHaveLength(1);
    act(() => result.current.controller.unstackWidget('home', stackId!, 'b'));
    expect(result.current.layout?.pages).toHaveLength(1);
    expect(result.current.layout?.pages[0]?.order).toEqual(initial.pages[0]!.order);
    expect(result.current.layout?.pages[0]?.placements).toEqual({});
  });
  it('ruota e ricava overflow senza scrivere né cambiare le chiavi delle impostazioni', () => {
    const persist = vi.fn();
    const { result, rerender } = renderHook(
      ({ screen }: { screen: DeviceClass }) =>
        useLauncherController({
          store: {
            ready: true,
            layout: initial,
            persistLayout: persist,
            pagesConfig: { header: [], pages: ['home'], home: [] },
            pageSettings: {},
            cardSettings: { 'home::g': { heading: 'Condiviso' } },
          },
          deviceClass: screen,
        }),
      { initialProps: { screen: 'phone' as DeviceClass } }
    );
    const overflow = result.current.layout.pages.find((page) => page.segmentIndex)!;
    expect(overflow).toBeDefined();
    expect(result.current.settingsKeyFor(overflow.id, 'g')).toBe('home::g');
    expect(result.current.settingsFor(overflow.id, 'g').heading).toBe('Condiviso');
    rerender({ screen: 'tablet' });
    expect(persist).not.toHaveBeenCalled();
    expect(initial.pages).toHaveLength(1);
  });
  it('drag e resize salvano ordine e hint, senza geometrie del telefono', () => {
    const { result } = renderHook(() => {
      const [layout, persistLayout] = useState<LauncherLayout | null>(initial);
      const controller = useLauncherController({
        store: {
          ready: true,
          layout,
          persistLayout,
          pagesConfig: { header: [], pages: ['home'], home: [] },
          pageSettings: {},
          cardSettings: {},
        },
        deviceClass: 'phone',
      });
      return { controller, layout };
    });
    act(() => result.current.controller.moveWidget('home', 'b', { x: 0, y: 0, w: 2, h: 2 }));
    expect(result.current.layout?.pages[0]?.order?.slice(0, 2)).toEqual(['b', 'a']);
    const order = [...result.current.layout!.pages[0]!.order!];
    act(() => result.current.controller.resizeWidget('home', 'b', { w: 1, h: 1 }));
    expect(result.current.layout?.pages[0]?.order).toEqual(order);
    expect(result.current.layout?.pages[0]?.sizeHints?.b).toBeDefined();
    expect(
      result.current.layout?.pages.every((page) => Object.keys(page.placements).length === 0)
    ).toBe(true);
    act(() => result.current.controller.removeWidget('home', 'a'));
    expect(result.current.layout?.pages[0]?.order).not.toContain('a');
  });
});
