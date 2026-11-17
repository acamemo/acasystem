import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { AuthData } from 'home-assistant-js-websocket';
import { Body, Button, Field, Surface, Title } from '@/components/primitives';
import { FormRow, Notice } from '@/templates/sheets/parts/Form';
import { getDemoSource } from '@/api/demoSource';
import { revokeSession } from '@/api/haSession';
import { hasSessionTokens } from '@/api/haSession';
import { readCachedClientSession } from '@/utils/clientSessionCache';
import { useConfig } from '@/hooks/context/ConfigContext';
import { useConnectionSetup } from '@/hooks/useConnectionSetup';
import {
  CentralSetupError,
  completeCentralSetup,
  createCentralOwner,
  readCentralSetupStatus,
  type CentralSetupState,
} from '@/api/centralSetup';
import { LoginForm } from './LoginForm';
import { AccountCreationFields } from './AccountCreationFields';
import { USER_COLORS } from '../../../../contracts/registration';
import { bindOwnerAppearance, readOwnerAppearance, rememberOwnerAppearance } from '@/api/ownerAppearance';
import type { AppearanceImages } from '@/components/account/appearanceDraft';
import './connect.css';

type GateState = CentralSetupState | 'checking' | 'error';

/** First configuration stays outside HA, settings sync and the authenticated application. */
export function CentralSetupGate({ children }: { children: ReactNode }) {
  const { config, setConfig } = useConfig();
  const connection = useConnectionSetup({ config, setConfig });
  const [state, setState] = useState<GateState>(() => hasSessionTokens() && readCachedClientSession() ? 'ready' : 'checking');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [username, setUsername] = useState(() => readOwnerAppearance()?.username || '');
  const [color, setColor] = useState(() => readOwnerAppearance()?.color || USER_COLORS[0]);
  const [images, setImages] = useState<AppearanceImages>({});
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [locationName, setLocationName] = useState('Casa');
  const [session, setSession] = useState<AuthData | null>(null);
  const submitting = useRef(false);
  const temporarySession = useRef<AuthData | null>(null);
  const loginUsername = useRef('');
  const demo = Boolean(getDemoSource());

  useEffect(() => () => {
    if (temporarySession.current) void revokeSession(temporarySession.current);
  }, []);

  useEffect(() => {
    if (demo) return;
    let active = true;
    void readCentralSetupStatus().then(
      (next) => { if (active) { setState(next); setError(''); } },
      (failure: unknown) => {
        if (active) {
          setError(failure instanceof CentralSetupError ? failure.message : 'La centrale non risponde. Riprova.');
          setState('error');
        }
      },
    );
    return () => { active = false; };
  }, [demo, revision]);

  if (demo || state === 'ready') return children;

  const createOwner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const normalized = username.trim().toLowerCase();
    if (!normalized || !password) { setError('Compila tutti i campi dell’account.'); return; }
    if (password.length < 8) { setError('Usa una password di almeno 8 caratteri.'); return; }
    if (password !== confirmation) { setError('Le password non coincidono.'); return; }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      rememberOwnerAppearance(normalized, color, images);
      await createCentralOwner({ name: normalized, username: normalized, password });
      setNotice('');
      setState('setup-required');
    } catch (failure) {
      if (failure instanceof CentralSetupError && failure.code === 'SETUP_OWNER_EXISTS') {
        setNotice('L’account è già stato creato. Accedi per continuare.');
        setState('setup-required');
      } else setError(failure instanceof Error ? failure.message : 'Non riesco a creare l’account. Riprova.');
    } finally {
      setPassword('');
      setConfirmation('');
      setBusy(false);
      submitting.current = false;
    }
  };

  const complete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || !session) return;
    if (!locationName.trim()) { setError('Inserisci il nome della casa.'); return; }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await completeCentralSetup(session.access_token, locationName.trim());
      await bindOwnerAppearance(session, loginUsername.current);
      connection.acceptSession(session);
      temporarySession.current = null;
      setSession(null);
      setState('ready');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Non riesco a completare la casa. Riprova.');
    } finally { setBusy(false); submitting.current = false; }
  };

  return (
    <main className="aca-connect aca-connect--auth">
      <Surface className="aca-connect__panel aca-connect__panel--auth" contentClassName="aca-connect__content">
        <div className="aca-connect__auth-body">
        <div className="aca-connect__intro">
          <Title level={1}>{state === 'owner-required' ? 'Crea account' : state === 'setup-required' ? session ? 'Completa la tua casa' : 'Accedi' : 'Collegamento alla centrale'}</Title>
        </div>
        {state === 'checking' && <Body role="status">Verifica della centrale in corso…</Body>}
        {state === 'error' && <Button variant="control" onClick={() => { setState('checking'); setRevision((value) => value + 1); }}>Riprova</Button>}
        {state === 'owner-required' && <>
          <form className="aca-connect-form" aria-label="Crea account" onSubmit={(event) => void createOwner(event)}>
            <AccountCreationFields username={username} password={password} confirmation={confirmation} color={color}
              identityDisabled={busy} passwordDisabled={busy} passwordMaxLength={256}
              onUsername={setUsername} onPassword={setPassword} onConfirmation={setConfirmation} onColor={setColor} images={images}
              onImage={(kind, dataUrl) => setImages((value) => ({ ...value, [kind]: dataUrl }))}
              onRemove={(kind) => setImages((value) => { const next = { ...value }; delete next[kind]; return next; })} />
            <Body size="sm">Le immagini si salvano dopo l’accesso. Ricaricando la pagina dovrai riselezionarle.</Body>
            <Button type="submit" variant="primary" loading={busy}>Crea account</Button>
          </form>
        </>}
        {state === 'setup-required' && <>
          {notice && <Notice>{notice}</Notice>}
          {!session ? <>
            <LoginForm initialUsername={readOwnerAppearance()?.username || username.trim().toLowerCase()}
              onAuthenticatedUsername={(value) => { loginUsername.current = value; }}
              onSession={(tokens) => { temporarySession.current = tokens; setSession(tokens); setError(''); }} />
          </> : <form className="aca-connect-form" aria-label="Completa casa" onSubmit={(event) => void complete(event)}>
            <FormRow label="Nome della casa">{({ labelId }) => <Field label="Nome della casa" aria-labelledby={labelId} maxLength={128} value={locationName} disabled={busy} onChange={(event) => setLocationName(event.target.value)} />}</FormRow>
            <div className="aca-connect-form__actions">
              <Button variant="control" disabled={busy} onClick={() => { void revokeSession(temporarySession.current); temporarySession.current = null; loginUsername.current = ''; setSession(null); setError(''); }}>Cambia account</Button>
              <Button type="submit" variant="primary" loading={busy}>Completa configurazione</Button>
            </div>
          </form>}
        </>}
        {busy && <Body role="status">Preparazione della casa in corso…</Body>}
        {error && <Body role="alert">{error}</Body>}
        </div>
      </Surface>
    </main>
  );
}
