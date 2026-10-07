/**
 * Client REST dei profili salvati sul backend.
 */

import type { CreateProfilePayload, ProfileRecord, UpdateProfilePayload } from '@/@types/api';
import { backendRequest } from '@/api/backendClient';
import { isProfileRecord, parseProfileList } from '@/validators/backendPayloads';

const requireProfile = (value: unknown): ProfileRecord => {
  if (!isProfileRecord(value)) throw new Error('Invalid profile response');
  return value;
};

// ── Profiles ─────────────────────────────────────────────────────────

export async function fetchProfiles(haUserId: string): Promise<ProfileRecord[]> {
  return parseProfileList(
    await backendRequest(`/profiles?ha_user_id=${encodeURIComponent(haUserId)}`, {})
  );
}

export async function fetchProfile(id: string, _haUserId?: string): Promise<ProfileRecord> {
  return requireProfile(await backendRequest(`/profiles/${id}`, {}));
}

export async function createProfile({
  ha_user_id,
  name,
  device_label,
  data,
}: CreateProfilePayload): Promise<ProfileRecord> {
  return requireProfile(
    await backendRequest('/profiles', {
      method: 'POST',
      body: JSON.stringify({ ha_user_id, name, device_label, data }),
    })
  );
}

export async function updateProfile(
  id: string,
  payload: UpdateProfilePayload = {}
): Promise<ProfileRecord> {
  const { ha_user_id, name, device_label, data } = payload;
  const body: UpdateProfilePayload = {};
  if (ha_user_id !== undefined) body.ha_user_id = ha_user_id;
  if (name !== undefined) body.name = name;
  if (device_label !== undefined) body.device_label = device_label;
  if (data !== undefined) body.data = data;

  return requireProfile(
    await backendRequest(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  );
}

export function deleteProfile(id: string, _haUserId?: string): Promise<unknown> {
  return backendRequest(`/profiles/${id}`, {
    method: 'DELETE',
  });
}
