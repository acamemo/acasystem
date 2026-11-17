import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { AuthData } from 'home-assistant-js-websocket';
import { Body, Button } from '@/components/primitives';
import { createHouseMember, readRegistrationAttempt, readRegistrationStatus, verifyRegisteredSession } from '@/api/registration';
import { LoginForm } from './LoginForm';
import { newRequestId } from '@/utils/requestId';
import { USER_COLORS } from '../../../../contracts/registration';
import { AccountCreationFields } from './AccountCreationFields';
import { bindMemberAppearance, discardUnboundAppearanceImages, readOwnerAppearance, rememberMemberAppearance } from '@/api/ownerAppearance';
import { revokeSession } from '@/api/haSession';
import { readAppearanceImages, type AppearanceImages } from '@/components/account/appearanceDraft';

const ATTEMPT_KEY = 'aca:registration:attempt';
interface SavedAttempt { attemptId: string; name: string; username: string; color?: string }
const readAttempt = (): SavedAttempt | null => {
  try {
    const value = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) || 'null') as SavedAttempt | null;
    return value && typeof value.attemptId === 'string' && typeof value.name === 'string' && typeof value.username === 'string'
      ? { attemptId: value.attemptId, name: value.name, username: value.username, ...(typeof value.color === 'string' ? { color: value.color } : {}) } : null;
  } catch { return null; }
};
export function RegistrationForm({ onSession, onCreated }: { onSession: (tokens: AuthData) => void; onCreated?: () => void }) {
  const attempt = useRef(readAttempt());
  const [username, setUsername] = useState(attempt.current?.username || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const savedAppearance = useRef(readOwnerAppearance());
  const [color, setColor] = useState(savedAppearance.current && attempt.current && savedAppearance.current.attemptId === attempt.current.attemptId ? savedAppearance.current.color : attempt.current?.color || USER_COLORS[0]);
  const [images, setImages] = useState<AppearanceImages>(() => savedAppearance.current?.kind === 'member' && attempt.current && savedAppearance.current.attemptId === attempt.current.attemptId ? readAppearanceImages(savedAppearance.current.id) : {});
  const epoch = useRef(0);
  const active = useRef(true);
  const grants = useRef(new Set<AuthData>());
  const discardGrant = useCallback((tokens: AuthData) => { if (grants.current.delete(tokens)) void revokeSession(tokens); }, []);
  useEffect(() => {
    active.current = true;
    const owned = grants.current;
    return () => { active.current = false; epoch.current += 1; for (const tokens of [...owned]) discardGrant(tokens); discardUnboundAppearanceImages(); };
  }, [discardGrant]);
  const [created, setCreated] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const releaseFailedAttempt = useCallback(() => {
    attempt.current = null;
    try { sessionStorage.removeItem(ATTEMPT_KEY); } catch { /* Nessuna credenziale da cancellare. */ }
  }, []);
  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const status = await readRegistrationStatus(); setReady(status.ready);
      if (attempt.current) {
        const previous = await readRegistrationAttempt(attempt.current.attemptId);
        if (previous?.status === 'created' && previous.userId) { setCreated(previous.userId); setPassword(''); setConfirmation(''); }
        else if (previous?.status === 'failed') { releaseFailedAttempt(); setMessage('Il tentativo precedente non è stato completato. Puoi riprovare la registrazione.'); }
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Centrale non raggiungibile.'); }
    finally { setBusy(false); }
  }, [releaseFailedAttempt]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (created) onCreated?.(); }, [created, onCreated]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setError(''); setMessage('');
    const normalized = username.trim().toLowerCase();
    if (!attempt.current && !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(normalized)) { setError('Scrivi un nome utente con lettere, numeri, punto o trattino.'); return; }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) { setError('Usa almeno 8 caratteri e al massimo 72 byte per la password.'); return; }
    if (password !== confirmation) { setError('Le password non coincidono.'); return; }
    if (!attempt.current) {
      attempt.current = { attemptId: newRequestId(), name: normalized, username: normalized };
      try { rememberMemberAppearance(normalized, color, attempt.current.attemptId, images); }
      catch (failure) { attempt.current = null; setError(failure instanceof Error ? failure.message : 'Personalizzazione non pronta. Riprova.'); return; }
    }
    try { sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt.current)); } catch { /* Nessuna password nella memoria di recupero. */ }
    setBusy(true);
    try {
      const result = await createHouseMember({ ...attempt.current, password });
      if (result.status === 'created' && result.userId) {
        setCreated(result.userId); setPassword(''); setConfirmation('');
      } else setMessage('Il tentativo è ancora in verifica. Riprova con gli stessi dati; nessun secondo account verrà creato.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Registrazione non completata. Riprova.');
      if (attempt.current) {
        try { if ((await readRegistrationAttempt(attempt.current.attemptId))?.status === 'failed') releaseFailedAttempt(); }
        catch { /* Un esito incerto conserva lo stesso identificativo per il prossimo tentativo. */ }
      }
    }
    finally { setBusy(false); }
  };
  const accept = async (tokens: AuthData) => {
    if (!created || !active.current) { void revokeSession(tokens); return; }
    const request = ++epoch.current;
    for (const grant of [...grants.current]) discardGrant(grant);
    grants.current.add(tokens);
    setBusy(true); setError('');
    try {
      await verifyRegisteredSession(tokens, created, false);
      if (!active.current || request !== epoch.current) { discardGrant(tokens); return; }
      await bindMemberAppearance(tokens, created, attempt.current!.attemptId, () => active.current && request === epoch.current);
      if (!active.current || request !== epoch.current) { discardGrant(tokens); return; }
      try { sessionStorage.removeItem(ATTEMPT_KEY); } catch { /* Il journal server resta autorevole. */ }
      grants.current.delete(tokens); onSession(tokens);
    } catch (failure) { discardGrant(tokens); if (active.current && request === epoch.current) setError(failure instanceof Error ? failure.message : 'Accesso non riuscito.'); }
    finally { if (active.current && request === epoch.current) setBusy(false); }
  };
  return <>
    {created ? <>
      <LoginForm initialUsername={attempt.current?.username || username} onSession={(tokens) => void accept(tokens)} />
    </> : <form className="aca-connect-form" onSubmit={(event) => void submit(event)} noValidate aria-label="Crea un nuovo utente della casa">
      <AccountCreationFields username={username} password={password} confirmation={confirmation} color={color}
        initialName={attempt.current?.name} identityDisabled={busy || attempt.current !== null} passwordDisabled={busy}
        onUsername={setUsername} onPassword={setPassword} onConfirmation={setConfirmation} onColor={setColor} images={images}
        onImage={(kind, dataUrl) => setImages((value) => ({ ...value, [kind]: dataUrl }))}
        onRemove={(kind) => setImages((value) => { const next = { ...value }; delete next[kind]; return next; })} />
      <Body size="sm">Le immagini si salvano dopo l’accesso. Ricaricando la pagina dovrai riselezionarle.</Body>
      {!ready && <Body role="status">La centrale sta preparando gli accessi. Riprova fra poco.</Body>}
      <Button type="submit" variant="primary" loading={busy} disabled={!ready}>Crea account</Button>
    </form>}
    {error && <Body role="alert">{error}</Body>}
    {message && <Body role="status">{message}</Body>}
    {!created && (error || message || !ready) && <Button variant="control" disabled={busy} onClick={() => void refresh()}>Riprova</Button>}
  </>;
}
