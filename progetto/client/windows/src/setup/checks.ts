import { COMFORT_CPUS, COMFORT_MEMORY_GB, MIN_CPUS, MIN_MEMORY_GB, REQUIRED_FREE_GB } from './constants.ts';
import type { SetupDeps } from './deps.ts';
import type { SetupCheck, SetupCheckId } from './types.ts';
import { findVBoxManage } from './vm.ts';

/** I quattro controlli della schermata iniziale; ognuno ha un tempo massimo e non lancia mai. */

const withTimeout = async <T>(work: Promise<T>, ms: number, fallback: T): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const guarded = (id: SetupCheckId, deps: SetupDeps, work: () => Promise<SetupCheck>, fallback: SetupCheck): Promise<SetupCheck> =>
  withTimeout(work().catch(() => fallback), deps.tuning.checkTimeoutMs, fallback).then((check) => ({ ...check, id }));

export const checkVirtualBox = async (deps: SetupDeps, vbox: string | null): Promise<SetupCheck> => {
  if (!vbox) return { id: 'virtualbox', status: 'missing', detail: 'Non installato' };
  const result = await deps.exec(vbox, ['--version'], { timeoutMs: 10_000 });
  const version = /^(\d+)\.(\d+)/.exec(result.stdout.trim());
  if (result.code !== 0 || !version) return { id: 'virtualbox', status: 'warning', detail: 'Installato, non risponde' };
  return { id: 'virtualbox', status: 'ok', detail: `Installato, ${version[1]}.${version[2]}` };
};

export const checkDisk = async (deps: SetupDeps, centraleDir: string): Promise<SetupCheck> => {
  const free = await deps.freeBytes(centraleDir);
  const gigabytes = Math.floor(free / 1024 ** 3);
  return free >= deps.tuning.requiredFreeBytes
    ? { id: 'disk', status: 'ok', detail: `${gigabytes} GB liberi, ne servono ${REQUIRED_FREE_GB}` }
    : { id: 'disk', status: 'missing', detail: `Solo ${gigabytes} GB liberi, ne servono ${REQUIRED_FREE_GB}` };
};

const ROUTE_SCRIPT =
  "[Console]::OutputEncoding=[Text.Encoding]::UTF8; $r = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | " +
  'Sort-Object { $_.RouteMetric + $_.InterfaceMetric } | Select-Object -First 1; ' +
  "if (-not $r) { '{}'; exit 0 }; $a = Get-NetAdapter -InterfaceIndex $r.InterfaceIndex; " +
  '@{ Name = $a.Name; Description = $a.InterfaceDescription } | ConvertTo-Json -Compress';

/** Confronto tollerante alle codifiche: solo lettere e cifre ASCII, minuscole. */
const key = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');

export const parseBridgedNames = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => /^Name:\s+(.+?)\s*$/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name));

export const checkNetwork = async (deps: SetupDeps, vbox: string | null): Promise<SetupCheck> => {
  const route = await deps.exec(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', ROUTE_SCRIPT],
    { timeoutMs: 12_000 }
  );
  let adapter: { Name?: string; Description?: string };
  try {
    adapter = JSON.parse(route.stdout.trim() || '{}') as { Name?: string; Description?: string };
  } catch {
    return { id: 'network', status: 'warning', detail: 'Rete non verificabile' };
  }
  if (route.code !== 0) return { id: 'network', status: 'warning', detail: 'Rete non verificabile' };
  if (!adapter.Name || !adapter.Description) return { id: 'network', status: 'missing', detail: 'Nessuna rete' };
  if (!vbox) return { id: 'network', status: 'warning', detail: `${adapter.Name} collegato` };
  const bridged = await deps.exec(vbox, ['list', 'bridgedifs'], { timeoutMs: 12_000 });
  if (bridged.code !== 0) return { id: 'network', status: 'warning', detail: 'Rete non verificabile' };
  const wanted = key(adapter.Description);
  const usable = parseBridgedNames(bridged.stdout).some((name) => key(name) === wanted);
  return usable
    ? { id: 'network', status: 'ok', detail: `${adapter.Name} collegato` }
    : { id: 'network', status: 'warning', detail: 'Rete non utilizzabile da VirtualBox' };
};

export const checkInternet = async (deps: SetupDeps): Promise<SetupCheck> => {
  const { status } = await deps.httpGet(deps.tuning.diskUrl, {
    headers: { Range: 'bytes=0-0' },
    timeoutMs: Math.min(12_000, deps.tuning.checkTimeoutMs),
    maxBodyBytes: 1,
  });
  return status === 200 || status === 206
    ? { id: 'internet', status: 'ok', detail: 'Raggiungibile' }
    : { id: 'internet', status: 'missing', detail: 'Non raggiungibile' };
};

/** Memoria e processori: la VM ne usa 2 GB e 2 core, il resto serve a Windows. */
export const checkHardware = (deps: SetupDeps): SetupCheck => {
  const { totalMemoryBytes, logicalCpus } = deps.machine();
  const memoryGb = Math.round(totalMemoryBytes / 1024 ** 3);
  const summary = `${memoryGb} GB, ${logicalCpus} core`;
  if (memoryGb < MIN_MEMORY_GB || logicalCpus < MIN_CPUS) {
    return { id: 'hardware', status: 'missing', detail: `${summary}: ne servono ${MIN_MEMORY_GB} GB e ${MIN_CPUS} core` };
  }
  if (memoryGb < COMFORT_MEMORY_GB || logicalCpus < COMFORT_CPUS) {
    return { id: 'hardware', status: 'warning', detail: `${summary}: al limite, il PC sarà più lento` };
  }
  return { id: 'hardware', status: 'ok', detail: summary };
};

/** Esegue i controlli in parallelo; l'ordine del risultato è fisso. */
export const runAllChecks = async (deps: SetupDeps, centraleDir: string): Promise<SetupCheck[]> => {
  const vbox = await findVBoxManage(deps);
  return Promise.all([
    guarded('virtualbox', deps, () => checkVirtualBox(deps, vbox), { id: 'virtualbox', status: 'warning', detail: 'Non verificabile' }),
    guarded('hardware', deps, async () => checkHardware(deps), { id: 'hardware', status: 'warning', detail: 'Non verificabile' }),
    guarded('disk', deps, () => checkDisk(deps, centraleDir), { id: 'disk', status: 'warning', detail: 'Non verificabile' }),
    guarded('network', deps, () => checkNetwork(deps, vbox), { id: 'network', status: 'warning', detail: 'Rete non verificabile' }),
    guarded('internet', deps, () => checkInternet(deps), { id: 'internet', status: 'missing', detail: 'Non raggiungibile' }),
  ]);
};
