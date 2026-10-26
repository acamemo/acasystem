import { createHash } from 'node:crypto';
import { isRecord } from '../../helpers/objects.ts';
import { readSecretFile, removeSecretFile, writeSecretFile } from '../../helpers/secretFile.ts';
import { DeviceError } from './deviceErrors.ts';
import type { HaAdapter } from './haAdapter.ts';
import { isHaError } from './haTransport.ts';

/**
 * The service identity of ADR-0022: a declared Home Assistant user, "Acasystem (servizio)",
 * whose long-lived token lives only in one file on the server.
 *
 * Invariants kept here:
 * - the token is read from the file, held in memory and sent only to HA; it is never
 *   returned, logged or stored anywhere else;
 * - there is no fallback: if the identity is missing, expired, suspended or lost its admin
 *   group, `requireToken` throws "service not active" and the caller must stop;
 * - a change of the file (new token, removed file) is seen without restarting the server.
 */

export interface ServiceIdentitySecret {
  version: 1;
  token: string;
  userId: string;
  userName: string;
  createdAt: string;
  /** End of the token's validity as computed at creation; null if unknown. */
  expiresAt: string | null;
  haVersion: string | null;
}

export type SecretLoad =
  | { ok: true; secret: ServiceIdentitySecret }
  | { ok: false; reason: 'missing' | 'unreadable' | 'too_open' | 'invalid' };

export interface ServiceIdentityStore {
  path(): string;
  load(): SecretLoad;
  save(secret: ServiceIdentitySecret): void;
  remove(): void;
}

export const createServiceIdentityStore = (getPath: () => string): ServiceIdentityStore => ({
  path: getPath,

  load() {
    const read = readSecretFile(getPath());
    if (!read.ok) return read;

    try {
      const parsed: unknown = JSON.parse(read.content);
      if (
        !isRecord(parsed) ||
        parsed.version !== 1 ||
        typeof parsed.token !== 'string' ||
        parsed.token.length < 16 ||
        typeof parsed.userId !== 'string' ||
        !parsed.userId
      ) {
        return { ok: false, reason: 'invalid' };
      }
      return {
        ok: true,
        secret: {
          version: 1,
          token: parsed.token,
          userId: parsed.userId,
          userName: typeof parsed.userName === 'string' ? parsed.userName : '',
          createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
          expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : null,
          haVersion: typeof parsed.haVersion === 'string' ? parsed.haVersion : null,
        },
      };
    } catch {
      return { ok: false, reason: 'invalid' };
    }
  },

  save(secret) {
    writeSecretFile(getPath(), `${JSON.stringify(secret)}\n`);
  },

  remove() {
    removeSecretFile(getPath());
  },
});

export type IdentityState =
  | 'active'
  | 'missing'
  | 'unreadable'
  | 'expired'
  | 'rejected'
  | 'not_admin'
  | 'mismatch'
  | 'unreachable';

export interface IdentityStatus {
  state: IdentityState;
  expiresAt: string | null;
  checkedAt: number;
  /** Hash of the token the state refers to (never the token); null without a readable file. */
  fingerprint: string | null;
}

export interface ServiceIdentity {
  /** Current state; probes HA at most once per `cacheMs` (3 s while HA is unreachable). */
  status(options?: { force?: boolean }): Promise<IdentityStatus>;
  /** The token for an allowed call, or throws SERVICE_NOT_ACTIVE / HA_UNREACHABLE. */
  requireToken(): Promise<string>;
  /** HA refused the token during a call: stop using it until the next probe succeeds. */
  markRejected(): void;
  invalidate(): void;
  store: ServiceIdentityStore;
}

export interface ServiceIdentityOptions {
  store: ServiceIdentityStore;
  adapter: HaAdapter;
  now?: () => number;
  /** How long a probe result is trusted. Default 15 s. */
  cacheMs?: number;
}

const UNREACHABLE_CACHE_MS = 3_000;

const fingerprint = (token: string): string => createHash('sha256').update(token).digest('hex');

export const createServiceIdentity = ({
  store,
  adapter,
  now = Date.now,
  cacheMs = 15_000,
}: ServiceIdentityOptions): ServiceIdentity => {
  let cached: { key: string; status: IdentityStatus } | null = null;

  const probe = async (secret: ServiceIdentitySecret): Promise<IdentityState> => {
    if (secret.expiresAt) {
      const end = Date.parse(secret.expiresAt);
      if (Number.isFinite(end) && end <= now()) return 'expired';
    }
    try {
      const user = await adapter.ws(secret.token).currentUser();
      if (user.id !== secret.userId) return 'mismatch';
      if (!user.isAdmin) return 'not_admin';
      return 'active';
    } catch (error) {
      if (isHaError(error) && (error.kind === 'unauthorized' || error.kind === 'forbidden')) {
        return 'rejected';
      }
      return 'unreachable';
    }
  };

  const status = async (options: { force?: boolean } = {}): Promise<IdentityStatus> => {
    const loaded = store.load();
    if (!loaded.ok) {
      cached = null;
      const state: IdentityState = loaded.reason === 'missing' ? 'missing' : 'unreadable';
      return { state, expiresAt: null, checkedAt: now(), fingerprint: null };
    }

    const key = fingerprint(loaded.secret.token);
    const current = now();
    if (!options.force && cached && cached.key === key) {
      const ttl =
        cached.status.state === 'unreachable' ? Math.min(UNREACHABLE_CACHE_MS, cacheMs) : cacheMs;
      if (current - cached.status.checkedAt < ttl) return cached.status;
    }

    const state = await probe(loaded.secret);
    const result: IdentityStatus = {
      state,
      expiresAt: loaded.secret.expiresAt,
      checkedAt: now(),
      fingerprint: key,
    };
    cached = { key, status: result };
    return result;
  };

  return {
    store,
    status,

    async requireToken() {
      const current = await status();
      if (current.state === 'unreachable') throw new DeviceError('HA_UNREACHABLE');
      if (current.state !== 'active') throw new DeviceError('SERVICE_NOT_ACTIVE');

      const loaded = store.load();
      if (!loaded.ok) throw new DeviceError('SERVICE_NOT_ACTIVE');
      return loaded.secret.token;
    },

    markRejected() {
      const loaded = store.load();
      if (!loaded.ok) {
        cached = null;
        return;
      }
      cached = {
        key: fingerprint(loaded.secret.token),
        status: {
          state: 'rejected',
          expiresAt: loaded.secret.expiresAt,
          checkedAt: now(),
          fingerprint: fingerprint(loaded.secret.token),
        },
      };
    },

    invalidate() {
      cached = null;
    },
  };
};

/** Message for the installer about the state of the identity (never for a customer). */
export const describeIdentityState = (state: IdentityState): string => {
  switch (state) {
    case 'active':
      return 'Il servizio di configurazione dei dispositivi è attivo.';
    case 'missing':
      return 'Il servizio di configurazione dei dispositivi non è stato attivato.';
    case 'unreadable':
      return 'Il file del servizio non si può leggere o ha permessi troppo larghi.';
    case 'expired':
      return 'Il token del servizio è scaduto: va rifatta l’attivazione.';
    case 'rejected':
      return 'Home Assistant rifiuta il servizio: l’utente «Acasystem (servizio)» è sospeso, eliminato o il token è stato revocato.';
    case 'not_admin':
      return 'L’utente «Acasystem (servizio)» non è più amministratore in Home Assistant.';
    case 'mismatch':
      return 'Il token del servizio non appartiene all’utente dichiarato.';
    case 'unreachable':
      return 'Home Assistant non è raggiungibile: lo stato del servizio non si può verificare.';
  }
};
