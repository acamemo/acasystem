/**
 * Frontend API client for the Acasystem backend (ex Tunet).
 * All calls go to /api/* which Vite proxies to the backend in dev mode,
 * and Express serves directly in production.
 * The bearer token and ephemeral profile-usage proof are sent: the backend validates the token against the Home Assistant configured
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
import { notifyProfileUsageFailure, profileUsageHeaders } from './usageProof';

const API_BASE = './api';

export type BackendRequestInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

interface RequestControl {
  retryOnOAuthUnauthorized?: boolean;
  /** Captured/transient credentials must not revoke an unrelated currently active access. */
  notifyOnUnauthorized?: boolean;
  authHeadersOverride?: HomeAssistantRequestHeaders | null;
}

/**
 * Demo mode (`#/mockup`, REP-20261028-005): while an override is set, every call of the backend
 * is answered by it inside the browser, with no request and no credentials. It is set only by the
 * demo page and cleared when the page is left; the normal app never sets it.
 */
export interface BackendOverrideRequest {
  method: string;
  /** Path after `./api`, query string included. */
  path: string;
  body: string | null;
}
export interface BackendOverrideResponse {
  status: number;
  body: unknown;
  /** An image answer (the logos); none in the demo. */
  blob?: Blob;
}
export type BackendOverride = (request: BackendOverrideRequest) => Promise<BackendOverrideResponse>;

let backendOverride: BackendOverride | null = null;

export function setBackendOverride(next: BackendOverride | null): void {
  backendOverride = next;
}

export const getBackendOverride = (): BackendOverride | null => backendOverride;

const createApiError = (message: string, status: number, body: UnknownRecord): ApiError =>
  Object.assign(new Error(message), { status, body });

/** Richiesta autenticata al backend; risolve con il JSON della risposta (non validato). */
export async function backendRequest(
  path: string,
  options: BackendRequestInit = {},
  { retryOnOAuthUnauthorized = true, notifyOnUnauthorized = true, authHeadersOverride = null }: RequestControl = {}
): Promise<unknown> {
  if (backendOverride) {
    const answer = await backendOverride({
      method: options.method ?? 'GET',
      path,
      body: typeof options.body === 'string' ? options.body : null,
    });
    if (answer.status >= 200 && answer.status < 300) return answer.body;
    const failure: UnknownRecord = isObject(answer.body) ? answer.body : {};
    throw createApiError(
      String(failure.error || `API error ${answer.status}`),
      answer.status,
      failure
    );
  }
  const authHeaders = authHeadersOverride ?? (await getValidatedHomeAssistantRequestHeadersAsync());
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...profileUsageHeaders(),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  if (!res.ok) {
    const parsedBody: unknown = await res.json().catch(() => ({}));
    const body: UnknownRecord = isObject(parsedBody) ? parsedBody : {};
    notifyProfileUsageFailure(body, mergedHeaders['x-aca-usage-lease']);
    if (
      res.status === 401 &&
      body.code !== 'CLIENT_REVOKED' &&
      retryOnOAuthUnauthorized &&
      notifyOnUnauthorized &&
      getStoredAuthMethod() === 'oauth'
    ) {
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
          notifyOnUnauthorized,
          authHeadersOverride: retryHeaders,
        }
      );
    }

    if (res.status === 401 && notifyOnUnauthorized) {
      throw notifyHomeAssistantApiUnauthorized(
        String(body.error || 'Home Assistant authentication failed')
      );
    }
    throw createApiError(String(body.error || `API error ${res.status}`), res.status, body);
  }

  return res.json();
}
