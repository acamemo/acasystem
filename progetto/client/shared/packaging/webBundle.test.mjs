import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { createClientBundle, prepareClientBundle } from './webBundle.mjs';
import { readZip } from './zipReader.ts';
import { writeZip } from './zipWriter.ts';
import { prepareClientBundle as haBundle } from '../../../ha-app/client-bundle.mjs';
import { readZip as windowsReadZip } from '../../windows/src/zip.ts';
import { writeZip as previousWriteZip } from '../../scripts/zipWriter.ts';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'aca-web-bundle-'));
  t.after(async () => {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep) && root.includes('aca-web-bundle-'));
    await rm(root, { recursive: true, force: true });
  });
  const frontend = join(root, 'frontend'), casa3d = join(root, 'casa3d');
  await mkdir(frontend); await mkdir(casa3d);
  await writeFile(join(frontend, 'index.html'), '<html>ACA</html>');
  await writeFile(join(casa3d, 'index.html'), '<html>Casa</html>');
  return { frontend, casa3d, output: join(root, 'out'), version: '0.9.33' };
}

test('le facciate storiche usano lo stesso packaging e gli stessi controlli ZIP', () => {
  assert.equal(haBundle, prepareClientBundle);
  assert.equal(windowsReadZip, readZip);
  assert.equal(previousWriteZip, writeZip);
});

test('release e HAOS mantengono schema, nome, hash e pin del contratto client', async (t) => {
  const options = await fixture(t);
  const explicit = { ...options, minServer: '0.9.30', minShell: '0.2.0' };
  const { manifest, archive, entryCount } = await createClientBundle(explicit);
  assert.equal(entryCount, 2);
  assert.deepEqual(readZip(archive).map(entry => entry.path), ['index.html', 'casa3d/index.html']);
  assert.deepEqual(manifest, {
    schema: 1, version: '0.9.33',
    archive: { name: 'acasystem-web-0.9.33.zip', size: archive.length, sha256: createHash('sha256').update(archive).digest('hex') },
    minServer: '0.9.30', minShell: '0.2.0',
  });
  assert.deepEqual(await prepareClientBundle(explicit), manifest);
  assert.deepEqual(await readFile(join(options.output, manifest.archive.name)), Buffer.from(archive));
  assert.deepEqual(JSON.parse(await readFile(join(options.output, 'manifest.json'), 'utf8')), manifest);
  const defaults = await createClientBundle(options);
  assert.equal(defaults.manifest.minServer, options.version);
  assert.equal(defaults.manifest.minShell, '0.1.0');
  assert.deepEqual(defaults.archive, archive);
});

test('il packaging comune rifiuta collisioni di percorso anche tra maiuscole e minuscole', async (t) => {
  const options = await fixture(t);
  await mkdir(join(options.frontend, 'Casa3D'));
  await writeFile(join(options.frontend, 'Casa3D', 'index.html'), 'copia ambigua');
  await assert.rejects(createClientBundle(options), /Voce doppia/);
});

test('pin non validi e indice mancante non producono un bundle distribuibile', async (t) => {
  const options = await fixture(t);
  await assert.rejects(createClientBundle({ ...options, minShell: '../non-valida' }), /Manifest/);
  await rm(join(options.frontend, 'index.html'));
  await assert.rejects(createClientBundle(options), /frontend mancante/);
});
