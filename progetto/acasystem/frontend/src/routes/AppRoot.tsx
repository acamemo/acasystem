/**
 * Acasystem app (ADR-0007/0008/0009): the Acasystem login page while this browser has no
 * credentials, the Home Assistant provider (always through the Acasystem proxy), the settings
 * sync and the new routes. The legacy UI state (sidebars, modals: AppUiContext, ModalContext) is
 * not mounted: the launcher keeps its own sheets and edit mode.
 * `src/app.tsx` re-exports it as the app root.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDemoSource } from '@/api/demoSource';
import { QrAccountNotice } from '@/components/qrAccountNotice';
import { hasStoredCredentials, hasSessionTokens } from '@/api/haSession';
import { requestTokensFromOtherTabs, subscribeToOAuthTokenChanges } from '@/api/oauthStorage';
import {
  ConnectPageControlProvider,
  useConfig,
  type ConnectPageControl,
} from '@/hooks/context/ConfigContext';
import { HomeAssistantProvider } from '@/hooks/context/HomeAssistantContext';
import { useLauncherSettingsSync } from '@/hooks/launcher/useSnapshotSetters';
import { AppRoutes, ROUTES } from './AppRoutes';
import { useLocation } from 'react-router-dom';
import { isCasaPath } from '@/casa3d/casaNav';
import { HomeStartupProvider } from '@/hooks/startup/HomeStartupContext';
import { WebPairingPage } from '@/pages/connect/WebPairingPage';
import { CentralSetupGate } from '@/pages/connect/CentralSetupGate';
import { captureWebPairing, type WebPairingEntry } from '@/api/webPairing';
import { ClientAccessGate } from '@/hooks/client/ClientAccessGate';
import { LiveProfilesProvider } from '@/hooks/liveProfiles/LiveProfilesContext';
import { OwnerAppearanceGate } from '@/pages/connect/OwnerAppearanceGate';
import { captureNativeQrHandoff } from '@/api/qrHandoff';
import { isClientShell } from '@/utils/clientShell';
import { Body } from '@/components/primitives';
import { resetClientAccess } from '@/utils/clientSessionCache';
import { setClientSession } from '@/api/clientSession';

interface LoginPageState {
  open: boolean;
  /** Opened on request while a session exists: «Annulla» goes back to the app. */
  returnable: boolean;
}

/**
 * Reopens the login page when the credentials are gone (as `useConnectionSetup` did for the
 * legacy app). It runs when the access changes and when the login page closes.
 */
function ConnectionLifecycle({
  loginOpen,
  openLogin,
  credentialRevision,
}: {
  loginOpen: boolean;
  openLogin: () => void;
  credentialRevision: number;
}) {
  const { config } = useConfig();

  useEffect(() => {
    if (!loginOpen && !hasStoredCredentials()) {
      resetClientAccess(); setClientSession(null); openLogin();
    }
  }, [config.token, config.authMethod, loginOpen, openLogin, credentialRevision]);

  return null;
}

/** Pushes the settings snapshot when edit mode ends, as the legacy dashboard did. */
function SettingsSync() {
  useLauncherSettingsSync();
  return null;
}

export function App({ initialPairing = null }: { initialPairing?: WebPairingEntry | null }) {
  const [handoffReady, setHandoffReady] = useState(() => !isClientShell());
  useEffect(() => {
    if (!isClientShell()) return;
    const controller = new AbortController();
    void captureNativeQrHandoff(controller.signal).catch(() => undefined).finally(() => {
      if (!controller.signal.aborted) setHandoffReady(true);
    });
    return () => controller.abort();
  }, []);
  const [pairing, setPairing] = useState(initialPairing);
  useEffect(() => {
    const changed = () => {
      const entry = captureWebPairing(window.location, window.history);
      if (entry) setPairing(entry);
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  if (!handoffReady) return <main className="aca-connect"><Body role="status">Verifica del collegamento QR…</Body></main>;
  if (pairing) return <WebPairingPage key={pairing.kind === 'ready' ? pairing.code.invite : 'invalid'}
    entry={pairing} onContinue={() => setPairing(null)} />;
  return <CentralSetupGate><ConnectedApp /></CentralSetupGate>;
}

function ConnectedApp() {
  const location = useLocation();
  const { config } = useConfig();
  const [tokenRevision, setTokenRevision] = useState(0);
  const [login, setLogin] = useState<LoginPageState>(() => ({
    open: !hasStoredCredentials(),
    returnable: false,
  }));
  const loginCompleted = useRef(!login.open);
  // A new key remounts the provider when a new access is accepted, so the new credentials
  // connect; opening the login page keeps the current connection until then.
  const [sessionKey, setSessionKey] = useState(0);
  // Tokens may come from another tab only when the app starts: after a sign-out or a request
  // for the login page, a session still open elsewhere must not sign this tab in again.
  const [hydrate, setHydrate] = useState(true);

  useEffect(
    () => subscribeToOAuthTokenChanges(() => setTokenRevision((revision) => revision + 1)),
    []
  );

  const openLogin = useCallback(() => {
    // Demo mode has no sign-in to change: the login page would ask the network for a session.
    if (getDemoSource()) return;
    loginCompleted.current = false;
    setHydrate(false);
    setLogin({ open: true, returnable: hasStoredCredentials() });
  }, []);
  const finishLogin = useCallback(() => {
    // Hydration e callback del form possono confermare lo stesso ingresso.
    if (loginCompleted.current) return;
    loginCompleted.current = true;
    setLogin({ open: false, returnable: false });
    setSessionKey((key) => key + 1);
  }, []);

  // At start, a session kept by another tab of this browser.
  useEffect(() => {
    if (!hydrate || config.authMethod === 'token' || !login.open || login.returnable) return;
    if (hasSessionTokens()) {
      finishLogin();
      return;
    }
    requestTokensFromOtherTabs().catch((error: unknown) => {
      console.error('Failed to hydrate OAuth tokens from another tab:', error);
    });
  }, [hydrate, config.authMethod, login.open, login.returnable, tokenRevision, finishLogin]);

  const control = useMemo<ConnectPageControl>(
    () => ({
      open: openLogin,
      cancel: login.returnable ? () => setLogin({ open: false, returnable: false }) : null,
    }),
    [openLogin, login.returnable]
  );

  return (
    <ConnectPageControlProvider value={control}>
      <HomeAssistantProvider key={`sessione-${sessionKey}`} config={config}>
        <HomeStartupProvider eligible={!login.open && location.pathname !== ROUTES.system && !isCasaPath(location.pathname)} identityManaged={!getDemoSource()}>
        <ConnectionLifecycle loginOpen={login.open} openLogin={openLogin} credentialRevision={tokenRevision} />
        {login.open || getDemoSource() ? <>
          {getDemoSource() && <SettingsSync />}
          <QrAccountNotice />
          <AppRoutes showConnect={login.open} onConnected={finishLogin} />
        </> : <ClientAccessGate>{(session) => <OwnerAppearanceGate session={session}><LiveProfilesProvider session={session}>
          <QrAccountNotice />
          <AppRoutes showConnect={false} onConnected={finishLogin} />
        </LiveProfilesProvider></OwnerAppearanceGate>}</ClientAccessGate>}
        </HomeStartupProvider>
      </HomeAssistantProvider>
    </ConnectPageControlProvider>
  );
}

export default App;
