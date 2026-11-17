import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareStartupUpdates } from '@/utils/startupUpdates';

const response = (body: unknown, ok = true): Response => ({ ok, json: async () => body }) as Response;
const base = { demo: false, appVersion: '0.9.72' };
afterEach(() => vi.useRealTimers());

describe('frontend startup before providers and WebSockets', () => {
  it('keeps demo/mockup entirely offline', async () => {
    const fetcher = vi.fn();
    expect(await prepareStartupUpdates({ ...base, demo: true, fetcher })).toEqual({ kind: 'ready' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses the ingress-relative public endpoint without inventing a native shell version', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ status: 'unconfigured', version: '0.9.72' }));
    expect(await prepareStartupUpdates({ ...base, fetcher })).toEqual({ kind: 'ready' });
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('./api/updates/check?clientKind=browser', expect.objectContaining({ cache: 'no-store', redirect: 'error', credentials: 'same-origin' }));
  });
  it('passes the actual native version from the shell marker', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ status: 'current' }));
    await prepareStartupUpdates({ ...base, fetcher, userAgent: 'Electron AcasystemShell/0.1.1' });
    expect(fetcher).toHaveBeenCalledWith('./api/updates/check?shellVersion=0.1.1', expect.anything());
  });
  it.each(['available', 'deferred', 'current'])('allows the installed app for %s', async (status) => {
    expect(await prepareStartupUpdates({ ...base, fetcher: vi.fn().mockResolvedValue(response({ enabled: true, status })) })).toEqual({ kind: 'ready' });
  });
  it('opens the healthy installed app when a legacy check endpoint returns 404', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({}, false)).mockResolvedValueOnce(response({ status: 'ok', version: '0.9.72' }));
    expect(await prepareStartupUpdates({ ...base, fetcher })).toEqual({ kind: 'ready' });
    expect(fetcher.mock.calls.map(([path]) => path)).toEqual(['./api/updates/check?clientKind=browser', './api/health']);
  });
  it('ends checking after twenty seconds and verifies health before continuing', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async (url) => response(String(url).endsWith('/health') ? { status: 'ok' } : { status: 'checking' }));
    const result = prepareStartupUpdates({ ...base, fetcher });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await result).toEqual({ kind: 'ready' });
    expect(fetcher).toHaveBeenLastCalledWith('./api/health', expect.anything());
  });
  it('keeps waiting beyond three seconds while the controller finishes its check', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const fetcher = vi.fn(async () => response({ status: Date.now() < 4_000 ? 'checking' : 'current' }));
    const result = prepareStartupUpdates({ ...base, fetcher });
    let finished = false; void result.then(() => { finished = true; });
    await vi.advanceTimersByTimeAsync(3_500);
    expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(await result).toEqual({ kind: 'ready' });
  });
  it('bounds a response body that ignores abort, so the loader cannot wait forever', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: () => new Promise(() => {}) })
      .mockResolvedValueOnce(response({ status: 'ok', version: '0.9.72' }));
    const result = prepareStartupUpdates({ ...base, fetcher });
    await vi.advanceTimersByTimeAsync(3_000);
    expect(await result).toEqual({ kind: 'ready' });
  });
  it('requests a reload of the matching UI after the central version changed', async () => {
    vi.useFakeTimers();
    const onUpdating = vi.fn();
    const fetcher = vi.fn().mockResolvedValueOnce(response({ status: 'updating' }))
      .mockResolvedValueOnce(response({ status: 'current' }))
      .mockResolvedValueOnce(response({ status: 'ok', version: '0.9.73' }));
    const result = prepareStartupUpdates({ ...base, fetcher, onUpdating });
    await vi.advanceTimersByTimeAsync(250);
    expect(await result).toEqual({ kind: 'reload', version: '0.9.73' });
    expect(onUpdating).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls.map(([path]) => path)).toEqual(['./api/updates/check?clientKind=browser', './api/updates/status', './api/health']);
  });
  it('keeps an old cached frontend from mounting after an earlier update already completed', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ status: 'current', version: '0.9.73' }))
      .mockResolvedValueOnce(response({ status: 'ok', version: '0.9.73' }));
    expect(await prepareStartupUpdates({ ...base, fetcher })).toEqual({ kind: 'reload', version: '0.9.73' });
  });
  it('shows a finite retry state after 45 seconds, keeping providers/WS unmounted during drain', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async (url) => response(String(url).endsWith('/health') ? { status: 'ok', version: '0.9.72' } : { status: 'updating' }));
    const result = prepareStartupUpdates({ ...base, fetcher });
    await vi.advanceTimersByTimeAsync(45_000);
    expect(await result).toEqual({ kind: 'updating' });
  });
  it('does not mount an unhealthy central after the update or a failed check', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
    expect(await prepareStartupUpdates({ ...base, fetcher })).toEqual({ kind: 'unhealthy' });
  });
});
