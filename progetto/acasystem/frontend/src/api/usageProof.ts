import type { ProfileUsageLease } from '../../../contracts/collaboration';

export const PROFILE_USAGE_LOST_EVENT = 'acasystem:profile-usage-lost';
export const PROFILE_IN_USE_MESSAGE =
  'questo profilo è in uso su un altro dispositivo chiudi le altre sessioni per usare questo dispositivo';
const usageCodes = new Set(['PROFILE_IN_USE', 'PROFILE_USAGE_REQUIRED', 'PROFILE_USAGE_EXPIRED']);
let current: { lease: ProfileUsageLease; deadline: number; active: boolean } | null = null;

export function setProfileUsageProof(lease: ProfileUsageLease, active = true): void {
  current = {
    lease,
    deadline: performance.now() + Math.max(0, lease.expiresAt - lease.serverTime),
    active,
  };
}
export function activateProfileUsageProof(leaseId: string): void {
  if (current?.lease.id === leaseId) current.active = true;
}
export function clearProfileUsageProof(leaseId?: string): void {
  if (!leaseId || current?.lease.id === leaseId) current = null;
}
export function profileUsageHeaders(): Record<string, string> {
  if (!current || performance.now() >= current.deadline) return {};
  return {
    'x-aca-usage-session': current.lease.usageSessionId,
    'x-aca-usage-lease': current.lease.id,
  };
}
export function isProfileUsageFailure(error: unknown): boolean {
  const code = (error as { body?: { code?: unknown } } | null)?.body?.code;
  return typeof code === 'string' && usageCodes.has(code);
}
export function notifyProfileUsageFailure(
  body: { code?: unknown; error?: unknown },
  leaseId?: string
): void {
  if (typeof body.code !== 'string' || !usageCodes.has(body.code)) return;
  if (current && current.lease.id !== leaseId) return;
  clearProfileUsageProof(leaseId);
  window.dispatchEvent(
    new CustomEvent(PROFILE_USAGE_LOST_EVENT, {
      detail: {
        leaseId,
        code: body.code,
        error: typeof body.error === 'string' ? body.error : PROFILE_IN_USE_MESSAGE,
      },
    })
  );
}
export function requireProfileUsageHeaders(): Record<string, string> {
  const headers = profileUsageHeaders();
  if (current?.active && headers['x-aca-usage-lease']) return headers;
  const body = { code: 'PROFILE_USAGE_REQUIRED', error: PROFILE_IN_USE_MESSAGE };
  if (current?.active) notifyProfileUsageFailure(body, current.lease.id);
  throw Object.assign(new Error(body.error), { status: 409, body });
}
