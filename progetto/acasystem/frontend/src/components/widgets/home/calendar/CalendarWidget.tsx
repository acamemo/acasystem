import type { ReactNode } from 'react';
import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption, Heading, Numeric } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { settingString } from '../shared/entity';
import { formatDayLabel, formatTime, localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { useMeasuredHeight } from '../shared/useMeasuredHeight';
import { CommandError, WidgetLoading, WidgetNotice, WidgetShell } from '../shared/WidgetShell';
import {
  eventsThatFit,
  groupByDay,
  horizonDays,
  selectedCalendars,
  withinDays,
  type CalendarEventView,
} from './calendarModel';
import { CARD_REFRESH_MS, CARD_WINDOW_DAYS, useCalendarEvents } from './useCalendarEvents';

/** «09:30–10:30», «Dalle 09:30» or «Tutto il giorno». */
export function eventTimeText(event: CalendarEventView, locale: string): string {
  if (event.allDay) return 'Tutto il giorno';
  const start = formatTime(event.start, locale);
  return event.end ? `${start}–${formatTime(event.end, locale)}` : `Dalle ${start}`;
}

export function CalendarWidget({ id, settings, size, editMode }: WidgetProps) {
  const { conn, entitiesLoaded, customNames, openDetails, language } = useWidgetRuntime();
  const locale = localeFor(language);
  const calendars = selectedCalendars(settings.calendars);
  const name = customNames[id] || settingString(settings, 'name') || 'Calendario';
  const { events, loading, error } = useCalendarEvents(conn, calendars, {
    days: CARD_WINDOW_DAYS,
    refreshMs: CARD_REFRESH_MS,
  });

  const [bodyRef, bodyHeight] = useMeasuredHeight<HTMLDivElement>();

  const compact = size.h < 2;
  const columns = size.w >= 4 ? 2 : 1;
  const shown = withinDays(events, horizonDays(size.w * size.h));
  // Measured card: what fits under the 26 px heading (22 px kept for «Altri…»); by cells in tests.
  const capacity =
    bodyHeight === null
      ? Math.max(1, size.h * 2 - 1) * columns
      : eventsThatFit(shown, bodyHeight - 26, columns) >= shown.length
        ? shown.length
        : eventsThatFit(shown, bodyHeight - 26 - 22, columns);
  const visible = shown.slice(0, capacity);
  const hidden = shown.length - visible.length;
  const groups = groupByDay(visible);
  const next = events[0];

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
  } else if (error && events.length === 0) {
    body = (
      <WidgetNotice
        icon="warning"
        tone="danger"
        title={name}
        message="Non riesco a leggere gli eventi da Home Assistant. Riprovo tra poco."
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
                {formatDayLabel(next.start, locale)} ·{' '}
                <Numeric>{eventTimeText(next, locale)}</Numeric>
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
                aria-label={formatDayLabel(group.date, locale)}
              >
                <Caption as="p" tone="info">
                  {formatDayLabel(group.date, locale)}
                </Caption>
                <ul className="home-agenda__list">
                  {group.events.map((event) => (
                    <li
                      key={event.key}
                      className="home-agenda__event"
                      data-all-day={event.allDay || undefined}
                    >
                      <Caption className="home-truncate">
                        <Numeric>{eventTimeText(event, locale)}</Numeric>
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
      size={size}
      editMode={editMode}
      error={error}
      state={calendars.length === 0 ? 'missing' : loading ? 'loading' : 'ready'}
      onPress={() => openDetails(id)}
      pressLabel={`Apri il calendario ${name}`}
    >
      {body}
    </WidgetShell>
  );
}
