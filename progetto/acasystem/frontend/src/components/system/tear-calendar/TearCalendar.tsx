import {
  Body,
  Caption,
  Display,
  Heading,
  MaterialLayers,
  Numeric,
  Surface,
  materialClass,
} from '@/components/primitives';
import { WEEKDAYS, clockText, coverDate, monthMatrix } from '@/utils/launcher/calendar';
import './tearCalendar.css';

export interface TearCalendarProps {
  now: Date;
}

/** Round stud of the kit: raised for the pins, recessed for the hole of the hook. */
function Stud({ className, recessed = false }: { className: string; recessed?: boolean }) {
  return (
    <span
      className={materialClass(
        { behavior: recessed ? 'well' : 'static', shape: 'circle', size: 'inherit' },
        className
      )}
      aria-hidden="true"
    >
      <MaterialLayers />
    </span>
  );
}

/**
 * Tear-off calendar of the cover, adapted from UI-008 in «Metallo»: the hook and the pins are
 * circles of the kit, the sheet is a light face, the big date is orange (the ≥ 3:1 ink for
 * large text), month and weekday are blue labels, today is pressed and orange in the month
 * grid, and a digital clock with tabular figures sits in a groove. No lunar date, no light
 * switch, no capitals, no tracking.
 *
 * The sheet is one grid (header, date, weekday, month grid): tearCalendar.css places the areas
 * for wide, narrow and short pages, and grows the whole object with the page (REP-20261007-001).
 */
export function TearCalendar({ now }: TearCalendarProps) {
  const date = coverDate(now);
  const clock = clockText(now);
  const weeks = monthMatrix(now.getFullYear(), now.getMonth());

  return (
    <div className="aca-tear">
      <div className="aca-tear__object">
        <span
          className={materialClass(
            { behavior: 'static', shape: 'pill', size: 'inherit' },
            'aca-tear__hook'
          )}
          aria-hidden="true"
        >
          <MaterialLayers contentClassName="aca-tear__hook-content">
            <Stud className="aca-tear__hole" recessed />
          </MaterialLayers>
        </span>
        <Surface className="aca-tear__sheet">
          <div className="aca-tear__content">
            <div className="aca-tear__header">
              <Stud className="aca-tear__pin" />
              <Numeric className="aca-tear__year">{date.year}</Numeric>
              <Stud className="aca-tear__pin" />
            </div>

            <time className="aca-tear__main" dateTime={date.iso} aria-label={date.spoken}>
              <Body as="span" size="md" tone="info" className="aca-tear__month" aria-hidden="true">
                {date.month}
              </Body>
              <Display as="span" tone="active" className="aca-tear__day" aria-hidden="true">
                <Numeric>{date.day}</Numeric>
              </Display>
            </time>

            <Heading level={2} size="lg" tone="info" className="aca-tear__weekday">
              {date.weekday}
            </Heading>

            <table className="aca-tear__month-grid">
              <caption className="sr-only">{`${date.month} ${date.year}`}</caption>
              <thead>
                <tr>
                  {WEEKDAYS.map((weekday) => (
                    <th key={weekday.name} scope="col" abbr={weekday.name}>
                      <Caption tone="muted">{weekday.initial}</Caption>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, row) => (
                  <tr key={row}>
                    {week.map((day, column) => {
                      const today = day === date.day;
                      return (
                        <td key={column} aria-current={today ? 'date' : undefined}>
                          {day !== null &&
                            (today ? (
                              <span
                                className={materialClass(
                                  { behavior: 'well', shape: 'circle', size: 'inherit' },
                                  'aca-tear__today'
                                )}
                              >
                                <MaterialLayers>
                                  <Numeric>{day}</Numeric>
                                </MaterialLayers>
                              </span>
                            ) : (
                              <Numeric className="aca-tear__date">{day}</Numeric>
                            ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>

      <div
        className={materialClass(
          { behavior: 'well', shape: 'pill', size: 'inherit' },
          'aca-tear__clock'
        )}
      >
        <MaterialLayers>
          <Numeric as="time" dateTime={clock.iso} className="aca-tear__time">
            {clock.long}
          </Numeric>
        </MaterialLayers>
      </div>
    </div>
  );
}
