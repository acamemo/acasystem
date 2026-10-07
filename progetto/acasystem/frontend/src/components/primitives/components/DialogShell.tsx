import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { lockScroll } from './scrollLock';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PRIORITY_FOCUS_SELECTOR =
  '[data-autofocus], [autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';

export interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  /** Id of the element naming the dialog; generated when missing and passed to children. */
  titleId?: string;
  describedBy?: string;
  overlayClassName?: string;
  overlayStyle?: CSSProperties;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  children: (titleId: string) => ReactNode;
}

/**
 * Modal dialog semantics on a div: initial focus (fields before the close button), Tab kept
 * inside, Escape and overlay click close, page scroll locked, focus restored on close.
 * Escape is ignored while the dialog is leaving inside a PanelPresence.
 * Styling stays with the owner through the overlay and panel classes.
 */
export function DialogShell({
  open,
  onClose,
  titleId,
  describedBy,
  overlayClassName,
  overlayStyle,
  panelClassName,
  panelStyle,
  children,
}: DialogShellProps) {
  const fallbackTitleId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const resolvedTitleId = titleId || `modal-title-${fallbackTitleId}`;
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<Element | null>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return undefined;
    }

    const openedNow = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (openedNow) previousActiveRef.current = document.activeElement;

    const releaseScroll = lockScroll();

    const panel = panelRef.current;
    if (openedNow && panel) {
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const priorityTarget = panel.querySelector<HTMLElement>(PRIORITY_FOCUS_SELECTOR);
      const nonCloseTarget = focusables.find((el) => !el.classList.contains('modal-close'));
      const target = priorityTarget || nonCloseTarget || focusables[0] || panel;
      target.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const current = panelRef.current;
      if (!current || current.closest('[data-panel-state="exiting"]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusables.length) {
        event.preventDefault();
        current.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      releaseScroll();
      const previous = previousActiveRef.current;
      if (
        previous instanceof HTMLElement &&
        (document.activeElement === document.body || panel?.contains(document.activeElement))
      )
        previous.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={overlayClassName} style={overlayStyle} onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        aria-describedby={describedBy}
        className={panelClassName}
        style={panelStyle}
        onClick={(event) => event.stopPropagation()}
        tabIndex={-1}
      >
        {children(resolvedTitleId)}
      </div>
    </div>
  );
}
