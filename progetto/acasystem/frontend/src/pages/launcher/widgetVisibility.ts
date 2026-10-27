/**
 * Whether a widget is hidden in use because of its entity or its visibility condition.
 * The stack rule lives here (ISSUE-116): a stack id is not an entity, so a stack is judged by
 * its members with the same rules as plain widgets.
 */
import type { CardSettingsMap } from '@/@types/dashboard';
import type { EntityLikeMap } from '@/@types/ha';
import type { WidgetStack } from '@/@types/launcher';
import { categoryDeviceId, isCategoryWidgetReady } from '@/templates/sheets/categoryPages';
import { isCardHiddenByLogic } from '@/utils/cardUtils';
import { isStackId } from '@/utils/launcher/layout';

export interface WidgetVisibilityContext {
  cardSettings: CardSettingsMap;
  entities: EntityLikeMap;
  entitiesLoaded: boolean;
  stacks?: Record<string, WidgetStack>;
}

/** The rules of a plain widget (never a stack id). */
function isPlainWidgetHidden(
  pageId: string,
  widgetId: string,
  { cardSettings, entities }: WidgetVisibilityContext
): boolean {
  const settingsKey = `${pageId}::${widgetId}`;
  const settings = cardSettings[settingsKey] ?? cardSettings[widgetId] ?? {};
  // Empty presets stay visible to be configured; bound presets use the actual HA id.
  if (settings.categoryWidgetType && !isCategoryWidgetReady(settings)) return false;
  const visibilityId = settings.categoryWidgetType
    ? categoryDeviceId(widgetId, settings)
    : widgetId;
  return isCardHiddenByLogic(visibilityId, {
    activePage: pageId,
    getCardSettingsKey: () => (cardSettings[settingsKey] ? settingsKey : widgetId),
    cardSettings,
    entities,
  });
}

/**
 * A stack is hidden only when every one of its widgets is, by the rules of plain widgets; one
 * that shows keeps the stack (and its cells) on screen. A stack id never reaches
 * `isCardHiddenByLogic`, which would read it as an entity and hide any stack in use. A stack
 * with no widgets, or one unknown to the layout, shows nothing and stays hidden.
 */
export function isWidgetHiddenByLogic(
  pageId: string,
  widgetId: string,
  context: WidgetVisibilityContext
): boolean {
  if (!context.entitiesLoaded) return false;
  if (!isStackId(widgetId)) return isPlainWidgetHidden(pageId, widgetId, context);
  const members = context.stacks?.[widgetId]?.ids ?? [];
  if (members.length === 0) return true;
  // Stacks do not nest; a stack id among the members counts as nothing to show.
  return members.every((id) => isStackId(id) || isPlainWidgetHidden(pageId, id, context));
}
