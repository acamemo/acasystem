import { isRecord } from '../helpers/objects.ts';
import { DeviceError } from '../services/devices/deviceErrors.ts';
import type { PowerOptions } from '../services/devices/powerRecipe.ts';

/**
 * Validators of /api/dispositivi. They throw `DeviceError('INVALID_INPUT')` with the name of
 * the wrong field; the message never repeats what the caller sent.
 */

const invalid = (field?: string): DeviceError =>
  new DeviceError('INVALID_INPUT', field ? { field } : {});

const FLOW_ID = /^[A-Za-z0-9_-]{1,64}$/;
const ENTRY_ID = /^[A-Za-z0-9]{1,40}$/;
const DEVICE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const AREA_ID = /^[a-z0-9_]{1,64}$/;
const HANDLER = /^[a-z0-9_]{1,64}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\x00-\x1f\x7f]/;

const body = (value: unknown): Record<string, unknown> => {
  if (value === undefined || value === null) return {};
  if (!isRecord(value) || Array.isArray(value)) throw invalid();
  return value;
};

const rejectUnknownKeys = (source: Record<string, unknown>, allowed: readonly string[]): void => {
  for (const key of Object.keys(source)) {
    if (!allowed.includes(key)) throw invalid(key);
  }
};

export const validateFlowId = (value: unknown): string => {
  if (typeof value !== 'string' || !FLOW_ID.test(value)) throw new DeviceError('FLOW_NOT_FOUND');
  return value;
};

const TV_ID = /^[0-9a-f]{16}$/;

export const validateTvId = (value: unknown): string => {
  if (typeof value !== 'string' || !TV_ID.test(value)) throw new DeviceError('TV_NOT_FOUND');
  return value;
};

export const validateEntryId = (value: unknown): string => {
  if (typeof value !== 'string' || !ENTRY_ID.test(value)) throw new DeviceError('ENTRY_NOT_FOUND');
  return value;
};

export const validateDeviceId = (value: unknown): string => {
  if (typeof value !== 'string' || !DEVICE_ID.test(value))
    throw new DeviceError('DEVICE_NOT_FOUND');
  return value;
};

export const validateStartFlowBody = (raw: unknown): { handler: string } => {
  const source = body(raw);
  rejectUnknownKeys(source, ['handler']);
  if (typeof source.handler !== 'string' || !HANDLER.test(source.handler)) throw invalid('handler');
  return { handler: source.handler };
};

export const validateStepBody = (raw: unknown): { input: unknown } => {
  const source = body(raw);
  rejectUnknownKeys(source, ['input']);
  return { input: source.input };
};

export const validateCatalogQuery = (raw: unknown): { q: string; limit: number } => {
  const query = isRecord(raw) ? raw : {};
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (q.length > 80 || CONTROL_CHARACTERS.test(q)) throw invalid('q');

  let limit = 50;
  if (query.limit !== undefined) {
    const parsed =
      typeof query.limit === 'string' && /^[0-9]{1,3}$/.test(query.limit)
        ? Number(query.limit)
        : NaN;
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) throw invalid('limit');
    limit = parsed;
  }
  return { q, limit };
};

export const validateLimitQuery = (raw: unknown): number => {
  const query = isRecord(raw) ? raw : {};
  if (query.limit === undefined) return 50;
  const parsed =
    typeof query.limit === 'string' && /^[0-9]{1,3}$/.test(query.limit) ? Number(query.limit) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) throw invalid('limit');
  return parsed;
};

const cleanLabel = (value: unknown, field: string, max: number): string => {
  if (typeof value !== 'string') throw invalid(field);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || CONTROL_CHARACTERS.test(trimmed)) throw invalid(field);
  return trimmed;
};

export const validateDeviceUpdateBody = (
  raw: unknown
): { name?: string | null; areaId?: string | null } => {
  const source = body(raw);
  rejectUnknownKeys(source, ['name', 'areaId']);

  const result: { name?: string | null; areaId?: string | null } = {};
  if (source.name !== undefined) {
    // null puts back the name HA gave the device.
    result.name = source.name === null ? null : cleanLabel(source.name, 'name', 60);
  }
  if (source.areaId !== undefined) {
    if (
      source.areaId !== null &&
      (typeof source.areaId !== 'string' || !AREA_ID.test(source.areaId))
    ) {
      throw invalid('areaId');
    }
    result.areaId = source.areaId;
  }
  if (result.name === undefined && result.areaId === undefined) throw invalid();
  return result;
};

export const validateAreaBody = (raw: unknown): { name: string } => {
  const source = body(raw);
  rejectUnknownKeys(source, ['name']);
  return { name: cleanLabel(source.name, 'name', 40) };
};

/**
 * Body of the power-on recipe. Only the installer's overrides are allowed; any other key,
 * in particular an id of a device, entity or automation, is refused: the server finds them.
 */
export const validatePowerBody = (raw: unknown): PowerOptions => {
  const source = body(raw);
  rejectUnknownKeys(source, ['mac', 'broadcastAddress', 'broadcastPort']);

  const options: PowerOptions = {};
  if (source.mac !== undefined) {
    if (typeof source.mac !== 'string') throw invalid('mac');
    options.mac = source.mac;
  }
  if (source.broadcastAddress !== undefined) {
    if (typeof source.broadcastAddress !== 'string') throw invalid('broadcastAddress');
    options.broadcastAddress = source.broadcastAddress;
  }
  if (source.broadcastPort !== undefined) {
    if (typeof source.broadcastPort !== 'number' && typeof source.broadcastPort !== 'string') {
      throw invalid('broadcastPort');
    }
    const port = Number(source.broadcastPort);
    if (!Number.isInteger(port)) throw invalid('broadcastPort');
    options.broadcastPort = port;
  }
  return options;
};
