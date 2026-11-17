import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { setTimeout as pause } from 'node:timers/promises';
import { promisify } from 'node:util';
import { createOwnedHaVmManager } from './ownedHaVm.ts';
import type { OwnedHaVmManager, OwnedHaVmOptions, VBoxExecutor } from './ownedHaVm.ts';

const GUEST_APP_DIRECTORY = '/mnt/data/supervisor/apps/local/acasystem';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024;
const active = new Set<string>();
const execFileAsync = promisify(execFile);

export interface LocalAppBootstrapOptions {
  vmManager?: Pick<OwnedHaVmManager, 'status'>;
  vmUuid: string;
  vboxManagePath: string;
  stateDirectory: string;
  resourcesDirectory: string;
  onProgress?: (message: string) => void;
}

export interface LocalAppBootstrapResult {
  kind: 'prepared' | 'already-prepared';
  sourceSha256: string;
  appVersion: string;
}

export interface LocalAppBootstrapDependencies {
  execute: VBoxExecutor;
  pause(ms: number): Promise<void>;
  timeoutMs: number;
}

export class LocalAppBootstrapError extends Error {
  readonly code: 'configuration' | 'materials' | 'ownership' | 'interrupted' | 'timeout' | 'command';

  constructor(code: LocalAppBootstrapError['code'], message: string) {
    super(message);
    this.name = 'LocalAppBootstrapError';
    this.code = code;
  }
}

interface BootstrapRecord {
  schema: 1;
  vmUuid: string;
  sourceSha256: string;
  phase: 'pending' | 'complete';
}

const defaults: LocalAppBootstrapDependencies = {
  execute: (file, args) => execFileAsync(file, [...args], { windowsHide: true, timeout: 30_000, maxBuffer: 1_048_576 }),
  pause,
  timeoutMs: 300_000,
};

const loadRecord = async (path: string): Promise<BootstrapRecord | null> => {
  let text: string;
  try { text = await readFile(path, 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  try {
    const value = JSON.parse(text) as BootstrapRecord;
    if (value?.schema === 1 && UUID.test(value.vmUuid) && /^[a-f0-9]{64}$/i.test(value.sourceSha256)
      && ['pending', 'complete'].includes(value.phase)) return value;
  } catch { /* Il registro esistente non viene sovrascritto. */ }
  throw new LocalAppBootstrapError('interrupted', 'Il registro della preparazione non è leggibile. Verifica il motore prima di riprovare.');
};

const saveRecord = async (path: string, record: BootstrapRecord): Promise<void> => {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
};

/** Fallback di sola lettura: il manager verifica UUID, file, marker e disco del registro ACA. */
const managerFromRecord = async (options: LocalAppBootstrapOptions, execute: VBoxExecutor): Promise<OwnedHaVmManager> => {
  let stored: { vmUuid?: unknown; profile?: OwnedHaVmOptions };
  try { stored = JSON.parse(await readFile(join(options.stateDirectory, 'owned-vm.json'), 'utf8')) as typeof stored; } catch {
    throw new LocalAppBootstrapError('ownership', 'Non è disponibile il registro proprietario del motore ACA.');
  }
  if (stored?.vmUuid !== options.vmUuid || !stored.profile) {
    throw new LocalAppBootstrapError('ownership', 'La macchina richiesta non è il motore ACA registrato.');
  }
  return createOwnedHaVmManager({
    vboxManagePath: options.vboxManagePath, stateDirectory: options.stateDirectory,
    sourceDiskPath: join(options.resourcesDirectory, 'engine', 'haos.vdi'),
    vmName: stored.profile.vmName, cpus: stored.profile.cpus, memoryMb: stored.profile.memoryMb,
    forwardings: stored.profile.forwardings,
  }, execute);
};

const closeServer = async (server: Server): Promise<void> => {
  server.closeAllConnections();
  await new Promise<void>((accept) => server.close(() => accept()));
};

/** Installa soltanto i file sorgenti dell'app nella VM ACA già pronta; non avvia add-on. */
export const bootstrapLocalApp = async (
  options: LocalAppBootstrapOptions,
  overrides: Partial<LocalAppBootstrapDependencies> = {}
): Promise<LocalAppBootstrapResult> => {
  const directory = resolve(options.stateDirectory);
  if (active.has(directory)) throw new LocalAppBootstrapError('interrupted', 'La preparazione dei servizi è già in corso.');
  active.add(directory);
  const deps = { ...defaults, ...overrides };
  let server: Server | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!UUID.test(options.vmUuid)) throw new LocalAppBootstrapError('ownership', 'Identità della macchina non valida.');
    const journalPath = join(directory, 'local-app-bootstrap.json');
    const previous = await loadRecord(journalPath);
    if (previous && (previous.vmUuid !== options.vmUuid || previous.phase === 'pending')) {
      throw new LocalAppBootstrapError('interrupted', 'Una preparazione precedente è rimasta incompleta. La console va verificata prima di riprovare. Nessun comando viene digitato.');
    }
    const materials = join(resolve(options.resourcesDirectory), 'engine');
    let manifest: { schema?: unknown; sourceArchive?: unknown; sourceSha256?: unknown; appVersion?: unknown };
    try { manifest = JSON.parse(await readFile(join(materials, 'manifest.json'), 'utf8')) as typeof manifest; } catch {
      throw new LocalAppBootstrapError('materials', 'Il manifesto dei servizi ACA non è disponibile.');
    }
    if (manifest?.schema !== 1 || manifest.sourceArchive !== 'acasystem-source.tgz'
      || typeof manifest.sourceSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(manifest.sourceSha256)
      || typeof manifest.appVersion !== 'string' || !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(manifest.appVersion)) {
      throw new LocalAppBootstrapError('materials', 'Il manifesto dei servizi ACA non è valido.');
    }
    const sourceSha256 = manifest.sourceSha256.toLowerCase();
    const result = { sourceSha256, appVersion: manifest.appVersion };
    const manager = options.vmManager ?? await managerFromRecord(options, deps.execute);
    const assertOwner = async () => {
      const current = await manager.status();
      if (current.kind !== 'present' || current.vmUuid !== options.vmUuid || current.state !== 'running' || !current.configured) {
        throw new LocalAppBootstrapError('ownership', 'Il motore ACA non è attivo o la sua proprietà non è verificata.');
      }
    };
    await assertOwner();
    if (previous?.sourceSha256 === sourceSha256 && previous.phase === 'complete') return { kind: 'already-prepared', ...result };
    options.onProgress?.('Verifica dei servizi domestici…');
    const archivePath = join(materials, manifest.sourceArchive);
    let size: number;
    const hash = createHash('sha256');
    try {
      const metadata = await stat(archivePath);
      if (!metadata.isFile() || metadata.size === 0 || metadata.size > MAX_ARCHIVE_BYTES) throw new Error('Dimensione non valida');
      size = metadata.size;
      for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
    } catch {
      throw new LocalAppBootstrapError('materials', 'L’archivio dei servizi ACA manca o supera la dimensione consentita.');
    }
    if (hash.digest('hex') !== sourceSha256) throw new LocalAppBootstrapError('materials', 'L’archivio dei servizi ACA non supera la verifica di integrità.');

    const nonce = randomBytes(24).toString('hex');
    const archiveRoute = `/${nonce}/archive`;
    const completeRoute = `/${nonce}/complete?sha256=${sourceSha256}`;
    let archiveSent = false;
    let confirmed = false;
    let confirm!: () => void;
    let fail!: (error: Error) => void;
    const completion = new Promise<void>((accept, reject) => { confirm = accept; fail = reject; });
    // L'errore può arrivare mentre VBoxManage sta ancora completando l'invio dei tasti.
    void completion.catch(() => undefined);
    server = createServer({ maxHeaderSize: 8192, requestTimeout: 30_000, headersTimeout: 10_000 }, (request, response) => {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Connection', 'close');
      if (request.method !== 'GET') { response.writeHead(405, { Allow: 'GET' }); response.end(); return; }
      if (request.url === archiveRoute) {
        response.writeHead(200, { 'Content-Type': 'application/gzip', 'Content-Length': size });
        response.once('finish', () => { archiveSent = true; });
        void pipeline(createReadStream(archivePath), response).catch(() => fail(new LocalAppBootstrapError('materials', 'Il trasferimento dei servizi ACA è stato interrotto.')));
        return;
      }
      if (request.url === completeRoute && archiveSent && !confirmed) {
        confirmed = true;
        response.once('finish', confirm);
        response.writeHead(200, { 'Content-Type': 'text/plain' }); response.end('ok\n');
        return;
      }
      response.writeHead(request.url?.startsWith(`/${nonce}/complete`) ? 403 : 404); response.end();
    });
    await new Promise<void>((accept, reject) => {
      server!.once('error', reject);
      server!.listen(0, '127.0.0.1', () => accept());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new LocalAppBootstrapError('configuration', 'Il trasferimento locale non è disponibile.');
    const base = `http://10.0.2.2:${address.port}`;
    const temporary = `/tmp/aca-source-${nonce}.tgz`;
    const command = `/usr/bin/curl -fsS --connect-timeout 10 --max-time 240 --max-filesize ${size} '${base}${archiveRoute}' -o '${temporary}'`
      + ` && echo '${sourceSha256}  ${temporary}' | sha256sum -c -`
      + ` && mkdir -p '${GUEST_APP_DIRECTORY}' && tar -xzf '${temporary}' -C '${GUEST_APP_DIRECTORY}'`
      + ` && rm -f '${temporary}' && /usr/bin/curl -fsS --connect-timeout 10 --max-time 30 '${base}${completeRoute}' && exit`;
    await mkdir(directory, { recursive: true });
    await saveRecord(journalPath, { schema: 1, vmUuid: options.vmUuid, sourceSha256, phase: 'pending' });
    timeout = setTimeout(() => fail(new LocalAppBootstrapError('timeout', 'La centrale non ha confermato la preparazione dei servizi entro cinque minuti. Verifica il motore prima di riprovare.')), deps.timeoutMs);
    const keyboard = async (...args: string[]) => {
      await assertOwner();
      try { await deps.execute(options.vboxManagePath, ['controlvm', options.vmUuid, ...args]); } catch {
        throw new LocalAppBootstrapError('command', 'Non è stato possibile completare la preparazione nella console del motore.');
      }
    };
    options.onProgress?.('Preparazione dei servizi domestici…');
    await keyboard('keyboardputstring', 'login');
    await keyboard('keyboardputscancode', '1c', '9c');
    await deps.pause(1000);
    await keyboard('keyboardputstring', command);
    await keyboard('keyboardputscancode', '1c', '9c');
    await completion;
    clearTimeout(timeout);
    await assertOwner();
    await saveRecord(journalPath, { schema: 1, vmUuid: options.vmUuid, sourceSha256, phase: 'complete' });
    options.onProgress?.('Servizi domestici predisposti.');
    return { kind: 'prepared', ...result };
  } finally {
    if (timeout) clearTimeout(timeout);
    if (server?.listening) await closeServer(server);
    active.delete(directory);
  }
};
