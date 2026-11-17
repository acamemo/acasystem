import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmod, lstat, mkdir, open } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { readHaosPrivateConfiguration, validateHaosTarget } from './haos-update.mjs';
import { createAcaMaintenanceClient } from './supervisor-update-adapter.mjs';

export function newHaosConfiguration({ containerName, shellVersion }) {
  const target = validateHaosTarget({ schema: 1, enabled: true, channel: 'stable', targetId: 'aca-' + randomUUID(),
    slug: '9960cdb4_acasystem', containerName, shellVersion, checkIntervalMs: 600000 });
  return { target, token: randomBytes(32).toString('hex') };
}

export function assertEmptyHaosInstallation(database) {
  for (const name of ['aca_v2_users', 'aca_v2_profiles', 'aca_v2_sessions']) {
    const row = database.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get();
    if (row?.count !== 0) throw new Error('Predisposizione automatica riservata alla centrale prima degli account personali');
  }
}

export async function initializeHaosConfiguration({ containerName, shellVersion, directory = '/data/update-secret' }) {
  try {
    await lstat(directory);
    const existing = await readHaosPrivateConfiguration(directory);
    if (existing.target.containerName !== containerName || existing.target.shellVersion !== shellVersion) throw new Error('Predisposizione esistente differente');
    return { targetId: existing.target.targetId, action: 'unchanged' };
  } catch (error) { if (error.code !== 'ENOENT') throw new Error('Predisposizione privata esistente non riutilizzabile'); }
  // Se resta una directory parziale non viene rigenerata una credenziale a caso.
  const configuration = newHaosConfiguration({ containerName, shellVersion });
  await mkdir(directory, { mode: 0o700 }); await chmod(directory, 0o700);
  for (const [name, bytes] of [['token', configuration.token + '\n'], ['target.json', JSON.stringify(configuration.target) + '\n']]) {
    const file = await open(join(directory, name), 'wx', 0o600);
    try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
  }
  await readHaosPrivateConfiguration(directory);
  return { targetId: configuration.target.targetId, action: 'initialized' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { init: { type: 'boolean' }, verify: { type: 'boolean' }, 'check-copy': { type: 'boolean' },
      'expected-target': { type: 'string' }, 'token-sha': { type: 'string' }, 'container-name': { type: 'string' }, 'shell-version': { type: 'string' } } });
    if ([values.init, values.verify, values['check-copy']].filter(Boolean).length !== 1) throw new Error('Scegliere una sola operazione');
    if (values.init) {
      const require = createRequire('/app/backend/package.json'); const Database = require('better-sqlite3');
      const db = new Database('/data/app/tunet.db', { readonly: true, fileMustExist: true });
      try { assertEmptyHaosInstallation(db); } finally { db.close(); }
      console.log(JSON.stringify(await initializeHaosConfiguration({ containerName: values['container-name'], shellVersion: values['shell-version'] })));
    } else if (values['check-copy']) {
      try { await lstat('/data/update-secret'); } catch (error) { if (error.code === 'ENOENT') process.exit(0); throw error; }
      const existing = await readHaosPrivateConfiguration();
      const hash = createHash('sha256').update(existing.token + '\n').digest('hex');
      if (existing.target.targetId !== values['expected-target'] || hash !== values['token-sha']) throw new Error('Credenziale companion differente');
    } else if (values.verify) {
      const { target, token } = await readHaosPrivateConfiguration();
      const maintenance = createAcaMaintenanceClient({ baseUrl: 'http://127.0.0.1:3002/', token });
      const state = await maintenance.inspect();
      if (state.targetId !== target.targetId || !/^[a-f0-9]{64}$/.test(state.dataFingerprint ?? '')) throw new Error('Identita non corrispondente');
      const publicStatus = await fetch('http://127.0.0.1:3002/api/updates/status', { signal: AbortSignal.timeout(5000) });
      const status = await publicStatus.json();
      if (!publicStatus.ok || !['current', 'offline', 'deferred', 'available'].includes(status.status)) throw new Error('Executor non ancora pronto');
      console.log(JSON.stringify({ action: 'verified', targetId: target.targetId, version: state.version, appVersion: state.appVersion, status: status.status }));
    } else throw new Error('Scegliere init oppure verify');
  } catch {
    console.error('Predisposizione updater non completata: verificare configurazione privata e stato locale.'); process.exitCode = 1;
  }
}
