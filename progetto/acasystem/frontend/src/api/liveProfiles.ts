import type {
  Configuration,
  CollaborationEvent,
  EditLease,
  EditTarget,
  LiveProfile,
  ProfileChange,
  ProfileOperation,
} from '../../../contracts/collaboration';
import { backendRequest } from './backendClient';
import { getValidatedHomeAssistantRequestHeadersAsync } from './apiAuth';
import { isObject } from '@/validators/guards';

function profile(value: unknown): LiveProfile {
  if (
    !isObject(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !Number.isSafeInteger(value.revision) ||
    !isObject(value.configuration) ||
    !isObject(value.resourceRevisions)
  ) {
    throw new Error('La centrale ha restituito un profilo non valido.');
  }
  return value as unknown as LiveProfile;
}
const path = (id: string) => `/v2/profiles/${encodeURIComponent(id)}`;
export const readLiveProfile = async (id: string, signal?: AbortSignal) =>
  profile(await backendRequest(path(id), { signal }));
export const listLiveProfiles = async (): Promise<LiveProfile[]> => {
  const value = await backendRequest('/v2/profiles');
  if (!Array.isArray(value)) throw new Error('Elenco profili non disponibile.');
  return value.map(profile);
};
export const createLiveProfile = async (
  name: string,
  configuration: Configuration,
  sourceId?: string,
  sourceClass?: string
) =>
  profile(
    await backendRequest('/v2/profiles', {
      method: 'POST',
      body: JSON.stringify({ name, configuration, sourceId, sourceClass }),
    })
  );
export const renameLiveProfile = async (id: string, name: string) =>
  profile(await backendRequest(path(id), { method: 'PATCH', body: JSON.stringify({ name }) }));
export const deleteLiveProfile = (id: string) => backendRequest(path(id), { method: 'DELETE' });
export const activateLiveProfile = (clientId: string, activeProfileId: string | null) =>
  backendRequest(`/v2/clients/${encodeURIComponent(clientId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ activeProfileId }),
  });
export const commitLiveProfile = async (id: string, operation: ProfileOperation) =>
  profile(
    await backendRequest(`${path(id)}/operations`, {
      method: 'POST',
      body: JSON.stringify(operation),
    })
  );
export const readEditLeases = (id: string, signal?: AbortSignal) =>
  backendRequest(`${path(id)}/leases`, { signal }) as Promise<EditLease[]>;
export const acquireEditLease = (
  id: string,
  editSessionId: string,
  target: EditTarget,
  proposedChanges: ProfileChange[] = []
) =>
  backendRequest(`${path(id)}/leases`, {
    method: 'POST',
    body: JSON.stringify({ editSessionId, target, proposedChanges }),
  }) as Promise<EditLease>;
export const renewEditLease = (id: string, editSessionId: string) =>
  backendRequest(`/v2/leases/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ editSessionId }),
  }) as Promise<EditLease>;
export const releaseEditLease = (id: string, editSessionId: string) =>
  backendRequest(`/v2/leases/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ editSessionId }),
  });

/** Flusso autenticato; una riconnessione parte sempre dalla revisione autorevole. */
export async function watchLiveProfiles(
  signal: AbortSignal,
  changed: (event: CollaborationEvent) => void,
  usageSessionId?: string
): Promise<void> {
  const headers = await getValidatedHomeAssistantRequestHeadersAsync();
  const response = await fetch('./api/v2/events', {
    headers: {
      ...(headers.Authorization ? { Authorization: headers.Authorization } : {}),
      ...(usageSessionId ? { 'x-aca-usage-session': usageSessionId } : {}),
    },
    signal,
    cache: 'no-store',
  });
  if (!response.ok || !response.body)
    throw Object.assign(new Error('Collegamento aggiornamenti non disponibile.'), {
      status: response.status,
    });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (!signal.aborted) {
      const part = await reader.read();
      if (part.done) return;
      buffer += decoder.decode(part.value, { stream: true }).replace(/\r\n/g, '\n');
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const data = block
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n');
        if (!data) continue;
        const value: unknown = JSON.parse(data);
        if (
          isObject(value) &&
          ['profile', 'lease', 'client', 'activity', 'resync', 'usage'].includes(String(value.type))
        )
          changed(value as unknown as CollaborationEvent);
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
