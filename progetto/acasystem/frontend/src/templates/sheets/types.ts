/**
 * Props of the system sheets used by the launcher (contract of wave 2, REP-20261006-001).
 * The launcher (B1) renders the sheets; index.tsx re-exports these interfaces unchanged.
 */
import type { CellSize } from '@/@types/launcher';

export interface AddWidgetSheetProps {
  open: boolean;
  onClose: () => void;
  /** Page that receives the new widget. */
  pageId: string;
  /** Called after the card/settings are created: the launcher places the widget. */
  onAdded: (widgetId: string, size?: CellSize) => void;
}

export interface WidgetSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  widgetId: string;
  settingsKey: string;
  pageId: string;
}

export interface PageSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  /** null creates a new page. */
  pageId: string | null;
}
