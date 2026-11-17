import type { ReactNode } from 'react';
import type { AuthData } from 'home-assistant-js-websocket';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CentralSetupGate } from '@/pages/connect/CentralSetupGate';
import { CentralSetupError } from '@/api/centralSetup';

const tokens: AuthData = { hassUrl: 'http://localhost/ha', clientId: 'http://localhost/', access_token: 'personal-token', refresh_token: 'private-refresh', expires_in: 1800, expires: Date.now() + 1_800_000 };
const mocks = vi.hoisted(() => ({ status: vi.fn(), owner: vi.fn(), complete: vi.fn(), accept: vi.fn(), protected: vi.fn(), revoke: vi.fn(), bootstrap: vi.fn(), loginName: vi.fn(), demo: false }));
vi.mock('@/api/centralSetup', async (original) => ({ ...await original<typeof import('@/api/centralSetup')>(), readCentralSetupStatus: mocks.status, createCentralOwner: mocks.owner, completeCentralSetup: mocks.complete }));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.bootstrap }));
vi.mock('@/api/demoSource', () => ({ getDemoSource: () => mocks.demo ? {} : null }));
vi.mock('@/api/haSession', () => ({ revokeSession: mocks.revoke, hasSessionTokens: () => false }));
vi.mock('@/hooks/context/ConfigContext', () => ({ useConfig: () => ({ config: {}, setConfig: vi.fn() }) }));
vi.mock('@/hooks/useConnectionSetup', () => ({ useConnectionSetup: () => ({ acceptSession: mocks.accept }) }));
vi.mock('@/pages/connect/LoginForm', () => ({ LoginForm: ({ onSession, onAuthenticatedUsername, initialUsername = '' }: { onSession: (session: AuthData) => void; onAuthenticatedUsername?: (value: string) => void; initialUsername?: string }) => { mocks.loginName(initialUsername); return <button onClick={() => { onAuthenticatedUsername?.(initialUsername); onSession(tokens); }}>Accesso personale completato</button>; } }));

function Protected({ children }: { children?: ReactNode }) { mocks.protected(); return <div>Applicazione connessa{children}</div>; }
const fillOwner = () => {
  fireEvent.change(screen.getByLabelText('Nome utente'), { target: { value: 'mario' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'private-password' } });
  fireEvent.change(screen.getByLabelText('Conferma password'), { target: { value: 'private-password' } });
};

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); vi.clearAllMocks(); mocks.bootstrap.mockResolvedValue({ protocol: 2, houseId: 'house', user: { id: 'owner-id', name: 'mario' } }); mocks.demo = false; mocks.status.mockResolvedValue('ready'); mocks.owner.mockResolvedValue(undefined); mocks.complete.mockResolvedValue(undefined); });
afterEach(cleanup);

describe('gate della prima configurazione web', () => {
  it('usa il solo nome utente normalizzato anche come nome iniziale, preservando la password', async () => {
    mocks.status.mockResolvedValue('owner-required');
    render(<CentralSetupGate><Protected /></CentralSetupGate>);
    await screen.findByRole('form', { name: 'Crea account' });
    expect(screen.getByRole('heading', { name: 'Crea account' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Crea proprietario' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Personalizza colore profilo')).toBeVisible();
    fillOwner();
    fireEvent.change(screen.getByLabelText('Personalizza colore profilo'), { target: { value: '#123abc' } });
    const username = screen.getByLabelText('Nome utente');
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    fireEvent.change(username, { target: { value: '  MARIO.TEST  ' } });
    expect(username).toHaveValue('  MARIO.TEST  ');
    fireEvent.blur(username);
    expect(username).toHaveValue('mario.test');
    fireEvent.change(username, { target: { value: '  MARIO.TEST  ' } });
    const password = '  Password-Test9  ';
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Conferma password'), { target: { value: password } });
    // Invio diretto senza un nuovo blur: il payload deve comunque essere normalizzato.
    fireEvent.submit(screen.getByRole('form', { name: 'Crea account' }));
    await screen.findByRole('button', { name: 'Accesso personale completato' });
    expect(mocks.owner).toHaveBeenCalledWith({ name: 'mario.test', username: 'mario.test', password });
    expect(sessionStorage.getItem('aca:setup:owner-appearance')).toContain('#123abc');
    expect(sessionStorage.getItem('aca:setup:owner-appearance')).not.toContain(password);
    expect(mocks.loginName).toHaveBeenLastCalledWith('mario.test');
  });
  it('keeps protected providers outside while status is pending and on a new home', async () => {
    let resolve!: (value: string) => void;
    mocks.status.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<CentralSetupGate><Protected /></CentralSetupGate>);
    expect(mocks.protected).not.toHaveBeenCalled();
    resolve('owner-required');
    await screen.findByRole('form', { name: 'Crea account' });
    expect(mocks.protected).not.toHaveBeenCalled();
    expect(mocks.accept).not.toHaveBeenCalled();
  });
  it('creates one owner, requires a personal login and finishes the house before accepting the session', async () => {
    mocks.status.mockResolvedValue('owner-required');
    render(<CentralSetupGate><Protected /></CentralSetupGate>);
    await screen.findByRole('form', { name: 'Crea account' });
    fillOwner();
    fireEvent.submit(screen.getByRole('form', { name: 'Crea account' }));
    await screen.findByRole('button', { name: 'Accesso personale completato' });
    expect(mocks.owner).toHaveBeenCalledWith({ name: 'mario', username: 'mario', password: 'private-password' });
    expect(mocks.accept).not.toHaveBeenCalled();
    expect(mocks.protected).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Accesso personale completato' }));
    fireEvent.change(screen.getByLabelText('Nome della casa'), { target: { value: 'Casa Mario' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Completa casa' }));
    await screen.findByText('Applicazione connessa');
    expect(mocks.complete).toHaveBeenCalledWith('personal-token', 'Casa Mario');
    expect(mocks.accept).toHaveBeenCalledWith(tokens);
    expect(mocks.bootstrap).toHaveBeenCalledWith('/v2/bootstrap', {}, expect.objectContaining({ authHeadersOverride: { Authorization: 'Bearer personal-token' }, notifyOnUnauthorized: false }));
    expect(JSON.parse(sessionStorage.getItem('aca:setup:owner-appearance') || '{}')).toMatchObject({ houseId: 'house', userId: 'owner-id' });
    expect(mocks.revoke).not.toHaveBeenCalled();
  });
  it('recovers an owner created in another tab or after a lost response through login', async () => {
    mocks.status.mockResolvedValue('owner-required');
    mocks.owner.mockRejectedValue(new CentralSetupError('SETUP_OWNER_EXISTS'));
    render(<CentralSetupGate><Protected /></CentralSetupGate>);
    await screen.findByRole('form', { name: 'Crea account' });
    fillOwner();
    fireEvent.submit(screen.getByRole('form', { name: 'Crea account' }));
    await screen.findByRole('button', { name: 'Accesso personale completato' });
    expect(screen.getByText(/account è già stato creato/)).toBeVisible();
    expect(mocks.protected).not.toHaveBeenCalled();
  });
  it('keeps an incomplete home gated after a refused completion and revokes a changed account', async () => {
    mocks.status.mockResolvedValue('setup-required');
    mocks.complete.mockRejectedValue(new CentralSetupError('SETUP_ADMIN_REQUIRED'));
    render(<CentralSetupGate><Protected /></CentralSetupGate>);
    fireEvent.click(await screen.findByRole('button', { name: 'Accesso personale completato' }));
    fireEvent.submit(screen.getByRole('form', { name: 'Completa casa' }));
    await screen.findByRole('alert');
    expect(mocks.accept).not.toHaveBeenCalled();
    expect(mocks.protected).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cambia account' }));
    expect(mocks.revoke).toHaveBeenCalledWith(tokens);
  });
  it('retries a status error without opening the protected app', async () => {
    mocks.status.mockRejectedValueOnce(new CentralSetupError('HA_UNREACHABLE')).mockResolvedValueOnce('ready');
    render(<CentralSetupGate><Protected /></CentralSetupGate>);
    await screen.findByRole('alert');
    expect(mocks.protected).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await screen.findByText('Applicazione connessa');
  });
  it('does not contact a central in the local demo', async () => {
    mocks.demo = true;
    render(<CentralSetupGate><Protected /></CentralSetupGate>);
    expect(screen.getByText('Applicazione connessa')).toBeVisible();
    await waitFor(() => expect(mocks.status).not.toHaveBeenCalled());
  });
});
