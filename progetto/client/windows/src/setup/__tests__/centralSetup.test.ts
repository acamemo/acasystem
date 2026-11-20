// @vitest-environment node

import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCentralSetup } from '../centralSetup.ts';
import type { ExecResult, SetupDepsInput } from '../deps.ts';
import { loadState, saveState } from '../state.ts';
import type { CentralSetup, SetupPhase } from '../types.ts';

const VBOX = 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe';
const ok = (stdout = ''): ExecResult => ({ code: 0, stdout, stderr: '', timedOut: false });
const ARP = '  192.168.1.66          08-00-27-ab-cd-ef     dinamico\r\n';
const disk = Buffer.from(Array.from({ length: 120_000 }, (_, i) => (i * 13 + 5) % 253));
const sha = (data: Buffer): string => createHash('sha256').update(data).digest('hex');

let root: string;
let userData: string;
let centraleDir: string;
let server: http.Server | null = null;
const created: CentralSetup[] = [];

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'aca-setup-'));
  userData = join(root, 'userData');
  centraleDir = join(root, 'Centrale');
  await mkdir(userData, { recursive: true });
});

afterEach(async () => {
  created.splice(0).forEach((setup) => setup.dispose());
  server?.closeAllConnections();
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = null;
  await rm(root, { recursive: true, force: true });
});

const serveDisk = async (data = disk): Promise<string> => {
  server = http.createServer((req, res) => {
    const match = /^bytes=(\d+)-$/.exec(req.headers.range ?? '');
    const start = match ? Number(match[1]) : 0;
    res.writeHead(start > 0 ? 206 : 200, { 'Content-Length': data.length - start });
    res.end(data.subarray(start));
  });
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/aca-centrale.vdi.zip`;
};

interface Fakes {
  scriptCode?: number;
  scriptStdout?: string;
  scriptCalls: string[][];
  core: number;
  aca: { status: number; body: string };
}

const make = async (overrides: SetupDepsInput = {}, fakes: Partial<Fakes> = {}) => {
  const state: Fakes = { scriptCalls: [], core: 401, aca: { status: 200, body: '{"status":"ok"}' }, ...fakes };
  const url = await serveDisk();
  const setup = createCentralSetup({
    userDataDir: userData,
    centraleDir,
    scriptsDir: join(root, 'Installatore'),
    deps: {
      env: { ProgramW6432: 'C:\\Program Files', SystemRoot: 'C:\\Windows' },
      pathExists: async (path) => path === VBOX || (await stat(path).then(() => true, () => false)),
      networkInterfaces: () => ({}),
      exec: async (file, args) => {
        if (file === VBOX) return ok('VMState="running"\nmacaddress1="080027ABCDEF"\n');
        if (file.endsWith('tar.exe')) {
          await writeFile(join(args[3] ?? '', 'disco.vdi'), 'vdi');
          return ok();
        }
        if (file === 'powershell.exe') {
          state.scriptCalls.push(args);
          if (state.scriptCode) return { code: state.scriptCode, stdout: state.scriptStdout ?? '', stderr: 'raw', timedOut: false };
          await mkdir(centraleDir, { recursive: true });
          await writeFile(
            join(centraleDir, 'installazione.json'),
            `\uFEFF${JSON.stringify({ vmId: 'vm-1', nomeVm: 'ACA-Centrale', cartella: centraleDir, attivita: 'x' })}`
          );
          return ok('Fatto.');
        }
        return ok(ARP); // arp -a
      },
      httpGet: async (target) => {
        if (target.includes(':8123')) return { status: state.core, body: '' };
        if (target.includes(':3002')) return state.aca;
        throw new Error('inatteso');
      },
      ...overrides,
      tuning: {
        diskUrl: url,
        diskSizeBytes: disk.length,
        diskSha256: sha(disk),
        retryDelayMs: 5,
        pollMs: 5,
        progressIntervalMs: 0,
        ...overrides.tuning,
      },
    },
  });
  created.push(setup);
  const phases: SetupPhase[] = [];
  setup.onChange((phase) => phases.push(phase));
  return { setup, state, phases };
};

const waitFor = async (setup: CentralSetup, name: SetupPhase['phase'], ms = 4000): Promise<SetupPhase> => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (setup.getPhase().phase === name) return setup.getPhase();
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`fase ${name} non raggiunta, ora: ${JSON.stringify(setup.getPhase())}`);
};

describe('flusso completo', () => {
  it('download → verifica → creazione → preparazione → pronta, con stato persistito', async () => {
    const { setup, state, phases } = await make();
    expect(setup.getPhase()).toEqual({ phase: 'welcome', checking: false, checks: [] });
    await setup.start();
    const ready = await waitFor(setup, 'ready');
    expect(ready.phase === 'ready' && ready.ip).toBe('192.168.1.66');
    expect(ready.phase === 'ready' && ready.port).toBe(3002);
    expect(ready.phase === 'ready' && ready.qr.length).toBeGreaterThan(20);
    expect(ready.phase === 'ready' && ready.qr.every((row) => row.length === ready.qr.length)).toBe(true);

    const names = phases.map((phase) => phase.phase);
    for (const expected of ['download', 'verify', 'creating', 'preparing', 'ready']) expect(names).toContain(expected);
    expect(names.indexOf('verify')).toBeGreaterThan(names.indexOf('download'));
    expect(names.indexOf('ready')).toBeGreaterThan(names.indexOf('preparing'));

    const call = state.scriptCalls[0] ?? [];
    expect(call).toContain('-NonInterattivo');
    expect(call[call.indexOf('-Cartella') + 1]).toBe(centraleDir);
    expect(call[call.indexOf('-Disco') + 1]).toBe(join(root, 'Download', 'disco.vdi'));

    expect((await loadState(userData))?.phase).toBe('ready');
    await expect(readdir(join(root, 'Download'))).rejects.toThrow(); // cartella dei download rimossa
  });

  it('resume() da ready ricostruisce la fase pronta', async () => {
    await saveState(userData, { schema: 1, phase: 'ready', vmId: 'vm-1', ip: '192.168.1.66', startedAt: 1_000_000, readyAt: 1_000_000 + 25 * 60_000 });
    const { setup } = await make();
    expect(await setup.resume()).toBe(true);
    const phase = setup.getPhase();
    expect(phase.phase === 'ready' && phase.elapsedMinutes).toBe(25);
    expect(phase.phase === 'ready' && phase.qr.length).toBeGreaterThan(20);
  });
});

describe('errori', () => {
  it('impronta diversa: failed verify, file eliminato, riprovabile', async () => {
    const { setup } = await make({ tuning: { diskSha256: sha(Buffer.from('altro')) } });
    await setup.start();
    const failed = await waitFor(setup, 'failed');
    expect(failed).toEqual({
      phase: 'failed',
      step: 'verify',
      message: 'Il disco scaricato non corrisponde a quello previsto. Riprova: verrà scaricato di nuovo.',
      canRetry: true,
    });
    await expect(stat(join(root, 'Download', 'aca-centrale.vdi.zip.part'))).rejects.toThrow();
  });

  it('creazione fallita: usa l’ultimo messaggio ERRORE dello script, mai lo stderr grezzo', async () => {
    const { setup } = await make({}, { scriptCode: 1, scriptStdout: 'Controllo...\r\nERRORE: Prima cosa\r\nERRORE: Servono almeno 40 GB liberi sul disco.\r\n' });
    await setup.start();
    const failed = await waitFor(setup, 'failed');
    expect(failed).toEqual({ phase: 'failed', step: 'creating', message: 'Servono almeno 40 GB liberi sul disco.', canRetry: true });
  });

  it('creazione fallita senza ERRORE: messaggio generico', async () => {
    const { setup } = await make({}, { scriptCode: 1, scriptStdout: 'boh' });
    await setup.start();
    const failed = await waitFor(setup, 'failed');
    expect(failed.phase === 'failed' && failed.message).not.toContain('raw');
    expect(failed.phase === 'failed' && failed.step).toBe('creating');
  });

  it('retry dopo creazione fallita riesegue solo la creazione (il disco è già estratto)', async () => {
    const { setup, state } = await make({}, { scriptCode: 1, scriptStdout: 'ERRORE: no' });
    await setup.start();
    await waitFor(setup, 'failed');
    state.scriptCode = 0;
    await setup.retry();
    await waitFor(setup, 'ready');
    expect(state.scriptCalls).toHaveLength(2);
  });

  it('retry con cartella a metà senza installazione.json: non riprova alla cieca', async () => {
    const { setup } = await make({}, { scriptCode: 1, scriptStdout: 'ERRORE: no' });
    await setup.start();
    await waitFor(setup, 'failed');
    await mkdir(centraleDir);
    await setup.retry();
    const phase = setup.getPhase();
    expect(phase.phase === 'failed' && phase.canRetry).toBe(false);
  });

  it('20 minuti senza progressi: failed preparing; retry riprende il tracciamento', async () => {
    let time = 5_000_000;
    const { setup, state } = await make({ now: () => time }, { aca: { status: 503, body: '' } });
    await setup.start();
    await waitFor(setup, 'preparing');
    time += 21 * 60_000;
    const failed = await waitFor(setup, 'failed');
    expect(failed).toEqual({
      phase: 'failed',
      step: 'preparing',
      message: 'Da 20 minuti la centrale non fa progressi. Controlla la connessione a Internet e riprova.',
      canRetry: true,
    });
    state.aca = { status: 200, body: '{"status":"ok"}' };
    await setup.retry();
    const ready = await waitFor(setup, 'ready');
    expect(ready.phase === 'ready' && ready.elapsedMinutes).toBeGreaterThanOrEqual(21);
  });

  it('retry azzera la finestra: non fallisce subito, fallisce dopo altri 20 minuti', async () => {
    let time = 5_000_000;
    const { setup } = await make({ now: () => time }, { aca: { status: 503, body: '' } });
    await setup.start();
    await waitFor(setup, 'preparing');
    time += 21 * 60_000;
    await waitFor(setup, 'failed');
    await setup.retry();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(setup.getPhase().phase).toBe('preparing');
    time += 19 * 60_000;
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(setup.getPhase().phase).toBe('preparing');
    time += 2 * 60_000;
    await waitFor(setup, 'failed');
  });

  it('la fase download porta startedAt e la velocità media viene salvata nello stato', async () => {
    let time = 7_000_000;
    const { setup, phases } = await make({ now: () => (time += 100) });
    await setup.start();
    await waitFor(setup, 'ready');
    const downloads = phases.filter((phase) => phase.phase === 'download');
    expect(downloads.length).toBeGreaterThan(0);
    const starts = new Set(downloads.map((phase) => (phase.phase === 'download' ? phase.startedAt : 0)));
    expect(starts.size).toBe(1);
    const stored = await loadState(userData);
    expect(stored?.downloadBytesPerSecond).toBeGreaterThan(0);
  });

  it('resume() usa la velocità salvata per stimare i tempi', async () => {
    await saveState(userData, { schema: 1, phase: 'preparing', vmId: 'vm-1', startedAt: 1, downloadBytesPerSecond: 1_000_000 });
    const jobs = JSON.stringify({ data: { jobs: [{ name: 'home_assistant_core_install', progress: 50 }] } });
    const { setup } = await make(
      {
        machine: () => ({ totalMemoryBytes: 16 * 1024 ** 3, logicalCpus: 8 }),
        httpGet: async (target) => {
          if (target.endsWith('/supervisor-api/jobs/info')) return { status: 200, body: jobs };
          if (target.includes(':8123')) return { status: 200, body: '' };
          return { status: 503, body: '' };
        },
      },
      {}
    );
    expect(await setup.resume()).toBe(true);
    const end = Date.now() + 3000;
    let eta: number | null = null;
    while (Date.now() < end && eta === null) {
      const phase = setup.getPhase();
      if (phase.phase === 'preparing' && phase.progress.percent === 50) eta = phase.progress.etaSeconds;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    // 50% di 1.070 MB a 1 MB/s = 535 s, più 300 s di Acasystem e 60 s di installazione
    expect(eta).toBe(535 + 360);
  });
});

describe('annullamento', () => {
  it('cancel() durante il download torna a welcome e conserva il file parziale', async () => {
    const { setup } = await make();
    // server lento: invia metà e resta in attesa
    server?.closeAllConnections();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Length': disk.length });
      res.write(disk.subarray(0, 40_000));
    });
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
    const slow = createCentralSetup({
      userDataDir: userData,
      centraleDir,
      scriptsDir: join(root, 'Installatore'),
      deps: { tuning: { diskUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/d.zip`, diskSizeBytes: disk.length, progressIntervalMs: 0 } },
    });
    created.push(slow);
    void setup;
    const started = slow.start();
    const end = Date.now() + 3000;
    while (Date.now() < end) {
      const phase = slow.getPhase();
      if (phase.phase === 'download' && phase.progress.receivedBytes > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await slow.cancel();
    await started;
    expect(slow.getPhase().phase).toBe('welcome');
    expect((await stat(join(root, 'Download', 'd.zip.part'))).size).toBeGreaterThan(0);
  });
});

describe('resume()', () => {
  it('senza file di stato: false', async () => {
    const { setup } = await make();
    expect(await setup.resume()).toBe(false);
    expect(setup.getPhase().phase).toBe('welcome');
  });

  it('preparing: riprende il tracciamento fino a pronta', async () => {
    await saveState(userData, { schema: 1, phase: 'preparing', vmId: 'vm-1', startedAt: Date.now() - 60_000 });
    const { setup } = await make();
    expect(await setup.resume()).toBe(true);
    expect((await waitFor(setup, 'ready')).phase).toBe('ready');
    expect((await loadState(userData))?.phase).toBe('ready');
  });

  it('creating con installazione.json: passa a preparing', async () => {
    await saveState(userData, { schema: 1, phase: 'creating' });
    await mkdir(centraleDir, { recursive: true });
    await writeFile(join(centraleDir, 'installazione.json'), JSON.stringify({ vmId: 'vm-9', nomeVm: 'x', cartella: centraleDir, attivita: 'x' }));
    const { setup } = await make();
    expect(await setup.resume()).toBe(true);
    expect(setup.getPhase().phase).toBe('preparing');
    expect((await loadState(userData))?.vmId).toBe('vm-9');
  });

  it('creating senza installazione.json: failed creating riprovabile', async () => {
    await saveState(userData, { schema: 1, phase: 'creating' });
    const { setup } = await make();
    expect(await setup.resume()).toBe(true);
    const phase = setup.getPhase();
    expect(phase.phase === 'failed' && phase.step).toBe('creating');
    expect(phase.phase === 'failed' && phase.canRetry).toBe(true);
  });

  it('file di stato illeggibile: false', async () => {
    await writeFile(join(userData, 'centrale-setup.json'), '{non json');
    const { setup } = await make();
    expect(await setup.resume()).toBe(false);
  });
});

describe('stato persistito', () => {
  it('scrittura atomica: nessun file temporaneo rimasto e contenuto leggibile', async () => {
    await saveState(userData, { schema: 1, phase: 'preparing', vmId: 'a', startedAt: 5 });
    expect((await readdir(userData)).filter((name) => name.endsWith('.tmp'))).toEqual([]);
    expect(JSON.parse(await readFile(join(userData, 'centrale-setup.json'), 'utf8'))).toEqual({
      schema: 1,
      phase: 'preparing',
      vmId: 'a',
      startedAt: 5,
    });
  });

  it('durante la creazione lo stato è «creating» prima di eseguire lo script', async () => {
    let seen: string | undefined;
    const { setup } = await make({
      exec: async (file, args) => {
        if (file.endsWith('tar.exe')) {
          await writeFile(join(args[3] ?? '', 'disco.vdi'), 'vdi');
          return ok();
        }
        if (file === 'powershell.exe') {
          seen = (await loadState(userData))?.phase;
          return { code: 1, stdout: 'ERRORE: x', stderr: '', timedOut: false };
        }
        return ok();
      },
    });
    await setup.start();
    await waitFor(setup, 'failed');
    expect(seen).toBe('creating');
  });
});

describe('controlli', () => {
  it('runChecks: welcome con checking true e poi i quattro risultati', async () => {
    const { setup, phases } = await make({ freeBytes: async () => 50 * 1024 ** 3 });
    await setup.runChecks();
    expect(phases[0]).toMatchObject({ phase: 'welcome', checking: true });
    const last = setup.getPhase();
    expect(last.phase === 'welcome' && last.checking).toBe(false);
    expect(last.phase === 'welcome' && last.checks.map((check) => check.id)).toEqual(['virtualbox', 'hardware', 'disk', 'network', 'internet']);
  });
});
