import assert from 'node:assert/strict';
import { chmod, lstat, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { checkHaos, monitorHaos, prepareHaosRuntime, readHaosPrivateConfiguration, validateHaosTarget, waitForHaosConfiguration } from './haos-update.mjs';
import { assertEmptyHaosInstallation, initializeHaosConfiguration, newHaosConfiguration } from './haos-provision.mjs';
import { updateEnvironment } from '../image/update-environment.mjs';
import { executorCandidate, executorImagePaths } from './executor-materials.mjs';
import { readZip } from '../../client/shared/packaging/zipReader.ts';
import { createHash } from 'node:crypto';

const args = { containerName: 'app_9960cdb4_acasystem', shellVersion: '0.1.1' };
const target = newHaosConfiguration(args).target;
const before = { version: '0.9.73', appVersion: '0.9.73.1', runtime: 'haos', haosVersion: '18.4', coreVersion: '2026.9.4', supervisorVersion: '2026.09.0', shellVersion: '0.1.1', dataFingerprint: 'f'.repeat(64) };
const distribution = { schema: 1, channel: 'stable', runtime: 'haos', version: '0.9.73', appVersion: '0.9.73.2', tag: 'v0.9.73.2', image: 'ghcr.io/acamemo/acasystem@sha256:' + 'a'.repeat(64),
  bundle: { schema: 1, version: '0.9.73', minServer: '0.9.73', minShell: '0.1.1', archive: { name: 'aca.zip', sha256: 'b'.repeat(64), size: 100 } },
  compatibility: { haos: { min: '18.4', maxExclusive: '18.5' }, core: { min: '2026.9.4', maxExclusive: '2026.9.5' }, supervisor: { min: '2026.09.0', maxExclusive: '2026.10.0' }, upgradeFrom: { min: '0.9.73', maxExclusive: '0.9.74' } } };
async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'aca-haos-worker-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const events = []; let installed = { ...before }; let locked = false; let request = null;
  const adapter = {
    acquire: async () => locked ? null : (locked = true, async () => { locked = false; }),
    assertTarget: async id => assert.equal(id, target.targetId), inspect: async () => ({ ...installed }),
    stage: async () => events.push('stage'), drain: async () => !options.busy,
    backup: async () => ({ id: 'fixture-backup', image: distribution.image, sha256: 'c'.repeat(64) }), verifyBackup: async () => true,
    install: async () => { events.push('install'); installed = { ...installed, appVersion: distribution.appVersion }; },
    verifyInstalled: async (_candidate, context) => { assert.equal(context.before.dataFingerprint, before.dataFingerprint); return true; },
    verifyUnchanged: async () => true, resume: async () => events.push('resume'),
    restore: async () => { installed = { ...before }; events.push('restore'); }, verifyRestored: async () => true,
  };
  const maintenance = { state: async () => ({ checkRequest: request }), status: async value => { events.push(value); } };
  return { target, directory, adapter, maintenance, events, setRequest: value => { request = value; } };
}
test('configurazione HAOS solo stable/slug esatto e credenziali uniche', () => {
  const a = newHaosConfiguration(args), b = newHaosConfiguration(args);
  assert.notEqual(a.target.targetId, b.target.targetId); assert.notEqual(a.token, b.token); assert.match(a.token, /^[a-f0-9]{64}$/);
  for (const change of [{ channel: 'bank' }, { slug: 'other_addon' }, { targetId: 'aca-bank' }, { containerName: 'homeassistant' }, { checkIntervalMs: 1 }]) {
    assert.throws(() => validateHaosTarget({ ...target, ...change }));
  }
  assert.ok(!Object.hasOwn(validateHaosTarget({ ...target, token: 'must-not-propagate', url: 'https://untrusted.invalid' }), 'token'));
});
test('worker offline mantiene ACA e comunica lo stato senza stage o credenziali', async t => {
  const f = await fixture(t); const result = await checkHaos({ ...f, check: async (_installed, channel) => { assert.equal(channel, 'stable'); return { action: 'keep', reason: 'timeout' }; } });
  assert.equal(result.action, 'keep'); assert.equal(f.events.at(-1).status, 'offline'); assert.ok(!f.events.includes('install'));
});
test('richiesta compatibile collega selezione, journal, adapter e stato finale', async t => {
  const f = await fixture(t); const result = await checkHaos({ ...f, check: async () => ({ action: 'available', publication: distribution }) });
  assert.equal(result.action, 'updated'); assert.equal(f.events.filter(x => x === 'install').length, 1);
  assert.equal(f.events.at(-1).status, 'current');
  assert.equal(JSON.parse(await readFile(join(f.directory, 'update-journal.json'))).phase, 'complete');
});
test('utenti occupati rinviano senza fermare o installare ACA', async t => {
  const f = await fixture(t, { busy: true });
  assert.equal((await checkHaos({ ...f, check: async () => ({ action: 'available', publication: distribution }) })).action, 'deferred');
  assert.ok(!f.events.includes('install')); assert.equal(f.events.at(-1).status, 'deferred');
});
test('monitor rileva nuove richieste e smette al segnale, senza ciclo serrato', async t => {
  const f = await fixture(t); let polls = 0; let checks = 0;
  await monitorHaos({ ...f, check: async () => { checks++; return { action: 'keep', reason: 'no-compatible-newer-publication' }; },
    pause: async ms => { assert.equal(ms, 2000); if (++polls === 1) f.setRequest({ requestedAt: 'fixture-new-request' }); }, stopped: () => polls >= 3, log: () => {} });
  assert.ok(checks >= 2 && checks <= 3);
});
test('journal errato arresta il watch prima di GitHub/installazione', async t => {
  const f = await fixture(t); let checks = 0; let pauses = 0;
  await writeFile(join(f.directory, 'update-journal.json'), JSON.stringify({ schema: 99, phase: 'installing', targetId: target.targetId }));
  const result = await monitorHaos({ ...f, check: async () => { checks++; }, pause: async () => { pauses++; }, log: () => {} });
  assert.equal(result.action, 'recovery-required'); assert.equal(checks, 0); assert.equal(pauses, 0);
});
test('prerequisito locale indisponibile applica backoff senza chiamare GitHub ogni2secondi', async t => {
  const f = await fixture(t); let polls = 0; let attempts = 0;
  f.adapter.assertTarget = async () => { attempts++; throw new Error('not-ready'); };
  await monitorHaos({ ...f, pause: async () => { polls++; }, stopped: () => polls >= 3, log: () => {}, check: async () => assert.fail('GitHub non richiesto') });
  assert.equal(attempts, 1);
});
test('attesa iniziale limitata ai file assenti; configurazione corrotta non viene ritentata', async () => {
  let time = 0; let reads = 0;
  assert.equal(await waitForHaosConfiguration({ read: async () => { if (++reads < 3) throw Object.assign(new Error('missing'), { code: 'ENOENT' }); return 'ready'; },
    pause: async ms => { time += ms; }, now: () => time }), 'ready');
  await assert.rejects(waitForHaosConfiguration({ read: async () => { throw new Error('invalid'); }, pause: async () => assert.fail('nessuna attesa su dati corrotti') }));
  await assert.rejects(waitForHaosConfiguration({ timeoutMs: 1, read: async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); },
    pause: async ms => { time += ms; }, now: () => time }));
});
test('predisposizione rifiuta utenti/profili/sessioni esistenti prima di generare identita', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE aca_v2_users(id); CREATE TABLE aca_v2_profiles(id); CREATE TABLE aca_v2_sessions(id)');
    assertEmptyHaosInstallation(db);
    db.exec("INSERT INTO aca_v2_users VALUES('fixture-user')"); assert.throws(() => assertEmptyHaosInstallation(db));
  } finally { db.close(); }
});
test('file privati su POSIX, permessi non rappresentabili su Windows non promossi a test ACL', async t => {
  const root = await mkdtemp(join(tmpdir(), 'aca-haos-private-')); t.after(() => rm(root, { recursive: true, force: true }));
  const directory = join(root, 'private');
  if (process.platform === 'win32') {
    await assert.rejects(initializeHaosConfiguration({ ...args, directory }));
    return; // Test del rifiuto POSIX: nessuna dichiarazione di ACL Windows.
  }
  const first = await initializeHaosConfiguration({ ...args, directory }); const again = await initializeHaosConfiguration({ ...args, directory });
  assert.equal(first.targetId, again.targetId); assert.equal(again.action, 'unchanged');
  const config = await readHaosPrivateConfiguration(directory); const env = await updateEnvironment(directory);
  assert.ok(env.includes(config.target.targetId)); assert.ok(!env.includes(config.token));
  const runtime = await prepareHaosRuntime(join(root, 'runtime')); await prepareHaosRuntime(runtime);
  assert.equal((await lstat(runtime)).mode & 0o077, 0);
  await symlink(runtime, join(root, 'foreign-link')); await assert.rejects(prepareHaosRuntime(join(root, 'foreign-link')));
  await chmod(join(directory, 'token'), 0o644); await assert.rejects(readHaosPrivateConfiguration(directory)); await assert.rejects(updateEnvironment(directory));
});
test('candidato executor separato dal catalogo e senza chiavi, hash runtime e checksum esatti', async () => {
  const result = await executorCandidate('0.9.73.2'); const entries = new Map(readZip(result.archive).map(x => [x.path, Buffer.from(x.data)]));
  const config = entries.get('acasystem_updater/config.yaml').toString(); assert.match(config, /boot: manual/); assert.match(config, /hassio_role: manager/); assert.match(config, /docker_api: true/);
  assert.doesNotMatch(config, /__VERSION__|PRIVATE KEY/); assert.match(config, /version: "0.9.73.2"/);
  const proof = JSON.parse(entries.get('EXECUTOR-PROVENANCE.json')); assert.equal(proof.files.length, executorImagePaths.length); assert.equal(proof.imageRuntimeSha256, result.imageRuntimeSha256);
  for (const line of entries.get('SHA256SUMS').toString().trim().split('\n')) {
    const [sha, name] = line.split('  '); assert.equal(createHash('sha256').update(entries.get(name)).digest('hex'), sha);
  }
});
