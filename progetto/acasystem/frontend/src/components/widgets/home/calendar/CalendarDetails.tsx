import { useId, useState } from 'react';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { Body, Button, Caption, Heading, Numeric, Skeleton } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { isNonEmptyString } from '@/validators/guards';
import { attributeString, isUnavailableState } from '../shared/entity';
import { formatDayLabel, localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { CommandError } from '../shared/WidgetShell';
import { calendarDay, groupByDay, isFinishedToday, selectedCalendars, withinDays } from './calendarModel';
import { eventTimeText } from './CalendarWidget';
import { DETAILS_WINDOW_DAYS, useCalendarEvents } from './useCalendarEvents';
import './agenda.css';

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
export function CalendarDetails({ settings }: WidgetDetailsProps) {
  const { entities, entitiesLoaded, conn, language, haConfig } = useWidgetRuntime();
  const timeZone = haConfig?.time_zone;
  const locale = localeFor(language);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const pickerId = `calendari-${uid}`;
  const calendars = Object.keys(entities)
    .filter((entityId) => entityId.startsWith('calendar.'))
    .map((entityId) => ({
      id: entityId,
      name: attributeString(entities[entityId], 'friendly_name') ?? entityId,
    }));
  const [explicitSelection, setExplicitSelection] = useState<string[] | null>(readStoredSelection);
  const selection = explicitSelection ?? selectedCalendars(settings.calendars);
  const [pickerOpen, setPickerOpen] = useState(false);

  const chooseSelection = (next: string[]) => {
    setExplicitSelection(next);
    try {
      localStorage.setItem(CALENDAR_SELECTION_KEY, JSON.stringify(next));
    } catch {
      // Storage full or blocked: the selection lasts for this sheet only.
    }
  };

  const names = new Map(calendars.map((calendar) => [calendar.id, calendar.name]));
  // Calendars removed from HA would make the whole get_events call fail.
  const active =
    calendars.length > 0 ? selection.filter((calendarId) => names.has(calendarId)) : selection;
  const unavailable = active.some((id) => !entities[id] || isUnavailableState(entities[id]?.state));
  const missing = selection.filter((id) => !names.has(id));
  const { events, loading, error, retry, updatedAt } = useCalendarEvents(conn, active, {
    days: DETAILS_WINDOW_DAYS,
    fromStartOfDay: true,
    enabled: entitiesLoaded && !unavailable,
    timeZone,
  });
  const today = calendarDay(new Date(), timeZone);
  const groups = groupByDay(withinDays(events, DETAILS_WINDOW_DAYS, new Date(), timeZone), timeZone, { start: today, days: DETAILS_WINDOW_DAYS });
  const allSelected =
    calendars.length > 0 && calendars.every((calendar) => selection.includes(calendar.id));

  const toggle = (calendarId: string) =>
    chooseSelection(selection.includes(calendarId)
      ? selection.filter((idItem) => idItem !== calendarId)
      : [...selection, calendarId]);

  return (
    <div className="home-details home-agenda-details">
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
      <Caption as="p">Prossimi 30 giorni{timeZone ? ` · ${timeZone}` : ''}</Caption>
      {entitiesLoaded && missing.length > 0 && <Caption as="p">{missing.length === 1 ? 'Un calendario salvato non è più disponibile.' : `${missing.length} calendari salvati non sono più disponibili.`}</Caption>}

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
                chooseSelection(allSelected ? [] : calendars.map((calendar) => calendar.id))
              }
            >
              {allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </Button>
          </div>
        </section>
      )}

      {!entitiesLoaded ? (
        <Skeleton rows={4} label="Caricamento del calendario…" />
      ) : calendars.length === 0 ? (
        <Caption as="p">Nessun calendario trovato.</Caption>
      ) : active.length === 0 ? (
        <Caption as="p">Scegli almeno un calendario per vedere gli eventi.</Caption>
      ) : unavailable ? (
        <Caption as="p">Un calendario selezionato non è disponibile.</Caption>
      ) : loading ? (
        <Skeleton rows={4} label="Caricamento del calendario…" />
      ) : error && events.length === 0 ? (
        <div className="home-stack"><CommandError>Non riesco a leggere gli eventi.</CommandError><Button variant="control" size="sm" onClick={retry} disabled={!conn || conn.connected === false}>Riprova</Button></div>
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
            aria-label={formatDayLabel(group.date, locale, today)}
          >
            <Heading level={3} size="sm">
              {formatDayLabel(group.date, locale, today)}
            </Heading>
            <ul className="home-list">
              {group.events.map((event) => {
                const past = isFinishedToday(event, new Date(), timeZone);
                return (
                  <li key={event.key} className="home-list__item" data-past={past || undefined}>
                    <Caption className="home-list__time">
                      <Numeric>{eventTimeText(event, locale, timeZone)}</Numeric>
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
                        <Caption>{event.description}</Caption>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
      {error && events.length > 0 && <div className="home-stack"><Caption as="p">Ultima lettura{updatedAt ? ` alle ${updatedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}` : ''} · aggiornamento non riuscito</Caption><Button variant="control" size="sm" onClick={retry} disabled={!conn || conn.connected === false}>Riprova</Button></div>}
    </div>
  );
}
