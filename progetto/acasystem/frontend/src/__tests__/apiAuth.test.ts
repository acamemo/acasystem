import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthData } from 'home-assistant-js-websocket';
import { getClientId, getHassUrl } from '@/api/haUrl';
import { loadTokens, saveTokens } from '@/api/oauthStorage';

/**
 * Intestazioni per il backend Acasystem (ADR-0009): solo `Authorization`, mai un indirizzo di
 * Home Assistant; rinnovo con l'Auth di HAWS sull'hassUrl del proxy, senza reindirizzamenti.
 */

type ApiAuth = typeof import('@/api/apiAuth');

const loadApiAuth = async (): Promise<ApiAuth> => {
  vi.resetModules();
  return import('@/api/apiAuth');
};

function sessionTokens(overrides: Partial<AuthData> = {}): AuthData {
  return {
    hassUrl: getHassUrl(),
    clientId: getClientId(),
    access_token: 'stored-token',
    refresh_token: 'refresh-token',
    expires_in: 1800,
    expires: Date.now() + 1_800_000,
    ...overrides,
  };
}

/** The token endpoint of the proxy, as Home Assistant answers a refresh. */
function stubTokenEndpoint(accessToken: string) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    expect(String(input)).toBe(`${getHassUrl()}/auth/token`);
    return new Response(
      JSON.stringify({ access_token: accessToken, token_type: 'Bearer', expires_in: 1800 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getHomeAssistantRequestHeaders', () => {
  it('usa il token della sessione e nessun indirizzo, anche se Tunet ne aveva salvati', async () => {
    localStorage.setItem('ha_auth_method', 'oauth');
    localStorage.setItem('ha_url', 'https://ha.example');
    localStorage.setItem('ha_fallback_url', 'http://192.168.1.20:8123');
    saveTokens(sessionTokens({ access_token: 'oauth-token' }));

    const { getHomeAssistantRequestHeaders, hasHomeAssistantRequestAuth } = await loadApiAuth();
    expect(getHomeAssistantRequestHeaders()).toEqual({ Authorization: 'Bearer oauth-token' });
    expect(hasHomeAssistantRequestAuth()).toBe(true);
  });

  it('con il token a lunga durata usa quello salvato e ignora la sessione', async () => {
    localStorage.setItem('ha_auth_method', 'token');
    sessionStorage.setItem('ha_token', 'kiosk-token');
    saveTokens(sessionTokens({ access_token: 'oauth-token' }));

    const { getHomeAssistantRequestHeaders } = await loadApiAuth();
    expect(getHomeAssistantRequestHeaders()).toEqual({ Authorization: 'Bearer kiosk-token' });
  });

  it('non usa i token ottenuti per un altro indirizzo di Home Assistant', async () => {
    saveTokens(sessionTokens({ hassUrl: 'https://ha.example', access_token: 'old-direct' }));
    const { getHomeAssistantRequestHeaders, hasHomeAssistantRequestAuth } = await loadApiAuth();
    expect(getHomeAssistantRequestHeaders()).toEqual({});
    expect(hasHomeAssistantRequestAuth()).toBe(false);
  });

  it('preferisce il token dell’Auth collegata a quello salvato', async () => {
    saveTokens(sessionTokens({ access_token: 'stale-token' }));
    const { getHomeAssistantRequestHeaders, setOAuthAuthProvider } = await loadApiAuth();
    setOAuthAuthProvider({ current: { accessToken: 'live-token' } });
    expect(getHomeAssistantRequestHeaders()).toEqual({ Authorization: 'Bearer live-token' });
    setOAuthAuthProvider(null);
  });
});

describe('rinnovo del token', () => {
  it('rinnova su richiesta con l’Auth collegata', async () => {
    saveTokens(sessionTokens());
    const refreshAccessToken = vi.fn(async function refresh(this: { accessToken?: string }) {
      this.accessToken = 'refreshed-token';
    });
    const { getValidatedHomeAssistantRequestHeadersAsync, setOAuthAuthProvider } =
      await loadApiAuth();
    setOAuthAuthProvider({ current: { accessToken: 'old-live-token', refreshAccessToken } });

    await expect(
      getValidatedHomeAssistantRequestHeadersAsync({ forceRefreshOAuth: true })
    ).resolves.toEqual({ Authorization: 'Bearer refreshed-token' });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    setOAuthAuthProvider(null);
  });

  it('senza Auth collegata rinnova i token scaduti sul proxy e li salva', async () => {
    saveTokens(sessionTokens({ expires: Date.now() - 1_000 }));
    const fetchMock = stubTokenEndpoint('proxy-refreshed-token');
    const { getValidatedHomeAssistantRequestHeadersAsync } = await loadApiAuth();

    await expect(getValidatedHomeAssistantRequestHeadersAsync()).resolves.toEqual({
      Authorization: 'Bearer proxy-refreshed-token',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loadTokens()).toMatchObject({
      access_token: 'proxy-refreshed-token',
      refresh_token: 'refresh-token',
      hassUrl: getHassUrl(),
    });
  });

  it('se il rinnovo preventivo fallisce continua con il token esistente', async () => {
    saveTokens(sessionTokens({ access_token: 'existing-valid-token', expires: Date.now() - 1 }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    const { getValidatedHomeAssistantRequestHeadersAsync } = await loadApiAuth();
    await expect(getValidatedHomeAssistantRequestHeadersAsync()).resolves.toEqual({
      Authorization: 'Bearer existing-valid-token',
    });
  });

  it('unisce i rinnovi forzati contemporanei', async () => {
    saveTokens(sessionTokens());
    const refreshAccessToken = vi.fn(async function refresh(this: { accessToken?: string }) {
      await Promise.resolve();
      this.accessToken = 'shared-refreshed-token';
    });
    const { getValidatedHomeAssistantRequestHeadersAsync, setOAuthAuthProvider } =
      await loadApiAuth();
    setOAuthAuthProvider({ current: { accessToken: 'stale-live-token', refreshAccessToken } });

    const [first, second] = await Promise.all([
      getValidatedHomeAssistantRequestHeadersAsync({ forceRefreshOAuth: true }),
      getValidatedHomeAssistantRequestHeadersAsync({ forceRefreshOAuth: true }),
    ]);
    expect(first).toEqual({ Authorization: 'Bearer shared-refreshed-token' });
    expect(second).toEqual({ Authorization: 'Bearer shared-refreshed-token' });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    setOAuthAuthProvider(null);
  });
});

describe('accesso mancante o rifiutato', () => {
  it('senza token avvisa l’app e pulisce la sessione', async () => {
    const {
      HOME_ASSISTANT_API_UNAUTHORIZED_EVENT,
      getValidatedHomeAssistantRequestHeadersAsync,
      notifyHomeAssistantApiUnauthorized,
    } = await loadApiAuth();
    const listener = vi.fn();
    window.addEventListener(HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, listener);

    await expect(getValidatedHomeAssistantRequestHeadersAsync()).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).toHaveBeenCalledTimes(1);

    saveTokens(sessionTokens());
    notifyHomeAssistantApiUnauthorized('expired');
    expect(loadTokens()).toBeUndefined();

    localStorage.setItem('ha_auth_method', 'token');
    localStorage.setItem('ha_token', 'kiosk-token');
    notifyHomeAssistantApiUnauthorized('refused');
    expect(localStorage.getItem('ha_token')).toBeNull();
    window.removeEventListener(HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, listener);
  });
});
