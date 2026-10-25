import type {
  BaseDeviceClass,
  CellRect,
  CellSize,
  LauncherGrids,
  LauncherPage,
} from '@/@types/launcher';
import {
  BASE_DEVICE_CLASSES,
  COLUMN_LIMIT,
  DEFAULT_GRIDS,
  REFERENCE_AREAS,
  placementKey,
} from '@/utils/launcher/deviceClass';
import { findFreeRect, type Placements } from '@/utils/launcher/grid';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { categoryPageSeeds, type PageSeed } from './categoryPages';
import { CATEGORY_PAGES } from './categoryPages';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { DeviceClass, LauncherLayout } from '@/@types/launcher';
import { placeWidgetInLayout, type LayoutContext } from '@/utils/launcher/layout';
import { legacySettingsKey } from '@/utils/launcher/migration';

/** Exact filled rectangles, preferring the screen's proportions and the native default sizes. */
export function categoryGrid(
  seeds: readonly PageSeed[],
  base: BaseDeviceClass
): { grid: CellSize; placements: Placements } {
  const variants = [seeds.map((seed) => seed.size)];
  seeds.forEach((seed, index) => {
    const max = findWidgetDefinition(seed.id, seed.settings)!.sizes.max;
    for (let w = seed.size.w; w <= Math.min(4, max.w); w++)
      for (let h = seed.size.h; h <= Math.min(4, max.h); h++) {
        if (w === seed.size.w && h === seed.size.h) continue;
        variants.push(seeds.map((item, position) => (position === index ? { w, h } : item.size)));
      }
  });
  const originalArea = seeds.reduce((sum, seed) => sum + seed.size.w * seed.size.h, 0);
  const reference = REFERENCE_AREAS[base];
  let best: { grid: CellSize; placements: Placements; score: number } | undefined;
  for (const sizes of variants) {
    const area = sizes.reduce((sum, size) => sum + size.w * size.h, 0);
    const ordered = seeds
      .map((seed, index) => ({ id: seed.id, size: sizes[index] }))
      .sort((a, b) => b.size.w * b.size.h - a.size.w * a.size.h || b.size.h - a.size.h);
    for (let w = 1; w <= COLUMN_LIMIT[base]; w++) {
      const h = area / w;
      if (!Number.isInteger(h) || h > 16) continue;
      const grid = { w, h };
      const placements: Record<string, CellRect> = {};
      for (const item of ordered) {
        const rect = findFreeRect(placements, grid, item.size);
        if (!rect) break;
        placements[item.id] = rect;
      }
      if (Object.keys(placements).length !== seeds.length) continue;
      const score =
        Math.abs(Math.log(w / h / (reference.width / reference.height))) +
        (area - originalArea) * 0.025;
      if (!best || score < best.score) best = { grid, placements, score };
    }
  }
  if (!best) throw new Error('La categoria non ha una disposizione iniziale completa.');
  return best;
}

export function categoryPageGeometry(
  categoryId: string,
  pageId: string,
  grids: LauncherGrids = DEFAULT_GRIDS
): Pick<LauncherPage, 'categoryGrids' | 'placements'> {
  const seeds = categoryPageSeeds(categoryId, pageId);
  const categoryGrids: Partial<Record<BaseDeviceClass, CellSize>> = {};
  const placements: LauncherPage['placements'] = {};
  for (const base of BASE_DEVICE_CLASSES) {
    const packed = categoryGrid(seeds, base);
    categoryGrids[base] = packed.grid;
    placements[placementKey(base, packed.grid, grids)] = packed.placements;
  }
  return { categoryGrids, placements };
}

/**
 * What was found for a page that the upgrade left as it is, with what the answer depends on: the
 * page and its continuations, the main page, the settings and the context. The upgrade runs after
 * every change of the layout (an effect of the controller) and, for a page that looks like a
 * category page but was changed by the person, it laid the whole seed out again each time, 5-9 ms
 * of every drop and every «Annulla» (tracing of 2026-10-24, REP-20261023-006). Layouts, pages and
 * settings are never changed in place, so the same objects give the same answer.
 */
interface Checked {
  family: readonly LauncherPage[];
  homePageId: string | undefined;
  settings: CardSettingsMap;
  ctx: LayoutContext;
}
const CHECKED = new WeakMap<LauncherPage, Checked>();

const sameChecked = (
  checked: Checked,
  family: readonly LauncherPage[],
  layout: LauncherLayout,
  settings: CardSettingsMap,
  ctx: LayoutContext
) =>
  checked.settings === settings &&
  checked.homePageId === layout.homePageId &&
  checked.ctx.deviceClass === ctx.deviceClass &&
  checked.ctx.grids === ctx.grids &&
  checked.ctx.sizesOf === ctx.sizesOf &&
  checked.ctx.viewportWidth === ctx.viewportWidth &&
  checked.family.length === family.length &&
  checked.family.every((page, at) => page === family[at]);

/** Only replace the old untouched seed geometry. Never reflow a user's saved arrangement. */
export function upgradeCategoryGrids(
  layout: LauncherLayout,
  settings: CardSettingsMap,
  ctx: LayoutContext
): { layout: LauncherLayout; settings: CardSettingsMap } {
  let next = layout;
  let nextSettings = settings;
  const signature = (rects: Record<string, CellRect>) =>
    JSON.stringify(
      Object.entries(rects)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, r]) => [id, r.x, r.y, r.w, r.h])
    );
  for (const root of layout.pages) {
    if (
      root.categoryGrids ||
      root.columns !== undefined ||
      root.continuationOf ||
      root.kind !== 'widgets'
    )
      continue;
    const family = layout.pages.filter((page) => (page.continuationOf ?? page.id) === root.id);
    const known = CHECKED.get(root);
    if (known && sameChecked(known, family, layout, settings, ctx)) continue;
    // This page is left as it is: the answer is kept for the same page, family, settings and context.
    const keep = () => {
      CHECKED.set(root, { family, homePageId: layout.homePageId, settings, ctx });
    };
    if (
      family.some((page) => page.id !== root.id && (page.hidden || page.id === layout.homePageId))
    ) {
      keep();
      continue;
    }
    const ids = new Set(
      family.flatMap((page) =>
        Object.values(page.placements).flatMap((rects) => Object.keys(rects ?? {}))
      )
    );
    const category = CATEGORY_PAGES.find((item) => {
      const seeds = categoryPageSeeds(item.id, root.id);
      return seeds.length === ids.size && seeds.every((seed) => ids.has(seed.id));
    });
    if (!category) {
      keep();
      continue;
    }
    const seeds = categoryPageSeeds(category.id, root.id);
    let untouched = true;
    const keys = new Set(
      family.flatMap((page) => Object.keys(page.placements))
    ) as Set<DeviceClass>;
    for (const key of keys) {
      let expected: LauncherLayout = {
        version: 1,
        cover: { enabled: false },
        pages: [{ id: root.id, label: root.label, kind: 'widgets', placements: {} }],
      };
      let target = root.id;
      for (const seed of seeds) {
        const placed = placeWidgetInLayout(
          expected,
          { ...ctx, deviceClass: key },
          target,
          seed.id,
          seed.size
        );
        expected = placed.layout;
        target = placed.pageId;
      }
      const actualRects = family
        .map((page) => page.placements[key] ?? {})
        .filter((rects) => Object.keys(rects).length)
        .map(signature);
      const expectedRects = expected.pages
        .map((page) => page.placements[key] ?? {})
        .filter((rects) => Object.keys(rects).length)
        .map(signature);
      if (JSON.stringify(actualRects) !== JSON.stringify(expectedRects)) {
        untouched = false;
        break;
      }
      const actualChildren = family
        .filter((page) => page.id !== root.id && Object.keys(page.placements[key] ?? {}).length)
        .map((page) => page.label);
      const expectedChildren = expected.pages
        .filter((page) => page.id !== root.id && Object.keys(page.placements[key] ?? {}).length)
        .map((page) => page.label);
      if (JSON.stringify(actualChildren) !== JSON.stringify(expectedChildren)) {
        untouched = false;
        break;
      }
    }
    if (!untouched) {
      keep();
      continue;
    }
    const mapped: CardSettingsMap = {};
    for (const seed of seeds) {
      const owners = family.filter((page) =>
        Object.values(page.placements).some((rects) => rects?.[seed.id])
      );
      const choices = owners.map(
        (page) => settings[legacySettingsKey(page.id, seed.id)] ?? settings[seed.id] ?? {}
      );
      if (choices.some((choice) => JSON.stringify(choice) !== JSON.stringify(choices[0]))) {
        untouched = false;
        break;
      }
      if (choices[0]?.categoryWidgetType !== seed.settings.categoryWidgetType) {
        untouched = false;
        break;
      }
      mapped[legacySettingsKey(root.id, seed.id)] = choices[0];
    }
    if (!untouched) {
      keep();
      continue;
    }
    const familyIds = new Set(family.map((page) => page.id));
    next = {
      ...next,
      pages: next.pages
        .filter((page) => page.id === root.id || !familyIds.has(page.id))
        .map((page) =>
          page.id === root.id
            ? { ...root, ...categoryPageGeometry(category.id, root.id, ctx.grids) }
            : page
        ),
    };
    nextSettings = { ...nextSettings, ...mapped };
  }
  return { layout: next, settings: nextSettings };
}
