// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { resolveDeps } from '../deps.ts';
import type { ExecResult } from '../deps.ts';
import { acaStepSeconds, coreEtaSeconds, createTracker, parseCoreProgress } from '../tracker.ts';
import type { TrackerOutcome } from '../tracker.ts';

const VBOX = 'C:\\VBoxManage.exe';
const ok = (stdout: string): ExecResult => ({ code: 0, stdout, stderr: '', timedOut: false });
const ARP = '  192.168.1.66          08-00-27-ab-cd-ef     dinamico\r\n';

const machineSpec = { memory: 16 * 1024 ** 3, cpus: 8 };

const world = (bytesPerSecond?: number) => {
  machineSpec.memory = 16 * 1024 ** 3;
  machineSpec.cpus = 8;
  const state = {
    vmState: 'poweroff',
    arp: '',
    core: 0,
    jobs: { status: 404, body: '' } as { status: number; body: string },
    aca: { status: 0, body: '' },
    time: 1_000_000,
  };
  const deps = resolveDeps({
    env: { SystemRoot: 'C:\\Windows' },
    now: () => state.time,
    networkInterfaces: () => ({}),
    exec: async (file, args) => {
      if (file === VBOX) return ok(`VMState="${state.vmState}"\nmacaddress1="080027ABCDEF"\n`);
      return args[0] === '-a' ? ok(state.arp) : ok('');
    },
    httpGet: async (url) => {
      if (url === 'http://192.168.1.66:8123/api/') return { status: state.core, body: '' };
      if (url === 'http://192.168.1.66/supervisor-api/jobs/info') return state.jobs;
      if (url === 'http://192.168.1.66:3002/api/health') return state.aca;
      throw new Error('inatteso');
    },
    machine: () => ({ totalMemoryBytes: machineSpec.memory, logicalCpus: machineSpec.cpus }),
    tuning: { pollMs: 5, preparingStallMs: 20 * 60_000 },
  });
  const outcomes: TrackerOutcome[] = [];
  const tracker = createTracker({
    deps,
    vbox: VBOX,
    vmId: 'vm-1',
    windowStart: state.time,
    ...(bytesPerSecond ? { downloadBytesPerSecond: bytesPerSecond } : {}),
    onOutcome: (o) => outcomes.push(o),
  });
  return { state, tracker, outcomes };
};

const jobsBody = (percent: number): { status: number; body: string } => ({
  status: 200,
  body: JSON.stringify({
    result: 'ok',
    data: {
      jobs: [
        { name: 'app_manager_install', reference: 'local_aca_schermata', progress: 0, done: false, child_jobs: [] },
        { name: 'home_assistant_core_install', reference: null, progress: percent, done: false, child_jobs: [] },
      ],
    },
  }),
});

const progressOf = (outcome: TrackerOutcome | undefined) => {
  if (outcome?.kind !== 'progress') throw new Error('atteso progress');
  return outcome.progress;
};

/** Mondo con VM accesa e IP noto, Home Assistant ancora in scaricamento. */
const running = (bytesPerSecond?: number) => {
  const w = world(bytesPerSecond);
  w.state.vmState = 'running';
  w.state.arp = ARP;
  return w;
};

const stepStates = (outcome: TrackerOutcome | undefined): string => {
  if (outcome?.kind !== 'progress') return outcome?.kind ?? 'nessuno';
  return outcome.steps.map((step) => `${step.id}:${step.state}`).join(' ');
};

describe('createTracker', () => {
  it('percorre vm → ip → core 401 → aca ok → pronta', async () => {
    const { state, tracker, outcomes } = world();

    await tracker.tick();
    expect(stepStates(outcomes.at(-1))).toBe('disk:done vm:active core:pending aca:pending qr:pending');

    state.vmState = 'running';
    await tracker.tick(); // VM accesa ma ARP ancora vuota
    expect(stepStates(outcomes.at(-1))).toBe('disk:done vm:active core:pending aca:pending qr:pending');

    state.arp = ARP;
    state.core = 200; // pagina di primo avvio: non è ancora Home Assistant
    await tracker.tick();
    const last = outcomes.at(-1);
    expect(stepStates(last)).toBe('disk:done vm:done core:active aca:pending qr:pending');
    expect(last?.kind === 'progress' && last.steps[1]?.detail).toBe('192.168.1.66');
    expect(last?.kind === 'progress' && last.ip).toBe('192.168.1.66');

    state.core = 401;
    state.aca = { status: 503, body: '' };
    await tracker.tick();
    expect(stepStates(outcomes.at(-1))).toBe('disk:done vm:done core:done aca:active qr:pending');

    state.aca = { status: 200, body: '{"status":"ok"}' };
    await tracker.tick();
    expect(outcomes.at(-1)).toEqual({ kind: 'ready', ip: '192.168.1.66' });

    const count = outcomes.length;
    await tracker.tick(); // dopo la fine non succede altro
    expect(outcomes).toHaveLength(count);
  });

  it('Acasystem pronto vale anche se il controllo di Home Assistant è in ritardo', async () => {
    const { state, tracker, outcomes } = world();
    state.vmState = 'running';
    state.arp = ARP;
    state.aca = { status: 200, body: '{"status":"ok"}' };
    await tracker.tick();
    expect(outcomes.at(-1)).toEqual({ kind: 'ready', ip: '192.168.1.66' });
  });

  it('una risposta di salute non ok non basta', async () => {
    const { state, tracker, outcomes } = world();
    state.vmState = 'running';
    state.arp = ARP;
    state.core = 401;
    state.aca = { status: 200, body: '{"status":"starting"}' };
    await tracker.tick();
    expect(outcomes.at(-1)?.kind).toBe('progress');
  });

  it('senza progressi per 20 minuti fallisce; non prima', async () => {
    const { state, tracker, outcomes } = world();
    await tracker.tick();
    state.time += 19 * 60_000;
    await tracker.tick();
    expect(outcomes.at(-1)?.kind).toBe('progress');
    state.time += 61_000;
    await tracker.tick();
    expect(outcomes.at(-1)).toEqual({ kind: 'failed' });
  });

  it('con l\'avanzamento che si muove la finestra si sposta e non fallisce', async () => {
    const { state, tracker, outcomes } = running();
    for (let percent = 10; percent <= 60; percent += 10) {
      state.jobs = jobsBody(percent);
      await tracker.tick();
      state.time += 15 * 60_000; // 75 minuti in tutto, ma ogni 15 c'è un progresso
      expect(outcomes.at(-1)?.kind).toBe('progress');
    }
    await tracker.tick(); // stesso valore da 15 minuti: ancora dentro i 20
    expect(outcomes.at(-1)?.kind).toBe('progress');
    state.time += 6 * 60_000;
    await tracker.tick();
    expect(outcomes.at(-1)).toEqual({ kind: 'failed' });
  });

  it('il cambio di passo conta come progresso', async () => {
    const { state, tracker, outcomes } = running();
    state.jobs = jobsBody(50);
    await tracker.tick();
    state.time += 19 * 60_000;
    state.core = 401;
    state.aca = { status: 503, body: '' };
    await tracker.tick();
    state.time += 19 * 60_000;
    await tracker.tick();
    expect(outcomes.at(-1)?.kind).toBe('progress');
  });

  it('il ciclo con timer chiama il tick più volte e si ferma con stop', async () => {
    const { state, tracker, outcomes } = world();
    state.vmState = 'running';
    state.arp = ARP;
    state.core = 401;
    tracker.start();
    await new Promise((resolve) => setTimeout(resolve, 60));
    tracker.stop();
    const count = outcomes.length;
    expect(count).toBeGreaterThan(2);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(outcomes).toHaveLength(count);
  });
});

describe('parseCoreProgress', () => {
  it('legge il valore del lavoro di Home Assistant Core', () => {
    expect(parseCoreProgress(jobsBody(44.2).body)).toBe(44.2);
  });
  it('lavoro assente, JSON non valido o valore non numerico: nessun dato', () => {
    expect(parseCoreProgress('{"result":"ok","data":{"jobs":[{"name":"altro","progress":5}]}}')).toBeNull();
    expect(parseCoreProgress('{"result":"ok","data":{"jobs":[]}}')).toBeNull();
    expect(parseCoreProgress('non json')).toBeNull();
    expect(parseCoreProgress('<html>404</html>')).toBeNull();
    expect(parseCoreProgress('{"data":{"jobs":[{"name":"home_assistant_core_install","progress":"44"}]}}')).toBeNull();
  });
  it('limita il valore tra 0 e 100', () => {
    expect(parseCoreProgress(jobsBody(130).body)).toBe(100);
  });
});

describe('avanzamento della preparazione', () => {
  it('VM accesa senza indirizzo: «Accensione della centrale», indeterminato', async () => {
    const { state, tracker, outcomes } = world();
    state.vmState = 'running';
    await tracker.tick();
    expect(progressOf(outcomes.at(-1))).toEqual({ label: 'Accensione della centrale', percent: null, etaSeconds: null });
  });

  it('jobs/info 404 o non valido non è un errore: percentuale indeterminata', async () => {
    const { state, tracker, outcomes } = running();
    await tracker.tick();
    expect(progressOf(outcomes.at(-1))).toEqual({ label: 'Download di Home Assistant', percent: null, etaSeconds: null });
    state.jobs = { status: 200, body: '{rotto' };
    await tracker.tick();
    expect(progressOf(outcomes.at(-1)).percent).toBeNull();
  });

  it('la percentuale non torna mai indietro', async () => {
    const { state, tracker, outcomes } = running();
    state.jobs = jobsBody(44.2);
    await tracker.tick();
    expect(progressOf(outcomes.at(-1)).percent).toBe(44);
    state.jobs = jobsBody(12);
    await tracker.tick();
    expect(progressOf(outcomes.at(-1)).percent).toBe(44);
    state.jobs = { status: 404, body: '' };
    await tracker.tick();
    expect(progressOf(outcomes.at(-1)).percent).toBe(44);
    state.jobs = jobsBody(60);
    await tracker.tick();
    expect(progressOf(outcomes.at(-1)).percent).toBe(60);
  });

  it('tempo stimato dal ritmo degli ultimi minuti, più il passo di Acasystem', async () => {
    const { state, tracker, outcomes } = running(5_000_000);
    state.jobs = jobsBody(20);
    await tracker.tick();
    state.time += 100_000;
    state.jobs = jobsBody(30); // 10 punti in 100 s: restano 70 punti = 700 s
    await tracker.tick();
    const acaSeconds = 300_000_000 / 5_000_000 + 60; // 120 s
    expect(progressOf(outcomes.at(-1)).etaSeconds).toBe(700 + acaSeconds);
  });

  it('senza ritmo ripiega sui byte e sulla velocità del PC', async () => {
    const { state, tracker, outcomes } = running(5_000_000);
    state.jobs = jobsBody(50);
    await tracker.tick();
    // (100-50)% di 1.070 MB a 5 MB/s = 107 s, più 120 s per Acasystem
    expect(progressOf(outcomes.at(-1)).etaSeconds).toBe(107 + 120);
  });

  it('senza ritmo né velocità il tempo non è stimabile', async () => {
    const { state, tracker, outcomes } = running();
    state.jobs = jobsBody(50);
    await tracker.tick();
    expect(progressOf(outcomes.at(-1))).toEqual({ label: 'Download di Home Assistant', percent: 50, etaSeconds: null });
  });

  it('i campioni oltre i 5 minuti non contano per il ritmo', () => {
    const samples = [
      { at: 0, percent: 40 },
      { at: 400_000, percent: 40 },
    ];
    expect(coreEtaSeconds(samples, 40, undefined)).toBeNull();
    expect(coreEtaSeconds(samples, 40, 10_000_000)).toBe(Math.round(0.6 * 1_070_000_000 / 10_000_000));
  });

  it('passo di Acasystem: stima a tempo con minimo di 30 s e tetto del 95%', async () => {
    const { state, tracker, outcomes } = running(5_000_000);
    state.core = 401;
    state.aca = { status: 503, body: '' };
    await tracker.tick(); // inizio del passo
    expect(progressOf(outcomes.at(-1))).toEqual({ label: 'Installazione di Acasystem', percent: 0, etaSeconds: 120 });
    state.time += 60_000;
    await tracker.tick();
    expect(progressOf(outcomes.at(-1))).toMatchObject({ percent: 50, etaSeconds: 60 });
    state.time += 50_000; // 110 s su 120: mancano 10 s, il minimo è 30
    await tracker.tick();
    expect(progressOf(outcomes.at(-1))).toMatchObject({ percent: 92, etaSeconds: 30 });
    state.time += 100_000;
    await tracker.tick();
    expect(progressOf(outcomes.at(-1))).toEqual({ label: 'Installazione di Acasystem', percent: 95, etaSeconds: null });
  });

  it('passo di Acasystem senza velocità nota: 180 s; PC debole: margine di 120 s', async () => {
    expect(acaStepSeconds(undefined, 60)).toBe(180);
    expect(acaStepSeconds(10_000_000, 120)).toBe(150);
    const { state, outcomes } = running(5_000_000);
    machineSpec.cpus = 2;
    const weak = createTracker({
      deps: resolveDeps({
        env: { SystemRoot: 'C:\\Windows' },
        now: () => state.time,
        networkInterfaces: () => ({}),
        exec: async (file, args) => (file === VBOX ? ok('VMState="running"\nmacaddress1="080027ABCDEF"\n') : args[0] === '-a' ? ok(ARP) : ok('')),
        httpGet: async (url) => (url.includes(':8123') ? { status: 401, body: '' } : { status: 503, body: '' }),
        machine: () => ({ totalMemoryBytes: 16 * 1024 ** 3, logicalCpus: 2 }),
      }),
      vbox: VBOX,
      vmId: 'vm-1',
      windowStart: state.time,
      downloadBytesPerSecond: 5_000_000,
      onOutcome: (o) => outcomes.push(o),
    });
    await weak.tick();
    expect(progressOf(outcomes.at(-1)).etaSeconds).toBe(180); // 60 s di download + 120 s
  });
});
