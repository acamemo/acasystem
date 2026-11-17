import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthData } from 'home-assistant-js-websocket';
import { Body, Button, IconText, Surface, Title } from '@/components/primitives';
import { useConfig } from '@/hooks/context';
import { useConnectionSetup } from '@/hooks/useConnectionSetup';
import { LoginForm } from './LoginForm';
import { RegistrationForm } from './RegistrationForm';
import { bindOwnerAppearance, discardUnboundAppearanceImages, readOwnerAppearance } from '@/api/ownerAppearance';
import { revokeSession } from '@/api/haSession';
import './connect.css';

export interface ConnectPageProps {
  /** Home Assistant ha accettato l'accesso: l'app si collega con le nuove credenziali. */
  onConnected?: () => void;
}

/** Testo esatto sulla destinazione delle credenziali (ADR-0009). */
export const CREDENTIALS_NOTE =
  'Utente e password arrivano a Home Assistant attraverso il server Acasystem, che non li salva e non li registra nei log. Questo browser conserva solo il token della sessione.';

/**
 * Pagina di accesso di Acasystem (ADR-0009): utente e password di Home Assistant, codice a due
 * fattori se attivo. Ogni dispositivo ottiene la propria sessione personale rinnovabile.
 * Home Assistant si raggiunge sempre attraverso il server Acasystem: nessun indirizzo da indicare.
 */
export function ConnectPage({ onConnected }: ConnectPageProps) {
  const { config, setConfig } = useConfig();
  const setup = useConnectionSetup({ config, setConfig });
  const [entry, setEntry] = useState<'login' | 'registration'>('login');
  const [registrationCreated, setRegistrationCreated] = useState(false);
  const markRegistrationCreated = useCallback(() => setRegistrationCreated(true), []);
  const loginUsername = useRef('');
  const acceptance = useRef(0);
  const transient = useRef(new Set<AuthData>());
  const [ownerError, setOwnerError] = useState('');
  const discard = useCallback((tokens: AuthData) => {
    if (transient.current.delete(tokens)) void revokeSession(tokens);
  }, []);
  const abandon = useCallback((discardImages = false) => {
    acceptance.current += 1;
    for (const tokens of [...transient.current]) discard(tokens);
    if (discardImages) discardUnboundAppearanceImages();
  }, [discard]);
  useEffect(() => () => abandon(true), [abandon]);
  const acceptLogin = (tokens: AuthData) => {
    abandon();
    const request = acceptance.current;
    setOwnerError('');
    const finish = () => {
      if (acceptance.current !== request) { discard(tokens); return; }
      transient.current.delete(tokens);
      setup.acceptSession(tokens); onConnected?.();
    };
    const binding = bindOwnerAppearance(tokens, loginUsername.current);
    if (!binding) finish();
    else {
      transient.current.add(tokens);
      void binding.then(finish).catch((failure) => {
        discard(tokens);
        if (acceptance.current === request) setOwnerError(failure instanceof Error ? failure.message : 'Il colore è conservato. Riprova.');
      });
    }
  };

  return (
    <main className="aca-connect aca-connect--auth">
      <Surface className="aca-connect__panel aca-connect__panel--auth" contentClassName="aca-connect__content">
        <div className="aca-connect__auth-body">
        <div className="aca-connect__intro">
          <Title level={1}>{entry === 'registration' && !registrationCreated ? 'Crea account' : 'Accedi'}</Title>
        </div>

        {entry === 'registration' ? <RegistrationForm onCreated={markRegistrationCreated} onSession={(tokens) => {
          abandon();
          setup.acceptSession(tokens); onConnected?.();
        }} /> : <LoginForm
          initialUsername={readOwnerAppearance()?.username || ''}
          onAuthenticatedUsername={(value) => { loginUsername.current = value; }}
          onSession={acceptLogin}
        />}
        {ownerError && <Body role="alert">{ownerError}</Body>}

        {setup.cancelLogin && (
          <div className="aca-connect__back">
            <Button variant="control" size="sm" onClick={() => { abandon(true); setup.cancelLogin?.(); }}>
              <IconText icon="chevronLeft">Annulla</IconText>
            </Button>
          </div>
        )}
        </div>
        {!registrationCreated && <div className="aca-connect__auth-footer">
          <Body>{entry === 'login' ? 'Non hai un account?' : 'Hai già un account?'}</Body>
          <Button variant="plain" className="aca-connect__auth-link" onClick={() => {
            abandon(true);
            setEntry(entry === 'login' ? 'registration' : 'login');
            setRegistrationCreated(false);
            setOwnerError('');
          }}>{entry === 'login' ? 'Crea account' : 'Accedi'}</Button>
        </div>}
      </Surface>
    </main>
  );
}
