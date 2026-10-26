import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { MAX_ARCHIVE_BYTES, parseManifest } from '../core/src/index.ts';
import type { ReleaseManifest } from '../core/src/index.ts';
import { readZip } from '../windows/src/zip.ts';
import { writeZip } from './zipWriter.ts';

/**
 * Prepara una Release dell'interfaccia (ADR-0023, C3): `acasystem-web-<versione>.zip` (frontend
 * alla radice, Casa 3D sotto casa3d/) e `manifest.json`, in release-out/v<versione>/ (fuori da Git).
 * Non pubblica nulla: la Release la crea una persona su GitHub, tag `v<versione>`.
 *
 *   node scripts/make-release.ts --image aca-system:0.9.30 --version 0.9.30
 *
 * Con --image legge frontend/dist e casa3d/dist dall'immagine Docker del server, così
 * l'interfaccia è identica a quella servita da quel server.
 */

const { values } = parseArgs({
  options: {
    image: { type: 'string' },
    version: { type: 'string' },
    'min-server': { type: 'string' },
    'min-shell': { type: 'string', default: '0.1.0' },
  },
});
const version = values.version;
const image = values.image;
if (!version || !/^\d+\.\d+\.\d+$/.test(version) || !image) {
  console.error('Uso: node scripts/make-release.ts --image aca-system:<versione> --version <versione> [--min-server x.y.z] [--min-shell x.y.z]');
  process.exit(1);
}
const tag = image.split(':')[1];
if (tag && /^\d+\.\d+\.\d+$/.test(tag) && tag !== version) {
  console.error(`L'immagine ${image} non corrisponde alla versione ${version}.`);
  process.exit(1);
}

const listFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();
};

const work = await mkdtemp(join(tmpdir(), 'aca-release-'));
try {
  // Copia dall'immagine senza avviarla: contenitore creato, letto e rimosso.
  const container = execFileSync('docker', ['create', image], { encoding: 'utf8' }).trim();
  try {
    execFileSync('docker', ['cp', `${container}:/app/frontend/dist`, join(work, 'frontend')]);
    execFileSync('docker', ['cp', `${container}:/app/casa3d/dist`, join(work, 'casa3d')]);
  } finally {
    execFileSync('docker', ['rm', container]);
  }

  const entries: { name: string; data: Uint8Array }[] = [];
  for (const path of await listFiles(join(work, 'frontend'))) {
    if (path.startsWith('casa3d/')) throw new Error(`Il frontend contiene già ${path}`);
    entries.push({ name: path, data: await readFile(join(work, 'frontend', path)) });
  }
  for (const path of await listFiles(join(work, 'casa3d'))) {
    entries.push({ name: `casa3d/${path}`, data: await readFile(join(work, 'casa3d', path)) });
  }
  if (!entries.some((entry) => entry.name === 'index.html')) throw new Error('index.html mancante');

  const archive = writeZip(entries);
  if (archive.byteLength > MAX_ARCHIVE_BYTES) throw new Error('Archivio oltre il limite dei gusci');
  // Controllo con lo stesso lettore del guscio Windows: percorsi, CRC e dimensioni.
  const check = readZip(archive);
  if (check.length !== entries.length) throw new Error('Rilettura dello zip non coerente');

  const manifest: ReleaseManifest = {
    schema: 1,
    version,
    archive: {
      name: `acasystem-web-${version}.zip`,
      sha256: createHash('sha256').update(archive).digest('hex'),
      size: archive.byteLength,
    },
    minServer: values['min-server'] ?? version,
    minShell: values['min-shell'] ?? '0.1.0',
  };
  if (!parseManifest(manifest)) throw new Error('Manifesto non valido per il nucleo');

  const out = new URL(`../release-out/v${version}/`, import.meta.url);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await writeFile(new URL(manifest.archive.name, out), archive);
  await writeFile(new URL('manifest.json', out), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Release v${version}: ${entries.length} file, ${(archive.byteLength / 1024 / 1024).toFixed(1)} MB, SHA-256 ${manifest.archive.sha256}`
  );
  console.log(`Cartella: ${out.pathname}`);
} finally {
  await rm(work, { recursive: true, force: true });
}
