import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { Caption, Icon, MaterialLayers, materialClass } from '@/components/primitives';
import type { LauncherPage } from '@/@types/launcher';
import { GRID_GAPS, baseClassOf, cellMetrics } from '@/utils/launcher/deviceClass';
import { freeCells, idsByPosition, type Placements } from '@/utils/launcher/grid';
import { pagePlacements } from '@/utils/launcher/layout';
import { HOLD_TOLERANCE_PX } from '@/hooks/launcher/gestures';
import {
  PageVisibilityContext,
  pagerSizeEpoch,
  usePageNear,
} from '@/hooks/launcher/PageVisibilityContext';
import { CELL_EXIT_MS, useLeavingItems } from '@/hooks/launcher/useLeaving';
import {
  useAirborneIn,
  useEnteringIn,
  useExitingIn,
  useLandedIn,
  useSelectedIn,
} from '@/hooks/launcher/useLauncherSelection';
import {
  LauncherDragContext,
  LauncherEdgePageContext,
  LauncherPressContext,
  useLauncherUi,
} from './LauncherUiContext';
import { WidgetHost } from './WidgetHost';

type GridStyle = CSSProperties &
  Record<'--aca-cell' | '--aca-gap-x' | '--aca-gap-y' | '--aca-cols' | '--aca-rows', string>;
type RectStyle = CSSProperties & Record<'--aca-lx' | '--aca-ly' | '--aca-lw' | '--aca-lh', string>;

interface Cell {
  x: number;
  y: number;
}

/** Help read with every free cell: arrows and Invio (LauncherScreen renders the text). */
export const CELL_HELP_ID = 'aca-launcher-cell-help';

const cellKey = (cell: Cell) => `${cell.x},${cell.y}`;

/**
 * The longest a «+» stays pressed after the finger is lifted when the sheet it asked for does not
 * start to move (a long press, whose click is swallowed, or a sheet that fails to open).
 */
const PRESSED_MAX_MS = 700;

/** Material of a cell: the soft well of the kit, with the cell radius (launcher.css). */
const cellMaterial = (...extra: (string | false)[]) =>
  materialClass(
    { behavior: 'static', shape: 'card', size: 'inherit' },
    'aca-m--well-soft',
    ...extra
  );

const cellStyle = (cell: Cell) =>
  ({
    '--aca-lx': String(cell.x),
    '--aca-ly': String(cell.y),
    '--aca-lw': '1',
    '--aca-lh': '1',
  }) as RectStyle;

/** Selector of a free cell of a page, or of the page's tab stop among them without a cell. */
export function cellSelector(pageId: string, cell?: Cell): string {
  const scope = `[data-launcher-cells="${pageId}"]`;
  return cell ? `${scope} [data-launcher-cell="${cellKey(cell)}"]` : `${scope} [tabindex="0"]`;
}

const distance = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Free cell reached with a key: reading order sideways, the closest column up and down. */
function nextCell(cells: readonly Cell[], from: Cell, key: string): Cell | null {
  const index = cells.findIndex((cell) => cell.x === from.x && cell.y === from.y);
  if (key === 'ArrowRight') return cells[index + 1] ?? null;
  if (key === 'ArrowLeft') return index > 0 ? cells[index - 1] : null;
  if (key === 'Home') return cells[0] ?? null;
  if (key === 'End') return cells[cells.length - 1] ?? null;
  if (key !== 'ArrowDown' && key !== 'ArrowUp') return null;
  const down = key === 'ArrowDown';
  const ahead = cells.filter((cell) => (down ? cell.y > from.y : cell.y < from.y));
  if (ahead.length === 0) return null;
  const rows = ahead.map((cell) => cell.y);
  const row = down ? Math.min(...rows) : Math.max(...rows);
  return (
    ahead
      .filter((cell) => cell.y === row)
      .sort((a, b) => Math.abs(a.x - from.x) - Math.abs(b.x - from.x) || a.x - b.x)[0] ?? null
  );
}

interface FreeCellsProps {
  pageId: string;
  cells: readonly Cell[];
  /** The one free cell in the tab order (roving tabindex). */
  activeKey: string | null;
  onFocusCell: (key: string) => void;
  onAdd: (cell: Cell) => void;
  /** Name of the widget selected on this page: a cell moves it there instead of adding. */
  moving: string | null;
  onMove: (cell: Cell) => void;
  /** The keyboard entered the cells: Invio adds there, so the selection is cleared. */
  onKeyboardEnter: () => void;
  /**
   * Only the wells, no «+»: the same cells as non-interactive spans hidden from assistive
   * technology (the cover outside edit mode, REP-20261009-004). While the page has free cells
   * the layer stays mounted across the two looks, only the cells change; a full page has no
   * layer in edit mode (nothing to draw or announce).
   */
  wells?: boolean;
}

/**
 * The free cells of a page: soft wells of the kit with a small «+» that opens the add sheet
 * for that cell. One tab stop for the whole grid; arrows move between free cells and Invio or
 * Spazio add a widget there. With a widget selected on the page each cell offers to move it
 * there instead («Sposta qui», the single-tap alternative to dragging, REP-20261008-001).
 * While a widget is dragged the «+» fades and the wells stay as the grid of reference
 * (launcher.css).
 */
const FreeCells = memo(function FreeCells({
  pageId,
  cells,
  activeKey,
  onFocusCell,
  onAdd,
  moving,
  onMove,
  onKeyboardEnter,
  wells = false,
}: FreeCellsProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  /**
   * The cells as they are drawn: a cell that comes (a widget shrank, moved or went) fades in with a
   * small scale, one that goes (a widget grew over it) stays for its exit, inert, and fades out;
   * none appears or disappears at once (REP-20261023-006, D-M6 «comparsa delle caselle col +»).
   * The first set is drawn as it is. Where nothing animates they come and go as they always did.
   */
  const entries = useLeavingItems(
    useMemo(() => cells.map((cell) => ({ id: cellKey(cell), ...cell })), [cells]),
    CELL_EXIT_MS
  );
  /**
   * The cell under the finger (launcher.css, `is-pressed`): it goes down to a scale of 0.93 from the
   * touch, not from Chrome's «show press», and comes back when the sheet it opens starts to move,
   * or at once if the finger slips more than the hold tolerance away or the touch is taken by a
   * scroll (pointercancel). REP-20261023-006, D-M4: only `scale`, no rotation, no dip. A long
   * press ends with the finger (its click is swallowed, useLongPress) after PRESSED_MAX_MS at most.
   */
  const [pressed, setPressed] = useState<string | null>(null);
  const press = useRef<{ clicked: boolean; end: () => void } | null>(null);
  const stopPress = useCallback(() => {
    const now = press.current;
    press.current = null;
    now?.end();
  }, []);
  const releasePress = useCallback(() => {
    stopPress();
    setPressed(null);
  }, [stopPress]);
  // Unmounted with a cell pressed: the listeners go (no state to give back).
  useEffect(() => stopPress, [stopPress]);
  const beginPress = (key: string, event: PointerEvent<HTMLButtonElement>) => {
    // The main button of the primary pointer, as the long press counts.
    if ((event.button ?? 0) !== 0 || event.isPrimary === false) return;
    stopPress();
    const { pointerId, clientX, clientY } = event;
    const win = window;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onMove = (move: globalThis.PointerEvent) => {
      if (move.pointerId !== pointerId) return;
      if (Math.hypot(move.clientX - clientX, move.clientY - clientY) > HOLD_TOLERANCE_PX) {
        releasePress();
      }
    };
    const onUp = (up: globalThis.PointerEvent) => {
      if (up.pointerId !== pointerId) return;
      win.removeEventListener('pointermove', onMove, true);
      // The click follows at once; what comes after is the sheet, or nothing.
      timer ??= setTimeout(releasePress, PRESSED_MAX_MS);
    };
    const onCancel = (cancel: globalThis.PointerEvent) => {
      if (cancel.pointerId === pointerId) releasePress();
    };
    // The sheet the tap asked for starts to move: the cell has covered the wait.
    const onSheetStart = (transition: Event) => {
      const target = transition.target;
      if (
        press.current?.clicked &&
        target instanceof Element &&
        target.classList.contains('aca-sheet')
      ) {
        releasePress();
      }
    };
    win.addEventListener('pointermove', onMove, true);
    win.addEventListener('pointerup', onUp, true);
    win.addEventListener('pointercancel', onCancel, true);
    win.document.addEventListener('transitionstart', onSheetStart, true);
    press.current = {
      clicked: false,
      end: () => {
        if (timer) clearTimeout(timer);
        win.removeEventListener('pointermove', onMove, true);
        win.removeEventListener('pointerup', onUp, true);
        win.removeEventListener('pointercancel', onCancel, true);
        win.document.removeEventListener('transitionstart', onSheetStart, true);
      },
    };
    setPressed(key);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, from: Cell) => {
    const target = nextCell(cells, from, event.key);
    if (!target && !event.key.startsWith('Arrow') && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();
    if (!target) return;
    groupRef.current
      ?.querySelector<HTMLElement>(`[data-launcher-cell="${cellKey(target)}"]`)
      ?.focus();
  };

  if (entries.length === 0 && !wells) return null;
  if (wells) {
    return (
      <div ref={groupRef} className="aca-launcher-cells" aria-hidden="true">
        {cells.map((cell) => (
          <span
            key={cellKey(cell)}
            className={cellMaterial('aca-launcher-cell', 'is-well')}
            style={cellStyle(cell)}
            data-launcher-well={cellKey(cell)}
          >
            <MaterialLayers />
          </span>
        ))}
      </div>
    );
  }
  return (
    <div
      ref={groupRef}
      className="aca-launcher-cells"
      role="group"
      aria-label="Celle libere"
      data-launcher-cells={pageId}
      onFocus={(event) => {
        // From outside the group, with the keyboard: Invio adds a widget, as without selection.
        const from = event.relatedTarget;
        const inside = from instanceof Node && event.currentTarget.contains(from);
        if (!inside && document.documentElement.dataset.acaInput === 'keyboard') {
          onKeyboardEnter();
        }
      }}
    >
      {entries.map(({ item: cell, leaving, entering }) => {
        const key = cellKey(cell);
        const place = `colonna ${cell.x + 1}, riga ${cell.y + 1}`;
        return (
          <button
            key={key}
            type="button"
            className={cellMaterial(
              'aca-launcher-cell',
              key === pressed && 'is-pressed',
              entering && 'is-entering',
              leaving && 'is-leaving'
            )}
            style={cellStyle(cell)}
            data-launcher-cell={key}
            inert={leaving || undefined}
            aria-hidden={leaving || undefined}
            tabIndex={key === activeKey && !leaving ? 0 : -1}
            aria-label={moving ? `Sposta ${moving} qui: ${place}` : `Aggiungi un widget: ${place}`}
            aria-describedby={CELL_HELP_ID}
            onFocus={() => onFocusCell(key)}
            onKeyDown={(event) => onKeyDown(event, cell)}
            onPointerDown={(event) => beginPress(key, event)}
            onClick={() => {
              // A tap: the cell stays down until the sheet moves (or PRESSED_MAX_MS).
              if (press.current) press.current.clicked = true;
              if (moving) onMove(cell);
              else onAdd(cell);
            }}
          >
            <MaterialLayers contentClassName="aca-launcher-cell__content">
              <Icon name={moving ? 'move' : 'add'} size="md" className="aca-launcher-cell__plus" />
            </MaterialLayers>
          </button>
        );
      })}
    </div>
  );
});

/**
 * Cells kept by widgets hidden in view mode (visibility conditions): the same
 * soft well without «+», not interactive and hidden from assistive technology, so the grid
 * shows no hole and the place stays reserved.
 */
const ReservedCells = memo(function ReservedCells({ cells }: { cells: readonly Cell[] }) {
  if (cells.length === 0) return null;
  return (
    <div className="aca-launcher-cells" aria-hidden="true">
      {cells.map((cell) => (
        <span
          key={cellKey(cell)}
          className={cellMaterial('aca-launcher-cell', 'is-reserved')}
          style={cellStyle(cell)}
          data-launcher-reserved={cellKey(cell)}
        >
          <MaterialLayers />
        </span>
      ))}
    </div>
  );
});

/** Cells back from a signature of "x,y" keys (a stable string for useMemo). */
const parseCells = (signature: string): Cell[] =>
  signature
    ? signature.split(' ').map((key) => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      })
    : [];

/**
 * One page of widgets: square cells that fill the space without scrolling, widgets placed by
 * cell, a «+» well on every free cell (view and edit mode alike, so the grid never moves) and
 * the drop preview while dragging. In the DOM the widgets come first, then the free cells: the
 * reading and Tab order meets the content before the «+», while the local layers keep the
 * cells under the widgets.
 */
/**
 * `cells`: how the free cells look. `interactive` (default) is the «+» well of every page;
 * `wells` shows the same wells without «+», not interactive (the cover outside edit mode, where
 * REP-20261007-030 asks for no «+» but the empty places of the grid stay visible).
 */
export function WidgetGrid({
  page,
  cells: cellPolicy = 'interactive',
}: {
  page: LauncherPage;
  cells?: 'interactive' | 'wells';
}) {
  const ui = useLauncherUi();
  const { controller } = ui;
  const { editMode } = controller;
  // The grid of this page: its own columns, the cover's, or the class default (REP-20261008-001).
  const deviceClass = controller.classFor(page.id);
  const pageGrid = controller.gridFor(page.id);
  const grid = useMemo(() => ({ w: pageGrid.w, h: pageGrid.h }), [pageGrid.w, pageGrid.h]);
  const areaRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  // The size count of the pager at the last measure, and that measure: see the effect below.
  const measuredAt = useRef(pagerSizeEpoch());
  const measureAgain = useRef<(() => void) | null>(null);
  const near = usePageNear();
  const onScreen = useContext(PageVisibilityContext);

  useLayoutEffect(() => {
    const element = areaRef.current;
    if (!element) return undefined;
    const measure = (box?: ResizeObserverSize) => {
      measuredAt.current = pagerSizeEpoch();
      const rect = element.getBoundingClientRect();
      // The layout size: in the page overview the page is scaled, and its rect would be too (a
      // page added there mounts its grid at that moment). Unscaled, the rect is the exact one.
      const scaled = element.offsetWidth > 0 && Math.abs(rect.width - element.offsetWidth) > 1;
      const styles = getComputedStyle(element);
      // Scaled: the fractional border box, as the observer reports it or the style computes it
      // (offsetWidth rounds, and nothing observes the end of the scale to correct it).
      const width = scaled
        ? (box?.inlineSize ?? (parseFloat(styles.width) || element.offsetWidth))
        : rect.width;
      const height = scaled
        ? (box?.blockSize ?? (parseFloat(styles.height) || element.offsetHeight))
        : rect.height;
      const innerWidth =
        width - parseFloat(styles.paddingLeft || '0') - parseFloat(styles.paddingRight || '0');
      const innerHeight =
        height - parseFloat(styles.paddingTop || '0') - parseFloat(styles.paddingBottom || '0');
      setArea((prev) =>
        prev.width === innerWidth && prev.height === innerHeight
          ? prev
          : { width: innerWidth, height: innerHeight }
      );
    };
    measure();
    measureAgain.current = () => measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) =>
      measure(entries[entries.length - 1]?.borderBoxSize?.[0])
    );
    observer.observe(element);
    return () => {
      measureAgain.current = null;
      observer.disconnect();
    };
  }, []);
  // A page the browser skipped was not told that the pager changed size, and a jump shows it
  // before its observer reports (ISSUE-109, R10): measured again as it comes near, in the commit
  // that draws it, but only if the pager changed size since (nothing is read otherwise). A page
  // still skipped has no box to read.
  useLayoutEffect(() => {
    if (!near || measuredAt.current === pagerSizeEpoch()) return;
    if (areaRef.current && areaRef.current.offsetWidth > 0) measureAgain.current?.();
  }, [near]);

  const metrics = cellMetrics(
    area.width,
    area.height,
    grid,
    GRID_GAPS[baseClassOf(deviceClass)],
    globalThis.window?.devicePixelRatio || 1,
    !page.categoryGrids || page.columns !== undefined
  );
  const metricsRef = useRef(metrics);
  useEffect(() => {
    metricsRef.current = metrics;
  });

  const { registerGrid } = ui;
  useEffect(
    () =>
      registerGrid(page.id, () => {
        const element = gridRef.current;
        if (!element) return null;
        const box = element.getBoundingClientRect();
        // Where the page rests, not where it is while it scrolls into view: measured from its
        // section and placed on the pager, so a drag that has just turned the page snaps right
        // away (REP-20261009-004). The pages are as wide as the pager once settled.
        const section = element.closest('.aca-pager__page');
        const pager = section?.parentElement;
        const left =
          section && pager
            ? box.left - section.getBoundingClientRect().left + pager.getBoundingClientRect().left
            : box.left;
        const current = metricsRef.current;
        return {
          left,
          top: box.top,
          cell: current.cell,
          gapX: current.gapX,
          gapY: current.gapY,
          grid,
        };
      }),
    [registerGrid, page.id, grid]
  );

  const placements = pagePlacements(page, deviceClass);
  const ids = idsByPosition(placements);
  const drag = useContext(LauncherDragContext);
  const edgePageId = useContext(LauncherEdgePageContext);
  const pressed = useContext(LauncherPressContext);
  // The selection and the landing are read from their store: a change redraws the grid of that
  // page only (ISSUE-109, R5a).
  const selectedId = useSelectedIn(ui.selection, page.id);
  const landedId = useLandedIn(ui.selection, page.id);
  // Dropped and committed, its copy still flying (K6b): it is in its cell, hidden as when it was
  // dragged, and shows when the copy has landed.
  const airborneId = useAirborneIn(ui.selection, page.id);
  const exitingId = useExitingIn(ui.selection, page.id);
  const entering = useEnteringIn(ui.selection, page.id);
  const target = drag?.target?.pageId === page.id ? drag.target : null;
  // The wells go out (`is-dragging`) only on the pages that are seen: the one on screen, the target
  // and the neighbour whose turn the finger arms at the edge (450 ms before it comes, already with
  // the «+» gone), then for the rest of the drag (the page just left keeps it). Both neighbours had
  // it from the pick-up: the class restyled 97-100 cells with their content on three grids at every
  // pick-up and every drop (tracing of 2026-10-25, REP-20261023-006, W1). A resize turns no page.
  const reached = onScreen || target !== null || (edgePageId !== null && edgePageId === page.id);
  const held = useRef(false);
  if (!drag) held.current = false;
  else if (reached) held.current = true;
  const dragging = Boolean(drag) && held.current;
  const flightLands = drag?.flight?.kind === 'land';
  const preview = target?.valid ? target.preview : null;
  const visibleIds = editMode ? ids : ids.filter((id) => !ui.isWidgetHidden(page.id, id));

  // Free cells: not covered by any widget as drawn now (hidden widgets keep their place; the
  // widget being dragged leaves its own cells).
  const occupied: Placements = {};
  for (const id of ids) {
    if (airborneId === id || (!flightLands && drag?.widgetId === id && drag.sourcePageId === page.id))
      continue;
    occupied[id] = preview?.[id] ?? placements[id];
  }
  const signature = freeCells(occupied, grid).map(cellKey).join(' ');
  const cells = useMemo<Cell[]>(() => parseCells(signature), [signature]);

  // Cells under the widgets hidden in view mode: reserved, drawn as wells without «+».
  const hiddenIds = editMode ? [] : ids.filter((id) => !visibleIds.includes(id));
  const reservedSignature = hiddenIds
    .flatMap((id) => {
      const rect = placements[id];
      const keys: string[] = [];
      for (let y = rect.y; y < rect.y + rect.h; y += 1) {
        for (let x = rect.x; x < rect.x + rect.w; x += 1) keys.push(cellKey({ x, y }));
      }
      return keys;
    })
    .join(' ');
  const reserved = useMemo<Cell[]>(() => parseCells(reservedSignature), [reservedSignature]);

  // Roving tab stop: the cell focused last, else the free cell closest to it, else the first.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  let activeKey: string | null = cells[0] ? cellKey(cells[0]) : null;
  if (focusKey && cells.length > 0) {
    const [fx, fy] = focusKey.split(',').map(Number);
    const focused = { x: fx, y: fy };
    activeKey = cellKey(
      cells.reduce((best, cell) =>
        distance(cell, focused) < distance(best, focused) ? cell : best
      )
    );
  }

  const { openAddWidget, moveSelectedTo, clearSelection } = ui;
  const onAdd = useCallback((cell: Cell) => openAddWidget(page.id, cell), [openAddWidget, page.id]);
  const onMove = useCallback(
    (cell: Cell) => moveSelectedTo(page.id, cell),
    [moveSelectedTo, page.id]
  );
  // A widget selected on this page (and none dragged): the free cells move it there.
  const moving = editMode && !drag && selectedId ? ui.widgetName(page.id, selectedId) : null;

  const style: GridStyle = {
    '--aca-cell': `${metrics.cell}px`,
    '--aca-gap-x': `${metrics.gapX}px`,
    '--aca-gap-y': `${metrics.gapY}px`,
    '--aca-cols': String(grid.w),
    '--aca-rows': String(grid.h),
    width: `${metrics.width}px`,
    height: `${metrics.height}px`,
  };

  return (
    <div ref={areaRef} className="aca-launcher-page" data-launcher-page={page.id}>
      <div
        ref={gridRef}
        className={['aca-launcher-grid', editMode && 'is-editing', dragging && 'is-dragging']
          .filter(Boolean)
          .join(' ')}
        style={style}
      >
        {visibleIds.map((id) => {
          // The copy of a drop that lands flies over its cell: the widget is shown by `airborneId`
          // until it has landed and is then drawn at once, with the copy still on screen for a
          // frame (W2), so the session no longer hides it.
          const own = drag?.widgetId === id && drag.sourcePageId === page.id && !flightLands;
          const mode = airborneId === id ? 'move' : own && drag.mode !== 'add' ? drag.mode : false;
          // Resizing is drawn live: the widget takes the size under the pointer, its content
          // follows (REP-20261007-027); the drop well turns red where it cannot stay.
          const rect =
            mode === 'resize' && target ? target.rect : (preview?.[id] ?? placements[id]);
          return (
            <WidgetHost
              key={id}
              pageId={page.id}
              widgetId={id}
              placement={placements[id]}
              rect={rect}
              dragging={mode}
              selected={editMode && selectedId === id}
              landing={landedId === id}
              stackTarget={target?.stackOn === id}
              pressing={pressed?.pageId === page.id && pressed.widgetId === id}
              shapeInvalid={mode === 'resize' && Boolean(target) && !target?.valid}
              exiting={exitingId === id}
              entering={entering?.widgetId === id ? entering : null}
            />
          );
        })}

        <FreeCells
          pageId={page.id}
          cells={cells}
          activeKey={activeKey}
          onFocusCell={setFocusKey}
          onAdd={onAdd}
          moving={moving}
          onMove={onMove}
          onKeyboardEnter={clearSelection}
          wells={cellPolicy === 'wells'}
        />
        <ReservedCells cells={reserved} />

        {/* A resize draws its own shape on the widget (WidgetHost): no recessed well under it. */}
        {target && !target.stackOn && drag?.mode !== 'resize' && (
          <span
            className={materialClass(
              { behavior: 'well', shape: 'card', size: 'inherit' },
              'aca-launcher-drop',
              !target.valid && 'aca-m--error'
            )}
            style={
              {
                '--aca-lx': String(target.rect.x),
                '--aca-ly': String(target.rect.y),
                '--aca-lw': String(target.rect.w),
                '--aca-lh': String(target.rect.h),
              } as RectStyle
            }
            aria-hidden="true"
          >
            <MaterialLayers contentClassName="aca-launcher-drop__content">
              {!target.valid && <Caption tone="danger">Non c’è spazio</Caption>}
            </MaterialLayers>
          </span>
        )}
      </div>
    </div>
  );
}
