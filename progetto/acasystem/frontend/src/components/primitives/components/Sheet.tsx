import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from 'react';
import { Button } from './Button';
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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return undefined;
    const previous = document.activeElement;
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
  // The close event is queued: ignore it if the dialog has been shown again in the meantime.
  const handleClose = () => {
    if (open && !dialogRef.current?.open) onCloseRef.current();
  };

  return (
    <dialog
      ref={dialogRef}
      className={['aca-sheet', className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
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
                {title}
              </Heading>
              {description && (
                <Body size="sm" tone="muted" id={descriptionId}>
                  {description}
                </Body>
              )}
            </div>
            <Button variant="control" shape="circle" onClick={onClose} aria-label={closeLabel}>
              <Icon name="close" size="md" />
            </Button>
          </header>
          <div className="aca-sheet__body">{children}</div>
          {footer && <footer className="aca-sheet__footer">{footer}</footer>}
        </MaterialLayers>
      </div>
    </dialog>
  );
}
