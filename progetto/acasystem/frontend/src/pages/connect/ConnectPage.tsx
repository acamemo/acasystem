import { useId, useState } from 'react';
import { Body, Button, Heading, IconText, Surface, Title } from '@/components/primitives';
import { useConfig } from '@/hooks/context';
import { useConnectionSetup } from '@/hooks/useConnectionSetup';
import { LoginForm } from './LoginForm';
import { TokenForm } from './TokenForm';
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
 * fattori se attivo e, sotto «Altre opzioni», il token a lunga durata per i tablet kiosk.
 * Home Assistant si raggiunge sempre attraverso il server Acasystem: nessun indirizzo da indicare.
 */
export function ConnectPage({ onConnected }: ConnectPageProps) {
  const { config, setConfig } = useConfig();
  const setup = useConnectionSetup({ config, setConfig });
  const [moreOptions, setMoreOptions] = useState(false);
  const optionsId = useId();

  return (
    <main className="aca-connect">
      <Surface className="aca-connect__panel" contentClassName="aca-connect__content">
        <div className="aca-connect__intro">
          <Title level={1}>Accedi ad Acasystem</Title>
          <Body tone="muted">Usa l’utente e la password di Home Assistant.</Body>
        </div>

        <LoginForm
          onSession={(tokens) => {
            setup.acceptSession(tokens);
            onConnected?.();
          }}
        />

        <div className="aca-connect__options">
          <Button
            variant="control"
            size="sm"
            aria-expanded={moreOptions}
            aria-controls={moreOptions ? optionsId : undefined}
            onClick={() => setMoreOptions((open) => !open)}
          >
            <IconText icon={moreOptions ? 'chevronUp' : 'chevronDown'}>Altre opzioni</IconText>
          </Button>
          {moreOptions && (
            <div id={optionsId} className="aca-connect__options-panel">
              <Heading level={2} size="sm">
                Token a lunga durata
              </Heading>
              <TokenForm
                onAccepted={(token) => {
                  setup.acceptToken(token);
                  onConnected?.();
                }}
              />
            </div>
          )}
        </div>

        {setup.cancelLogin && (
          <div className="aca-connect__back">
            <Button variant="control" size="sm" onClick={setup.cancelLogin}>
              <IconText icon="chevronLeft">Annulla</IconText>
            </Button>
          </div>
        )}
      </Surface>
    </main>
  );
}
