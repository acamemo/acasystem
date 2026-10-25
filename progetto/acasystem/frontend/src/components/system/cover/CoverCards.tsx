import { MaterialLayers, Surface, materialClass } from '@/components/primitives';
import { clockText, coverDate } from '@/utils/launcher/calendar';
import './coverCards.css';

const TICKS = Array.from({ length: 60 }, (_, index) => index);

/**
 * Analog clock card of the cover (REP-20261007-010): recessed dial with 60 marks (longer every
 * five minutes), dark hour and minute hands, accent second hand; below it the digital time in
 * the dark ink of the calendar number. The dial is decorative: the digital time is the text.
 */
export function CoverClock({ now }: { now: Date }) {
  const clock = clockText(now);
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  return (
    <Surface className="aca-cover-card" contentClassName="aca-cover-card__content">
      <span
        className={materialClass(
          { behavior: 'well', shape: 'circle', size: 'inherit' },
          'aca-cover-clock__dial'
        )}
        aria-hidden="true"
      >
        <MaterialLayers>
          <svg className="aca-cover-clock__face" viewBox="0 0 200 200" focusable="false">
            {TICKS.map((tick) => (
              <line
                key={tick}
                className={
                  tick % 5 === 0
                    ? 'aca-cover-clock__tick aca-cover-clock__tick--hour'
                    : 'aca-cover-clock__tick'
                }
                x1="100"
                y1={tick % 5 === 0 ? 12 : 14}
                x2="100"
                y2={tick % 5 === 0 ? 26 : 20}
                transform={`rotate(${tick * 6} 100 100)`}
              />
            ))}
            <line
              className="aca-cover-clock__hand aca-cover-clock__hand--hour"
              x1="100"
              y1="112"
              x2="100"
              y2="54"
              transform={`rotate(${hours * 30} 100 100)`}
            />
            <line
              className="aca-cover-clock__hand aca-cover-clock__hand--minute"
              x1="100"
              y1="114"
              x2="100"
              y2="34"
              transform={`rotate(${minutes * 6} 100 100)`}
            />
            <line
              className="aca-cover-clock__hand aca-cover-clock__hand--second"
              x1="100"
              y1="122"
              x2="100"
              y2="28"
              transform={`rotate(${seconds * 6} 100 100)`}
            />
            <circle className="aca-cover-clock__pin" cx="100" cy="100" r="5" />
          </svg>
        </MaterialLayers>
      </span>
      <time className="aca-cover__time" dateTime={clock.iso}>
        {clock.long}
      </time>
    </Surface>
  );
}

/**
 * Calendar card of the cover, after the reference icon shared by the user: the weekday in the
 * accent at the top, the day number large, light and dark below it (REP-20261007-010).
 */
export function CoverCalendar({ now }: { now: Date }) {
  const date = coverDate(now);
  return (
    <Surface className="aca-cover-card" contentClassName="aca-cover-card__content">
      <time className="aca-cover-calendar" dateTime={date.iso} aria-label={date.spoken}>
        <span className="aca-cover-calendar__weekday" aria-hidden="true">
          {date.weekday}
        </span>
        <span className="aca-cover-calendar__day" aria-hidden="true">
          {date.day}
        </span>
      </time>
    </Surface>
  );
}
