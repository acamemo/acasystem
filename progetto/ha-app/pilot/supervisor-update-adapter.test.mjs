import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { runUpdateTransaction } from './update-transaction.mjs';
import { createAcaMaintenanceClient, createSupervisorUpdateAdapter, createSupervisorUpdateClient } from './supervisor-update-adapter.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const slug = 'fixture_acasystem'; const targetId = 'fixture-target';
const oldImage = 'ghcr.io/acamemo/acasystem@sha256:' + '1'.repeat(64);
const newImage = 'ghcr.io/acamemo/acasystem@sha256:' + '2'.repeat(64);
const oldVersion = '0.9.72'; const oldAppVersion = '0.9.72.99';
const archive = Buffer.from('fixture-bundle-bytes');
const bundle = version => ({ schema: 1, version, minServer: version, minShell: '0.1.0', archive: { name: 'aca.zip', sha256: sha(archive), size: archive.length } });
const distribution = { schema: 1, channel: 'stable', version: '0.9.73', appVersion: '0.9.73', tag: 'v0.9.73', image: newImage,
  bundle: bundle('0.9.73'), compatibility: { haos: { min: '18.4', maxExclusive: '19.0' }, core: { min: '2026.9.0', maxExclusive: '2026.10.0' },
    supervisor: { min: '2026.9.0', maxExclusive: '2026.12.0' }, upgradeFrom: { min: '0.9.34', maxExclusive: '0.9.74' } } };
const publication = { release: { tag_name: distribution.tag, draft: false, prerelease: false }, distribution };

function paxRecord(key, value) {
  const body = `${key}=${value}\n`; let length = Buffer.byteLength(body) + 2;
  while (String(length).length + 1 + Buffer.byteLength(body) !== length) length = String(length).length + 1 + Buffer.byteLength(body);
  return `${length} ${body}`;
}
function tar(files, pax = {}) {
  const parts = [];
  for (const [name, input] of Object.entries(files)) {
    if (pax[name]) {
      const entry = tar({ '././@PaxHeader': pax[name] }); entry[156] = 120; entry.fill(32, 148, 156);
      entry.write(entry.subarray(0, 512).reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\0 ', 148, 8);
      parts.push(entry.subarray(0, entry.length - 1024));
    }
    const data = Buffer.isBuffer(input) ? input : Buffer.from(input);
    const header = Buffer.alloc(512); header.write(name);
    for (const [value, start, size] of [[0o600, 100, 8], [0, 108, 8], [0, 116, 8], [data.length, 124, 12], [0, 136, 12]]) {
      header.write(value.toString(8).padStart(size - 1, '0') + '\0', start, size);
    }
    header.fill(32, 148, 156); header[156] = 48; header.write('ustar\0', 257); header.write('00', 263);
    header.write(header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\0 ', 148, 8);
    parts.push(header, data, Buffer.alloc((512 - data.length % 512) % 512));
  }
  return Buffer.concat([...parts, Buffer.alloc(1024)]);
}
function tarFiles(bytes) {
  const files = new Map(); let offset = 0;
  while (offset + 512 <= bytes.length && bytes[offset]) {
    const header = bytes.subarray(offset, offset + 512); offset += 512;
    const name = header.subarray(0, 100).toString().replace(/\0.*$/s, '').replace(/^\.\//, '');
    const size = parseInt(header.subarray(124, 136).toString().replace(/\0.*$/s, ''), 8);
    files.set(name, bytes.subarray(offset, offset + size)); offset += Math.ceil(size / 512) * 512;
  }
  return files;
}

// HTTP vero su loopback e SQLite/file temporanei. Supervisor, immagini e lifecycle
// sono un server fixture: nessuna lettura di Docker, HAOS, volumi o dati del banco.
async function fixture(t, failures = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'aca-supervisor-adapter-')); const dataPath = join(directory, 'data.db');
  const db = new DatabaseSync(dataPath);
  db.exec("CREATE TABLE accounts(id TEXT PRIMARY KEY); INSERT INTO accounts VALUES('fixture-user'); CREATE TABLE profiles(id TEXT PRIMARY KEY); INSERT INTO profiles VALUES('fixture-profile'); CREATE TABLE drafts(id TEXT PRIMARY KEY); INSERT INTO drafts VALUES('fixture-draft'); PRAGMA user_version=1"); db.close();
  const original = await readFile(dataPath); const calls = []; const backups = new Map();
  let installed = oldVersion; let appVersion = oldAppVersion; let image = oldImage; let started = true;
  let maintenance = { active: false, transactionId: null }; let catalog = distribution.appVersion; let installCount = 0; let restoreCount = 0;
  const fingerprint = () => {
    const source = new DatabaseSync(dataPath, { readOnly: true });
    try { return sha(JSON.stringify(['accounts', 'profiles', 'drafts'].map(name => source.prepare('SELECT * FROM ' + name + ' ORDER BY id').all()))); }
    finally { source.close(); }
  };
  const appState = () => ({ targetId, version: installed, appVersion, bundle: bundle(installed), maintenance,
    activity: { pendingWrites: 0, activeCommands: 0, activeEditors: failures.busy ? 1 : 0, activeConnections: failures.connected ? 1 : 0 }, dataFingerprint: fingerprint() });
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://fixture'); const path = url.pathname;
      const chunks = []; for await (const chunk of req) chunks.push(chunk); const bytes = Buffer.concat(chunks);
      const body = req.headers['content-type']?.startsWith('application/json') && bytes.length ? JSON.parse(bytes.toString()) : null;
      calls.push({ path, method: req.method, body });
      const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
      const ok = data => json({ result: 'ok', data });
      if (path.startsWith('/supervisor/')) {
        assert.equal(req.headers.authorization, 'Bearer fixture-supervisor-token');
        const endpoint = path.slice('/supervisor'.length);
        if (endpoint === '/store/reload') return ok({});
        if (endpoint === '/addons/self/info') return ok({ slug: failures.self ? slug : 'fixture_executor', hassio_role: 'manager' });
        if (endpoint === `/addons/${slug}/info`) return ok({ slug, version: appVersion, state: started ? 'started' : failures.stoppedInfoError ? 'error' : 'stopped' });
        if (endpoint === '/os/info') return ok({ version: '18.4' });
        if (endpoint === '/core/info') return ok({ version: '2026.9.4' });
        if (endpoint === '/supervisor/info') return ok({ version: '2026.9.0' });
        if (endpoint === `/store/addons/${slug}`) return ok({ slug, version_latest: catalog, available: true, build: false });
        if (endpoint === `/store/addons/${slug}/availability`) return ok({});
        if (endpoint === `/addons/${slug}/stop`) { started = false; return ok({}); }
        if (endpoint === `/addons/${slug}/start`) { started = true; return ok({}); }
        if (endpoint === '/backups/new/partial') {
          assert.equal(started, false); assert.deepEqual(body.addons, [slug]); assert.equal(body.homeassistant, false); assert.deepEqual(body.folders, []);
          const metadata = { version: 2, slug: 'abc12345', type: 'partial', name: 'fixture', supervisor_version: '2026.9.0',
            date: '2026-11-16T00:00:00Z', homeassistant: null, addons: [{ slug, name: 'ACA', version: appVersion, size: 1 }], folders: [],
            repositories: ['https://fixture.invalid/private'], protected: false, compressed: false, docker: { secret: 'fixture-private-must-not-leak' } };
          const savedDatabase = failures.corruptDatabase ? Buffer.alloc(200) : await readFile(dataPath);
          if (failures.corruptBody) savedDatabase.fill(255, 100, Math.min(4096, savedDatabase.length));
          const inner = tar({ './addon.json': JSON.stringify({ version: appVersion, state: failures.runningBackup ? 'started' : 'stopped' }),
            'data/app/tunet.db': savedDatabase,
            ...(!failures.missingCredential ? { 'data/update-secret/token': 'd'.repeat(64) + '\n',
              'data/update-secret/target.json': JSON.stringify({ schema: 1, enabled: true, targetId: failures.foreignIdentity ? 'another-target' : targetId }) } : {}) });
          const pax = failures.timestampPax || failures.paxOverride ? { [`./${slug}.tar`]: paxRecord(failures.paxOverride ?? 'mtime', failures.paxOverride ? '../outside' : '1794844991.4575002') } : {};
          const outer = tar({ './backup.json': JSON.stringify(metadata), [`./${slug}.tar`]: inner,
            './supervisor.tar': tar({ 'docker.json': '{"secret":"fixture-private-must-not-leak"}' }) }, pax);
          backups.set(metadata.slug, failures.truncated ? outer.subarray(0, outer.length - 100) : outer);
          if (failures.race) catalog = '0.9.74';
          return ok({ slug: metadata.slug, job_id: 'fixture-job' });
        }
        if (endpoint === '/backups/new/upload') {
          const boundary = /boundary=(.*)$/.exec(req.headers['content-type'])[1];
          const begin = bytes.indexOf('\r\n\r\n') + 4; const end = bytes.lastIndexOf('\r\n--' + boundary);
          const uploaded = bytes.subarray(begin, end); const files = tarFiles(uploaded); const metadata = JSON.parse(files.get('backup.json'));
          assert.deepEqual(metadata.repositories, []); assert.equal(files.has('supervisor.tar'), false); assert.equal(metadata.docker, undefined);
          assert.doesNotMatch(uploaded.toString('latin1'), /fixture-private-must-not-leak/);
          backups.set(metadata.slug, uploaded); return ok({ slug: metadata.slug });
        }
        const match = /^\/backups\/([a-z0-9-]+)\/(info|download|restore\/partial)$/.exec(endpoint);
        if (match) {
          const saved = backups.get(match[1]); if (!saved) return json({}, 404);
          const metadata = JSON.parse(tarFiles(saved).get('backup.json'));
          if (match[2] === 'info') return ok({ ...metadata, size_bytes: saved.length });
          if (match[2] === 'download') { res.writeHead(200, { 'Content-Type': 'application/x-tar' }); res.end(failures.remoteCorrupt && match[1] !== 'abc12345' ? Buffer.alloc(saved.length) : saved); return; }
          assert.equal(started, false); assert.deepEqual(body, { addons: [slug], folders: [], homeassistant: false, location: null, background: false });
          restoreCount++;
          if (failures.restore) return json({ result: 'error', message: 'fixture-private-must-not-leak' }, 400);
          const appFiles = tarFiles(tarFiles(saved).get(slug + '.tar'));
          assert.equal(appFiles.get('data/update-secret/token').toString().trim(), 'd'.repeat(64));
          assert.equal(JSON.parse(appFiles.get('data/update-secret/target.json')).targetId, targetId);
          const data = appFiles.get('data/app/tunet.db');
          await writeFile(dataPath, data); installed = oldVersion; appVersion = oldAppVersion; image = failures.restoreDigest ? newImage : oldImage;
          return ok({ job_id: 'fixture-restore' });
        }
        if (endpoint === `/store/addons/${slug}/update`) {
          installCount++; assert.equal(started, false); assert.deepEqual(body, { backup: false, background: false });
          installed = distribution.version; appVersion = distribution.appVersion; image = failures.installDigest ? oldImage : newImage;
          const migrated = new DatabaseSync(dataPath); migrated.exec('PRAGMA user_version=2');
          if (failures.dataLoss) migrated.exec('DELETE FROM accounts');
          migrated.close();
          if (failures.update) return json({ result: 'error', message: 'fixture-private-must-not-leak' }, 400);
          return ok({});
        }
        return json({}, 404);
      }
      if (!started) return json({}, 503);
      if (path.startsWith('/api/internal/update/')) {
        assert.equal(req.headers.authorization, 'Bearer fixture-aca-token');
        if (path.endsWith('/state')) return json(appState());
        if (path.endsWith('/status')) return json({ saved: true });
        assert.equal(body.targetId, targetId); assert.match(body.transactionId, /^[a-f0-9-]{36}$/);
        if (path.endsWith('/drain')) {
          if (failures.busy || failures.connected) return json({}, 409);
          maintenance = { active: true, transactionId: body.transactionId }; return json(appState());
        }
        if (path.endsWith('/resume')) {
          if (maintenance.active) assert.equal(body.transactionId, maintenance.transactionId);
          maintenance = { active: false, transactionId: null };
          if (failures.resumeOnce) { failures.resumeOnce = false; return json({}, 500); }
          return json(appState());
        }
      }
      assert.equal(req.headers.authorization, undefined);
      if (path === '/api/health') return json({ status: failures.health && installed !== oldVersion ? 'error' : 'ok', version: installed });
      if (path === '/api/client-bundle/manifest') return json(bundle(installed));
      if (path === '/api/client-bundle/archive') { res.end(failures.bundle && installed !== oldVersion ? Buffer.from('corrupted') : archive); return; }
      json({}, 404);
    } catch (error) { res.writeHead(500); res.end('fixture error'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const baseUrl = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const supervisor = createSupervisorUpdateClient({ token: 'fixture-supervisor-token', timeoutMs: 1000,
    fetcher: (url, init) => fetch(baseUrl + '/supervisor' + new URL(url).pathname, init) });
  const maintenanceClient = createAcaMaintenanceClient({ baseUrl, token: 'fixture-aca-token', timeoutMs: 1000 });
  const authority = { inspect: async () => ({ image, ...(!failures.noRunningProof ? { running: failures.engineStillRunning ? true : started } : {}) }), stage: async ({ before, candidate }) => ({ exactRollback: true, previousImage: before.image, candidateImage: candidate.image }),
    prepareRollback: async () => { if (failures.imagePreparation) throw new Error('fixture-private-must-not-leak'); } };
  const makeAdapter = (extra = {}) => createSupervisorUpdateAdapter({ directory, targetId, slug, supervisor, maintenance: maintenanceClient,
    imageAuthority: authority, shellVersion: '0.1.0', maxBackupBytes: 1024 * 1024, healthTimeoutMs: 20, pollIntervalMs: 1, ...extra });
  const run = (extra = {}) => runUpdateTransaction({ directory, targetId, channel: 'stable', publication, adapter: makeAdapter(extra) });
  return { directory, dataPath, original, calls, backups, run, makeAdapter, authority, maintenanceClient,
    state: () => ({ installed, image, started, maintenance, installCount, restoreCount }),
    journal: async () => JSON.parse(await readFile(join(directory, 'update-journal.json'), 'utf8')) };
}

test('protocollo Supervisor HTTP completo: backup freddo ACA isolato, update, health/bundle e dati reali conservati', async t => {
  const f = await fixture(t); assert.deepEqual(await f.run(), { action: 'updated', version: '0.9.73' });
  assert.equal((await f.journal()).phase, 'complete'); assert.equal(f.state().maintenance.active, false);
  const db = new DatabaseSync(f.dataPath, { readOnly: true });
  assert.equal(db.prepare('SELECT id FROM accounts').get().id, 'fixture-user'); assert.equal(db.prepare('SELECT id FROM drafts').get().id, 'fixture-draft'); db.close();
  const files = await readdir(f.directory); assert.equal(files.filter(name => name.endsWith('.tar')).length, 1); assert.ok(!files.some(name => name.endsWith('.partial')));
  assert.equal(f.state().installCount, 1); assert.equal((await f.run()).action, 'keep');
  assert.doesNotMatch(JSON.stringify(await f.journal()), /fixture-private|fixture-user|fixture-profile|fixture-draft|token/);
});

test('Supervisor error dopo stop con container assente usa la prova Engine prima di backup e avvio', async t => {
  const f = await fixture(t, { stoppedInfoError: true });
  assert.equal((await f.run()).action, 'updated');
  assert.equal(f.state().started, true); assert.equal(f.state().maintenance.active, false);
});

test('stato Supervisor stopped non sostituisce prova Engine assente o ancora running', async t => {
  for (const failure of [{ noRunningProof: true }, { engineStillRunning: true }]) {
    const f = await fixture(t, failure); await f.run();
    assert.equal(f.state().installCount, 0);
    assert.ok(!f.calls.some(call => call.path === '/backups/new/partial'));
  }
});

test('PAX timestamp nativo preservato nel backup circoscritto; override path/size rifiutati', async t => {
  const f = await fixture(t, { timestampPax: true }); assert.equal((await f.run()).action, 'updated');
  for (const paxOverride of ['path', 'size']) {
    const invalid = await fixture(t, { paxOverride }); await invalid.run();
    assert.equal(invalid.state().installCount, 0); assert.equal(invalid.state().started, true);
  }
});

test('health, bundle, migrazione o digest falliti ripristinano immagine e byte SQLite prima di riaprire', async t => {
  for (const failure of [{ health: true }, { bundle: true }, { update: true }, { installDigest: true }, { dataLoss: true }]) {
    const f = await fixture(t, failure); assert.equal((await f.run()).action, 'rolled-back');
    assert.deepEqual(await readFile(f.dataPath), f.original); assert.equal(f.state().image, oldImage);
    assert.equal(f.state().maintenance.active, false); assert.equal(f.state().restoreCount, 1);
    assert.equal((await f.run()).reason, 'publication-already-failed');
  }
});

test('backup troncato, DB non SQLite, stato backup running o copia Supervisor diversa impediscono install', async t => {
  for (const failure of [{ truncated: true }, { corruptDatabase: true }, { corruptBody: true }, { runningBackup: true }, { remoteCorrupt: true }, { missingCredential: true }, { foreignIdentity: true }]) {
    const f = await fixture(t, failure); assert.equal((await f.run()).action, 'recovery-required');
    assert.equal(f.state().installCount, 0); assert.deepEqual(await readFile(f.dataPath), f.original);
    assert.equal(f.state().maintenance.active, false);
  }
});

test('self update, utenti/editor/connessioni attivi e provider immagini assente non fermano ACA', async t => {
  for (const failure of [{ self: true }, { busy: true }, { connected: true }]) {
    const f = await fixture(t, failure); await f.run(); assert.equal(f.state().installCount, 0);
    assert.ok(!f.calls.some(call => call.path.endsWith('/stop')));
  }
  const f = await fixture(t); await f.run({ imageAuthority: undefined });
  assert.ok(!f.calls.some(call => call.method === 'POST')); assert.equal(f.state().started, true);
});

test('catalogo cambiato tra stage e install non esegue una versione diversa e recupera backup esatto', async t => {
  const f = await fixture(t, { race: true }); assert.equal((await f.run()).action, 'rolled-back');
  assert.equal(f.state().installCount, 0); assert.equal(f.state().restoreCount, 1); assert.deepEqual(await readFile(f.dataPath), f.original);
});

test('restore o digest precedente non verificati mantengono manutenzione senza avviare immagine errata', async t => {
  for (const failure of [{ update: true, restore: true }, { update: true, restoreDigest: true }, { update: true, imagePreparation: true }]) {
    const f = await fixture(t, failure); const result = await f.run(); assert.equal(result.action, 'recovery-required');
    assert.equal(f.state().maintenance.active, true); assert.equal(f.state().started, false);
    assert.doesNotMatch(JSON.stringify(result), /private|token/);
  }
});

test('risposta resume persa dopo commit recupera senza restore e senza perdere scritture nuove', async t => {
  const f = await fixture(t, { resumeOnce: true }); assert.equal((await f.run()).action, 'recovery-required');
  assert.equal((await f.journal()).phase, 'committed');
  const db = new DatabaseSync(f.dataPath); db.exec("INSERT INTO drafts VALUES('fixture-new-draft')"); db.close();
  const afterCommit = await readFile(f.dataPath); assert.equal((await f.run()).action, 'updated');
  assert.deepEqual(await readFile(f.dataPath), afterCommit); assert.equal(f.state().restoreCount, 0);
});

test('un nuovo processo riprende il journal di recupero usando backup e manutenzione persistenti', async t => {
  const failures = { update: true, restore: true }; const f = await fixture(t, failures);
  assert.equal((await f.run()).action, 'recovery-required'); assert.equal((await f.journal()).phase, 'restoring');
  const transactionId = (await f.journal()).transactionId; failures.restore = false;
  assert.equal((await f.run()).action, 'rolled-back'); assert.deepEqual(await readFile(f.dataPath), f.original);
  assert.equal((await f.journal()).transactionId, transactionId); assert.equal(f.state().maintenance.active, false);
  assert.equal(f.state().installCount, 1);
});

test('lock TCP executor impedisce processi concorrenti e si libera chiudendo il listener', async t => {
  const f = await fixture(t); const listener = createServer(); await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  const first = f.makeAdapter({ lockPort: port }); const second = f.makeAdapter({ lockPort: port });
  const release = await first.acquire(); t.after(release); assert.equal(await second.acquire(), null);
  await release(); const next = await second.acquire(); assert.equal(typeof next, 'function'); await next();
});

test('il sistema libera il lock anche dopo morte del processo executor', async t => {
  const f = await fixture(t); const listener = createServer(); await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  const moduleUrl = new URL('./supervisor-update-adapter.mjs', import.meta.url).href;
  const options = { directory: f.directory, targetId, slug, shellVersion: '0.1.0', lockPort: port };
  const script = `const { createSupervisorUpdateAdapter } = await import(${JSON.stringify(moduleUrl)}); await createSupervisorUpdateAdapter(${JSON.stringify(options)}).acquire(); process.stdout.write('ready');`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Fixture lock non pronta')), 5000);
    child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    child.once('error', reject);
  });
  assert.equal(await f.makeAdapter({ lockPort: port }).acquire(), null);
  const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited;
  const release = await f.makeAdapter({ lockPort: port }).acquire(); assert.equal(typeof release, 'function'); await release();
});

test('lo stato della verifica usa solo il canale ACA interno autenticato', async t => {
  const f = await fixture(t); await f.maintenanceClient.status({ status: 'checking', version: oldVersion, checkedAt: new Date().toISOString() });
  assert.equal(f.calls.at(-1).path, '/api/internal/update/status');
  assert.equal(f.calls.at(-1).body.status, 'checking');
});
