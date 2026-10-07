import { randomUUID } from 'node:crypto';
import type { HttpFailure, Result } from '../@types/http.ts';
import type { ProfileResponse, ProfileRow } from '../@types/storage.ts';
import { dataCrypto as defaultDataCrypto } from '../helpers/dataCrypto.ts';
import type { DataCrypto } from '../helpers/dataCrypto.ts';
import { safeParseJson } from '../helpers/json.ts';
import type { SqliteDatabase } from '../models/database.ts';
import {
  deleteProfile,
  findProfile,
  insertProfile,
  listProfilesByUser,
  profileExists,
  updateProfile,
} from '../models/profileModel.ts';
import type { CreateProfileInput, UpdateProfileInput } from '../validators/profileValidators.ts';

/** Profili salvati per utente HA: lettura, creazione, modifica ed eliminazione. */

const PROFILE_NOT_FOUND: HttpFailure = { status: 404, error: 'Profile not found' };
const ENCRYPTION_UNAVAILABLE: HttpFailure = {
  status: 503,
  error: 'Encryption is required but unavailable',
};

const warnedWriteFailures = new Set<string>();

/** Corpo della risposta 201 di POST /api/profiles: riprende i valori inviati. */
export interface CreatedProfile {
  id: string;
  ha_user_id: string;
  name: unknown;
  device_label: unknown;
  data: unknown;
  created_at: string;
  updated_at: string;
}

export interface ProfileService {
  list(haUserId: string): ProfileResponse[];
  get(requestUserId: string, id: string): Result<ProfileResponse>;
  create(input: CreateProfileInput): Result<CreatedProfile>;
  update(requestUserId: string, id: string, input: UpdateProfileInput): Result<ProfileResponse>;
  remove(requestUserId: string, id: string): Result<{ success: true }>;
}

export const createProfileService = (
  database: SqliteDatabase,
  crypto: DataCrypto = defaultDataCrypto
): ProfileService => {
  const parseStoredProfileData = (row: ProfileRow, context: string): unknown =>
    safeParseJson(
      crypto.resolveStoredDataText({
        plainText: row.data,
        encryptedText: row.data_enc,
        context,
      }),
      {}
    );

  const toResponse = (row: ProfileRow, context: string): ProfileResponse => ({
    id: row.id,
    ha_user_id: row.ha_user_id,
    name: row.name,
    device_label: row.device_label,
    data: parseStoredProfileData(row, context),
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  const warnEncryptionWriteFailure = (context: string): void => {
    if (!crypto.isDataEncryptionEnabled()) return;
    if (warnedWriteFailures.has(context)) return;
    warnedWriteFailures.add(context);
    console.warn(`[profiles] Failed to produce encrypted payload in ${context}.`);
  };

  return {
    list: (haUserId) =>
      listProfilesByUser(database, haUserId).map((row) =>
        toResponse(row, `profiles/list:${haUserId}:${row.id}`)
      ),

    get: (requestUserId, id) => {
      const row = findProfile(database, id, requestUserId);
      if (!row) return { ok: false, failure: PROFILE_NOT_FOUND };
      return { ok: true, value: toResponse(row, `profiles/get:${requestUserId}:${id}`) };
    },

    create: ({ haUserId, name, deviceLabel, data }) => {
      const id = randomUUID();
      const now = new Date().toISOString();
      const payload = JSON.stringify(data);
      const encryptedPayload = crypto.encryptDataText(payload);
      if (encryptedPayload === null) {
        warnEncryptionWriteFailure('create');
        if (crypto.isEncryptionWriteRequired()) {
          return { ok: false, failure: ENCRYPTION_UNAVAILABLE };
        }
      }
      const plainPayload = crypto.shouldPersistPlaintextData()
        ? payload
        : crypto.getEncryptedOnlyPlaintextStub();

      insertProfile(database, {
        id,
        haUserId,
        name,
        deviceLabel: deviceLabel || null,
        data: plainPayload,
        dataEnc: encryptedPayload,
        createdAt: now,
        updatedAt: now,
      });

      return {
        ok: true,
        value: {
          id,
          ha_user_id: haUserId,
          name,
          device_label: deviceLabel,
          data,
          created_at: now,
          updated_at: now,
        },
      };
    },

    update: (requestUserId, id, { name, deviceLabel, data }) => {
      if (!profileExists(database, id, requestUserId)) {
        return { ok: false, failure: PROFILE_NOT_FOUND };
      }

      const now = new Date().toISOString();
      const payload = data === undefined ? null : JSON.stringify(data);
      const encryptedPayload = payload === null ? null : crypto.encryptDataText(payload);
      if (payload !== null && encryptedPayload === null) {
        warnEncryptionWriteFailure('update');
        if (crypto.isEncryptionWriteRequired()) {
          return { ok: false, failure: ENCRYPTION_UNAVAILABLE };
        }
      }
      const plainPayload =
        payload === null
          ? null
          : crypto.shouldPersistPlaintextData()
            ? payload
            : crypto.getEncryptedOnlyPlaintextStub();

      updateProfile(database, {
        id,
        haUserId: requestUserId,
        setName: name !== undefined,
        name,
        setDeviceLabel: deviceLabel !== undefined,
        deviceLabel,
        setData: data !== undefined,
        data: plainPayload,
        dataEnc: encryptedPayload,
        updatedAt: now,
      });

      const updated = findProfile(database, id, requestUserId);
      if (!updated) {
        // Unreachable: the row was read and updated synchronously on the same connection.
        throw new Error(`Profile ${id} disappeared during update`);
      }
      return { ok: true, value: toResponse(updated, `profiles/update:${requestUserId}:${id}`) };
    },

    remove: (requestUserId, id) => {
      if (deleteProfile(database, id, requestUserId) === 0) {
        return { ok: false, failure: PROFILE_NOT_FOUND };
      }
      return { ok: true, value: { success: true } };
    },
  };
};
