import type { HaRestCall, HaWsCall } from '../config/homeAssistantApiCatalog.ts';
import { readProperty } from '../helpers/objects.ts';
import { createHaTransport, isHaError } from './devices/haTransport.ts';
import type { HaTransport } from './devices/haTransport.ts';
import { resolveHomeAssistantProxyBaseUrl } from './homeAssistantProxyService.ts';

/** Onboarding interno HA, letto nel tag 2026.10.4. Nessun accesso al Supervisor. */
const meta = { haClass: 'INT', kind: 'internal', verifiedVersion: '2026.10.4', evidence: 'code', checks: ['webSetup.test.ts'] } as const;
const rest = (id: string, path: string, method: 'GET' | 'POST', permission: 'none' | 'admin'): HaRestCall =>
  ({ ...meta, id, path, method, permission, transport: 'rest' });
const command = (id: string, type: string): HaWsCall =>
  ({ ...meta, id, type, permission: 'admin', transport: 'ws' });
const calls = {
  status: rest('setup.status', '/api/onboarding', 'GET', 'none'),
  owner: rest('setup.owner', '/api/onboarding/users', 'POST', 'none'),
  home: rest('setup.home.done', '/api/onboarding/core_config', 'POST', 'admin'),
  analytics: rest('setup.analytics.done', '/api/onboarding/analytics', 'POST', 'admin'),
  integration: rest('setup.integration.done', '/api/onboarding/integration', 'POST', 'admin'),
  user: command('setup.current_user', 'auth/current_user'),
  updateHome: command('setup.home.update', 'config/core/update'),
};
const TIMEOUT_MS = 60_000;
// Origine loopback valida per HA; non viene usata per reindirizzare o trasmettere credenziali.
const SETUP_CLIENT_ID = 'http://127.0.0.1:47320/';
const STEPS = ['user', 'core_config', 'analytics', 'integration'] as const;
export type SetupState = 'owner-required' | 'setup-required' | 'ready';
export interface OwnerInput { name: string; username: string; password: string }

export class HomeAssistantSetupError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HomeAssistantSetupError';
    this.status = status;
    this.code = code;
  }
}
const ownerExists = (): HomeAssistantSetupError =>
  new HomeAssistantSetupError(409, 'SETUP_OWNER_EXISTS', 'Il proprietario è già stato creato. Accedi per continuare.');
const invalidResponse = (): HomeAssistantSetupError =>
  new HomeAssistantSetupError(502, 'HA_SETUP_INVALID_RESPONSE', 'Home Assistant non ha completato la configurazione. Riprova.');

/** Solo errori controllati, mai messaggi/corpi restituiti da HA o token. */
export const setupFailure = (error: unknown): HomeAssistantSetupError => {
  if (error instanceof HomeAssistantSetupError) return error;
  if (isHaError(error)) {
    if (error.kind === 'timeout') return new HomeAssistantSetupError(504, 'HA_TIMEOUT', 'Home Assistant non ha risposto in tempo. Riprova.');
    if (error.kind === 'unauthorized') return new HomeAssistantSetupError(401, 'HA_AUTH_INVALID', 'Accedi di nuovo per completare la configurazione.');
    if (error.kind === 'forbidden') return new HomeAssistantSetupError(403, 'SETUP_ADMIN_REQUIRED', 'Serve un amministratore della casa.');
    if (error.kind === 'unreachable') return new HomeAssistantSetupError(502, 'HA_UNREACHABLE', 'Home Assistant non risponde. Controlla la centrale e riprova.');
  }
  return invalidResponse();
};

export const createHomeAssistantSetupService = (transport: HaTransport = createHaTransport({
  baseUrls: () => {
    const url = resolveHomeAssistantProxyBaseUrl();
    return url ? [url.href.replace(/\/$/, '')] : [];
  },
})) => {
  let creatingOwner = false;
  let completing = false;
  const steps = async (): Promise<Map<string, boolean> | null> => {
    let response;
    try { response = await transport.rest(calls.status, { timeoutMs: TIMEOUT_MS }); }
    catch (error) {
      // HA non registra più le viste onboarding dopo un avvio con tutti i passi conclusi.
      if (isHaError(error) && error.kind === 'not_found') return null;
      throw error;
    }
    if (!Array.isArray(response.body)) throw invalidResponse();
    const result = new Map<string, boolean>();
    for (const item of response.body) {
      const step = readProperty(item, 'step');
      const done = readProperty(item, 'done');
      if (typeof step !== 'string' || typeof done !== 'boolean' || result.has(step)) throw invalidResponse();
      result.set(step, done);
    }
    if (STEPS.some((step) => !result.has(step))) throw invalidResponse();
    return result;
  };
  const status = async (): Promise<SetupState> => {
    const current = await steps();
    if (!current || [...current.values()].every(Boolean)) return 'ready';
    return current.get('user') ? 'setup-required' : 'owner-required';
  };
  const createOwner = async (owner: OwnerInput): Promise<void> => {
    if (creatingOwner) throw ownerExists();
    creatingOwner = true;
    try {
      if (await status() !== 'owner-required') throw ownerExists();
      try {
        await transport.rest(calls.owner, { timeoutMs: TIMEOUT_MS, body: { ...owner, username: owner.username.trim().toLowerCase(), client_id: SETUP_CLIENT_ID, language: 'it' } });
      } catch (error) {
        if (isHaError(error) && error.kind === 'forbidden') throw ownerExists();
        // Un timeout può nascondere un owner creato: rileggere, senza ripetere la scrittura.
        try { if (await status() !== 'owner-required') throw ownerExists(); }
        catch (readError) { if (readError instanceof HomeAssistantSetupError && readError.code === 'SETUP_OWNER_EXISTS') throw readError; }
        if (isHaError(error) && error.kind === 'bad_request') {
          if (readProperty(error.body, 'message_code') === 'username_not_normalized') {
            throw new HomeAssistantSetupError(400, 'SETUP_USERNAME_INVALID', 'Usa un nome utente in minuscolo, senza spazi iniziali o finali.');
          }
          throw new HomeAssistantSetupError(400, 'SETUP_INVALID_INPUT', 'Home Assistant non accetta questi dati del proprietario. Controllali e riprova.');
        }
        throw error;
      }
      if (await status() === 'owner-required') throw invalidResponse();
      // Il codice temporaneo prodotto da HA non è inoltrato o conservato: segue il login web.
    } finally { creatingOwner = false; }
  };
  const complete = async (token: string, locationName: string): Promise<void> => {
    if (completing) throw new HomeAssistantSetupError(409, 'SETUP_IN_PROGRESS', 'La configurazione è già in corso. Riprova tra poco.');
    completing = true;
    try {
      const session = await transport.openSession(token, TIMEOUT_MS);
      try {
        const user = await session.send(calls.user, { timeoutMs: TIMEOUT_MS });
        if (readProperty(user, 'is_admin') !== true) {
          throw new HomeAssistantSetupError(403, 'SETUP_ADMIN_REQUIRED', 'Serve un amministratore della casa.');
        }
        const current = await steps();
        if (!current || [...current.values()].every(Boolean)) return;
        if (!current.get('user')) throw new HomeAssistantSetupError(409, 'SETUP_OWNER_REQUIRED', 'Crea prima il proprietario della casa.');
        const markDone = async (step: typeof calls.home | typeof calls.analytics | typeof calls.integration, key: string, body?: unknown) => {
          if (current.get(key)) return;
          try { await transport.rest(step, { token, timeoutMs: TIMEOUT_MS, ...(body === undefined ? {} : { body }) }); }
          catch (error) {
            // Due client possono completare lo stesso passo: un 403 vale solo se HA lo conferma.
            if (isHaError(error) && error.kind === 'forbidden' && (await steps())?.get(key)) return;
            throw error;
          }
        };
        if (!current.get('core_config')) {
          await session.send(calls.updateHome, { payload: { location_name: locationName, language: 'it' }, timeoutMs: TIMEOUT_MS });
          await markDone(calls.home, 'core_config');
        }
        // Non si abilita la condivisione di statistiche: il passo analytics chiude la scelta iniziale.
        await markDone(calls.analytics, 'analytics');
        await markDone(calls.integration, 'integration', { client_id: SETUP_CLIENT_ID, redirect_uri: SETUP_CLIENT_ID });
        if (await status() !== 'ready') throw invalidResponse();
      } finally { session.close(); }
    } finally { completing = false; }
  };
  return { status, createOwner, complete };
};
export type HomeAssistantSetupService = ReturnType<typeof createHomeAssistantSetupService>;
