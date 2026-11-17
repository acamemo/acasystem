/**
 * Calendar events returned by the existing calendar.get_events adapter.
 * Date-only values are calendar days; datetime values must identify an instant.
 */
import type { HaCalendarEvent, HaCalendarEvents } from '@/@types/ha';
import { isNonEmptyString, readKey } from '@/validators/guards';
import { addDays, dayKey, startOfDay } from '../shared/format';

export interface CalendarEventView {
  key: string;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  location?: string;
  description?: string;
  calendarId: string;
}
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i;

export function parseCalendarDay(raw: string): Date | null {
  const match = DATE_ONLY.exec(raw);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 1) return null;
  const value = new Date(0);
  value.setFullYear(year, month - 1, day);
  value.setHours(0, 0, 0, 0);
  return value.getFullYear() === year && value.getMonth() === month - 1 &&
    value.getDate() === day ? value : null;
}
function eventDateValue(value: unknown): string | null {
  const raw = typeof value === 'string' ? value :
    readKey(value, 'dateTime') ?? readKey(value, 'date_time') ?? readKey(value, 'date');
  return typeof raw === 'string' ? raw : null;
}
export function isAllDayValue(value: unknown): boolean {
  const raw = eventDateValue(value);
  return raw !== null && DATE_ONLY.test(raw);
}
export function parseCalendarDate(value: unknown): Date | null {
  const raw = eventDateValue(value);
  if (raw === null) return null;
  if (DATE_ONLY.test(raw)) return parseCalendarDay(raw);
  if (!DATETIME.test(raw) || !parseCalendarDay(raw.slice(0, 10))) return null;
  const clock = /T(\d{2}):(\d{2})(?::(\d{2}))?/i.exec(raw);
  if (!clock || Number(clock[1]) > 23 || Number(clock[2]) > 59 || Number(clock[3] ?? 0) > 59) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** Calendar-day representation used only for labels/grouping; the event instant is untouched. */
export function calendarDay(date: Date, timeZone?: string): Date {
  if (!timeZone) return startOfDay(date);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const value = (part: string) => parts.find((entry) => entry.type === part)?.value ?? '';
    return parseCalendarDay(`${value('year')}-${value('month')}-${value('day')}`) ?? startOfDay(date);
  } catch { return startOfDay(date); }
}

/** Real midnight of a local HA date, also across 23/25-hour DST days. */
export function calendarMidnight(day: Date, timeZone?: string): Date {
  if (!timeZone) return startOfDay(day);
  const desired = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
  let instant = desired;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parts = formatter.formatToParts(new Date(instant));
      const value = (part: string) => Number(parts.find((entry) => entry.type === part)?.value);
      const represented = Date.UTC(value('year'), value('month') - 1, value('day'),
        value('hour'), value('minute'), value('second'));
      instant += desired - represented;
    }
    return new Date(instant);
  } catch { return startOfDay(day); }
}

export function toEventView(
  event: HaCalendarEvent, calendarId: string, index: number
): CalendarEventView | null {
  const start = parseCalendarDate(event.start);
  if (!start) return null;
  const end = parseCalendarDate(event.end);
  const allDay = isAllDayValue(event.start);
  // Missing end is shown as missing. An invalid or incompatible supplied end is never invented.
  if (event.end != null && (!end || isAllDayValue(event.end) !== allDay ||
      end.getTime() <= start.getTime())) return null;
  const title = [event.summary, readKey(event, 'title')].find(isNonEmptyString) ?? 'Evento senza titolo';
  return {
    key: `${calendarId}-${event.uid ?? title}-${start.getTime()}-${index}`,
    title, start, end, allDay,
    location: isNonEmptyString(event.location) ? event.location : undefined,
    description: isNonEmptyString(event.description) ? event.description : undefined,
    calendarId,
  };
}

export function mergeEvents(
  result: Record<string, HaCalendarEvents>, only?: readonly string[], timeZone?: string
): CalendarEventView[] {
  const events: CalendarEventView[] = [];
  for (const [calendarId, data] of Object.entries(result)) {
    if (only && !only.includes(calendarId)) continue;
    if (!Array.isArray(data.events)) continue;
    data.events.forEach((event, index) => {
      const view = toEventView(event, calendarId, index);
      if (view) events.push(view);
    });
  }
  const instant = (event: CalendarEventView) => event.allDay ? calendarMidnight(event.start, timeZone).getTime() : event.start.getTime();
  return events.sort((a, b) => instant(a) - instant(b) ||
    Number(b.allDay) - Number(a.allDay) || a.calendarId.localeCompare(b.calendarId) ||
    a.title.localeCompare(b.title));
}

export interface DayGroup { key: string; date: Date; events: CalendarEventView[] }

/** Each intersected calendar day, with an exclusive end. Rendering is bounded to the visible range. */
export function groupByDay(
  events: readonly CalendarEventView[], timeZone?: string,
  range?: { start: Date; days: number }, repeatDays = true
): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const event of events) {
    const first = event.allDay ? startOfDay(event.start) : calendarDay(event.start, timeZone);
    const last = event.end
      ? event.allDay ? addDays(event.end, -1) : calendarDay(new Date(event.end.getTime() - 1), timeZone)
      : first;
    let day = range && first < range.start ? range.start : first;
    const limit = range ? addDays(range.start, range.days) : addDays(day, 30);
    for (let count = 0; day <= last && day < limit && count < 31; count += 1, day = addDays(day, 1)) {
      const key = dayKey(day);
      const group = groups.get(key) ?? { key, date: day, events: [] };
      group.events.push(event);
      groups.set(key, group);
      if (!repeatDays) break;
    }
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function isFinishedToday(event: CalendarEventView, now = new Date(), timeZone?: string): boolean {
  return !event.allDay && !!event.end &&
    dayKey(calendarDay(event.start, timeZone)) === dayKey(calendarDay(now, timeZone)) &&
    event.end.getTime() <= now.getTime();
}
export function horizonDays(cells: number): number {
  return cells <= 4 ? 3 : cells <= 8 ? 5 : 7;
}
export function withinDays(
  events: readonly CalendarEventView[], days: number, now = new Date(), timeZone?: string
) {
  const first = calendarDay(now, timeZone), limit = addDays(first, days);
  const startInstant = calendarMidnight(first, timeZone).getTime();
  const endInstant = calendarMidnight(limit, timeZone).getTime();
  return events.filter((event) => event.allDay
    ? event.start < limit && (event.end ? event.end > first : event.start >= first)
    : event.start.getTime() < endInstant &&
      (event.end ? event.end.getTime() > startInstant : event.start.getTime() >= startInstant));
}

const EVENT_PX = 38, EVENT_GAP_PX = 6, DAY_PX = 24;
export function eventsThatFit(events: readonly CalendarEventView[], height: number, columns: number): number {
  const budget = Math.max(0, height) * columns;
  let used = 0, count = 0, lastDay = '';
  for (const event of events) {
    const day = dayKey(event.start);
    const cost = EVENT_PX + (day === lastDay ? EVENT_GAP_PX : DAY_PX);
    if (used + cost > budget) break;
    used += cost; lastDay = day; count += 1;
  }
  return Math.max(1, count);
}
export function selectedCalendars(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(isNonEmptyString))] : [];
}
