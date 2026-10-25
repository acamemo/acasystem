import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMMAND_CONFIRM_MS,
  COMMAND_GAP_MS,
  Casa3dCommandError,
  createCommandPath,
  type CommandAnswer,
  type CommandOutcome,
  type CommandPath,
  type CommandPathDeps,
} from '@/casa3d/commandPath';
import type { CommandQuestion, CommandStates } from '@/casa3d/commandPolicy';

/**
 * The path of a command (ADR-0014, T7): the barrier, the list, the question, the limit of 350 ms,
 * the answer. Fake timers, a fake `send` and fake states: no browser, no Home Assistant.
 */

let states: CommandStates;
let open: boolean;
let sent: Array<{ domain: string; service: string; data: Record<string, unknown> }>;
let outcomes: CommandOutcome[];
let refused: string[];
let questions: CommandQuestion[];
let answers: Array<(answer: CommandAnswer) => void>;
let sendImpl: () => Promise<unknown>;

function makePath(extra: Partial<CommandPathDeps> = {}): CommandPath {
  return createCommandPath({
    isOpen: () => open,
    getStates: () => states,
    send: (domain, service, data) => {
      sent.push({ domain, service, data });
      return sendImpl();
    },
    ask: (question) =>
      new Promise<CommandAnswer>((resolve) => {
        questions.push(question);
        answers.push(resolve);
      }),
    notify: (outcome) => outcomes.push(outcome),
    onRefused: (what) => refused.push(what),
    ...extra,
  });
}

const statuses = () => outcomes.map((outcome) => outcome.status);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21T10:00:00Z'));
  open = true;
  sent = [];
  outcomes = [];
  refused = [];
  questions = [];
  answers = [];
  sendImpl = () => Promise.resolve({ context: { id: 'x' } });
  states = {
    'light.sala': { state: 'off', attributes: { friendly_name: 'Lampada sala' } },
    'light.cucina': { state: 'on', attributes: { friendly_name: 'Plafoniera', brightness: 255 } },
    'lock.ingresso': { state: 'locked', attributes: { friendly_name: 'Porta' } },
    'lock.cantina': {
      state: 'locked',
      attributes: { friendly_name: 'Cantina', code_format: 'number' },
    },
    'cover.tapparella': {
      state: 'open',
      attributes: { friendly_name: 'Tapparella', current_position: 100 },
    },
  };
});
afterEach(() => {
  vi.useRealTimers();
});

const flush = () => vi.advanceTimersByTimeAsync(0);

describe('Casa 3D command path: the barrier and the list', () => {
  it('sends nothing while the barrier is closed, and says so', async () => {
    open = false;
    const path = makePath();
    await expect(path.run('light', 'toggle', { entity_id: 'light.sala' })).rejects.toMatchObject({
      code: 'closed',
    });
    expect(sent).toEqual([]);
    expect(refused).toEqual(['light.toggle']);
    expect(statuses()).toEqual([]);
  });

  it('refuses what is not on the list or not in shape, without sending', async () => {
    const path = makePath();
    await expect(
      path.run('climate', 'set_temperature', { entity_id: 'climate.t' })
    ).rejects.toMatchObject({
      code: 'not_allowed',
    });
    await expect(path.run('light', 'toggle', {})).rejects.toMatchObject({ code: 'bad_request' });
    await expect(path.run('light', 'toggle', { entity_id: 'light.manca' })).rejects.toMatchObject({
      code: 'unknown_entity',
    });
    expect(sent).toEqual([]);
    expect(statuses()).toEqual(['refused', 'refused', 'refused']);
  });

  it('does not make a rejection nobody awaits (the view calls void callService)', async () => {
    // Vitest fails the whole run on an unhandled rejection, so reaching the end is the proof.
    open = false;
    const path = makePath();
    void path.run('light', 'toggle', { entity_id: 'light.sala' });
    void path.run('climate', 'set_temperature', { entity_id: 'climate.t' });
    await flush();
    await vi.advanceTimersByTimeAsync(10);
    expect(sent).toEqual([]);
  });

  it('sends a command that is allowed, once, with the data the list lets through', async () => {
    const path = makePath();
    await path.run('light', 'turn_on', { entity_id: 'light.sala', brightness_pct: 30 });
    expect(sent).toEqual([
      {
        domain: 'light',
        service: 'turn_on',
        data: { entity_id: 'light.sala', brightness_pct: 30 },
      },
    ]);
  });
});

describe('Casa 3D command path: the limit of 350 ms', () => {
  it('takes the same command twice within the limit as one (a double tap)', async () => {
    const path = makePath();
    const first = path.run('light', 'toggle', { entity_id: 'light.sala' });
    await vi.advanceTimersByTimeAsync(120);
    const second = path.run('light', 'toggle', { entity_id: 'light.sala' });
    await Promise.all([first, second]);
    expect(sent).toHaveLength(1);
    // beyond the limit it is a new command (it toggles back)
    await vi.advanceTimersByTimeAsync(COMMAND_GAP_MS);
    await path.run('light', 'toggle', { entity_id: 'light.sala' });
    expect(sent).toHaveLength(2);
  });

  it('sends the first value of a swipe at once and the last one when the limit is over, nothing in between', async () => {
    const path = makePath();
    const values = [20, 35, 50, 65, 80];
    const calls = [];
    for (const value of values) {
      calls.push(path.run('light', 'turn_on', { entity_id: 'light.sala', brightness_pct: value }));
      await vi.advanceTimersByTimeAsync(60);
    }
    expect(sent.map((call) => call.data.brightness_pct)).toEqual([20]);
    await vi.advanceTimersByTimeAsync(COMMAND_GAP_MS);
    await Promise.all(calls);
    expect(sent.map((call) => call.data.brightness_pct)).toEqual([20, 80]);
  });

  it('never sends two commands to the same device less than 350 ms apart', async () => {
    const at: number[] = [];
    const path = makePath({
      send: (_domain, _service, data) => {
        at.push(Date.now());
        sent.push({ domain: 'light', service: 'turn_on', data });
        return Promise.resolve();
      },
    });
    for (let step = 0; step < 40; step += 1) {
      path.run('light', 'turn_on', { entity_id: 'light.sala', brightness_pct: step });
      await vi.advanceTimersByTimeAsync(37);
    }
    await vi.advanceTimersByTimeAsync(COMMAND_GAP_MS * 2);
    expect(at.length).toBeGreaterThan(3);
    for (let i = 1; i < at.length; i += 1) {
      expect(at[i]! - at[i - 1]!).toBeGreaterThanOrEqual(COMMAND_GAP_MS);
    }
    // and the last value is not lost
    expect(sent.at(-1)?.data.brightness_pct).toBe(39);
  });

  it('does not hold back a command to another device', async () => {
    const path = makePath();
    await path.run('light', 'toggle', { entity_id: 'light.sala' });
    await path.run('light', 'toggle', { entity_id: 'light.cucina' });
    expect(sent.map((call) => call.data.entity_id)).toEqual(['light.sala', 'light.cucina']);
  });

  it('drops a held command if the barrier closes before it is due', async () => {
    const path = makePath();
    await path.run('light', 'turn_on', { entity_id: 'light.sala', brightness_pct: 10 });
    const late = path.run('light', 'turn_on', { entity_id: 'light.sala', brightness_pct: 90 });
    const settled = late.then(
      () => 'sent',
      (error: Casa3dCommandError) => error.code
    );
    await vi.advanceTimersByTimeAsync(100);
    open = false;
    await vi.advanceTimersByTimeAsync(COMMAND_GAP_MS);
    await expect(settled).resolves.toBe('closed');
    expect(sent).toHaveLength(1);
  });
});

describe('Casa 3D command path: the question and the code', () => {
  it('asks before a lock opens and sends only after a yes, with the code', async () => {
    const path = makePath();
    const call = path.run('lock', 'unlock', { entity_id: 'lock.cantina' });
    await flush();
    expect(sent).toEqual([]);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ confirmLabel: 'Sblocca', danger: true });
    expect(questions[0]?.code?.mode).toBe('numeric');
    answers[0]?.({ ok: true, code: ' 4821 ' });
    await call;
    expect(sent).toEqual([
      { domain: 'lock', service: 'unlock', data: { entity_id: 'lock.cantina', code: '4821' } },
    ]);
  });

  it('sends nothing after a no, and says it was cancelled', async () => {
    const path = makePath();
    const call = path.run('lock', 'unlock', { entity_id: 'lock.ingresso' });
    const settled = call.catch((error: Casa3dCommandError) => error.code);
    await flush();
    answers[0]?.({ ok: false });
    await expect(settled).resolves.toBe('cancelled');
    expect(sent).toEqual([]);
    expect(statuses()).toEqual(['cancelled']);
  });

  it('refuses the answer if Esplora ended while the question was open', async () => {
    const path = makePath();
    const call = path.run('lock', 'unlock', { entity_id: 'lock.ingresso' });
    const settled = call.catch((error: Casa3dCommandError) => error.code);
    await flush();
    open = false;
    answers[0]?.({ ok: true });
    await expect(settled).resolves.toBe('closed');
    expect(sent).toEqual([]);
    expect(refused).toEqual(['lock.unlock']);
  });

  it('keeps one question on screen: a second command meanwhile is dropped', async () => {
    const path = makePath();
    const first = path.run('lock', 'unlock', { entity_id: 'lock.ingresso' });
    await flush();
    await expect(path.run('lock', 'unlock', { entity_id: 'lock.cantina' })).rejects.toMatchObject({
      code: 'busy',
    });
    answers[0]?.({ ok: true });
    await first;
    expect(sent).toHaveLength(1);
    // and the next one can ask again
    const next = path.run('lock', 'unlock', { entity_id: 'lock.cantina' });
    await flush();
    expect(questions).toHaveLength(2);
    answers[1]?.({ ok: false });
    await next.catch(() => undefined);
  });

  it('asks for a device the plan marks «ask first»', async () => {
    const path = makePath();
    const call = path.run('light', 'toggle', { entity_id: 'light.sala' }, { ask: true });
    await flush();
    expect(questions[0]?.title).toBe('Cambia Lampada sala?');
    answers[0]?.({ ok: true });
    await call;
    expect(sent).toHaveLength(1);
  });

  it('never keeps the code in what it reports', async () => {
    const path = makePath();
    const call = path.run('lock', 'unlock', { entity_id: 'lock.cantina' });
    await flush();
    answers[0]?.({ ok: true, code: '9999' });
    await call;
    await vi.advanceTimersByTimeAsync(COMMAND_CONFIRM_MS + 10);
    expect(JSON.stringify(outcomes)).not.toContain('9999');
  });
});

describe('Casa 3D command path: the answer', () => {
  it('says sent, then done when the device shows the state', async () => {
    const path = makePath();
    await path.run('light', 'turn_on', { entity_id: 'light.sala' });
    expect(statuses()).toEqual(['sent']);
    states = { ...states, 'light.sala': { state: 'on', attributes: {} } };
    path.observe();
    expect(statuses()).toEqual(['sent', 'confirmed']);
    expect(outcomes.at(-1)?.label).toBe('Accendi Lampada sala');
    // once is enough
    path.observe();
    expect(statuses()).toEqual(['sent', 'confirmed']);
  });

  it('says done at once when the state is already there when Home Assistant answers', async () => {
    const path = makePath();
    sendImpl = () => {
      states = { ...states, 'light.sala': { state: 'on', attributes: {} } };
      return Promise.resolve();
    };
    await path.run('light', 'turn_on', { entity_id: 'light.sala' });
    expect(statuses()).toEqual(['sent', 'confirmed']);
  });

  it('says done on the answer to the call when there is no state to compare', async () => {
    const path = makePath();
    await path.run('cover', 'set_cover_tilt_position', {
      entity_id: 'cover.tapparella',
      tilt_position: 30,
    });
    expect(statuses()).toEqual(['sent', 'confirmed']);
  });

  it('says rejected, with the reason, when Home Assistant refuses', async () => {
    const path = makePath();
    sendImpl = () => Promise.reject(new Error('Servizio non disponibile'));
    await expect(path.run('light', 'toggle', { entity_id: 'light.sala' })).rejects.toMatchObject({
      code: 'sent_failed',
    });
    expect(outcomes.at(-1)).toMatchObject({
      status: 'rejected',
      message: 'Servizio non disponibile',
    });
    // nothing is waited for after a refusal
    await vi.advanceTimersByTimeAsync(COMMAND_CONFIRM_MS + 10);
    expect(statuses()).toEqual(['sent', 'rejected']);
  });

  it('takes the reason from the error object Home Assistant sends, and none from an odd one', async () => {
    const path = makePath();
    sendImpl = () => Promise.reject({ code: 'invalid_code', message: 'Codice non valido' });
    await path.run('light', 'toggle', { entity_id: 'light.sala' }).catch(() => undefined);
    expect(outcomes.at(-1)).toMatchObject({ status: 'rejected', message: 'Codice non valido' });
    await vi.advanceTimersByTimeAsync(COMMAND_GAP_MS + 1);
    sendImpl = () => Promise.reject('boom');
    await path.run('light', 'toggle', { entity_id: 'light.sala' }).catch(() => undefined);
    expect(outcomes.at(-1)?.status).toBe('rejected');
    expect(outcomes.at(-1)?.message).toBeUndefined();
  });

  it('says not confirmed when the device never shows the state, never a success', async () => {
    const path = makePath();
    await path.run('light', 'turn_on', { entity_id: 'light.sala' });
    await vi.advanceTimersByTimeAsync(COMMAND_CONFIRM_MS - 1);
    expect(statuses()).toEqual(['sent']);
    await vi.advanceTimersByTimeAsync(2);
    expect(statuses()).toEqual(['sent', 'unconfirmed']);
    states = { ...states, 'light.sala': { state: 'on', attributes: {} } };
    path.observe();
    expect(statuses()).toEqual(['sent', 'unconfirmed']);
  });

  it('lets a newer command for the same device take over the waiting', async () => {
    const path = makePath();
    await path.run('light', 'turn_off', { entity_id: 'light.cucina' });
    await vi.advanceTimersByTimeAsync(COMMAND_GAP_MS + 1);
    await path.run('light', 'turn_on', { entity_id: 'light.cucina', brightness_pct: 50 });
    await vi.advanceTimersByTimeAsync(COMMAND_CONFIRM_MS + 10);
    // the first one is not reported as lost: the second replaced it
    expect(statuses()).toEqual(['sent', 'sent', 'unconfirmed']);
    expect(outcomes.at(-1)?.label).toBe('Accendi Plafoniera al 50%');
  });

  it('stops everything when disposed', async () => {
    const path = makePath();
    await path.run('light', 'turn_on', { entity_id: 'light.sala' });
    path.dispose();
    await vi.advanceTimersByTimeAsync(COMMAND_CONFIRM_MS + 10);
    expect(statuses()).toEqual(['sent']);
    await expect(path.run('light', 'toggle', { entity_id: 'light.cucina' })).rejects.toMatchObject({
      code: 'closed',
    });
    expect(sent).toHaveLength(1);
  });
});
