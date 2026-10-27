import { Button, Caption } from '@/components/primitives';
import { useIdentify } from '@/hooks/launcher/useIdentify';
import { IDENTIFY_TEXTS, type IdentifyAction } from '@/utils/devices/identify';
import './identify.css';

/**
 * «Fai lampeggiare»: makes a device that is already in Home Assistant blink (or beep) so the
 * person can tell which one it is. Nothing is drawn when the device has no way to do it, or
 * outside the launcher. The answer is a short line under the button.
 */
export function IdentifyButton({
  action,
  name,
}: {
  action: IdentifyAction | null | undefined;
  /** The device's name, for the accessible label when several buttons are on screen. */
  name?: string;
}) {
  const { available, status, run } = useIdentify(action ?? null);
  if (!available) return null;
  return (
    <span className="aca-identify">
      <Button
        variant="control"
        size="sm"
        loading={status === 'sending'}
        aria-label={name ? `${IDENTIFY_TEXTS.label}: ${name}` : IDENTIFY_TEXTS.label}
        onClick={run}
      >
        {IDENTIFY_TEXTS.label}
      </Button>
      {status === 'sent' && (
        <Caption as="p" role="status">
          {IDENTIFY_TEXTS.sent}
        </Caption>
      )}
      {status === 'failed' && (
        <Caption as="p" tone="danger" role="alert">
          {IDENTIFY_TEXTS.failed}
        </Caption>
      )}
    </span>
  );
}
