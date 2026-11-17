import { useEffect, useState, type KeyboardEvent } from 'react';
import { Button } from './Button';
import { Field } from './Field';
import { Sheet } from './Sheet';

export interface ConfirmCode {
  /** Accessible name of the field (visually hidden), e.g. «Codice della serratura». */
  label: string;
  /** Keyboard to offer: digits only, or any text. */
  mode?: 'numeric' | 'text';
  /** Longest code accepted. */
  maxLength?: number;
  /** Message under the field, e.g. when Home Assistant refused the code. */
  error?: string;
}

export interface ConfirmSheetProps {
  open: boolean;
  /** The question, e.g. «Sbloccare Porta d’ingresso?». */
  title: string;
  /** What will happen, in one short sentence. */
  description?: string;
  /** Name of the action, never «Sì» or «OK»: «Sblocca», «Disinserisci». */
  confirmLabel: string;
  cancelLabel?: string;
  /** The action is risky or destructive: the confirm key is the red one. */
  danger?: boolean;
  /** Asks for a code too; the confirm key stays off until one is typed. */
  code?: ConfirmCode;
  /** Called with the code when one was asked for. */
  onConfirm: (code?: string) => void;
  /** Cancel key, Escape, the close button and a click on the backdrop. */
  onCancel: () => void;
}

/**
 * Confirmation before a command that cannot be taken back at once (a lock, an alarm, a door that
 * opens), and the code it may ask for. It stands where the browser's confirm() stood: modal, the
 * safe key («Annulla») takes the focus, Enter in the code field confirms, Escape cancels. The
 * code is held in this component only while it is open; it is never stored or logged.
 */
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Annulla',
  danger = false,
  code,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const [typed, setTyped] = useState('');
  const asksCode = code !== undefined;

  // A new question starts with an empty code.
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const ready = !asksCode || typed.trim().length > 0;
  const submit = () => {
    if (!ready) return;
    onConfirm(asksCode ? typed.trim() : undefined);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submit();
  };

  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      className="aca-confirm"
      footer={
        <>
          <Button variant="secondary" data-autofocus={asksCode ? undefined : ''} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            disabled={!ready}
            aria-disabled={!ready}
            onClick={submit}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {code && (
        <Field
          label={code.label}
          type="password"
          inputMode={code.mode === 'text' ? 'text' : 'numeric'}
          autoComplete="off"
          maxLength={code.maxLength ?? 12}
          placeholder="Inserisci il codice"
          value={typed}
          error={code.error}
          data-autofocus=""
          onChange={(event) =>
            setTyped(
              code.mode === 'text' ? event.target.value : event.target.value.replace(/\D/g, '')
            )
          }
          onKeyDown={onKeyDown}
        />
      )}
    </Sheet>
  );
}
