import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ backend: vi.fn(), headers: vi.fn(), session: null as null | { houseId: string; user: { id: string }; client: { id: string } }, fetch: vi.fn() }));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.backend, getBackendOverride: () => null }));
vi.mock('@/api/apiAuth', () => ({ getValidatedHomeAssistantRequestHeadersAsync: mocks.headers }));
vi.mock('@/api/clientSession', () => ({ getClientSession: () => mocks.session, setClientSession: vi.fn(), CLIENT_SESSION_EVENT: 'test:client' }));
vi.mock('@/api/activityApi', () => ({ ACTIVITY_CHANGED_EVENT: 'test:activity' }));
vi.mock('@/api/demoSource', () => ({ getDemoSource: () => null }));
import { accountAvatarUrl, hasAccountAvatar, subscribeAccountAvatars } from '@/api/accountApi';
const revoke = vi.fn();
const blobResponse = () => new Response(new Uint8Array([255, 216, 255]), { headers: { 'Content-Type': 'image/jpeg' } });
beforeEach(async () => {
  vi.clearAllMocks(); mocks.session = null;
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:authenticated-avatar', revokeObjectURL: revoke });
  await accountAvatarUrl('anna');
  mocks.headers.mockResolvedValue({ Authorization: 'Bearer test-session' });
  mocks.backend.mockResolvedValue([{ userId: 'anna', avatarRevision: 3 }]);
  mocks.session = { houseId: 'house', user: { id: 'anna' }, client: { id: 'phone' } };
});
afterEach(() => { mocks.session = null; vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('cache avatar autenticata per casa e account', () => {
  it('riusa il blob autenticato e lo revoca quando termina la sessione', async () => {
    mocks.fetch.mockResolvedValue(blobResponse());
    expect(await accountAvatarUrl('anna')).toBe('blob:authenticated-avatar');
    expect(await accountAvatarUrl('anna')).toBe('blob:authenticated-avatar');
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(mocks.fetch).toHaveBeenCalledWith('./api/v2/account/users/anna/avatar', expect.objectContaining({ headers: { Authorization: 'Bearer test-session' }, cache: 'no-store' }));
    mocks.session = null;
    expect(await accountAvatarUrl('anna')).toBeNull();
    expect(hasAccountAvatar('anna')).toBe(false);
    expect(revoke).toHaveBeenCalledWith('blob:authenticated-avatar');
  });
  it('riprova un errore temporaneo senza attendere una nuova revisione della foto', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(blobResponse());
    expect(await accountAvatarUrl('anna')).toBeNull();
    expect(await accountAvatarUrl('anna')).toBe('blob:authenticated-avatar');
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it('condivide un solo timer fra tutti gli avatar e lo interrompe all’ultimo smontaggio', async () => {
    const timer = vi.spyOn(globalThis, 'setInterval');
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const first = subscribeAccountAvatars(vi.fn());
    const second = subscribeAccountAvatars(vi.fn());
    await accountAvatarUrl('absent');
    expect(timer).toHaveBeenCalledTimes(1);
    first(); expect(clear).not.toHaveBeenCalled();
    second(); expect(clear).toHaveBeenCalledTimes(1);
  });
});
