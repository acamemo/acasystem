import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  headers: vi.fn(),
  method: vi.fn(() => 'oauth'),
  unauthorized: vi.fn((message: string) => Object.assign(new Error(message), { status: 401 })),
}));

vi.mock('@/api/apiAuth', () => ({
  getValidatedHomeAssistantRequestHeadersAsync: auth.headers,
  getStoredAuthMethod: auth.method,
  notifyHomeAssistantApiUnauthorized: auth.unauthorized,
}));

import { backendPlanRequest, createElementPlanApi } from '@/casa3d/planRequest';

/**
 * The request of the plan API in the app (ADR-0014, T6): `./api/casa3d` on the same origin, the
 * token of the signed-in user, and the one retry after a 401 with OAuth like the other backend calls.
 */

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  auth.headers.mockImplementation(({ forceRefreshOAuth }: { forceRefreshOAuth?: boolean } = {}) =>
    Promise.resolve({ Authorization: forceRefreshOAuth ? 'Bearer renewed' : 'Bearer first' })
  );
  auth.method.mockReturnValue('oauth');
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  auth.headers.mockReset();
  auth.unauthorized.mockClear();
});

describe('Casa 3D plan request', () => {
  it('goes to ./api/casa3d with the token and the method, headers and body of the call', async () => {
    fetchMock.mockResolvedValue({ status: 200, ok: true });
    const bytes = new Uint8Array([1, 2, 3]);
    await backendPlanRequest('/images/bg', {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: bytes,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('./api/casa3d/images/bg');
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({ 'content-type': 'image/png', Authorization: 'Bearer first' });
    expect(init.body).toBe(bytes);
  });

  it('a read has no body', async () => {
    fetchMock.mockResolvedValue({ status: 200, ok: true });
    await backendPlanRequest('/building', { method: 'GET' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect('body' in init).toBe(false);
  });

  it('retries once with a renewed token after a 401 with OAuth', async () => {
    fetchMock
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true });
    const response = await backendPlanRequest('/building', { method: 'GET' });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(second[1].headers).toMatchObject({ Authorization: 'Bearer renewed' });
    expect(auth.unauthorized).not.toHaveBeenCalled();
  });

  it('a second 401 tells the app that the sign-in failed', async () => {
    fetchMock.mockResolvedValue({ status: 401, ok: false });
    await expect(backendPlanRequest('/building', { method: 'GET' })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(auth.unauthorized).toHaveBeenCalledTimes(1);
  });

  it('with another sign-in method a 401 is not retried', async () => {
    auth.method.mockReturnValue('token');
    fetchMock.mockResolvedValue({ status: 401, ok: false });
    await expect(backendPlanRequest('/building', { method: 'GET' })).rejects.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a 403 or a 409 reaches the plan API as it is (they are not sign-in failures)', async () => {
    fetchMock.mockResolvedValueOnce({ status: 403, ok: false });
    expect((await backendPlanRequest('/building', { method: 'PUT' })).status).toBe(403);
    fetchMock.mockResolvedValueOnce({ status: 409, ok: false });
    expect((await backendPlanRequest('/building', { method: 'PUT' })).status).toBe(409);
    expect(auth.unauthorized).not.toHaveBeenCalled();
  });

  it('every element has its own plan API, so the revision it holds is not shared', () => {
    expect(createElementPlanApi()).not.toBe(createElementPlanApi());
  });
});
