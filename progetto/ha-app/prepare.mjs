import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { writeZip } from '../client/scripts/zipWriter.ts';

/**
 * Prepara una versione di Acasystem come app di HA OS (REP-20261026-005, S1-S2), senza pubblicare:
 *   node progetto/ha-app/prepare.mjs --version 0.9.30
 * 1. costruisce ghcr.io/acamemo/acasystem:<v> sopra aca-system:<v> (immagine del banco);
 * 2. prepara in out/<v>/repository/ i file da caricare in acamemo/acasystem-releases;
 * 3. crea out/<v>/acasystem-src-<v>.zip con i sorgenti di progetto/acasystem (GPL-3.0, Q-S1);
 * 4. scrive out/<v>/PUBBLICAZIONE.md con i passi per l'utente.
 */

const { values } = parseArgs({ options: { version: { type: 'string' } } });
const version = values.version;
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Uso: node progetto/ha-app/prepare.mjs --version <x.y.z>');
  process.exit(1);
}

const here = fileURLToPath(new URL('./', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = join(here, 'out', version);
const baseImage = `aca-system:${version}`;
const image = `ghcr.io/acamemo/acasystem:${version}`;
const run = (command, args, options = {}) =>
  String(execFileSync(command, args, { encoding: 'utf8', ...options }) ?? '').trim();

// 1. Immagine
run('docker', ['image', 'inspect', baseImage, '--format', '{{.Id}}']);
run('docker', [
  'build',
  // Un'immagine semplice amd64, senza indice di attestazioni: è ciò che scarica il Supervisor.
  '--provenance=false',
  '--platform', 'linux/amd64',
  '--build-arg', `BASE_IMAGE=${baseImage}`,
  '--build-arg', `ACASYSTEM_VERSION=${version}`,
  '--label', `org.opencontainers.image.created=${new Date().toISOString()}`,
  '-t', image,
  join(here, 'image'),
], { stdio: 'inherit' });
const imageId = run('docker', ['image', 'inspect', image, '--format', '{{.Id}}']);

// 2. File del repository delle app di HA OS
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(join(here, 'repository'), join(out, 'repository'), { recursive: true });
const configPath = join(out, 'repository', 'acasystem', 'config.yaml');
await writeFile(configPath, (await readFile(configPath, 'utf8')).replace('__VERSION__', version));
// Icone provvisorie (come le app client): 128x128 e logo 250x100.
const icon = join(root, 'progetto', 'client', 'windows', 'shell', 'icon.png');
run('magick', [icon, '-resize', '128x128', join(out, 'repository', 'acasystem', 'icon.png')]);
run('magick', [icon, '-resize', '100x100', '-background', 'none', '-gravity', 'center', '-extent', '250x100', join(out, 'repository', 'acasystem', 'logo.png')]);

// 3. Sorgenti (file tracciati e nuovi non ignorati di progetto/acasystem, come pubblicabili in C1)
const files = run('git', ['-C', root, 'ls-files', '-co', '--exclude-standard', '--', 'progetto/acasystem'])
  .split('\n')
  .filter(Boolean);
const entries = [];
for (const file of files) {
  entries.push({ name: `acasystem-src-${version}/${file.slice('progetto/acasystem/'.length)}`, data: await readFile(join(root, file)) });
}
const sources = writeZip(entries);
const sourcesName = `acasystem-src-${version}.zip`;
await writeFile(join(out, sourcesName), sources);
const sourcesSha = createHash('sha256').update(sources).digest('hex');

// 4. Istruzioni
await writeFile(
  join(out, 'PUBBLICAZIONE.md'),
  `# Pubblicazione di Acasystem ${version} come app di HA OS

Preparato il ${new Date().toISOString()} da progetto/ha-app/prepare.mjs (REP-20261026-005).

- Immagine: \`${image}\` (${imageId}), costruita sopra \`${baseImage}\`.
- Sorgenti: \`${sourcesName}\`, ${entries.length} file, SHA-256 \`${sourcesSha}\`.
- Repository delle app: cartella \`repository/\` (repository.yaml e acasystem/).

Ordine obbligatorio: prima l'immagine su GHCR, poi config.yaml con version ${version}.
`
);

console.log(`Pronto: ${out}`);
console.log(`Immagine ${image} (${imageId}); sorgenti ${entries.length} file, ${(sources.byteLength / 1024 / 1024).toFixed(1)} MB`);
