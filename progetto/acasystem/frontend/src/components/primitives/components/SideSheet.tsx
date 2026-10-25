import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from 'react';
import { Icon } from './Icon';
import { useScrollLock } from './scrollLock';
import { Heading } from '../typography/Heading';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SideSheetProps {
  open: boolean;
  /** Called for the close button, Escape and a click on the backdrop; the owner sets open. */
  onClose: () => void;
  title: string;
  closeLabel?: string;
  children?: ReactNode;
  className?: string;
}

const supportsModal = () =>
  typeof HTMLDialogElement !== 'undefined' &&
  typeof HTMLDialogElement.prototype.showModal === 'function';

/**
 * Side panel on a native modal <dialog>, sliding in from the left: top layer and inert page,
 * focus moved to its first control and given back on close, Escape, backdrop click, page scroll
 * locked. It is flat on purpose (no shadow, a hairline edge): it stands over a picture that
 * keeps drawing, such as the Casa 3D view, and a shadow there would be rasterised again and again.
 * With reduced motion it appears in place.
 */
export function SideSheet({
  open,
  onClose,
  title,
  closeLabel = 'Chiudi',
  children,
  className,
}: SideSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const pressedOnBackdrop = useRef(false);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `pannello-${id}-titolo`;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useScrollLock(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return undefined;
    const previous = document.activeElement;
    if (!dialog.open) {
      if (supportsModal()) dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    // The first control of the content, then the close button.
    const target =
      dialog
        .querySelector('.aca-side-sheet__body')
        ?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    target?.focus();

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
      if (dialog.open) {
        if (typeof dialog.close === 'function' && supportsModal()) dialog.close();
        else dialog.removeAttribute('open');
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
  const handleClose = () => {
    if (open && !dialogRef.current?.open) onCloseRef.current();
  };

  return (
    <dialog
      ref={dialogRef}
      className={['aca-side-sheet', className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
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
      <div className="aca-side-sheet__panel">
        <header className="aca-side-sheet__header">
          <Heading level={2} size="md" tone="ink" id={titleId}>
            {title}
          </Heading>
          <button
            type="button"
            className="aca-bar-button"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <Icon name="close" size="lg" />
          </button>
        </header>
        <div className="aca-side-sheet__body">{children}</div>
      </div>
    </dialog>
  );
}
