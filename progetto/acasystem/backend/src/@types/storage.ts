/** Righe e risposte del database `tunet.db` (schema invariato rispetto a Tunet). */

export interface ProfileRow {
  id: string;
  ha_user_id: string;
  name: string;
  device_label: string | null;
  data: string;
  data_enc: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileResponse {
  id: string;
  ha_user_id: string;
  name: string;
  device_label: string | null;
  data: unknown;
  created_at: string;
  updated_at: string;
}

export interface StoredPayloadRow {
  data: string;
  data_enc: string | null;
}

export interface CurrentSettingsRow extends StoredPayloadRow {
  ha_user_id: string;
  device_id: string;
  revision: number;
  updated_at: string;
  device_label: string | null;
}

export interface CurrentSettingsResponse {
  ha_user_id: string;
  device_id: string;
  data: unknown;
  revision: number;
  device_label: string | null;
  updated_at: string;
}

export interface SettingsHistoryEntry {
  revision: number;
  updated_at: string;
}

export interface SettingsDeviceRow {
  device_id: string;
  device_label: string | null;
  revision: number;
  updated_at: string;
}
