import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { bootstrapMaterials } from '../bootstrap/materials.mjs';
import { writeZip } from '../../client/scripts/zipWriter.ts';
import { readZip } from '../../client/shared/packaging/zipReader.ts';
import { captureSourceSnapshot } from '../source-provenance.mjs';
import { executorCandidate } from './executor-materials.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const here = fileURLToPath(new URL('./', import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const setupFiles = ['New-AcaPilotVm.ps1', 'Invoke-AcaBootstrap.ps1', 'Test-AcaPilotHost.ps1',
  'native-process.ps1', 'Start-AcaPilotSetup.ps1', 'haos-image.json', 'README.md',
  'Start-AcaVirtualBoxSetup.ps1', 'haos-virtualbox-image.json', 'VIRTUALBOX.md', 'UPDATES.md', 'COLLAUDO.md',
  'Test-AcaVirtualBoxStability.ps1', 'VM-STABILITY.md'];

export function verifyPilotArchive(bytes) {
  const entries = readZip(bytes);
  const files = new Map(entries.map(({ path, data }) => [path, Buffer.from(data)]));
  const proof = JSON.parse(files.get('MATERIAL-PROVENANCE.json')?.toString('utf8') ?? 'null');
  if (proof?.schema !== 1 || !Array.isArray(proof.files) || proof.files.length !== entries.length - 2 ||
    new Set(proof.files.map(file => file.name)).size !== proof.files.length) throw new Error('Provenienza kit incompleta');
  for (const required of ['Start.cmd', 'LICENSE', ...setupFiles.map(name => `pilot/${name}`),
    'bootstrap/installation.json', 'bootstrap/bootstrap-haos.sh', 'bootstrap/install-sonoff.py',
    'bootstrap/SonoffLAN-v3.13.3.zip', 'bootstrap/BOOTSTRAP.md', 'bootstrap/BOOTSTRAP-SHA256SUMS']) {
    if (!files.has(required)) throw new Error('Materiale richiesto assente nel kit');
  }
  for (const file of proof.files) {
    const data = files.get(file.name);
    if (!data || data.length !== file.size || sha256(data) !== file.sha256) throw new Error('Materiale kit diverso dalla provenienza');
  }
  const expected = entries.filter(({ path }) => path !== 'SHA256SUMS').map(({ path, data }) => `${sha256(data)}  ${path}\n`).join('');
  if (files.get('SHA256SUMS')?.toString('utf8') !== expected) throw new Error('Checksum kit non corrispondenti');
  if (proof.client && (!files.has(proof.client.name) || sha256(files.get(proof.client.name)) !== proof.client.sha256)) throw new Error('Client kit non corrispondente');
  return { entries, proof };
}

/** Un solo kit reviewabile. Il client è un artefatto esplicito, mai recuperato dal banco. */
export async function preparePilot({ output, windowsClient, materialsOnly = false, ...options }) {
  if (!output) throw new Error('Specificare --output, directory nuova');
  if (!windowsClient && !materialsOnly) throw new Error('Specificare --windows-client (.exe o .zip); --materials-only produce soltanto materiali di revisione');
  const bootstrap = await bootstrapMaterials(options);
  const files = new Map([...bootstrap].map(([name, bytes]) => [`bootstrap/${name}`, bytes]));
  const executor = await executorCandidate(options.appVersion ?? options.version);
  files.set(executor.name, executor.archive);
  for (const name of setupFiles) files.set(`pilot/${name}`, await readFile(join(here, name)));
  files.set('Start.cmd', await readFile(join(here, 'Start.cmd')));
  files.set('LICENSE', await readFile(new URL('../../acasystem/LICENSE', import.meta.url)));
  let client = null;
  if (windowsClient) {
    const name = basename(windowsClient);
    const bytes = await readFile(windowsClient);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.(exe|zip)$/i.test(name) || bytes.length < 4 ||
      (name.toLowerCase().endsWith('.exe') ? bytes.toString('ascii', 0, 2) !== 'MZ' : bytes.readUInt32LE(0) !== 0x04034b50)) {
      throw new Error('Client Windows mancante o formato .exe/.zip non riconosciuto');
    }
    files.set(`client/${name}`, bytes);
    client = { name: `client/${name}`, size: bytes.length, sha256: sha256(bytes), validation: 'provided-artifact-not-runtime-tested' };
  }
  const sourceCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
  const runtimeSource = await captureSourceSnapshot(root);
  const checksums = () => [...files].map(([name, bytes]) => ({ name, size: bytes.length, sha256: sha256(bytes) }));
  files.set('MATERIAL-PROVENANCE.json', Buffer.from(JSON.stringify({ schema: 1,
    purpose: materialsOnly ? 'materials-only-not-deliverable' : 'single-candidate-kit-not-target-tested',
    version: options.version, appVersion: options.appVersion ?? options.version,
    sourceRepository: 'https://github.com/acamemo/acasystem', sourceCommit, sourceWorktree: dirty ? 'dirty' : 'clean',
    runtimeSourceSha256: runtimeSource.sha256,
    client, files: checksums(),
  }, null, 2) + '\n'));
  files.set('SHA256SUMS', Buffer.from(checksums().map(({ name, sha256 }) => `${sha256}  ${name}`).join('\n') + '\n'));
  const archive = writeZip([...files].map(([name, data]) => ({ name, data })));
  verifyPilotArchive(archive);
  const name = `acasystem-pilot-candidate-${options.appVersion ?? options.version}.zip`;
  const directory = resolve(output);
  await mkdir(directory); // Non sovrascrivere una preparazione precedente.
  await writeFile(join(directory, name), archive, { flag: 'wx' });
  await writeFile(join(directory, 'SHA256SUMS'), `${sha256(archive)}  ${name}\n`, { flag: 'wx' });
  return { name, size: archive.length, sha256: sha256(archive), files: files.size,
    validation: materialsOnly ? 'materials-only' : 'candidate-kit-not-target-tested' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: {
    ...Object.fromEntries(['version', 'app-version', 'haos-version', 'core-version', 'sonoff-archive', 'output', 'windows-client'].map((name) => [name, { type: 'string' }])),
    'materials-only': { type: 'boolean', default: false },
  } });
  console.log(JSON.stringify(await preparePilot({ version: values.version, appVersion: values['app-version'],
    haosVersion: values['haos-version'], coreVersion: values['core-version'], sonoffArchive: values['sonoff-archive'],
    windowsClient: values['windows-client'], materialsOnly: values['materials-only'], output: values.output })));
}
