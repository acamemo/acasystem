import { DEFAULT_RELEASE_TIMEOUTS } from './defaults.ts';
import type { ClientConfig, HostError, PortError } from './config.ts';
import { parseHost, parsePort, serverOrigin } from './config.ts';
import { checkServer } from './health.ts';
import type { ConfigStore, HttpClient } from './ports.ts';

/**
 * Procedura guidata (Q-A7) e «Cambia indirizzo»: l'indirizzo si salva solo se a quell'IP
 * risponde Acasystem, così un errore di battitura non lascia l'app in una pagina vuota.
 */

export type WizardError = HostError | PortError | 'unreachable' | 'not-acasystem';

export type WizardResult =
  | { ok: true; config: ClientConfig; serverVersion: string | null }
  | { ok: false; error: WizardError };

export interface WizardInput {
  host: string;
  /** Solo dalle impostazioni avanzate; vuoto o assente = porta predefinita. */
  port?: string;
}

export const submitAddress = async (
  { host, port }: WizardInput,
  { http, config, timeoutMs = DEFAULT_RELEASE_TIMEOUTS.health }: {
    http: HttpClient;
    config: ConfigStore;
    timeoutMs?: number;
  }
): Promise<WizardResult> => {
  const parsedHost = parseHost(host);
  if (!parsedHost.ok) return { ok: false, error: parsedHost.error };
  const parsedPort = parsePort(port);
  if (!parsedPort.ok) return { ok: false, error: parsedPort.error };
  const candidate: ClientConfig = { host: parsedHost.value, port: parsedPort.value };

  const health = await checkServer(http, serverOrigin(candidate), timeoutMs);
  if (health.kind !== 'ok') return { ok: false, error: health.kind };
  await config.save(candidate);
  return { ok: true, config: candidate, serverVersion: health.version };
};
