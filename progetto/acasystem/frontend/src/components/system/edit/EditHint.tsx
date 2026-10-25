import { Body, Button } from '@/components/primitives';
import './edit.css';

/**
 * The first-time hint on how to edit (ADR-0016, C3): a pill above the bottom band, in the place
 * of the «Annulla» pill and in its look, with a button to close it. It only informs: the keyboard
 * and assistive technology have the command «Modifica la disposizione» (ScreenCommands), so the
 * pill is not a live region and does not interrupt a reading.
 */
export function EditHint({
  shown,
  text,
  onDismiss,
}: {
  shown: boolean;
  text: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className={['aca-undo', 'aca-hint', !shown && 'aca-undo--hidden'].filter(Boolean).join(' ')}
      role="note"
      aria-label="Suggerimento"
      aria-hidden={!shown || undefined}
      inert={!shown || undefined}
      data-no-long-press
    >
      <div className="aca-undo__pill">
        <Body as="span" size="md" tone="ink">
          {text}
        </Body>
        <Button variant="control" size="md" className="aca-frame-pill" onClick={onDismiss}>
          Ho capito
        </Button>
      </div>
    </div>
  );
}
