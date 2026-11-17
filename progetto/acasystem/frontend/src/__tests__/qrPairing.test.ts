import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { centralConnectionUri, collectQrConfiguration, importQrConfiguration, importQrPairing, pairingUri, qrImage, readQrEndpoint, readQrPreferences, watchAccountSettings, type QrAcceptance } from '@/api/qrPairing';
import { drainQrHandoffs } from '@/hooks/qrAccountSync';
import { captureNativeQrHandoff, readPendingLayoutCopy } from '@/api/qrHandoff';

vi.mock('@/api/apiAuth', () => ({ getValidatedHomeAssistantRequestHeadersAsync: async () => ({ Authorization: 'Bearer private-session' }) }));

const account: QrAcceptance = { schema: 1, pairingId: 'account-packet', houseId: 'own-house',
  endpoint: 'http://192.168.1.5:3002', mode: 'account', accountUserId: 'own-user', loginRequired: true };
const copy: QrAcceptance = { schema: 1, pairingId: 'copy-packet', houseId: 'friends-house',
  endpoint: 'http://192.168.2.8:3002', mode: 'configuration', loginRequired: true,
  configuration: { snapshot: { version: 1, layout: { customNames: { 'light.aca_copy_1': 'Luce' } }, appearance: {} },
    appearance: { theme: 'dark', accent: 'cyan', wallpaper: 'none' } } };

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

describe('QR pairing frontend', () => {
  it('reads the central address from the Android local proxy without credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ endpoint: 'http://192.168.1.5:4002' })));
    vi.stubGlobal('fetch', fetcher);
    expect(await readQrEndpoint()).toBe('http://192.168.1.5:4002');
    expect(fetcher).toHaveBeenCalledWith('/__acasystem/endpoint', { cache: 'no-store', credentials: 'same-origin' });
  });
  it('encodes only a private central origin in a connection QR', () => {
    expect(centralConnectionUri('http://192.168.1.5:3002')).toBe('http://192.168.1.5:3002/');
    expect(centralConnectionUri('http://10.0.0.5:4002/')).toBe('http://10.0.0.5:4002/');
    for (const endpoint of ['http://127.0.0.1:3002', 'http://8.8.8.8:3002', 'http://192.168.1.5:3002/?token=secret', 'http://user:pass@192.168.1.5:3002/', 'http://192.168.1.5:3002/#/collega?invite=secret']) {
      expect(() => centralConnectionUri(endpoint)).toThrow();
    }
  });
  it('encodes the agreed URI and creates the QR locally', () => {
    const uri = pairingUri({ schema: 1, houseId: '345dd32e-56bd-46ef-89ad-98afaa69c091', endpoint: 'http://192.168.1.5:3002', invite: 'a'.repeat(43), expiresAt: 5000 });
    const parsed = new URL(uri);
    expect(parsed.origin).toBe('http://192.168.1.5:3002');
    expect(parsed.pathname).toBe('/');
    expect(parsed.search).toBe('');
    const parameters = new URLSearchParams(parsed.hash.split('?')[1]);
    expect(parameters.has('endpoint')).toBe(false);
    expect(parameters.get('invite')).toBe('a'.repeat(43));
    expect(qrImage(uri)).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(qrImage(uri))).toContain('<svg');
  });
  it('CONFIG copies the layout with a fixed palette, preserving raw preferences and destination identity', () => {
    localStorage.setItem('ha_token', 'my-private-token');
    const raw = '{"theme":"dark","accent":"orange","wallpaper":"photo","wallpaperHue":30}';
    localStorage.setItem('aca_appearance', raw);
    const original = JSON.stringify(copy.configuration);
    importQrPairing(account, {});
    importQrPairing(copy, {});
    expect(readQrPreferences()).toEqual({ schema: 1, mode: 'configuration', houseId: 'own-house', accountUserId: 'own-user' });
    expect(localStorage.getItem('ha_token')).toBe('my-private-token');
    expect(localStorage.getItem('aca_appearance')).toBe(raw);
    expect(JSON.stringify(copy.configuration)).toBe(original);
    expect(localStorage.getItem('tunet_custom_names')).toContain('light.aca_copy_1');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.accent).toBeUndefined();
    expect(localStorage.getItem('aca_pairing_preferences')).not.toContain('friends-house');
  });
  it('imports a validated file as a local copy without replacing the destination identity or token', () => {
    localStorage.setItem('ha_token', 'my-private-token');
    localStorage.setItem('aca_appearance', '{old raw preferences');
    importQrPairing(account, {});
    importQrConfiguration(copy.configuration!, {});
    expect(readQrPreferences()).toEqual({ schema: 1, mode: 'configuration', houseId: 'own-house', accountUserId: 'own-user' });
    expect(localStorage.getItem('ha_token')).toBe('my-private-token');
    expect(localStorage.getItem('aca_appearance')).toBe('{old raw preferences');
    expect(localStorage.getItem('aca_pairing_preferences')).not.toContain('friends-house');
  });
  it('exports the fixed effective appearance without changing historical local choices', () => {
    const raw = '{"theme":"dark","accent":"wallpaper","wallpaper":"photo","wallpaperHue":240}';
    localStorage.setItem('aca_appearance', raw);
    expect(collectQrConfiguration().appearance).toEqual({ theme: 'light', accent: 'violet', wallpaper: 'none' });
    expect(localStorage.getItem('aca_appearance')).toBe(raw);
  });
  it('drains ACCOUNT then CONFIG once and acknowledges both packets', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(account)))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(copy)))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);
    await drainQrHandoffs({});
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(fetcher.mock.calls[1]?.[0]).toBe('/__acasystem/pairing/ack');
    expect(readQrPreferences()?.mode).toBe('configuration');
    expect(readQrPreferences()?.houseId).toBe('own-house');
  });
  it('la consegna CONFIG v2 conserva la copia per il nuovo profilo senza applicare aspetto o snapshot', async () => {
    importQrPairing(account, {});
    localStorage.setItem('ha_token', 'my-private-token');
    localStorage.setItem('aca_appearance', '{"theme":"light","accent":"orange"}');
    const before = localStorage.getItem('aca_appearance');
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(copy)))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);
    await captureNativeQrHandoff(new AbortController().signal);
    expect(readPendingLayoutCopy()).toEqual(copy.configuration);
    expect(localStorage.getItem('aca_appearance')).toBe(before);
    expect(localStorage.getItem('ha_token')).toBe('my-private-token');
    expect(readQrPreferences()).toMatchObject({ mode: 'configuration', houseId: 'own-house' });
    expect(fetcher.mock.calls[1]?.[0]).toBe('/__acasystem/pairing/ack');
  });
  it('receives pushed revisions over an authenticated stream, including chunk boundaries', async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new TextEncoder().encode('event: revision\ndata: {"revi'));
      controller.enqueue(new TextEncoder().encode('sion":2}\n\n: keep-alive\n\nevent: revision\ndata: {"revision":3}\n\n'));
      controller.close();
    } });
    const fetcher = vi.fn().mockResolvedValue(new Response(stream));
    vi.stubGlobal('fetch', fetcher);
    const revisions: number[] = [];
    await watchAccountSettings(new AbortController().signal, (revision) => revisions.push(revision));
    expect(revisions).toEqual([2, 3]);
    expect(fetcher.mock.calls[0]?.[1].headers).toEqual({ Authorization: 'Bearer private-session' });
  });
});
