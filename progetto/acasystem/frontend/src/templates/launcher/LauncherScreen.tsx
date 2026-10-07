import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { EditToolbar } from '@/components/system/edit/EditToolbar';
import { WidgetPositionControls } from '@/components/system/edit/WidgetPositionControls';
import { PageIndicator } from '@/components/system/page-indicator/PageIndicator';
import { StatusBar } from '@/components/system/status-bar/StatusBar';
import type { ConnectionState } from '@/components/system/status-bar/ConnectionStatus';
import { findWidgetDefinition } from '@/components/widgets/registry';
import type { CellRect, CellSize, WidgetRuntime } from '@/@types/launcher';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import type { LauncherController } from '@/hooks/launcher/useLauncherController';
import { useLongPress } from '@/hooks/launcher/useLongPress';
import { useNow } from '@/hooks/launcher/useNow';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useReducedMotion } from '@/hooks/launcher/useViewport';
import { useWidgetDrag, type DragSession, type GridGeometry } from '@/hooks/launcher/useWidgetDrag';
import { pagePlacements } from '@/utils/launcher/layout';
import { clampSize, idsByPosition } from '@/utils/launcher/grid';
import { describeRect, widgetDisplayName } from '@/utils/launcher/names';
import { displayLabel } from '@/utils/launcher/pageIdentity';
import type { StatusChip } from '@/utils/launcher/statusChips';
import { AppShell } from '../app-shell/AppShell';
import { AddWidgetSheet, PageSettingsSheet, WidgetSettingsSheet } from '../sheets';
import {
  DetailsSheet,
  hasDetails,
  type DefinitionResolver,
  type DetailsTarget,
} from './DetailsSheet';
import { DragGhost } from './DragGhost';
import {
  LauncherDragContext,
  LauncherUiContext,
  type KeyboardMode,
  type LauncherUi,
} from './LauncherUiContext';
import { PageKindHost } from './PageKindHost';
import { Pager, type PagerPage } from './Pager';
import { EDIT_HELP_ID } from './WidgetHost';
import { CELL_HELP_ID, WidgetGrid, cellSelector } from './WidgetGrid';
import './launcher.css';

export interface LauncherScreenProps {
  controller: LauncherController;
  runtime: WidgetRuntime;
  /** Content of the cover page (calendar and clock). */
  cover: ReactNode;
  connection: ConnectionState;
  chips: readonly StatusChip[];
  /** Messages under the status bar (connection lost, sign-in expired). */
  notice?: ReactNode;
  updateCount?: number;
  onOpenSystem: () => void;
  /** Widget whose details are open (set through runtime.openDetails), null when closed. */
  detailsWidgetId: string | null;
  onCloseDetails: () => void;
  /** Hidden cards and visibility conditions of the legacy settings. */
  isWidgetHidden?: (pageId: string, widgetId: string) => boolean;
  /** Definition lookup; the registry by default (the preview adds placeholder widgets). */
  findDefinition?: DefinitionResolver;
}

type SheetState =
  /** `at`: the free cell touched, where the new widget goes. */
  | { type: 'add'; pageId: string; at?: Pick<CellRect, 'x' | 'y'> }
  | { type: 'widget'; pageId: string; widgetId: string }
  | { type: 'page'; pageId: string | null }
  | null;

const NO_LONG_PRESS = 'input, select, textarea, [role="slider"], [data-no-long-press]';
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const REJECT_FLASH_MS = 900;

/**
 * Widgets that need their settings right after being added (the to-do list and the car have no
 * entity chosen while adding): their settings sheet opens next, as the legacy edit modal did.
 */
const SETTINGS_AFTER_ADD = ['todo_card_', 'car_card_'];
const opensSettingsAfterAdd = (widgetId: string) =>
  SETTINGS_AFTER_ADD.some((prefix) => widgetId.startsWith(prefix));

function isOverlayOpen() {
  if (typeof document === 'undefined') return false;
  if (document.querySelector('dialog[open]')) return true;
  try {
    return Boolean(document.querySelector(':popover-open'));
  } catch {
    return false;
  }
}

/**
 * The launcher screen: status bar, pager (cover, widget pages, special pages), indicator, edit
 * mode with dragging and keyboard, details and edit sheets. It gets the controller and the
 * widget runtime from the page, so the app and the development preview share it.
 */
export function LauncherScreen({
  controller,
  runtime,
  cover,
  connection,
  chips,
  notice,
  updateCount = 0,
  onOpenSystem,
  detailsWidgetId,
  onCloseDetails,
  isWidgetHidden,
  findDefinition = findWidgetDefinition,
}: LauncherScreenProps) {
  const reducedMotion = useReducedMotion();
  const now = useNow(60000, usePageVisible());
  const { editMode, entries, currentPage, currentPageId, setEditMode, goToPage } = controller;
  const current = entries[currentPage];

  // ── Announcements (aria-live) ──
  const [announcement, setAnnouncement] = useState('');
  const announce = useCallback((text: string) => {
    setAnnouncement('');
    setTimeout(() => setAnnouncement(text), 30);
  }, []);

  // ── Refused moves: error LED on the widget for a moment, and the reason read aloud ──
  const [rejectedId, setRejectedId] = useState<string | null>(null);
  const rejectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reject = useCallback(
    (widgetId: string, message: string) => {
      setRejectedId(widgetId);
      announce(message);
      if (rejectTimer.current) clearTimeout(rejectTimer.current);
      rejectTimer.current = setTimeout(() => setRejectedId(null), REJECT_FLASH_MS);
    },
    [announce]
  );
  useEffect(
    () => () => {
      if (rejectTimer.current) clearTimeout(rejectTimer.current);
    },
    []
  );

  // ── Names and visibility ──
  const widgetName = useCallback(
    (pageId: string, widgetId: string) => {
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

  /** Nearest widget page from `fromIndex` towards `direction` in the pager. */
  const adjacentWidgetPage = useCallback(
    (fromIndex: number, direction: -1 | 1) => {
      for (
        let index = fromIndex + direction;
        index >= 0 && index < entries.length;
        index += direction
      ) {
        const entry = entries[index];
        if (entry.type === 'page' && entry.page.kind === 'widgets') return { index, entry };
      }
      return null;
    },
    [entries]
  );

  const onDrop = useCallback(
    (session: DragSession) => {
      const target = session.target;
      // No target: released outside the grids or while a new page is settling.
      if (!target) {
        announce('Spostamento annullato.');
        return;
      }
      if (!target.valid) {
        reject(session.widgetId, 'Non c’è spazio lì: il widget torna al suo posto.');
        return;
      }
      let done: boolean;
      if (session.mode === 'resize') {
        const size: CellSize = { w: target.rect.w, h: target.rect.h };
        if (size.w === session.origin.w && size.h === session.origin.h) return;
        done = controller.resizeWidget(session.sourcePageId, session.widgetId, size);
        if (done) announce(`${session.label}: dimensione ${size.w} per ${size.h}.`);
      } else if (target.pageId === session.sourcePageId) {
        const same = target.rect.x === session.origin.x && target.rect.y === session.origin.y;
        if (same) return;
        done = controller.moveWidget(session.sourcePageId, session.widgetId, target.rect);
        if (done) announce(`${session.label} spostato: ${describeRect(target.rect)}.`);
      } else {
        done = controller.moveWidgetToPage(
          session.sourcePageId,
          target.pageId,
          session.widgetId,
          target.rect
        );
        const page = controller.findPage(target.pageId);
        if (done) announce(`${session.label} spostato nella pagina ${displayLabel(page?.label)}.`);
      }
      if (!done) reject(session.widgetId, 'Non c’è spazio lì: il widget torna al suo posto.');
    },
    [controller, announce, reject]
  );

  const drag = useWidgetDrag({
    getGeometry: (pageId) => grids.current.get(pageId)?.() ?? null,
    getPlacements: (pageId) => {
      const page = controller.findPage(pageId);
      return page ? pagePlacements(page, controller.deviceClass) : {};
    },
    sizesFor: controller.sizesFor,
    getPagerBounds: () => {
      const box = pagerRef.current?.getBoundingClientRect();
      return box ? { left: box.left, right: box.right } : null;
    },
    onEdge: (direction) => {
      const next = adjacentWidgetPage(controller.currentPage, direction);
      if (!next || next.entry.type !== 'page') return null;
      goToPage(next.index);
      return next.entry.page.id;
    },
    onDrop,
    onCancel: () => announce('Spostamento annullato.'),
  });

  // ── Keyboard mode and focus after moving to another page ──
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode | null>(null);
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

  const moveToAdjacentPage = useCallback(
    (pageId: string, widgetId: string, direction: -1 | 1) => {
      const from = entries.findIndex((entry) => entry.key === pageId);
      const next = adjacentWidgetPage(from, direction);
      if (!next || next.entry.type !== 'page') {
        announce('Nessuna pagina in questa direzione.');
        return;
      }
      const label = next.entry.label;
      if (controller.moveWidgetToPage(pageId, next.entry.page.id, widgetId)) {
        if (keyboardMode?.widgetId === widgetId) {
          setKeyboardMode({ ...keyboardMode, pageId: next.entry.page.id });
        }
        requestFocus(next.entry.page.id, widgetId);
        goToPage(next.index);
        announce(`Spostato nella pagina ${label}.`);
      } else {
        reject(widgetId, `Nella pagina ${label} non c’è spazio per questo widget.`);
      }
    },
    [
      entries,
      adjacentWidgetPage,
      controller,
      keyboardMode,
      requestFocus,
      goToPage,
      announce,
      reject,
    ]
  );

  const stepWidget = useCallback(
    (pageId: string, widgetId: string, mode: 'move' | 'resize', dx: number, dy: number) => {
      const page = controller.findPage(pageId);
      const placement = page?.placements[controller.deviceClass]?.[widgetId];
      if (!placement) return;
      const grid = controller.grid;
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
          announce('Dimensione al limite per questo widget.');
        } else if (controller.resizeWidget(pageId, widgetId, size)) {
          announce(`Dimensione ${size.w} per ${size.h}.`);
        } else reject(widgetId, 'Non c’è spazio per ingrandirlo qui: dimensione invariata.');
        return;
      }
      const target = { ...placement, x: placement.x + dx, y: placement.y + dy };
      if (target.x < 0 || target.x + target.w > grid.w) {
        moveToAdjacentPage(pageId, widgetId, dx < 0 ? -1 : 1);
      } else if (target.y < 0 || target.y + target.h > grid.h) {
        announce('Bordo della pagina.');
      } else if (controller.moveWidget(pageId, widgetId, target)) {
        announce(`Spostato in colonna ${target.x + 1}, riga ${target.y + 1}.`);
      } else reject(widgetId, 'Non c’è spazio in quella posizione: il widget resta dov’era.');
    },
    [controller, moveToAdjacentPage, announce, reject]
  );

  const removeWidget = useCallback(
    (pageId: string, widgetId: string) => {
      const page = controller.findPage(pageId);
      const placements = page?.placements[controller.deviceClass] ?? {};
      const ids = idsByPosition(placements);
      const index = ids.indexOf(widgetId);
      const next = ids[index + 1] ?? ids[index - 1];
      const freed = placements[widgetId];
      if (next) requestFocus(pageId, next);
      controller.removeWidget(pageId, widgetId);
      if (keyboardMode?.widgetId === widgetId) setKeyboardMode(null);
      // The last widget: the focus goes to the free cell it leaves.
      if (!next)
        requestAnimationFrame(() =>
          (
            (freed && document.querySelector<HTMLElement>(cellSelector(pageId, freed))) ??
            document.querySelector<HTMLElement>('[data-launcher-add]')
          )?.focus()
        );
    },
    [controller, keyboardMode, requestFocus]
  );

  // ── Sheets ──
  const [sheet, setSheet] = useState<SheetState>(null);
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
  // Closing the settings sheet of a widget just added from a cell gives the focus back to it.
  const closeSheet = useCallback(() => {
    const added = lastAdded.current;
    const closing = sheet;
    setSheet(null);
    if (added?.settings && closing?.type === 'widget' && closing.widgetId === added.widgetId) {
      focusAdded(true);
    }
  }, [sheet, focusAdded]);
  // Closing the add sheet leaves alone the settings sheet a new widget may have opened.
  const closeAddSheet = useCallback(() => {
    setSheet((open) => (open?.type === 'add' ? null : open));
    if (!lastAdded.current?.settings) focusAdded(false);
  }, [focusAdded]);
  const openAddWidget = useCallback((pageId: string, at?: Pick<CellRect, 'x' | 'y'>) => {
    addDestination.current = pageId;
    lastAdded.current = null;
    setSheet(at ? { type: 'add', pageId, at } : { type: 'add', pageId });
  }, []);
  const openWidgetSettings = useCallback(
    (pageId: string, widgetId: string) => setSheet({ type: 'widget', pageId, widgetId }),
    []
  );

  const firstWidgetPageId =
    controller.layout.pages.find((page) => page.kind === 'widgets')?.id ?? null;
  const currentIsWidgets = current?.type === 'page' && current.page.kind === 'widgets';
  const addTargetPageId = currentIsWidgets ? currentPageId : null;
  const finishEditing = useCallback(() => {
    setEditMode(false);
    announce('Modifica terminata.');
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('[data-launcher-edit]')?.focus()
    );
  }, [setEditMode, announce]);

  // ── Input modality: keyboard moves and paging skip their animation ──
  useEffect(() => {
    const root = document.documentElement;
    const onKey = () => {
      root.dataset.acaInput = 'keyboard';
    };
    const onPointer = () => {
      root.dataset.acaInput = 'pointer';
    };
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
    if (!editMode) {
      setKeyboardMode(null);
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isOverlayOpen()) return;
      finishEditing();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editMode, finishEditing]);

  const enterEditMode = useCallback(() => {
    if (controller.editMode) return;
    setEditMode(true);
    announce(
      'Modifica della disposizione. Trascina i widget o usa Invio per le azioni, le frecce per spostare e Maiusc più frecce per ridimensionare. Esc per terminare.'
    );
  }, [controller.editMode, setEditMode, announce]);

  const longPress = useLongPress({
    disabled: editMode,
    onLongPress: (info) => {
      const target = info.target instanceof Element ? info.target : null;
      if (target?.closest(NO_LONG_PRESS)) return;
      enterEditMode();
    },
  });
  const onPagerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest(NO_LONG_PRESS)) return;
    longPress.onPointerDown(event);
  };

  // ── Details ──
  const detailsTarget = useMemo<DetailsTarget | null>(() => {
    if (!detailsWidgetId) return null;
    const shown = currentPageId ? controller.findPage(currentPageId) : undefined;
    const onCurrent = shown
      ? Boolean(pagePlacements(shown, controller.deviceClass)[detailsWidgetId])
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

  const ui = useMemo<LauncherUi>(
    () => ({
      controller,
      findDefinition,
      announce,
      registerGrid,
      beginDrag: drag.begin,
      justDropped: drag.justDropped,
      rejectedId,
      reject,
      keyboardMode,
      setKeyboardMode,
      requestFocus,
      takeFocusRequest,
      moveToAdjacentPage,
      stepWidget,
      removeWidget,
      openWidgetSettings,
      openAddWidget,
      widgetName,
      isWidgetHidden: hiddenCheck,
    }),
    [
      controller,
      findDefinition,
      announce,
      registerGrid,
      drag.begin,
      drag.justDropped,
      rejectedId,
      reject,
      keyboardMode,
      requestFocus,
      takeFocusRequest,
      moveToAdjacentPage,
      stepWidget,
      removeWidget,
      openWidgetSettings,
      openAddWidget,
      widgetName,
      hiddenCheck,
    ]
  );

  const pages: PagerPage[] = entries.map((entry) => ({
    key: entry.key,
    label: entry.label,
    content:
      entry.type === 'cover' ? (
        cover
      ) : entry.page.kind === 'widgets' ? (
        <WidgetGrid page={entry.page} />
      ) : (
        <PageKindHost page={entry.page} editMode={editMode} />
      ),
  }));

  const sheetPageId = sheet && sheet.type !== 'page' ? sheet.pageId : '';
  const sheetWidgetId = sheet?.type === 'widget' ? sheet.widgetId : '';

  return (
    <LauncherProvider value={controller}>
      <WidgetRuntimeProvider value={runtime}>
        <LauncherUiContext.Provider value={ui}>
          <LauncherDragContext.Provider value={drag.session}>
            <AppShell
              editMode={editMode}
              statusBar={
                <StatusBar
                  time={current?.type === 'cover' ? null : now}
                  connection={connection}
                  chips={chips}
                  isChipInteractive={(chip) =>
                    Boolean(chip.targetId && hasDetails(chip.targetId, {}, findDefinition))
                  }
                  onChipPress={(chip) => {
                    if (chip.targetId) runtime.openDetails(chip.targetId);
                  }}
                  editMode={editMode}
                  onToggleEdit={() => {
                    if (editMode) {
                      finishEditing();
                    } else {
                      enterEditMode();
                    }
                  }}
                  onOpenSystem={onOpenSystem}
                  updateCount={updateCount}
                />
              }
              notice={notice}
              footer={
                <>
                  {editMode && keyboardMode ? (
                    <WidgetPositionControls
                      name={widgetName(keyboardMode.pageId, keyboardMode.widgetId)}
                      mode={keyboardMode.mode}
                      // These controls stay on screen when the widget changes page: the focus
                      // stays on them instead of jumping to the widget (requested for the handle).
                      onStep={(dx, dy) => {
                        stepWidget(
                          keyboardMode.pageId,
                          keyboardMode.widgetId,
                          keyboardMode.mode,
                          dx,
                          dy
                        );
                        focusRequest.current = null;
                      }}
                      onPage={(direction) => {
                        moveToAdjacentPage(keyboardMode.pageId, keyboardMode.widgetId, direction);
                        focusRequest.current = null;
                      }}
                      onDone={() => {
                        requestFocus(keyboardMode.pageId, keyboardMode.widgetId);
                        setKeyboardMode(null);
                        announce('Spostamento terminato.');
                      }}
                    />
                  ) : (
                    editMode && (
                      <EditToolbar
                        canAddWidget={Boolean(addTargetPageId)}
                        canEditPage={current?.type === 'page'}
                        onAddWidget={() => {
                          if (addTargetPageId) openAddWidget(addTargetPageId);
                        }}
                        onPageSettings={() => {
                          if (currentPageId) setSheet({ type: 'page', pageId: currentPageId });
                        }}
                        onNewPage={() => setSheet({ type: 'page', pageId: null })}
                        coverEnabled={controller.layout.cover.enabled}
                        onCoverChange={(enabled) => {
                          controller.setCoverEnabled(enabled);
                          announce(enabled ? 'Copertina attivata.' : 'Copertina disattivata.');
                        }}
                      />
                    )
                  )}
                  <PageIndicator
                    labels={entries.map((entry) => entry.label)}
                    index={currentPage}
                    onChange={goToPage}
                  />
                </>
              }
            >
              <Pager
                pages={pages}
                index={currentPage}
                onIndexChange={goToPage}
                locked={Boolean(drag.session)}
                reducedMotion={reducedMotion}
                containerRef={(node) => {
                  pagerRef.current = node;
                }}
                onPointerDown={onPagerPointerDown}
                onPointerMove={longPress.onPointerMove}
                onPointerUp={longPress.onPointerUp}
                onPointerCancel={longPress.onPointerCancel}
                onContextMenu={longPress.onContextMenu}
              />
            </AppShell>

            {drag.session && <DragGhost session={drag.session} />}

            <p id={EDIT_HELP_ID} className="sr-only">
              Invio apre le azioni del widget. Frecce per spostarlo, Maiusc più frecce per
              ridimensionarlo, Canc per rimuoverlo, Esc per terminare la modifica.
            </p>
            <p id={CELL_HELP_ID} className="sr-only">
              Frecce per scegliere un’altra cella libera, Invio per aggiungere qui un widget.
            </p>
            <div className="sr-only" role="status" aria-live="polite">
              {announcement}
            </div>

            <DetailsSheet
              target={detailsTarget}
              onClose={onCloseDetails}
              resolve={findDefinition}
            />

            <AddWidgetSheet
              open={sheet?.type === 'add'}
              onClose={closeAddSheet}
              pageId={sheetPageId || addTargetPageId || firstWidgetPageId || 'home'}
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
                const placedOn = controller.placeWidget(
                  pageId,
                  widgetId,
                  size,
                  at,
                  sheetPageId || pageId
                );
                const settings = Boolean(placedOn) && opensSettingsAfterAdd(widgetId);
                if (placedOn) {
                  addDestination.current = placedOn;
                  lastAdded.current = { pageId: placedOn, widgetId, settings };
                }
                announce(`${widgetName(pageId, widgetId)} aggiunto alla pagina.`);
                if (placedOn && settings) {
                  setSheet({ type: 'widget', pageId: placedOn, widgetId });
                }
              }}
            />
          </LauncherDragContext.Provider>
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
          />
          <PageSettingsSheet
            open={sheet?.type === 'page'}
            onClose={closeSheet}
            pageId={sheet?.type === 'page' ? sheet.pageId : null}
          />
        </LauncherUiContext.Provider>
      </WidgetRuntimeProvider>
    </LauncherProvider>
  );
}
