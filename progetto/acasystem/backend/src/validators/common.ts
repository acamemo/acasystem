import type { HomeAssistantUser } from '../@types/homeAssistant.ts';
import type { HttpFailure, Validation } from '../@types/http.ts';
import { isRecord } from '../helpers/objects.ts';

/**
 * Elementi comuni dei validatori scritti a mano. Riproducono i controlli dei router
 * Tunet: stesso ordine (utente 401 → campi obbligatori 400 → utente diverso 403),
 * stessi messaggi, nessun controllo aggiuntivo sui tipi.
 */

export const MISSING_AUTHENTICATED_USER = 'Missing authenticated Home Assistant user';
export const FORBIDDEN_USER_MISMATCH = 'Forbidden: user mismatch';

export const valid = <T>(value: T): Validation<T> => ({ ok: true, value });

export const invalid = <T>(status: number, error: string): Validation<T> => ({
  ok: false,
  failure: { status, error },
});

export type Fields = Record<string, unknown>;

/** Id dell'utente HA verificato dal middleware, oppure 401. */
export const validateRequestUser = (user: HomeAssistantUser | undefined): Validation<string> => {
  const requestUserId = user?.id;
  if (!requestUserId) {
    return invalid(401, MISSING_AUTHENTICATED_USER);
  }
  return valid(requestUserId);
};

/**
 * Campi del corpo JSON. Un corpo assente (richiesta senza JSON) fa fallire la
 * destrutturazione come nel server originale: l'errore arriva al gestore predefinito
 * di Express e la risposta resta 500.
 */
export const readRequestBody = (body: unknown): Fields => {
  if (body === undefined || body === null) {
    throw new TypeError(`Cannot read request fields: the request body is ${String(body)}.`);
  }
  return isRecord(body) ? body : {};
};

/** Campi della query string (in Express 5 è sempre un oggetto). */
export const readQuery = (query: unknown): Fields => (isRecord(query) ? query : {});

/** 400 se almeno un campo è falsy (assente, vuoto, 0, null...). */
export const findMissingField = (
  fields: Fields,
  names: readonly string[],
  error: string
): HttpFailure | null => (names.some((name) => !fields[name]) ? { status: 400, error } : null);

/** Il valore inviato deve coincidere con l'utente autenticato, altrimenti 403. */
export const isSameUser = (value: unknown, requestUserId: string): value is string =>
  value === requestUserId;

/**
 * Etichetta del dispositivo senza caratteri di controllo, rifilata, al massimo 120
 * caratteri; null se vuota o non stringa.
 */
export const normalizeDeviceLabel = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const trimmed = value.replace(/[\x00-\x1f\x7f]/g, '').trim();
  return trimmed ? trimmed.slice(0, 120) : null;
};
