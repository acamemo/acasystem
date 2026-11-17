/**
 * To-do lists as the legacy TodoCard/TodoModal used them. Reading goes through getTodoItems;
 * the commands are the same `todo.add_item`, `todo.update_item` and `todo.remove_item` with the
 * list as target, sent through the runtime callService (same WebSocket message as the legacy
 * addTodoItem/updateTodoItem/removeTodoItem helpers).
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { HaTodoItem, ServiceData } from '@/@types/ha';
import { isNonEmptyString } from '@/validators/guards';
import { parseCalendarDate } from '../calendar/calendarModel';
import { addDays, dayKey, sentenceCase, startOfDay } from '../shared/format';

export type TodoStatus = 'needs_action' | 'completed';

export interface TodoItemView {
  /** uid, or the summary when the integration gives none (HA accepts both as `item`). */
  id: string;
  summary: string;
  status: TodoStatus | 'unknown';
  /** HA accepts uid or summary. Ambiguous identifiers remain readable, never actionable. */
  commandId?: string;
  due?: string;
  description?: string;
}

export function toItemViews(items: readonly HaTodoItem[]): TodoItemView[] {
  const views: TodoItemView[] = [];
  const references = new Map<string, number>();
  for (const item of items) {
    for (const value of new Set([item.uid, item.summary].filter(isNonEmptyString)))
      references.set(value, (references.get(value) ?? 0) + 1);
  }
  const reserved = new Set(references.keys());
  for (const [index, item] of items.entries()) {
    const summary = isNonEmptyString(item.summary) ? item.summary : '';
    const id = isNonEmptyString(item.uid) ? item.uid : summary;
    if (!id) continue;
    const ambiguous = (references.get(id) ?? 0) > 1;
    let key = id;
    if (ambiguous) {
      key = `${id}#${index}`;
      while (reserved.has(key)) key += '#';
      reserved.add(key);
    }
    views.push({
      id: key,
      commandId: ambiguous ? undefined : id,
      summary: summary || 'Attività senza titolo',
      status: item.status === 'completed' || item.status === 'needs_action' ? item.status : 'unknown',
      due: isNonEmptyString(item.due) ? item.due : undefined,
      description: isNonEmptyString(item.description) ? item.description : undefined,
    });
  }
  return views;
}

export interface TodoCall {
  domain: 'todo';
  service: 'add_item' | 'update_item' | 'remove_item';
  data: ServiceData;
}

export const addItemCall = (entityId: string, summary: string): TodoCall => ({
  domain: 'todo',
  service: 'add_item',
  data: { target: { entity_id: entityId }, item: summary },
});

export const updateItemCall = (entityId: string, itemId: string, status: TodoStatus): TodoCall => ({
  domain: 'todo',
  service: 'update_item',
  data: { target: { entity_id: entityId }, item: itemId, status },
});

export const removeItemCall = (entityId: string, itemId: string): TodoCall => ({
  domain: 'todo',
  service: 'remove_item',
  data: { target: { entity_id: entityId }, item: itemId },
});

export const nextStatus = (status: TodoStatus): TodoStatus =>
  status === 'completed' ? 'needs_action' : 'completed';

/** Group of a row: the confirmed status, so a row waiting for HA does not jump away. */
export const confirmedStatus = (item: TodoItemView, pending: boolean): TodoItemView['status'] =>
  pending && item.status !== 'unknown' ? nextStatus(item.status) : item.status;

/** HA 2026.10.4 TodoListEntityFeature; absence is a read-only list. */
export function todoCapabilities(entity: HassEntity | undefined) {
  const raw: unknown = entity?.attributes.supported_features;
  const bits = typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0 ? raw : 0;
  return { add: !!(bits & 1), remove: !!(bits & 2), update: !!(bits & 4) };
}

export interface DueText {
  text: string;
  overdue: boolean;
}

/** «Scade oggi», «Scade domani», «Scaduta il 3 ott» or «Scade il 12 ott» (legacy formatDueDate). */
export function dueText(
  due: string | undefined,
  locale: string,
  now: Date = new Date()
): DueText | null {
  if (!due) return null;
  const date = parseCalendarDate(due);
  if (!date || Number.isNaN(date.getTime())) return { text: 'Scadenza non disponibile', overdue: false };
  if (dayKey(date) === dayKey(now)) return { text: 'Scade oggi', overdue: false };
  if (dayKey(date) === dayKey(addDays(now, 1))) return { text: 'Scade domani', overdue: false };
  const label = date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return date.getTime() < startOfDay(now).getTime()
    ? { text: sentenceCase(`scaduta il ${label}`, locale), overdue: true }
    : { text: sentenceCase(`scade il ${label}`, locale), overdue: false };
}
