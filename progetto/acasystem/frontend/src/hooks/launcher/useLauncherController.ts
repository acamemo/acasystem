/**
 * Launcher controller (ADR-0007): implements LauncherApi on top of a store (PageContext in the
 * app, local state in the preview). It migrates the legacy layout once, packs the current
 * device class, keeps `pagesConfig`/`pageSettings` in step and owns edit mode and the pager.
 */
import {
  CATEGORY_PAGES,
  categoryPageSeeds,
  categoryPageGeometry,
  upgradeCategoryGrids,
} from '@/utils/launcher/categoryModels';
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
  isStackId,
  liftGhostStacks,
  reseatGhostStacks,
  withCoverPage,
  canRemovePage,
  ensureDeviceClass,
  findPage,
  moveWidgetInLayout,
  moveWidgetToPageInLayout,
  normalizeColumns,
  pageClass,
  pagePlacements,
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
import type { Placements } from '@/utils/launcher/grid';
import { layoutToPageSettings, layoutToPagesConfig } from '@/utils/launcher/legacySync';
import { legacySettingsKey, migrateLegacyLayout } from '@/utils/launcher/migration';
import { entryIndex, homeEntryIndex, pagerEntries, type PagerEntry } from '@/utils/launcher/pager';
import { EDIT_DONE_EVENT } from '@/utils/launcher/storage';
import { canonicalFromProjection, logicalPage, moveInCommonOrder, projectCommonOrder } from '@/domain/launcher/commonOrder';
import { sizeAcrossKeys } from '@/utils/launcher/layout';
import type { PageSeed } from '@/domain/launcher/categoryPages';
import { planWidgetAddition as planAddition, applyWidgetAddition, type PendingPlacement } from '@/domain/launcher/pendingPlacement';
import type { WidgetState } from '@/utils/launcher/deviceMemory';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';

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
  commitWidgetAddition?: (apply: (current: WidgetState) => WidgetState, widgetId: string) => Promise<void>;
  cancelWidgetAddition?: (widgetId: string) => Promise<'cancelled' | 'saved'>;
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
  planWidgetAddition?: (seed: PageSeed, originKey: string) => PendingPlacement | null;
  confirmWidgetAddition?: (seed: PageSeed, originKey: string, expected: PendingPlacement) => Promise<PendingPlacement>;
  cancelWidgetAddition?: (widgetId: string) => Promise<'cancelled' | 'saved'>;
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
  /**
   * A stack none of whose widgets has a definition (ISSUE-116): its cells are shown free, with the
   * «+», and the saved layout is not touched. False before the settings are loaded, without a
   * registry lookup (`resolveSizes`), and for a stack with at least one resolvable widget.
   */
  isGhostStack?: (pageId: string, id: string) => boolean;
  /** The placements of the page on this screen without its ghost stacks (ISSUE-116). */
  placementsFor?: (pageId: string) => Placements;
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
  const additionStore = useRef(store); additionStore.current = store;
  const adding = useRef<{ id: string; promise: Promise<PendingPlacement> } | null>(null);
  const live = useOptionalLiveProfiles();
  const liveRef = useRef(live); liveRef.current = live;
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
  const shownPagesRef = useRef<LauncherLayout | null>(null);
  const settingsPage = useCallback((pageId: string) => shownPagesRef.current?.commonOrderVersion === 1
    ? logicalPage(shownPagesRef.current, pageId) : pageId, []);

  const settingsKeyFor = useCallback(
    (pageId: string, widgetId: string) => legacySettingsKey(settingsPage(pageId), widgetId),
    [settingsPage]
  );
  const settingsFor = useCallback(
    (pageId: string, widgetId: string): CardSettings =>
      cardSettings[legacySettingsKey(settingsPage(pageId), widgetId)] ?? cardSettings[widgetId] ?? {},
    [cardSettings, settingsPage]
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

  const isGhostStack = useCallback(
    (pageId: string, id: string) =>
      ready &&
      resolveSizes !== undefined &&
      isStackId(id) &&
      Boolean(stacks?.[id]?.ids.length) &&
      sizesFor(pageId, id) === undefined,
    [ready, resolveSizes, stacks, sizesFor]
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

  const layout = useMemo(() => baseLayout.commonOrderVersion === 1
    ? projectCommonOrder(baseLayout, ctx) : ensureDeviceClass(baseLayout, ctx), [baseLayout, ctx]);
  shownPagesRef.current = layout;
  const canonicalRef = useRef(baseLayout);
  useLayoutEffect(() => { canonicalRef.current = baseLayout; });

  // Latest layout, also between two commits of the same tick (e.g. several widgets added).
  const latestRef = useRef(layout);
  useLayoutEffect(() => {
    latestRef.current = layout;
  });

  useEffect(() => {
    if (ready && layout.commonOrderVersion !== 1 && layout !== storedLayout) persistLayout(layout);
  }, [ready, layout, storedLayout, persistLayout]);

  // The legacy configuration follows the layout (pages, cards, labels, kinds).
  useEffect(() => {
    if (!ready || !storedLayout || storedLayout.commonOrderVersion === 1) return;
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
      if (canonicalRef.current.commonOrderVersion === 1) {
        const canonical = clean.pages.every(page => Object.keys(page.placements).length === 0)
          ? clean : canonicalFromProjection(canonicalRef.current, clean, ctx);
        canonicalRef.current = canonical;
        latestRef.current = projectCommonOrder(canonical, ctx);
        shownPagesRef.current = latestRef.current;
        persistLayout(canonical);
      } else { latestRef.current = clean; persistLayout(clean); }
    },
    [persistLayout, ctx]
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
    if (!value && liveRef.current?.state.editor) {
      void liveRef.current.coordinator.finish().then((finished) => {
        if (!finished) return;
        const wasEditing = editModeRef.current;
        editModeRef.current = false;
        setEditModeState(false);
        setOverview(false);
        if (wasEditing) {
          globalThis.window?.dispatchEvent(new CustomEvent(EDIT_DONE_EVENT));
          onEditDoneRef.current?.();
        }
      }).catch(() => undefined);
      return;
    }
    if (value && liveRef.current && !liveRef.current.state.editor) {
      void liveRef.current.coordinator.begin({ kind: 'structure' }, 'Disposizione del profilo').then(() => {
        editModeRef.current = true; setEditModeState(true);
      }).catch(() => undefined);
      return;
    }
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
  // A user action runs with the ghost stacks lifted off the pages (their cells are free, ISSUE-116)
  // and puts them back after, never deleting them. Automatic writes (ensureKeys, migration) do not.
  const asideLayout = useCallback(
    (base: LauncherLayout, run: (bare: LauncherLayout) => LauncherLayout | null) => {
      const { layout: bare, lifted } = liftGhostStacks(base, ctx, isGhostStack);
      const next = run(bare);
      return next && lifted.length > 0 ? reseatGhostStacks(next, ctx, lifted) : next;
    },
    [ctx, isGhostStack]
  );
  const asidePlace = useCallback(
    (base: LauncherLayout, run: (bare: LauncherLayout) => PlaceResult): PlaceResult => {
      const { layout: bare, lifted } = liftGhostStacks(base, ctx, isGhostStack);
      const result = run(bare);
      return lifted.length > 0 && result.placed
        ? { ...result, layout: reseatGhostStacks(result.layout, ctx, lifted) }
        : result;
    },
    [ctx, isGhostStack]
  );
  const placeWidget = useCallback(
    (
      pageId: string,
      widgetId: string,
      size?: CellSize,
      at?: Pick<CellRect, 'x' | 'y'>,
      settingsPageId = pageId
    ) => {
      if (canonicalRef.current.commonOrderVersion === 1 && pageId !== COVER_PAGE_ID) {
        const destination = settingsPage(pageId);
        if (settingsPage(settingsPageId) !== destination) carrySettings(legacySettingsKey(settingsPage(settingsPageId), widgetId), legacySettingsKey(destination, widgetId));
        commit(moveInCommonOrder(canonicalRef.current, latestRef.current, ctx, pageId, widgetId, at, size));
        return destination;
      }
      return commitPlacement(
        asidePlace(withCover(pageId), (bare) =>
          placeWidgetInLayout(bare, ctx, pageId, widgetId, size, at)
        ),
        pageId,
        widgetId,
        settingsPageId
      );
    },
    [ctx, commitPlacement, withCover, asidePlace, commit, carrySettings, settingsPage]
  );
  const placeWidgetAhead = useCallback(
    (pageId: string, widgetId: string, size?: CellSize, settingsPageId = pageId) => {
      if (canonicalRef.current.commonOrderVersion === 1) return placeWidget(pageId, widgetId, size, undefined, settingsPageId);
      return commitPlacement(
        asidePlace(withCover(pageId), (bare) =>
          placeWidgetAheadInLayout(bare, ctx, pageId, widgetId, size)
        ),
        pageId,
        widgetId,
        settingsPageId
      );
    },
    [ctx, commitPlacement, withCover, asidePlace, placeWidget]
  );

  const additionContext = useCallback((seed: PageSeed, current?: WidgetState): LayoutContext => ({
    ...ctx,
    sizesOf: (id, pageId) => resolveSizes?.(id, id === seed.id ? seed.settings
      : current?.cardSettings[legacySettingsKey(current.layout?.commonOrderVersion === 1 ? logicalPage(projectCommonOrder(current.layout, ctx), pageId) : pageId, id)]
        ?? current?.cardSettings[id] ?? settingsFor(pageId, id)),
  }), [ctx, resolveSizes, settingsFor]);
  const planWidgetAddition = useCallback((seed: PageSeed, originKey: string) =>
    planAddition(canonicalRef.current, additionContext(seed), seed, originKey), [additionContext]);
  const confirmWidgetAddition = useCallback((seed: PageSeed, originKey: string, expected: PendingPlacement): Promise<PendingPlacement> => {
    if (adding.current) return adding.current.id === seed.id ? adding.current.promise : Promise.reject(new Error('Salvataggio in corso.'));
    const write = additionStore.current.commitWidgetAddition;
    if (!write) return Promise.reject(new Error('Salvataggio non disponibile.'));
    const promise = (async () => {
      if (liveRef.current && liveRef.current.state.usageStatus !== 'active') throw new Error('Collegamento al profilo non disponibile.');
      let accepted: PendingPlacement | null = null;
      await write(current => {
        if (!current.layout) throw new Error('Profilo non disponibile.');
        const context = additionContext(seed, current);
        accepted = planAddition(current.layout, context, seed, originKey);
        return applyWidgetAddition(current, context, seed, originKey, expected);
      }, seed.id);
      if (!accepted) throw new Error('Posizione non disponibile.');
      return accepted;
    })();
    adding.current = { id: seed.id, promise };
    void promise.finally(() => { if (adding.current?.promise === promise) adding.current = null; }).catch(() => undefined);
    return promise;
  }, [additionContext]);

  const cancelWidgetAddition = useCallback((id: string) => additionStore.current.cancelWidgetAddition?.(id) ?? Promise.resolve('cancelled' as const), []);

  // Overflow produced while rotating/importing is not an explicit placeWidget call.
  // Carry its settings too, without overwriting a continuation's own saved choices.
  useEffect(() => {
    if (layout.commonOrderVersion === 1) return;
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
      if (canonicalRef.current.commonOrderVersion === 1) {
        commit(moveInCommonOrder(canonicalRef.current, latestRef.current, ctx, pageId, widgetId, to));
        return true;
      }
      const next = asideLayout(withCover(pageId), (bare) =>
        moveWidgetInLayout(bare, ctx, pageId, widgetId, to)
      );
      if (!next) return false;
      commit(next);
      return true;
    },
    [ctx, commit, withCover, asideLayout]
  );

  const resizeWidget = useCallback(
    (pageId: string, widgetId: string, size: CellSize) => {
      if (canonicalRef.current.commonOrderVersion === 1) {
        const id = settingsPage(pageId);
        const shown = latestRef.current.pages.find(page => page.id === pageId);
        if (!shown) return false;
        const hint = sizeAcrossKeys(size, grids, pageClass(latestRef.current, shown, ctx), 'tablet');
        commit({ ...canonicalRef.current, pages: canonicalRef.current.pages.map(page => page.id === id
          ? { ...page, sizeHints: { ...page.sizeHints, [widgetId]: hint } } : page) });
        return true;
      }
      const next = asideLayout(withCover(pageId), (bare) =>
        resizeWidgetInLayout(bare, ctx, pageId, widgetId, size)
      );
      if (!next) return false;
      commit(next);
      return true;
    },
    [ctx, commit, withCover, asideLayout, grids, settingsPage]
  );

  const moveWidgetToPage = useCallback(
    (fromPageId: string, toPageId: string, widgetId: string, to?: CellRect, size?: CellSize) => {
      if (canonicalRef.current.commonOrderVersion === 1) {
        carrySettings(legacySettingsKey(settingsPage(fromPageId), widgetId), legacySettingsKey(settingsPage(toPageId), widgetId), true);
        commit(moveInCommonOrder(canonicalRef.current, latestRef.current, ctx, toPageId, widgetId, to, size ?? to, fromPageId));
        return true;
      }
      const next = asideLayout(withCover(fromPageId, toPageId), (bare) =>
        moveWidgetToPageInLayout(bare, ctx, fromPageId, toPageId, widgetId, to, size)
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
    [ctx, commit, carrySettings, withCover, asideLayout, settingsPage]
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
      const result = addPageToLayout(canonicalRef.current.commonOrderVersion === 1 ? canonicalRef.current : latestRef.current, page, afterPageId ? settingsPage(afterPageId) : undefined);
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
    [commit, grids, persistCardSettings, settingsPage]
  );

  useEffect(() => {
    if (!initializeCategoryPages || !ready || latestRef.current.commonOrderVersion === 1 || latestRef.current.categoryDefaultsVersion === 1)
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
    if (!initializeCategoryPages || !ready || latestRef.current.commonOrderVersion === 1) return;
    const current = latestRef.current;
    if (current.casa3dVersion === 1 || current.categoryDefaultsVersion !== 1) return;
    commit(installCasa3dPage(current));
  }, [initializeCategoryPages, ready, layout, commit]);

  useEffect(() => {
    if (!initializeCategoryPages || !ready || latestRef.current.commonOrderVersion === 1) return;
    const upgraded = upgradeCategoryGrids(latestRef.current, cardSettingsRef.current, ctx);
    if (upgraded.layout === latestRef.current) return;
    cardSettingsRef.current = upgraded.settings;
    persistCardSettings?.(upgraded.settings);
    commit(upgraded.layout);
  }, [initializeCategoryPages, ready, layout, ctx, commit, persistCardSettings]);

  const updatePage = useCallback(
    (pageId: string, patch: PagePatch) => {
      if (canonicalRef.current.commonOrderVersion === 1) {
        commit(updatePageInLayout(canonicalRef.current, settingsPage(pageId), patch));
        return;
      }
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
    [commit, withCover, ctx, settingsPage]
  );

  const removePage = useCallback(
    (pageId: string) => {
      commit(removePageFromLayout(canonicalRef.current.commonOrderVersion === 1 ? canonicalRef.current : latestRef.current, settingsPage(pageId)));
    },
    [commit, settingsPage]
  );

  const reorderPages = useCallback(
    (pageIds: string[]) => {
      commit(reorderPagesInLayout(canonicalRef.current.commonOrderVersion === 1 ? canonicalRef.current : latestRef.current, [...new Set(pageIds.map(settingsPage))]));
    },
    [commit, settingsPage]
  );

  /**
   * Puts back a layout read earlier (the «Annulla» of a widget being edited,
   * REP-20261007-029): its placements of every page, as they were.
   */
  const restoreLayout = useCallback(
    (previous: LauncherLayout) => {
      if (liveRef.current && !liveRef.current.state.editor) {
        void liveRef.current.coordinator.undoLast().catch(() => undefined);
        return;
      }
      commit(previous);
    },
    [commit]
  );

  // ── Stacks (REP-20261007-037) ──
  const stackWidgets = useCallback(
    (pageId: string, draggedId: string, ontoId: string) => {
      const stackId = `stack_${Date.now().toString(36)}`;
      if (canonicalRef.current.commonOrderVersion === 1 && pageId !== COVER_PAGE_ID) {
        if (draggedId === ontoId || isStackId(draggedId)) return null;
        const current = canonicalRef.current;
        const page = current.pages.find(item => item.id === settingsPage(pageId));
        if (!page?.order?.includes(draggedId) || !page.order.includes(ontoId)) return null;
        const into = current.stacks?.[ontoId];
        const id = into ? ontoId : stackId;
        commit({ ...current, stacks: { ...current.stacks, [id]: into
          ? { ...into, ids: [...into.ids.filter(item => item !== draggedId), draggedId] } : { ids: [ontoId, draggedId] } },
          pages: current.pages.map(item => item.id === page.id ? { ...item,
            order: item.order!.filter(widget => widget !== draggedId).map(widget => widget === ontoId ? id : widget),
            sizeHints: { ...item.sizeHints, ...(item.sizeHints?.[ontoId] ? { [id]: item.sizeHints[ontoId] } : {}) },
            positionHints: { ...item.positionHints, ...(item.positionHints?.[ontoId] ? { [id]: item.positionHints[ontoId] } : {}) } } : item) });
        return id;
      }
      const next = stackWidgetsInLayout(withCover(pageId), pageId, draggedId, ontoId, stackId);
      if (!next) return null;
      commit(next);
      return ontoId.startsWith('stack_') ? ontoId : stackId;
    },
    [commit, withCover, settingsPage]
  );
  const unstackWidget = useCallback(
    (pageId: string, stackId: string, memberId: string) => {
      if (canonicalRef.current.commonOrderVersion === 1 && pageId !== COVER_PAGE_ID) {
        const current = canonicalRef.current, stack = current.stacks?.[stackId];
        if (!stack?.ids.includes(memberId)) return;
        const rest = stack.ids.filter(id => id !== memberId), stacks = { ...current.stacks };
        if (rest.length <= 1) delete stacks[stackId]; else stacks[stackId] = { ...stack, ids: rest };
        const selectedPage = settingsPage(pageId);
        commit({ ...current, stacks, pages: current.pages.map(page => {
          const order = page.order ?? [], index = order.indexOf(stackId);
          if (index < 0) return page;
          const replacement = rest.length <= 1 ? rest : [stackId];
          const next = order.flatMap(id => id === stackId ? replacement : [id]);
          if (page.id === selectedPage) next.splice(index + replacement.length, 0, memberId);
          const hints = { ...page.sizeHints };
          if (rest.length === 1 && hints[stackId]) hints[rest[0]!] = hints[stackId];
          const positions = { ...page.positionHints };
          if (rest.length === 1 && positions[stackId]) positions[rest[0]!] = positions[stackId];
          if (page.id === selectedPage) delete positions[memberId];
          return { ...page, order: [...new Set(next)], sizeHints: hints, positionHints: positions };
        }) });
        return;
      }
      commit(unstackWidgetInLayout(withCover(pageId), ctx, pageId, stackId, memberId));
    },
    [commit, withCover, ctx, settingsPage]
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
  const placementsFor = useCallback(
    (pageId: string): Placements => {
      const page = findShownPage(pageId);
      if (!page) return {};
      const placements = pagePlacements(page, classFor(pageId));
      return Object.fromEntries(
        Object.entries(placements).filter(([id]) => !isGhostStack(pageId, id))
      );
    },
    [findShownPage, classFor, isGhostStack]
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
      planWidgetAddition,
      confirmWidgetAddition,
      cancelWidgetAddition,
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
      isGhostStack,
      placementsFor,
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
      planWidgetAddition,
      confirmWidgetAddition,
      cancelWidgetAddition,
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
      isGhostStack,
      placementsFor,
    ]
  );
}
