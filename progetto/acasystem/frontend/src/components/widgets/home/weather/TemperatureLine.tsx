import { useId } from 'react';
import type { TimePoint } from './weatherModel';

const WIDTH = 300;
const HEIGHT = 100;
const PAD = 8;

export interface TemperatureLineProps {
  points: TimePoint[];
  /** Accessible summary, e.g. «Temperatura delle ultime 12 ore, da 14 a 21 °C». */
  label: string;
  className?: string;
}

/**
 * Temperature trend engraved in the metal: one muted line with a soft fill and the latest
 * value marked in orange. The colour bands of the legacy graph are left out (restrained palette).
 * The line stretches with its box; the marker is an HTML dot, so it stays round.
 */
export function TemperatureLine({ points, label, className }: TemperatureLineProps) {
  const gradientId = `home-linea-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (points.length < 2) return null;
  const times = points.map((point) => point.time.getTime());
  const values = points.map((point) => point.value);
  const minTime = Math.min(...times);
  const spanTime = Math.max(1, Math.max(...times) - minTime);
  const minValue = Math.min(...values);
  const spanValue = Math.max(1, Math.max(...values) - minValue);
  const coords = points.map((point) => [
    PAD + ((point.time.getTime() - minTime) / spanTime) * (WIDTH - PAD * 2),
    PAD + (1 - (point.value - minValue) / spanValue) * (HEIGHT - PAD * 2),
  ]);
  const line = coords
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const [lastX, lastY] = coords[coords.length - 1];
  const area = `${line} L${lastX.toFixed(1)} ${HEIGHT} L${coords[0][0].toFixed(1)} ${HEIGHT} Z`;

  return (
    <div
      className={['home-line', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--aca-ink-muted)', stopOpacity: 0.18 }} />
            <stop offset="100%" style={{ stopColor: 'var(--aca-ink-muted)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} stroke="none" />
        <path
          d={line}
          fill="none"
          className="home-line__stroke"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="home-line__dot"
        aria-hidden="true"
        style={{ left: `${(lastX / WIDTH) * 100}%`, top: `${(lastY / HEIGHT) * 100}%` }}
      />
    </div>
  );
}

/** «da 14 a 21 °C» for the accessible label of the line. */
export function rangeText(points: TimePoint[], format: (value: number) => string): string {
  if (points.length === 0) return '';
  const values = points.map((point) => point.value);
  return `da ${format(Math.min(...values))} a ${format(Math.max(...values))}`;
}
