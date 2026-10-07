import { createContext, useContext } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { CellRect, WidgetDefinition } from '@/@types/launcher';
import type { LauncherController } from '@/hooks/launcher/useLauncherController';
import type { DragSession, DragStart, GridGeometry } from '@/hooks/launcher/useWidgetDrag';

/** Keyboard mode chosen from the widget menu: arrows move or resize until Invio/Esc. */
export interface KeyboardMode {
  pageId: string;
  widgetId: string;
  mode: 'move' | 'resize';
}

/** Launcher-internal state shared by the screen, the grids and the widget hosts. */
export interface LauncherUi {
  controller: LauncherController;
  /** Widget definition of a card (the registry; the preview adds its placeholders). */
  findDefinition: (widgetId: string, settings: CardSettings) => WidgetDefinition | undefined;
  announce: (text: string) => void;
  registerGrid: (pageId: string, measure: () => GridGeometry | null) => () => void;
  beginDrag: (start: DragStart) => void;
  /** True right after a drop (the release click must not open the menu). */
  justDropped: () => boolean;
  /** Widget that just refused a drop or a key: its frame shows the error LED briefly. */
  rejectedId: string | null;
  reject: (widgetId: string, message: string) => void;
  keyboardMode: KeyboardMode | null;
  setKeyboardMode: (mode: KeyboardMode | null) => void;
  requestFocus: (pageId: string, widgetId: string) => void;
  /** True once for the widget whose focus was requested (after a move to another page). */
  takeFocusRequest: (pageId: string, widgetId: string) => boolean;
  moveToAdjacentPage: (pageId: string, widgetId: string, direction: -1 | 1) => void;
  stepWidget: (
    pageId: string,
    widgetId: string,
    mode: 'move' | 'resize',
    dx: number,
    dy: number
  ) => void;
  removeWidget: (pageId: string, widgetId: string) => void;
  openWidgetSettings: (pageId: string, widgetId: string) => void;
  /** Opens the add sheet; `at` is the free cell touched, where the new widget goes. */
  openAddWidget: (pageId: string, at?: Pick<CellRect, 'x' | 'y'>) => void;
  widgetName: (pageId: string, widgetId: string) => string;
  isWidgetHidden: (pageId: string, widgetId: string) => boolean;
}

export const LauncherUiContext = createContext<LauncherUi | null>(null);
/** High-frequency pointer state is consumed by grids, never by each widget host. */
export const LauncherDragContext = createContext<DragSession | null>(null);

export function useLauncherUi(): LauncherUi {
  const ui = useContext(LauncherUiContext);
  if (!ui) throw new Error('useLauncherUi must be used inside LauncherScreen');
  return ui;
}
