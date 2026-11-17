import { cp, lstat, mkdir, readdir, realpath, rm, stat } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = new URL('./', import.meta.url);
const entries = ['base.css', 'tokens.css', 'fonts.css', 'html.css', 'index.css', 'fonts', 'themes', 'components', 'layout'];
const contains = (directory, target) => {
  const path = relative(directory, target);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
};

/**
 * Rigenera soltanto una cartella design-aca dedicata agli asset distribuiti.
 * I suoi figli sono generati; fonti e cartelle genitore non vengono mai cancellate.
 */
export async function copyDesignAssets(destination) {
  if (destination instanceof URL && destination.protocol !== 'file:') {
    throw new TypeError('La destinazione del design deve essere locale.');
  }
  const output = resolve(destination instanceof URL ? fileURLToPath(destination) : destination);
  const sourcePath = await realpath(source);
  if (basename(output) !== 'design-aca' || contains(sourcePath, output) || contains(output, sourcePath)) {
    throw new TypeError('La destinazione deve essere una cartella generata design-aca separata dalle fonti.');
  }
  const existing = await lstat(output).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
    throw new TypeError('La cartella generata del design non può essere un file o un collegamento simbolico.');
  }
  // Verifica tutti gli ingressi prima di pulire una copia già esistente.
  await Promise.all(entries.map((entry) => stat(new URL(entry, source))));
  await mkdir(output, { recursive: true });
  const targetRoot = await realpath(output);
  if (contains(sourcePath, targetRoot) || contains(targetRoot, sourcePath)) {
    throw new TypeError('La destinazione reale del design deve restare separata dalle fonti.');
  }
  for (const name of await readdir(targetRoot)) {
    const target = resolve(targetRoot, name);
    if (target === targetRoot || !contains(targetRoot, target)) {
      throw new TypeError('La pulizia del design deve restare dentro la cartella generata.');
    }
    await rm(target, { recursive: true, force: true });
  }
  for (const entry of entries) await cp(new URL(entry, source), resolve(targetRoot, entry), { recursive: true });
}
