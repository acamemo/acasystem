import type { Configuration } from '../../../../contracts/collaboration';
import { configurationLayout } from '../../../../contracts/profileResources';
import type {
  BaseDeviceClass,
  CellRect,
  CellSize,
  DeviceClass,
  LauncherLayout,
  LauncherPage,
} from '@/@types/launcher';
import { isObject } from '@/validators/guards';
import { sanitizeLauncherLayout } from '@/validators/launcher';
import { sanitizePageSettingsMap } from '@/validators/dashboardConfig';
import {
  DEFAULT_GRIDS,
  classWithDensity,
  columnsKey,
  gridFor,
  placementKey,
} from '@/utils/launcher/deviceClass';
import {
  clampSize,
  isFree,
  shrinkCandidates,
  type PackItem,
  type Placements,
} from '@/utils/launcher/grid';
import {
  addPageToLayout,
  FALLBACK_WIDGET_SIZE,
  installCasa3dPage,
  pageClass,
  sizeAcrossKeys,
  type LayoutContext,
} from '@/utils/launcher/layout';
import { HOME_PAGE_LABEL, legacyPageKind } from '@/utils/launcher/pageIdentity';
import {
  CATEGORY_PAGES,
  categoryPageGeometry,
  categoryPageSeeds,
} from '@/utils/launcher/categoryModels';
import { legacySettingsKey } from '@/utils/launcher/migration';

const BASES: readonly BaseDeviceClass[] = ['tablet', 'tabletPortrait', 'phoneLandscape', 'phone'];
const stable = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function normalizeProfileConfiguration(
  value: Configuration,
  appearance?: Record<string, unknown>
): Configuration {
  const snapshot = isObject(value.snapshot) ? value.snapshot : value;
  const modern =
    isObject(value.snapshot) && isObject(value.appearance) ? value.appearance : appearance;
  return {
    snapshot: {
      version: 1,
      layout: {
        pagesConfig: { header: [], pages: ['home'], home: [] },
        cardSettings: {},
        customNames: {},
        customIcons: {},
        pageSettings: {},
        gridColumns: 4,
        dynamicGridColumns: true,
        gridGapH: 20,
        gridGapV: 20,
        cardBorderRadius: 16,
        cardsOnlyMode: false,
        headerSettings: { showTitle: true, showClock: true, showDate: true },
        headerTitle: '',
        headerScale: 1,
        sectionSpacing: { headerToStatus: 16, statusToNav: 24, navToGrid: 24 },
        statusPillsConfig: [],
        widgetMemory: { version: 1, entries: {}, touched: {} },
        ...copy(isObject(snapshot.layout) ? snapshot.layout : {}),
      },
      appearance: {},
    },
    appearance: copy(modern ?? { theme: 'light', accent: 'violet', wallpaper: 'none' }),
  };
}

/** Solo una casa nuova riceve i contenuti iniziali; una fonte importata non viene completata. */
export function newProfileConfiguration(
  value: Configuration,
  source: BaseDeviceClass
): Configuration {
  const result = normalizeProfileConfiguration({
    snapshot: { layout: {} },
    ...(isObject(value.appearance) ? { appearance: value.appearance } : {}),
  });
  const data = configurationLayout(result);
  let layout: LauncherLayout = {
    version: 1,
    cover: { enabled: true },
    pages: [{ id: 'home', label: HOME_PAGE_LABEL, kind: 'widgets', placements: {} }],
  };
  const cards: Record<string, unknown> = {};
  for (const category of CATEGORY_PAGES) {
    const added = addPageToLayout(layout, { label: category.label, kind: 'widgets' });
    layout = {
      ...added.layout,
      pages: added.layout.pages.map((page) =>
        page.id === added.pageId
          ? { ...page, ...categoryPageGeometry(category.id, added.pageId, DEFAULT_GRIDS) }
          : page
      ),
    };
    categoryPageSeeds(category.id, added.pageId).forEach((seed) => {
      cards[legacySettingsKey(added.pageId, seed.id)] = seed.settings;
    });
  }
  data.cardSettings = cards;
  data.launcherLayout = installCasa3dPage({ ...layout, categoryDefaultsVersion: 1 });
  return migrateCommonOrder(result, source);
}

function configuredKey(
  layout: LauncherLayout,
  page: LauncherPage,
  base: BaseDeviceClass
): DeviceClass {
  const root = layout.pages.find((item) => item.id === page.continuationOf) ?? page;
  if (root.columns !== undefined) return columnsKey(base, root.columns, DEFAULT_GRIDS);
  if (!layout.density && root.categoryGrids?.[base])
    return placementKey(base, root.categoryGrids[base]!, DEFAULT_GRIDS);
  return classWithDensity(base, layout.density);
}

function sourceKeys(
  layout: LauncherLayout,
  page: LauncherPage,
  source: BaseDeviceClass
): DeviceClass[] {
  const stored = Object.keys(page.placements) as DeviceClass[];
  const bases = [source, ...BASES.filter((base) => base !== source)];
  return [
    ...new Set([
      ...bases.map((base) => configuredKey(layout, page, base)),
      ...bases.flatMap((base) => [base, `${base}@compact`, `${base}@wide`] as DeviceClass[]),
      ...stored.sort(stable),
    ]),
  ].filter((key) => page.placements[key] !== undefined);
}

function byReading(placements: Placements): string[] {
  return Object.keys(placements).sort((a, b) => {
    const one = placements[a]!,
      two = placements[b]!;
    return one.y - two.y || one.x - two.x || stable(a, b);
  });
}

/** Una sola scelta della fonte; originali e geometrie precedenti rimangono nel backup server. */
export function migrateCommonOrder(
  configuration: Configuration,
  source: BaseDeviceClass
): Configuration {
  const result = copy(configuration);
  const data = configurationLayout(result);
  let layout = sanitizeLauncherLayout(data.launcherLayout);
  if (layout?.commonOrderVersion === 1) return result;
  if (!layout) {
    const legacy = isObject(data.pagesConfig) ? data.pagesConfig : {};
    const settings = sanitizePageSettingsMap(data.pageSettings) ?? {};
    const ids = Array.isArray(legacy.pages)
      ? legacy.pages.filter(
          (id): id is string => typeof id === 'string' && id !== 'header' && id !== 'settings'
        )
      : ['home'];
    const pages: LauncherPage[] = [...new Set(ids)].map((id) => {
      const meta = isObject(settings[id]) ? settings[id] : {};
      const kind = legacyPageKind(id, settings);
      const values = Array.isArray(legacy[id])
        ? legacy[id].filter((item): item is string => typeof item === 'string' && Boolean(item))
        : [];
      return {
        id,
        label: typeof meta.label === 'string' ? meta.label : id === 'home' ? HOME_PAGE_LABEL : id,
        kind,
        placements: {},
        order: [...new Set(values)],
        ...(meta.hidden === true ? { hidden: true } : {}),
      };
    });
    layout = {
      version: 1,
      cover: { enabled: true },
      pages: pages.length
        ? pages
        : [{ id: 'home', label: HOME_PAGE_LABEL, kind: 'widgets', placements: {}, order: [] }],
    };
  }
  const original = layout;
  const primary = new Map<string, { key?: DeviceClass; ids: string[] }>();
  const primaryMembership = new Set<string>();
  for (const page of layout.pages) {
    const key = sourceKeys(layout, page, source)[0];
    const ids = page.order ?? (key ? byReading(page.placements[key] ?? {}) : []);
    primary.set(page.id, { key, ids });
    ids.forEach((id) => {
      primaryMembership.add(id);
      layout?.stacks?.[id]?.ids.forEach((member) => primaryMembership.add(member));
    });
  }
  const recovered = new Set<string>();
  layout = {
    ...layout,
    commonOrderVersion: 1,
    pages: layout.pages.map((page) => {
      const selected = primary.get(page.id)!;
      const order = [...selected.ids];
      const hints: Record<string, CellSize> = { ...page.sizeHints };
      for (const key of sourceKeys(original, page, source)) {
        for (const id of byReading(page.placements[key] ?? {})) {
          if (!order.includes(id) && !primaryMembership.has(id) && !recovered.has(id)) {
            order.push(id);
            recovered.add(id);
          }
          if (order.includes(id) && !hints[id]) {
            const rect = page.placements[key]![id]!;
            hints[id] = clampSize(
              sizeAcrossKeys(rect, DEFAULT_GRIDS, key, 'tablet'),
              DEFAULT_GRIDS.tablet
            );
          }
        }
      }
      return { ...page, order, sizeHints: hints, placements: {} };
    }),
  };
  data.launcherLayout = layout;
  const legacy = isObject(data.pagesConfig) ? data.pagesConfig : {};
  data.pagesConfig = {
    ...legacy,
    pages: layout.pages.map((page) => page.id),
    ...Object.fromEntries(layout.pages.map((page) => [page.id, page.order ?? []])),
  };
  return result;
}

/** Packing monotono: il primo elemento che non entra porta con sé tutti i successivi. */
export function orderedSegments(
  items: readonly (PackItem & { position?: { x: number; y: number } })[],
  grid: CellSize
): Placements[] {
  const segments: Placements[] = [];
  let placements: Placements = {},
    cursor = 0;
  const find = (item: PackItem & { position?: { x: number; y: number } }): CellRect | null => {
    const size = clampSize(item.size, grid);
    const minimum = clampSize(item.min ?? size, grid);
    for (const candidate of shrinkCandidates(size, minimum)) {
      const preferred = item.position ?
        Math.round(item.position.y * (grid.h - candidate.h)) * grid.w
          + Math.round(item.position.x * (grid.w - candidate.w)) : 0;
      for (let y = 0; y + candidate.h <= grid.h; y++) {
        for (let x = 0; x + candidate.w <= grid.w; x++) {
          if (y * grid.w + x < Math.max(cursor, preferred)) continue;
          const rect = { x, y, ...candidate };
          if (isFree(placements, rect)) return rect;
        }
      }
    }
    return null;
  };
  for (const item of items) {
    let rect = find(item);
    if (!rect) {
      segments.push(placements);
      placements = {};
      cursor = 0;
      rect = find(item);
    }
    // Grid-limited dimensions always fit an empty segment, including unresolved widgets.
    if (!rect) rect = { x: 0, y: 0, w: 1, h: 1 };
    placements[item.id] = rect;
    cursor = rect.y * grid.w + rect.x + 1;
  }
  if (Object.keys(placements).length || segments.length === 0) segments.push(placements);
  return segments;
}

export function projectCommonOrder(layout: LauncherLayout, ctx: LayoutContext): LauncherLayout {
  if (layout.commonOrderVersion !== 1) return layout;
  const pages: LauncherPage[] = [];
  const used = new Set(layout.pages.map((page) => page.id));
  for (const page of layout.pages) {
    if (page.kind !== 'widgets' && page.kind !== 'cover') {
      pages.push(page);
      continue;
    }
    const key = pageClass(layout, page, ctx);
    const grid = gridFor(ctx.grids, key);
    const items = (page.order ?? []).map((id) => {
      const sizes = ctx.sizesOf?.(id, page.id);
      const hinted = page.sizeHints?.[id];
      const size = hinted
        ? sizeAcrossKeys(hinted, ctx.grids, 'tablet', key)
        : (sizes?.default ?? FALLBACK_WIDGET_SIZE);
      return {
        id,
        size: clampSize(size, grid, sizes),
        min: sizes ? clampSize(sizes.min, grid, sizes) : clampSize(FALLBACK_WIDGET_SIZE, grid),
        ...(page.positionHints?.[id] ? { position: page.positionHints[id] } : {}),
      };
    });
    const segments = orderedSegments(items, grid);
    segments.forEach((placements, index) => {
      let id = page.id;
      if (index) {
        id = `${page.id}--aca-segment-${index}`;
        while (used.has(id)) id += '-';
        used.add(id);
      }
      pages.push({
        ...page,
        id,
        logicalPageId: page.id,
        segmentIndex: index,
        ...(index ? { continuationOf: page.id, label: `${page.label} · ${index + 1}` } : {}),
        placements: { [key]: placements },
      });
    });
  }
  return { ...layout, pages };
}

export const logicalPage = (layout: LauncherLayout, id: string): string =>
  layout.pages.find((page) => page.id === id)?.logicalPageId ?? id;

/** I rettangoli derivati non rientrano mai nel documento autorevole. */
export function canonicalFromProjection(
  base: LauncherLayout,
  projected: LauncherLayout,
  ctx: LayoutContext
): LauncherLayout {
  const groups = new Map<string, LauncherPage[]>();
  for (const page of projected.pages) {
    const id = page.logicalPageId ?? page.id;
    groups.set(id, [...(groups.get(id) ?? []), page]);
  }
  const pages = [...groups].map(([id, group]) => {
    const old = base.pages.find((page) => page.id === id);
    const first = group.find((page) => !page.segmentIndex) ?? group[0]!;
    const { logicalPageId: _logical, segmentIndex: _segment, ...fields } = first;
    const order = group.flatMap((page) =>
      Object.keys(page.placements).length
        ? byReading(page.placements[pageClass(projected, page, ctx)] ?? {})
        : (page.order ?? [])
    );
    const hints = { ...old?.sizeHints };
    for (const page of group) {
      const key = pageClass(projected, page, ctx);
      for (const [widgetId, rect] of Object.entries(page.placements[key] ?? {})) {
        if (!hints[widgetId] && !old?.order?.includes(widgetId))
          hints[widgetId] = clampSize(
            sizeAcrossKeys(rect, ctx.grids, key, 'tablet'),
            ctx.grids.tablet
          );
      }
    }
    return { ...fields, id, order: [...new Set(order)], sizeHints: hints, placements: {} };
  });
  return { ...projected, commonOrderVersion: 1, pages };
}

/** Drag aggiorna ordine e posizione relativa; la geometria resta una proiezione locale. */
export function moveInCommonOrder(
  base: LauncherLayout,
  view: LauncherLayout,
  ctx: LayoutContext,
  pageId: string,
  widgetId: string,
  at?: Pick<CellRect, 'x' | 'y'>,
  size?: CellSize,
  fromPageId = pageId
): LauncherLayout {
  const logical = logicalPage(view, pageId);
  const from = logicalPage(view, fromPageId);
  const shown = view.pages.find((page) => page.id === pageId);
  const target = base.pages.find((page) => page.id === logical);
  if (!shown || !target) return base;
  const key = pageClass(view, shown, ctx);
  const grid = gridFor(ctx.grids, key);
  const rect = shown.placements[key]?.[widgetId];
  const sizes = ctx.sizesOf?.(widgetId, logical);
  const currentSize = clampSize(size ?? rect ?? sizes?.default ?? FALLBACK_WIDGET_SIZE, grid, sizes);
  const visible = byReading(shown.placements[pageClass(view, shown, ctx)] ?? {}).filter(
    (id) => id !== widgetId
  );
  const ahead = at
    ? visible.find((id) => {
        const rect = shown.placements[pageClass(view, shown, ctx)]?.[id];
        return rect && (rect.y > at.y || (rect.y === at.y && rect.x >= at.x));
      })
    : undefined;
  const next = {
    ...base,
    pages: base.pages.map((page) => {
      if (page.id !== logical && page.id !== from) return page;
      const order = (page.order ?? []).filter((id) => id !== widgetId);
      const positions = { ...page.positionHints };
      delete positions[widgetId];
      if (page.id !== logical) return { ...page, order, positionHints: positions };
      const index = ahead ? order.indexOf(ahead) : -1;
      const endOfSegment = visible.length
        ? order.indexOf(visible[visible.length - 1]!) + 1
        : order.length;
      order.splice(index >= 0 ? index : at ? Math.max(0, endOfSegment) : order.length, 0, widgetId);
      const hints = { ...page.sizeHints };
      if (size && !hints[widgetId])
        hints[widgetId] = sizeAcrossKeys(size, ctx.grids, pageClass(view, shown, ctx), 'tablet');
      if (at) positions[widgetId] = {
        x: grid.w > currentSize.w ? Math.max(0, Math.min(1, at.x / (grid.w - currentSize.w))) : 0,
        y: grid.h > currentSize.h ? Math.max(0, Math.min(1, at.y / (grid.h - currentSize.h))) : 0,
      };
      return { ...page, order, sizeHints: hints, positionHints: positions };
    }),
  };
  return next;
}
