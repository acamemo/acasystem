/**
 * Frontend API client for the Acasystem backend (ex Tunet).
 * All calls go to /api/* which Vite proxies to the backend in dev mode,
 * and Express serves directly in production.
 * Only the bearer token is sent: the backend validates it against the Home Assistant configured
 * on the server (SEC-1), so no Home Assistant address (`x-ha-url`) leaves the browser (ADR-0009).
 */

import type { ApiError } from '@/@types/api';
import {
  getStoredAuthMethod,
  getValidatedHomeAssistantRequestHeadersAsync,
  notifyHomeAssistantApiUnauthorized,
  type HomeAssistantRequestHeaders,
} from '@/api/apiAuth';
import { isObject, type UnknownRecord } from '@/validators/guards';

const API_BASE = './api';

export type BackendRequestInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

interface RequestControl {
  retryOnOAuthUnauthorized?: boolean;
  authHeadersOverride?: HomeAssistantRequestHeaders | null;
}

const createApiError = (message: string, status: number, body: UnknownRecord): ApiError =>
  Object.assign(new Error(message), { status, body });

/** Richiesta autenticata al backend; risolve con il JSON della risposta (non validato). */
export async function backendRequest(
  path: string,
  options: BackendRequestInit = {},
  { retryOnOAuthUnauthorized = true, authHeadersOverride = null }: RequestControl = {}
): Promise<unknown> {
  const authHeaders = authHeadersOverride ?? (await getValidatedHomeAssistantRequestHeadersAsync());
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  if (!res.ok) {
    if (res.status === 401 && retryOnOAuthUnauthorized && getStoredAuthMethod() === 'oauth') {
      const retryHeaders = await getValidatedHomeAssistantRequestHeadersAsync({
        forceRefreshOAuth: true,
      });
      return backendRequest(
        path,
        {
          ...options,
        },
        {
          retryOnOAuthUnauthorized: false,
          authHeadersOverride: retryHeaders,
        }
      );
    }

    const parsedBody: unknown = await res.json().catch(() => ({}));
    const body: UnknownRecord = isObject(parsedBody) ? parsedBody : {};
    if (res.status === 401) {
      throw notifyHomeAssistantApiUnauthorized(
        String(body.error || 'Home Assistant authentication failed')
      );
    }
    throw createApiError(String(body.error || `API error ${res.status}`), res.status, body);
  }

  return res.json();
}
