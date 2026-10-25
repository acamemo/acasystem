import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { MaterialLayers, materialClass, type MaterialSize } from './Material';

export type FieldProps = Omit<ComponentPropsWithRef<'input'>, 'size'> & {
  /** Accessible label, visually hidden. */
  label: string;
  icon?: IconName;
  size?: MaterialSize;
  /** Classes for the recessed container; className stays on the input. */
  containerClassName?: string;
  /** Error message shown under the field, with aria-invalid and aria-describedby. */
  error?: string;
  /** Optional trailing action/button inside the field (e.g. reveal password). */
  action?: ReactNode;
};

/** Text input inside a recessed pill, with an optional leading icon and error message. */
export function Field({
  label,
  icon,
  size = 'md',
  containerClassName,
  className,
  id,
  error,
  action,
  'aria-describedby': describedBy,
  ...props
}: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-errore`;
  const field = (
    <div
      onMouseDown={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest('button, [role="button"]')
        ) {
          return;
        }
        // A press on the well of a focused field keeps the focus: no blur (or save) mid-edit.
        const input = event.currentTarget.querySelector('input');
        if (input && event.target !== input && document.activeElement === input)
          event.preventDefault();
      }}
      onClick={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest('button, [role="button"]')
        ) {
          return;
        }
        event.currentTarget.querySelector('input')?.focus();
      }}
      className={materialClass(
        { behavior: 'well', shape: 'pill', size },
        'aca-field',
        error && 'aca-m--error',
        containerClassName
      )}
    >
      <MaterialLayers element="div" contentClassName="aca-field__content">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        {icon && <Icon name={icon} className="aca-field__icon" color="var(--aca-ink-muted)" />}
        <input
          id={inputId}
          className={['aca-field__input', className].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={[describedBy, error && errorId].filter(Boolean).join(' ') || undefined}
          {...props}
        />
        {action}
      </MaterialLayers>
    </div>
  );
  if (!error) return field;
  return (
    <>
      {field}
      <p id={errorId} className="aca-field-error">
        <Icon name="warning" className="aca-icon" />
        <span>{error}</span>
      </p>
    </>
  );
}
