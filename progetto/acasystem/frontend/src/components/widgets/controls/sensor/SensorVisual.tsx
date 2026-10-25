import type { CSSProperties } from 'react';
import type { ThresholdTone } from './sensorModel';

export interface SensorVisualProps {
  kind: 'gauge' | 'donut' | 'bar';
  value: number;
  min: number;
  max: number;
  tone: ThresholdTone;
  /** Accessible summary (value, unit and range). */
  label: string;
  compact?: boolean;
}

const ratioOf = (value: number, min: number, max: number) =>
  Math.min(1, Math.max(0, (value - min) / (max - min || 1)));

/**
 * Gauge, donut and bar of the legacy SensorGauge, drawn with the Metallo accents: the fill
 * takes the threshold tone (danger, orange or blue); the value is always in text as well.
 */
export function SensorVisual({
  kind,
  value,
  min,
  max,
  tone,
  label,
  compact = false,
}: SensorVisualProps) {
  const ratio = ratioOf(value, min, max);
  const className = [
    'ctl-visual',
    `ctl-visual--${kind}`,
    `ctl-visual--${tone}`,
    compact && 'ctl-visual--compact',
  ]
    .filter(Boolean)
    .join(' ');

  if (kind === 'bar') {
    return (
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className={className}
        style={{ '--aca-ctl-ratio': ratio } as CSSProperties}
      >
        <span className="ctl-visual__track">
          <span className="ctl-visual__fill" />
        </span>
      </div>
    );
  }

  if (kind === 'donut') {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    return (
      <svg
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className={className}
        viewBox="0 0 100 100"
      >
        <circle className="ctl-visual__track-line" cx="50" cy="50" r={radius} />
        <circle
          className="ctl-visual__value-line"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={`${ratio * circumference} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
    );
  }

  // Gauge: half circle from the left to the right.
  const radius = 40;
  const half = Math.PI * radius;
  const arc = 'M10,50 A40,40 0 0 1 90,50';
  return (
    <svg
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className={className}
      viewBox="0 0 100 56"
    >
      <path className="ctl-visual__track-line" d={arc} />
      <path
        className="ctl-visual__value-line"
        d={arc}
        strokeDasharray={`${ratio * half} ${half}`}
      />
    </svg>
  );
}
