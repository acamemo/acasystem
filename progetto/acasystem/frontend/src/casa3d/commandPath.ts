/**
 * The path a command of the Casa 3D view takes to Home Assistant (ADR-0014, T7).
 *
 * The page sends commands only in Esplora, and only through here. In order:
 * 1. the barrier of the adapter (`isOpen`): outside Esplora, while the pager moves, in edit mode or
 *    with the page away, nothing is sent, whatever the view asks;
 * 2. the list of services (`planCommand`): anything not on it is refused;
 * 3. the question and the code, for locks, alarms, doors and devices marked «ask first», with the
 *    confirmation primitive of Acasystem; a refusal or a closed barrier at that point cancels;
 * 4. the limit of 350 ms: the same command twice in that time is one command (a double tap), and
 *    different values for the same devices within that time are one send with the last value (a
 *    swipe on a lamp or a blind);
 * 5. the send itself, through the call that the widgets use (toast on failure included);
 * 6. the answer: pending until the entity shows the requested state, refused if Home Assistant
 *    refuses, «not confirmed» after 30 seconds without the state (the rules of useCommand).
 *
 * Framework-free: the page binds it to React in `useCasa3dCommands.tsx`. Time and timers are
 * injectable so the 350 ms and the 30 s are tested without waiting.
 */
import {
  planCommand,
  type CommandPlan,
  type CommandQuestion,
  type CommandStates,
} from './commandPolicy';

/** Two sends to the same devices are at least this far apart (the swipe of the view already paces itself the same). */
export const COMMAND_GAP_MS = 350;
/** How long a sent command waits for the device to show the requested state. */
export const COMMAND_CONFIRM_MS = 30_000;

export type CommandFailure =
  | 'closed' // the barrier was closed: not in Esplora
  | 'not_allowed'
  | 'bad_request'
  | 'unknown_entity'
  | 'unavailable'
  | 'cancelled' // the person said no
  | 'busy' // a question is already on screen
  | 'sent_failed'; // Home Assistant refused the call, or there is no connection

export class Casa3dCommandError extends Error {
  readonly code: CommandFailure;

  constructor(code: CommandFailure, message: string) {
    super(message);
    this.name = 'Casa3dCommandError';
    this.code = code;
  }
}

/** What happened to a command, for the status line and the live region. */
export interface CommandOutcome {
  id: number;
  /** sent: on its way; confirmed: the device shows it; rejected: Home Assistant said no; unconfirmed: no answer in time. */
  status: 'sent' | 'confirmed' | 'rejected' | 'unconfirmed' | 'cancelled' | 'refused';
  label: string;
  /** The reason, for rejected and refused. */
  message?: string;
}

export interface CommandAnswer {
  ok: boolean;
  code?: string;
}

export interface CommandPathDeps {
  /** The barrier: true only while the page is in Esplora, still, on screen and not being edited. */
  isOpen: () => boolean;
  /** The states now (the entity map of the app). */
  getStates: () => CommandStates;
  /** The call of the widgets: resolves when Home Assistant has taken the command. */
  send: (domain: string, service: string, data: Record<string, unknown>) => Promise<unknown>;
  /** Puts the question on screen and waits for the answer. */
  ask: (question: CommandQuestion) => Promise<CommandAnswer>;
  /** Told of each step of each command. */
  notify?: (outcome: CommandOutcome) => void;
  /** Told of what the barrier or the list refused (not of a cancelled question). */
  onRefused?: (what: string, message: string) => void;
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  gapMs?: number;
  confirmMs?: number;
}

export interface CommandPath {
  /** The `callService` of the adapter. */
  run: (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    options?: { ask?: boolean }
  ) => Promise<unknown>;
  /** Call when the states change: commands waiting for a state are settled. */
  observe: () => void;
  /** Stops every timer; commands still waiting are dropped without a word. */
  dispose: () => void;
}

interface Waiting {
  id: number;
  plan: CommandPlan;
  timer: unknown;
}

interface Held {
  plan: CommandPlan;
  fingerprint: string;
  timer: unknown;
  /** Everyone waiting for this send (the calls it replaced included). */
  waiters: Array<{ resolve: (value: unknown) => void; reject: (reason: unknown) => void }>;
}

/** What a command says, without the code: a code is never kept, not even as a key of a table. */
const fingerprintOf = (plan: CommandPlan): string => {
  const { code: _code, ...data } = plan.data;
  return JSON.stringify([plan.domain, plan.service, data]);
};

const groupOf = (plan: CommandPlan): string => [...plan.entityIds].sort().join(',');

/**
 * The words of a refusal: an Error's message, or the `message` of the error object Home Assistant
 * sends back (`{ code, message }`). Nothing else is passed on, so nothing unexpected is shown.
 */
function reasonOf(error: unknown): string | undefined {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: unknown }).message
        : undefined;
  return typeof message === 'string' && message.trim() ? message.trim().slice(0, 160) : undefined;
}

/** A rejection nobody awaits (the view calls `void hass.callService(...)`) must not become an unhandled one. */
function failed(code: CommandFailure, message: string): Promise<never> {
  const rejection = Promise.reject<never>(new Casa3dCommandError(code, message));
  rejection.catch(() => undefined);
  return rejection;
}

export function createCommandPath(deps: CommandPathDeps): CommandPath {
  const now = deps.now ?? (() => Date.now());
  const setTimer = deps.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
  const clearTimer =
    deps.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const gap = deps.gapMs ?? COMMAND_GAP_MS;
  const confirmMs = deps.confirmMs ?? COMMAND_CONFIRM_MS;

  let nextId = 1;
  let disposed = false;
  let asking = false;
  /** When each device last had a command sent. */
  const lastSent = new Map<string, number>();
  /** The sends that were made, by what they say, for the double tap. */
  const recent = new Map<string, { at: number; promise: Promise<unknown> }>();
  /** One held send per group of devices (the last value of a swipe). */
  const held = new Map<string, Held>();
  const waiting = new Set<Waiting>();

  const tell = (outcome: CommandOutcome) => {
    if (disposed) return;
    try {
      deps.notify?.(outcome);
    } catch {
      // A faulty listener must not stop a command.
    }
  };
  const refusedBy = (what: string, message: string) => {
    try {
      deps.onRefused?.(what, message);
    } catch {
      // Same as above.
    }
  };

  const settle = (item: Waiting, status: 'confirmed' | 'unconfirmed') => {
    if (!waiting.delete(item)) return;
    clearTimer(item.timer);
    tell({ id: item.id, status, label: item.plan.label });
  };

  const follow = (id: number, plan: CommandPlan) => {
    if (!plan.reached) {
      tell({ id, status: 'confirmed', label: plan.label });
      return;
    }
    // A newer command for the same devices replaces the one still waiting.
    const group = groupOf(plan);
    for (const old of [...waiting]) {
      if (groupOf(old.plan) === group) {
        waiting.delete(old);
        clearTimer(old.timer);
      }
    }
    if (plan.reached(deps.getStates())) {
      tell({ id, status: 'confirmed', label: plan.label });
      return;
    }
    const item: Waiting = { id, plan, timer: null };
    item.timer = setTimer(() => settle(item, 'unconfirmed'), confirmMs);
    waiting.add(item);
  };

  const transmit = (plan: CommandPlan): Promise<unknown> => {
    const id = nextId++;
    const at = now();
    for (const entity of plan.entityIds) lastSent.set(entity, at);
    tell({ id, status: 'sent', label: plan.label });
    let call: Promise<unknown>;
    try {
      call = Promise.resolve(deps.send(plan.domain, plan.service, plan.data));
    } catch (error) {
      call = Promise.reject(error);
    }
    const result = call.then(
      (value) => {
        follow(id, plan);
        return value;
      },
      (error: unknown) => {
        const reason = reasonOf(error);
        tell({ id, status: 'rejected', label: plan.label, message: reason });
        throw new Casa3dCommandError(
          'sent_failed',
          reason ?? 'Home Assistant ha rifiutato il comando'
        );
      }
    );
    result.catch(() => undefined);
    for (const [key, entry] of recent) if (at - entry.at >= gap) recent.delete(key);
    recent.set(fingerprintOf(plan), { at, promise: result });
    return result;
  };

  const sendOrHold = (plan: CommandPlan): Promise<unknown> => {
    const fingerprint = fingerprintOf(plan);
    const group = groupOf(plan);
    const time = now();
    // The same command again within the limit is the same command (a double tap).
    const heldNow = held.get(group);
    if (heldNow && heldNow.fingerprint === fingerprint) {
      return new Promise((resolve, reject) => heldNow.waiters.push({ resolve, reject }));
    }
    const before = recent.get(fingerprint);
    if (before && time - before.at < gap) return before.promise;

    const last = Math.max(0, ...plan.entityIds.map((id) => lastSent.get(id) ?? 0));
    if (heldNow || (last > 0 && time - last < gap)) {
      // Too soon after another send to these devices: the last value goes out when the gap is over.
      const waiters = heldNow?.waiters ?? [];
      if (heldNow) clearTimer(heldNow.timer);
      const entry: Held = { plan, fingerprint, timer: null, waiters };
      const promise = new Promise<unknown>((resolve, reject) => waiters.push({ resolve, reject }));
      const wait = Math.max(0, (last > 0 ? last + gap : time) - time);
      entry.timer = setTimer(() => {
        held.delete(group);
        const finish = (action: (waiter: Held['waiters'][number]) => void) =>
          entry.waiters.forEach(action);
        if (disposed || !deps.isOpen()) {
          const error = new Casa3dCommandError('closed', 'Casa 3D non è in Esplora');
          finish((waiter) => waiter.reject(error));
          return;
        }
        transmit(entry.plan).then(
          (value) => finish((waiter) => waiter.resolve(value)),
          (error: unknown) => finish((waiter) => waiter.reject(error))
        );
      }, wait);
      held.set(group, entry);
      return promise;
    }
    return transmit(plan);
  };

  const run: CommandPath['run'] = (domain, service, data, options) => {
    const what = `${domain}.${service}`;
    if (disposed || !deps.isOpen()) {
      refusedBy(what, 'Casa 3D accetta comandi solo in Esplora');
      return failed('closed', `Casa 3D accetta comandi solo in Esplora: ${what}`);
    }
    const planned = planCommand(domain, service, data, deps.getStates(), options?.ask === true);
    if (!planned.ok) {
      refusedBy(what, planned.message);
      tell({ id: 0, status: 'refused', label: what, message: planned.message });
      return failed(planned.reason, planned.message);
    }
    const { plan } = planned;
    if (!plan.question) return sendOrHold(plan);

    // One question at a time: a second command while the dialog is open is dropped, not queued.
    if (asking) return failed('busy', 'Una conferma è già aperta');
    asking = true;
    const { question } = plan;
    return deps.ask(question).then(
      (answer) => {
        asking = false;
        if (!answer.ok) {
          tell({ id: 0, status: 'cancelled', label: plan.label });
          throw new Casa3dCommandError('cancelled', 'Comando annullato');
        }
        // The page may have left Esplora while the question was open.
        if (disposed || !deps.isOpen()) {
          refusedBy(what, 'Casa 3D accetta comandi solo in Esplora');
          throw new Casa3dCommandError('closed', 'Casa 3D non è più in Esplora');
        }
        const code = answer.code?.trim();
        const sendable: CommandPlan = code ? { ...plan, data: { ...plan.data, code } } : plan;
        return sendOrHold(sendable);
      },
      (error: unknown) => {
        asking = false;
        throw error;
      }
    );
  };

  return {
    run: (domain, service, data, options) => {
      const result = run(domain, service, data, options);
      // The view does not await the call; a refusal must not surface as an unhandled rejection.
      result.catch(() => undefined);
      return result;
    },
    observe: () => {
      if (disposed || waiting.size === 0) return;
      const states = deps.getStates();
      for (const item of [...waiting]) {
        if (item.plan.reached?.(states)) settle(item, 'confirmed');
      }
    },
    dispose: () => {
      disposed = true;
      for (const entry of held.values()) {
        clearTimer(entry.timer);
        const error = new Casa3dCommandError('closed', 'Casa 3D si è chiusa');
        entry.waiters.forEach((waiter) => waiter.reject(error));
      }
      held.clear();
      recent.clear();
      for (const item of waiting) clearTimer(item.timer);
      waiting.clear();
    },
  };
}
