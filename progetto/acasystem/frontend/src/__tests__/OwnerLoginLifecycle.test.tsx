import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthData } from 'home-assistant-js-websocket';
const mocks = vi.hoisted(() => ({ bind: vi.fn(), accept: vi.fn(), revoke: vi.fn(), cancel: vi.fn() }));
const fresh = { access_token: 'fresh-access', refresh_token: 'fresh-refresh' } as AuthData;
vi.mock('@/hooks/context', () => ({ useConfig: () => ({ config: {}, setConfig: vi.fn() }) }));
vi.mock('@/hooks/useConnectionSetup', () => ({ useConnectionSetup: () => ({ acceptSession: mocks.accept, cancelLogin: mocks.cancel }) }));
vi.mock('@/api/ownerAppearance', () => ({ bindOwnerAppearance: mocks.bind, readOwnerAppearance: () => ({ username: 'owner' }), discardUnboundAppearanceImages: vi.fn() }));
vi.mock('@/api/haSession', () => ({ revokeSession: mocks.revoke }));
vi.mock('@/pages/connect/LoginForm', () => ({ LoginForm: ({ onSession, onAuthenticatedUsername }: {
  onSession: (value: AuthData) => void; onAuthenticatedUsername?: (value: string) => void;
}) => <button onClick={() => { onAuthenticatedUsername?.('owner'); onSession(fresh); }}>Invia accesso</button> }));
vi.mock('@/pages/connect/RegistrationForm', () => ({ RegistrationForm: ({ onSession }: { onSession: (value: AuthData) => void }) =>
  <button onClick={() => onSession({ access_token: 'registered-access' } as AuthData)}>Concludi registrazione</button> }));
import { ConnectPage } from '@/pages/connect/ConnectPage';

let resolve!: () => void;
let reject!: (failure: Error) => void;
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('existing-access', 'global-untouched'); mocks.revoke.mockResolvedValue(true);
  mocks.bind.mockReturnValue(new Promise<void>((done, failed) => { resolve = done; reject = failed; }));
});
afterEach(cleanup);
describe('ownership dei grant transitori del bind owner', () => {
  it('non revoca un accesso accettato e conserva invariato il callback normale', async () => {
    const connected = vi.fn(); const view = render(<ConnectPage onConnected={connected} />);
    fireEvent.click(screen.getByRole('button', { name: 'Invia accesso' }));
    await act(async () => { resolve(); });
    expect(mocks.accept).toHaveBeenCalledWith(fresh); expect(connected).toHaveBeenCalledOnce();
    view.unmount(); expect(mocks.revoke).not.toHaveBeenCalled();
  });
  it('su rifiuto revoca solo il nuovo grant una volta e conserva la sessione globale', async () => {
    const view = render(<ConnectPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Invia accesso' }));
    await act(async () => { reject(new Error('Bind rifiutato')); });
    expect(await screen.findByRole('alert')).toHaveTextContent('Bind rifiutato');
    view.unmount(); expect(mocks.revoke).toHaveBeenCalledExactlyOnceWith(fresh);
    expect(mocks.accept).not.toHaveBeenCalled(); expect(localStorage.getItem('existing-access')).toBe('global-untouched');
  });
  it.each(['footer', 'cancel', 'unmount'] as const)('abbandono %s invalida il vecchio bind e revoca il grant una volta', async (action) => {
    const view = render(<ConnectPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Invia accesso' }));
    if (action === 'footer') fireEvent.click(screen.getByRole('button', { name: 'Crea account' }));
    else if (action === 'cancel') fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    else view.unmount();
    await act(async () => { resolve(); });
    expect(mocks.accept).not.toHaveBeenCalled(); expect(mocks.revoke).toHaveBeenCalledExactlyOnceWith(fresh);
    view.unmount(); expect(mocks.revoke).toHaveBeenCalledOnce();
  });
  it('una registrazione successiva non viene sostituita dal vecchio bind', async () => {
    render(<ConnectPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Invia accesso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crea account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Concludi registrazione' }));
    await act(async () => { resolve(); });
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledOnce());
    expect(mocks.accept).toHaveBeenCalledWith({ access_token: 'registered-access' });
    expect(mocks.revoke).toHaveBeenCalledExactlyOnceWith(fresh);
  });
});
