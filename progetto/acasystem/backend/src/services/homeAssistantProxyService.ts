import http from 'node:http';
import type {
  ClientRequest,
  IncomingHttpHeaders,
  IncomingMessage,
  OutgoingHttpHeaders,
  ServerResponse,
} from 'node:http';
import https from 'node:https';
import { Socket } from 'node:net';
import { pipeline } from 'node:stream';
import type { Duplex } from 'node:stream';
import type { ApiErrorBody } from '../@types/http.ts';
import { readInternalHomeAssistantUrls } from '../config/env.ts';
import {
  DROPPED_RESPONSE_HEADERS,
  FORWARDED_REQUEST_HEADERS,
  FORWARDED_WEBSOCKET_HEADERS,
  HOME_ASSISTANT_LOGIN_HANDLER,
} from '../config/homeAssistantProxy.ts';
import { HOME_ASSISTANT_PROXY_CONTENT_SECURITY_POLICY } from '../config/security.ts';
import type { HomeAssistantProxyTarget } from '../helpers/homeAssistantProxyPaths.ts';
import { normalizeHomeAssistantUrl } from '../helpers/homeAssistantUrls.ts';
import { isRecord, readProperty } from '../helpers/objects.ts';

/**
 * Inoltro verso Home Assistant con i soli moduli di Node (ADR-0009). Le risposte passano
 * in streaming senza buffer e senza timeout d'inattività (camera_proxy_stream non finisce
 * mai); quando il client chiude, la richiesta verso HA viene interrotta. L'unico limite di
 * tempo riguarda l'attesa della prima risposta di HA. Una risposta di HA malformata (stato
 * fuori 100-599, intestazioni non valide) diventa un 502 e non un'eccezione non gestita.
 */

/** TUNET_INTERNAL_HA_URL letto a ogni richiesta; null se assente o non è un URL http(s). */
export const resolveHomeAssistantProxyBaseUrl = (): URL | null => {
  const [primaryUrl] = readInternalHomeAssistantUrls();
  const normalized = normalizeHomeAssistantUrl(primaryUrl);
  return normalized ? new URL(normalized) : null;
};

// Una connessione per richiesta, senza keep-alive: una connessione inattiva chiusa da HA
// non può far fallire la richiesta successiva. Gli agenti non impostano timeout.
const httpAgent = new http.Agent({ keepAlive: false });
const httpsAgent = new https.Agent({ keepAlive: false });

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

const listConnectionTokens = (value: string | string[] | undefined): Set<string> =>
  new Set(
    [value ?? '']
      .flat()
      .flatMap((entry) => entry.split(','))
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
  );

const buildUpstreamHeaders = (
  incoming: IncomingHttpHeaders,
  baseUrl: URL,
  names: readonly string[]
): OutgoingHttpHeaders => {
  const headers: OutgoingHttpHeaders = { host: baseUrl.host };
  for (const name of names) {
    const value = incoming[name];
    if (value !== undefined) headers[name] = value;
  }
  // Corpo a blocchi: Node lo ricodifica verso HA e la lunghezza dichiarata non vale.
  if (incoming['transfer-encoding'] !== undefined) {
    delete headers['content-length'];
    headers['transfer-encoding'] = 'chunked';
  }
  return headers;
};

const createUpstreamRequest = (
  baseUrl: URL,
  method: string,
  target: HomeAssistantProxyTarget,
  headers: OutgoingHttpHeaders
): ClientRequest => {
  const isHttps = baseUrl.protocol === 'https:';
  const basePath = baseUrl.pathname === '/' ? '' : baseUrl.pathname.replace(/\/$/, '');
  const hostname = baseUrl.hostname.startsWith('[')
    ? baseUrl.hostname.slice(1, -1)
    : baseUrl.hostname;

  return (isHttps ? https : http).request({
    protocol: baseUrl.protocol,
    hostname,
    port: baseUrl.port || (isHttps ? 443 : 80),
    method,
    path: `${basePath}${target.path}${target.search}`,
    headers,
    agent: isHttps ? httpsAgent : httpAgent,
  });
};

/**
 * Stato di una risposta di HA da restituire: intero tra `min` e 599, altrimenti eccezione.
 * Una risposta HTTP inoltrata deve essere finale (da 200, R-1): un 101 senza upgrade
 * lascerebbe il client in attesa.
 */
const readForwardableStatus = (upstreamRes: IncomingMessage, min = 100): number => {
  const status = upstreamRes.statusCode;
  if (status === undefined || !Number.isInteger(status) || status < min || status > 599) {
    throw new Error('risposta di Home Assistant con stato HTTP non valido');
  }
  return status;
};

/** Controlla nome e valore di un'intestazione di HA prima di restituirla (eccezione se non validi). */
const assertValidHeader = (name: string, value: string | string[]): void => {
  http.validateHeaderName(name);
  for (const entry of [value].flat()) http.validateHeaderValue(name, entry);
};

/**
 * Stato e intestazioni della risposta di HA sulla risposta al client, con la CSP delle
 * risposte inoltrate e nosniff. La reason phrase di HA non passa: Node usa quella standard.
 * Tutto viene controllato prima di toccare la risposta.
 */
const writeForwardedHead = (upstreamRes: IncomingMessage, res: ServerResponse): void => {
  const statusCode = readForwardableStatus(upstreamRes, 200);
  const connectionTokens = listConnectionTokens(upstreamRes.headers.connection);
  const headers: [string, string | string[]][] = [];
  for (const [name, value] of Object.entries(upstreamRes.headers)) {
    if (value === undefined || DROPPED_RESPONSE_HEADERS.has(name) || connectionTokens.has(name)) {
      continue;
    }
    assertValidHeader(name, value);
    headers.push([name, value]);
  }

  for (const [name, value] of headers) res.setHeader(name, value);
  res.setHeader('Content-Security-Policy', HOME_ASSISTANT_PROXY_CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.writeHead(statusCode);
};

/** Riporta le intestazioni della risposta a com'erano prima di writeForwardedHead. */
const restoreHeaders = (res: ServerResponse, previous: OutgoingHttpHeaders): void => {
  for (const name of res.getHeaderNames()) res.removeHeader(name);
  for (const [name, value] of Object.entries(previous)) {
    if (value !== undefined) res.setHeader(name, value);
  }
};

export interface HomeAssistantForwardOptions {
  baseUrl: URL;
  target: HomeAssistantProxyTarget;
  /** Attesa massima della prima risposta di HA; non vale per lo stream o il tunnel che segue. */
  responseTimeoutMs: number;
  /** HA non raggiungibile, oppure risposta di HA non valida, prima della risposta al client. */
  onUnreachable: (error: Error) => void;
  /** HA non ha risposto entro responseTimeoutMs; la richiesta verso HA è già chiusa. */
  onTimeout: () => void;
}

export interface HomeAssistantHttpForwardOptions extends HomeAssistantForwardOptions {
  /** Corpo già letto e controllato: inviato con la sua lunghezza al posto dello stream. */
  bufferedBody?: { bytes: Buffer; contentType: string };
}

/** Inoltra la richiesta HTTP a HA e la risposta al client, entrambe in streaming. */
export const forwardHttpRequest = (
  req: IncomingMessage,
  res: ServerResponse,
  {
    baseUrl,
    target,
    responseTimeoutMs,
    bufferedBody,
    onUnreachable,
    onTimeout,
  }: HomeAssistantHttpForwardOptions
): void => {
  const headers = buildUpstreamHeaders(req.headers, baseUrl, FORWARDED_REQUEST_HEADERS);
  if (bufferedBody) {
    delete headers['transfer-encoding'];
    headers['content-length'] = String(bufferedBody.bytes.length);
    headers['content-type'] = bufferedBody.contentType;
  }
  const upstreamReq = createUpstreamRequest(baseUrl, req.method ?? 'GET', target, headers);
  // waiting: nessuna risposta di HA; streaming: risposta in corso; closed: esito già deciso.
  let phase: 'waiting' | 'streaming' | 'closed' = 'waiting';

  const responseTimer = setTimeout(() => {
    if (phase !== 'waiting') return;
    phase = 'closed';
    req.unpipe(upstreamReq);
    upstreamReq.destroy();
    if (!res.destroyed && !res.headersSent) onTimeout();
  }, responseTimeoutMs);

  // Il client ha chiuso prima della fine della risposta: si interrompe la richiesta a HA.
  res.on('close', () => {
    clearTimeout(responseTimer);
    if (res.writableFinished) return;
    phase = 'closed';
    upstreamReq.destroy();
  });
  req.on('error', () => {
    clearTimeout(responseTimer);
    phase = 'closed';
    upstreamReq.destroy();
  });

  upstreamReq.on('response', (upstreamRes) => {
    clearTimeout(responseTimer);
    if (phase !== 'waiting') {
      upstreamRes.destroy();
      return;
    }
    phase = 'streaming';

    const previousHeaders = res.getHeaders();
    try {
      writeForwardedHead(upstreamRes, res);
    } catch (error) {
      phase = 'closed';
      upstreamRes.destroy();
      req.unpipe(upstreamReq);
      upstreamReq.destroy();
      if (res.headersSent) {
        res.destroy();
        return;
      }
      restoreHeaders(res, previousHeaders);
      onUnreachable(toError(error));
      return;
    }

    pipeline(upstreamRes, res, (error) => {
      if (error) {
        upstreamReq.destroy();
        res.destroy();
      }
    });
  });

  upstreamReq.on('error', (error) => {
    clearTimeout(responseTimer);
    req.unpipe(upstreamReq);
    if (phase === 'closed' || res.destroyed) return;
    const wasStreaming = phase === 'streaming';
    phase = 'closed';
    if (wasStreaming || res.headersSent) {
      res.destroy();
      return;
    }
    onUnreachable(error);
  });

  if (bufferedBody) upstreamReq.end(bufferedBody.bytes);
  else req.pipe(upstreamReq);
};

export type LimitedRequestBody =
  | { status: 'ok'; bytes: Buffer }
  | { status: 'too-large' }
  | { status: 'timeout' }
  | { status: 'aborted' };

/**
 * Legge il corpo della richiesta fino a `limitBytes` ed entro `timeoutMs` (R-6: un client
 * lento non tiene aperto il socket fino al requestTimeout di Node). Oltre il limite
 * (dichiarato o ricevuto) smette di conservarlo e scarta il resto: il chiamante risponde
 * 413; allo scadere del tempo risponde 408.
 */
export const readLimitedRequestBody = (
  req: IncomingMessage,
  limitBytes: number,
  timeoutMs = 10_000
): Promise<LimitedRequestBody> =>
  new Promise((resolve) => {
    if (Number(req.headers['content-length']) > limitBytes) {
      resolve({ status: 'too-large' });
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => finish({ status: 'timeout' }), timeoutMs);
    const finish = (result: LimitedRequestBody): void => {
      clearTimeout(timer);
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onAborted);
      req.off('close', onAborted);
      resolve(result);
    };
    const onData = (chunk: Buffer): void => {
      size += chunk.length;
      if (size > limitBytes) {
        finish({ status: 'too-large' });
        req.resume();
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = (): void => finish({ status: 'ok', bytes: Buffer.concat(chunks, size) });
    const onAborted = (): void => finish({ status: 'aborted' });

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onAborted);
    req.on('close', onAborted);
  });

// UTF-8 rigoroso, BOM compreso nel testo: un corpo che qui non è JSON valido non passa.
const loginBodyDecoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/**
 * Vero se il corpo che avvia il flusso di accesso è un oggetto JSON con
 * `handler[0] === 'homeassistant'` (utente e password). Altri provider, come
 * trusted_networks, non devono partire attraverso il proxy, perché HA vede solo
 * l'indirizzo del server Acasystem.
 */
export const isPasswordLoginFlowStart = (bytes: Buffer): boolean => {
  let body: unknown;
  try {
    body = JSON.parse(loginBodyDecoder.decode(bytes));
  } catch {
    return false;
  }
  if (!isRecord(body) || Array.isArray(body)) return false;
  const handler = readProperty(body, 'handler');
  return Array.isArray(handler) && handler[0] === HOME_ASSISTANT_LOGIN_HANDLER;
};

/** Risposta HTTP minima scritta sul socket di un upgrade che non diventa un tunnel. */
export const writeSocketJsonError = (
  socket: Duplex,
  statusCode: number,
  body: ApiErrorBody,
  extraHeaderLines: readonly string[] = []
): void => {
  if (socket.destroyed) return;
  const payload = JSON.stringify(body);
  socket.end(
    [
      `HTTP/1.1 ${statusCode} ${http.STATUS_CODES[statusCode] ?? ''}`,
      'Content-Type: application/json; charset=utf-8',
      `Content-Length: ${Buffer.byteLength(payload)}`,
      ...extraHeaderLines,
      'Connection: close',
      '',
      payload,
    ].join('\r\n'),
    () => socket.destroy()
  );
};

/**
 * Riga di stato e intestazioni di una risposta di HA da scrivere sul socket del client:
 * stato controllato, reason phrase standard, intestazioni controllate (eccezione se non
 * valide).
 */
const formatResponseHead = (
  upstreamRes: IncomingMessage,
  isDropped: (name: string) => boolean,
  extraLines: readonly string[] = []
): string => {
  const statusCode = readForwardableStatus(upstreamRes);
  const lines = [`HTTP/1.1 ${statusCode} ${http.STATUS_CODES[statusCode] ?? ''}`];
  const raw = upstreamRes.rawHeaders;
  for (let index = 0; index + 1 < raw.length; index += 2) {
    const name = raw[index];
    const value = raw[index + 1];
    if (name === undefined || value === undefined || isDropped(name.toLowerCase())) continue;
    assertValidHeader(name, value);
    lines.push(`${name}: ${value}`);
  }
  return [...lines, ...extraLines, '', ''].join('\r\n');
};

const configureTunnelSocket = (socket: Duplex): void => {
  if (socket instanceof Socket) {
    socket.setTimeout(0);
    socket.setNoDelay(true);
    socket.setKeepAlive(true);
  }
};

/**
 * Apre il WebSocket verso HA con le intestazioni dell'handshake del client, restituisce
 * la risposta 101 di HA e collega i due socket in entrambi i versi: la chiusura o
 * l'errore di un lato chiude l'altro. Il limite di tempo vale solo fino alla risposta di HA.
 */
export const openWebSocketTunnel = (
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  { baseUrl, target, responseTimeoutMs, onUnreachable, onTimeout }: HomeAssistantForwardOptions
): void => {
  const headers = buildUpstreamHeaders(req.headers, baseUrl, [
    'authorization',
    'user-agent',
    ...FORWARDED_WEBSOCKET_HEADERS,
  ]);
  headers.connection = 'Upgrade';
  headers.upgrade = 'websocket';

  const upstreamReq = createUpstreamRequest(baseUrl, 'GET', target, headers);
  // waiting: nessuna risposta di HA; response: risposta senza upgrade in corso verso il
  // client; tunnel: socket collegati; closed: esito già deciso (timeout, errore, chiusura).
  let phase: 'waiting' | 'response' | 'tunnel' | 'closed' = 'waiting';

  const responseTimer = setTimeout(() => {
    if (phase !== 'waiting') return;
    phase = 'closed';
    upstreamReq.destroy();
    onTimeout();
  }, responseTimeoutMs);

  const abortHandshake = (): void => {
    clearTimeout(responseTimer);
    if (phase !== 'waiting') return;
    phase = 'closed';
    upstreamReq.destroy();
  };
  socket.on('error', abortHandshake);
  socket.on('close', abortHandshake);

  /** Risposta di HA non valida: nulla è ancora partito verso il client, che riceve 502. */
  const rejectInvalidResponse = (error: unknown): void => {
    phase = 'closed';
    upstreamReq.destroy();
    onUnreachable(toError(error));
  };

  upstreamReq.on('upgrade', (upstreamRes, upstreamSocket, upstreamHead) => {
    clearTimeout(responseTimer);
    socket.off('close', abortHandshake);
    if (phase !== 'waiting' || socket.destroyed) {
      upstreamSocket.destroy();
      return;
    }

    let responseHead: string;
    try {
      responseHead = formatResponseHead(upstreamRes, (name) => name === 'set-cookie');
    } catch (error) {
      upstreamSocket.destroy();
      rejectInvalidResponse(error);
      return;
    }
    phase = 'tunnel';

    const closeBoth = (): void => {
      socket.destroy();
      upstreamSocket.destroy();
    };
    socket.on('error', closeBoth);
    socket.on('close', closeBoth);
    upstreamSocket.on('error', closeBoth);
    upstreamSocket.on('close', closeBoth);

    try {
      configureTunnelSocket(socket);
      configureTunnelSocket(upstreamSocket);
      socket.write(responseHead);
      if (upstreamHead.length > 0) socket.write(upstreamHead);
      if (head.length > 0) upstreamSocket.write(head);
      upstreamSocket.pipe(socket);
      socket.pipe(upstreamSocket);
    } catch {
      // La risposta 101 può essere già partita: si chiudono entrambi i lati.
      closeBoth();
    }
  });

  // HA ha risposto senza upgrade (per esempio 404 o 403): la risposta passa e il socket chiude.
  upstreamReq.on('response', (upstreamRes) => {
    clearTimeout(responseTimer);
    if (phase !== 'waiting' || socket.destroyed) {
      upstreamRes.destroy();
      return;
    }

    let responseHead: string;
    try {
      responseHead = formatResponseHead(upstreamRes, (name) => DROPPED_RESPONSE_HEADERS.has(name), [
        'Connection: close',
        // Same isolation as the HTTP answers forwarded from /ha (SR-8, R-2).
        `Content-Security-Policy: ${HOME_ASSISTANT_PROXY_CONTENT_SECURITY_POLICY}`,
        'X-Content-Type-Options: nosniff',
      ]);
    } catch (error) {
      upstreamRes.destroy();
      rejectInvalidResponse(error);
      return;
    }
    phase = 'response';
    socket.write(responseHead);
    pipeline(upstreamRes, socket, () => socket.destroy());
  });

  upstreamReq.on('error', (error) => {
    clearTimeout(responseTimer);
    if (phase === 'waiting') {
      phase = 'closed';
      onUnreachable(error);
      return;
    }
    // Dopo un timeout o una risposta non valida il client ha già la sua risposta, che
    // writeSocketJsonError chiude da sé; il tunnel ha i propri gestori di chiusura.
    if (phase === 'response') socket.destroy();
  });

  upstreamReq.end();
};
