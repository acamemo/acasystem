import { type CSSProperties } from 'react';
import { Caption } from '@/components/primitives';
import { downsampleTimeSeries, type TimePoint } from '@/utils/sensorHistory';
import { formatReading, unitSuffix } from '@/utils/formatting';
import { hasTrend, rangeCaption } from './chartPolicy';
import { useOperationalHistory } from './useOperationalHistory';
import type { HistorySource } from './operationalProfile';
import { type Capability, type SampleStatus, type SampleValues } from './widgetDesignModel';

type ChartSpec = {
  label: string;
  key: string;
  kind: 'curve' | 'bars';
  unit?: string;
};

/** Only the measured quantities of `chartPolicy.ts` have a chart. */
const charts: Partial<Record<string, ChartSpec>> = {
  vacuum: { label: 'Batteria', key: 'battery', kind: 'curve', unit: '%' },
  mower: { label: 'Batteria', key: 'battery', kind: 'curve', unit: '%' },
  car: { label: 'Batteria', key: 'battery', kind: 'curve', unit: '%' },
  room: { label: 'Temperatura ambiente', key: 'temperature', kind: 'curve', unit: '°C' },
  sensor: { label: 'Temperatura', key: 'temperature', kind: 'curve', unit: '°C' },
  cost: { label: 'Costi energetici', key: 'today', kind: 'bars', unit: '€' },
  nordpool: { label: 'Prezzo energia', key: 'price', kind: 'curve', unit: '€/kWh' },
};

// The chart is a wide sparkline: it is drawn stretched to its slot, with strokes that keep their width.
const WIDTH = 300;
const HEIGHT = 64;
const LEFT = 8;
const RIGHT = WIDTH - 8;
const TOP = 6;
const BOTTOM = HEIGHT - 6;

export interface WidgetDesignChartProps {
  type: string;
  capabilities: readonly Capability[];
  values: SampleValues;
  status: SampleStatus;
  historyPoints?: readonly TimePoint[];
  historySource?: HistorySource;
  enabled?: boolean;
  hours?: number;
  seriesLabel?: string;
}

/**
 * A trend of the last hours, drawn only when there is one. The card keeps the slot either way
 * (see `.aca-adaptive-widget__chart-wrap`), so this returns nothing while the history loads and
 * when it is missing or flat, and the card does not move.
 */
export function WidgetDesignChart({
  type,
  capabilities,
  values,
  status,
  historyPoints: externalHistoryPoints,
  historySource,
  enabled = true,
  hours = 24,
  seriesLabel,
}: WidgetDesignChartProps) {
  const realHistory = useOperationalHistory(
    historySource,
    enabled && !externalHistoryPoints,
    hours
  );
  const historyPoints = externalHistoryPoints ?? realHistory.points;

  const requested = charts[type] ?? { label: 'Valore', key: 'reading', kind: 'curve' as const };
  const available = capabilities.find((cap) => cap.id === requested.key);
  const fallback =
    capabilities.find((cap) => cap.kind === 'range' || cap.kind === 'reading') ?? capabilities[0];
  const cap = available ?? fallback;
  const spec: ChartSpec = available
    ? requested
    : {
        label: fallback?.label ?? requested.label,
        key: fallback?.id ?? requested.key,
        kind: requested.kind,
        unit: fallback && 'unit' in fallback ? fallback.unit : requested.unit,
      };
  const unit = cap && 'unit' in cap ? cap.unit : spec.unit;

  if (!cap || !hasTrend(historyPoints)) return null;

  const reading = formatReading(values[spec.key]);
  const isRange = cap.kind === 'range';
  const dataValues = historyPoints.map((p) => p.value);
  const dataMin = Math.min(...dataValues);
  const dataMax = Math.max(...dataValues);
  const span = isRange ? cap.max - cap.min || 1 : unit === '%' ? 100 : dataMax - dataMin;
  const floor = isRange ? cap.min : unit === '%' ? 0 : dataMin;
  const level = (value: number) => Math.max(0, Math.min(1, (value - floor) / span));
  const yOf = (value: number) => BOTTOM - level(value) * (BOTTOM - TOP);

  const sampled = downsampleTimeSeries(historyPoints as TimePoint[], 32) ?? [];
  const t0 = sampled[0]?.time.getTime() ?? 0;
  const dt = (sampled[sampled.length - 1]?.time.getTime() ?? t0) - t0 || 1;
  const xOf = (time: Date) => LEFT + ((time.getTime() - t0) / dt) * (RIGHT - LEFT);
  const curve = sampled.map((p) => `${xOf(p.time).toFixed(1)},${yOf(p.value).toFixed(1)}`);
  const last = sampled[sampled.length - 1];

  const buckets = downsampleTimeSeries(historyPoints as TimePoint[], 8) ?? [];
  const barWidth = (RIGHT - LEFT) / 8;

  // One caption: what it measures and its latest value, then the range only where it is not the day.
  const note = seriesLabel ?? rangeCaption(hours);
  const caption = `${spec.label} ${reading}${unitSuffix(unit)}${note ? ` · ${note}` : ''}`;

  return (
    <figure
      className="uikwa-chart"
      data-chart-kind={spec.kind}
      data-chart-value={reading}
      style={{ '--uikwa-chart-colour': 'var(--k2-accent)' } as CSSProperties}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${caption}.`}
        className={status === 'available' ? '' : 'uikwa-chart--unavailable'}
      >
        {spec.kind === 'bars' ? (
          buckets.map((bucket, index) => {
            const height = Math.max(2, level(bucket.value) * (BOTTOM - TOP));
            return (
              <rect
                key={index}
                x={LEFT + index * barWidth + barWidth * 0.15}
                y={BOTTOM - height}
                width={barWidth * 0.7}
                height={height}
                rx="3"
                opacity={index === buckets.length - 1 ? 1 : 0.35}
              />
            );
          })
        ) : (
          <>
            <path
              className="uikwa-chart__area"
              d={`M${curve.join(' L')} L${RIGHT} ${BOTTOM} L${LEFT} ${BOTTOM} Z`}
            />
            <path className="uikwa-chart__line" fill="none" d={`M${curve.join(' L')}`} />
            {last && (
              <path
                className="uikwa-chart__dot"
                fill="none"
                d={`M${xOf(last.time).toFixed(1)} ${yOf(last.value).toFixed(1)} h0`}
              />
            )}
          </>
        )}
      </svg>
      <figcaption>
        <Caption>{caption}</Caption>
      </figcaption>
    </figure>
  );
}
