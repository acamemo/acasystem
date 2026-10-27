/**
 * Client of the device facade (`./api/dispositivi`, ADR-0021 and ADR-0022): the catalogue, the
 * configuration flows, the entries, the rooms and the power-on recipe of a TV. It goes through
 * `backendRequest`, so it sends the token of the signed-in user and retries once after a 401
 * with OAuth, like the other backend calls. Nothing is stored in the browser and nothing is
 * logged: the answers carry the addresses the person typed.
 */
import { backendRequest } from './backendClient';
import type {
  AreaDto,
  CatalogDto,
  DeviceDto,
  DeviceErrorInfo,
  DiscoveredDeviceDto,
  EntryDto,
  FlowResponseDto,
  FlowSummaryDto,
  PowerSetupBody,
  PowerStatusDto,
  StatusDto,
} from '@/@types/devices';
import { isObject } from '@/validators/guards';

const BASE = '/dispositivi';

/** Shown when the server gave no message of its own (network failure, unexpected answer). */
export const GENERIC_DEVICE_ERROR = 'Qualcosa non ha funzionato. Riprova.';

const JSON_BODY = (value: unknown) => JSON.stringify(value);

const segment = (value: string) => encodeURIComponent(value);

/** The server answers with the shapes of @/@types/devices; the cast is the one trust boundary. */
const as = <T>(value: unknown): T => value as T;

export async function getStatus(): Promise<StatusDto> {
  return as<StatusDto>(await backendRequest(`${BASE}/stato`));
}

export async function searchCatalog(q: string, limit = 50): Promise<CatalogDto> {
  const query = q.trim() ? `q=${segment(q.trim())}&limit=${limit}` : `limit=${limit}`;
  return as<CatalogDto>(await backendRequest(`${BASE}/catalogo?${query}`));
}

export async function listFlows(): Promise<FlowSummaryDto[]> {
  const body = await backendRequest(`${BASE}/flussi`);
  return isObject(body) && Array.isArray(body.flows) ? as<FlowSummaryDto[]>(body.flows) : [];
}

export async function startFlow(handler: string): Promise<FlowResponseDto> {
  return as<FlowResponseDto>(
    await backendRequest(`${BASE}/flussi`, { method: 'POST', body: JSON_BODY({ handler }) })
  );
}

export async function getFlow(flowId: string): Promise<FlowResponseDto> {
  return as<FlowResponseDto>(await backendRequest(`${BASE}/flussi/${segment(flowId)}`));
}

/** Answers the current step. The call can stay open for a long time while the TV is asked. */
export async function stepFlow(
  flowId: string,
  input: Record<string, unknown>,
  signal?: AbortSignal
): Promise<FlowResponseDto> {
  return as<FlowResponseDto>(
    await backendRequest(`${BASE}/flussi/${segment(flowId)}`, {
      method: 'POST',
      body: JSON_BODY({ input }),
      ...(signal ? { signal } : {}),
    })
  );
}

export async function cancelFlow(flowId: string): Promise<void> {
  await backendRequest(`${BASE}/flussi/${segment(flowId)}`, { method: 'DELETE' });
}

/** Devices that Home Assistant found on the network (zeroconf, SSDP, DHCP...) and nobody added. */
export async function listDiscovered(signal?: AbortSignal): Promise<DiscoveredDeviceDto[]> {
  const body = await backendRequest(`${BASE}/scoperti`, signal ? { signal } : {});
  return isObject(body) && Array.isArray(body.devices)
    ? as<DiscoveredDeviceDto[]>(body.devices)
    : [];
}

/** Takes a discovered device over as the person's own flow; answers with its current step. */
export async function addDiscovered(
  flowId: string,
  signal?: AbortSignal
): Promise<FlowResponseDto> {
  return as<FlowResponseDto>(
    await backendRequest(`${BASE}/scoperti/${segment(flowId)}/aggiungi`, {
      method: 'POST',
      ...(signal ? { signal } : {}),
    })
  );
}

/** «Non mi interessa»: Home Assistant ignores this discovery. */
export async function ignoreDiscovered(flowId: string): Promise<void> {
  await backendRequest(`${BASE}/scoperti/${segment(flowId)}/ignora`, { method: 'POST' });
}

export async function getEntry(entryId: string): Promise<EntryDto> {
  return as<EntryDto>(await backendRequest(`${BASE}/voci/${segment(entryId)}`));
}

/** «Rimuovi dispositivo»: the entry leaves Home Assistant (never a system integration). */
export async function removeEntry(entryId: string): Promise<void> {
  await backendRequest(`${BASE}/voci/${segment(entryId)}`, { method: 'DELETE' });
}

export async function updateDevice(
  deviceId: string,
  changes: { name?: string | null; areaId?: string | null }
): Promise<DeviceDto> {
  return as<DeviceDto>(
    await backendRequest(`${BASE}/dispositivi/${segment(deviceId)}`, {
      method: 'PATCH',
      body: JSON_BODY(changes),
    })
  );
}

export async function listAreas(): Promise<AreaDto[]> {
  const body = await backendRequest(`${BASE}/stanze`);
  return isObject(body) && Array.isArray(body.areas) ? as<AreaDto[]>(body.areas) : [];
}

export async function createArea(name: string): Promise<AreaDto> {
  return as<AreaDto>(
    await backendRequest(`${BASE}/stanze`, { method: 'POST', body: JSON_BODY({ name }) })
  );
}

export async function getPower(entryId: string): Promise<PowerStatusDto> {
  return as<PowerStatusDto>(await backendRequest(`${BASE}/accensione/${segment(entryId)}`));
}

/** The customer sends an empty body; only an installer sends `mac` and the broadcast values. */
export async function setupPower(
  entryId: string,
  body: PowerSetupBody = {}
): Promise<PowerStatusDto> {
  return as<PowerStatusDto>(
    await backendRequest(`${BASE}/accensione/${segment(entryId)}`, {
      method: 'POST',
      body: JSON_BODY(body),
    })
  );
}

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

/**
 * An error of any of the calls above as the screens use it. The message is the Italian one of
 * the server; without it, a generic sentence: a text from the browser (`Failed to fetch`,
 * `API error 500`) is never shown.
 */
export function toDeviceError(error: unknown): DeviceErrorInfo {
  const status =
    isObject(error) && typeof error.status === 'number' && Number.isFinite(error.status)
      ? error.status
      : 0;
  const body = isObject(error) && isObject(error.body) ? error.body : {};
  const retry = body.retryAfterSeconds;
  return {
    status,
    code: readString(body.code),
    message: readString(body.error) ?? GENERIC_DEVICE_ERROR,
    field: readString(body.field),
    flowId: readString(body.flowId),
    retryAfterSeconds: typeof retry === 'number' && Number.isFinite(retry) ? retry : null,
  };
}

/** True when the call was cancelled by the screen itself (AbortController). */
export const isAbortError = (error: unknown): boolean =>
  isObject(error) && error.name === 'AbortError';
