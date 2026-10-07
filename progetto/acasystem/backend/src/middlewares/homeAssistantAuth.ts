import type { HomeAssistantUser, HomeAssistantUserLoader } from '../@types/homeAssistant.ts';
import { isSupervisorIngressTrustEnabled, readInternalHomeAssistantUrls } from '../config/env.ts';
import {
  describeError,
  isHomeAssistantReachabilityError,
  isInvalidAuthError,
} from '../helpers/homeAssistantErrors.ts';
import { pushUniqueCandidate } from '../helpers/homeAssistantUrls.ts';
import { resolveValidatedHomeAssistantUser } from '../services/homeAssistantAuthService.ts';
import { sendJsonError } from './errors.ts';
import type { JsonResponse } from './errors.ts';

/**
 * Autenticazione delle API per utente HA. Il browser invia il proprio token
 * (`Authorization: Bearer`); il backend verifica il token soltanto presso gli URL di HA
 * configurati sul server (TUNET_INTERNAL_HA_URL / TUNET_INTERNAL_HA_FALLBACK_URL) e imposta
 * `req.authenticatedHaUser`. Gli URL inviati dal browser (`x-ha-url`, `x-ha-fallback-url`)
 * non sono mai una fonte d'identità: senza URL interni il server rifiuta. Con
 * TUNET_TRUST_SUPERVISOR_INGRESS=1 si fida delle intestazioni dell'ingress del
 * Supervisor provenienti dai suoi indirizzi.
 */

const TRUSTED_INGRESS_IPS: ReadonlySet<string> = new Set(['172.30.32.2', '127.0.0.1', '::1']);

interface RemoteAddressSource {
  remoteAddress?: string | undefined;
}

/** Il minimo di `express.Request` letto dal middleware (sostituibile nei test). */
export interface HomeAssistantAuthRequest {
  ip?: string | undefined;
  socket?: RemoteAddressSource | undefined;
  connection?: RemoteAddressSource | undefined;
  get(name: string): string | string[] | undefined;
  authenticatedHaUser?: HomeAssistantUser | undefined;
  authenticatedHaUrl?: string | null | undefined;
}

export type HomeAssistantAuthMiddleware = (
  req: HomeAssistantAuthRequest,
  res: JsonResponse,
  next: () => void
) => Promise<void>;

const normalizeRemoteAddress = (rawAddress: unknown): string => {
  if (typeof rawAddress !== 'string' || !rawAddress.trim()) return '';
  const trimmed = rawAddress.trim();
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
};

const isTrustedIngressRequest = (req: HomeAssistantAuthRequest): boolean => {
  if (!isSupervisorIngressTrustEnabled()) {
    return false;
  }

  const ingressPath = req.get('x-ingress-path');
  if (typeof ingressPath !== 'string' || !ingressPath.trim()) {
    return false;
  }

  const remoteAddress = normalizeRemoteAddress(
    req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || ''
  );

  return TRUSTED_INGRESS_IPS.has(remoteAddress);
};

const getTrustedSupervisorUser = (req: HomeAssistantAuthRequest): HomeAssistantUser | null => {
  if (!isTrustedIngressRequest(req)) return null;

  const userId = req.get('x-remote-user-id');
  if (typeof userId !== 'string' || !userId.trim()) return null;

  const displayName = req.get('x-remote-user-display-name');
  const userName = req.get('x-remote-user-name');

  return {
    id: userId.trim(),
    name:
      (typeof displayName === 'string' && displayName.trim()) ||
      (typeof userName === 'string' && userName.trim()) ||
      '',
    is_admin: false,
    is_owner: false,
    source: 'supervisor-ingress',
  };
};

/**
 * URL di HA attendibili: TUNET_INTERNAL_HA_URL e TUNET_INTERNAL_HA_FALLBACK_URL, così come
 * sono scritti, senza alternative Docker. Gli URL del client non contano (SEC-1; senza URL
 * interni il server rifiuta, decisione dell'utente del 2026-10-07). Vuoto se non configurati
 * o non validi.
 */
export const getHomeAssistantUrlCandidates = (): string[] => {
  const urls: string[] = [];
  readInternalHomeAssistantUrls().forEach((candidate) => pushUniqueCandidate(urls, candidate));
  return urls;
};

/** Token del header Authorization (`Bearer <token>`), senza espressioni regolari. */
export const getBearerToken = (req: HomeAssistantAuthRequest): string | null => {
  const authHeader = req.get('authorization');
  if (typeof authHeader !== 'string') return null;

  const trimmedHeader = authHeader.trim();
  if (trimmedHeader.length <= 7 || !trimmedHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = trimmedHeader.slice(7).trim();
  return token || null;
};

const sendValidationFailure = (res: JsonResponse, error: unknown, haUrls: string[]): void => {
  const description = describeError(error);
  const urlSummary = haUrls.length ? ` (tried: ${haUrls.join(', ')})` : '';

  if (isInvalidAuthError(error)) {
    console.warn(`[haAuth] HA rejected token${urlSummary}: ${description}`);
    sendJsonError(
      res,
      401,
      `Home Assistant authentication failed: ${description}`,
      'HA_AUTH_INVALID'
    );
    return;
  }

  if (isHomeAssistantReachabilityError(error)) {
    console.warn(`[haAuth] Cannot reach HA${urlSummary}: ${description}`);
    sendJsonError(
      res,
      503,
      'Tunet backend could not reach Home Assistant while validating the current user.',
      'HA_VALIDATION_UNREACHABLE'
    );
    return;
  }

  console.warn(`[haAuth] HA validation failed${urlSummary}: ${description}`);
  sendJsonError(
    res,
    503,
    'Tunet backend could not validate the current Home Assistant session.',
    'HA_VALIDATION_FAILED'
  );
};

export interface HomeAssistantAuthOptions {
  validateHomeAssistantUser?: HomeAssistantUserLoader;
}

export const createHomeAssistantAuthMiddleware = ({
  validateHomeAssistantUser = resolveValidatedHomeAssistantUser,
}: HomeAssistantAuthOptions = {}): HomeAssistantAuthMiddleware => {
  return async (req, res, next) => {
    const trustedSupervisorUser = getTrustedSupervisorUser(req);
    if (trustedSupervisorUser) {
      req.authenticatedHaUser = trustedSupervisorUser;
      req.authenticatedHaUrl = null;
      next();
      return;
    }

    const haUrls = getHomeAssistantUrlCandidates();
    if (!haUrls.length) {
      // Nessun HA configurato sul server: mai ripiegare sugli URL del client.
      console.warn('[haAuth] TUNET_INTERNAL_HA_URL / _FALLBACK_URL missing or not valid http(s) URLs');
      sendJsonError(
        res,
        503,
        'Acasystem backend has no Home Assistant URL configured (TUNET_INTERNAL_HA_URL).',
        'HA_URL_NOT_CONFIGURED'
      );
      return;
    }

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      sendJsonError(res, 401, 'Missing Authorization bearer token');
      return;
    }

    let lastError: unknown = null;

    for (const haUrl of haUrls) {
      try {
        const user = await validateHomeAssistantUser({ haUrl, accessToken });
        req.authenticatedHaUser = user;
        req.authenticatedHaUrl = haUrl;
        next();
        return;
      } catch (error) {
        // L'HA configurato che rifiuta il token chiude la verifica; un errore di rete passa
        // all'URL di riserva.
        if (isInvalidAuthError(error)) {
          sendValidationFailure(res, error, [haUrl]);
          return;
        }
        lastError = error;
      }
    }

    sendValidationFailure(res, lastError, haUrls);
  };
};
