import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { prefersReducedMotion } from '../motion';
import { DialogShell } from './DialogShell';
import { Icon } from './Icon';
import { PanelPresence } from './PanelPresence';
import { SHEET_OUT_MS, SHEET_REDUCED_MS } from './Sheet';
import { Heading } from '../typography/Heading';

export interface ConsoleProps {
  open: boolean;
  /** Called for the back button, Escape, Android Back and a swipe down; the owner sets open. */
  onClose: () => void;
  title: string;
  /** Pinned at the end of the header. */
  actions?: ReactNode;
  /** Accessible name of the back button (default «Chiudi»: «Indietro» is a key of the TV remote). */
  closeLabel?: string;
  children?: ReactNode;
  /** Completion of the real exit, for handing focus to a following screen. */
  onExited?: () => void;
}

/** A swipe down from the header closes beyond a quarter of the viewport, or as a quick flick. */
const SWIPE_CLOSE_RATIO = 0.25;
const SWIPE_FLICK_PX_PER_MS = 0.6;
const SWIPE_FLICK_MIN_PX = 24;
/** The finger moves this far before the header is dragged (a tap on the title stays a tap). */
const SWIPE_START_PX = 8;
/** The panel follows the finger at this fraction of its travel. */
const SWIPE_DAMPING = 0.85;
const SPRING_BACK_MS = 220;

const HISTORY_KEY = 'acaConsole';
let consoleSeq = 0;

const INTERACTIVE = 'button, a[href], input, select, textarea, [role="slider"], [data-no-swipe]';

/** Tracks only the edges with more content; scrolling and focus stay browser-owned. */
function ConsoleScrollArea({ kind, children }: { kind: 'body' | 'column'; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const updateEdges = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const scrollable = /^(auto|scroll)$/.test(getComputedStyle(node).overflowY);
    const start = scrollable && node.scrollTop > 1;
    const end = scrollable && node.scrollHeight - node.clientHeight - node.scrollTop > 1;
    setEdges((previous) => previous.start === start && previous.end === end ? previous : { start, end });
  }, []);
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    updateEdges();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(updateEdges) : null;
    observer?.observe(node);
    for (const child of node.children) observer?.observe(child);
    window.addEventListener('resize', updateEdges);
    return () => { observer?.disconnect(); window.removeEventListener('resize', updateEdges); };
  }, [children, updateEdges]);
  return <div className={`aca-console-${kind}-frame`}
    data-scroll-start={edges.start || undefined} data-scroll-end={edges.end || undefined}>
    <div ref={scrollRef} className={kind === 'body' ? 'aca-console__body' : 'aca-console-column'} onScroll={updateEdges}>
      {children}
    </div>
  </div>;
}

interface PanelProps {
  entry: number;
  title: string;
  titleId: string;
  actions?: ReactNode;
  closeLabel: string;
  requestClose: () => void;
  children?: ReactNode;
}

function ConsolePanel({
  entry,
  title,
  titleId,
  actions,
  closeLabel,
  requestClose,
  children,
}: PanelProps) {
  const dragRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{
    id: number;
    startY: number;
    startAt: number;
    dy: number;
    dragging: boolean;
  } | null>(null);
  const recoveryTimer = useRef<number | undefined>(undefined);
  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  }, [requestClose]);

  const springBack = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.style.transition = `transform ${SPRING_BACK_MS}ms var(--aca-motion-ease-out, cubic-bezier(0.23, 1, 0.32, 1))`;
    drag.style.transform = '';
  }, []);

  // PanelPresence can retain this same DOM on a rapid close/reopen. Clear the old gesture
  // recovery and return its presentation offset, without restarting the window transition.
  useLayoutEffect(() => {
    clearTimeout(recoveryTimer.current);
    swipe.current = null;
    if (dragRef.current?.style.transform) springBack();
    return () => clearTimeout(recoveryTimer.current);
  }, [entry, springBack]);

  const finish = (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const state = swipe.current;
    if (!state || state.id !== event.pointerId) return;
    swipe.current = null;
    if (!state.dragging) return;
    const elapsed = Math.max(1, performance.now() - state.startAt);
    const far = state.dy > window.innerHeight * SWIPE_CLOSE_RATIO;
    const flick = state.dy > SWIPE_FLICK_MIN_PX && state.dy / elapsed > SWIPE_FLICK_PX_PER_MS;
    if (!cancelled && (far || flick)) {
      // The window keeps the gesture offset while it fades out from the release point.
      requestCloseRef.current();
      // The owner may keep it open: do not leave the panel hanging half way.
      clearTimeout(recoveryTimer.current);
      recoveryTimer.current = window.setTimeout(() => {
        if (dragRef.current?.isConnected && dragRef.current.style.transform) springBack();
      }, 600);
    } else springBack();
  };

  return (
    <div className="aca-console" data-aca-console="">
      <div ref={dragRef} className="aca-console__sheet">
        <header
          className="aca-console__header"
          onPointerDown={(event) => {
            if (!event.isPrimary || (event.target as Element).closest(INTERACTIVE)) return;
            swipe.current = {
              id: event.pointerId,
              startY: event.clientY,
              startAt: performance.now(),
              dy: 0,
              dragging: false,
            };
          }}
          onPointerMove={(event) => {
            const state = swipe.current;
            const drag = dragRef.current;
            if (!state || state.id !== event.pointerId || !drag) return;
            const dy = event.clientY - state.startY;
            if (!state.dragging) {
              if (dy < SWIPE_START_PX) return;
              state.dragging = true;
              event.currentTarget.setPointerCapture?.(event.pointerId);
              drag.style.transition = 'none';
            }
            state.dy = Math.max(0, dy);
            drag.style.transform = `translateY(${state.dy * SWIPE_DAMPING}px)`;
          }}
          onPointerUp={(event) => finish(event, false)}
          onPointerCancel={(event) => finish(event, true)}
        >
          <button
            type="button"
            className="aca-bar-button"
            onClick={requestClose}
            aria-label={closeLabel}
            data-autofocus
          >
            <Icon name="chevronLeft" size="lg" />
          </button>
          <Heading level={2} size="md" tone="ink" id={titleId} className="aca-console__title">
            {title}
          </Heading>
          {actions && <div className="aca-console__actions">{actions}</div>}
        </header>
        <ConsoleScrollArea kind="body">{children}</ConsoleScrollArea>
      </div>
    </div>
  );
}

/**
 * A full-screen window that rises and fades in from below as one complete unit.
 * Its title, controls and content are one visual unit, with no delayed or concealed inner body.
 * DialogShell owns focus/Tab/Escape/scroll lock; PanelPresence retains the window for its exit.
 * One history entry makes Android Back close the window, without leaving the current page.
 * Reduced motion keeps only the fade.
 */
export function Console({
  open,
  onClose,
  title,
  actions,
  closeLabel = 'Chiudi',
  children,
  onExited,
}: ConsoleProps) {
  const [wasOpen, setWasOpen] = useState(open);
  const [entry, setEntry] = useState(0);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setEntry(entry + 1);
  }
  const onCloseRef = useRef(onClose);
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const ownsHistory = () =>
    tokenRef.current !== null &&
    (window.history.state as Record<string, unknown> | null)?.[HISTORY_KEY] === tokenRef.current;

  // Back button, Escape and swipe: through the history when our entry is the current one.
  const requestClose = useCallback(() => {
    if (ownsHistory()) window.history.back();
    else onCloseRef.current();
  }, []);

  const openRef = useRef(false);
  useEffect(() => {
    if (!open) return undefined;
    openRef.current = true;
    // StrictMode runs the effect twice in a row: the entry of the first run is reused.
    if (!ownsHistory()) {
      const token = `console-${++consoleSeq}`;
      tokenRef.current = token;
      const previous = (window.history.state as Record<string, unknown> | null) ?? {};
      window.history.pushState({ ...previous, [HISTORY_KEY]: token }, '');
    }
    const handlePop = () => {
      // Our entry is gone (Android Back, or the browser's): the console closes with it.
      if (!ownsHistory()) onCloseRef.current();
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      openRef.current = false;
      window.removeEventListener('popstate', handlePop);
      // Closed by the owner without going back: take our entry off, so Back does not come here.
      setTimeout(() => {
        if (openRef.current) return;
        if (ownsHistory()) window.history.back();
        tokenRef.current = null;
      }, 0);
    };
  }, [open]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <PanelPresence exitMs={prefersReducedMotion() ? SHEET_REDUCED_MS : SHEET_OUT_MS} onExited={onExited}>
      {open && (
        <DialogShell
          open
          onClose={requestClose}
          overlayClassName="aca-console-overlay"
          panelClassName="aca-console-dialog"
        >
          {(titleId) => (
            <ConsolePanel
              entry={entry}
              title={title}
              titleId={titleId}
              actions={actions}
              closeLabel={closeLabel}
              requestClose={requestClose}
            >
              {children}
            </ConsolePanel>
          )}
        </DialogShell>
      )}
    </PanelPresence>,
    document.body
  );
}

/**
 * The two columns of a console: `main` and `side` side by side from 900 px of width, each scrolling
 * on its own; below that one column, the whole console scrolling.
 */
export function ConsoleColumns({ main, side }: { main: ReactNode; side?: ReactNode }) {
  return (
    <div className="aca-console-columns">
      <ConsoleScrollArea kind="column">{main}</ConsoleScrollArea>
      {side && <ConsoleScrollArea kind="column">{side}</ConsoleScrollArea>}
    </div>
  );
}
