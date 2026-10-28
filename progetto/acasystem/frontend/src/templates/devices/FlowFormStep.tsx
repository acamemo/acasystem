import { Fragment, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { toDeviceError } from '@/api/devicesApi';
import { Button, Caption, Field, Heading, Icon } from '@/components/primitives';
import type { FlowErrorDto, FlowFieldDto, FlowFormDto } from '@/@types/devices';
import { ChoiceGroup, FormRow, Notice, ToggleRow } from '../sheets/parts/Form';
import { deviceTexts } from './deviceTexts';
import { QrCode } from './QrCode';
import { MAX_FILE_BYTES, uploadFlowFile } from './uploadFlowFile';

/** Texts of the file and QR code fields (REP-20261028-004, T7). */
const fieldTexts = {
  chooseFile: 'Scegli il file',
  changeFile: 'Cambia file',
  noFile: 'Nessun file scelto.',
  fileTooBig: 'Il file è troppo grande (massimo 10 MB).',
  qrLabel: 'Codice QR da inquadrare con il telefono',
} as const;

type Value = string | boolean | string[];
type Values = Record<string, Value>;

/** Up to this many choices are buttons; a longer list (countries) is typed and picked. */
const MAX_BUTTON_CHOICES = 8;

/** A single choice drawn as a text field with suggestions: a long list, or one with its own value. */
const isCombo = (field: FlowFieldDto): boolean =>
  field.kind === 'select' &&
  (field.allowCustom === true || (field.options?.length ?? 0) > MAX_BUTTON_CHOICES);

const initialValue = (field: FlowFieldDto): Value => {
  switch (field.kind) {
    case 'boolean':
      return typeof field.default === 'boolean' ? field.default : false;
    case 'multiselect':
      return [];
    default: {
      if (field.default === undefined) return '';
      const text = String(field.default);
      // A combo shows the name of the choice, not its code.
      return isCombo(field) ? (field.options?.find((o) => o.value === text)?.label ?? text) : text;
    }
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
      case 'qr':
        // Only shown: nothing is answered for it.
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
        const typed = typeof raw === 'string' ? (field.kind === 'password' ? raw : raw.trim()) : '';
        // A combo sends the value of the choice whose name was typed, or what was typed.
        const text = isCombo(field)
          ? (field.options?.find((o) => o.label.toLowerCase() === typed.toLowerCase())?.value ??
            typed)
          : typed;
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
  const listId = useId();
  const numeric = field.kind === 'integer' || field.kind === 'number';
  const password = field.kind === 'password';
  const combo = isCombo(field);
  return (
    <>
    <FormRow label={field.label} {...(field.hint ? { hint: field.hint } : {})}>
      {({ labelId, hintId }) => (
        <Field
          label={field.label}
          aria-labelledby={labelId}
          {...(hintId ? { 'aria-describedby': hintId } : {})}
            type={
              password && !shown ? 'password' : numeric ? 'number' : (field.inputType ?? 'text')
            }
            {...(combo ? { list: listId } : {})}
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
                      <Icon name={shown ? 'eyeSlash' : 'eye'} className="aca-field__action-icon" />
                  </button>
                ),
              }
            : {})}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </FormRow>
      {combo && (
        <datalist id={listId}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.label} />
          ))}
        </datalist>
      )}
    </>
  );
}

/**
 * A file field: the file is sent to the server at once (it passes it to Home Assistant) and the
 * answer of the step carries the id it gets back. Shows the name of the chosen file.
 */
function FileRow({
  field,
  flowId,
  fileName,
  busy,
  error,
  onUploaded,
}: {
  field: FlowFieldDto;
  flowId: string;
  fileName: string | undefined;
  busy: boolean;
  error: string | undefined;
  onUploaded: (fileId: string, fileName: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared so that the same file can be chosen again after a failure.
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setProblem(fieldTexts.fileTooBig);
      return;
    }
    setUploading(true);
    setProblem(null);
    try {
      const uploaded = await uploadFlowFile(flowId, field.name, file);
      onUploaded(uploaded.fileId, file.name);
    } catch (failure) {
      setProblem(toDeviceError(failure).message);
    } finally {
      setUploading(false);
    }
  };

  const shown = problem ?? error;
  return (
    <FormRow label={field.label} {...(field.hint ? { hint: field.hint } : {})}>
      {() => (
        <>
          <input
            ref={input}
            type="file"
            hidden
            tabIndex={-1}
            {...(field.accept ? { accept: field.accept } : {})}
            onChange={(event) => void pick(event)}
          />
          <Caption as="p">{fileName ?? fieldTexts.noFile}</Caption>
          <Button
            variant="secondary"
            size="md"
            loading={uploading}
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {fileName ? fieldTexts.changeFile : fieldTexts.chooseFile}
          </Button>
          {shown && <Notice tone="danger">{shown}</Notice>}
        </>
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
  /** Names of the files already sent, by field (the value is their id). */
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
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

  const renderField = (field: FlowFieldDto) => {
        const error = errorOf(field.name);
        const value = values[field.name];
        switch (field.kind) {
      case 'qr':
        return field.qr ? (
          <div key={field.name}>
            <QrCode data={field.qr.data} level={field.qr.level} label={fieldTexts.qrLabel} />
          </div>
        ) : null;
      case 'file':
        return (
          <FileRow
            key={field.name}
            field={field}
            flowId={form.flowId}
            fileName={typeof value === 'string' && value ? fileNames[field.name] : undefined}
            busy={busy}
            error={error}
            onUploaded={(fileId, name) => {
              set(field.name, fileId);
              setFileNames((previous) => ({ ...previous, [field.name]: name }));
            }}
          />
        );
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
        if (isCombo(field)) {
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
  };

  return (
    <form className="aca-device-flow" onSubmit={submit} noValidate>
      {general.map((error) => (
        <Notice key={error.message} tone="danger">
          {error.message}
        </Notice>
      ))}
      {confirmation && !form.description && <Caption as="p">{deviceTexts.confirmHint}</Caption>}

      {form.fields.map((field, index) => {
        const previous = form.fields[index - 1];
        return (
          <Fragment key={field.name}>
            {field.section && field.section !== previous?.section && (
              <Heading level={3} size="sm">
                {field.sectionLabel ?? field.section}
              </Heading>
            )}
            {renderField(field)}
          </Fragment>
        );
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
