import { describe, expect, it, vi } from 'vitest';
import { sha256Hex } from '../integrity.ts';
import type { ReleaseManifest } from '../manifest.ts';
import { latestManifestUrl } from '../releases.ts';
import { resolveStartup } from '../startup.ts';
import { createCache, createConfigStore, createHttp, makeRelease } from './fakes.ts';

const origin = 'http://192.168.1.7:3002';
const health = `${origin}/api/health`;
const manifestUrl = `${origin}/api/client-bundle/manifest`;
const archiveUrl = `${origin}/api/client-bundle/archive`;
const updateCheck = `${origin}/api/updates/check?shellVersion=0.1.0`;
const repository = { owner: 'acamemo', repo: 'acasystem-releases' };
const run = (routes: Record<string, unknown>, initial: ReleaseManifest[] = [], preferServerBundle = true) => {
  const net = createHttp({ [health]: { status: 'ok', version: '0.9.31' }, [updateCheck]: { status: 'unconfigured', version: '0.9.31' }, ...routes });
  const cache = createCache(initial);
  const install = vi.spyOn(cache.cache, 'install');
  const result = resolveStartup({ http: net.http, config: createConfigStore({ host: '192.168.1.7', port: 3002 }).store,
    cache: cache.cache, shellVersion: '0.1.0', repository, preferServerBundle });
  return { result, net, cache, install };
};

describe('the paired central server’s bundle', () => {
  it('uses the current central bundle without requesting a newer public GitHub release', async () => {
    const local = await makeRelease('0.9.31');
    const publicRelease = await makeRelease('0.9.99');
    const test = run({ [manifestUrl]: local.manifest, [archiveUrl]: local.archive,
      [latestManifestUrl(repository)]: publicRelease.manifest });
    expect(await test.result).toEqual({ kind: 'launch', origin, version: '0.9.31', notices: [] });
    expect(test.net.requested).toEqual([health, updateCheck, manifestUrl, archiveUrl]);
    expect(test.install).toHaveBeenCalledWith(local.manifest, local.archive);
  });
  it('reuses a cached bundle only when both version and checksum match', async () => {
    const local = await makeRelease('0.9.31');
    const test = run({ [manifestUrl]: local.manifest }, [local.manifest]);
    expect((await test.result).kind).toBe('launch');
    expect(test.net.requested).toEqual([health, updateCheck, manifestUrl]);
    expect(test.install).not.toHaveBeenCalled();
  });
  it('downloads a rebuilt archive even when its version string is unchanged', async () => {
    const cached = await makeRelease('0.9.31');
    const bytes = new TextEncoder().encode('rebuilt current interface');
    const rebuilt = { ...cached.manifest, archive: { ...cached.manifest.archive, sha256: await sha256Hex(bytes), size: bytes.byteLength } };
    const test = run({ [manifestUrl]: rebuilt, [archiveUrl]: bytes }, [cached.manifest]);
    expect((await test.result).kind).toBe('launch');
    expect(test.install).toHaveBeenCalledWith(rebuilt, bytes);
  });
  it.each(['checksum', 'size'] as const)('rejects a damaged archive (%s), without using an older public cache', async (damage) => {
    const local = await makeRelease('0.9.31');
    const old = await makeRelease('0.9.30');
    const bytes = local.archive.slice();
    bytes[0] = bytes[0]! ^ 1;
    const test = run({ [manifestUrl]: local.manifest, [archiveUrl]: damage === 'size' ? bytes.slice(1) : bytes }, [old.manifest]);
    expect(await test.result).toEqual({ kind: 'no-bundle', origin, reason: 'download-failed' });
    expect(test.install).not.toHaveBeenCalled();
    expect(test.net.requested.every((url) => url.startsWith(origin))).toBe(true);
  });
  it('does not fall back to a known different checksum of the same version when download fails', async () => {
    const cached = await makeRelease('0.9.31');
    const bytes = new TextEncoder().encode('new central interface');
    const next = { ...cached.manifest, archive: { ...cached.manifest.archive, sha256: await sha256Hex(bytes), size: bytes.byteLength } };
    const test = run({ [manifestUrl]: next }, [cached.manifest]);
    expect(await test.result).toEqual({ kind: 'no-bundle', origin, reason: 'download-failed' });
    expect(test.install).not.toHaveBeenCalled();
  });
  it('uses the cache of the current server version if its manifest cannot be reached', async () => {
    const current = await makeRelease('0.9.31');
    const old = await makeRelease('0.9.30');
    const test = run({}, [old.manifest, current.manifest]);
    expect(await test.result).toEqual({ kind: 'launch', origin, version: '0.9.31', notices: [{ kind: 'offline' }] });
    expect(test.net.requested).toEqual([health, updateCheck, manifestUrl]);
    expect(await run({}, [old.manifest]).result).toEqual({ kind: 'no-bundle', origin, reason: 'download-failed' });
  });
  it.each([{ minServer: '0.9.32' }, { minShell: '0.2.0' }, { schema: 2 }])('refuses an incompatible or invalid manifest (%j)', async (patch) => {
    const local = await makeRelease('0.9.31');
    const test = run({ [manifestUrl]: { ...local.manifest, ...patch }, [archiveUrl]: local.archive }, [local.manifest]);
    expect(await test.result).toEqual({ kind: 'no-bundle', origin, reason: 'incompatible' });
    expect(test.net.requested).toEqual([health, updateCheck, manifestUrl]);
  });
  it('keeps the existing GitHub path when server preference is off', async () => {
    const local = await makeRelease('0.9.31');
    const test = run({ [latestManifestUrl(repository)]: local.manifest }, [local.manifest], false);
    expect((await test.result).kind).toBe('launch');
    expect(test.net.requested).toEqual([health, updateCheck, latestManifestUrl(repository)]);
  });
});
