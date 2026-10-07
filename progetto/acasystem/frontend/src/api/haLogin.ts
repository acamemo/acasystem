/**
 * Accesso proprietario di Acasystem (ADR-0009): l'API di login di Home Assistant attraverso il
 * proxy `/ha` del server Acasystem.
 *
 * 1. GET  /auth/providers                → fornitore con utente e password
 * 2. POST /auth/login_flow               {client_id, handler, redirect_uri}
 * 3. POST /auth/login_flow/<flow_id>     {client_id, username, password}
 * 4. (due fattori) POST /auth/login_flow/<flow_id> {client_id, code}
 * 5. risultato `create_entry` con il codice → POST /auth/token (form urlencoded)
 *    grant_type=authorization_code&code=…&client_id=… → token
 *
 * Utente, password e codice vanno solo nel corpo delle richieste: mai salvati né scritti nei log,
 * nemmeno negli errori. I token tornano al chiamante, che li salva con oauthStorage.
 */
import type { AuthData } from 'home-assistant-js-websocket';
import { getClientId, getHassUrl } from '@/api/haUrl';
import { asString, isNonEmptyString, isRecord, readKey } from '@/validators/guards';
import { toSessionTokens } from '@/validators/oauthTokens';

export type LoginErrorCode =
  | 'invalid_auth'
  | 'invalid_code'
  | 'rate_limited'
  | 'unreachable'
  | 'not_configured'
  | 'expired'
  | 'too_many_codes'
  | 'blocked'
  | 'onboarding'
  | 'no_provider'
  | 'unexpected';

/** Messaggi per la pagina di accesso: cosa è successo e cosa fare, senza dettagli tecnici. */
export const LOGIN_ERROR_MESSAGES: Record<LoginErrorCode, string> = {
  invalid_auth: 'Utente o password non corretti. Controlla e riprova.',
  invalid_code: 'Codice non corretto. Usa il codice attuale dell’app di autenticazione e riprova.',
  rate_limited: 'Troppi tentativi di accesso. Attendi qualche minuto e riprova.',
  unreachable:
    'Home Assistant non risponde. Controlla che sia acceso e raggiungibile dal server Acasystem, poi riprova.',
  not_configured:
    'Il server Acasystem non sa ancora dove si trova Home Assistant. Chi lo ha installato deve indicarne l’indirizzo nella configurazione del server.',
  expired: 'La richiesta di accesso è scaduta. Inserisci di nuovo utente e password.',
  too_many_codes: 'Troppi codici non corretti. Inserisci di nuovo utente e password.',
  blocked:
    'Home Assistant non consente l’accesso: l’utente è disattivato oppure i tentativi sono stati bloccati.',
  onboarding:
    'Home Assistant non è ancora configurato. Completa la configurazione iniziale di Home Assistant, poi accedi.',
  no_provider: 'Home Assistant non offre l’accesso con utente e password.',
  unexpected: 'Accesso non riuscito per un errore imprevisto. Riprova tra poco.',
};

/** Errore dell'accesso, con un codice che la pagina traduce in un messaggio. */
export class HaLoginError extends Error {
  readonly code: LoginErrorCode;
  /** Secondi indicati da `Retry-After` nelle risposte 429, se presenti. */
  readonly retryAfterSeconds: number | null;

  constructor(code: LoginErrorCode, retryAfterSeconds: number | null = null) {
    super(LOGIN_ERROR_MESSAGES[code]);
    this.name = 'HaLoginError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const isLoginError = (error: unknown): error is HaLoginError => error instanceof HaLoginError;

/** Messaggio da mostrare per un errore qualsiasi dell'accesso. */
export function loginErrorMessage(error: unknown): string {
  if (!isLoginError(error)) return LOGIN_ERROR_MESSAGES.unexpected;
  const seconds = error.retryAfterSeconds;
  if (error.code === 'rate_limited' && seconds !== null && seconds > 0) {
    if (seconds < 60) return 'Troppi tentativi di accesso. Riprova tra meno di un minuto.';
    const minutes = Math.ceil(seconds / 60);
    return `Troppi tentativi di accesso. Riprova tra ${minutes === 1 ? 'un minuto' : `${minutes} minuti`}.`;
  }
  return error.message;
}

/** Codice dell'errore, `unexpected` per gli errori non previsti. */
export const loginErrorCode = (error: unknown): LoginErrorCode =>
  isLoginError(error) ? error.code : 'unexpected';

/** Dove e come accedere: il proxy di questa pagina e il client_id dell'origine. */
export interface LoginTarget {
  hassUrl: string;
  clientId: string;
  /** fetch da usare; predefinito quello globale (sostituibile nei test). */
  fetchImpl?: typeof fetch;
}

export const currentLoginTarget = (): LoginTarget => ({
  hassUrl: getHassUrl(),
  clientId: getClientId(),
});

export type LoginStep =
  | { type: 'credentials'; flowId: string; error: 'invalid_auth' | null }
  | { type: 'mfa'; flowId: string; error: 'invalid_code' | null }
  | { type: 'done'; tokens: AuthData };

export interface AuthProvider {
  type: string;
  id: string | null;
  name: string;
}

interface LoginResponse {
  status: number;
  ok: boolean;
  body: unknown;
  retryAfter: string | null;
}

type Phase = 'providers' | 'start' | 'step' | 'token';

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

async function send(target: LoginTarget, path: string, init: RequestInit): Promise<LoginResponse> {
  const fetchImpl = target.fetchImpl ?? globalThis.fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${target.hassUrl}${path}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...init,
    });
  } catch {
    // Network error: neither the server Acasystem nor Home Assistant answered.
    throw new HaLoginError('unreachable');
  }
  const body: unknown = await response.json().catch(() => undefined);
  return {
    status: response.status,
    ok: response.ok,
    body,
    retryAfter: response.headers?.get?.('Retry-After') ?? null,
  };
}

/** `Retry-After` in secondi o come data HTTP; null se assente o non leggibile. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const date = Date.parse(trimmed);
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - now) / 1000)) : null;
}

/** Errore per una risposta HTTP non riuscita, secondo il passo dell'accesso. */
function failure(response: LoginResponse, phase: Phase): HaLoginError {
  const { status, body } = response;
  const code = readKey(body, 'code');
  if (status === 429) return new HaLoginError('rate_limited', parseRetryAfter(response.retryAfter));
  if (status === 503) {
    return new HaLoginError(code === 'HA_URL_NOT_CONFIGURED' ? 'not_configured' : 'unreachable');
  }
  if (status === 502 || status === 504) return new HaLoginError('unreachable');
  if (status === 403) return new HaLoginError('blocked');
  if (status === 400 && readKey(body, 'message_code') === 'onboarding_required') {
    return new HaLoginError('onboarding');
  }
  // The flow is gone (finished, aborted or Home Assistant restarted): start again.
  if (phase === 'step' && status === 404) return new HaLoginError('expired');
  // The code was already used or is too old.
  if (phase === 'token' && status === 400) return new HaLoginError('expired');
  return new HaLoginError('unexpected');
}

/** Fornitori di accesso di Home Assistant (risposta nuova `{providers}` o elenco semplice). */
export async function fetchAuthProviders(target: LoginTarget): Promise<AuthProvider[]> {
  const response = await send(target, '/auth/providers', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw failure(response, 'providers');
  const list = Array.isArray(response.body) ? response.body : readKey(response.body, 'providers');
  if (!Array.isArray(list)) throw new HaLoginError('unexpected');
  return list.flatMap((item): AuthProvider[] => {
    if (!isRecord(item) || !isNonEmptyString(item.type)) return [];
    return [
      {
        type: item.type,
        id: typeof item.id === 'string' ? item.id : null,
        name: asString(item.name) ?? item.type,
      },
    ];
  });
}

/** Fornitore con utente e password: quello di Home Assistant, altrimenti il primo adatto. */
export function pickPasswordProvider(providers: readonly AuthProvider[]): AuthProvider {
  const provider =
    providers.find((item) => item.type === 'homeassistant') ??
    providers.find((item) => item.type !== 'trusted_networks');
  if (!provider) throw new HaLoginError('no_provider');
  return provider;
}

/** Prima opzione del passo `select_mfa_module` (elenco `[valore, nome]` o oggetto). */
function firstMfaModule(body: unknown): string | null {
  const schema = readKey(body, 'data_schema');
  const field = Array.isArray(schema) ? schema[0] : undefined;
  const options = readKey(field, 'options');
  if (Array.isArray(options)) {
    const first: unknown = options[0];
    if (Array.isArray(first) && isNonEmptyString(first[0])) return first[0];
    if (isNonEmptyString(first)) return first;
    return null;
  }
  if (isRecord(options)) return Object.keys(options)[0] ?? null;
  return null;
}

async function postStep(
  target: LoginTarget,
  flowId: string,
  data: Record<string, string>
): Promise<LoginStep> {
  const response = await send(target, `/auth/login_flow/${encodeURIComponent(flowId)}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ client_id: target.clientId, ...data }),
  });
  if (!response.ok) throw failure(response, 'step');
  return readFlowResult(target, response.body, flowId);
}

/** Risultato di un passo del flusso di login. */
async function readFlowResult(
  target: LoginTarget,
  body: unknown,
  fallbackFlowId: string | null,
  depth = 0
): Promise<LoginStep> {
  const type = readKey(body, 'type');
  const flowId = asString(readKey(body, 'flow_id')) || fallbackFlowId;

  if (type === 'create_entry') {
    const code = readKey(body, 'result');
    if (!isNonEmptyString(code)) throw new HaLoginError('unexpected');
    return { type: 'done', tokens: await exchangeAuthCode(target, code) };
  }

  if (type === 'abort') {
    const reason = readKey(body, 'reason');
    if (reason === 'login_expired') throw new HaLoginError('expired');
    if (reason === 'too_many_retry') throw new HaLoginError('too_many_codes');
    throw new HaLoginError('unexpected');
  }

  if (type === 'form' && flowId) {
    const step = readKey(body, 'step_id');
    const base = readKey(readKey(body, 'errors'), 'base');
    if (step === 'init') {
      if (base && base !== 'invalid_auth') throw new HaLoginError('unexpected');
      return { type: 'credentials', flowId, error: base ? 'invalid_auth' : null };
    }
    if (step === 'mfa') {
      if (base && base !== 'invalid_code') throw new HaLoginError('unexpected');
      return { type: 'mfa', flowId, error: base ? 'invalid_code' : null };
    }
    if (step === 'select_mfa_module' && depth === 0) {
      // More than one second factor: the first one, as the default of Home Assistant.
      const module = firstMfaModule(body);
      if (!module) throw new HaLoginError('unexpected');
      const response = await send(target, `/auth/login_flow/${encodeURIComponent(flowId)}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ client_id: target.clientId, multi_factor_auth_module: module }),
      });
      if (!response.ok) throw failure(response, 'step');
      return readFlowResult(target, response.body, flowId, depth + 1);
    }
  }

  throw new HaLoginError('unexpected');
}

/** Avvia un flusso di login con il fornitore a utente e password. */
export async function startLoginFlow(target: LoginTarget): Promise<LoginStep> {
  const provider = pickPasswordProvider(await fetchAuthProviders(target));
  const response = await send(target, '/auth/login_flow', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      client_id: target.clientId,
      handler: [provider.type, provider.id],
      redirect_uri: target.clientId,
    }),
  });
  if (!response.ok) throw failure(response, 'start');
  return readFlowResult(target, response.body, null);
}

export interface Credentials {
  username: string;
  password: string;
}

/** Invia utente e password a un flusso già avviato. */
export function submitCredentials(
  target: LoginTarget,
  flowId: string,
  { username, password }: Credentials
): Promise<LoginStep> {
  return postStep(target, flowId, { username, password });
}

/** Invia il codice del secondo fattore. */
export function submitMfaCode(
  target: LoginTarget,
  flowId: string,
  code: string
): Promise<LoginStep> {
  return postStep(target, flowId, { code });
}

/**
 * Accesso con utente e password: riusa il flusso di un tentativo precedente (dopo credenziali
 * errate resta valido), altrimenti ne avvia uno; se il flusso è scaduto ne avvia uno nuovo una
 * volta sola.
 */
export async function loginWithPassword(
  target: LoginTarget,
  credentials: Credentials,
  flowId: string | null = null
): Promise<LoginStep> {
  const begin = async (): Promise<LoginStep> => {
    const start = await startLoginFlow(target);
    return start.type === 'credentials'
      ? submitCredentials(target, start.flowId, credentials)
      : start;
  };
  if (!flowId) return begin();
  try {
    return await submitCredentials(target, flowId, credentials);
  } catch (error) {
    if (loginErrorCode(error) === 'expired') return begin();
    throw error;
  }
}

/** Abbandona un flusso (per esempio «Indietro» dal codice); gli errori sono ignorati. */
export async function cancelLoginFlow(target: LoginTarget, flowId: string): Promise<void> {
  try {
    await send(target, `/auth/login_flow/${encodeURIComponent(flowId)}`, { method: 'DELETE' });
  } catch {
    // The flow expires on its own in Home Assistant.
  }
}

/** Scambia il codice del login con i token, legati all'hassUrl e al client_id dell'accesso. */
export async function exchangeAuthCode(target: LoginTarget, code: string): Promise<AuthData> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: target.clientId,
  });
  const response = await send(target, '/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
  if (!response.ok) throw failure(response, 'token');
  const tokens = toSessionTokens(response.body, {
    hassUrl: target.hassUrl,
    clientId: target.clientId,
  });
  if (!tokens) throw new HaLoginError('unexpected');
  return tokens;
}
