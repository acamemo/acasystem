import type { CardSettings } from '@/@types/dashboard';
import { ADD_WIDGET_TYPES, WIDGET_CATEGORIES } from './catalog';
import { findWidgetDefinition } from '@/components/widgets/registry';
import type { CellSize } from '@/@types/launcher';
import { BINDING_KEYS, categoryEntityId } from '@/utils/launcher/bindingKeys';

export { BINDING_KEYS, categoryEntityId };

export const CATEGORY_PAGES = WIDGET_CATEGORIES;
export interface PageSeed {
  id: string;
  settings: CardSettings;
  size: CellSize;
}

/** Stable native ids: association changes the device, never the saved placement. */
export function categoryPageSeeds(categoryId: string, pageId: string): PageSeed[] {
  const category = CATEGORY_PAGES.find((item) => item.id === categoryId);
  if (!category) return [];
  return ADD_WIDGET_TYPES.filter((item) =>
    (category.types as readonly string[]).includes(item.type)
  ).map((item) => ({
    id: item.sample.id.replace('esempio', `preset_${pageId}`),
    settings: {
      categoryWidgetType: item.type,
      ...(item.type === 'sensor' ? { type: 'sensor' } : {}),
      ...(item.type === 'spacer' ? { variant: 'divider' } : {}),
    },
    size: findWidgetDefinition(item.sample.id, {
      ...item.sample.settings,
      categoryWidgetType: item.type,
    })?.sizes.default ?? { w: 2, h: 2 },
  }));
}

export function isCategoryWidgetReady(settings: CardSettings): boolean {
  const type = String(settings.categoryWidgetType ?? '');
  if (!type || ['spacer', 'cover_clock', 'cover_calendar', 'cover_weather'].includes(type))
    return true;
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
