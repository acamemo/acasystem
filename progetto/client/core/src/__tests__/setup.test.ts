import { describe, expect, it } from 'vitest';
import { HttpRequestError } from '../ports.ts';
import type { HaHttp, HaHttpRequest, HaHttpResponse, WebSocketLike } from '../ports.ts';
import {
  ACASYSTEM_APP_REPOSITORY,
  acasystemAppSlug,
  completeSetup,
  createOwner,
  detectMiniPc,
  ITALY_HOME,
  loginAdmin,
  SETUP_CLIENT_ID,
} from '../setup.ts';
import type { HomeConfig, SetupDeps } from '../setup.ts';
import { inspectAddress } from '../wizard.ts';
import { createConfigStore, createHttp } from './fakes.ts';

/**
 * Configurazione del mini PC con un finto Home Assistant: HTTP (onboarding, token, login)
 * e WebSocket (utente, dati della casa, Supervisor), come HA 2026.9.4 (REP-20261026-004 §1.2, §7).
 */

const HA = 'http://192.168.1.184';
const SLUG = '9960cdb4_acasystem';
const config = { host: '192.168.1.184', port: 3002 };
const health = 'http://192.168.1.184:3002/api/health';

type Route = (request: HaHttpRequest) => { status: number; body?: unknown; url?: string };

const fakeHaHttp = (routes: Record<string, Route>) => {
  const calls: HaHttpRequest[] = [];
  const haHttp: HaHttp = {
    request: async (request) => {
      calls.push(request);
      const route = routes[`${request.method} ${request.url}`];
      if (!route) throw new HttpRequestError('network', `nessuna rete per ${request.url}`);
      const { status, body = null, url = request.url } = route(request);
      return { status, body, url } satisfies HaHttpResponse;
    },
  };
  return { haHttp, calls };
};

interface FakeHaState {
  steps: Record<string, boolean>;
  repositories: string[];
  installed: boolean;
  state: 'started' | 'stopped';
  isAdmin?: boolean;
  installFails?: boolean;
}

/** Finto WebSocket di HA: autenticazione e comandi usati dall'installazione. */
const fakeSocketFactory = (ha: FakeHaState, log: Record<string, unknown>[]) => (url: string): WebSocketLike => {
  expect(url).toBe('ws://192.168.1.184/api/websocket');
  const socket: WebSocketLike = {
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    close: () => {},
    send: (raw) => {
      const message = JSON.parse(raw) as Record<string, unknown>;
      const reply = (payload: Record<string, unknown>) =>
        queueMicrotask(() => socket.onmessage?.({ data: JSON.stringify(payload) }));
      if (message.type === 'auth') return reply({ type: message.access_token === 'tok' ? 'auth_ok' : 'auth_invalid' });
      log.push(message);
      const ok = (result: unknown) => reply({ id: message.id, type: 'result', success: true, result });
      const fail = (code: string) => reply({ id: message.id, type: 'result', success: false, error: { code, message: code } });
      const endpoint = message.endpoint as string | undefined;
      switch (message.type) {
        case 'auth/current_user':
          return ok({ name: 'Mario', is_admin: ha.isAdmin ?? true });
        case 'config/core/detect':
          return ok({ country: 'IT', currency: 'EUR', time_zone: 'Europe/Rome', unit_system: 'metric', latitude: 45.07, longitude: 7.69 });
        case 'config/core/update':
          return ok(null);
        case 'supervisor/api':
          if (endpoint === '/store/repositories' && message.method === 'get') return ok(ha.repositories.map((source) => ({ source })));
          if (endpoint === '/store/repositories') {
            ha.repositories.push(String((message.data as { repository: string }).repository));
            return ok(null);
          }
          if (endpoint === `/store/addons/${SLUG}`) return ha.repositories.length ? ok({ installed: ha.installed }) : fail('not_found');
          if (endpoint === '/store/reload') return ok(null);
          if (endpoint === `/store/addons/${SLUG}/install`) {
            if (ha.installFails) return fail('download_failed');
            ha.installed = true;
            return ok(null);
          }
          if (endpoint === `/addons/${SLUG}/options`) return ok(null);
          if (endpoint === `/addons/${SLUG}/info`) return ok({ state: ha.state });
          if (endpoint === `/addons/${SLUG}/start`) {
            ha.state = 'started';
            return ok(null);
          }
          return fail('unknown_endpoint');
        default:
          return fail('unknown_command');
      }
    },
  };
  queueMicrotask(() => socket.onmessage?.({ data: JSON.stringify({ type: 'auth_required' }) }));
  return socket;
};

const onboardingRoutes = (ha: FakeHaState): Record<string, Route> => ({
  [`GET ${HA}/api/onboarding`]: () => ({ status: 200, body: Object.entries(ha.steps).map(([step, done]) => ({ step, done })) }),
  [`POST ${HA}/api/onboarding/core_config`]: (r) => {
    expect(r.token).toBe('tok');
    if (ha.steps.core_config) return { status: 403 };
    ha.steps.core_config = true;
    return { status: 200, body: {} };
  },
  [`POST ${HA}/api/onboarding/analytics`]: () => {
    ha.steps.analytics = true;
    return { status: 200, body: {} };
  },
  [`POST ${HA}/api/onboarding/integration`]: (r) => {
    expect(r.json).toEqual({ client_id: SETUP_CLIENT_ID, redirect_uri: SETUP_CLIENT_ID });
    ha.steps.integration = true;
    return { status: 200, body: { auth_code: 'x' } };
  },
});

const runSetup = (ha: FakeHaState, healthyAfter = () => ha.state === 'started') => {
  const log: Record<string, unknown>[] = [];
  const progress: string[] = [];
  const confirmed: HomeConfig[] = [];
  const { haHttp, calls } = fakeHaHttp(onboardingRoutes(ha));
  const http = createHttp({});
  // /api/health risponde solo quando l'app è avviata.
  http.http.getJson = async (url) => {
    if (url === health && healthyAfter()) return { status: 'ok', version: '0.9.30' };
    throw new HttpRequestError('network', 'spento');
  };
  const deps: SetupDeps = {
    http: http.http,
    haHttp,
    socketFactory: fakeSocketFactory(ha, log),
    config,
    onProgress: (step, status) => progress.push(`${step}:${status}`),
    confirmHome: async (home) => {
      confirmed.push(home);
      return home;
    },
    pollMs: 1,
    waitTimeoutMs: 200,
  };
  return { run: completeSetup(deps, { haBase: HA, accessToken: 'tok' }), log, progress, confirmed, calls };
};

describe('detectMiniPc', () => {
  it('riconosce Acasystem, HA da configurare (anche dopo il reindirizzamento 8123 → 80), HA già configurato', async () => {
    const http = createHttp({ [health]: { status: 'ok', version: '0.9.30' } });
    const { haHttp } = fakeHaHttp({});
    expect(await detectMiniPc({ http: http.http, haHttp }, config)).toEqual({ kind: 'acasystem' });

    const offline = createHttp({}).http;
    const fresh = fakeHaHttp({
      [`GET http://192.168.1.184:8123/api/onboarding`]: () => ({ status: 200, body: [{ step: 'user', done: false }], url: `${HA}/api/onboarding` }),
    });
    expect(await detectMiniPc({ http: offline, haHttp: fresh.haHttp }, config)).toEqual({ kind: 'ha-new', haBase: HA });

    const ready = fakeHaHttp({
      [`GET ${HA}/api/onboarding`]: () => ({ status: 200, body: [{ step: 'user', done: true }, { step: 'core_config', done: false }] }),
    });
    expect(await detectMiniPc({ http: offline, haHttp: ready.haHttp }, config)).toEqual({ kind: 'ha-ready', haBase: HA });

    expect(await detectMiniPc({ http: offline, haHttp: fakeHaHttp({}).haHttp }, config)).toEqual({ kind: 'unreachable' });
  });
});

describe('inspectAddress', () => {
  it('salva l’indirizzo se risponde HA da configurare, non se il mini PC tace', async () => {
    const offline = createHttp({}).http;
    const fresh = fakeHaHttp({ [`GET ${HA}:8123/api/onboarding`]: () => ({ status: 200, body: [{ step: 'user', done: false }] }) });
    const store = createConfigStore();
    expect(await inspectAddress({ host: ' 192.168.1.184 ' }, { http: offline, haHttp: fresh.haHttp, config: store.store })).toEqual({
      ok: true,
      config,
      state: { kind: 'ha-new', haBase: `${HA}:8123` },
    });
    expect(await store.store.load()).toEqual(config);

    const silent = createConfigStore();
    expect(await inspectAddress({ host: '192.168.1.9' }, { http: offline, haHttp: fakeHaHttp({}).haHttp, config: silent.store })).toEqual({
      ok: false,
      error: 'unreachable',
    });
    expect(await silent.store.load()).toBeNull();
    expect(await inspectAddress({ host: 'casa' }, { http: offline, haHttp: fakeHaHttp({}).haHttp, config: silent.store })).toEqual({
      ok: false,
      error: 'not-ipv4',
    });
  });
});

describe('proprietario e accesso amministratore', () => {
  it('crea il proprietario e scambia il codice con il token', async () => {
    const { haHttp, calls } = fakeHaHttp({
      [`POST ${HA}/api/onboarding/users`]: () => ({ status: 200, body: { auth_code: 'abc' } }),
      [`POST ${HA}/auth/token`]: (r) =>
        r.form?.code === 'abc' && r.form.client_id === SETUP_CLIENT_ID ? { status: 200, body: { access_token: 'tok' } } : { status: 400 },
    });
    expect(await createOwner(haHttp, HA, { name: 'Mario Rossi', username: 'mario', password: 'x' })).toEqual({ haBase: HA, accessToken: 'tok' });
    expect(calls[0]?.json).toEqual({ name: 'Mario Rossi', username: 'mario', password: 'x', client_id: SETUP_CLIENT_ID, language: 'it' });
  });

  it('distingue proprietario già esistente e nome utente rifiutato', async () => {
    const exists = fakeHaHttp({ [`POST ${HA}/api/onboarding/users`]: () => ({ status: 403 }) });
    await expect(createOwner(exists.haHttp, HA, { name: 'a', username: 'a', password: 'a' })).rejects.toMatchObject({ kind: 'owner-exists' });

    // Risposta persa per tempo scaduto, ma HA ha creato l'account: si passa all'accesso.
    const lost = fakeHaHttp({
      [`GET ${HA}/api/onboarding`]: () => ({ status: 200, body: [{ step: 'user', done: true }] }),
    });
    await expect(createOwner(lost.haHttp, HA, { name: 'a', username: 'a', password: 'a' })).rejects.toMatchObject({ kind: 'owner-exists' });
    const gone = fakeHaHttp({});
    await expect(createOwner(gone.haHttp, HA, { name: 'a', username: 'a', password: 'a' })).rejects.toMatchObject({ kind: 'unreachable' });
    const bad = fakeHaHttp({ [`POST ${HA}/api/onboarding/users`]: () => ({ status: 400 }) });
    await expect(createOwner(bad.haHttp, HA, { name: 'a', username: 'A B', password: 'a' })).rejects.toMatchObject({ kind: 'invalid-username' });
  });

  it('entra come amministratore e riconosce password errata e due fattori', async () => {
    const flow = (step: unknown) =>
      fakeHaHttp({
        [`POST ${HA}/auth/login_flow`]: () => ({ status: 200, body: { flow_id: 'f1', type: 'form' } }),
        [`POST ${HA}/auth/login_flow/f1`]: () => ({ status: 200, body: step }),
        [`POST ${HA}/auth/token`]: () => ({ status: 200, body: { access_token: 'tok' } }),
      }).haHttp;
    expect(await loginAdmin(flow({ type: 'create_entry', result: 'c' }), HA, 'admin', 'x')).toEqual({ haBase: HA, accessToken: 'tok' });
    await expect(loginAdmin(flow({ type: 'form', errors: { base: 'invalid_auth' } }), HA, 'a', 'b')).rejects.toMatchObject({ kind: 'invalid-auth' });
    await expect(loginAdmin(flow({ type: 'form', step_id: 'mfa' }), HA, 'a', 'b')).rejects.toMatchObject({ kind: 'mfa-required' });
  });
});

describe('completeSetup', () => {
  it('calcola l’identificativo dell’app come il Supervisor', async () => {
    expect(await acasystemAppSlug(ACASYSTEM_APP_REPOSITORY)).toBe(SLUG);
  });

  it('da HA appena creato: dati della casa, fine onboarding, repository, installazione, avvio, attesa', async () => {
    const ha: FakeHaState = { steps: { user: true, core_config: false, analytics: false, integration: false }, repositories: [], installed: false, state: 'stopped' };
    const { run, log, progress, confirmed } = runSetup(ha);
    await run;
    expect(confirmed[0]).toMatchObject({ country: 'IT', time_zone: 'Europe/Rome', latitude: 45.07 });
    expect(log.find((m) => m.type === 'config/core/update')).toMatchObject({ location_name: 'Casa', language: 'it', currency: 'EUR' });
    expect(ha.steps).toEqual({ user: true, core_config: true, analytics: true, integration: true });
    expect(ha.repositories).toEqual([ACASYSTEM_APP_REPOSITORY]);
    const install = log.find((m) => m.endpoint === `/store/addons/${SLUG}/install`);
    expect(install?.timeout).toBeNull();
    expect(log.find((m) => m.endpoint === `/addons/${SLUG}/options`)?.data).toEqual({ boot: 'auto', watchdog: true });
    expect(ha.state).toBe('started');
    expect(progress).toEqual([
      'home:running', 'home:done', 'onboarding:running', 'onboarding:done', 'repository:running', 'repository:done',
      'install:running', 'install:done', 'start:running', 'start:done', 'wait:running', 'wait:done',
    ]);
  });

  it('ripresa: salta i passi già fatti e riavvia soltanto l’app ferma', async () => {
    const ha: FakeHaState = { steps: { user: true, core_config: true, analytics: true, integration: true }, repositories: [ACASYSTEM_APP_REPOSITORY + '/'], installed: true, state: 'stopped' };
    const { run, log, confirmed, calls } = runSetup(ha);
    await run;
    expect(confirmed).toEqual([]);
    expect(calls.filter((c) => c.method === 'POST')).toEqual([]);
    expect(log.some((m) => m.endpoint === '/store/repositories' && m.method === 'post')).toBe(false);
    expect(log.some((m) => String(m.endpoint).endsWith('/install'))).toBe(false);
    expect(log.some((m) => m.endpoint === `/addons/${SLUG}/start`)).toBe(true);
  });

  it('rifiuta un utente non amministratore e segnala installazione e avvio non riusciti', async () => {
    const base = { steps: { user: true, core_config: true, analytics: true, integration: true }, repositories: [] as string[], installed: false, state: 'stopped' as const };
    await expect(runSetup({ ...base, isAdmin: false }).run).rejects.toMatchObject({ kind: 'not-admin' });
    await expect(runSetup({ ...base, repositories: [], installFails: true }).run).rejects.toMatchObject({ kind: 'install-failed' });
    await expect(runSetup({ ...base, repositories: [] }, () => false).run).rejects.toMatchObject({ kind: 'start-timeout' });
  });

  it('usa i valori per l’Italia se HA non rileva la posizione', () => {
    expect(ITALY_HOME).toEqual({ country: 'IT', currency: 'EUR', time_zone: 'Europe/Rome', unit_system: 'metric' });
  });
});
