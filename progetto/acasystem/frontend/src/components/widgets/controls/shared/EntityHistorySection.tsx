import { useId, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { Body, Caption, Heading, Segmented, Skeleton } from '@/components/primitives';
import { ActivityLog, ActivityTimeline } from './ActivityLog';
import { domainOf } from './entity';
import { formatDateTime } from './format';
import { HistoryChart } from './HistoryChart';
import { useEntityHistory } from './useEntityHistory';

const RANGES = ['6', '12', '24', '48', '72'] as const;
type Range = (typeof RANGES)[number];

const ACTIVITY_DOMAINS = [
  'binary_sensor',
  'automation',
  'switch',
  'input_boolean',
  'cover',
  'light',
  'fan',
  'lock',
  'climate',
  'media_player',
  'scene',
  'script',
  'select',
  'input_select',
];

/** Same rules as the legacy SensorModal. */
export function isHistoryNumeric(entityId: string, state: string | undefined): boolean {
  const domain = domainOf(entityId);
  return (
    !['script', 'scene'].includes(domain) &&
    !Number.isNaN(Number.parseFloat(String(state))) &&
    state !== 'unavailable' &&
    state !== 'unknown' &&
    domain !== 'binary_sensor'
  );
}

export function showsActivity(entityId: string, state: string | undefined): boolean {
  const domain = domainOf(entityId);
  if (!ACTIVITY_DOMAINS.includes(domain)) return false;
  if (state === 'unavailable' || state === 'unknown') return false;
  if (isHistoryNumeric(entityId, state) && domain !== 'light' && domain !== 'climate') return false;
  return true;
}

/** History of the detail sheet: range, graph for numbers or timeline and log for states. */
export function EntityHistorySection({
  entity,
  unit = '',
  deviceClass,
}: {
  entity: HassEntity;
  unit?: string;
  deviceClass?: string;
}) {
  const [range, setRange] = useState<Range>('24');
  const hours = Number(range);
  const numeric = isHistoryNumeric(entity.entity_id, entity.state);
  const activity = showsActivity(entity.entity_id, entity.state);
  const enabled = numeric || activity;
  const history = useEntityHistory(entity.entity_id, hours, { enabled, detailed: true });
  const headingId = `cronologia-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const logId = `${headingId}-registro`;

  if (!enabled) return null;

  return (
    <section className="ctl-details__section" aria-labelledby={headingId}>
      <div className="ctl-details__row">
        <Heading level={3} size="sm" id={headingId}>
          Cronologia
        </Heading>
        <Segmented<Range>
          label="Periodo della cronologia"
          size="sm"
          value={range}
          onChange={setRange}
          options={RANGES.map((value) => ({ value, label: `${value} h` }))}
        />
      </div>
      {history.loading ? (
        <Skeleton
          variant={numeric && !activity ? 'chart' : 'list'}
          style={numeric && !activity ? { height: '10rem' } : undefined}
          label="Caricamento della cronologia…"
        />
      ) : (
        <>
          {history.error && (
            <Body size="sm" tone="muted">
              La cronologia completa non è disponibile: viene mostrato il valore attuale.
            </Body>
          )}
          {numeric && !activity ? (
            <HistoryChart
              points={history.points}
              unit={unit}
              label={`Andamento nelle ultime ${hours} ore`}
            />
          ) : (
            <>
              <ActivityTimeline events={history.events} start={history.start} end={history.end} />
              <ActivityLog events={history.events} deviceClass={deviceClass} headingId={logId} />
            </>
          )}
        </>
      )}
    </section>
  );
}

const HIDDEN_ATTRIBUTES = ['friendly_name', 'unit_of_measurement', 'entity_picture', 'icon'];

function attributeText(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="ctl-facts__item">
      <dt>
        <Caption>{label}</Caption>
      </dt>
      <dd className="ctl-break">
        <Body as="span" size="sm">
          {value}
        </Body>
      </dd>
    </div>
  );
}

/** Times of the last change and update, then the remaining attributes. */
export function EntityInfoSection({ entity }: { entity: HassEntity }) {
  const headingId = `info-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const attributes = Object.entries(entity.attributes).filter(
    ([key]) => !HIDDEN_ATTRIBUTES.includes(key)
  );
  return (
    <section className="ctl-details__section" aria-labelledby={headingId}>
      <Heading level={3} size="sm" id={headingId}>
        Informazioni
      </Heading>
      <dl className="ctl-facts">
        <Fact label="Ultimo cambiamento" value={formatDateTime(entity.last_changed)} />
        <Fact label="Ultimo aggiornamento" value={formatDateTime(entity.last_updated)} />
        {attributes.map(([key, value]) => (
          <Fact key={key} label={key.replace(/_/g, ' ')} value={attributeText(value)} />
        ))}
      </dl>
      <Caption as="p" className="ctl-break">
        {entity.entity_id}
      </Caption>
    </section>
  );
}
