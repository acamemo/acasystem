import { isRecord } from '../../helpers/objects.ts';
import { normalizeDeviceHost } from '../../helpers/network.ts';
import type { FlowConstants, FlowFieldDto } from './flowModel.ts';

/**
 * Input rules of the flows a customer can run. Two sources, same guarantees:
 * - hand-written rules for the steps we know well (the LG TV of D1, the integrations that HA
 *   discovers, F2 and F3, ADR-0024): they refine the texts and normalise values (address, PIN);
 * - the rules derived from the `data_schema` that HA itself sent for the step (F4): text,
 *   password, integer, number, boolean, select and multiple choice, with their ranges and
 *   options (`buildGenericInput`).
 * The body sent to HA is rebuilt here from validated values: a key that is not listed is
 * refused (not dropped), and a step with neither source cannot be answered at all, so the flow
 * is cancelled. Values are normalised and never logged.
 */

interface FieldRule {
  required: boolean;
  /** Returns the value to send to HA, or null if the input is not valid. */
  normalize(value: unknown): string | number | boolean | null;
}

type StepRules = Readonly<Record<string, FieldRule>>;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\x00-\x1f\x7f]/;

/** Text without control characters, 1 to `max` characters, as typed (a password is not trimmed). */
const plainText =
  (max: number, trim = true) =>
  (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const text = trim ? value.trim() : value;
    return text.length >= 1 && text.length <= max && !CONTROL_CHARACTERS.test(text) ? text : null;
  };

const oneOf =
  (pattern: RegExp, format: (value: string) => string = (value) => value) =>
  (value: unknown): string | null => {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const text = String(value).trim();
    return pattern.test(text) ? format(text) : null;
  };

/** PIN shown on a TV: 4 digits (Samsung encrypted pairing). */
const decimalPin = oneOf(/^[0-9]{4}$/);
/** PIN shown by Android TV: 6 hexadecimal characters. */
const hexPin = oneOf(/^[0-9A-Fa-f]{6}$/, (text) => text.toUpperCase());
/** HomeKit setup code: eight digits, sent as XXX-XX-XXX. */
const homekitCode = (value: unknown): string | null => {
  const digits =
    typeof value === 'string' || typeof value === 'number'
      ? String(value).replace(/[\s-]/g, '')
      : '';
  return /^[0-9]{8}$/.test(digits)
    ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
    : null;
};
/** ESPHome encryption key: 32 bytes in base64. */
const noiseKey = oneOf(/^[A-Za-z0-9+/]{43}=$/);

const host: StepRules = {
  host: { required: true, normalize: normalizeDeviceHost },
};
const none: StepRules = {};
const login: StepRules = {
  username: { required: true, normalize: plainText(128) },
  password: { required: true, normalize: plainText(128, false) },
};

const INPUT_RULES: Readonly<Record<string, Readonly<Record<string, StepRules>>>> = {
  webostv: {
    user: host,
    // Pairing takes no input: the person presses OK on the TV while the call is open.
    pairing: none,
  },
  // Integrations found by HA on the network (ADR-0024). The step ids are the ones the flows of
  // these integrations use when they start from a discovery, read from the source of HA; none
  // of them was run against a real HA yet. A step that is not listed is never improvised: the
  // person is told "Richiede l'installatore" (when taken) or the flow is cancelled (when met).
  samsungtv: {
    user: host,
    // «Consenti» on the TV (newer models) or a PIN on the screen (older and encrypted ones).
    confirm: none,
    pairing: none,
    encrypted_pairing: { pin: { required: true, normalize: decimalPin } },
  },
  androidtv_remote: {
    user: host,
    zeroconf_confirm: none,
    pair: { pin: { required: true, normalize: hexPin } },
  },
  cast: { confirm: none },
  sonos: { confirm: none },
  hue: { link: none },
  shelly: { confirm_discovery: none, credentials: login },
  tplink: { discovery_confirm: none, user_auth_confirm: login },
  wiz: { discovery_confirm: none },
  yeelight: { discovery_confirm: none },
  lifx: { confirm: none, discovery_confirm: none },
  nanoleaf: { link: none },
  esphome: {
    discovery_confirm: none,
    authenticate: {
      password: { required: true, normalize: plainText(128, false) },
    },
    encryption_key: { noise_psk: { required: true, normalize: noiseKey } },
  },
  homekit_controller: {
    pair: { pairing_code: { required: true, normalize: homekitCode } },
  },
  // No rules for `wake_on_lan`: its flow takes a MAC, a broadcast address and a port, so a
  // customer never runs it. The power recipe builds that body itself (installer-only values).
};

export type FlowInputResult =
  | { ok: true; input: Record<string, string | number | boolean> }
  | { ok: false; field: string | null };

/** True if this handler and step have input rules, i.e. the facade knows how to answer it. */
export const hasInputRules = (handler: string, stepId: string): boolean =>
  INPUT_RULES[handler]?.[stepId] !== undefined;

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === '';

export const buildFlowInput = (handler: string, stepId: string, raw: unknown): FlowInputResult => {
  const rules = INPUT_RULES[handler]?.[stepId];
  if (!rules) return { ok: false, field: null };

  if (raw !== undefined && raw !== null && (!isRecord(raw) || Array.isArray(raw))) {
    return { ok: false, field: null };
  }
  const source: Record<string, unknown> = isRecord(raw) ? raw : {};

  for (const key of Object.keys(source)) {
    if (!(key in rules)) return { ok: false, field: key };
  }

  const input: Record<string, string | number | boolean> = {};
  for (const [name, rule] of Object.entries(rules)) {
    const value = source[name];
    if (isEmpty(value)) {
      if (rule.required) return { ok: false, field: name };
      continue;
    }
    const normalized = rule.normalize(value);
    if (normalized === null) return { ok: false, field: name };
    input[name] = normalized;
  }
  return { ok: true, input };
};

// --- Rules derived from the schema of HA (F4) ------------------------------------------------

const MAX_TEXT_LENGTH = 1024;
const MAX_MULTILINE_LENGTH = 8000;
const MAX_CHOICES = 100;
const NUMBER_LIMIT = 1e12;

// eslint-disable-next-line no-control-regex
const CONTROL_EXCEPT_LINES = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
const LAN_HOSTNAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.(?:local|lan|home|localdomain))?$/;

/** An address field: a private LAN address, or a LAN name («tv», «tv.local»); nothing public. */
const lanHost = (value: unknown): string | null => {
  const ip = normalizeDeviceHost(value);
  if (ip) return ip;
  if (typeof value !== 'string') return null;
  const name = value.trim().toLowerCase();
  return name.length <= 253 && LAN_HOSTNAME.test(name) && !/^[0-9.]+$/.test(name) ? name : null;
};

const textFor = (field: FlowFieldDto, value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  if (field.kind === 'text' && field.name === 'host') return lanHost(value);
  const text = field.kind === 'password' ? value : value.trim();
  const limit = field.multiline ? MAX_MULTILINE_LENGTH : MAX_TEXT_LENGTH;
  if (text.length < 1 || text.length > limit) return null;
  const forbidden = field.multiline ? CONTROL_EXCEPT_LINES : CONTROL_CHARACTERS;
  return forbidden.test(text) ? null : text;
};

const numberFor = (field: FlowFieldDto, value: unknown): number | null => {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^-?[0-9]+(?:\.[0-9]+)?$/.test(value.trim())
        ? Number(value)
        : NaN;
  if (!Number.isFinite(number) || Math.abs(number) > NUMBER_LIMIT) return null;
  if (field.kind === 'integer' && !Number.isInteger(number)) return null;
  if (field.min !== undefined && number < field.min) return null;
  if (field.max !== undefined && number > field.max) return null;
  return number;
};

const optionFor = (field: FlowFieldDto, value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value);
  return field.options?.some((option) => option.value === text) ? text : null;
};

const isEmptyValue = (value: unknown): boolean =>
  isEmpty(value) || (Array.isArray(value) && value.length === 0);

/**
 * The answer of a step built from the fields HA declared for it. Same contract as
 * `buildFlowInput`: a key that is not a field is refused, a required field that is missing or a
 * value that does not fit its kind names the field. `constants` are added as HA asked.
 */
export const buildGenericInput = (
  fields: readonly FlowFieldDto[],
  constants: FlowConstants,
  raw: unknown
): { ok: true; input: Record<string, string | number | boolean | string[]> } | { ok: false; field: string | null } => {
  if (raw !== undefined && raw !== null && (!isRecord(raw) || Array.isArray(raw))) {
    return { ok: false, field: null };
  }
  const source: Record<string, unknown> = isRecord(raw) ? raw : {};

  for (const key of Object.keys(source)) {
    if (!fields.some((field) => field.name === key)) return { ok: false, field: key };
  }

  const input: Record<string, string | number | boolean | string[]> = { ...constants };
  for (const field of fields) {
    const value = source[field.name];
    if (isEmptyValue(value) && field.kind !== 'boolean') {
      // A required field with a default is left to HA, which fills it.
      if (field.required && field.default === undefined) return { ok: false, field: field.name };
      continue;
    }

    switch (field.kind) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          if (value === undefined || value === null) continue;
          return { ok: false, field: field.name };
        }
        input[field.name] = value;
        break;
      case 'integer':
      case 'number': {
        const number = numberFor(field, value);
        if (number === null) return { ok: false, field: field.name };
        input[field.name] = number;
        break;
      }
      case 'select': {
        const option = optionFor(field, value);
        if (option === null) return { ok: false, field: field.name };
        input[field.name] = option;
        break;
      }
      case 'multiselect': {
        if (!Array.isArray(value) || value.length > MAX_CHOICES) {
          return { ok: false, field: field.name };
        }
        const chosen: string[] = [];
        for (const item of value) {
          const option = optionFor(field, item);
          if (option === null) return { ok: false, field: field.name };
          if (!chosen.includes(option)) chosen.push(option);
        }
        input[field.name] = chosen;
        break;
      }
      default: {
        const text = textFor(field, value);
        if (text === null) return { ok: false, field: field.name };
        input[field.name] = text;
      }
    }
  }
  return { ok: true, input };
};

/** The answer of a menu step: the id of one of the options HA listed. */
export const buildMenuInput = (
  optionIds: readonly string[],
  raw: unknown
): { ok: true; input: { next_step_id: string } } | { ok: false; field: string | null } => {
  if (!isRecord(raw) || Array.isArray(raw)) return { ok: false, field: null };
  for (const key of Object.keys(raw)) {
    if (key !== 'next_step_id') return { ok: false, field: key };
  }
  const choice = raw.next_step_id;
  if (typeof choice !== 'string' || !optionIds.includes(choice)) {
    return { ok: false, field: 'next_step_id' };
  }
  return { ok: true, input: { next_step_id: choice } };
};
