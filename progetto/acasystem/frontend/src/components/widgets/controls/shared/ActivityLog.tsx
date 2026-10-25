import { Body, Caption, Heading } from '@/components/primitives';
import type { HistoryEvent } from './useEntityHistory';
import { formatRelative } from './format';
import { stateLabel } from './labels';

const ACTIVE_STATES = new Set(['on', 'true', 'open', 'unlocked', 'playing', 'home', 'active']);

const isActive = (state: string) =>
  ACTIVE_STATES.has(state.toLowerCase()) || Number.parseFloat(state) > 0;

/** On/off band over the window: active spans are orange, the rest stays recessed. */
export function ActivityTimeline({
  events,
  start,
  end,
}: {
  events: HistoryEvent[];
  start: Date;
  end: Date;
}) {
  const from = start.getTime();
  const total = end.getTime() - from || 1;
  const ordered = [...events].sort((a, b) => a.time.getTime() - b.time.getTime());
  const segments = ordered
    .map((event, index) => {
      const next = ordered[index + 1];
      const left = Math.max(0, (event.time.getTime() - from) / total);
      const right = Math.min(1, ((next ? next.time.getTime() : end.getTime()) - from) / total);
      return {
        key: `${event.time.getTime()}-${index}`,
        left,
        width: right - left,
        active: isActive(event.state),
      };
    })
    .filter((segment) => segment.width > 0 && segment.active);
  return (
    <div className="ctl-timeline" aria-hidden="true">
      {segments.map((segment) => (
        <span
          key={segment.key}
          className="ctl-timeline__span"
          style={{ left: `${segment.left * 100}%`, width: `${segment.width * 100}%` }}
        />
      ))}
    </div>
  );
}

/** The last state changes, newest first. */
export function ActivityLog({
  events,
  deviceClass,
  limit = 8,
  headingId,
}: {
  events: HistoryEvent[];
  deviceClass?: string;
  limit?: number;
  headingId: string;
}) {
  const recent = [...events].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, limit);
  return (
    <section className="ctl-details__section" aria-labelledby={headingId}>
      <Heading level={3} size="sm" id={headingId}>
        Registro
      </Heading>
      {recent.length === 0 ? (
        <Caption as="p">Nessun dato nella cronologia.</Caption>
      ) : (
        <ol className="ctl-log">
          {recent.map((event, index) => (
            <li key={`${event.time.getTime()}-${index}`} className="ctl-log__item">
              <span
                className={isActive(event.state) ? 'ctl-log__dot ctl-log__dot--on' : 'ctl-log__dot'}
                aria-hidden="true"
              />
              <Body as="span" size="sm" className="ctl-grow">
                {stateLabel(event.state, deviceClass)}
              </Body>
              <Caption>
                <time dateTime={event.time.toISOString()}>{formatRelative(event.time)}</time>
              </Caption>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
