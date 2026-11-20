// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { checkHardware, runAllChecks } from '../checks.ts';
import { resolveDeps } from '../deps.ts';
import type { ExecResult, SetupDepsInput } from '../deps.ts';

const GB = 1024 ** 3;
const VBOX = 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe';

const ok = (stdout: string): ExecResult => ({ code: 0, stdout, stderr: '', timedOut: false });

const build = (options: {
  vbox?: boolean;
  free?: number;
  route?: string;
  bridged?: string;
  internet?: number;
  memoryGb?: number;
  cpus?: number;
}) => {
  const input: SetupDepsInput = {
    env: { ProgramW6432: 'C:\\Program Files' },
    pathExists: async (path) => (options.vbox ?? true) && path === VBOX,
    freeBytes: async () => options.free ?? 112 * GB,
    machine: () => ({ totalMemoryBytes: (options.memoryGb ?? 16) * GB, logicalCpus: options.cpus ?? 8 }),
    exec: async (file, args) => {
      if (file === VBOX && args[0] === '--version') return ok('7.2.22r170000\r\n');
      if (file === VBOX && args[0] === 'list') return ok(options.bridged ?? 'Name:            Intel(R) Wi-Fi 6 AX201 160MHz\r\nGUID: x\r\n');
      if (file === 'powershell.exe') {
        return ok(options.route ?? '{"Name":"Wi-Fi","Description":"Intel(R) Wi-Fi 6 AX201 160MHz"}');
      }
      return { code: 1, stdout: '', stderr: '', timedOut: false };
    },
    httpGet: async () => {
      if (options.internet === -1) throw new Error('rete assente');
      return { status: options.internet ?? 206, body: '' };
    },
  };
  return resolveDeps(input);
};

const byId = async (deps: ReturnType<typeof build>) =>
  Object.fromEntries((await runAllChecks(deps, 'C:\\ACA\\Centrale')).map((check) => [check.id, check]));

describe('runAllChecks', () => {
  it('tutto a posto', async () => {
    const checks = await byId(build({}));
    expect(checks.virtualbox).toEqual({ id: 'virtualbox', status: 'ok', detail: 'Installato, 7.2' });
    expect(checks.disk).toEqual({ id: 'disk', status: 'ok', detail: '112 GB liberi, ne servono 40' });
    expect(checks.network).toEqual({ id: 'network', status: 'ok', detail: 'Wi-Fi collegato' });
    expect(checks.internet).toEqual({ id: 'internet', status: 'ok', detail: 'Raggiungibile' });
  });

  it('restituisce i controlli nell’ordine fisso', async () => {
    const result = await runAllChecks(build({}), 'C:\\ACA\\Centrale');
    expect(result.map((check) => check.id)).toEqual(['virtualbox', 'hardware', 'disk', 'network', 'internet']);
  });

  it('VirtualBox assente: mancante, ma la rotta si segnala comunque', async () => {
    const checks = await byId(build({ vbox: false }));
    expect(checks.virtualbox).toEqual({ id: 'virtualbox', status: 'missing', detail: 'Non installato' });
    expect(checks.network?.status).toBe('warning');
    expect(checks.network?.detail).toBe('Wi-Fi collegato');
  });

  it('poco spazio libero', async () => {
    const checks = await byId(build({ free: 12.4 * GB }));
    expect(checks.disk).toEqual({ id: 'disk', status: 'missing', detail: 'Solo 12 GB liberi, ne servono 40' });
  });

  it('nessuna rotta predefinita', async () => {
    const checks = await byId(build({ route: '{}' }));
    expect(checks.network).toEqual({ id: 'network', status: 'missing', detail: 'Nessuna rete' });
  });

  it('scheda non utilizzabile da VirtualBox', async () => {
    const checks = await byId(build({ bridged: 'Name: Altra scheda\r\n' }));
    expect(checks.network).toEqual({ id: 'network', status: 'warning', detail: 'Rete non utilizzabile da VirtualBox' });
  });

  it('Internet non raggiungibile: stato diverso da 200/206 o errore di rete', async () => {
    expect((await byId(build({ internet: 403 }))).internet?.status).toBe('missing');
    expect((await byId(build({ internet: -1 }))).internet).toEqual({
      id: 'internet',
      status: 'missing',
      detail: 'Non raggiungibile',
    });
  });

  it('un controllo che non risponde entro il tempo massimo non blocca gli altri', async () => {
    const deps = resolveDeps({
      ...build({}),
      tuning: { checkTimeoutMs: 50 },
      httpGet: () => new Promise(() => undefined),
    });
    const checks = await byId(deps);
    expect(checks.internet?.status).toBe('missing');
    expect(checks.virtualbox?.status).toBe('ok');
  });
});

describe('memoria e processore', () => {
  it('16 GB e 8 core: ok con il riepilogo', () => {
    expect(checkHardware(build({}))).toEqual({ id: 'hardware', status: 'ok', detail: '16 GB, 8 core' });
  });
  it('4 GB o 2 core: al limite, si può continuare', () => {
    expect(checkHardware(build({ memoryGb: 4, cpus: 8 })).status).toBe('warning');
    expect(checkHardware(build({ memoryGb: 16, cpus: 2 })).detail).toBe('16 GB, 2 core: al limite, il PC sarà più lento');
  });
  it('sotto 4 GB o con un solo core: requisito mancante', () => {
    expect(checkHardware(build({ memoryGb: 3, cpus: 8 }))).toEqual({ id: 'hardware', status: 'missing', detail: '3 GB, 8 core: ne servono 4 GB e 2 core' });
    expect(checkHardware(build({ memoryGb: 8, cpus: 1 })).status).toBe('missing');
  });
});
