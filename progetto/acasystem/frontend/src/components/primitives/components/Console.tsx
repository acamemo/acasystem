import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { afterTransition, canAnimate, prefersReducedMotion } from '../motion';
import { DialogShell } from './DialogShell';
import { Icon } from './Icon';
import { PanelPresence } from './PanelPresence';
import { SHEET_IN_MS } from './Sheet';
import { Heading } from '../typography/Heading';

/** The rectangle (viewport pixels) the console grows out of and shrinks back into. */
export interface ConsoleOrigin {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ConsoleProps {
  open: boolean;
  /** Called for the back button, Escape, Android Back and a swipe down; the owner sets open. */
  onClose: () => void;
  title: string;
  /** Rectangle of the widget it comes from; without it the console fades and scales from the centre. */
  origin?: ConsoleOrigin;
  /** Pinned at the end of the header. */
  actions?: ReactNode;
  /** Accessible name of the back button (default «Chiudi»: «Indietro» is a key of the TV remote). */
  closeLabel?: string;
  children?: ReactNode;
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

/** `transform` that puts the full-screen panel over the rectangle of the widget. */
function fromTransform(origin: ConsoleOrigin): string {
  const sx = origin.width / Math.max(1, window.innerWidth);
  const sy = origin.height / Math.max(1, window.innerHeight);
  return `translate(${origin.left}px, ${origin.top}px) scale(${sx}, ${sy})`;
}

interface PanelProps {
  title: string;
  titleId: string;
  origin?: ConsoleOrigin;
  actions?: ReactNode;
  closeLabel: string;
  requestClose: () => void;
  children?: ReactNode;
}

function ConsolePanel({
  title,
  titleId,
  origin,
  actions,
  closeLabel,
  requestClose,
  children,
}: PanelProps) {
  const flightRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{
    id: number;
    startY: number;
    startAt: number;
    dy: number;
    dragging: boolean;
  } | null>(null);
  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  }, [requestClose]);

  // The panel arrives showing its structure; the content fades in when it has arrived, as in the
  // sheets (D-M5). Where nothing moves (jsdom, reduced motion) there is nothing to wait for.
  useLayoutEffect(() => {
    const flight = flightRef.current;
    if (!flight) return undefined;
    const arrive = () => flight.setAttribute('data-arrived', '');
    if (canAnimate() && !prefersReducedMotion()) {
      return afterTransition(flight, ['transform'], SHEET_IN_MS, arrive);
    }
    arrive();
    return undefined;
  }, []);

  const springBack = () => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.style.transition = `transform ${SPRING_BACK_MS}ms var(--aca-motion-ease-out, cubic-bezier(0.23, 1, 0.32, 1))`;
    drag.style.transform = '';
  };

  const finish = (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const state = swipe.current;
    if (!state || state.id !== event.pointerId) return;
    swipe.current = null;
    if (!state.dragging) return;
    const elapsed = Math.max(1, performance.now() - state.startAt);
    const far = state.dy > window.innerHeight * SWIPE_CLOSE_RATIO;
    const flick = state.dy > SWIPE_FLICK_MIN_PX && state.dy / elapsed > SWIPE_FLICK_PX_PER_MS;
    if (!cancelled && (far || flick)) {
      // The offset stays: the panel shrinks into the widget from where the finger left it.
      requestCloseRef.current();
      // The owner may keep it open: do not leave the panel hanging half way.
      window.setTimeout(() => {
        if (dragRef.current?.isConnected && dragRef.current.style.transform) springBack();
      }, 600);
    } else springBack();
  };

  const style: CSSProperties | undefined = prefersReducedMotion()
    ? undefined
    : origin
      ? ({
          '--aca-console-from': fromTransform(origin),
          transformOrigin: '0 0',
        } as CSSProperties)
      : ({ '--aca-console-from': 'scale(0.94)', transformOrigin: '50% 50%' } as CSSProperties);

  return (
    <div ref={flightRef} className="aca-console" style={style} data-aca-console="">
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
          >
            <Icon name="chevronLeft" size="lg" />
          </button>
          <Heading level={2} size="md" tone="ink" id={titleId} className="aca-console__title">
            {title}
          </Heading>
          {actions && <div className="aca-console__actions">{actions}</div>}
        </header>
        <div className="aca-console__body">{children}</div>
      </div>
    </div>
  );
}

/**
 * Full-screen console that grows out of the widget that opened it (FLIP: translate and scale of
 * the panel from `origin`, opacity, nothing else; no animated shadow or filter, the tablet's GPU
 * cannot raster them) and shrinks back into it. Built on DialogShell (focus, Tab, Escape, scroll
 * lock) and PanelPresence (the panel stays for its exit). It takes one entry in the history:
 * Android Back closes it, and the other ways to close go back through that entry, so the page
 * is never left. With reduced motion it only fades.
 */
export function Console({
  open,
  onClose,
  title,
  origin,
  actions,
  closeLabel = 'Chiudi',
  children,
}: ConsoleProps) {
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
    <PanelPresence>
      {open && (
        <DialogShell
          open
          onClose={requestClose}
          overlayClassName="aca-console-overlay"
          panelClassName="aca-console-dialog"
        >
          {(titleId) => (
            <ConsolePanel
              title={title}
              titleId={titleId}
              origin={origin}
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
      <div className="aca-console-column">{main}</div>
      {side && <div className="aca-console-column">{side}</div>}
    </div>
  );
}
