import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ backend: vi.fn(), completeManualLogin: null as (() => void) | null }));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.backend }));
vi.mock('@/api/centralSetup', () => ({ readCentralSetupStatus: async () => 'ready' }));
vi.mock('@/hooks/context', async () => {
  const { useConfig } = await import('@/hooks/context/ConfigContext');
  return { useConfig, useHomeAssistantMeta: () => ({ haUser: { id: 'anna', name: 'Anna' } }) };
});
vi.mock('@/hooks/context/HomeAssistantContext', () => ({ HomeAssistantProvider: ({ children }: { children: ReactNode }) => children,
  useHomeAssistantMeta: () => ({ haUser: { id: 'anna', name: 'Anna' } }) }));
vi.mock('@/hooks/liveProfiles/LiveProfilesContext', () => ({ LiveProfilesProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/routes/AppRoutes', async () => {
  const { useConnectPageControl } = await import('@/hooks/context/ConfigContext');
  return { AppRoutes: ({ showConnect, onConnected }: { showConnect: boolean; onConnected: () => void }) => {
    const control = useConnectPageControl();
    mocks.completeManualLogin = onConnected;
    return showConnect ? <p>Accesso in corso</p> : <button onClick={() => control?.open()}>Apri un nuovo accesso</button>;
  } };
});
import { App } from '@/routes/AppRoot';
import { ConfigProvider } from '@/hooks/context/ConfigContext';
import { persistSessionTokens } from '@/api/haSession';
import { getClientId, getHassUrl } from '@/api/haUrl';
import { setClientSession } from '@/api/clientSession';
const client = { id: 'phone', userId: 'anna', label: 'Telefono Anna', platform: 'web', activeProfileId: null,
  preferences: {}, createdAt: '', lastSeenAt: '', revokedAt: null, revocationPending: false };
const tokens = (suffix: string) => ({ hassUrl: getHassUrl(), clientId: getClientId(), access_token: `access-${suffix}`,
  refresh_token: `refresh-${suffix}`, expires: Date.now() + 3600_000, expires_in: 3600 });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); setClientSession(null); vi.clearAllMocks(); mocks.completeManualLogin = null;
  window.history.replaceState(null, '', '/');
  mocks.backend.mockImplementation(async (path: string) => path === '/v2/bootstrap'
    ? { protocol: 2, houseId: 'house', user: { id: 'anna', name: 'Anna', color: '#6b8afd' }, client: null, clients: [], profiles: [], sources: [] }
    : client);
});
afterEach(() => { cleanup(); setClientSession(null); });
describe('completamento idempotente ingresso ACA', () => {
  it('conserva il Field reale quando hydration precede il callback manuale dello stesso login', async () => {
    render(<ConfigProvider><App /></ConfigProvider>);
    await screen.findByText('Accesso in corso');
    const completeManualLogin = mocks.completeManualLogin!;
    // L'evento storage avvia davvero l'effect hydration di ConnectedApp.
    act(() => persistSessionTokens(tokens('first')));
    const name = await screen.findByRole('textbox', { name: 'Nome di questo dispositivo' });
    fireEvent.change(name, { target: { value: 'Telefono Anna' } });
    expect(name).toHaveValue('Telefono Anna');
    act(() => completeManualLogin());
    const after = await screen.findByRole('textbox', { name: 'Nome di questo dispositivo' });
    expect(after).toBe(name);
    expect(after).toHaveValue('Telefono Anna');
    expect(screen.getByRole('button', { name: 'Collega questo dispositivo' })).toBeEnabled();
  });
  it('permette un completamento nuovo dopo aver riaperto esplicitamente il login', async () => {
    render(<ConfigProvider><App /></ConfigProvider>);
    await screen.findByText('Accesso in corso');
    act(() => persistSessionTokens(tokens('first')));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Nome di questo dispositivo' }), { target: { value: client.label } });
    fireEvent.click(screen.getByRole('button', { name: 'Collega questo dispositivo' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Apri un nuovo accesso' }));
    await screen.findByText('Accesso in corso');
    act(() => { persistSessionTokens(tokens('second')); mocks.completeManualLogin?.(); });
    expect(await screen.findByRole('textbox', { name: 'Nome di questo dispositivo' })).toHaveValue(client.label);
    expect(screen.queryByText('Accesso in corso')).not.toBeInTheDocument();
  });
});
