import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, openAsBlob } from 'node:fs';
import { mkdir, mkdtemp, open, rename, rm, rmdir, statfs } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';
import { isDeepStrictEqual } from 'node:util';
import { parseDistribution } from './update-policy.mjs';

const slugPattern = /^[a-z0-9][a-z0-9_-]{1,99}$/;
const digestPattern = /^ghcr\.io\/acamemo\/acasystem@sha256:[a-f0-9]{64}$/;
const fingerprintPattern = /^[a-f0-9]{64}$/;
const transactionPattern = /^[a-f0-9-]{36}$/;
const fail = () => { throw new Error('Verifica updater non superata'); };
const equal = isDeepStrictEqual;

async function consume(body, limit, output) {
  if (!body) fail();
  const hash = createHash('sha256'); let size = 0;
  for await (const chunk of body) {
    size += chunk.length;
    if (size > limit) fail();
    hash.update(chunk);
    if (output) await output.writeFile(chunk);
  }
  return { sha256: hash.digest('hex'), size };
}
async function jsonResponse(response) {
  if (!response.ok || !response.body) fail();
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length; if (size > 64 * 1024) fail(); chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(); }
}

/** URL fisso e redirect vietati: il token Supervisor non segue URL del catalogo o della release. */
export function createSupervisorUpdateClient({ token, fetcher = fetch, timeoutMs = 120000 } = {}) {
  if (typeof token !== 'string' || !token || /[\r\n]/.test(token)) fail();
  const request = async (path, body) => {
    try {
      return await fetcher(`http://supervisor${path}`, { method: body === undefined ? 'GET' : 'POST',
        redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Bearer ${token}`, ...(body === undefined || body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) });
    } catch { fail(); }
  };
  const call = async (path, body) => {
    const value = await jsonResponse(await request(path, body));
    if (value?.result !== 'ok' || !value.data) fail();
    return value.data;
  };
  const app = (slug) => { if (!slugPattern.test(slug)) fail(); return slug; };
  const backup = (id) => { if (!/^[a-z0-9-]{1,100}$/.test(id)) fail(); return id; };
  return {
    self: () => call('/addons/self/info'),
    info: slug => call(`/addons/${app(slug)}/info`),
    component: name => { if (!['os', 'core', 'supervisor'].includes(name)) fail(); return call(`/${name}/info`); },
    store: slug => call(`/store/addons/${app(slug)}`),
    reloadStore: () => call('/store/reload', {}),
    available: slug => call(`/store/addons/${app(slug)}/availability`),
    stop: slug => call(`/addons/${app(slug)}/stop`, {}),
    start: slug => call(`/addons/${app(slug)}/start`, {}),
    update: slug => call(`/store/addons/${app(slug)}/update`, { backup: false, background: false }),
    newBackup: slug => call('/backups/new/partial', { name: 'ACA prima aggiornamento', addons: [app(slug)],
      folders: [], homeassistant: false, compressed: false, password: null, location: null, background: false }),
    backupInfo: id => call(`/backups/${backup(id)}/info`),
    download: async id => { const result = await request(`/backups/${backup(id)}/download`); if (!result.ok) fail(); return result; },
    upload: async path => {
      try {
        const form = new FormData(); form.append('file', await openAsBlob(path), 'aca-scoped.tar');
        return await call('/backups/new/upload', form);
      } catch { fail(); }
    },
    restore: (id, slug) => call(`/backups/${backup(id)}/restore/partial`, {
      addons: [app(slug)], folders: [], homeassistant: false, location: null, background: false }),
  };
}

/** Il segreto ACA e distinto dal Supervisor; le risposte non sono mai copiate negli errori. */
export function createAcaMaintenanceClient({ baseUrl, token, fetcher = fetch, timeoutMs = 15000 } = {}) {
  let origin;
  try {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) fail();
    origin = url.origin;
  } catch { fail(); }
  if (typeof token !== 'string' || !token || /[\r\n]/.test(token)) fail();
  const request = async (path, body, authenticated = true) => {
    try {
      return await fetcher(origin + path, { method: body === undefined ? 'GET' : 'POST', redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs), headers: {
          ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    } catch { fail(); }
  };
  const state = async () => jsonResponse(await request('/api/internal/update/state'));
  return {
    state,
    drain: async body => {
      const response = await request('/api/internal/update/drain', body);
      if (response.status === 409) return false;
      if (!response.ok) fail(); return true;
    },
    resume: async body => { if (!(await request('/api/internal/update/resume', body)).ok) fail(); },
    status: async body => { if (!(await request('/api/internal/update/status', body)).ok) fail(); },
    inspect: async () => {
      const status = await state();
      const health = await jsonResponse(await request('/api/health', undefined, false));
      if (health?.status !== 'ok' || health.version !== status.version) fail();
      const bundle = await jsonResponse(await request('/api/client-bundle/manifest', undefined, false));
      if (!equal(bundle, status.bundle) || !/^[a-f0-9]{64}$/.test(bundle?.archive?.sha256 ?? '') ||
        !Number.isSafeInteger(bundle.archive.size) || bundle.archive.size < 1 || bundle.archive.size > 200 * 1024 * 1024) fail();
      const archive = await request('/api/client-bundle/archive', undefined, false);
      if (!archive.ok) fail();
      const actual = await consume(archive.body, bundle.archive.size);
      if (actual.size !== bundle.archive.size || actual.sha256 !== bundle.archive.sha256) fail();
      return status;
    },
  };
}

async function verifySqliteSnapshot(file, entries) {
  const directory = await mkdtemp(join(tmpdir(), 'aca-sqlite-backup-'));
  try {
    // Copie di soli due nomi fissi: nessun percorso del tar viene estratto sul filesystem.
    for (const [name, entry] of entries) {
      const output = await open(join(directory, name), 'wx', 0o600);
      try {
        let copied = 0; const buffer = Buffer.alloc(65536);
        while (copied < entry.size) {
          const { bytesRead } = await file.read(buffer, 0, Math.min(buffer.length, entry.size - copied), entry.offset + copied);
          if (!bytesRead) return false;
          await output.writeFile(buffer.subarray(0, bytesRead)); copied += bytesRead;
        }
      } finally { await output.close(); }
    }
    const database = new DatabaseSync(join(directory, 'tunet.db'), { readOnly: true });
    try { const result = database.prepare('PRAGMA integrity_check').all(); return result.length === 1 && result[0].integrity_check === 'ok'; }
    finally { database.close(); }
  } catch { return false; }
  finally {
    // Solo la directory appena creata e i nomi SQLite noti, senza cancellazioni ricorsive.
    for (const name of ['tunet.db', 'tunet.db-wal', 'tunet.db-shm', 'tunet.db-journal']) await rm(join(directory, name), { force: true });
    await rmdir(directory);
  }
}

async function timestampPax(file, offset, size) {
  if (size < 1 || size > 64 * 1024) return false;
  const bytes = Buffer.alloc(size); await file.read(bytes, 0, size, offset);
  let consumed = 0;
  while (consumed < bytes.length) {
    const space = bytes.indexOf(32, consumed); if (space < 0) return false;
    const length = Number(bytes.subarray(consumed, space).toString());
    if (!Number.isSafeInteger(length) || length <= space - consumed || consumed + length > bytes.length ||
      !/^(mtime|atime|ctime)=-?\d+(\.\d+)?\n$/.test(bytes.subarray(space + 1, consumed + length).toString())) return false;
    consumed += length;
  }
  return true;
}

// Header/checksum delimitano il backup; SQLite e WAL sono verificati in una copia privata.
async function verifyAppArchive(file, start, length, appVersion, targetId) {
  let offset = start; let metadata = false; let database = false; let credential = false; let identity = false;
  const privateFiles = new Set();
  const sqliteFiles = new Map();
  while (offset + 512 <= start + length) {
    const header = Buffer.alloc(512); await file.read(header, 0, 512, offset); offset += 512;
    if (header.every(byte => byte === 0)) return metadata && database && credential && identity && start + length - offset >= 512 && await verifySqliteSnapshot(file, sqliteFiles);
    const field = (from, to) => header.subarray(from, to).toString('utf8').replace(/\0.*$/s, '');
    const octal = (from, to) => /^[0-7]+$/.test(field(from, to).trim()) ? parseInt(field(from, to).trim(), 8) : NaN;
    const size = octal(124, 136); const name = field(0, 100).replace(/^\.\//, '');
    if (!Number.isSafeInteger(size) || size < 0 || offset + size > start + length ||
      octal(148, 156) !== header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0) ||
      name.startsWith('/') || name.split('/').includes('..') || /[\\:]/.test(name) || field(345, 500) ||
      ![0, 48, 53, 120].includes(header[156])) return false;
    if (header[156] === 120 && !await timestampPax(file, offset, size)) return false;
    if (name === 'addon.json' && [0, 48].includes(header[156])) {
      if (metadata || size > 512 * 1024) return false;
      const bytes = Buffer.alloc(size); await file.read(bytes, 0, size, offset);
      try { const value = JSON.parse(bytes.toString('utf8')); metadata = value.version === appVersion && value.state === 'stopped'; }
      catch { return false; }
    }
    if (name === 'data/app/tunet.db' && [0, 48].includes(header[156])) {
      if (database || size < 100) return false;
      const magic = Buffer.alloc(16); await file.read(magic, 0, 16, offset);
      database = magic.equals(Buffer.from('SQLite format 3\0'));
    }
    if (['data/app/tunet.db', 'data/app/tunet.db-wal'].includes(name) && [0, 48].includes(header[156])) {
      const local = name.slice('data/app/'.length); if (sqliteFiles.has(local)) return false;
      sqliteFiles.set(local, { offset, size });
    }
    if (['data/update-secret/token', 'data/update-secret/target.json'].includes(name) && [0, 48].includes(header[156])) {
      const mode = octal(100, 108);
      if (size > 8192 || privateFiles.has(name) || !Number.isInteger(mode) || (mode & 0o077)) return false;
      privateFiles.add(name);
      const bytes = Buffer.alloc(size); await file.read(bytes, 0, size, offset);
      if (name.endsWith('/token')) credential = /^[a-f0-9]{64}$/.test(bytes.toString('utf8').trim());
      else {
        try { const value = JSON.parse(bytes.toString('utf8')); identity = value.schema === 1 && value.enabled === true && value.targetId === targetId; }
        catch { return false; }
      }
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return false;
}

async function inspectArchive(path, slug, appVersion, expectedSize, scoped = true, targetId) {
  const file = await open(path, 'r'); let offset = 0; let metadata; let component = false; let paxStart;
  const names = new Set();
  try {
    const length = (await file.stat()).size;
    if (length !== expectedSize || length % 512 || length < 1536) return false;
    while (offset + 512 <= length) {
      const header = Buffer.alloc(512); await file.read(header, 0, 512, offset); offset += 512;
      if (header.every(byte => byte === 0)) {
        if (length - offset < 512 || paxStart !== undefined) return false;
        while (offset < length) {
          const end = Buffer.alloc(Math.min(65536, length - offset)); await file.read(end, 0, end.length, offset);
          if (!end.every(byte => byte === 0)) return false; offset += end.length;
        }
        return metadata && component ? { metadata, component } : false;
      }
      const string = (from, to) => header.subarray(from, to).toString('utf8').replace(/\0.*$/s, '');
      const name = string(0, 100).replace(/^\.\//, ''); const number = (from, to) => {
        const value = string(from, to).trim(); return /^[0-7]+$/.test(value) ? parseInt(value, 8) : NaN;
      };
      const size = number(124, 136); const checksum = number(148, 156);
      const actual = header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
      if (actual !== checksum || !Number.isSafeInteger(size) || size < 1 || string(345, 500) ||
        ![0, 48, 120].includes(header[156]) || offset + size > length ||
        name.startsWith('/') || name.split('/').includes('..') || /[\\:]/.test(name)) return false;
      if (header[156] === 120) {
        if (paxStart !== undefined || !await timestampPax(file, offset, size)) return false;
        paxStart = offset - 512; offset += Math.ceil(size / 512) * 512; continue;
      }
      if (names.has(name)) return false;
      names.add(name);
      if (name === 'backup.json') {
        if (size > 64 * 1024) return false;
        const bytes = Buffer.alloc(size); await file.read(bytes, 0, size, offset);
        try { metadata = JSON.parse(bytes.toString('utf8')); } catch { return false; }
        if (metadata?.type !== 'partial' || metadata.protected !== false || metadata.compressed !== false ||
          metadata.homeassistant !== null || !Array.isArray(metadata.folders) || metadata.folders.length ||
          metadata.addons?.length !== 1 || metadata.addons[0].slug !== slug || metadata.addons[0].version !== appVersion ||
          (scoped && (metadata.repositories?.length !== 0 || metadata.docker))) return false;
      } else if (name === `${slug}.tar`) {
        if (size < 1024 || !await verifyAppArchive(file, offset, size, appVersion, targetId)) return false;
        component = { start: paxStart ?? offset - 512, end: offset + Math.ceil(size / 512) * 512 - 1 };
      } else if (name === 'supervisor.tar' && !scoped) { /* Escluso dal sottoinsieme di recupero. */ }
      else return false;
      paxStart = undefined; offset += Math.ceil(size / 512) * 512;
    }
    return false;
  } finally { await file.close(); }
}

async function scopeArchive(source, destination, slug, before, size, targetId) {
  const contents = await inspectArchive(source, slug, before.appVersion, size, false, targetId);
  if (!contents || ![1, 2].includes(contents.metadata.version) || typeof contents.metadata.supervisor_version !== 'string') fail();
  const metadata = Buffer.from(JSON.stringify({ version: contents.metadata.version, slug: randomUUID().replaceAll('-', '').slice(0, 16),
    type: 'partial', name: 'ACA recupero isolato', date: new Date().toISOString(), supervisor_version: contents.metadata.supervisor_version,
    protected: false, compressed: false, homeassistant: null, folders: [], repositories: [], extra: {},
    addons: [{ slug, name: 'ACA', version: before.appVersion, size: contents.metadata.addons[0].size ?? 0 }] }));
  const header = Buffer.alloc(512); header.write('./backup.json');
  for (const [value, start, length] of [[0o600, 100, 8], [0, 108, 8], [0, 116, 8], [metadata.length, 124, 12], [0, 136, 12]]) {
    header.write(value.toString(8).padStart(length - 1, '0') + '\0', start, length);
  }
  header.fill(32, 148, 156); header[156] = 48; header.write('ustar\0', 257); header.write('00', 263);
  header.write(header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\0 ', 148, 8);
  const output = await open(destination, 'wx', 0o600);
  try {
    await output.writeFile(header); await output.writeFile(metadata);
    await output.writeFile(Buffer.alloc((512 - metadata.length % 512) % 512));
    for await (const chunk of createReadStream(source, contents.component)) await output.writeFile(chunk);
    await output.writeFile(Buffer.alloc(1024)); await output.sync();
  } finally { await output.close(); }
  return JSON.parse(metadata.toString('utf8')).slug;
}

/**
 * Executor ESTERNO all'app ACA. Nessuna configurazione ACA viene elevata a manager.
 * La Supervisor API usa il catalogo corrente, non il digest richiesto. Il backup di
 * un'immagine registry non incorpora l'immagine: imageAuthority e quindi obbligatoria.
 * Deve osservare Docker realmente, conservare immagini esatte e predisporre il tag
 * precedente PRIMA del restore. Non esiste provider permissivo o basato su un env digest.
 * Fonti consultate 2026-11-16:
 * https://contributors.home-assistant.io/apps/supervisor-api/store/
 * https://contributors.home-assistant.io/apps/supervisor-api/backups/
 * https://raw.githubusercontent.com/home-assistant/supervisor/main/supervisor/apps/app.py
 */
export function createSupervisorUpdateAdapter({ directory, targetId, slug, supervisor, maintenance,
  imageAuthority, shellVersion, maxBackupBytes = 1024 * 1024 * 1024, healthTimeoutMs = 60000,
  pollIntervalMs = 1000, lockPort } = {}) {
  if (typeof directory !== 'string' || !/^[A-Za-z0-9-]{1,100}$/.test(targetId ?? '') || !slugPattern.test(slug ?? '') ||
    !/^\d+\.\d+\.\d+$/.test(shellVersion ?? '') || !Number.isSafeInteger(maxBackupBytes) || maxBackupBytes < 1536) fail();
  const port = lockPort ?? 20000 + createHash('sha256').update(targetId).digest().readUInt16BE(0) % 40000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail();
  let transactionId;
  const context = (value) => { if (!transactionPattern.test(value?.transactionId ?? '')) fail(); transactionId = value.transactionId; return { targetId, transactionId }; };
  const state = async () => { const value = await maintenance.state(); if (value?.targetId !== targetId) fail(); return value; };
  // running e obbligatorio: uno stato Supervisor error non prova che il container sia fermo.
  const observeImage = async appVersion => {
    if (typeof imageAuthority?.inspect !== 'function') fail();
    const value = await imageAuthority.inspect({ slug, appVersion });
    if (!digestPattern.test(value?.image ?? '') || typeof value.running !== 'boolean') fail(); return value;
  };
  const image = async appVersion => (await observeImage(appVersion)).image;
  const assertTarget = async (id) => {
    if (id !== targetId) fail();
    const caller = await supervisor.self();
    if (!slugPattern.test(caller?.slug ?? '') || caller.slug === slug || !['manager', 'admin'].includes(caller.hassio_role)) fail();
    if ((await supervisor.info(slug))?.slug !== slug) fail();
  };
  const stopped = async () => {
    const info = await supervisor.info(slug);
    if (!['stopped', 'error'].includes(info.state) || (await observeImage(info.version)).running !== false) fail();
  };
  const ensureStarted = async expected => {
    const actual = await observeImage(expected.appVersion);
    if (actual.image !== expected.image) fail(); // Nessun avvio sul DB con un'immagine diversa.
    const info = await supervisor.info(slug);
    if (info.version !== expected.appVersion) fail();
    if (['stopped', 'error'].includes(info.state) && actual.running === false) await supervisor.start(slug);
    else if (info.state !== 'started' && info.state !== 'startup') fail();
  };
  const verifyRunning = async (expected, fingerprint, value, requireMaintenance = true) => {
    try {
      context(value);
      await ensureStarted(expected);
      const deadline = Date.now() + healthTimeoutMs;
      do {
        try {
          const info = await supervisor.info(slug); const app = await maintenance.inspect();
          if (info.state === 'started' && info.version === expected.appVersion && await image(expected.appVersion) === expected.image &&
            app.targetId === targetId && app.version === expected.version && app.appVersion === expected.appVersion &&
            equal(app.bundle, expected.bundle) && (!requireMaintenance || (value?.committed && app.maintenance?.active === false) ||
              (app.maintenance?.active === true && app.maintenance.transactionId === transactionId)) &&
            (!fingerprint || app.dataFingerprint === fingerprint)) return true;
        } catch { /* Si ripetono solo letture health, mai install/restore dal risultato incerto. */ }
        if (Date.now() >= deadline) break;
        await delay(Math.min(pollIntervalMs, Math.max(1, deadline - Date.now())));
      } while (Date.now() <= deadline);
    } catch { /* Il coordinatore conserva la manutenzione e richiede recupero. */ }
    return false;
  };
  const backupScope = (info, before) => info?.type === 'partial' && info.protected === false && info.compressed === false &&
    info.homeassistant === null && Array.isArray(info.folders) && info.folders.length === 0 && info.addons?.length === 1 &&
    info.addons[0].slug === slug && info.addons[0].version === before.appVersion &&
    Number.isSafeInteger(info.size_bytes) && info.size_bytes > 0 && info.size_bytes <= maxBackupBytes;
  const backupPath = (id) => { if (!/^[a-z0-9-]{1,100}$/.test(id ?? '')) fail(); return join(directory, `backup-${id}.tar`); };
  const verifyBackup = async (receipt, before) => {
    try {
      if (receipt.image !== before.image || !fingerprintPattern.test(receipt.dataFingerprint ?? '') ||
        !fingerprintPattern.test(receipt.sha256 ?? '') || !transactionPattern.test(receipt.transactionId ?? '')) return false;
      const info = await supervisor.backupInfo(receipt.id);
      if (!backupScope(info, before) || info.size_bytes !== receipt.size) return false;
      const path = backupPath(receipt.id); const bytes = await consume(createReadStream(path), maxBackupBytes);
      if (bytes.sha256 !== receipt.sha256 || bytes.size !== receipt.size || !await inspectArchive(path, slug, before.appVersion, bytes.size, true, targetId)) return false;
      // Il restore usa la copia Supervisor, pertanto anche quei byte devono essere gli stessi.
      const remote = await supervisor.download(receipt.id); const actual = await consume(remote.body, maxBackupBytes);
      return actual.sha256 === receipt.sha256 && actual.size === receipt.size;
    } catch { return false; }
  };
  return {
    acquire: async () => {
      const server = createServer(socket => socket.destroy());
      const acquired = await new Promise((resolve, reject) => {
        server.once('error', error => error.code === 'EADDRINUSE' ? resolve(false) : reject(new Error('Lock updater non disponibile')));
        server.listen(port, '127.0.0.1', () => resolve(true));
      });
      // Lock locale all'host executor, rilasciato dall'OS anche dopo SIGKILL.
      return acquired ? async () => new Promise(resolve => server.close(resolve)) : null;
    },
    assertTarget,
    inspect: async () => {
      const app = await maintenance.inspect();
      if (app?.targetId !== targetId || !fingerprintPattern.test(app.dataFingerprint ?? '') || !app.bundle) fail();
      const info = await supervisor.info(slug);
      if (info.version !== app.appVersion || info.state !== 'started') fail();
      const [os, core, sup] = await Promise.all(['os', 'core', 'supervisor'].map(name => supervisor.component(name)));
      return { version: app.version, appVersion: app.appVersion, bundle: app.bundle, image: await image(app.appVersion),
        dataFingerprint: app.dataFingerprint, haosVersion: os.version, coreVersion: core.version,
        supervisorVersion: sup.version, shellVersion };
    },
    stage: async (candidate, before) => {
      if (!parseDistribution(candidate) || !digestPattern.test(before.image ?? '') ||
        typeof imageAuthority?.stage !== 'function' || typeof imageAuthority?.prepareRollback !== 'function') fail();
      await assertTarget(targetId);
      await supervisor.reloadStore();
      const store = await supervisor.store(slug);
      if (store.slug !== slug || store.version_latest !== candidate.appVersion || store.available !== true || store.build !== false) fail();
      await supervisor.available(slug);
      const proof = await imageAuthority.stage({ slug, before, candidate });
      if (proof?.exactRollback !== true || proof.previousImage !== before.image || proof.candidateImage !== candidate.image) fail();
      if (await image(before.appVersion) !== before.image) fail();
    },
    drain: async value => {
      const body = context(value);
      if (!await maintenance.drain(body)) return false;
      const app = await state();
      return app.maintenance?.active === true && app.maintenance.transactionId === transactionId &&
        ['pendingWrites', 'activeCommands', 'activeEditors', 'activeConnections'].every(name => app.activity?.[name] === 0);
    },
    backup: async before => {
      const app = await state();
      if (!transactionId || app.maintenance?.active !== true || app.maintenance.transactionId !== transactionId ||
        !fingerprintPattern.test(app.dataFingerprint ?? '') || !['pendingWrites', 'activeCommands', 'activeEditors', 'activeConnections'].every(name => app.activity?.[name] === 0)) fail();
      await supervisor.stop(slug); await stopped();
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const space = await statfs(directory);
      if (space.bavail * space.bsize < maxBackupBytes * 2 + 64 * 1024 * 1024) fail();
      const result = await supervisor.newBackup(slug);
      const path = backupPath(result?.slug); const temp = path + '.partial';
      const info = await supervisor.backupInfo(result.slug);
      if (!backupScope(info, before)) fail();
      const file = await open(temp, 'wx', 0o600);
      let bytes; let downloadFailed = false;
      try {
        const response = await supervisor.download(result.slug);
        bytes = await consume(response.body, maxBackupBytes, file); await file.sync();
      } catch { downloadFailed = true; }
      finally { await file.close(); }
      if (downloadFailed) { await rm(temp, { force: true }); fail(); }
      if (bytes.size !== info.size_bytes) { await rm(temp, { force: true }); fail(); }
      let id;
      const scoped = path + '.scoped';
      try { id = await scopeArchive(temp, scoped, slug, before, bytes.size, targetId); }
      finally { await rm(temp, { force: true }); }
      // Anche restore/partial ripristina metadata Supervisor: upload del solo ACA,
      // senza supervisor.tar, registry, mounts o elenco repository da riapplicare.
      const uploaded = await supervisor.upload(scoped);
      if (uploaded?.slug !== id) fail();
      await rename(scoped, backupPath(id)); await stopped();
      bytes = await consume(createReadStream(backupPath(id)), maxBackupBytes);
      return { id, sha256: bytes.sha256, size: bytes.size, image: before.image,
        dataFingerprint: app.dataFingerprint, transactionId };
    },
    verifyBackup,
    install: async candidate => {
      await stopped(); await assertTarget(targetId);
      const store = await supervisor.store(slug);
      if (store.slug !== slug || store.version_latest !== candidate.appVersion || store.available !== true || store.build !== false) fail();
      // Niente /update/<version>: Supervisor ignora quel suffisso.
      await supervisor.update(slug); await stopped();
      if ((await supervisor.info(slug)).version !== candidate.appVersion || await image(candidate.appVersion) !== candidate.image) fail();
    },
    verifyInstalled: (candidate, value) => fingerprintPattern.test(value?.before?.dataFingerprint ?? '')
      ? verifyRunning(candidate, value.committed ? undefined : value.before.dataFingerprint, value) : false,
    verifyUnchanged: (before, value) => verifyRunning(before, undefined, value, false),
    restore: async (receipt, before) => {
      if (!await verifyBackup(receipt, before)) fail();
      await supervisor.stop(slug); await stopped();
      if (typeof imageAuthority?.prepareRollback !== 'function') fail();
      await imageAuthority.prepareRollback({ slug, appVersion: before.appVersion, image: receipt.image });
      await supervisor.restore(receipt.id, slug); await stopped();
      if ((await supervisor.info(slug)).version !== before.appVersion || await image(before.appVersion) !== receipt.image) fail();
    },
    verifyRestored: (before, receipt) => verifyRunning(before, receipt.dataFingerprint, receipt),
    resume: async value => {
      const body = context(value); const app = await state();
      if (!app.maintenance?.active) return;
      if (app.maintenance.transactionId !== transactionId) fail();
      await maintenance.resume(body);
      if ((await state()).maintenance?.active !== false) fail();
    },
  };
}
