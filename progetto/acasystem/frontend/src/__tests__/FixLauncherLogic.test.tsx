import { useMemo, useState } from 'react';
import { act, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { DeviceClass, LauncherLayout } from '@/@types/launcher';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';
import { useWidgetDrag } from '@/hooks/launcher/useWidgetDrag';
import {
  DEFAULT_GRIDS,
  GRID_GAPS,
  cellMetrics,
  deviceClassFor,
} from '@/utils/launcher/deviceClass';
import { packItems } from '@/utils/launcher/grid';
import {
  ensureDeviceClass,
  moveWidgetToPageInLayout,
  placeWidgetInLayout,
  removeWidgetFromLayout,
} from '@/utils/launcher/layout';
import { sanitizeLauncherLayout } from '@/validators/launcher';

const sizes = { min: { w: 2, h: 2 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } };
const idsOf = (layout: LauncherLayout, deviceClass: DeviceClass) =>
  layout.pages.flatMap((page) => Object.keys(page.placements[deviceClass] ?? {}));

describe('launcher final-review regressions', () => {
  it('keeps a newly added widget when a previously shown phone class is full, through profile reload', () => {
    const ids = Array.from({ length: 6 }, (_, index) => `light.${index}`);
    const initial: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: {
            tablet: packItems(
              ids.map((id) => ({ id, size: sizes.default, min: sizes.min })),
              DEFAULT_GRIDS.tablet
            ).placements,
            phone: packItems(
              ids.map((id) => ({ id, size: sizes.default, min: sizes.min })),
              DEFAULT_GRIDS.phone
            ).placements,
          },
        },
      ],
    };
    const result = placeWidgetInLayout(
      initial,
      { deviceClass: 'tablet', grids: DEFAULT_GRIDS, sizesOf: () => sizes },
      'home',
      'light.nuova'
    );
    expect(idsOf(result.layout, 'phone').sort()).toEqual([...ids, 'light.nuova'].sort());
    expect(
      result.layout.pages.find((page) => page.placements.phone?.['light.nuova'])?.continuationOf
    ).toBe('home');
    const reloaded = sanitizeLauncherLayout(JSON.parse(JSON.stringify(result.layout)))!;
    const portrait = ensureDeviceClass(reloaded, {
      deviceClass: 'tabletPortrait',
      grids: DEFAULT_GRIDS,
      sizesOf: () => sizes,
    });
    expect(idsOf(portrait, 'tabletPortrait').sort()).toEqual([...ids, 'light.nuova'].sort());
    expect(
      ensureDeviceClass(portrait, {
        deviceClass: 'tabletPortrait',
        grids: DEFAULT_GRIDS,
        sizesOf: () => sizes,
      })
    ).toBe(portrait);
    expect(idsOf(portrait, 'tablet')).toHaveLength(7);
    const landscape = ensureDeviceClass(portrait, {
      deviceClass: 'phoneLandscape',
      grids: DEFAULT_GRIDS,
      sizesOf: () => sizes,
    });
    expect(idsOf(landscape, 'phoneLandscape').sort()).toEqual([...ids, 'light.nuova'].sort());
    expect(
      ensureDeviceClass(landscape, {
        deviceClass: 'phoneLandscape',
        grids: DEFAULT_GRIDS,
        sizesOf: () => sizes,
      })
    ).toBe(landscape);
  });

  it('repairs missing IDs in an imported class without family metadata and clamps oversized widgets', () => {
    const full = packItems(
      Array.from({ length: 6 }, (_, index) => ({
        id: `w${index}`,
        size: sizes.default,
        min: sizes.min,
      })),
      DEFAULT_GRIDS.phone
    ).placements;
    const initial: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: {
            phone: full,
            tablet: { ...full, extra: { x: 0, y: 0, w: 4, h: 2 } },
          },
        },
      ],
    };
    const repaired = ensureDeviceClass(initial, {
      deviceClass: 'phone',
      grids: DEFAULT_GRIDS,
      sizesOf: () => ({ ...sizes, max: { w: 2, h: 2 } }),
    });
    expect(idsOf(repaired, 'phone').sort()).toEqual([...Object.keys(full), 'extra'].sort());
    const tablet = ensureDeviceClass(repaired, {
      deviceClass: 'tablet',
      grids: DEFAULT_GRIDS,
      sizesOf: () => ({ ...sizes, max: { w: 2, h: 2 } }),
    });
    expect(
      tablet.pages
        .flatMap((page) => Object.values(page.placements.tablet ?? {}))
        .every((rect) => rect.w <= 2 && rect.h <= 2)
    ).toBe(true);
    expect(idsOf(tablet, 'tablet')).toHaveLength(7);
  });

  it('moves membership across classes, overflowing the destination and removing only that family', () => {
    const fullPhone = packItems(
      Array.from({ length: 6 }, (_, index) => ({
        id: `z${index}`,
        size: sizes.default,
        min: sizes.min,
      })),
      DEFAULT_GRIDS.phone
    ).placements;
    const rect = { x: 0, y: 0, w: 2, h: 2 };
    const initial: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: { tablet: { a: rect }, phone: { a: rect } },
        },
        {
          id: 'dest',
          label: 'Studio',
          kind: 'widgets',
          placements: { tablet: {}, phone: fullPhone },
        },
        {
          id: 'independent',
          label: 'Copia voluta',
          kind: 'widgets',
          placements: { tablet: { a: rect }, phone: { a: rect } },
        },
      ],
    };
    const moved = moveWidgetToPageInLayout(
      initial,
      { deviceClass: 'tablet', grids: DEFAULT_GRIDS, sizesOf: () => sizes },
      'home',
      'dest',
      'a'
    )!;
    expect(moved.pages[0].placements.phone?.a).toBeUndefined();
    const overflow = moved.pages.find((page) => page.continuationOf === 'dest');
    expect(overflow?.placements.phone?.a).toBeDefined();
    const removed = removeWidgetFromLayout(moved, 'dest', 'a');
    expect(removed.pages.find((page) => page.id === 'dest')?.placements.tablet?.a).toBeUndefined();
    expect(
      removed.pages.find((page) => page.id === overflow?.id)?.placements.phone?.a
    ).toBeUndefined();
    expect(
      removed.pages.find((page) => page.id === 'independent')?.placements.phone?.a
    ).toBeDefined();
  });

  it('carries current settings back when returning to a page with stale saved settings', () => {
    const { result } = renderHook(() => {
      const [layout, setLayout] = useState<LauncherLayout | null>({
        version: 1,
        cover: { enabled: false },
        pages: [
          {
            id: 'home',
            label: 'Casa',
            kind: 'widgets',
            placements: { tablet: { a: { x: 0, y: 0, w: 2, h: 2 } } },
          },
          { id: 'dest', label: 'Studio', kind: 'widgets', placements: { tablet: {} } },
        ],
      });
      const [settings, setSettings] = useState<CardSettingsMap>({ 'home::a': { size: 'small' } });
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
      return { controller: useLauncherController({ store, deviceClass: 'tablet' }), setSettings };
    });
    act(() => {
      expect(result.current.controller.moveWidgetToPage('home', 'dest', 'a')).toBe(true);
    });
    act(() => {
      result.current.setSettings((saved) => ({
        ...saved,
        'dest::a': { size: 'large', entityId: 'light.new', showState: false },
      }));
    });
    act(() => {
      expect(result.current.controller.moveWidgetToPage('dest', 'home', 'a')).toBe(true);
    });
    expect(result.current.controller.settingsFor('home', 'a')).toEqual({
      size: 'large',
      entityId: 'light.new',
      showState: false,
    });
  });

  // Grid area (.aca-launcher-page without padding) measured with Playwright on launcher.html,
  // view and edit mode (REP-20261006-002). Portrait phone 390×844 in view mode: 366×641,
  // 84 px cells, the reference size at which every widget shows its controls whole.
  const measured = [
    { viewport: [844, 390], view: [802, 247], edit: [802, 185], cells: [118, 87] },
    { viewport: [853, 533], view: [810, 390], edit: [810, 328], cells: [126, 126] },
    { viewport: [640, 400], view: [608, 257], edit: [608, 142], cells: [93, 66] },
  ] as const;
  const portraitCell = cellMetrics(366, 641, DEFAULT_GRIDS.phone, GRID_GAPS.phone).cell;

  it.each(measured)('uses a landscape grid with usable cells at $viewport', (sample) => {
    const deviceClass = deviceClassFor(sample.viewport[0], sample.viewport[1]);
    expect(deviceClass).toBe('phoneLandscape');
    const grid = DEFAULT_GRIDS[deviceClass];
    const gap = GRID_GAPS[deviceClass];
    const view = cellMetrics(sample.view[0], sample.view[1], grid, gap).cell;
    const edit = cellMetrics(sample.edit[0], sample.edit[1], grid, gap).cell;
    expect([view, edit]).toEqual(sample.cells);
    // Never smaller than the 72 px threshold of the review nor than the portrait phone.
    expect(view).toBeGreaterThanOrEqual(72);
    expect(view).toBeGreaterThanOrEqual(portraitCell);
    if (sample.viewport[0] === 640) {
      // Edit mode at 640×400 is bound by the height for every two-row grid: only a shorter
      // edit toolbar (launcher-ui) can give more room.
      expect(edit).toBe(Math.floor((sample.edit[1] - gap) / 2));
    } else {
      expect(edit).toBeGreaterThanOrEqual(72);
    }
  });

  it('keeps the densest landscape grid that stays usable', () => {
    const grid = DEFAULT_GRIDS.phoneLandscape;
    const gap = GRID_GAPS.phoneLandscape;
    const cellsWith = (size: { w: number; h: number }, mode: 'view' | 'edit') =>
      measured.map((sample) => cellMetrics(sample[mode][0], sample[mode][1], size, gap).cell);
    // One more column: the 640×400 cells fall below the portrait phone (2×1 lights cut).
    expect(Math.min(...cellsWith({ w: grid.w + 1, h: grid.h }, 'view'))).toBeLessThan(portraitCell);
    // One more row: edit mode on the phone drops far below 72 px.
    expect(Math.min(...cellsWith({ w: grid.w, h: grid.h + 1 }, 'edit'))).toBeLessThan(72);
  });

  it('cancels a rapid release after edge navigation instead of dropping into the old page', () => {
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
      const { result } = renderHook(() =>
        useWidgetDrag({
          getGeometry: () => ({ left: 0, top: 0, cell: 100, gap: 0, grid: { w: 8, h: 5 } }),
          getPlacements: () => ({ a: { x: 0, y: 0, w: 1, h: 1 } }),
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
      expect(result.current.session?.target).toBeNull();
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 781, clientY: 20 });
      expect(onDrop.mock.calls[0][0].target).toBeNull();
      expect(result.current.session).toBeNull();
      act(() => vi.advanceTimersByTime(500));
      expect(result.current.session).toBeNull();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
