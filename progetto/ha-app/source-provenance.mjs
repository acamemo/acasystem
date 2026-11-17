import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const SOURCE_LABEL = 'org.acasystem.source.sha256';

/** Impronta di nomi e byte, indipendente da ordine, mtime e percorso della macchina. */
export function sourceSnapshot(entries) {
  const files = entries.map((entry) => ({ name: entry.name, data: Buffer.from(entry.data) }))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const hash = createHash('sha256');
  const names = new Set();
  for (const entry of files) {
    if (!entry.name || entry.name.includes('\\') || entry.name.startsWith('/') || entry.name.split('/').some((part) => !part || part === '..' || part === '.') || names.has(entry.name)) {
      throw new Error('Percorso sorgente non valido o duplicato');
    }
    names.add(entry.name);
    hash.update(entry.name).update('\0').update(createHash('sha256').update(entry.data).digest('hex')).update('\n');
  }
  return { files, sha256: hash.digest('hex') };
}

/** Legge una volta i sorgenti pubblicabili; i file cancellati nel working tree sono esclusi. */
export async function captureSourceSnapshot(root) {
  const prefix = 'progetto/acasystem/';
  const paths = [...new Set(execFileSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard', '-z', '--', prefix], { encoding: 'utf8' }).split('\0').filter(Boolean))];
  const files = [];
  for (const path of paths) {
    if (!path.startsWith(prefix)) throw new Error('Sorgente fuori dal progetto ACA');
    // Note QA locali: contengono percorsi personali e non servono a costruire o eseguire ACA.
    if (path.startsWith(`${prefix}frontend/.impeccable/`) || path === `${prefix}upstream-tunet/design-qa.md`) continue;
    try { files.push({ name: path.slice(prefix.length), data: await readFile(join(root, path)) }); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!files.some((file) => file.name === 'Dockerfile') || !files.some((file) => file.name === 'package-lock.json')) {
    throw new Error('Snapshot ACA incompleto');
  }
  return sourceSnapshot(files);
}

export function verifyImageSource(labels, snapshot, version) {
  const hash = labels?.[SOURCE_LABEL];
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) {
    throw new Error('Immagine senza provenienza sorgenti: ricostruirla con ha-app/build-base.mjs');
  }
  if (hash !== snapshot.sha256) throw new Error('Immagine e sorgenti non corrispondono: ricostruire dalla versione corrente');
  if (labels['org.opencontainers.image.version'] !== version) throw new Error('Versione immagine diversa da quella richiesta');
}
