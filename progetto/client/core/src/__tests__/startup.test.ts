import { describe, expect, it } from 'vitest';
import type { ReleaseRepository } from '../defaults.ts';
import type { ReleaseManifest } from '../manifest.ts';
import { noticeText, startupErrorText } from '../messages.ts';
import { HttpRequestError } from '../ports.ts';
import { archiveUrl, latestManifestUrl, manifestUrl } from '../releases.ts';
import { resolveStartup } from '../startup.ts';
import type { StartupResult } from '../startup.ts';
import { submitAddress } from '../wizard.ts';
import { createCache, createConfigStore, createHttp, makeRelease } from './fakes.ts';

const repository: ReleaseRepository = { owner: 'acamemo', repo: 'acasystem-releases' };
const config = { host: '192.168.1.7', port: 3002 };
const origin = 'http://192.168.1.7:3002';
const health = `${origin}/api/health`;
const apiList = 'https://api.github.com/repos/acamemo/acasystem-releases/releases?per_page=30';

const releaseRoutes = (...releases: { manifest: ReleaseManifest; archive: Uint8Array }[]) =>
  Object.fromEntries(
    releases.flatMap(({ manifest, archive }) => [
      [manifestUrl(repository, manifest.version), manifest],
      [archiveUrl(repository, manifest), archive],
    ])
  );

const run = (routes: Record<string, unknown>, cached: ReleaseManifest[] = [], shellVersion = '0.1.0') => {
  const net = createHttp(routes);
  const cache = createCache(cached);
  const result = resolveStartup({
    http: net.http,
    config: createConfigStore(config).store,
    cache: cache.cache,
    shellVersion,
    repository,
  });
  return { result, net, cache };
};

describe('resolveStartup', () => {
  it('senza indirizzo apre la procedura guidata', async () => {
    const { http } = createHttp({});
    const result = await resolveStartup({
      http,
      config: createConfigStore(null).store,
      cache: createCache().cache,
      shellVersion: '0.1.0',
      repository,
    });
    expect(result).toEqual({ kind: 'wizard' });
  });

  it('distingue mini PC spento da un altro servizio', async () => {
    expect(await run({}).result).toEqual({ kind: 'server-unreachable', origin });
    expect(await run({ [health]: new HttpRequestError('status', '404', 404) }).result).toEqual({
      kind: 'not-acasystem',
      origin,
    });
    expect(await run({ [health]: { status: 'running' } }).result).toEqual({ kind: 'not-acasystem', origin });
  });

  it("scarica, verifica e installa l'ultima versione (P-1)", async () => {
    const latest = await makeRelease('0.9.30', { minServer: '0.9.28' });
    const { result, cache } = run({
      [health]: { status: 'ok', version: '0.9.28' },
      [latestManifestUrl(repository)]: latest.manifest,
      ...releaseRoutes(latest),
    });
    expect(await result).toEqual({ kind: 'launch', origin, version: '0.9.30', notices: [] });
    expect(cache.versions()).toEqual(['0.9.30']);
  });

  it("non riscarica una versione già in cache", async () => {
    const latest = await makeRelease('0.9.30');
    const { result, net } = run(
      { [health]: { status: 'ok', version: '0.9.30' }, [latestManifestUrl(repository)]: latest.manifest },
      [latest.manifest]
    );
    expect((await result).kind).toBe('launch');
    expect(net.requested).not.toContain(archiveUrl(repository, latest.manifest));
  });

  it("con un server vecchio usa l'ultima compatibile da GitHub e avvisa (P-1 bis)", async () => {
    const latest = await makeRelease('0.9.31', { minServer: '0.9.31' });
    const older = await makeRelease('0.9.29', { minServer: '0.9.28' });
    const tooNew = await makeRelease('0.9.30', { minServer: '0.9.30' });
    const { result, cache } = run({
      [health]: { status: 'ok', version: '0.9.28' },
      [latestManifestUrl(repository)]: latest.manifest,
      [apiList]: [
        { tag_name: 'v0.9.31' },
        { tag_name: 'v0.9.30' },
        { tag_name: 'v0.9.30-beta', prerelease: true },
        { tag_name: 'v0.9.29' },
        { tag_name: 'v0.9.99', draft: true },
      ],
      ...releaseRoutes(latest, older, tooNew),
    });
    expect(await result).toEqual({
      kind: 'launch',
      origin,
      version: '0.9.29',
      notices: [{ kind: 'server-update', available: '0.9.31' }],
    });
    expect(cache.versions()).toEqual(['0.9.29']);
  });

  it("chiede di aggiornare l'app se l'interfaccia richiede un guscio nuovo (Q-A4)", async () => {
    const latest = await makeRelease('0.9.31', { minShell: '0.2.0' });
    const cached = await makeRelease('0.9.30');
    const { result } = run(
      {
        [health]: { status: 'ok', version: '0.9.31' },
        [latestManifestUrl(repository)]: latest.manifest,
        [apiList]: new HttpRequestError('status', 'limite orario', 403),
      },
      [cached.manifest]
    );
    const outcome = await result;
    expect(outcome).toEqual({
      kind: 'launch',
      origin,
      version: '0.9.30',
      notices: [{ kind: 'shell-update', available: '0.9.31' }],
    });
    if (outcome.kind === 'launch') expect(noticeText(outcome.notices[0]!)).toContain("aggiorna l'app");
  });

  it('senza versioni compatibili lo dice', async () => {
    const latest = await makeRelease('0.9.31', { minServer: '0.9.31' });
    const { result } = run({
      [health]: { status: 'ok', version: '0.9.28' },
      [latestManifestUrl(repository)]: latest.manifest,
      [apiList]: [{ tag_name: 'v0.9.31' }],
      ...releaseRoutes(latest),
    });
    expect(await result).toEqual({ kind: 'no-bundle', origin, reason: 'incompatible' });
  });

  it('un server senza versione dichiarata non blocca', async () => {
    const latest = await makeRelease('0.9.31', { minServer: '0.9.31' });
    const { result } = run({
      [health]: { status: 'ok', version: 'unknown' },
      [latestManifestUrl(repository)]: latest.manifest,
      ...releaseRoutes(latest),
    });
    expect((await result as Extract<StartupResult, { kind: 'launch' }>).version).toBe('0.9.31');
  });

  it('senza internet usa la cache, al primo avvio chiede la rete (P-4)', async () => {
    const cached = await makeRelease('0.9.29');
    const online = { [health]: { status: 'ok', version: '0.9.29' } };
    expect(await run(online, [cached.manifest]).result).toEqual({
      kind: 'launch',
      origin,
      version: '0.9.29',
      notices: [{ kind: 'offline' }],
    });
    const firstRun = await run(online).result;
    expect(firstRun).toEqual({ kind: 'no-bundle', origin, reason: 'offline' });
    if (firstRun.kind === 'no-bundle') expect(startupErrorText(firstRun)).toContain('primo avvio');
  });

  it('distingue un repository senza Release dalla rete assente', async () => {
    const { result } = run({
      [health]: { status: 'ok', version: '0.9.29' },
      [latestManifestUrl(repository)]: new HttpRequestError('status', 'Not Found', 404),
    });
    expect(await result).toEqual({ kind: 'no-bundle', origin, reason: 'unpublished' });
  });

  it('usa gli indirizzi sostitutivi delle prove', () => {
    const local = { ...repository, webBase: 'http://127.0.0.1:9', apiBase: 'http://127.0.0.1:9/api' };
    expect(latestManifestUrl(local)).toBe(
      'http://127.0.0.1:9/acamemo/acasystem-releases/releases/latest/download/manifest.json'
    );
  });

  it("non usa un archivio che non torna con lo SHA-256 (P-2)", async () => {
    const latest = await makeRelease('0.9.30');
    const cached = await makeRelease('0.9.29');
    const routes = {
      [health]: { status: 'ok', version: '0.9.30' },
      [latestManifestUrl(repository)]: latest.manifest,
      [manifestUrl(repository, '0.9.30')]: latest.manifest,
      [archiveUrl(repository, latest.manifest)]: new TextEncoder().encode('manomesso'),
    };
    const withCache = run(routes, [cached.manifest]);
    expect(await withCache.result).toEqual({
      kind: 'launch',
      origin,
      version: '0.9.29',
      notices: [{ kind: 'download-failed', version: '0.9.30' }],
    });
    expect(withCache.cache.versions()).toEqual(['0.9.29']);
    expect(await run(routes).result).toEqual({ kind: 'no-bundle', origin, reason: 'download-failed' });
  });
});

describe('submitAddress (procedura guidata)', () => {
  it("salva l'indirizzo solo se risponde Acasystem", async () => {
    const { http } = createHttp({ [health]: { status: 'ok', version: '0.9.28' } });
    const store = createConfigStore();
    expect(await submitAddress({ host: 'http://192.168.1.7:8123/' }, { http, config: store.store })).toEqual({
      ok: true,
      config,
      serverVersion: '0.9.28',
    });
    expect(store.current()).toEqual(config);
  });

  it('non salva con errori di formato o di rete', async () => {
    const { http } = createHttp({ 'http://192.168.1.8:3002/api/health': '<html>' });
    const store = createConfigStore();
    const deps = { http, config: store.store };
    expect(await submitAddress({ host: '8.8.8.8' }, deps)).toEqual({ ok: false, error: 'not-local' });
    expect(await submitAddress({ host: '192.168.1.7', port: '0' }, deps)).toEqual({
      ok: false,
      error: 'invalid-port',
    });
    expect(await submitAddress({ host: '192.168.1.7' }, deps)).toEqual({ ok: false, error: 'unreachable' });
    expect(await submitAddress({ host: '192.168.1.8' }, deps)).toEqual({ ok: false, error: 'not-acasystem' });
    expect(store.current()).toBeNull();
  });
});
