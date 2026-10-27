/**
 * Props of the system sheets used by the launcher (contract of wave 2, REP-20261006-001).
 * The launcher (B1) renders the sheets; index.tsx re-exports these interfaces unchanged.
 */
import type { ReactNode } from 'react';
import type { AddWidgetSelection, CellSize } from '@/@types/launcher';

export type { AddWidgetSelection };

export interface AddWidgetSheetProps {
  open: boolean;
  onClose: () => void;
  /** Page that receives the new widget. */
  pageId: string;
  /**
   * Called after the card/settings are created: the launcher places the widget at the default
   * size of its definition (the size is then changed on the grid, REP-20261007-027).
   */
  onAdded: (widgetId: string, size?: CellSize) => void;
  /** Widget type to open on (a tile of the tray): the sheet starts from its details. */
  initialType?: string;
  /**
   * With `initialType`, types that need no choice (to-do list, car, spacer) are added at once,
   * without showing the sheet.
   */
  autoAdd?: boolean;
  /**
   * With a device chosen (a row of «Rileva dispositivi»): the sheet opens on the details of the
   * type with the device selected. It takes the place of `initialType`.
   */
  initialSelection?: AddWidgetSelection;
}

export interface WidgetSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  widgetId: string;
  settingsKey: string;
  pageId: string;
  /**
   * Size and page of the widget in edit mode (REP-20261008-001), shown before the other
   * sections; the preview of the system sheets passes none.
   */
  placement?: ReactNode;
}
