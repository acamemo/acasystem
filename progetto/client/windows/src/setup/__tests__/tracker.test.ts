// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { resolveDeps } from '../deps.ts';
import type { ExecResult } from '../deps.ts';
import { acaStepSeconds, coreEtaSeconds, createTracker, parseCoreJob } from '../tracker.ts';
import type { TrackerOutcome } from '../tracker.ts';

const VBOX = 'C:\\VBoxManage.exe';
const ok = (stdout: string): ExecResult => ({ code: 0, stdout, stderr: '', timedOut: false });
const ARP = '  192.168.1.66          08-00-27-ab-cd-ef     dinamico\r\n';
const NAT = { bridgeAdapter: 'Wi-Fi di prova', jobsPort: 49380, corePort: 49381, appPort: 49382 };

const machineSpec = { memory: 16 * 1024 ** 3, cpus: 8 };

const world = (bytesPerSecond?: number, setupNat?: typeof NAT) => {
  machineSpec.memory = 16 * 1024 ** 3;
  machineSpec.cpus = 8;
  const state = {
    vmState: 'poweroff',
    network: 'bridged',
    cableConnected: true,
    bridgeFails: false,
    disconnectFails: false,
    bridgeCommands: [] as string[][],
    bridgeWaits: [] as Array<{ ms: number; network: string; cableConnected: boolean }>,
    arp: '',
    core: 0,
    jobs: { status: 404, body: '' } as { status: number; body: string },
    receivedBytes: null as number | null,
    aca: { status: 0, body: '' },
    natCore: 302,
    natOnboarding: { status: 404, body: '' },
    natAca: { status: 0, body: '' },
    time: 1_000_000,
  };
  const deps = resolveDeps({
    env: { SystemRoot: 'C:\\Windows' },
    now: () => state.time,
    ...(setupNat ? { sleep: async (ms: number) => {
      state.bridgeWaits.push({ ms, network: state.network, cableConnected: state.cableConnected });
      state.time += ms;
    } } : {}),
    networkInterfaces: () => ({}),
    exec: async (file, args) => {
      if (file === VBOX && args[0] === 'debugvm') {
        expect(args).toEqual(['debugvm', 'vm-1', 'statistics', '--pattern=/Public/NetAdapter/0/BytesReceived']);
        if (state.receivedBytes === null) return { code: 1, stdout: '', stderr: 'E_ACCESSDENIED', timedOut: false };
        return ok(`<Statistics>\n<Counter c="${state.receivedBytes}" unit="bytes" name="/Public/NetAdapter/0/BytesReceived"/>\n</Statistics>`);
      }
      if (file === VBOX && args[0] === 'controlvm') {
        state.bridgeCommands.push(args.slice(2));
        if (args[2] === 'setlinkstate1') {
          state.cableConnected = args[3] === 'on';
          if (!state.cableConnected && state.disconnectFails) return { code: null, stdout: '', stderr: '', timedOut: true };
        }
        if (args[2] === 'nic1') {
          if (state.bridgeFails) return { code: 1, stdout: '', stderr: 'scheda non disponibile', timedOut: false };
          state.network = args[3] ?? '';
        }
        return ok('');
      }
      if (file === VBOX) return ok(`VMState="${state.vmState}"\nmacaddress1="080027ABCDEF"\nnic1="${state.network}"\ncableconnected1="${state.cableConnected ? 'on' : 'off'}"\n`);
      return args[0] === '-a' ? ok(state.arp) : ok('');
    },
    httpGet: async (url) => {
      if (url === 'http://192.168.1.66:8123/api/') return { status: state.core, body: '' };
      if (url === 'http://192.168.1.66/supervisor-api/jobs/info') return state.jobs;
      if (url === 'http://192.168.1.66:3002/api/health') return state.aca;
      if (url === `http://127.0.0.1:${NAT.corePort}/api/`) {
        if (state.natCore === 302 || state.natCore === 307) throw new Error('Troppi reindirizzamenti');
        return { status: state.natCore, body: '' };
      }
      if (url === `http://127.0.0.1:${NAT.jobsPort}/supervisor-api/jobs/info`) return state.jobs;
      if (url === `http://127.0.0.1:${NAT.jobsPort}/api/onboarding`) return state.natOnboarding;
      if (url === `http://127.0.0.1:${NAT.appPort}/api/health`) return state.natAca;
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
    ...(setupNat ? { setupNat } : {}),
    windowStart: state.time,
    ...(bytesPerSecond ? { downloadBytesPerSecond: bytesPerSecond } : {}),
    onOutcome: (o) => outcomes.push(o),
  });
  return { state, tracker, outcomes };
};

const jobsBody = (percent: number, done = false): { status: number; body: string } => ({
  status: 200,
  body: JSON.stringify({
    result: 'ok',
    data: {
      jobs: [
        { name: 'app_manager_install', reference: 'local_aca_schermata', progress: 0, done: false, child_jobs: [] },
        { name: 'home_assistant_core_install', reference: null, progress: percent, done, child_jobs: [] },
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

  it('con Core a zero, la ricezione sostenuta evita lo stallo finché arrivano dati', async () => {
    const { state, tracker, outcomes } = running(5_000_000);
    state.jobs = jobsBody(0);
    state.receivedBytes = 100_000_000;
    await tracker.tick();
    for (let i = 0; i < 121; i++) {
      state.time += 10_000;
      state.receivedBytes += 585_430; // ritmo del caso reale, byte in dieci secondi
      await tracker.tick();
    }
    const last = outcomes.at(-1);
    expect(progressOf(last)).toEqual({ label: 'Preparazione di Home Assistant in corso', percent: null, etaSeconds: null });
    expect(last?.kind === 'progress' && last.steps.find((step) => step.id === 'core')?.detail).toBe('Dati in ricezione');
    state.time += 19 * 60_000;
    await tracker.tick();
    expect(outcomes.at(-1)?.kind).toBe('progress');
    state.time += 60_000;
    await tracker.tick();
    expect(outcomes.at(-1)).toEqual({ kind: 'failed' });
  });

  it('un picco isolato, il rumore di rete e un reset del contatore non rinnovano lo stallo', async () => {
    const { state, tracker, outcomes } = running();
    state.jobs = jobsBody(0);
    state.receivedBytes = 131_000_000;
    await tracker.tick();
    state.time += 600_000;
    state.receivedBytes += 500_000;
    await tracker.tick();
    state.time += 10_000;
    state.receivedBytes += 700_000; // un solo intervallo sopra soglia
    await tracker.tick();
    state.time += 10_000;
    state.receivedBytes = 1_000; // contatore azzerato
    await tracker.tick();
    state.time += 580_000;
    state.receivedBytes += 1_000;
    await tracker.tick();
    expect(outcomes.at(-1)).toEqual({ kind: 'failed' });
  });

  it('traffico con job terminato o contatore inaccessibile non impedisce lo stallo', async () => {
    for (const [done, receivedBytes] of [[true, 131_000_000], [false, null]] as const) {
      const { state, tracker, outcomes } = running();
      state.jobs = jobsBody(0, done);
      await tracker.tick();
      state.time += 600_000;
      state.receivedBytes = receivedBytes;
      await tracker.tick();
      state.time += 600_000;
      state.receivedBytes = receivedBytes === null ? null : receivedBytes * 2;
      await tracker.tick();
      expect(outcomes.at(-1)).toEqual({ kind: 'failed' });
    }
  });

  it('un nuovo avanzamento sotto il massimo precedente rinnova la finestra', async () => {
    const { state, tracker, outcomes } = running();
    state.jobs = jobsBody(50);
    await tracker.tick();
    state.time += 19 * 60_000;
    state.jobs = jobsBody(10);
    await tracker.tick();
    state.time += 60_000;
    state.jobs = jobsBody(12);
    await tracker.tick();
    expect(progressOf(outcomes.at(-1)).percent).toBe(50);
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

describe('primo avvio in NAT', () => {
  it('legge il progresso in loopback, attende Core e Acasystem, poi richiede health sulla LAN', async () => {
    const { state, tracker, outcomes } = world(undefined, NAT);
    state.vmState = 'running';
    state.network = 'nat';
    state.jobs = jobsBody(44.2);
    state.natAca = { status: 200, body: '{"status":"ok"}' };
    await tracker.tick();
    expect(progressOf(outcomes.at(-1)).percent).toBe(44);
    expect(outcomes.at(-1)).not.toHaveProperty('ip');
    expect(state.bridgeCommands).toHaveLength(0);

    state.natCore = 307;
    state.natOnboarding = { status: 200, body: '[{"step":"user","done":false}]' };
    await tracker.tick();
    expect(state.bridgeCommands).toEqual([
      ['nic1', 'bridged', NAT.bridgeAdapter], ['setlinkstate1', 'off'], ['setlinkstate1', 'on'],
    ]);
    expect(state.bridgeWaits).toEqual([{ ms: 10_000, network: 'bridged', cableConnected: false }]);
    expect(progressOf(outcomes.at(-1)).label).toBe('Collegamento alla rete di casa');

    state.arp = ARP;
    await tracker.tick();
    expect(outcomes.at(-1)?.kind).toBe('progress');
    state.aca = { status: 200, body: '{"status":"ok"}' };
    await tracker.tick();
    expect(outcomes.at(-1)).toEqual({ kind: 'ready', ip: '192.168.1.66' });
  });

  it('lascia il link attivo in NAT se il passaggio al bridge fallisce', async () => {
    const { state, tracker, outcomes } = world(undefined, NAT);
    state.vmState = 'running';
    state.network = 'nat';
    state.bridgeFails = true;
    state.natCore = 401;
    state.natAca = { status: 200, body: '{"status":"ok"}' };
    await tracker.tick();
    expect(state.network).toBe('nat');
    expect(state.cableConnected).toBe(true);
    expect(state.bridgeCommands).toEqual([['nic1', 'bridged', NAT.bridgeAdapter]]);
    expect(outcomes.at(-1)).toMatchObject({ kind: 'failed', message: expect.stringContaining('rete di casa') });
  });

  it('riattacca il cavo anche se il comando di scollegamento va in timeout', async () => {
    const { state, tracker, outcomes } = world(undefined, NAT);
    state.vmState = 'running';
    state.network = 'nat';
    state.disconnectFails = true;
    state.natCore = 401;
    state.natAca = { status: 200, body: '{"status":"ok"}' };
    await tracker.tick();
    expect(state.network).toBe('bridged');
    expect(state.cableConnected).toBe(true);
    expect(state.bridgeCommands.at(-1)).toEqual(['setlinkstate1', 'on']);
    expect(state.bridgeWaits).toHaveLength(0);
    expect(outcomes.at(-1)).toMatchObject({ kind: 'failed', message: expect.stringContaining('rete di casa') });
  });

  it('alla riapertura riprende sul bridge e riattacca il cavo se il passaggio era stato interrotto', async () => {
    const { state, tracker, outcomes } = world(undefined, NAT);
    state.vmState = 'running';
    state.cableConnected = false;
    state.arp = ARP;
    state.aca = { status: 200, body: '{"status":"ok"}' };
    await tracker.tick();
    expect(state.bridgeCommands).toEqual([['setlinkstate1', 'on']]);
    expect(outcomes.at(-1)).toEqual({ kind: 'ready', ip: '192.168.1.66' });
  });
});

describe('parseCoreJob', () => {
  it('legge il valore del lavoro di Home Assistant Core', () => {
    expect(parseCoreJob(jobsBody(44.2).body)).toEqual({ percent: 44.2, active: true });
    expect(parseCoreJob(jobsBody(100, true).body)).toEqual({ percent: 100, active: false });
  });
  it('lavoro assente o JSON non valido: nessun job', () => {
    expect(parseCoreJob('{"result":"ok","data":{"jobs":[{"name":"altro","progress":5}]}}')).toBeNull();
    expect(parseCoreJob('{"result":"ok","data":{"jobs":[]}}')).toBeNull();
    expect(parseCoreJob('non json')).toBeNull();
    expect(parseCoreJob('<html>404</html>')).toBeNull();
  });
  it('un job attivo può essere privo di un valore numerico', () => {
    const body = '{"data":{"jobs":[{"name":"home_assistant_core_install","progress":"44","done":false}]}}';
    expect(parseCoreJob(body)).toEqual({ percent: null, active: true });
  });
  it('limita il valore tra 0 e 100', () => {
    expect(parseCoreJob(jobsBody(130).body)?.percent).toBe(100);
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
    expect(progressOf(outcomes.at(-1))).toEqual({ label: 'Preparazione di Home Assistant in corso', percent: null, etaSeconds: null });
    state.jobs = { status: 200, body: '{rotto' };
    await tracker.tick();
    expect(progressOf(outcomes.at(-1)).percent).toBeNull();
  });

  it('mantiene la percentuale massima mentre sono disponibili valori positivi', async () => {
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

  it('zero dopo un tentativo e percentuale che si arrotonderebbe a zero restano indeterminati', async () => {
    const { state, tracker, outcomes } = running(5_000_000);
    state.jobs = jobsBody(50);
    await tracker.tick();
    for (const percent of [0, 0.2]) {
      state.jobs = jobsBody(percent);
      await tracker.tick();
      expect(progressOf(outcomes.at(-1))).toEqual({ label: 'Preparazione di Home Assistant in corso', percent: null, etaSeconds: null });
    }
    state.jobs = jobsBody(5);
    await tracker.tick();
    expect(progressOf(outcomes.at(-1))).toMatchObject({ label: 'Download di Home Assistant', percent: 5 });
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
