import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ApiErrorBody } from '../@types/http.ts';
import { readHomeAssistantProxyResponseTimeoutMs } from '../config/env.ts';
import { HOME_ASSISTANT_LOGIN_FLOW_BODY_LIMIT_BYTES } from '../config/homeAssistantProxy.ts';
import { describeError } from '../helpers/homeAssistantErrors.ts';
import {
  isHomeAssistantProxyUrl,
  matchHomeAssistantProxyRequest,
  matchHomeAssistantWebSocketRequest,
} from '../helpers/homeAssistantProxyPaths.ts';
import { sendJsonError } from '../middlewares/errors.ts';
import { removeIngressPrefix } from '../middlewares/ingressPath.ts';
import {
  createHomeAssistantLoginRateLimiter,
  createHomeAssistantWebSocketRateLimiter,
} from '../middlewares/rateLimit.ts';
import {
  forwardHttpRequest,
  isPasswordLoginFlowStart,
  openWebSocketTunnel,
  readLimitedRequestBody,
  resolveHomeAssistantProxyBaseUrl,
  writeSocketJsonError,
} from '../services/homeAssistantProxyService.ts';

/**
 * Proxy `/ha` verso Home Assistant (ADR-0009). Va montato prima di express.json, così i
 * corpi delle richieste passano a HA senza essere letti; fa eccezione l'avvio del flusso
 * di accesso, letto e controllato qui. Rispetta il prefisso dell'ingress del Supervisor
 * come stripIngressPath. Nei log non finiscono URL, query né corpi.
 */

const NOT_ALLOWED: ApiErrorBody = {
  error: 'Percorso di Home Assistant non disponibile attraverso Acasystem.',
  code: 'HA_PATH_NOT_ALLOWED',
};

const NOT_CONFIGURED: ApiErrorBody = {
  error: 'Home Assistant non è configurato sul server Acasystem (TUNET_INTERNAL_HA_URL).',
  code: 'HA_URL_NOT_CONFIGURED',
};

const UNREACHABLE: ApiErrorBody = {
  error: 'Home Assistant non risponde.',
  code: 'HA_UNREACHABLE',
};

const TIMEOUT: ApiErrorBody = {
  error: 'Home Assistant non ha risposto in tempo.',
  code: 'HA_TIMEOUT',
};

const LOGIN_BODY_TOO_LARGE: ApiErrorBody = {
  error: 'Richiesta di accesso troppo grande.',
  code: 'HA_LOGIN_BODY_TOO_LARGE',
};

const LOGIN_BODY_TIMEOUT: ApiErrorBody = {
  error: 'Richiesta di accesso incompleta.',
  code: 'HA_LOGIN_BODY_TIMEOUT',
};

const WEBSOCKET_RATE_LIMITED: ApiErrorBody = {
  error: 'Troppi collegamenti a Home Assistant. Riprova tra qualche minuto.',
  code: 'HA_WEBSOCKET_RATE_LIMITED',
};

const sendBody = (res: Response, statusCode: number, body: ApiErrorBody): void => {
  sendJsonError(res, statusCode, body.error, body.code);
};

const logUnreachable = (error: unknown): void => {
  console.warn(`[haProxy] Home Assistant non raggiungibile: ${describeError(error)}`);
};

const logTimeout = (timeoutMs: number): void => {
  console.warn(`[haProxy] Home Assistant non ha risposto entro ${timeoutMs} ms`);
};

/** Gestore HTTP del proxy: lista consentita, limite ai tentativi di accesso, inoltro. */
export const createHomeAssistantProxyRouter = (): RequestHandler => {
  const loginRateLimiter = createHomeAssistantLoginRateLimiter();
  const responseTimeoutMs = readHomeAssistantProxyResponseTimeoutMs();

  return (req: Request, res: Response, next: NextFunction): void => {
    const url = removeIngressPrefix(req.url, req.headers['x-ingress-path']);
    if (!isHomeAssistantProxyUrl(url)) {
      next();
      return;
    }

    const match = matchHomeAssistantProxyRequest(req.method, url);
    if (!match.allowed) {
      sendBody(res, 404, NOT_ALLOWED);
      return;
    }

    const forward = (bufferedBody?: { bytes: Buffer; contentType: string }): void => {
      const baseUrl = resolveHomeAssistantProxyBaseUrl();
      if (!baseUrl) {
        sendBody(res, 503, NOT_CONFIGURED);
        return;
      }
      forwardHttpRequest(req, res, {
        baseUrl,
        target: match,
        responseTimeoutMs,
        bufferedBody,
        onUnreachable: (error) => {
          logUnreachable(error);
          sendBody(res, 502, UNREACHABLE);
        },
        onTimeout: () => {
          logTimeout(responseTimeoutMs);
          res.setHeader('Connection', 'close');
          sendBody(res, 504, TIMEOUT);
        },
      });
    };

    // Avvio del flusso di accesso (SR-1): passa solo il provider utente e password, con
    // il corpo letto (al massimo 4 KB) e inviato a HA come JSON con la sua lunghezza.
    const forwardLoginFlowStart = async (): Promise<void> => {
      const body = await readLimitedRequestBody(req, HOME_ASSISTANT_LOGIN_FLOW_BODY_LIMIT_BYTES);
      if (body.status === 'aborted') {
        res.destroy();
        return;
      }
      if (body.status === 'too-large') {
        res.setHeader('Connection', 'close');
        sendBody(res, 413, LOGIN_BODY_TOO_LARGE);
        return;
      }
      if (body.status === 'timeout') {
        res.setHeader('Connection', 'close');
        sendBody(res, 408, LOGIN_BODY_TIMEOUT);
        return;
      }
      if (!isPasswordLoginFlowStart(body.bytes)) {
        sendBody(res, 404, NOT_ALLOWED);
        return;
      }
      forward({ bytes: body.bytes, contentType: 'application/json' });
    };

    const proceed = (): void => {
      // Un errore imprevisto dopo la lettura del corpo va al gestore di Express, non al processo.
      if (match.route.loginFlowStart) forwardLoginFlowStart().catch(next);
      else forward();
    };

    if (match.route.loginAttempt) {
      void loginRateLimiter(req, res, (error?: unknown) => {
        if (error) next(error);
        else proceed();
      });
      return;
    }
    proceed();
  };
};

const isWebSocketUpgrade = (req: IncomingMessage): boolean =>
  String(req.headers.upgrade ?? '').toLowerCase() === 'websocket';

/**
 * Gestore dell'evento `upgrade` del server HTTP: solo `GET /ha/api/websocket` diventa un
 * tunnel verso HA, entro il limite per indirizzo del client; ogni altro upgrade riceve
 * 404 e il socket viene chiuso.
 *
 * Comportamento accettato (SR-5): Node passa a questo gestore ogni richiesta con
 * un'intestazione Upgrade, su qualsiasi percorso. Una richiesta normale con
 * `Upgrade: h2c` (per esempio `curl --http2` su http://, mai un browser) riceve quindi
 * 404 anche su /api/health o sulle pagine dell'app, invece della risposta di Express.
 * Evitarlo richiederebbe `shouldUpgradeCallback` di http.createServer, che secondo la
 * revisione non è utilizzabile su tutte le versioni di Node ammesse da engines (>=22.18).
 */
export const createHomeAssistantUpgradeHandler = () => {
  const upgradeRateLimiter = createHomeAssistantWebSocketRateLimiter();
  const responseTimeoutMs = readHomeAssistantProxyResponseTimeoutMs();

  const handleUpgrade = async (req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> => {
    const url = removeIngressPrefix(req.url ?? '/', req.headers['x-ingress-path']);
    const target = matchHomeAssistantWebSocketRequest(req.method, url);
    if (!target || !isWebSocketUpgrade(req)) {
      writeSocketJsonError(socket, 404, NOT_ALLOWED);
      return;
    }

    const { limited, retryAfterSeconds } = await upgradeRateLimiter(req);
    if (socket.destroyed) return;
    if (limited) {
      writeSocketJsonError(socket, 429, WEBSOCKET_RATE_LIMITED, [`Retry-After: ${retryAfterSeconds}`]);
      return;
    }

    const baseUrl = resolveHomeAssistantProxyBaseUrl();
    if (!baseUrl) {
      writeSocketJsonError(socket, 503, NOT_CONFIGURED);
      return;
    }

    openWebSocketTunnel(req, socket, head, {
      baseUrl,
      target,
      responseTimeoutMs,
      onUnreachable: (error) => {
        logUnreachable(error);
        writeSocketJsonError(socket, 502, UNREACHABLE);
      },
      onTimeout: () => {
        logTimeout(responseTimeoutMs);
        writeSocketJsonError(socket, 504, TIMEOUT);
      },
    });
  };

  return (req: IncomingMessage, socket: Duplex, head: Buffer): void => {
    // Un errore del socket prima del tunnel non deve diventare un'eccezione non gestita.
    socket.on('error', () => {});
    // Un errore imprevisto prima che parta la risposta diventa un 502, mai un'eccezione.
    handleUpgrade(req, socket, head).catch((error: unknown) => {
      logUnreachable(error);
      writeSocketJsonError(socket, 502, UNREACHABLE);
    });
  };
};

/** Collega il WebSocket del proxy al server HTTP restituito da `app.listen`. */
export const attachHomeAssistantWebSocketProxy = (server: Server): void => {
  server.on('upgrade', createHomeAssistantUpgradeHandler());
};
