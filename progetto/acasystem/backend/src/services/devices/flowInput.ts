import { isRecord } from '../../helpers/objects.ts';
import { normalizeDeviceHost } from '../../helpers/network.ts';

/**
 * Closed input rules of the flows a customer can run (D1: `webostv` only).
 * The body sent to HA is rebuilt here from validated values: a key that is not listed is
 * refused (not dropped), and a step without rules cannot be answered at all, so the flow is
 * cancelled. Values are normalised (address, MAC, port) and never logged.
 */

interface FieldRule {
  required: boolean;
  /** Returns the value to send to HA, or null if the input is not valid. */
  normalize(value: unknown): string | number | null;
}

type StepRules = Readonly<Record<string, FieldRule>>;

const INPUT_RULES: Readonly<Record<string, Readonly<Record<string, StepRules>>>> = {
  webostv: {
    user: { host: { required: true, normalize: normalizeDeviceHost } },
    // Pairing takes no input: the person presses OK on the TV while the call is open.
    pairing: {},
  },
  // No rules for `wake_on_lan`: its flow takes a MAC, a broadcast address and a port, so a
  // customer never runs it. The power recipe builds that body itself (installer-only values).
};

export type FlowInputResult =
  { ok: true; input: Record<string, string | number> } | { ok: false; field: string | null };

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

  const input: Record<string, string | number> = {};
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
