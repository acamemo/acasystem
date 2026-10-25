import { useEffect, useRef, type ReactNode } from 'react';
import {
  Body,
  Button,
  Caption,
  Heading,
  IconText,
  Segmented,
  Toggle,
} from '@/components/primitives';
import { DEVICE_SCOPE_NOTE } from '@/utils/launcher/deviceMemory';
import { useDomId } from './hooks';
import '../sheets.css';

export interface FormRowIds {
  labelId: string;
  hintId?: string;
}

/**
 * Visible label and optional hint above a control. The control receives the ids through the
 * render prop and names itself with aria-labelledby (Field keeps its own hidden label).
 */
export function FormRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (ids: FormRowIds) => ReactNode;
}) {
  const labelId = useDomId('campo');
  const hintId = hint ? `${labelId}-aiuto` : undefined;
  return (
    <div className="aca-form-row">
      <Body as="span" size="sm" id={labelId} className="aca-form-row__label">
        {label}
      </Body>
      {hint && (
        <Caption as="p" id={hintId}>
          {hint}
        </Caption>
      )}
      {children({ labelId, hintId })}
    </div>
  );
}

/**
 * A setting that is on or off. The whole text is the label of the switch, so the row is a
 * large target; the switch shows «Sì»/«No» besides the knob position.
 */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const toggleId = useDomId('interruttore');
  const hintId = hint ? `${toggleId}-aiuto` : undefined;
  return (
    <div className="aca-toggle-row">
      <div className="aca-toggle-row__text">
        <label htmlFor={toggleId} className="aca-toggle-row__label">
          <Body as="span" size="sm">
            {label}
          </Body>
        </label>
        {hint && (
          <Caption as="p" id={hintId}>
            {hint}
          </Caption>
        )}
      </div>
      <Toggle
        id={toggleId}
        size="sm"
        checked={checked}
        onLabel="Sì"
        offLabel="No"
        disabled={disabled}
        aria-describedby={hintId}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * Single choice among a few options. Up to three short options use the Segmented track;
 * longer lists wrap as pressable chips with the same aria-pressed semantics.
 */
export function ChoiceGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: ReadonlyArray<Choice<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  const labelId = useDomId('scelta');
  const hintId = hint ? `${labelId}-aiuto` : undefined;
  const compact =
    options.length <= 3 && options.every((option) => option.label.length <= 14 && !option.disabled);
  return (
    <div className="aca-form-row">
      <Body as="span" size="sm" id={labelId} className="aca-form-row__label">
        {label}
      </Body>
      {hint && (
        <Caption as="p" id={hintId}>
          {hint}
        </Caption>
      )}
      {compact ? (
        <Segmented<T> label={label} options={options} value={value} onChange={onChange} size="sm" />
      ) : (
        <div role="group" aria-labelledby={labelId} aria-describedby={hintId} className="aca-chips">
          {options.map((option) => (
            <Button
              key={option.value}
              variant="control"
              size="sm"
              aria-pressed={option.value === value}
              disabled={option.disabled}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Titled group of settings inside a sheet: a heading and its rows, no extra container. */
export function SheetSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const headingId = useDomId('sezione');
  return (
    <section className="aca-sheet-section" aria-labelledby={headingId}>
      <div className="aca-sheet-section__head">
        <Heading level={3} size="sm" id={headingId}>
          {title}
        </Heading>
        {description && <Caption as="p">{description}</Caption>}
      </div>
      {children}
    </section>
  );
}

/**
 * Under the settings that belong to the device and not to the widget (ADR-0019): changed on one
 * widget, they change on all the widgets of the device.
 */
export function DeviceScopeNote() {
  return <Caption as="p">{`${DEVICE_SCOPE_NOTE}.`}</Caption>;
}

/** Message about the state of an operation; errors are announced at once. */
export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'danger' | 'success';
  children: ReactNode;
}) {
  const icon = tone === 'danger' ? 'warning' : tone === 'success' ? 'done' : 'info';
  return (
    <p role={tone === 'danger' ? 'alert' : 'status'} className={`aca-notice aca-notice--${tone}`}>
      <IconText
        icon={icon}
        iconTone={tone === 'danger' ? 'danger' : tone === 'success' ? 'active' : 'info'}
        tone={tone === 'danger' ? 'danger' : 'ink'}
      >
        {children}
      </IconText>
    </p>
  );
}

/**
 * Second step of a destructive action, shown in place of the button that asked for it:
 * the consequence in words, then «Annulla» and the confirmation.
 */
export function InlineConfirm({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const messageId = useDomId('conferma');
  const cancelRef = useRef<HTMLButtonElement>(null);
  // The button that asked for confirmation is gone: keep the focus on the safe choice.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  return (
    <div className="aca-confirm" role="group" aria-labelledby={messageId}>
      <Body size="sm" id={messageId}>
        {message}
      </Body>
      <div className="aca-confirm__actions">
        <Button ref={cancelRef} variant="control" size="md" onClick={onCancel}>
          Annulla
        </Button>
        <Button variant="control" size="md" onClick={onConfirm}>
          <IconText icon="warning" iconTone="danger" tone="danger">
            {confirmLabel}
          </IconText>
        </Button>
      </div>
    </div>
  );
}
