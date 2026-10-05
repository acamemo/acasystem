import type { ReactNode } from 'react';
import AccessibleModalShell from '../../components/ui/AccessibleModalShell';
import { Button } from './Button';
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
    <AccessibleModalShell
      open={open}
      onClose={onClose}
      titleId={titleId}
      overlayClassName="aca-modal-overlay"
      overlayStyle={{ backgroundColor: 'var(--modal-backdrop)' }}
      panelClassName={`aca-modal aca-surface aca-surface--raised ${wide ? 'aca-modal--wide' : ''}`}
    >
      {(resolvedTitleId: string) => (
        <>
          <header className="aca-modal__header">
            <Heading level={2} id={resolvedTitleId} className="aca-modal__title">
              {title}
            </Heading>
            <Button
              variant="control"
              onClick={onClose}
              aria-label={closeLabel}
              className="modal-close aca-icon-control"
            >
              <Icon name="close" size={20} />
            </Button>
          </header>
          <div className="aca-modal__body custom-scrollbar">{children}</div>
          {footer && <footer className="aca-modal__footer">{footer}</footer>}
        </>
      )}
    </AccessibleModalShell>
  );
}
