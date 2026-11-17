import { describe, expect, it } from 'vitest';
import {
  calendarDay, calendarMidnight, groupByDay, isAllDayValue, isFinishedToday,
  mergeEvents, parseCalendarDay, selectedCalendars, toEventView, withinDays,
} from '@/components/widgets/home/calendar/calendarModel';
import { eventTimeText } from '@/components/widgets/home/calendar/CalendarWidget';
import { dueText, todoCapabilities, toItemViews } from '@/components/widgets/home/todo/todoModel';
import { fixtureEntity } from '@/utils/fixtures/runtime';

describe('Agenda · calendario, intervalli e fuso', () => {
  it.each(['2026-02-31', '2026-13-01', '2026-00-10', '2026-04-31', '0000-00-00', 'abcdefghij'])(
    'non normalizza la data impossibile %s', (value) => {
      expect(parseCalendarDay(value)).toBeNull();
      expect(toEventView({ start: value }, 'calendar.a', 0)).toBeNull();
    });
  it.each(['2026-11-12T10:00:00', '2026-11-12T24:00:00Z', '2026-11-12T09:60:00Z'])(
    'non inventa un istante da %s', (start) => {
      expect(toEventView({ start }, 'calendar.a', 0)).toBeNull();
    });
  it('distingue data-only da mezzanotte temporizzata e conserva l’assenza di fine', () => {
    expect(isAllDayValue('2026-11-12')).toBe(true);
    expect(isAllDayValue({ date: '2026-11-12' })).toBe(true);
    expect(isAllDayValue('2026-11-12T00:00:00Z')).toBe(false);
    const event = toEventView({ start: '2026-11-12T10:00:00Z' }, 'calendar.a', 0)!;
    expect(event.end).toBeNull();
    expect(isFinishedToday(event, new Date('2026-11-12T18:00:00Z'))).toBe(false);
    expect(eventTimeText(event, 'it-IT', 'Europe/Rome')).toBe('Dalle 11:00');
  });
  it('rifiuta fine invertita, impossibile o di natura diversa', () => {
    for (const end of ['2026-11-11', '2026-11-12', '2026-02-31', '2026-11-13T00:00:00Z'])
      expect(toEventView({ start: '2026-11-12', end }, 'calendar.a', 0)).toBeNull();
  });
  it('espande soltanto giorni compresi e considera la fine esclusa', () => {
    const events = mergeEvents({ 'calendar.a': { events: [{
      summary: 'Viaggio', start: '2026-11-10', end: '2026-11-15',
    }] } });
    const groups = groupByDay(events, 'Pacific/Kiritimati', {
      start: parseCalendarDay('2026-11-12')!, days: 2,
    });
    expect(groups.map((group) => group.key)).toEqual(['2026-11-12', '2026-11-13']);
    expect(groupByDay(events).map((group) => group.key)).toEqual([
      '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14',
    ]);
  });
  it('raggruppa gli istanti nel fuso della casa mantenendo le date all-day', () => {
    const events = mergeEvents({ 'calendar.a': { events: [
      { summary: 'A', start: '2026-11-12T00:30:00Z', end: '2026-11-12T01:30:00Z' },
      { summary: 'B', start: '2026-11-12', end: '2026-11-13' },
    ] } }, undefined, 'America/Los_Angeles');
    const groups = groupByDay(events, 'America/Los_Angeles');
    expect(groups.map((group) => [group.key, group.events[0]?.title])).toEqual([
      ['2026-11-11', 'A'], ['2026-11-12', 'B'],
    ]);
  });
  it('calcola mezzanotte reale attraverso il giorno da 25 ore', () => {
    const first = calendarMidnight(parseCalendarDay('2026-10-25')!, 'Europe/Rome');
    const next = calendarMidnight(parseCalendarDay('2026-10-26')!, 'Europe/Rome');
    expect(first.toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(next.getTime() - first.getTime()).toBe(25 * 60 * 60 * 1000);
    expect(calendarDay(new Date('2026-11-12T23:30:00Z'), 'Europe/Rome').getDate()).toBe(13);
  });
  it('ordina all-day a mezzanotte HA e separa titoli uguali di calendari diversi', () => {
    const result = mergeEvents({
      'calendar.b': { events: [{ summary: 'Uguale', start: '2026-11-12T00:30:00+14:00' }] },
      'calendar.a': { events: [{ summary: 'Uguale', start: '2026-11-12', end: '2026-11-13' }] },
    }, undefined, 'Pacific/Kiritimati');
    expect(result.map((event) => event.calendarId)).toEqual(['calendar.a', 'calendar.b']);
    expect(new Set(result.map((event) => event.key)).size).toBe(2);
  });
  it('filtra sovrapposizioni: include un evento in corso, esclude fine a mezzanotte e limite destro', () => {
    const result = mergeEvents({ 'calendar.a': { events: [
      { summary: 'In corso', start: '2026-11-11T18:00:00+01:00', end: '2026-11-12T10:00:00+01:00' },
      { summary: 'Concluso', start: '2026-11-11', end: '2026-11-12' },
      { summary: 'Fuori', start: '2026-11-15', end: '2026-11-16' },
    ] } });
    expect(withinDays(result, 3, new Date('2026-11-12T08:00:00Z'), 'Europe/Rome').map((event) => event.title))
      .toEqual(['In corso']);
  });
  it('rende esplicite date e orari per un evento temporizzato su più giorni', () => {
    const event = toEventView({ start: '2026-11-12T23:00:00+01:00', end: '2026-11-13T01:00:00+01:00' }, 'calendar.a', 0)!;
    expect(eventTimeText(event, 'it-IT', 'Europe/Rome')).toContain('12 nov');
    expect(eventTimeText(event, 'it-IT', 'Europe/Rome')).toContain('13 nov');
    expect(groupByDay([event], 'Europe/Rome')).toHaveLength(2);
  });
  it('rimuove soltanto duplicati nella selezione senza migrare gli ID', () => {
    expect(selectedCalendars(['calendar.b', 'calendar.a', 'calendar.b', '', 42]))
      .toEqual(['calendar.b', 'calendar.a']);
  });
});

describe('Agenda · attività veritiere e capacità', () => {
  it('non trasforma uno stato omesso/sconosciuto in da fare', () => {
    const items = toItemViews([{ uid: 'a', summary: 'A' }, { uid: 'b', summary: 'B', status: 'invalid' }]);
    expect(items.map((item) => item.status)).toEqual(['unknown', 'unknown']);
  });
  it('conserva identità indipendenti e impedisce azioni su summary ambigui', () => {
    const items = toItemViews([
      { uid: 'a', summary: 'Latte', status: 'needs_action' },
      { uid: 'b', summary: 'Latte', status: 'completed' },
      { summary: 'Pane' }, { summary: 'Pane' },
    ]);
    expect(new Set(items.map((item) => item.id)).size).toBe(4);
    expect(items.slice(0, 2).map((item) => item.commandId)).toEqual(['a', 'b']);
    expect(items.slice(2).every((item) => item.commandId === undefined)).toBe(true);
  });
  it('un identificativo sintetico di sola lettura non collide con un UID reale', () => {
    const items = toItemViews([{ summary: 'Pane' }, { summary: 'Pane' }, { uid: 'Pane#1', summary: 'Altro' }]);
    expect(new Set(items.map((item) => item.id)).size).toBe(3);
    expect(items[2]?.commandId).toBe('Pane#1');
  });
  it.each([undefined, null, '7', -1, 1.5, 0])('capacità ignota/zero %s è sola lettura', (supported_features) => {
    expect(todoCapabilities(fixtureEntity('todo.a', '1', { supported_features })))
      .toEqual({ add: false, remove: false, update: false });
  });
  it.each([
    [1, { add: true, remove: false, update: false }],
    [2, { add: false, remove: true, update: false }],
    [4, { add: false, remove: false, update: true }],
    [7, { add: true, remove: true, update: true }],
    [112, { add: false, remove: false, update: false }],
  ])('rispetta i bit effettivi %s', (supported_features, expected) => {
    expect(todoCapabilities(fixtureEntity('todo.a', '1', { supported_features }))).toEqual(expected);
  });
  it('non normalizza una scadenza impossibile né la usa per dichiarare ritardo', () => {
    expect(dueText('2026-02-31', 'it-IT')).toEqual({ text: 'Scadenza non disponibile', overdue: false });
    expect(dueText('2026-02-31T10:00:00Z', 'it-IT')).toEqual({ text: 'Scadenza non disponibile', overdue: false });
  });
});
