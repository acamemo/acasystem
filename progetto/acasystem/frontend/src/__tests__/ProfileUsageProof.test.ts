import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileUsageLease } from '../../../contracts/collaboration';
const mocks = vi.hoisted(() => ({ request: vi.fn(), headers: vi.fn() }));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.request }));
vi.mock('@/api/apiAuth', () => ({ getValidatedHomeAssistantRequestHeadersAsync: mocks.headers }));
import {
  acquireProfileUsage,
  renewProfileUsage,
  releaseProfileUsageKeepAlive,
} from '@/api/profileUsage';
import {
  clearProfileUsageProof,
  setProfileUsageProof,
  profileUsageHeaders,
  notifyProfileUsageFailure,
  requireProfileUsageHeaders,
  PROFILE_USAGE_LOST_EVENT,
} from '@/api/usageProof';

const lease = (id = 'usage-a'): ProfileUsageLease => ({
  id,
  profileId: 'profile',
  usageSessionId: 'instance',
  clientId: 'client',
  expiresAt: Date.now() + 180000,
  serverTime: Date.now(),
});
beforeEach(() => {
  vi.restoreAllMocks();
  clearProfileUsageProof();
  mocks.request.mockReset();
  mocks.headers.mockReset();
  mocks.headers.mockResolvedValue({ Authorization: 'Bearer test-only' });
});
afterEach(() => {
  clearProfileUsageProof();
  vi.useRealTimers();
});
describe('concessione d’uso del profilo', () => {
  it('il proof vive solo in memoria ed è legato alla singola istanza', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    setProfileUsageProof(lease());
    expect(profileUsageHeaders()).toEqual({
      'x-aca-usage-session': 'instance',
      'x-aca-usage-lease': 'usage-a',
    });
    expect(storage).not.toHaveBeenCalled();
    clearProfileUsageProof();
    expect(profileUsageHeaders()).toEqual({});
  });
  it('il rifiuto o cleanup di una concessione vecchia non invalida il nuovo titolare locale', () => {
    setProfileUsageProof(lease('new-id'));
    const lost = vi.fn();
    window.addEventListener(PROFILE_USAGE_LOST_EVENT, lost);
    notifyProfileUsageFailure({ code: 'PROFILE_USAGE_EXPIRED' }, 'old-id');
    clearProfileUsageProof('old-id');
    expect(profileUsageHeaders()['x-aca-usage-lease']).toBe('new-id');
    expect(lost).not.toHaveBeenCalled();
    window.removeEventListener(PROFILE_USAGE_LOST_EVENT, lost);
  });
  it('la concessione prima della rilettura consente il proof API ma non comandi interattivi', () => {
    setProfileUsageProof(lease(), false);
    expect(profileUsageHeaders()['x-aca-usage-lease']).toBe('usage-a');
    expect(() => requireProfileUsageHeaders()).toThrow();
    expect(profileUsageHeaders()['x-aca-usage-lease']).toBe('usage-a');
  });
  it('la scadenza locale non permette di inviare nuovi comandi e notifica il gate', () => {
    vi.useFakeTimers();
    setProfileUsageProof(lease());
    const lost = vi.fn();
    window.addEventListener(PROFILE_USAGE_LOST_EVENT, lost);
    vi.advanceTimersByTime(180001);
    expect(() => requireProfileUsageHeaders()).toThrow();
    expect(profileUsageHeaders()).toEqual({});
    expect(lost).toHaveBeenCalledOnce();
    window.removeEventListener(PROFILE_USAGE_LOST_EVENT, lost);
  });
  it('acquire e rinnovo validano il contratto e conservano in RAM l’autorizzazione per il solo cleanup', async () => {
    mocks.request.mockResolvedValue(lease());
    const claimed = await acquireProfileUsage('profile', 'instance');
    await renewProfileUsage(claimed, 'instance');
    expect(mocks.request.mock.calls.map((call) => call[0])).toEqual([
      '/v2/profiles/profile/usage',
      '/v2/usage/usage-a',
    ]);
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    releaseProfileUsageKeepAlive(claimed, 'instance', true);
    expect(fetch).toHaveBeenCalledWith(
      './api/v2/usage/usage-a',
      expect.objectContaining({
        keepalive: true,
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-only' },
        body: JSON.stringify({ usageSessionId: 'instance', handoff: true }),
      })
    );
    expect(fetch.mock.calls[0]?.[0]).not.toContain('test-only');
    releaseProfileUsageKeepAlive(claimed, 'instance');
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('il cleanup ordinario non chiede la grazia di passaggio del pagehide', async () => {
    mocks.request.mockResolvedValue(lease('cleanup'));
    const claimed = await acquireProfileUsage('profile', 'instance');
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    releaseProfileUsageKeepAlive(claimed, 'instance');
    expect(fetch).toHaveBeenCalledWith('./api/v2/usage/cleanup', expect.objectContaining({ body: JSON.stringify({ usageSessionId: 'instance' }) }));
  });
});
