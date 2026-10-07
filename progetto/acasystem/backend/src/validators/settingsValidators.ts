import type { ClientValue, Validation } from '../@types/http.ts';
import {
  FORBIDDEN_USER_MISMATCH,
  findMissingField,
  invalid,
  isSameUser,
  readQuery,
  readRequestBody,
  valid,
} from './common.ts';
import type { Fields } from './common.ts';

/** Validatori delle richieste /api/settings (dopo il controllo dell'utente, 401). */

const DEVICE_QUERY_REQUIRED = 'ha_user_id and device_id query parameters are required';

/** Presenza dei campi e corrispondenza dell'utente; restituisce l'id dell'utente. */
const requireUserScopedFields = (
  fields: Fields,
  names: readonly string[],
  error: string,
  requestUserId: string
): Validation<string> => {
  const missing = findMissingField(fields, names, error);
  if (missing) return invalid(missing.status, missing.error);

  const haUserId = fields.ha_user_id;
  if (!isSameUser(haUserId, requestUserId)) return invalid(403, FORBIDDEN_USER_MISMATCH);
  return valid(haUserId);
};

export interface DeviceQuery {
  haUserId: string;
  deviceId: ClientValue;
  /** Parametri facoltativi della singola richiesta, ancora da interpretare. */
  revision: ClientValue;
  limit: ClientValue;
  keepLatest: ClientValue;
}

/**
 * GET /current, GET /history, DELETE /history, DELETE /devices:
 * ha_user_id e device_id obbligatori nella query.
 */
export const validateDeviceQuery = (
  query: unknown,
  requestUserId: string
): Validation<DeviceQuery> => {
  const fields = readQuery(query);
  const user = requireUserScopedFields(
    fields,
    ['ha_user_id', 'device_id'],
    DEVICE_QUERY_REQUIRED,
    requestUserId
  );
  if (!user.ok) return user;

  return valid({
    haUserId: user.value,
    deviceId: fields.device_id,
    revision: fields.revision,
    limit: fields.limit,
    keepLatest: fields.keep_latest,
  });
};

/** GET /devices: solo ha_user_id obbligatorio. */
export const validateUserQuery = (query: unknown, requestUserId: string): Validation<string> =>
  requireUserScopedFields(
    readQuery(query),
    ['ha_user_id'],
    'ha_user_id query parameter is required',
    requestUserId
  );

export interface DeviceLabelInput {
  haUserId: string;
  deviceId: ClientValue;
  deviceLabel: ClientValue;
}

/** PUT /devices/label */
export const validateDeviceLabelBody = (
  body: unknown,
  requestUserId: string
): Validation<DeviceLabelInput> => {
  const fields = readRequestBody(body);
  const user = requireUserScopedFields(
    fields,
    ['ha_user_id', 'device_id'],
    'ha_user_id and device_id are required',
    requestUserId
  );
  if (!user.ok) return user;

  return valid({
    haUserId: user.value,
    deviceId: fields.device_id,
    deviceLabel: fields.device_label,
  });
};

export interface CurrentSettingsInput {
  haUserId: string;
  deviceId: ClientValue;
  data: ClientValue;
  baseRevision: ClientValue;
  historyKeepLimit: ClientValue;
  deviceLabel: ClientValue;
}

/** PUT /current: ha_user_id, device_id e data obbligatori. */
export const validateCurrentSettingsBody = (
  body: unknown,
  requestUserId: string
): Validation<CurrentSettingsInput> => {
  const fields = readRequestBody(body);
  const user = requireUserScopedFields(
    fields,
    ['ha_user_id', 'device_id', 'data'],
    'ha_user_id, device_id and data are required',
    requestUserId
  );
  if (!user.ok) return user;

  return valid({
    haUserId: user.value,
    deviceId: fields.device_id,
    data: fields.data,
    baseRevision: fields.base_revision,
    historyKeepLimit: fields.history_keep_limit,
    deviceLabel: fields.device_label,
  });
};

export interface PublishSettingsInput {
  haUserId: string;
  sourceDeviceId: ClientValue;
  /** Falsy = pubblica su tutti gli altri dispositivi dell'utente. */
  targetDeviceId: ClientValue;
  historyKeepLimit: ClientValue;
}

/** POST /publish: ha_user_id e source_device_id obbligatori. */
export const validatePublishBody = (
  body: unknown,
  requestUserId: string
): Validation<PublishSettingsInput> => {
  const fields = readRequestBody(body);
  const user = requireUserScopedFields(
    fields,
    ['ha_user_id', 'source_device_id'],
    'ha_user_id and source_device_id are required',
    requestUserId
  );
  if (!user.ok) return user;

  return valid({
    haUserId: user.value,
    sourceDeviceId: fields.source_device_id,
    targetDeviceId: fields.target_device_id,
    historyKeepLimit: fields.history_keep_limit,
  });
};
