import { createHash, randomUUID } from 'node:crypto';
import type { HttpFailure, Result } from '../@types/http.ts';
import { inspectImage } from '../helpers/casa3dImage.ts';
import { dataCrypto as defaultDataCrypto } from '../helpers/dataCrypto.ts';
import type { DataCrypto } from '../helpers/dataCrypto.ts';
import { safeParseJson } from '../helpers/json.ts';
import {
  deleteImage,
  findBuilding,
  findBuildingRevision,
  findHistory,
  findImage,
  imageUsage,
  insertBuilding,
  insertHistory,
  latestHistorySavedAt,
  listHistory,
  listHistoryPayloads,
  listImageIdsBefore,
  pruneHistory,
  updateBuildingAtRevision,
  upsertImage,
} from '../models/casa3dModel.ts';
import type { HistoryRow, ImageRow } from '../models/casa3dModel.ts';
import type { SqliteDatabase } from '../models/database.ts';
import {
  checkBuilding,
  emptyBuilding,
  referencedImageIds,
  summarizeBuilding,
} from '../validators/casa3dSchema.ts';

/**
 * Piano della Casa 3D, immagini e punti di ripristino (ADR-0014, T6). Una casa per installazione
 * (`home_id` = 'default'). Il piano ha una revisione: ogni scrittura dichiara la revisione su cui si
 * basa (compare-and-swap) e, se nel frattempo è cambiata, riceve 409 con la revisione attuale.
 * Come le impostazioni, il piano rispetta la modalità di cifratura (`TUNET_ENCRYPTION_MODE`); le
 * immagini (BLOB) no: la cifratura a riposo del piano e delle immagini resta una decisione aperta (D8).
 */

export const CASA3D_HOME_ID = 'default';
/** Punti di ripristino conservati e distanza minima fra due punti automatici (secondi), come l'originale. */
export const HISTORY_MAX = 20;
export const HISTORY_INTERVAL_S = 600;
/** Limiti dell'archivio immagini: numero e byte totali. */
export const MAX_IMAGES = 200;
export const MAX_TOTAL_IMAGE_BYTES = 128 * 1024 * 1024;
/**
 * Un'immagine si carica prima che il piano che la usa sia salvato: finché non è più vecchia di questo
 * tempo (secondi) non è mai eliminata come inutilizzata.
 */
export const IMAGE_GRACE_S = 3600;

const ENCRYPTION_UNAVAILABLE = 'Encryption is required but unavailable';

const failure = (status: number, error: string): { ok: false; failure: HttpFailure } => ({
  ok: false,
  failure: { status, error },
});

export type SaveResult =
  | { ok: true; revision: number; updated_at: string }
  | { ok: false; status: number; error: string; revision?: number };

export interface BuildingState {
  building: unknown;
  revision: number;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ImageInfo {
  mime: string;
  width: number;
  height: number;
  size: number;
}

export interface ImportResult {
  revision: number;
  building: unknown;
  packs: number;
  skipped: { id: string; reason: string }[];
}

export interface Casa3dService {
  getBuilding(): Result<BuildingState>;
  getRevision(): number;
  saveBuilding(input: {
    building: Record<string, unknown>;
    baseRevision: number;
    userId: string;
    now?: number;
  }): SaveResult;
  listHistory(): HistoryRow[];
  snapshot(): Result<HistoryRow | null>;
  restore(snapshotId: string, userId: string): Result<{ revision: number }>;
  getImage(imageId: string): ImageRow | undefined;
  putImage(imageId: string, bytes: Buffer, userId: string, declaredMime?: string): Result<ImageInfo>;
  removeImage(imageId: string): boolean;
  exportBackup(): Result<{ building: unknown }>;
  importBackup(input: {
    building: Record<string, unknown>;
    packs: unknown[];
    userId: string;
  }): Result<ImportResult>;
}

const packId = (pack: unknown, index: number): string => {
  const id = typeof pack === 'object' && pack !== null ? (pack as { id?: unknown }).id : undefined;
  return typeof id === 'string' ? id.slice(0, 64) : `#${index + 1}`;
};

export const createCasa3dService = (
  database: SqliteDatabase,
  crypto: DataCrypto = defaultDataCrypto
): Casa3dService => {
  /** Testo in chiaro e cifrato di un piano secondo la modalità di cifratura; null se la scrittura cifrata è obbligatoria ma impossibile. */
  const encode = (building: unknown): { data: string; dataEnc: string | null } | null => {
    const payload = JSON.stringify(building);
    const dataEnc = crypto.encryptDataText(payload);
    if (dataEnc === null && crypto.isEncryptionWriteRequired()) return null;
    return {
      data: crypto.shouldPersistPlaintextData() ? payload : crypto.getEncryptedOnlyPlaintextStub(),
      dataEnc,
    };
  };

  const decode = (row: { data: string; data_enc: string | null }, context: string): unknown => {
    const text = crypto.resolveStoredDataText({
      plainText: row.data,
      encryptedText: row.data_enc,
      context,
    });
    return text === null ? undefined : safeParseJson(text, undefined);
  };

  const nowSeconds = (): number => Math.floor(Date.now() / 1000);

  /** Mette lo stato attuale tra i punti di ripristino; null se non c'è un piano da conservare. */
  const takeSnapshot = (now: number): HistoryRow | null => {
    const row = findBuilding(database, CASA3D_HOME_ID);
    if (!row) return null;
    const building = decode(row, 'casa3d/snapshot');
    if (building === undefined) return null;
    const entry: HistoryRow = {
      id: randomUUID().replace(/-/g, '').slice(0, 12),
      revision: row.revision,
      saved_at: now,
      ...summarizeBuilding(building),
    };
    insertHistory(database, {
      id: entry.id,
      homeId: CASA3D_HOME_ID,
      revision: entry.revision,
      savedAt: entry.saved_at,
      floors: entry.floors,
      rooms: entry.rooms,
      furniture: entry.furniture,
      data: row.data,
      dataEnc: row.data_enc,
    });
    pruneHistory(database, CASA3D_HOME_ID, HISTORY_MAX);
    return entry;
  };

  /**
   * Elimina le immagini che né il piano `building` né un punto di ripristino usano più (e non sono appena
   * state caricate): lo sfondo sostituito o tolto non resta nell'archivio né si può più leggere.
   * Da chiamare dentro la transazione che ha scritto il piano.
   */
  const dropUnusedImages = (building: unknown): void => {
    const cutoff = new Date(Date.now() - IMAGE_GRACE_S * 1000).toISOString();
    const used = referencedImageIds(building);
    const candidates = listImageIdsBefore(database, CASA3D_HOME_ID, cutoff).filter((id) => !used.has(id));
    if (candidates.length === 0) return;
    for (const row of listHistoryPayloads(database, CASA3D_HOME_ID)) {
      const point = decode(row, 'casa3d/images');
      if (typeof point !== 'object' || point === null) return; // a point that cannot be read may still use any picture
      for (const id of referencedImageIds(point)) used.add(id);
    }
    for (const id of candidates) {
      if (!used.has(id)) deleteImage(database, CASA3D_HOME_ID, id);
    }
  };

  /** Scrive il piano se la revisione salvata è `expectedRevision` (0 = nessun piano ancora). Da chiamare dentro una transazione. */
  const write = (
    building: Record<string, unknown>,
    expectedRevision: number,
    userId: string,
    now: number,
    automaticSnapshot: boolean
  ): SaveResult => {
    const encoded = encode(building);
    if (!encoded) return { ok: false, status: 503, error: ENCRYPTION_UNAVAILABLE };
    const updatedAt = new Date(now * 1000).toISOString();

    const existing = findBuilding(database, CASA3D_HOME_ID);
    const currentRevision = existing?.revision ?? 0;
    if (currentRevision !== expectedRevision) {
      return { ok: false, status: 409, error: 'Revision conflict', revision: currentRevision };
    }
    if (automaticSnapshot && existing) {
      const hasFloors = summarizeBuilding(decode(existing, 'casa3d/building')).floors > 0;
      if (hasFloors && now - latestHistorySavedAt(database, CASA3D_HOME_ID) > HISTORY_INTERVAL_S) {
        takeSnapshot(now);
      }
    }
    if (!existing) {
      insertBuilding(database, { homeId: CASA3D_HOME_ID, ...encoded, userId, updatedAt });
      return { ok: true, revision: 1, updated_at: updatedAt };
    }
    const changes = updateBuildingAtRevision(database, {
      homeId: CASA3D_HOME_ID,
      ...encoded,
      userId,
      updatedAt,
      expectedRevision,
    });
    if (!changes) {
      return {
        ok: false,
        status: 409,
        error: 'Revision conflict',
        revision: findBuildingRevision(database, CASA3D_HOME_ID),
      };
    }
    return { ok: true, revision: expectedRevision + 1, updated_at: updatedAt };
  };

  /** Sostituzione esplicita del piano (ripristino, importazione): prima un punto di ripristino dello stato attuale. */
  const replace = (building: Record<string, unknown>, userId: string): SaveResult =>
    database.transaction((): SaveResult => {
      const now = nowSeconds();
      takeSnapshot(now);
      const result = write(building, findBuildingRevision(database, CASA3D_HOME_ID), userId, now, false);
      if (result.ok) dropUnusedImages(building);
      return result;
    })();

  return {
    getBuilding: () => {
      const row = findBuilding(database, CASA3D_HOME_ID);
      if (!row) {
        return {
          ok: true,
          value: { building: emptyBuilding(), revision: 0, updated_at: null, updated_by: null },
        };
      }
      const building = decode(row, 'casa3d/building');
      if (building === undefined) return failure(500, 'Stored plan is unreadable');
      return {
        ok: true,
        value: {
          building,
          revision: row.revision,
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        },
      };
    },

    getRevision: () => findBuildingRevision(database, CASA3D_HOME_ID),

    saveBuilding: ({ building, baseRevision, userId, now = nowSeconds() }) =>
      database.transaction(() => {
        const result = write(building, baseRevision, userId, now, true);
        if (result.ok) dropUnusedImages(building);
        return result;
      })(),

    listHistory: () => listHistory(database, CASA3D_HOME_ID),

    snapshot: () => ({ ok: true, value: database.transaction(() => takeSnapshot(nowSeconds()))() }),

    restore: (snapshotId, userId) => {
      const point = findHistory(database, CASA3D_HOME_ID, snapshotId);
      if (!point) return failure(404, 'Restore point not found');
      const building = decode(point, 'casa3d/restore');
      if (typeof building !== 'object' || building === null || Array.isArray(building)) {
        return failure(500, 'Restore point is unreadable');
      }
      const problem = checkBuilding(building);
      if (problem) return failure(422, `Restore point is not valid: ${problem}`);
      const result = replace(building as Record<string, unknown>, userId);
      return result.ok ? { ok: true, value: { revision: result.revision } } : failure(result.status, result.error);
    },

    getImage: (imageId) => findImage(database, CASA3D_HOME_ID, imageId),

    putImage: (imageId, bytes, userId, declaredMime) => {
      const checked = inspectImage(bytes);
      if (!checked.ok) return failure(checked.status, checked.reason);
      if (declaredMime !== undefined && declaredMime !== checked.mime) {
        return failure(415, `The image is ${checked.mime}, not ${declaredMime}`);
      }
      let usage = imageUsage(database, CASA3D_HOME_ID, imageId);
      if (usage.count + 1 > MAX_IMAGES || usage.bytes + bytes.length > MAX_TOTAL_IMAGE_BYTES) {
        // The archive looks full: first let go of the pictures nothing uses any more.
        database.transaction(() => {
          const row = findBuilding(database, CASA3D_HOME_ID);
          const current = row ? decode(row, 'casa3d/images') : emptyBuilding();
          if (typeof current === 'object' && current !== null) dropUnusedImages(current);
        })();
        usage = imageUsage(database, CASA3D_HOME_ID, imageId);
      }
      if (usage.count + 1 > MAX_IMAGES) return failure(413, `At most ${MAX_IMAGES} images can be stored`);
      if (usage.bytes + bytes.length > MAX_TOTAL_IMAGE_BYTES) {
        return failure(413, 'The image archive is full');
      }
      upsertImage(database, {
        homeId: CASA3D_HOME_ID,
        imageId,
        mime: checked.mime,
        width: checked.width,
        height: checked.height,
        bytes,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        userId,
        updatedAt: new Date().toISOString(),
      });
      return {
        ok: true,
        value: { mime: checked.mime, width: checked.width, height: checked.height, size: bytes.length },
      };
    },

    removeImage: (imageId) => deleteImage(database, CASA3D_HOME_ID, imageId) > 0,

    exportBackup: () => {
      const row = findBuilding(database, CASA3D_HOME_ID);
      if (!row) return { ok: true, value: { building: emptyBuilding() } };
      const building = decode(row, 'casa3d/backup');
      return building === undefined ? failure(500, 'Stored plan is unreadable') : { ok: true, value: { building } };
    },

    importBackup: ({ building, packs, userId }) => {
      const result = replace(building, userId);
      if (!result.ok) return failure(result.status, result.error);
      // Furniture packs carry signed features; their check lived in the original Python backend, which is not
      // ported, so none is accepted (PATCHES.md, section 6). Unlocking Pro features belongs to T8.
      const skipped = packs.map((pack, index) => ({ id: packId(pack, index), reason: 'unsupported' }));
      return { ok: true, value: { revision: result.revision, building, packs: 0, skipped } };
    },
  };
};
