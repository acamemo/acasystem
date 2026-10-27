import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { Icon, type ConsoleOrigin } from '@/components/primitives';
import { EditHint } from '@/components/system/edit/EditHint';
import { PageCardControls, type CardColumns } from '@/components/system/edit/PageCardControls';
import { PageOverviewBar } from '@/components/system/edit/PageOverviewBar';
import { UndoSnackbar } from '@/components/system/edit/UndoSnackbar';
import { WidgetActionBar } from '@/components/system/edit/WidgetActionBar';
import { ScreenCommands } from '@/components/system/launcher/ScreenCommands';
import { pageValueText } from '@/components/system/page-indicator/PageIndicator';
import { SystemGear } from '@/components/system/status-bar/SystemGear';
import type { ConnectionState } from '@/components/system/status-bar/ConnectionStatus';
import { findWidgetDefinition } from '@/components/widgets/registry';
import type { AddWidgetSelection, CellRect, LauncherLayout, WidgetRuntime } from '@/@types/launcher';
import { usePages } from '@/hooks/context';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { AddWidgetRequestProvider } from '@/hooks/launcher/AddWidgetRequestContext';
import { DiscoveredFlowProvider } from '@/hooks/launcher/DiscoveredFlowContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import type { LauncherController } from '@/hooks/launcher/useLauncherController';
import { useWidgetController } from '@/hooks/launcher/useWidgetController';
import { useEditHint } from '@/hooks/launcher/useEditHint';
import { holdTouchOnPage } from '@/hooks/launcher/gestures';
import { createLauncherSelection, type WidgetRef } from '@/hooks/launcher/useLauncherSelection';
import { useLongPress, type LongPressInfo } from '@/hooks/launcher/useLongPress';
import { usePageDrag } from '@/hooks/launcher/usePageDrag';
import { PageLockContext } from '@/hooks/launcher/PageLockContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { isStaged, useStagedScene } from '@/hooks/launcher/useStagedScene';
import { useReducedMotion } from '@/hooks/launcher/useViewport';
import { useWidgetDrag, type DragSession, type GridGeometry } from '@/hooks/launcher/useWidgetDrag';
import {
  COLUMNS_RANGE,
  baseClassOf,
  columnsOn,
  columnsToStore,
} from '@/utils/launcher/deviceClass';
import { afterNextFrame } from '@/utils/launcher/afterFrame';
import { TWO_FRAMES_MS, canAnimate } from '@/utils/launcher/motion';
import { movePageOrder, pagePlacements } from '@/utils/launcher/layout';
import { basePageId, type PagerEntry } from '@/utils/launcher/pager';
import { describePages, type PageDescriptor } from '@/utils/launcher/pageDescriptor';
import {
  boxOfCells,
  cellsForBox,
  clampSize,
  idsByPosition,
  resizedIds,
  tryMoveWithReflow,
} from '@/utils/launcher/grid';
import { describeRect, widgetDisplayName } from '@/utils/launcher/names';
import { PAGE_KIND_LABEL, displayLabel } from '@/utils/launcher/pageIdentity';
import type { StatusChip } from '@/utils/launcher/statusChips';
import { AppShell } from '../app-shell/AppShell';
import { DiscoveredAddFlow } from '../devices/DiscoveredAddFlow';
import { AddWidgetSheet, WidgetSettingsSheet } from '../sheets';
import { CategoryPageSheet } from '../sheets/CategoryPageSheet';
import { isCategoryWidgetUnbound } from '../sheets/categoryPages';
import { WIDGET_CATEGORIES } from '../sheets/catalog';
import { DetailsSheet, type DefinitionResolver, type DetailsTarget } from './DetailsSheet';
import { WidgetConsole } from './WidgetConsole';
import { FlashingPageIndicator } from './FlashingPageIndicator';
import { HeldByStage } from './HeldByStage';
import { DragGhost } from './DragGhost';
import {
  LauncherDragContext,
  LauncherEdgePageContext,
  LauncherPressContext,
  LauncherUiContext,
  type LauncherUi,
} from './LauncherUiContext';
import { PageShell } from './PageShell';
import { StackSheet } from './StackSheet';
import { CARD_EXIT_MS, Pager, overviewPitchOf, type PagerPage } from './Pager';
import { EDIT_HELP_ID } from './WidgetHost';
import { CELL_HELP_ID, cellSelector } from './WidgetGrid';
import { WidgetPlacementSection } from './WidgetPlacementSection';
import './launcher.css';

export interface LauncherScreenProps {
  controller: LauncherController;
  runtime: WidgetRuntime;
  connection: ConnectionState;
  /** The people chips are no longer shown (ADR-0016, until ISSUE-049); the page still passes them. */
  chips?: readonly StatusChip[];
  /** Messages at the top of the screen (connection lost, sign-in expired). */
  notice?: ReactNode;
  updateCount?: number;
  onOpenSystem: () => void;
  /** Widget whose details are open (set through runtime.openDetails), null when closed. */
  detailsWidgetId: string | null;
  onCloseDetails: () => void;
  /** Widgets hidden by their visibility conditions (the hidden-card list is gone, ADR-0019). */
  isWidgetHidden?: (pageId: string, widgetId: string) => boolean;
  /** Definition lookup; the registry by default (the preview adds placeholder widgets). */
  findDefinition?: DefinitionResolver;
}

type SheetState =
  /**
   * `at`: the free cell touched, where the new widget goes. `initialType`, `rect` and `auto` are
   * what a drop of a type from the tray gave; the tray is no longer shown (2026-10-23), and the
   * path goes with the cleanup C4.
   */
  | {
      type: 'add';
      pageId: string;
      at?: Pick<CellRect, 'x' | 'y'>;
      initialType?: string;
      /** A device chosen in «Rileva dispositivi»: its type and entities, already selected. */
      initialSelection?: AddWidgetSelection;
      rect?: CellRect;
      auto?: boolean;
      /**
       * Opened by «Aggiungi widget» of the pages view: the widget goes to the first place free
       * from this page on (placeWidgetAheadInLayout), not to a cell.
       */
      ahead?: boolean;
    }
  | { type: 'widget'; pageId: string; widgetId: string }
  /** The widgets of a stack and its rotation (REP-20261007-037). */
  | { type: 'stack'; pageId: string; stackId: string }
  | null;

const NO_LONG_PRESS = 'input, select, textarea, [role="slider"], [data-no-long-press]';
/**
 * The commands of a widget (ADR-0016): semantic elements, or marked `data-widget-command`. The
 * details opener and the tile-wide target of a widget not yet linked are its body, not commands.
 */
const WIDGET_COMMAND =
  'button:not([data-widget-open], .aca-category-widget__tap), a[href], input, select, textarea, [role="button"], [role="switch"], [role="slider"], [role="checkbox"], [role="spinbutton"], [data-widget-command]';
/** Fields keep the menu of the browser (paste) on a widget in use. */
const EDITABLE_FIELD = 'input:not([type="range"]), textarea, [contenteditable="true"]';
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const REJECT_FLASH_MS = 900;
const LAND_MS = 260;
/** The widget removed from its bar shrinks and fades first (--aca-dur-exit-sm, tokens.css). */
const WIDGET_EXIT_MS = 160;
/** A widget comes in (--aca-dur-enter-sm); put back, it waits 60 ms for the cells to give way. */
const WIDGET_ENTER_MS = 240;
const WIDGET_RESTORE_DELAY_MS = 60;
/** The sheet that added a widget goes in 200 ms: the widget comes in 40 ms before it is gone. */
const ADDED_AFTER_SHEET_MS = 160;
/** The pager glides to the page with room; the widget does not wait longer than this for it. */
const PAGER_GLIDE_CAP_MS = 700;
/** A widget set to come in that nothing releases is shown anyway after this long. */
const ENTERING_CAP_MS = 10000;
/** How long «Annulla» stays after a removal (Launcher3 uses a short snackbar). */
const UNDO_MS = 5000;

/**
 * Widgets that need their settings right after being added (the to-do list and the car have no
 * entity chosen while adding): their settings sheet opens next, as the legacy edit modal did.
 */
const SETTINGS_AFTER_ADD = ['todo_card_', 'car_card_'];
const opensSettingsAfterAdd = (widgetId: string) =>
  SETTINGS_AFTER_ADD.some((prefix) => widgetId.startsWith(prefix));

/** The handle of a widget on a page, found by data attributes (ids are never escaped). */
function handleOf(pageId: string, widgetId: string) {
  const page = Array.from(document.querySelectorAll<HTMLElement>('[data-launcher-page]')).find(
    (element) => element.dataset.launcherPage === pageId
  );
  const widget = Array.from(page?.querySelectorAll<HTMLElement>('[data-widget-id]') ?? []).find(
    (element) => element.dataset.widgetId === widgetId
  );
  return widget?.querySelector<HTMLElement>(':scope > .aca-launcher-widget__handle') ?? null;
}

/** The rectangle of a widget on a page: where a console grows out of and shrinks back into. */
function rectOf(pageId: string, widgetId: string): ConsoleOrigin | undefined {
  const page = Array.from(document.querySelectorAll<HTMLElement>('[data-launcher-page]')).find(
    (element) => element.dataset.launcherPage === pageId
  );
  const widget = Array.from(page?.querySelectorAll<HTMLElement>('[data-widget-id]') ?? []).find(
    (element) => element.dataset.widgetId === widgetId
  );
  const { top, left, width, height } = widget?.getBoundingClientRect() ?? {};
  return width && height ? { top: top ?? 0, left: left ?? 0, width, height } : undefined;
}

/** Focuses an element; true when it took the focus (a page out of view is inert). */
function takesFocus(element: HTMLElement | null | undefined) {
  element?.focus();
  return Boolean(element) && document.activeElement === element;
}

function isOverlayOpen() {
  if (typeof document === 'undefined') return false;
  if (document.querySelector('dialog[open], [data-aca-console]')) return true;
  try {
    return Boolean(document.querySelector(':popover-open'));
  } catch {
    return false;
  }
}

/**
 * Read aloud when edit mode begins on a widget (a press and hold, «Modifica la disposizione»).
 * Edit mode exists only while a widget is selected (REP-20261021-003, annotation of 2026-10-23):
 * «Fine» in its bar, a tap outside the widgets or Esc end it.
 */
const EDIT_MODE_ANNOUNCEMENT =
  'Modifica della disposizione. Trascina il widget per spostarlo, tocca un widget selezionato per le impostazioni. Fine o Esc per terminare.';
/** Read aloud when «Modifica la disposizione» finds no widget on the page in the centre. */
const NO_WIDGET_TO_EDIT =
  'Nessun widget da modificare in questa pagina. Per le pagine: Sistema, Modifica le pagine.';
/** Read aloud when edit mode begins on the page overview («Modifica le pagine» in Sistema). */
const OVERVIEW_ANNOUNCEMENT =
  'Pagine. Tocca una pagina per aprirla, tienila premuta per spostarla. In basso: elimina, nuova pagina, aggiungi widget, principale, il nome da toccare per cambiarlo, nascondi e Fine.';

/**
 * The launcher screen: the pager at full screen (cover, widget pages, special pages) with the gear
 * of Sistema, the commands with no face and the notice laid over it; the top bar (page indicator)
 * and the bottom bars that edit mode brings: the bar of the selected widget, and the bar of the
 * pages in the page overview (a long press on an empty place opens it, a tap on a card goes back to
 * that page in use). Edit mode of the widgets exists only while one is selected: a press and hold on
 * a widget, «Modifica la disposizione» and a widget just added select one; «Fine», a tap outside, Esc
 * and the removal end it (REP-20261021-003, annotation of 2026-10-23). Dragging and keyboard,
 * details and edit sheets (ADR-0016).
 * It gets the controller and the widget runtime from the page, so the app and the development
 * preview share it.
 */
export function LauncherScreen({
  controller: live,
  runtime,
  connection,
  notice,
  updateCount = 0,
  onOpenSystem,
  detailsWidgetId,
  onCloseDetails,
  isWidgetHidden,
  findDefinition = findWidgetDefinition,
}: LauncherScreenProps) {
  const reducedMotion = useReducedMotion();
  // The page in the centre and the overview are read from `live`; everything else, and the
  // context of the grids and the widgets, from `controller`, which a swipe or the overview
  // leaves as it was (REP-20261012-003).
  const controller = useWidgetController(live);
  const screenVisible = usePageVisible();
  const { rememberRemovedWidget, rememberRemovedPage, widgetMemoryNotice } = usePages();
  const {
    editMode,
    entries,
    currentPage,
    currentPageId,
    setEditMode,
    goToPage,
    overview,
    setOverview,
  } = live;
  const current = entries[currentPage];
  // The pages view is a scene whose movement starts after the block of its state change
  // (REP-20261023-006, D-M25): while `staged`, the pager and the bars keep the look they had, and
  // take the new one together in the frame the scene starts, each with its place in the order
  // (cells, cards, indicator, bar, controls: launcher.css, edit.css, pageIndicator.css). Without a
  // measured pager (jsdom, a covered launcher) or with reduced motion there is nothing to wait for.
  // The end of the wait renders the pager, the indicator and the bars alone, not this screen.
  const [pagerReady, setPagerReady] = useState(false);
  // Neither the opening nor «Fine» wait: the scene starts in the commit of the change, as in the
  // 0.9.27 (the choices of the user of 2026-10-24 for «Fine» and of 2026-10-25 for the opening,
  // «Un tempo solo»: a faster answer over smoother first frames). The stage stays as the seam the
  // pager and the bars hang on; it is a wait again by passing true.
  const stage = useStagedScene(overview, pagerReady && !reducedMotion, false, false);
  // Written by the pager: the cards are going back or the pages settle, and a long press is ignored.
  const pagerBusy = useRef(false);
  // What each page is: data for the shell, the bars and the rules that tell the pages apart.
  const mainPageId = basePageId(controller.layout);
  const shownDescriptors = useRef<PageDescriptor[]>([]);
  const descriptors = useMemo(() => {
    shownDescriptors.current = describePages(entries, mainPageId, shownDescriptors.current);
    return shownDescriptors.current;
  }, [entries, mainPageId]);
  const currentDescriptor: PageDescriptor | undefined = descriptors[currentPage];

  // ── Announcements (aria-live) ──
  const [announcement, setAnnouncement] = useState('');
  const announce = useCallback((text: string) => {
    setAnnouncement('');
    setTimeout(() => setAnnouncement(text), 30);
  }, []);

  // ── The selected widget, the one just dropped and the one that refused a move live in a store
  // read by the grids and the hosts, not in `ui`: a selection or the end of a landing redraws the
  // grid and the widget concerned, not every page (ISSUE-109, R5a). Only this screen, which draws
  // the bar of the selected widget, follows the selection as a whole. ──
  const [selection] = useState(createLauncherSelection);
  const selected = useSyncExternalStore(selection.subscribe, selection.selected);

  // ── Refused moves: error LED on the widget for a moment, and the reason read aloud ──
  const rejectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reject = useCallback(
    (widgetId: string, message: string) => {
      selection.setRejected(widgetId);
      announce(message);
      if (rejectTimer.current) clearTimeout(rejectTimer.current);
      rejectTimer.current = setTimeout(() => selection.setRejected(null), REJECT_FLASH_MS);
    },
    [announce, selection]
  );
  useEffect(
    () => () => {
      if (rejectTimer.current) clearTimeout(rejectTimer.current);
    },
    []
  );

  // ── Names and visibility ──
  const widgetName = useCallback(
    (pageId: string, widgetId: string): string => {
      const stack = controller.layout.stacks?.[widgetId];
      if (stack) return `Pila di ${stack.ids.length} widget`;
      const settings = controller.settingsFor(pageId, widgetId);
      return widgetDisplayName(
        widgetId,
        settings,
        runtime.entities,
        runtime.customNames,
        findDefinition(widgetId, settings)?.label
      );
    },
    [controller, runtime.entities, runtime.customNames, findDefinition]
  );
  const hiddenCheck = useCallback(
    (pageId: string, widgetId: string) => isWidgetHidden?.(pageId, widgetId) ?? false,
    [isWidgetHidden]
  );

  // ── Grids (for the drag geometry) ──
  const grids = useRef(new Map<string, () => GridGeometry | null>());
  const registerGrid = useCallback((pageId: string, measure: () => GridGeometry | null) => {
    grids.current.set(pageId, measure);
    return () => {
      if (grids.current.get(pageId) === measure) grids.current.delete(pageId);
    };
  }, []);

  const pagerRef = useRef<HTMLDivElement | null>(null);
  /** Group of the bar of the selected widget: its trash is the drop target of a moved widget. */
  const barGroupRef = useRef<HTMLDivElement | null>(null);
  /** «Disposizione bloccata» notice, set once the notice pill exists (REP-20261007-033). */
  const lockedNotice = useRef<() => void>(() => undefined);
  /** Removal with «Annulla», set once removeWidget exists (the drag needs it before). */
  const removeWithUndoRef = useRef<(pageId: string, widgetId: string) => void>(() => undefined);
  /** A tap on a widget in edit mode (select, settings), set once the settings sheet exists. */
  const tapWidgetRef = useRef<(pageId: string, widgetId: string, wasSelected: boolean) => void>(
    () => undefined
  );

  // These two read the descriptors of the moment, so they stay the same functions when the list
  // changes (the cover that is off adds its card in the overview) and the context of the grids and
  // the widgets is left as it was (REP-20261012-003).
  /** Index in the pager of the entry showing a page (the cover shows its own page of widgets). */
  const entryIndexOf = useCallback(
    (pageId: string) =>
      shownDescriptors.current.findIndex(
        (descriptor) => descriptor.key === pageId || descriptor.page?.id === pageId
      ),
    []
  );

  /** Nearest widget page from `fromIndex` towards `direction` in the pager. */
  const adjacentWidgetPage = useCallback((fromIndex: number, direction: -1 | 1) => {
    const shown = shownDescriptors.current;
    for (
      let index = fromIndex + direction;
      index >= 0 && index < shown.length;
      index += direction
    ) {
      const descriptor = shown[index];
      if (descriptor.acceptsWidgets) return { index, descriptor, page: descriptor.page };
    }
    return null;
  }, []);

  // ── Sheets ──
  const [sheet, setSheet] = useState<SheetState>(null);
  const [categoryPageOpen, setCategoryPageOpen] = useState(false);

  // ── Selection in edit mode and the widget just dropped (REP-20261007-027) ──
  /**
   * Layout and page when the selected widget was picked: «Annulla» of its bar puts it back
   * (REP-20261007-029), on its page. A drop selects the widget with the layout from before the
   * drop; the same widget moved to another page (`follow`) keeps where it was picked
   * (REP-20261008-001). The same id on another page is another widget.
   */
  const selectedFrom = useRef<{ layout: LauncherLayout; pageId: string } | null>(null);
  const select = useCallback(
    (pageId: string, widgetId: string, before?: LauncherLayout, follow = false) => {
      const current = selection.selected();
      if (current?.widgetId === widgetId) {
        if (current.pageId === pageId) return;
        if (follow) {
          selection.setSelected({ pageId, widgetId });
          return;
        }
      }
      selectedFrom.current = { layout: before ?? controller.layout, pageId };
      selection.setSelected({ pageId, widgetId });
    },
    [controller.layout, selection]
  );
  // The page overview (REP-20261007-028) is the controller's: it closes with edit mode.
  useEffect(() => {
    if (editMode) return;
    selection.setSelected(null);
  }, [editMode, selection]);
  const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const land = useCallback(
    (pageId: string, widgetId: string, flying = false) => {
      const ref = { pageId, widgetId };
      selection.setLanded(ref);
      if (landTimer.current) clearTimeout(landTimer.current);
      landTimer.current = null;
      if (flying) {
        // Committed at the release, before the flight of the copy (K6b): the widget is in its
        // cell, hidden, and `is-landing` keeps it there without a trip from the old one. The
        // time of the landing counts from the end of the flight (landed below).
        selection.setAirborne(ref);
        return;
      }
      landTimer.current = setTimeout(() => selection.setLanded(null), LAND_MS);
    },
    [selection]
  );
  /** The copy of a drop committed before its flight has landed: the widget shows. */
  const landed = useCallback(() => {
    if (!selection.airborne()) return;
    selection.setAirborne(null);
    if (landTimer.current) clearTimeout(landTimer.current);
    landTimer.current = setTimeout(() => selection.setLanded(null), LAND_MS);
  }, [selection]);
  useEffect(
    () => () => {
      if (landTimer.current) clearTimeout(landTimer.current);
    },
    []
  );

  /** «Termostato ridotto a 1 per 1» for the widgets shrunk to make room, if any. */
  const shrunkText = useCallback(
    (
      pageId: string,
      before: Record<string, CellRect>,
      after: Record<string, CellRect> | null,
      own: string
    ) => {
      if (!after) return '';
      return resizedIds(before, after, own)
        .map((id) => `${widgetName(pageId, id)} ridotto a ${after[id].w} per ${after[id].h}`)
        .map((text) => ` ${text} per fare spazio.`)
        .join('');
    },
    [widgetName]
  );

  const onDrop = useCallback(
    (session: DragSession, flying = false) => {
      const target = session.target;
      // No target: released outside the grids.
      if (!target) {
        announce(session.mode === 'add' ? 'Aggiunta annullata.' : 'Spostamento annullato.');
        return;
      }
      if (session.mode === 'add') {
        if (!target.valid) {
          announce('Non c’è spazio lì per questo widget.');
          return;
        }
        // The widget is created by the add sheet (entities to choose), or at once for the
        // types that need no choice; it lands where it was dropped.
        setSheet({
          type: 'add',
          pageId: target.pageId,
          at: { x: target.rect.x, y: target.rect.y },
          initialType: session.addType,
          rect: target.rect,
          auto: true,
        });
        return;
      }
      if (!target.valid) {
        reject(session.widgetId, 'Non c’è spazio lì: il widget torna al suo posto.');
        return;
      }
      const targetPage = controller.findPage(target.pageId);
      const before = targetPage
        ? pagePlacements(targetPage, controller.classFor(target.pageId))
        : {};
      const layoutBefore = controller.layout;
      const shrunk = shrunkText(target.pageId, before, target.preview, session.widgetId);
      const { rect } = target;
      // Held over the middle of another widget: a stack (REP-20261007-037).
      if (target.stackOn) {
        const onto = target.stackOn;
        const stackId = controller.stackWidgets(target.pageId, session.widgetId, onto);
        if (!stackId) {
          reject(session.widgetId, 'Questi widget non possono stare in una pila.');
          return;
        }
        announce(
          onto.startsWith('stack_')
            ? `${session.label} aggiunto alla pila.`
            : `Pila creata con ${session.label}. Scorri col dito per cambiare widget.`
        );
        select(target.pageId, stackId, layoutBefore);
        return;
      }
      let done: boolean;
      if (session.mode === 'resize') {
        const same =
          rect.x === session.origin.x &&
          rect.y === session.origin.y &&
          rect.w === session.origin.w &&
          rect.h === session.origin.h;
        if (same) return;
        // Any side or corner: the whole rectangle, the opposite side stays.
        done = controller.moveWidget(session.sourcePageId, session.widgetId, rect);
        if (done) announce(`${session.label}: dimensione ${rect.w} per ${rect.h}.${shrunk}`);
      } else if (target.pageId === session.sourcePageId) {
        const same = rect.x === session.origin.x && rect.y === session.origin.y;
        if (same) {
          // Dropped where it was: the copy still flies to the cell, and the widget stays hidden
          // there until it has landed (the session no longer hides it during a flight, W2).
          if (flying && session.mode === 'move') {
            selection.setAirborne({ pageId: target.pageId, widgetId: session.widgetId });
          }
          return;
        }
        done = controller.moveWidget(session.sourcePageId, session.widgetId, rect);
        if (done) announce(`${session.label} spostato: ${describeRect(rect)}.${shrunk}`);
      } else {
        done = controller.moveWidgetToPage(
          session.sourcePageId,
          target.pageId,
          session.widgetId,
          rect
        );
        if (done) {
          announce(
            `${session.label} spostato nella pagina ${displayLabel(targetPage?.label)}.${shrunk}`
          );
        }
      }
      if (!done) {
        reject(session.widgetId, 'Non c’è spazio lì: il widget torna al suo posto.');
        return;
      }
      select(target.pageId, session.widgetId, layoutBefore, true);
      if (session.mode === 'move') land(target.pageId, session.widgetId, flying);
    },
    [controller, announce, reject, shrunkText, select, land, selection]
  );

  const drag = useWidgetDrag({
    getGeometry: (pageId) => grids.current.get(pageId)?.() ?? null,
    getPlacements: (pageId) => {
      const page = controller.findPage(pageId);
      return page ? pagePlacements(page, controller.classFor(pageId)) : {};
    },
    sizesFor: controller.sizesFor,
    getPagerBounds: () => {
      const box = pagerRef.current?.getBoundingClientRect();
      return box ? { left: box.left, right: box.right } : null;
    },
    hasPage: (direction) => {
      const next = adjacentWidgetPage(currentPage, direction);
      return Boolean(next);
    },
    onEdge: (direction) => {
      const next = adjacentWidgetPage(currentPage, direction);
      if (!next) return null;
      goToPage(next.index);
      return next.page.id;
    },
    onDrop,
    onLanded: landed,
    onCancel: () => announce('Spostamento annullato.'),
    // Released on the trash of the bar of the widget (REP-20261008-001). The bar lies over the
    // last row of the grid (ADR-0016, D-11), so the target is the bar and not a band under it:
    // sideways the group with a small margin (its transform is only vertical), upwards from
    // 4 px above its resting row (the root of the bar is not transformed, so this counts while
    // the bar rises) down to the screen edge. A finger dragging a widget of the last row above
    // that line, or beside the bar, is not over the trash.
    getRemoveBounds: () => {
      const group = barGroupRef.current;
      const band = group?.parentElement;
      if (!group || !band) return null;
      const box = group.getBoundingClientRect();
      if (box.width === 0) return null;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return {
        left: box.left - 0.5 * rem,
        right: box.right + 0.5 * rem,
        top: band.getBoundingClientRect().top - 0.25 * rem,
        bottom: window.innerHeight,
      };
    },
    onRemove: (session) => removeWithUndoRef.current(session.sourcePageId, session.widgetId),
    // Lifted: the widget is selected at once, so its bar rises with the trash (U5).
    onActivate: (session) => {
      if (session.mode === 'move') select(session.sourcePageId, session.widgetId);
    },
    // A tap on the grip frame of the selected widget, without dragging: on another widget
    // under it, that one is selected; anywhere else it counts as a tap on the widget itself.
    onTap: (start, pointer) => {
      if (start.mode !== 'resize') return;
      const under =
        typeof document.elementsFromPoint === 'function'
          ? document.elementsFromPoint(pointer.x, pointer.y)
          : [];
      const first = under.find((element) => !element.closest('.aca-resize-frame'));
      const other = first?.closest('.aca-launcher-widget__handle')
        ? first.closest<HTMLElement>('[data-widget-id]')
        : null;
      const otherPage = other?.closest<HTMLElement>('[data-launcher-page]')?.dataset.launcherPage;
      const otherId = other?.dataset.widgetId;
      if (otherPage && otherId && otherId !== start.widgetId) {
        tapWidgetRef.current(otherPage, otherId, false);
        return;
      }
      tapWidgetRef.current(start.pageId, start.widgetId, true);
    },
  });
  // Edit mode ended during a press or a drag (Esc, «Fine», locked from Sistema): nothing lifts.
  const cancelDrag = drag.cancel;
  useEffect(() => {
    if (!editMode) cancelDrag();
  }, [editMode, cancelDrag]);

  // The cover takes widgets too (REP-20261007-030).
  const addTargetPageId = currentDescriptor?.acceptsWidgets ? currentDescriptor.page.id : null;

  // ── Focus after moving to another page ──
  const focusRequest = useRef<{ pageId: string; widgetId: string } | null>(null);
  const requestFocus = useCallback((pageId: string, widgetId: string) => {
    focusRequest.current = { pageId, widgetId };
  }, []);
  const takeFocusRequest = useCallback((pageId: string, widgetId: string) => {
    const request = focusRequest.current;
    if (!request || request.pageId !== pageId || request.widgetId !== widgetId) return false;
    focusRequest.current = null;
    return true;
  }, []);

  const hasAdjacentPage = useCallback(
    (pageId: string, direction: -1 | 1) =>
      Boolean(adjacentWidgetPage(entryIndexOf(pageId), direction)),
    [adjacentWidgetPage, entryIndexOf]
  );
  const moveToAdjacentPage = useCallback(
    (pageId: string, widgetId: string, direction: -1 | 1) => {
      const next = adjacentWidgetPage(entryIndexOf(pageId), direction);
      if (!next) {
        announce('Nessuna pagina in questa direzione.');
        return null;
      }
      const label = next.descriptor.label;
      // About the size it shows, measured on the two grids on screen (REP-20261012-001).
      const page = controller.findPage(pageId);
      const rect = page ? pagePlacements(page, controller.classFor(pageId))[widgetId] : undefined;
      const from = grids.current.get(pageId)?.();
      const into = grids.current.get(next.page.id)?.();
      const size = rect && from && into ? cellsForBox(boxOfCells(rect, from), into) : undefined;
      if (controller.moveWidgetToPage(pageId, next.page.id, widgetId, undefined, size)) {
        // The selection follows the widget to its new page.
        const to = next.page.id;
        selection.setSelected((current) =>
          current?.widgetId === widgetId ? { pageId: to, widgetId } : current
        );
        requestFocus(next.page.id, widgetId);
        controller.goToPageId(next.descriptor.key);
        announce(`Spostato nella pagina ${label}.`);
        return to;
      }
      reject(widgetId, `Nella pagina ${label} non c’è spazio per questo widget.`);
      return null;
    },
    [entryIndexOf, adjacentWidgetPage, controller, requestFocus, announce, reject, selection]
  );

  const stepWidget = useCallback(
    (pageId: string, widgetId: string, mode: 'move' | 'resize', dx: number, dy: number) => {
      const page = controller.findPage(pageId);
      const placement = page?.placements[controller.classFor(pageId)]?.[widgetId];
      if (!placement) return '';
      const grid = controller.gridFor(pageId);
      // Read aloud (refused: with the error LED) and returned, for the settings sheet to show.
      const say = (message: string, refused = false) => {
        if (refused) reject(widgetId, message);
        else announce(message);
        return message;
      };
      if (mode === 'resize') {
        const wanted = clampSize(
          { w: placement.w + dx, h: placement.h + dy },
          grid,
          controller.sizesFor(pageId, widgetId)
        );
        const size = {
          w: Math.min(wanted.w, grid.w - placement.x),
          h: Math.min(wanted.h, grid.h - placement.y),
        };
        if (size.w === placement.w && size.h === placement.h) {
          return say('Dimensione al limite per questo widget.');
        }
        if (controller.resizeWidget(pageId, widgetId, size)) {
          return say(`Dimensione ${size.w} per ${size.h}.`);
        }
        return say('Non c’è spazio per ingrandirlo qui: dimensione invariata.', true);
      }
      const target = { ...placement, x: placement.x + dx, y: placement.y + dy };
      if (target.x < 0 || target.x + target.w > grid.w) {
        moveToAdjacentPage(pageId, widgetId, dx < 0 ? -1 : 1);
        return '';
      }
      if (target.y < 0 || target.y + target.h > grid.h) return say('Bordo della pagina.');
      if (controller.moveWidget(pageId, widgetId, target)) {
        return say(`Spostato in colonna ${target.x + 1}, riga ${target.y + 1}.`);
      }
      return say('Non c’è spazio in quella posizione: il widget resta dov’era.', true);
    },
    [controller, moveToAdjacentPage, announce, reject]
  );

  const removeWidget = useCallback(
    (pageId: string, widgetId: string) => {
      // The configuration stays in memory for the widget's device (ADR-0019); «Annulla» is
      // unaffected: the settings are not touched by the removal.
      rememberRemovedWidget(pageId, widgetId, widgetName(pageId, widgetId));
      controller.removeWidget(pageId, widgetId);
      selection.setSelected((current) => (current?.widgetId === widgetId ? null : current));
      // The widget leaves with its selection and edit mode ends: a focus lost with it goes to
      // «Modifica la disposizione», the command with no face that comes back. The frame after
      // the next one (ISSUE-109, R7), as after «Fine».
      afterNextFrame(() => {
        const active = document.activeElement;
        if (active && active !== document.body) return;
        document.querySelector<HTMLElement>('[data-launcher-edit]')?.focus();
      });
    },
    [controller, selection, rememberRemovedWidget, widgetName]
  );

  // ── Removal as on Android: at once, then «Annulla» for a few seconds (REP-20261007-031) ──
  /**
   * A change to undo (`layout` set; `undone` read aloud once undone, a removal by default), or a
   * notice that only informs (the lock, why an action cannot be taken).
   */
  const [undo, setUndo] = useState<{
    message: string;
    layout?: LauncherLayout;
    undone?: string;
    /** The widget the removal took away: «Annulla» brings it back in (D-M10). */
    restored?: WidgetRef;
  } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    []
  );
  const removeWithUndo = useCallback(
    (pageId: string, widgetId: string) => {
      const before = controller.layout;
      const name = widgetName(pageId, widgetId);
      removeWidget(pageId, widgetId);
      setUndo({ message: `${name} rimosso`, layout: before, restored: { pageId, widgetId } });
      announce(`${name} rimosso dalla pagina. Annulla per rimetterlo.`);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
    },
    [controller.layout, widgetName, removeWidget, announce]
  );
  removeWithUndoRef.current = removeWithUndo;

  // ── Widgets that leave and come in (REP-20261023-006, D-M10, D-M11, D-M22) ──
  /** Timers of the scenes below, cleared with the screen. */
  const sceneTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = sceneTimers.current;
    return () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
  }, []);
  const later = useCallback((callback: () => void, ms: number) => {
    const timers = sceneTimers.current;
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, ms);
    timers.add(timer);
  }, []);
  /** Where the browser animates and the person did not ask for less motion. */
  const moves = !reducedMotion && canAnimate();
  /**
   * Removal from the bar or the keyboard: the widget shrinks to 0.92 and fades out in 160 ms
   * (its ring and dots with it), and only then is the removal committed, so the pill and the free
   * cells follow an exit that has been seen. Without animation it goes at once, as before.
   */
  const leaving = useRef(false);
  const removeLeaving = useCallback(
    (pageId: string, widgetId: string) => {
      if (!moves) {
        removeWithUndoRef.current(pageId, widgetId);
        return;
      }
      if (leaving.current) return;
      leaving.current = true;
      selection.setExiting({ pageId, widgetId });
      later(() => {
        leaving.current = false;
        selection.setExiting(null);
        removeWithUndoRef.current(pageId, widgetId);
      }, WIDGET_EXIT_MS + TWO_FRAMES_MS);
    },
    [moves, selection, later]
  );
  /**
   * A widget that is mounted at the look it comes from (see-through, a little smaller) and takes
   * its own when `goEntering` runs: put back by «Annulla» or just added from the add sheet.
   */
  const beginEntering = useCallback(
    (ref: WidgetRef, mode: 'added' | 'restored') => {
      if (!moves) return false;
      const marker = { ...ref, mode, go: false };
      selection.setEntering(marker);
      // Nothing may keep a widget invisible for ever: shown anyway if it was never released.
      later(() => {
        if (selection.entering() === marker) selection.setEntering(null);
      }, ENTERING_CAP_MS);
      return true;
    },
    [moves, selection, later]
  );
  /** Runs `done` when the pager has stopped gliding (`scrollend`), or after a cap if it never says. */
  const afterGlide = useCallback(
    (done: () => void) => {
      const pager = pagerRef.current;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        pager?.removeEventListener('scrollend', finish);
        done();
      };
      pager?.addEventListener('scrollend', finish, { once: true });
      later(finish, PAGER_GLIDE_CAP_MS);
    },
    [later]
  );
  const goEntering = useCallback(() => {
    const now = selection.entering();
    if (!now || now.go) return;
    const going = { ...now, go: true };
    selection.setEntering(going);
    later(
      () => {
        if (selection.entering() === going) selection.setEntering(null);
      },
      WIDGET_ENTER_MS + (now.mode === 'restored' ? WIDGET_RESTORE_DELAY_MS : 0) + TWO_FRAMES_MS
    );
  }, [selection, later]);
  lockedNotice.current = () => {
    notify('Disposizione bloccata: sbloccala in Sistema → Schermata Home.');
    announce('Disposizione bloccata. Si sblocca in Sistema, Schermata Home.');
  };
  // Locked from Sistema while editing: edit mode ends.
  useEffect(() => {
    if (controller.layout.locked && editMode) setEditMode(false);
  }, [controller.layout.locked, editMode, setEditMode]);
  /** A short notice in the same pill, without «Annulla». */
  const notify = useCallback((message: string) => {
    setUndo({ message });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  }, []);
  const undoRemoval = useCallback(() => {
    if (!undo?.layout) return;
    // Put back, the widget comes in from the look it left with (D-M10), two frames after the commit.
    if (undo.restored && beginEntering(undo.restored, 'restored')) afterNextFrame(goEntering);
    controller.restoreLayout(undo.layout);
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    announce(undo.undone ?? 'Widget rimesso al suo posto.');
  }, [undo, controller, announce, beginEntering, goEntering]);

  // ── Sheets ──
  const addDestination = useRef<string | null>(null);
  /**
   * Widget just added: it takes the focus when the cell that opened the sheet is gone. With
   * `settings` its settings sheet opened next, and the focus waits for that sheet to close.
   */
  const lastAdded = useRef<{ pageId: string; widgetId: string; settings: boolean } | null>(null);
  /**
   * Once the sheets have closed (a dialog may take a frame or two), a focus left on the page
   * body (or in the closed sheet) goes, on the page of the widget just added: to its handle in
   * edit mode; with `toWidget`, in view mode, to its first control; else to the free-cell tab
   * stop of the page; else to «Aggiungi widget».
   */
  const focusAdded = useCallback((toWidget: boolean) => {
    const refocus = (frame: number) => {
      if (document.querySelector('dialog[open]')) {
        if (frame < 10) requestAnimationFrame(() => refocus(frame + 1));
        return;
      }
      const added = lastAdded.current;
      lastAdded.current = null;
      const active = document.activeElement;
      const lost = !active || active === document.body || active.closest('dialog:not([open])');
      if (!added || !lost) return;
      const page = Array.from(document.querySelectorAll<HTMLElement>('[data-launcher-page]')).find(
        (element) => element.dataset.launcherPage === added.pageId
      );
      const widget = Array.from(page?.querySelectorAll<HTMLElement>('[data-widget-id]') ?? []).find(
        (element) => element.dataset.widgetId === added.widgetId
      );
      (
        widget?.querySelector<HTMLElement>('.aca-launcher-widget__handle') ??
        (toWidget ? widget?.querySelector<HTMLElement>(FOCUSABLE) : null) ??
        page?.querySelector<HTMLElement>(cellSelector(added.pageId)) ??
        document.querySelector<HTMLElement>('[data-launcher-add]')
      )?.focus();
    };
    requestAnimationFrame(() => refocus(0));
  }, []);
  /**
   * The widget just added from a cell, to be shown selected in edit mode, with the frame, the
   * handles and the bar of a press and hold, once its sheets have closed (user request of
   * 2026-10-23). Nothing is set when the adding is cancelled.
   */
  const [reveal, setReveal] = useState<WidgetRef | null>(null);
  useEffect(() => {
    if (!reveal || sheet !== null) return;
    const page = controller.findPage(reveal.pageId);
    // The layout with the new widget has not arrived yet: wait for it.
    if (!page || !pagePlacements(page, controller.classFor(page.id))[reveal.widgetId]) return;
    if (overview && !controller.layout.locked) {
      // Added from the pages view («Aggiungi widget»): the view closes first, on its own render,
      // so the selection below is not cleared by the rule that keeps the overview without one.
      setOverview(false);
      return;
    }
    setReveal(null);
    // The widget just added comes in as the sheet is nearly gone (D-M11), or, when its page is not the
    // one on view (the page was full), once the pager has glided to the page with room (D-M22).
    const comes = selection.entering();
    const waits = Boolean(comes && !comes.go && comes.widgetId === reveal.widgetId);
    if (controller.layout.locked) {
      if (waits) goEntering();
      return;
    }
    if (!controller.editMode) setEditMode(true);
    select(reveal.pageId, reveal.widgetId);
    requestFocus(reveal.pageId, reveal.widgetId);
    if (!waits) return;
    const index = entryIndexOf(reveal.pageId);
    const key = shownDescriptors.current[index]?.key;
    if (index >= 0 && index !== currentPage && key) {
      controller.goToPageId(key);
      afterGlide(goEntering);
    } else {
      later(goEntering, ADDED_AFTER_SHEET_MS);
    }
  }, [
    reveal,
    sheet,
    controller,
    overview,
    currentPage,
    selection,
    entryIndexOf,
    setOverview,
    setEditMode,
    select,
    requestFocus,
    goEntering,
    afterGlide,
    later,
  ]);
  /** The widget of the open sheet went to another page from it (its old handle is gone). */
  const sheetMoved = useRef(false);
  // Closing the settings sheet of a widget just added from a cell gives the focus back to it;
  // so does closing the sheet of a widget moved to another page, on its new page.
  const closeSheet = useCallback(() => {
    const added = lastAdded.current;
    const closing = sheet;
    const moved = sheetMoved.current;
    sheetMoved.current = false;
    setSheet(null);
    if (added?.settings && closing?.type === 'widget' && closing.widgetId === added.widgetId) {
      focusAdded(true);
    } else if (moved && (closing?.type === 'widget' || closing?.type === 'stack')) {
      const { pageId } = closing;
      const widgetId = closing.type === 'widget' ? closing.widgetId : closing.stackId;
      const refocus = (frame: number) => {
        if (document.querySelector('dialog[open]')) {
          if (frame < 10) requestAnimationFrame(() => refocus(frame + 1));
          return;
        }
        const active = document.activeElement;
        if (active && active !== document.body && !active.closest('dialog:not([open])')) return;
        handleOf(pageId, widgetId)?.focus();
      };
      requestAnimationFrame(() => refocus(0));
    }
  }, [sheet, focusAdded]);
  // Closing the add sheet leaves alone the settings sheet a new widget may have opened.
  const closeAddSheet = useCallback(() => {
    setSheet((open) => (open?.type === 'add' ? null : open));
    if (!lastAdded.current?.settings) focusAdded(false);
  }, [focusAdded]);
  const openAddWidget = useCallback(
    (pageId: string, at?: Pick<CellRect, 'x' | 'y'>, selection?: AddWidgetSelection) => {
      addDestination.current = pageId;
      lastAdded.current = null;
      setSheet({
        type: 'add',
        pageId,
        ...(at ? { at } : {}),
        ...(selection ? { initialSelection: selection } : {}),
      });
    },
    []
  );
  /** «Rileva dispositivi»: the add sheet on the type of a device, with the device selected. */
  const requestAddWidget = useCallback(
    (pageId: string, selection: AddWidgetSelection) => openAddWidget(pageId, undefined, selection),
    [openAddWidget]
  );
  /** «Aggiungi widget» of the pages view: the same sheet as a free cell, with no cell chosen. */
  const openAddWidgetAhead = useCallback((pageId: string) => {
    addDestination.current = pageId;
    lastAdded.current = null;
    setSheet({ type: 'add', pageId, ahead: true });
  }, []);
  /** Rectangle where a widget dropped on a page lands, used by the first widget added. */
  const dropRect = useRef<CellRect | null>(null);
  useEffect(() => {
    dropRect.current = sheet?.type === 'add' ? (sheet.rect ?? null) : null;
  }, [sheet]);
  const openWidgetSettings = useCallback((pageId: string, widgetId: string) => {
    sheetMoved.current = false;
    setSheet(
      widgetId.startsWith('stack_')
        ? { type: 'stack', pageId, stackId: widgetId }
        : { type: 'widget', pageId, widgetId }
    );
  }, []);

  /**
   * The widget moved to another page from its settings: the sheet follows it, and the focus
   * stays on the control pressed instead of jumping to the widget (it goes there on closing).
   */
  const followSheet = useCallback((pageId: string) => {
    focusRequest.current = null;
    sheetMoved.current = true;
    setSheet((open) => (open && open.type !== 'add' ? { ...open, pageId } : open));
  }, []);

  // ── Taps on the widgets in edit mode (ADR-0016, G4, G5): a tap selects, a second tap on the
  // selected widget opens its settings, one tap on a widget not yet linked opens «Collega» ──
  const tapWidget = useCallback(
    (pageId: string, widgetId: string, wasSelected: boolean) => {
      if (isCategoryWidgetUnbound(controller.settingsFor(pageId, widgetId))) {
        select(pageId, widgetId);
        openWidgetSettings(pageId, widgetId);
        return;
      }
      if (wasSelected) {
        openWidgetSettings(pageId, widgetId);
        return;
      }
      select(pageId, widgetId);
    },
    [controller, openWidgetSettings, select]
  );
  tapWidgetRef.current = tapWidget;

  const firstWidgetPageId =
    controller.layout.pages.find((page) => page.kind === 'widgets')?.id ?? null;
  const finishEditing = useCallback(() => {
    setEditMode(false);
    announce('Modifica terminata.');
    // «Fine» sinks with its bar: the focus goes to «Modifica la disposizione», the command with
    // no face that comes back (REP-20261009-004, D1; ADR-0016, C3). The frame after the next one
    // (ISSUE-109, R7): the style is clean by then, so the focus forces no recalculation.
    afterNextFrame(() => document.querySelector<HTMLElement>('[data-launcher-edit]')?.focus());
  }, [setEditMode, announce]);

  // ── Input modality: keyboard moves and paging skip their animation ──
  useEffect(() => {
    const root = document.documentElement;
    // Written only when it changes: an attribute written with the value it has still restyles every
    // widget (launcher.css, `[data-aca-input='keyboard']`) at each press (0.9.28, tracing of 2026-10-24).
    const mark = (kind: 'keyboard' | 'pointer') => {
      if (root.dataset.acaInput !== kind) root.dataset.acaInput = kind;
    };
    const onKey = () => mark('keyboard');
    const onPointer = () => mark('pointer');
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
      delete root.dataset.acaInput;
    };
  }, []);

  // ── Leaving edit mode: Esc (when no sheet or menu is open) ──
  useEffect(() => {
    if (!editMode) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isOverlayOpen()) return;
      // The page overview too: it closes with edit mode, back to the page in use.
      finishEditing();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editMode, finishEditing]);

  // ── Edit mode exists only while a widget is selected (REP-20261021-003, annotation of
  // 2026-10-23): a press and hold on a widget, «Modifica la disposizione» and a widget just added
  // begin it with a widget selected; a tap outside the widgets and the free cells, Esc, «Fine» and
  // the removal of the widget end it. The page overview is the exception: it edits the pages. ──
  /** The widget that had the focus last: «Modifica la disposizione» starts on it. */
  const lastFocusedWidget = useRef<WidgetRef | null>(null);
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const widget =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-widget-id]')
          : null;
      const pageId = widget?.closest<HTMLElement>('[data-launcher-page]')?.dataset.launcherPage;
      if (widget?.dataset.widgetId && pageId) {
        lastFocusedWidget.current = { pageId, widgetId: widget.dataset.widgetId };
      }
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);
  /** The widget edit mode starts on without a finger: the focused one of the page, else the first. */
  const defaultEditTarget = useCallback((): WidgetRef | null => {
    const page = addTargetPageId ? controller.findPage(addTargetPageId) : undefined;
    if (!page) return null;
    const ids = idsByPosition(pagePlacements(page, controller.classFor(page.id))).filter(
      (id) => !hiddenCheck(page.id, id)
    );
    const focused = lastFocusedWidget.current;
    const widgetId =
      focused?.pageId === page.id && ids.includes(focused.widgetId) ? focused.widgetId : ids[0];
    return widgetId ? { pageId: page.id, widgetId } : null;
  }, [addTargetPageId, controller, hiddenCheck]);

  const enterEditMode = useCallback(
    (target?: WidgetRef) => {
      if (controller.editMode) return;
      if (controller.layout.locked) {
        lockedNotice.current();
        return;
      }
      const chosen = target ?? defaultEditTarget();
      if (!chosen) {
        announce(NO_WIDGET_TO_EDIT);
        return;
      }
      // The commands with no face go out of the way: a focus they had goes to the widget.
      const fromCommands = Boolean(document.activeElement?.closest('.aca-screen-commands'));
      setEditMode(true);
      select(chosen.pageId, chosen.widgetId);
      if (fromCommands) requestFocus(chosen.pageId, chosen.widgetId);
      announce(EDIT_MODE_ANNOUNCEMENT);
    },
    [
      controller.editMode,
      controller.layout.locked,
      defaultEditTarget,
      setEditMode,
      select,
      requestFocus,
      announce,
    ]
  );

  // Without a widget selected there is nothing to edit: the selection taken away (a tap outside,
  // the removal of the widget) leads back to use; edit mode begun by someone else (the controller)
  // takes the widget `enterEditMode` would, or ends when the page has none. The overview keeps
  // no selection.
  const hadSelection = useRef(false);
  useEffect(() => {
    const had = hadSelection.current;
    hadSelection.current = Boolean(selected);
    if (!editMode) return;
    if (overview) {
      if (selected) selection.setSelected(null);
      return;
    }
    if (selected) return;
    // The widget just added from the pages view is about to be selected (the reveal above).
    if (reveal) return;
    if (had) {
      setEditMode(false);
      return;
    }
    const target = defaultEditTarget();
    if (target) select(target.pageId, target.widgetId);
    else setEditMode(false);
  }, [editMode, overview, selected, reveal, selection, setEditMode, defaultEditTarget, select]);

  // «Modifica le pagine» in Sistema turns edit mode on while the launcher is hidden (its live
  // region is silent then): say the same words once the launcher is back on screen (ADR-0016, C3).
  const editModeWhenHidden = useRef<boolean | null>(null);
  useEffect(() => {
    if (!screenVisible) {
      editModeWhenHidden.current ??= editMode;
      return;
    }
    if (editModeWhenHidden.current === false && editMode) {
      announce(overview ? OVERVIEW_ANNOUNCEMENT : EDIT_MODE_ANNOUNCEMENT);
      // The keyboard lands in the editor of the pages: on the name of the page in the centre, in
      // the bar of the pages (on the cover, which has none, on its card). A finger leaves it alone.
      if (overview) {
        afterNextFrame(() =>
          (
            document.querySelector<HTMLElement>('.aca-page-overview [data-page-rename]') ??
            document.querySelector<HTMLElement>('.aca-pager__page.is-current .aca-pager__open')
          )?.focus()
        );
      }
    }
    editModeWhenHidden.current = null;
  }, [screenVisible, editMode, overview, announce]);

  /**
   * Pages as cards, the status bar down, the indicator down and the bar of the pages up (a press
   * and hold on an empty place, or «Modifica le pagine» in Sistema). A tap on a card, «Fine» and
   * Esc end it together with edit mode.
   */
  const openOverview = useCallback(() => {
    if (controller.layout.locked) {
      lockedNotice.current();
      return;
    }
    if (!controller.editMode) setEditMode(true);
    selection.setSelected(null);
    setOverview(true);
    announce(OVERVIEW_ANNOUNCEMENT);
  }, [
    controller.editMode,
    controller.layout.locked,
    setEditMode,
    setOverview,
    announce,
    selection,
  ]);

  /*
   * Press and hold of half a second (REP-20261008-001, REP-20261007-028). On the empty part of a
   * page (a free cell, the background, the cover) nothing changes while it is held: the press
   * counter (useLongPress) runs, and only when it reaches the long-press threshold the page
   * shrinks (the overview animation) and the page overview opens; a shorter press shows nothing
   * on the page (a tap on a «+» has its own cue on the cell, WidgetGrid). From the overview a tap
   * on a page edits it. On the body of a widget in
   * use (never a command: buttons, sliders, knobs and stacks that scroll keep the touch) it enters
   * edit mode with that widget selected, so its grip frame is there, and lifted under the same
   * finger: if the finger moves without leaving the screen the widget goes with it (liftWidget).
   * Nothing shrinks under a widget, and nothing is swallowed on its commands. This is the 0.9.21
   * behaviour the request of 2026-10-21 restores (annotation of REP-20261021-003). In edit mode
   * the widgets lift through their own handle (useWidgetDrag). The request of 2026-10-23 (0.9.28)
   * moved the shrink of the page from the whole hold to the moment of the threshold.
   */
  /** The widget under a press, with its page: null on the empty part. */
  const pressedWidget = (target: EventTarget | null) => {
    const element = target instanceof Element ? target : null;
    const widget = element?.closest<HTMLElement>('[data-widget-id]');
    const pageId = widget?.closest<HTMLElement>('[data-launcher-page]')?.dataset.launcherPage;
    const widgetId = widget?.dataset.widgetId;
    return widget && pageId && widgetId ? { element: widget, pageId, widgetId } : null;
  };
  const liftWidget = (info: LongPressInfo) => {
    const pressed = pressedWidget(info.target);
    const page = pressed ? controller.findPage(pressed.pageId) : undefined;
    const origin = page
      ? pagePlacements(page, controller.classFor(page.id))[pressed?.widgetId ?? '']
      : undefined;
    // Locked, edit mode does not open: the usual notice says where to unlock.
    if (!pressed || !origin || controller.layout.locked) {
      enterEditMode();
      return;
    }
    const widget = { pageId: pressed.pageId, widgetId: pressed.widgetId };
    const bounds = pressed.element.getBoundingClientRect();
    // The same finger drags it: from now on its touch does not scroll the page (and is not cancelled).
    holdTouchOnPage(info);
    // At once, not in a later task: the drag must listen before the finger can leave the
    // screen, or its release would be lost and the copy would stay up.
    flushSync(() => {
      enterEditMode(widget);
      drag.begin({
        mode: 'move',
        widgetId: pressed.widgetId,
        label: widgetName(pressed.pageId, pressed.widgetId),
        pageId: pressed.pageId,
        origin,
        box: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
        clientX: info.clientX,
        clientY: info.clientY,
        pointerId: info.pointerId,
        lifted: true,
      });
    });
  };
  const longPress = useLongPress({
    disabled: overview || Boolean(drag.session),
    onLongPress: (info) => {
      const target = info.target instanceof Element ? info.target : null;
      if (target?.closest(NO_LONG_PRESS)) return;
      if (target?.closest('[data-widget-id]')) liftWidget(info);
      else openOverview();
    },
  });
  const onPagerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    // A press outside the widgets and the free cells clears the selection of edit mode, which
    // then ends (a free cell moves the selected widget there). In the overview there is no
    // selection and the pager itself is the gap between the cards (the bands under the bars take
    // no press, REP-20261009-006): those presses change nothing.
    if (
      editMode &&
      !overview &&
      target !== event.currentTarget &&
      !target?.classList.contains('aca-pager__surface') &&
      !target?.closest('[data-widget-id], [data-launcher-cell]')
    ) {
      selection.setSelected(null);
    }
    if (target?.closest(NO_LONG_PRESS)) return;
    // The cards are going back and the pages settle: a press that begins now is ignored, held for as
    // long as it may be (REP-20261023-006, D-M18). The wait of the scene counts too.
    if (pagerBusy.current || isStaged(stage)) return;
    // On a command of a widget no timer starts: in use its commands are the person's (no lift,
    // no swallowed click). In edit mode a widget is moved by its handle (no second long press).
    // The body of a widget in use starts the press that lifts it.
    if (target?.closest('[data-widget-id]')) {
      if (editMode || target.closest(WIDGET_COMMAND)) return;
    }
    longPress.onPointerDown(event);
  };
  // Touch browsers open their menu (text, picture, link) on a long press: a widget in use keeps
  // none, like the cards of the overview. Fields keep theirs (paste); the rest is the long press.
  const onPagerContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!editMode && target?.closest('[data-widget-id]') && !target.closest(EDITABLE_FIELD)) {
      event.preventDefault();
      return;
    }
    longPress.onContextMenu(event);
  };

  // ── Details ──
  const detailsTarget = useMemo<DetailsTarget | null>(() => {
    if (!detailsWidgetId) return null;
    const shown = currentPageId ? controller.findPage(currentPageId) : undefined;
    const onCurrent = shown
      ? Boolean(pagePlacements(shown, controller.classFor(shown.id))[detailsWidgetId])
      : false;
    const pageId =
      (onCurrent ? currentPageId : null) ??
      controller.layout.pages.find((page) =>
        Object.values(page.placements).some((placements) => placements?.[detailsWidgetId])
      )?.id ??
      currentPageId ??
      firstWidgetPageId ??
      'home';
    return {
      widgetId: detailsWidgetId,
      pageId,
      settingsKey: controller.settingsKeyFor(pageId, detailsWidgetId),
      settings: controller.settingsFor(pageId, detailsWidgetId),
      title: widgetName(pageId, detailsWidgetId),
    };
  }, [detailsWidgetId, currentPageId, controller, firstWidgetPageId, widgetName]);

  // A definition with a console opens it in place of the sheet, from the rectangle of its widget.
  // Both stay mounted (with a null target when not theirs) so the one that closes can leave.
  const opensConsole = Boolean(
    detailsTarget && findDefinition(detailsTarget.widgetId, detailsTarget.settings)?.Console
  );
  const consolePageId = opensConsole ? detailsTarget?.pageId : undefined;
  const consoleWidgetId = opensConsole ? detailsTarget?.widgetId : undefined;
  const consoleOrigin = useMemo(
    () => (consolePageId && consoleWidgetId ? rectOf(consolePageId, consoleWidgetId) : undefined),
    [consolePageId, consoleWidgetId]
  );

  // ── Page overview: order, delete, add (REP-20261007-028) ──
  const coverFirst = entries[0]?.type === 'cover';
  const pageIds = entries.flatMap((entry) => (entry.type === 'page' ? [entry.key] : []));
  /**
   * Moves the page of `moved` to `target` of the pages shown without the other pages of its
   * family (movePageOrder) and says where it is now, or that nothing changed.
   */
  const placePage = useCallback(
    (moved: PagerEntry, target: number) => {
      if (moved.type !== 'page') return;
      const order = movePageOrder(controller.layout.pages, pageIds, moved.key, target);
      if (order.every((id, index) => id === controller.layout.pages[index]?.id)) {
        announce(`${moved.label}: posizione invariata.`);
        return;
      }
      controller.reorderPages(order);
      // The centre stays on its page: with no page chosen yet it would follow the main page,
      // which the new order may change, and the name in the bar would then belong to another.
      if (current?.type === 'page') controller.goToPageId(current.key);
      const position = order.filter((id) => pageIds.includes(id)).indexOf(moved.key);
      announce(
        `${moved.label}: posizione ${position + (coverFirst ? 2 : 1)} di ${entries.length}.`
      );
    },
    // pageIds follows entries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, current, controller, coverFirst, announce]
  );
  const reorderTo = useCallback(
    (from: number, to: number) => {
      const moved = entries[from];
      if (moved?.type !== 'page') return;
      // `to` counts every card; placePage counts the pages without the cover and the rest of the
      // family of the moved page: the cards before the drop that are neither.
      const root = moved.page.continuationOf ?? moved.key;
      const target = entries
        .filter((_, index) => index !== from)
        .slice(0, to)
        .filter(
          (entry) => entry.type === 'page' && (entry.page.continuationOf ?? entry.key) !== root
        ).length;
      placePage(moved, target);
    },
    [entries, placePage]
  );
  /**
   * Where a page lands with its family one step before or after (E7): past the whole family
   * next to it, as movePageOrder keeps families together; null when there is none that side.
   */
  const familyStep = (key: string, direction: -1 | 1): number | null => {
    const rootOf = (id: string) => controller.findPage(id)?.continuationOf ?? id;
    const root = rootOf(key);
    const shown = pageIds.filter((id) => id === key || rootOf(id) !== root);
    const at = shown.indexOf(key);
    const neighbour = at < 0 ? undefined : shown[at + direction];
    if (neighbour === undefined) return null;
    const other = rootOf(neighbour);
    const span = shown.flatMap((id, index) => (rootOf(id) === other ? [index] : []));
    return (direction < 0 ? span[0] : span[span.length - 1]) ?? null;
  };
  /** Why a page cannot move one step that way, or null when it can. */
  const moveBlocked = (key: string, direction: -1 | 1): string | null => {
    if (familyStep(key, direction) !== null) return null;
    const page = controller.findPage(key);
    const root = page?.continuationOf ?? key;
    const family = controller.layout.pages.filter(
      (item) => (item.continuationOf ?? item.id) === root
    ).length;
    if (family > 1) {
      return direction < 0
        ? 'Con le sue pagine di seguito è già all’inizio.'
        : 'Con le sue pagine di seguito è già in fondo.';
    }
    if (direction > 0) return 'È già l’ultima pagina.';
    return coverFirst ? 'La copertina resta sempre la prima pagina.' : 'È già la prima pagina.';
  };
  /** Distance between two cards of the overview, as the pager measured it. */
  const pitchOf = () => overviewPitchOf(pagerRef.current) || pagerRef.current?.clientWidth || 1;
  /**
   * The overview does not scroll: a card dragged to its edge turns the centre by one card, and
   * the drag counts the cards it has passed (usePageDrag) as it counted the scroll before.
   */
  const dragCentre = useRef(currentPage);
  useEffect(() => {
    dragCentre.current = currentPage;
  }, [currentPage]);
  /**
   * Why an action of the page editor cannot be taken: in the notice pill and read aloud. A change
   * that can still be undone keeps the pill and its «Annulla»: the reason is only read aloud.
   */
  const undoable = Boolean(undo?.layout);
  const tellBlocked = useCallback(
    (reason: string) => {
      if (!undoable) notify(reason);
      announce(reason);
    },
    [undoable, notify, announce]
  );
  // A widget took the configuration kept for its device (ADR-0019): said in the notice pill (an
  // undoable change keeps its pill) and read aloud.
  const memoryNotice = widgetMemoryNotice;
  const noticeSeen = useRef(memoryNotice?.seq ?? 0);
  useEffect(() => {
    if (!memoryNotice || memoryNotice.seq === noticeSeen.current) return;
    noticeSeen.current = memoryNotice.seq;
    const friendly = runtime.entities[memoryNotice.deviceKey]?.attributes?.friendly_name;
    const from =
      memoryNotice.label || (typeof friendly === 'string' && friendly) || 'un altro widget';
    const message = `Impostazioni riprese da “${from}”`;
    if (!undoable) notify(message);
    announce(message);
  }, [memoryNotice, runtime.entities, undoable, notify, announce]);
  /** A name of the overview is being edited: the cards hold still and do not lift. */
  const [renaming, setRenaming] = useState(false);
  /**
   * Pages that hold the pager still while they use the swipe themselves (the Casa 3D page in
   * Esplora, ADR-0014): the count feeds the same `locked` a dragged widget uses.
   */
  const [pageLocks, setPageLocks] = useState(0);
  const holdPager = useCallback(
    (hold: boolean) => setPageLocks((count) => Math.max(0, count + (hold ? 1 : -1))),
    []
  );
  const pageDrag = usePageDrag({
    count: entries.length,
    minIndex: coverFirst ? 1 : 0,
    getPitch: pitchOf,
    getScroll: () => dragCentre.current * pitchOf(),
    scrollBy: (pixels) => {
      const turned = dragCentre.current + Math.round(pixels / pitchOf());
      dragCentre.current = Math.max(0, Math.min(entries.length - 1, turned));
      goToPage(dragCentre.current);
    },
    getBounds: () => {
      const box = pagerRef.current?.getBoundingClientRect();
      return box ? { left: box.left, right: box.right } : null;
    },
    onDrop: reorderTo,
    canMove: (index) => entries[index]?.type === 'page',
    onLift: (index) =>
      announce(
        `${entries[index]?.label ?? ''} sollevata: trascinala a destra o a sinistra e lasciala.`
      ),
    onRefuse: () => tellBlocked('La copertina resta sempre la prima pagina.'),
    disabled: renaming,
  });

  const currentEntry = entries[currentPage];
  const currentLayoutPage = currentEntry?.type === 'page' ? currentEntry.page : null;
  const onCover = currentEntry?.type === 'cover';
  const overviewWidgets = currentLayoutPage
    ? Object.keys(pagePlacements(currentLayoutPage, controller.classFor(currentLayoutPage.id)))
        .length
    : 0;
  const isMain = Boolean(currentLayoutPage) && currentLayoutPage?.id === mainPageId;
  const deleteBlocked = !currentLayoutPage
    ? 'La copertina non si elimina: puoi nasconderla.'
    : controller.canRemovePage(currentLayoutPage.id)
      ? null
      : isMain
        ? 'La pagina principale non si elimina: prima scegline un’altra con la casa.'
        : 'Serve almeno una pagina.';
  const homeBlocked = !currentLayoutPage
    ? 'La copertina non può essere la pagina principale.'
    : currentLayoutPage.kind !== 'widgets'
      ? 'Solo una pagina di widget può essere la principale.'
      : currentLayoutPage.hidden
        ? 'Una pagina nascosta non può essere la principale.'
        : null;
  const currentHidden = onCover
    ? !controller.layout.cover.enabled
    : Boolean(currentLayoutPage?.hidden);
  /**
   * The card of a page being deleted shrinks and fades before the row closes (REP-20261023-006,
   * D-M24): the removal is committed once the card is gone, and the cards at its right then close
   * the gap. Without a measured pager, or with reduced motion, it goes at once.
   */
  const [leavingPage, setLeavingPage] = useState<string | null>(null);
  // Cancels the wait for the end of the exit (frames, then the time of the exit).
  const leaveTimer = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      leaveTimer.current?.();
    },
    []
  );
  const removePageNow = useRef<(id: string, neighbourKey: string | null, label: string) => void>(
    () => undefined
  );
  removePageNow.current = (id, neighbourKey, label) => {
    setLeavingPage(null);
    rememberRemovedPage(id);
    controller.removePage(id);
    if (neighbourKey) controller.goToPageId(neighbourKey);
    announce(`Pagina ${label} eliminata.`);
  };
  const deleteCurrentPage = () => {
    if (!currentLayoutPage || deleteBlocked || leavingPage) return;
    const neighbour = entries[currentPage + 1] ?? entries[currentPage - 1];
    const id = currentLayoutPage.id;
    const neighbourKey = neighbour?.type === 'page' ? neighbour.key : null;
    const label = currentEntry?.label ?? '';
    if (!(overview && pagerReady && !reducedMotion)) {
      removePageNow.current(id, neighbourKey, label);
      return;
    }
    setLeavingPage(currentEntry?.key ?? null);
    // The exit is counted from the frame that draws it, not from the click: the commit of the
    // state that starts it must not eat into the time of the exit (P1).
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cancelFrames = afterNextFrame(() => {
      timer = setTimeout(() => {
        leaveTimer.current = null;
        removePageNow.current(id, neighbourKey, label);
      }, CARD_EXIT_MS);
    });
    leaveTimer.current = () => {
      cancelFrames();
      if (timer) clearTimeout(timer);
      leaveTimer.current = null;
    };
  };
  /**
   * A new empty page of widgets (REP-20261009-002, D1) after the page in the centre and its
   * continuations; from the cover, at the end. The ready pages come with the kits, later.
   */
  const addPageAfterCurrent = (categoryId?: string) => {
    if (categoryId === 'tutte') {
      for (const category of WIDGET_CATEGORIES) {
        controller.addPage({ label: category.label, kind: 'widgets', category: category.id });
      }
      setCategoryPageOpen(false);
      announce('Aggiunte le sette categorie con tutti i widget.');
      return;
    }
    const root = currentLayoutPage?.continuationOf ?? currentLayoutPage?.id;
    const family = root
      ? controller.layout.pages.filter((page) => (page.continuationOf ?? page.id) === root)
      : [];
    const after = family[family.length - 1]?.id;
    const category = WIDGET_CATEGORIES.find((item) => item.id === categoryId);
    controller.addPage(
      {
        label: category?.label ?? PAGE_KIND_LABEL.widgets,
        kind: 'widgets',
        category: category?.id,
      },
      after
    );
    setCategoryPageOpen(false);
    announce(
      category
        ? `Pagina ${category.label} aggiunta con i widget da collegare.`
        : 'Nuova pagina vuota aggiunta. Tocca il nome in basso per cambiarlo.'
    );
  };
  /**
   * «Aggiungi widget» of the bar (2026-10-23): the way in on a full page and on the cover, which
   * have no free cell. Why it cannot be used for the page in the centre, or null when it can.
   */
  const addWidgetBlocked = controller.layout.locked
    ? 'Disposizione bloccata: sbloccala in Sistema → Schermata Home.'
    : !currentDescriptor?.acceptsWidgets
      ? onCover
        ? 'La copertina non accetta widget per ora.'
        : 'Questa pagina non ha celle per i widget: scegli una pagina di widget.'
      : currentHidden
        ? onCover
          ? 'La copertina è nascosta: mostrala per aggiungere widget.'
          : 'La pagina è nascosta: mostrala per aggiungere widget.'
        : null;
  const addWidgetToCurrentPage = () => {
    if (addWidgetBlocked) {
      tellBlocked(addWidgetBlocked);
      return;
    }
    if (currentDescriptor?.acceptsWidgets) openAddWidgetAhead(currentDescriptor.page.id);
  };
  const toggleCurrentHidden = () => {
    const name = currentEntry?.label ?? '';
    if (onCover) {
      controller.setCoverEnabled(currentHidden);
    } else if (currentLayoutPage) {
      controller.updatePage(currentLayoutPage.id, { hidden: !currentHidden });
    } else return;
    announce(
      currentHidden
        ? `${name} di nuovo visibile.`
        : `${name} nascosta: non compare scorrendo le pagine.`
    );
  };
  /**
   * A tap on a card goes back to that page in use (REP-20261021-003, annotation of 2026-10-23):
   * the overview closes with edit mode, no bar and nothing shaking.
   */
  const openFromOverview = (index: number) => {
    if (pageDrag.justDropped()) return;
    const entry = entries[index];
    // A page that is off (the cover, a hidden page) has no place outside the overview: it would
    // open another one. It comes to the centre, where «Mostra» of the bar shows it again.
    if (
      (entry?.type === 'cover' && entry.hidden) ||
      (entry?.type === 'page' && entry.page.hidden)
    ) {
      goToPage(index);
      tellBlocked(
        entry.type === 'cover'
          ? 'La copertina è nascosta: tocca Mostra per rivederla.'
          : 'La pagina è nascosta: tocca Mostra per rivederla.'
      );
      return;
    }
    goToPage(index);
    setEditMode(false);
    announce(`Pagina ${entry?.label ?? ''}.`);
    // The opener goes with the overview: a focus left on nothing goes to «Modifica la
    // disposizione», the command with no face, as after «Fine». The frame after the next one
    // (ISSUE-109, R7), when the style is clean.
    afterNextFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body) return;
      document.querySelector<HTMLElement>('[data-launcher-edit]')?.focus();
    });
  };
  const moveCard = (index: number, direction: -1 | 1) => {
    const entry = entries[index];
    if (entry?.type === 'cover') tellBlocked('La copertina resta sempre la prima pagina.');
    if (entry?.type !== 'page') return;
    const target = familyStep(entry.key, direction);
    if (target === null) {
      tellBlocked(moveBlocked(entry.key, direction) ?? '');
      return;
    }
    placePage(entry, target);
  };

  // ── Columns of a page (REP-20261008-001, U7, C.6) ──
  /**
   * A choice of columns just made: read aloud once the new grid is there. `pageId` is the first
   * page of the family, `cardId` the card it was made on (a continuation may go away with it).
   */
  const columnsChange = useRef<{
    pageId: string;
    cardId: string;
    name: string;
    layout: LauncherLayout;
    widgets: number;
  } | null>(null);
  /** Widgets on the first page of the family of `pageId` on this screen. */
  const familyWidgets = useCallback(
    (pageId: string) => {
      const page = controller.findPage(pageId);
      const rootId = page?.continuationOf ?? page?.id;
      const root = rootId ? controller.findPage(rootId) : undefined;
      return root ? Object.keys(pagePlacements(root, controller.classFor(root.id))).length : 0;
    },
    [controller]
  );
  useEffect(() => {
    const change = columnsChange.current;
    if (!change || change.layout === controller.layout) return;
    columnsChange.current = null;
    // The continuation in the centre emptied and went away: its family takes the centre.
    if (change.cardId !== change.pageId && !controller.findPage(change.cardId)) {
      controller.goToPageId(change.pageId);
    }
    const grid = controller.gridFor(change.pageId);
    const moved = change.widgets - familyWidgets(change.pageId);
    const next = controller.layout.pages.find((item) => item.continuationOf === change.pageId);
    const rows = grid.h === 1 ? '1 riga' : `${grid.h} righe`;
    announce(
      `${change.name}: ${grid.w} colonne e ${rows}.${
        moved > 0 && next
          ? ` ${moved} widget ${moved === 1 ? 'spostato' : 'spostati'} in ${displayLabel(next.label)}.`
          : ''
      }`
    );
  }, [controller, familyWidgets, announce]);
  /**
   * The columns selector of a page of widgets or of the cover: the columns shown on this screen
   * (columnsOn), one step each way within the limits of the screen; the choice is stored as the
   * columns it shows on a landscape screen (columnsToStore).
   */
  const columnsOf = (
    pageId: string,
    name: string,
    { kind, familyRootId, columns }: PageDescriptor
  ): CardColumns => {
    const cover = kind === 'cover';
    const base = baseClassOf(controller.deviceClass);
    const grid = controller.gridFor(pageId);
    const least = columnsOn(base, columns.minSaved);
    const most = columnsOn(base, COLUMNS_RANGE.max);
    const roomless = 'Servono più colonne per i suoi widget.';
    const allowed = (shown: number) =>
      controller.columnsAllowed(pageId, columnsToStore(base, shown));
    return {
      shown: grid.w,
      rows: grid.h,
      less:
        grid.w <= least
          ? cover
            ? roomless
            : 'Minimo su questo schermo.'
          : allowed(grid.w - 1)
            ? null
            : roomless,
      more: grid.w >= most ? 'Massimo su questo schermo.' : allowed(grid.w + 1) ? null : roomless,
      onStep: (direction) => {
        const before = controller.layout;
        // The choice belongs to the family: said with the name of its first page.
        const rootId = familyRootId;
        const rootName = entries.find((entry) => entry.key === rootId)?.label ?? name;
        columnsChange.current = {
          pageId: rootId,
          cardId: pageId,
          name: rootName,
          layout: before,
          widgets: familyWidgets(rootId),
        };
        controller.updatePage(pageId, { columns: columnsToStore(base, grid.w + direction) });
        setUndo({
          message: `${rootName}: ${grid.w + direction} colonne`,
          layout: before,
          undone: `Colonne di ${rootName} come prima.`,
        });
        if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
      },
    };
  };
  /** The row under the card in the centre of the overview: arrows and columns. */
  const cardFooter = (index: number) => {
    const descriptor = descriptors[index];
    if (!descriptor) return null;
    const name = descriptor.label;
    return (
      <PageCardControls
        name={name}
        move={
          descriptor.kind === 'cover'
            ? undefined
            : {
                before: moveBlocked(descriptor.key, -1),
                after: moveBlocked(descriptor.key, 1),
                onMove: (direction) => moveCard(index, direction),
              }
        }
        columns={
          descriptor.acceptsWidgets ? columnsOf(descriptor.page.id, name, descriptor) : undefined
        }
        onBlocked={tellBlocked}
      />
    );
  };

  // ── Bar of the selected widget (REP-20261007-029) ──
  const widgetBar = editMode && !overview && Boolean(selected);
  // What the bars and the indicator show while the scene is staged is the look they had (D-M25):
  // HeldByStage keeps it, and gives the new one when the wait ends.
  // Tab from the selected widget: to «Rimuovi», the first control of its bar.
  const focusWidgetBar = useCallback(() => {
    document
      .querySelector<HTMLElement>('.aca-widget-actions [data-widget-action="remove"]')
      ?.focus();
  }, []);
  // Canc removes at once, as the trash does; «Annulla» puts it back.
  const requestRemove = useCallback(
    (pageId: string, widgetId: string) => removeLeaving(pageId, widgetId),
    [removeLeaving]
  );
  const clearSelection = useCallback(() => selection.setSelected(null), [selection]);
  /**
   * A free cell touched with a widget selected on its page (E2): the widget moves there, the
   * others make room as for a drop; it stays selected and «Annulla» puts it back.
   */
  const moveSelectedTo = useCallback(
    (pageId: string, cell: Pick<CellRect, 'x' | 'y'>) => {
      // Read from the store when a cell is touched, not from the render: `ui` does not change
      // with the selection (ISSUE-109, R5a).
      const chosen = selection.selected();
      const page = controller.findPage(pageId);
      if (!chosen || chosen.pageId !== pageId || !page) return;
      const { widgetId } = chosen;
      const placements = pagePlacements(page, controller.classFor(pageId));
      const placement = placements[widgetId];
      if (!placement) return;
      const grid = controller.gridFor(pageId);
      const rect = {
        x: Math.max(0, Math.min(cell.x, grid.w - placement.w)),
        y: Math.max(0, Math.min(cell.y, grid.h - placement.h)),
        w: placement.w,
        h: placement.h,
      };
      const preview = tryMoveWithReflow(
        placements,
        grid,
        widgetId,
        rect,
        (id) => controller.sizesFor(pageId, id)?.min
      );
      if (preview && controller.moveWidget(pageId, widgetId, rect)) {
        const shrunk = shrunkText(pageId, placements, preview, widgetId);
        announce(`${widgetName(pageId, widgetId)} spostato: ${describeRect(rect)}.${shrunk}`);
        // The cell pressed is taken now: the focus follows the widget.
        requestFocus(pageId, widgetId);
      } else reject(widgetId, 'Non c’è spazio lì.');
    },
    [controller, selection, shrunkText, widgetName, announce, reject, requestFocus]
  );
  /** Maiusc + Tab on «Rimuovi»: back to the selected widget (false: Tab goes on as usual). */
  const focusSelected = () =>
    selected ? takesFocus(handleOf(selected.pageId, selected.widgetId)) : false;
  /**
   * Tab on «Fine»: the next widget of the page in reading order, else its free cells. With
   * neither (a full page), or on a page out of view, false: Tab goes on as usual.
   */
  const focusAfterSelected = () => {
    const page = selected ? controller.findPage(selected.pageId) : undefined;
    if (!selected || !page) return false;
    const ids = idsByPosition(pagePlacements(page, controller.classFor(page.id)));
    const next = ids[ids.indexOf(selected.widgetId) + 1];
    return takesFocus(
      (next ? handleOf(page.id, next) : null) ??
        document.querySelector<HTMLElement>(cellSelector(page.id))
    );
  };

  // ── Gear, top bar and commands with no face (ADR-0016, C1-C3) ──
  const pageCount = entries.length;
  const connectionProblem = connection.phase === 'error';
  const editHint = useEditHint(screenVisible && !editMode && !controller.layout.locked && !undo);
  const stepPage = useCallback(
    (direction: -1 | 1) => {
      const next = currentPage + direction;
      if (next < 0 || next >= pageCount) return;
      goToPage(next);
      announce(pageValueText(next, pageCount, entries[next]?.label));
    },
    [currentPage, pageCount, goToPage, announce, entries]
  );

  // A tap on a dot of the indicator lands on a far page at once (ISSUE-109, R10; user answer D-2):
  // the pager takes the request when the index arrives. The edge of a drag and «Annulla» go
  // through goToPage and goToPageId, and glide.
  const dotJump = useRef<number | null>(null);
  const goToPageFromDot = useCallback(
    (index: number) => {
      dotJump.current = index === currentPage ? null : index;
      goToPage(index);
    },
    [currentPage, goToPage]
  );

  const ui = useMemo<LauncherUi>(
    () => ({
      controller,
      findDefinition,
      announce,
      registerGrid,
      beginDrag: drag.begin,
      justDropped: drag.justDropped,
      selection,
      reject,
      requestFocus,
      takeFocusRequest,
      moveToAdjacentPage,
      hasAdjacentPage,
      stepWidget,
      removeWidget,
      openWidgetSettings,
      openAddWidget,
      widgetName,
      isWidgetHidden: hiddenCheck,
      select,
      clearSelection,
      tapWidget,
      moveSelectedTo,
      focusWidgetBar,
      requestRemove,
    }),
    [
      controller,
      findDefinition,
      announce,
      registerGrid,
      drag.begin,
      drag.justDropped,
      selection,
      reject,
      requestFocus,
      takeFocusRequest,
      moveToAdjacentPage,
      hasAdjacentPage,
      stepWidget,
      removeWidget,
      openWidgetSettings,
      openAddWidget,
      widgetName,
      hiddenCheck,
      select,
      clearSelection,
      tapWidget,
      moveSelectedTo,
      focusWidgetBar,
      requestRemove,
    ]
  );

  // The page whose turn the finger arms at an edge: its grid drops the «+» before it comes (W1).
  const edgePageId =
    drag.session && drag.edgeSide !== 0
      ? (adjacentWidgetPage(currentPage, drag.edgeSide)?.page?.id ?? null)
      : null;

  const pages: PagerPage[] = descriptors.map((descriptor) => ({
    key: descriptor.key,
    label: descriptor.label,
    hidden: descriptor.hidden,
    main: descriptor.main,
    content: <PageShell descriptor={descriptor} editMode={editMode} />,
  }));

  const sheetPageId = sheet ? sheet.pageId : '';
  const sheetWidgetId = sheet?.type === 'widget' ? sheet.widgetId : '';

  return (
    <LauncherProvider value={live}>
      <WidgetRuntimeProvider value={runtime}>
        <AddWidgetRequestProvider value={requestAddWidget}>
        <DiscoveredFlowProvider value={DiscoveredAddFlow}>
        <LauncherUiContext.Provider value={ui}>
          <LauncherDragContext.Provider value={drag.session}>
            <LauncherEdgePageContext.Provider value={edgePageId}>
            <LauncherPressContext.Provider value={drag.pressing}>
              <AppShell
                editMode={editMode}
                notice={notice}
                gear={
                  <SystemGear
                    onOpenSystem={onOpenSystem}
                    updateCount={updateCount}
                    connectionProblem={connectionProblem}
                    inert={Boolean(drag.session)}
                  />
                }
                commands={
                  <ScreenCommands
                    hidden={editMode || overview}
                    canGoBack={currentPage > 0}
                    canGoForward={currentPage < pageCount - 1}
                    onEdit={() => enterEditMode()}
                    onPrevious={() => stepPage(-1)}
                    onNext={() => stepPage(1)}
                  />
                }
                top={
                  <HeldByStage stage={stage} value={{ editMode, overview }}>
                    {(held) => (
                      <FlashingPageIndicator
                        labels={entries.map((entry) => entry.label)}
                        index={currentPage}
                        onChange={goToPageFromDot}
                        pageKey={current?.key}
                        editMode={held.editMode}
                        overview={held.overview}
                        yieldToUndo={Boolean(undo?.message)}
                      />
                    )}
                  </HeldByStage>
                }
                footer={
                  <>
                    <HeldByStage stage={stage} value={widgetBar}>
                      {(bar) => (
                        <WidgetActionBar
                          hidden={!bar}
                          name={selected ? widgetName(selected.pageId, selected.widgetId) : ''}
                          changed={
                            Boolean(selectedFrom.current) &&
                            selectedFrom.current?.layout !== controller.layout
                          }
                          onDone={() => {
                            // Keeps the changes and leaves edit mode at once (REP-20261013-001).
                            selection.setSelected(null);
                            finishEditing();
                          }}
                          onUndo={() => {
                            const from = selectedFrom.current;
                            if (from) {
                              controller.restoreLayout(from.layout);
                              // Moved to another page: back on the page it was picked from.
                              selection.setSelected((now) =>
                                now ? { ...now, pageId: from.pageId } : now
                              );
                              if (from.pageId !== currentPageId) controller.goToPageId(from.pageId);
                            }
                            announce('Il widget torna com’era.');
                          }}
                          onRemove={() => {
                            if (selected) removeLeaving(selected.pageId, selected.widgetId);
                          }}
                          drop={
                            drag.session?.mode === 'move'
                              ? drag.session.removing
                                ? 'armed'
                                : 'ready'
                              : 'none'
                          }
                          groupRef={barGroupRef}
                          onTabBack={focusSelected}
                          onTabForward={focusAfterSelected}
                        />
                      )}
                    </HeldByStage>
                    <HeldByStage stage={stage} value={overview}>
                      {(shown) => (
                        <PageOverviewBar
                          hidden={!shown}
                          // The value held for the scene, as the class of the pager and the one of
                          // the indicator: the bar waits for its place in the sequence by this class
                          // and not by a `:has()` on the main area (edit.css).
                          overview={shown}
                          pageName={currentEntry?.label ?? ''}
                          widgetCount={overviewWidgets}
                          deleteBlocked={deleteBlocked}
                          isHome={isMain}
                          homeBlocked={homeBlocked}
                          isHidden={currentHidden}
                          hideBlocked={
                            isMain
                              ? 'La pagina principale non si nasconde: prima scegline un’altra con la casa.'
                              : null
                          }
                          onSetHome={() => {
                            if (!currentLayoutPage || homeBlocked) return;
                            controller.setLayoutOptions({ homePageId: currentLayoutPage.id });
                            announce(`${currentEntry?.label ?? ''} è ora la pagina principale.`);
                          }}
                          onDelete={deleteCurrentPage}
                          onToggleHidden={toggleCurrentHidden}
                          onAdd={() => setCategoryPageOpen(true)}
                          onAddWidget={addWidgetToCurrentPage}
                          addWidgetBlocked={addWidgetBlocked}
                          onRename={
                            currentLayoutPage
                              ? (label) => {
                                  controller.updatePage(currentLayoutPage.id, { label });
                                  announce(`Nome cambiato: ${displayLabel(label)}.`);
                                }
                              : undefined
                          }
                          onRenameCancel={() => announce('Nome invariato.')}
                          onEmptyName={tellBlocked}
                          onNameError={announce}
                          onEditingChange={setRenaming}
                          onMove={(direction) => moveCard(currentPage, direction)}
                          onBlocked={tellBlocked}
                          onDone={() => {
                            setOverview(false);
                            finishEditing();
                          }}
                        />
                      )}
                    </HeldByStage>
                  </>
                }
              >
                <PageLockContext.Provider value={holdPager}>
                  <Pager
                    pages={pages}
                    index={currentPage}
                    onIndexChange={goToPage}
                    locked={
                      Boolean(drag.session) || Boolean(pageDrag.state) || renaming || pageLocks > 0
                    }
                    // A resize never turns a page (useWidgetDrag): only a move or an add does.
                    dragging={drag.session != null && drag.session.mode !== 'resize'}
                    dotJump={dotJump}
                    overview={overview}
                    stage={stage}
                    onReadyChange={setPagerReady}
                    busyRef={pagerBusy}
                    leavingKey={leavingPage}
                    onOpen={openFromOverview}
                    onCardPointerDown={(index, event) =>
                      pageDrag.begin(index, event.pointerId, event.clientX, event.clientY)
                    }
                    pressingCard={pageDrag.pressing}
                    onMoveCard={moveCard}
                    cardFooter={cardFooter}
                    cardDrag={pageDrag.state}
                    reducedMotion={reducedMotion}
                    containerRef={(node) => {
                      pagerRef.current = node;
                    }}
                    onPointerDown={onPagerPointerDown}
                    onPointerMove={longPress.onPointerMove}
                    onPointerUp={longPress.onPointerUp}
                    onPointerCancel={longPress.onPointerCancel}
                    onContextMenu={onPagerContextMenu}
                  />
                </PageLockContext.Provider>
                {/*
                  In the area of the pages, under the safe area and a connection notice, where the
                  pager keeps the room of the pill (REP-20261013-002, ADR-0013): after the pager
                  in the tab order, before the footer band.
                */}
                <UndoSnackbar
                  message={undo?.message ?? null}
                  onUndo={undo?.layout ? undoRemoval : undefined}
                  top={overview}
                />
                <EditHint
                  shown={editHint.shown}
                  text="Tieni premuto uno spazio vuoto per modificare le pagine, o un widget per spostarlo."
                  onDismiss={editHint.dismiss}
                />
              </AppShell>
            </LauncherPressContext.Provider>
            </LauncherEdgePageContext.Provider>

            {drag.session && drag.edgeSide !== 0 && (
              // The page on that side is about to come: an arrow glows on the edge.
              <div
                className={`aca-edge-hint aca-edge-hint--${drag.edgeSide < 0 ? 'left' : 'right'}`}
                aria-hidden="true"
              >
                <Icon name={drag.edgeSide < 0 ? 'chevronLeft' : 'chevronRight'} size="lg" />
              </div>
            )}
            {drag.session && <DragGhost session={drag.session} onFlightEnd={drag.flightEnded} />}
            <p id={EDIT_HELP_ID} className="sr-only">
              Invio per le impostazioni del widget. Frecce per spostarlo, Maiusc più frecce per
              ridimensionarlo, Canc per rimuoverlo, Tab per la sua barra, Esc per terminare la
              modifica.
            </p>
            <p id={CELL_HELP_ID} className="sr-only">
              Frecce per scegliere un’altra cella libera, Invio per aggiungere qui un widget o per
              spostarci quello selezionato.
            </p>
            <div className="sr-only" role="status" aria-live="polite">
              {announcement}
            </div>

            <DetailsSheet
              target={opensConsole ? null : detailsTarget}
              onClose={onCloseDetails}
              resolve={findDefinition}
            />
            <WidgetConsole
              target={opensConsole ? detailsTarget : null}
              origin={consoleOrigin}
              onClose={onCloseDetails}
              resolve={findDefinition}
            />

            <AddWidgetSheet
              open={sheet?.type === 'add'}
              onClose={closeAddSheet}
              pageId={sheetPageId || addTargetPageId || firstWidgetPageId || 'home'}
              initialType={sheet?.type === 'add' ? sheet.initialType : undefined}
              initialSelection={sheet?.type === 'add' ? sheet.initialSelection : undefined}
              autoAdd={sheet?.type === 'add' && sheet.auto === true}
              onAdded={(widgetId, size) => {
                const pageId =
                  addDestination.current ||
                  sheetPageId ||
                  addTargetPageId ||
                  firstWidgetPageId ||
                  'home';
                // The cell touched anchors every widget added to its page in this sheet; a
                // widget that went on to a new page (no room) leaves the others without it.
                const at = sheet?.type === 'add' && sheet.pageId === pageId ? sheet.at : undefined;
                // From the pages view no cell was touched: first free place of the page, else of
                // the next page with room, else of a new page at the end.
                const ahead = sheet?.type === 'add' && sheet.ahead === true;
                const placedOn = ahead
                  ? controller.placeWidgetAhead(pageId, widgetId, size, sheetPageId || pageId)
                  : controller.placeWidget(pageId, widgetId, size, at, sheetPageId || pageId);
                const settings = Boolean(placedOn) && opensSettingsAfterAdd(widgetId);
                // Dropped on a page: the exact place of the preview (the others make room).
                const rect = dropRect.current;
                dropRect.current = null;
                if (placedOn && rect && placedOn === pageId) {
                  controller.moveWidget(placedOn, widgetId, rect);
                }
                if (placedOn) {
                  addDestination.current = placedOn;
                  lastAdded.current = { pageId: placedOn, widgetId, settings };
                  // Mounted at the look it comes in from, released when the sheet has gone (D-M11).
                  beginEntering({ pageId: placedOn, widgetId }, 'added');
                  // Selected in edit mode once the sheets have closed (user request of 2026-10-23).
                  setReveal({ pageId: placedOn, widgetId });
                }
                let where = 'alla pagina';
                if (ahead && placedOn && placedOn !== pageId) {
                  // A page that is not in this render's layout yet is the new one at the end.
                  const label = controller.findPage(placedOn)?.label;
                  where = label
                    ? `alla pagina ${displayLabel(label)}, perché questa è piena`
                    : 'a una nuova pagina in fondo, perché le altre sono piene';
                }
                announce(`${widgetName(pageId, widgetId)} aggiunto ${where}.`);
                if (placedOn && settings) {
                  setSheet({ type: 'widget', pageId: placedOn, widgetId });
                }
              }}
            />
          </LauncherDragContext.Provider>
          <LauncherUiContext.Provider value={ui}>
            <StackSheet
              open={sheet?.type === 'stack'}
              onClose={closeSheet}
              pageId={sheet?.type === 'stack' ? sheet.pageId : ''}
              stackId={sheet?.type === 'stack' ? sheet.stackId : ''}
              placement={
                editMode && sheet?.type === 'stack' ? (
                  <WidgetPlacementSection
                    pageId={sheet.pageId}
                    widgetId={sheet.stackId}
                    onPageChange={followSheet}
                  />
                ) : undefined
              }
            />
          </LauncherUiContext.Provider>
          <CategoryPageSheet
            open={categoryPageOpen}
            onClose={() => setCategoryPageOpen(false)}
            onChoose={addPageAfterCurrent}
          />
          <WidgetSettingsSheet
            open={sheet?.type === 'widget'}
            onClose={closeSheet}
            widgetId={sheetWidgetId}
            settingsKey={
              sheet?.type === 'widget'
                ? controller.settingsKeyFor(sheet.pageId, sheet.widgetId)
                : ''
            }
            pageId={sheetPageId}
            placement={
              editMode && sheet?.type === 'widget' ? (
                <WidgetPlacementSection
                  pageId={sheet.pageId}
                  widgetId={sheet.widgetId}
                  onPageChange={followSheet}
                />
              ) : undefined
            }
          />
        </LauncherUiContext.Provider>
        </DiscoveredFlowProvider>
        </AddWidgetRequestProvider>
      </WidgetRuntimeProvider>
    </LauncherProvider>
  );
}
