/**
 * System sheets used by the launcher (wave 2): add a widget, widget settings. The launcher (B1)
 * renders them; the props are the contract of REP-20261006-001. The page settings sheet was
 * split into the page editor (REP-20261008-001).
 *
 * Mount them inside PageProvider (saved layout and card settings) and WidgetRuntimeProvider
 * (entities, connection, card settings).
 */
export type { AddWidgetSheetProps, WidgetSettingsSheetProps } from './types';
export { AddWidgetSheet } from './AddWidgetSheet';
export { WidgetSettingsSheet } from './WidgetSettingsSheet';
