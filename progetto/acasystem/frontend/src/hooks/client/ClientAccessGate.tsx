import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Button, StatusMessage } from '@/components/primitives';
import { useConfig, useHomeAssistantMeta } from '@/hooks/context';
import { useConnectionSetup } from '@/hooks/useConnectionSetup';
import { CLIENT_SESSION_EVENT, defaultClientLabel, getClientSession, setClientSession, readClientBootstrap, registerClient, type ClientSession } from '@/api/clientSession';
import { readCachedClientSession, resetClientAccess } from '@/utils/clientSessionCache';
import { hasSessionTokens } from '@/api/haSession';
import { isObject } from '@/validators/guards';
import { useHomeStartupSignal, useOptionalHomeStartup } from '@/hooks/startup/HomeStartupContext';
import { readQrPreferences } from '@/api/qrPairing';

const ClientSessionContext = createContext<ClientSession | null>(null);
export const useClientSession = () => useContext(ClientSessionContext);

/** Nessun writer o editor viene montato prima che HA abbia identificato la sessione client. */
export function ClientAccessGate({ children }: { children: (session: ClientSession) => ReactNode }) {
  const meta = useHomeAssistantMeta();
  const { config, setConfig } = useConfig();
  const connection = useConnectionSetup({ config, setConfig });
  const [session, setSession] = useState<ClientSession | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [verified, setVerified] = useState(false);
  const startup = useOptionalHomeStartup();
  const retryAccess = useCallback(() => setRetry((value) => value + 1), []);
  const manual = config.authMethod === 'token';
  useEffect(() => {
    const changed = () => setSession(getClientSession());
    window.addEventListener(CLIENT_SESSION_EVENT, changed);
    return () => { window.removeEventListener(CLIENT_SESSION_EVENT, changed); setClientSession(null); };
  }, []);
  useEffect(() => {
    if (manual) return;
    const controller = new AbortController();
    const cached = hasSessionTokens() ? getClientSession() ?? readCachedClientSession() : null;
    const known = cached && (!meta.haUser?.id || cached.user.id === meta.haUser.id) ? cached : null;
    setClientSession(known); setError(''); setVerified(false);
    void readClientBootstrap(controller.signal).then(async (value) => {
      if (controller.signal.aborted) return;
      const qr = readQrPreferences();
      if (qr?.mode === 'account' && qr.accountUserId && qr.accountUserId !== value.user.id) {
        resetClientAccess(); setClientSession(null); setError('Il QR collega l’account del dispositivo di partenza. Accedi con quell’account oppure usa il QR pubblico della centrale.'); return;
      }
      if (value.client && !value.client.revokedAt) {
        setClientSession({ houseId: value.houseId, user: value.user, client: value.client }); setVerified(true);
      } else {
        resetClientAccess();
        setClientSession(null);
        if (value.client?.revokedAt) {
          setError('Questo accesso è stato scollegato. Accedi di nuovo al tuo account.');
          return;
        }
        const record = await registerClient(value.houseId, value.user.id, defaultClientLabel());
        if (controller.signal.aborted) return;
        if (record.revokedAt) throw new Error('Questo accesso è stato scollegato. Accedi di nuovo.');
        try { localStorage.setItem('tunet_device_label', record.label); } catch { /* Nome conservato sul server. */ }
        setClientSession({ houseId: value.houseId, user: value.user, client: record }); setVerified(true);
      }
    }).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      const status = isObject(failure) ? Number(failure.status) : NaN;
      if (known && (!Number.isFinite(status) || status >= 500)) { setClientSession({ ...known, offline: true }); return; }
      if (Number.isFinite(status) && status < 500) resetClientAccess();
      setClientSession(null);
      setError(failure instanceof Error ? failure.message : 'Non riesco a collegare questo dispositivo. Riprova.');
    });
    return () => controller.abort();
  }, [meta.haUser?.id, manual, retry]);
  useHomeStartupSignal('access', {
    status: manual || error || session?.offline ? 'outside' : verified ? 'ready' : 'pending',
    retry: retryAccess,
    scope: verified && session ? `${session.houseId}:${session.user.id}:${session.client.id}` : undefined,
  });
  if (session) return <ClientSessionContext.Provider value={session}>{children(session)}</ClientSessionContext.Provider>;
  if (startup?.canPresent() && !manual && !error && !session) return null;
  return <main className="aca-connect"><StatusMessage
    message={manual ? 'Per riconoscere e scollegare separatamente i tuoi dispositivi serve un accesso personale. Il token condiviso non identifica una sessione indipendente.'
      : error || 'Verifica dell’accesso in corso…'} messageRole={error ? 'alert' : 'status'}>
    {error && <Button variant="primary" onClick={retryAccess}>Riprova</Button>}
    {(manual || error) && <Button variant={manual ? 'primary' : 'secondary'} onClick={() => void connection.logout()}>Accedi di nuovo</Button>}
  </StatusMessage></main>;
}
