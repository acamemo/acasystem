import { useEffect, useId, useState } from 'react';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { Body, Button, Caption, Heading, Numeric, Skeleton } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { isNonEmptyString } from '@/validators/guards';
import { attributeString } from '../shared/entity';
import { formatDayLabel, localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { CommandError } from '../shared/WidgetShell';
import { groupByDay, isFinishedToday } from './calendarModel';
import { eventTimeText } from './CalendarWidget';
import { DETAILS_WINDOW_DAYS, useCalendarEvents } from './useCalendarEvents';

/** Selection of the legacy calendar modal, shared by every calendar card. */
export const CALENDAR_SELECTION_KEY = 'tunet_calendar_modal_selection';

function readStoredSelection(): string[] | null {
  try {
    const raw = localStorage.getItem(CALENDAR_SELECTION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isNonEmptyString) : null;
  } catch {
    return null;
  }
}

/** Agenda of the next 30 days for the calendars chosen here (legacy CalendarModal). */
export function CalendarDetails(_props: WidgetDetailsProps) {
  const { entities, conn, language } = useWidgetRuntime();
  const locale = localeFor(language);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const pickerId = `calendari-${uid}`;
  const calendars = Object.keys(entities)
    .filter((entityId) => entityId.startsWith('calendar.'))
    .map((entityId) => ({
      id: entityId,
      name: attributeString(entities[entityId], 'friendly_name') ?? entityId,
    }));
  const [selection, setSelection] = useState<string[]>(
    () => readStoredSelection() ?? calendars.map((calendar) => calendar.id)
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CALENDAR_SELECTION_KEY, JSON.stringify(selection));
    } catch {
      // Storage full or blocked: the selection lasts for this sheet only.
    }
  }, [selection]);

  const names = new Map(calendars.map((calendar) => [calendar.id, calendar.name]));
  // Calendars removed from HA would make the whole get_events call fail.
  const active =
    calendars.length > 0 ? selection.filter((calendarId) => names.has(calendarId)) : selection;
  const { events, loading, error } = useCalendarEvents(conn, active, {
    days: DETAILS_WINDOW_DAYS,
    fromStartOfDay: true,
  });
  const groups = groupByDay(events);
  const allSelected =
    calendars.length > 0 && calendars.every((calendar) => selection.includes(calendar.id));

  const toggle = (calendarId: string) =>
    setSelection((current) =>
      current.includes(calendarId)
        ? current.filter((idItem) => idItem !== calendarId)
        : [...current, calendarId]
    );

  return (
    <div className="home-details">
      <div className="home-row home-row--between home-row--wrap">
        <Caption as="p">
          {selection.length === 1
            ? '1 calendario selezionato'
            : `${selection.length} calendari selezionati`}
        </Caption>
        {calendars.length > 0 && (
          <Button
            variant="control"
            size="sm"
            aria-expanded={pickerOpen}
            aria-controls={pickerId}
            onClick={() => setPickerOpen((open) => !open)}
          >
            {pickerOpen ? 'Nascondi i calendari' : 'Scegli i calendari'}
          </Button>
        )}
      </div>

      {pickerOpen && (
        <section id={pickerId} className="home-section" aria-label="Calendari">
          <div className="home-options">
            {calendars.map((calendar) => (
              <Button
                key={calendar.id}
                variant="control"
                size="sm"
                aria-pressed={selection.includes(calendar.id)}
                onClick={() => toggle(calendar.id)}
              >
                {calendar.name}
              </Button>
            ))}
          </div>
          <div>
            <Button
              variant="control"
              size="sm"
              onClick={() =>
                setSelection(allSelected ? [] : calendars.map((calendar) => calendar.id))
              }
            >
              {allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </Button>
          </div>
        </section>
      )}

      {calendars.length === 0 ? (
        <Caption as="p">Nessun calendario trovato in Home Assistant.</Caption>
      ) : active.length === 0 ? (
        <Caption as="p">Scegli almeno un calendario per vedere gli eventi.</Caption>
      ) : loading ? (
        <Skeleton rows={4} label="Caricamento del calendario…" />
      ) : error && events.length === 0 ? (
        <CommandError>Non riesco a leggere gli eventi da Home Assistant.</CommandError>
      ) : groups.length === 0 ? (
        <div className="home-empty">
          <HomeIcon name="calendar" size="lg" tone="muted" />
          <Caption as="p">Nessun evento nei prossimi 30 giorni.</Caption>
        </div>
      ) : (
        groups.map((group) => (
          <section
            key={group.key}
            className="home-section"
            aria-label={formatDayLabel(group.date, locale)}
          >
            <Heading level={3} size="sm">
              {formatDayLabel(group.date, locale)}
            </Heading>
            <ul className="home-list">
              {group.events.map((event) => {
                const past = isFinishedToday(event);
                return (
                  <li key={event.key} className="home-list__item" data-past={past || undefined}>
                    <Caption className="home-list__time">
                      <Numeric>{eventTimeText(event, locale)}</Numeric>
                    </Caption>
                    <div className="home-stack home-grow">
                      <Body as="span" size="md" tone={past ? 'muted' : undefined}>
                        {event.title}
                      </Body>
                      <Caption>
                        {[
                          past ? 'Concluso' : null,
                          names.get(event.calendarId) ?? event.calendarId,
                          event.location,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Caption>
                      {event.description && (
                        <Caption className="home-clamp-2">{event.description}</Caption>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
