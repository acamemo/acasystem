/**
 * Launcher controller (ADR-0007): implements LauncherApi on top of a store (PageContext in the
 * app, local state in the preview). It migrates the legacy layout once, packs the current
 * device class, keeps `pagesConfig`/`pageSettings` in step and owns edit mode and the pager.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  CardSettings,
  CardSettingsMap,
  PagesConfig,
  PageSettingsMap,
} from '@/@types/dashboard';
import type {
  CellRect,
  CellSize,
  DeviceClass,
  LauncherApi,
  LauncherGrids,
  LauncherLayout,
  LauncherPage,
  PageKind,
  WidgetSizes,
} from '@/@types/launcher';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import {
  addPageToLayout,
  canRemovePage,
  ensureDeviceClass,
  findPage,
  moveWidgetInLayout,
  moveWidgetToPageInLayout,
  placeWidgetInLayout,
  removePageFromLayout,
  removeWidgetFromLayout,
  reorderPagesInLayout,
  resizeWidgetInLayout,
  setCoverInLayout,
  updatePageInLayout,
  type LayoutContext,
} from '@/utils/launcher/layout';
import { layoutToPageSettings, layoutToPagesConfig } from '@/utils/launcher/legacySync';
import { legacySettingsKey, migrateLegacyLayout } from '@/utils/launcher/migration';
import { entryIndex, homeEntryIndex, pagerEntries, type PagerEntry } from '@/utils/launcher/pager';
import { EDIT_DONE_EVENT } from '@/utils/launcher/storage';

/** Where the launcher keeps its layout and the legacy configuration it mirrors. */
export interface LauncherStore {
  /** False until the stored settings are loaded: migration and mirroring wait for it. */
  ready: boolean;
  layout: LauncherLayout | null;
  persistLayout: (layout: LauncherLayout | null) => void;
  pagesConfig: PagesConfig;
  pageSettings: PageSettingsMap;
  cardSettings: CardSettingsMap;
  persistPagesConfig?: (config: PagesConfig) => void;
  persistPageSettings?: (settings: PageSettingsMap) => void;
  persistCardSettings?: (settings: CardSettingsMap) => void;
}

export interface LauncherControllerOptions {
  store: LauncherStore;
  deviceClass: DeviceClass;
  grids?: LauncherGrids;
  /** Size limits of a widget with its settings (registry lookup). */
  resolveSizes?: (widgetId: string, settings: CardSettings) => WidgetSizes | undefined;
  /** Called when edit mode ends, after the `tunet:edit-done` event. */
  onEditDone?: () => void;
}

/** LauncherApi plus what the launcher's own components need. */
export interface LauncherController extends LauncherApi {
  ready: boolean;
  entries: PagerEntry[];
  /** Page shown now; null on the cover. */
  currentPageId: string | null;
  goToPageId: (pageId: string) => void;
  /** Grid (columns × rows) of the current device class. */
  grid: CellSize;
  /**
   * As LauncherApi.placeWidget, and returns the page that received the widget (a new page
   * when it did not fit), or null when it could not be placed. `settingsPageId` is the page
   * whose settings the new card was created with (they follow it to a new page).
   */
  placeWidget: (
    pageId: string,
    widgetId: string,
    size?: CellSize,
    at?: Pick<CellRect, 'x' | 'y'>,
    settingsPageId?: string
  ) => string | null;
  /** Moves a widget to another page for the current class; false when there is no room. */
  moveWidgetToPage: (
    fromPageId: string,
    toPageId: string,
    widgetId: string,
    to?: CellRect
  ) => boolean;
  findPage: (pageId: string) => LauncherPage | undefined;
  settingsKeyFor: (pageId: string, widgetId: string) => string;
  settingsFor: (pageId: string, widgetId: string) => CardSettings;
  sizesFor: (pageId: string, widgetId: string) => WidgetSizes | undefined;
  canRemovePage: (pageId: string) => boolean;
}

const EMPTY_LAYOUT: LauncherLayout = {
  version: 1,
  cover: { enabled: true },
  pages: [{ id: 'home', label: 'Principale', kind: 'widgets', placements: {} }],
};

export function useLauncherController({
  store,
  deviceClass,
  grids = DEFAULT_GRIDS,
  resolveSizes,
  onEditDone,
}: LauncherControllerOptions): LauncherController {
  const {
    ready,
    layout: storedLayout,
    persistLayout,
    pagesConfig,
    pageSettings,
    cardSettings,
    persistPagesConfig,
    persistPageSettings,
    persistCardSettings,
  } = store;

  const settingsKeyFor = useCallback(
    (pageId: string, widgetId: string) => legacySettingsKey(pageId, widgetId),
    []
  );
  const settingsFor = useCallback(
    (pageId: string, widgetId: string): CardSettings =>
      cardSettings[legacySettingsKey(pageId, widgetId)] ?? cardSettings[widgetId] ?? {},
    [cardSettings]
  );
  const sizesFor = useCallback(
    (pageId: string, widgetId: string) => resolveSizes?.(widgetId, settingsFor(pageId, widgetId)),
    [resolveSizes, settingsFor]
  );

  const ctx = useMemo<LayoutContext>(
    () => ({ deviceClass, grids, sizesOf: (widgetId, pageId) => sizesFor(pageId, widgetId) }),
    [deviceClass, grids, sizesFor]
  );

  // One-time migration from the legacy layout, once the stored settings are loaded.
  const migrated = useMemo<LauncherLayout | null>(
    () =>
      ready && !storedLayout
        ? migrateLegacyLayout({
            pagesConfig,
            pageSettings,
            cardSettings,
            deviceClass,
            grids,
            sizesOf: ctx.sizesOf,
          })
        : null,
    [ready, storedLayout, pagesConfig, pageSettings, cardSettings, deviceClass, grids, ctx]
  );
  const baseLayout = storedLayout ?? migrated ?? EMPTY_LAYOUT;

  const layout = useMemo(() => ensureDeviceClass(baseLayout, ctx), [baseLayout, ctx]);

  // Latest layout, also between two commits of the same tick (e.g. several widgets added).
  const latestRef = useRef(layout);
  useLayoutEffect(() => {
    latestRef.current = layout;
  }, [layout]);

  useEffect(() => {
    if (ready && layout !== storedLayout) persistLayout(layout);
  }, [ready, layout, storedLayout, persistLayout]);

  // The legacy configuration follows the layout (pages, cards, labels, kinds).
  useEffect(() => {
    if (!ready || !storedLayout) return;
    const nextConfig = layoutToPagesConfig(storedLayout, pagesConfig, deviceClass);
    if (nextConfig !== pagesConfig) persistPagesConfig?.(nextConfig);
    const nextSettings = layoutToPageSettings(storedLayout, pageSettings);
    if (nextSettings !== pageSettings) persistPageSettings?.(nextSettings);
  }, [
    ready,
    storedLayout,
    pagesConfig,
    pageSettings,
    deviceClass,
    persistPagesConfig,
    persistPageSettings,
  ]);

  const commit = useCallback(
    (next: LauncherLayout | null) => {
      if (!next || next === latestRef.current) return;
      latestRef.current = next;
      persistLayout(next);
    },
    [persistLayout]
  );

  // ── Edit mode ──
  const [editMode, setEditModeState] = useState(false);
  const editModeRef = useRef(editMode);
  const onEditDoneRef = useRef(onEditDone);
  useEffect(() => {
    onEditDoneRef.current = onEditDone;
  }, [onEditDone]);
  const setEditMode = useCallback((value: boolean) => {
    const wasEditing = editModeRef.current;
    editModeRef.current = value;
    setEditModeState(value);
    if (wasEditing && !value) {
      globalThis.window?.dispatchEvent(new CustomEvent(EDIT_DONE_EVENT));
      onEditDoneRef.current?.();
    }
  }, []);

  // ── Pager ──
  const entries = useMemo(
    () => pagerEntries(layout, deviceClass, editMode),
    [layout, deviceClass, editMode]
  );
  // The launcher always opens on «Principale» (the cover stays on its left); a page that is no
  // longer shown also leads back there.
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const resolvedIndex = currentKey === null ? -1 : entryIndex(entries, currentKey);
  const currentPage = resolvedIndex >= 0 ? resolvedIndex : homeEntryIndex(entries, layout);
  const current = entries[currentPage];
  const currentPageId = current?.type === 'page' ? current.page.id : null;
  // A page that was shown and has left the pager (an empty page after «Fine», a hidden or
  // removed page) gives its place back to «Principale» for good: its key is dropped, so it is
  // not shown again when edit mode brings it back. A key not shown yet stays: it may be waiting
  // for the layout (a page just added, or one chosen before the settings are loaded).
  const shownKey = useRef<string | null>(null);
  useEffect(() => {
    if (currentKey !== null && resolvedIndex >= 0) {
      shownKey.current = currentKey;
    } else if (currentKey !== null && shownKey.current === currentKey) {
      shownKey.current = null;
      setCurrentKey(null);
    }
  }, [currentKey, resolvedIndex]);

  const goToPage = useCallback(
    (index: number) => {
      const entry = entries[Math.max(0, Math.min(entries.length - 1, Math.round(index)))];
      if (entry) setCurrentKey(entry.key);
    },
    [entries]
  );
  const goToPageId = useCallback((pageId: string) => setCurrentKey(pageId), []);

  // ── Widgets ──
  // Settings are keyed by page: a widget that changes page keeps them on the new one.
  const cardSettingsRef = useRef(cardSettings);
  /**
   * Copies settings from one key to another when the source exists and the target does not;
   * with `overwrite` (a widget moved between pages) the source's settings replace the target's.
   */
  const carrySettings = useCallback(
    (fromKey: string, toKey: string, overwrite = false) => {
      const settings = cardSettingsRef.current;
      if (fromKey === toKey || !settings[fromKey] || (!overwrite && settings[toKey])) return false;
      const next = { ...settings, [toKey]: { ...settings[fromKey] } };
      cardSettingsRef.current = next;
      persistCardSettings?.(next);
      return true;
    },
    [persistCardSettings]
  );
  // A widget just added has its settings saved in the same tick, so they reach the
  // controller with the next settings update: the carry to its new page waits for that one.
  const pendingCarries = useRef<Array<{ fromKey: string; toKey: string }>>([]);
  useEffect(() => {
    cardSettingsRef.current = cardSettings;
    const carries = pendingCarries.current;
    if (carries.length === 0) return;
    pendingCarries.current = [];
    carries.forEach(({ fromKey, toKey }) => carrySettings(fromKey, toKey));
  }, [cardSettings, carrySettings]);

  const placeWidget = useCallback(
    (
      pageId: string,
      widgetId: string,
      size?: CellSize,
      at?: Pick<CellRect, 'x' | 'y'>,
      settingsPageId = pageId
    ) => {
      const result = placeWidgetInLayout(latestRef.current, ctx, pageId, widgetId, size, at);
      if (!result.placed) return null;
      if (result.pageId !== settingsPageId) {
        // No room: the widget lands on a new page, with the settings created for this page.
        const fromKey = legacySettingsKey(settingsPageId, widgetId);
        const toKey = legacySettingsKey(result.pageId, widgetId);
        if (!carrySettings(fromKey, toKey)) pendingCarries.current.push({ fromKey, toKey });
      }
      if (result.pageId !== pageId) {
        setCurrentKey(result.pageId);
      }
      commit(result.layout);
      return result.pageId;
    },
    [ctx, commit, carrySettings]
  );

  // Overflow produced while rotating/importing is not an explicit placeWidget call.
  // Carry its settings too, without overwriting a continuation's own saved choices.
  useEffect(() => {
    for (const page of layout.pages) {
      if (!page.continuationOf) continue;
      const ids = new Set(
        Object.values(page.placements).flatMap((placements) => Object.keys(placements ?? {}))
      );
      for (const widgetId of ids) {
        const targetKey = legacySettingsKey(page.id, widgetId);
        if (cardSettingsRef.current[targetKey]) continue;
        const family = layout.pages.filter(
          (item) => (item.continuationOf ?? item.id) === page.continuationOf && item.id !== page.id
        );
        const source = family.find(
          (item) => cardSettingsRef.current[legacySettingsKey(item.id, widgetId)]
        );
        if (source) carrySettings(legacySettingsKey(source.id, widgetId), targetKey);
      }
    }
  }, [layout, cardSettings, carrySettings]);

  const moveWidget = useCallback(
    (pageId: string, widgetId: string, to: CellRect) => {
      const next = moveWidgetInLayout(latestRef.current, ctx, pageId, widgetId, to);
      if (!next) return false;
      commit(next);
      return true;
    },
    [ctx, commit]
  );

  const resizeWidget = useCallback(
    (pageId: string, widgetId: string, size: CellSize) => {
      const next = resizeWidgetInLayout(latestRef.current, ctx, pageId, widgetId, size);
      if (!next) return false;
      commit(next);
      return true;
    },
    [ctx, commit]
  );

  const moveWidgetToPage = useCallback(
    (fromPageId: string, toPageId: string, widgetId: string, to?: CellRect) => {
      const next = moveWidgetToPageInLayout(
        latestRef.current,
        ctx,
        fromPageId,
        toPageId,
        widgetId,
        to
      );
      if (!next) return false;
      carrySettings(
        legacySettingsKey(fromPageId, widgetId),
        legacySettingsKey(toPageId, widgetId),
        true
      );
      commit(next);
      return true;
    },
    [ctx, commit, carrySettings]
  );

  const removeWidget = useCallback(
    (pageId: string, widgetId: string) => {
      commit(removeWidgetFromLayout(latestRef.current, pageId, widgetId));
    },
    [commit]
  );

  // ── Pages ──
  const addPage = useCallback(
    (page: { label: string; icon?: string; kind?: PageKind }) => {
      const result = addPageToLayout(latestRef.current, page);
      commit(result.layout);
      setCurrentKey(result.pageId);
      return result.pageId;
    },
    [commit]
  );

  const updatePage = useCallback(
    (pageId: string, patch: Partial<Pick<LauncherPage, 'label' | 'icon' | 'hidden'>>) => {
      commit(updatePageInLayout(latestRef.current, pageId, patch));
    },
    [commit]
  );

  const removePage = useCallback(
    (pageId: string) => {
      commit(removePageFromLayout(latestRef.current, pageId));
    },
    [commit]
  );

  const reorderPages = useCallback(
    (pageIds: string[]) => {
      commit(reorderPagesInLayout(latestRef.current, pageIds));
    },
    [commit]
  );

  const setCoverEnabled = useCallback(
    (enabled: boolean) => {
      commit(setCoverInLayout(latestRef.current, enabled));
    },
    [commit]
  );

  return useMemo<LauncherController>(
    () => ({
      ready,
      layout,
      grids,
      deviceClass,
      grid: grids[deviceClass],
      currentPage,
      goToPage,
      editMode,
      setEditMode,
      placeWidget,
      moveWidget,
      resizeWidget,
      removeWidget,
      addPage,
      updatePage,
      removePage,
      reorderPages,
      setCoverEnabled,
      entries,
      currentPageId,
      goToPageId,
      moveWidgetToPage,
      findPage: (pageId: string) => findPage(layout, pageId),
      settingsKeyFor,
      settingsFor,
      sizesFor,
      canRemovePage: (pageId: string) => canRemovePage(layout, pageId),
    }),
    [
      ready,
      layout,
      grids,
      deviceClass,
      currentPage,
      goToPage,
      editMode,
      setEditMode,
      placeWidget,
      moveWidget,
      resizeWidget,
      removeWidget,
      addPage,
      updatePage,
      removePage,
      reorderPages,
      setCoverEnabled,
      entries,
      currentPageId,
      goToPageId,
      moveWidgetToPage,
      settingsKeyFor,
      settingsFor,
      sizesFor,
    ]
  );
}
