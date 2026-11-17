import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForCentralUpdate } from '../centralUpdate.ts';
import type { HttpClient } from '../ports.ts';
import { resolveStartup } from '../startup.ts';
import { createCache, createConfigStore, makeRelease } from './fakes.ts';

const origin = 'http://192.168.1.7:3002';
const check = `${origin}/api/updates/check?shellVersion=0.1.1`;
const status = `${origin}/api/updates/status`;
const client = (getJson: HttpClient['getJson']): HttpClient => ({ getJson, getBytes: async () => new Uint8Array() });
afterEach(() => vi.useRealTimers());

describe('central update before native startup', () => {
  it.each([{ status: 'unconfigured', version: '0.9.72' }, { enabled: false, status: 'unconfigured' }, { enabled: true, status: 'current' }, { enabled: true, status: 'available' }, { enabled: true, status: 'deferred' }])('keeps the installed app for %j', async (body) => {
    const getJson = vi.fn().mockResolvedValue(body);
    expect(await waitForCentralUpdate(client(getJson), origin, '0.1.1')).toEqual({ kind: 'ready', refreshHealth: false });
    expect(getJson).toHaveBeenCalledExactlyOnceWith(check, 3_000);
  });
  it('polls checking and requests a fresh health after a real update', async () => {
    vi.useFakeTimers();
    const getJson = vi.fn().mockResolvedValueOnce({ status: 'checking' }).mockResolvedValueOnce({ status: 'updating' }).mockResolvedValueOnce({ status: 'current' });
    const result = waitForCentralUpdate(client(getJson), origin, '0.1.1');
    await vi.advanceTimersByTimeAsync(500);
    expect(await result).toEqual({ kind: 'ready', refreshHealth: true });
    expect(getJson.mock.calls.map(([url]) => url)).toEqual([check, status, status]);
  });
  it('allows the controller polling/GitHub budget and stops checking after twenty seconds', async () => {
    vi.useFakeTimers();
    const getJson = vi.fn().mockResolvedValue({ status: 'checking' });
    const result = waitForCentralUpdate(client(getJson), origin, '0.1.1');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await result).toEqual({ kind: 'ready', refreshHealth: true });
  });
  it('does not open the app at three seconds while the controller is still checking', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const result = waitForCentralUpdate(client(async () => ({ status: Date.now() < 4_000 ? 'checking' : 'current' })), origin, '0.1.1');
    let finished = false; void result.then(() => { finished = true; });
    await vi.advanceTimersByTimeAsync(3_500);
    expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(await result).toEqual({ kind: 'ready', refreshHealth: false });
  });
  it('refreshes health when current reports a version newer than the initial health', async () => {
    const next = await makeRelease('0.9.32');
    let healthReads = 0;
    const getJson = vi.fn(async (url: string) => {
      if (url.endsWith('/api/health')) return { status: 'ok', version: ++healthReads === 1 ? '0.9.31' : '0.9.32' };
      if (url === check) return { status: 'current', version: '0.9.32' };
      if (url.endsWith('/api/client-bundle/manifest')) return next.manifest;
      throw new Error('Unexpected URL');
    });
    const result = await resolveStartup({ http: { getJson, getBytes: async () => next.archive },
      config: createConfigStore({ host: '192.168.1.7', port: 3002 }).store, cache: createCache().cache,
      shellVersion: '0.1.1', preferServerBundle: true });
    expect(result).toEqual({ kind: 'launch', origin, version: '0.9.32', notices: [] });
    expect(healthReads).toBe(2);
  });
  it('cannot wait forever for an HTTP adapter that ignores timeouts', async () => {
    vi.useFakeTimers();
    const result = waitForCentralUpdate(client(() => new Promise(() => {})), origin, '0.1.1');
    await vi.advanceTimersByTimeAsync(3_000);
    expect(await result).toEqual({ kind: 'ready', refreshHealth: true });
  });
  it('ends after 45 seconds of updating without opening the app during drain', async () => {
    vi.useFakeTimers();
    const result = waitForCentralUpdate(client(async () => ({ status: 'updating' })), origin, '0.1.1');
    await vi.advanceTimersByTimeAsync(45_000);
    expect(await result).toEqual({ kind: 'updating', refreshHealth: true });
  });
  it('allows an unavailable/legacy update endpoint only after a fresh health', async () => {
    const result = await waitForCentralUpdate(client(async () => { throw new Error('404/offline'); }), origin, '0.1.1');
    expect(result).toEqual({ kind: 'ready', refreshHealth: true });
  });
  it('uses the post-update version and central bundle before returning launch', async () => {
    const next = await makeRelease('0.9.32');
    vi.useFakeTimers();
    let healthReads = 0;
    const getJson = vi.fn(async (url: string) => {
      if (url.endsWith('/api/health')) return { status: 'ok', version: ++healthReads === 1 ? '0.9.31' : '0.9.32' };
      if (url === check) return { status: 'updating' };
      if (url === status) return { status: 'current' };
      if (url.endsWith('/api/client-bundle/manifest')) return next.manifest;
      throw new Error('Unexpected URL');
    });
    const result = resolveStartup({ http: { getJson, getBytes: async () => next.archive },
      config: createConfigStore({ host: '192.168.1.7', port: 3002 }).store, cache: createCache().cache,
      shellVersion: '0.1.1', preferServerBundle: true });
    await vi.advanceTimersByTimeAsync(250);
    expect(await result).toEqual({ kind: 'launch', origin, version: '0.9.32', notices: [] });
    expect(getJson.mock.calls.map(([url]) => url)).toEqual([`${origin}/api/health`, check, status, `${origin}/api/health`, `${origin}/api/client-bundle/manifest`]);
  });
});
