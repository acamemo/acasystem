import { useId } from 'react';
import { Caption, Numeric } from '@/components/primitives';
import type { TimePoint } from '@/utils/sensorHistory';
import { formatClock, formatDateTime, italianNumber } from './format';

const WIDTH = 100;

function geometry(points: TimePoint[], height: number, inset: number) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const first = points[0]?.time.getTime() ?? 0;
  const last = points[points.length - 1]?.time.getTime() ?? first;
  const duration = last - first || 1;
  const coords = points.map((point) => {
    const x = ((point.time.getTime() - first) / duration) * WIDTH;
    const y = inset + (1 - (point.value - min) / span) * (height - inset * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${coords.join(' L')}`;
  const area = `${line} L${WIDTH},${height} L0,${height} Z`;
  return { line, area, min, max };
}

const round = (value: number) => italianNumber(String(Math.round(value * 10) / 10));

/** Short description of a series for assistive technology. */
export function describeSeries(points: TimePoint[], unit: string): string {
  if (points.length === 0) return 'Nessun dato nella cronologia';
  const values = points.map((point) => point.value);
  const suffix = unit ? ` ${unit}` : '';
  const last = values[values.length - 1] ?? 0;
  return `Minimo ${round(Math.min(...values))}${suffix}, massimo ${round(Math.max(...values))}${suffix}, ultimo ${round(last)}${suffix}`;
}

/** Decorative trend line at the bottom of a widget (the value is already in text). */
export function Sparkline({ points }: { points: TimePoint[] }) {
  const gradientId = `ctl-spark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (points.length < 2) return null;
  const height = 30;
  const { line, area } = geometry(points, height, 3);
  return (
    <svg
      className="ctl-spark"
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="ctl-spark__stop-top" />
          <stop offset="100%" className="ctl-spark__stop-bottom" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} className="ctl-spark__line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** History graph of the detail sheet: line, area, extremes and time span. */
export function HistoryChart({
  points,
  unit,
  label,
}: {
  points: TimePoint[];
  unit: string;
  label: string;
}) {
  if (points.length < 2) {
    return <Caption as="p">Nessun dato nella cronologia.</Caption>;
  }
  const height = 60;
  const { line, area, min, max } = geometry(points, height, 4);
  const suffix = unit ? ` ${unit}` : '';
  const start = points[0]?.time;
  const end = points[points.length - 1]?.time;
  return (
    <figure className="ctl-chart">
      <div className="ctl-chart__plot">
        <div className="ctl-chart__axis" aria-hidden="true">
          <Caption>
            <Numeric>{`${round(max)}${suffix}`}</Numeric>
          </Caption>
          <Caption>
            <Numeric>{`${round(min)}${suffix}`}</Numeric>
          </Caption>
        </div>
        <svg
          className="ctl-chart__svg"
          viewBox={`0 0 ${WIDTH} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${label}. ${describeSeries(points, unit)}.`}
        >
          <path d={area} className="ctl-chart__area" />
          <path d={line} className="ctl-chart__line" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <figcaption className="ctl-chart__times">
        <Caption>{start ? `Dal ${formatDateTime(start)}` : ''}</Caption>
        <Caption>{end ? `alle ${formatClock(end)}` : ''}</Caption>
      </figcaption>
    </figure>
  );
}
