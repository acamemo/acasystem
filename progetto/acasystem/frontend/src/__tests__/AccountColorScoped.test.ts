import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientSession } from '@/api/clientSession';
const mocks = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.backend, getBackendOverride: () => null }));
vi.mock('@/api/apiAuth', () => ({ getValidatedHomeAssistantRequestHeadersAsync: async () => ({ Authorization: 'Bearer captured' }) }));
import { saveAccountColor } from '@/api/accountApi';
import { getClientSession, setClientSession } from '@/api/clientSession';

const session = { houseId: 'house', user: { id: 'owner', name: 'owner', color: '#6b8afd' },
  client: { id: 'client', userId: 'owner' } } as ClientSession;
const result = { userId: 'owner', name: 'owner', color: '#123abc', revision: 1, avatarRevision: null, coverRevision: null };
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); setClientSession(session); mocks.backend.mockResolvedValue(result); });
afterEach(() => { setClientSession(null); vi.restoreAllMocks(); });
describe('colore account con autenticazione catturata', () => {
  it('aggiorna subito il contesto normale senza cambiare il comportamento delle chiamate esistenti', async () => {
    await saveAccountColor(0, '#123abc');
    expect(getClientSession()?.user.color).toBe('#123abc');
  });
  it.each(['house', 'user', 'client'] as const)('non aggiorna un contesto cambiato durante la richiesta: %s', async (changed) => {
    let complete!: (value: typeof result) => void;
    mocks.backend.mockReturnValue(new Promise<typeof result>((resolve) => { complete = resolve; }));
    const updating = saveAccountColor(0, '#123abc', { Authorization: 'Bearer captured' }, session);
    const current = { ...session,
      houseId: changed === 'house' ? 'other-house' : session.houseId,
      user: changed === 'user' ? { ...session.user, id: 'other' } : session.user,
      client: changed === 'client' ? { ...session.client, id: 'other-client' } : session.client };
    setClientSession(current); complete(result); await updating;
    expect(getClientSession()).toBe(current);
    expect(mocks.backend).toHaveBeenCalledWith('/v2/account', expect.any(Object), {
      authHeadersOverride: { Authorization: 'Bearer captured' }, retryOnOAuthUnauthorized: false, notifyOnUnauthorized: false,
    });
  });
});
