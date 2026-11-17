import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { captureSourceSnapshot, SOURCE_LABEL, sourceSnapshot, verifyImageSource } from './source-provenance.mjs';

test('provenienza lega contenuto e nomi, preservando ordine indipendente e byte congelati', () => {
  const files = [{ name: 'a.ts', data: Buffer.from('prima') }, { name: 'b.ts', data: Buffer.from('seconda') }];
  const before = sourceSnapshot(files);
  assert.equal(before.sha256, sourceSnapshot([...files].reverse()).sha256);
  const labels = { [SOURCE_LABEL]: before.sha256, 'org.opencontainers.image.version': '0.9.33' };
  verifyImageSource(labels, before, '0.9.33');
  assert.throws(() => verifyImageSource({}, before, '0.9.33'), /senza provenienza/);
  assert.throws(() => verifyImageSource(labels, before, '0.9.34'), /Versione/);
  for (const changed of [
    [{ ...files[0], data: Buffer.from('dopo') }, files[1]],
    [{ ...files[0], name: 'rinominato.ts' }, files[1]],
    [files[0]],
    [...files, { name: 'nuovo.ts', data: Buffer.from('nuovo') }],
  ]) assert.throws(() => verifyImageSource(labels, sourceSnapshot(changed), '0.9.33'), /non corrispondono/);
  files[0].data.fill(0);
  assert.equal(before.files[0].data.toString(), 'prima');
  assert.throws(() => sourceSnapshot([...files, files[0]]), /duplicato/);
  assert.throws(() => sourceSnapshot([{ name: '../fuori', data: Buffer.from('x') }]), /Percorso/);
});

test('lo snapshot pubblicabile esclude note QA locali preservando sorgenti, licenze e originali', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aca-provenance-test-'));
  try {
    execFileSync('git', ['init', root], { stdio: 'ignore' });
    const files = {
      'Dockerfile': 'FROM example', 'package-lock.json': '{}', 'frontend/src/main.ts': 'export {};',
      'upstream-tunet/LICENSE': 'license fixture', 'frontend/.impeccable/critique/local.md': 'local QA fixture',
      'upstream-tunet/design-qa.md': 'local upstream QA fixture',
    };
    for (const [name, data] of Object.entries(files)) {
      const path = join(root, 'progetto/acasystem', name);
      await mkdir(dirname(path), { recursive: true }); await writeFile(path, data);
    }
    const snapshot = await captureSourceSnapshot(root);
    assert.deepEqual(snapshot.files.map(file => file.name), ['Dockerfile', 'frontend/src/main.ts', 'package-lock.json', 'upstream-tunet/LICENSE']);
    for (const [name, data] of Object.entries(files)) assert.equal(await readFile(join(root, 'progetto/acasystem', name), 'utf8'), data);
  } finally {
    if (!resolve(root).startsWith(resolve(tmpdir()) + sep) || !basename(root).startsWith('aca-provenance-test-')) throw new Error('Directory temporanea inattesa');
    await rm(root, { recursive: true, force: true });
  }
});
