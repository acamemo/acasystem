// @vitest-environment-options {"url":"http://192.168.1.50:3002/"}
import fixture from './fixtures/pairing-web-v1.json';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveHassUrl } from '@/api/haUrl';
import {
  acceptWebPairing, captureWebPairing, importPortableLayoutFile, MAX_LAYOUT_FILE_BYTES,
  parseWebPairingUrl, portableLayoutFile,
} from '@/api/webPairing';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/api/backendClient', () => ({ backendRequest: mocks.request }));
const configuration = { snapshot: { version: 1, layout: { headerTitle: 'La mia casa' }, appearance: {} },
  appearance: { theme: 'dark', accent: 'cyan', wallpaper: 'none' } } as const;
const packet = (action = 'account') => ({ schema: 1, pairingId: '445dd32e-56bd-46ef-89ad-98afaa69c091',
  houseId: fixture.houseId, endpoint: fixture.endpoint, mode: action, loginRequired: true,
  ...(action === 'account' ? { accountUserId: 'same-user' } : { configuration }) });

beforeEach(() => { vi.clearAllMocks(); window.history.replaceState({}, '', '/#/'); });
afterEach(() => vi.unstubAllGlobals());

describe('collegamento web dal QR', () => {
  it('shares the native parser fixture and leaves relative API and HA paths unchanged', () => {
    expect(parseWebPairingUrl(fixture.url)).toEqual({ kind: 'ready', code: { houseId: fixture.houseId, invite: fixture.invite } });
    expect(new URL('./api/pairing/accept', fixture.url).pathname).toBe('/api/pairing/accept');
    expect(resolveHassUrl(fixture.url)).toBe(`${fixture.endpoint}/ha`);
  });
  it.each(fixture.invalid)('rejects the same unsupported link as the native parser: %s', (url) => {
    expect(parseWebPairingUrl(url)).toEqual({ kind: 'invalid' });
  });
  it('captures and removes the invitation without any request or automatic acceptance', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const replaceState = vi.fn();
    expect(captureWebPairing({ href: fixture.url, hash: new URL(fixture.url).hash }, { state: null, replaceState }))
      .toMatchObject({ kind: 'ready' });
    expect(replaceState).toHaveBeenCalledWith(null, '', `${fixture.endpoint}/#/`);
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(captureWebPairing({ href: `${fixture.endpoint}/#/sistema`, hash: '#/sistema' }, { state: null, replaceState })).toBeNull();
  });
  it('accepts once per explicit call, through the same-origin API without session credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(packet())));
    vi.stubGlobal('fetch', fetcher);
    expect(await acceptWebPairing({ houseId: fixture.houseId, invite: fixture.invite }, 'account')).toMatchObject({ accountUserId: 'same-user' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe('./api/pairing/accept');
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', credentials: 'omit', cache: 'no-store',
      body: JSON.stringify({ houseId: fixture.houseId, invite: fixture.invite, action: 'account' }) });
    expect(fetcher.mock.calls[0]?.[1].headers).not.toHaveProperty('Authorization');
  });
  it('rejects replay/expiry and a response from another endpoint or house', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 410 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...packet(), endpoint: 'http://192.168.1.99:3002' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...packet(), houseId: 'other-house' })));
    vi.stubGlobal('fetch', fetcher);
    const code = { houseId: fixture.houseId, invite: fixture.invite };
    await expect(acceptWebPairing(code, 'account')).rejects.toThrow('scaduto');
    await expect(acceptWebPairing(code, 'account')).rejects.toThrow('non ha restituito');
    await expect(acceptWebPairing(code, 'account')).rejects.toThrow('non ha restituito');
  });
});

describe('file portabile ACA', () => {
  it('contains only the portable configuration, without invitation, endpoint or account metadata', () => {
    expect(JSON.parse(portableLayoutFile(configuration))).toEqual({ format: 'acasystem-layout', schema: 1, configuration });
    for (const value of ['houseId', 'accountUserId', 'endpoint', 'invite', 'access_token']) expect(portableLayoutFile(configuration)).not.toContain(value);
  });
  it('checks size and schema before posting the file to the authenticated API of the destination', async () => {
    const text = portableLayoutFile(configuration);
    mocks.request.mockResolvedValue({ schema: 1, configuration });
    await expect(importPortableLayoutFile({ size: text.length, text: async () => text })).resolves.toEqual(configuration);
    expect(mocks.request).toHaveBeenCalledWith('/pairing/configuration/import', { method: 'POST', body: text });
    mocks.request.mockClear();
    const read = vi.fn();
    await expect(importPortableLayoutFile({ size: MAX_LAYOUT_FILE_BYTES + 1, text: read })).rejects.toThrow('512 KB');
    expect(read).not.toHaveBeenCalled();
    await expect(importPortableLayoutFile({ size: 2, text: async () => '{}' })).rejects.toThrow('compatibile');
    await expect(importPortableLayoutFile({ size: 1, text: async () => '[' })).rejects.toThrow('leggibile');
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
