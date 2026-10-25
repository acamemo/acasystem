import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Body, Button, Field, Popover } from '@/components/primitives';
import { useReducedMotion } from '@/hooks/launcher/useViewport';
import { IconAction } from './IconAction';
import './edit.css';

export interface PageOverviewBarProps {
  /** Out of the overview: the bar waits below the screen, inert, to rise and sink. */
  hidden: boolean;
  /**
   * The pages view is on (the pager has `is-overview`): the bar comes after four gaps of the
   * sequence of the scene (edit.css). A class of the bar and not a `:has()` on the main area,
   * which restyled the whole shell at every node mounted or removed (G2 tracing of 2026-10-24); the
   * launcher gives it the value it holds for the scene, so it changes in the commit of the pager.
   */
  overview?: boolean;
  /** Name of the page in the centre of the overview. */
  pageName: string;
  /** Widgets on that page: with any, the trash asks before deleting. */
  widgetCount: number;
  /** Null when the page can be deleted, else why not. */
  deleteBlocked: string | null;
  /** The page in the centre is the main page (the launcher opens on it, REP-20261007-033). */
  isHome: boolean;
  /** Null when the page can become the main page, else why not. */
  homeBlocked: string | null;
  /** The page in the centre (or the cover) is hidden: the eye shows it again. */
  isHidden: boolean;
  /** Null when the page can be hidden, else why not (the main page). */
  hideBlocked: string | null;
  onSetHome: () => void;
  onDelete: () => void;
  onToggleHidden: () => void;
  /** A new empty page of widgets, after the page in the centre. */
  onAdd: () => void;
  /**
   * «Aggiungi widget» (2026-10-23): the choice of a widget for the page in the centre. Absent, the
   * bar has no such action.
   */
  onAddWidget?: () => void;
  /** Null when a widget can be added to the page in the centre, else why not. */
  addWidgetBlocked?: string | null;
  /** Saves a new name, already trimmed and different; absent on the cover (plain text). */
  onRename?: (label: string) => void;
  /** Esc in the field: the name stays. */
  onRenameCancel?: () => void;
  /** The field was left empty: the old name stays, and this says why. */
  onEmptyName?: (message: string) => void;
  /** Invio on an empty name: the error shown over the field, to be read aloud. */
  onNameError?: (message: string) => void;
  /** The field opens or closes: the overview holds still meanwhile. */
  onEditingChange?: (editing: boolean) => void;
  /** Alt + arrows on the name: the page in the centre moves before or after. */
  onMove?: (direction: -1 | 1) => void;
  /** An action that cannot be taken was pressed: its reason, for the notice pill. */
  onBlocked: (reason: string) => void;
  onDone: () => void;
}

/** Message of an empty name, in the field and in the notice pill. */
export const EMPTY_NAME = 'Il nome non può essere vuoto: resta quello di prima.';

/** Rest: the name is text. Editing: the field. Closing: the field leaves while the bar narrows. */
type RenamePhase = 'rest' | 'editing' | 'closing';

/** The width glide of the bar, when the CSS does not say (--aca-rename-ms, --aca-rename-ease). */
const RENAME_MS = 240;
const RENAME_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

/**
 * The name of the page in the centre, beside the house (REP-20261009-002, D2): a tap turns it
 * into a field to rename it in place (REP-20261009-005). Invio, the «Fatto» of the keyboard
 * (the submit of the form) or leaving the field with a valid name saves; Esc keeps the name (and
 * the overview); an empty name is refused. On the cover it is plain text. The field sits in the
 * bar itself (host), over the tools that fade: the name keeps its room, so nothing moves.
 */
function PageName({
  name,
  phase,
  host,
  onPhase,
  onRename,
  onRenameCancel,
  onEmptyName,
  onNameError,
  onEditingChange,
  onMove,
}: Pick<
  PageOverviewBarProps,
  'onRename' | 'onRenameCancel' | 'onEmptyName' | 'onNameError' | 'onEditingChange' | 'onMove'
> & {
  name: string;
  phase: RenamePhase;
  /** The bar that holds the field. */
  host: HTMLElement | null;
  onPhase: (next: RenamePhase) => void;
}) {
  const editing = phase === 'editing';
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | undefined>(undefined);
  const nameRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  /** Set when the field closes: the blur that follows changes nothing. */
  const closed = useRef(false);
  /** The field closed from the keyboard: the focus goes back to the name. */
  const refocus = useRef(false);
  const hintId = `nome-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const editingChange = useRef(onEditingChange);
  useEffect(() => {
    editingChange.current = onEditingChange;
  }, [onEditingChange]);
  useEffect(() => {
    if (phase === 'rest') {
      // The name is back (the bar has settled): the keyboard finds its focus there, unless it
      // went elsewhere meanwhile.
      const active = document.activeElement;
      if (refocus.current && (active === null || active === document.body)) {
        nameRef.current?.focus();
      }
      refocus.current = false;
      return undefined;
    }
    if (phase === 'closing') return undefined;
    editingChange.current?.(true);
    fieldRef.current?.focus();
    fieldRef.current?.select();
    return () => editingChange.current?.(false);
  }, [phase]);

  const open = () => {
    closed.current = false;
    setDraft(name);
    setError(undefined);
    onPhase('editing');
  };
  const close = (fromKeyboard: boolean) => {
    closed.current = true;
    refocus.current = fromKeyboard;
    setError(undefined);
    onPhase('closing');
  };
  /** Saves the name, if changed; false when it is empty. */
  const save = () => {
    const next = draft.trim();
    if (!next) return false;
    if (next !== name) onRename?.(next);
    return true;
  };
  /** Invio or the submit of the form: saves and closes, or refuses an empty name. */
  const confirm = () => {
    if (!editing) return;
    if (save()) close(true);
    else {
      setError(EMPTY_NAME);
      onNameError?.(EMPTY_NAME);
    }
  };
  const altArrows = (event: KeyboardEvent<HTMLElement>) => {
    if (!onMove || !event.altKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    // Held: the browser would go back a page with Alt + ←. The name stays, with the focus.
    event.preventDefault();
    onMove(event.key === 'ArrowLeft' ? -1 : 1);
  };

  if (!onRename) {
    // The cover cannot be renamed, but its name looks as the others (REP-20261012-002).
    return (
      <span className="aca-page-overview__name is-static">
        <Body as="span" size="md" tone="ink" className="aca-page-overview__label">
          {name}
        </Body>
      </span>
    );
  }
  return (
    <>
      {/* Plain text between two thin lines (edit.css); a tap edits it. */}
      <button
        ref={nameRef}
        type="button"
        className="aca-bar-button aca-page-overview__name"
        aria-label={`Rinomina ${name}`}
        data-page-rename
        onClick={open}
        onKeyDown={altArrows}
      >
        <Body as="span" size="md" tone="ink" className="aca-page-overview__label">
          {name}
        </Body>
      </button>
      {host &&
        phase !== 'rest' &&
        createPortal(
          // A form, so the «Fatto» of an Android keyboard saves as Invio does, also when the
          // keydown it sends says Unidentified.
          <form
            className="aca-page-overview__field"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              confirm();
            }}
          >
            <Field
              ref={fieldRef}
              label="Nome della pagina"
              size="md"
              value={draft}
              error={error}
              aria-describedby={hintId}
              enterKeyHint="done"
              autoComplete="off"
              readOnly={!editing}
              onChange={(event) => {
                setDraft(event.target.value);
                if (error) setError(undefined);
              }}
              onKeyDown={(event) => {
                if (!editing) return;
                if (event.key === 'Enter') {
                  // Held: the submit of the form would run a second time.
                  event.preventDefault();
                  confirm();
                } else if (event.key === 'Escape') {
                  // Handled here: the Esc of the launcher would close the overview.
                  event.preventDefault();
                  close(true);
                  onRenameCancel?.();
                } else if (event.key === 'Tab') {
                  // Held: the tools are inert meanwhile, so the focus would be lost. The name
                  // is saved (or kept, if empty) and the focus returns to it, as with Invio.
                  event.preventDefault();
                  if (!save()) onEmptyName?.(EMPTY_NAME);
                  close(true);
                }
              }}
              onBlur={() => {
                if (closed.current || !editing) return;
                if (!save()) onEmptyName?.(EMPTY_NAME);
                close(false);
              }}
            />
            <span id={hintId} hidden>
              Invio per salvare, Esc per annullare
            </span>
          </form>,
          host
        )}
    </>
  );
}

/**
 * Bar of the page overview (REP-20261007-028, REP-20261008-001, REP-20261009-002): it rises
 * where the page indicator was, with places that never move: delete, new (an empty page at
 * once), add a widget (2026-10-23), the house with the name of the page beside it, hide/show,
 * then «Fine». The actions
 * are icons with their tip (IconAction); the trash asks first only when the page holds widgets.
 * Renaming (REP-20261009-005): the icons and «Fine» fade, the bar glides to the width of the
 * field and becomes just that; when the name is saved or kept it glides back and they return.
 * Order and columns are under the card in the centre (PageCardControls).
 */
export function PageOverviewBar({
  hidden,
  overview = false,
  pageName,
  widgetCount,
  deleteBlocked,
  isHome,
  homeBlocked,
  isHidden,
  hideBlocked,
  onSetHome,
  onDelete,
  onToggleHidden,
  onAdd,
  onAddWidget,
  addWidgetBlocked = null,
  onRename,
  onRenameCancel,
  onEmptyName,
  onNameError,
  onEditingChange,
  onMove,
  onBlocked,
  onDone,
}: PageOverviewBarProps) {
  const [phase, setPhase] = useState<RenamePhase>('rest');
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  /** The width of the bar before the change of phase, for the glide to the width after it. */
  const fromWidth = useRef<number | null>(null);
  const glide = useRef<Animation | null>(null);
  const changePhase = (next: RenamePhase) => {
    fromWidth.current = host?.getBoundingClientRect().width ?? null;
    setPhase(next);
  };
  /*
   * The width of the bar is not animated by the layout: after the change it is measured, and the
   * bar glides from the old width to the new (a width animation of the bar alone, which no band
   * or page measures). Without a layout or with reduced motion the change is immediate.
   */
  useLayoutEffect(() => {
    const from = fromWidth.current;
    if (from === null) return;
    fromWidth.current = null;
    glide.current?.cancel();
    glide.current = null;
    const settle = () => {
      glide.current = null;
      if (phase === 'closing') setPhase('rest');
    };
    const to = host?.getBoundingClientRect().width ?? 0;
    // Equal widths still glide (a no-op in width): the closing field needs its fade to be seen.
    if (!host || reduced || typeof host.animate !== 'function' || !(from > 0 && to > 0)) {
      settle();
      return;
    }
    const styles = getComputedStyle(host);
    glide.current = host.animate([{ width: `${from}px` }, { width: `${to}px` }], {
      duration: parseFloat(styles.getPropertyValue('--aca-rename-ms')) || RENAME_MS,
      easing: styles.getPropertyValue('--aca-rename-ease').trim() || RENAME_EASE,
    });
    glide.current.onfinish = settle;
  }, [phase, host, reduced]);
  useEffect(() => () => glide.current?.cancel(), []);
  const deleteLabel = `Elimina la pagina ${pageName}`;
  const trash = (props: Record<string, unknown> = {}) => (
    <IconAction
      {...props}
      icon="trash"
      label={deleteLabel}
      tip="Elimina la pagina"
      blocked={deleteBlocked}
      onBlocked={onBlocked}
    />
  );
  return (
    <div
      className={[
        'aca-page-overview',
        hidden && 'aca-page-overview--hidden',
        overview && 'aca-page-overview--overview',
      ]
        .filter(Boolean)
        .join(' ')}
      role="toolbar"
      aria-label="Pagine"
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      data-no-long-press
    >
      <div
        ref={setHost}
        className={[
          'aca-page-overview__group',
          phase !== 'rest' && 'is-renaming',
          phase === 'closing' && 'is-closing',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* The tools fade while the name is a field, and cannot be reached meanwhile. */}
        <div
          className="aca-page-overview__tools"
          aria-hidden={phase !== 'rest' || undefined}
          inert={phase !== 'rest' || undefined}
        >
          {widgetCount > 0 && deleteBlocked === null ? (
            <Popover
              label={`Conferma l’eliminazione di ${pageName}`}
              placement="top-start"
              trigger={(props) => trash(props as unknown as Record<string, unknown>)}
            >
              {(close) => (
                <div className="aca-widget-confirm">
                  <Body size="sm" tone="ink">
                    {`Eliminare «${pageName}» e ${
                      widgetCount === 1 ? 'il suo widget' : `i suoi ${widgetCount} widget`
                    }?`}
                  </Body>
                  <div className="aca-widget-confirm__actions">
                    <Button
                      variant="secondary"
                      size="md"
                      className="aca-frame-pill"
                      data-autofocus
                      onClick={close}
                    >
                      Annulla
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      className="aca-frame-pill"
                      onClick={() => {
                        close();
                        onDelete();
                      }}
                    >
                      Elimina
                    </Button>
                  </div>
                </div>
              )}
            </Popover>
          ) : (
            trash({ onClick: onDelete })
          )}
          {/* D1: an empty page at once; its widgets come from the free cells of the grid. */}
          <IconAction
            icon="add"
            label="Nuova pagina"
            tip="Nuova pagina vuota o per categoria"
            onBlocked={onBlocked}
            onClick={onAdd}
          />
          {/* A widget for the page in the centre: the way in on a full page and on the cover. */}
          {onAddWidget && (
            <IconAction
              icon="widgetAdd"
              label="Aggiungi widget"
              tip="Aggiungi un widget a questa pagina"
              blocked={addWidgetBlocked}
              onBlocked={onBlocked}
              onClick={onAddWidget}
            />
          )}
          <span className="aca-page-overview__page">
            {/* House icon, as the Samsung overview: the launcher opens on the main page. */}
            <IconAction
              icon="home"
              className="aca-page-overview__home"
              label={
                isHome
                  ? `${pageName} è la pagina principale`
                  : `Imposta ${pageName} come principale`
              }
              tip={isHome ? 'È la pagina principale' : 'Rendi principale'}
              aria-pressed={isHome}
              blocked={isHome ? null : homeBlocked}
              onBlocked={onBlocked}
              onClick={() => {
                if (!isHome) onSetHome();
              }}
            />
            <PageName
              name={pageName}
              phase={phase}
              host={host}
              onPhase={changePhase}
              onRename={onRename}
              onRenameCancel={onRenameCancel}
              onEmptyName={onEmptyName}
              onNameError={onNameError}
              onEditingChange={onEditingChange}
              onMove={onMove}
            />
          </span>
          <IconAction
            icon={isHidden ? 'eye' : 'eyeSlash'}
            label={isHidden ? `Mostra ${pageName}` : `Nascondi ${pageName}`}
            tip={isHidden ? 'Mostra la pagina' : 'Nascondi la pagina'}
            blocked={isHidden ? null : hideBlocked}
            onBlocked={onBlocked}
            onClick={onToggleHidden}
          />
          <Button variant="primary" size="md" className="aca-frame-pill" onClick={onDone}>
            Fine
          </Button>
        </div>
      </div>
    </div>
  );
}
