import { Caption, IconText } from '@/components/primitives';

export interface CommandFeedbackProps {
  /** Failure text (error or missing confirmation); shown with a warning icon. */
  message: string | null;
  /** Optional text while the request waits for Home Assistant. */
  pendingText?: string | null;
  id?: string;
  className?: string;
}

/**
 * Live region of a widget command: the failure in danger ink with an icon (never colour
 * alone), or a short pending text. Empty otherwise, so the region stays mounted.
 */
export function CommandFeedback({ message, pendingText, id, className }: CommandFeedbackProps) {
  return (
    <span
      id={id}
      role="status"
      aria-live="polite"
      className={['ctl-feedback', className].filter(Boolean).join(' ')}
    >
      {message ? (
        <IconText icon="warning" iconTone="danger" iconSize="sm" tone="danger">
          <Caption tone="danger">{message}</Caption>
        </IconText>
      ) : pendingText ? (
        <Caption>{pendingText}</Caption>
      ) : null}
    </span>
  );
}
