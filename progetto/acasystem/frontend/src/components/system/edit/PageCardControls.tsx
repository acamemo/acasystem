import { useRef, type KeyboardEvent } from 'react';
import { Icon, Numeric } from '@/components/primitives';
import { IconAction } from './IconAction';
import './edit.css';

/** Moving the page one place before or after; each side null when it can, else why not. */
export interface CardMove {
  before: string | null;
  after: string | null;
  onMove: (direction: -1 | 1) => void;
}

/** Columns of the page on this screen (C.6): what is shown, and a step each way. */
export interface CardColumns {
  /** Columns and rows of the grid shown on this screen. */
  shown: number;
  rows: number;
  /** Null when the step can be taken, else why not. */
  less: string | null;
  more: string | null;
  onStep: (direction: -1 | 1) => void;
}

export interface PageCardControlsProps {
  /** Name of the page in the centre. */
  name: string;
  /** Absent on the cover, which stays first. */
  move?: CardMove;
  /** Pages of widgets and the cover. */
  columns?: CardColumns;
  /** A control that cannot be used was pressed: its reason, for the notice pill. */
  onBlocked: (reason: string) => void;
}

/**
 * The row under the card in the centre of the page overview (REP-20261008-001, REP-20261009-002):
 * the arrows that move the page before or after (the single-tap alternative to holding and
 * dragging the card, WCAG 2.5.7) at its sides, and the columns of the page on this screen
 * between them. Plain icons with their tip (IconAction), no words; the name is in the bar of
 * the pages. Alt + arrows on an arrow move the page from the keyboard, as on the card.
 */
export function PageCardControls({ name, move, columns, onBlocked }: PageCardControlsProps) {
  const beforeRef = useRef<HTMLButtonElement>(null);
  const afterRef = useRef<HTMLButtonElement>(null);

  /** After a move the card changes place in the page: the focus stays on the arrows. */
  const moveBy = (direction: -1 | 1) => {
    if (!move) return;
    const blocked = direction < 0 ? move.before : move.after;
    if (blocked) {
      onBlocked(blocked);
      return;
    }
    move.onMove(direction);
    requestAnimationFrame(() => {
      const used = direction < 0 ? beforeRef.current : afterRef.current;
      const other = direction < 0 ? afterRef.current : beforeRef.current;
      (used?.getAttribute('aria-disabled') === 'true' ? other : used)?.focus();
    });
  };
  const altArrows = (event: KeyboardEvent<HTMLElement>) => {
    if (!event.altKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    // Held: the browser would go back a page with Alt + ←.
    event.preventDefault();
    moveBy(event.key === 'ArrowLeft' ? -1 : 1);
  };
  const rows = columns ? (columns.rows === 1 ? '1 riga' : `${columns.rows} righe`) : '';

  return (
    <div className="aca-page-card" data-no-long-press>
      {move && (
        <IconAction
          ref={beforeRef}
          icon="pageBefore"
          className="aca-page-card__move aca-page-card__move--before"
          label={`Sposta ${name} prima`}
          tip="Sposta prima"
          blocked={move.before}
          onBlocked={onBlocked}
          onClick={() => moveBy(-1)}
          onKeyDown={altArrows}
        />
      )}
      {columns && (
        <div className="aca-page-card__columns" role="group" aria-label={`Colonne di ${name}`}>
          <IconAction
            icon="minus"
            iconSize="md"
            label="Meno colonne"
            tip="Meno colonne"
            blocked={columns.less}
            onBlocked={onBlocked}
            onClick={() => columns.onStep(-1)}
          />
          <span className="aca-page-card__value">
            <Icon name="grid" size="sm" className="aca-page-card__grid" />
            <Numeric>{columns.shown}</Numeric>
            <span className="sr-only">{` colonne e ${rows}`}</span>
          </span>
          <IconAction
            icon="add"
            iconSize="md"
            label="Più colonne"
            tip="Più colonne"
            blocked={columns.more}
            onBlocked={onBlocked}
            onClick={() => columns.onStep(1)}
          />
        </div>
      )}
      {move && (
        <IconAction
          ref={afterRef}
          icon="pageAfter"
          className="aca-page-card__move aca-page-card__move--after"
          label={`Sposta ${name} dopo`}
          tip="Sposta dopo"
          blocked={move.after}
          onBlocked={onBlocked}
          onClick={() => moveBy(1)}
          onKeyDown={altArrows}
        />
      )}
    </div>
  );
}
