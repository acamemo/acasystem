import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { test } from 'node:test';
import { createBankAdapter, checkBank, dockerHostPath, monitorBank, readBankTokenFile, secureBankDirectory, validateBankTarget, validateBankTar, windowsPowerShellEnvironment } from './bank-update.mjs';
import { runUpdateTransaction } from './update-transaction.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
async function removeTemp(directory) {
  const actual = await realpath(directory);
  assert.equal(dirname(actual), await realpath(tmpdir())); assert.ok(basename(actual).startsWith('aca-bank-'));
  await rm(actual, { recursive: true, force: true });
}
const oldId = 'sha256:' + hash('old image fixture');
const newId = 'sha256:' + hash('new image fixture');
const coreId = 'sha256:' + hash('home assistant fixture');
const image = 'ghcr.io/acamemo/acasystem@sha256:' + hash('registry fixture manifest');
const oldFingerprint = hash('preserved accounts profiles settings fixture');
const candidate = { schema: 1, runtime: 'container', channel: 'bank', version: '0.9.73', appVersion: '0.9.73.1', tag: 'v0.9.73.1', image,
  bundle: { schema: 1, version: '0.9.73', minServer: '0.9.73', minShell: '0.1.0', archive: { name: 'acasystem-web-0.9.73.zip', size: 100, sha256: hash('new web fixture') } },
  compatibility: { core: { min: '2026.9.4', maxExclusive: '2026.9.5' }, upgradeFrom: { min: '0.9.72', maxExclusive: '0.9.74' } } };
const publication = { distribution: candidate, release: { draft: false, prerelease: true, tag_name: candidate.tag } };

function tarFixture(path = './tunet.db', type = 48) {
  const header = Buffer.alloc(512);
  header.write(path); header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
  header.write('00000000001\0', 124); header.write('00000000000\0', 136); header.fill(32, 148, 156);
  header[156] = type; header.write('ustar\0', 257); header.write('00', 263);
  const sum = header.reduce((value, byte) => value + byte, 0);
  header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  return Buffer.concat([header, Buffer.from([42]), Buffer.alloc(511), Buffer.alloc(1024)]);
}

async function freePort() {
  const server = createServer();
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const port = server.address().port;
  await new Promise(done => server.close(done));
  return port;
}

async function harness({ brokenCandidate = false, busy = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'aca-bank-adapter-test-'));
  const directory = join(root, 'state'); await mkdir(directory);
  const composePath = join(root, 'compose.fixture.yaml'); await writeFile(composePath, '# compose fixture; no secrets');
  const target = { schema: 1, targetId: 'test-bank', containerName: 'fixture-aca', composeProject: 'fixture', composeService: 'aca',
    composeFiles: [{ path: composePath, sha256: hash(await readFile(composePath)) }], dataVolume: 'fixture-data', serviceSecretVolume: 'fixture-secret',
    command: ['/haos/run.sh'], entrypoint: ['docker-entrypoint.sh'], workingDirectory: '/app/backend', restart: 'unless-stopped',
    coreContainerName: 'fixture-ha', coreService: 'ha', coreImageId: coreId, baseUrl: 'http://127.0.0.1:3002', directory,
    tokenFile: join(root, 'not-read-secret-token'), shellVersion: '0.1.0', lockPort: await freePort(), maxBackupBytes: 1024 * 1024, checkIntervalMs: 60000 };
  const oldBundle = { ...candidate.bundle, version: '0.9.72', minServer: '0.9.72', archive: { ...candidate.bundle.archive, name: 'acasystem-web-0.9.72.zip', sha256: hash('old web fixture') } };
  const state = { localImage: oldId, version: '0.9.72', appVersion: '0.9.72.99', running: true, fingerprint: oldFingerprint,
    maintenance: { active: false }, bundle: oldBundle, currentCoreImage: coreId, extraFiles: [], wrongMount: false, clears: 0, restored: false,
    tokenMountSource: null };
  const calls = []; const statuses = [];
  const app = () => ({ targetId: target.targetId, version: state.version, appVersion: state.appVersion, bundle: state.bundle,
    dataFingerprint: state.fingerprint, maintenance: state.maintenance,
    activity: { pendingWrites: 0, activeCommands: busy ? 1 : 0, activeEditors: 0, activeConnections: 0 } });
  const maintenance = {
    inspect: async () => { if (!state.running) throw new Error('fixture app stopped'); return app(); },
    state: async () => { if (!state.running) throw new Error('fixture app stopped'); return app(); },
    drain: async ({ transactionId }) => { if (busy) return false; state.maintenance = { active: true, transactionId }; return true; },
    resume: async ({ transactionId }) => { assert.equal(state.maintenance.transactionId, transactionId); state.maintenance = { active: false }; },
    status: async body => statuses.push(body),
  };
  const run = async args => {
    calls.push(args);
    if (args[0] === 'container' && args[2] === target.coreContainerName) return JSON.stringify({ name: '/' + target.coreContainerName,
      image: state.currentCoreImage, project: target.composeProject, service: target.coreService, version: '2026.9.4', running: true });
    if (args[0] === 'container') {
      if (args.at(-1) === '{{json .State.Running}}') return String(state.running);
      return JSON.stringify({ name: '/' + target.containerName, image: state.localImage, command: target.command, entrypoint: target.entrypoint,
        workingDirectory: target.workingDirectory, restart: target.restart, project: target.composeProject, service: target.composeService,
        composeFiles: [...target.composeFiles.map(file => file.path), ...state.extraFiles].join(','), mounts: [
          { type: 'volume', name: state.wrongMount ? 'unrelated-data' : target.dataVolume, destination: '/app/data', rw: true },
          { type: 'volume', name: target.serviceSecretVolume, destination: '/app/service-secret', rw: true },
          ...(state.tokenMountSource ? [{ type: 'bind', name: '', source: state.tokenMountSource, destination: '/run/aca-update/token', rw: false }] : []),
        ] });
    }
    if (args[0] === 'image' && args[1] === 'inspect') {
      if (args.at(-1) === '{{json .Size}}') return '1024';
      if (args.at(-1) === '{{.Id}}') return oldId;
      return JSON.stringify({ id: newId, digests: [image], size: 1024, version: candidate.appVersion, source: hash('new source fixture') });
    }
    if (args[0] === 'image' && args[1] === 'save') { await writeFile(args[3], 'isolated rollback image fixture'); return ''; }
    if (args[0] === 'image' && args[1] === 'load') return '';
    if (args[0] === 'pull') return '';
    if (args[0] === 'stop') { state.running = false; return ''; }
    if (args[0] === 'start') { state.running = true; return ''; }
    if (args[0] === 'run') {
      const entrypoint = args[args.indexOf('--entrypoint') + 1];
      if (entrypoint === 'node') {
        if (args.at(-1).includes('fs.rmSync')) { state.clears++; return ''; }
        return JSON.stringify({ dataFingerprint: state.fingerprint });
      }
      if (args.includes('-cf')) { await writeFile(join(directory, args[args.indexOf('-cf') + 1].split('/').at(-1)), tarFixture()); return ''; }
      if (args.includes('-xf')) { state.fingerprint = oldFingerprint; state.restored = true; return ''; }
    }
    if (args[0] === 'compose') {
      const override = JSON.parse(await readFile(join(directory, 'bank-active.yaml'), 'utf8'));
      assert.deepEqual(Object.keys(override.services), [target.composeService]);
      const selected = override.services[target.composeService];
      assert.deepEqual(selected.command, target.command); assert.deepEqual(selected.entrypoint, target.entrypoint);
      state.localImage = selected.image === image ? newId : oldId;
      state.version = selected.environment.ACASYSTEM_VERSION; state.appVersion = selected.environment.APP_VERSION;
      state.bundle = state.localImage === newId ? candidate.bundle : oldBundle;
      if (brokenCandidate && state.localImage === newId) state.fingerprint = hash('lost accounts fixture');
      state.running = true; state.extraFiles = [join(directory, 'bank-active.yaml')];
      return '';
    }
    throw new Error('Unexpected isolated Docker fixture command');
  };
  const adapter = createBankAdapter({ target, maintenance, run, secureDirectory: value => secureBankDirectory(value, { platform: 'isolated-fixture' }), healthTimeoutMs: 0, pause: async () => {} });
  return { root, target, state, calls, statuses, adapter, maintenance, run, cleanup: () => removeTemp(root) };
}

test('tar reale controlla checksum, traversal/link, troncamento e database presente', () => {
  assert.equal(validateBankTar(tarFixture()), true);
  for (const archive of [tarFixture('../tunet.db'), tarFixture('./tunet.db', 50), tarFixture('./other.db'), tarFixture().subarray(0, 1024)]) {
    assert.equal(validateBankTar(archive), false);
  }
  const corrupted = tarFixture(); corrupted[100] = 0;
  assert.equal(validateBankTar(corrupted), false);
});

test('directory dedicata con ACL Windows esplicita; nessuna modifica permessi host nei test', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aca-bank-acl-test-'));
  try {
    const target = { targetId: 'acl-fixture', directory: join(root, 'private') };
    const environment = { SystemRoot: 'C:\\Windows', PSModulePath: 'C:\\Program Files\\PowerShell\\7\\Modules' };
    const calls = [];
    await secureBankDirectory(target, { platform: 'win32', environment, native: async (...args) => calls.push(args) });
    assert.equal(calls[0][0], 'powershell.exe'); assert.equal(calls[0][2].windowsHide, true);
    assert.equal(calls[0][2].env.ACA_BANK_PRIVATE_DIRECTORY, target.directory);
    assert.equal(calls[0][2].env.PSModulePath, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules');
    const script = Buffer.from(calls[0][1].at(-1), 'base64').toString('utf16le');
    assert.ok(script.includes('SetAccessRuleProtection($true,$false)'));
    assert.ok(script.includes('S-1-5-18')); assert.ok(script.includes('Set-Acl -LiteralPath'));
    if (process.platform === 'win32') {
      const parser = '$ErrorActionPreference="Stop";Get-Command Get-Acl -ErrorAction Stop|Out-Null;$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseInput([Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($env:ACA_BANK_SCRIPT_TO_PARSE)),[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count){exit 2}';
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(parser, 'utf16le').toString('base64')], {
        windowsHide: true, env: windowsPowerShellEnvironment(process.env, { ACA_BANK_SCRIPT_TO_PARSE: calls[0][1].at(-1) }), stdio: 'pipe',
      });
    }
    const unrelated = join(root, 'unrelated'); await mkdir(unrelated); await writeFile(join(unrelated, 'keep'), 'keep');
    await assert.rejects(secureBankDirectory({ ...target, directory: unrelated }, { platform: 'win32', environment, native: async () => assert.fail('ACL unrelated directory') }));
    assert.equal(await readFile(join(unrelated, 'keep'), 'utf8'), 'keep');
    await assert.rejects(secureBankDirectory(target, { platform: 'win32', environment, native: async () => { throw new Error('ACL refused fixture'); } }));
    const fixtureTokenFile = join(root, 'fixture-not-a-real-token');
    await writeFile(fixtureTokenFile, hash('test-only-token'), { mode: 0o600 });
    const tokenCalls = [];
    assert.equal(await readBankTokenFile(fixtureTokenFile, { platform: 'win32', environment, native: async (...args) => tokenCalls.push(args) }), hash('test-only-token'));
    assert.equal(tokenCalls[0][2].env.PSModulePath, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules');
    assert.equal(tokenCalls[0][2].env.ACA_BANK_TOKEN_FILE, fixtureTokenFile);
    await assert.rejects(readBankTokenFile(fixtureTokenFile, { platform: 'win32', environment, native: async () => { throw new Error('Public ACL fixture'); } }));
  } finally { await removeTemp(root); }
});

test('PowerShell5.1 riceve solo module path legacy assoluto anche da ambiente PS7 con casing duplicato', () => {
  const inherited = { SystemRoot: 'D:\\Windows', PSMODULEPATH: 'D:\\PowerShell7\\Modules', PSModulePath: 'D:\\CustomPS7', KEEP: 'unchanged' };
  const result = windowsPowerShellEnvironment(inherited, { ACA_BANK_TOKEN_FILE: 'D:\\Private\\token' });
  assert.equal(result.PSModulePath, 'D:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules');
  assert.deepEqual(Object.keys(result).filter(key => key.toLowerCase() === 'psmodulepath'), ['PSModulePath']);
  assert.equal(result.KEEP, inherited.KEEP); assert.equal(result.ACA_BANK_TOKEN_FILE, 'D:\\Private\\token');
  assert.equal(inherited.PSMODULEPATH, 'D:\\PowerShell7\\Modules'); assert.equal(inherited.PSModulePath, 'D:\\CustomPS7');
  assert.throws(() => windowsPowerShellEnvironment({ PSModulePath: 'PS7', SystemRoot: 'relative' }));
  assert.throws(() => windowsPowerShellEnvironment({ PSModulePath: 'PS7' }));
});

test('identity/Core/compose modificati fermano prima delle mutazioni; nessun dump Env', async () => {
  const h = await harness();
  try {
    assert.equal((await h.adapter.inspect()).coreVersion, '2026.9.4');
    h.state.wrongMount = true;
    await assert.rejects(h.adapter.inspect()); h.state.wrongMount = false;
    h.state.currentCoreImage = 'sha256:' + hash('unrelated HA image');
    await assert.rejects(h.adapter.inspect()); h.state.currentCoreImage = coreId;
    await writeFile(h.target.composeFiles[0].path, 'unexpected changed compose');
    await assert.rejects(h.adapter.inspect());
    assert.ok(h.calls.every(args => !['pull', 'stop', 'compose', 'run'].includes(args[0])));
    assert.ok(h.calls.every(args => !args.join(' ').includes('.Config.Env')));
    assert.throws(() => validateBankTarget({ ...h.target, dataVolume: 'data;other' }));
  } finally { await h.cleanup(); }
});

test('percorso del bind della chiave nel formato Docker Desktop riconosciuto solo su Windows', () => {
  assert.equal(dockerHostPath('/run/desktop/mnt/host/c/Users/utente/ACA-Bank/Updater/token', 'win32'), 'C:\\Users\\utente\\ACA-Bank\\Updater\\token');
  assert.equal(dockerHostPath('/host_mnt/d/aca/token', 'win32'), 'D:\\aca\\token');
  assert.equal(dockerHostPath('C:\\aca\\token', 'win32'), 'C:\\aca\\token');
  assert.equal(dockerHostPath('/run/desktop/mnt/host/c/aca/token', 'linux'), '/run/desktop/mnt/host/c/aca/token');
});

test('bind della chiave: accettato lo stesso file anche come lo riporta Docker Desktop, rifiutato un altro file', async () => {
  const h = await harness();
  try {
    const file = h.target.tokenFile;
    h.state.tokenMountSource = process.platform === 'win32'
      ? `/run/desktop/mnt/host/${file[0].toLowerCase()}${file.slice(2).replaceAll('\\', '/')}` : file;
    assert.equal((await h.adapter.inspect()).coreVersion, '2026.9.4');
    h.state.tokenMountSource = process.platform === 'win32' ? '/run/desktop/mnt/host/c/altro/token' : '/altro/token';
    await assert.rejects(h.adapter.inspect());
  } finally { await h.cleanup(); }
});

test('lifecycle banco usa soltanto ACA e backup dati freddo, preserva secret volume e command', async () => {
  const h = await harness();
  try {
    const result = await runUpdateTransaction({ directory: h.target.directory, targetId: h.target.targetId, channel: 'bank', publication, adapter: h.adapter });
    assert.deepEqual(result, { action: 'updated', version: '0.9.73' });
    assert.equal(h.state.localImage, newId); assert.equal(h.state.fingerprint, oldFingerprint); assert.equal(h.state.maintenance.active, false);
    const helpers = h.calls.filter(args => args[0] === 'run');
    assert.ok(helpers.every(args => args.includes('none') && args.some(value => value.includes('src=fixture-data,dst=/aca-data'))));
    assert.ok(helpers.every(args => !args.join(' ').includes('fixture-secret')));
    const compose = h.calls.find(args => args[0] === 'compose');
    assert.ok(compose.includes('--no-deps')); assert.ok(compose.includes('--no-build')); assert.ok(compose.includes('never'));
    assert.equal(compose.at(-1), 'aca'); assert.equal(h.state.clears, 0);
    assert.ok(h.calls.findIndex(args => args[0] === 'stop') < h.calls.findIndex(args => args[0] === 'run'));
    const journal = JSON.parse(await readFile(join(h.target.directory, 'update-journal.json'), 'utf8'));
    assert.equal(journal.backup.image, oldId); assert.equal(journal.phase, 'complete');
  } finally { await h.cleanup(); }
});

test('perdita fingerprint dopo migrazione ripristina immagine locale esatta e soli dati ACA', async () => {
  const h = await harness({ brokenCandidate: true });
  try {
    const result = await runUpdateTransaction({ directory: h.target.directory, targetId: h.target.targetId, channel: 'bank', publication, adapter: h.adapter });
    assert.equal(result.action, 'rolled-back'); assert.equal(h.state.localImage, oldId); assert.equal(h.state.fingerprint, oldFingerprint);
    assert.equal(h.state.restored, true); assert.equal(h.state.clears, 1); assert.equal(h.state.maintenance.active, false);
    assert.ok(h.calls.some(args => args[0] === 'image' && args[1] === 'load'));
    const second = await runUpdateTransaction({ directory: h.target.directory, targetId: h.target.targetId, channel: 'bank', publication, adapter: h.adapter });
    assert.equal(second.reason, 'publication-already-failed');
  } finally { await h.cleanup(); }
});

test('backup corrotto blocca restore prima di cancellare il volume', async () => {
  const h = await harness();
  try {
    const before = await h.adapter.inspect(); await h.adapter.stage(candidate, before);
    await h.adapter.drain({ transactionId: randomUUID() }); const receipt = await h.adapter.backup(before);
    await writeFile(join(h.target.directory, `bank-data-${receipt.id}.tar`), 'truncated fixture');
    assert.equal(await h.adapter.verifyBackup(receipt, before), false);
    await assert.rejects(h.adapter.restore(receipt, before)); assert.equal(h.state.clears, 0);
  } finally { await h.cleanup(); }
});

test('utenti/comandi attivi rinviano; stato check/offline separato senza installare', async () => {
  const h = await harness({ busy: true });
  try {
    const result = await checkBank({ target: h.target, adapter: h.adapter, maintenance: h.maintenance,
      check: async () => ({ action: 'available', publication: candidate }) });
    assert.equal(result.action, 'deferred'); assert.equal(h.state.running, true); assert.equal(h.state.localImage, oldId);
    assert.deepEqual(h.statuses.map(value => value.status), ['checking', 'available', 'updating', 'deferred']);
    assert.ok(!h.calls.some(args => ['stop', 'compose'].includes(args[0])));
    h.statuses.length = 0;
    await checkBank({ target: h.target, adapter: h.adapter, maintenance: h.maintenance,
      check: async () => ({ action: 'keep', reason: 'offline-or-invalid-publication' }) });
    assert.deepEqual(h.statuses.map(value => value.status), ['checking', 'offline']);
  } finally { await h.cleanup(); }
});

test('lock OS rifiuta secondo executor e si libera; recupero committed conserva nuove scritture', async () => {
  const h = await harness();
  try {
    const release = await h.adapter.acquire(); assert.equal(await h.adapter.acquire(), null); await release();
    await runUpdateTransaction({ directory: h.target.directory, targetId: h.target.targetId, channel: 'bank', publication, adapter: h.adapter });
    const journalPath = join(h.target.directory, 'update-journal.json');
    const journal = JSON.parse(await readFile(journalPath, 'utf8')); journal.phase = 'committed';
    await writeFile(journalPath, JSON.stringify(journal)); h.state.fingerprint = hash('legitimate writes after commit');
    const recoveredAdapter = createBankAdapter({ target: h.target, maintenance: h.maintenance, run: h.run, healthTimeoutMs: 0 });
    const outcome = await runUpdateTransaction({ directory: h.target.directory, targetId: h.target.targetId, channel: 'bank', publication: null, adapter: recoveredAdapter });
    assert.equal(outcome.recovered, true); assert.equal(h.state.fingerprint, hash('legitimate writes after commit')); assert.equal(h.state.clears, 0);
  } finally { await h.cleanup(); }
});

test('avvio controller con ACA fermo recupera il journal prima di richiedere HTTP', async () => {
  const h = await harness();
  try {
    const before = await h.adapter.inspect();
    const transactionId = randomUUID();
    h.state.maintenance = { active: true, transactionId }; h.state.running = false;
    await writeFile(join(h.target.directory, 'update-journal.json'), JSON.stringify({ schema: 1, targetId: h.target.targetId,
      phase: 'backing-up', transactionId, before, publication: candidate, backup: null }));
    const messages = [];
    const outcome = await monitorBank({ target: h.target, maintenance: h.maintenance, adapter: h.adapter, log: value => messages.push(value),
      check: async () => ({ action: 'keep', reason: 'offline-or-invalid-publication' }) });
    assert.equal(outcome.action, 'keep'); assert.equal(h.state.running, true); assert.equal(h.state.maintenance.active, false);
    assert.ok(h.calls.some(args => args[0] === 'start')); assert.equal(h.state.clears, 0);
    assert.equal(JSON.parse(await readFile(join(h.target.directory, 'update-journal.json'), 'utf8')).phase, 'cancelled');
    assert.equal(messages.length, 1);
  } finally { await h.cleanup(); }
});
