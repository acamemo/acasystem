/**
 * System sheets used by the launcher (wave 2): add a widget, widget settings, page settings.
 * The launcher (B1) renders them; the props are the contract of REP-20261006-001.
 *
 * Mount them inside PageProvider (saved layout and card settings), WidgetRuntimeProvider
 * (entities, connection, card settings) and, for PageSettingsSheet, LauncherProvider.
 */
export type {
  AddWidgetSheetProps,
  PageSettingsSheetProps,
  WidgetSettingsSheetProps,
} from './types';
export { AddWidgetSheet } from './AddWidgetSheet';
export { WidgetSettingsSheet } from './WidgetSettingsSheet';
export { PageSettingsSheet } from './PageSettingsSheet';
