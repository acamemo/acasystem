import { useState } from 'react';
import { Body, Button, Caption, IconText } from '@/components/primitives';
import type { HaUser } from '@/@types/ha';
import type { AccessMethod } from '@/api/haSession';
import { ConnectionStatus } from '@/components/system/status-bar/ConnectionStatus';
import type { ConnectionSummary } from '@/utils/launcher/connection';
import { InlineConfirm } from '@/templates/sheets/parts/Form';

export interface ConnectionSectionProps {
  /** The same summary as the status bar (connectionSummary): same word and colour everywhere. */
  status: ConnectionSummary;
  oauthExpired: boolean;
  method: AccessMethod;
  user: HaUser | null;
  /** Opens the login page; null outside the app (the button is not shown). */
  onReconnect: (() => void) | null;
  /** Signs out: revokes the session and forgets the credentials of this browser. */
  onLogout: () => void;
  /** Back to the address of the mini PC; only inside the Windows/Android app (ADR-0023). */
  onChangeAddress?: (() => void) | null;
}

function roleOf(user: HaUser): string {
  if (user.is_owner) return 'Proprietario';
  if (user.is_admin) return 'Amministratore';
  return 'Utente';
}

/**
 * State of the link to Home Assistant through Acasystem, account in use, a new sign-in and the
 * sign-out. Home Assistant has no address to show or change here: the server reaches it.
 */
export function ConnectionSection({
  status,
  oauthExpired,
  method,
  user,
  onReconnect,
  onLogout,
  onChangeAddress = null,
}: ConnectionSectionProps) {
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div className="aca-system__stack">
      <dl className="aca-system__facts">
        <div>
          <dt>
            <Caption>Stato</Caption>
          </dt>
          <dd>
            <ConnectionStatus state={status} />
          </dd>
        </div>
        <div>
          <dt>
            <Caption>Collegamento</Caption>
          </dt>
          <dd>
            <Body as="span" size="sm">
              {status.phase === 'connected'
                ? 'Collegato a Home Assistant tramite Acasystem'
                : 'Home Assistant tramite Acasystem'}
            </Body>
          </dd>
        </div>
        <div>
          <dt>
            <Caption>Accesso</Caption>
          </dt>
          <dd>
            <Body as="span" size="sm">
              {method === 'token' ? 'Token a lunga durata' : 'Utente e password'}
            </Body>
          </dd>
        </div>
        {user && (
          <div>
            <dt>
              <Caption>Utente</Caption>
            </dt>
            <dd>
              <Body as="span" size="sm">
                {user.name || 'Senza nome'} · {roleOf(user)}
              </Body>
            </dd>
          </div>
        )}
      </dl>

      {confirmLogout ? (
        <InlineConfirm
          message="Uscire da Acasystem su questo dispositivo? La sessione con Home Assistant viene chiusa e per usare di nuovo Acasystem dovrai accedere."
          confirmLabel="Esci"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => {
            setConfirmLogout(false);
            onLogout();
          }}
        />
      ) : (
        <div className="aca-system__actions">
          {onReconnect && (
            <Button variant="control" size="sm" onClick={onReconnect}>
              <IconText icon="refresh">
                {oauthExpired ? 'Accedi di nuovo' : 'Collega di nuovo'}
              </IconText>
            </Button>
          )}
          <Button variant="control" size="sm" onClick={() => setConfirmLogout(true)}>
            <IconText icon="close">Esci</IconText>
          </Button>
          {onChangeAddress && (
            <Button variant="control" size="sm" onClick={onChangeAddress}>
              <IconText icon="server">Cambia indirizzo</IconText>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
