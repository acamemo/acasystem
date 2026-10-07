/**
 * Risposte del backend Acasystem (`/api/profiles`, `/api/settings`).
 * Forme allineate a backend/src/@types/storage.ts; i campi sono opzionali
 * perché il client tollera risposte parziali.
 */

type UnknownRecord = Record<string, unknown>;

export interface ProfileRecord {
  id: string;
  ha_user_id?: string;
  name?: string;
  device_label?: string | null;
  data?: unknown;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CurrentSettingsRecord {
  ha_user_id?: string;
  device_id?: string;
  data?: unknown;
  revision?: number | null;
  device_label?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface SettingsHistoryRecord {
  revision?: number | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface SettingsDeviceRecord {
  device_id?: string;
  device_label?: string | null;
  revision?: number | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

/** Errore HTTP del backend: stato e corpo JSON della risposta. */
export type ApiError = Error & { status: number; body: UnknownRecord };

export interface CreateProfilePayload {
  ha_user_id: string;
  name: string;
  device_label?: string | null;
  data: unknown;
}

export interface UpdateProfilePayload {
  ha_user_id?: string;
  name?: string;
  device_label?: string | null;
  data?: unknown;
}

export interface SaveCurrentSettingsPayload {
  ha_user_id: string;
  device_id: string;
  data: unknown;
  base_revision: number | null;
  history_keep_limit: number;
  device_label?: string;
}

export interface PublishSettingsPayload {
  ha_user_id: string;
  source_device_id: string;
  target_device_id?: string;
  history_keep_limit: number;
}
