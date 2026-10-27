import { useState, type FormEvent } from 'react';
import { Button, Caption, Field, Icon } from '@/components/primitives';
import type { FlowErrorDto, FlowFieldDto, FlowFormDto } from '@/@types/devices';
import { ChoiceGroup, FormRow, Notice, ToggleRow } from '../sheets/parts/Form';
import { deviceTexts } from './deviceTexts';

type Value = string | boolean | string[];
type Values = Record<string, Value>;

const initialValue = (field: FlowFieldDto): Value => {
  switch (field.kind) {
    case 'boolean':
      return typeof field.default === 'boolean' ? field.default : false;
    case 'multiselect':
      return [];
    default:
      return field.default === undefined ? '' : String(field.default);
  }
};

const initialValues = (fields: readonly FlowFieldDto[]): Values =>
  Object.fromEntries(fields.map((field) => [field.name, initialValue(field)]));

interface Built {
  input: Record<string, unknown>;
  errors: Record<string, string>;
}

/**
 * The body of the answer from what is typed: an optional field left empty is not sent (the
 * server refuses keys it does not know, and an empty value means «not given»); a required one
 * left empty, or a number out of its range, stops here with a message under the field.
 */
export function buildInput(fields: readonly FlowFieldDto[], values: Values): Built {
  const input: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const raw = values[field.name];
    switch (field.kind) {
      case 'boolean':
        input[field.name] = raw === true;
        break;
      case 'multiselect': {
        const list = Array.isArray(raw) ? raw : [];
        if (list.length > 0) input[field.name] = list;
        else if (field.required) errors[field.name] = deviceTexts.required;
        break;
      }
      case 'integer':
      case 'number': {
        const text = typeof raw === 'string' ? raw.trim() : '';
        if (!text) {
          if (field.required) errors[field.name] = deviceTexts.required;
          break;
        }
        const number = Number(text);
        const tooLow = field.min !== undefined && number < field.min;
        const tooHigh = field.max !== undefined && number > field.max;
        if (!Number.isFinite(number) || (field.kind === 'integer' && !Number.isInteger(number))) {
          errors[field.name] = 'Scrivi un numero.';
        } else if (tooLow || tooHigh) {
          errors[field.name] = `Scrivi un numero tra ${field.min ?? '…'} e ${field.max ?? '…'}.`;
        } else {
          input[field.name] = number;
        }
        break;
      }
      default: {
        // text, password and select; a password is sent as it was typed.
        const text = typeof raw === 'string' ? (field.kind === 'password' ? raw : raw.trim()) : '';
        if (text) input[field.name] = text;
        else if (field.required) errors[field.name] = deviceTexts.required;
      }
    }
  }
  return { input, errors };
}

/**
 * A text, password or number field. A password hides what is typed and has a button to show it
 * (the person types a long key on a tablet and wants to check it); the value stays in memory only.
 */
function TextRow({
  field,
  value,
  busy,
  error,
  onChange,
}: {
  field: FlowFieldDto;
  value: string;
  busy: boolean;
  error: string | undefined;
  onChange: (value: string) => void;
}) {
  const [shown, setShown] = useState(false);
  const numeric = field.kind === 'integer' || field.kind === 'number';
  const password = field.kind === 'password';
  return (
    <FormRow label={field.label} {...(field.hint ? { hint: field.hint } : {})}>
      {({ labelId, hintId }) => (
        <Field
          label={field.label}
          aria-labelledby={labelId}
          {...(hintId ? { 'aria-describedby': hintId } : {})}
          type={password && !shown ? 'password' : numeric ? 'number' : 'text'}
          {...(numeric
            ? {
                step: field.kind === 'integer' ? 1 : 'any',
                ...(field.min !== undefined ? { min: field.min } : {}),
                ...(field.max !== undefined ? { max: field.max } : {}),
              }
            : {})}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          disabled={busy}
          {...(error ? { error } : {})}
          {...(password
            ? {
                action: (
                  <button
                    type="button"
                    className="aca-field__action"
                    aria-label={shown ? deviceTexts.hidePassword : deviceTexts.showPassword}
                    title={shown ? deviceTexts.hidePassword : deviceTexts.showPassword}
                    aria-pressed={shown}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setShown((visible) => !visible)}
                  >
                    <Icon
                      name={shown ? 'eyeSlash' : 'eye'}
                      className="aca-field__action-icon"
                    />
                  </button>
                ),
              }
            : {})}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </FormRow>
  );
}

/**
 * A step of a flow as a form: title, description and the fields the server declared. The
 * fields are drawn with the shared primitives; the texts are the server's Italian ones. A step
 * with no fields is a confirmation.
 */
export function FlowFormStep({
  form,
  busy,
  extraError,
  onSubmit,
  onExit,
}: {
  form: FlowFormDto;
  busy: boolean;
  /** An answer the server refused without a form of its own (wrong value, too many tries). */
  extraError: { field: string | null; message: string } | null;
  onSubmit: (input: Record<string, unknown>) => void;
  onExit: () => void;
}) {
  const [values, setValues] = useState<Values>(() => initialValues(form.fields));
  const [local, setLocal] = useState<Record<string, string>>({});
  const confirmation = form.fields.length === 0;

  const set = (name: string, value: Value) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setLocal((previous) => {
      if (!(name in previous)) return previous;
      const { [name]: _removed, ...rest } = previous;
      return rest;
    });
  };

  const errors: Pick<FlowErrorDto, 'field' | 'message'>[] = [
    ...form.errors,
    ...(extraError ? [extraError] : []),
  ];
  const errorOf = (name: string) =>
    local[name] ?? errors.find((error) => error.field === name)?.message;
  const general = errors.filter(
    (error) => error.field === null || !form.fields.some((field) => field.name === error.field)
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const built = buildInput(form.fields, values);
    if (Object.keys(built.errors).length > 0) {
      setLocal(built.errors);
      return;
    }
    onSubmit(built.input);
  };

  return (
    <form className="aca-device-flow" onSubmit={submit} noValidate>
      {general.map((error) => (
        <Notice key={error.message} tone="danger">
          {error.message}
        </Notice>
      ))}
      {confirmation && !form.description && <Caption as="p">{deviceTexts.confirmHint}</Caption>}

      {form.fields.map((field) => {
        const error = errorOf(field.name);
        const value = values[field.name];
        switch (field.kind) {
          case 'boolean':
            return (
              <ToggleRow
                key={field.name}
                label={field.label}
                {...(field.hint ? { hint: field.hint } : {})}
                checked={value === true}
                disabled={busy}
                onChange={(next) => set(field.name, next)}
              />
            );
          case 'select':
            return (
              <ChoiceGroup<string>
                key={field.name}
                label={field.label}
                {...(field.hint ? { hint: field.hint } : {})}
                options={field.options ?? []}
                value={typeof value === 'string' ? value : ''}
                onChange={(next) => set(field.name, next)}
              />
            );
          case 'multiselect': {
            const chosen = Array.isArray(value) ? value : [];
            return (
              <FormRow
                key={field.name}
                label={field.label}
                {...(field.hint ? { hint: field.hint } : {})}
              >
                {() => (
                  <div role="group" aria-label={field.label} className="aca-chips">
                    {(field.options ?? []).map((option) => (
                      <Button
                        key={option.value}
                        variant="control"
                        size="sm"
                        aria-pressed={chosen.includes(option.value)}
                        disabled={busy}
                        onClick={() =>
                          set(
                            field.name,
                            chosen.includes(option.value)
                              ? chosen.filter((item) => item !== option.value)
                              : [...chosen, option.value]
                          )
                        }
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}
              </FormRow>
            );
          }
          default:
            return (
              <TextRow
                key={field.name}
                field={field}
                value={typeof value === 'string' ? value : ''}
                busy={busy}
                error={error}
                onChange={(next) => set(field.name, next)}
              />
            );
        }
      })}

      <div className="aca-device-actions">
        <Button variant="secondary" size="md" disabled={busy} onClick={onExit}>
          {deviceTexts.exit}
        </Button>
        <Button variant="primary" size="md" type="submit" loading={busy}>
          {confirmation ? deviceTexts.confirm : deviceTexts.next}
        </Button>
      </div>
    </form>
  );
}
