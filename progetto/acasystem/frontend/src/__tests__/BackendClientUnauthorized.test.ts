import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthData } from 'home-assistant-js-websocket';
import { backendRequest } from '@/api/backendClient';
import { loadTokens, saveTokens } from '@/api/oauthStorage';
import { getClientId, getHassUrl } from '@/api/haUrl';
import { HOME_ASSISTANT_API_UNAUTHORIZED_EVENT } from '@/api/apiAuth';
import { bindOwnerAppearance, readOwnerAppearance, rememberOwnerAppearance } from '@/api/ownerAppearance';

const tokens = (): AuthData => ({ hassUrl: getHassUrl(), clientId: getClientId(),
  access_token: 'current-access', refresh_token: 'current-refresh', expires_in: 1800,
  expires: Date.now() + 1_800_000 });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('401 per credenziali transitorie isolate', () => {
  it('un bind del primo account rifiutato conserva l’accesso globale e il colore da riprovare', async () => {
    localStorage.setItem('ha_auth_method', 'oauth'); saveTokens(tokens());
    const before = JSON.stringify(loadTokens());
    rememberOwnerAppearance('owner', '#123abc');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(bindOwnerAppearance({ ...tokens(), access_token: 'unaccepted-login' }, 'owner')).rejects.toMatchObject({ status: 401 });
    expect(JSON.stringify(loadTokens())).toBe(before);
    expect(readOwnerAppearance()).toMatchObject({ username: 'owner', color: '#123abc' });
  });
  it('non rinnova né cancella l’accesso globale se è rifiutato un token catturato precedente', async () => {
    localStorage.setItem('ha_auth_method', 'oauth');
    saveTokens(tokens());
    const before = JSON.stringify(loadTokens());
    const listener = vi.fn();
    window.addEventListener(HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, listener);
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'HA_SESSION_INVALID', error: 'Accesso rifiutato' }), { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    try {
      await expect(backendRequest('/v2/bootstrap', {}, { authHeadersOverride: { Authorization: 'Bearer old-transient' }, notifyOnUnauthorized: false }))
        .rejects.toMatchObject({ status: 401 });
      expect(fetcher).toHaveBeenCalledOnce();
      expect(JSON.stringify(loadTokens())).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    } finally { window.removeEventListener(HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, listener); }
  });
  it('mantiene la notifica e la rimozione globali per le chiamate normali', async () => {
    localStorage.setItem('ha_auth_method', 'oauth'); saveTokens(tokens());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(backendRequest('/v2/bootstrap', {}, { retryOnOAuthUnauthorized: false })).rejects.toMatchObject({ status: 401 });
    expect(loadTokens()).toBeUndefined();
  });
});
