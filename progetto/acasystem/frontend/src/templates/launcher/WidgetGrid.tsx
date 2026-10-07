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
} from 'react';
import { Caption, Icon, MaterialLayers, materialClass } from '@/components/primitives';
import type { LauncherPage } from '@/@types/launcher';
import { GRID_GAPS, cellMetrics } from '@/utils/launcher/deviceClass';
import { freeCells, idsByPosition, type Placements } from '@/utils/launcher/grid';
import { pagePlacements } from '@/utils/launcher/layout';
import { LauncherDragContext, useLauncherUi } from './LauncherUiContext';
import { WidgetHost } from './WidgetHost';

type GridStyle = CSSProperties &
  Record<'--aca-cell' | '--aca-gap' | '--aca-cols' | '--aca-rows', string>;
type RectStyle = CSSProperties & Record<'--aca-lx' | '--aca-ly' | '--aca-lw' | '--aca-lh', string>;

interface Cell {
  x: number;
  y: number;
}

/** Help read with every free cell: arrows and Invio (LauncherScreen renders the text). */
export const CELL_HELP_ID = 'aca-launcher-cell-help';

const cellKey = (cell: Cell) => `${cell.x},${cell.y}`;

/** Material of a cell: the soft well of the kit, with the cell radius (launcher.css). */
const cellMaterial = (...extra: string[]) =>
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
}

/**
 * The free cells of a page: soft wells of the kit with a small «+» that opens the add sheet
 * for that cell. One tab stop for the whole grid; arrows move between free cells and Invio or
 * Spazio add a widget there. While a widget is dragged the «+» fades and the wells stay as the
 * grid of reference (launcher.css).
 */
const FreeCells = memo(function FreeCells({
  pageId,
  cells,
  activeKey,
  onFocusCell,
  onAdd,
}: FreeCellsProps) {
  const groupRef = useRef<HTMLDivElement>(null);

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

  if (cells.length === 0) return null;
  return (
    <div
      ref={groupRef}
      className="aca-launcher-cells"
      role="group"
      aria-label="Celle libere"
      data-launcher-cells={pageId}
    >
      {cells.map((cell) => {
        const key = cellKey(cell);
        return (
          <button
            key={key}
            type="button"
            className={cellMaterial('aca-launcher-cell')}
            style={cellStyle(cell)}
            data-launcher-cell={key}
            tabIndex={key === activeKey ? 0 : -1}
            aria-label={`Aggiungi un widget: colonna ${cell.x + 1}, riga ${cell.y + 1}`}
            aria-describedby={CELL_HELP_ID}
            onFocus={() => onFocusCell(key)}
            onKeyDown={(event) => onKeyDown(event, cell)}
            onClick={() => onAdd(cell)}
          >
            <MaterialLayers contentClassName="aca-launcher-cell__content">
              <Icon name="add" size="md" className="aca-launcher-cell__plus" />
            </MaterialLayers>
          </button>
        );
      })}
    </div>
  );
});

/**
 * Cells kept by widgets hidden in view mode (hidden cards, visibility conditions): the same
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
export function WidgetGrid({ page }: { page: LauncherPage }) {
  const ui = useLauncherUi();
  const { controller } = ui;
  const { deviceClass, grid, editMode } = controller;
  const areaRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = areaRef.current;
    if (!element) return undefined;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
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
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const metrics = cellMetrics(area.width, area.height, grid, GRID_GAPS[deviceClass]);
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
        const current = metricsRef.current;
        return { left: box.left, top: box.top, cell: current.cell, gap: current.gap, grid };
      }),
    [registerGrid, page.id, grid]
  );

  const placements = pagePlacements(page, deviceClass);
  const ids = idsByPosition(placements);
  const drag = useContext(LauncherDragContext);
  const target = drag?.target?.pageId === page.id ? drag.target : null;
  const preview = target?.valid ? target.preview : null;
  const visibleIds = editMode ? ids : ids.filter((id) => !ui.isWidgetHidden(page.id, id));

  // Free cells: not covered by any widget as drawn now (hidden widgets keep their place; the
  // widget being dragged leaves its own cells).
  const occupied: Placements = {};
  for (const id of ids) {
    if (drag?.widgetId === id && drag.sourcePageId === page.id) continue;
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

  const { openAddWidget } = ui;
  const onAdd = useCallback((cell: Cell) => openAddWidget(page.id, cell), [openAddWidget, page.id]);

  const style: GridStyle = {
    '--aca-cell': `${metrics.cell}px`,
    '--aca-gap': `${metrics.gap}px`,
    '--aca-cols': String(grid.w),
    '--aca-rows': String(grid.h),
    width: `${metrics.width}px`,
    height: `${metrics.height}px`,
  };

  return (
    <div ref={areaRef} className="aca-launcher-page" data-launcher-page={page.id}>
      <div
        ref={gridRef}
        className={['aca-launcher-grid', editMode && 'is-editing', drag && 'is-dragging']
          .filter(Boolean)
          .join(' ')}
        style={style}
      >
        {visibleIds.map((id, order) => (
          <WidgetHost
            key={id}
            pageId={page.id}
            widgetId={id}
            placement={placements[id]}
            rect={preview?.[id] ?? placements[id]}
            order={order}
            dragging={drag?.widgetId === id && drag.sourcePageId === page.id}
          />
        ))}

        <FreeCells
          pageId={page.id}
          cells={cells}
          activeKey={activeKey}
          onFocusCell={setFocusKey}
          onAdd={onAdd}
        />
        <ReservedCells cells={reserved} />

        {target && (
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
