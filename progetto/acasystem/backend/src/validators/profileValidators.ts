import type { ClientValue, Validation } from '../@types/http.ts';
import { isRecord } from '../helpers/objects.ts';
import {
  FORBIDDEN_USER_MISMATCH,
  findMissingField,
  invalid,
  isSameUser,
  readQuery,
  readRequestBody,
  valid,
} from './common.ts';

/** Validatori delle richieste /api/profiles (dopo il controllo dell'utente, 401). */

export interface ListProfilesQuery {
  haUserId: string;
}

/** GET /api/profiles?ha_user_id= */
export const validateListProfilesQuery = (
  query: unknown,
  requestUserId: string
): Validation<ListProfilesQuery> => {
  const fields = readQuery(query);
  const missing = findMissingField(
    fields,
    ['ha_user_id'],
    'ha_user_id query parameter is required'
  );
  if (missing) return invalid(missing.status, missing.error);

  const haUserId = fields.ha_user_id;
  if (!isSameUser(haUserId, requestUserId)) return invalid(403, FORBIDDEN_USER_MISMATCH);
  return valid({ haUserId });
};

export interface CreateProfileInput {
  haUserId: string;
  name: ClientValue;
  deviceLabel: ClientValue;
  data: ClientValue;
}

/** POST /api/profiles: ha_user_id, name e data obbligatori. */
export const validateCreateProfileBody = (
  body: unknown,
  requestUserId: string
): Validation<CreateProfileInput> => {
  const fields = readRequestBody(body);
  const missing = findMissingField(
    fields,
    ['ha_user_id', 'name', 'data'],
    'ha_user_id, name, and data are required'
  );
  if (missing) return invalid(missing.status, missing.error);

  const haUserId = fields.ha_user_id;
  if (!isSameUser(haUserId, requestUserId)) return invalid(403, FORBIDDEN_USER_MISMATCH);

  return valid({
    haUserId,
    name: fields.name,
    deviceLabel: fields.device_label,
    data: fields.data,
  });
};

export interface UpdateProfileInput {
  /** undefined = campo non inviato, quindi non modificato. */
  name: ClientValue;
  deviceLabel: ClientValue;
  data: Record<string, unknown> | undefined;
}

/** PUT /api/profiles/:id: tutti i campi facoltativi; `data`, se presente, è un oggetto. */
export const validateUpdateProfileBody = (
  body: unknown,
  requestUserId: string
): Validation<UpdateProfileInput> => {
  const fields = readRequestBody(body);

  const haUserId = fields.ha_user_id;
  if (haUserId && !isSameUser(haUserId, requestUserId)) {
    return invalid(403, FORBIDDEN_USER_MISMATCH);
  }

  const data = fields.data;
  if (data !== undefined && (!isRecord(data) || Array.isArray(data))) {
    return invalid(400, 'data must be an object when provided');
  }

  return valid({ name: fields.name, deviceLabel: fields.device_label, data });
};
