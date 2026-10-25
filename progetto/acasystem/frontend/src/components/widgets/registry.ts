import type { CardSettings } from '@/@types/dashboard';
import type { PageKind, PageKindDefinition, WidgetDefinition } from '@/@types/launcher';
import { casa3dPages } from './casa3d';
import { controlsPages, controlsWidgets } from './controls';
import { homePages, homeWidgets } from './home';
import { coverWidgets } from './home/cover';
import { mediaPages, mediaWidgets } from './media';
import { utilityPages, utilityWidgets } from './utilities';
import { ADAPTIVE_WIDGET_TYPES } from './adaptive/widgetTypes';

const adaptiveDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();

/**
 * Every widget definition, in matching order. The controls group goes last because it holds
 * the generic sensor fallback (settings.type sensor/entity/toggle), like the legacy registry.
 */
export const widgetDefinitions: readonly WidgetDefinition[] = [
  ...coverWidgets,
  ...homeWidgets,
  ...mediaWidgets,
  ...utilityWidgets,
  ...controlsWidgets,
];

export const pageKindDefinitions: readonly PageKindDefinition[] = [
  ...controlsPages,
  ...homePages,
  ...mediaPages,
  ...utilityPages,
  ...casa3dPages,
];

export function findWidgetDefinition(
  id: string,
  settings: CardSettings = {}
): WidgetDefinition | undefined {
  const definition = widgetDefinitions.find((definition) => definition.matches(id, settings));
  if (!definition || !ADAPTIVE_WIDGET_TYPES.has(String(settings.categoryWidgetType)))
    return definition;
  let adaptive = adaptiveDefinitions.get(definition);
  if (!adaptive) {
    adaptive = {
      ...definition,
      sizes: {
        min: definition.sizes.min,
        max: { w: Math.max(4, definition.sizes.max.w), h: Math.max(4, definition.sizes.max.h) },
        default: { w: 2, h: 2 },
      },
    };
    adaptiveDefinitions.set(definition, adaptive);
  }
  return adaptive;
}

export function findPageKindDefinition(kind: PageKind): PageKindDefinition | undefined {
  return pageKindDefinitions.find((definition) => definition.kind === kind);
}
