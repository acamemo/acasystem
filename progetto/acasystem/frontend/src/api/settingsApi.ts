/**
 * Client REST delle impostazioni sincronizzate tra i dispositivi.
 */

import type {
  CurrentSettingsRecord,
  PublishSettingsPayload,
  SaveCurrentSettingsPayload,
  SettingsDeviceRecord,
  SettingsHistoryRecord,
} from '@/@types/api';
import { backendRequest, type BackendRequestInit } from '@/api/backendClient';
import {
  isCurrentSettingsRecord,
  parseSettingsDevices,
  parseSettingsHistory,
} from '@/validators/backendPayloads';

const toCurrentSettings = (value: unknown): CurrentSettingsRecord | null =>
  isCurrentSettingsRecord(value) ? value : null;

export async function fetchCurrentSettings(
  haUserId: string,
  deviceId: string,
  revision?: number | string | null
): Promise<CurrentSettingsRecord | null> {
  const revisionQuery = Number.isFinite(Number(revision))
    ? `&revision=${encodeURIComponent(String(revision))}`
    : '';
  return toCurrentSettings(
    await backendRequest(
      `/settings/current?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}${revisionQuery}`,
      {}
    )
  );
}

export async function fetchSettingsHistory(
  haUserId: string,
  deviceId: string,
  limit = 20
): Promise<SettingsHistoryRecord[]> {
  return parseSettingsHistory(
    await backendRequest(
      `/settings/history?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}&limit=${encodeURIComponent(limit)}`,
      {}
    )
  );
}

export function deleteSettingsHistory(
  haUserId: string,
  deviceId: string,
  keepLatest = true
): Promise<unknown> {
  const keepLatestQuery = keepLatest ? '1' : '0';
  return backendRequest(
    `/settings/history?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}&keep_latest=${keepLatestQuery}`,
    {
      method: 'DELETE',
    }
  );
}

export async function saveCurrentSettings(
  {
    ha_user_id,
    device_id,
    data,
    base_revision,
    history_keep_limit,
    device_label,
  }: SaveCurrentSettingsPayload,
  fetchOptions: BackendRequestInit = {}
): Promise<CurrentSettingsRecord | null> {
  return toCurrentSettings(
    await backendRequest('/settings/current', {
      method: 'PUT',
      body: JSON.stringify({
        ha_user_id,
        device_id,
        data,
        base_revision,
        history_keep_limit,
        device_label,
      }),
      ...fetchOptions,
    })
  );
}

export async function fetchCurrentDevices(haUserId: string): Promise<SettingsDeviceRecord[]> {
  return parseSettingsDevices(
    await backendRequest(`/settings/devices?ha_user_id=${encodeURIComponent(haUserId)}`, {})
  );
}

export function deleteSettingsDevice(haUserId: string, deviceId: string): Promise<unknown> {
  return backendRequest(
    `/settings/devices?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'DELETE',
    }
  );
}

export function updateSettingsDeviceLabel(
  haUserId: string,
  deviceId: string,
  deviceLabel: string
): Promise<unknown> {
  return backendRequest('/settings/devices/label', {
    method: 'PUT',
    body: JSON.stringify({
      ha_user_id: haUserId,
      device_id: deviceId,
      device_label: deviceLabel,
    }),
  });
}

export function publishCurrentSettings({
  ha_user_id,
  source_device_id,
  target_device_id,
  history_keep_limit,
}: PublishSettingsPayload): Promise<unknown> {
  return backendRequest('/settings/publish', {
    method: 'POST',
    body: JSON.stringify({ ha_user_id, source_device_id, target_device_id, history_keep_limit }),
  });
}
