import { describe, expect, it } from 'vitest';
import type { LauncherLayout } from '@/@types/launcher';
import type { CardSettingsMap } from '@/@types/dashboard';
import { CATEGORY_PAGES, categoryPageSeeds } from '@/templates/sheets/categoryPages';
import {
  categoryGrid,
  categoryPageGeometry,
  upgradeCategoryGrids,
} from '@/templates/sheets/categoryPageGrid';
import { BASE_DEVICE_CLASSES, DEFAULT_GRIDS, cellMetrics } from '@/utils/launcher/deviceClass';
import { pageClass, placeWidgetInLayout, type LayoutContext } from '@/utils/launcher/layout';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { sanitizeLauncherLayout } from '@/validators/launcher';
import { legacySettingsKey } from '@/utils/launcher/migration';

const ctx: LayoutContext = {
  deviceClass: 'phone',
  grids: DEFAULT_GRIDS,
  viewportWidth: 390,
  sizesOf: (id) => findWidgetDefinition(id)?.sizes,
};
function legacyCategory() {
  let layout: LauncherLayout = {
    version: 1,
    categoryDefaultsVersion: 1,
    cover: { enabled: true },
    pages: [{ id: 'casa', label: 'Casa personale', kind: 'widgets', placements: {} }],
  };
  const settings: CardSettingsMap = {};
  let target = 'casa';
  for (const seed of categoryPageSeeds('casa', 'casa')) {
    const result = placeWidgetInLayout(layout, ctx, target, seed.id, seed.size);
    layout = result.layout;
    target = result.pageId;
    settings[legacySettingsKey(target, seed.id)] = { ...seed.settings, name: `Nome ${seed.id}` };
  }
  return { layout, settings };
}

describe('filled category grids', () => {
  it('keeps regular gaps on filled category grids instead of spreading rows apart', () => {
    const metrics = cellMetrics(1224, 772, { w: 5, h: 2 }, 16, 1, false);
    expect(metrics.gapX).toBe(16);
    expect(metrics.gapY).toBe(16);
    expect(metrics.height).toBe(metrics.cell * 2 + 16);
  });
  it('packs every category on every screen without overlaps or unused cells, within native limits', () => {
    for (const category of CATEGORY_PAGES)
      for (const base of BASE_DEVICE_CLASSES) {
        const seeds = categoryPageSeeds(category.id, category.id);
        const result = categoryGrid(seeds, base);
        const cells = new Set<string>();
        for (const seed of seeds) {
          const r = result.placements[seed.id];
          const limits = findWidgetDefinition(seed.id, seed.settings)!.sizes;
          expect(r.w).toBeGreaterThanOrEqual(limits.min.w);
          expect(r.h).toBeGreaterThanOrEqual(limits.min.h);
          expect(r.w).toBeLessThanOrEqual(limits.max.w);
          expect(r.h).toBeLessThanOrEqual(limits.max.h);
          expect(r.x + r.w).toBeLessThanOrEqual(result.grid.w);
          expect(r.y + r.h).toBeLessThanOrEqual(result.grid.h);
          for (let x = r.x; x < r.x + r.w; x++)
            for (let y = r.y; y < r.y + r.h; y++) {
              expect(cells.has(`${x},${y}`)).toBe(false);
              cells.add(`${x},${y}`);
            }
        }
        expect(cells.size).toBe(result.grid.w * result.grid.h);
      }
  });

  it('persists the defined grids and lets explicit column choices override them', () => {
    const layout: LauncherLayout = {
      version: 1,
      cover: { enabled: true },
      pages: [
        {
          id: 'energia',
          label: 'Energia',
          kind: 'widgets',
          ...categoryPageGeometry('energia', 'energia'),
        },
      ],
    };
    const saved = sanitizeLauncherLayout(layout)!;
    expect(saved.pages[0].categoryGrids).toEqual(layout.pages[0].categoryGrids);
    const key = pageClass(saved, saved.pages[0], ctx);
    expect(saved.pages[0].placements[key]).toHaveProperty('cost_card_preset_energia');
    expect(pageClass(saved, { ...saved.pages[0], columns: 8 }, ctx)).not.toBe(key);
  });

  it('upgrades untouched legacy pages and keeps names and mappings from continuations', () => {
    const old = legacyCategory();
    expect(old.layout.pages.length).toBeGreaterThan(1);
    const upgraded = upgradeCategoryGrids(old.layout, old.settings, ctx);
    expect(upgraded.layout.pages).toHaveLength(1);
    expect(upgraded.layout.pages[0].label).toBe('Casa personale');
    for (const seed of categoryPageSeeds('casa', 'casa'))
      expect(upgraded.settings[legacySettingsKey('casa', seed.id)].name).toBe(`Nome ${seed.id}`);
    expect(upgradeCategoryGrids(upgraded.layout, upgraded.settings, ctx).layout).toBe(
      upgraded.layout
    );
  });

  it('preserves custom positions, column choices and removed widgets', () => {
    const old = legacyCategory();
    const changed = structuredClone(old.layout);
    const rects = changed.pages[0].placements.phone!;
    const [a, b] = Object.keys(rects);
    [rects[a], rects[b]] = [rects[b], rects[a]];
    expect(upgradeCategoryGrids(changed, old.settings, ctx).layout).toBe(changed);
    const removed = structuredClone(old.layout);
    delete removed.pages[0].placements.phone![a];
    expect(upgradeCategoryGrids(removed, old.settings, ctx).layout).toBe(removed);
    const columns = structuredClone(old.layout);
    columns.pages[0].columns = 6;
    expect(upgradeCategoryGrids(columns, old.settings, ctx).layout).toBe(columns);
    const hidden = structuredClone(old.layout);
    hidden.pages[1].hidden = true;
    expect(upgradeCategoryGrids(hidden, old.settings, ctx).layout).toBe(hidden);
    const main = { ...old.layout, homePageId: old.layout.pages[1].id };
    expect(upgradeCategoryGrids(main, old.settings, ctx).layout).toBe(main);
    const renamed = structuredClone(old.layout);
    renamed.pages[1].label = 'La mia pagina';
    expect(upgradeCategoryGrids(renamed, old.settings, ctx).layout).toBe(renamed);
  });
});
