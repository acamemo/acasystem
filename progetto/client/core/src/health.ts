import type { HttpClient } from './ports.ts';
import { HttpRequestError } from './ports.ts';
import { parseVersion } from './version.ts';

/**
 * `GET /api/health` del server Acasystem: risponde `{"status":"ok","version":…}`
 * (backend/src/controllers/healthController.ts). Una risposta diversa vuol dire che a
 * quell'indirizzo c'è altro (per esempio HA sulla 8123), non Acasystem.
 */

export type HealthResult =
  | { kind: 'ok'; version: string | null }
  | { kind: 'unreachable' }
  | { kind: 'not-acasystem' };

export const checkServer = async (
  http: HttpClient,
  origin: string,
  timeoutMs: number
): Promise<HealthResult> => {
  let body: unknown;
  try {
    body = await http.getJson(`${origin}/api/health`, timeoutMs);
  } catch (error) {
    // Risponde qualcosa che non è il JSON atteso (404, HTML): c'è un altro servizio.
    const answered =
      error instanceof HttpRequestError && (error.kind === 'status' || error.kind === 'format');
    return { kind: answered ? 'not-acasystem' : 'unreachable' };
  }
  if (typeof body !== 'object' || body === null) return { kind: 'not-acasystem' };
  const { status, version } = body as Record<string, unknown>;
  if (status !== 'ok') return { kind: 'not-acasystem' };
  // 'unknown' o assente: il server non dichiara la versione, il controllo minServer si salta.
  const known = typeof version === 'string' && parseVersion(version) !== null;
  return { kind: 'ok', version: known ? (version as string).trim() : null };
};
