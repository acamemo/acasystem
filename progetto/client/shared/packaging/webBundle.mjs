import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseManifest, MAX_ARCHIVE_BYTES } from '../../core/src/manifest.ts';
import { readZip } from './zipReader.ts';
import { writeZip } from './zipWriter.ts';

const files = async (directory, prefix = '') => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) result.push(...await files(join(directory, entry.name), name));
    else if (entry.isFile()) result.push({ name, data: await readFile(join(directory, entry.name)) });
  }
  return result.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
};

/** UI e Casa 3D, con lo stesso manifesto e gli stessi controlli per tutti i distributori. */
export async function createClientBundle({ frontend, casa3d, version, minServer = version, minShell = '0.1.0' }) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Versione client bundle non valida');
  const entries = await files(frontend);
  if (!entries.some((entry) => entry.name === 'index.html') || entries.some((entry) => entry.name.startsWith('casa3d/'))) {
    throw new Error('Build frontend mancante o contenente una Casa 3D duplicata');
  }
  entries.push(...(await files(casa3d)).map((entry) => ({ ...entry, name: 'casa3d/' + entry.name })));
  const archive = writeZip(entries);
  if (archive.length > MAX_ARCHIVE_BYTES) throw new Error('Client bundle oltre il limite');
  // Percorsi, duplicati, CRC e dimensioni: lo stesso lettore usato dal client Windows.
  if (readZip(archive).length !== entries.length) throw new Error('Rilettura dello zip non coerente');
  const manifest = {
    schema: 1, version,
    archive: { name: 'acasystem-web-' + version + '.zip', size: archive.length, sha256: createHash('sha256').update(archive).digest('hex') },
    minServer, minShell,
  };
  if (!parseManifest(manifest)) throw new Error('Manifest client bundle non valido');
  return { manifest, archive, entryCount: entries.length };
}

/** Scrive il bundle locale; non pubblica né installa risorse. */
export async function prepareClientBundle({ output, ...options }) {
  const { manifest, archive } = await createClientBundle(options);
  await mkdir(output, { recursive: true });
  await writeFile(join(output, manifest.archive.name), archive);
  await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
