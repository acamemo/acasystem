import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HaLoginError,
  cancelLoginFlow,
  exchangeAuthCode,
  loginErrorMessage,
  loginWithPassword,
  parseRetryAfter,
  startLoginFlow,
  submitMfaCode,
  type LoginStep,
  type LoginTarget,
} from '@/api/haLogin';

/**
 * REP-20261007-002, corsia accesso: client dell'API di login di Home Assistant attraverso il
 * proxy `/ha`, contro un finto Home Assistant (fetch finto). Nessuna richiesta all'HA reale.
 */

const HASS_URL = 'http://acasystem.test:3002/ha';
const CLIENT_ID = 'http://acasystem.test:3002/';
const USER = 'mario';
const PASSWORD = 'password-di-prova-9';
const MFA_CODE = '123456';

interface FakeCall {
  method: string;
  path: string;
  body: Record<string, unknown>;
  contentType: string;
}

interface Reply {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

function readBody(body: BodyInit | null | undefined): Record<string, unknown> {
  if (typeof body !== 'string') return {};
  try {
    const parsed: unknown = JSON.parse(body);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return Object.fromEntries(new URLSearchParams(body));
  }
}

function readHeader(headers: HeadersInit | undefined, name: string): string {
  if (!headers) return '';
  return new Headers(headers).get(name) ?? '';
}

/** Finto Home Assistant dietro il proxy: flussi in memoria, credenziali e codice di prova. */
function fakeHomeAssistant({
  mfa = false,
  providers = { providers: [{ name: 'Home Assistant Local', id: null, type: 'homeassistant' }] },
  override,
}: {
  mfa?: boolean;
  providers?: unknown;
  override?: (call: FakeCall) => Reply | undefined;
} = {}) {
  const calls: FakeCall[] = [];
  const flows = new Map<string, 'init' | 'mfa'>();
  let next = 0;

  const route = (call: FakeCall): Reply => {
    const custom = override?.(call);
    if (custom) return custom;
    if (call.method === 'GET' && call.path === '/ha/auth/providers') return { body: providers };
    if (call.method === 'POST' && call.path === '/ha/auth/login_flow') {
      next += 1;
      const flowId = `flusso-${next}`;
      flows.set(flowId, 'init');
      return { body: { type: 'form', flow_id: flowId, step_id: 'init', errors: {} } };
    }
    const match = /^\/ha\/auth\/login_flow\/(.+)$/.exec(call.path);
    if (match) {
      const flowId = decodeURIComponent(match[1]);
      const step = flows.get(flowId);
      if (call.method === 'DELETE') {
        flows.delete(flowId);
        return { body: 'Flow aborted' };
      }
      if (!step) return { status: 404, body: { message: 'Invalid flow specified' } };
      if (step === 'init') {
        if (call.body.username === USER && call.body.password === PASSWORD) {
          if (mfa) {
            flows.set(flowId, 'mfa');
            return { body: { type: 'form', flow_id: flowId, step_id: 'mfa', errors: {} } };
          }
          flows.delete(flowId);
          return { body: { type: 'create_entry', flow_id: flowId, result: 'codice-1' } };
        }
        return {
          body: {
            type: 'form',
            flow_id: flowId,
            step_id: 'init',
            errors: { base: 'invalid_auth' },
          },
        };
      }
      if (call.body.code === MFA_CODE) {
        flows.delete(flowId);
        return { body: { type: 'create_entry', flow_id: flowId, result: 'codice-1' } };
      }
      return {
        body: { type: 'form', flow_id: flowId, step_id: 'mfa', errors: { base: 'invalid_code' } },
      };
    }
    if (call.method === 'POST' && call.path === '/ha/auth/token') {
      if (call.body.grant_type === 'authorization_code' && call.body.code === 'codice-1') {
        return {
          body: {
            access_token: 'accesso-1',
            token_type: 'Bearer',
            refresh_token: 'rinnovo-1',
            expires_in: 1800,
          },
        };
      }
      return { status: 400, body: { error: 'invalid_request' } };
    }
    return { status: 404, body: { error: 'Not found' } };
  };

  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const call: FakeCall = {
      method: init.method ?? 'GET',
      path: url.pathname,
      body: readBody(init.body),
      contentType: readHeader(init.headers, 'Content-Type'),
    };
    calls.push(call);
    const reply = route(call);
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json', ...reply.headers },
    });
  });

  const target: LoginTarget = {
    hassUrl: HASS_URL,
    clientId: CLIENT_ID,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  };
  return { calls, target, fetchImpl };
}

const expectError = async (promise: Promise<unknown>, code: string) => {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason
  );
  expect(error).toBeInstanceOf(HaLoginError);
  expect((error as HaLoginError).code).toBe(code);
  return error as HaLoginError;
};

let consoleSpies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
  consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation(() => undefined)
  );
});

afterEach(() => {
  // Credentials never reach the console, whatever happened in the test.
  for (const spy of consoleSpies) {
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain(MFA_CODE);
  }
  vi.restoreAllMocks();
});

describe('accesso riuscito', () => {
  it('fornitori, flusso, credenziali e scambio del codice passano dal proxy', async () => {
    const ha = fakeHomeAssistant();
    const before = Date.now();
    const step = await loginWithPassword(ha.target, { username: USER, password: PASSWORD });

    expect(ha.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'GET /ha/auth/providers',
      'POST /ha/auth/login_flow',
      'POST /ha/auth/login_flow/flusso-1',
      'POST /ha/auth/token',
    ]);
    expect(ha.calls[1].body).toEqual({
      client_id: CLIENT_ID,
      handler: ['homeassistant', null],
      redirect_uri: CLIENT_ID,
    });
    expect(ha.calls[2].body).toEqual({ client_id: CLIENT_ID, username: USER, password: PASSWORD });
    expect(ha.calls[3].contentType).toBe('application/x-www-form-urlencoded');
    expect(ha.calls[3].body).toEqual({
      grant_type: 'authorization_code',
      code: 'codice-1',
      client_id: CLIENT_ID,
    });

    expect(step.type).toBe('done');
    const tokens = (step as Extract<LoginStep, { type: 'done' }>).tokens;
    expect(tokens).toMatchObject({
      hassUrl: HASS_URL,
      clientId: CLIENT_ID,
      access_token: 'accesso-1',
      refresh_token: 'rinnovo-1',
      expires_in: 1800,
    });
    expect(tokens.expires).toBeGreaterThanOrEqual(before + 1_800_000);
  });

  it('accetta anche l’elenco dei fornitori delle versioni precedenti di Home Assistant', async () => {
    const ha = fakeHomeAssistant({
      providers: [
        { name: 'Reti fidate', id: null, type: 'trusted_networks' },
        { name: 'Home Assistant Local', id: null, type: 'homeassistant' },
      ],
    });
    const step = await loginWithPassword(ha.target, { username: USER, password: PASSWORD });
    expect(step.type).toBe('done');
    expect(ha.calls[1].body.handler).toEqual(['homeassistant', null]);
  });

  it('senza un fornitore con utente e password spiega che l’accesso non è disponibile', async () => {
    const ha = fakeHomeAssistant({
      providers: { providers: [{ name: 'Reti fidate', id: null, type: 'trusted_networks' }] },
    });
    await expectError(startLoginFlow(ha.target), 'no_provider');
    expect(ha.calls).toHaveLength(1);
  });
});

describe('credenziali e codice', () => {
  it('credenziali errate: errore in linea e stesso flusso al tentativo successivo', async () => {
    const ha = fakeHomeAssistant();
    const first = await loginWithPassword(ha.target, { username: USER, password: 'sbagliata' });
    expect(first).toEqual({ type: 'credentials', flowId: 'flusso-1', error: 'invalid_auth' });

    const second = await loginWithPassword(
      ha.target,
      { username: USER, password: PASSWORD },
      'flusso-1'
    );
    expect(second.type).toBe('done');
    // No new providers request nor a new flow: the refused flow is still valid.
    expect(ha.calls.filter((call) => call.path === '/ha/auth/login_flow')).toHaveLength(1);
  });

  it('un flusso scaduto viene sostituito una volta sola', async () => {
    const ha = fakeHomeAssistant();
    const step = await loginWithPassword(
      ha.target,
      { username: USER, password: PASSWORD },
      'flusso-perso'
    );
    expect(step.type).toBe('done');
    expect(ha.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /ha/auth/login_flow/flusso-perso',
      'GET /ha/auth/providers',
      'POST /ha/auth/login_flow',
      'POST /ha/auth/login_flow/flusso-1',
      'POST /ha/auth/token',
    ]);
  });

  it('due fattori: chiede il codice, segnala quello errato e accetta quello giusto', async () => {
    const ha = fakeHomeAssistant({ mfa: true });
    const step = await loginWithPassword(ha.target, { username: USER, password: PASSWORD });
    expect(step).toEqual({ type: 'mfa', flowId: 'flusso-1', error: null });

    const wrong = await submitMfaCode(ha.target, 'flusso-1', '000000');
    expect(wrong).toEqual({ type: 'mfa', flowId: 'flusso-1', error: 'invalid_code' });

    const done = await submitMfaCode(ha.target, 'flusso-1', MFA_CODE);
    expect(done.type).toBe('done');
    expect(ha.calls.at(-2)?.body).toEqual({ client_id: CLIENT_ID, code: MFA_CODE });
  });

  it('con più secondi fattori sceglie il primo e chiede il codice', async () => {
    const ha = fakeHomeAssistant({
      mfa: true,
      override: (call) =>
        call.path === '/ha/auth/login_flow/flusso-1' && call.body.username === USER
          ? {
              body: {
                type: 'form',
                flow_id: 'flusso-1',
                step_id: 'select_mfa_module',
                data_schema: [
                  {
                    name: 'multi_factor_auth_module',
                    type: 'select',
                    options: [
                      ['totp', 'App di autenticazione'],
                      ['notify', 'Notifica'],
                    ],
                  },
                ],
                errors: {},
              },
            }
          : call.path === '/ha/auth/login_flow/flusso-1' && call.body.multi_factor_auth_module
            ? { body: { type: 'form', flow_id: 'flusso-1', step_id: 'mfa', errors: {} } }
            : undefined,
    });
    const step = await loginWithPassword(ha.target, { username: USER, password: PASSWORD });
    expect(step).toEqual({ type: 'mfa', flowId: 'flusso-1', error: null });
    expect(ha.calls.at(-1)?.body).toEqual({
      client_id: CLIENT_ID,
      multi_factor_auth_module: 'totp',
    });
  });

  it('richiesta scaduta o troppi codici errati: si ricomincia', async () => {
    const expired = fakeHomeAssistant({
      override: () => ({ body: { type: 'abort', flow_id: 'flusso-1', reason: 'login_expired' } }),
    });
    await expectError(submitMfaCode(expired.target, 'flusso-1', MFA_CODE), 'expired');

    const tooMany = fakeHomeAssistant({
      override: () => ({ body: { type: 'abort', flow_id: 'flusso-1', reason: 'too_many_retry' } }),
    });
    const error = await expectError(
      submitMfaCode(tooMany.target, 'flusso-1', MFA_CODE),
      'too_many_codes'
    );
    expect(error.message).toBe('Troppi codici non corretti. Inserisci di nuovo utente e password.');

    const gone = fakeHomeAssistant();
    await expectError(submitMfaCode(gone.target, 'flusso-perso', MFA_CODE), 'expired');
  });

  it('«Indietro» abbandona il flusso con DELETE e ignora gli errori', async () => {
    const ha = fakeHomeAssistant({ mfa: true });
    await loginWithPassword(ha.target, { username: USER, password: PASSWORD });
    await cancelLoginFlow(ha.target, 'flusso-1');
    expect(ha.calls.at(-1)).toMatchObject({
      method: 'DELETE',
      path: '/ha/auth/login_flow/flusso-1',
    });

    const offline: LoginTarget = {
      ...ha.target,
      fetchImpl: vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }) as unknown as typeof fetch,
    };
    await expect(cancelLoginFlow(offline, 'flusso-1')).resolves.toBeUndefined();
  });
});

describe('errori del proxy e di Home Assistant', () => {
  const failing = (reply: Reply) => fakeHomeAssistant({ override: () => reply });

  it('429: troppi tentativi, con l’attesa indicata dal server', async () => {
    const error = await expectError(
      loginWithPassword(
        failing({
          status: 429,
          body: { error: 'Too many login attempts' },
          headers: { 'Retry-After': '120' },
        }).target,
        {
          username: USER,
          password: PASSWORD,
        }
      ),
      'rate_limited'
    );
    expect(error.retryAfterSeconds).toBe(120);
    expect(loginErrorMessage(error)).toBe('Troppi tentativi di accesso. Riprova tra 2 minuti.');
    expect(loginErrorMessage(new HaLoginError('rate_limited', 30))).toBe(
      'Troppi tentativi di accesso. Riprova tra meno di un minuto.'
    );
    expect(loginErrorMessage(new HaLoginError('rate_limited'))).toBe(
      'Troppi tentativi di accesso. Attendi qualche minuto e riprova.'
    );
  });

  it('502: Home Assistant non raggiungibile dal server', async () => {
    const error = await expectError(
      startLoginFlow(
        failing({ status: 502, body: { error: 'Bad gateway', code: 'HA_UNREACHABLE' } }).target
      ),
      'unreachable'
    );
    expect(error.message).toMatch(/^Home Assistant non risponde\./);
  });

  it('503: server Acasystem senza l’indirizzo di Home Assistant', async () => {
    const error = await expectError(
      startLoginFlow(
        failing({ status: 503, body: { error: 'Not configured', code: 'HA_URL_NOT_CONFIGURED' } })
          .target
      ),
      'not_configured'
    );
    expect(error.message).toMatch(
      /^Il server Acasystem non sa ancora dove si trova Home Assistant/
    );
  });

  it('rete assente, utente bloccato, configurazione iniziale e risposte inattese', async () => {
    const offline: LoginTarget = {
      hassUrl: HASS_URL,
      clientId: CLIENT_ID,
      fetchImpl: vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }) as unknown as typeof fetch,
    };
    await expectError(startLoginFlow(offline), 'unreachable');
    await expectError(startLoginFlow(failing({ status: 403, body: {} }).target), 'blocked');
    await expectError(
      startLoginFlow(
        failing({ status: 400, body: { message: 'x', message_code: 'onboarding_required' } }).target
      ),
      'onboarding'
    );
    await expectError(startLoginFlow(failing({ status: 500, body: {} }).target), 'unexpected');
    await expectError(startLoginFlow(failing({ body: { strano: true } }).target), 'unexpected');
  });

  it('codice già usato o risposta dei token incompleta', async () => {
    const ha = fakeHomeAssistant();
    await expectError(exchangeAuthCode(ha.target, 'codice-vecchio'), 'expired');
    const partial = fakeHomeAssistant({
      override: (call) =>
        call.path === '/ha/auth/token' ? { body: { access_token: 'solo-accesso' } } : undefined,
    });
    await expectError(exchangeAuthCode(partial.target, 'codice-1'), 'unexpected');
  });

  it('i messaggi non contengono le credenziali', async () => {
    const ha = fakeHomeAssistant();
    const step = await loginWithPassword(ha.target, { username: USER, password: 'sbagliata' });
    expect(JSON.stringify(step)).not.toContain('sbagliata');
    const error = await expectError(
      loginWithPassword(failing({ status: 502 }).target, { username: USER, password: PASSWORD }),
      'unreachable'
    );
    expect(`${error.message} ${error.stack ?? ''}`).not.toContain(PASSWORD);
  });
});

describe('parseRetryAfter', () => {
  it('legge secondi e date HTTP', () => {
    const now = Date.parse('2026-10-07T10:00:00Z');
    expect(parseRetryAfter('90', now)).toBe(90);
    expect(parseRetryAfter('Wed, 07 Oct 2026 10:05:00 GMT', now)).toBe(300);
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter('presto', now)).toBeNull();
  });
});
