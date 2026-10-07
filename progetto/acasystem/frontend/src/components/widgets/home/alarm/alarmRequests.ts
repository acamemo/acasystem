import type { AlarmActionKey } from './alarmModel';

/**
 * Action chosen on the card that needs the PIN: the card opens the detail sheet and the sheet
 * starts with that action selected (legacy AlarmActionPinModal). Only the action key is kept,
 * never the code, and only until the sheet reads it.
 */
const requested = new Map<string, AlarmActionKey>();

export function requestAlarmAction(widgetId: string, action: AlarmActionKey): void {
  requested.set(widgetId, action);
}

export function peekAlarmAction(widgetId: string): AlarmActionKey | undefined {
  return requested.get(widgetId);
}

export function clearAlarmAction(widgetId: string): void {
  requested.delete(widgetId);
}
