import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { HomeStartupProvider, HomeStartupView, useHomeStartupSignal } from '@/hooks/startup/HomeStartupContext';
import { ClientAccessGate } from '@/hooks/client/ClientAccessGate';
import { LiveProfilesProvider } from '@/hooks/liveProfiles/LiveProfilesContext';
import type { LiveProfilesState } from '@/hooks/liveProfiles/coordinator';
import { PageProvider } from '@/hooks/context/PageContext';
import { OwnerAppearanceGate } from '@/pages/connect/OwnerAppearanceGate';
import { isCasaPath } from '@/casa3d/casaNav';
import { PROFILE_IN_USE_MESSAGE } from '@/api/usageProof';
import type { ClientSession } from '@/api/clientSession';
import type { LiveProfile } from '../../../contracts/collaboration';

const fake = vi.hoisted(() => ({
  session: null as unknown, manual: false,
  bootstrap: vi.fn(), logout: vi.fn(), retryUsage: vi.fn(), retryPreparation: vi.fn(), start: vi.fn(),
  ownerPending: false, ownerApply: vi.fn(), listeners: new Set<() => void>(),
  state: {} as LiveProfilesState,
}));
vi.mock('@/hooks/context', () => ({
  useConfig: () => ({ config: { authMethod: fake.manual ? 'token' : 'oauth', token: '' }, setConfig: vi.fn() }),
  useHomeAssistantMeta: () => ({ haUser: null }),
}));
vi.mock('@/hooks/useConnectionSetup', () => ({ useConnectionSetup: () => ({ logout: fake.logout }) }));
vi.mock('@/api/haSession', () => ({ hasSessionTokens: () => true }));
vi.mock('@/utils/clientSessionCache', () => ({ readCachedClientSession: () => null, resetClientAccess: vi.fn() }));
vi.mock('@/api/clientSession', () => ({
  CLIENT_SESSION_EVENT: 'test-client-session', defaultClientLabel: () => 'Browser',
  getClientSession: () => fake.session,
  setClientSession: (value: unknown) => { fake.session = value; window.dispatchEvent(new Event('test-client-session')); },
  readClientBootstrap: fake.bootstrap, registerClient: vi.fn(),
}));
vi.mock('@/api/ownerAppearance', () => ({
  hasOwnerAppearance: () => fake.ownerPending, readOwnerAppearance: () => ({ id: 'appearance' }),
  applyOwnerAppearance: fake.ownerApply,
}));
vi.mock('@/hooks/liveProfiles/coordinator', () => ({ LiveProfileCoordinator: class {
  snapshot = () => fake.state;
  subscribe = (listener: () => void) => { fake.listeners.add(listener); return () => fake.listeners.delete(listener); };
  start = fake.start;
  dispose() {} updateSessionMetadata() {}
  retryPreparation = fake.retryPreparation;
  retryUsage = fake.retryUsage;
} }));
const session = { houseId: 'house', user: { id: 'user', name: 'Persona' },
  client: { id: 'client' } } as ClientSession;
const profile: LiveProfile = { id: 'profile', userId: 'user', name: 'Casa', revision: 1, resourceRevisions: {},
  configuration: { snapshot: { layout: {} } }, migration: null, createdAt: '', updatedAt: '' };
const scope = 'house:user:client:profile';
function Eligible({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <HomeStartupProvider eligible={pathname !== '/sistema' && !isCasaPath(pathname)}>{children}</HomeStartupProvider>;
}
function open(path: string, children: ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}><Eligible>{children}</Eligible></MemoryRouter>);
}
function ReadyAccess() { useHomeStartupSignal('access', { status: 'ready', scope: 'house:user:client' }); return null; }
function Home() {
  useHomeStartupSignal('home', { status: 'ready', scope });
  return <HomeStartupView measured><p>Widget della casa</p></HomeStartupView>;
}
function profiles() {
  return open('/', <><ReadyAccess /><PageProvider><LiveProfilesProvider session={session}><Home /></LiveProfilesProvider></PageProvider></>);
}
function updateProfile(value: Partial<LiveProfilesState>) {
  act(() => { fake.state = { ...fake.state, ...value }; fake.listeners.forEach((listener) => listener()); });
}
function entryEnd(container: HTMLElement) {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: 'aca-home-in' });
  fireEvent(container.querySelector('.aca-home-entry')!, event);
}
function expectPlain(message: string, container: HTMLElement) {
  const text = screen.getByText(message);
  expect(text.closest('.aca-m')).toBeNull();
  expect(container.querySelector('.aca-home-loader')).toBeNull();
  expect(container.querySelector('.aca-spinner')).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Riprova' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Riprova' })).toHaveClass('aca-m--primary');
}
beforeEach(() => {
  fake.session = null; fake.manual = false; fake.ownerPending = false; fake.listeners.clear();
  fake.bootstrap.mockReset().mockImplementation(() => new Promise(() => undefined));
  fake.ownerApply.mockReset().mockImplementation(() => new Promise(() => undefined));
  fake.start.mockReset().mockResolvedValue(undefined); fake.retryUsage.mockReset().mockResolvedValue(undefined);
  fake.retryPreparation.mockReset().mockResolvedValue(undefined); fake.logout.mockClear();
  fake.state = { status: 'loading', profile: null, profiles: [], sources: [], leases: [], drafts: [], editor: null,
    offline: false, error: '', clientName: 'Browser', canUndo: false, saving: false,
    usageStatus: 'idle', usageError: '', usageLease: null };
});
afterEach(() => { cleanup(); vi.useRealTimers(); fake.session = null; localStorage.clear(); vi.restoreAllMocks(); });

describe('real waiting gates outside the Home route', () => {
  it.each(['/sistema', '/casa'])('keeps the real account waiting screen on direct %s', (path) => {
    const view = open(path, <ClientAccessGate>{() => <p>App</p>}</ClientAccessGate>);
    expect(screen.getByRole('status')).toHaveTextContent('Verifica dell’accesso in corso');
    expect(screen.getByRole('status').closest('.aca-m')).toBeNull();
    expect(view.container.querySelector('.aca-home-loader')).toBeNull();
  });
  it.each(['/sistema', '/casa'])('keeps the real profile waiting screen on direct %s', (path) => {
    const view = open(path, <PageProvider><LiveProfilesProvider session={session}><p>App</p></LiveProfilesProvider></PageProvider>);
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento dei profili');
    expect(screen.getByRole('status').closest('.aca-m')).toBeNull();
    expect(view.container.querySelector('.aca-home-loader')).toBeNull();
  });
  it('replaces only the transient Home access wait with the common delayed presenter', () => {
    vi.useFakeTimers();
    const view = open('/', <ClientAccessGate>{() => <p>App</p>}</ClientAccessGate>);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => vi.advanceTimersByTime(150));
    expect(view.container.querySelector('.aca-home-loader')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Preparazione di ACA');
  });
});

describe('one plain full-page state under the real startup provider', () => {
  it.each(['blocked', 'unavailable'] as const)('prioritizes usage %s over transient loading, before 150ms and beyond 10s', (usageStatus) => {
    vi.useFakeTimers(); fake.state = { ...fake.state, profile, usageStatus };
    const view = profiles();
    const message = usageStatus === 'blocked' ? PROFILE_IN_USE_MESSAGE : 'Non riesco a verificare l’uso del profilo. Riprova.';
    expectPlain(message, view.container);
    act(() => vi.advanceTimersByTime(150)); expectPlain(message, view.container);
    act(() => vi.advanceTimersByTime(10_000)); expectPlain(message, view.container);
    expect(screen.queryByText('Widget della casa')).toBeNull();
  });

  it('removes an already visible spinner when the usage owner reports blocked', () => {
    vi.useFakeTimers(); fake.state = { ...fake.state, profile, usageStatus: 'checking' };
    const view = profiles(); act(() => vi.advanceTimersByTime(150));
    expect(view.container.querySelector('.aca-spinner')).not.toBeNull();
    updateProfile({ usageStatus: 'blocked' });
    expectPlain(PROFILE_IN_USE_MESSAGE, view.container);
    act(() => vi.advanceTimersByTime(10_000)); expectPlain(PROFILE_IN_USE_MESSAGE, view.container);
  });

  it('clears the old timeout on busy and starts a fresh wait when its retry returns control', () => {
    vi.useFakeTimers(); fake.state = { ...fake.state, profile, usageStatus: 'checking' };
    const view = profiles(); act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole('status')).toHaveTextContent('La preparazione sta richiedendo più tempo del dovuto');
    updateProfile({ usageStatus: 'blocked' }); expectPlain(PROFILE_IN_USE_MESSAGE, view.container);
    fake.retryUsage.mockImplementationOnce(() => updateProfile({ usageStatus: 'checking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(fake.retryUsage).toHaveBeenCalledOnce();
    expect(screen.queryByText(PROFILE_IN_USE_MESSAGE)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Riprova' })).toBeNull();
    expect(view.container.querySelector('.aca-home-loader')).toBeNull();
    act(() => vi.advanceTimersByTime(149)); expect(view.container.querySelector('.aca-home-loader')).toBeNull();
    act(() => vi.advanceTimersByTime(1)); expect(view.container.querySelector('.aca-spinner')).not.toBeNull();
    updateProfile({ status: 'ready', usageStatus: 'active' });
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'entering');
    entryEnd(view.container);
    expect(view.container.querySelector('.aca-home-entry')).not.toHaveAttribute('inert');
    expect(screen.getByText('Widget della casa')).toBeInTheDocument();
  });

  it('does not replay an old loader exit when a busy retry succeeds before its new 150ms delay', () => {
    vi.useFakeTimers(); fake.state = { ...fake.state, profile, usageStatus: 'checking' };
    const view = profiles(); act(() => vi.advanceTimersByTime(10_000));
    updateProfile({ usageStatus: 'blocked' });
    fake.retryUsage.mockImplementationOnce(() => updateProfile({ usageStatus: 'checking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    updateProfile({ status: 'ready', usageStatus: 'active' });
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'entering');
    expect(view.container.querySelector('.aca-home-loader')).toBeNull();
  });

  it('prepares again after an already ready Home becomes busy, without accepting the previous completion', () => {
    vi.useFakeTimers(); fake.state = { ...fake.state, profile, status: 'ready', usageStatus: 'active' };
    const view = profiles(); const previous = view.container.querySelector('.aca-home-entry')!;
    entryEnd(view.container); expect(previous).not.toHaveAttribute('inert');
    updateProfile({ status: 'loading', usageStatus: 'blocked' }); expectPlain(PROFILE_IN_USE_MESSAGE, view.container);
    fake.retryUsage.mockImplementationOnce(() => updateProfile({ usageStatus: 'checking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    act(() => vi.advanceTimersByTime(150));
    expect(view.container.querySelector('.aca-spinner')).not.toBeNull();
    const oldCompletion = new Event('animationend', { bubbles: true });
    Object.defineProperty(oldCompletion, 'animationName', { value: 'aca-home-in' });
    fireEvent(previous, oldCompletion);
    expect(view.container.querySelector('.aca-home-entry')).toBeNull();
    updateProfile({ status: 'ready', usageStatus: 'active' });
    expect(view.container.querySelector('.aca-home-entry')).toHaveAttribute('data-home-phase', 'entering');
    entryEnd(view.container); expect(view.container.querySelector('.aca-home-entry')).not.toHaveAttribute('inert');
  });

  it('shows a profile read error once, with its existing retry, without starting the chooser form', () => {
    vi.useFakeTimers(); fake.state = { ...fake.state, status: 'unavailable', error: 'Centrale non raggiungibile.' };
    const view = profiles(); expectPlain('Centrale non raggiungibile.', view.container);
    expect(screen.queryByRole('textbox', { name: 'Nome del profilo' })).toBeNull();
    act(() => vi.advanceTimersByTime(10_001)); expectPlain('Centrale non raggiungibile.', view.container);
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' })); expect(fake.start).toHaveBeenCalledTimes(2);
  });

  it('keeps the access error and both existing actions outside the Home loader', async () => {
    vi.useFakeTimers(); fake.bootstrap.mockRejectedValueOnce(new Error('Accesso non disponibile.'));
    const view = open('/', <ClientAccessGate>{() => <p>App</p>}</ClientAccessGate>);
    await act(async () => { await Promise.resolve(); });
    expectPlain('Accesso non disponibile.', view.container);
    expect(screen.getByRole('alert')).toHaveTextContent('Accesso non disponibile.');
    expect(screen.getByRole('button', { name: 'Accedi di nuovo' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10_001)); expectPlain('Accesso non disponibile.', view.container);
    fireEvent.click(screen.getByRole('button', { name: 'Accedi di nuovo' })); expect(fake.logout).toHaveBeenCalledOnce();
  });

  it('does not cover cached-session account appearance with a pending access spinner or timeout', () => {
    vi.useFakeTimers(); fake.session = session; fake.ownerPending = true;
    const view = open('/', <ClientAccessGate>{(bound) => <OwnerAppearanceGate session={bound}><p>App</p></OwnerAppearanceGate>}</ClientAccessGate>);
    expect(screen.getByRole('status')).toHaveTextContent('Salvataggio della personalizzazione');
    expect(screen.getByRole('status').closest('.aca-m')).toBeNull();
    act(() => vi.advanceTimersByTime(10_001));
    expect(view.container.querySelector('.aca-home-loader')).toBeNull();
    expect(screen.queryByText('App')).toBeNull(); expect(fake.ownerApply).toHaveBeenCalledOnce();
  });

  it('keeps the manual-token compatibility action available without starting Home preparation', () => {
    vi.useFakeTimers(); fake.manual = true;
    const view = open('/', <ClientAccessGate>{() => <p>App</p>}</ClientAccessGate>);
    expect(screen.getByRole('status')).toHaveTextContent('Il token condiviso non identifica una sessione indipendente.');
    act(() => vi.advanceTimersByTime(10_001)); expect(view.container.querySelector('.aca-home-loader')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Accedi di nuovo' })); expect(fake.logout).toHaveBeenCalledOnce();
  });
});
