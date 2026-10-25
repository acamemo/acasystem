import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import {
  Body,
  Button,
  Caption,
  Field,
  Heading,
  Icon,
  type IconName,
} from '@/components/primitives';
import './edit.css';

export interface TrayItem {
  type: string;
  label: string;
  icon: IconName;
  /** Category of the tray (REP-20261007-035). */
  category: string;
  /** Size the widget takes when added, in cells. */
  size: { w: number; h: number };
}

export interface TrayCategory {
  id: string;
  label: string;
}

type SizeStyle = CSSProperties & Record<'--aca-tray-w' | '--aca-tray-h', string>;

/** Shape of the widget on the grid: its cells, small, and «2 × 2». */
function SizeShape({ size }: { size: TrayItem['size'] }) {
  const style: SizeStyle = { '--aca-tray-w': String(size.w), '--aca-tray-h': String(size.h) };
  return (
    <span className="aca-widget-tray__size">
      <span className="aca-widget-tray__cells" style={style} aria-hidden="true">
        {Array.from({ length: size.w * size.h }, (_, index) => (
          <span key={index} className="aca-widget-tray__cell" />
        ))}
      </span>
      <Caption as="span">{`${size.w} × ${size.h}`}</Caption>
    </span>
  );
}

export interface WidgetTrayProps {
  /** Closed: the tray waits below the screen, inert, so it can rise and sink. */
  open: boolean;
  items: readonly TrayItem[];
  /** Categories, in order; «Tutti» comes first. */
  categories: readonly TrayCategory[];
  /** A tile is being dragged: the tray sinks to leave the grid free. */
  dragging?: boolean;
  /** A press on a tile: the owner starts a drag, which begins only after a few pixels. */
  onTilePointerDown: (item: TrayItem, event: PointerEvent<HTMLButtonElement>) => void;
  /** A tap on a tile (no drag): add it where there is room. */
  onPick: (item: TrayItem) => void;
  onClose: () => void;
}

/**
 * Tray of widget types (REP-20261007-027): it rises from the bottom in edit mode, with the
 * types in a row that scrolls sideways. Dragging a tile up onto the grid drops the new widget
 * in the cell under the finger, at its default size; a tap (or Invio) adds it where there is
 * room. Sideways the row scrolls (touch-action: pan-x), so only a drag up picks a tile.
 * Memoized: its tiles are many, and the screen redraws at every swipe and every opening of the
 * page overview (REP-20261012-003).
 */
export const WidgetTray = memo(function WidgetTray({
  open,
  items,
  categories,
  dragging = false,
  onTilePointerDown,
  onPick,
  onClose,
}: WidgetTrayProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const rowRef = useRef<HTMLDivElement>(null);
  const cancelledPointer = useRef(false);
  const animations = useRef<Animation[]>([]);
  const ghosts = useRef<HTMLElement[]>([]);
  const previousTiles = useRef<Map<string, { node: HTMLElement; rect: DOMRect }> | null>(null);
  const stopAnimations = useCallback(() => {
    for (const animation of animations.current) animation.cancel();
    animations.current = [];
    for (const ghost of ghosts.current) ghost.remove();
    ghosts.current = [];
    previousTiles.current = null;
  }, []);
  useEffect(() => stopAnimations, [stopAnimations]);
  useEffect(() => {
    if (!open || dragging) stopAnimations();
  }, [open, dragging, stopAnimations]);
  const needle = query.trim().toLowerCase();
  // The search looks in every category; the chips narrow the row when nothing is searched.
  const shown = needle
    ? items.filter((item) => item.label.toLowerCase().includes(needle))
    : items.filter((item) => category === 'all' || item.category === category);
  const selectCategory = (nextCategory: string) => {
    stopAnimations();
    const row = rowRef.current;
    if (row) {
      if (
        (category !== nextCategory || needle) &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
        typeof row.animate === 'function'
      ) {
        previousTiles.current = new Map(
          Array.from(row.querySelectorAll<HTMLElement>('[data-tray-type]'), (node) => [
            node.dataset.trayType!,
            { node: node.cloneNode(true) as HTMLElement, rect: node.getBoundingClientRect() },
          ])
        );
      }
      row.scrollLeft = 0;
    }
    setCategory(nextCategory);
    setQuery('');
  };
  // The row starts at its first tile once the tiles of the category are in place, and when the
  // tray opens again (ISSUE-077): the reset above runs before the render, and the scroll snap
  // then settles on the tile that stays (the divider), leaving the row at its far end.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (open && row && row.scrollLeft !== 0) row.scrollLeft = 0;
  }, [category, open]);
  // FLIP only the tiles: the panel and its fixed-height row never move with the filter.
  useLayoutEffect(() => {
    const previous = previousTiles.current;
    const row = rowRef.current;
    previousTiles.current = null;
    if (!previous || !row) return;
    const easing = 'cubic-bezier(0.23, 1, 0.32, 1)';
    for (const node of row.querySelectorAll<HTMLElement>('[data-tray-type]')) {
      const old = previous.get(node.dataset.trayType!);
      const rect = node.getBoundingClientRect();
      const animation = old
        ? node.animate(
            [
              { transform: `translateX(${old.rect.left - rect.left}px)` },
              { transform: 'translateX(0)' },
            ],
            { duration: 220, easing }
          )
        : node.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 160,
            delay: 60,
            fill: 'backwards',
            easing,
          });
      animations.current.push(animation);
      previous.delete(node.dataset.trayType!);
    }
    const rowRect = row.getBoundingClientRect();
    for (const { node, rect } of previous.values()) {
      node.removeAttribute('data-tray-type');
      node.classList.add('aca-widget-tray__tile--exiting');
      node.setAttribute('aria-hidden', 'true');
      node.inert = true;
      node.tabIndex = -1;
      Object.assign(node.style, {
        left: `${rect.left - rowRect.left}px`,
        top: `${rect.top - rowRect.top}px`,
      });
      row.append(node);
      ghosts.current.push(node);
      const animation = node.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 140,
        easing,
      });
      animations.current.push(animation);
      void animation.finished.then(
        () => node.remove(),
        () => node.remove()
      );
    }
  });
  return (
    <section
      className={[
        'aca-widget-tray',
        !open && 'aca-widget-tray--hidden',
        dragging && 'aca-widget-tray--dragging',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Aggiungi un widget"
      aria-hidden={!open || undefined}
      inert={!open || undefined}
      data-no-long-press
    >
      <div className="aca-widget-tray__head">
        <Heading level={2} size="sm" tone="ink" className="aca-widget-tray__title">
          Trascina un widget nella pagina
        </Heading>
        <Field
          label="Cerca un tipo di widget"
          aria-label="Cerca un tipo di widget"
          icon="search"
          type="search"
          size="sm"
          placeholder="Cerca"
          value={query}
          containerClassName="aca-widget-tray__search"
          onChange={(event) => {
            stopAnimations();
            setQuery(event.target.value);
          }}
        />
        <button
          type="button"
          className="aca-bar-button"
          aria-label="Chiudi"
          title="Chiudi"
          onClick={onClose}
        >
          <Icon name="close" size="lg" />
        </button>
      </div>
      <div className="aca-widget-tray__chips" role="group" aria-label="Categorie">
        {[{ id: 'all', label: 'Tutti' }, ...categories].map((item) => (
          <Button
            key={item.id}
            variant="control"
            size="sm"
            className="aca-widget-tray__chip"
            aria-pressed={!needle && category === item.id}
            onClick={() => selectCategory(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div ref={rowRef} className="aca-widget-tray__row" role="group" aria-label="Tipi di widget">
        {shown.map((item) => (
          <Button
            key={item.type}
            variant="control"
            shape="card"
            size="sm"
            data-tray-type={item.type}
            title={item.label}
            className="aca-widget-tray__tile"
            contentClassName="aca-widget-tray__tile-content"
            onPointerDown={(event) => {
              cancelledPointer.current = false;
              stopAnimations();
              onTilePointerDown(item, event);
            }}
            onPointerCancel={() => {
              cancelledPointer.current = true;
            }}
            onClick={(event) => {
              // Android may deliver a click after the row has cancelled the touch to scroll.
              if (event.detail > 0 && cancelledPointer.current) return;
              stopAnimations();
              onPick(item);
            }}
          >
            <Icon name={item.icon} size="lg" />
            <Body as="span" size="sm">
              {item.label}
            </Body>
            <SizeShape size={item.size} />
          </Button>
        ))}
        {shown.length === 0 && (
          <Body size="sm" tone="muted" className="aca-widget-tray__empty">
            Nessun tipo con questo nome.
          </Body>
        )}
      </div>
    </section>
  );
});
