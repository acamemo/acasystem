/**
 * Validatori dei token OAuth di Home Assistant salvati nel browser.
 * HAWS scrive sempre l'AuthData completo; la forma parziale resta ammessa
 * per i token sincronizzati tra schede e per compatibilità.
 * Dal 2026-10-07 (ADR-0009) i token valgono solo per l'hassUrl del proxy Acasystem.
 */
import type { AuthData } from 'home-assistant-js-websocket';
import { isFiniteNumber, isNonEmptyString, isObject, isRecord, type UnknownRecord } from './guards';

export type StoredOAuthTokens = Partial<AuthData> & UnknownRecord;

const STRING_FIELDS = ['hassUrl', 'access_token', 'refresh_token'] as const;
const NUMBER_FIELDS = ['expires', 'expires_in'] as const;

const isOptionalString = (value: unknown) => value === undefined || typeof value === 'string';
const isOptionalNumber = (value: unknown) => value === undefined || typeof value === 'number';

/** Oggetto token: i campi noti, se presenti, hanno il tipo previsto. */
export function isStoredOAuthTokens(value: unknown): value is StoredOAuthTokens {
  if (!isObject(value) || Array.isArray(value)) return false;
  if (!STRING_FIELDS.every((field) => isOptionalString(value[field]))) return false;
  if (!NUMBER_FIELDS.every((field) => isOptionalNumber(value[field]))) return false;
  return (
    value.clientId === undefined || value.clientId === null || typeof value.clientId === 'string'
  );
}

/** AuthData completo, come richiesto da `getAuth` di HAWS. */
export function isAuthData(value: unknown): value is AuthData {
  return (
    isStoredOAuthTokens(value) &&
    STRING_FIELDS.every((field) => typeof value[field] === 'string') &&
    NUMBER_FIELDS.every((field) => typeof value[field] === 'number') &&
    value.clientId !== undefined
  );
}

/** Token utilizzabili da HAWS oppure `undefined` (HAWS avvia allora il login). */
export function toHawsAuthData(value: unknown): AuthData | undefined {
  return isAuthData(value) ? value : undefined;
}

/** True se il payload contiene almeno un token di accesso o di rinnovo. */
export function hasTokenPayload(tokens: unknown): boolean {
  return isObject(tokens) && Boolean(tokens.access_token || tokens.refresh_token);
}

/**
 * Sessione utilizzabile da questo browser: AuthData completo, con token non vuoti, ottenuto per
 * l'hassUrl indicato. I token di un altro indirizzo (il vecchio collegamento diretto) no.
 */
export function isSessionTokensFor(value: unknown, hassUrl: string): value is AuthData {
  return (
    isAuthData(value) &&
    value.hassUrl === hassUrl &&
    isNonEmptyString(value.access_token) &&
    isNonEmptyString(value.refresh_token)
  );
}

export interface SessionTokenContext {
  hassUrl: string;
  clientId: string;
  /** Istante della risposta in millisecondi, per la scadenza. */
  now?: number;
}

/**
 * Risposta di `/auth/token` (scambio del codice) trasformata nell'AuthData salvato, come fa
 * HAWS: hassUrl e client_id della richiesta, scadenza assoluta. `null` se incompleta.
 */
export function toSessionTokens(
  value: unknown,
  { hassUrl, clientId, now = Date.now() }: SessionTokenContext
): AuthData | null {
  if (!isRecord(value)) return null;
  const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = value;
  if (!isNonEmptyString(accessToken) || !isNonEmptyString(refreshToken)) return null;
  if (!isFiniteNumber(expiresIn) || expiresIn <= 0) return null;
  return {
    hassUrl,
    clientId,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    expires: now + expiresIn * 1000,
  };
}
