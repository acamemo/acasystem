import type { ClientValue } from '../@types/http.ts';
import type {
  CurrentSettingsRow,
  SettingsDeviceRow,
  SettingsHistoryEntry,
  StoredPayloadRow,
} from '../@types/storage.ts';
import type { SqliteDatabase } from './database.ts';

/**
 * Accesso alle tabelle `current_settings` e `current_settings_history`.
 * Le query sono quelle di routes/settings.js. Gli id dei dispositivi arrivano dal
 * client e sono associati da better-sqlite3 senza conversioni (vedi ClientValue).
 */

export const findCurrentSettings = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue
): CurrentSettingsRow | undefined =>
  database
    .prepare<[string, ClientValue], CurrentSettingsRow>(
      `SELECT ha_user_id, device_id, data, data_enc, revision, updated_at, device_label
       FROM current_settings
       WHERE ha_user_id = ? AND device_id = ?`
    )
    .get(haUserId, deviceId);

/** Revisione salvata nello storico; `device_label` è sempre null, come nell'originale. */
export const findSettingsRevision = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue,
  revision: number
): CurrentSettingsRow | undefined =>
  database
    .prepare<[string, ClientValue, number], CurrentSettingsRow>(
      `SELECT ha_user_id, device_id, data, data_enc, revision, updated_at, NULL AS device_label
       FROM current_settings_history
       WHERE ha_user_id = ? AND device_id = ? AND revision = ?`
    )
    .get(haUserId, deviceId, revision);

export const findCurrentRevision = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue
): { revision: number } | undefined =>
  database
    .prepare<[string, ClientValue], { revision: number }>(
      `SELECT revision FROM current_settings
       WHERE ha_user_id = ? AND device_id = ?`
    )
    .get(haUserId, deviceId);

export const findCurrentRevisionAndLabel = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue
): { revision: number; device_label: string | null } | undefined =>
  database
    .prepare<[string, ClientValue], { revision: number; device_label: string | null }>(
      `SELECT revision, device_label FROM current_settings
       WHERE ha_user_id = ? AND device_id = ?`
    )
    .get(haUserId, deviceId);

export const findCurrentPayload = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue
): StoredPayloadRow | undefined =>
  database
    .prepare<[string, ClientValue], StoredPayloadRow>(
      `SELECT data, data_enc FROM current_settings
       WHERE ha_user_id = ? AND device_id = ?`
    )
    .get(haUserId, deviceId);

export interface SettingsSnapshotRecord {
  haUserId: string;
  deviceId: ClientValue;
  data: string;
  dataEnc: string | null;
  updatedAt: string;
}

/** Prima revisione (1) di un dispositivo. */
export const insertCurrentSettings = (
  database: SqliteDatabase,
  record: SettingsSnapshotRecord & { deviceLabel: string | null }
): void => {
  database
    .prepare<[string, ClientValue, string | null, string, string | null, string]>(
      `INSERT INTO current_settings (ha_user_id, device_id, device_label, data, data_enc, revision, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    )
    .run(
      record.haUserId,
      record.deviceId,
      record.deviceLabel,
      record.data,
      record.dataEnc,
      record.updatedAt
    );
};

/** Aggiornamento con confronto della revisione attesa (compare-and-swap). */
export const updateCurrentSettingsAtRevision = (
  database: SqliteDatabase,
  record: SettingsSnapshotRecord & {
    deviceLabel: string | null;
    revision: number;
    expectedRevision: number;
  }
): number =>
  database
    .prepare<
      [string, string | null, string | null, number, string, string, ClientValue, number]
    >(
      `UPDATE current_settings
       SET data = ?, data_enc = ?, device_label = ?, revision = ?, updated_at = ?
       WHERE ha_user_id = ? AND device_id = ? AND revision = ?`
    )
    .run(
      record.data,
      record.dataEnc,
      record.deviceLabel,
      record.revision,
      record.updatedAt,
      record.haUserId,
      record.deviceId,
      record.expectedRevision
    ).changes;

/** Sovrascrittura usata dalla pubblicazione: lascia invariata l'etichetta. */
export const overwriteCurrentSettings = (
  database: SqliteDatabase,
  record: SettingsSnapshotRecord & { revision: number }
): void => {
  database
    .prepare<[string, string | null, number, string, string, ClientValue]>(
      `UPDATE current_settings
       SET data = ?, data_enc = ?, revision = ?, updated_at = ?
       WHERE ha_user_id = ? AND device_id = ?`
    )
    .run(
      record.data,
      record.dataEnc,
      record.revision,
      record.updatedAt,
      record.haUserId,
      record.deviceId
    );
};

export const insertSettingsHistory = (
  database: SqliteDatabase,
  record: SettingsSnapshotRecord & { revision: number }
): void => {
  database
    .prepare<[string, ClientValue, number, string, string | null, string]>(
      `INSERT OR REPLACE INTO current_settings_history (ha_user_id, device_id, revision, data, data_enc, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.haUserId,
      record.deviceId,
      record.revision,
      record.data,
      record.dataEnc,
      record.updatedAt
    );
};

/** Tiene nello storico solo le `keepLimit` revisioni più recenti del dispositivo. */
export const pruneSettingsHistory = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue,
  keepLimit: number
): void => {
  database
    .prepare<[string, ClientValue, string, ClientValue, number]>(
      `DELETE FROM current_settings_history
       WHERE ha_user_id = ?
         AND device_id = ?
         AND revision NOT IN (
           SELECT revision FROM current_settings_history
           WHERE ha_user_id = ? AND device_id = ?
           ORDER BY revision DESC
           LIMIT ?
         )`
    )
    .run(haUserId, deviceId, haUserId, deviceId, keepLimit);
};

export const listSettingsHistory = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue,
  limit: number
): SettingsHistoryEntry[] =>
  database
    .prepare<[string, ClientValue, number], SettingsHistoryEntry>(
      `SELECT revision, updated_at
       FROM current_settings_history
       WHERE ha_user_id = ? AND device_id = ?
       ORDER BY revision DESC
       LIMIT ?`
    )
    .all(haUserId, deviceId, limit);

/** Elimina lo storico del dispositivo; restituisce le righe eliminate. */
export const deleteSettingsHistory = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue
): number =>
  database
    .prepare<[string, ClientValue]>(
      `DELETE FROM current_settings_history
       WHERE ha_user_id = ? AND device_id = ?`
    )
    .run(haUserId, deviceId).changes;

/** Elimina lo storico tranne la revisione indicata; restituisce le righe eliminate. */
export const deleteSettingsHistoryExcept = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue,
  keptRevision: number
): number =>
  database
    .prepare<[string, ClientValue, number]>(
      `DELETE FROM current_settings_history
       WHERE ha_user_id = ? AND device_id = ? AND revision != ?`
    )
    .run(haUserId, deviceId, keptRevision).changes;

export const listUserDevices = (database: SqliteDatabase, haUserId: string): SettingsDeviceRow[] =>
  database
    .prepare<[string], SettingsDeviceRow>(
      `SELECT device_id, device_label, revision, updated_at
       FROM current_settings
       WHERE ha_user_id = ?
       ORDER BY updated_at DESC`
    )
    .all(haUserId);

export const listOtherDeviceIds = (
  database: SqliteDatabase,
  haUserId: string,
  excludedDeviceId: ClientValue
): string[] =>
  database
    .prepare<[string, ClientValue], { device_id: string }>(
      `SELECT device_id FROM current_settings
       WHERE ha_user_id = ? AND device_id != ?`
    )
    .all(haUserId, excludedDeviceId)
    .map((row) => row.device_id);

export const deleteCurrentSettings = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue
): number =>
  database
    .prepare<[string, ClientValue]>(
      `DELETE FROM current_settings
       WHERE ha_user_id = ? AND device_id = ?`
    )
    .run(haUserId, deviceId).changes;

/** Cambia l'etichetta del dispositivo; restituisce le righe aggiornate. */
export const updateDeviceLabel = (
  database: SqliteDatabase,
  haUserId: string,
  deviceId: ClientValue,
  deviceLabel: string | null
): number =>
  database
    .prepare<[string | null, string, ClientValue]>(
      `UPDATE current_settings
       SET device_label = ?, updated_at = datetime('now')
       WHERE ha_user_id = ? AND device_id = ?`
    )
    .run(deviceLabel, haUserId, deviceId).changes;
