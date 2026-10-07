/**
 * Accesso a Home Assistant attraverso Acasystem (ADR-0009): cosa succede quando la pagina di
 * accesso ottiene una sessione o un token a lunga durata, e quando l'utente esce.
 * Non c'è più l'OAuth con reindirizzamento né un indirizzo da salvare: la sessione arriva dal
 * login di Acasystem e Home Assistant si raggiunge sempre dal proxy del server.
 */
import { useCallback } from 'react';
import type { AuthData } from 'home-assistant-js-websocket';
import type { HomeAssistantConfig } from '@/@types/dashboard';
import { getHassUrl } from '@/api/haUrl';
import {
  forgetAccessMethod,
  forgetKioskToken,
  loadSessionTokens,
  persistSessionTokens,
  revokeSession,
  saveAccessMethod,
  saveKioskToken,
  type AccessMethod,
} from '@/api/haSession';
import { clearOAuthTokens } from '@/api/oauthStorage';
import { useConnectPageControl } from '@/hooks/context/ConfigContext';

export interface ConnectionSetupDeps {
  config: HomeAssistantConfig;
  setConfig: (config: HomeAssistantConfig) => void;
}

export interface ConnectionSetup {
  /** Metodo in uso: sessione dell'accesso con utente e password, o token a lunga durata. */
  method: AccessMethod;
  /**
   * Token ottenuti con l'accesso Acasystem: li salva, dimentica il token a lunga durata e revoca
   * la sessione precedente, se diversa.
   */
  acceptSession: (tokens: AuthData) => void;
  /** Token a lunga durata già verificato da Home Assistant: lo salva e chiude la sessione. */
  acceptToken: (token: string) => void;
  /**
   * Esci: dimentica ogni credenziale, apre la pagina di accesso e revoca il token di rinnovo
   * (`auth.revoke()` sul proxy). Risolve quando la revoca è terminata.
   */
  logout: () => Promise<void>;
  /** Apre la pagina di accesso; null fuori dall'app (anteprime, pagine isolate). */
  openLogin: (() => void) | null;
  /** Torna all'app senza un nuovo accesso; null se non c'è una sessione a cui tornare. */
  cancelLogin: (() => void) | null;
}

export function useConnectionSetup({ config, setConfig }: ConnectionSetupDeps): ConnectionSetup {
  const control = useConnectPageControl();
  const method: AccessMethod = config.authMethod === 'token' ? 'token' : 'oauth';

  const acceptSession = useCallback(
    (tokens: AuthData) => {
      const previous = loadSessionTokens();
      persistSessionTokens(tokens);
      forgetKioskToken();
      saveAccessMethod('oauth');
      if (previous && previous.refresh_token !== tokens.refresh_token) void revokeSession(previous);
      setConfig({ ...config, url: getHassUrl(), fallbackUrl: '', token: '', authMethod: 'oauth' });
    },
    [config, setConfig]
  );

  const acceptToken = useCallback(
    (token: string) => {
      const previous = loadSessionTokens();
      clearOAuthTokens();
      saveKioskToken(token);
      saveAccessMethod('token');
      if (previous) void revokeSession(previous);
      setConfig({ ...config, url: getHassUrl(), fallbackUrl: '', token, authMethod: 'token' });
    },
    [config, setConfig]
  );

  const logout = useCallback(async () => {
    const session = loadSessionTokens();
    clearOAuthTokens();
    forgetKioskToken();
    forgetAccessMethod();
    setConfig({ ...config, url: getHassUrl(), fallbackUrl: '', token: '', authMethod: 'oauth' });
    control?.open();
    await revokeSession(session);
  }, [config, setConfig, control]);

  return {
    method,
    acceptSession,
    acceptToken,
    logout,
    openLogin: control?.open ?? null,
    cancelLogin: control?.cancel ?? null,
  };
}
