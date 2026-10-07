/**
 * Proxy verso Home Assistant (ADR-0009): il browser parla solo con Acasystem e il server
 * inoltra a TUNET_INTERNAL_HA_URL le richieste sotto `/ha`. Solo i percorsi elencati qui
 * passano; tutto il resto risponde 404.
 */

/** Prefisso pubblico del proxy: `/ha<percorso>` va a `<TUNET_INTERNAL_HA_URL><percorso>`. */
export const HOME_ASSISTANT_PROXY_PREFIX = '/ha';

/** Percorso del WebSocket di HA (dopo il prefisso), inoltrato solo come upgrade. */
export const HOME_ASSISTANT_WEBSOCKET_PATH = '/api/websocket';

/**
 * Percorso consentito. Nel modello, `:param` è esattamente un segmento non vuoto e un `*`
 * finale è uno o più segmenti non vuoti. `loginAttempt` lo sottopone al limite dei
 * tentativi di accesso. `loginFlowStart` (solo l'avvio del flusso di accesso) fa leggere
 * il corpo JSON, al massimo HOME_ASSISTANT_LOGIN_FLOW_BODY_LIMIT_BYTES, e lo inoltra solo
 * se `handler[0]` è HOME_ASSISTANT_LOGIN_HANDLER.
 */
export interface HomeAssistantProxyRoute {
  method: 'GET' | 'POST' | 'DELETE';
  pattern: string;
  loginAttempt?: boolean;
  loginFlowStart?: boolean;
}

export const HOME_ASSISTANT_PROXY_ROUTES: readonly HomeAssistantProxyRoute[] = [
  { method: 'GET', pattern: '/auth/providers' },
  { method: 'POST', pattern: '/auth/login_flow', loginAttempt: true, loginFlowStart: true },
  { method: 'POST', pattern: '/auth/login_flow/:flowId', loginAttempt: true },
  { method: 'DELETE', pattern: '/auth/login_flow/:flowId' },
  { method: 'POST', pattern: '/auth/token' },
  { method: 'POST', pattern: '/auth/revoke' },
  { method: 'GET', pattern: '/api/camera_proxy/:entityId' },
  { method: 'GET', pattern: '/api/camera_proxy_stream/:entityId' },
  { method: 'GET', pattern: '/api/media_player_proxy/:entityId' },
  // Miniature del selettore media: /api/media_player_proxy/<id>/browse_media/<tipo>/<id>.
  { method: 'GET', pattern: '/api/media_player_proxy/:entityId/browse_media/*' },
  { method: 'GET', pattern: '/api/image_proxy/:entityId' },
  { method: 'GET', pattern: '/api/history/period' },
  { method: 'GET', pattern: '/api/history/period/:timestamp' },
  // Playlist e segmenti HLS delle videocamere (/api/hls/<token>/...).
  { method: 'GET', pattern: '/api/hls/*' },
];

/**
 * Unico provider di accesso inoltrato (SR-1): HA vede solo l'indirizzo del server
 * Acasystem, quindi provider basati sull'indirizzo, come trusted_networks, non devono
 * poter partire attraverso il proxy.
 */
export const HOME_ASSISTANT_LOGIN_HANDLER = 'homeassistant';

/** Dimensione massima del corpo JSON che avvia il flusso di accesso. */
export const HOME_ASSISTANT_LOGIN_FLOW_BODY_LIMIT_BYTES = 4 * 1024;

/**
 * Intestazioni della richiesta inoltrate a HA; le altre (Cookie, Origin, X-Forwarded-*,
 * Forwarded, hop-by-hop, intestazioni personalizzate) restano sul server Acasystem.
 * Host diventa quello dell'URL interno.
 */
export const FORWARDED_REQUEST_HEADERS: readonly string[] = [
  'authorization',
  'content-type',
  'content-length',
  'accept',
  'accept-encoding',
  'accept-language',
  'range',
  'if-range',
  'if-none-match',
  'if-modified-since',
  'user-agent',
];

/** Intestazioni aggiuntive dell'handshake WebSocket inoltrate a HA. */
export const FORWARDED_WEBSOCKET_HEADERS: readonly string[] = [
  'sec-websocket-key',
  'sec-websocket-version',
  'sec-websocket-protocol',
  'sec-websocket-extensions',
];

/**
 * Intestazioni della risposta di HA non restituite al browser: hop-by-hop, cookie di HA
 * sull'origine di Acasystem e la CSP di HA (le risposte inoltrate ricevono quella di
 * config/security.ts).
 */
export const DROPPED_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'set-cookie',
  'content-security-policy',
  'content-security-policy-report-only',
]);
