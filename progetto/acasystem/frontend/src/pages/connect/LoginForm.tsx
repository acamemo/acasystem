import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AuthData } from 'home-assistant-js-websocket';
import { Body, Button, Field, Icon } from '@/components/primitives';
import { FormRow, Notice } from '@/templates/sheets/parts/Form';
import { useHaLogin } from './useHaLogin';
import './connect.css';

export interface LoginFormProps {
  /** Home Assistant ha accettato l'accesso: i token da salvare. */
  onSession: (tokens: AuthData) => void;
}

interface FieldErrors {
  username?: string;
  password?: string;
  code?: string;
}

/**
 * Utente e password di Home Assistant e, se attivo, il codice a due fattori. Gli errori sono in
 * linea; il focus va al campo da correggere e, al passo del codice, al codice.
 */
export function LoginForm({ onSession }: LoginFormProps) {
  const login = useHaLogin(onSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Each step starts on its first field: the code, or the first empty credential.
  useEffect(() => {
    if (login.phase === 'mfa') {
      codeRef.current?.focus();
      return;
    }
    (usernameRef.current?.value ? passwordRef : usernameRef).current?.focus();
  }, [login.phase]);

  // A refused password or code is cleared and typed again.
  useEffect(() => {
    if (login.failure?.code === 'invalid_auth') passwordRef.current?.focus();
    if (login.failure?.code === 'invalid_code') codeRef.current?.focus();
  }, [login.failure]);

  const submitCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (login.busy) return;
    const name = username.trim();
    const next: FieldErrors = {
      username: name ? undefined : 'Scrivi il nome utente.',
      password: password ? undefined : 'Scrivi la password.',
    };
    setErrors(next);
    login.clearFailure();
    if (next.username) {
      usernameRef.current?.focus();
      return;
    }
    if (next.password) {
      passwordRef.current?.focus();
      return;
    }
    const outcome = await login.signIn(name, password);
    // The password is cleared once Home Assistant has judged it (accepted or refused); it stays
    // for a new try when the request got no verdict (network, limits, server not configured).
    if (outcome.status !== 'failed' || outcome.code === 'invalid_auth') setPassword('');
    if (outcome.status === 'mfa') setCode('');
  };

  const submitCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (login.busy) return;
    const value = code.trim();
    setErrors(value ? {} : { code: 'Scrivi il codice.' });
    login.clearFailure();
    if (!value) {
      codeRef.current?.focus();
      return;
    }
    const outcome = await login.verifyCode(value);
    if (outcome.status === 'failed' && outcome.code === 'invalid_code') setCode('');
    if (outcome.status === 'failed' && outcome.phase === 'credentials') {
      setCode('');
      setPassword('');
    }
  };

  if (login.phase === 'mfa') {
    return (
      // Distinct keys: React must not reuse the «Indietro» button as the submit button of the
      // other step while its click is still being dispatched (it would submit the form).
      <form
        key="codice"
        className="aca-connect-form"
        noValidate
        aria-label="Verifica in due passaggi"
        onSubmit={(event) => void submitCode(event)}
      >
        <Body>
          Home Assistant chiede un secondo passaggio. Inserisci il codice dell’app di
          autenticazione.
        </Body>
        <FormRow label="Codice di verifica">
          {({ labelId }) => (
            <Field
              ref={codeRef}
              label="Codice di verifica"
              aria-labelledby={labelId}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              spellCheck={false}
              value={code}
              error={errors.code}
              onChange={(event) => {
                setCode(event.target.value);
                setErrors({});
              }}
            />
          )}
        </FormRow>

        {login.failure && <Notice tone="danger">{login.failure.message}</Notice>}
        {login.busy && <Notice>Verifica del codice in corso…</Notice>}

        <div className="aca-connect-form__actions">
          <Button
            variant="control"
            size="md"
            onClick={() => {
              setCode('');
              setErrors({});
              login.back();
            }}
          >
            Indietro
          </Button>
          <Button type="submit" variant="primary" size="md" loading={login.busy}>
            Verifica
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      key="credenziali"
      className="aca-connect-form"
      noValidate
      aria-label="Accesso"
      onSubmit={(event) => void submitCredentials(event)}
    >
      <FormRow label="Utente">
        {({ labelId }) => (
          <Field
            ref={usernameRef}
            label="Utente"
            aria-labelledby={labelId}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            error={errors.username}
            onChange={(event) => {
              setUsername(event.target.value);
              setErrors((current) => ({ ...current, username: undefined }));
            }}
          />
        )}
      </FormRow>
      <FormRow label="Password">
        {({ labelId }) => (
          <Field
            ref={passwordRef}
            label="Password"
            aria-labelledby={labelId}
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            error={errors.password}
            action={
              <button
                type="button"
                className="aca-field__action"
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                title={showPassword ? 'Nascondi password' : 'Mostra password'}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowPassword((shown) => !shown)}
              >
                <Icon
                  name={showPassword ? 'eyeSlash' : 'eye'}
                  className="aca-field__action-icon"
                />
              </button>
            }
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: undefined }));
            }}
          />
        )}
      </FormRow>

      {login.failure && <Notice tone="danger">{login.failure.message}</Notice>}
      {login.busy && <Notice>Accesso in corso…</Notice>}

      <div className="aca-connect-form__actions">
        <Button type="submit" variant="primary" size="md" loading={login.busy}>
          Accedi
        </Button>
      </div>
    </form>
  );
}
