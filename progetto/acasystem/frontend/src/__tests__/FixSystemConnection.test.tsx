import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthData } from 'home-assistant-js-websocket';
import { getClientId, getHassUrl } from '@/api/haUrl';
import { hasOAuthTokens, saveTokens } from '@/api/oauthStorage';
import { StatusBar } from '@/components/system/status-bar/StatusBar';
import { ConfigProvider } from '@/hooks/context/ConfigContext';
import { ConnectPage } from '@/pages/connect';
import { CREDENTIALS_NOTE } from '@/pages/connect/ConnectPage';
import { SystemPage } from '@/pages/system';
import { App } from '@/routes/AppRoot';
import { connectionSummary } from '@/utils/launcher/connection';

/**
 * REP-20261006-001, corsia sistema, aggiornato per REP-20261007-002 (ADR-0009): SEC-2 (sequenza
 * del verificatore sulla shell reale), DES-7 (stesso codice di connessione nella barra e in
 * Sistema), SEC-5 (testi sulle credenziali).
 * Reali: App, AppRoutes, SystemPage, ConnectPage, ConfigContext, useConnectionSetup, haLogin,
 * haSession e oauthStorage. Finti: Home Assistant dietro il proxy (fetch), il WebSocket di
 * prova del token, il provider di Home Assistant e i dati delle pagine.
 */

const mocks = vi.hoisted(() => ({
  meta: {} as Record<string, unknown>,
  pages: {} as Record<string, unknown>,
  createConnection: vi.fn(),
}));

vi.mock('home-assistant-js-websocket', async (importOriginal) => ({
  ...(await importOriginal<typeof import('home-assistant-js-websocket')>()),
  createConnection: mocks.createConnection,
}));

vi.mock('@/hooks/context', async () => {
  const { useConfig } = await import('@/hooks/context/ConfigContext');
  return {
    useConfig,
    usePages: () => mocks.pages,
    useHomeAssistantMeta: () => mocks.meta,
    useHomeAssistantEntities: () => ({}),
  };
});

// The live connection is not opened here: the app around it is real.
vi.mock('@/hooks/context/HomeAssistantContext', () => ({
  HomeAssistantProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useHomeAssistantMeta: () => mocks.meta,
}));

vi.mock('@/pages/launcher/LauncherPage', () => ({
  LauncherPage: ({ overlay }: { overlay?: ReactNode }) => (
    <div data-testid="launcher">{overlay}</div>
  ),
}));
vi.mock('@/api/profileApi', () => ({
  fetchProfiles: vi.fn(async () => []),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
}));
vi.mock('@/hooks/useSettingsSync', () => ({ useSettingsSync: () => ({ status: 'idle' }) }));
vi.mock('@/hooks/launcher/useSnapshotSetters', () => ({
  useSnapshotSetters: () => mocks.pages,
  useLauncherSettingsSync: () => ({ status: 'idle' }),
}));

const OAUTH_SLOT = 'tunet_auth_cache_v1';
const CUSTOMER = 'cliente';
const CUSTOMER_PASSWORD = 'password-cliente-di-prova';

function makePages() {
  return {
    pagesConfig: { pages: ['home'], header: [], home: [] },
    persistConfig: vi.fn(),
    statusPillsConfig: [],
    saveStatusPillsConfig: vi.fn(),
    headerTitle: 'Casa',
    updateHeaderTitle: vi.fn(),
    headerSettings: { showTitle: true, showClock: true },
    updateHeaderSettings: vi.fn(),
    launcherLayout: { version: 1, cover: { enabled: true }, pages: [] },
    persistLauncherLayout: vi.fn(),
  };
}

const installer = { id: 'u-installatore', name: 'Installatore', is_owner: true };

function connectedMeta(overrides: Record<string, unknown> = {}) {
  return {
    connected: true,
    entitiesLoaded: true,
    haUnavailable: false,
    haUnavailableVisible: false,
    oauthExpired: false,
    activeUrl: getHassUrl(),
    haUser: installer,
    ...overrides,
  };
}

/** The installer signed in with user and password on this tablet (step 1 of the verifier). */
function installerSession() {
  localStorage.setItem('ha_auth_method', 'oauth');
  const tokens: AuthData = {
    hassUrl: getHassUrl(),
    clientId: getClientId(),
    access_token: 'accesso-installatore',
    refresh_token: 'rinnovo-installatore',
    expires: Date.now() + 3_600_000,
    expires_in: 1800,
  };
  saveTokens(tokens);
}

interface Seen {
  method: string;
  path: string;
  body: Record<string, unknown>;
}

/** Home Assistant behind the Acasystem proxy, and the health route of the backend. */
function installFakeServer() {
  const seen: Seen[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = new URL(String(input), window.location.href);
      let body: Record<string, unknown> = {};
      if (init.body instanceof FormData) {
        body = Object.fromEntries(init.body.entries());
      } else if (typeof init.body === 'string') {
        try {
          body = JSON.parse(init.body) as Record<string, unknown>;
        } catch {
          body = Object.fromEntries(new URLSearchParams(init.body));
        }
      }
      seen.push({ method: init.method ?? 'GET', path: url.pathname, body });
      const json = (value: unknown, status = 200) =>
        new Response(JSON.stringify(value), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      switch (url.pathname) {
        case '/api/health':
          return json({ version: '9.9.9' });
        case '/ha/auth/providers':
          return json({
            providers: [{ name: 'Home Assistant Local', id: null, type: 'homeassistant' }],
          });
        case '/ha/auth/login_flow':
          return json({ type: 'form', flow_id: 'flusso-1', step_id: 'init', errors: {} });
        case '/ha/auth/login_flow/flusso-1':
          return body.username === CUSTOMER && body.password === CUSTOMER_PASSWORD
            ? json({ type: 'create_entry', flow_id: 'flusso-1', result: 'codice-cliente' })
            : json({
                type: 'form',
                flow_id: 'flusso-1',
                step_id: 'init',
                errors: { base: 'invalid_auth' },
              });
        case '/ha/auth/token':
          return json({
            access_token: 'accesso-cliente',
            refresh_token: 'rinnovo-cliente',
            expires_in: 1800,
            token_type: 'Bearer',
          });
        case '/ha/auth/revoke':
          return json({});
        default:
          return json({ error: 'Not found' }, 404);
      }
    })
  );
  return seen;
}

/** The current hash route of the app. */
function RouteProbe() {
  const { pathname } = useLocation();
  return <output data-testid="rotta">{pathname}</output>;
}

const renderApp = (path = '/sistema') =>
  render(
    <ConfigProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <RouteProbe />
      </MemoryRouter>
    </ConfigProvider>
  );

const route = () => screen.getByTestId('rotta').textContent;

const oauthStored = () =>
  localStorage.getItem(OAUTH_SLOT) !== null || sessionStorage.getItem(OAUTH_SLOT) !== null;

const revoked = (seen: Seen[]) =>
  seen.filter((call) => call.path === '/ha/auth/revoke').map((call) => call.body.token);

// Generous waits: the full suite runs these real-shell sequences under load (SR-9).
const WAIT = { timeout: 5_000 };
const loginHeading = () =>
  screen.findByRole('heading', { level: 1, name: 'Accedi ad Acasystem' }, WAIT);
const systemHeading = () => screen.findByRole('heading', { level: 1, name: 'Sistema' }, WAIT);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  mocks.pages = makePages();
  mocks.meta = connectedMeta();
  mocks.createConnection.mockReset();
  mocks.createConnection.mockResolvedValue({ close: vi.fn() });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SEC-2, sequenza del verificatore sulla shell reale', () => {
  it('token del cliente, Esci, ricarica e nuovo accesso non riattivano la sessione dell’installatore', async () => {
    const seen = installFakeServer();
    installerSession();
    const first = renderApp('/sistema');
    expect(await systemHeading()).toBeVisible();
    expect(screen.getByText('Utente e password')).toBeVisible();

    // 2. Collega di nuovo > Altre opzioni > token del cliente: the installer's session is closed.
    fireEvent.click(screen.getByRole('button', { name: 'Collega di nuovo' }));
    expect(await loginHeading()).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Altre opzioni' }));
    fireEvent.change(screen.getByLabelText('Token di accesso a lunga durata'), {
      target: { value: 'token-cliente' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Collega con il token' }));
    expect(await systemHeading()).toBeVisible();
    expect(screen.getByText('Token a lunga durata')).toBeVisible();
    expect(oauthStored()).toBe(false);
    expect(localStorage.getItem('ha_auth_method')).toBe('token');
    await waitFor(() => expect(revoked(seen)).toEqual(['rinnovo-installatore']));

    // 3. Esci: no credential is left and the login page opens.
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    expect(await loginHeading()).toBeVisible();
    expect(localStorage.getItem('ha_token')).toBeNull();
    expect(oauthStored()).toBe(false);
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull();

    // 4. Reload: still the login page, no session to reuse.
    first.unmount();
    const second = renderApp('/sistema');
    expect(await loginHeading()).toBeVisible();
    expect(screen.queryByRole('heading', { level: 1, name: 'Sistema' })).toBeNull();
    expect(hasOAuthTokens()).toBe(false);
    expect(localStorage.getItem('ha_token')).toBeNull();

    // 5. The customer signs in with user and password through Acasystem.
    fireEvent.change(screen.getByLabelText('Utente'), { target: { value: CUSTOMER } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: CUSTOMER_PASSWORD } });
    fireEvent.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await systemHeading()).toBeVisible();
    const stored = JSON.parse(localStorage.getItem(OAUTH_SLOT) ?? '{}') as Record<string, unknown>;
    expect(stored).toMatchObject({ hassUrl: getHassUrl(), refresh_token: 'rinnovo-cliente' });
    expect(revoked(seen)).toEqual(['rinnovo-installatore']);

    // 6. Reload: the customer's session opens the app, never the installer's.
    second.unmount();
    renderApp('/sistema');
    expect(await systemHeading()).toBeVisible();
    const everything = Object.keys(localStorage)
      .map((key) => `${key}=${localStorage.getItem(key)}`)
      .join('|');
    expect(everything).not.toContain('installatore');
    expect(everything).not.toContain(CUSTOMER_PASSWORD);
    expect(everything).not.toMatch(/ha_url|ha_fallback_url|8123/);
  }, 20_000);

  it('«Collega di nuovo» seguito da «Annulla» lascia attiva la sessione corrente', async () => {
    const seen = installFakeServer();
    installerSession();
    renderApp('/sistema');
    fireEvent.click(await screen.findByRole('button', { name: 'Collega di nuovo' }, WAIT));
    expect(await loginHeading()).toBeVisible();
    expect(route()).toBe('/sistema');
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(await systemHeading()).toBeVisible();
    expect(route()).toBe('/sistema');
    expect(oauthStored()).toBe(true);
    expect(localStorage.getItem('ha_auth_method')).toBe('oauth');
    expect(revoked(seen)).toEqual([]);
  });

  it('prende la sessione di un’altra scheda solo all’avvio, mai dopo «Esci»', async () => {
    installFakeServer();
    const otherTab = () =>
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'tunet_auth_sync_response_v1',
            newValue: JSON.stringify({
              type: 'oauth-token-response',
              tokens: {
                hassUrl: getHassUrl(),
                clientId: getClientId(),
                access_token: 'accesso-altra-scheda',
                refresh_token: 'rinnovo-altra-scheda',
                expires: Date.now() + 3_600_000,
                expires_in: 1800,
              },
            }),
          })
        );
      });

    renderApp('/sistema');
    expect(await loginHeading()).toBeVisible();
    otherTab();
    expect(await systemHeading()).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    expect(await loginHeading()).toBeVisible();
    otherTab();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Accedi ad Acasystem' })).toBeVisible();
    expect(screen.queryByRole('heading', { level: 1, name: 'Sistema' })).toBeNull();
  });

  it('i token del vecchio collegamento diretto non aprono l’app: serve un nuovo accesso', async () => {
    const seen = installFakeServer();
    localStorage.setItem('ha_url', 'http://ha.local:8123');
    localStorage.setItem('ha_auth_method', 'oauth');
    saveTokens({
      hassUrl: 'http://ha.local:8123',
      clientId: getClientId(),
      access_token: 'diretto',
      refresh_token: 'diretto-rinnovo',
      expires: Date.now() + 3_600_000,
      expires_in: 1800,
    });
    renderApp('/sistema');
    expect(await loginHeading()).toBeVisible();
    expect(localStorage.getItem('ha_url')).toBeNull();
    expect(oauthStored()).toBe(false);
    // SR-6: revoked on the Home Assistant that issued them (http://ha.local:8123/auth/revoke),
    // never through the proxy.
    await waitFor(() =>
      expect(seen.filter((call) => call.path === '/auth/revoke')).toEqual([
        { method: 'POST', path: '/auth/revoke', body: { token: 'diretto-rinnovo' } },
      ])
    );
    expect(revoked(seen)).toEqual([]);
  });
});

describe('F2, «Esci» da Sistema e nuovo accesso', () => {
  it('«Esci» riporta la rotta al launcher: il nuovo accesso apre il launcher, non Sistema', async () => {
    installFakeServer();
    installerSession();
    renderApp('/sistema');
    expect(await systemHeading()).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    expect(await loginHeading()).toBeVisible();
    await waitFor(() => expect(route()).toBe('/'), WAIT);
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Utente'), { target: { value: CUSTOMER } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: CUSTOMER_PASSWORD } });
    fireEvent.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByTestId('launcher', {}, WAIT)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Sistema' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 1, name: 'Accedi ad Acasystem' })).toBeNull();
    expect(route()).toBe('/');
  }, 20_000);
});

describe('DES-7, stesso codice di connessione nella barra e in Sistema', () => {
  const states: Record<string, Record<string, unknown>> = {
    collegato: connectedMeta(),
    connessione: connectedMeta({ connected: false, entitiesLoaded: false }),
    riconnessione: connectedMeta({ connected: false, haUnavailable: true }),
    'non raggiungibile': connectedMeta({
      connected: false,
      haUnavailable: true,
      haUnavailableVisible: true,
    }),
    'sessione scaduta': connectedMeta({
      connected: false,
      haUnavailable: true,
      haUnavailableVisible: true,
      oauthExpired: true,
    }),
  };

  for (const [name, meta] of Object.entries(states)) {
    it(`stato «${name}»: stessa parola, fase e colore`, () => {
      installFakeServer();
      mocks.meta = meta;
      const flags = {
        connected: meta.connected === true,
        entitiesLoaded: meta.entitiesLoaded === true,
        haUnavailableVisible: meta.haUnavailableVisible === true,
        oauthExpired: meta.oauthExpired === true,
      };
      // The bar as LauncherPage draws it.
      const bar = render(
        <StatusBar
          time={null}
          connection={connectionSummary(flags)}
          chips={[]}
          editMode={false}
          onToggleEdit={() => undefined}
          onOpenSystem={() => undefined}
        />
      );
      const barStatus = bar.container.querySelector('.aca-connection');
      const system = render(
        <ConfigProvider>
          <SystemPage onClose={() => undefined} />
        </ConfigProvider>
      );
      const systemStatus = system.container.querySelector('.aca-connection');
      expect(barStatus).not.toBeNull();
      expect(systemStatus?.className).toBe(barStatus?.className);
      expect(systemStatus?.textContent).toBe(barStatus?.textContent);
    });
  }

  it('la connessione attiva si chiama «Collegato» con il LED informativo', () => {
    installFakeServer();
    mocks.meta = connectedMeta();
    const { container } = render(
      <ConfigProvider>
        <SystemPage onClose={() => undefined} />
      </ConfigProvider>
    );
    const status = container.querySelector('.aca-connection');
    expect(status).toHaveClass('aca-connection--connected');
    expect(status).toHaveTextContent('Collegato');
    expect(screen.queryByText('Connesso')).toBeNull();
  });
});

describe('SEC-5, testi sulle credenziali', () => {
  it('dice dove vanno le credenziali e cosa resta nel browser, senza «restano su questo dispositivo»', () => {
    installFakeServer();
    render(
      <ConfigProvider>
        <ConnectPage />
      </ConfigProvider>
    );
    expect(screen.getByText(CREDENTIALS_NOTE)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Altre opzioni' }));
    expect(
      screen.getByText(
        'Per i tablet fissi in modalità kiosk. Crealo nel tuo profilo di Home Assistant, nella scheda Sicurezza.'
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        'Il token resta salvato in questo browser e arriva a Home Assistant attraverso il server Acasystem, che lo usa anche per riconoscere l’utente. Non viene registrato nei log.'
      )
    ).toBeVisible();
    expect(document.body.textContent).not.toMatch(/rest[ao]n?o? su questo dispositivo/i);
  });
});
