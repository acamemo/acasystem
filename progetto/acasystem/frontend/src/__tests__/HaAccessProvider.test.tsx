import type { ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthData } from 'home-assistant-js-websocket';
import type { HomeAssistantConfig } from '@/@types/dashboard';
import { getClientId, getHassUrl } from '@/api/haUrl';
import { loadTokens, saveTokens } from '@/api/oauthStorage';
import { HomeAssistantProvider, useHomeAssistantMeta } from '@/hooks/context/HomeAssistantContext';

/**
 * REP-20261007-002, corsia accesso: il provider di Home Assistant si collega sempre al proxy di
 * Acasystem, con la sessione dell'accesso o con il token del kiosk, e mai senza credenziali.
 * Finti: il WebSocket (createConnection) e i registri di Home Assistant.
 */

const mocks = vi.hoisted(() => ({
  createConnection: vi.fn(),
  subscribeEntities: vi.fn(() => () => undefined),
}));

vi.mock('home-assistant-js-websocket', async (importOriginal) => ({
  ...(await importOriginal<typeof import('home-assistant-js-websocket')>()),
  createConnection: mocks.createConnection,
  subscribeEntities: mocks.subscribeEntities,
}));

vi.mock('@/api/haClient', () => ({
  getDeviceRegistry: vi.fn(async () => []),
  getEntityRegistry: vi.fn(async () => []),
}));

interface ConnectionArgs {
  auth: { wsUrl: string; accessToken: string; data: AuthData };
}

function fakeConnection() {
  return {
    sendMessagePromise: vi.fn(async (message: { type: string }) =>
      message.type === 'auth/current_user' ? { id: 'u1', name: 'Mario' } : {}
    ),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    close: vi.fn(),
    ping: vi.fn(async () => undefined),
    connected: true,
  };
}

const sessionTokens = (overrides: Partial<AuthData> = {}): AuthData => ({
  hassUrl: getHassUrl(),
  clientId: getClientId(),
  access_token: 'accesso-1',
  refresh_token: 'rinnovo-1',
  expires_in: 1800,
  expires: Date.now() + 1_800_000,
  ...overrides,
});

function renderProvider(config: Partial<HomeAssistantConfig>) {
  const full: HomeAssistantConfig = {
    url: getHassUrl(),
    fallbackUrl: '',
    token: '',
    authMethod: 'oauth',
    ...config,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <HomeAssistantProvider config={full}>{children}</HomeAssistantProvider>
  );
  return renderHook(useHomeAssistantMeta, { wrapper });
}

const lastAuth = () => (mocks.createConnection.mock.calls.at(-1)?.[0] as ConnectionArgs).auth;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mocks.createConnection.mockReset();
  mocks.subscribeEntities.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('provider di Home Assistant dietro Acasystem', () => {
  it('si collega al proxy con la sessione dell’accesso e usa il proxy per le immagini', async () => {
    saveTokens(sessionTokens());
    mocks.createConnection.mockResolvedValue(fakeConnection());
    const { result } = renderProvider({ authMethod: 'oauth' });

    await waitFor(() => expect(result.current.connected).toBe(true));
    const auth = lastAuth();
    expect(auth.wsUrl).toBe(`ws://${window.location.host}/ha/api/websocket`);
    expect(auth.data.hassUrl).toBe(getHassUrl());
    expect(auth.accessToken).toBe('accesso-1');
    expect(result.current.activeUrl).toBe(getHassUrl());
    expect(result.current.authRef.current).toBe(auth);
    await waitFor(() => expect(result.current.haUser).toMatchObject({ id: 'u1' }));
    expect(localStorage.getItem('ha_url')).toBeNull();
  });

  it('con il token del kiosk si collega al proxy con quel token', async () => {
    mocks.createConnection.mockResolvedValue(fakeConnection());
    const { result } = renderProvider({ authMethod: 'token', token: 'token-kiosk' });
    await waitFor(() => expect(result.current.connected).toBe(true));
    expect(lastAuth().wsUrl).toBe(`ws://${window.location.host}/ha/api/websocket`);
    expect(lastAuth().accessToken).toBe('token-kiosk');
  });

  it('senza credenziali, o con token di un altro indirizzo, non apre connessioni', () => {
    renderProvider({ authMethod: 'oauth' });
    renderProvider({ authMethod: 'token', token: '' });
    saveTokens(sessionTokens({ hassUrl: 'http://homeassistant.local:8123' }));
    renderProvider({ authMethod: 'oauth' });
    expect(mocks.createConnection).not.toHaveBeenCalled();
  });

  it('una sessione rifiutata da Home Assistant viene dimenticata e segnalata come scaduta', async () => {
    saveTokens(sessionTokens());
    mocks.createConnection.mockRejectedValue(2);
    const { result } = renderProvider({ authMethod: 'oauth' });
    await waitFor(() => expect(result.current.oauthExpired).toBe(true));
    expect(result.current.connected).toBe(false);
    expect(loadTokens()).toBeUndefined();
  });

  it('se Home Assistant non risponde mantiene la sessione', async () => {
    saveTokens(sessionTokens());
    mocks.createConnection.mockRejectedValue(1);
    const { result } = renderProvider({ authMethod: 'oauth' });
    await waitFor(() => expect(result.current.haUnavailable).toBe(true));
    expect(result.current.oauthExpired).toBe(false);
    expect(loadTokens()).toMatchObject({ refresh_token: 'rinnovo-1' });
  });
});
