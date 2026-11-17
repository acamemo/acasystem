import { Field, PasswordField } from '@/components/primitives';
import { FormRow } from '@/templates/sheets/parts/Form';
import { AccountAppearanceEditor } from '@/components/account/AccountAppearanceEditor';
import type { AccountImageKind } from '@/api/accountApi';
import type { AppearanceImages } from '@/components/account/appearanceDraft';

interface AccountCreationFieldsProps {
  username: string;
  password: string;
  confirmation: string;
  color: string;
  initialName?: string;
  identityDisabled: boolean;
  passwordDisabled: boolean;
  passwordMaxLength?: number;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onConfirmation: (value: string) => void;
  onColor: (value: string) => void;
  images?: AppearanceImages;
  onImage?: (kind: AccountImageKind, dataUrl: string) => void;
  onRemove?: (kind: AccountImageKind) => void;
}

/** Presentation only: owner setup and ordinary registration keep separate APIs and state. */
export function AccountCreationFields({ username, password, confirmation, color, initialName,
  identityDisabled, passwordDisabled, passwordMaxLength, onUsername, onPassword, onConfirmation, onColor,
  images = {}, onImage, onRemove,
}: AccountCreationFieldsProps) {
  return <>
    <FormRow label="Nome utente">{({ labelId }) => <Field label="Nome utente" aria-labelledby={labelId} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={username} maxLength={64} disabled={identityDisabled} onChange={(event) => onUsername(event.target.value)} onBlur={(event) => onUsername(event.target.value.trim().toLowerCase())} />}</FormRow>
    <FormRow label="Password">{({ labelId }) => <PasswordField label="Password" aria-labelledby={labelId} autoComplete="new-password" maxLength={passwordMaxLength} value={password} disabled={passwordDisabled} onChange={(event) => onPassword(event.target.value)} />}</FormRow>
    <FormRow label="Conferma password">{({ labelId }) => <PasswordField label="Conferma password" aria-labelledby={labelId} autoComplete="new-password" maxLength={passwordMaxLength} value={confirmation} disabled={passwordDisabled} onChange={(event) => onConfirmation(event.target.value)} />}</FormRow>
    <AccountAppearanceEditor compact name={initialName || username} color={color} avatar={images.avatar ?? null} cover={images.cover ?? null} disabled={identityDisabled}
      onColor={onColor} onImage={async (kind, dataUrl) => { onImage?.(kind, dataUrl); }} onRemove={(kind) => onRemove?.(kind)} />
  </>;
}
