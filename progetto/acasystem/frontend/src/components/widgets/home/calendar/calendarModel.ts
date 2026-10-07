/**
 * Calendar events as the legacy CalendarCard/CalendarModal read them: `calendar.get_events`
 * for the selected `calendars`, merged, sorted by start and grouped by local day.
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

/** Legacy getEventDateValue: plain value, or dateTime / date_time / date of an object. */
function eventDateValue(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') return value;
  const nested =
    readKey(value, 'dateTime') ?? readKey(value, 'date_time') ?? readKey(value, 'date');
  return typeof nested === 'string' || typeof nested === 'number' ? nested : null;
}

/** Legacy isAllDayValue: a `YYYY-MM-DD` string or an object with only `date`. */
export function isAllDayValue(value: unknown): boolean {
  if (typeof value === 'string') return value.length === 10;
  if (!value || typeof value !== 'object') return false;
  return (
    Boolean(readKey(value, 'date')) && !readKey(value, 'dateTime') && !readKey(value, 'date_time')
  );
}

/** All-day dates are local days, not UTC midnights. */
function parseEventDate(value: unknown): Date | null {
  const raw = eventDateValue(value);
  if (raw === null) return null;
  if (typeof raw === 'string') {
    const match = DATE_ONLY.exec(raw);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toEventView(
  event: HaCalendarEvent,
  calendarId: string,
  index: number
): CalendarEventView | null {
  const start = parseEventDate(event.start);
  if (!start) return null;
  const title =
    [event.summary, readKey(event, 'title'), event.description].find(isNonEmptyString) ?? 'Evento';
  return {
    key: `${calendarId}-${event.uid ?? title}-${start.getTime()}-${index}`,
    title,
    start,
    end: parseEventDate(event.end),
    allDay: isAllDayValue(event.start),
    location: isNonEmptyString(event.location) ? event.location : undefined,
    description: isNonEmptyString(event.description) ? event.description : undefined,
    calendarId,
  };
}

/** Events of every calendar, without the ones lacking a start, sorted by start. */
export function mergeEvents(
  result: Record<string, HaCalendarEvents>,
  only?: readonly string[]
): CalendarEventView[] {
  const events: CalendarEventView[] = [];
  for (const [calendarId, data] of Object.entries(result)) {
    if (only && !only.includes(calendarId)) continue;
    data.events.forEach((event, index) => {
      const view = toEventView(event, calendarId, index);
      if (view) events.push(view);
    });
  }
  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface DayGroup {
  key: string;
  date: Date;
  events: CalendarEventView[];
}

export function groupByDay(events: readonly CalendarEventView[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const event of events) {
    const key = dayKey(event.start);
    const group = groups.get(key) ?? { key, date: startOfDay(event.start), events: [] };
    group.events.push(event);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** An event of today that has already ended (dimmed in the details, as in the legacy modal). */
export function isFinishedToday(event: CalendarEventView, now: Date = new Date()): boolean {
  if (event.allDay) return false;
  const end = event.end ?? event.start;
  return dayKey(event.start) === dayKey(now) && end.getTime() <= now.getTime();
}

/** Days shown by the card: 3 on 2×2, 5 up to 8 cells, a week beyond (the legacy fetch window). */
export function horizonDays(cells: number): number {
  if (cells <= 4) return 3;
  if (cells <= 8) return 5;
  return 7;
}

export function withinDays(
  events: readonly CalendarEventView[],
  days: number,
  now: Date = new Date()
) {
  const limit = addDays(startOfDay(now), days).getTime();
  return events.filter((event) => event.start.getTime() < limit);
}

/**
 * Heights in the card (Inter, kit scale): an event is time + title (38 px) plus 6 px from the
 * previous one; a new day adds its 24 px heading.
 */
const EVENT_PX = 38;
const EVENT_GAP_PX = 6;
const DAY_PX = 24;

/** Events, in order, that fit in `height` px per column (measured card, at least one). */
export function eventsThatFit(
  events: readonly CalendarEventView[],
  height: number,
  columns: number
): number {
  const budget = Math.max(0, height) * columns;
  let used = 0;
  let count = 0;
  let lastDay = '';
  for (const event of events) {
    const day = dayKey(event.start);
    const cost = EVENT_PX + (day === lastDay ? EVENT_GAP_PX : DAY_PX);
    if (used + cost > budget) break;
    used += cost;
    lastDay = day;
    count += 1;
  }
  return Math.max(1, count);
}

/** Calendar entity ids of the card (legacy `settings.calendars`). */
export function selectedCalendars(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isNonEmptyString) : [];
}
