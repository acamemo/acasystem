import { useMemo, useState, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettingsMap, PagesConfig, PageSettingsMap } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import { applySnapshot, collectSnapshot } from '@/api/snapshot';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';
import { EDIT_DONE_EVENT, LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { isCellRect, isLauncherLayout, sanitizeLauncherLayout } from '@/validators/launcher';
import { snapshotLauncherLayout } from '@/validators/snapshot';
import { CATEGORY_PAGES, categoryPageSeeds } from '@/templates/sheets/categoryPages';

const legacyConfig: PagesConfig = {
  header: [],
  pages: ['home', 'luci'],
  home: ['sensor.a', 'light.b'],
  luci: ['light.c'],
};

/** Local store with spies, like the preview; `ready` as PageContext after loading. */
function useTestStore(initial: LauncherLayout | null = null) {
  const [layout, setLayout] = useState<LauncherLayout | null>(initial);
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>(legacyConfig);
  const [pageSettings, setPageSettings] = useState<PageSettingsMap>({
    home: { label: 'Casa' },
  });
  const [cardSettings, setCardSettings] = useState<CardSettingsMap>({
    'home::light.b': { size: 'small' },
  });
  const store = useMemo<LauncherStore>(
    () => ({
      ready: true,
      layout,
      persistLayout: setLayout,
      pagesConfig,
      pageSettings,
      cardSettings,
      persistPagesConfig: setPagesConfig,
      persistPageSettings: setPageSettings,
      persistCardSettings: setCardSettings,
    }),
    [layout, pagesConfig, pageSettings, cardSettings]
  );
  return store;
}

function renderController() {
  return renderHook(() => {
    const store = useTestStore();
    const controller = useLauncherController({ store, deviceClass: 'tablet' });
    return { store, controller };
  });
}

describe('launcher controller', () => {
  it('starts with every category automatically and never restores a removed category after reload/import', () => {
    const { result, unmount } = renderHook(() => {
      const store = useTestStore();
      return {
        store,
        controller: useLauncherController({
          store,
          deviceClass: 'tablet',
          initializeCategoryPages: true,
        }),
      };
    });
    expect(result.current.controller.layout.categoryDefaultsVersion).toBe(1);
    expect(
      Object.values(result.current.store.cardSettings).filter(
        (settings) => settings.categoryWidgetType
      )
    ).toHaveLength(26);
    expect(result.current.controller.currentPageId).toBe('home');
    const removed = result.current.controller.layout.pages.find(
      (page) => page.label === 'Sicurezza'
    )!;
    act(() => result.current.controller.removePage(removed.id));
    const saved = snapshotLauncherLayout({ launcherLayout: result.current.store.layout })!;
    expect(saved.categoryDefaultsVersion).toBe(1);
    unmount();
    const reload = renderHook(() => {
      const store = useTestStore(saved);
      return useLauncherController({ store, deviceClass: 'phone', initializeCategoryPages: true });
    });
    expect(reload.result.current.layout.pages.some((page) => page.label === 'Sicurezza')).toBe(
      false
    );
    expect(reload.result.current.layout.categoryDefaultsVersion).toBe(1);
  });

  it('adds missing default categories once without duplicating an existing renamed category', () => {
    const { result, rerender } = renderHook(
      ({ initialize }) => {
        const store = useTestStore();
        return {
          store,
          controller: useLauncherController({
            store,
            deviceClass: 'tablet',
            initializeCategoryPages: initialize,
          }),
        };
      },
      { initialProps: { initialize: false } }
    );
    let pageId = '';
    act(() => {
      pageId = result.current.controller.addPage({ label: 'I miei comandi', category: 'comandi' });
    });
    rerender({ initialize: true });
    expect(
      result.current.controller.layout.pages.filter((page) => page.id === pageId)
    ).toHaveLength(1);
    expect(
      result.current.controller.layout.pages.some((page) => page.label === 'Luci e comandi')
    ).toBe(false);
    expect(
      Object.values(result.current.store.cardSettings).filter(
        (settings) => settings.categoryWidgetType
      )
    ).toHaveLength(26);
  });
  it('seeds all categories in one event on a small grid without losing bindings or duplicating widgets', () => {
    const { result } = renderHook(() => {
      const store = useTestStore();
      return { store, controller: useLauncherController({ store, deviceClass: 'phoneLandscape' }) };
    });
    const roots: string[] = [];
    act(() => {
      for (const category of CATEGORY_PAGES)
        roots.push(
          result.current.controller.addPage({ label: category.label, category: category.id })
        );
    });
    const pages = result.current.controller.layout.pages.filter((page) =>
      roots.includes(page.continuationOf ?? page.id)
    );
    expect(pages.some((page) => page.continuationOf)).toBe(false);
    const ids = pages.flatMap((page) =>
      Object.keys(page.placements[result.current.controller.classFor(page.id)] ?? {})
    );
    expect(ids).toHaveLength(26);
    expect(new Set(ids).size).toBe(26);
    for (const page of pages)
      for (const id of Object.keys(
        page.placements[result.current.controller.classFor(page.id)] ?? {}
      )) {
        expect(result.current.controller.settingsFor(page.id, id).categoryWidgetType).toBeTruthy();
      }
  });
  it('creates every category as ordinary editable pages, keeping settings on each continuation', () => {
    const { result } = renderController();
    const original = result.current.controller.layout.pages.filter(
      (page) => page.id === 'home' || page.id === 'luci'
    );
    for (const category of CATEGORY_PAGES) {
      let id = '';
      act(() => {
        id = result.current.controller.addPage({ label: category.label, category: category.id });
      });
      const family = result.current.controller.layout.pages.filter(
        (page) => (page.continuationOf ?? page.id) === id
      );
      expect(family.every((page) => page.kind === 'widgets')).toBe(true);
      const ids = family.flatMap((page) =>
        Object.keys(page.placements[result.current.controller.classFor(page.id)] ?? {})
      );
      expect(ids.sort()).toEqual(
        categoryPageSeeds(category.id, id)
          .map((seed) => seed.id)
          .sort()
      );
      for (const page of family)
        for (const widgetId of Object.keys(
          page.placements[result.current.controller.classFor(page.id)] ?? {}
        )) {
          expect(
            result.current.controller.settingsFor(page.id, widgetId).categoryWidgetType
          ).toBeTruthy();
        }
      const first = ids[0];
      const owner = family.find(
        (page) => page.placements[result.current.controller.classFor(page.id)]?.[first]
      )!;
      act(() => result.current.controller.removeWidget(owner.id, first));
      expect(
        result.current.controller.findPage(owner.id)?.placements[
          result.current.controller.classFor(owner.id)
        ]?.[first]
      ).toBeUndefined();
    }
    expect(
      result.current.controller.layout.pages.filter(
        (page) => page.id === 'home' || page.id === 'luci'
      )
    ).toEqual(original);
  });
  it('migrates the legacy layout once and mirrors it back', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.store.layout).not.toBeNull());
    const layout = result.current.store.layout!;
    expect(layout.pages.map((page) => page.id)).toEqual(['home', 'luci']);
    expect(layout.pages[0].label).toBe('Casa');
    expect(layout.pages[0].placements.tablet).toEqual({
      'sensor.a': { x: 0, y: 0, w: 2, h: 2 },
      'light.b': { x: 2, y: 0, w: 2, h: 1 },
    });
    // The entries of the pager: cover, then the two pages.
    expect(result.current.controller.entries.map((entry) => entry.key)).toEqual([
      'cover',
      'home',
      'luci',
    ]);
    await waitFor(() => expect(result.current.store.pageSettings.luci).toEqual({ label: 'luci' }));
  });

  it('places, moves, resizes and removes widgets, keeping pagesConfig in step', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.store.layout).not.toBeNull());

    act(() => result.current.controller.placeWidget('home', 'switch.d', { w: 2, h: 2 }));
    expect(result.current.store.layout?.pages[0].placements.tablet?.['switch.d']).toEqual({
      x: 4,
      y: 0,
      w: 2,
      h: 2,
    });
    await waitFor(() =>
      expect(result.current.store.pagesConfig.home).toEqual(['sensor.a', 'light.b', 'switch.d'])
    );

    let moved = false;
    act(() => {
      moved = result.current.controller.moveWidget('home', 'switch.d', { x: 6, y: 3, w: 2, h: 2 });
    });
    expect(moved).toBe(true);
    let refused = true;
    act(() => {
      refused = result.current.controller.moveWidget('home', 'switch.d', {
        x: 7,
        y: 3,
        w: 2,
        h: 2,
      });
    });
    expect(refused).toBe(false);

    act(() => {
      result.current.controller.resizeWidget('home', 'light.b', { w: 2, h: 2 });
    });
    expect(result.current.store.layout?.pages[0].placements.tablet?.['light.b']).toEqual({
      x: 2,
      y: 0,
      w: 2,
      h: 2,
    });

    act(() => result.current.controller.removeWidget('home', 'sensor.a'));
    await waitFor(() =>
      expect(result.current.store.pagesConfig.home).toEqual(['light.b', 'switch.d'])
    );
  });

  it('places several widgets in the same tick without losing any', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.store.layout).not.toBeNull());
    act(() => {
      result.current.controller.placeWidget('luci', 'light.x', { w: 2, h: 1 });
      result.current.controller.placeWidget('luci', 'light.y', { w: 2, h: 1 });
      result.current.controller.placeWidget('luci', 'light.z', { w: 2, h: 1 });
    });
    const placements = result.current.store.layout?.pages[1].placements.tablet ?? {};
    expect(Object.keys(placements).sort()).toEqual(['light.c', 'light.x', 'light.y', 'light.z']);
  });

  it('moves a widget to another page and copies its settings', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.store.layout).not.toBeNull());
    let done = false;
    act(() => {
      done = result.current.controller.moveWidgetToPage('home', 'luci', 'light.b');
    });
    expect(done).toBe(true);
    expect(result.current.store.layout?.pages[1].placements.tablet?.['light.b']).toBeDefined();
    expect(result.current.store.cardSettings['luci::light.b']).toEqual({ size: 'small' });
  });

  it('manages pages and the cover', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.store.layout).not.toBeNull());
    let pageId = '';
    act(() => {
      pageId = result.current.controller.addPage({ label: 'Batterie', kind: 'battery' });
    });
    expect(pageId).toBe('battery');
    expect(result.current.controller.currentPageId).toBe('battery');
    await waitFor(() =>
      expect(result.current.store.pageSettings.battery).toEqual({
        label: 'Batterie',
        type: 'battery',
      })
    );

    act(() => result.current.controller.updatePage('luci', { label: 'Luci', hidden: true }));
    expect(result.current.controller.entries.map((entry) => entry.key)).toEqual([
      'cover',
      'home',
      'battery',
    ]);
    act(() => result.current.controller.reorderPages(['battery', 'home', 'luci']));
    act(() => result.current.controller.removePage('home'));
    expect(result.current.store.layout?.pages.map((page) => page.id)).toEqual([
      'battery',
      'home',
      'luci',
    ]);
    act(() => result.current.controller.setCoverEnabled(false));
    expect(result.current.controller.entries[0].key).toBe('battery');
  });

  it('goes to pages by index and fires tunet:edit-done when edit mode ends', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.store.layout).not.toBeNull());
    act(() => result.current.controller.goToPage(2));
    expect(result.current.controller.currentPageId).toBe('luci');
    expect(result.current.controller.currentPage).toBe(2);

    const listener = vi.fn();
    window.addEventListener(EDIT_DONE_EVENT, listener);
    act(() => result.current.controller.setEditMode(true));
    expect(listener).not.toHaveBeenCalled();
    act(() => result.current.controller.setEditMode(false));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(EDIT_DONE_EVENT, listener);
  });

  it('uses the definition sizes when it places a widget', async () => {
    const { result } = renderHook(() => {
      const store = useTestStore();
      const controller = useLauncherController({
        store,
        deviceClass: 'tablet',
        resolveSizes: (id) =>
          id === 'climate_card_1'
            ? { min: { w: 2, h: 2 }, max: { w: 4, h: 4 }, default: { w: 3, h: 2 } }
            : undefined,
      });
      return { store, controller };
    });
    await waitFor(() => expect(result.current.store.layout).not.toBeNull());
    act(() => result.current.controller.placeWidget('luci', 'climate_card_1'));
    expect(result.current.store.layout?.pages[1].placements.tablet?.climate_card_1).toEqual({
      x: 2,
      y: 0,
      w: 3,
      h: 2,
    });
  });
});

describe('launcher layout persistence', () => {
  beforeEach(() => localStorage.clear());

  const wrapper = ({ children }: { children?: ReactNode }) => (
    <PageProvider>{children}</PageProvider>
  );

  it('saves the layout in PageContext and storage, and forgets it on null', async () => {
    const { result } = renderHook(() => usePages(), { wrapper });
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));
    expect(result.current.launcherLayout).toBeNull();
    const layout: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [{ id: 'home', label: 'Casa', kind: 'widgets', placements: { phone: {} } }],
    };
    act(() => result.current.persistLauncherLayout(layout));
    expect(result.current.launcherLayout).toEqual(layout);
    expect(JSON.parse(localStorage.getItem(LAUNCHER_LAYOUT_STORAGE_KEY) ?? 'null')).toEqual(layout);

    const reloaded = renderHook(() => usePages(), { wrapper });
    expect(reloaded.result.current.launcherLayout).toEqual(layout);

    act(() => result.current.persistLauncherLayout(null));
    expect(localStorage.getItem(LAUNCHER_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it('includes the layout in the snapshot and applies it back', () => {
    const layout: LauncherLayout = {
      version: 1,
      cover: { enabled: true },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: { tablet: { 'light.a': { x: 0, y: 0, w: 2, h: 1 } } },
        },
      ],
    };
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    const snapshot = collectSnapshot();
    expect((snapshot.layout as Record<string, unknown>).launcherLayout).toEqual(layout);

    localStorage.clear();
    const persistLauncherLayout = vi.fn();
    applySnapshot(snapshot, { persistLauncherLayout });
    expect(persistLauncherLayout).toHaveBeenCalledWith(layout);
    expect(JSON.parse(localStorage.getItem(LAUNCHER_LAYOUT_STORAGE_KEY) ?? 'null')).toEqual(layout);
  });

  it('forgets the layout when a snapshot brings pages without one (old clients)', () => {
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, '{"version":1}');
    const persistLauncherLayout = vi.fn();
    applySnapshot(
      { version: 1, layout: { pagesConfig: legacyConfig }, appearance: {} },
      { persistLauncherLayout }
    );
    expect(persistLauncherLayout).toHaveBeenCalledWith(null);
    expect(localStorage.getItem(LAUNCHER_LAYOUT_STORAGE_KEY)).toBeNull();

    persistLauncherLayout.mockClear();
    applySnapshot(
      { version: 1, layout: { gridColumns: 3 }, appearance: {} },
      {
        persistLauncherLayout,
      }
    );
    expect(persistLauncherLayout).not.toHaveBeenCalled();
  });
});

describe('launcher validators', () => {
  it('checks cell rectangles', () => {
    expect(isCellRect({ x: 0, y: 1, w: 2, h: 2 })).toBe(true);
    expect(isCellRect({ x: -1, y: 0, w: 1, h: 1 })).toBe(false);
    expect(isCellRect({ x: 0, y: 0, w: 0, h: 1 })).toBe(false);
    expect(isCellRect({ x: 0.5, y: 0, w: 1, h: 1 })).toBe(false);
    expect(isCellRect({ x: 0, y: 0, w: 1 })).toBe(false);
  });

  it('cleans a layout and rejects one without valid pages', () => {
    const dirty = {
      version: 1,
      cover: { enabled: 'yes' },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          hidden: 'no',
          placements: {
            tablet: { ok: { x: 0, y: 0, w: 2, h: 2 }, bad: { x: 0, y: 0, w: 0, h: 1 } },
            watch: { a: { x: 0, y: 0, w: 1, h: 1 } },
          },
        },
        { id: 'home', label: 'Doppia', kind: 'widgets', placements: {} },
        { id: 'x', label: 'Tipo ignoto', kind: 'calendar', placements: {} },
        { id: '', label: 'Senza id', kind: 'widgets', placements: {} },
      ],
    };
    const clean = sanitizeLauncherLayout(dirty);
    expect(clean).toEqual({
      version: 1,
      cover: { enabled: true },
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: { tablet: { ok: { x: 0, y: 0, w: 2, h: 2 } } },
        },
      ],
    });
    expect(isLauncherLayout(dirty)).toBe(false);
    expect(isLauncherLayout(clean)).toBe(true);
    expect(sanitizeLauncherLayout({ version: 2, pages: [] })).toBeNull();
    expect(sanitizeLauncherLayout({ version: 1, pages: [{ id: 1 }] })).toBeNull();
    expect(sanitizeLauncherLayout(null)).toBeNull();
  });

  it('reads the layout of a snapshot: absent, invalid or clean', () => {
    expect(snapshotLauncherLayout({})).toBeUndefined();
    expect(snapshotLauncherLayout({ launcherLayout: null })).toBeNull();
    expect(snapshotLauncherLayout({ launcherLayout: { version: 1, pages: [] } })).toBeNull();
    expect(
      snapshotLauncherLayout({
        launcherLayout: {
          version: 1,
          cover: { enabled: false },
          pages: [{ id: 'a', label: 'A', kind: 'lights', placements: {} }],
        },
      })
    ).toEqual({
      version: 1,
      cover: { enabled: false },
      pages: [{ id: 'a', label: 'A', kind: 'lights', placements: {} }],
    });
  });
});
