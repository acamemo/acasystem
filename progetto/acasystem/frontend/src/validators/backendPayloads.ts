/**
 * Validatori delle risposte del backend (profili e impostazioni sincronizzate).
 */
import type {
  CurrentSettingsRecord,
  ProfileRecord,
  SettingsDeviceRecord,
  SettingsHistoryRecord,
} from '@/@types/api';
import { isRecord, type UnknownRecord } from './guards';

type FieldCheck = (value: unknown) => boolean;

/** Campo assente oppure stringa. */
const isText: FieldCheck = (value) => value === undefined || typeof value === 'string';
/** Campo assente, `null` oppure stringa. */
const isNullableText: FieldCheck = (value) => value === null || isText(value);
/** Campo assente, `null` oppure numero. */
const isNullableNumber: FieldCheck = (value) =>
  value === undefined || value === null || typeof value === 'number';

const optionalFields = (value: UnknownRecord, fields: Record<string, FieldCheck>) =>
  Object.entries(fields).every(([field, check]) => check(value[field]));

export function isProfileRecord(value: unknown): value is ProfileRecord {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    optionalFields(value, {
      ha_user_id: isText,
      name: isText,
      device_label: isNullableText,
      created_at: isText,
      updated_at: isText,
    })
  );
}

export function isCurrentSettingsRecord(value: unknown): value is CurrentSettingsRecord {
  return (
    isRecord(value) &&
    optionalFields(value, {
      ha_user_id: isText,
      device_id: isText,
      revision: isNullableNumber,
      device_label: isNullableText,
      updated_at: isNullableText,
    })
  );
}

export function isSettingsHistoryRecord(value: unknown): value is SettingsHistoryRecord {
  return (
    isRecord(value) &&
    optionalFields(value, { revision: isNullableNumber, updated_at: isNullableText })
  );
}

export function isSettingsDeviceRecord(value: unknown): value is SettingsDeviceRecord {
  return (
    isRecord(value) &&
    optionalFields(value, {
      device_id: isText,
      device_label: isNullableText,
      revision: isNullableNumber,
      updated_at: isNullableText,
    })
  );
}

const listOf =
  <T>(guard: (value: unknown) => value is T) =>
  (value: unknown): T[] =>
    Array.isArray(value) ? value.filter(guard) : [];

export const parseProfileList = listOf(isProfileRecord);
export const parseSettingsHistory = listOf(isSettingsHistoryRecord);
export const parseSettingsDevices = listOf(isSettingsDeviceRecord);
