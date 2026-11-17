import type { RegistrationInput, RegistrationResult } from '../../../contracts/registration.ts';
import type { SqliteDatabase } from '../models/database.ts';
import type { HaWsApi } from '../services/devices/haAdapter.ts';
import { isHaError } from '../services/devices/haTransport.ts';

type RegistrationHa = Pick<HaWsApi, 'adminUsers' | 'createHumanUser' | 'updateUser' | 'createCredentials' | 'deleteUser'>;
export interface RegistrationAccess {
  ready(): Promise<boolean>;
  withAdmin<T>(operation: (api: RegistrationHa) => Promise<T>): Promise<T>;
}
interface Attempt {
  id: string; username: string; name: string; color: string | null; user_id: string | null;
  stage: 'reserved' | 'creating' | 'user' | 'credentials' | 'complete' | 'failed';
}
export class RegistrationError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message: string) {
    super(message); this.code = code; this.status = status;
  }
}
const unavailable = () => new RegistrationError('REGISTRATION_UNAVAILABLE', 503, 'La centrale sta preparando gli accessi. Riprova fra poco.');
const exists = () => new RegistrationError('USERNAME_UNAVAILABLE', 409, 'Questo nome utente non è disponibile. Scegline un altro oppure accedi al tuo account.');
const pending = (row: Attempt): RegistrationResult => ({ attemptId: row.id, status: 'pending', userId: null });
const complete = (row: Attempt): RegistrationResult => ({ attemptId: row.id, status: 'created', userId: row.user_id });
export const validAttemptId = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);

export function validateRegistration(value: unknown): RegistrationInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RegistrationError('REGISTRATION_INVALID', 400, 'Controlla i dati inseriti.');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some((key) => !['attemptId', 'name', 'username', 'password', 'color'].includes(key))
    || !validAttemptId(data.attemptId) || typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 128
    || typeof data.username !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(data.username)
    || typeof data.password !== 'string' || data.password.length < 8 || Buffer.byteLength(data.password, 'utf8') > 72
    || (data.color !== undefined && (typeof data.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(data.color)))) {
    throw new RegistrationError('REGISTRATION_INVALID', 400, 'Usa un nome utente con lettere minuscole, numeri, punto o trattino e una password di almeno 8 caratteri (massimo 72 byte).');
  }
  return { attemptId: data.attemptId, name: data.name.trim(), username: data.username, password: data.password,
    ...(typeof data.color === 'string' ? { color: data.color.toLowerCase() } : {}), };
}

/** Journal senza password; il nome provvisorio recupera anche una risposta HA persa. */
export function createRegistrationService({ database, access, onRegistered = () => undefined }: {
  database: SqliteDatabase;
  access: RegistrationAccess;
  onRegistered?: (user: { id: string; name: string; color?: string }) => void;
}) {
  database.exec(`CREATE TABLE IF NOT EXISTS aca_v2_registration_attempts (
    id TEXT PRIMARY KEY, username TEXT NOT NULL, name TEXT NOT NULL, color TEXT, user_id TEXT,
    stage TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  ); CREATE UNIQUE INDEX IF NOT EXISTS aca_v2_registration_username
    ON aca_v2_registration_attempts(username) WHERE stage != 'failed';`);
  if (!(database.prepare('PRAGMA table_info(aca_v2_registration_attempts)').all() as { name: string }[]).some((column) => column.name === 'color')) {
    database.exec('ALTER TABLE aca_v2_registration_attempts ADD COLUMN color TEXT');
  }
  const running = new Map<string, Promise<RegistrationResult>>();
  const read = (id: string) => database.prepare<[string], Attempt>('SELECT * FROM aca_v2_registration_attempts WHERE id = ?').get(id);
  const stage = (row: Attempt, next: Attempt['stage'], userId = row.user_id) => {
    database.prepare('UPDATE aca_v2_registration_attempts SET stage = ?, user_id = ?, updated_at = ? WHERE id = ?')
      .run(next, userId, new Date().toISOString(), row.id);
    row.stage = next; row.user_id = userId;
  };
  const finish = (row: Attempt) => {
    database.transaction(() => {
      const already = read(row.id)?.stage === 'complete';
      stage(row, 'complete');
      if (!already && row.user_id) onRegistered({ id: row.user_id, name: row.name, ...(row.color ? { color: row.color } : {}) });
    })();
    return complete(row);
  };
  const execute = async (input: RegistrationInput): Promise<RegistrationResult> => {
    let row = read(input.attemptId);
    if (row && (row.username !== input.username || row.name !== input.name)) {
      throw new RegistrationError('REGISTRATION_CHANGED', 409, 'I dati del tentativo sono cambiati. Avvia una nuova registrazione.');
    }
    if (row?.stage === 'complete') return complete(row);
    if (row?.stage === 'failed') throw exists();
    if (!await access.ready()) throw unavailable();
    if (!row) {
      const reserved = database.prepare<[string, string], { id: string }>('SELECT id FROM aca_v2_registration_attempts WHERE username = ? AND stage != ?')
        .get(input.username, 'failed');
      if (reserved) throw exists();
      const timestamp = new Date().toISOString();
      database.prepare('INSERT INTO aca_v2_registration_attempts (id,username,name,color,stage,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
        .run(input.attemptId, input.username, input.name, input.color ?? null, 'reserved', timestamp, timestamp);
      row = read(input.attemptId)!;
    }
    const attempt = row;
    return access.withAdmin(async (api) => {
      let users = await api.adminUsers();
      let own = attempt.user_id ? users.find((user) => user.id === attempt.user_id) : undefined;
      const marker = `ACA registrazione ${attempt.id}`;
      if (!attempt.user_id) {
        const recovered = users.filter((user) => user.name === marker && !user.isAdmin && !user.isOwner && !user.systemGenerated);
        if (recovered.length > 1) return pending(attempt);
        own = recovered[0];
        if (own) stage(attempt, 'user', own.id);
        else {
          if (users.some((user) => user.username === attempt.username)) { stage(attempt, 'failed'); throw exists(); }
          // Dopo un timeout non inviare nuovamente una creazione forse già accettata da HA.
          if (attempt.stage !== 'reserved') return pending(attempt);
          stage(attempt, 'creating');
          try { own = await api.createHumanUser(marker); }
          catch (error) {
            if (isHaError(error) && error.neverSent) stage(attempt, 'reserved');
            return pending(attempt);
          }
          stage(attempt, 'user', own.id);
        }
      }
      if (!own || own.isOwner || own.isAdmin || own.systemGenerated) return pending(attempt);
      if (own.username === attempt.username) return finish(attempt);
      if (own.username !== null) return pending(attempt);
      const rollback = async () => {
        // L'unico ID eliminabile è quello creato e registrato da questo tentativo.
        try { await api.deleteUser(own!.id); stage(attempt, 'failed'); }
        catch { /* Rimane recuperabile: nessuna eliminazione per nome o di credenziali altrui. */ }
      };
      if (users.some((user) => user.id !== own!.id && user.username === attempt.username)) {
        await rollback(); throw exists();
      }
      await api.updateUser(own.id, { name: attempt.name });
      stage(attempt, 'credentials');
      try { await api.createCredentials(own.id, attempt.username, input.password); }
      catch (error) {
        users = await api.adminUsers().catch(() => []);
        if (users.some((user) => user.id === own!.id && user.username === attempt.username)) return finish(attempt);
        if (isHaError(error) && error.kind === 'bad_request' && users.some((user) => user.id === own!.id && user.username === null)) {
          await rollback(); throw exists();
        }
        return pending(attempt);
      }
      return finish(attempt);
    });
  };
  return {
    ready: () => access.ready(),
    get(id: string): RegistrationResult | null {
      const row = read(id);
      return row ? row.stage === 'complete' ? complete(row)
        : row.stage === 'failed' ? { attemptId: row.id, status: 'failed' as const, userId: null } : pending(row) : null;
    },
    register(input: RegistrationInput): Promise<RegistrationResult> {
      const current = running.get(input.attemptId);
      if (current) return current;
      const result = execute(input).finally(() => running.delete(input.attemptId));
      running.set(input.attemptId, result);
      return result;
    },
  };
}
