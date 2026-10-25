/**
 * The cover as a page of widgets (REP-20261007-030): clock, calendar and weather are widgets,
 * the cover is virtual until changed, and widgets move between the cover and the pages.
 */
import { describe, expect, it } from 'vitest';
import type { LauncherLayout } from '@/@types/launcher';
import { isCardHiddenByLogic } from '@/utils/cardUtils';
import { DEFAULT_GRIDS, DEVICE_CLASSES, gridFor } from '@/utils/launcher/deviceClass';
import { rectFits, rectsOverlap } from '@/utils/launcher/grid';
import {
  COVER_PAGE_ID,
  COVER_WIDGET_IDS,
  coverPageOf,
  defaultCoverPage,
  moveWidgetToPageInLayout,
  pageClass,
  placeWidgetInLayout,
  withCoverPage,
} from '@/utils/launcher/layout';
import { pagerEntries } from '@/utils/launcher/pager';

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: true },
  pages: [
    {
      id: 'home',
      label: 'Principale',
      kind: 'widgets',
      placements: { tablet: { 'light.cucina': { x: 0, y: 0, w: 2, h: 2 } } },
    },
  ],
};
const ctx = {
  deviceClass: 'tablet' as const,
  grids: DEFAULT_GRIDS,
  sizesOf: () => ({ min: { w: 1, h: 1 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } }),
};

describe('default cover', () => {
  it('holds clock, calendar and weather in every device class, inside the grid, apart', () => {
    const cover = defaultCoverPage(DEFAULT_GRIDS);
    expect(cover).toMatchObject({ id: COVER_PAGE_ID, kind: 'cover' });
    for (const deviceClass of DEVICE_CLASSES) {
      const placements = cover.placements[deviceClass] ?? {};
      expect(Object.keys(placements)).toEqual([...COVER_WIDGET_IDS]);
      const rects = Object.values(placements);
      for (const rect of rects)
        expect(rectFits(rect, gridFor(DEFAULT_GRIDS, deviceClass))).toBe(true);
      rects.forEach((a, i) =>
        rects.slice(i + 1).forEach((b) => expect(rectsOverlap(a, b)).toBe(false))
      );
    }
  });

  it('is virtual until changed: not among the pages, carried by the cover entry', () => {
    expect(coverPageOf(layout, DEFAULT_GRIDS).id).toBe(COVER_PAGE_ID);
    expect(layout.pages.some((page) => page.kind === 'cover')).toBe(false);
    // Without the grids (older callers) the cover entry has no page: nothing changes for them.
    expect(pagerEntries(layout, 'tablet', false)[0]).toEqual({
      type: 'cover',
      key: 'cover',
      label: 'Copertina',
    });
    const entries = pagerEntries(
      withCoverPage(layout, DEFAULT_GRIDS),
      'tablet',
      true,
      DEFAULT_GRIDS
    );
    expect(entries.map((entry) => entry.key)).toEqual(['cover', 'home']);
    expect(entries[0].type === 'cover' && entries[0].page?.kind).toBe('cover');
  });

  it('the cards of the cover are never hidden for lack of an entity', () => {
    for (const id of COVER_WIDGET_IDS) {
      expect(
        isCardHiddenByLogic(id, {
          activePage: COVER_PAGE_ID,
          getCardSettingsKey: (cardId) => `cover::${cardId}`,
          cardSettings: {},
          entities: {},
        })
      ).toBe(false);
    }
  });
});

describe('widgets between the cover and the pages', () => {
  it('moves the clock to «Principale» and back; the cover is stored on the first change', () => {
    const stored = withCoverPage(layout, DEFAULT_GRIDS);
    const toHome = moveWidgetToPageInLayout(stored, ctx, COVER_PAGE_ID, 'home', 'cover_clock', {
      x: 4,
      y: 0,
      w: 2,
      h: 2,
    });
    expect(toHome).not.toBeNull();
    const cover = toHome!.pages.find((page) => page.kind === 'cover')!;
    const home = toHome!.pages.find((page) => page.id === 'home')!;
    expect(cover.placements.tablet?.cover_clock).toBeUndefined();
    expect(home.placements.tablet?.cover_clock).toEqual({ x: 4, y: 0, w: 2, h: 2 });

    const back = moveWidgetToPageInLayout(toHome!, ctx, 'home', COVER_PAGE_ID, 'cover_clock');
    const backCover = back!.pages.find((page) => page.kind === 'cover')!;
    // Back on the grid the cover shows (its three columns), and under the class key too.
    const shown = pageClass(back!, backCover, ctx);
    expect(shown).toBe('tablet@3x1');
    expect(backCover.placements[shown]?.cover_clock).toBeDefined();
    expect(backCover.placements.tablet?.cover_clock).toBeDefined();
    expect(
      back!.pages.find((page) => page.id === 'home')!.placements.tablet?.cover_clock
    ).toBeUndefined();
  });

  it('a widget added to a full cover goes to the first page of widgets', () => {
    const full: LauncherLayout = {
      ...layout,
      pages: [
        ...layout.pages,
        {
          id: COVER_PAGE_ID,
          label: 'Copertina',
          kind: 'cover',
          // Saved without columns, by an earlier build: it keeps the grid of the class (E9).
          placements: { tablet: { big: { x: 0, y: 0, w: 8, h: 5 } } },
        },
      ],
    };
    const result = placeWidgetInLayout(full, ctx, COVER_PAGE_ID, 'cover_clock_2');
    expect(result.placed).toBe(true);
    expect(result.pageId).toBe('home');
    expect(result.layout.pages.find((page) => page.kind === 'cover')?.placements.tablet).toEqual({
      big: { x: 0, y: 0, w: 8, h: 5 },
    });
  });

  it('a new cover keeps its three columns as widgets come and go', () => {
    const stored = withCoverPage(layout, DEFAULT_GRIDS);
    expect(stored.pages.find((page) => page.kind === 'cover')?.columns).toBe(3);
    const moved = moveWidgetToPageInLayout(stored, ctx, COVER_PAGE_ID, 'home', 'cover_weather')!;
    const cover = moved.pages.find((page) => page.kind === 'cover')!;
    expect(cover.columns).toBe(3);
    expect(Object.keys(cover.placements['tablet@3x1'] ?? {})).toEqual([
      'cover_clock',
      'cover_calendar',
    ]);
  });
});
