import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { captureSourceSnapshot } from './source-provenance.mjs';

const { values } = parseArgs({ options: { version: { type: 'string' }, tag: { type: 'string' } } });
if (!values.version || !/^\d+\.\d+\.\d+$/.test(values.version)) throw new Error('Uso: node progetto/ha-app/build-base.mjs --version x.y.z [--tag immagine-locale]');
const root = fileURLToPath(new URL('../../', import.meta.url));
const snapshot = await captureSourceSnapshot(root);
const context = await mkdtemp(join(tmpdir(), 'aca-source-build-'));
try {
  for (const file of snapshot.files) {
    const target = resolve(context, file.name);
    if (!target.startsWith(resolve(context) + sep)) throw new Error('File fuori dal contesto di build');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.data);
  }
  execFileSync('docker', ['build', '--build-arg', `ACASYSTEM_VERSION=${values.version}`, '--build-arg', `ACA_SOURCE_SHA256=${snapshot.sha256}`, '-t', values.tag ?? `aca-system:${values.version}`, context], { stdio: 'inherit' });
  console.log(`Sorgenti congelati: ${snapshot.sha256}, ${snapshot.files.length} file. Nessuna pubblicazione.`);
} finally {
  if (!resolve(context).startsWith(resolve(tmpdir()) + sep) || !context.includes('aca-source-build-')) throw new Error('Contesto temporaneo inatteso');
  await rm(context, { recursive: true, force: true });
}
