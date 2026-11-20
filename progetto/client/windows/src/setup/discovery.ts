import type { SetupDeps } from './deps.ts';
import { DISCOVERY_PORT } from './constants.ts';

/** Scoperta dell'indirizzo IP della VM dal suo MAC: sweep TCP /24 per riempire la tabella ARP. */

/** Cifre esadecimali in minuscolo, senza separatori («08-00-27-AB-CD-EF» → «080027abcdef»). */
export const normalizeMac = (mac: string): string => mac.replace(/[^0-9a-fA-F]/g, '').toLowerCase();

export interface ArpEntry {
  ip: string;
  mac: string;
  type: string;
}

/** Output di `arp -a` di Windows (anche in italiano: «dinamico», «statico»), più interfacce. */
export const parseArp = (text: string): ArpEntry[] => {
  const entries: ArpEntry[] = [];
  const pattern = /^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F]{2}(?:[-:][0-9a-fA-F]{2}){5})\s+(\S+)/;
  for (const line of text.split(/\r?\n/)) {
    const match = pattern.exec(line);
    if (match?.[1] && match[2] && match[3]) entries.push({ ip: match[1], mac: normalizeMac(match[2]), type: match[3] });
  }
  return entries;
};

/** Reti /24 private del PC: esclusi link-local, loopback e la rete host-only di VirtualBox. */
export const lanSubnets = (interfaces: ReturnType<SetupDeps['networkInterfaces']>): string[] => {
  const prefixes = new Set<string>();
  for (const list of Object.values(interfaces)) {
    for (const item of list ?? []) {
      if (item.family !== 'IPv4' || item.internal) continue;
      const address = item.address;
      if (address.startsWith('169.254.') || address.startsWith('127.') || address.startsWith('192.168.56.')) continue;
      const octets = address.split('.').map(Number);
      const [a, b] = octets;
      const isPrivate = a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168);
      if (isPrivate && octets.length === 4) prefixes.add(octets.slice(0, 3).join('.'));
    }
  }
  return [...prefixes];
};

const SWEEP_CONCURRENCY = 64;
const SWEEP_TIMEOUT_MS = 400;

export interface IpDiscovery {
  /** IP del dispositivo con quel MAC, o null se non ancora visibile. */
  find(mac: string): Promise<string | null>;
}

export const createIpDiscovery = (deps: SetupDeps): IpDiscovery => {
  let lastSweep = -Infinity;

  const readArp = async (): Promise<ArpEntry[]> => {
    const root = deps.env.SystemRoot ?? deps.env.SYSTEMROOT;
    const file = root ? `${root}\\System32\\arp.exe` : 'arp';
    const result = await deps.exec(file, ['-a'], { timeoutMs: 10_000 });
    return result.code === 0 ? parseArp(result.stdout) : [];
  };

  const sweep = async (): Promise<void> => {
    const targets: string[] = [];
    for (const prefix of lanSubnets(deps.networkInterfaces())) {
      for (let host = 1; host <= 254; host++) targets.push(`${prefix}.${host}`);
    }
    let next = 0;
    const worker = async (): Promise<void> => {
      while (next < targets.length) {
        const target = targets[next++];
        if (target) await deps.tcpProbe(target, DISCOVERY_PORT, SWEEP_TIMEOUT_MS).catch(() => false);
      }
    };
    await Promise.all(Array.from({ length: Math.min(SWEEP_CONCURRENCY, targets.length) }, worker));
  };

  const lookup = async (wanted: string): Promise<string | null> =>
    (await readArp()).find((entry) => entry.mac === wanted)?.ip ?? null;

  return {
    find: async (mac) => {
      const wanted = normalizeMac(mac);
      if (wanted.length !== 12) return null;
      const known = await lookup(wanted);
      if (known) return known;
      const at = deps.now();
      if (at - lastSweep < deps.tuning.sweepIntervalMs) return null;
      lastSweep = at;
      await sweep();
      return lookup(wanted);
    },
  };
};
