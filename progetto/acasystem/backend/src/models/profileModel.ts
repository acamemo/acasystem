import type { ClientValue } from '../@types/http.ts';
import type { ProfileRow } from '../@types/storage.ts';
import type { SqliteDatabase } from './database.ts';

/** Accesso alla tabella `profiles`. Le query sono quelle di routes/profiles.js. */

const PROFILE_COLUMNS = 'id, ha_user_id, name, device_label, data, data_enc, created_at, updated_at';

export const listProfilesByUser = (database: SqliteDatabase, haUserId: string): ProfileRow[] =>
  database
    .prepare<[string], ProfileRow>(
      `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE ha_user_id = ? ORDER BY updated_at DESC`
    )
    .all(haUserId);

export const findProfile = (
  database: SqliteDatabase,
  id: string,
  haUserId: string
): ProfileRow | undefined =>
  database
    .prepare<[string, string], ProfileRow>(
      `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE id = ? AND ha_user_id = ?`
    )
    .get(id, haUserId);

export const profileExists = (database: SqliteDatabase, id: string, haUserId: string): boolean =>
  database
    .prepare<[string, string], { id: string }>(
      'SELECT id FROM profiles WHERE id = ? AND ha_user_id = ?'
    )
    .get(id, haUserId) !== undefined;

export interface NewProfileRecord {
  id: string;
  haUserId: string;
  name: ClientValue;
  deviceLabel: ClientValue;
  data: string;
  dataEnc: string | null;
  createdAt: string;
  updatedAt: string;
}

export const insertProfile = (database: SqliteDatabase, record: NewProfileRecord): void => {
  database
    .prepare<[string, string, ClientValue, ClientValue, string, string | null, string, string]>(
      'INSERT INTO profiles (id, ha_user_id, name, device_label, data, data_enc, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      record.id,
      record.haUserId,
      record.name,
      record.deviceLabel,
      record.data,
      record.dataEnc,
      record.createdAt,
      record.updatedAt
    );
};

export interface ProfileUpdateRecord {
  id: string;
  haUserId: string;
  /** Ogni campo viene scritto solo se `set*` è vero; altrimenti resta il valore salvato. */
  setName: boolean;
  name: ClientValue;
  setDeviceLabel: boolean;
  deviceLabel: ClientValue;
  setData: boolean;
  data: string | null;
  dataEnc: string | null;
  updatedAt: string;
}

export const updateProfile = (database: SqliteDatabase, record: ProfileUpdateRecord): void => {
  database
    .prepare<
      [
        number,
        ClientValue,
        number,
        ClientValue,
        number,
        string | null,
        number,
        string | null,
        string,
        string,
        string,
      ]
    >(
      'UPDATE profiles SET name = CASE WHEN ? THEN ? ELSE name END, device_label = CASE WHEN ? THEN ? ELSE device_label END, data = CASE WHEN ? THEN ? ELSE data END, data_enc = CASE WHEN ? THEN ? ELSE data_enc END, updated_at = ? WHERE id = ? AND ha_user_id = ?'
    )
    .run(
      record.setName ? 1 : 0,
      record.name,
      record.setDeviceLabel ? 1 : 0,
      record.deviceLabel,
      record.setData ? 1 : 0,
      record.data,
      record.setData ? 1 : 0,
      record.dataEnc,
      record.updatedAt,
      record.id,
      record.haUserId
    );
};

/** Numero di righe eliminate (0 se il profilo non esiste per quell'utente). */
export const deleteProfile = (database: SqliteDatabase, id: string, haUserId: string): number =>
  database
    .prepare<[string, string]>('DELETE FROM profiles WHERE id = ? AND ha_user_id = ?')
    .run(id, haUserId).changes;
