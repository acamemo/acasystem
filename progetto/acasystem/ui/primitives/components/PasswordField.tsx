import { useId, useState } from 'react';
import { Field, type FieldProps } from './Field';
import { Icon } from './Icon';

export type PasswordFieldProps = Omit<FieldProps, 'type' | 'action'>;

/** Campo password con visibilità locale; valore e autenticazione restano del chiamante. */
export function PasswordField({ id, disabled, label, ...props }: PasswordFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  const actionLabel = `${visible ? 'Nascondi' : 'Mostra'} ${label.toLowerCase()}`;
  return <Field spellCheck={false} autoCapitalize="none" autoCorrect="off" {...props}
    label={label} id={inputId} disabled={disabled} type={visible ? 'text' : 'password'}
    action={<button type="button" className="aca-field__action" disabled={disabled}
      aria-label={actionLabel} title={actionLabel} aria-pressed={visible} aria-controls={inputId}
      onMouseDown={(event) => event.preventDefault()} onClick={() => setVisible((shown) => !shown)}>
      <Icon name={visible ? 'eye' : 'eyeSlash'} className="aca-field__action-icon" />
    </button>} />;
}
