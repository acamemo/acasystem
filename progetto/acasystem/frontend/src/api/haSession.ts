/**
 * Credenziali di Home Assistant conservate dal browser (ADR-0009).
 *
 * - Sessione dell'accesso Acasystem: token di accesso e di rinnovo salvati con oauthStorage e
 *   legati all'hassUrl del proxy; HAWS li rinnova e li revoca su `<hassUrl>/auth/token` e
 *   `<hassUrl>/auth/revoke`.
 * - Token a lunga durata per i tablet kiosk: `ha_token`, con il metodo `ha_auth_method`.
 * Utente e password non passano da qui: non vengono mai salvati. Gli indirizzi di Home Assistant
 * salvati da Tunet (`ha_url`, `ha_fallback_url`) sono ignorati e rimossi.
 */
import { Auth, type AuthData } from 'home-assistant-js-websocket';
import { getHassUrl } from '@/api/haUrl';
import { clearOAuthTokens, loadTokens, saveTokens } from '@/api/oauthStorage';
import { isNonEmptyString } from '@/validators/guards';
import { hasTokenPayload, isSessionTokensFor } from '@/validators/oauthTokens';

/** `oauth`: sessione dell'accesso con utente e password; `token`: token a lunga durata. */
export type AccessMethod = 'oauth' | 'token';

const METHOD_KEY = 'ha_auth_method';
const KIOSK_TOKEN_KEY = 'ha_token';

/** Chiavi dei vecchi indirizzi di Home Assistant salvati nel browser: ignorate e rimosse. */
export const LEGACY_ADDRESS_KEYS = ['ha_url', 'ha_fallback_url'] as const;

const local = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const session = (): Storage | null => {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
};

/** Esegue un'operazione sullo storage ignorando gli errori (navigazione privata, quota). */
function safely(operation: () => void): void {
  try {
    operation();
  } catch {
    // Storage unavailable: the in-memory state still applies.
  }
}

function readItem(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

// ── Sessione dell'accesso Acasystem ────────────────────────────────────────

/** Token della sessione per questo hassUrl, oppure null (assenti, incompleti o di un altro). */
export function loadSessionTokens(hassUrl: string = getHassUrl()): AuthData | null {
  const stored = loadTokens();
  return isSessionTokensFor(stored, hassUrl) ? stored : null;
}

export function hasSessionTokens(hassUrl: string = getHassUrl()): boolean {
  return loadSessionTokens(hassUrl) !== null;
}

/** Callback `saveTokens` di HAWS: salva il rinnovo, cancella tutto dopo una revoca (null). */
export function persistSessionTokens(tokens: AuthData | null): void {
  if (tokens) saveTokens(tokens);
  else clearOAuthTokens();
}

/** Auth di HAWS per la sessione salvata: rinnova i token sullo stesso hassUrl e li salva. */
export function createSessionAuth(hassUrl: string = getHassUrl()): Auth | null {
  const tokens = loadSessionTokens(hassUrl);
  return tokens ? new Auth(tokens, persistSessionTokens) : null;
}

/**
 * Revoca il token di rinnovo di una sessione con `auth.revoke()` di HAWS (POST
 * `<hassUrl>/auth/revoke`). Gli errori sono ignorati: i token sono già stati dimenticati qui.
 */
export async function revokeSession(tokens: AuthData | null): Promise<boolean> {
  if (!tokens?.refresh_token) return false;
  try {
    await new Auth(tokens).revoke();
    return true;
  } catch {
    return false;
  }
}

// ── Metodo e token a lunga durata ──────────────────────────────────────────

/** Token a lunga durata salvato; uno rimasto solo nella sessione passa nel localStorage. */
export function readKioskToken(): string {
  const token = readItem(local(), KIOSK_TOKEN_KEY);
  if (token) return token;
  const sessionToken = readItem(session(), KIOSK_TOKEN_KEY);
  if (!sessionToken) return '';
  saveKioskToken(sessionToken);
  return sessionToken;
}

export function saveKioskToken(token: string): void {
  safely(() => {
    local()?.setItem(KIOSK_TOKEN_KEY, token);
    session()?.removeItem(KIOSK_TOKEN_KEY);
  });
}

export function forgetKioskToken(): void {
  safely(() => {
    local()?.removeItem(KIOSK_TOKEN_KEY);
    session()?.removeItem(KIOSK_TOKEN_KEY);
  });
}

/** Metodo salvato; senza metodo, un token a lunga durata salvato vale come `token`. */
export function readAccessMethod(): AccessMethod {
  const saved = readItem(local(), METHOD_KEY);
  if (saved === 'token') return 'token';
  if (saved === null && readKioskToken()) return 'token';
  return 'oauth';
}

export function saveAccessMethod(method: AccessMethod): void {
  safely(() => local()?.setItem(METHOD_KEY, method));
}

export function forgetAccessMethod(): void {
  safely(() => local()?.removeItem(METHOD_KEY));
}

/** Il browser ha credenziali per collegarsi: il token a lunga durata o una sessione valida. */
export function hasStoredCredentials(): boolean {
  return readAccessMethod() === 'token' ? Boolean(readKioskToken()) : hasSessionTokens();
}

// ── Pulizia del collegamento diretto di Tunet ──────────────────────────────

/**
 * Rimuove gli indirizzi di Home Assistant salvati da Tunet e i token ottenuti per un altro
 * indirizzo: dopo il passaggio al proxy serve un nuovo accesso (ADR-0009, conseguenze).
 * Prima di cancellarli prova a revocare quei token sul loro hassUrl (SR-6), senza attendere la
 * risposta: la revoca non blocca l'avvio e un errore non viene mostrato.
 */
export function forgetLegacyConnection(hassUrl: string = getHassUrl()): void {
  safely(() => {
    for (const key of LEGACY_ADDRESS_KEYS) {
      local()?.removeItem(key);
      session()?.removeItem(key);
    }
  });
  const stored = loadTokens();
  if (!stored || !hasTokenPayload(stored) || isSessionTokensFor(stored, hassUrl)) return;
  const { hassUrl: issuer, refresh_token: refreshToken } = stored;
  if (isNonEmptyString(issuer) && isNonEmptyString(refreshToken)) {
    // Auth.revoke() of HAWS reads only hassUrl and refresh_token.
    void revokeSession({
      hassUrl: issuer,
      clientId: null,
      access_token: '',
      refresh_token: refreshToken,
      expires: 0,
      expires_in: 0,
    });
  }
  clearOAuthTokens();
}
