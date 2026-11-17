import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { prepareClientBundle } from './client-bundle.mjs';
import { readZip } from '../client/shared/packaging/zipReader.ts';

test('bundle pre-owner: stesso contratto e lettore ZIP dei client, UI e Casa 3D incluse', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aca-mini-pc-bundle-'));
  try {
    const frontend = join(root, 'frontend'), casa3d = join(root, 'casa3d'), output = join(root, 'bundle');
    await mkdir(frontend); await mkdir(casa3d);
    await writeFile(join(frontend, 'index.html'), '<html>ACA prima configurazione</html>');
    await writeFile(join(casa3d, 'index.html'), '<html>Casa</html>');
    const manifest = await prepareClientBundle({ frontend, casa3d, output, version: '0.9.33' });
    const bytes = await readFile(join(output, manifest.archive.name));
    assert.equal(manifest.minServer, '0.9.33');
    assert.equal(manifest.archive.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.deepEqual(readZip(bytes).map((entry) => entry.path).sort(), ['casa3d/index.html', 'index.html']);
    assert.deepEqual(JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8')), manifest);
    await assert.rejects(prepareClientBundle({ frontend, casa3d, output, version: '../altro' }), /Versione/);
    await mkdir(join(frontend, 'casa3d')); await writeFile(join(frontend, 'casa3d', 'duplicato.js'), 'duplicate');
    await assert.rejects(prepareClientBundle({ frontend, casa3d, output, version: '0.9.33' }), /duplicata/);
  } finally {
    assert.ok(resolve(root).startsWith(join(resolve(tmpdir()), 'aca-mini-pc-bundle-')));
    await rm(root, { recursive: true, force: true });
  }
});
