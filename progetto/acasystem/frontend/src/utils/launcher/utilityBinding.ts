import type { CardSettings } from '@/@types/dashboard';
import {
  adoptDeviceConfig,
  isBindingSetting,
  isStructuralSetting,
  propagateDeviceScoped,
  sanitizeWidgetMemory,
  touchWidget,
  widgetTypeOf,
  type WidgetState,
} from './deviceMemory';

/** An agenda or room association and its existing memory/adoption effects are one change. */
export function applyUtilityBinding(
  state: WidgetState,
  settingsKey: string,
  patch: Partial<CardSettings>,
  now: number
): WidgetState {
  const at = settingsKey.indexOf('::'),
    widgetId = at < 0 ? settingsKey : settingsKey.slice(at + 2);
  let cards = {
    ...state.cardSettings,
    [settingsKey]: { ...state.cardSettings[settingsKey], ...patch },
  };
  for (const [key, value] of Object.entries(patch))
    cards = propagateDeviceScoped(cards, settingsKey, key, value);
  const kind = widgetTypeOf(widgetId, cards[settingsKey] ?? {});
  let result = { ...state, cardSettings: cards, memory: sanitizeWidgetMemory(state.memory) };
  for (const [key, value] of Object.entries(patch)) {
    if (!isStructuralSetting(kind, key))
      result = { ...result, memory: touchWidget(result.memory, widgetId, now) };
    else if (isBindingSetting(kind, key) && value) {
      const adopted = adoptDeviceConfig(
        result,
        at < 0 ? null : settingsKey.slice(0, at),
        widgetId,
        now
      );
      if (adopted)
        result = {
          ...result,
          cardSettings: adopted.cardSettings,
          customNames: adopted.customNames,
          customIcons: adopted.customIcons,
          memory: adopted.memory,
        };
    }
  }
  return result;
}
