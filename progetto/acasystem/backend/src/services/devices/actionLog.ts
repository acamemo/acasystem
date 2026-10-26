import type { DeviceActionOutcome, DeviceModel } from '../../models/deviceModel.ts';

/**
 * Registry of the actions of the device facade (ADR-0022, point 6): who, what, domain, entry
 * id, outcome and time. Free text is never accepted: every field is cut to a strict pattern,
 * so no password, key, MAC, address, field content or token can end up in the registry.
 */

export type ActionSource = 'api' | 'cli' | 'startup' | 'timer';

export interface ActionEntry {
  /** Home Assistant user behind the action; null for the server itself. */
  user: { id: string; name: string } | null;
  source: ActionSource;
  /** Dotted action name: `flow.start`, `power.setup`, ... */
  action: string;
  domain?: string | undefined;
  entryId?: string | undefined;
  outcome: DeviceActionOutcome;
  /** Machine code of the outcome (error code, form error key). */
  code?: string | undefined;
}

export interface ActionLog {
  record(entry: ActionEntry): void;
}

const ACTION = /^[a-z0-9_.]{1,48}$/;
const DOMAIN = /^[a-z0-9_]{1,64}$/;
const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;
const CODE = /^[A-Za-z0-9_.:-]{1,64}$/;

const onlyIf = (pattern: RegExp, value: string | undefined): string | null =>
  value !== undefined && pattern.test(value) ? value : null;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\x00-\x1f\x7f]/g;

const cleanName = (name: string): string =>
  name.replace(CONTROL_CHARACTERS, '').trim().slice(0, 80);

export const createActionLog = (model: DeviceModel, now: () => number = Date.now): ActionLog => ({
  record(entry) {
    const action = onlyIf(ACTION, entry.action);
    if (!action) return;
    try {
      model.actions.insert({
        at: now(),
        ha_user_id: entry.user ? onlyIf(IDENTIFIER, entry.user.id) : null,
        ha_user_name: entry.user ? cleanName(entry.user.name) || null : null,
        source: entry.source,
        action,
        domain: onlyIf(DOMAIN, entry.domain),
        entry_id: onlyIf(IDENTIFIER, entry.entryId),
        outcome: entry.outcome,
        code: onlyIf(CODE, entry.code),
      });
    } catch {
      // The registry must never break the operation it describes.
    }
  },
});
