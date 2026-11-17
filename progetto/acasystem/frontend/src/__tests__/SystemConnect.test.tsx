import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHassUrl } from '@/api/haUrl';
import { probeToken } from '@/pages/connect/connection';
import { ConnectPage } from '@/pages/connect';
import { TokenForm } from '@/pages/connect/TokenForm';

/**
 * Ingresso personale senza opzione token. Probe e TokenForm restano verificati separatamente
 * per compatibilità tecnica, senza renderli nel percorso di accesso.
 */

const mocks = vi.hoisted(() => ({
  createConnection: vi.fn(),
  acceptSession: vi.fn(),
  acceptToken: vi.fn(),
  setConfig: vi.fn(),
}));

vi.mock('home-assistant-js-websocket', async (importOriginal) => {
  const original = await importOriginal<typeof import('home-assistant-js-websocket')>();
  return {
    ...original,
    createConnection: mocks.createConnection,
    createLongLivedTokenAuth: (hassUrl: string) => ({ data: { hassUrl } }),
  };
});

vi.mock('@/hooks/context', () => ({
  useConfig: () => ({
    config: { url: '', fallbackUrl: '', token: '', authMethod: 'oauth' },
    setConfig: mocks.setConfig,
  }),
}));

vi.mock('@/hooks/useConnectionSetup', () => ({
  useConnectionSetup: () => ({
    method: 'oauth',
    acceptSession: mocks.acceptSession,
    acceptToken: mocks.acceptToken,
    logout: vi.fn(),
    openLogin: null,
    cancelLogin: null,
  }),
}));

const TOKEN = 'segreto-di-prova-123';

/** Answer of the proxy to the read-only check that explains a failed WebSocket. */
function stubProviders(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  mocks.createConnection.mockReset();
  mocks.acceptSession.mockReset();
  mocks.acceptToken.mockReset();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('probeToken', () => {
  it('apre la connessione di prova sull’hassUrl del proxy e la chiude', async () => {
    const close = vi.fn();
    mocks.createConnection.mockResolvedValueOnce({ close });
    await expect(probeToken(TOKEN)).resolves.toBe('ok');
    expect(mocks.createConnection).toHaveBeenCalledWith({
      auth: { data: { hassUrl: getHassUrl() } },
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it('distingue token rifiutato, Home Assistant che non risponde e server non configurato', async () => {
    mocks.createConnection.mockRejectedValueOnce(2);
    await expect(probeToken(TOKEN)).resolves.toBe('rejected');

    const providers = stubProviders(502, { code: 'HA_UNREACHABLE' });
    mocks.createConnection.mockRejectedValueOnce(1);
    await expect(probeToken(TOKEN)).resolves.toBe('unreachable');
    expect(String(providers.mock.calls[0]?.[0])).toBe(`${getHassUrl()}/auth/providers`);

    stubProviders(503, { code: 'HA_URL_NOT_CONFIGURED' });
    mocks.createConnection.mockRejectedValueOnce(1);
    await expect(probeToken(TOKEN)).resolves.toBe('not_configured');
  });

  it('considera irraggiungibile un collegamento che non risponde in tempo', async () => {
    stubProviders(200, { providers: [] });
    mocks.createConnection.mockReturnValueOnce(new Promise(() => undefined));
    await expect(probeToken(TOKEN, { timeoutMs: 10 })).resolves.toBe('unreachable');
  });
});

describe('ConnectPage', () => {
  it('mostra solo l’accesso personale e non altera credenziali legacy alla sola apertura', () => {
    localStorage.setItem('ha_token', TOKEN);
    localStorage.setItem('ha_auth_method', 'token');
    render(<ConnectPage />);
    expect(screen.getByRole('form', { name: 'Accesso' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Altre opzioni' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Token di accesso a lunga durata')).not.toBeInTheDocument();
    expect(localStorage.getItem('ha_token')).toBe(TOKEN);
    expect(localStorage.getItem('ha_auth_method')).toBe('token');
    expect(mocks.acceptToken).not.toHaveBeenCalled();
    expect(mocks.acceptSession).not.toHaveBeenCalled();
  });
});

describe('TokenForm standalone legacy, non raggiungibile da ConnectPage', () => {
  it('consegna il token verificato al chiamante', async () => {
    const accepted = vi.fn();
    mocks.createConnection.mockResolvedValueOnce({ close: vi.fn() });
    render(<TokenForm onAccepted={accepted} />);
    fireEvent.change(screen.getByLabelText('Token di accesso a lunga durata'), {
      target: { value: TOKEN },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Collega con il token' }));
    await waitFor(() => expect(accepted).toHaveBeenCalledWith(TOKEN));
    expect(mocks.acceptSession).not.toHaveBeenCalled();
  });

  it('non scrive il token rifiutato nei log né negli storage', async () => {
    const consoleCalls = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
      vi.spyOn(console, 'info'),
    ];
    mocks.createConnection.mockRejectedValueOnce(2);
    render(<TokenForm onAccepted={mocks.acceptToken} />);
    fireEvent.change(screen.getByLabelText('Token di accesso a lunga durata'), {
      target: { value: TOKEN },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Collega con il token' }));
    expect(await screen.findByText(/Home Assistant ha rifiutato il token/)).toBeVisible();
    expect(mocks.acceptToken).not.toHaveBeenCalled();
    for (const spy of consoleCalls) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(TOKEN);
    }
    const stored = [
      ...Object.keys(localStorage).map((key) => localStorage.getItem(key)),
      ...Object.keys(sessionStorage).map((key) => sessionStorage.getItem(key)),
    ].join('|');
    expect(stored).not.toContain(TOKEN);
  });
});
