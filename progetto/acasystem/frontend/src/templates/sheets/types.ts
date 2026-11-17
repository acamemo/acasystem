/**
 * Props of the system sheets used by the launcher (contract of wave 2, REP-20261006-001).
 * The launcher (B1) renders the sheets; index.tsx re-exports these interfaces unchanged.
 */
import type { ReactNode, RefObject } from 'react';
import type { BottomDrawerInteraction } from '@/components/primitives';
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
  /** A catalog tap starts local placement; device selections and legacy entry points stay separate. */
  onPlaceType?: (type: string) => void;
  /** Widget type to open on (a tile of the tray): the sheet starts from its details. */
  initialType?: string;
  /**
   * With `initialType`, types that need no choice (to-do list, car, spacer) are added at once,
   * without showing the sheet. With `initialSelection` the widget of the device is added at once
   * too (the automatic widget of «Dispositivi trovati»): the sheet stays hidden while the
   * selection is set and shows itself only if the selection is not enough to add.
   */
  autoAdd?: boolean;
  /**
   * With a device chosen (a row of «Rileva dispositivi»): the sheet opens on the details of the
   * type with the device selected. It takes the place of `initialType`.
   */
  initialSelection?: AddWidgetSelection;
  /** The loaded drawer reports its actual DOM presence for the shared Home fade. */
  onOpenChange?: (open: boolean) => void;
  interactionRef?: RefObject<BottomDrawerInteraction | null>;
  onRequestOpen?: () => boolean;
  onProgress?: (progress: number | null, immediate: boolean) => void;
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
