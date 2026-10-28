import { useEffect, useRef } from 'react';
import { Body, Button, Caption, Heading } from '@/components/primitives';
import { deviceTexts, type PairingHint } from './deviceTexts';

/**
 * Before the flow starts (P-6): for a television the code or the request appears on its screen as
 * soon as the pairing begins, so the person is told first what will happen, which setting must be
 * on and how many codes to expect, and starts only when standing in front of it. Nothing has been
 * asked of the server yet.
 */
export function GuideStep({
  hint,
  onContinue,
  onExit,
}: {
  hint: PairingHint;
  onContinue: () => void;
  onExit: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <div className="aca-device-flow">
      <div className="aca-device-flow__head">
        <Heading level={3} size="md" ref={headingRef} tabIndex={-1}>
          {deviceTexts.guideTitle}
        </Heading>
      </div>
      {hint.needs && <Caption as="p">{hint.needs}</Caption>}
      {hint.guide && (
        <>
          <Body>{hint.guide.what}</Body>
          <Caption as="p">{hint.guide.codes}</Caption>
        </>
      )}
      <div className="aca-device-actions">
        <Button variant="secondary" size="md" onClick={onExit}>
          {deviceTexts.exit}
        </Button>
        <Button variant="primary" size="md" onClick={onContinue}>
          {deviceTexts.guideContinue}
        </Button>
      </div>
    </div>
  );
}
