import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHassUrl } from '@/api/haUrl';
import { ConfigProvider, useConfig } from '@/hooks/context/ConfigContext';
import { AppRoutes } from '@/routes/AppRoutes';

vi.mock('@/pages/launcher/LauncherPage', () => ({
  LauncherPage: ({ overlay }: { overlay?: ReactNode }) => (
    <div data-testid="launcher">{overlay}</div>
  ),
}));
vi.mock('@/pages/system', () => ({ SystemPage: () => <p>Pagina Sistema</p> }));
vi.mock('@/pages/connect', () => ({ ConnectPage: () => <p>Collegamento</p> }));

function routesAt(path: string, showConnect = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes showConnect={showConnect} onConnected={() => undefined} />
    </MemoryRouter>
  );
}

describe('app routes (shell)', () => {
  it('draws Sistema as the overlay of the launcher, inside its provider', () => {
    routesAt('/sistema');
    expect(screen.getByTestId('launcher')).toContainElement(screen.getByText('Pagina Sistema'));
  });

  it('shows the launcher alone on the other routes', () => {
    routesAt('/page/home');
    expect(screen.getByTestId('launcher')).toBeEmptyDOMElement();
    expect(screen.queryByText('Pagina Sistema')).not.toBeInTheDocument();
  });

  it('shows only the connection page before Home Assistant is configured', () => {
    routesAt('/sistema', true);
    expect(screen.getByText('Collegamento')).toBeInTheDocument();
    expect(screen.queryByTestId('launcher')).not.toBeInTheDocument();
  });
});

function ConfigProbe() {
  const value = useConfig();
  return <pre data-testid="config">{JSON.stringify(value)}</pre>;
}

const readProbe = () =>
  JSON.parse(screen.getByTestId('config').textContent ?? '{}') as Record<string, unknown>;

describe('configuration (shell, ADR-0007)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    document.documentElement.removeAttribute('style');
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('has the fixed appearance and only the access, ignoring the old appearance keys', () => {
    localStorage.setItem('tunet_theme', 'light');
    localStorage.setItem('tunet_language', 'en');
    localStorage.setItem('tunet_units_mode', 'imperial');
    localStorage.setItem('tunet_settings_lock_enabled', '1');
    localStorage.setItem('tunet_bg_mode', 'gradient');
    localStorage.setItem('ha_url', 'http://ha.local:8123');
    localStorage.setItem('ha_auth_method', 'token');
    localStorage.setItem('ha_token', 'token-di-prova');

    render(
      <ConfigProvider>
        <ConfigProbe />
      </ConfigProvider>
    );

    expect(readProbe()).toEqual({
      theme: 'acasystem',
      language: 'it',
      unitsMode: 'follow_ha',
      font: 'Inter',
      config: {
        // Home Assistant behind Acasystem (ADR-0009): the saved address is not used.
        url: getHassUrl(),
        fallbackUrl: '',
        token: 'token-di-prova',
        authMethod: 'token',
      },
    });
    // Nothing is applied to the page and the saved preferences stay untouched.
    expect(document.documentElement.getAttribute('style')).toBeNull();
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem('tunet_theme')).toBe('light');
    expect(localStorage.getItem('tunet_language')).toBe('en');
    expect(localStorage.getItem('tunet_settings_lock_enabled')).toBe('1');
    expect(localStorage.getItem('tunet_bg_mode')).toBe('gradient');
  });

  it('removes the Home Assistant addresses saved by Tunet and the tokens obtained for them', async () => {
    // Fake Home Assistant: the old tokens are revoked where they were issued (SR-6).
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}')
    );
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('ha_url', 'http://ha.local:8123');
    localStorage.setItem('ha_fallback_url', 'https://casa.duckdns.org');
    localStorage.setItem(
      'tunet_auth_cache_v1',
      JSON.stringify({
        hassUrl: 'http://ha.local:8123',
        clientId: 'http://localhost:3000/',
        access_token: 'diretto',
        refresh_token: 'diretto-rinnovo',
        expires: Date.now() + 60_000,
        expires_in: 60,
      })
    );
    render(
      <ConfigProvider>
        <ConfigProbe />
      </ConfigProvider>
    );
    expect(readProbe().config).toEqual({
      url: getHassUrl(),
      fallbackUrl: '',
      token: '',
      authMethod: 'oauth',
    });
    expect(localStorage.getItem('ha_url')).toBeNull();
    expect(localStorage.getItem('ha_fallback_url')).toBeNull();
    expect(localStorage.getItem('tunet_auth_cache_v1')).toBeNull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://ha.local:8123/auth/revoke');
    expect(init?.method).toBe('POST');
    expect(init?.body instanceof FormData && init.body.get('token')).toBe('diretto-rinnovo');
  });

  it('ignores an OAuth redirect callback: the login is the Acasystem page', () => {
    localStorage.setItem('ha_auth_method', 'token');
    localStorage.setItem('ha_token', 'token-di-prova');
    window.history.replaceState(null, '', '/?auth_callback=1&code=test&state=x');
    render(
      <ConfigProvider>
        <ConfigProbe />
      </ConfigProvider>
    );
    expect(readProbe().config).toMatchObject({ authMethod: 'token', token: 'token-di-prova' });
    window.history.replaceState(null, '', '/');
  });

  it('moves a session token to localStorage and keeps the kiosk access, as Tunet did', () => {
    sessionStorage.setItem('ha_token', 'token-di-sessione');
    render(
      <ConfigProvider>
        <ConfigProbe />
      </ConfigProvider>
    );
    expect(readProbe().config).toMatchObject({ token: 'token-di-sessione', authMethod: 'token' });
    expect(localStorage.getItem('ha_token')).toBe('token-di-sessione');
    expect(sessionStorage.getItem('ha_token')).toBeNull();
  });
});
