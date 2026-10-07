import {
  HOME_ASSISTANT_PROXY_PREFIX,
  HOME_ASSISTANT_PROXY_ROUTES,
  HOME_ASSISTANT_WEBSOCKET_PATH,
} from '../config/homeAssistantProxy.ts';
import type { HomeAssistantProxyRoute } from '../config/homeAssistantProxy.ts';

/**
 * Percorsi del proxy verso HA: separazione del prefisso `/ha`, controllo dei caratteri e
 * confronto con la lista consentita. Il percorso inoltrato è quello ricevuto, senza
 * decodifica: ciò che si controlla qui è esattamente ciò che riceve HA.
 */

export interface HomeAssistantProxyTarget {
  /** Percorso dopo `/ha`, per esempio `/auth/token`. */
  path: string;
  /** Query con il `?` iniziale, oppure stringa vuota. */
  search: string;
}

export type HomeAssistantProxyMatch =
  | ({ allowed: true; route: HomeAssistantProxyRoute } & HomeAssistantProxyTarget)
  | { allowed: false };

// Caratteri ammessi da RFC 3986 in un percorso e in una query (pchar, "/" e "?").
const SAFE_PATH_PATTERN = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/%]*$/;
const SAFE_QUERY_PATTERN = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/?%]*$/;
const MALFORMED_PERCENT_PATTERN = /%(?![0-9A-Fa-f]{2})/;
// Punto, barra, barra rovesciata e NUL codificati: potrebbero ricomporre `..` o `//` in HA.
const FORBIDDEN_ENCODED_PATTERN = /%(2e|2f|5c|00)/i;

/** Percorso e query dopo il prefisso `/ha`; null se l'URL non appartiene al proxy. */
export const splitHomeAssistantProxyUrl = (url: string): HomeAssistantProxyTarget | null => {
  const queryIndex = url.indexOf('?');
  const rawPath = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const search = queryIndex === -1 ? '' : url.slice(queryIndex);

  if (rawPath !== HOME_ASSISTANT_PROXY_PREFIX && !rawPath.startsWith(`${HOME_ASSISTANT_PROXY_PREFIX}/`)) {
    return null;
  }
  return { path: rawPath.slice(HOME_ASSISTANT_PROXY_PREFIX.length), search };
};

/** Vero per `/ha`, `/ha/...` e `/ha?...`: richieste di cui risponde il proxy. */
export const isHomeAssistantProxyUrl = (url: string): boolean =>
  splitHomeAssistantProxyUrl(url) !== null;

/** Rifiuta `..`, `//`, barre rovesciate, codifiche di punto e barra, caratteri non ammessi. */
export const isSafeProxyTarget = ({ path, search }: HomeAssistantProxyTarget): boolean =>
  path.startsWith('/') &&
  SAFE_PATH_PATTERN.test(path) &&
  !MALFORMED_PERCENT_PATTERN.test(path) &&
  !FORBIDDEN_ENCODED_PATTERN.test(path) &&
  !path.includes('..') &&
  !path.includes('//') &&
  (search === '' ||
    (search.startsWith('?') &&
      SAFE_QUERY_PATTERN.test(search) &&
      !MALFORMED_PERCENT_PATTERN.test(search)));

const matchesPattern = (pattern: string, path: string): boolean => {
  const patternSegments = pattern.split('/').slice(1);
  const pathSegments = path.split('/').slice(1);
  if (pathSegments.some((segment) => segment === '')) return false;

  for (const [index, patternSegment] of patternSegments.entries()) {
    if (patternSegment === '*') {
      return index === patternSegments.length - 1 && pathSegments.length > index;
    }
    const pathSegment = pathSegments[index];
    if (pathSegment === undefined) return false;
    if (!patternSegment.startsWith(':') && patternSegment !== pathSegment) return false;
  }
  return pathSegments.length === patternSegments.length;
};

/** Esito della lista consentita per una richiesta HTTP (non WebSocket) sotto `/ha`. */
export const matchHomeAssistantProxyRequest = (
  method: string | undefined,
  url: string
): HomeAssistantProxyMatch => {
  const target = splitHomeAssistantProxyUrl(url);
  if (!target || !isSafeProxyTarget(target)) return { allowed: false };

  const route = HOME_ASSISTANT_PROXY_ROUTES.find(
    (candidate) => candidate.method === method && matchesPattern(candidate.pattern, target.path)
  );
  return route ? { allowed: true, route, ...target } : { allowed: false };
};

/** Bersaglio dell'upgrade WebSocket: solo `GET /ha/api/websocket`, altrimenti null. */
export const matchHomeAssistantWebSocketRequest = (
  method: string | undefined,
  url: string
): HomeAssistantProxyTarget | null => {
  const target = splitHomeAssistantProxyUrl(url);
  if (method !== 'GET' || !target || !isSafeProxyTarget(target)) return null;
  return target.path === HOME_ASSISTANT_WEBSOCKET_PATH ? target : null;
};
