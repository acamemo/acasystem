/**
 * What the Casa 3D page may send to Home Assistant, and how it is asked and confirmed (ADR-0014, T7).
 *
 * A closed list of services (light, switch, helper switches, fan, cover, lock, alarm panel and the
 * `homeassistant` on/off of the lamps and switches) with the data each one may carry. Everything
 * else is refused: the bundle can ask for any service, the adapter lets through only these. Pure
 * functions, no React and no browser, so the rules are tested one by one.
 *
 * Risky commands are asked first with the confirmation primitive of Acasystem (never confirm()):
 * every unlock and open of a lock, every action of an alarm panel, a door, a gate or a garage door
 * that opens, and every command on a device the plan marks «ask first» (`options.ask`). A lock or
 * an alarm panel that wants a code gets the code from the same dialog (the rules of the widgets:
 * `code_format`, `code_arm_required`, `code_disarm_required`).
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import { requiresCode as alarmRequiresCode } from '@/components/widgets/home/alarm/alarmModel';
import { isRecord } from '@/validators/guards';

/** The states the policy reads: the entity map of the app, or any map of that shape. */
export type CommandStates = Record<string, Pick<HassEntity, 'state' | 'attributes'> | undefined>;

export type CommandRefusal =
  | 'not_allowed' // service or domain not on the list
  | 'bad_request' // target or data not in the shape the service takes
  | 'unknown_entity' // no such entity in the app
  | 'unavailable'; // the entity is unavailable or unknown to Home Assistant

/** The question to put on screen before a command is sent. */
export interface CommandQuestion {
  title: string;
  description?: string;
  confirmLabel: string;
  danger: boolean;
  /** Present when the dialog must also take a code. */
  code?: { label: string; mode: 'numeric' | 'text' };
}

export interface CommandPlan {
  domain: string;
  service: string;
  /** The data as it will be sent: the target and the allowed keys only. */
  data: Record<string, unknown>;
  entityIds: string[];
  /** What the command does, for the status line and for TalkBack: «Accendi Lampada sala». */
  label: string;
  /** Null: send at once. */
  question: CommandQuestion | null;
  /**
   * True when the states show what was asked. Null: Home Assistant's answer to the call is all
   * there is to wait for (tilt, for instance, has no state to compare).
   */
  reached: ((states: CommandStates) => boolean) | null;
}

export type PlanResult =
  { ok: true; plan: CommandPlan } | { ok: false; reason: CommandRefusal; message: string };

type DataKind = 'percent' | 'number' | 'rgb' | 'code';

interface ServiceRule {
  /** The data keys the service may carry besides the target, and what each one is. */
  keys?: Record<string, DataKind>;
  /** Opens a door, a gate or a garage door when the domain is a cover. */
  opens?: boolean;
  verb: string;
}

const TOGGLE: Record<string, ServiceRule> = { toggle: { verb: 'Cambia' } };

/**
 * The services the page may send: what the taps on a pin, the quick menu and the swipes of the
 * view emit, and nothing more. The key is the domain, then the service.
 */
const SERVICES: Record<string, Record<string, ServiceRule>> = {
  light: {
    turn_on: {
      verb: 'Accendi',
      keys: { brightness_pct: 'percent', rgb_color: 'rgb', color_temp_kelvin: 'number' },
    },
    turn_off: { verb: 'Spegni' },
    toggle: { verb: 'Cambia' },
  },
  switch: TOGGLE,
  input_boolean: TOGGLE,
  fan: TOGGLE,
  cover: {
    open_cover: { verb: 'Apri', opens: true },
    close_cover: { verb: 'Chiudi' },
    stop_cover: { verb: 'Ferma' },
    set_cover_position: { verb: 'Imposta', keys: { position: 'percent' }, opens: true },
    open_cover_tilt: { verb: 'Apri le lamelle' },
    close_cover_tilt: { verb: 'Chiudi le lamelle' },
    set_cover_tilt_position: { verb: 'Imposta le lamelle', keys: { tilt_position: 'percent' } },
  },
  lock: {
    lock: { verb: 'Blocca', keys: { code: 'code' } },
    unlock: { verb: 'Sblocca', keys: { code: 'code' } },
  },
  // No pin or menu of the view has an alarm button today; the rules are here for the day one does
  // (the same question and code as the widgets), so no alarm command can go without them.
  alarm_control_panel: {
    alarm_arm_home: { verb: 'Inserisci in casa', keys: { code: 'code' } },
    alarm_arm_away: { verb: 'Inserisci fuori casa', keys: { code: 'code' } },
    alarm_arm_night: { verb: 'Inserisci notte', keys: { code: 'code' } },
    alarm_arm_vacation: { verb: 'Inserisci vacanza', keys: { code: 'code' } },
    alarm_arm_custom_bypass: { verb: 'Inserisci con esclusioni', keys: { code: 'code' } },
    alarm_disarm: { verb: 'Disinserisci', keys: { code: 'code' } },
  },
  // The quick menu of a switch or a fan toggles through here; locks, covers and lights never go
  // through it, so the checks on them cannot be skipped. Not the on/off of a whole room (the
  // double tap on a room): that one is not enabled.
  homeassistant: TOGGLE,
};

/** Domains `homeassistant.toggle` may reach. */
const HOMEASSISTANT_TARGETS: ReadonlySet<string> = new Set(['switch', 'input_boolean', 'fan']);

/** One command, one device: a command on several (the lights of a room) is not enabled. */
export const MAX_TARGETS = 1;

const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const DOOR_CLASSES: ReadonlySet<string> = new Set(['garage', 'gate', 'door']);

const ALARM_ACTION_KEYS: Record<
  string,
  'arm_home' | 'arm_away' | 'arm_night' | 'arm_vacation' | 'arm_custom_bypass' | 'disarm'
> = {
  alarm_arm_home: 'arm_home',
  alarm_arm_away: 'arm_away',
  alarm_arm_night: 'arm_night',
  alarm_arm_vacation: 'arm_vacation',
  alarm_arm_custom_bypass: 'arm_custom_bypass',
  alarm_disarm: 'disarm',
};

const ALARM_CONFIRMS: Record<string, readonly string[]> = {
  alarm_arm_home: ['armed_home', 'arming', 'pending'],
  alarm_arm_away: ['armed_away', 'arming', 'pending'],
  alarm_arm_night: ['armed_night', 'arming', 'pending'],
  alarm_arm_vacation: ['armed_vacation', 'arming', 'pending'],
  alarm_arm_custom_bypass: ['armed_custom_bypass', 'arming', 'pending'],
  alarm_disarm: ['disarmed', 'disarming'],
};

const refuse = (reason: CommandRefusal, message: string): PlanResult => ({
  ok: false,
  reason,
  message,
});

const isUnavailable = (state: string | undefined): boolean =>
  !state || state === 'unavailable' || state === 'unknown';

const attrs = (entity: CommandStates[string]): Record<string, unknown> =>
  entity && isRecord(entity.attributes) ? entity.attributes : {};

const numberOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** The name people know the device by: its friendly name, else the id without the domain. */
export function nameOf(entityId: string, states: CommandStates): string {
  const friendly = attrs(states[entityId]).friendly_name;
  return typeof friendly === 'string' && friendly.trim()
    ? friendly.trim()
    : (entityId.split('.')[1] ?? entityId);
}

function checkData(
  rule: ServiceRule,
  data: Record<string, unknown>
): { ok: true; clean: Record<string, unknown> } | { ok: false } {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'entity_id') continue;
    const kind = rule.keys?.[key];
    if (!kind) return { ok: false };
    if (kind === 'percent') {
      const n = numberOf(value);
      if (n === null || n < 0 || n > 100) return { ok: false };
    } else if (kind === 'number') {
      if (numberOf(value) === null) return { ok: false };
    } else if (kind === 'rgb') {
      const ok =
        Array.isArray(value) &&
        value.length === 3 &&
        value.every((v) => numberOf(v) !== null && v >= 0 && v <= 255);
      if (!ok) return { ok: false };
    } else if (typeof value !== 'string' || value.length > 32) {
      return { ok: false };
    }
    clean[key] = value;
  }
  return { ok: true, clean };
}

/** The entity ids of a call: `entity_id` as a string or a list of strings; nothing else is a target. */
function targetsOf(data: Record<string, unknown>): string[] | null {
  const raw = data.entity_id;
  const list = typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw : null;
  if (!list || list.length === 0 || list.length > MAX_TARGETS) return null;
  if (!list.every((id): id is string => typeof id === 'string' && ENTITY_ID.test(id))) return null;
  return [...new Set(list)];
}

/** What the states must show for the command to count as done; null when they cannot say. */
function expectation(
  domain: string,
  service: string,
  data: Record<string, unknown>,
  ids: string[],
  before: CommandStates
): CommandPlan['reached'] {
  const every = (test: (id: string, states: CommandStates) => boolean) => (states: CommandStates) =>
    ids.every((id) => test(id, states));
  const stateOf = (states: CommandStates, id: string) =>
    String(states[id]?.state ?? '').toLowerCase();
  const was = new Map(ids.map((id) => [id, stateOf(before, id)] as const));
  const changed = every((id, states) => stateOf(states, id) !== was.get(id));

  if (service === 'toggle') return changed;
  if (domain === 'light' || domain === 'switch' || domain === 'input_boolean' || domain === 'fan') {
    if (service === 'turn_off') return every((id, states) => stateOf(states, id) === 'off');
    const pct = numberOf(data.brightness_pct);
    return every((id, states) => {
      if (stateOf(states, id) !== 'on') return false;
      if (pct === null) return true;
      // A light reports 0-255; one that reports none counts as reached.
      const reported = numberOf(attrs(states[id]).brightness);
      return reported === null || Math.abs(reported - pct * 2.55) <= 8;
    });
  }
  if (domain === 'cover') {
    if (service === 'open_cover')
      return every((id, s) => ['open', 'opening'].includes(stateOf(s, id)));
    if (service === 'close_cover')
      return every((id, s) => ['closed', 'closing'].includes(stateOf(s, id)));
    if (service === 'stop_cover') {
      return every((id, s) => !['opening', 'closing'].includes(stateOf(s, id)));
    }
    if (service === 'set_cover_position') {
      const target = numberOf(data.position);
      return every((id, s) => {
        if (['opening', 'closing'].includes(stateOf(s, id))) return true;
        const at = numberOf(attrs(s[id]).current_position);
        return target === null || at === null || Math.abs(at - target) <= 3;
      });
    }
    return null;
  }
  if (domain === 'lock') {
    const wanted: Record<string, string[]> = {
      lock: ['locked', 'locking'],
      unlock: ['unlocked', 'unlocking'],
    };
    const states = wanted[service];
    return states ? every((id, s) => states.includes(stateOf(s, id))) : null;
  }
  if (domain === 'alarm_control_panel') {
    const states = ALARM_CONFIRMS[service];
    return states ? every((id, s) => states.includes(stateOf(s, id))) : null;
  }
  return null;
}

/** The code a lock or an alarm panel wants for this command, if any (rules of the widgets). */
function codeNeeded(
  domain: string,
  service: string,
  entity: CommandStates[string]
): { mode: 'numeric' | 'text' } | null {
  if (!entity) return null;
  if (domain === 'lock') {
    const format = String(attrs(entity).code_format ?? '').trim();
    if (!format || format === 'none') return null;
    return { mode: format === 'number' ? 'numeric' : 'text' };
  }
  if (domain === 'alarm_control_panel') {
    const action = ALARM_ACTION_KEYS[service];
    if (!action || !alarmRequiresCode(action, entity as HassEntity)) return null;
    return { mode: String(attrs(entity).code_format ?? '') === 'number' ? 'numeric' : 'text' };
  }
  return null;
}

function opensADoor(
  domain: string,
  service: string,
  rule: ServiceRule,
  data: Record<string, unknown>,
  ids: string[],
  states: CommandStates
): boolean {
  if (domain !== 'cover' || !rule.opens) return false;
  if (!ids.some((id) => DOOR_CLASSES.has(String(attrs(states[id]).device_class)))) return false;
  if (service === 'set_cover_position') return (numberOf(data.position) ?? 0) > 0;
  return true;
}

function questionFor(
  domain: string,
  service: string,
  rule: ServiceRule,
  data: Record<string, unknown>,
  ids: string[],
  states: CommandStates,
  asked: boolean,
  label: string
): CommandQuestion | null {
  const subject =
    ids.length === 1 ? `«${nameOf(ids[0] ?? '', states)}»` : `${ids.length} dispositivi`;
  const code = ids.length === 1 ? codeNeeded(domain, service, states[ids[0] ?? '']) : null;
  const codeField = code
    ? {
        label: domain === 'lock' ? 'Codice della serratura' : 'Codice dell’allarme',
        mode: code.mode,
      }
    : undefined;

  if (domain === 'lock' && service === 'unlock') {
    return {
      title: `Sbloccare ${subject}?`,
      description: 'La serratura si apre.',
      confirmLabel: 'Sblocca',
      danger: true,
      code: codeField,
    };
  }
  if (domain === 'alarm_control_panel') {
    const disarm = service === 'alarm_disarm';
    return {
      title: disarm ? `Disinserire ${subject}?` : `${rule.verb}: ${subject}?`,
      description: disarm ? 'L’allarme smette di proteggere la casa.' : undefined,
      confirmLabel: rule.verb,
      danger: disarm,
      code: codeField,
    };
  }
  if (opensADoor(domain, service, rule, data, ids, states)) {
    return {
      title: `Aprire ${subject}?`,
      description: 'Si apre un varco verso l’esterno.',
      confirmLabel: 'Apri',
      danger: true,
    };
  }
  if (asked) {
    return { title: `${label}?`, confirmLabel: rule.verb, danger: false, code: codeField };
  }
  // A lock that is locked with a code needs the code, but not the question.
  if (codeField) {
    return { title: `${label}?`, confirmLabel: rule.verb, danger: false, code: codeField };
  }
  return null;
}

/** The words that say what the command does: «Accendi Lampada sala», «Imposta Tapparella al 40%». */
function labelFor(
  domain: string,
  rule: ServiceRule,
  data: Record<string, unknown>,
  ids: string[],
  states: CommandStates
): string {
  const subject = ids.length === 1 ? nameOf(ids[0] ?? '', states) : `${ids.length} dispositivi`;
  const percent =
    numberOf(data.brightness_pct) ?? numberOf(data.position) ?? numberOf(data.tilt_position);
  if (percent !== null) return `${rule.verb} ${subject} al ${Math.round(percent)}%`;
  if (domain === 'alarm_control_panel') return `${rule.verb}: ${subject}`;
  return `${rule.verb} ${subject}`;
}

/**
 * Checks a call of the view against the list and works out how it is asked, sent and followed.
 * `asked` is the bundle's «ask first» for a device marked so in the plan.
 */
export function planCommand(
  domain: string,
  service: string,
  data: Record<string, unknown> | undefined,
  states: CommandStates,
  asked = false
): PlanResult {
  const rule = SERVICES[domain]?.[service];
  if (!rule) return refuse('not_allowed', `${domain}.${service} non è un comando consentito`);
  const input = data ?? {};
  const ids = targetsOf(input);
  if (!ids) return refuse('bad_request', 'Il comando non indica uno o più dispositivi validi');
  const checked = checkData(rule, input);
  if (!checked.ok) return refuse('bad_request', 'Il comando contiene dati non ammessi');
  for (const id of ids) {
    const idDomain = id.slice(0, id.indexOf('.'));
    const reachable =
      domain === 'homeassistant' ? HOMEASSISTANT_TARGETS.has(idDomain) : idDomain === domain;
    if (!reachable) return refuse('not_allowed', `${domain}.${service} non può agire su ${id}`);
    if (!states[id]) return refuse('unknown_entity', `Dispositivo non trovato: ${id}`);
    if (isUnavailable(states[id]?.state)) {
      return refuse('unavailable', `${nameOf(id, states)} non è disponibile`);
    }
  }
  const body: Record<string, unknown> = {
    entity_id: ids.length === 1 ? ids[0] : ids,
    ...checked.clean,
  };
  const label = labelFor(domain, rule, body, ids, states);
  return {
    ok: true,
    plan: {
      domain,
      service,
      data: body,
      entityIds: ids,
      label,
      question: questionFor(domain, service, rule, body, ids, states, asked, label),
      reached: expectation(domain, service, body, ids, states),
    },
  };
}
