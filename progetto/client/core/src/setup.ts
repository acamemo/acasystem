import { serverOrigin } from './config.ts';
import type { ClientConfig } from './config.ts';
import { checkServer } from './health.ts';
import { openHaSocket } from './haSocket.ts';
import type { HaSocket } from './haSocket.ts';
import type { HaHttp, HaHttpResponse, HttpClient, WebSocketFactory } from './ports.ts';

/**
 * Configurazione automatica del mini PC dall'app (REP-20261026-005, S4). Con le API di HA, come
 * la sua interfaccia ma con le schermate di Acasystem (REP-20261026-004 §7):
 * 1. riconosce che cosa c'è all'indirizzo: Acasystem, HA da configurare, HA senza Acasystem;
 * 2. crea il proprietario (POST /api/onboarding/users) oppure entra come amministratore;
 * 3. dati della casa (config/core/detect, conferma, config/core/update), statistiche «no»
 *    (Q-S5), fine dell'onboarding;
 * 4. installa e avvia l'app Acasystem tramite il Supervisor (WebSocket supervisor/api);
 * 5. aspetta che Acasystem risponda.
 * Ogni passo controlla prima se è già fatto: dopo un'interruzione si riparte dal mancante.
 * Password e token restano in memoria durante la configurazione e non si salvano.
 */

/** Origine dell'interfaccia nei gusci: è anche il client_id verso HA (loopback, ammesso). */
export const SETUP_CLIENT_ID = 'http://127.0.0.1:47320/';
/** Repository delle app di HA OS con Acasystem (P-3 bis, REP-20261026-005 S2). */
export const ACASYSTEM_APP_REPOSITORY = 'https://github.com/acamemo/acasystem-releases';

export type SetupErrorKind =
  | 'unreachable'
  | 'owner-exists'
  | 'invalid-username'
  | 'invalid-auth'
  | 'mfa-required'
  | 'not-admin'
  | 'session-expired'
  | 'install-failed'
  | 'start-timeout'
  | 'unexpected';

export class SetupError extends Error {
  readonly kind: SetupErrorKind;

  constructor(kind: SetupErrorKind, message: string) {
    super(message);
    this.name = 'SetupError';
    this.kind = kind;
  }
}

export type MiniPcState =
  | { kind: 'acasystem' }
  | { kind: 'ha-new'; haBase: string }
  | { kind: 'ha-ready'; haBase: string }
  | { kind: 'unreachable' };

/** Richieste brevi: anche un mini PC lento (VM di prova con 1 CPU) risponde in qualche secondo. */
const REQUEST_TIMEOUT_MS = 30_000;
/** Creazione dell'account, accesso, token e passi dell'onboarding: HA calcola l'impronta della password, lenta sui mini PC piccoli
 * (oltre 10 s sulla VM di prova con 1 CPU, REP-20261026-005). */
const AUTH_TIMEOUT_MS = 60_000;

/** Che cosa c'è al mini PC: prima Acasystem, poi HA sulla 8123 e sulla 80 (HA OS può spostarlo). */
export const detectMiniPc = async (
  deps: { http: HttpClient; haHttp: HaHttp },
  config: ClientConfig
): Promise<MiniPcState> => {
  const acasystem = await checkServer(deps.http, serverOrigin(config), 5_000);
  if (acasystem.kind === 'ok') return { kind: 'acasystem' };
  for (const candidate of [`http://${config.host}:8123`, `http://${config.host}`]) {
    let response: HaHttpResponse;
    try {
      response = await deps.haHttp.request({ method: 'GET', url: `${candidate}/api/onboarding`, timeoutMs: 5_000 });
    } catch {
      continue;
    }
    if (response.status !== 200 || !Array.isArray(response.body)) continue;
    const haBase = new URL(response.url || candidate).origin;
    const userDone = response.body.some(
      (step: unknown) =>
        typeof step === 'object' && step !== null && (step as { step?: unknown }).step === 'user' && (step as { done?: unknown }).done === true
    );
    return userDone ? { kind: 'ha-ready', haBase } : { kind: 'ha-new', haBase };
  }
  return { kind: 'unreachable' };
};

export interface HaSession {
  haBase: string;
  accessToken: string;
}

const ask = async (haHttp: HaHttp, request: Parameters<HaHttp['request']>[0]): Promise<HaHttpResponse> => {
  try {
    return await haHttp.request(request);
  } catch {
    throw new SetupError('unreachable', `${request.url}: Home Assistant non risponde`);
  }
};

const field = (body: unknown, key: string): unknown =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined;

const exchangeCode = async (haHttp: HaHttp, haBase: string, code: string): Promise<HaSession> => {
  const response = await ask(haHttp, {
    method: 'POST',
    url: `${haBase}/auth/token`,
    form: { grant_type: 'authorization_code', code, client_id: SETUP_CLIENT_ID },
    timeoutMs: AUTH_TIMEOUT_MS,
  });
  const accessToken = field(response.body, 'access_token');
  if (response.status !== 200 || typeof accessToken !== 'string') {
    throw new SetupError('session-expired', `Scambio del codice non riuscito (HTTP ${response.status})`);
  }
  return { haBase, accessToken };
};

export interface OwnerInput {
  name: string;
  username: string;
  password: string;
}

const ownerDone = async (haHttp: HaHttp, haBase: string): Promise<boolean> => {
  try {
    const { body } = await haHttp.request({ method: 'GET', url: `${haBase}/api/onboarding`, timeoutMs: REQUEST_TIMEOUT_MS });
    return Array.isArray(body) && body.some((step) => field(step, 'step') === 'user' && field(step, 'done') === true);
  } catch {
    return false;
  }
};

/** Passo «user» dell'onboarding: il primo utente diventa proprietario e amministratore. */
export const createOwner = async (haHttp: HaHttp, haBase: string, owner: OwnerInput): Promise<HaSession> => {
  let response: HaHttpResponse;
  try {
    response = await ask(haHttp, {
      method: 'POST',
      url: `${haBase}/api/onboarding/users`,
      json: { ...owner, client_id: SETUP_CLIENT_ID, language: 'it' },
      timeoutMs: AUTH_TIMEOUT_MS,
    });
  } catch (error) {
    // Risposta persa (tempo scaduto) ma account creato: si continua accedendo con quell'account.
    if (await ownerDone(haHttp, haBase)) throw new SetupError('owner-exists', 'Proprietario creato, risposta persa');
    throw error;
  }
  if (response.status === 403) throw new SetupError('owner-exists', 'Il proprietario esiste già');
  if (response.status === 400) throw new SetupError('invalid-username', 'Nome utente non accettato da Home Assistant');
  const code = field(response.body, 'auth_code');
  if (response.status !== 200 || typeof code !== 'string') {
    throw new SetupError('unexpected', `Creazione del proprietario non riuscita (HTTP ${response.status})`);
  }
  return exchangeCode(haHttp, haBase, code);
};

/** Accesso di un amministratore con il login di HA (provider «homeassistant»), senza MFA. */
export const loginAdmin = async (
  haHttp: HaHttp,
  haBase: string,
  username: string,
  password: string
): Promise<HaSession> => {
  const start = await ask(haHttp, {
    method: 'POST',
    url: `${haBase}/auth/login_flow`,
    json: { client_id: SETUP_CLIENT_ID, handler: ['homeassistant', null], redirect_uri: SETUP_CLIENT_ID },
    timeoutMs: AUTH_TIMEOUT_MS,
  });
  const flowId = field(start.body, 'flow_id');
  if (start.status !== 200 || typeof flowId !== 'string') {
    throw new SetupError('unexpected', `Accesso non avviato (HTTP ${start.status})`);
  }
  const step = await ask(haHttp, {
    method: 'POST',
    url: `${haBase}/auth/login_flow/${flowId}`,
    json: { client_id: SETUP_CLIENT_ID, username, password },
    timeoutMs: AUTH_TIMEOUT_MS,
  });
  if (field(step.body, 'type') === 'create_entry' && typeof field(step.body, 'result') === 'string') {
    return exchangeCode(haHttp, haBase, field(step.body, 'result') as string);
  }
  if (field(step.body, 'step_id') === 'mfa') throw new SetupError('mfa-required', 'Accesso con due fattori non gestito qui');
  throw new SetupError('invalid-auth', 'Utente o password non validi');
};

export interface HomeConfig {
  country: string;
  currency: string;
  time_zone: string;
  unit_system: 'metric' | 'us_customary';
  /** Nome della casa in HA; predefinito «Casa». */
  location_name?: string;
  latitude?: number;
  longitude?: number;
}

/** Se HA non riesce a rilevare la posizione (niente Internet), valori per un impianto in Italia. */
export const ITALY_HOME: HomeConfig = { country: 'IT', currency: 'EUR', time_zone: 'Europe/Rome', unit_system: 'metric' };

export const detectHome = async (socket: HaSocket): Promise<HomeConfig> => {
  try {
    const found = await socket.call<Record<string, unknown>>({ type: 'config/core/detect' }, 20_000);
    const home: HomeConfig = { ...ITALY_HOME };
    if (typeof found.country === 'string') home.country = found.country;
    if (typeof found.currency === 'string') home.currency = found.currency;
    if (typeof found.time_zone === 'string') home.time_zone = found.time_zone;
    if (found.unit_system === 'us_customary') home.unit_system = 'us_customary';
    if (typeof found.latitude === 'number') home.latitude = found.latitude;
    if (typeof found.longitude === 'number') home.longitude = found.longitude;
    return home;
  } catch {
    return { ...ITALY_HOME };
  }
};

/** Identificativo dell'app nel Supervisor: primi 8 caratteri dello SHA-1 dell'URL, poi lo slug. */
export const acasystemAppSlug = async (repository = ACASYSTEM_APP_REPOSITORY): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest('SHA-1', new TextEncoder().encode(repository.toLowerCase()));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}_acasystem`;
};

export type SetupStep = 'home' | 'onboarding' | 'repository' | 'install' | 'start' | 'wait';
export const SETUP_STEPS: readonly SetupStep[] = ['home', 'onboarding', 'repository', 'install', 'start', 'wait'];
export type SetupStepStatus = 'running' | 'done';

export interface SetupDeps {
  http: HttpClient;
  haHttp: HaHttp;
  socketFactory: WebSocketFactory;
  config: ClientConfig;
  onProgress: (step: SetupStep, status: SetupStepStatus) => void;
  /** Mostra i dati rilevati e restituisce quelli confermati dal sistemista. */
  confirmHome: (home: HomeConfig) => Promise<HomeConfig>;
  repository?: string;
  waitTimeoutMs?: number;
  pollMs?: number;
}

const supervisor = <T = unknown>(socket: HaSocket, endpoint: string, method: 'get' | 'post', data?: unknown, timeout: number | null = 60) =>
  socket.call<T>(
    { type: 'supervisor/api', endpoint, method, ...(data === undefined ? {} : { data }), timeout },
    timeout === null ? 0 : (timeout + 10) * 1000
  );

const postOnboardingStep = async (deps: SetupDeps, session: HaSession, step: string, json?: unknown) => {
  const response = await ask(deps.haHttp, {
    method: 'POST',
    url: `${session.haBase}/api/onboarding/${step}`,
    token: session.accessToken,
    ...(json === undefined ? {} : { json }),
    timeoutMs: AUTH_TIMEOUT_MS,
  });
  // 403 «… step already done»: già fatto in un tentativo precedente.
  if (response.status !== 200 && response.status !== 403) {
    throw new SetupError('unexpected', `Passo ${step} dell'onboarding non riuscito (HTTP ${response.status})`);
  }
};

const onboardingSteps = async (deps: SetupDeps, haBase: string): Promise<Map<string, boolean>> => {
  const response = await ask(deps.haHttp, { method: 'GET', url: `${haBase}/api/onboarding`, timeoutMs: REQUEST_TIMEOUT_MS });
  const steps = new Map<string, boolean>();
  if (Array.isArray(response.body)) {
    for (const item of response.body) steps.set(String(field(item, 'step')), field(item, 'done') === true);
  }
  return steps;
};

const sameRepository = (a: unknown, b: string) =>
  typeof a === 'string' && a.trim().replace(/\/+$/, '').toLowerCase() === b.toLowerCase();

/** Dal proprietario (o amministratore) in poi: onboarding, installazione, avvio, attesa. */
export const completeSetup = async (deps: SetupDeps, session: HaSession): Promise<void> => {
  const repository = deps.repository ?? ACASYSTEM_APP_REPOSITORY;
  let socket: HaSocket;
  try {
    socket = await openHaSocket(deps.socketFactory, session.haBase, session.accessToken, AUTH_TIMEOUT_MS);
  } catch {
    throw new SetupError('unreachable', 'WebSocket di Home Assistant non raggiungibile');
  }
  try {
    const user = await socket.call<{ is_admin?: unknown }>({ type: 'auth/current_user' });
    if (user.is_admin !== true) throw new SetupError('not-admin', 'Serve un amministratore di Home Assistant');

    // Dati della casa e fine dell'onboarding (solo i passi non ancora fatti).
    const steps = await onboardingSteps(deps, session.haBase);
    deps.onProgress('home', 'running');
    if (steps.get('core_config') !== true) {
      const home = await deps.confirmHome(await detectHome(socket));
      await socket.call({ type: 'config/core/update', location_name: 'Casa', ...home, language: 'it' });
      await postOnboardingStep(deps, session, 'core_config');
    }
    deps.onProgress('home', 'done');
    deps.onProgress('onboarding', 'running');
    if (steps.get('analytics') !== true) await postOnboardingStep(deps, session, 'analytics');
    if (steps.get('integration') !== true) {
      await postOnboardingStep(deps, session, 'integration', { client_id: SETUP_CLIENT_ID, redirect_uri: SETUP_CLIENT_ID });
    }
    deps.onProgress('onboarding', 'done');

    // Repository e app nel Supervisor.
    const slug = await acasystemAppSlug(repository);
    deps.onProgress('repository', 'running');
    const listed = await supervisor<unknown>(socket, '/store/repositories', 'get');
    const repositories = Array.isArray(listed) ? listed : (field(listed, 'repositories') as unknown[] | undefined) ?? [];
    if (!repositories.some((item) => sameRepository(field(item, 'source'), repository))) {
      await supervisor(socket, '/store/repositories', 'post', { repository }, 300);
    }
    deps.onProgress('repository', 'done');

    deps.onProgress('install', 'running');
    let storeInfo: unknown;
    try {
      storeInfo = await supervisor(socket, `/store/addons/${slug}`, 'get');
    } catch {
      await supervisor(socket, '/store/reload', 'post', undefined, 300);
      storeInfo = await supervisor(socket, `/store/addons/${slug}`, 'get');
    }
    if (field(storeInfo, 'installed') !== true) {
      try {
        // Scarica l'immagine da GHCR: può durare minuti, nessun limite lato Supervisor.
        await supervisor(socket, `/store/addons/${slug}/install`, 'post', undefined, null);
      } catch (error) {
        throw new SetupError('install-failed', `Installazione di Acasystem non riuscita: ${(error as Error).message}`);
      }
    }
    deps.onProgress('install', 'done');

    deps.onProgress('start', 'running');
    await supervisor(socket, `/addons/${slug}/options`, 'post', { boot: 'auto', watchdog: true });
    const info = await supervisor(socket, `/addons/${slug}/info`, 'get');
    if (field(info, 'state') !== 'started') await supervisor(socket, `/addons/${slug}/start`, 'post', undefined, 300);
    deps.onProgress('start', 'done');
  } finally {
    socket.close();
  }

  deps.onProgress('wait', 'running');
  const deadline = Date.now() + (deps.waitTimeoutMs ?? 300_000);
  for (;;) {
    if ((await checkServer(deps.http, serverOrigin(deps.config), 5_000)).kind === 'ok') break;
    if (Date.now() > deadline) throw new SetupError('start-timeout', 'Acasystem non risponde dopo l\'installazione');
    await new Promise((resolveWait) => setTimeout(resolveWait, deps.pollMs ?? 3_000));
  }
  deps.onProgress('wait', 'done');
};
