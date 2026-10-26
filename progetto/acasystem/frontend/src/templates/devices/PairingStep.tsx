import { useEffect, useState } from 'react';
import { Body, Button, Caption, Numeric, ProgressRing } from '@/components/primitives';
import type { FlowFormDto } from '@/@types/devices';
import { Notice } from '../sheets/parts/Form';
import { deviceTexts } from './deviceTexts';

/** Seconds left of `total` while `running`: counts down once a second and stops at 0. */
function useCountdown(total: number, running: boolean): number {
  const [left, setLeft] = useState(total);
  useEffect(() => {
    if (!running) {
      setLeft(total);
      return undefined;
    }
    setLeft(total);
    const timer = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [running, total]);
  return left;
}

/**
 * Pairing with the TV (D1d). The answer is one call that the server keeps open while the person
 * presses OK on the TV, up to 90 seconds; meanwhile nothing can be pressed, not even «Esci»,
 * because a cancellation would race with the pairing. The count of ten seconds is the time the
 * TV waits; after it the screen says it is waiting for the answer, which is what it does.
 */
export function PairingStep({
  form,
  busy,
  extraError,
  onSubmit,
  onExit,
}: {
  form: FlowFormDto;
  busy: boolean;
  extraError: { field: string | null; message: string } | null;
  onSubmit: () => void;
  onExit: () => void;
}) {
  const seconds = form.waitSeconds ?? 10;
  const left = useCountdown(seconds, busy);
  const errors = [...form.errors, ...(extraError ? [extraError] : [])];
  const failed = errors.length > 0;

  if (busy) {
    return (
      <div className="aca-device-flow aca-device-pairing" aria-busy="true">
        <ProgressRing value={left} max={seconds} label={deviceTexts.pairingCountdown} size="lg">
          <Body as="span" size="sm">
            <Numeric>{left}</Numeric>
          </Body>
        </ProgressRing>
        <Body role="status" aria-live="polite" className="aca-device-pairing__text">
          {left > 0 ? deviceTexts.pairingLook : deviceTexts.pairingWaiting}
        </Body>
        <div className="aca-device-actions">
          <Button variant="secondary" size="md" disabled aria-disabled>
            {deviceTexts.exit}
          </Button>
          <Button variant="primary" size="md" loading disabled aria-disabled>
            {deviceTexts.next}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="aca-device-flow">
      {errors.map((error) => (
        <Notice key={error.message} tone="danger">
          {error.message}
        </Notice>
      ))}
      <Caption as="p">{deviceTexts.pairingNeeds}</Caption>
      <Body>{deviceTexts.pairingIntro(seconds)}</Body>
      <div className="aca-device-actions">
        <Button variant="secondary" size="md" onClick={onExit}>
          {deviceTexts.exit}
        </Button>
        <Button variant="primary" size="md" onClick={onSubmit}>
          {failed ? deviceTexts.pairingRetry : deviceTexts.next}
        </Button>
      </div>
    </div>
  );
}
