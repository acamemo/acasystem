import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { ClientSession } from '@/api/clientSession';
const mocks = vi.hoisted(() => ({ backend: vi.fn(), headers: vi.fn() }));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.backend, getBackendOverride: () => null }));
vi.mock('@/api/apiAuth', () => ({ getValidatedHomeAssistantRequestHeadersAsync: mocks.headers }));
import { ACCOUNT_CHANGED_EVENT, removeAccountImage, saveAccountImage } from '@/api/accountApi';
import { getClientSession, setClientSession } from '@/api/clientSession';
const session = { houseId: 'house', user: { id: 'anna', name: 'Anna', color: '#123abc' }, client: { id: 'phone', userId: 'anna' } } as ClientSession;
const metadata = { userId: 'anna', name: 'Anna', color: '#123abc', revision: 2, avatarRevision: 2, coverRevision: null };
beforeEach(() => { vi.resetAllMocks(); setClientSession(session); mocks.headers.mockResolvedValue({ Authorization: 'Bearer captured' }); });
afterEach(() => setClientSession(null));
describe('API immagini con accesso e contesto catturati', () => {
  it.each(['house', 'user', 'client'] as const)('non applica risposta/eventi al contesto cambiato: %s', async (part) => {
    let complete!: (value: typeof metadata) => void;
    mocks.backend.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const listener = vi.fn(); window.addEventListener(ACCOUNT_CHANGED_EVENT, listener);
    try {
      const saving = saveAccountImage('avatar', 1, 'data:image/jpeg;base64,AQID');
      await vi.waitFor(() => expect(mocks.backend).toHaveBeenCalledOnce());
      const other = { ...session, houseId: part === 'house' ? 'other-house' : session.houseId,
        user: part === 'user' ? { ...session.user, id: 'other' } : session.user,
        client: part === 'client' ? { ...session.client, id: 'other-phone' } : session.client };
      setClientSession(other); complete(metadata); await saving;
      expect(getClientSession()).toBe(other); expect(listener).not.toHaveBeenCalled();
      expect(mocks.backend).toHaveBeenCalledWith('/v2/account/images/avatar', expect.any(Object), {
        authHeadersOverride: { Authorization: 'Bearer captured' }, retryOnOAuthUnauthorized: false, notifyOnUnauthorized: false });
    } finally { window.removeEventListener(ACCOUNT_CHANGED_EVENT, listener); }
  });
  it('un cambio identità durante la cattura dei token impedisce di inviare la rimozione al nuovo account', async () => {
    let complete!: (value: { Authorization: string }) => void;
    mocks.headers.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const removing = removeAccountImage('cover', 1);
    setClientSession({ ...session, user: { ...session.user, id: 'other' } });
    complete({ Authorization: 'Bearer another-account' });
    await expect(removing).rejects.toThrow('accesso è cambiato');
    expect(mocks.backend).not.toHaveBeenCalled();
  });
  it('un editor ancora riferito al vecchio account non può usare i token della nuova sessione', async () => {
    setClientSession({ ...session, user: { ...session.user, id: 'other' } });
    await expect(saveAccountImage('avatar', 1, 'data:image/jpeg;base64,AQID', undefined, session)).rejects.toThrow('accesso è cambiato');
    expect(mocks.backend).not.toHaveBeenCalled();
  });
});
