/**
 * Browser-local preferences of the legacy media modal, kept under the same keys so existing
 * installations keep them: last chosen content, extra Sonos players, name filter, session sensors.
 */
import { stringList } from './entity';

export const STORAGE_KEYS = {
  lastChoice: 'tunet_media_last_choice',
  extraPlayers: 'tunet_media_extra_players',
  nameFilter: 'tunet_media_name_display_filter',
  sessionSensors: 'tunet_media_session_sensors',
} as const;

export interface LastChoice {
  id: string;
  label: string;
  type: string;
}

function readRaw(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  const raw = readRaw(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write ${key} to localStorage:`, error);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function readLastChoices(): Record<string, LastChoice> {
  const raw = readJson(STORAGE_KEYS.lastChoice);
  if (!isRecord(raw)) return {};
  const result: Record<string, LastChoice> = {};
  for (const [playerId, value] of Object.entries(raw)) {
    if (isRecord(value) && typeof value.id === 'string' && value.id) {
      result[playerId] = {
        id: value.id,
        label: typeof value.label === 'string' ? value.label : value.id,
        type: typeof value.type === 'string' ? value.type : 'music',
      };
    }
  }
  return result;
}

export function saveLastChoice(playerId: string, choice: LastChoice) {
  writeJson(STORAGE_KEYS.lastChoice, { ...readLastChoices(), [playerId]: choice });
}

export const readExtraPlayers = (): string[] => stringList(readJson(STORAGE_KEYS.extraPlayers));

export const saveExtraPlayers = (ids: string[]) => writeJson(STORAGE_KEYS.extraPlayers, ids);

export const readNameFilter = (): string => readRaw(STORAGE_KEYS.nameFilter) ?? '';

export const readSessionSensors = (): string[] => stringList(readJson(STORAGE_KEYS.sessionSensors));
