import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { writeZip } from '../client/scripts/zipWriter.ts';
import { prepareClientBundle } from './client-bundle.mjs';
import { captureSourceSnapshot, sourceSnapshot, verifyImageSource } from './source-provenance.mjs';
import { bootstrapMaterials } from './bootstrap/materials.mjs';
import { executorCandidate, executorRuntimePaths } from './pilot/executor-materials.mjs';

/**
 * Prepara una versione di Acasystem come app di HA OS (REP-20261026-005, S1-S2), senza pubblicare:
 *   node progetto/ha-app/prepare.mjs --version <x.y.z> [--revision n]
 *     --haos-version <x.y> --core-version <x.y.z> --sonoff-archive <zip-originale>
 * Con --revision cambia solo il pacchetto per HA OS (avvio, rilevamento di HA): versione dell'app
 * <v>.<r> per il Supervisor, mentre Acasystem dentro resta <v> (/api/health, app client X.Y.Z).
 * 1. costruisce ghcr.io/acamemo/acasystem:<versione dell'app> sopra aca-system:<v> (immagine del banco);
 * 2. prepara in out/<versione dell'app>/repository/ i file da caricare in acamemo/acasystem-releases;
 * 3. crea out/<versione dell'app>/acasystem-src-<versione dell'app>.zip con i sorgenti di
 *    progetto/acasystem e dello strato per HA OS (GPL-3.0, Q-S1);
 * 4. scrive out/<versione dell'app>/PUBBLICAZIONE.md con i passi per l'utente.
 */

const { values } = parseArgs({ options: { version: { type: 'string' }, revision: { type: 'string' }, 'base-image': { type: 'string' }, check: { type: 'boolean' }, 'haos-version': { type: 'string' }, 'core-version': { type: 'string' }, 'sonoff-archive': { type: 'string' } } });
const version = values.version;
const revision = values.revision;
if (!version || !/^\d+\.\d+\.\d+$/.test(version) || (revision !== undefined && !/^[1-9]\d{0,2}$/.test(revision))) {
  console.error('Uso: node progetto/ha-app/prepare.mjs --version <x.y.z> [--revision <n>] [--check oppure --haos-version <x.y> --core-version <x.y.z> --sonoff-archive <zip>]');
  process.exit(1);
}
const appVersion = revision ? `${version}.${revision}` : version;

const here = fileURLToPath(new URL('./', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = join(here, 'out', appVersion);
const baseImage = values['base-image'] ?? `aca-system:${version}`;
const image = `ghcr.io/acamemo/acasystem:${appVersion}`;
// Validare prima della build: niente materiali .34 copiati in una consegna successiva.
const bootstrap = values.check ? null : await bootstrapMaterials({ version, appVersion,
  haosVersion: values['haos-version'], coreVersion: values['core-version'], sonoffArchive: values['sonoff-archive'] });
const run = (command, args, options = {}) => {
  try { return String(execFileSync(command, args, { encoding: 'utf8', ...options }) ?? '').trim(); }
  catch (error) {
    // Ubuntu distribuisce anche ImageMagick 6, il cui eseguibile si chiama convert.
    if (command === 'magick' && error.code === 'ENOENT') return String(execFileSync('convert', args, { encoding: 'utf8', ...options }) ?? '').trim();
    throw error;
  }
};

// 1. Immagine
const snapshot = await captureSourceSnapshot(root);
const baseInfo = JSON.parse(run('docker', ['image', 'inspect', baseImage]))[0];
verifyImageSource(baseInfo.Config.Labels, snapshot, version);
if (values.check) {
  console.log(JSON.stringify({ baseImage, imageId: baseInfo.Id, sourceSha256: snapshot.sha256, files: snapshot.files.length, verified: true }));
  process.exit(0);
}
const listFiles = (path) => [...new Set(run('git', ['-C', root, 'ls-files', '-co', '--exclude-standard', '-z', '--', path]).split('\0').filter(Boolean))];
const toolPaths = [...new Set([
  ...listFiles('progetto/ha-app/image'), ...listFiles('progetto/ha-app/bootstrap'), ...listFiles('progetto/ha-app/pilot'), ...listFiles('progetto/ha-app/repository'), ...listFiles('progetto/ha-app/executor-candidate'),
  ...listFiles('progetto/client/shared/packaging').filter((path) => !path.endsWith('.test.mjs')), 'progetto/client/shared/shell/icon.png',
  'progetto/ha-app/prepare.mjs', 'progetto/ha-app/client-bundle.mjs',
  'progetto/ha-app/source-provenance.mjs', 'progetto/ha-app/build-base.mjs',
  'progetto/client/scripts/zipWriter.ts', 'progetto/client/core/src/manifest.ts', 'progetto/client/core/src/version.ts',
])];
const tools = new Map(await Promise.all(toolPaths.map(async (path) => [path, await readFile(join(root, path))])));
const executor = await executorCandidate(appVersion, tools);
const frontendRequire = createRequire(join(root, 'progetto', 'acasystem', 'frontend', 'package.json'));
const qrBytes = await readFile(frontendRequire.resolve('qrcode-generator'));
const qrLicense = snapshot.files.find((file) => file.name === 'frontend/public/licenses/qrcode-generator.txt')?.data;
if (!qrLicense) throw new Error('Licenza QR mancante nello snapshot');
const proof = {
  schema: 1, version, imageId: baseInfo.Id, sourceSha256: snapshot.sha256,
  sourceRepository: 'https://github.com/acamemo/acasystem',
  sourceCommit: run('git', ['-C', root, 'rev-parse', 'HEAD']),
  sourceWorktree: run('git', ['-C', root, 'status', '--porcelain']).length ? 'dirty' : 'clean',
  files: snapshot.files.map((file) => ({ name: file.name, sha256: createHash('sha256').update(file.data).digest('hex') })),
  buildToolsSha256: sourceSnapshot([...tools].map(([name, data]) => ({ name, data }))).sha256,
  generatedImageTools: { qrcodeSha256: createHash('sha256').update(qrBytes).digest('hex'), licenseSha256: createHash('sha256').update(qrLicense).digest('hex'), executorSourceSha256: executor.imageRuntimeSha256 },
};
const stagingRoot = join(here, 'out');
await mkdir(stagingRoot, { recursive: true });
const context = await mkdtemp(join(stagingRoot, '.image-context-'));
let clientManifest;
let clientArchive;
try {
for (const file of ['Dockerfile', 'run.sh', 'detect-ha-url.mjs', 'show-connection.mjs', 'update-environment.mjs']) await writeFile(join(context, file), tools.get(`progetto/ha-app/image/${file}`));
await writeFile(join(context, 'prepare-haos-executor.sh'), tools.get('progetto/ha-app/executor-candidate/prepare-haos-executor.sh'));
// Mantiene i percorsi relativi del codice condiviso, senza nuove dipendenze.
for (const path of executorRuntimePaths) {
  const target = join(context, 'executor-tools', path);
  await mkdir(dirname(target), { recursive: true }); await writeFile(target, tools.get(path));
}
// Stesso encoder QR già bloccato nel lockfile frontend, senza nuove dipendenze runtime.
await writeFile(join(context, 'qrcode.cjs'), qrBytes);
await writeFile(join(context, 'qrcode-LICENSE.txt'), qrLicense);
const container = run('docker', ['create', baseInfo.Id]);
try {
  run('docker', ['cp', `${container}:/app/frontend/dist`, join(context, 'frontend')]);
  run('docker', ['cp', `${container}:/app/casa3d/dist`, join(context, 'casa3d')]);
} finally { run('docker', ['rm', container]); }
clientManifest = await prepareClientBundle({ frontend: join(context, 'frontend'), casa3d: join(context, 'casa3d'), output: join(context, 'client-bundle'), version });
clientArchive = await readFile(join(context, 'client-bundle', clientManifest.archive.name));
run('docker', [
  'build',
  // Un'immagine semplice amd64, senza indice di attestazioni: è ciò che scarica il Supervisor.
  '--provenance=false',
  '--platform', 'linux/amd64',
  '--build-arg', `BASE_IMAGE=${baseImage}`,
  '--build-arg', `ACASYSTEM_VERSION=${version}`,
  '--build-arg', `APP_VERSION=${appVersion}`,
  '--build-arg', `ACA_EXECUTOR_SHA256=${executor.imageRuntimeSha256}`,
  '--label', `org.opencontainers.image.created=${new Date().toISOString()}`,
  '-t', image,
  context,
], { stdio: 'inherit' });
} finally {
  if (!resolve(context).startsWith(resolve(stagingRoot) + sep)) throw new Error('Contesto di build fuori dalla cartella prevista');
  await rm(context, { recursive: true, force: true });
}
const imageId = run('docker', ['image', 'inspect', image, '--format', '{{.Id}}']);
if (run('docker', ['image', 'inspect', baseImage, '--format', '{{.Id}}']) !== baseInfo.Id) throw new Error('Immagine di base cambiata durante la preparazione');

// 2. File del repository delle app di HA OS
if (!resolve(out).startsWith(resolve(stagingRoot) + sep)) throw new Error('Output fuori dalla cartella delle versioni generate');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const [path, data] of tools) {
  if (!path.startsWith('progetto/ha-app/repository/')) continue;
  const target = join(out, 'repository', path.slice('progetto/ha-app/repository/'.length));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, data);
}
await writeFile(join(out, 'manifest.json'), `${JSON.stringify(clientManifest, null, 2)}\n`);
await writeFile(join(out, clientManifest.archive.name), clientArchive);
for (const [name, bytes] of bootstrap) await writeFile(join(out, name), bytes);
await writeFile(join(out, executor.name), executor.archive);
const configPath = join(out, 'repository', 'acasystem', 'config.yaml');
await writeFile(configPath, (await readFile(configPath, 'utf8')).replace('__VERSION__', appVersion));
// Icone provvisorie (come le app client): 128x128 e logo 250x100.
const icon = join(out, '.icon-source.png');
await writeFile(icon, tools.get('progetto/client/shared/shell/icon.png'));
try {
run('magick', [icon, '-resize', '128x128', join(out, 'repository', 'acasystem', 'icon.png')]);
run('magick', [icon, '-resize', '100x100', '-background', 'none', '-gravity', 'center', '-extent', '250x100', join(out, 'repository', 'acasystem', 'logo.png')]);
} finally { await rm(icon, { force: true }); }

// 3. Sorgenti (file tracciati e nuovi non ignorati di progetto/acasystem, come pubblicabili in C1,
// più lo strato per HA OS in ha-app-image/)
const entries = [];
for (const file of snapshot.files) {
  entries.push({ name: `acasystem-src-${appVersion}/${file.name}`, data: file.data });
}
for (const [file, data] of tools) {
  const name = file.startsWith('progetto/ha-app/image/')
    ? `ha-app-image/${file.slice('progetto/ha-app/image/'.length)}` : `build-tools/${file}`;
  entries.push({ name: `acasystem-src-${appVersion}/${name}`, data });
}
const proofBytes = Buffer.from(`${JSON.stringify(proof, null, 2)}\n`);
entries.push({ name: `acasystem-src-${appVersion}/ha-app-image/qrcode.cjs`, data: qrBytes });
entries.push({ name: `acasystem-src-${appVersion}/ha-app-image/qrcode-LICENSE.txt`, data: qrLicense });
entries.push({ name: `acasystem-src-${appVersion}/SOURCE-PROVENANCE.json`, data: proofBytes });
await writeFile(join(out, 'SOURCE-PROVENANCE.json'), proofBytes);
const sources = writeZip(entries);
const sourcesName = `acasystem-src-${appVersion}.zip`;
await writeFile(join(out, sourcesName), sources);
const sourcesSha = createHash('sha256').update(sources).digest('hex');

// 4. Istruzioni
await writeFile(
  join(out, 'PUBBLICAZIONE.md'),
  `# Pubblicazione di Acasystem ${appVersion} come app di HA OS

Preparato il ${new Date().toISOString()} da progetto/ha-app/prepare.mjs (REP-20261026-005).

- Immagine: \`${image}\` (${imageId}), costruita sopra \`${baseImage}\`; Acasystem ${version}.
- Sorgenti: \`${sourcesName}\`, ${entries.length} file, SHA-256 \`${sourcesSha}\`.
- Provenienza: \`SOURCE-PROVENANCE.json\`, snapshot ACA \`${snapshot.sha256}\` verificato contro l'etichetta dell'immagine.
- Repository delle app: cartella \`repository/\` (repository.yaml e acasystem/).
- Client web: \`manifest.json\` e \`${clientManifest.archive.name}\`, stessi byte inclusi nell'immagine.
- Bootstrap: \`bootstrap-haos.sh\`, \`BOOTSTRAP.md\` e checksum in \`SHA256SUMS\`.

Ordine obbligatorio: prima l'immagine su GHCR, poi config.yaml con version ${appVersion}.
Questi materiali sono locali: nessuna pubblicazione o installazione sul mini PC è stata eseguita da questo script.
`
);

const checksums = [];
for (const file of [sourcesName, clientManifest.archive.name, 'manifest.json', ...bootstrap.keys(), executor.name, 'PUBBLICAZIONE.md', 'SOURCE-PROVENANCE.json']) {
  checksums.push(`${createHash('sha256').update(await readFile(join(out, file))).digest('hex')}  ${file}`);
}
await writeFile(join(out, 'SHA256SUMS'), `${checksums.join('\n')}\n`);

console.log(`Pronto: ${out}`);
console.log(`Immagine ${image} (${imageId}); sorgenti ${entries.length} file, ${(sources.byteLength / 1024 / 1024).toFixed(1)} MB`);
