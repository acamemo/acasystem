import { createContext, useContext } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { CellRect, WidgetDefinition } from '@/@types/launcher';
import type { LauncherSelection } from '@/hooks/launcher/useLauncherSelection';
import type { WidgetController } from '@/hooks/launcher/useWidgetController';
import type { DragSession, DragStart, GridGeometry } from '@/hooks/launcher/useWidgetDrag';

/** Launcher-internal state shared by the screen, the grids and the widget hosts. */
export interface LauncherUi {
  controller: WidgetController;
  /** Widget definition of a card (the registry; the preview adds its placeholders). */
  findDefinition: (widgetId: string, settings: CardSettings) => WidgetDefinition | undefined;
  announce: (text: string) => void;
  registerGrid: (pageId: string, measure: () => GridGeometry | null) => () => void;
  beginDrag: (start: DragStart) => void;
  /** True right after a drop (the release click must not open the menu). */
  justDropped: () => boolean;
  /**
   * Which widget is selected, which one just landed and which one refused a move (ISSUE-109,
   * R5a). The store never changes identity, so a selection leaves this object as it was; the
   * grids and the widget hosts read it through `useSelectedIn`, `useLandedIn` and `useRejected`.
   */
  selection: LauncherSelection;
  /** The widget refuses a drop or a key: its frame shows the error LED briefly. */
  reject: (widgetId: string, message: string) => void;
  requestFocus: (pageId: string, widgetId: string) => void;
  /** True once for the widget whose focus was requested (after a move to another page). */
  takeFocusRequest: (pageId: string, widgetId: string) => boolean;
  /** Moves the widget to the nearest page of widgets that way; its new page id, or null. */
  moveToAdjacentPage: (pageId: string, widgetId: string, direction: -1 | 1) => string | null;
  /** True when a page of widgets lies that way from the page. */
  hasAdjacentPage: (pageId: string, direction: -1 | 1) => boolean;
  /** A step of the keyboard or of the settings; it returns what it announced. */
  stepWidget: (
    pageId: string,
    widgetId: string,
    mode: 'move' | 'resize',
    dx: number,
    dy: number
  ) => string;
  removeWidget: (pageId: string, widgetId: string) => void;
  openWidgetSettings: (pageId: string, widgetId: string) => void;
  /** Opens the add sheet; `at` is the free cell touched, where the new widget goes. */
  openAddWidget: (pageId: string, at?: Pick<CellRect, 'x' | 'y'>) => void;
  widgetName: (pageId: string, widgetId: string) => string;
  /**
   * Selects a widget in edit mode (REP-20261007-027): it shows its grip frame and the bar of the
   * widget; a second tap opens its settings.
   */
  select: (pageId: string, widgetId: string) => void;
  clearSelection: () => void;
  /**
   * A tap on a widget in edit mode (ADR-0016, G5): it selects a widget not selected; a second tap
   * on the selected one opens its settings, and one tap on a widget not yet linked opens
   * «Collega» at once.
   */
  tapWidget: (pageId: string, widgetId: string, wasSelected: boolean) => void;
  /** A free cell touched with a widget selected on its page: the widget moves there. */
  moveSelectedTo: (pageId: string, cell: Pick<CellRect, 'x' | 'y'>) => void;
  /** Moves the focus to «Rimuovi», the first control of the bar of the selected widget (Tab). */
  focusWidgetBar: () => void;
  /** Removes the widget at once, with «Annulla» afterwards (Canc). */
  requestRemove: (pageId: string, widgetId: string) => void;
  isWidgetHidden: (pageId: string, widgetId: string) => boolean;
}

export const LauncherUiContext = createContext<LauncherUi | null>(null);
/** High-frequency pointer state is consumed by grids, never by each widget host. */
export const LauncherDragContext = createContext<DragSession | null>(null);
/**
 * Id of the page whose turn is armed by the finger held on an edge during a drag (450 ms before
 * the page turns), else null. The grid of that neighbour takes the drag style from this moment, not
 * from the pick-up (tracing of 2026-10-25, REP-20261023-006, W1).
 */
export const LauncherEdgePageContext = createContext<string | null>(null);
/**
 * Widget held before it lifts (REP-20261008-001), read by the grids like the drag: a press
 * redraws only the widget pressed, not every widget of every page.
 */
export const LauncherPressContext = createContext<{ pageId: string; widgetId: string } | null>(
  null
);

export function useLauncherUi(): LauncherUi {
  const ui = useContext(LauncherUiContext);
  if (!ui) throw new Error('useLauncherUi must be used inside LauncherScreen');
  return ui;
}
