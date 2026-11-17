import type { ReactNode } from 'react';
import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption, Heading, Numeric } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { isUnavailableState, settingString } from '../shared/entity';
import { addDays, formatDayLabel, localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { useMeasuredHeight } from '../shared/useMeasuredHeight';
import { CommandError, WidgetLoading, WidgetNotice, WidgetShell } from '../shared/WidgetShell';
import {
  eventsThatFit,
  calendarDay,
  groupByDay,
  horizonDays,
  selectedCalendars,
  withinDays,
  type CalendarEventView,
} from './calendarModel';
import { CARD_REFRESH_MS, CARD_WINDOW_DAYS, useCalendarEvents } from './useCalendarEvents';
import './agenda.css';

/** «09:30–10:30», «Dalle 09:30» or «Tutto il giorno». */
export function eventTimeText(event: CalendarEventView, locale: string, timeZone?: string): string {
  if (event.allDay) {
    if (!event.end || addDays(event.start, 1).getTime() >= event.end.getTime()) return 'Tutto il giorno';
    const label = (date: Date) => date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return `Tutto il giorno · ${label(event.start)}–${label(addDays(event.end, -1))}`;
  }
  const time = (date: Date) => date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone });
  const start = time(event.start);
  if (!event.end) return `Dalle ${start}`;
  if (calendarDay(event.start, timeZone).getTime() !== calendarDay(event.end, timeZone).getTime()) {
    const date = (value: Date) => value.toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone });
    return `${date(event.start)} ${start}–${date(event.end)} ${time(event.end)}`;
  }
  return `${start}–${time(event.end)}`;
}

export function CalendarWidget({ id, settings, size, editMode, openDetails }: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime();
  const { conn, entities, entitiesLoaded, customNames, language, haConfig } = runtime;
  const timeZone = haConfig?.time_zone;
  const locale = localeFor(language);
  const calendars = selectedCalendars(settings.calendars);
  const name = customNames[id] || settingString(settings, 'subtitle') || settingString(settings, 'name') || 'Calendario';
  const missing = calendars.filter((calendarId) => !entities[calendarId] || !calendarId.startsWith('calendar.') || isUnavailableState(entities[calendarId]?.state));
  const { events, loading, error } = useCalendarEvents(conn, calendars, {
    days: CARD_WINDOW_DAYS,
    refreshMs: CARD_REFRESH_MS,
    enabled: entitiesLoaded && missing.length === 0,
    timeZone,
  });

  const [bodyRef, bodyHeight] = useMeasuredHeight<HTMLDivElement>();

  const compact = size.h < 2 || size.w < 2;
  const columns = size.w >= 4 ? 2 : 1;
  const shown = withinDays(events, horizonDays(size.w * size.h), new Date(), timeZone);
  // Measured card: what fits under the 26 px heading (22 px kept for «Altri…»); by cells in tests.
  const capacity =
    bodyHeight === null
      ? Math.max(1, size.h * 2 - 1) * columns
      : eventsThatFit(shown, bodyHeight - 26, columns) >= shown.length
        ? shown.length
        : eventsThatFit(shown, bodyHeight - 26 - 22, columns);
  const visible = shown.slice(0, capacity);
  const hidden = shown.length - visible.length;
  const groups = groupByDay(visible, timeZone, { start: calendarDay(new Date(), timeZone), days: horizonDays(size.w * size.h) }, false);
  const next = withinDays(events, CARD_WINDOW_DAYS, new Date(), timeZone).find((event) => !event.end || event.allDay || event.end > new Date());

  let body: ReactNode;
  if (calendars.length === 0) {
    body = (
      <WidgetNotice
        icon="calendar"
        title={name}
        message="Scegli i calendari da mostrare nelle impostazioni del widget."
        compact={compact}
      />
    );
  } else if (!entitiesLoaded || (loading && events.length === 0)) {
    body = <WidgetLoading size={size} label="Caricamento del calendario…" />;
  } else if (missing.length > 0) {
    body = <WidgetNotice icon="calendar" title={name} message="Un calendario associato non è più disponibile." compact={compact} />;
  } else if (error && events.length === 0) {
    body = (
      <WidgetNotice
        icon="warning"
        tone="danger"
        title={name}
        message="Non riesco a leggere gli eventi. Apri i dettagli per riprovare."
        compact={compact}
      />
    );
  } else if (compact) {
    body = (
      <div className="home-row home-fill">
        <HomeIcon name="calendar" size="lg" tone={next ? 'info' : 'muted'} />
        <div className="home-stack home-grow">
          {next ? (
            <>
              <Caption className="home-truncate">
                {error ? 'Ultima lettura · ' : ''}
                {formatDayLabel(next.allDay ? next.start : calendarDay(next.start, timeZone), locale, calendarDay(new Date(), timeZone))} ·{' '}
                <Numeric>{eventTimeText(next, locale, timeZone)}</Numeric>
              </Caption>
              <Body size="md" className="home-clamp-2">
                {next.title}
              </Body>
            </>
          ) : (
            <>
              <Heading level={3} size="sm" className="home-truncate">
                {name}
              </Heading>
              <Caption>Nessun evento nei prossimi 7 giorni</Caption>
            </>
          )}
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <div className="home-row">
          <HomeIcon name="calendar" size="md" tone="info" />
          <Heading level={3} size="sm" className="home-truncate home-grow">
            {name}
          </Heading>
        </div>
        {groups.length === 0 ? (
          <div className="home-empty">
            <Caption as="p">
              Nessun evento nei prossimi {horizonDays(size.w * size.h)} giorni.
            </Caption>
          </div>
        ) : (
          <div className="home-agenda" data-columns={columns}>
            {groups.map((group) => (
              <section
                key={group.key}
                className="home-agenda__day"
                aria-label={formatDayLabel(group.date, locale, calendarDay(new Date(), timeZone))}
              >
                <Caption as="p" tone="info">
                  {formatDayLabel(group.date, locale, calendarDay(new Date(), timeZone))}
                </Caption>
                <ul className="home-agenda__list">
                  {group.events.map((event) => (
                    <li
                      key={event.key}
                      className="home-agenda__event"
                      data-all-day={event.allDay || undefined}
                    >
                      <Caption className="home-truncate">
                        <Numeric>{eventTimeText(event, locale, timeZone)}</Numeric>
                      </Caption>
                      <Body as="span" size="sm" className="home-truncate">
                        {event.title}
                      </Body>
                      {event.location && size.h >= 3 && (
                        <Caption className="home-truncate">{event.location}</Caption>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {hidden > 0 && (
          <Caption as="p" className="home-push">
            {hidden === 1 ? 'Un altro evento' : `Altri ${hidden} eventi`}
          </Caption>
        )}
        {error && (
          <CommandError>Aggiornamento non riuscito: eventi dell’ultima lettura.</CommandError>
        )}
      </>
    );
  }

  return (
    <WidgetShell
      bodyRef={bodyRef}
      name={name}
      className="home-agenda-widget home-calendar-widget"
      size={size}
      editMode={editMode}
      error={error}
      state={calendars.length === 0 ? 'missing' : loading ? 'loading' : 'ready'}
      onPress={openDetails ?? (() => runtime.openDetails(id))}
      pressLabel={`Apri il calendario ${name}`}
    >
      {body}
    </WidgetShell>
  );
}
