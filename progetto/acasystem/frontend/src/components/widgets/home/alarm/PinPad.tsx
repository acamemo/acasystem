import type { KeyboardEvent } from 'react';
import { Button, Field } from '@/components/primitives';
import { HomeIcon } from '../shared/HomeIcon';
import { MAX_PIN_LENGTH, sanitizePin } from './alarmModel';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export interface PinPadProps {
  pin: string;
  onPinChange: (pin: string) => void;
  onSubmit: () => void;
  /** Accessible name of the confirm key, e.g. «Conferma: Disinserisci». */
  submitLabel: string;
  busy: boolean;
  disabled: boolean;
  /** Message under the field (PIN missing, text code not supported). */
  error?: string;
}

/**
 * Numeric keypad of the alarm sheet. The PIN lives in the owner's state only: masked field,
 * no autocomplete, never stored, logged or rendered as text.
 */
export function PinPad({
  pin,
  onPinChange,
  onSubmit,
  submitLabel,
  busy,
  disabled,
  error,
}: PinPadProps) {
  const append = (digit: string) => onPinChange(sanitizePin(`${pin}${digit}`));
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  };
  return (
    <div className="home-pin">
      <Field
        label="PIN"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={MAX_PIN_LENGTH}
        placeholder="Inserisci il PIN"
        value={pin}
        disabled={disabled}
        error={error}
        containerClassName="home-pin__field"
        onChange={(event) => onPinChange(sanitizePin(event.target.value))}
        onKeyDown={onKeyDown}
      />
      <div role="group" aria-label="Tastierino PIN" className="home-pin__keys">
        {DIGITS.map((digit) => (
          <Button
            key={digit}
            variant="control"
            shape="rounded"
            size="md"
            disabled={disabled || pin.length >= MAX_PIN_LENGTH}
            onClick={() => append(digit)}
          >
            {digit}
          </Button>
        ))}
        <Button
          variant="control"
          shape="rounded"
          size="md"
          aria-label="Cancella l’ultima cifra"
          disabled={disabled || pin.length === 0}
          onClick={() => onPinChange(pin.slice(0, -1))}
        >
          <HomeIcon name="backspace" />
        </Button>
        <Button
          variant="control"
          shape="rounded"
          size="md"
          disabled={disabled || pin.length >= MAX_PIN_LENGTH}
          onClick={() => append('0')}
        >
          0
        </Button>
        <Button
          variant="primary"
          shape="rounded"
          size="md"
          aria-label={submitLabel}
          loading={busy}
          disabled={disabled}
          onClick={onSubmit}
        >
          <HomeIcon name="ok" />
        </Button>
      </div>
    </div>
  );
}
