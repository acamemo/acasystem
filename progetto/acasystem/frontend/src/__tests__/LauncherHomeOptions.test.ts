/**
 * Options of the whole layout (REP-20261007-033): «Blocca la disposizione» and the main page
 * chosen with the house icon, as the home settings of Android launchers.
 */
import { describe, expect, it } from 'vitest';
import type { LauncherLayout } from '@/@types/launcher';
import { DEFAULT_GRIDS, classWithDensity, gridFor } from '@/utils/launcher/deviceClass';
import {
  addPageToLayout,
  canRemovePage,
  ensureDeviceClass,
  removePageFromLayout,
} from '@/utils/launcher/layout';
import { basePageId, homeEntryIndex, pagerEntries } from '@/utils/launcher/pager';
import { sanitizeLauncherLayout } from '@/validators/launcher';

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: true },
  pages: [
    { id: 'home', label: 'Principale', kind: 'widgets', placements: {} },
    { id: 'cucina', label: 'Cucina', kind: 'widgets', placements: {} },
    { id: 'luci', label: 'Luci', kind: 'lights', placements: {} },
  ],
};

describe('validator', () => {
  it('keeps the lock, a main page of widgets and the density', () => {
    const clean = sanitizeLauncherLayout({
      ...layout,
      locked: true,
      homePageId: 'cucina',
      density: 'wide',
    });
    expect(clean).toMatchObject({ locked: true, homePageId: 'cucina', density: 'wide' });
  });

  it('drops a main page that is not a page of widgets, and unknown values', () => {
    const clean = sanitizeLauncherLayout({
      ...layout,
      locked: 'yes',
      homePageId: 'luci',
      density: 'huge',
    });
    expect(clean).not.toHaveProperty('locked');
    expect(clean).not.toHaveProperty('homePageId');
    expect(clean).not.toHaveProperty('density');
  });
});

describe('main page', () => {
  it('the launcher opens on the page chosen with the house icon', () => {
    const chosen = { ...layout, homePageId: 'cucina' };
    expect(basePageId(chosen)).toBe('cucina');
    expect(homeEntryIndex(pagerEntries(chosen, 'tablet', false), chosen)).toBe(2);
    // Hidden, it does not hold: the first page shown again.
    const hidden = {
      ...chosen,
      pages: chosen.pages.map((page) => (page.id === 'cucina' ? { ...page, hidden: true } : page)),
    };
    expect(basePageId(hidden)).toBe('home');
  });

  it('the main page cannot be deleted; «Principale» can once another page is the main one', () => {
    expect(canRemovePage(layout, 'home')).toBe(false);
    const chosen = { ...layout, homePageId: 'cucina' };
    expect(canRemovePage(chosen, 'cucina')).toBe(false);
    expect(canRemovePage(chosen, 'home')).toBe(true);
  });

  it('protects the page that is the main one, also when the chosen one is hidden (REP-20261008-001)', () => {
    const hidden: LauncherLayout = {
      ...layout,
      homePageId: 'cucina',
      pages: layout.pages.map((page) => (page.id === 'cucina' ? { ...page, hidden: true } : page)),
    };
    // The launcher opens on «Principale» and the editor marks it: it is the one kept.
    expect(basePageId(hidden)).toBe('home');
    expect(canRemovePage(hidden, 'home')).toBe(false);
    expect(canRemovePage(hidden, 'cucina')).toBe(true);
    // Without a choice the first page of widgets shown is the main one, whatever its id.
    const reordered: LauncherLayout = { ...layout, pages: [...layout.pages].reverse() };
    expect(basePageId(reordered)).toBe('cucina');
    expect(canRemovePage(reordered, 'cucina')).toBe(false);
    expect(canRemovePage(reordered, 'home')).toBe(true);
  });

  it('removing the hidden chosen page drops the choice: a new page with its name is not the main one', () => {
    const hidden: LauncherLayout = {
      ...layout,
      homePageId: 'cucina',
      pages: layout.pages.map((page) => (page.id === 'cucina' ? { ...page, hidden: true } : page)),
    };
    const removed = removePageFromLayout(hidden, 'cucina');
    expect(removed.pages.map((page) => page.id)).toEqual(['home', 'luci']);
    expect(removed).not.toHaveProperty('homePageId');
    const added = addPageToLayout(removed, { label: 'Cucina' });
    expect(added.pageId).toBe('cucina');
    expect(basePageId(added.layout)).toBe('home');
    expect(canRemovePage(added.layout, 'cucina')).toBe(true);
    // Another page removed keeps the choice.
    expect(removePageFromLayout({ ...layout, homePageId: 'cucina' }, 'home').homePageId).toBe(
      'cucina'
    );
  });
});

describe('page overview: the cover that is off (REP-20261008-001)', () => {
  const off: LauncherLayout = { ...layout, cover: { enabled: false } };
  it('has a card marked hidden in the overview only', () => {
    expect(pagerEntries(off, 'tablet', true).map((entry) => entry.key)).toEqual([
      'home',
      'cucina',
      'luci',
    ]);
    const overview = pagerEntries(off, 'tablet', true, DEFAULT_GRIDS, undefined, true);
    expect(overview.map((entry) => entry.key)).toEqual(['cover', 'home', 'cucina', 'luci']);
    expect(overview[0]).toMatchObject({ type: 'cover', hidden: true });
    // Switched on, the cover is not marked.
    expect(
      pagerEntries(layout, 'tablet', true, DEFAULT_GRIDS, undefined, true)[0]
    ).not.toHaveProperty('hidden');
  });
});

describe('grid density (REP-20261007-034)', () => {
  it('gives every density its grid, and the density its own class of placements', () => {
    expect(gridFor(DEFAULT_GRIDS, 'tablet')).toEqual({ w: 8, h: 5 });
    expect(gridFor(DEFAULT_GRIDS, 'tablet@wide')).toEqual({ w: 10, h: 6 });
    expect(gridFor(DEFAULT_GRIDS, 'phoneLandscape@wide')).toEqual({ w: 8, h: 3 });
    expect(gridFor(DEFAULT_GRIDS, 'phone@compact')).toEqual({ w: 3, h: 5 });
    expect(classWithDensity('tablet', 'normal')).toBe('tablet');
    expect(classWithDensity('tablet', 'wide')).toBe('tablet@wide');
  });

  it('a new density is packed from the normal one, which stays as it was', () => {
    const arranged: LauncherLayout = {
      ...layout,
      pages: [
        {
          id: 'home',
          label: 'Principale',
          kind: 'widgets',
          placements: {
            tablet: {
              a: { x: 6, y: 3, w: 2, h: 2 },
              b: { x: 0, y: 0, w: 4, h: 2 },
            },
          },
        },
      ],
    };
    const ctx = {
      deviceClass: 'tablet@wide' as const,
      grids: DEFAULT_GRIDS,
      sizesOf: () => ({ min: { w: 1, h: 1 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } }),
    };
    const wide = ensureDeviceClass(arranged, ctx);
    const page = wide.pages[0];
    expect(Object.keys(page.placements['tablet@wide'] ?? {}).sort()).toEqual(['a', 'b']);
    expect(page.placements.tablet).toEqual(arranged.pages[0].placements.tablet);
  });

  it('the validator keeps the placements of every density', () => {
    const clean = sanitizeLauncherLayout({
      ...layout,
      pages: [
        {
          id: 'home',
          label: 'Principale',
          kind: 'widgets',
          placements: { 'tablet@wide': { a: { x: 9, y: 5, w: 1, h: 1 } } },
        },
      ],
    });
    expect(clean?.pages[0].placements['tablet@wide']).toEqual({ a: { x: 9, y: 5, w: 1, h: 1 } });
  });
});
