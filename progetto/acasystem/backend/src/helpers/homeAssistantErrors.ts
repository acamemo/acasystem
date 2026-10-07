import {
  ERR_CANNOT_CONNECT,
  ERR_CONNECTION_LOST,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_AUTH,
  ERR_INVALID_AUTH_CALLBACK,
  ERR_INVALID_HTTPS_TO_HTTP,
} from 'home-assistant-js-websocket';
import { readProperty } from './objects.ts';

/** Classificazione degli errori ricevuti durante la verifica del token presso HA. */

const NETWORK_ERROR_PATTERNS: readonly string[] = [
  'econnrefused',
  'econnreset',
  'enotfound',
  'ehostunreach',
  'eai_again',
  'etimedout',
  'socket hang up',
  'network error',
  'fetch failed',
  'getaddrinfo',
];

const TLS_ERROR_PATTERNS: readonly string[] = [
  'certificate',
  'self signed',
  'tls',
  'ssl',
  'unable to verify the first certificate',
  'hostname/ip does not match certificate',
];

const HA_WS_ERROR_LABELS: ReadonlyMap<number, string> = new Map([
  [ERR_CANNOT_CONNECT, 'ERR_CANNOT_CONNECT'],
  [ERR_INVALID_AUTH, 'ERR_INVALID_AUTH'],
  [ERR_CONNECTION_LOST, 'ERR_CONNECTION_LOST'],
  [ERR_HASS_HOST_REQUIRED, 'ERR_HASS_HOST_REQUIRED'],
  [ERR_INVALID_HTTPS_TO_HTTP, 'ERR_INVALID_HTTPS_TO_HTTP'],
  [ERR_INVALID_AUTH_CALLBACK, 'ERR_INVALID_AUTH_CALLBACK'],
]);

/** Testo minuscolo di `error.message || error`, come lo confrontava haAuth.js. */
const errorText = (error: unknown): string =>
  String(readProperty(error, 'message') || error || '').toLowerCase();

export const describeError = (error: unknown): string => {
  if (typeof error === 'number') {
    const label = HA_WS_ERROR_LABELS.get(error);
    if (label) return `${label} (code ${error})`;
  }
  const message = readProperty(error, 'message');
  if (message) return String(message);
  if (error === null || error === undefined) return 'unknown error';
  try {
    return String(error);
  } catch {
    return 'unknown error';
  }
};

export const isInvalidAuthError = (error: unknown): boolean => {
  if (error === ERR_INVALID_AUTH || error === ERR_INVALID_AUTH_CALLBACK) return true;

  const message = errorText(error);
  return (
    message.includes('invalid auth') ||
    message.includes('auth_invalid') ||
    message.includes('err_invalid_auth') ||
    message.includes('unauthorized') ||
    message.includes('invalid authentication')
  );
};

export const isHomeAssistantReachabilityError = (error: unknown): boolean => {
  if (
    error === ERR_CANNOT_CONNECT ||
    error === ERR_CONNECTION_LOST ||
    error === ERR_HASS_HOST_REQUIRED ||
    error === ERR_INVALID_HTTPS_TO_HTTP
  ) {
    return true;
  }

  const message = errorText(error);
  return [...NETWORK_ERROR_PATTERNS, ...TLS_ERROR_PATTERNS].some((pattern) =>
    message.includes(pattern)
  );
};

/**
 * Errore conservato nella cache dei token rifiutati. I codici numerici di HA diventano
 * `ERR_INVALID_AUTH (code 2)`: il rifiuto letto dalla cache resta un errore di
 * autenticazione (401) anche alle richieste successive.
 */
export const createCachedAuthError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'number') return new Error(describeError(error));
  return new Error(String(error || 'Home Assistant authentication failed'));
};
