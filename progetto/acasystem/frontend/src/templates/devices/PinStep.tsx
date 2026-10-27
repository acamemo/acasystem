import { useEffect, useRef, useState } from 'react';
import { Body, Button, Caption, Field, Skeleton } from '@/components/primitives';
import type { FlowFormDto } from '@/@types/devices';
import { cleanPin, type PinSpec } from '@/utils/devices/pinSpec';
import { Notice } from '../sheets/parts/Form';
import { deviceTexts } from './deviceTexts';

type StepError = { field: string | null; message: string };

/**
 * The code the television shows (F5): one big field, the right keyboard, and the answer goes by
 * itself when the last character is typed. A wrong code comes back as an error on the same step:
 * the field is emptied and the person types the code again. When the length is not known there is
 * a «Conferma» button instead of the automatic send.
 */
export function PinStep({
  form,
  spec,
  busy,
  extraError,
  onSubmit,
  onExit,
}: {
  form: FlowFormDto;
  spec: PinSpec;
  busy: boolean;
  extraError: StepError | null;
  onSubmit: (input: Record<string, unknown>) => void;
  onExit: () => void;
}) {
  const [value, setValue] = useState('');
  const sentRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const errors: StepError[] = [...form.errors, ...(extraError ? [extraError] : [])];
  const hasErrors = errors.length > 0;

  // A refused code: the field is emptied so the next try starts clean. `form` and `extraError`
  // are new objects at every answer of the server, so this runs once per refusal.
  useEffect(() => {
    if (!hasErrors) return;
    sentRef.current = '';
    setValue('');
  }, [form, extraError, hasErrors]);

  // The field is locked while the code is checked; when the answer is back it takes the focus
  // again, so a wrong code can be retyped at once.
  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  const send = (code: string) => {
    if (busy || !code || sentRef.current === code) return;
    sentRef.current = code;
    onSubmit({ [spec.fieldName]: code });
  };

  const change = (raw: string) => {
    const code = cleanPin(raw, spec);
    setValue(code);
    if (spec.length !== null && code.length === spec.length) send(code);
  };

  const fixed = spec.length !== null;

  return (
    <form
      className="aca-device-flow aca-device-pin"
      onSubmit={(event) => {
        event.preventDefault();
        send(value);
      }}
      noValidate
    >
      {errors.map((error) => (
        <Notice key={error.message} tone="danger">
          {error.message}
        </Notice>
      ))}
      <Body>{deviceTexts.pinGuide}</Body>
      <Field
        ref={inputRef}
        label={form.fields[0]?.label ?? deviceTexts.pinLabel}
        containerClassName="aca-device-pin__field"
        type="text"
        inputMode={fixed && !spec.hex ? 'numeric' : 'text'}
        autoComplete="one-time-code"
        autoCapitalize={spec.hex ? 'characters' : 'none'}
        autoCorrect="off"
        spellCheck={false}
        maxLength={spec.length ?? 64}
        autoFocus
        value={value}
        disabled={busy}
        onChange={(event) => change(event.target.value)}
      />
      {busy && (
        <div aria-busy="true">
          <Skeleton rows={1} label={deviceTexts.pinChecking} />
          <Caption as="p" role="status">
            {deviceTexts.pinChecking}
          </Caption>
        </div>
      )}
      <div className="aca-device-actions">
        <Button variant="secondary" size="md" disabled={busy} onClick={onExit}>
          {deviceTexts.exit}
        </Button>
        {!fixed && (
          <Button variant="primary" size="md" type="submit" loading={busy} disabled={!value}>
            {deviceTexts.confirm}
          </Button>
        )}
      </div>
    </form>
  );
}

/**
 * A step with nothing to write, met while a television is being connected (F5): the answer is
 * sent at once and the call stays open while the person accepts on the television. If it fails
 * the error is shown with «Riprova»; it is never sent again by itself.
 */
export function TvConsentStep({
  form,
  busy,
  extraError,
  onSubmit,
  onExit,
}: {
  form: FlowFormDto;
  busy: boolean;
  extraError: StepError | null;
  onSubmit: () => void;
  onExit: () => void;
}) {
  const errors: StepError[] = [...form.errors, ...(extraError ? [extraError] : [])];
  const firedRef = useRef(false);
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  // Once per step: the parent mounts a new component for the next step.
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (form.errors.length === 0) submitRef.current();
  }, [form.errors.length]);

  return (
    <div className="aca-device-flow aca-device-pairing" aria-busy={busy}>
      {errors.map((error) => (
        <Notice key={error.message} tone="danger">
          {error.message}
        </Notice>
      ))}
      {busy ? (
        <>
          <Skeleton rows={2} label={deviceTexts.consentWaiting} />
          <Body role="status" aria-live="polite" className="aca-device-pairing__text">
            {deviceTexts.consentWaiting}
          </Body>
        </>
      ) : (
        <Body className="aca-device-pairing__text">{deviceTexts.consentAsk}</Body>
      )}
      <div className="aca-device-actions">
        <Button variant="secondary" size="md" disabled={busy} onClick={onExit}>
          {deviceTexts.exit}
        </Button>
        {errors.length > 0 && (
          <Button variant="primary" size="md" loading={busy} onClick={onSubmit}>
            {deviceTexts.retry}
          </Button>
        )}
      </div>
    </div>
  );
}
