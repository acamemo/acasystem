/**
 * The pages the demo mode opens with (`#/mockup`, REP-20261028-005, K2): one page per category of
 * the widget tray, laid out by the same code the app uses for a new profile (`categoryPageGeometry`
 * and the seeds of `categoryPageSeeds`), plus «Tutti i widget» with every type of the catalogue at
 * more than one size where the type allows it. Every widget is linked to an entity of the
 * simulated house, so it works as soon as the page opens. The result is the content of the
 * storage keys the app reads (`tunet_*`), which the demo puts in its own in-memory storage.
 */
import type { CardSettings, CardSettingsMap, PagesConfig } from '@/@types/dashboard';
import type { CellSize, LauncherLayout } from '@/@types/launcher';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { categoryPageGeometry } from '@/templates/sheets/categoryPageGrid';
import { categoryPageSeeds } from '@/templates/sheets/categoryPages';
import { ADD_WIDGET_TYPES, WIDGET_CATEGORIES } from '@/templates/sheets/catalog';
import { EDIT_HINT_KEY } from '@/hooks/launcher/useEditHint';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { addPageToLayout, placeWidgetInLayout, type LayoutContext } from '@/utils/launcher/layout';
import { legacySettingsKey } from '@/utils/launcher/migration';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { mockBindingSettings, type MockScenario } from './mockData';

export const ALL_WIDGETS_LABEL = 'Tutti i widget';

export interface MockupSeed {
  /** Content of the storage keys, ready for `createMemoryStorage`. */
  storage: Record<string, string>;
  layout: LauncherLayout;
  /** Ids of the pages in order, the «Tutti i widget» ones last. */
  pageIds: string[];
}

const settingsOf = (type: string, extra: CardSettings = {}, second = false): CardSettings => ({
  ...mockBindingSettings(type, second),
  categoryWidgetType: type,
  ...(type === 'sensor' ? { type: 'sensor' } : {}),
  ...(type === 'spacer' ? { variant: 'divider', heading: 'Casa', adaptiveSpacing: 16 } : {}),
  ...extra,
});

/** Sizes shown for a type on «Tutti i widget»: the default and, when it differs, the largest. */
function sizesShown(type: string): CellSize[] {
  const item = ADD_WIDGET_TYPES.find((candidate) => candidate.type === type);
  const sizes = item
    ? findWidgetDefinition(item.sample.id, { ...item.sample.settings, categoryWidgetType: type })
        ?.sizes
    : undefined;
  if (!sizes) return [{ w: 2, h: 2 }];
  const { default: base, max, min } = sizes;
  const larger = { w: Math.min(max.w, 4), h: Math.min(max.h, 3) };
  const smaller = min;
  const other =
    larger.w * larger.h > base.w * base.h
      ? larger
      : smaller.w * smaller.h < base.w * base.h
        ? smaller
        : null;
  return other ? [base, other] : [base];
}

export function buildMockupSeed(scenario: MockScenario = 'normal'): MockupSeed {
  // «Casa vuota»: the pages of a house with nothing in it yet, no widget on them.
  const empty = scenario === 'empty';
  let layout: LauncherLayout = {
    version: 1,
    categoryDefaultsVersion: 1,
    // The 3D house needs a real plan and a connection: the demo has no such page.
    casa3dVersion: 1,
    cover: { enabled: true },
    pages: [],
  };
  const cardSettings: CardSettingsMap = {};
  const pagesConfig: PagesConfig = { pages: [], header: [] };
  const pageIds: string[] = [];

  for (const category of WIDGET_CATEGORIES) {
    const added = addPageToLayout(layout, { label: category.label, kind: 'widgets' });
    const { pageId } = added;
    const seeds = categoryPageSeeds(category.id, pageId);
    const geometry = categoryPageGeometry(category.id, pageId, DEFAULT_GRIDS);
    layout = {
      ...added.layout,
      pages: added.layout.pages.map((page) =>
        page.id === pageId ? { ...page, ...geometry } : page
      ),
    };
    pagesConfig.pages.push(pageId);
    pagesConfig[pageId] = empty ? [] : seeds.map((seed) => seed.id);
    for (const seed of empty ? [] : seeds) {
      const type = String(seed.settings.categoryWidgetType);
      cardSettings[legacySettingsKey(pageId, seed.id)] = settingsOf(type, seed.settings);
    }
    pageIds.push(pageId);
  }

  // «Tutti i widget»: the same widgets, placed one by one like a person adding them.
  const first = addPageToLayout(layout, { label: ALL_WIDGETS_LABEL, kind: 'widgets' });
  layout = first.layout;
  let currentPage = first.pageId;
  const settingsById = new Map<string, CardSettings>();
  const ctx: LayoutContext = {
    deviceClass: 'tablet',
    grids: DEFAULT_GRIDS,
    viewportWidth: 1280,
    sizesOf: (widgetId) => {
      const settings = settingsById.get(widgetId);
      return settings ? findWidgetDefinition(widgetId, settings)?.sizes : undefined;
    },
  };
  let counter = 0;
  const placedOn = new Set<string>([first.pageId]);
  for (const item of empty ? [] : ADD_WIDGET_TYPES) {
    for (const [nth, size] of sizesShown(item.type).entries()) {
      counter += 1;
      const widgetId = item.sample.id.replace('esempio', `tutti_${counter}`);
      const settings = settingsOf(item.type, {}, nth > 0);
      settingsById.set(widgetId, settings);
      const result = placeWidgetInLayout(layout, ctx, currentPage, widgetId, size);
      layout = result.layout;
      currentPage = result.pageId;
      placedOn.add(result.pageId);
      cardSettings[legacySettingsKey(result.pageId, widgetId)] = settings;
      (pagesConfig[result.pageId] ??= []).push(widgetId);
    }
  }
  for (const page of layout.pages) {
    if (placedOn.has(page.id) && !pagesConfig.pages.includes(page.id)) {
      pagesConfig.pages.push(page.id);
      pagesConfig[page.id] ??= [];
      pageIds.push(page.id);
    }
  }
  const home = layout.pages[0]?.id;
  if (home) layout = { ...layout, homePageId: home };

  const pageSettings = Object.fromEntries(
    layout.pages.map((page) => [page.id, { label: page.label }])
  );
  return {
    layout,
    pageIds,
    storage: {
      [LAUNCHER_LAYOUT_STORAGE_KEY]: JSON.stringify(layout),
      tunet_pages_config: JSON.stringify(pagesConfig),
      tunet_card_settings: JSON.stringify(cardSettings),
      tunet_page_settings: JSON.stringify(pageSettings),
      // The hint on how to edit would cover the first screen of every visit.
      [EDIT_HINT_KEY]: '1',
    },
  };
}
