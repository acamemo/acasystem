import type { CardSettings } from '@/@types/dashboard';
import type { PageKind, PageKindDefinition, WidgetDefinition } from '@/@types/launcher';
import { controlsPages, controlsWidgets } from './controls';
import { homePages, homeWidgets } from './home';
import { mediaPages, mediaWidgets } from './media';
import { utilityPages, utilityWidgets } from './utilities';

/**
 * Every widget definition, in matching order. The controls group goes last because it holds
 * the generic sensor fallback (settings.type sensor/entity/toggle), like the legacy registry.
 */
export const widgetDefinitions: readonly WidgetDefinition[] = [
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
];

export function findWidgetDefinition(
  id: string,
  settings: CardSettings = {}
): WidgetDefinition | undefined {
  return widgetDefinitions.find((definition) => definition.matches(id, settings));
}

export function findPageKindDefinition(kind: PageKind): PageKindDefinition | undefined {
  return pageKindDefinitions.find((definition) => definition.kind === kind);
}
