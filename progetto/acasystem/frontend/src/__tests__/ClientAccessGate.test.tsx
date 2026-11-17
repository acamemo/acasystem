import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientRecord } from '../../../contracts/collaboration';
const mocks = vi.hoisted(() => ({ backend: vi.fn(), hasTokens: true, logout: vi.fn(), userId: 'anna' }));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.backend }));
vi.mock('@/api/haSession', () => ({ hasSessionTokens: () => mocks.hasTokens }));
vi.mock('@/api/qrPairing', () => ({ readQrPreferences: () => null }));
vi.mock('@/hooks/context', () => ({ useHomeAssistantMeta: () => ({ haUser: { id: mocks.userId } }), useConfig: () => ({ config: { authMethod: 'oauth' }, setConfig: vi.fn() }) }));
vi.mock('@/hooks/useConnectionSetup', () => ({ useConnectionSetup: () => ({ logout: mocks.logout }) }));
import { ClientAccessGate } from '@/hooks/client/ClientAccessGate';
import { defaultClientLabel, getClientSession, setClientSession } from '@/api/clientSession';
import { cacheClientSession, readCachedClientSession, resetClientAccess } from '@/utils/clientSessionCache';
import { newRequestId } from '@/utils/requestId';

const client: ClientRecord = { id: 'phone', userId: 'anna', label: 'Telefono di Anna', platform: 'web', activeProfileId: null,
  preferences: {}, createdAt: '', lastSeenAt: '', revokedAt: null, revocationPending: false };
const user = { id: 'anna', name: 'Anna', color: 'blue' };
const known = { houseId: 'house', user, client };
const view = () => render(<ClientAccessGate>{(session) => <p>{session.client.label}{session.offline ? ' offline' : ''}</p>}</ClientAccessGate>);
beforeEach(() => { localStorage.clear(); setClientSession(null); vi.clearAllMocks(); mocks.hasTokens = true; mocks.userId = 'anna'; });
afterEach(() => { cleanup(); setClientSession(null); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('identità del client prima dei profili', () => {
  it('registra il client dopo il login senza richiedere un nome dispositivo', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    mocks.backend.mockImplementation(async (path: string) => path === '/v2/bootstrap' ? { protocol: 2, houseId: 'house', user, client: null, clients: [], profiles: [], sources: [] } : client);
    view();
    expect(await screen.findByText(client.label)).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Nome di questo dispositivo' })).not.toBeInTheDocument();
    expect(mocks.backend).toHaveBeenCalledWith('/v2/clients', expect.objectContaining({
      method: 'POST', body: expect.stringContaining('"label":"iPhone"'),
    }));
    expect(getClientSession()?.client.id).toBe('phone');
    expect(readCachedClientSession()?.user.id).toBe('anna');
  });
  it('preserva il nome scelto e lo stesso clientId quando riprova la registrazione', async () => {
    localStorage.setItem('tunet_device_label', 'Telefono personale');
    let registrations = 0;
    mocks.backend.mockImplementation(async (path: string) => {
      if (path === '/v2/bootstrap') return { protocol: 2, houseId: 'house', user, client: null, clients: [], profiles: [], sources: [] };
      if (++registrations === 1) throw Object.assign(new Error('Centrale temporaneamente offline'), { status: 503 });
      return client;
    });
    view();
    expect(await screen.findByRole('alert')).toHaveTextContent('temporaneamente offline');
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByText(client.label)).toBeVisible();
    const registrationsSent = mocks.backend.mock.calls.filter(([path]) => path === '/v2/clients');
    expect(registrationsSent).toHaveLength(2);
    expect(registrationsSent[0]?.[1]?.body).toBe(registrationsSent[1]?.[1]?.body);
    expect(JSON.parse(String(registrationsSent[0]?.[1]?.body))).toMatchObject({ label: 'Telefono personale' });
  });
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'PC Windows'],
    ['Mozilla/5.0 (Linux; Android 15; Tablet)', 'Tablet Android'],
    ['Mozilla/5.0 (Linux; Android 15; Mobile)', 'Telefono Android'],
    ['Mozilla/5.0 (iPad; CPU OS 18_0)', 'iPad'],
  ])('riconosce un nome automatico per %s', (agent, label) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(agent);
    expect(defaultClientLabel()).toBe(label);
  });
  it('riapre la sessione già nota e le bozze su503, senza crearne una al primo avvio', async () => {
    cacheClientSession(known);
    mocks.backend.mockRejectedValue(Object.assign(new Error('HA temporaneamente offline'), { status: 503 }));
    view();
    expect(await screen.findByText('Telefono di Anna offline')).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('non inventa una sessione nuova quando il primo collegamento fallisce', async () => {
    mocks.backend.mockRejectedValue(Object.assign(new Error('HA offline'), { status: 503 }));
    view();
    expect(await screen.findByRole('alert')).toHaveTextContent('HA offline');
    expect(getClientSession()).toBeNull();
    expect(screen.queryByText(client.label)).not.toBeInTheDocument();
  });
  it('non usa la cache per un rifiuto definitivo401', async () => {
    cacheClientSession(known);
    mocks.backend.mockRejectedValue(Object.assign(new Error('Accesso rifiutato'), { status: 401 }));
    view();
    expect(await screen.findByRole('alert')).toHaveTextContent('Accesso rifiutato');
    await waitFor(() => expect(getClientSession()).toBeNull());
    expect(readCachedClientSession()).toBeNull();
  });
  it('un nuovo accesso non eredita la cache privata di quello precedente', () => {
    cacheClientSession(known); expect(readCachedClientSession()).not.toBeNull();
    resetClientAccess(); expect(readCachedClientSession()).toBeNull();
  });
  it('rimuove la sessione nota quando la centrale conferma che è revocata', async () => {
    cacheClientSession(known);
    mocks.backend.mockResolvedValue({ protocol: 2, houseId: 'house', user,
      client: { ...client, revokedAt: '2026-11-02T12:00:00Z' }, clients: [], profiles: [], sources: [] });
    view();
    expect(await screen.findByRole('alert')).toHaveTextContent('Questo accesso è stato scollegato');
    expect(screen.queryByText(client.label)).not.toBeInTheDocument();
    expect(getClientSession()).toBeNull();
    expect(readCachedClientSession()).toBeNull();
  });
  it('genera identificativi anche quando randomUUID manca su HTTP LAN', () => {
    const original = crypto;
    vi.stubGlobal('crypto', { getRandomValues: original.getRandomValues.bind(original) });
    expect(newRequestId()).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  });
});
