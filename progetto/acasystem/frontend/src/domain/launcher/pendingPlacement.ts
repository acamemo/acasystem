import type { CellRect, LauncherLayout } from '@/@types/launcher';
import type { PageSeed } from './categoryPages';
import { canonicalFromProjection, logicalPage, moveInCommonOrder, projectCommonOrder } from './commonOrder';
import { gridFor } from '@/utils/launcher/deviceClass';
import { clampSize, findFreeRectShrinking } from '@/utils/launcher/grid';
import { ensureDeviceClass, pageClass, pagePlacements, placeWidgetInLayout, withCoverPage, type LayoutContext } from '@/utils/launcher/layout';
import { pagerEntries } from '@/utils/launcher/pager';
import { layoutToPagesConfig } from '@/utils/launcher/legacySync';
import { legacySettingsKey } from '@/utils/launcher/migration';
import { adoptDeviceConfig, type WidgetState } from '@/utils/launcher/deviceMemory';

export interface PendingPlacement {
  logicalPageId: string;
  viewPageId: string;
  rect: CellRect;
  layout: LauncherLayout;
}

/** Pure planning: hidden/special pages are excluded and a full house creates no page. */
export function planWidgetAddition(base: LauncherLayout, ctx: LayoutContext, seed: PageSeed, originKey: string): PendingPlacement | null {
  if (base.locked) return null;
  const view = base.commonOrderVersion === 1 ? projectCommonOrder(base, ctx) : ensureDeviceClass(base, ctx);
  const entries = pagerEntries(view, ctx.deviceClass, false, ctx.grids, ctx.viewportWidth);
  for (const page of view.pages) {
    const existing = pagePlacements(page, pageClass(view, page, ctx))[seed.id];
    if (existing) return { logicalPageId: logicalPage(view, page.id), viewPageId: page.id, rect: existing, layout: base };
  }
  const origin = Math.max(0, entries.findIndex(entry => entry.key === originKey));
  const candidates = entries.map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.type === 'cover' ? Boolean(entry.page && !entry.hidden) : !entry.page.hidden && entry.page.kind === 'widgets')
    .sort((a, b) => Math.abs(a.index - origin) - Math.abs(b.index - origin) || b.index - a.index);
  for (const { entry } of candidates) {
    const page = entry.page;
    if (!page) continue;
    const key = pageClass(view, page, ctx), grid = gridFor(ctx.grids, key);
    const limits = ctx.sizesOf?.(seed.id, logicalPage(view, page.id));
    const wanted = clampSize(seed.size, grid, limits);
    const rect = findFreeRectShrinking(pagePlacements(page, key), grid, wanted, limits?.min ?? wanted);
    if (!rect) continue;
    let next: LauncherLayout;
    if (base.commonOrderVersion === 1) {
      const canonical = page.kind === 'cover' ? canonicalFromProjection(base, withCoverPage(view, ctx.grids), ctx) : base;
      next = moveInCommonOrder(canonical, withCoverPage(view, ctx.grids), ctx, page.id, seed.id, rect, rect);
    } else {
      const placed = placeWidgetInLayout(page.kind === 'cover' ? withCoverPage(view, ctx.grids) : view, ctx, page.id, seed.id, rect, rect);
      if (!placed.placed || placed.pageId !== page.id) continue;
      next = placed.layout;
    }
    const projected = next.commonOrderVersion === 1 ? projectCommonOrder(next, ctx) : next;
    const destination = projected.pages.find(item => item.id === page.id);
    const actual = destination && pagePlacements(destination, pageClass(projected, destination, ctx))[seed.id];
    if (actual) return { logicalPageId: logicalPage(projected, page.id), viewPageId: page.id, rect: actual, layout: next };
  }
  return null;
}

/** Re-run against the store's latest document, then add every field in the same commit. */
export function applyWidgetAddition(current: WidgetState, ctx: LayoutContext, seed: PageSeed, originKey: string, expected: PendingPlacement): WidgetState {
  if (!current.layout) throw new Error('Profilo non disponibile.');
  const plan = planWidgetAddition(current.layout, ctx, seed, originKey);
  if (!plan || plan.viewPageId !== expected.viewPageId || JSON.stringify(plan.rect) !== JSON.stringify(expected.rect))
    throw new Error('La posizione è cambiata. Riprova.');
  const existingKey = legacySettingsKey(plan.logicalPageId, seed.id);
  if (plan.layout === current.layout && current.cardSettings[existingKey]?.categoryWidgetType === seed.settings.categoryWidgetType) return current;
  const next: WidgetState = { ...current, layout: plan.layout,
    pagesConfig: layoutToPagesConfig(plan.layout, current.pagesConfig ?? { header: [], pages: [] }, ctx.deviceClass, ctx.grids, ctx.viewportWidth),
    cardSettings: { ...current.cardSettings, [legacySettingsKey(plan.logicalPageId, seed.id)]: seed.settings } };
  const adopted = adoptDeviceConfig(next, plan.logicalPageId, seed.id, Date.now());
  return adopted ? { ...next, cardSettings: adopted.cardSettings, customNames: adopted.customNames, customIcons: adopted.customIcons, memory: adopted.memory } : next;
}
