// @vitest-environment node

import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sha256Hex } from '../../../core/src/index.ts';
import type { ReleaseManifest } from '../../../core/src/index.ts';
import { createFileBundleCache, createFileConfigStore, createLastServerStore } from '../fileStore.ts';
import { readZip, safeEntryPath, ZipError } from '../zip.ts';
import { writeZip } from '../../../scripts/zipWriter.ts';

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'aca-client-'));
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

const manifestFor = async (version: string, archive: Uint8Array): Promise<ReleaseManifest> => ({
  schema: 1,
  version,
  archive: { name: `acasystem-web-${version}.zip`, sha256: await sha256Hex(archive), size: archive.byteLength },
  minServer: '0.1.0',
  minShell: '0.1.0',
});

describe('readZip', () => {
  it('legge voci compresse e non, saltando le cartelle', () => {
    const zip = writeZip([
      { name: 'index.html', data: '<!doctype html>' },
      { name: 'assets/', data: '', method: 0 },
      { name: 'assets/app.js', data: 'console.log(1)', method: 0 },
      { name: 'casa3d/index.html', data: 'x'.repeat(5000) },
    ]);
    const entries = readZip(zip);
    expect(entries.map((entry) => entry.path)).toEqual(['index.html', 'assets/app.js', 'casa3d/index.html']);
    expect(Buffer.from(entries[2]!.data).toString()).toBe('x'.repeat(5000));
  });

  it.each(['../evil.js', '/etc/passwd', 'C:/Windows/x.dll', 'a\\..\\b', 'a/../../b', '..'])(
    'rifiuta il percorso %s',
    (name) => {
      expect(() => readZip(writeZip([{ name, data: 'x' }]))).toThrow(ZipError);
    }
  );

  it('normalizza i percorsi innocui', () => {
    expect(safeEntryPath('./assets//app.js')).toBe('assets/app.js');
  });

  it('rifiuta dimensioni dichiarate false, voci doppie e dati non zip', () => {
    expect(() => readZip(writeZip([{ name: 'a.js', data: 'abc', declaredSize: 99 }]))).toThrow(ZipError);
    expect(() =>
      readZip(writeZip([{ name: 'a.js', data: '1' }, { name: 'A.js', data: '2' }]))
    ).toThrow(/doppia/);
    expect(() => readZip(new TextEncoder().encode('non è uno zip, ma è abbastanza lungo'))).toThrow(ZipError);
  });

  it('rileva un byte alterato (CRC)', () => {
    const zip = writeZip([{ name: 'index.html', data: 'contenuto originale', method: 0 }]);
    const at = 30 + 'index.html'.length;
    zip[at] = (zip[at] ?? 0) ^ 1;
    expect(() => readZip(zip)).toThrow(/alterata/);
  });
});

describe('archivio su disco', () => {
  it('salva e rilegge la configurazione, scartando file alterati', async () => {
    const store = createFileConfigStore(dataDir);
    expect(await store.load()).toBeNull();
    await store.save({ host: '192.168.1.184', port: 3002 });
    expect(await store.load()).toEqual({ host: '192.168.1.184', port: 3002 });
    await writeFile(join(dataDir, 'config.json'), '{"host":"8.8.8.8","port":3002}');
    expect(await store.load()).toBeNull();
  });

  it('ricorda il mini PC dell’ultimo avvio e ignora un file rovinato', async () => {
    const store = createLastServerStore(dataDir);
    expect(await store.load()).toBeNull();
    await store.save('http://192.168.1.19:3002');
    expect(await store.load()).toBe('http://192.168.1.19:3002');
    await writeFile(join(dataDir, 'last-server.json'), 'non json');
    expect(await store.load()).toBeNull();
  });

  it('installa le versioni, le elenca e tiene solo le ultime tre', async () => {
    const cache = createFileBundleCache(dataDir);
    for (const version of ['0.9.27', '0.9.28', '0.9.29', '0.9.30']) {
      const zip = writeZip([{ name: 'index.html', data: version }]);
      await cache.install(await manifestFor(version, zip), zip);
    }
    const versions = (await cache.list()).map((manifest) => manifest.version).sort();
    expect(versions).toEqual(['0.9.28', '0.9.29', '0.9.30']);
    expect(await readFile(join(cache.directoryOf('0.9.30'), 'index.html'), 'utf8')).toBe('0.9.30');
    expect((await readdir(join(dataDir, 'bundles'))).some((name) => name.startsWith('.staging'))).toBe(false);
  });

  it('non installa un archivio senza index.html e ignora cartelle a metà', async () => {
    const cache = createFileBundleCache(dataDir);
    const zip = writeZip([{ name: 'other.html', data: 'x' }]);
    await expect(cache.install(await manifestFor('0.9.30', zip), zip)).rejects.toThrow(/index.html/);
    await writeFile(join(dataDir, 'bundles-note'), 'x');
    expect(await cache.list()).toEqual([]);
  });
});
