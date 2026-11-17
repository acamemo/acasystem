import { useState } from 'react';
import type { EntityMap } from '@/@types/ha';
import { Body, Button, Caption, Segmented, Skeleton } from '@/components/primitives';
import { Section } from '../../utilities/shared/details';
import { HistoryChart } from '../../controls/shared/HistoryChart';
import { formatDateTime } from '../../controls/shared/format';
import {
  SENSOR_HISTORY_HOURS,
  productSensorView,
  sensorHistoryChartSamples,
  sensorHistoryHours,
  type ProductSensorEvent,
} from './productSensorModel';
import { useProductSensorHistory } from './useProductSensorHistory';

export function ProductSensorHistory({
  entity,
  initialHours,
  eventReading,
}: {
  entity: EntityMap[string];
  initialHours: unknown;
  eventReading?: (event: ProductSensorEvent) => {
    value: string;
    unit: string;
    numeric: number | null;
  };
}) {
  const [hours, setHours] = useState(() => sensorHistoryHours(initialHours));
  const [limit, setLimit] = useState(30);
  const history = useProductSensorHistory(entity.entity_id, hours),
    view = productSensorView(entity);
  const chartEvents = eventReading
    ? history.events.map((event) => {
        const reading = eventReading(event);
        return { ...event, numeric: reading.numeric, unit: reading.unit };
      })
    : history.events;
  const numeric =
    view.numericKind &&
    chartEvents.length >= 2 &&
    chartEvents.every((event) => event.numeric !== null && event.unit === view.unit);
  const points = numeric ? sensorHistoryChartSamples(chartEvents) : [];
  return (
    <Section
      title="Cronologia"
      aside={
        <Segmented
          label="Periodo della cronologia"
          size="sm"
          value={String(hours)}
          options={SENSOR_HISTORY_HOURS.map((value) => ({
            value: String(value),
            label: value === 168 ? '7 g' : `${value} h`,
          }))}
          onChange={(value) => {
            setHours(Number(value));
            setLimit(30);
          }}
        />
      }
    >
      {history.loading ? (
        <Skeleton variant="list" label="Caricamento della cronologia…" />
      ) : history.inactive ? null : history.error ? (
        <Body size="sm" role="status">
          Cronologia non disponibile. Le letture attuali restano visibili.
        </Body>
      ) : history.events.length === 0 ? (
        <Caption as="p">Nessun dato nella cronologia.</Caption>
      ) : (
        <>
          {numeric && (
            <HistoryChart
              points={points}
              unit={view.unit}
              label={`Andamento nelle ultime ${hours} ore`}
            />
          )}
          {numeric && points.length < history.events.length && (
            <Caption>
              Grafico semplificato da {history.events.length} letture, senza valori intermedi
              inventati.
            </Caption>
          )}
          {!numeric && history.events.length === 1 && (
            <Caption>Una sola lettura registrata.</Caption>
          )}
          <ol className="product-sensor-history__events">
            {history.events
              .slice(-limit)
              .reverse()
              .map((event, index) => {
                const reading =
                  eventReading?.(event) ??
                  productSensorView({
                    ...entity,
                    state: event.state,
                    attributes: {
                      device_class: event.deviceClass || view.deviceClass,
                      unit_of_measurement: event.unit ?? '',
                    },
                  });
                return (
                  <li key={`${event.time.getTime()}-${index}`}>
                    <Body size="sm">
                      {reading.value}
                      {reading.unit && ` ${reading.unit}`}
                    </Body>
                    <Caption>
                      <time dateTime={event.time.toISOString()}>{formatDateTime(event.time)}</time>
                    </Caption>
                  </li>
                );
              })}
          </ol>
          {history.events.length > limit && (
            <Button variant="control" size="sm" onClick={() => setLimit((value) => value + 30)}>
              Mostra altre letture
            </Button>
          )}
        </>
      )}
    </Section>
  );
}
