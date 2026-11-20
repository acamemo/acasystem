// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { resolveDeps } from '../deps.ts';
import { createIpDiscovery, lanSubnets, normalizeMac, parseArp } from '../discovery.ts';
import { parseShowVmInfo } from '../vm.ts';

const ARP_IT = `
Interfaccia: 192.168.1.5 --- 0x7
  Indirizzo Internet    Indirizzo fisico      Tipo
  192.168.1.1           a4-2b-b0-11-22-33     dinamico
  192.168.1.66          08-00-27-ab-cd-ef     dinamico
  192.168.1.255         ff-ff-ff-ff-ff-ff     statico
  224.0.0.22            01-00-5e-00-00-16     statico

Interfaccia: 192.168.56.1 --- 0xb
  Indirizzo Internet    Indirizzo fisico      Tipo
  192.168.56.255        ff-ff-ff-ff-ff-ff     statico
  224.0.0.22            01-00-5e-00-00-16     statico
`;

describe('normalizeMac', () => {
  it('ignora maiuscole e separatori', () => {
    expect(normalizeMac('08-00-27-AB-CD-EF')).toBe('080027abcdef');
    expect(normalizeMac('08:00:27:ab:cd:ef')).toBe('080027abcdef');
    expect(normalizeMac('080027ABCDEF')).toBe('080027abcdef');
  });
});

describe('parseArp', () => {
  it('legge le voci dinamiche e statiche di più interfacce', () => {
    const entries = parseArp(ARP_IT);
    expect(entries).toHaveLength(6);
    expect(entries[1]).toEqual({ ip: '192.168.1.66', mac: '080027abcdef', type: 'dinamico' });
    expect(entries.filter((e) => e.type === 'statico')).toHaveLength(4);
  });

  it('ignora intestazioni e righe vuote', () => {
    expect(parseArp('Nessuna voce ARP trovata.\r\n')).toEqual([]);
  });
});

describe('lanSubnets', () => {
  it('esclude link-local, loopback, host-only di VirtualBox e reti pubbliche', () => {
    const entry = (address: string, internal = false) => ({
      address,
      family: 'IPv4' as const,
      internal,
      netmask: '255.255.255.0',
      mac: '00:00:00:00:00:00',
      cidr: `${address}/24`,
    });
    const subnets = lanSubnets({
      Wifi: [entry('192.168.1.5'), entry('169.254.3.4')],
      Loop: [entry('127.0.0.1', true)],
      VBox: [entry('192.168.56.1')],
      Vpn: [entry('10.8.0.2'), entry('8.8.8.8')],
    });
    expect(subnets.sort()).toEqual(['10.8.0', '192.168.1']);
  });
});

describe('parseShowVmInfo', () => {
  it('legge stato e MAC', () => {
    const info = parseShowVmInfo('name="ACA"\nVMState="running"\nmacaddress1="080027ABCDEF"\nVMStateChangeTime="x"\n');
    expect(info).toEqual({ state: 'running', mac: '080027abcdef' });
  });
});

describe('createIpDiscovery', () => {
  const build = (arpOutputs: string[]) => {
    let call = 0;
    const probes: string[] = [];
    let time = 0;
    const deps = resolveDeps({
      exec: async () => ({ code: 0, stdout: arpOutputs[Math.min(call++, arpOutputs.length - 1)] ?? '', stderr: '', timedOut: false }),
      tcpProbe: async (host) => {
        probes.push(host);
        return false;
      },
      networkInterfaces: () => ({
        Wifi: [{ address: '192.168.1.5', family: 'IPv4', internal: false, netmask: '255.255.255.0', mac: '', cidr: null }],
      }),
      now: () => time,
      env: { SystemRoot: 'C:\\Windows' },
    });
    return { discovery: createIpDiscovery(deps), probes, advance: (ms: number) => (time += ms) };
  };

  it('trova l’IP già nella tabella ARP senza sweep', async () => {
    const { discovery, probes } = build([ARP_IT]);
    expect(await discovery.find('08:00:27:AB:CD:EF')).toBe('192.168.1.66');
    expect(probes).toHaveLength(0);
  });

  it('fa uno sweep di .1-.254, al massimo ogni 30 secondi, poi rilegge ARP', async () => {
    const { discovery, probes, advance } = build(['', ARP_IT]);
    expect(await discovery.find('080027abcdef')).toBe('192.168.1.66');
    expect(probes).toHaveLength(254);
    expect(probes[0]).toBe('192.168.1.1');

    const second = build(['', '', '', '']);
    expect(await second.discovery.find('080027abcdef')).toBeNull();
    expect(second.probes).toHaveLength(254);
    expect(await second.discovery.find('080027abcdef')).toBeNull();
    expect(second.probes).toHaveLength(254);
    second.advance(31_000);
    expect(await second.discovery.find('080027abcdef')).toBeNull();
    expect(second.probes).toHaveLength(508);
    void advance;
  });
});
