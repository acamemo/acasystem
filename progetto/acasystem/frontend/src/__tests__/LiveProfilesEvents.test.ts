import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ headers: vi.fn() }));
vi.mock('@/api/apiAuth', () => ({ getValidatedHomeAssistantRequestHeadersAsync: mocks.headers }));
vi.mock('@/api/backendClient', () => ({ backendRequest: vi.fn() }));
import { watchLiveProfiles } from '@/api/liveProfiles';
import { clearProfileUsageProof, setProfileUsageProof } from '@/api/usageProof';

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.headers.mockResolvedValue({ Authorization: 'Bearer fixture-only' });
  clearProfileUsageProof();
});
describe('identità della connessione eventi del profilo', () => {
  it('invia l’istanza stabile autenticata senza legare SSE alla fence che può ruotare', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () =>
          new Response('data: {"type":"usage","profileId":"profile"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
          })
      );
    const changed = vi.fn();
    await watchLiveProfiles(new AbortController().signal, changed, 'instance-stable');
    setProfileUsageProof({
      id: 'new-fence',
      usageSessionId: 'instance-stable',
      profileId: 'profile',
      clientId: 'client',
      serverTime: Date.now(),
      expiresAt: Date.now() + 180000,
    });
    await watchLiveProfiles(new AbortController().signal, changed, 'instance-stable');
    for (const call of fetch.mock.calls)
      expect(call[1]?.headers).toEqual({
        Authorization: 'Bearer fixture-only',
        'x-aca-usage-session': 'instance-stable',
      });
    expect(changed).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledWith({ type: 'usage', profileId: 'profile' });
    clearProfileUsageProof();
  });
  it('senza istanza opzionale non inventa identificatori né usa un proof di un’altra istanza', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(''));
    setProfileUsageProof({
      id: 'other-fence',
      usageSessionId: 'other-instance',
      profileId: 'profile',
      clientId: 'client',
      serverTime: Date.now(),
      expiresAt: Date.now() + 180000,
    });
    await watchLiveProfiles(new AbortController().signal, vi.fn());
    expect(fetch).toHaveBeenCalledWith(
      './api/v2/events',
      expect.objectContaining({ headers: { Authorization: 'Bearer fixture-only' } })
    );
    clearProfileUsageProof();
  });
});
