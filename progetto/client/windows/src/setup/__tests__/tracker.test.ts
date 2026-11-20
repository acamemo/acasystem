// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { resolveDeps } from '../deps.ts';
import type { ExecResult } from '../deps.ts';
import { createTracker } from '../tracker.ts';
import type { TrackerOutcome } from '../tracker.ts';

const VBOX = 'C:\\VBoxManage.exe';
const ok = (stdout: string): ExecResult => ({ code: 0, stdout, stderr: '', timedOut: false });
const ARP = '  192.168.1.66          08-00-27-ab-cd-ef     dinamico\r\n';

const world = () => {
  const state = {
    vmState: 'poweroff',
    arp: '',
    core: 0,
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
      if (url === 'http://192.168.1.66:3002/api/health') return state.aca;
      throw new Error('inatteso');
    },
    tuning: { pollMs: 5, preparingTimeoutMs: 90 * 60_000 },
  });
  const outcomes: TrackerOutcome[] = [];
  const tracker = createTracker({ deps, vbox: VBOX, vmId: 'vm-1', windowStart: state.time, onOutcome: (o) => outcomes.push(o) });
  return { state, tracker, outcomes };
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

  it('dopo 90 minuti senza essere pronta fallisce', async () => {
    const { state, tracker, outcomes } = world();
    await tracker.tick();
    state.time += 89 * 60_000;
    await tracker.tick();
    expect(outcomes.at(-1)?.kind).toBe('progress');
    state.time += 61_000;
    await tracker.tick();
    expect(outcomes.at(-1)).toEqual({ kind: 'failed' });
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
