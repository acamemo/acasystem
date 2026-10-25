/**
 * Launcher controller (ADR-0007): implements LauncherApi on top of a store (PageContext in the
 * app, local state in the preview). It migrates the legacy layout once, packs the current
 * device class, keeps `pagesConfig`/`pageSettings` in step and owns edit mode and the pager.
 */
import { CATEGORY_PAGES, categoryPageSeeds } from '@/templates/sheets/categoryPages';
import { categoryPageGeometry, upgradeCategoryGrids } from '@/templates/sheets/categoryPageGrid';
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
  LayoutOptions,
  LauncherPage,
  PageKind,
  PagePatch,
  WidgetSizes,
} from '@/@types/launcher';
import {
  DEFAULT_GRIDS,
  baseClassOf,
  classWithDensity,
  gridFor,
} from '@/utils/launcher/deviceClass';
import {
  addPageToLayout,
  setStackRotateInLayout,
  stackWidgetsInLayout,
  unstackWidgetInLayout,
  withoutEmptyStacks,
  COVER_PAGE_ID,
  coverPageOf,
  coverTakesColumns,
  dropEmptyContinuations,
  installCasa3dPage,
  withCoverPage,
  canRemovePage,
  ensureDeviceClass,
  findPage,
  moveWidgetInLayout,
  moveWidgetToPageInLayout,
  normalizeColumns,
  pageClass,
  placeWidgetAheadInLayout,
  placeWidgetInLayout,
  removePageFromLayout,
  removeWidgetFromLayout,
  reorderPagesInLayout,
  resizeWidgetInLayout,
  setCoverInLayout,
  updatePageInLayout,
  type LayoutContext,
  type PlaceResult,
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
  /** Operational launcher starts with all categories; isolated harnesses keep their fixtures. */
  initializeCategoryPages?: boolean;
  deviceClass: DeviceClass;
  /** Width of the viewport (CSS px): a narrow landscape screen keeps its class grid. */
  viewportWidth?: number;
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
  /**
   * Page overview (REP-20261007-028): the pages as cards, where the cover that is off has a
   * card too (REP-20261008-001). It closes with edit mode.
   */
  overview: boolean;
  setOverview: (open: boolean) => void;
  /** Grid (columns × rows) of the current device class: the default of the pages. */
  grid: CellSize;
  /**
   * Key of the placements and grid of a page on this screen: its own columns, the cover's or
   * the class default (REP-20261008-001).
   */
  classFor: (pageId: string) => DeviceClass;
  gridFor: (pageId: string) => CellSize;
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
  /**
   * Places a widget from the pages view (2026-10-23): at the first free place of `pageId`; when
   * it is full, on the first page after it with room; when none has, on a new page at the end.
   * Returns the page that received it (the centre goes there), or null when it could not be
   * placed. `settingsPageId` is as in placeWidget.
   */
  placeWidgetAhead: (
    pageId: string,
    widgetId: string,
    size?: CellSize,
    settingsPageId?: string
  ) => string | null;
  /**
   * Moves a widget to another page for the current class; false when there is no room. Without
   * `to`, `size` is about the size it shows in the cells of that page, when measured.
   */
  moveWidgetToPage: (
    fromPageId: string,
    toPageId: string,
    widgetId: string,
    to?: CellRect,
    size?: CellSize
  ) => boolean;
  findPage: (pageId: string) => LauncherPage | undefined;
  settingsKeyFor: (pageId: string, widgetId: string) => string;
  settingsFor: (pageId: string, widgetId: string) => CardSettings;
  sizesFor: (pageId: string, widgetId: string) => WidgetSizes | undefined;
  canRemovePage: (pageId: string) => boolean;
  /**
   * False when `columns` cannot be chosen for the page on this screen: the cover needs room for
   * all its widgets (C.2). The selector shows the limit instead of a choice that does nothing.
   */
  columnsAllowed: (pageId: string, columns: number) => boolean;
}

const EMPTY_LAYOUT: LauncherLayout = {
  version: 1,
  cover: { enabled: true },
  pages: [{ id: 'home', label: 'Principale', kind: 'widgets', placements: {} }],
};

export function useLauncherController({
  store,
  initializeCategoryPages = false,
  deviceClass: screenClass,
  viewportWidth,
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
  // The class of placements: the screen class at the grid density of the layout
  // (REP-20261007-034); every density keeps its own arrangement.
  const deviceClass = classWithDensity(baseClassOf(screenClass), storedLayout?.density);

  const settingsKeyFor = useCallback(
    (pageId: string, widgetId: string) => legacySettingsKey(pageId, widgetId),
    []
  );
  const settingsFor = useCallback(
    (pageId: string, widgetId: string): CardSettings =>
      cardSettings[legacySettingsKey(pageId, widgetId)] ?? cardSettings[widgetId] ?? {},
    [cardSettings]
  );
  const stacks = storedLayout?.stacks;
  const sizesFor = useCallback(
    (pageId: string, widgetId: string): WidgetSizes | undefined => {
      const stack = stacks?.[widgetId];
      if (!stack) return resolveSizes?.(widgetId, settingsFor(pageId, widgetId));
      // A stack: the sizes every one of its widgets accepts (REP-20261007-037).
      const all = stack.ids
        .map((id) => resolveSizes?.(id, settingsFor(pageId, id)))
        .filter((item): item is WidgetSizes => Boolean(item));
      if (all.length === 0) return undefined;
      const min = {
        w: Math.max(...all.map((item) => item.min.w)),
        h: Math.max(...all.map((item) => item.min.h)),
      };
      const max = {
        w: Math.max(min.w, Math.min(...all.map((item) => item.max.w))),
        h: Math.max(min.h, Math.min(...all.map((item) => item.max.h))),
      };
      return { min, max, default: all[0].default };
    },
    [resolveSizes, settingsFor, stacks]
  );

  const ctx = useMemo<LayoutContext>(
    () => ({
      deviceClass,
      grids,
      viewportWidth,
      sizesOf: (widgetId, pageId) => sizesFor(pageId, widgetId),
    }),
    [deviceClass, grids, viewportWidth, sizesFor]
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
    const nextConfig = layoutToPagesConfig(
      storedLayout,
      pagesConfig,
      deviceClass,
      grids,
      viewportWidth
    );
    if (nextConfig !== pagesConfig) persistPagesConfig?.(nextConfig);
    const nextSettings = layoutToPageSettings(storedLayout, pageSettings);
    if (nextSettings !== pageSettings) persistPageSettings?.(nextSettings);
  }, [
    ready,
    storedLayout,
    pagesConfig,
    pageSettings,
    deviceClass,
    grids,
    viewportWidth,
    persistPagesConfig,
    persistPageSettings,
  ]);

  const commit = useCallback(
    (next: LauncherLayout | null) => {
      if (!next) return;
      // Whatever the change, a stack left without widgets does not keep its cells.
      const clean = withoutEmptyStacks(next);
      if (clean === latestRef.current) return;
      latestRef.current = clean;
      persistLayout(clean);
    },
    [persistLayout]
  );

  // ── Edit mode and page overview ──
  const [editMode, setEditModeState] = useState(false);
  const [overview, setOverview] = useState(false);
  const editModeRef = useRef(editMode);
  const onEditDoneRef = useRef(onEditDone);
  useEffect(() => {
    onEditDoneRef.current = onEditDone;
  }, [onEditDone]);
  const setEditMode = useCallback((value: boolean) => {
    const wasEditing = editModeRef.current;
    editModeRef.current = value;
    setEditModeState(value);
    if (!value) setOverview(false);
    if (wasEditing && !value) {
      globalThis.window?.dispatchEvent(new CustomEvent(EDIT_DONE_EVENT));
      onEditDoneRef.current?.();
    }
  }, []);

  // ── Pager ──
  // The overview adds only the card of a cover that is off: with the cover on, opening or
  // closing it leaves the entries as they were, and the pages with them (REP-20261012-003).
  const coverCard = editMode && overview && !layout.cover.enabled;
  const entries = useMemo(
    () => pagerEntries(layout, deviceClass, editMode, grids, viewportWidth, coverCard),
    [layout, deviceClass, editMode, grids, viewportWidth, coverCard]
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
      // Unless another page was chosen meanwhile (the family of a continuation just removed).
      setCurrentKey((key) => (key === currentKey ? null : key));
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

  /**
   * The latest layout, with the cover page stored when one of the pages is the cover: the
   * first change made on it turns the default cover into a page of the layout (REP-20261007-030).
   */
  const withCover = useCallback(
    (...pageIds: string[]) =>
      pageIds.includes(COVER_PAGE_ID) ? withCoverPage(latestRef.current, grids) : latestRef.current,
    [grids]
  );

  /** Stores a placement: the settings follow the widget to its page, which comes to the centre. */
  const commitPlacement = useCallback(
    (result: PlaceResult, pageId: string, widgetId: string, settingsPageId: string) => {
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
    [commit, carrySettings]
  );
  const placeWidget = useCallback(
    (
      pageId: string,
      widgetId: string,
      size?: CellSize,
      at?: Pick<CellRect, 'x' | 'y'>,
      settingsPageId = pageId
    ) =>
      commitPlacement(
        placeWidgetInLayout(withCover(pageId), ctx, pageId, widgetId, size, at),
        pageId,
        widgetId,
        settingsPageId
      ),
    [ctx, commitPlacement, withCover]
  );
  const placeWidgetAhead = useCallback(
    (pageId: string, widgetId: string, size?: CellSize, settingsPageId = pageId) =>
      commitPlacement(
        placeWidgetAheadInLayout(withCover(pageId), ctx, pageId, widgetId, size),
        pageId,
        widgetId,
        settingsPageId
      ),
    [ctx, commitPlacement, withCover]
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
      const next = moveWidgetInLayout(withCover(pageId), ctx, pageId, widgetId, to);
      if (!next) return false;
      commit(next);
      return true;
    },
    [ctx, commit, withCover]
  );

  const resizeWidget = useCallback(
    (pageId: string, widgetId: string, size: CellSize) => {
      const next = resizeWidgetInLayout(withCover(pageId), ctx, pageId, widgetId, size);
      if (!next) return false;
      commit(next);
      return true;
    },
    [ctx, commit, withCover]
  );

  const moveWidgetToPage = useCallback(
    (fromPageId: string, toPageId: string, widgetId: string, to?: CellRect, size?: CellSize) => {
      const next = moveWidgetToPageInLayout(
        withCover(fromPageId, toPageId),
        ctx,
        fromPageId,
        toPageId,
        widgetId,
        to,
        size
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
    [ctx, commit, carrySettings, withCover]
  );

  const removeWidget = useCallback(
    (pageId: string, widgetId: string) => {
      commit(removeWidgetFromLayout(withCover(pageId), pageId, widgetId));
    },
    [commit, withCover]
  );

  // ── Pages ──
  const addPage = useCallback(
    (
      page: { label: string; icon?: string; kind?: PageKind; category?: string },
      afterPageId?: string
    ) => {
      const result = addPageToLayout(latestRef.current, page, afterPageId);
      let next = result.layout;
      const seeds = page.category ? categoryPageSeeds(page.category, result.pageId) : [];
      const nextSettings = { ...cardSettingsRef.current };
      if (seeds.length) {
        next = {
          ...next,
          pages: next.pages.map((item) =>
            item.id === result.pageId
              ? { ...item, ...categoryPageGeometry(page.category!, result.pageId, grids) }
              : item
          ),
        };
        for (const seed of seeds)
          nextSettings[legacySettingsKey(result.pageId, seed.id)] = seed.settings;
        cardSettingsRef.current = nextSettings;
        persistCardSettings?.(nextSettings);
      }
      commit(next);
      setCurrentKey(result.pageId);
      return result.pageId;
    },
    [commit, grids, persistCardSettings]
  );

  useEffect(() => {
    if (!initializeCategoryPages || !ready || latestRef.current.categoryDefaultsVersion === 1)
      return;
    const existingTypes = new Set<unknown>();
    for (const page of latestRef.current.pages) {
      const ids = new Set(
        Object.values(page.placements).flatMap((placements) => Object.keys(placements ?? {}))
      );
      for (const id of ids)
        for (const member of latestRef.current.stacks?.[id]?.ids ?? [id]) {
          const settings =
            cardSettingsRef.current[legacySettingsKey(page.id, member)] ??
            cardSettingsRef.current[member];
          if (settings?.categoryWidgetType) existingTypes.add(settings.categoryWidgetType);
        }
    }
    for (const category of CATEGORY_PAGES) {
      if (category.types.some((type) => existingTypes.has(type))) continue;
      addPage({ label: category.label, kind: 'widgets', category: category.id });
    }
    commit({ ...latestRef.current, categoryDefaultsVersion: 1 });
    setCurrentKey(currentKey);
  }, [initializeCategoryPages, ready, layout.categoryDefaultsVersion, addPage, commit, currentKey]);

  // The 3D house page goes last, once, after the category pages of a new profile (ADR-0014, D12).
  useEffect(() => {
    if (!initializeCategoryPages || !ready) return;
    const current = latestRef.current;
    if (current.casa3dVersion === 1 || current.categoryDefaultsVersion !== 1) return;
    commit(installCasa3dPage(current));
  }, [initializeCategoryPages, ready, layout, commit]);

  useEffect(() => {
    if (!initializeCategoryPages || !ready) return;
    const upgraded = upgradeCategoryGrids(latestRef.current, cardSettingsRef.current, ctx);
    if (upgraded.layout === latestRef.current) return;
    cardSettingsRef.current = upgraded.settings;
    persistCardSettings?.(upgraded.settings);
    commit(upgraded.layout);
  }, [initializeCategoryPages, ready, layout, ctx, commit, persistCardSettings]);

  const updatePage = useCallback(
    (pageId: string, patch: PagePatch) => {
      if (patch.columns === undefined) {
        commit(updatePageInLayout(latestRef.current, pageId, patch));
        return;
      }
      // Columns (REP-20261008-001): the virtual cover is stored with its choice, and the new
      // grid starts from the arrangement shown until now (E11).
      const before = withCover(pageId);
      const page = findPage(before, pageId);
      // Columns that cannot hold the widgets of the cover are refused (C.2).
      const columns = page?.kind === 'cover' ? normalizeColumns('cover', patch.columns) : undefined;
      if (columns !== undefined && !coverTakesColumns(before, columns, ctx)) return;
      const next = updatePageInLayout(before, pageId, patch);
      if (!page || next === before) return;
      const familyId = page.continuationOf ?? page.id;
      const ensured = ensureDeviceClass(next, ctx, { [familyId]: pageClass(before, page, ctx) });
      // The continuations an earlier choice made and no screen fills any more go away.
      commit(dropEmptyContinuations(ensured, ctx, familyId));
    },
    [commit, withCover, ctx]
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

  /**
   * Puts back a layout read earlier (the «Annulla» of a widget being edited,
   * REP-20261007-029): its placements of every page, as they were.
   */
  const restoreLayout = useCallback(
    (previous: LauncherLayout) => {
      commit(previous);
    },
    [commit]
  );

  // ── Stacks (REP-20261007-037) ──
  const stackWidgets = useCallback(
    (pageId: string, draggedId: string, ontoId: string) => {
      const stackId = `stack_${Date.now().toString(36)}`;
      const next = stackWidgetsInLayout(withCover(pageId), pageId, draggedId, ontoId, stackId);
      if (!next) return null;
      commit(next);
      return ontoId.startsWith('stack_') ? ontoId : stackId;
    },
    [commit, withCover]
  );
  const unstackWidget = useCallback(
    (pageId: string, stackId: string, memberId: string) => {
      commit(unstackWidgetInLayout(withCover(pageId), ctx, pageId, stackId, memberId));
    },
    [commit, withCover, ctx]
  );
  const setStackRotate = useCallback(
    (stackId: string, rotate: boolean) => {
      commit(setStackRotateInLayout(latestRef.current, stackId, rotate));
    },
    [commit]
  );

  /** Lock, main page and grid density of the whole layout (REP-20261007-033/034). */
  const setLayoutOptions = useCallback(
    (options: LayoutOptions) => {
      const current = latestRef.current;
      const next: LauncherLayout = { ...current, ...options };
      for (const key of Object.keys(options) as (keyof LayoutOptions)[]) {
        if (options[key] === undefined || options[key] === false) delete next[key];
      }
      commit(next);
    },
    [commit]
  );

  const setCoverEnabled = useCallback(
    (enabled: boolean) => {
      commit(setCoverInLayout(latestRef.current, enabled));
    },
    [commit]
  );

  // The lookups are callbacks of their own: the controller changes with the page in the centre
  // and the overview, and the grids and the widgets that read them must not (REP-20261012-003).
  const pageFor = useCallback(
    (pageId: string) =>
      findPage(layout, pageId) ??
      (pageId === COVER_PAGE_ID ? coverPageOf(layout, grids) : undefined),
    [layout, grids]
  );
  const classFor = useCallback(
    (pageId: string) => {
      const page = pageFor(pageId);
      return page ? pageClass(layout, page, ctx) : deviceClass;
    },
    [pageFor, layout, ctx, deviceClass]
  );
  const gridOf = useCallback(
    (pageId: string) => gridFor(grids, classFor(pageId)),
    [grids, classFor]
  );
  const findShownPage = useCallback(
    (pageId: string) =>
      findPage(layout, pageId) ??
      (pageId === COVER_PAGE_ID && layout.cover.enabled ? coverPageOf(layout, grids) : undefined),
    [layout, grids]
  );
  const canRemove = useCallback((pageId: string) => canRemovePage(layout, pageId), [layout]);
  const columnsAllowed = useCallback(
    (pageId: string, columns: number) => {
      if (pageFor(pageId)?.kind !== 'cover') return true;
      const value = normalizeColumns('cover', columns);
      return value === undefined || coverTakesColumns(layout, value, ctx);
    },
    [pageFor, layout, ctx]
  );

  return useMemo<LauncherController>(
    () => ({
      ready,
      layout,
      grids,
      deviceClass,
      grid: gridFor(grids, deviceClass),
      classFor,
      gridFor: gridOf,
      currentPage,
      goToPage,
      editMode,
      setEditMode,
      overview: editMode && overview,
      setOverview,
      placeWidget,
      placeWidgetAhead,
      moveWidget,
      resizeWidget,
      removeWidget,
      addPage,
      updatePage,
      removePage,
      reorderPages,
      setCoverEnabled,
      restoreLayout,
      setLayoutOptions,
      stackWidgets,
      unstackWidget,
      setStackRotate,
      entries,
      currentPageId,
      goToPageId,
      moveWidgetToPage,
      findPage: findShownPage,
      settingsKeyFor,
      settingsFor,
      sizesFor,
      canRemovePage: canRemove,
      columnsAllowed,
    }),
    [
      ready,
      layout,
      grids,
      deviceClass,
      classFor,
      gridOf,
      findShownPage,
      canRemove,
      columnsAllowed,
      currentPage,
      goToPage,
      editMode,
      setEditMode,
      overview,
      placeWidget,
      placeWidgetAhead,
      moveWidget,
      resizeWidget,
      removeWidget,
      addPage,
      updatePage,
      removePage,
      reorderPages,
      setCoverEnabled,
      restoreLayout,
      setLayoutOptions,
      stackWidgets,
      unstackWidget,
      setStackRotate,
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
