import { Suspense } from 'react';
import { DEFAULT_MODAL_OVERLAY_STYLE } from './modalStyles';
import { Skeleton } from '../../primitives/components/Skeleton';

const fallback = (
  <div className="aca-modal-overlay" style={DEFAULT_MODAL_OVERLAY_STYLE}>
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Caricamento del pannello"
      className="aca-modal aca-surface aca-surface--raised"
    >
      <Skeleton variant="panel" rows={4} label="Caricamento del pannello…" />
    </div>
  </div>
);

/**
 * Shared Suspense wrapper for lazy-loaded modals.
 */
export default function ModalSuspense({ children }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
