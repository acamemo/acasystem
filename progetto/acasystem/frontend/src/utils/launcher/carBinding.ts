import type { CardSettings } from '@/@types/dashboard';
import {
  adoptDeviceConfig,
  isBindingSetting,
  isStructuralSetting,
  propagateDeviceScoped,
  sanitizeWidgetMemory,
  touchWidget,
  type WidgetState,
} from './deviceMemory';

/** The historical car identity, propagation and memory rules, applied as one logical change. */
export function applyCarBinding(
  state: WidgetState,
  settingsKey: string,
  patch: Partial<CardSettings>,
  now: number
): WidgetState {
  const at = settingsKey.indexOf('::');
  const widgetId = at < 0 ? settingsKey : settingsKey.slice(at + 2);
  let cardSettings = {
    ...state.cardSettings,
    [settingsKey]: { ...state.cardSettings[settingsKey], ...patch },
  };
  for (const [setting, value] of Object.entries(patch))
    cardSettings = propagateDeviceScoped(cardSettings, settingsKey, setting, value);
  let result = { ...state, cardSettings, memory: sanitizeWidgetMemory(state.memory) };
  for (const [setting, value] of Object.entries(patch)) {
    if (!isStructuralSetting('car', setting)) {
      result = { ...result, memory: touchWidget(result.memory, widgetId, now) };
    } else if (isBindingSetting('car', setting) && value) {
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
