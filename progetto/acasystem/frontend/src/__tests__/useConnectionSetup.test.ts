import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthData } from 'home-assistant-js-websocket';
import type { HomeAssistantConfig } from '@/@types/dashboard';
import { getClientId, getHassUrl } from '@/api/haUrl';
import { loadTokens, saveTokens } from '@/api/oauthStorage';
import { ConnectPageControlProvider, type ConnectPageControl } from '@/hooks/context/ConfigContext';
import { useConnectionSetup } from '@/hooks/useConnectionSetup';

/**
 * Accesso attraverso Acasystem (ADR-0009): sessione accettata, token a lunga durata, uscita con
 * revoca del token di rinnovo sul proxy e apertura della pagina di accesso.
 */

const OAUTH_SLOT = 'tunet_auth_cache_v1';

function sessionTokens(refreshToken: string, accessToken = `accesso-${refreshToken}`): AuthData {
  return {
    hassUrl: getHassUrl(),
    clientId: getClientId(),
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 1800,
    expires: Date.now() + 1_800_000,
  };
}

const baseConfig = (overrides: Partial<HomeAssistantConfig> = {}): HomeAssistantConfig => ({
  url: getHassUrl(),
  fallbackUrl: '',
  token: '',
  authMethod: 'oauth',
  ...overrides,
});

interface RevokeCall {
  url: string;
  token: string;
}

/** The revoke endpoint of the proxy; `fail` simulates Home Assistant out of reach. */
function stubRevoke({ fail = false } = {}) {
  const calls: RevokeCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const body = init.body instanceof FormData ? String(init.body.get('token')) : '';
      calls.push({ url: String(input), token: body });
      if (fail) throw new TypeError('Failed to fetch');
      return new Response('{}', { status: 200 });
    })
  );
  return calls;
}

function renderSetup(config: HomeAssistantConfig, control: ConnectPageControl | null = null) {
  const setConfig = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) =>
    control ? createElement(ConnectPageControlProvider, { value: control }, children) : children;
  const view = renderHook(() => useConnectionSetup({ config, setConfig }), { wrapper });
  return { ...view, setConfig };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useConnectionSetup', () => {
  it('espone il metodo in uso e, fuori dall’app, nessun comando per la pagina di accesso', () => {
    expect(renderSetup(baseConfig()).result.current).toMatchObject({
      method: 'oauth',
      openLogin: null,
      cancelLogin: null,
    });
    expect(renderSetup(baseConfig({ authMethod: 'token', token: 't' })).result.current.method).toBe(
      'token'
    );
  });

  it('usa i comandi della pagina di accesso forniti dall’app', () => {
    const control = { open: vi.fn(), cancel: vi.fn() };
    const { result } = renderSetup(baseConfig(), control);
    result.current.openLogin?.();
    result.current.cancelLogin?.();
    expect(control.open).toHaveBeenCalledOnce();
    expect(control.cancel).toHaveBeenCalledOnce();
  });
});

describe('acceptSession', () => {
  it('salva la sessione, dimentica il token del kiosk e revoca la sessione precedente', async () => {
    const revokes = stubRevoke();
    saveTokens(sessionTokens('rinnovo-installatore'));
    localStorage.setItem('ha_token', 'token-kiosk');
    localStorage.setItem('ha_auth_method', 'token');
    const { result, setConfig } = renderSetup(
      baseConfig({ authMethod: 'token', token: 'token-kiosk' })
    );

    await act(async () => {
      result.current.acceptSession(sessionTokens('rinnovo-cliente'));
    });

    expect(loadTokens()).toMatchObject({ refresh_token: 'rinnovo-cliente' });
    expect(localStorage.getItem('ha_auth_method')).toBe('oauth');
    expect(localStorage.getItem('ha_token')).toBeNull();
    expect(setConfig).toHaveBeenCalledWith(baseConfig());
    expect(revokes).toEqual([
      { url: `${getHassUrl()}/auth/revoke`, token: 'rinnovo-installatore' },
    ]);
  });

  it('non revoca la sessione appena ottenuta', async () => {
    const revokes = stubRevoke();
    saveTokens(sessionTokens('rinnovo-1'));
    const { result } = renderSetup(baseConfig());
    await act(async () => {
      result.current.acceptSession(sessionTokens('rinnovo-1', 'accesso-nuovo'));
    });
    expect(revokes).toEqual([]);
  });
});

describe('acceptToken', () => {
  it('salva il token del kiosk e chiude la sessione precedente', async () => {
    const revokes = stubRevoke();
    saveTokens(sessionTokens('rinnovo-installatore'));
    const { result, setConfig } = renderSetup(baseConfig());

    await act(async () => {
      result.current.acceptToken('token-cliente');
    });

    expect(localStorage.getItem(OAUTH_SLOT)).toBeNull();
    expect(sessionStorage.getItem(OAUTH_SLOT)).toBeNull();
    expect(localStorage.getItem('ha_token')).toBe('token-cliente');
    expect(localStorage.getItem('ha_auth_method')).toBe('token');
    expect(setConfig).toHaveBeenCalledWith(
      baseConfig({ authMethod: 'token', token: 'token-cliente' })
    );
    expect(revokes).toEqual([
      { url: `${getHassUrl()}/auth/revoke`, token: 'rinnovo-installatore' },
    ]);
  });
});

describe('logout', () => {
  it('revoca il token di rinnovo, pulisce i token e apre la pagina di accesso', async () => {
    const revokes = stubRevoke();
    saveTokens(sessionTokens('rinnovo-1'));
    localStorage.setItem('ha_auth_method', 'oauth');
    const control = { open: vi.fn(), cancel: null };
    const { result, setConfig } = renderSetup(baseConfig(), control);

    await act(async () => {
      await result.current.logout();
    });

    expect(revokes).toEqual([{ url: `${getHassUrl()}/auth/revoke`, token: 'rinnovo-1' }]);
    expect(localStorage.getItem(OAUTH_SLOT)).toBeNull();
    expect(sessionStorage.getItem(OAUTH_SLOT)).toBeNull();
    expect(localStorage.getItem('ha_auth_method')).toBeNull();
    expect(setConfig).toHaveBeenCalledWith(baseConfig());
    expect(control.open).toHaveBeenCalledOnce();
  });

  it('esce anche se Home Assistant non risponde alla revoca', async () => {
    stubRevoke({ fail: true });
    saveTokens(sessionTokens('rinnovo-1'));
    const control = { open: vi.fn(), cancel: null };
    const { result } = renderSetup(baseConfig(), control);
    await act(async () => {
      await expect(result.current.logout()).resolves.toBeUndefined();
    });
    expect(loadTokens()).toBeUndefined();
    expect(control.open).toHaveBeenCalledOnce();
  });

  it('con il token a lunga durata lo dimentica senza chiamare la revoca', async () => {
    const revokes = stubRevoke();
    localStorage.setItem('ha_auth_method', 'token');
    localStorage.setItem('ha_token', 'token-kiosk');
    sessionStorage.setItem('ha_token', 'token-kiosk');
    const { result, setConfig } = renderSetup(
      baseConfig({ authMethod: 'token', token: 'token-kiosk' })
    );
    await act(async () => {
      await result.current.logout();
    });
    expect(revokes).toEqual([]);
    expect(localStorage.getItem('ha_token')).toBeNull();
    expect(sessionStorage.getItem('ha_token')).toBeNull();
    expect(setConfig).toHaveBeenCalledWith(baseConfig());
  });
});
