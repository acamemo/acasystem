import { describe, expect, it } from 'vitest';
import type { PagesConfig } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { rectsOverlap } from '@/utils/launcher/grid';
import {
  addPageToLayout,
  canRemovePage,
  ensureDeviceClass,
  moveWidgetInLayout,
  moveWidgetToPageInLayout,
  pageWidgetIds,
  placeWidgetAheadInLayout,
  placeWidgetInLayout,
  removePageFromLayout,
  removeWidgetFromLayout,
  reorderPagesInLayout,
  resizeWidgetInLayout,
  setCoverInLayout,
  withCoverPage,
  updatePageInLayout,
  type LayoutContext,
} from '@/utils/launcher/layout';
import { layoutToPageSettings, layoutToPagesConfig } from '@/utils/launcher/legacySync';
import { legacyCardCellSize, migrateLegacyLayout } from '@/utils/launcher/migration';
import { createPageId, displayLabel, legacyPageKind } from '@/utils/launcher/pageIdentity';
import { pagerEntries } from '@/utils/launcher/pager';

const tablet: LayoutContext = { deviceClass: 'tablet', grids: DEFAULT_GRIDS };
const phone: LayoutContext = { deviceClass: 'phone', grids: DEFAULT_GRIDS };

function noOverlap(placements: Record<string, { x: number; y: number; w: number; h: number }>) {
  const ids = Object.keys(placements);
  for (const a of ids)
    for (const b of ids) if (a !== b && rectsOverlap(placements[a], placements[b])) return false;
  return true;
}

describe('launcher migration from the legacy layout', () => {
  it('maps legacy heights and widths to cells', () => {
    const grid = DEFAULT_GRIDS.tablet;
    expect(legacyCardCellSize('sensor.t', 'home', {}, grid)).toEqual({ w: 2, h: 2 });
    expect(
      legacyCardCellSize('light.a', 'home', { 'home::light.a': { size: 'small' } }, grid)
    ).toEqual({
      w: 2,
      h: 1,
    });
    expect(
      legacyCardCellSize('calendar_card_1', 'home', { 'home::calendar_card_1': {} }, grid)
    ).toEqual({ w: 2, h: 4 });
    expect(legacyCardCellSize('x.y', 'home', { 'home::x.y': { colSpan: 2 } }, grid)).toEqual({
      w: 4,
      h: 2,
    });
    expect(legacyCardCellSize('x.y', 'home', { 'home::x.y': { colSpan: 'full' } }, grid)).toEqual({
      w: 8,
      h: 2,
    });
  });

  it('keeps pages, labels, kinds, hidden pages and legacy order', () => {
    const pagesConfig: PagesConfig = {
      header: ['person.me'],
      pages: ['home', 'lights_1', 'media', 'extra'],
      home: ['sensor.a', 'light.b', 'sensor.a'],
      lights_1: [],
      media: [],
      extra: ['switch.c'],
    };
    const layout = migrateLegacyLayout({
      pagesConfig,
      pageSettings: { extra: { label: 'Extra', hidden: true }, media: { type: 'media' } },
      cardSettings: { 'home::light.b': { size: 'small' } },
      deviceClass: 'tablet',
      grids: DEFAULT_GRIDS,
    });
    expect(layout.version).toBe(1);
    expect(layout.cover.enabled).toBe(true);
    expect(layout.pages.map((page) => [page.id, page.kind, page.label])).toEqual([
      ['home', 'widgets', 'Principale'],
      ['lights_1', 'lights', 'lights_1'],
      ['media', 'media', 'media'],
      ['extra', 'widgets', 'Extra'],
    ]);
    expect(layout.pages[3].hidden).toBe(true);
    expect(layout.pages[0].placements.tablet).toEqual({
      'sensor.a': { x: 0, y: 0, w: 2, h: 2 },
      'light.b': { x: 2, y: 0, w: 2, h: 1 },
    });
    expect(layout.pages[1].placements).toEqual({});
  });

  it('respects the widget definition limits', () => {
    const layout = migrateLegacyLayout({
      pagesConfig: { header: [], pages: ['home'], home: ['sensor.a'] },
      pageSettings: {},
      cardSettings: {},
      deviceClass: 'tablet',
      grids: DEFAULT_GRIDS,
      sizesOf: () => ({ min: { w: 3, h: 3 }, max: { w: 4, h: 4 }, default: { w: 3, h: 3 } }),
    });
    expect(layout.pages[0].placements.tablet?.['sensor.a']).toEqual({ x: 0, y: 0, w: 3, h: 3 });
  });

  it('moves the cards that do not fit to a continuation page', () => {
    const ids = Array.from({ length: 14 }, (_, index) => `sensor.s${index}`);
    const layout = migrateLegacyLayout({
      pagesConfig: { header: [], pages: ['home'], home: ids },
      pageSettings: { home: { label: 'Casa' } },
      cardSettings: {},
      deviceClass: 'tablet',
      grids: DEFAULT_GRIDS,
      sizesOf: () => ({ min: { w: 2, h: 2 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } }),
    });
    // 8×5 cells hold 4×2 widgets of 2×2 (the last row is left).
    expect(layout.pages.map((page) => page.label)).toEqual(['Casa', 'Casa 2']);
    expect(Object.keys(layout.pages[0].placements.tablet ?? {})).toHaveLength(8);
    expect(Object.keys(layout.pages[1].placements.tablet ?? {})).toHaveLength(6);
    expect(layout.pages[1].id).not.toBe('home');
  });

  it('detects the special pages like the legacy dashboard', () => {
    expect(legacyPageKind('media_2', {})).toBe('media');
    expect(legacyPageKind('anything', { anything: { type: 'media' } })).toBe('media');
    expect(legacyPageKind('sonos', {})).toBe('sonos');
    expect(legacyPageKind('lights', {})).toBe('lights');
    expect(legacyPageKind('battery_2', {})).toBe('battery');
    expect(legacyPageKind('x', { x: { type: 'room_explorer' } })).toBe('rooms');
    expect(legacyPageKind('home', {})).toBe('widgets');
  });
});

function sampleLayout(): LauncherLayout {
  return {
    version: 1,
    cover: { enabled: true },
    pages: [
      {
        id: 'home',
        label: 'Casa',
        kind: 'widgets',
        placements: {
          tablet: {
            a: { x: 0, y: 0, w: 4, h: 2 },
            b: { x: 4, y: 0, w: 2, h: 2 },
            c: { x: 6, y: 0, w: 2, h: 2 },
            d: { x: 0, y: 2, w: 8, h: 2 },
          },
        },
      },
      { id: 'luci', label: 'LUCI', kind: 'lights', placements: {} },
      { id: 'altro', label: 'Altro', kind: 'widgets', placements: { tablet: {} } },
    ],
  };
}

describe('launcher layout operations', () => {
  it('packs a new device class from the tablet placements, shrinking or overflowing', () => {
    const layout = sampleLayout();
    const next = ensureDeviceClass(layout, phone);
    expect(next).not.toBe(layout);
    const phonePlacements = next.pages[0].placements.phone ?? {};
    expect(noOverlap(phonePlacements)).toBe(true);
    for (const rect of Object.values(phonePlacements)) {
      expect(rect.x + rect.w).toBeLessThanOrEqual(4);
      expect(rect.y + rect.h).toBeLessThanOrEqual(6);
    }
    expect(Object.keys(phonePlacements).sort()).toEqual(['a', 'b', 'c', 'd']);
    // Tablet placements are untouched; a second pass changes nothing.
    expect(next.pages[0].placements.tablet).toEqual(layout.pages[0].placements.tablet);
    expect(ensureDeviceClass(next, phone)).toBe(next);
  });

  it('puts what does not fit a smaller class on a continuation page empty elsewhere', () => {
    const layout = sampleLayout();
    const min = { w: 4, h: 2 };
    const next = ensureDeviceClass(layout, {
      ...phone,
      sizesOf: () => ({ min, max: { w: 8, h: 4 }, default: min }),
    });
    const continuation = next.pages[1];
    expect(continuation.label).toBe('Casa 2');
    expect(Object.keys(continuation.placements.phone ?? {})).toEqual(['d']);
    expect(continuation.placements.tablet).toEqual({});
    expect(Object.keys(next.pages[0].placements.phone ?? {})).toEqual(['a', 'b', 'c']);
  });

  it('places a widget in the first free rectangle, on a new page when full', () => {
    const layout = sampleLayout();
    const first = placeWidgetInLayout(layout, tablet, 'home', 'e', { w: 2, h: 1 });
    expect(first.pageId).toBe('home');
    expect(first.layout.pages[0].placements.tablet?.e).toEqual({ x: 0, y: 4, w: 2, h: 1 });

    const full = placeWidgetInLayout(layout, tablet, 'home', 'big', { w: 8, h: 2 });
    expect(full.pageId).not.toBe('home');
    const added = full.layout.pages.find((page) => page.id === full.pageId);
    expect(added?.placements.tablet?.big).toEqual({ x: 0, y: 0, w: 8, h: 2 });
    expect(full.layout.pages.indexOf(added!)).toBe(1);
  });

  it('places in the other classes already shown when there is room', () => {
    const shown = ensureDeviceClass(sampleLayout(), phone);
    const result = placeWidgetInLayout(shown, tablet, 'altro', 'z');
    const page = result.layout.pages.find((item) => item.id === 'altro');
    expect(page?.placements.tablet?.z).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(page?.placements.phone?.z).toEqual({ x: 0, y: 0, w: 2, h: 2 });
  });

  it('moves with push, resizes and refuses impossible changes', () => {
    const layout = sampleLayout();
    const moved = moveWidgetInLayout(layout, tablet, 'home', 'b', { x: 0, y: 4, w: 2, h: 1 });
    expect(moved?.pages[0].placements.tablet?.b).toEqual({ x: 0, y: 4, w: 2, h: 1 });
    // The others are pushed aside when they fit, the move is refused when they do not.
    const pushed = moveWidgetInLayout(layout, tablet, 'home', 'd', { x: 0, y: 0, w: 8, h: 2 });
    expect(pushed && noOverlap(pushed.pages[0].placements.tablet ?? {})).toBe(true);
    expect(moveWidgetInLayout(layout, tablet, 'home', 'a', { x: 0, y: 0, w: 8, h: 5 })).toBeNull();
    const resized = resizeWidgetInLayout(layout, tablet, 'home', 'c', { w: 2, h: 1 });
    expect(resized?.pages[0].placements.tablet?.c).toEqual({ x: 6, y: 0, w: 2, h: 1 });
    expect(resizeWidgetInLayout(layout, tablet, 'home', 'c', { w: 3, h: 2 })).toBeNull();
  });

  it('moves page membership in every class while preserving separate placements', () => {
    const layout = ensureDeviceClass(sampleLayout(), phone);
    const next = moveWidgetToPageInLayout(layout, tablet, 'home', 'altro', 'b');
    expect(next).not.toBeNull();
    expect(next!.pages[0].placements.tablet?.b).toBeUndefined();
    expect(next!.pages[2].placements.tablet?.b).toBeDefined();
    expect(next!.pages[0].placements.phone?.b).toBeUndefined();
    expect(next!.pages[2].placements.phone?.b).toBeDefined();
  });

  it('removes widgets everywhere on the page and manages pages', () => {
    const layout = ensureDeviceClass(sampleLayout(), phone);
    const removed = removeWidgetFromLayout(layout, 'home', 'a');
    expect(pageWidgetIds(removed.pages[0])).toEqual(['b', 'c', 'd']);

    const added = addPageToLayout(layout, { label: 'Media e altro', kind: 'widgets' }, 'home');
    expect(added.pageId).toBe('media_e_altro'.replace(/^media/, 'page_media'));
    expect(added.layout.pages[1].id).toBe(added.pageId);

    const renamed = updatePageInLayout(layout, 'altro', { label: 'Studio', hidden: true });
    expect(renamed.pages[2]).toMatchObject({ label: 'Studio', hidden: true });
    expect(updatePageInLayout(renamed, 'altro', { label: '  ' }).pages[2].label).toBe('Studio');

    expect(canRemovePage(layout, 'home')).toBe(false);
    expect(removePageFromLayout(layout, 'altro').pages.map((page) => page.id)).toEqual([
      'home',
      'luci',
    ]);
    expect(reorderPagesInLayout(layout, ['altro', 'home']).pages.map((page) => page.id)).toEqual([
      'altro',
      'home',
      'luci',
    ]);
    expect(setCoverInLayout(layout, false).cover.enabled).toBe(false);
    expect(setCoverInLayout(layout, true)).toBe(layout);
  });

  it('creates unique ids that never look like special pages', () => {
    expect(createPageId('Luci', 'widgets', ['home'])).toBe('luci');
    expect(createPageId('Lights', 'widgets', [])).toBe('page_lights');
    expect(createPageId('Città', 'widgets', ['citta'])).toBe('citta_2');
    expect(createPageId('x', 'media', ['media'])).toBe('media_2');
    expect(createPageId('x', 'rooms', [])).toBe('room_explorer');
  });
});

describe('launcher pager and legacy mirror', () => {
  it('lists the cover, hides hidden and empty pages outside edit mode', () => {
    const layout = sampleLayout();
    layout.pages[2].hidden = true;
    const view = pagerEntries(layout, 'tablet', false);
    expect(view.map((entry) => entry.key)).toEqual(['cover', 'home', 'luci']);
    expect(view[2].label).toBe('Luci');
    const edit = pagerEntries(layout, 'tablet', true);
    expect(edit.map((entry) => entry.key)).toEqual(['cover', 'home', 'luci', 'altro']);
    const empty: LauncherLayout = {
      version: 1,
      cover: { enabled: false },
      pages: [{ id: 'home', label: 'Casa', kind: 'widgets', placements: {} }],
    };
    expect(pagerEntries(empty, 'tablet', false).map((entry) => entry.key)).toEqual(['home']);
  });

  it('mirrors pages and cards into pagesConfig and pageSettings', () => {
    const layout = sampleLayout();
    const previous: PagesConfig = { header: ['person.me'], pages: ['home'], home: [] };
    const config = layoutToPagesConfig(layout, previous, 'tablet');
    expect(config).toEqual({
      header: ['person.me'],
      pages: ['home', 'luci', 'altro'],
      home: ['a', 'b', 'c', 'd'],
      luci: [],
      altro: [],
    });
    expect(layoutToPagesConfig(layout, config, 'tablet')).toBe(config);

    const settings = layoutToPageSettings(layout, { gone: { label: 'Vecchia' } });
    expect(settings).toEqual({
      home: { label: 'Casa' },
      luci: { label: 'LUCI', type: 'lights' },
      altro: { label: 'Altro' },
    });
    expect(layoutToPageSettings(layout, settings)).toBe(settings);
  });

  it('writes labels in sentence case', () => {
    expect(displayLabel('LUCI')).toBe('Luci');
    expect(displayLabel('TV sala')).toBe('TV sala');
    expect(displayLabel('cucina')).toBe('Cucina');
    expect(displayLabel('', 'Pagina')).toBe('Pagina');
  });
});

describe('a widget added from the pages view (2026-10-23)', () => {
  const big = { w: 8, h: 2 };
  /** `sampleLayout` with «Altro» as full as «Casa»: no page of widgets has room for `big`. */
  const allFull = (): LauncherLayout => {
    const layout = sampleLayout();
    return {
      ...layout,
      pages: layout.pages.map((page) =>
        page.id === 'altro'
          ? { ...page, placements: { tablet: { z: { x: 0, y: 0, w: 8, h: 5 } } } }
          : page
      ),
    };
  };

  it('goes to the first free place of the page in the centre', () => {
    const result = placeWidgetAheadInLayout(sampleLayout(), tablet, 'home', 'e', { w: 2, h: 1 });
    expect(result).toMatchObject({ pageId: 'home', placed: true });
    expect(result.layout.pages[0].placements.tablet?.e).toEqual({ x: 0, y: 4, w: 2, h: 1 });
  });

  it('goes to the first page after it with room when the page is full, skipping the special ones', () => {
    const result = placeWidgetAheadInLayout(sampleLayout(), tablet, 'home', 'big', big);
    // «Luci» (a special page) is between the two: it takes no widgets.
    expect(result).toMatchObject({ pageId: 'altro', placed: true });
    expect(result.layout.pages).toHaveLength(3);
    expect(result.layout.pages[2].placements.tablet?.big).toEqual({ x: 0, y: 0, w: 8, h: 2 });
    expect(result.layout.pages[0].placements.tablet?.big).toBeUndefined();
  });

  it('skips a hidden page, and takes a new page at the end when no page after has room', () => {
    const layout = sampleLayout();
    const hidden: LauncherLayout = {
      ...layout,
      pages: layout.pages.map((page) => (page.id === 'altro' ? { ...page, hidden: true } : page)),
    };
    for (const source of [hidden, allFull()]) {
      const result = placeWidgetAheadInLayout(source, tablet, 'home', 'big', big);
      expect(result.placed).toBe(true);
      expect(['home', 'luci', 'altro']).not.toContain(result.pageId);
      expect(result.layout.pages).toHaveLength(4);
      expect(result.layout.pages[3]).toMatchObject({
        id: result.pageId,
        label: 'Nuova pagina',
        kind: 'widgets',
      });
      expect(result.layout.pages[3].continuationOf).toBeUndefined();
      expect(result.layout.pages[3].placements.tablet?.big).toEqual({ x: 0, y: 0, w: 8, h: 2 });
    }
  });

  it('looks only at the pages after the one in the centre: a full last page leads to a new page', () => {
    // «Casa» has room for a 2 × 1 widget, but it comes before «Altro».
    const layout = allFull();
    const result = placeWidgetAheadInLayout(layout, tablet, 'altro', 'e', { w: 2, h: 1 });
    expect(result.pageId).not.toBe('home');
    expect(result.layout.pages).toHaveLength(4);
    expect(result.layout.pages[0].placements.tablet?.e).toBeUndefined();
  });

  it('starts from the cover: a full cover leads to the first page of widgets with room', () => {
    const stored = withCoverPage(sampleLayout(), DEFAULT_GRIDS);
    // The default cover (clock, date, weather) is already full: an empty one is made for the test.
    const covered: LauncherLayout = {
      ...stored,
      pages: stored.pages.map((page) =>
        page.kind === 'cover' ? { ...page, placements: { tablet: {} } } : page
      ),
    };
    const full = placeWidgetInLayout(covered, tablet, 'cover', 'banner', { w: 8, h: 8 }).layout;
    // The free cover takes it …
    const room = placeWidgetAheadInLayout(covered, tablet, 'cover', 'e', { w: 1, h: 1 });
    expect(room.pageId).toBe('cover');
    // … a full one sends it on to «Casa», the first page of the pager after it.
    const result = placeWidgetAheadInLayout(full, tablet, 'cover', 'e', { w: 2, h: 1 });
    expect(result).toMatchObject({ pageId: 'home', placed: true });
    expect(result.layout.pages.find((page) => page.id === 'home')?.placements.tablet?.e).toEqual({
      x: 0,
      y: 4,
      w: 2,
      h: 1,
    });
  });

  it('leaves a widget that is already on the page where it is, and refuses a special page', () => {
    const layout = sampleLayout();
    const same = placeWidgetAheadInLayout(layout, tablet, 'home', 'a', { w: 2, h: 1 });
    expect(same).toEqual({ layout, pageId: 'home', placed: true });
    expect(placeWidgetAheadInLayout(layout, tablet, 'luci', 'e')).toEqual({
      layout,
      pageId: 'luci',
      placed: false,
    });
    expect(placeWidgetAheadInLayout(layout, tablet, 'assente', 'e').placed).toBe(false);
  });
});
