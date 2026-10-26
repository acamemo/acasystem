import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHassUrl } from '@/api/haUrl';
import {
  ConfigProvider,
  ConnectPageControlProvider,
  type ConnectPageControl,
} from '@/hooks/context/ConfigContext';
import { ConnectPage } from '@/pages/connect';
import { CREDENTIALS_NOTE } from '@/pages/connect/ConnectPage';

/**
 * REP-20261007-002, corsia accesso: pagina di accesso Acasystem con utente e password, codice a
 * due fattori, errori in linea, focus e tastiera, token a lunga durata sotto «Altre opzioni».
 * Reali: ConnectPage, LoginForm, TokenForm, useHaLogin, haLogin, haSession, oauthStorage,
 * ConfigContext. Finti: Home Assistant dietro il proxy (fetch) e il WebSocket del token.
 */

const mocks = vi.hoisted(() => ({ createConnection: vi.fn() }));

vi.mock('home-assistant-js-websocket', async (importOriginal) => ({
  ...(await importOriginal<typeof import('home-assistant-js-websocket')>()),
  createConnection: mocks.createConnection,
}));

const USER = 'mario';
const PASSWORD = 'password-di-prova-9';
const MFA_CODE = '123456';
const KIOSK_TOKEN = 'token-kiosk-di-prova';
const OAUTH_SLOT = 'tunet_auth_cache_v1';

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> };

interface Call {
  method: string;
  path: string;
  body: Record<string, unknown>;
}

/** Finto Home Assistant dietro il proxy `/ha`; `fail` sostituisce le risposte di login. */
function installFakeHa({ mfa = false, fail }: { mfa?: boolean; fail?: Reply } = {}) {
  const calls: Call[] = [];
  let mfaStep = false;
  let pending: (() => void) | null = null;
  const gate = { hold: false };

  const reply = (call: Call): Reply => {
    if (fail && call.path.startsWith('/ha/auth/login_flow')) return fail;
    if (fail && call.path === '/ha/auth/providers') return fail;
    if (call.path === '/ha/auth/providers') {
      return {
        body: { providers: [{ name: 'Home Assistant Local', id: null, type: 'homeassistant' }] },
      };
    }
    if (call.path === '/ha/auth/login_flow') {
      mfaStep = false;
      return { body: { type: 'form', flow_id: 'flusso-1', step_id: 'init', errors: {} } };
    }
    if (call.path === '/ha/auth/login_flow/flusso-1' && call.method === 'DELETE')
      return { body: {} };
    if (call.path === '/ha/auth/login_flow/flusso-1') {
      if (mfaStep) {
        return call.body.code === MFA_CODE
          ? { body: { type: 'create_entry', flow_id: 'flusso-1', result: 'codice-1' } }
          : {
              body: {
                type: 'form',
                flow_id: 'flusso-1',
                step_id: 'mfa',
                errors: { base: 'invalid_code' },
              },
            };
      }
      if (call.body.username !== USER || call.body.password !== PASSWORD) {
        return {
          body: {
            type: 'form',
            flow_id: 'flusso-1',
            step_id: 'init',
            errors: { base: 'invalid_auth' },
          },
        };
      }
      if (mfa) {
        mfaStep = true;
        return { body: { type: 'form', flow_id: 'flusso-1', step_id: 'mfa', errors: {} } };
      }
      return { body: { type: 'create_entry', flow_id: 'flusso-1', result: 'codice-1' } };
    }
    if (call.path === '/ha/auth/token') {
      return {
        body: {
          access_token: 'accesso-1',
          refresh_token: 'rinnovo-1',
          expires_in: 1800,
          token_type: 'Bearer',
        },
      };
    }
    return { status: 404, body: { error: 'Not found' } };
  };

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), window.location.href);
    let body: Record<string, unknown> = {};
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body) as Record<string, unknown>;
      } catch {
        body = Object.fromEntries(new URLSearchParams(init.body));
      }
    }
    const call = { method: init.method ?? 'GET', path: url.pathname, body };
    calls.push(call);
    if (gate.hold) await new Promise<void>((resolve) => (pending = resolve));
    const result = reply(call);
    return new Response(JSON.stringify(result.body ?? {}), {
      status: result.status ?? 200,
      headers: { 'Content-Type': 'application/json', ...result.headers },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return {
    calls,
    gate,
    release: () => {
      pending?.();
      pending = null;
    },
  };
}

function renderPage({
  control = null,
  onConnected = vi.fn(),
}: { control?: ConnectPageControl | null; onConnected?: () => void } = {}) {
  const wrap = (children: ReactNode) =>
    control ? (
      <ConnectPageControlProvider value={control}>{children}</ConnectPageControlProvider>
    ) : (
      children
    );
  render(<ConfigProvider>{wrap(<ConnectPage onConnected={onConnected} />)}</ConfigProvider>);
  return { onConnected };
}

const usernameField = () => screen.getByLabelText('Utente');
const passwordField = () => screen.getByLabelText('Password');

function fillCredentials(username = USER, password = PASSWORD) {
  fireEvent.change(usernameField(), { target: { value: username } });
  fireEvent.change(passwordField(), { target: { value: password } });
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Accedi' }));

const allStored = () =>
  [
    ...Object.keys(localStorage).map((key) => `${key}=${localStorage.getItem(key)}`),
    ...Object.keys(sessionStorage).map((key) => `${key}=${sessionStorage.getItem(key)}`),
  ].join('|');

let consoleSpies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mocks.createConnection.mockReset();
  consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation(() => undefined)
  );
});

afterEach(() => {
  for (const spy of consoleSpies) {
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain(KIOSK_TOKEN);
  }
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('pagina di accesso', () => {
  it('chiede utente e password, senza indirizzi, con il focus sul primo campo', () => {
    installFakeHa();
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Accedi ad Acasystem' })).toBeVisible();
    expect(usernameField()).toHaveFocus();
    expect(usernameField()).toHaveAttribute('autocomplete', 'username');
    expect(passwordField()).toHaveAttribute('type', 'password');
    expect(passwordField()).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.queryByText(CREDENTIALS_NOTE)).toBeNull();
    expect(screen.queryByText(/indirizzo/i)).toBeNull();
    expect(screen.queryByRole('textbox', { name: /indirizzo/i })).toBeNull();
    // No «Annulla» without a session to go back to.
    expect(screen.queryByRole('button', { name: 'Annulla' })).toBeNull();
  });

  it('segnala i campi vuoti in linea e mette il focus su quello da completare', () => {
    const ha = installFakeHa();
    renderPage();
    submit();
    expect(screen.getByText('Scrivi il nome utente.')).toBeVisible();
    expect(usernameField()).toHaveFocus();
    expect(usernameField()).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(usernameField(), { target: { value: USER } });
    submit();
    expect(screen.getByText('Scrivi la password.')).toBeVisible();
    expect(passwordField()).toHaveFocus();
    expect(ha.calls).toHaveLength(0);
  });

  it('con la tastiera: ordine dei comandi e invio del modulo con Invio', async () => {
    installFakeHa();
    const { onConnected } = renderPage();
    const order = [
      usernameField(),
      passwordField(),
      screen.getByRole('button', { name: 'Mostra password' }),
      screen.getByRole('button', { name: 'Accedi' }),
      screen.getByRole('button', { name: 'Altre opzioni' }),
    ];
    for (let index = 1; index < order.length; index += 1) {
      expect(
        order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Accedi' })).toHaveAttribute('type', 'submit');
    fillCredentials();
    // Enter in a field submits the form (implicit submission).
    fireEvent.submit(screen.getByRole('form', { name: 'Accesso' }));
    await waitFor(() => expect(onConnected).toHaveBeenCalledOnce());
  });

  it('mostra e nasconde la password con il pulsante occhio', () => {
    installFakeHa();
    renderPage();
    const toggle = screen.getByRole('button', { name: 'Mostra password' });
    expect(toggle).toBeVisible();
    expect(passwordField()).toHaveAttribute('type', 'password');

    fireEvent.click(toggle);
    expect(passwordField()).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Nascondi password' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Nascondi password' }));
    expect(passwordField()).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Mostra password' })).toBeVisible();
  });

  it('credenziali errate: messaggio in linea, password svuotata e di nuovo a fuoco', async () => {
    installFakeHa();
    const { onConnected } = renderPage();
    fillCredentials(USER, 'sbagliata');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Utente o password non corretti. Controlla e riprova.'
    );
    expect(passwordField()).toHaveValue('');
    expect(passwordField()).toHaveFocus();
    expect(usernameField()).toHaveValue(USER);
    expect(onConnected).not.toHaveBeenCalled();
    expect(localStorage.getItem(OAUTH_SLOT)).toBeNull();
  });

  it('accesso riuscito: salva solo i token della sessione per il proxy', async () => {
    installFakeHa();
    localStorage.setItem('ha_url', 'http://homeassistant.local:8123');
    localStorage.setItem('ha_token', 'vecchio-token');
    const { onConnected } = renderPage();
    fillCredentials();
    submit();
    await waitFor(() => expect(onConnected).toHaveBeenCalledOnce());

    const stored = JSON.parse(localStorage.getItem(OAUTH_SLOT) ?? '{}') as Record<string, unknown>;
    expect(stored).toMatchObject({
      hassUrl: getHassUrl(),
      clientId: `${window.location.origin}/`,
      access_token: 'accesso-1',
      refresh_token: 'rinnovo-1',
    });
    expect(localStorage.getItem('ha_auth_method')).toBe('oauth');
    expect(localStorage.getItem('ha_token')).toBeNull();
    expect(localStorage.getItem('ha_url')).toBeNull();
    expect(allStored()).not.toContain(PASSWORD);
    expect(allStored()).not.toContain(`"${USER}"`);
  });

  it('mostra l’attesa e ignora un secondo invio', async () => {
    const ha = installFakeHa();
    ha.gate.hold = true;
    const { onConnected } = renderPage();
    fillCredentials();
    submit();
    const button = screen.getByRole('button', { name: 'Accedi' });
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByRole('status')).toHaveTextContent('Accesso in corso…');
    submit();
    fireEvent.submit(screen.getByRole('form', { name: 'Accesso' }));
    expect(ha.calls).toHaveLength(1);
    ha.gate.hold = false;
    await act(async () => {
      ha.release();
    });
    await waitFor(() => expect(onConnected).toHaveBeenCalledOnce());
    expect(ha.calls.filter((call) => call.path === '/ha/auth/login_flow')).toHaveLength(1);
  });

  it.each([
    [
      { status: 429, body: { error: 'Too many attempts' }, headers: { 'Retry-After': '300' } },
      'Troppi tentativi di accesso. Riprova tra 5 minuti.',
    ],
    [
      { status: 502, body: { error: 'Bad gateway', code: 'HA_UNREACHABLE' } },
      'Home Assistant non risponde. Controlla che sia acceso e raggiungibile dal server Acasystem, poi riprova.',
    ],
    [
      { status: 503, body: { error: 'Not configured', code: 'HA_URL_NOT_CONFIGURED' } },
      'Il server Acasystem non sa ancora dove si trova Home Assistant. Chi lo ha installato deve indicarne l’indirizzo nella configurazione del server.',
    ],
  ])('errore %#: messaggio chiaro e password conservata per riprovare', async (fail, message) => {
    installFakeHa({ fail });
    renderPage();
    fillCredentials();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(passwordField()).toHaveValue(PASSWORD);
  });
});

describe('codice a due fattori', () => {
  it('chiede il codice, segnala quello errato e completa l’accesso', async () => {
    installFakeHa({ mfa: true });
    const { onConnected } = renderPage();
    fillCredentials();
    submit();
    const code = await screen.findByLabelText('Codice di verifica');
    await waitFor(() => expect(code).toHaveFocus());
    expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    expect(code).toHaveAttribute('inputmode', 'numeric');
    expect(screen.queryByLabelText('Password')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Verifica' }));
    expect(screen.getByText('Scrivi il codice.')).toBeVisible();

    fireEvent.change(code, { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verifica' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Codice non corretto\./);
    expect(screen.getByLabelText('Codice di verifica')).toHaveValue('');
    expect(screen.getByLabelText('Codice di verifica')).toHaveFocus();

    fireEvent.change(screen.getByLabelText('Codice di verifica'), { target: { value: MFA_CODE } });
    fireEvent.submit(screen.getByRole('form', { name: 'Verifica in due passaggi' }));
    await waitFor(() => expect(onConnected).toHaveBeenCalledOnce());
    expect(localStorage.getItem(OAUTH_SLOT)).toContain('rinnovo-1');
  });

  it('«Indietro» abbandona il flusso e torna a utente e password', async () => {
    const ha = installFakeHa({ mfa: true });
    renderPage();
    fillCredentials();
    submit();
    await screen.findByLabelText('Codice di verifica');
    const back = screen.getByRole('button', { name: 'Indietro' });
    fireEvent.click(back);
    expect(await screen.findByLabelText('Utente')).toHaveValue(USER);
    expect(passwordField()).toHaveValue('');
    // The click on «Indietro» does not submit the credentials step that replaces it: in a
    // browser the click ends after React re-renders, so the pressed button must not become
    // the «Accedi» submit button (jsdom cannot show the submission itself).
    expect(back.isConnected).toBe(false);
    expect(screen.getByRole('button', { name: 'Accedi' })).not.toBe(back);
    expect(screen.queryByText('Scrivi la password.')).toBeNull();
    expect(passwordField()).not.toHaveAttribute('aria-invalid');
    await waitFor(() => expect(passwordField()).toHaveFocus());
    await waitFor(() =>
      expect(ha.calls.at(-1)).toMatchObject({
        method: 'DELETE',
        path: '/ha/auth/login_flow/flusso-1',
      })
    );
  });
});

describe('altre opzioni: token a lunga durata', () => {
  const openOptions = () => {
    const toggle = screen.getByRole('button', { name: 'Altre opzioni' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  };

  it('verifica il token attraverso il proxy e lo salva per il kiosk', async () => {
    installFakeHa();
    const close = vi.fn();
    mocks.createConnection.mockResolvedValueOnce({ close });
    const { onConnected } = renderPage();
    openOptions();
    const field = screen.getByLabelText('Token di accesso a lunga durata');
    expect(field).toHaveAttribute('type', 'password');
    expect(
      screen.getByText(
        'Il token resta salvato in questo browser e arriva a Home Assistant attraverso il server Acasystem, che lo usa anche per riconoscere l’utente. Non viene registrato nei log.'
      )
    ).toBeVisible();
    fireEvent.change(field, { target: { value: KIOSK_TOKEN } });
    fireEvent.click(screen.getByRole('button', { name: 'Collega con il token' }));
    await waitFor(() => expect(onConnected).toHaveBeenCalledOnce());

    const options = mocks.createConnection.mock.calls[0]?.[0] as {
      auth: { wsUrl: string; accessToken: string };
    };
    expect(options.auth.wsUrl).toBe(`ws://${window.location.host}/ha/api/websocket`);
    expect(close).toHaveBeenCalled();
    expect(localStorage.getItem('ha_token')).toBe(KIOSK_TOKEN);
    expect(localStorage.getItem('ha_auth_method')).toBe('token');
  });

  it('spiega un token rifiutato senza salvarlo', async () => {
    installFakeHa();
    mocks.createConnection.mockRejectedValueOnce(2);
    const { onConnected } = renderPage();
    openOptions();
    fireEvent.change(screen.getByLabelText('Token di accesso a lunga durata'), {
      target: { value: KIOSK_TOKEN },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Collega con il token' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Home Assistant ha rifiutato il token\./
    );
    expect(onConnected).not.toHaveBeenCalled();
    expect(allStored()).not.toContain(KIOSK_TOKEN);
  });

  it('distingue il server non configurato da Home Assistant che non risponde', async () => {
    installFakeHa({ fail: { status: 503, body: { code: 'HA_URL_NOT_CONFIGURED' } } });
    mocks.createConnection.mockRejectedValueOnce(1);
    renderPage();
    openOptions();
    fireEvent.change(screen.getByLabelText('Token di accesso a lunga durata'), {
      target: { value: KIOSK_TOKEN },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Collega con il token' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Il server Acasystem non sa ancora dove si trova Home Assistant/
    );
  });

  it('chiede il token quando manca', () => {
    installFakeHa();
    renderPage();
    openOptions();
    fireEvent.click(screen.getByRole('button', { name: 'Collega con il token' }));
    expect(screen.getByText('Incolla il token di accesso.')).toBeVisible();
    expect(screen.getByLabelText('Token di accesso a lunga durata')).toHaveFocus();
    expect(mocks.createConnection).not.toHaveBeenCalled();
  });
});

describe('ritorno all’app', () => {
  it('«Annulla» torna all’app quando la pagina è aperta con una sessione attiva', () => {
    installFakeHa();
    const cancel = vi.fn();
    renderPage({ control: { open: vi.fn(), cancel } });
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(cancel).toHaveBeenCalledOnce();
  });
});
