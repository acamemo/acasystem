import { useEffect, useState } from 'react';
import { Body, Button, Caption, Icon, Surface } from '@/components/primitives';
import { useExitPresence } from '@/hooks/launcher/useLeaving';
import './statusBar.css';

export interface ConnectionNoticeProps {
  /** Home Assistant has been unreachable longer than the grace period. */
  visible: boolean;
  oauthExpired: boolean;
  disconnectedSince: number | null;
  onRetry: () => void;
  onSignIn: () => void;
}

/** `--aca-dur-exit-sm` (tokens.css): the notice that goes stays this long, fading (D-M14). */
export const NOTICE_EXIT_MS = 160;

/** «2 min 5 s», «1 h 3 min»: time since the connection dropped. */
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min ${total % 60} s`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/**
 * Message at the top of the screen while Home Assistant is unreachable (with the time since it
 * dropped and a retry) or the sign-in has expired (with the way back to the connection). The
 * status bar is in the footer band (REP-20261013-002, ADR-0013). It comes in with a fade and a
 * small scale (240 ms) and goes in 160 ms (REP-20261023-006, D-M14); the grid under it stays still.
 */
export function ConnectionNotice({
  visible,
  oauthExpired,
  disconnectedSince,
  onRetry,
  onSignIn,
}: ConnectionNoticeProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!visible || !disconnectedSince || oauthExpired) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible, disconnectedSince, oauthExpired]);
  const { mounted, leaving } = useExitPresence(visible, NOTICE_EXIT_MS);

  if (!mounted) return null;
  const elapsed =
    disconnectedSince && !oauthExpired ? formatElapsed((now - disconnectedSince) / 1000) : null;

  return (
    <div
      className={leaving ? 'aca-connection-notice is-leaving' : 'aca-connection-notice'}
      aria-hidden={leaving || undefined}
      inert={leaving || undefined}
    >
      <Surface error>
        <div className="aca-connection-notice__content">
          <Icon name="warning" size="md" className="aca-connection-notice__icon" />
          <div className="aca-connection-notice__text">
            <Body size="sm" tone="ink" role="status" aria-live="polite">
              {oauthExpired
                ? 'La sessione con Home Assistant è scaduta: accedi di nuovo per riprendere.'
                : 'Home Assistant non risponde. I dati mostrati potrebbero non essere aggiornati.'}
            </Body>
            {elapsed && <Caption>{`Disconnesso da ${elapsed}`}</Caption>}
          </div>
          {oauthExpired ? (
            <Button variant="primary" size="sm" onClick={onSignIn}>
              Accedi di nuovo
            </Button>
          ) : (
            <Button variant="control" size="sm" onClick={onRetry}>
              <Icon name="refresh" size="sm" />
              Riprova
            </Button>
          )}
        </div>
      </Surface>
    </div>
  );
}
