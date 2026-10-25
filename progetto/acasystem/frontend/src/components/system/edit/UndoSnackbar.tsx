import { Body, Button } from '@/components/primitives';
import './edit.css';

/**
 * «Widget rimosso · Annulla» (REP-20261007-031), as the snackbar of Launcher3 after a removal:
 * a floating pill above the footer band for a few seconds; «Annulla» puts the widget back.
 * The owner decides how long it stays (it unmounts it, or passes `message` null).
 */
export function UndoSnackbar({
  message,
  onUndo,
  top = false,
}: {
  /** Null: nothing to undo, the pill sinks. */
  message: string | null;
  /** Without it the pill only informs (e.g. «Disposizione bloccata»). */
  onUndo?: () => void;
  /** At the top of the screen: in the page overview the bottom is full of controls. */
  top?: boolean;
}) {
  return (
    <div
      className={['aca-undo', top && 'aca-undo--top', !message && 'aca-undo--hidden']
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-hidden={!message || undefined}
      inert={!message || undefined}
      data-no-long-press
    >
      <div className="aca-undo__pill">
        <Body as="span" size="md" tone="ink">
          {message ?? ''}
        </Body>
        {onUndo && (
          <Button variant="control" size="md" className="aca-frame-pill" onClick={onUndo}>
            Annulla
          </Button>
        )}
      </div>
    </div>
  );
}
