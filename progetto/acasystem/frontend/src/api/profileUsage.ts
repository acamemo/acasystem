import type { ProfileUsageLease } from '../../../contracts/collaboration';
import { backendRequest } from './backendClient';
import {
  getValidatedHomeAssistantRequestHeadersAsync,
  type HomeAssistantRequestHeaders,
} from './apiAuth';
import { isObject } from '@/validators/guards';

const authorizations = new Map<string, HomeAssistantRequestHeaders>();
const parse = (value: unknown): ProfileUsageLease => {
  if (
    !isObject(value) ||
    typeof value.id !== 'string' ||
    typeof value.profileId !== 'string' ||
    typeof value.usageSessionId !== 'string' ||
    typeof value.clientId !== 'string' ||
    !Number.isFinite(value.expiresAt) ||
    !Number.isFinite(value.serverTime)
  )
    throw new Error('La centrale non ha confermato l’uso del profilo.');
  return value as unknown as ProfileUsageLease;
};
async function claim(
  path: string,
  method: 'POST' | 'PATCH',
  usageSessionId: string
): Promise<ProfileUsageLease> {
  const headers = await getValidatedHomeAssistantRequestHeadersAsync();
  const lease = parse(
    await backendRequest(
      path,
      { method, body: JSON.stringify({ usageSessionId }) },
      { authHeadersOverride: headers }
    )
  );
  authorizations.set(lease.id, headers);
  return lease;
}
export const acquireProfileUsage = (profileId: string, usageSessionId: string) =>
  claim(`/v2/profiles/${encodeURIComponent(profileId)}/usage`, 'POST', usageSessionId);
export const renewProfileUsage = (lease: ProfileUsageLease, usageSessionId: string) =>
  claim(`/v2/usage/${encodeURIComponent(lease.id)}`, 'PATCH', usageSessionId);
export async function releaseProfileUsage(
  lease: ProfileUsageLease,
  usageSessionId: string
): Promise<void> {
  try {
    await backendRequest(`/v2/usage/${encodeURIComponent(lease.id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ usageSessionId }),
    });
  } finally {
    authorizations.delete(lease.id);
  }
}
/** Il browser può terminare senza completare il rilascio: la centrale conserva la scadenza. */
export function releaseProfileUsageKeepAlive(
  lease: ProfileUsageLease,
  usageSessionId: string,
  handoff = false
): void {
  const headers = authorizations.get(lease.id);
  authorizations.delete(lease.id);
  if (!headers?.Authorization) return;
  void fetch(`./api/v2/usage/${encodeURIComponent(lease.id)}`, {
    method: 'DELETE',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ usageSessionId, ...(handoff ? { handoff: true } : {}) }),
  }).catch(() => undefined);
}
