import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

export interface VmPortForwarding {
  name: string;
  hostPort: number;
  guestPort: number;
  /** Assente = solo loopback. La LAN deve essere un IPv4 privato selezionato dal coordinatore. */
  hostAddress?: string;
}

export interface OwnedHaVmOptions {
  vboxManagePath: string;
  stateDirectory: string;
  /** VDI iniziale pulito, acquisito e verificato dal chiamante. Non viene modificato. */
  sourceDiskPath: string;
  vmName: string;
  forwardings: readonly VmPortForwarding[];
  memoryMb?: number;
  cpus?: number;
}

export type VBoxExecutor = (file: string, args: readonly string[]) => Promise<{ stdout: string; stderr: string }>;

const execFileAsync = promisify(execFile);
const executeVBox: VBoxExecutor = (file, args) => execFileAsync(file, [...args], {
  windowsHide: true,
  timeout: 180_000,
  maxBuffer: 1_048_576,
});

export class VmLifecycleError extends Error {
  readonly code: 'configuration' | 'ownership' | 'state' | 'command';

  constructor(code: VmLifecycleError['code'], message: string) {
    super(message);
    this.name = 'VmLifecycleError';
    this.code = code;
  }
}

interface VmProfile {
  vmName: string;
  memoryMb: number;
  cpus: number;
  forwardings: VmPortForwarding[];
}

interface VmRecord {
  schema: 1;
  ownerId: string;
  vmUuid: string;
  diskUuid: string | null;
  phase: 'planned' | 'created' | 'ready';
  profile: VmProfile;
}

export interface OwnedHaVmStatus {
  kind: 'absent' | 'missing' | 'present';
  vmUuid: string | null;
  state: string | null;
  configured: boolean;
  forwardings: readonly VmPortForwarding[];
}

export interface OwnedHaVmManager {
  status(): Promise<OwnedHaVmStatus>;
  provision(): Promise<OwnedHaVmStatus>;
  start(): Promise<OwnedHaVmStatus>;
  configureForwardings(forwardings?: readonly VmPortForwarding[]): Promise<OwnedHaVmStatus>;
}

const OWNER_KEY = 'ACA/Owner';
const FORWARDING_NAMES = new Set(['ha-http', 'aca-http', 'lan-aca']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const samePath = (a: string, b: string): boolean => process.platform === 'win32'
  ? resolve(a).toLowerCase() === resolve(b).toLowerCase()
  : resolve(a) === resolve(b);

const privateHostAddress = (address: string): boolean => {
  const parts = address.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part)
    || Number(part) > 255 || String(Number(part)) !== part)) return false;
  const [a, b] = parts.map(Number);
  return a === 127 || a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
};

const normalizeForwardings = (rules: readonly VmPortForwarding[]): VmPortForwarding[] => {
  if (!Array.isArray(rules) || rules.length === 0 || rules.some((rule) => !rule
    || !FORWARDING_NAMES.has(rule.name)
    || ![rule.hostPort, rule.guestPort].every((port) => Number.isInteger(port) && port > 0 && port <= 65535)
    || typeof (rule.hostAddress ?? '127.0.0.1') !== 'string'
    || !privateHostAddress(rule.hostAddress ?? '127.0.0.1'))) {
    throw new VmLifecycleError('configuration', 'Inoltri ACA non validi: usare solo loopback o un IPv4 privato esplicito.');
  }
  const normalized = rules.map((rule) => ({ ...rule, hostAddress: rule.hostAddress ?? '127.0.0.1' }));
  if (new Set(normalized.map((rule) => rule.name)).size !== normalized.length
    || new Set(normalized.map((rule) => `${rule.hostAddress}:${rule.hostPort}`)).size !== normalized.length) {
    throw new VmLifecycleError('configuration', 'Gli inoltri ACA contengono nomi o indirizzi/porte duplicati.');
  }
  return normalized;
};

/** Legge esclusivamente il formato key=value di VBoxManage, senza interpretarlo come codice. */
export const parseVBoxMachineInfo = (output: string): Record<string, string> => {
  const info: Record<string, string> = {};
  for (const line of output.split(/\r?\n/)) {
    const match = /^(?:"([^"]+)"|([^=]+))=(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1] ?? match[2];
    const raw = match[3];
    if (!key || raw === undefined) continue;
    const critical = /^(UUID|CfgFile|VMState|firmware|cpus|memory|nic[1-8]|storagecontrollername\d+|Forwarding\(\d+\)|SATA(?:-ImageUUID)?-0-0)$/.test(key);
    try {
      if (critical && !raw.startsWith('"') && !(/^(cpus|memory)$/.test(key) && /^\d+$/.test(raw))) {
        throw new Error('Campo critico non valido');
      }
      info[key] = raw.startsWith('"') ? String(JSON.parse(raw)) : raw;
    } catch {
      // Per esempio VideoMode="0,0,0"@0,0 1 non è JSON: non è un dato usato dal lifecycle.
      if (critical) throw new VmLifecycleError('command', `VirtualBox ha restituito un campo critico non leggibile: ${key}.`);
    }
  }
  return info;
};

/** showmediuminfo in VirtualBox 7.2.4 espone campi testuali, senza --machinereadable. */
export const parseVBoxMediumInfo = (output: string): Record<string, string> => {
  const info: Record<string, string> = {};
  for (const line of output.split(/\r?\n/)) {
    const match = /^(UUID|Location|State|Storage format):\s*(.*?)\s*$/.exec(line);
    if (!match?.[1] || match[2] === undefined) continue;
    if (Object.hasOwn(info, match[1])) {
      throw new VmLifecycleError('command', 'VirtualBox ha restituito campi disco duplicati.');
    }
    info[match[1]] = match[2];
  }
  return info;
};

const exists = async (path: string): Promise<boolean> => {
  try { await access(path); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};

/** Una sola istanza del manager nel processo Electron protetto da single-instance lock. */
export const createOwnedHaVmManager = (options: OwnedHaVmOptions, execute: VBoxExecutor = executeVBox): OwnedHaVmManager => {
  const profile: VmProfile = {
    vmName: options.vmName,
    memoryMb: options.memoryMb ?? 4096,
    cpus: options.cpus ?? 2,
    forwardings: normalizeForwardings(options.forwardings),
  };
  if (!/^[a-z0-9][a-z0-9 _-]{0,63}$/i.test(profile.vmName)
    || !Number.isInteger(profile.memoryMb) || profile.memoryMb < 2048
    || !Number.isInteger(profile.cpus) || profile.cpus < 2) {
    throw new VmLifecycleError('configuration', 'Profilo della macchina virtuale non valido.');
  }
  const directory = resolve(options.stateDirectory);
  const journalPath = join(directory, 'owned-vm.json');
  const diskPath = join(directory, 'haos.vdi');
  const machinesPath = join(directory, 'machines');
  const settingsPath = join(machinesPath, profile.vmName, `${profile.vmName}.vbox`);
  let pending: Promise<unknown> = Promise.resolve();
  const serialize = <T>(action: () => Promise<T>): Promise<T> => {
    const next = pending.then(action, action);
    pending = next.catch(() => undefined);
    return next;
  };
  const run = async (...args: string[]): Promise<string> => {
    try { return (await execute(options.vboxManagePath, args)).stdout; } catch (error) {
      throw new VmLifecycleError('command', `VirtualBox: operazione ${args[0] ?? ''} non riuscita. ${error instanceof Error ? error.message : ''}`);
    }
  };
  const save = async (record: VmRecord): Promise<void> => {
    await mkdir(directory, { recursive: true });
    const temporary = `${journalPath}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    await rename(temporary, journalPath);
  };
  const load = async (): Promise<VmRecord | null> => {
    if (!(await exists(journalPath))) return null;
    let value: Partial<VmRecord>;
    try { value = JSON.parse(await readFile(journalPath, 'utf8')) as Partial<VmRecord>; } catch {
      throw new VmLifecycleError('ownership', 'Registro del motore non leggibile: i dati esistenti sono conservati.');
    }
    if (!value || value.schema !== 1 || !value.ownerId || !UUID.test(value.ownerId)
      || !value.vmUuid || !UUID.test(value.vmUuid)
      || !(value.diskUuid === null || (typeof value.diskUuid === 'string' && UUID.test(value.diskUuid)))
      || !['planned', 'created', 'ready'].includes(value.phase ?? '')
      || !value.profile || value.profile.vmName !== profile.vmName
      || value.profile.memoryMb !== profile.memoryMb || value.profile.cpus !== profile.cpus) {
      throw new VmLifecycleError('ownership', 'Il registro del motore non corrisponde al profilo richiesto.');
    }
    try { value.profile.forwardings = normalizeForwardings(value.profile.forwardings); } catch {
      throw new VmLifecycleError('ownership', 'Il registro contiene inoltri di rete non validi.');
    }
    return value as VmRecord;
  };
  const registered = async (): Promise<string> => run('list', 'vms');
  const contains = (list: string, uuid: string): boolean => list.toLowerCase().includes(`{${uuid.toLowerCase()}}`);
  const machine = async (record: VmRecord, newlyCreated = false): Promise<Record<string, string>> => {
    const info = parseVBoxMachineInfo(await run('showvminfo', record.vmUuid, '--machinereadable'));
    if (info.UUID?.toLowerCase() !== record.vmUuid.toLowerCase() || !info.CfgFile || !samePath(info.CfgFile, settingsPath)) {
      throw new VmLifecycleError('ownership', 'La macchina registrata non corrisponde al motore ACA.');
    }
    if (!newlyCreated && (await run('getextradata', record.vmUuid, OWNER_KEY)).trim() !== `Value: ${record.ownerId}`) {
      throw new VmLifecycleError('ownership', 'Proprietà della macchina non verificata: nessuna operazione eseguita.');
    }
    return info;
  };
  const forwards = (info: Record<string, string>): string[] => Object.entries(info)
    .filter(([key]) => key.startsWith('Forwarding(')).map(([, value]) => value);
  const forwardingValue = (rule: VmPortForwarding): string => `${rule.name},tcp,${rule.hostAddress ?? '127.0.0.1'},${rule.hostPort},,${rule.guestPort}`;
  const hasExtraAdapter = (info: Record<string, string>): boolean => Object.entries(info)
    .some(([key, value]) => /^nic[2-8]$/.test(key) && value !== 'none');
  const hardwareReady = (record: VmRecord, info: Record<string, string>): boolean => record.phase === 'ready'
    && Boolean(record.diskUuid) && info['SATA-0-0'] !== undefined && samePath(info['SATA-0-0']!, diskPath)
    && info['SATA-ImageUUID-0-0']?.toLowerCase() === record.diskUuid?.toLowerCase()
    && info.nic1 === 'nat' && !hasExtraAdapter(info)
    && info.firmware?.toLowerCase().startsWith('efi') === true
    && info.cpus === String(profile.cpus) && info.memory === String(profile.memoryMb);
  const ready = (record: VmRecord, info: Record<string, string>): boolean => hardwareReady(record, info)
    && forwards(info).length === profile.forwardings.length
    && profile.forwardings.every((rule) => forwards(info).includes(forwardingValue(rule)));
  const result = (kind: OwnedHaVmStatus['kind'], record: VmRecord | null, info?: Record<string, string>): OwnedHaVmStatus => ({
    kind, vmUuid: record?.vmUuid ?? null, state: info?.VMState ?? null,
    configured: Boolean(record && info && ready(record, info)), forwardings: profile.forwardings.map((rule) => ({ ...rule })),
  });
  const reconcileForwardings = async (record: VmRecord, info: Record<string, string>): Promise<Record<string, string>> => {
    if (forwards(info).some((item) => !FORWARDING_NAMES.has(item.split(',')[0] ?? ''))) {
      throw new VmLifecycleError('ownership', 'La macchina contiene inoltri di rete inattesi: nessuna modifica eseguita.');
    }
    const running = info.VMState === 'running';
    if (!running && !['poweroff', 'aborted'].includes(info.VMState ?? '')) {
      throw new VmLifecycleError('state', 'Riprendere o arrestare ordinatamente il motore prima di aggiornare gli indirizzi.');
    }
    const change = async (...args: string[]) => running
      ? run('controlvm', record.vmUuid, 'natpf1', ...args)
      : run('modifyvm', record.vmUuid, '--natpf1', ...args);
    const desired = profile.forwardings.map(forwardingValue);
    for (const existing of forwards(info)) {
      if (!desired.includes(existing)) await change('delete', existing.split(',')[0]!);
    }
    for (const rule of desired) {
      if (!forwards(info).includes(rule)) await change(rule);
    }
    const updated = await machine(record);
    if (forwards(updated).length !== desired.length || !desired.every((rule) => forwards(updated).includes(rule))) {
      throw new VmLifecycleError('state', 'VirtualBox non conferma gli inoltri richiesti.');
    }
    record.profile = { ...profile, forwardings: profile.forwardings.map((rule) => ({ ...rule })) };
    await save(record);
    return updated;
  };
  const status = async (): Promise<OwnedHaVmStatus> => {
    const record = await load();
    if (!record) return result('absent', null);
    if (!contains(await registered(), record.vmUuid)) return result('missing', record);
    const info = await machine(record);
    const current = result('present', record, info);
    return { ...current, configured: current.configured && await exists(diskPath) };
  };
  const provision = async (): Promise<OwnedHaVmStatus> => {
    let record = await load();
    const list = await registered();
    if (!record) {
      if (list.split(/\r?\n/).some((line) => line.startsWith(`${JSON.stringify(profile.vmName)} `))
        || await exists(diskPath) || await exists(settingsPath)) {
        throw new VmLifecycleError('ownership', 'Esistono già risorse con questo nome: non vengono adottate o sovrascritte.');
      }
      record = { schema: 1, ownerId: randomUUID(), vmUuid: randomUUID(), diskUuid: null, phase: 'planned', profile };
      await save(record);
    }
    let info: Record<string, string>;
    if (!contains(list, record.vmUuid)) {
      if (record.phase !== 'planned' || await exists(settingsPath)) {
        throw new VmLifecycleError('ownership', 'Il motore registrato non è disponibile: nessun disco viene ricreato.');
      }
      await run('createvm', '--name', profile.vmName, '--uuid', record.vmUuid, '--ostype', 'Linux_64', '--basefolder', machinesPath, '--register');
      info = await machine(record, true);
      await run('setextradata', record.vmUuid, OWNER_KEY, record.ownerId);
      record.phase = 'created';
      await save(record);
    } else {
      info = await machine(record);
    }
    if (record.diskUuid && !(await exists(diskPath))) {
      throw new VmLifecycleError('ownership', 'Il disco del motore manca: non viene reinizializzato.');
    }
    if (forwards(info).some((item) => !FORWARDING_NAMES.has(item.split(',')[0] ?? ''))) {
      throw new VmLifecycleError('ownership', 'La macchina contiene inoltri di rete inattesi: nessuna modifica eseguita.');
    }
    if (hasExtraAdapter(info)) {
      throw new VmLifecycleError('ownership', 'La macchina contiene interfacce di rete inattese: nessuna modifica eseguita.');
    }
    if (record.diskUuid && info['SATA-ImageUUID-0-0'] && info['SATA-ImageUUID-0-0'].toLowerCase() !== record.diskUuid.toLowerCase()) {
      throw new VmLifecycleError('ownership', 'Il disco collegato alla macchina ha una identità inattesa.');
    }
    if (ready(record, info)) return result('present', record, info);
    if (hardwareReady(record, info)) {
      return result('present', record, await reconcileForwardings(record, info));
    }
    if (!['poweroff', 'aborted'].includes(info.VMState ?? '')) {
      throw new VmLifecycleError('state', 'La configurazione del motore richiede una macchina già spenta.');
    }
    if (info['SATA-0-0'] && info['SATA-0-0'] !== 'none' && !samePath(info['SATA-0-0'], diskPath)) {
      throw new VmLifecycleError('ownership', 'La macchina contiene un disco inatteso: nessuna sostituzione eseguita.');
    }
    if (!(await exists(diskPath))) {
      if (record.diskUuid) throw new VmLifecycleError('ownership', 'Il disco del motore manca: non viene reinizializzato.');
      if (!(await stat(options.sourceDiskPath)).isFile() || samePath(options.sourceDiskPath, diskPath)) {
        throw new VmLifecycleError('configuration', 'Il disco iniziale HA OS non è disponibile.');
      }
      await run('clonemedium', 'disk', resolve(options.sourceDiskPath), diskPath, '--format', 'VDI');
    }
    const medium = parseVBoxMediumInfo(await run('showmediuminfo', 'disk', diskPath));
    if (!medium.UUID || !UUID.test(medium.UUID) || (record.diskUuid && record.diskUuid.toLowerCase() !== medium.UUID.toLowerCase())
      || !medium.Location || !samePath(medium.Location, diskPath) || medium['Storage format'] !== 'VDI') {
      throw new VmLifecycleError('ownership', 'Identità del disco HA OS non verificata.');
    }
    record.diskUuid = medium.UUID;
    await save(record);
    await run('modifyvm', record.vmUuid, '--memory', String(profile.memoryMb), '--cpus', String(profile.cpus), '--ioapic', 'on',
      '--firmware', 'efi', '--chipset', 'piix3', '--boot1', 'disk', '--boot2', 'none', '--boot3', 'none', '--boot4', 'none', '--nic1', 'nat', '--cableconnected1', 'on');
    info = await reconcileForwardings(record, await machine(record));
    if (!Object.entries(info).some(([key, value]) => key.startsWith('storagecontrollername') && value === 'SATA')) {
      await run('storagectl', record.vmUuid, '--name', 'SATA', '--add', 'sata', '--controller', 'IntelAhci', '--portcount', '1', '--bootable', 'on');
    }
    if (!info['SATA-0-0'] || !samePath(info['SATA-0-0'], diskPath)) {
      await run('storageattach', record.vmUuid, '--storagectl', 'SATA', '--port', '0', '--device', '0', '--type', 'hdd', '--medium', diskPath);
    }
    record.phase = 'ready';
    await save(record);
    info = await machine(record);
    if (!ready(record, info)) throw new VmLifecycleError('state', 'VirtualBox non conferma la configurazione attesa del motore.');
    return result('present', record, info);
  };
  return {
    status: () => serialize(status),
    provision: () => serialize(provision),
    configureForwardings: (forwardings) => serialize(async () => {
      if (forwardings) profile.forwardings = normalizeForwardings(forwardings);
      const record = await load();
      if (!record) throw new VmLifecycleError('state', 'Il motore deve essere prima predisposto.');
      if (!contains(await registered(), record.vmUuid)) throw new VmLifecycleError('ownership', 'Il motore registrato non è disponibile.');
      const info = await machine(record);
      if (!hardwareReady(record, info) || !(await exists(diskPath))) {
        throw new VmLifecycleError('state', 'La configurazione del motore non è pronta per aggiornare gli indirizzi.');
      }
      return result('present', record, await reconcileForwardings(record, info));
    }),
    start: () => serialize(async () => {
      const current = await provision();
      if (current.state === 'running') return current;
      if (!current.vmUuid || !['poweroff', 'aborted', 'saved'].includes(current.state ?? '')) {
        throw new VmLifecycleError('state', 'Il motore non è in uno stato avviabile.');
      }
      await run('startvm', current.vmUuid, '--type', 'headless');
      return status();
    }),
  };
};
