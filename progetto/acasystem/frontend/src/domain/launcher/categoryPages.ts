import { configuredCarSources } from '@/domain/car/carSources';
import type { CardSettings } from '@/@types/dashboard';
import { ADD_WIDGET_TYPES, WIDGET_CATEGORIES } from './catalog';
import type { CellSize, WidgetSizes } from '@/@types/launcher';
import { BINDING_KEYS, categoryEntityId } from '@/utils/launcher/bindingKeys';

export { BINDING_KEYS, categoryEntityId };

export const CATEGORY_PAGES = WIDGET_CATEGORIES;
export interface PageSeed {
  id: string;
  settings: CardSettings;
  size: CellSize;
}

/** Stable native ids: association changes the device, never the saved placement. */
export type WidgetSizeResolver = (id: string, settings: CardSettings) => WidgetSizes | undefined;

/** A local, unbound widget: the caller owns the once-per-selection unique suffix. */
export function createCategoryWidgetSeed(
  type: string,
  uniqueId: string,
  resolveSizes: WidgetSizeResolver
): PageSeed | null {
  const item = ADD_WIDGET_TYPES.find((candidate) => candidate.type === type);
  if (!item) return null;
  return {
    id: item.sample.id.replace('esempio', uniqueId),
    settings: {
      categoryWidgetType: item.type,
      ...(item.type === 'sensor' ? { type: 'sensor' } : {}),
      ...(item.type === 'spacer' ? { variant: 'divider' } : {}),
    },
    size: resolveSizes(item.sample.id, {
      ...item.sample.settings,
      categoryWidgetType: item.type,
    })?.default ?? { w: 2, h: 2 },
  };
}

export function categoryPageSeeds(
  categoryId: string,
  pageId: string,
  resolveSizes: WidgetSizeResolver
): PageSeed[] {
  const category = CATEGORY_PAGES.find((item) => item.id === categoryId);
  if (!category) return [];
  return ADD_WIDGET_TYPES.filter((item) =>
    (category.types as readonly string[]).includes(item.type)
  ).flatMap((item) => {
    const seed = createCategoryWidgetSeed(item.type, `preset_${pageId}`, resolveSizes);
    return seed ? [seed] : [];
  });
}

export function isCategoryWidgetReady(settings: CardSettings): boolean {
  const type = String(settings.categoryWidgetType ?? '');
  // These types are linked to no device: they are ready as soon as they are on the page.
  const unlinked = ['tavano', 'spacer', 'rileva', 'zigbee', 'cover_clock', 'cover_calendar', 'cover_weather'];
  if (!type || unlinked.includes(type)) return true;
  if (type === 'car') {
    const sources = configuredCarSources(settings);
    return Object.keys(sources.ids).length > 0 || sources.chargeControlIds.length > 0;
  }
  if (type === 'cost') return ['powerId', 'consumptionId', 'todayId', 'monthId']
    .some(key => typeof settings[key] === 'string' && Boolean(settings[key]));
  const key = BINDING_KEYS[type];
  const value = settings[key];
  return Array.isArray(value)
    ? value.some((id) => typeof id === 'string' && Boolean(id))
    : typeof value === 'string' && Boolean(value);
}

/** A widget of a category that has no device yet (in use a tap says so; in edit mode it links). */
export function isCategoryWidgetUnbound(settings: CardSettings): boolean {
  return Boolean(settings.categoryWidgetType) && !isCategoryWidgetReady(settings);
}

export function categoryDeviceId(id: string, settings: CardSettings): string {
  const type = String(settings.categoryWidgetType ?? '');
  const bound = categoryEntityId(type, settings);
  return bound ?? id;
}
