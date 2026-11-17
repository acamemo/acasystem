import { lstat, readFile } from 'node:fs/promises';

// Stesso file tecnico su main/updater; credenziale privata, conservata nel rollback ACA locale.
export async function updateEnvironment(directory = '/data/update-secret') {
  let folder;
  try { folder = await lstat(directory); } catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
  if (!folder.isDirectory() || folder.isSymbolicLink() || (folder.mode & 0o077)) throw new Error('Configurazione update non privata');
  const metadata = await lstat(directory + '/target.json'); const secret = await lstat(directory + '/token');
  for (const value of [metadata, secret]) {
    if (!value.isFile() || value.isSymbolicLink() || value.uid !== folder.uid || (value.mode & 0o077) || value.size > 8192) throw new Error('Configurazione update non privata');
  }
  const target = JSON.parse(await readFile(directory + '/target.json', 'utf8'));
  if (target.schema !== 1 || target.enabled !== true || !/^aca-[a-f0-9-]{36}$/.test(target.targetId ?? '') ||
    target.slug !== '9960cdb4_acasystem' || !/^[a-f0-9]{64}$/.test((await readFile(directory + '/token', 'utf8')).trim())) throw new Error('Configurazione update non valida');
  return `export ACA_UPDATE_TARGET_ID='${target.targetId}'\nexport ACA_UPDATE_TOKEN_FILE='${directory}/token'\n`;
}
if (process.argv[1]?.endsWith('/update-environment.mjs')) {
  try { process.stdout.write(await updateEnvironment()); } catch { console.error('Configurazione privata update non valida'); process.exitCode = 1; }
}
