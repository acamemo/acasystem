// @vitest-environment node

import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createOwnedHaVmManager, parseVBoxMachineInfo, parseVBoxMediumInfo } from '../ownedHaVm.ts';
import type { OwnedHaVmOptions, VBoxExecutor } from '../ownedHaVm.ts';

let directory: string;
let options: OwnedHaVmOptions;
const diskUuid = 'b905c3b1-5ffc-4617-88df-6d62adab4235';

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'aca-vm-'));
  options = {
    vboxManagePath: 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe',
    stateDirectory: join(directory, 'engine'),
    sourceDiskPath: join(directory, 'clean.vdi'),
    vmName: 'ACA System Motore',
    forwardings: [
      { name: 'ha-http', hostPort: 8123, guestPort: 80 },
      { name: 'aca-http', hostPort: 3002, guestPort: 3002 },
    ],
  };
  await writeFile(options.sourceDiskPath, 'disco iniziale finto, mai una VM reale');
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const fakeVBox = () => {
  const calls: string[][] = [];
  const vms = new Map<string, Record<string, string>>();
  const markers = new Map<string, string>();
  let failCommand = '';
  const value = (args: readonly string[], flag: string): string => args[args.indexOf(flag) + 1] ?? '';
  const execute: VBoxExecutor = async (file, args) => {
    expect(file).toBe(options.vboxManagePath);
    calls.push([...args]);
    const command = args[0];
    if (command === failCommand || (failCommand === 'controlvm-add' && command === 'controlvm' && args[3] !== 'delete')) {
      failCommand = '';
      throw new Error('interruzione simulata');
    }
    let stdout = '';
    const vm = vms.get(args[1] ?? '');
    switch (command) {
      case 'list':
        stdout = [...vms.values()].map((item) => `${JSON.stringify(item.name)} {${item.UUID}}`).join('\n');
        break;
      case 'createvm': {
        const uuid = value(args, '--uuid');
        const name = value(args, '--name');
        const path = join(value(args, '--basefolder'), name, `${name}.vbox`);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, 'impostazioni simulate');
        vms.set(uuid, { UUID: uuid, name, CfgFile: path, VMState: 'poweroff' });
        break;
      }
      case 'showvminfo':
        if (!vm) throw new Error('VM non trovata');
        stdout = Object.entries(vm).map(([key, item]) => `${JSON.stringify(key)}=${JSON.stringify(item)}`).join('\n');
        // Formato osservato su VBox 7.2.4 con VM attiva: il suffisso non appartiene a JSON.
        if (vm.VMState === 'running') stdout += '\nVideoMode="0,0,0"@0,0 1';
        break;
      case 'getextradata':
        stdout = markers.has(args[1]!) ? `Value: ${markers.get(args[1]!)}` : 'No value set!';
        break;
      case 'setextradata':
        markers.set(args[1]!, args[3]!);
        break;
      case 'clonemedium':
        await writeFile(args[3]!, 'clone simulato');
        break;
      case 'showmediuminfo':
        // Il binario 7.2.4 non supporta --machinereadable per questo comando.
        if (args.includes('--machinereadable')) throw new Error('Unknown option: --machinereadable');
        expect(args).toEqual(['showmediuminfo', 'disk', join(options.stateDirectory, 'haos.vdi')]);
        stdout = `UUID:           ${diskUuid}\nParent UUID:    base\nState:          created\nType:           normal (base)\nLocation:       ${args[2]}\nStorage format: VDI\nFormat variant: dynamic default\nCapacity:       32768 MBytes\nSize on disk:   545 MBytes\nEncryption:     disabled\n`;
        break;
      case 'modifyvm':
      case 'controlvm':
        if (!vm) throw new Error('VM non trovata');
        for (const setting of ['memory', 'cpus', 'firmware']) {
          if (args.includes(`--${setting}`)) vm[setting] = value(args, `--${setting}`);
        }
        if (args.includes('--nic1')) vm.nic1 = value(args, '--nic1');
        if (args.includes('--natpf1') || args.includes('natpf1')) {
          const rule = value(args, args.includes('--natpf1') ? '--natpf1' : 'natpf1');
          const name = rule === 'delete' ? args.at(-1)! : rule.split(',')[0]!;
          for (const key of Object.keys(vm)) {
            if (key.startsWith('Forwarding(') && vm[key]?.startsWith(`${name},`)) delete vm[key];
          }
          if (rule !== 'delete') vm[`Forwarding(${Object.keys(vm).length})`] = rule;
        }
        break;
      case 'storagectl':
        if (!vm) throw new Error('VM non trovata');
        vm.storagecontrollername0 = 'SATA';
        break;
      case 'storageattach':
        if (!vm) throw new Error('VM non trovata');
        vm['SATA-0-0'] = value(args, '--medium');
        vm['SATA-ImageUUID-0-0'] = diskUuid;
        break;
      case 'startvm':
        if (!vm) throw new Error('VM non trovata');
        vm.VMState = 'running';
        break;
      default:
        throw new Error(`Comando inatteso: ${command}`);
    }
    return { stdout, stderr: '' };
  };
  return { execute, calls, vms, markers, failNext: (command: string) => { failCommand = command; } };
};

describe('motore HA OS posseduto da ACA', () => {
  it('crea una sola VM e un solo clone, applica NAT solo loopback e avvia headless', async () => {
    const fake = fakeVBox();
    const manager = createOwnedHaVmManager(options, fake.execute);
    expect(await manager.status()).toMatchObject({ kind: 'absent', configured: false });
    const first = await manager.start();
    expect(first).toMatchObject({ kind: 'present', configured: true, state: 'running' });
    const second = await createOwnedHaVmManager(options, fake.execute).start();
    expect(second.vmUuid).toBe(first.vmUuid);
    expect(fake.calls.filter((call) => call[0] === 'createvm')).toHaveLength(1);
    expect(fake.calls.filter((call) => call[0] === 'clonemedium')).toHaveLength(1);
    expect(fake.calls.filter((call) => call[0] === 'startvm')).toEqual([['startvm', first.vmUuid, '--type', 'headless']]);
    const network = fake.calls.filter((call) => call.includes('--natpf1'));
    expect(network.map((call) => call.at(-1))).toEqual([
      'ha-http,tcp,127.0.0.1,8123,,80', 'aca-http,tcp,127.0.0.1,3002,,3002',
    ]);
    expect(await readFile(options.sourceDiskPath, 'utf8')).toContain('disco iniziale');
  });

  it('serializza due richieste contemporanee senza duplicare VM o avvio', async () => {
    const fake = fakeVBox();
    const manager = createOwnedHaVmManager(options, fake.execute);
    await Promise.all([manager.start(), manager.start()]);
    expect(fake.calls.filter((call) => call[0] === 'createvm')).toHaveLength(1);
    expect(fake.calls.filter((call) => call[0] === 'startvm')).toHaveLength(1);
  });

  it.each(['0.0.0.0', '8.8.8.8', '172.32.0.1', '169.254.1.2', '100.64.1.2', 'casa.local', '::1', '192.168.001.2'])(
    'rifiuta bind non privati o ambigui: %s', (hostAddress) => {
      expect(() => createOwnedHaVmManager({ ...options, forwardings: [
        { name: 'lan-aca', hostAddress, hostPort: 3002, guestPort: 3002 },
      ] }, fakeVBox().execute)).toThrow(/IPv4 privato/);
    }
  );

  it.each(['192.168.1.20', '10.0.0.10', '172.16.0.5', '172.31.255.2'])(
    'espone ACA solo sul bind privato esplicito %s conservando il loopback', async (hostAddress) => {
      const fake = fakeVBox();
      const manager = createOwnedHaVmManager({ ...options, forwardings: [
        ...options.forwardings, { name: 'lan-aca', hostAddress, hostPort: 3002, guestPort: 3002 },
      ] }, fake.execute);
      expect((await manager.start()).configured).toBe(true);
      const network = fake.calls.filter((call) => call.includes('--natpf1')).map((call) => call.at(-1));
      expect(network).toContain(`lan-aca,tcp,${hostAddress},3002,,3002`);
      expect(network).toContain('aca-http,tcp,127.0.0.1,3002,,3002');
    }
  );

  it('aggiorna il solo indirizzo LAN con VM attiva senza riavviarla o ricrearla', async () => {
    const fake = fakeVBox();
    const initial = [
      ...options.forwardings, { name: 'lan-aca', hostAddress: '192.168.1.20', hostPort: 3002, guestPort: 3002 },
    ];
    const manager = createOwnedHaVmManager({ ...options, forwardings: initial }, fake.execute);
    const started = await manager.start();
    const before = fake.calls.length;
    const desired = [...options.forwardings,
      { name: 'lan-aca', hostAddress: '192.168.1.21', hostPort: 3002, guestPort: 3002 },
    ];
    expect(await manager.configureForwardings(desired)).toMatchObject({ state: 'running', configured: true, vmUuid: started.vmUuid });
    const mutations = fake.calls.slice(before).filter((call) => !['list', 'showvminfo', 'getextradata'].includes(call[0]!));
    expect(mutations).toEqual([
      ['controlvm', started.vmUuid, 'natpf1', 'delete', 'lan-aca'],
      ['controlvm', started.vmUuid, 'natpf1', 'lan-aca,tcp,192.168.1.21,3002,,3002'],
    ]);
    expect((await createOwnedHaVmManager({ ...options, forwardings: desired }, fake.execute).start()).vmUuid).toBe(started.vmUuid);
    expect(fake.calls.filter((call) => call[0] === 'startvm')).toHaveLength(1);
    expect(fake.calls.filter((call) => call[0] === 'clonemedium')).toHaveLength(1);
  });

  it('riconcilia nuove regole anche alla riapertura mantenendo il journal esistente', async () => {
    const fake = fakeVBox();
    const initial = await createOwnedHaVmManager(options, fake.execute).start();
    const desired = [...options.forwardings,
      { name: 'lan-aca', hostAddress: '10.0.0.10', hostPort: 3002, guestPort: 3002 },
    ];
    expect(await createOwnedHaVmManager({ ...options, forwardings: desired }, fake.execute).start())
      .toMatchObject({ configured: true, state: 'running', vmUuid: initial.vmUuid });
    expect(fake.calls.filter((call) => call[0] === 'controlvm')).toEqual([
      ['controlvm', initial.vmUuid, 'natpf1', 'lan-aca,tcp,10.0.0.10,3002,,3002'],
    ]);
  });

  it('riprende un cambio IP interrotto dopo la rimozione della vecchia regola LAN', async () => {
    const fake = fakeVBox();
    const manager = createOwnedHaVmManager({ ...options, forwardings: [...options.forwardings,
      { name: 'lan-aca', hostAddress: '192.168.1.20', hostPort: 3002, guestPort: 3002 },
    ] }, fake.execute);
    const state = await manager.start();
    const desired = [...options.forwardings,
      { name: 'lan-aca', hostAddress: '192.168.1.21', hostPort: 3002, guestPort: 3002 },
    ];
    fake.failNext('controlvm-add');
    await expect(manager.configureForwardings(desired)).rejects.toMatchObject({ code: 'command' });
    expect((await manager.configureForwardings(desired)).configured).toBe(true);
    expect(fake.vms.get(state.vmUuid!)!.VMState).toBe('running');
    expect(fake.calls.filter((call) => call[0] === 'controlvm' && call[3] === 'delete')).toEqual([
      ['controlvm', state.vmUuid, 'natpf1', 'delete', 'lan-aca'],
    ]);
    expect(fake.calls.filter((call) => call[0] === 'startvm')).toHaveLength(1);
  });

  it('non aggiorna gli inoltri quando il marker proprietario è cambiato', async () => {
    const fake = fakeVBox();
    const manager = createOwnedHaVmManager(options, fake.execute);
    const state = await manager.start();
    fake.markers.set(state.vmUuid!, diskUuid);
    const before = fake.calls.length;
    await expect(manager.configureForwardings([...options.forwardings,
      { name: 'lan-aca', hostAddress: '10.0.0.10', hostPort: 3002, guestPort: 3002 },
    ])).rejects.toMatchObject({ code: 'ownership' });
    expect(fake.calls.slice(before).every((call) => ['list', 'showvminfo', 'getextradata'].includes(call[0]!))).toBe(true);
  });

  it('non adotta una VM omonima e non invia comandi di modifica', async () => {
    const fake = fakeVBox();
    fake.vms.set(diskUuid, { name: options.vmName, UUID: diskUuid });
    await expect(createOwnedHaVmManager(options, fake.execute).start()).rejects.toMatchObject({ code: 'ownership' });
    expect(fake.calls).toEqual([['list', 'vms']]);
  });

  it.each(['marker', 'path', 'disk'])('blocca la proprietà inattesa: %s', async (changed) => {
    const fake = fakeVBox();
    const manager = createOwnedHaVmManager(options, fake.execute);
    const state = await manager.provision();
    const vm = fake.vms.get(state.vmUuid!)!;
    if (changed === 'marker') fake.markers.set(state.vmUuid!, diskUuid);
    if (changed === 'path') vm.CfgFile = join(directory, 'estranea.vbox');
    if (changed === 'disk') vm['SATA-0-0'] = join(directory, 'dati-altrui.vdi');
    const before = fake.calls.length;
    await expect(manager.start()).rejects.toMatchObject({ code: 'ownership' });
    expect(fake.calls.slice(before).every((call) => ['list', 'showvminfo', 'getextradata'].includes(call[0]!))).toBe(true);
  });

  it('riprende una configurazione interrotta senza riclonare il disco', async () => {
    const fake = fakeVBox();
    fake.failNext('storageattach');
    await expect(createOwnedHaVmManager(options, fake.execute).provision()).rejects.toMatchObject({ code: 'command' });
    const next = await createOwnedHaVmManager(options, fake.execute).start();
    expect(next).toMatchObject({ state: 'running', configured: true });
    expect(fake.calls.filter((call) => call[0] === 'clonemedium')).toHaveLength(1);
    expect(fake.calls.filter((call) => call[0] === 'createvm')).toHaveLength(1);
    expect(fake.calls.filter((call) => call.includes('--natpf1'))).toHaveLength(2);
  });

  it('non adotta automaticamente una creazione interrotta prima del marker', async () => {
    const fake = fakeVBox();
    fake.failNext('setextradata');
    await expect(createOwnedHaVmManager(options, fake.execute).start()).rejects.toMatchObject({ code: 'command' });
    const before = fake.calls.length;
    await expect(createOwnedHaVmManager(options, fake.execute).start()).rejects.toMatchObject({ code: 'ownership' });
    expect(fake.calls.slice(before).every((call) => ['list', 'showvminfo', 'getextradata'].includes(call[0]!))).toBe(true);
    expect(fake.calls.filter((call) => call[0] === 'createvm')).toHaveLength(1);
  });

  it('non reinizializza un disco registrato che è stato rimosso', async () => {
    const fake = fakeVBox();
    const manager = createOwnedHaVmManager(options, fake.execute);
    const state = await manager.provision();
    await rm(join(options.stateDirectory, 'haos.vdi'));
    expect((await manager.status()).configured).toBe(false);
    await expect(manager.start()).rejects.toMatchObject({ code: 'ownership' });
    expect(fake.calls.filter((call) => call[0] === 'clonemedium')).toHaveLength(1);
    expect(state.configured).toBe(true);
  });

  it('rifiuta un inoltro estraneo che esporrebbe il guest su tutte le interfacce', async () => {
    const fake = fakeVBox();
    const manager = createOwnedHaVmManager(options, fake.execute);
    const state = await manager.provision();
    fake.vms.get(state.vmUuid!)!['Forwarding(99)'] = 'extra,tcp,,9999,,80';
    expect((await manager.status()).configured).toBe(false);
    const before = fake.calls.length;
    await expect(manager.start()).rejects.toMatchObject({ code: 'ownership' });
    expect(fake.calls.slice(before).every((call) => ['list', 'showvminfo', 'getextradata'].includes(call[0]!))).toBe(true);
  });

  it('non avvia una macchina modificata con una seconda scheda in bridge', async () => {
    const fake = fakeVBox();
    const manager = createOwnedHaVmManager(options, fake.execute);
    const state = await manager.provision();
    fake.vms.get(state.vmUuid!)!.nic2 = 'bridged';
    expect((await manager.status()).configured).toBe(false);
    await expect(manager.start()).rejects.toMatchObject({ code: 'ownership' });
    expect(fake.calls.some((call) => call[0] === 'startvm')).toBe(false);
  });

  it('non ricrea una VM già posseduta ma non più registrata', async () => {
    const fake = fakeVBox();
    const manager = createOwnedHaVmManager(options, fake.execute);
    await manager.provision();
    fake.vms.clear();
    expect(await manager.status()).toMatchObject({ kind: 'missing', configured: false });
    await expect(manager.start()).rejects.toMatchObject({ code: 'ownership' });
    expect(fake.calls.filter((call) => call[0] === 'createvm')).toHaveLength(1);
  });

  it('mantiene il registro corrotto e rifiuta modifiche al profilo esistente', async () => {
    const fake = fakeVBox();
    await createOwnedHaVmManager(options, fake.execute).provision();
    await expect(createOwnedHaVmManager({ ...options, cpus: 4 }, fake.execute).start()).rejects.toMatchObject({ code: 'ownership' });
    const path = join(options.stateDirectory, 'owned-vm.json');
    await writeFile(path, 'non json');
    await expect(createOwnedHaVmManager(options, fake.execute).start()).rejects.toMatchObject({ code: 'ownership' });
    expect(await readFile(path, 'utf8')).toBe('non json');
  });
});

describe('formato macchina VirtualBox', () => {
  it('legge percorsi Windows escaped e chiavi disco quotate', () => {
    expect(parseVBoxMachineInfo('CfgFile="C:\\\\ACA\\\\Motore.vbox"\n"SATA-0-0"="C:\\\\ACA\\\\haos.vdi"\ncpus=2')).toEqual({
      CfgFile: 'C:\\ACA\\Motore.vbox', 'SATA-0-0': 'C:\\ACA\\haos.vdi', cpus: '2',
    });
  });

  it('ignora VideoMode con il suffisso reale di una VM attiva', () => {
    expect(parseVBoxMachineInfo('VMState="running"\nVideoMode="0,0,0"@0,0 1\ncpus=2\n')).toEqual({
      VMState: 'running', cpus: '2',
    });
  });

  it.each(['CfgFile="C:\\\\ACA\\\\Motore.vbox"suffix', 'CfgFile=C:\\ACA\\Motore.vbox',
    '"SATA-0-0"="C:\\\\ACA\\\\haos.vdi"suffix', 'UUID="invalid"suffix', 'Forwarding(0)="ha-http,tcp,127.0.0.1,8123,,80"suffix'])(
    'continua a rifiutare un campo critico malformato: %s', (line) => {
      expect(() => parseVBoxMachineInfo(`VideoMode="0,0,0"@0,0 1\n${line}`)).toThrow(/campo critico/);
    }
  );

  it('legge il formato testuale showmediuminfo 7.2.4 preservando i due punti del percorso Windows', () => {
    expect(parseVBoxMediumInfo(`UUID:           ${diskUuid}\r\nParent UUID:    base\r\nState:          created\r\nLocation:       C:\\Users\\Mario Rossi\\ACA\\haos.vdi\r\nStorage format: VDI\r\nCapacity:       32768 MBytes\r\n`)).toEqual({
      UUID: diskUuid, State: 'created', Location: 'C:\\Users\\Mario Rossi\\ACA\\haos.vdi', 'Storage format': 'VDI',
    });
  });

  it('non scambia la vecchia fixture key=value per informazioni disco reali', () => {
    expect(parseVBoxMediumInfo(`UUID="${diskUuid}"`)).toEqual({});
    expect(() => parseVBoxMediumInfo(`UUID: ${diskUuid}\nUUID: ${diskUuid}`)).toThrow(/duplicati/);
  });
});
