import { describe, expect, it, vi } from 'vitest';
import {
  CASA3D_ELEMENTS,
  fetchAndImportCasa3d,
  parseManifest,
  resolveCasa3dBase,
} from '@/casa3d/loader';

/**
 * Loader of the Casa 3D bundle (ADR-0014, T3): the folder is next to the app, the manifest names
 * the entry, and the entry must be a file of that folder.
 */

const manifest = {
  name: 'casa3d',
  version: '0.1.0',
  entry: 'casa3d-a3260ecede3a.js',
  bundles: { main: { file: 'casa3d-a3260ecede3a.js', bytes: 1, sha256: 'x' } },
};

const okResponse = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

describe('Casa 3D loader: address', () => {
  it('the folder is next to the app, in a sub-path too, without query or hash', () => {
    expect(resolveCasa3dBase('https://aca.test/#/casa3d-prova')).toBe('https://aca.test/casa3d/');
    expect(resolveCasa3dBase('https://aca.test/acasystem/?x=1#/sistema')).toBe(
      'https://aca.test/acasystem/casa3d/'
    );
    expect(resolveCasa3dBase('http://localhost:3002/index.html')).toBe(
      'http://localhost:3002/casa3d/'
    );
  });
});

describe('Casa 3D loader: manifest', () => {
  it('accepts what the build writes', () => {
    expect(parseManifest(manifest)).toMatchObject({
      entry: 'casa3d-a3260ecede3a.js',
      version: '0.1.0',
    });
  });

  it('refuses an entry that is not a file of the folder', () => {
    for (const entry of [
      '../evil.js',
      '/evil.js',
      'https://evil.example/casa3d-a1.js',
      '//evil.example/casa3d-a1.js',
      'sub/casa3d-a1.js',
      'casa3d-a1.js?x=1',
      'casa3d-.js',
      'evil.js',
      'casa3d-a1.mjs',
      '',
      7,
      null,
    ]) {
      expect(() => parseManifest({ ...manifest, entry })).toThrow(/avvio non valido/);
    }
  });

  it('refuses a manifest that is not an object or has no bundles', () => {
    for (const raw of [null, 'x', 3, [], undefined]) {
      expect(() => parseManifest(raw)).toThrow(/non è valido/);
    }
    expect(() => parseManifest({ entry: manifest.entry })).toThrow(/non elenca/);
  });
});

describe('Casa 3D loader: load', () => {
  const deps = (over: Partial<Parameters<typeof fetchAndImportCasa3d>[0]> = {}) => ({
    documentUrl: 'https://aca.test/#/casa3d-prova',
    fetchImpl: vi.fn(() => okResponse(manifest)) as unknown as typeof fetch,
    importImpl: vi.fn(() => Promise.resolve({})),
    whenDefined: vi.fn(() => Promise.resolve()),
    ...over,
  });

  it('reads the manifest without cache, imports the entry and waits for the elements', async () => {
    const d = deps();
    const loaded = await fetchAndImportCasa3d(d);

    expect(d.fetchImpl).toHaveBeenCalledWith('https://aca.test/casa3d/manifest.json', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    expect(d.importImpl).toHaveBeenCalledWith('https://aca.test/casa3d/casa3d-a3260ecede3a.js');
    expect(d.whenDefined).toHaveBeenCalledTimes(CASA3D_ELEMENTS.length);
    expect(CASA3D_ELEMENTS).toEqual(['fp3d-view3d', 'fp3d-room-panel']);
    expect(loaded.manifest.entry).toBe('casa3d-a3260ecede3a.js');
    expect(loaded.base).toBe('https://aca.test/casa3d/');
  });

  it('a server without the bundle gives a clear error and imports nothing', async () => {
    const d = deps({
      fetchImpl: vi.fn(() =>
        Promise.resolve({ ok: false, status: 404 } as Response)
      ) as unknown as typeof fetch,
    });
    await expect(fetchAndImportCasa3d(d)).rejects.toThrow(/non è disponibile.*404/);
    expect(d.importImpl).not.toHaveBeenCalled();
  });

  it('a manifest with a foreign entry imports nothing', async () => {
    const d = deps({
      fetchImpl: vi.fn(() =>
        okResponse({ ...manifest, entry: 'https://evil.example/casa3d-a1.js' })
      ) as unknown as typeof fetch,
    });
    await expect(fetchAndImportCasa3d(d)).rejects.toThrow(/avvio non valido/);
    expect(d.importImpl).not.toHaveBeenCalled();
  });

  it('gives up when the import or the registration takes too long', async () => {
    const never = () => new Promise<never>(() => undefined);
    await expect(fetchAndImportCasa3d(deps({ importImpl: never, timeoutMs: 20 }))).rejects.toThrow(
      /scaduto/
    );
    await expect(fetchAndImportCasa3d(deps({ whenDefined: never, timeoutMs: 20 }))).rejects.toThrow(
      /non sono stati registrati/
    );
  });

  it('a failed import is reported as an error', async () => {
    const d = deps({
      importImpl: vi.fn(() => Promise.reject(new Error('Failed to fetch module'))),
    });
    await expect(fetchAndImportCasa3d(d)).rejects.toThrow('Failed to fetch module');
  });
});
