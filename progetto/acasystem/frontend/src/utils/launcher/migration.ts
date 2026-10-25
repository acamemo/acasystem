/**
 * One-time migration from the legacy Tunet layout (ordered card ids per page, rows of about
 * 100 px plus 20 px gap and four columns on desktop) to the launcher cells.
 *
 * Mapping, documented in REP-20261006-001:
 * - height: the legacy row span (`getCardGridSpan`: small 1, normal 2, calendar/to-do large 4)
 *   becomes the same number of cells, because a cell (about 8–9 rem) is close to a legacy row;
 * - width: one legacy column (a quarter of the desktop grid) becomes two cells, so a normal
 *   card turns into a 2×2 widget; `colSpan: 'full'` takes the whole row;
 * - the result is limited by the grid and by the widget definition (min/max) when known.
 * Cards are packed in their legacy order, first fit; what does not fit goes to a continuation
 * page. Special pages keep their kind and get no placements.
 */
import { gridFor } from './deviceClass';
import type { CardSettingsMap, PagesConfig, PageSettingsMap } from '@/@types/dashboard';
import type {
  CellSize,
  DeviceClass,
  LauncherGrids,
  LauncherLayout,
  LauncherPage,
  WidgetSizes,
} from '@/@types/launcher';
import { getCardColSpan, getCardGridSpan } from '@/utils/gridLayout';
import { clampSize, packItems } from './grid';
import { HOME_PAGE_LABEL, continuationLabel, createPageId, legacyPageKind } from './pageIdentity';

/** Legacy settings key of a card on a page. */
export const legacySettingsKey = (pageId: string, cardId: string) => `${pageId}::${cardId}`;

/** Two cells for every legacy desktop column. */
export const CELLS_PER_LEGACY_COLUMN = 2;

/** Size in cells of a legacy card, before the definition limits. */
export function legacyCardCellSize(
  cardId: string,
  pageId: string,
  cardSettings: CardSettingsMap,
  grid: CellSize
): CellSize {
  const keyFn = (id: string, page: string = pageId) => legacySettingsKey(page, id);
  const rawRows = getCardGridSpan(cardId, keyFn, cardSettings, pageId);
  const rawColumns = getCardColSpan(cardId, keyFn, cardSettings);
  const rows = Number.isFinite(rawRows) ? Math.max(1, Math.round(rawRows)) : 2;
  const columns = Number.isFinite(rawColumns) ? Math.max(1, Math.round(rawColumns)) : 1;
  const w = columns >= Number.MAX_SAFE_INTEGER ? grid.w : columns * CELLS_PER_LEGACY_COLUMN;
  return clampSize({ w, h: rows }, grid);
}

export interface MigrationInput {
  pagesConfig: PagesConfig;
  pageSettings: PageSettingsMap;
  cardSettings: CardSettingsMap;
  deviceClass: DeviceClass;
  grids: LauncherGrids;
  /** Definition limits of a widget on a page (registry lookup), when available. */
  sizesOf?: (widgetId: string, pageId: string) => WidgetSizes | undefined;
}

const pageLabel = (pageId: string, pageSettings: PageSettingsMap) => {
  const label = pageSettings[pageId]?.label;
  if (typeof label === 'string' && label.trim()) return label.trim();
  return pageId === 'home' ? HOME_PAGE_LABEL : pageId;
};

/** Builds the launcher layout from the legacy configuration, for the given device class. */
export function migrateLegacyLayout({
  pagesConfig,
  pageSettings,
  cardSettings,
  deviceClass,
  grids,
  sizesOf,
}: MigrationInput): LauncherLayout {
  const grid = gridFor(grids, deviceClass);
  const legacyPages = (pagesConfig.pages ?? []).filter(
    (id) => typeof id === 'string' && id && id !== 'settings' && id !== 'header'
  );
  if (legacyPages.length === 0) legacyPages.push('home');
  const ids = new Set(legacyPages);
  const labels = legacyPages.map((id) => pageLabel(id, pageSettings));
  const pages: LauncherPage[] = [];

  for (const pageId of legacyPages) {
    const settings = pageSettings[pageId] ?? {};
    const kind = legacyPageKind(pageId, pageSettings);
    const label = pageLabel(pageId, pageSettings);
    const icon = typeof settings.icon === 'string' && settings.icon ? settings.icon : undefined;
    const base: LauncherPage = {
      id: pageId,
      label,
      ...(icon ? { icon } : {}),
      kind,
      ...(settings.hidden === true ? { hidden: true } : {}),
      placements: {},
    };
    // The cover comes back as its default page (it is not a legacy page to rebuild).
    if (kind === 'cover') continue;
    if (kind !== 'widgets') {
      pages.push(base);
      continue;
    }

    const cardIds = Array.isArray(pagesConfig[pageId]) ? pagesConfig[pageId] : [];
    const unique = cardIds.filter(
      (id, index) => typeof id === 'string' && id && cardIds.indexOf(id) === index
    );
    const items = unique.map((cardId) => {
      const sizes = sizesOf?.(cardId, pageId);
      return {
        id: cardId,
        size: clampSize(legacyCardCellSize(cardId, pageId, cardSettings, grid), grid, sizes),
        min: sizes?.min,
      };
    });
    const packed = packItems(items, grid);
    pages.push({ ...base, placements: { [deviceClass]: packed.placements } });

    let rest = packed.overflow;
    while (rest.length > 0) {
      const next = packItems(rest, grid);
      if (next.overflow.length === rest.length) break;
      const continuation = continuationLabel(label, labels);
      labels.push(continuation);
      const id = createPageId(continuation, 'widgets', ids);
      ids.add(id);
      // Only the migrated class: the others are packed from it on first use, as for any page.
      pages.push({
        id,
        label: continuation,
        ...(icon ? { icon } : {}),
        kind: 'widgets',
        continuationOf: pageId,
        placements: { [deviceClass]: next.placements },
      });
      rest = next.overflow;
    }
  }

  return { version: 1, cover: { enabled: true }, pages };
}
