import type { IncomingMessage } from 'node:http';
import rateLimit, { ipKeyGenerator, MemoryStore } from 'express-rate-limit';
import type { Options, RateLimitRequestHandler } from 'express-rate-limit';
import { readRateLimitSettings } from '../config/env.ts';
import { sendJsonError } from './errors.ts';

/**
 * Limiti di frequenza per IP (memoria del processo, intestazioni RateLimit standard).
 * Finestra e massimo da `<PREFISSO>_WINDOW_MS` e `<PREFISSO>_MAX`, letti alla creazione.
 */

const createRateLimiter = (
  prefix: string,
  defaultMax: number,
  options: Partial<Options> = {}
): RateLimitRequestHandler => {
  const { windowMs, max } = readRateLimitSettings(prefix, defaultMax);
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
};

/** Tutte le richieste /api: API_RATE_LIMIT_*, predefinito 300 al minuto. */
export const createApiRateLimiter = (): RateLimitRequestHandler =>
  createRateLimiter('API_RATE_LIMIT', 300);

/** Ripiego degli asset con hash: ASSET_FALLBACK_RATE_LIMIT_*, predefinito 120 al minuto. */
export const createAssetFallbackRateLimiter = (): RateLimitRequestHandler =>
  createRateLimiter('ASSET_FALLBACK_RATE_LIMIT', 120);

/** /api/profiles: PROFILES_RATE_LIMIT_*, predefinito 120 al minuto. */
export const createProfilesRateLimiter = (): RateLimitRequestHandler =>
  createRateLimiter('PROFILES_RATE_LIMIT', 120);

/** /api/settings: SETTINGS_RATE_LIMIT_*, predefinito 180 al minuto. */
export const createSettingsRateLimiter = (): RateLimitRequestHandler =>
  createRateLimiter('SETTINGS_RATE_LIMIT', 180);

/** /api/casa3d: CASA3D_RATE_LIMIT_*, predefinito 120 al minuto. */
export const createCasa3dRateLimiter = (): RateLimitRequestHandler =>
  createRateLimiter('CASA3D_RATE_LIMIT', 120, {
    // Pictures have their own limit: a backup moves them one by one (up to 200) and must not lose any.
    skip: (req) => req.path.startsWith('/images/'),
  });

/** Immagini di /api/casa3d: CASA3D_IMAGE_RATE_LIMIT_*, predefinito 600 al minuto. */
export const createCasa3dImageRateLimiter = (): RateLimitRequestHandler =>
  createRateLimiter('CASA3D_IMAGE_RATE_LIMIT', 600);

/**
 * Tentativi di accesso inoltrati a HA (POST /ha/auth/login_flow e /ha/auth/login_flow/<id>):
 * HA_LOGIN_RATE_LIMIT_*, predefinito 10 al minuto per indirizzo del client. HA vede solo
 * l'indirizzo del server Acasystem, quindi il limite per client lo applica il proxy.
 */
export const createHomeAssistantLoginRateLimiter = (): RateLimitRequestHandler =>
  createRateLimiter('HA_LOGIN_RATE_LIMIT', 10, {
    handler: (_req, res) => {
      sendJsonError(
        res,
        429,
        'Troppi tentativi di accesso. Riprova tra qualche minuto.',
        'HA_LOGIN_RATE_LIMITED'
      );
    },
  });

export interface UpgradeRateLimitResult {
  limited: boolean;
  /** Secondi alla fine della finestra corrente, per Retry-After. */
  retryAfterSeconds: number;
}

/**
 * Upgrade WebSocket verso HA (GET /ha/api/websocket): HA_WEBSOCKET_RATE_LIMIT_*,
 * predefinito 30 al minuto per indirizzo del client. Un upgrade non passa da Express,
 * quindi si usano direttamente lo store in memoria e la chiave per IP di express-rate-limit,
 * come negli altri limiti (indirizzo del socket, senza trust proxy).
 */
export const createHomeAssistantWebSocketRateLimiter = (): ((
  req: IncomingMessage
) => Promise<UpgradeRateLimitResult>) => {
  const { windowMs, max } = readRateLimitSettings('HA_WEBSOCKET_RATE_LIMIT', 30);
  const store = new MemoryStore();
  // MemoryStore legge soltanto windowMs dalle opzioni.
  store.init({ windowMs } as Options);

  return async (req) => {
    const { totalHits, resetTime } = await store.increment(
      ipKeyGenerator(req.socket.remoteAddress ?? '')
    );
    const msLeft = resetTime ? resetTime.getTime() - Date.now() : windowMs;
    return {
      limited: totalHits > max,
      retryAfterSeconds: Math.max(Math.ceil(msLeft / 1000), 1),
    };
  };
};
