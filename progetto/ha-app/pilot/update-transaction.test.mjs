import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runUpdateTransaction } from './update-transaction.mjs';

const oldImage = 'ghcr.io/acamemo/acasystem@sha256:' + '1'.repeat(64);
const newImage = 'ghcr.io/acamemo/acasystem@sha256:' + '2'.repeat(64);
const before = { version: '0.9.72', appVersion: '0.9.72.99', haosVersion: '18.4', coreVersion: '2026.9.4', supervisorVersion: '2026.9.0', shellVersion: '0.1.0' };
const distribution = {
  schema: 1, version: '0.9.73', appVersion: '0.9.73', tag: 'v0.9.73', channel: 'stable', image: newImage,
  bundle: { schema: 1, version: '0.9.73', minServer: '0.9.73', minShell: '0.1.0', archive: { name: 'aca.zip', sha256: 'a'.repeat(64), size: 100 } },
  compatibility: { haos: { min: '18.4', maxExclusive: '19.0' }, core: { min: '2026.9.0', maxExclusive: '2026.10.0' }, supervisor: { min: '2026.9.0', maxExclusive: '2026.12.0' }, upgradeFrom: { min: '0.9.34', maxExclusive: '0.9.74' } },
};
const publication = { release: { tag_name: 'v0.9.73', draft: false, prerelease: false }, distribution };

// File reali temporanei, ciclo di vita del servizio/immagini simulato. Nessun Docker/HAOS.
async function fixture(t, failures = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'aca-update-transaction-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dataPath = join(directory, 'data.json');
  const backupPath = join(directory, 'backup.json');
  const data = JSON.stringify({ account: 'fixture-user', profiles: [{ id: 'fixture-profile', widgets: ['fixture-widget'] }], schema: 1 });
  await writeFile(dataPath, data);
  let state = { ...before, ...(failures.runtime ? { runtime: failures.runtime } : {}) }; let image = failures.localImage ?? oldImage; let locked = false; let maintenance = false; let target = 'fixture-target';
  const calls = [];
  const record = (name) => { calls.push(name); if (failures[name]) throw new Error('private-value-must-not-leak'); };
  const hashFile = async () => createHash('sha256').update(await readFile(backupPath)).digest('hex');
  const adapter = {
    acquire: async () => { if (locked) return null; locked = true; return async () => { locked = false; }; },
    assertTarget: async (id) => { record('target'); if (id !== target) throw new Error('wrong-target'); },
    inspect: async () => ({ ...state }),
    stage: async () => { record('stage'); },
    drain: async () => { record('drain'); if (failures.busy) return false; maintenance = true; return true; },
    backup: async () => { record('backup'); assert.ok(maintenance); await copyFile(dataPath, backupPath); return { id: 'fixture-backup', sha256: await hashFile(), image }; },
    verifyBackup: async (receipt) => { record('verifyBackup'); return !failures.corruptBackup && receipt.sha256 === await hashFile(); },
    install: async () => { record('install'); assert.ok(maintenance); image = newImage; state = { ...state, version: distribution.version, appVersion: distribution.appVersion }; await writeFile(dataPath, JSON.stringify({ ...JSON.parse(data), schema: 2 })); if (failures.afterMigration) throw new Error('private'); },
    verifyInstalled: async () => { record('verifyInstalled'); return !failures.badHealth && image === newImage && state.version === distribution.version; },
    restore: async () => { record('restore'); assert.ok(maintenance); image = oldImage; state = { ...before }; await copyFile(backupPath, dataPath); },
    verifyRestored: async () => { record('verifyRestored'); return image === oldImage && await readFile(dataPath, 'utf8') === data; },
    verifyUnchanged: async () => { record('verifyUnchanged'); return image === oldImage && state.version === before.version; },
    resume: async () => { record('resume'); maintenance = false; },
  };
  const run = (extra = {}) => runUpdateTransaction({ directory, targetId: 'fixture-target', channel: 'stable', publication, adapter, ...extra });
  return { directory, dataPath, backupPath, data, calls, run, adapter,
    setTarget: (value) => { target = value; }, setMaintenance: (value) => { maintenance = value; },
    state: () => ({ ...state, image, locked, maintenance }),
    journal: async () => JSON.parse(await readFile(join(directory, 'update-journal.json'), 'utf8')),
    writeJournal: async (phase, extra = {}) => writeFile(join(directory, 'update-journal.json'), JSON.stringify({ schema: 1, targetId: 'fixture-target', phase, before, publication: distribution, backup: null, ...extra })),
  };
}
test('backup precede install e commit precede riapertura; account/profili conservati', async t => {
  const f = await fixture(t); assert.equal((await f.run()).action, 'updated');
  assert.ok(f.calls.indexOf('verifyBackup') < f.calls.indexOf('install'));
  const after = JSON.parse(await readFile(f.dataPath, 'utf8'));
  assert.equal(after.account, 'fixture-user'); assert.deepEqual(after.profiles, JSON.parse(f.data).profiles);
  assert.equal((await f.journal()).phase, 'complete'); assert.equal(f.state().maintenance, false);
  const installed = f.calls.filter(x => x === 'install').length;
  assert.equal((await f.run()).action, 'keep'); assert.equal(f.calls.filter(x => x === 'install').length, installed);
});
test('backup assente/corrotto o drain occupato impediscono installazione', async t => {
  for (const failures of [{ backup: true }, { corruptBackup: true }, { busy: true }]) {
    const f = await fixture(t, failures); await f.run(); assert.ok(!f.calls.includes('install'));
    assert.equal(await readFile(f.dataPath, 'utf8'), f.data); assert.equal(f.state().maintenance, false);
  }
});
test('stage indisponibile rinvia anche con journal completo, senza recupero o reinstallazione', async t => {
  const f = await fixture(t); assert.equal((await f.run()).action, 'updated');
  const journal = await f.journal(); journal.phase = 'complete';
  await f.writeJournal('complete', journal);
  const previous = f.adapter.inspect;
  f.adapter.inspect = async () => ({ ...await previous(), version: '0.9.72', appVersion: '0.9.72.99' });
  f.adapter.stage = async () => { throw new Error('not-yet-published'); };
  assert.equal((await f.run()).reason, 'publication-not-ready');
});

test('journal terminale storico e ACA non pronta restano preflight riprendibile senza install/restore', async t => {
  const f = await fixture(t); assert.equal((await f.run()).action, 'updated');
  const resume = f.adapter.resume; const inspect = f.adapter.inspect;
  for (const method of ['resume', 'inspect']) {
    f.adapter[method] = async () => { throw new Error('ACA non ancora pronta'); };
    assert.deepEqual(await f.run({ publication: null }), { action: 'recovery-required', phase: 'preflight' });
    f.adapter.resume = resume; f.adapter.inspect = inspect;
  }
  assert.equal((await f.run({ publication: null })).action, 'keep');
  assert.equal(f.calls.filter(x => x === 'install').length, 1); assert.ok(!f.calls.includes('restore'));
  const current = await fixture(t, { backup: true });
  assert.equal((await current.run()).phase, 'cancelled', 'Un nuovo tentativo fallito non diventa preflight');
});
test('errore dopo migrazione o health errata ripristinano immagine e byte dati', async t => {
  for (const failures of [{ afterMigration: true }, { badHealth: true }]) {
    const f = await fixture(t, failures); assert.equal((await f.run()).action, 'rolled-back');
    assert.equal(f.state().image, oldImage); assert.equal(await readFile(f.dataPath, 'utf8'), f.data);
    assert.equal((await f.run()).reason, 'publication-already-failed');
  }
});
test('journal install interrotta ripristina prima di nuove installazioni', async t => {
  const f = await fixture(t); f.setMaintenance(true); const backup = await f.adapter.backup(before);
  await f.adapter.install(); await f.writeJournal('installing', { backup });
  assert.equal((await f.run()).action, 'rolled-back'); assert.equal(await readFile(f.dataPath, 'utf8'), f.data);
  assert.equal(f.calls.filter(x => x === 'install').length, 1);
});
test('commit durevole interrotto completa resume senza ripristinare DB nuovi', async t => {
  const f = await fixture(t); f.setMaintenance(true); const backup = await f.adapter.backup(before);
  await f.adapter.install(); await f.writeJournal('committed', { backup });
  assert.equal((await f.run()).action, 'updated'); assert.ok(!f.calls.includes('restore'));
  assert.equal(JSON.parse(await readFile(f.dataPath, 'utf8')).schema, 2);
});
test('arresto prima di installazione riprende precedente senza restore', async t => {
  const f = await fixture(t); f.setMaintenance(true); await f.writeJournal('backing-up');
  assert.equal((await f.run()).action, 'recovered-before-install'); assert.ok(!f.calls.includes('restore'));
  assert.equal(f.state().maintenance, false);
});
test('recupero fallito resta esplicito senza segreti e senza riaprire scritture', async t => {
  const f = await fixture(t, { afterMigration: true, restore: true });
  const result = await f.run(); assert.equal(result.action, 'recovery-required');
  assert.doesNotMatch(JSON.stringify(result), /private/); assert.equal(f.state().maintenance, true);
});
test('ripresa di restore fallito non ripete il comando incerto nella stessa invocazione', async t => {
  const f = await fixture(t); f.setMaintenance(true); const backup = await f.adapter.backup(before);
  await f.writeJournal('restoring', { backup });
  let attempts = 0; f.adapter.restore = async () => { attempts++; throw new Error('private'); };
  assert.equal((await f.run()).action, 'recovery-required'); assert.equal(attempts, 1);
});
test('identita target/journal alterate impediscono tutte le mutazioni', async t => {
  const f = await fixture(t); await f.writeJournal('installing', { schema: 99 });
  assert.equal((await f.run()).action, 'recovery-required'); assert.ok(!f.calls.includes('restore')); assert.ok(!f.calls.includes('install'));
  f.setTarget('another-target'); assert.equal((await f.run()).action, 'recovery-required');
  assert.ok(!f.calls.includes('resume'));
});
test('richieste simultanee non duplicano update', async t => {
  const f = await fixture(t); const results = await Promise.all([f.run(), f.run()]);
  assert.equal(results.filter(x => x.action === 'updated').length, 1);
  assert.equal(results.filter(x => x.reason === 'another-update-running').length, 1);
  assert.equal(f.calls.filter(x => x === 'install').length, 1);
});

test('imageID locale ammesso soltanto per il runtime Container esplicito', async t => {
  const localImage = 'sha256:' + '3'.repeat(64);
  const container = await fixture(t, { runtime: 'container', localImage });
  const result = await container.run({ channel: 'bank', publication: {
    ...publication, distribution: { ...distribution, channel: 'bank', runtime: 'container' },
  } });
  assert.equal(result.action, 'updated');
  assert.equal((await container.journal()).backup.image, localImage);
  const haos = await fixture(t, { localImage }); await haos.run();
  assert.ok(!haos.calls.includes('install'));
});

test('transactionId durevole viene passato a drain e resume anche dopo recupero del commit', async t => {
  const f = await fixture(t); const contexts = [];
  const drain = f.adapter.drain; const resume = f.adapter.resume;
  f.adapter.drain = async value => { contexts.push(value); return drain(); };
  f.adapter.resume = async value => { contexts.push(value); return resume(); };
  assert.equal((await f.run()).action, 'updated');
  const journal = await f.journal(); assert.match(journal.transactionId, /^[a-f0-9-]{36}$/);
  assert.deepEqual(contexts, [{ transactionId: journal.transactionId }, { transactionId: journal.transactionId }]);
  await f.writeJournal('committed', { transactionId: journal.transactionId, backup: journal.backup });
  assert.equal((await f.run()).action, 'updated');
  assert.equal(contexts.at(-1).transactionId, journal.transactionId);
});
