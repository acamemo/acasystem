/**
 * Indirizzo di Home Assistant visto dal browser (ADR-0009, REP-20261007-002).
 *
 * Il browser parla solo con Acasystem: il server inoltra a Home Assistant le richieste sotto
 * `/ha`. Questo modulo è l'unico punto che calcola l'indirizzo usato da WebSocket, accesso,
 * rinnovo e revoca dei token, immagini e flussi: origine + percorso base dell'app + `/ha`.
 * Nessun indirizzo di Home Assistant viene chiesto, salvato o letto dal browser.
 */

/** Prefisso del proxy di Home Assistant nel server Acasystem, relativo alla cartella dell'app. */
export const HA_PROXY_PATH = 'ha';

/** URL del documento: `document.baseURI` risolve come `./api` del backendClient. */
function currentDocumentUrl(): string {
  if (typeof document !== 'undefined' && document.baseURI) return document.baseURI;
  if (typeof location !== 'undefined' && location.href) return location.href;
  return 'http://localhost/';
}

/**
 * hassUrl di una pagina: origine + percorso base dell'app + `/ha`, senza barra finale. Il
 * percorso base è la cartella della pagina, quindi l'app servita in un sottopercorso
 * (`/acasystem/`) usa `/acasystem/ha`. Query e frammento (le rotte hash) non contano.
 */
export function resolveHassUrl(documentUrl: string): string {
  const url = new URL(`./${HA_PROXY_PATH}`, documentUrl);
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

/** hassUrl della pagina corrente, da passare a HAWS e ai client REST di Home Assistant. */
export function getHassUrl(): string {
  return resolveHassUrl(currentDocumentUrl());
}

/**
 * client_id e redirect_uri dell'accesso: l'origine della pagina con la barra finale, lo stesso
 * valore che HAWS usa per il rinnovo (`genClientId`).
 */
export function resolveClientId(pageUrl: string): string {
  return `${new URL(pageUrl).origin}/`;
}

/** client_id della pagina corrente. */
export function getClientId(): string {
  const pageUrl =
    typeof location !== 'undefined' && location.href ? location.href : currentDocumentUrl();
  return resolveClientId(pageUrl);
}
