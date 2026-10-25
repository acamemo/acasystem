import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Body, Caption } from '@/components/primitives';
import '../utilities.css';

/** Plain SVG charts (no chart library): bars and lines in the viewBox, labels in HTML. */

const VIEW_W = 600;
const VIEW_H = 200;

export interface TimePoint {
  time: Date;
  value: number;
}

export interface PricePoint {
  start: Date;
  end: Date;
  value: number;
}

interface Scale {
  min: number;
  max: number;
  y: (value: number) => number;
}

function scaleOf(values: number[], includeZero: boolean, pad = 6): Scale {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = max - min;
  return {
    min,
    max,
    y: (value) => pad + ((max - value) / range) * (VIEW_H - pad * 2),
  };
}

function linePath(points: Array<[number, number]>): string {
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
}

/** Five evenly spaced labels for the x axis. */
function axisTicks<T>(items: T[], count = 5): T[] {
  if (items.length <= count) return items;
  return Array.from({ length: count }, (_, index) => {
    const position = Math.round((index / (count - 1)) * (items.length - 1));
    return items[position] as T;
  });
}

/**
 * History of a value (cost accumulated, cost per period): line over time or one bar per
 * period, negative bars in the danger colour. Axis labels are text, the SVG is decorative.
 */
export function HistoryChart({
  data,
  kind,
  label,
  formatValue,
  formatTime,
}: {
  data: TimePoint[];
  kind: 'line' | 'bars';
  /** Accessible summary of the chart. */
  label: string;
  formatValue: (value: number) => string;
  formatTime: (time: Date) => string;
}) {
  if (data.length === 0) return null;
  const values = data.map((point) => point.value);
  const scale = scaleOf(values, kind === 'bars');
  const zeroY = scale.y(0);
  const first = data[0]?.time.getTime() ?? 0;
  const last = data[data.length - 1]?.time.getTime() ?? first;
  const span = Math.max(1, last - first);
  const ticks = axisTicks(data);

  let shapes;
  if (kind === 'bars') {
    const slot = VIEW_W / data.length;
    const width = Math.max(1, slot * 0.7);
    shapes = data.map((point, index) => {
      const y = scale.y(point.value);
      const top = Math.min(y, zeroY);
      return (
        <rect
          key={`${point.time.getTime()}-${index}`}
          className={
            point.value < 0
              ? 'utility-chart__bar utility-chart__bar--negative'
              : 'utility-chart__bar utility-chart__bar--current'
          }
          x={index * slot + (slot - width) / 2}
          y={top}
          width={width}
          height={Math.max(1, Math.abs(y - zeroY))}
          rx={Math.min(3, width / 2)}
        />
      );
    });
  } else {
    const points = data.map((point): [number, number] => [
      data.length === 1 ? VIEW_W / 2 : ((point.time.getTime() - first) / span) * VIEW_W,
      scale.y(point.value),
    ]);
    const line = linePath(points);
    const area = `${line} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`;
    shapes = (
      <>
        <path className="utility-chart__area" d={area} />
        <path className="utility-chart__line" d={line} />
      </>
    );
  }

  return (
    <div className="utility-plot utility-plot--fixed" role="img" aria-label={label}>
      <div className="utility-plot__y" aria-hidden="true">
        <Caption>{formatValue(scale.max)}</Caption>
        <Caption>{formatValue((scale.max + scale.min) / 2)}</Caption>
        <Caption>{formatValue(scale.min)}</Caption>
      </div>
      <div className="utility-plot__area">
        <svg
          className="utility-chart"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {[0.5].map((ratio) => (
            <line
              key={ratio}
              className="utility-chart__grid"
              x1={0}
              x2={VIEW_W}
              y1={VIEW_H * ratio}
              y2={VIEW_H * ratio}
            />
          ))}
          {scale.min < 0 && scale.max > 0 && (
            <line className="utility-chart__zero" x1={0} x2={VIEW_W} y1={zeroY} y2={zeroY} />
          )}
          {shapes}
        </svg>
      </div>
      <div className="utility-plot__x" aria-hidden="true">
        {ticks.map((point, index) => (
          <Caption key={`${point.time.getTime()}-${index}`}>{formatTime(point.time)}</Caption>
        ))}
      </div>
    </div>
  );
}

/**
 * Price slots (Nordpool): one bar per hour or quarter, the current slot in orange. As a
 * sparkline it is decorative; in the details it is a keyboard-operable explorer.
 */
export function PriceBars({
  data,
  currentIndex,
  variant = 'bar',
  selectedIndex = null,
}: {
  data: PricePoint[];
  currentIndex: number;
  variant?: 'bar' | 'line';
  selectedIndex?: number | null;
}) {
  if (data.length === 0) return null;
  const values = data.map((point) => point.value);
  const scale = scaleOf(
    values,
    values.some((value) => value < 0),
    4
  );
  const slot = VIEW_W / data.length;

  if (variant === 'line') {
    const points = data.map((point, index): [number, number] => [
      index * slot + slot / 2,
      scale.y(point.value),
    ]);
    const line = linePath(points);
    const current = points[currentIndex];
    const selected = selectedIndex !== null ? points[selectedIndex] : undefined;
    return (
      <svg
        className="utility-chart"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path className="utility-chart__area" d={`${line} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`} />
        <path className="utility-chart__line" d={line} />
        {current && (
          <line
            className="utility-chart__grid"
            x1={current[0]}
            x2={current[0]}
            y1={0}
            y2={VIEW_H}
          />
        )}
        {selected && (
          <line
            className="utility-chart__marker"
            x1={selected[0]}
            x2={selected[0]}
            y1={0}
            y2={VIEW_H}
          />
        )}
      </svg>
    );
  }

  const width = Math.max(1, slot * (data.length > 48 ? 0.8 : 0.66));
  const zeroY = scale.y(Math.max(0, scale.min));
  return (
    <svg
      className="utility-chart"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {data.map((point, index) => {
        const y = scale.y(point.value);
        const className = [
          'utility-chart__bar',
          index === selectedIndex
            ? 'utility-chart__bar--selected'
            : index === currentIndex && 'utility-chart__bar--current',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <rect
            key={`${point.start.getTime()}-${index}`}
            className={className}
            x={index * slot + (slot - width) / 2}
            y={Math.min(y, zeroY)}
            width={width}
            height={Math.max(1, Math.abs(zeroY - y))}
            rx={Math.min(2, width / 2)}
          />
        );
      })}
    </svg>
  );
}

/**
 * Interactive price explorer of the details: pointer or arrow keys move the selection,
 * the selected slot is announced as text (WCAG 2.5.7: no dragging needed).
 */
export function PriceExplorer({
  data,
  currentIndex,
  variant,
  describe,
  formatValue,
}: {
  data: PricePoint[];
  currentIndex: number;
  variant: 'bar' | 'line';
  /** Text of a slot, e.g. «Oggi 14:00–15:00: 0,23 €». */
  describe: (point: PricePoint, index: number) => string;
  formatValue: (value: number) => string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [selected, setSelected] = useState<number | null>(null);
  if (data.length === 0) return null;
  const active = selected ?? (currentIndex >= 0 ? currentIndex : 0);
  const point = data[Math.min(active, data.length - 1)];
  const values = data.map((item) => item.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const ticks = axisTicks(data);

  const move = (index: number) => setSelected(Math.max(0, Math.min(data.length - 1, index)));
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, PageDown: 4, PageUp: -4 }[event.key];
    if (step !== undefined) {
      event.preventDefault();
      move(active + step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      move(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      move(data.length - 1);
    }
  };
  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    move(Math.floor(((event.clientX - box.left) / box.width) * data.length));
  };

  return (
    <div className="utility-stack">
      <Body size="sm" tone="ink" id={`prezzo-${id}`} aria-live="polite">
        {point ? describe(point, active) : ''}
      </Body>
      <div className="utility-plot utility-plot--fixed">
        <div className="utility-plot__y" aria-hidden="true">
          <Caption>{formatValue(max)}</Caption>
          <Caption>{formatValue((max + min) / 2)}</Caption>
          <Caption>{formatValue(min)}</Caption>
        </div>
        <div
          className="utility-plot__area"
          role="slider"
          tabIndex={0}
          data-no-long-press
          aria-label="Fascia oraria"
          aria-valuemin={0}
          aria-valuemax={data.length - 1}
          aria-valuenow={active}
          aria-valuetext={point ? describe(point, active) : undefined}
          aria-describedby={`prezzo-${id}`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointer}
          onPointerMove={(event) => {
            if (event.buttons > 0 || event.pointerType === 'mouse') onPointer(event);
          }}
        >
          <PriceBars
            data={data}
            currentIndex={currentIndex}
            variant={variant}
            selectedIndex={selected}
          />
        </div>
        <div className="utility-plot__x" aria-hidden="true">
          {ticks.map((tick, index) => (
            <Caption key={`${tick.start.getTime()}-${index}`}>
              {tick.start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </Caption>
          ))}
        </div>
      </div>
    </div>
  );
}
