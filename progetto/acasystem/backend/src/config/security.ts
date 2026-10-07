/**
 * Content-Security-Policy inviata con ogni risposta. "self" = solo la stessa origine;
 * le origini esterne sono elencate esplicitamente.
 */
export const CONTENT_SECURITY_POLICY_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  // Scripts: own bundle only (inline for Vite dev handled by nonce/hash in dev mode)
  "script-src 'self'",
  // Styles: own + Google Fonts + inline (Tailwind / dynamic styles)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts: own + Google Fonts CDN
  "font-src 'self' https://fonts.gstatic.com",
  // Immagini: stessa origine, compreso Home Assistant attraverso il proxy /ha (ADR-0009);
  // http:/https: per le immagini con URL assoluto (configurato dall'utente o fornito da HA),
  // icone meteo, loghi dei media, tasselli della mappa, URI data/blob.
  "img-src 'self' data: blob: http: https: https://cdn.jsdelivr.net https://cdn.simpleicons.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org",
  // Connessioni: Home Assistant (REST e WebSocket) passa dalla stessa origine, /ha (ADR-0009).
  // http:/https: restano per gli URL assoluti personalizzati delle videocamere (HLS via XHR);
  // ws:/wss: sono invariati; non servono più a raggiungere un HA su un'altra origine.
  "connect-src 'self' ws: wss: http: https:",
  // Leaflet map iframe
  'frame-src https://www.openstreetmap.org',
  // Block all object/embed/plugin
  "object-src 'none'",
  // Restrict base-uri to prevent base tag injection
  "base-uri 'self'",
  // Only allow forms to submit to same origin
  "form-action 'self'",
];

export const CONTENT_SECURITY_POLICY = CONTENT_SECURITY_POLICY_DIRECTIVES.join('; ');

/**
 * CSP delle sole risposte di Home Assistant inoltrate dal proxy /ha, al posto di quella
 * generale: aperte come documento sull'origine dell'app non eseguono nulla. Non cambia
 * il caricamento come immagine, via XHR/fetch (HLS) o WebSocket. Va insieme a
 * `X-Content-Type-Options: nosniff`.
 */
export const HOME_ASSISTANT_PROXY_CONTENT_SECURITY_POLICY = "default-src 'none'; sandbox";

/** Limite del corpo JSON accettato da express.json(). */
export const JSON_BODY_LIMIT = '2mb';
