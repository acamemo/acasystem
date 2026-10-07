/**
 * Intestazioni di autenticazione per il backend Acasystem (profili e impostazioni).
 *
 * Il backend riconosce l'utente validando il token presso il suo Home Assistant configurato
 * (SEC-1): il browser invia solo `Authorization`, nessun indirizzo di Home Assistant
 * (ADR-0009). Con la sessione dell'accesso Acasystem il token si rinnova con l'Auth di HAWS
 * sull'hassUrl del proxy; con il token a lunga durata si usa quello salvato.
 */
import {
  createSessionAuth,
  forgetKioskToken,
  loadSessionTokens,
  readAccessMethod,
  readKioskToken,
} from '@/api/haSession';
import { clearOAuthTokens, getOAuthTokenSavedAt } from '@/api/oauthStorage';

export const HOME_ASSISTANT_API_UNAUTHORIZED_EVENT = 'tunet:api-auth-unauthorized';
const OAUTH_PROACTIVE_REFRESH_MS = 45 * 60 * 1000;
const OAUTH_REFRESH_SKEW_MS = 60 * 1000;

/** Parte dell'oggetto Auth di HAWS usata per firmare le richieste al backend. */
export interface OAuthAuthLike {
  accessToken?: string;
  expired?: boolean;
  refreshAccessToken?: () => Promise<void>;
}

export interface OAuthAuthProvider {
  current: OAuthAuthLike | null;
}

/** Solo il token: l'indirizzo di Home Assistant è configurato sul server. */
export interface HomeAssistantRequestHeaders {
  Authorization?: string;
}

export interface UnauthorizedEventDetail {
  authMethod: string;
  message: string;
}

export type UnauthorizedApiError = Error & { status: number; body: { error: string } };

let oauthAuthProvider: OAuthAuthProvider | null = null;
let detachedOAuthAuth: OAuthAuthLike | null = null;
let pendingOAuthRefreshPromise: Promise<string> | null = null;

/** `oauth` (sessione dell'accesso Acasystem) oppure `token` (token a lunga durata). */
export const getStoredAuthMethod = (): string => readAccessMethod();

const isOAuthAuthMethod = () => getStoredAuthMethod() === 'oauth';

const getOAuthAuth = (): OAuthAuthLike | null =>
  oauthAuthProvider?.current ?? detachedOAuthAuth ?? null;

const getCurrentOAuthAccessToken = (): string => {
  const auth = getOAuthAuth();
  if (typeof auth?.accessToken === 'string' && auth.accessToken) {
    return auth.accessToken;
  }

  return loadSessionTokens()?.access_token || '';
};

const getStoredOAuthExpiresAt = (): number => {
  const expiresAt = Number(loadSessionTokens()?.expires);
  return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : 0;
};

const clearCachedOAuthAuth = () => {
  detachedOAuthAuth = null;
};

/**
 * Auth della sessione: quella del provider se collegato, altrimenti una creata dai token salvati
 * per l'hassUrl del proxy (nessun reindirizzamento: senza token valida resta null).
 */
const ensureOAuthAuthSession = (): OAuthAuthLike | null => {
  if (!isOAuthAuthMethod()) return null;
  const existingAuth = getOAuthAuth();
  if (existingAuth) return existingAuth;
  detachedOAuthAuth = createSessionAuth();
  return detachedOAuthAuth;
};

const shouldProactivelyRefreshOAuth = (): boolean => {
  if (!isOAuthAuthMethod()) return false;
  const auth = getOAuthAuth();
  if (auth?.expired === true) return true;

  const expiresAt = getStoredOAuthExpiresAt();
  if (expiresAt > 0) {
    return Date.now() + OAUTH_REFRESH_SKEW_MS >= expiresAt;
  }

  if (typeof auth?.refreshAccessToken !== 'function') return false;

  const savedAt = getOAuthTokenSavedAt();
  if (!savedAt) return true;
  return Date.now() - savedAt >= OAUTH_PROACTIVE_REFRESH_MS;
};

const createUnauthorizedError = (message: string): UnauthorizedApiError =>
  Object.assign(new Error(message), { status: 401, body: { error: message } });

export function notifyHomeAssistantApiUnauthorized(
  message = 'Home Assistant authentication failed'
): UnauthorizedApiError {
  const authMethod = getStoredAuthMethod();

  if (authMethod === 'oauth') {
    clearCachedOAuthAuth();
    clearOAuthTokens();
  } else {
    forgetKioskToken();
  }

  if (typeof globalThis.window !== 'undefined') {
    globalThis.window.dispatchEvent(
      new globalThis.CustomEvent<UnauthorizedEventDetail>(HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, {
        detail: {
          authMethod,
          message,
        },
      })
    );
  }

  return createUnauthorizedError(message);
}

export function setOAuthAuthProvider(provider: OAuthAuthProvider | null | undefined): void {
  oauthAuthProvider = provider ?? null;
  if (provider) {
    detachedOAuthAuth = null;
  }
}

export async function refreshOAuthAccessToken(): Promise<string> {
  if (!isOAuthAuthMethod()) {
    return readKioskToken();
  }

  if (pendingOAuthRefreshPromise) {
    return pendingOAuthRefreshPromise;
  }

  pendingOAuthRefreshPromise = (async () => {
    const auth = ensureOAuthAuthSession();
    if (typeof auth?.refreshAccessToken === 'function') {
      await auth.refreshAccessToken();
      if (typeof auth?.accessToken === 'string' && auth.accessToken) {
        return auth.accessToken;
      }
    }

    return getCurrentOAuthAccessToken();
  })().finally(() => {
    pendingOAuthRefreshPromise = null;
  });

  return pendingOAuthRefreshPromise;
}

const currentAccessToken = (): string =>
  isOAuthAuthMethod() ? getCurrentOAuthAccessToken() : readKioskToken();

const toHeaders = (accessToken: string): HomeAssistantRequestHeaders =>
  accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

export function getHomeAssistantRequestHeaders(): HomeAssistantRequestHeaders {
  return toHeaders(currentAccessToken());
}

export interface RequestHeadersOptions {
  forceRefreshOAuth?: boolean;
}

export async function getHomeAssistantRequestHeadersAsync({
  forceRefreshOAuth = false,
}: RequestHeadersOptions = {}): Promise<HomeAssistantRequestHeaders> {
  let accessToken = currentAccessToken();

  if (forceRefreshOAuth || shouldProactivelyRefreshOAuth()) {
    try {
      accessToken = await refreshOAuthAccessToken();
    } catch (err) {
      if (forceRefreshOAuth) throw err;
      // Proactive refresh failed; continue with existing token
    }
  }

  return toHeaders(accessToken);
}

export function hasHomeAssistantRequestAuth(): boolean {
  return Boolean(getHomeAssistantRequestHeaders().Authorization);
}

export function getValidatedHomeAssistantRequestHeaders(): HomeAssistantRequestHeaders {
  const headers = getHomeAssistantRequestHeaders();
  if (!headers.Authorization) {
    throw notifyHomeAssistantApiUnauthorized('Missing Home Assistant bearer token');
  }
  return headers;
}

export async function getValidatedHomeAssistantRequestHeadersAsync(
  options: RequestHeadersOptions = {}
): Promise<HomeAssistantRequestHeaders> {
  const headers = await getHomeAssistantRequestHeadersAsync(options);
  if (!headers.Authorization) {
    throw notifyHomeAssistantApiUnauthorized('Missing Home Assistant bearer token');
  }
  return headers;
}
