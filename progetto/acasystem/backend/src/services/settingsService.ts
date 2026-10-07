import type { ClientValue, Result } from '../@types/http.ts';
import type {
  CurrentSettingsResponse,
  CurrentSettingsRow,
  SettingsDeviceRow,
  SettingsHistoryEntry,
} from '../@types/storage.ts';
import { readSettingsHistoryKeepLimit } from '../config/env.ts';
import { dataCrypto as defaultDataCrypto } from '../helpers/dataCrypto.ts';
import type { DataCrypto } from '../helpers/dataCrypto.ts';
import { safeParseJson } from '../helpers/json.ts';
import type { SqliteDatabase } from '../models/database.ts';
import {
  deleteCurrentSettings,
  deleteSettingsHistory,
  deleteSettingsHistoryExcept,
  findCurrentPayload,
  findCurrentRevision,
  findCurrentRevisionAndLabel,
  findCurrentSettings,
  findSettingsRevision,
  insertCurrentSettings,
  insertSettingsHistory,
  listOtherDeviceIds,
  listSettingsHistory,
  listUserDevices,
  overwriteCurrentSettings,
  pruneSettingsHistory,
  updateCurrentSettingsAtRevision,
  updateDeviceLabel,
} from '../models/settingsModel.ts';
import { normalizeDeviceLabel } from '../validators/common.ts';
import type {
  CurrentSettingsInput,
  DeviceLabelInput,
  PublishSettingsInput,
} from '../validators/settingsValidators.ts';

/**
 * Configurazione corrente di ogni dispositivo, con revisioni (compare-and-swap),
 * storico limitato e pubblicazione da un dispositivo agli altri.
 */

/** Revisioni conservate per dispositivo (SETTINGS_HISTORY_KEEP_LIMIT, 5–500, predefinito 50). */
const HISTORY_KEEP_LIMIT = readSettingsHistoryKeepLimit();
const ENCRYPTION_UNAVAILABLE = 'Encryption is required but unavailable';
const warnedWriteFailures = new Set<string>();

/** Limite dello storico richiesto dal client, ricondotto a 5–500. */
export const resolveKeepLimit = (rawLimit: unknown): number => {
  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed)) return HISTORY_KEEP_LIMIT;
  return Math.min(Math.max(Math.trunc(parsed), 5), 500);
};

/** Vero se il valore è convertibile in un numero finito (null vale 0). */
export const hasUsableBaseRevision = (value: unknown): boolean => Number.isFinite(Number(value));

const warnEncryptionWriteFailure = (crypto: DataCrypto, context: string): void => {
  if (!crypto.isDataEncryptionEnabled()) return;
  if (warnedWriteFailures.has(context)) return;
  warnedWriteFailures.add(context);
  console.warn(`[settings] Failed to produce encrypted payload in ${context}.`);
};

const parseStoredData = (crypto: DataCrypto, row: CurrentSettingsRow, context: string): unknown =>
  safeParseJson(
    crypto.resolveStoredDataText({
      plainText: row.data,
      encryptedText: row.data_enc,
      context,
    }),
    {}
  );

export type SnapshotWriteResult =
  | { ok: true; revision: number; updated_at: string }
  | { ok: false; status: number; error: string; revision?: number };

export interface SnapshotWriteOptions {
  database: SqliteDatabase;
  haUserId: string;
  deviceId: ClientValue;
  data: ClientValue;
  baseRevision: ClientValue;
  historyKeepLimit: ClientValue;
  deviceLabel?: ClientValue;
  now?: string;
  crypto?: DataCrypto;
}

/**
 * Scrive la configurazione corrente del dispositivo. La prima scrittura crea la
 * revisione 1; le successive richiedono `baseRevision` uguale alla revisione salvata,
 * altrimenti 409 con la revisione attuale.
 */
export const writeCurrentSettingsSnapshot = ({
  database,
  haUserId,
  deviceId,
  data,
  baseRevision,
  historyKeepLimit,
  deviceLabel,
  now = new Date().toISOString(),
  crypto = defaultDataCrypto,
}: SnapshotWriteOptions): SnapshotWriteResult => {
  const payload = JSON.stringify(data);
  const encryptedPayload = crypto.encryptDataText(payload);
  if (encryptedPayload === null) {
    warnEncryptionWriteFailure(crypto, 'put-current');
    if (crypto.isEncryptionWriteRequired()) {
      return {
        ok: false,
        status: 503,
        error: ENCRYPTION_UNAVAILABLE,
      };
    }
  }

  const plainPayload = crypto.shouldPersistPlaintextData()
    ? payload
    : crypto.getEncryptedOnlyPlaintextStub();
  const requestedLabel = deviceLabel === undefined ? undefined : normalizeDeviceLabel(deviceLabel);
  const keepLimit = resolveKeepLimit(historyKeepLimit);

  const writeTransaction = database.transaction((): SnapshotWriteResult => {
    const existing = findCurrentRevisionAndLabel(database, haUserId, deviceId);

    if (!existing) {
      insertCurrentSettings(database, {
        haUserId,
        deviceId,
        deviceLabel: requestedLabel ?? null,
        data: plainPayload,
        dataEnc: encryptedPayload,
        updatedAt: now,
      });
      insertSettingsHistory(database, {
        haUserId,
        deviceId,
        revision: 1,
        data: plainPayload,
        dataEnc: encryptedPayload,
        updatedAt: now,
      });
      pruneSettingsHistory(database, haUserId, deviceId, keepLimit);

      return {
        ok: true,
        revision: 1,
        updated_at: now,
      };
    }

    if (!hasUsableBaseRevision(baseRevision)) {
      return {
        ok: false,
        status: 409,
        error: 'Revision conflict',
        revision: Number(existing.revision),
      };
    }

    const expectedRevision = Number(baseRevision);
    if (expectedRevision !== Number(existing.revision)) {
      return {
        ok: false,
        status: 409,
        error: 'Revision conflict',
        revision: Number(existing.revision),
      };
    }

    const nextRevision = Number(existing.revision) + 1;
    const resolvedLabel =
      deviceLabel === undefined ? existing.device_label || null : (requestedLabel ?? null);
    const changes = updateCurrentSettingsAtRevision(database, {
      haUserId,
      deviceId,
      deviceLabel: resolvedLabel,
      data: plainPayload,
      dataEnc: encryptedPayload,
      revision: nextRevision,
      updatedAt: now,
      expectedRevision,
    });

    if (!changes) {
      const latest = findCurrentRevision(database, haUserId, deviceId);
      return {
        ok: false,
        status: 409,
        error: 'Revision conflict',
        revision: Number(latest?.revision ?? existing.revision),
      };
    }

    insertSettingsHistory(database, {
      haUserId,
      deviceId,
      revision: nextRevision,
      data: plainPayload,
      dataEnc: encryptedPayload,
      updatedAt: now,
    });
    pruneSettingsHistory(database, haUserId, deviceId, keepLimit);

    return {
      ok: true,
      revision: nextRevision,
      updated_at: now,
    };
  });

  return writeTransaction();
};

export interface DeleteHistoryResult {
  success: true;
  deleted: number;
  kept_revision?: number;
}

export interface DeleteDeviceResult {
  success: true;
  deleted_current: number;
  deleted_history: number;
}

export interface DeviceLabelResult {
  success: true;
  ha_user_id: string;
  device_id: unknown;
  device_label: string | null;
}

export interface PublishResult {
  success: true;
  affected: number;
}

export interface SettingsService {
  getCurrent(
    haUserId: string,
    deviceId: ClientValue,
    revision: ClientValue
  ): CurrentSettingsResponse | null;
  listHistory(haUserId: string, deviceId: ClientValue, limit: ClientValue): SettingsHistoryEntry[];
  deleteHistory(
    haUserId: string,
    deviceId: ClientValue,
    keepLatest: ClientValue
  ): DeleteHistoryResult;
  listDevices(haUserId: string): SettingsDeviceRow[];
  deleteDevice(haUserId: string, deviceId: ClientValue): DeleteDeviceResult;
  updateDeviceLabel(input: DeviceLabelInput): Result<DeviceLabelResult>;
  writeCurrent(input: CurrentSettingsInput): SnapshotWriteResult;
  publish(input: PublishSettingsInput): Result<PublishResult>;
}

export const createSettingsService = (
  database: SqliteDatabase,
  crypto: DataCrypto = defaultDataCrypto
): SettingsService => ({
  getCurrent: (haUserId, deviceId, revision) => {
    const row = revision
      ? findSettingsRevision(database, haUserId, deviceId, Number(revision))
      : findCurrentSettings(database, haUserId, deviceId);

    if (!row) return null;
    return {
      ha_user_id: row.ha_user_id,
      device_id: row.device_id,
      data: parseStoredData(
        crypto,
        row,
        `settings/current:${haUserId}:${String(deviceId)}:${String(revision || 'latest')}`
      ),
      revision: row.revision,
      device_label: row.device_label || null,
      updated_at: row.updated_at,
    };
  },

  listHistory: (haUserId, deviceId, limit) => {
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    return listSettingsHistory(database, haUserId, deviceId, parsedLimit);
  },

  deleteHistory: (haUserId, deviceId, keepLatestRaw) => {
    const keepLatest = keepLatestRaw === undefined ? true : String(keepLatestRaw) !== '0';
    if (!keepLatest) {
      return { success: true, deleted: deleteSettingsHistory(database, haUserId, deviceId) };
    }

    const latest = findCurrentRevision(database, haUserId, deviceId);
    if (!latest || !Number.isFinite(Number(latest.revision))) {
      return { success: true, deleted: deleteSettingsHistory(database, haUserId, deviceId) };
    }

    const keptRevision = Number(latest.revision);
    return {
      success: true,
      deleted: deleteSettingsHistoryExcept(database, haUserId, deviceId, keptRevision),
      kept_revision: keptRevision,
    };
  },

  listDevices: (haUserId) => listUserDevices(database, haUserId),

  deleteDevice: (haUserId, deviceId) => {
    // Two separate statements, as in the original route (no transaction).
    const deletedCurrent = deleteCurrentSettings(database, haUserId, deviceId);
    const deletedHistory = deleteSettingsHistory(database, haUserId, deviceId);
    return {
      success: true,
      deleted_current: deletedCurrent,
      deleted_history: deletedHistory,
    };
  },

  updateDeviceLabel: ({ haUserId, deviceId, deviceLabel }) => {
    const normalizedLabel = normalizeDeviceLabel(deviceLabel);
    if (!updateDeviceLabel(database, haUserId, deviceId, normalizedLabel)) {
      return { ok: false, failure: { status: 404, error: 'Device not found' } };
    }
    return {
      ok: true,
      value: {
        success: true,
        ha_user_id: haUserId,
        device_id: deviceId,
        device_label: normalizedLabel,
      },
    };
  },

  writeCurrent: (input) =>
    writeCurrentSettingsSnapshot({
      database,
      haUserId: input.haUserId,
      deviceId: input.deviceId,
      data: input.data,
      baseRevision: input.baseRevision,
      historyKeepLimit: input.historyKeepLimit,
      deviceLabel: input.deviceLabel,
      crypto,
    }),

  publish: ({ haUserId, sourceDeviceId, targetDeviceId, historyKeepLimit }) => {
    const source = findCurrentPayload(database, haUserId, sourceDeviceId);
    if (!source) {
      return { ok: false, failure: { status: 404, error: 'Source device config not found' } };
    }

    const sourcePayload = crypto.resolveStoredDataText({
      plainText: source.data,
      encryptedText: source.data_enc,
      context: `settings/publish-source:${haUserId}:${String(sourceDeviceId)}`,
    });
    if (!sourcePayload) {
      return { ok: false, failure: { status: 500, error: 'Source device config is unreadable' } };
    }
    const sourceEncryptedPayload = crypto.encryptDataText(sourcePayload);
    if (sourceEncryptedPayload === null) {
      warnEncryptionWriteFailure(crypto, 'publish:source');
      if (crypto.isEncryptionWriteRequired()) {
        return { ok: false, failure: { status: 503, error: ENCRYPTION_UNAVAILABLE } };
      }
    }
    const sourcePlainPayload = crypto.shouldPersistPlaintextData()
      ? sourcePayload
      : crypto.getEncryptedOnlyPlaintextStub();

    const now = new Date().toISOString();

    const upsertTarget = (deviceId: ClientValue): number => {
      const existing = findCurrentRevision(database, haUserId, deviceId);
      const revision = existing ? Number(existing.revision) + 1 : 1;
      const snapshot = {
        haUserId,
        deviceId,
        data: sourcePlainPayload,
        dataEnc: sourceEncryptedPayload,
        updatedAt: now,
      };

      if (existing) {
        overwriteCurrentSettings(database, { ...snapshot, revision });
      } else {
        insertCurrentSettings(database, { ...snapshot, deviceLabel: null });
      }
      insertSettingsHistory(database, { ...snapshot, revision });
      pruneSettingsHistory(database, haUserId, deviceId, resolveKeepLimit(historyKeepLimit));
      return 1;
    };

    const targetIds: ClientValue[] = targetDeviceId
      ? [targetDeviceId]
      : listOtherDeviceIds(database, haUserId, sourceDeviceId);

    const publishTargets = database.transaction((deviceIds: ClientValue[]): number => {
      let affected = 0;
      deviceIds.forEach((deviceId) => {
        affected += upsertTarget(deviceId);
      });
      return affected;
    });

    try {
      return { ok: true, value: { success: true, affected: publishTargets(targetIds) } };
    } catch (error) {
      console.error('[settings] Failed to publish settings:', error);
      return {
        ok: false,
        failure: { status: 500, error: 'Failed to publish settings to target devices' },
      };
    }
  },
});
