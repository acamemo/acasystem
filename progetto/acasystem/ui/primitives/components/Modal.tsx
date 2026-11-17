import type { ReactNode } from 'react';
import { DialogShell } from './DialogShell';
import { Icon } from './Icon';
import { Heading } from '../typography/Heading';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  titleId: string;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

/** Same veil as the kit Sheet backdrop (the legacy --modal-backdrop theme variable is gone). */
const overlayStyle = { backgroundColor: 'rgb(5 5 5 / 35%)' };

export function Modal({
  open,
  onClose,
  title,
  closeLabel,
  titleId,
  wide,
  children,
  footer,
}: ModalProps) {
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      titleId={titleId}
      overlayClassName="aca-modal-overlay"
      overlayStyle={overlayStyle}
      panelClassName={`aca-modal aca-surface aca-surface--raised ${wide ? 'aca-modal--wide' : ''}`}
    >
      {(resolvedTitleId: string) => (
        <>
          <header className="aca-modal__header">
            <Heading level={2} id={resolvedTitleId} className="aca-modal__title">
              {title}
            </Heading>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="aca-bar-button modal-close"
            >
              <Icon name="close" size="lg" />
            </button>
          </header>
          <div className="aca-modal__body custom-scrollbar">{children}</div>
          {footer && <footer className="aca-modal__footer">{footer}</footer>}
        </>
      )}
    </DialogShell>
  );
}
