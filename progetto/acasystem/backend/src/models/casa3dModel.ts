import type { SqliteDatabase } from './database.ts';

/** Accesso alle tabelle `casa3d_building`, `casa3d_image` e `casa3d_history` (ADR-0014, T6). */

export interface BuildingRow {
  revision: number;
  data: string;
  data_enc: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface HistoryRow {
  id: string;
  revision: number;
  saved_at: number;
  floors: number;
  rooms: number;
  furniture: number;
}

export interface HistoryPayloadRow extends HistoryRow {
  data: string;
  data_enc: string | null;
}

export interface ImageRow {
  image_id: string;
  mime: string;
  width: number;
  height: number;
  bytes: Buffer;
  size: number;
  sha256: string;
}

export const findBuilding = (database: SqliteDatabase, homeId: string): BuildingRow | undefined =>
  database
    .prepare<[string], BuildingRow>(
      `SELECT revision, data, data_enc, updated_by, updated_at FROM casa3d_building WHERE home_id = ?`
    )
    .get(homeId);

export const findBuildingRevision = (database: SqliteDatabase, homeId: string): number =>
  database
    .prepare<[string], { revision: number }>(`SELECT revision FROM casa3d_building WHERE home_id = ?`)
    .get(homeId)?.revision ?? 0;

export const insertBuilding = (
  database: SqliteDatabase,
  record: { homeId: string; data: string; dataEnc: string | null; userId: string; updatedAt: string }
): void => {
  database
    .prepare<[string, string, string | null, string, string]>(
      `INSERT INTO casa3d_building (home_id, revision, data, data_enc, updated_by, updated_at)
       VALUES (?, 1, ?, ?, ?, ?)`
    )
    .run(record.homeId, record.data, record.dataEnc, record.userId, record.updatedAt);
};

/** Compare-and-swap: aggiorna solo se la revisione salvata è ancora quella attesa; restituisce le righe cambiate. */
export const updateBuildingAtRevision = (
  database: SqliteDatabase,
  record: {
    homeId: string;
    data: string;
    dataEnc: string | null;
    userId: string;
    updatedAt: string;
    expectedRevision: number;
  }
): number =>
  database
    .prepare<[string, string | null, number, string, string, string, number]>(
      `UPDATE casa3d_building
       SET data = ?, data_enc = ?, revision = ?, updated_by = ?, updated_at = ?
       WHERE home_id = ? AND revision = ?`
    )
    .run(
      record.data,
      record.dataEnc,
      record.expectedRevision + 1,
      record.userId,
      record.updatedAt,
      record.homeId,
      record.expectedRevision
    ).changes;

export const insertHistory = (
  database: SqliteDatabase,
  record: {
    id: string;
    homeId: string;
    revision: number;
    savedAt: number;
    floors: number;
    rooms: number;
    furniture: number;
    data: string;
    dataEnc: string | null;
  }
): void => {
  database
    .prepare<[string, string, number, number, number, number, number, string, string | null]>(
      `INSERT INTO casa3d_history (id, home_id, revision, saved_at, floors, rooms, furniture, data, data_enc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.homeId,
      record.revision,
      record.savedAt,
      record.floors,
      record.rooms,
      record.furniture,
      record.data,
      record.dataEnc
    );
};

/** Tiene solo i `keep` punti di ripristino più recenti. */
export const pruneHistory = (database: SqliteDatabase, homeId: string, keep: number): void => {
  database
    .prepare<[string, string, number]>(
      `DELETE FROM casa3d_history
       WHERE home_id = ? AND id NOT IN (
         SELECT id FROM casa3d_history WHERE home_id = ? ORDER BY saved_at DESC, rowid DESC LIMIT ?
       )`
    )
    .run(homeId, homeId, keep);
};

export const listHistory = (database: SqliteDatabase, homeId: string): HistoryRow[] =>
  database
    .prepare<[string], HistoryRow>(
      `SELECT id, revision, saved_at, floors, rooms, furniture FROM casa3d_history
       WHERE home_id = ? ORDER BY saved_at DESC, rowid DESC`
    )
    .all(homeId);

export const latestHistorySavedAt = (database: SqliteDatabase, homeId: string): number =>
  database
    .prepare<[string], { saved_at: number | null }>(
      `SELECT MAX(saved_at) AS saved_at FROM casa3d_history WHERE home_id = ?`
    )
    .get(homeId)?.saved_at ?? 0;

export const findHistory = (
  database: SqliteDatabase,
  homeId: string,
  id: string
): HistoryPayloadRow | undefined =>
  database
    .prepare<[string, string], HistoryPayloadRow>(
      `SELECT id, revision, saved_at, floors, rooms, furniture, data, data_enc FROM casa3d_history
       WHERE home_id = ? AND id = ?`
    )
    .get(homeId, id);

/** Tutti i punti di ripristino con il piano che conservano (per sapere quali immagini usano ancora). */
export const listHistoryPayloads = (
  database: SqliteDatabase,
  homeId: string
): { data: string; data_enc: string | null }[] =>
  database
    .prepare<[string], { data: string; data_enc: string | null }>(
      `SELECT data, data_enc FROM casa3d_history WHERE home_id = ?`
    )
    .all(homeId);

/** Id delle immagini scritte l'ultima volta prima di `cutoff` (testo ISO); `julianday` legge anche il formato di SQLite senza `T`. */
export const listImageIdsBefore = (database: SqliteDatabase, homeId: string, cutoff: string): string[] =>
  database
    .prepare<[string, string], { image_id: string }>(
      `SELECT image_id FROM casa3d_image WHERE home_id = ? AND julianday(updated_at) < julianday(?)`
    )
    .all(homeId, cutoff)
    .map((row) => row.image_id);

export const findImage = (database: SqliteDatabase, homeId: string, imageId: string): ImageRow | undefined =>
  database
    .prepare<[string, string], ImageRow>(
      `SELECT image_id, mime, width, height, bytes, size, sha256 FROM casa3d_image
       WHERE home_id = ? AND image_id = ?`
    )
    .get(homeId, imageId);

/** Numero e byte totali delle immagini, senza contare `exceptId` (la sostituzione di un'immagine). */
export const imageUsage = (
  database: SqliteDatabase,
  homeId: string,
  exceptId: string
): { count: number; bytes: number } => {
  const row = database
    .prepare<[string, string], { count: number; bytes: number | null }>(
      `SELECT COUNT(*) AS count, SUM(size) AS bytes FROM casa3d_image WHERE home_id = ? AND image_id != ?`
    )
    .get(homeId, exceptId);
  return { count: row?.count ?? 0, bytes: row?.bytes ?? 0 };
};

export const upsertImage = (
  database: SqliteDatabase,
  record: {
    homeId: string;
    imageId: string;
    mime: string;
    width: number;
    height: number;
    bytes: Buffer;
    sha256: string;
    userId: string;
    updatedAt: string;
  }
): void => {
  database
    .prepare<[string, string, string, number, number, Buffer, number, string, string, string]>(
      `INSERT OR REPLACE INTO casa3d_image
         (home_id, image_id, mime, width, height, bytes, size, sha256, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.homeId,
      record.imageId,
      record.mime,
      record.width,
      record.height,
      record.bytes,
      record.bytes.length,
      record.sha256,
      record.userId,
      record.updatedAt
    );
};

export const deleteImage = (database: SqliteDatabase, homeId: string, imageId: string): number =>
  database
    .prepare<[string, string]>(`DELETE FROM casa3d_image WHERE home_id = ? AND image_id = ?`)
    .run(homeId, imageId).changes;
