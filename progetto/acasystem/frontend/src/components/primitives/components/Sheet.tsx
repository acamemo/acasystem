import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { afterTransition, canAnimate, prefersReducedMotion } from '../motion';
import { Icon } from './Icon';
import { MaterialLayers, materialClass } from './Material';
import { useScrollLock } from './scrollLock';
import { Heading } from '../typography/Heading';
import { Body } from '../typography/Body';

const AUTOFOCUS_SELECTOR = '[data-autofocus], [autofocus]';
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

export interface SheetProps {
  open: boolean;
  /** Called for the close button, Escape and a click on the backdrop; the owner sets open. */
  onClose: () => void;
  title: string;
  /** Short text under the title, announced as the dialog description. */
  description?: string;
  closeLabel?: string;
  /** Actions pinned under the scrolling body. */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Times of the sheet, mirrored from `--aca-dur-sheet-in` / `-out` / `-reduced` (tokens.css; a test
 * keeps them equal). The choreography of the sheets (REP-20261023-006, D-M5, D-M19): the panel
 * comes up in 280 ms and goes down in 200 ms; while it comes up it shows only its structure and the
 * content fades in when it has arrived; while it goes down the content stays as it was.
 */
export const SHEET_IN_MS = 280;
export const SHEET_OUT_MS = 200;
export const SHEET_REDUCED_MS = 120;
/** Two sheets one after the other: the second comes when the first is this far out (about 100 ms). */
export const SHEET_OVERLAP = 0.5;

/** When the last sheet began to leave, for the next one to come in half way (D-M19). */
let lastExit: { at: number; ms: number } | null = null;

interface SheetFrame {
  title: string;
  description?: string;
  footer?: ReactNode;
  children?: ReactNode;
}

const supportsModal = () =>
  typeof HTMLDialogElement !== 'undefined' &&
  typeof HTMLDialogElement.prototype.showModal === 'function';

/**
 * Bottom sheet on a native modal <dialog>: top layer and inert page, focus moved inside and
 * restored on close, Escape, backdrop click, page scroll locked. It slides up from the bottom;
 * with reduced motion it appears in place.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  closeLabel = 'Chiudi',
  footer,
  children,
  className,
}: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const pressedOnBackdrop = useRef(false);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `foglio-${id}-titolo`;
  const descriptionId = `foglio-${id}-descrizione`;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useScrollLock(open);

  // What the sheet shows while it goes down is what it showed open (T-04 of REP-20261022-001: the
  // owner clears its state in the very commit of the close, and the content used to go in the first
  // frame of the exit). `leaving` lasts from that commit to the end of the exit (P1), only where the
  // browser animates; the state is derived in the render so that no frame shows an empty sheet.
  const frame: SheetFrame = { title, description, footer, children };
  const lastOpenFrame = useRef(frame);
  useLayoutEffect(() => {
    if (open) lastOpenFrame.current = frame;
  });
  const [wasOpen, setWasOpen] = useState(open);
  const [leaving, setLeaving] = useState(false);
  if (wasOpen !== open) {
    setWasOpen(open);
    setLeaving(!open && canAnimate());
  }
  const shown = !open && leaving ? lastOpenFrame.current : frame;

  useEffect(() => {
    if (!leaving) return undefined;
    const ms = prefersReducedMotion() ? SHEET_REDUCED_MS : SHEET_OUT_MS;
    // The cap counts from the start of the transition (`fromRun`), not only from this commit: the
    // exit begins a restyle later and, on the tablet, ends later than its time. A cap from the
    // commit let the closed content replace the frozen one while the panel was still on screen,
    // and the dialog shifted (layout-shift 0.09, REP-20261023-006, 0.9.28).
    return afterTransition(
      dialogRef.current,
      ['transform', 'opacity', 'display'],
      ms,
      () => setLeaving(false),
      { fromRun: true }
    );
  }, [leaving]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return undefined;
    const previous = document.activeElement;
    const animated = canAnimate();
    const reduced = prefersReducedMotion();

    const show = () => {
      if (!dialog.open) {
        if (supportsModal()) dialog.showModal();
        else dialog.setAttribute('open', '');
      }
      // Autofocus first, then the first control of the content, then the close button.
      const target =
        dialog.querySelector<HTMLElement>(AUTOFOCUS_SELECTOR) ??
        dialog.querySelector('.aca-sheet__body')?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
        dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      target?.focus();
    };

    // The panel comes up showing its structure; the content takes its place when the panel has
    // arrived (D-M5). Where nothing moves (jsdom, reduced motion) there is nothing to wait for.
    const arrive = () => dialog.setAttribute('data-arrived', '');
    dialog.removeAttribute('data-arrived');
    let stopArrival: (() => void) | null = null;
    const startArrival = () => {
      if (animated && !reduced) {
        stopArrival = afterTransition(dialog, ['transform'], SHEET_IN_MS, arrive);
      } else arrive();
    };
    // A second sheet comes when the first is half out: about 100 ms of both (D-M19).
    const wait =
      animated && lastExit
        ? Math.min(
            lastExit.ms * SHEET_OVERLAP,
            Math.max(0, lastExit.at + lastExit.ms * SHEET_OVERLAP - performance.now())
          )
        : 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (wait > 0) {
      timer = setTimeout(() => {
        timer = null;
        show();
        startArrival();
      }, wait);
    } else {
      show();
      startArrival();
    }

    // Without showModal (old engines, tests) Escape is handled here.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !supportsModal()) {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timer !== null) clearTimeout(timer);
      stopArrival?.();
      if (dialog.open) {
        if (typeof dialog.close === 'function' && supportsModal()) dialog.close();
        else dialog.removeAttribute('open');
        if (animated) {
          lastExit = { at: performance.now(), ms: reduced ? SHEET_REDUCED_MS : SHEET_OUT_MS };
        }
      }
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);

  // Escape: keep the dialog open and let the owner decide.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onCloseRef.current();
  };
  // The browser may still close it (repeated Escape without user activation): sync the owner.
  // The close event is queued: ignore it if the dialog has been shown again in the meantime.
  const handleClose = () => {
    if (open && !dialogRef.current?.open) onCloseRef.current();
  };

  return (
    <dialog
      ref={dialogRef}
      className={['aca-sheet', className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
      aria-describedby={shown.description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClose={handleClose}
      onPointerDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressedOnBackdrop.current) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div className={materialClass({ behavior: 'static', shape: 'card' }, 'aca-sheet__panel')}>
        <MaterialLayers element="div" contentClassName="aca-sheet__content">
          <header className="aca-sheet__header">
            <div>
              <Heading level={2} size="md" tone="ink" id={titleId}>
                {shown.title}
              </Heading>
              {shown.description && (
                <Body size="sm" tone="muted" id={descriptionId}>
                  {shown.description}
                </Body>
              )}
            </div>
            <button
              type="button"
              className="aca-bar-button"
              onClick={onClose}
              aria-label={closeLabel}
            >
              <Icon name="close" size="lg" />
            </button>
          </header>
          <div className="aca-sheet__body">{shown.children}</div>
          {shown.footer && <footer className="aca-sheet__footer">{shown.footer}</footer>}
        </MaterialLayers>
      </div>
    </dialog>
  );
}
