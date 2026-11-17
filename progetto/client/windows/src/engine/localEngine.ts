import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { networkInterfaces } from 'node:os';
import type { NetworkInterfaceInfo } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';
import { createOwnedHaVmManager } from './ownedHaVm.ts';
import type { OwnedHaVmManager, OwnedHaVmOptions, VmPortForwarding } from './ownedHaVm.ts';

const CORE_VERSION = '2026.10.4';
const HAOS_VERSION = '18.4';
const CORE_TIMEOUT_MS = 30 * 60 * 1000;
const HA_BASE = 'http://127.0.0.1:8123';
const ACA_BASE = 'http://127.0.0.1:3002';
const execFileAsync = promisify(execFile);

export interface LocalEngineOptions {
  /** Cartella engine nel profilo dell'app, condivisa con owned-vm.json. */
  dataDirectory: string;
  /** Cartella risorse dell'app; engine/haos.vdi deve restare fuori dall'ASAR. */
  resourcesDirectory: string;
  onProgress?: (message: string) => void;
}

export interface LocalEngineReady {
  vmUuid: string;
  vboxManagePath: string;
  haBase: string;
  acaBase: string;
  haVersion: string;
}

export interface LocalEngine {
  enabled(): Promise<boolean>;
  enable(): Promise<void>;
  ensureStarted(): Promise<LocalEngineReady>;
  /** Indirizzo LAN configurato; non sostituisce salute ACA o autorizzazione del pairing. */
  pairingEndpoint(): Promise<string | null>;
}

export class LocalEngineError extends Error {
  readonly code: 'disabled' | 'configuration' | 'prerequisite' | 'materials' | 'ports' | 'version' | 'timeout';

  constructor(code: LocalEngineError['code'], message: string) {
    super(message);
    this.name = 'LocalEngineError';
    this.code = code;
  }
}

interface EngineManifest {
  schema: 1;
  haosVersion: string;
  expectedCoreVersion: string;
  diskFile: 'haos.vdi';
  diskSha256: string;
}

export interface LocalNetworkSnapshot {
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>;
  physicalNames: readonly string[];
}

export interface LocalEngineDependencies {
  findVBoxManage(): Promise<string | null>;
  network(): Promise<LocalNetworkSnapshot>;
  createManager(options: OwnedHaVmOptions): OwnedHaVmManager;
  checkPorts(forwardings: readonly VmPortForwarding[]): Promise<void>;
  verifyDisk(path: string, expectedSha256: string): Promise<void>;
  waitForCore(haBase: string, expectedVersion: string, timeoutMs: number): Promise<string>;
}

const exists = async (path: string): Promise<boolean> => {
  try { await access(path); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};

const findVBoxManage = async (): Promise<string | null> => {
  for (const folder of new Set([process.env.ProgramW6432, process.env.ProgramFiles].filter((item): item is string => Boolean(item)))) {
    const file = join(folder, 'Oracle', 'VirtualBox', 'VBoxManage.exe');
    if (await exists(file)) return file;
  }
  try {
    const { stdout } = await execFileAsync('reg.exe', ['query', 'HKLM\\SOFTWARE\\Oracle\\VirtualBox', '/v', 'InstallDir', '/reg:64'], {
      windowsHide: true, timeout: 10_000, encoding: 'utf8',
    });
    const folder = /^\s*InstallDir\s+REG_SZ\s+(.+?)\s*$/im.exec(stdout)?.[1];
    if (folder) {
      const file = join(folder, 'VBoxManage.exe');
      if (await exists(file)) return file;
    }
  } catch { /* Nessuna installazione o modifica del registro. */ }
  return null;
};

const readLocalNetwork = async (): Promise<LocalNetworkSnapshot> => {
  let physicalNames: string[] = [];
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command',
      '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); @(Get-NetAdapter -Physical -ErrorAction Stop | Where-Object Status -eq \'Up\' | Select-Object -ExpandProperty Name) | ConvertTo-Json -Compress'], {
      windowsHide: true, timeout: 10_000, encoding: 'utf8',
    });
    const value: unknown = JSON.parse(stdout.trim());
    physicalNames = typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter((name): name is string => typeof name === 'string') : [];
  } catch { /* Senza verifica dell'adattatore fisico non si pubblica un indirizzo LAN. */ }
  return { interfaces: networkInterfaces(), physicalNames };
};

/** Nessuna preferenza arbitraria fra due reti fisiche attive. */
export const selectLanAddress = ({ interfaces, physicalNames }: LocalNetworkSnapshot): string | null => {
  const addresses = new Set<string>();
  for (const name of physicalNames) {
    for (const entry of interfaces[name] ?? []) {
      if (entry.internal || entry.family !== 'IPv4') continue;
      const octets = entry.address.split('.');
      if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part)
        || Number(part) > 255 || String(Number(part)) !== part)) continue;
      const [a, b] = octets.map(Number);
      if (a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168)) addresses.add(entry.address);
    }
  }
  return addresses.size === 1 ? [...addresses][0]! : null;
};

/** Si liberano tutti i socket del controllo prima di avviare VirtualBox. */
export const assertEnginePortsAvailable = async (forwardings: readonly VmPortForwarding[]): Promise<void> => {
  const servers = forwardings.map(() => createServer());
  try {
    const results = await Promise.allSettled(servers.map((server, index) => new Promise<void>((accept, reject) => {
      const rule = forwardings[index]!;
      server.once('error', () => reject(new LocalEngineError('ports',
        `L'indirizzo ${rule.hostAddress ?? '127.0.0.1'}:${rule.hostPort} è già occupato o non disponibile. Nessun altro servizio viene arrestato.`)));
      server.listen({ host: rule.hostAddress ?? '127.0.0.1', port: rule.hostPort, exclusive: true }, () => accept());
    })));
    const failed = results.find((item): item is PromiseRejectedResult => item.status === 'rejected');
    if (failed) throw failed.reason;
  } finally {
    await Promise.all(servers.map((server) => new Promise<void>((accept) => {
      if (server.listening) server.close(() => accept()); else accept();
    })));
  }
};

export const verifyEngineDisk = async (path: string, expectedSha256: string): Promise<void> => {
  const digest = createHash('sha256');
  try {
    for await (const chunk of createReadStream(path)) digest.update(chunk);
  } catch {
    throw new LocalEngineError('materials', 'Il disco iniziale del motore non è disponibile. Ripara l’installazione di ACA.');
  }
  if (digest.digest('hex') !== expectedSha256.toLowerCase()) {
    throw new LocalEngineError('materials', 'Il disco iniziale del motore non supera la verifica di integrità.');
  }
};

/** Attende solo il saluto pubblico; non invia credenziali e non crea proprietari. */
export const waitForCoreVersion = async (
  haBase: string,
  expectedVersion: string,
  timeoutMs = CORE_TIMEOUT_MS,
  socketFactory: (url: string) => WebSocket = (url) => new WebSocket(url)
): Promise<string> => {
  const url = new URL('/api/websocket', haBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return await new Promise<string>((accept, reject) => {
        let socket: WebSocket | undefined;
        let finished = false;
        const finish = (error?: Error, version?: string) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          try { socket?.close(); } catch { /* Connessione non ancora aperta. */ }
          if (error) reject(error); else accept(version!);
        };
        const timer = setTimeout(() => finish(new Error('Connessione non pronta')), Math.min(10_000, Math.max(1, deadline - Date.now())));
        try {
          socket = socketFactory(url.href);
          socket.addEventListener('message', (event) => {
            let message: { type?: unknown; ha_version?: unknown };
            try { message = JSON.parse(String(event.data)) as typeof message; } catch { return; }
            if (message?.type !== 'auth_required') return;
            if (message.ha_version !== expectedVersion) {
              finish(new LocalEngineError('version', `Il motore richiede Home Assistant ${expectedVersion}; la versione ricevuta è ${String(message.ha_version)}. Nessun account è stato creato.`));
            } else finish(undefined, expectedVersion);
          });
          socket.addEventListener('error', () => finish(new Error('Connessione non pronta')));
          socket.addEventListener('close', () => finish(new Error('Connessione chiusa')));
        } catch (error) { finish(error instanceof Error ? error : new Error('Connessione non pronta')); }
      });
    } catch (error) {
      if (error instanceof LocalEngineError && error.code === 'version') throw error;
      if (Date.now() < deadline) await sleep(Math.min(2000, deadline - Date.now()));
    }
  }
  throw new LocalEngineError('timeout', 'Il motore non è ancora pronto dopo 30 minuti. I dati sono conservati: puoi riprovare.');
};

const defaults: LocalEngineDependencies = {
  findVBoxManage, network: readLocalNetwork, createManager: createOwnedHaVmManager,
  checkPorts: assertEnginePortsAvailable, verifyDisk: verifyEngineDisk, waitForCore: waitForCoreVersion,
};

export const createLocalEngine = (options: LocalEngineOptions, overrides: Partial<LocalEngineDependencies> = {}): LocalEngine => {
  const deps = { ...defaults, ...overrides };
  const directory = resolve(options.dataDirectory);
  const flagPath = join(directory, 'local-engine.json');
  const materials = join(resolve(options.resourcesDirectory), 'engine');
  let pending: Promise<unknown> = Promise.resolve();
  const serialize = <T>(action: () => Promise<T>): Promise<T> => {
    const next = pending.then(action, action);
    pending = next.catch(() => undefined);
    return next;
  };
  const progress = (message: string) => options.onProgress?.(message);
  const enabled = async (): Promise<boolean> => {
    if (!(await exists(flagPath))) return false;
    try {
      const value = JSON.parse(await readFile(flagPath, 'utf8')) as { schema?: unknown; enabled?: unknown };
      if (value?.schema === 1 && typeof value.enabled === 'boolean') return value.enabled;
    } catch { /* Configurazione esistente conservata. */ }
    throw new LocalEngineError('configuration', 'L’impostazione del motore locale non è leggibile. I dati della casa sono conservati.');
  };
  const context = async () => {
    let manifest: EngineManifest;
    try { manifest = JSON.parse(await readFile(join(materials, 'manifest.json'), 'utf8')) as EngineManifest; } catch {
      throw new LocalEngineError('materials', 'I materiali del motore non sono disponibili. Ripara l’installazione di ACA.');
    }
    if (manifest?.schema !== 1 || manifest.haosVersion !== HAOS_VERSION || manifest.expectedCoreVersion !== CORE_VERSION
      || manifest.diskFile !== 'haos.vdi' || typeof manifest.diskSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(manifest.diskSha256)) {
      throw new LocalEngineError('materials', 'Il manifesto del motore non è compatibile con questa versione di ACA.');
    }
    const executable = await deps.findVBoxManage();
    if (!executable) throw new LocalEngineError('prerequisite', 'VirtualBox non è disponibile su questo PC. È necessario predisporlo prima di avviare il motore.');
    const lan = selectLanAddress(await deps.network());
    const forwardings: VmPortForwarding[] = [
      { name: 'ha-http', hostPort: 8123, guestPort: 80 },
      { name: 'aca-http', hostPort: 3002, guestPort: 3002 },
      ...(lan ? [{ name: 'lan-aca', hostAddress: lan, hostPort: 3002, guestPort: 3002 }] : []),
    ];
    const manager = deps.createManager({
      vboxManagePath: executable, stateDirectory: directory, sourceDiskPath: join(materials, manifest.diskFile),
      vmName: 'ACA System Motore', forwardings, cpus: 4, memoryMb: 4096,
    });
    return { manifest, manager, forwardings, lan, executable };
  };
  return {
    enabled,
    enable: () => serialize(async () => {
      await mkdir(directory, { recursive: true });
      const temporary = `${flagPath}.${process.pid}.tmp`;
      await writeFile(temporary, `${JSON.stringify({ schema: 1, enabled: true })}\n`, 'utf8');
      await rename(temporary, flagPath);
    }),
    ensureStarted: () => serialize(async () => {
      if (!(await enabled())) throw new LocalEngineError('disabled', 'Scegli “Prepara questo PC” per attivare il motore locale.');
      progress('Verifica del motore domestico…');
      const { manifest, manager, forwardings, lan, executable } = await context();
      const current = await manager.status();
      if (current.kind === 'missing') throw new LocalEngineError('configuration', 'Il motore registrato non è disponibile. I suoi dati non vengono reinizializzati.');
      if (!(await exists(join(directory, 'haos.vdi')))) {
        progress('Verifica dei materiali del motore…');
        await deps.verifyDisk(join(materials, manifest.diskFile), manifest.diskSha256);
      }
      if (current.state !== 'running') await deps.checkPorts(forwardings);
      progress(current.kind === 'absent' ? 'Preparazione del motore domestico…' : 'Avvio del motore domestico…');
      const started = await manager.start();
      if (!started.vmUuid || started.state !== 'running' || !started.configured) {
        throw new LocalEngineError('configuration', 'VirtualBox non conferma un motore attivo e configurato.');
      }
      progress('Prima preparazione della casa: può richiedere diversi minuti…');
      const version = await deps.waitForCore(HA_BASE, manifest.expectedCoreVersion, CORE_TIMEOUT_MS);
      progress(lan ? 'Motore domestico pronto.' : 'Motore pronto su questo PC. La rete per collegare un telefono non è ancora identificata.');
      return { vmUuid: started.vmUuid, vboxManagePath: executable, haBase: HA_BASE, acaBase: ACA_BASE, haVersion: version };
    }),
    pairingEndpoint: () => serialize(async () => {
      if (!(await enabled())) return null;
      const { manager, lan } = await context();
      if (!lan) return null;
      const current = await manager.status();
      return current.state === 'running' && current.configured ? `http://${lan}:3002` : null;
    }),
  };
};
