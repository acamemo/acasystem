/**
 * Acasystem app (ADR-0007/0008/0009): the Acasystem login page while this browser has no
 * credentials, the Home Assistant provider (always through the Acasystem proxy), the settings
 * sync and the new routes. The legacy UI state (sidebars, modals: AppUiContext, ModalContext) is
 * not mounted: the launcher keeps its own sheets and edit mode.
 * `src/app.tsx` re-exports it as the app root.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasStoredCredentials, hasSessionTokens } from '@/api/haSession';
import { requestTokensFromOtherTabs, subscribeToOAuthTokenChanges } from '@/api/oauthStorage';
import {
  ConnectPageControlProvider,
  useConfig,
  type ConnectPageControl,
} from '@/hooks/context/ConfigContext';
import { HomeAssistantProvider } from '@/hooks/context/HomeAssistantContext';
import { useLauncherSettingsSync } from '@/hooks/launcher/useSnapshotSetters';
import { AppRoutes } from './AppRoutes';

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
}: {
  loginOpen: boolean;
  openLogin: () => void;
}) {
  const { config } = useConfig();

  useEffect(() => {
    if (!loginOpen && !hasStoredCredentials()) openLogin();
  }, [config.token, config.authMethod, loginOpen, openLogin]);

  return null;
}

/** Pushes the settings snapshot when edit mode ends, as the legacy dashboard did. */
function SettingsSync() {
  useLauncherSettingsSync();
  return null;
}

export function App() {
  const { config } = useConfig();
  const [tokenRevision, setTokenRevision] = useState(0);
  const [login, setLogin] = useState<LoginPageState>(() => ({
    open: !hasStoredCredentials(),
    returnable: false,
  }));
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
    setHydrate(false);
    setLogin({ open: true, returnable: hasStoredCredentials() });
  }, []);
  const finishLogin = useCallback(() => {
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
        <ConnectionLifecycle loginOpen={login.open} openLogin={openLogin} />
        <SettingsSync />
        <AppRoutes showConnect={login.open} onConnected={finishLogin} />
      </HomeAssistantProvider>
    </ConnectPageControlProvider>
  );
}

export default App;
