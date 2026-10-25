/**
 * Ripresa della corsia launcher-logica (REP-20261006-002): rotazione reale del controller
 * (CORR-4), scenario esatto di CORR-6, dati salvati prima della correzione e assestamento
 * del trascinamento al bordo (CORR-7).
 */
import { useMemo, useState } from 'react';
import { act, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CardSettingsMap, PagesConfig } from '@/@types/dashboard';
import type { BaseDeviceClass, DeviceClass, LauncherLayout } from '@/@types/launcher';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';
import { useWidgetDrag } from '@/hooks/launcher/useWidgetDrag';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { packItems, type Placements } from '@/utils/launcher/grid';
import {
  addPageToLayout,
  ensureDeviceClass,
  moveWidgetToPageInLayout,
  placeWidgetInLayout,
  removePageFromLayout,
  removeWidgetFromLayout,
  type LayoutContext,
} from '@/utils/launcher/layout';
import { layoutToPagesConfig } from '@/utils/launcher/legacySync';

const sizes = { min: { w: 2, h: 2 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } };
const ctxFor = (deviceClass: DeviceClass): LayoutContext => ({
  deviceClass,
  grids: DEFAULT_GRIDS,
  sizesOf: () => sizes,
});
const full = (deviceClass: BaseDeviceClass, prefix: string, count: number) =>
  packItems(
    Array.from({ length: count }, (_, index) => ({
      id: `${prefix}${index}`,
      size: sizes.default,
      min: sizes.min,
    })),
    DEFAULT_GRIDS[deviceClass]
  ).placements;
const pagesWith = (layout: LauncherLayout, deviceClass: DeviceClass, widgetId: string) =>
  layout.pages.filter((page) => page.placements[deviceClass]?.[widgetId]).map((page) => page.id);

describe('launcher-logica: ripresa della revisione', () => {
  it('CORR-4: a widget added on the tablet shows up after rotating to a full portrait page', () => {
    // 12 widgets 2×2 fill the 6×8 portrait grid. On the 8×5 tablet 8 of them fit home and
    // 4 go to a continuation; the last tablet row of home is free for a 2×1 widget.
    const small = { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 1 } };
    const sizesOf = (widgetId: string) => (widgetId === 'light.nuova' ? small : sizes);
    const portrait = full('tabletPortrait', 'w', 12);
    const seeded = ensureDeviceClass(
      {
        version: 1,
        cover: { enabled: false },
        pages: [
          { id: 'home', label: 'Casa', kind: 'widgets', placements: { tabletPortrait: portrait } },
        ],
      },
      { deviceClass: 'tablet', grids: DEFAULT_GRIDS, sizesOf }
    );
    const { result, rerender } = renderHook(
      ({ deviceClass }: { deviceClass: DeviceClass }) => {
        const [layout, setLayout] = useState<LauncherLayout | null>(seeded);
        const store = useMemo<LauncherStore>(
          () => ({
            ready: true,
            layout,
            persistLayout: setLayout,
            pagesConfig: { pages: [], header: [] } as PagesConfig,
            pageSettings: {},
            cardSettings: {},
          }),
          [layout]
        );
        return useLauncherController({
          store,
          deviceClass,
          resolveSizes: (widgetId) => sizesOf(widgetId),
        });
      },
      { initialProps: { deviceClass: 'tablet' as DeviceClass } }
    );
    expect(pagesWith(result.current.layout, 'tabletPortrait', 'w11')).toEqual(['home']);
    act(() => {
      expect(result.current.placeWidget('home', 'light.nuova')).toBe('home');
    });
    rerender({ deviceClass: 'tabletPortrait' });
    const shown = result.current.entries
      .filter((entry) => entry.type === 'page')
      .map((entry) => (entry.type === 'page' ? entry.page : null))
      .filter((page) => page?.placements.tabletPortrait?.['light.nuova']);
    expect(shown).toHaveLength(1);
    expect(shown[0]?.continuationOf).toBe('home');
    expect(pagesWith(result.current.layout, 'tablet', 'light.nuova')).toEqual(['home']);
  });

  it('CORR-4: a widget already on another page is still repaired on the new page', () => {
    const initial: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: {
            tablet: { 'light.x': { x: 0, y: 0, w: 2, h: 2 } },
            phone: { 'light.x': { x: 0, y: 0, w: 2, h: 2 } },
          },
        },
        {
          id: 'luci',
          label: 'Luci',
          kind: 'widgets',
          placements: { tablet: {}, phone: full('phone', 'z', 6) },
        },
      ],
    };
    const result = placeWidgetInLayout(initial, ctxFor('tablet'), 'luci', 'light.x');
    expect(result.placed).toBe(true);
    const phonePages = pagesWith(result.layout, 'phone', 'light.x');
    expect(phonePages).toHaveLength(2);
    expect(phonePages).toContain('home');
    const continuation = result.layout.pages.find(
      (page) => page.id !== 'home' && page.placements.phone?.['light.x']
    );
    expect(continuation?.continuationOf).toBe('luci');
  });

  it('CORR-6: after a move on the tablet, «Rimuovi» does not leave the widget on the source page', () => {
    const rect = { x: 0, y: 0, w: 2, h: 2 };
    const initial: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        { id: 'home', label: 'Casa', kind: 'widgets', placements: { tablet: { 'light.a': rect } } },
        { id: 'altra', label: 'Altra', kind: 'widgets', placements: { tablet: {} } },
      ],
    };
    const shown = ensureDeviceClass(initial, ctxFor('tabletPortrait'));
    expect(shown.pages[0].placements.tabletPortrait?.['light.a']).toBeDefined();
    const moved = moveWidgetToPageInLayout(shown, ctxFor('tablet'), 'home', 'altra', 'light.a')!;
    expect(pagesWith(moved, 'tabletPortrait', 'light.a')).toEqual(['altra']);
    const removed = removeWidgetFromLayout(moved, 'altra', 'light.a');
    expect(removed.pages[0].placements.tabletPortrait?.['light.a']).toBeUndefined();
    const config = layoutToPagesConfig(removed, { pages: [], header: [] }, 'tablet');
    expect(config.home).not.toContain('light.a');
    expect(config.altra).not.toContain('light.a');
    // The widget can be offered again for home and lands there in both classes.
    const back = placeWidgetInLayout(removed, ctxFor('tablet'), 'home', 'light.a');
    expect(pagesWith(back.layout, 'tablet', 'light.a')).toEqual(['home']);
    expect(pagesWith(back.layout, 'tabletPortrait', 'light.a')).toEqual(['home']);
  });

  it('keeps per-class moves saved before the fix instead of duplicating the widget', () => {
    // Saved by the earlier build: «a» moved from home to altra on the tablet only.
    const rect = (x: number) => ({ x, y: 0, w: 2, h: 2 });
    const saved: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: { tablet: { b: rect(0) }, phone: { a: rect(0), b: rect(2) } },
        },
        {
          id: 'altra',
          label: 'Altra',
          kind: 'widgets',
          placements: { tablet: { a: rect(0) }, phone: {} },
        },
      ],
    };
    expect(ensureDeviceClass(saved, ctxFor('tablet'))).toBe(saved);
    expect(ensureDeviceClass(saved, ctxFor('phone'))).toBe(saved);
  });

  it('does not duplicate old continuation pages without a family marker in a new class', () => {
    // Old continuation: «b» did not fit the phone page, explicitly empty elsewhere, and no
    // phoneLandscape placements yet (the class did not exist).
    const rect = (x: number) => ({ x, y: 0, w: 2, h: 2 });
    const saved: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: { tablet: { a: rect(0), b: rect(2) }, phone: { a: rect(0) } },
        },
        {
          id: 'casa_2',
          label: 'Casa 2',
          kind: 'widgets',
          placements: { tablet: {}, tabletPortrait: {}, phone: { b: rect(0) } },
        },
      ],
    };
    expect(ensureDeviceClass(saved, ctxFor('tablet'))).toBe(saved);
    const landscape = ensureDeviceClass(saved, ctxFor('phoneLandscape'));
    // A landscape phone shows the pages without columns on 8×2 (REP-20261008-001).
    expect(pagesWith(landscape, 'phoneLandscape@8x2', 'a')).toEqual(['home']);
    expect(pagesWith(landscape, 'phoneLandscape@8x2', 'b')).toEqual(['home']);
    expect(ensureDeviceClass(landscape, ctxFor('phoneLandscape'))).toBe(landscape);
  });

  it('CORR-6: a page that reuses the id of a removed page does not join its continuations', () => {
    const rect = { x: 0, y: 0, w: 2, h: 2 };
    const initial: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        { id: 'home', label: 'Casa', kind: 'widgets', placements: { tablet: {} } },
        { id: 'studio', label: 'Studio', kind: 'widgets', placements: { tablet: { w: rect } } },
        {
          id: 'studio_2',
          label: 'Studio 2',
          kind: 'widgets',
          continuationOf: 'studio',
          placements: { tablet: {}, phone: { w: rect } },
        },
        {
          id: 'studio_3',
          label: 'Studio 3',
          kind: 'widgets',
          continuationOf: 'studio',
          placements: { tablet: {}, phone: { v: rect } },
        },
      ],
    };
    const removed = removePageFromLayout(initial, 'studio');
    expect(removed.pages.find((page) => page.id === 'studio_2')?.continuationOf).toBeUndefined();
    expect(removed.pages.find((page) => page.id === 'studio_3')?.continuationOf).toBe('studio_2');
    const added = addPageToLayout(removed, { label: 'Studio' });
    expect(added.pageId).toBe('studio');
    const withWidget = placeWidgetInLayout(added.layout, ctxFor('tablet'), 'studio', 'w').layout;
    const cleared = removeWidgetFromLayout(withWidget, 'studio', 'w');
    expect(pagesWith(cleared, 'phone', 'w')).toEqual(['studio_2']);
  });

  it('CORR-3: settings follow the widget to the continuation that receives it in another class', () => {
    const { result } = renderHook(() => {
      const [layout, setLayout] = useState<LauncherLayout | null>({
        version: 1,
        cover: { enabled: false },
        pages: [
          {
            id: 'home',
            label: 'Casa',
            kind: 'widgets',
            placements: {
              tablet: { a: { x: 0, y: 0, w: 2, h: 2 } },
              phone: { a: { x: 0, y: 0, w: 2, h: 2 } },
            },
          },
          {
            id: 'dest',
            label: 'Studio',
            kind: 'widgets',
            placements: { tablet: {}, phone: full('phone', 'z', 6) },
          },
        ],
      });
      const [settings, setSettings] = useState<CardSettingsMap>({
        'home::a': { size: 'large', entityId: 'light.a' },
      });
      const store = useMemo<LauncherStore>(
        () => ({
          ready: true,
          layout,
          persistLayout: setLayout,
          pagesConfig: { pages: [], header: [] },
          pageSettings: {},
          cardSettings: settings,
          persistCardSettings: setSettings,
        }),
        [layout, settings]
      );
      return useLauncherController({ store, deviceClass: 'tablet', resolveSizes: () => sizes });
    });
    act(() => {
      expect(result.current.moveWidgetToPage('home', 'dest', 'a')).toBe(true);
    });
    const continuation = result.current.layout.pages.find(
      (page) => page.continuationOf === 'dest' && page.placements.phone?.a
    );
    expect(continuation).toBeDefined();
    expect(result.current.settingsFor('dest', 'a')).toEqual({ size: 'large', entityId: 'light.a' });
    expect(result.current.settingsFor(continuation!.id, 'a')).toEqual({
      size: 'large',
      entityId: 'light.a',
    });
  });

  it('CORR-7: targets the new page as soon as the page turns, never the old one', () => {
    class Pointer extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 0;
      }
    }
    vi.stubGlobal('PointerEvent', Pointer);
    vi.useFakeTimers();
    try {
      const onDrop = vi.fn();
      const onEdge = vi.fn(() => 'p2');
      const getGeometry = vi.fn((_pageId: string) => ({
        left: 0,
        top: 0,
        cell: 100,
        gapX: 0,
        gapY: 0,
        grid: { w: 8, h: 5 },
      }));
      const { result } = renderHook(() =>
        useWidgetDrag({
          getGeometry,
          getPlacements: (pageId): Placements =>
            pageId === 'p1' ? { a: { x: 0, y: 0, w: 1, h: 1 } } : {},
          sizesFor: () => undefined,
          getPagerBounds: () => ({ left: 0, right: 800 }),
          onEdge,
          onDrop,
        })
      );
      act(() =>
        result.current.begin({
          mode: 'move',
          widgetId: 'a',
          label: 'Luce',
          pageId: 'p1',
          origin: { x: 0, y: 0, w: 1, h: 1 },
          box: { left: 0, top: 0, width: 100, height: 100 },
          clientX: 20,
          clientY: 20,
          pointerId: 1,
        })
      );
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 780, clientY: 20 });
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 781, clientY: 20 });
      act(() => vi.advanceTimersByTime(700));
      expect(onEdge).toHaveBeenCalledOnce();
      // No wait for the scroll (REP-20261009-004): the grids report where the page rests.
      expect(result.current.session?.target?.pageId).toBe('p2');
      // A move while the page scrolls does not measure the old page.
      getGeometry.mockClear();
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 300, clientY: 20 });
      act(() => vi.advanceTimersByTime(20));
      expect(result.current.session?.target?.pageId).toBe('p2');
      expect(getGeometry).not.toHaveBeenCalledWith('p1');
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 300, clientY: 20 });
      expect(onDrop).toHaveBeenCalledOnce();
      expect(onDrop.mock.calls[0][0].target).toMatchObject({ pageId: 'p2', valid: true });
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
