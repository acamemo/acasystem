import { useLayoutEffect, type ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthData, HassEntities } from 'home-assistant-js-websocket';
import type { HomeAssistantConfig } from '@/@types/dashboard';
import { getClientId, getHassUrl } from '@/api/haUrl';
import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { fixtureEntity } from '@/utils/fixtures/runtime';
import { loadTokens, saveTokens } from '@/api/oauthStorage';
import { HomeAssistantProvider, useHomeAssistant } from '@/hooks/context/HomeAssistantContext';

/**
 * REP-20261007-002, corsia accesso: il provider di Home Assistant si collega sempre al proxy di
 * Acasystem, con la sessione dell'accesso o con il token del kiosk, e mai senza credenziali.
 * Finti: il WebSocket (createConnection) e i registri di Home Assistant.
 */

const mocks = vi.hoisted(() => ({
  createConnection: vi.fn(),
  subscribeEntities: vi.fn((_conn: unknown, _callback: (entities: HassEntities) => void) => () => undefined),
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
  return renderHook(useHomeAssistant, { wrapper });
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


/** The provider must publish snapshot readiness in the same real frame as that snapshot. */
function manualEntityFrames() {
  const frames = new Map<number, FrameRequestCallback>();
  let next = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = ++next;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => frames.delete(id));
  return () => act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(performance.now()));
  });
}

const snapshot = (state = 'on'): HassEntities => ({
  'light.soggiorno': fixtureEntity('light.soggiorno', state),
});
const subscriber = (index = 0) => mocks.subscribeEntities.mock.calls[index][1];

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

  it('commits the first snapshot and loaded flag together, including registry enrichment before the frame', async () => {
    const commitFrame = manualEntityFrames();
    let resolveRegistry!: (entries: never[]) => void;
    const registry = new Promise<never[]>((resolve) => { resolveRegistry = resolve; });
    vi.mocked(getDeviceRegistry).mockReturnValueOnce(registry);
    vi.mocked(getEntityRegistry).mockReturnValueOnce(registry);
    mocks.createConnection.mockResolvedValue(fakeConnection());
    const committed: { loaded: boolean; ids: string[] }[] = [];
    const config: HomeAssistantConfig = { url: getHassUrl(), fallbackUrl: '', token: 'first', authMethod: 'token' };
    const wrapper = ({ children }: { children: ReactNode }) => <HomeAssistantProvider config={config}>{children}</HomeAssistantProvider>;
    const { result } = renderHook(() => {
      const value = useHomeAssistant();
      useLayoutEffect(() => { committed.push({ loaded: value.entitiesLoaded, ids: Object.keys(value.entities) }); }, [value]);
      return value;
    }, { wrapper });
    await waitFor(() => expect(mocks.subscribeEntities).toHaveBeenCalledTimes(1));
    act(() => subscriber()(snapshot()));
    expect(result.current.entitiesLoaded).toBe(false);
    expect(result.current.entities).toEqual({});
    await act(async () => { resolveRegistry([]); await registry; });
    expect(result.current.entitiesLoaded).toBe(false);
    commitFrame();
    expect(result.current.entitiesLoaded).toBe(true);
    expect(result.current.entities['light.soggiorno'].state).toBe('on');
    expect(committed.filter((value) => value.loaded).every((value) => value.ids.includes('light.soggiorno'))).toBe(true);
  });

  it('accepts an empty authoritative snapshot without waiting for an entity count', async () => {
    const commitFrame = manualEntityFrames();
    mocks.createConnection.mockResolvedValue(fakeConnection());
    const { result } = renderProvider({ authMethod: 'token', token: 'empty' });
    await waitFor(() => expect(mocks.subscribeEntities).toHaveBeenCalledTimes(1));
    act(() => subscriber()({}));
    expect(result.current.entitiesLoaded).toBe(false);
    commitFrame();
    expect(result.current.entitiesLoaded).toBe(true);
    expect(result.current.entities).toEqual({});
  });

  it('does not publish readiness from a cancelled attempt and keeps the newest pending snapshot', async () => {
    const commitFrame = manualEntityFrames();
    mocks.createConnection.mockResolvedValue(fakeConnection());
    let token = 'attempt-one';
    const wrapper = ({ children }: { children: ReactNode }) => <HomeAssistantProvider config={{
      url: getHassUrl(), fallbackUrl: '', token, authMethod: 'token',
    }}>{children}</HomeAssistantProvider>;
    const { result, rerender } = renderHook(useHomeAssistant, { wrapper });
    await waitFor(() => expect(mocks.subscribeEntities).toHaveBeenCalledTimes(1));
    const cancelled = subscriber();
    act(() => cancelled(snapshot('on')));
    token = 'attempt-two';
    rerender();
    await waitFor(() => expect(mocks.subscribeEntities).toHaveBeenCalledTimes(2));
    commitFrame();
    expect(result.current.entitiesLoaded).toBe(false);
    act(() => cancelled(snapshot('unavailable')));
    act(() => {
      subscriber(1)(snapshot('on'));
      subscriber(1)(snapshot('off'));
    });
    expect(result.current.entitiesLoaded).toBe(false);
    commitFrame();
    expect(result.current.entitiesLoaded).toBe(true);
    expect(result.current.entities['light.soggiorno'].state).toBe('off');
  });

  it('retains the committed snapshot and readiness during reconnect events', async () => {
    const commitFrame = manualEntityFrames();
    const connection = fakeConnection();
    mocks.createConnection.mockResolvedValue(connection);
    const { result } = renderProvider({ authMethod: 'token', token: 'reconnect' });
    await waitFor(() => expect(mocks.subscribeEntities).toHaveBeenCalledTimes(1));
    act(() => subscriber()(snapshot()));
    commitFrame();
    const entities = result.current.entities;
    const listener = (name: string) => connection.addEventListener.mock.calls.find((call) => call[0] === name)?.[1] as (() => void);
    act(() => listener('disconnected')());
    expect(result.current.connected).toBe(false);
    expect(result.current.entitiesLoaded).toBe(true);
    expect(result.current.entities).toBe(entities);
    act(() => listener('ready')());
    expect(result.current.connected).toBe(true);
    expect(result.current.entitiesLoaded).toBe(true);
    expect(result.current.entities).toBe(entities);
  });

  it('retries the initial snapshot through its owner without changing credentials and ignores old subscribers', async () => {
    const commitFrame = manualEntityFrames();
    mocks.createConnection.mockResolvedValue(fakeConnection());
    const { result } = renderProvider({ authMethod: 'token', token: 'owner-retry' });
    await waitFor(() => expect(mocks.subscribeEntities).toHaveBeenCalledTimes(1));
    const old = subscriber();
    act(() => result.current.retryInitialSnapshot?.());
    await waitFor(() => expect(mocks.subscribeEntities).toHaveBeenCalledTimes(2));
    act(() => old(snapshot('unavailable')));
    commitFrame();
    expect(result.current.entitiesLoaded).toBe(false);
    act(() => subscriber(1)({}));
    commitFrame();
    expect(result.current.entitiesLoaded).toBe(true);
    expect(result.current.entities).toEqual({});
    expect(lastAuth().accessToken).toBe('owner-retry');
  });

});
