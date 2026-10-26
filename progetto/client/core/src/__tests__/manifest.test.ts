import { describe, expect, it } from 'vitest';
import { sha256Hex, verifyArchive } from '../integrity.ts';
import { MAX_ARCHIVE_BYTES, parseManifest } from '../manifest.ts';
import { makeRelease } from './fakes.ts';

describe('parseManifest', () => {
  it('accetta un manifesto completo', async () => {
    const { manifest } = await makeRelease('0.9.30', { minServer: '0.9.28', minShell: '0.1.0' });
    expect(parseManifest(JSON.parse(JSON.stringify(manifest)))).toEqual(manifest);
  });

  it.each([
    ['schema diverso', { schema: 2 }],
    ['versione non valida', { version: 'latest' }],
    ['minServer mancante', { minServer: undefined }],
    ['nome con percorso', { archive: { name: '../evil.zip' } }],
    ['nome non zip', { archive: { name: 'web.exe' } }],
    ['hash corto', { archive: { sha256: 'abc' } }],
    ['hash maiuscolo', { archive: { sha256: 'A'.repeat(64) } }],
    ['dimensione enorme', { archive: { size: MAX_ARCHIVE_BYTES + 1 } }],
    ['dimensione zero', { archive: { size: 0 } }],
  ])('rifiuta: %s', async (_label, patch) => {
    const { manifest } = await makeRelease('0.9.30');
    const { archive: archivePatch, ...rest } = patch as Record<string, unknown> & {
      archive?: Record<string, unknown>;
    };
    const candidate = { ...manifest, ...rest, archive: { ...manifest.archive, ...archivePatch } };
    expect(parseManifest(candidate)).toBeNull();
  });
});

describe('integrità (P-2)', () => {
  it('calcola lo SHA-256 noto', async () => {
    expect(await sha256Hex(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('rifiuta un archivio alterato o troncato', async () => {
    const { manifest, archive } = await makeRelease('0.9.30');
    expect(await verifyArchive(manifest, archive)).toBe(true);
    const altered = archive.slice();
    altered[0] = (altered[0] ?? 0) ^ 1;
    expect(await verifyArchive(manifest, altered)).toBe(false);
    expect(await verifyArchive(manifest, archive.slice(1))).toBe(false);
  });
});
