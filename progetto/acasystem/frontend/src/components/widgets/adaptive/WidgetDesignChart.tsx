import { type CSSProperties } from 'react';
import { Caption } from '@/components/primitives';
import { useEntityHistory } from '@/components/widgets/controls/shared/useEntityHistory';
import { downsampleTimeSeries, type TimePoint } from '@/utils/sensorHistory';
import { controlColour } from './GestureControl';
import { useOperationalHistory } from './useOperationalHistory';
import type { HistorySource } from './operationalProfile';
import {
  type Capability,
  type SampleStatus,
  type SampleValues,
  type Task,
} from './widgetDesignModel';

type ChartSpec = {
  label: string;
  key: string;
  kind: 'curve' | 'bars' | 'ring' | 'steps';
  unit?: string;
};

const charts: Partial<Record<string, ChartSpec>> = {
  light: { label: 'Luminosità', key: 'brightness', kind: 'curve', unit: '%' },
  climate: { label: 'Temperatura desiderata', key: 'target', kind: 'curve', unit: '°C' },
  fan: { label: 'Velocità', key: 'speed', kind: 'bars', unit: '%' },
  cover: { label: 'Apertura', key: 'position', kind: 'ring', unit: '%' },
  lock: { label: 'Stato serratura', key: 'locked', kind: 'steps' },
  alarm: { label: 'Stato allarme', key: 'state', kind: 'steps' },
  camera: { label: 'Rilevamento movimento', key: 'motion', kind: 'steps' },
  media: { label: 'Volume', key: 'volume', kind: 'bars', unit: '%' },
  sonos: { label: 'Volume', key: 'volume', kind: 'bars', unit: '%' },
  androidtv: { label: 'Volume', key: 'volume', kind: 'bars', unit: '%' },
  appletv: { label: 'Volume', key: 'volume', kind: 'bars', unit: '%' },
  vacuum: { label: 'Batteria', key: 'battery', kind: 'ring', unit: '%' },
  mower: { label: 'Batteria', key: 'battery', kind: 'ring', unit: '%' },
  car: { label: 'Batteria', key: 'battery', kind: 'ring', unit: '%' },
  room: { label: 'Temperatura ambiente', key: 'temperature', kind: 'curve', unit: '°C' },
  sensor: { label: 'Temperatura', key: 'temperature', kind: 'curve', unit: '°C' },
  todo: { label: 'Attività completate', key: 'tasks', kind: 'ring' },
  cost: { label: 'Costi energetici', key: 'today', kind: 'bars', unit: '€' },
  nordpool: { label: 'Prezzo energia', key: 'price', kind: 'curve', unit: '€/kWh' },
  spacer: { label: 'Spaziatura', key: 'spacing', kind: 'bars', unit: 'px' },
};

export interface WidgetDesignChartProps {
  type: string;
  capabilities: readonly Capability[];
  values: SampleValues;
  status: SampleStatus;
  historyPoints?: readonly TimePoint[];
  entityId?: string;
  loading?: boolean;
  operational?: boolean;
  historySource?: HistorySource;
  enabled?: boolean;
  hours?: number;
  seriesLabel?: string;
}

export function WidgetDesignChart({
  type,
  capabilities,
  values,
  status,
  historyPoints: externalHistoryPoints,
  entityId,
  loading: externalLoading,
  operational = false,
  historySource,
  enabled = true,
  hours = 24,
  seriesLabel,
}: WidgetDesignChartProps) {
  const autoHistory = useEntityHistory(entityId, 24, {
    enabled: Boolean(!operational && enabled && entityId && !externalHistoryPoints),
  });
  const realHistory = useOperationalHistory(
    historySource,
    operational && enabled && !externalHistoryPoints,
    hours
  );
  const historyPoints =
    externalHistoryPoints ??
    (operational ? realHistory.points : entityId ? autoHistory.points : undefined);
  const loading =
    externalLoading ?? (operational ? realHistory.loading : entityId ? autoHistory.loading : false);

  const requested = charts[type] ?? { label: 'Valore', key: 'reading', kind: 'curve' as const };
  const available = capabilities.find((cap) => cap.id === requested.key);
  const fallback = capabilities.find(
    (cap) => cap.kind === 'range' || cap.kind === 'reading' || cap.kind === 'toggle'
  ) ??
    capabilities[0] ?? {
      id: 'missing',
      label: 'Nessun dato disponibile',
      kind: 'reading' as const,
      initial: '',
      unit: '',
      icon: 'activity' as const,
      frequent: false,
    };
  const resolvedSpec = available
    ? requested
    : {
        label: fallback.label,
        key: fallback.id,
        kind: fallback.kind === 'toggle' ? ('steps' as const) : ('curve' as const),
        unit: 'unit' in fallback ? fallback.unit : '',
      };
  const cap = available ?? fallback;
  const spec = operational
    ? {
        ...resolvedSpec,
        unit: 'unit' in cap ? cap.unit : resolvedSpec.unit,
        kind:
          historySource && resolvedSpec.kind === 'ring' ? ('curve' as const) : resolvedSpec.kind,
      }
    : resolvedSpec;
  const raw = values[spec.key];
  const tasks = Array.isArray(raw) ? (raw as readonly Task[]) : [];
  const number = Number(String(raw).replace(',', '.'));
  const min = cap.kind === 'range' ? cap.min : 0;
  const max = cap.kind === 'range' ? cap.max : spec.unit === '%' ? 100 : Math.max(1, number * 1.3);
  const ratio =
    spec.key === 'tasks'
      ? tasks.length
        ? tasks.filter((task) => task.done).length / tasks.length
        : 0
      : Number.isFinite(number)
        ? Math.max(0, Math.min(1, (number - min) / (max - min)))
        : raw
          ? 1
          : 0;
  const reading =
    spec.key === 'tasks'
      ? `${tasks.filter((task) => task.done).length}/${tasks.length}`
      : typeof raw === 'boolean'
        ? raw
          ? 'Attivo'
          : 'Inattivo'
        : String(raw ?? '—');
  const hue = capabilities.find(
    (candidate) => candidate.id === 'hue' && candidate.kind === 'range'
  );
  const colour =
    type === 'light' && hue?.kind === 'range'
      ? controlColour(hue, Number(values.hue), Number(values.saturation))
      : 'var(--k2-accent)';

  const hasRealHistory = Boolean(historyPoints && historyPoints.length >= 2);

  // Compute scale and points based on real telemetry or simulated samples
  const numericValues = hasRealHistory ? historyPoints!.map((p) => p.value) : [];
  const dataMin = hasRealHistory ? Math.min(...numericValues) : 0;
  const dataMax = hasRealHistory ? Math.max(...numericValues) : 1;
  const isRange = cap.kind === 'range';
  const isFlat = dataMax === dataMin;
  const chartSpan = isRange
    ? cap.max - cap.min || 1
    : isFlat
      ? Math.max(1, Math.abs(dataMax) * 0.2)
      : spec.unit === '%'
        ? 100
        : dataMax - dataMin || 1;
  const effectiveMin = isRange
    ? cap.min
    : isFlat
      ? dataMin - chartSpan / 2
      : spec.unit === '%'
        ? 0
        : dataMin;

  // 1. Curve geometry
  const sampledCurve = hasRealHistory
    ? (downsampleTimeSeries(historyPoints as TimePoint[], 32) ?? [])
    : [];
  const t0 = sampledCurve[0]?.time.getTime() ?? 0;
  const t1 = sampledCurve[sampledCurve.length - 1]?.time.getTime() ?? t0;
  const dt = t1 - t0 || 1;

  const mockSamples = [0.36, 0.5, 0.42, 0.67, 0.56, 0.73, 0.62, ratio];
  const curvePoints = hasRealHistory
    ? sampledCurve.map((p) => {
        const x = Math.max(16, Math.min(284, 16 + ((p.time.getTime() - t0) / dt) * 268));
        const normalized = Math.max(0, Math.min(1, (p.value - effectiveMin) / chartSpan));
        const y = Math.max(24, Math.min(116, 116 - normalized * 92));
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
    : mockSamples.map((value, index) => `${16 + index * 38.3},${116 - value * 92}`);

  const linePath = `M${curvePoints.join(' L')}`;
  const areaPath = `M${curvePoints.join(' L')} L284 116 L16 116 Z`;
  const lastCurvePoint = curvePoints[curvePoints.length - 1]?.split(',') ?? ['284', '116'];
  const dotX = lastCurvePoint[0];
  const dotY = lastCurvePoint[1];

  // 2. Bars geometry
  const barBuckets = hasRealHistory
    ? (downsampleTimeSeries(historyPoints as TimePoint[], 8) ?? [])
    : [];
  const barSamples = new Array<number>(8).fill(0);
  if (hasRealHistory) {
    const bucketOffset = 8 - barBuckets.length;
    for (let i = 0; i < barBuckets.length; i++) {
      const b = barBuckets[i];
      const val = Math.max(0, Math.min(1, (b.value - effectiveMin) / chartSpan));
      barSamples[bucketOffset + i] = val;
    }
    // Always align the current live reading at the final active bar
    if (!operational && (ratio > 0 || barBuckets.length === 0)) {
      barSamples[7] = ratio;
    }
  } else {
    for (let i = 0; i < 8; i++) barSamples[i] = mockSamples[i];
  }

  // 3. Step geometry
  let stepPath = '';
  if (hasRealHistory) {
    const stepSamples = downsampleTimeSeries(historyPoints as TimePoint[], 16) ?? [];
    if (stepSamples.length > 0) {
      const st0 = stepSamples[0].time.getTime();
      const st1 = stepSamples[stepSamples.length - 1].time.getTime();
      const sdt = st1 - st0 || 1;
      stepPath =
        stepSamples
          .map((p, idx) => {
            const x = Math.max(16, Math.min(284, 16 + ((p.time.getTime() - st0) / sdt) * 268));
            const val = Math.max(0, Math.min(1, (p.value - effectiveMin) / chartSpan));
            const y = Math.max(24, Math.min(116, 116 - val * 92));
            return idx === 0 ? `M16 ${y.toFixed(1)}` : `H${x.toFixed(1)} V${y.toFixed(1)}`;
          })
          .join(' ') + ' H284';
    }
  }
  if (!stepPath) {
    stepPath = `M16 100 H55 V55 H95 V100 H135 V55 H175 V100 H215 V55 H255 V${ratio ? 24 : 100} H284`;
  }

  // Text descriptions
  const duration = `ultime ${hours} ore`;
  const description = hasRealHistory
    ? `${spec.label}: ${reading} ${spec.unit ?? ''}. Cronologia delle ${duration}.`
    : `${spec.label}: ${reading} ${spec.unit ?? ''}. Visualizzazione simulata.`;

  const captionText = loading
    ? 'Aggiornamento in corso...'
    : hasRealHistory
      ? spec.kind === 'ring'
        ? operational
          ? `${reading} ${spec.unit ?? ''} · valore attuale; cronologia disponibile`
          : 'Livello attuale'
        : `${reading} ${spec.unit ?? ''} · ultime 24 ore`
      : spec.kind === 'ring'
        ? 'Simulazione'
        : `${reading} ${spec.unit ?? ''} · serie simulata`;

  if (operational && !hasRealHistory)
    return (
      <figure className="uikwa-chart" data-chart-kind={spec.kind} data-chart-value={reading}>
        <Caption>{spec.label}</Caption>
        <Caption tone="muted" role="status">
          {loading
            ? 'Caricamento della cronologia…'
            : realHistory.error
              ? 'Cronologia non disponibile'
              : 'Nessuna cronologia disponibile'}
        </Caption>
        <Caption>
          {reading} {spec.unit ?? ''} · valore attuale
        </Caption>
      </figure>
    );

  return (
    <figure
      className="uikwa-chart"
      data-chart-kind={spec.kind}
      data-chart-value={reading}
      style={{ '--uikwa-chart-colour': colour } as CSSProperties}
    >
      <svg
        viewBox="0 0 300 140"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          seriesLabel
            ? `${spec.label}: ${reading} ${spec.unit ?? ''}. ${seriesLabel}.`
            : description
        }
        aria-busy={loading ? 'true' : undefined}
        className={status === 'available' ? '' : 'uikwa-chart--unavailable'}
      >
        {spec.kind === 'ring' ? (
          <>
            <circle
              className="uikwa-chart__track"
              cx="150"
              cy="70"
              r="52"
              fill="none"
              strokeWidth="9"
            />
            <circle
              cx="150"
              cy="70"
              r="52"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray={`${ratio * 100} 100`}
              transform="rotate(-90 150 70)"
            />
            <text className="uikwa-chart__value" x="150" y="77" textAnchor="middle">
              {reading}
              {spec.unit}
            </text>
          </>
        ) : (
          <>
            {[24, 70, 116].map((y) => (
              <path className="uikwa-chart__grid" key={y} d={`M16 ${y} H284`} />
            ))}
            {spec.kind === 'bars' ? (
              barSamples.map((value, index) => (
                <rect
                  key={index}
                  x={20 + index * 34}
                  y={116 - value * 92}
                  width="18"
                  height={value * 92}
                  rx="6"
                  opacity={index === 7 ? 1 : 0.3 + index * 0.07}
                />
              ))
            ) : (
              <>
                <path className="uikwa-chart__area" d={areaPath} />
                <path
                  fill="none"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  d={spec.kind === 'steps' ? stepPath : linePath}
                />
                <circle
                  cx={spec.kind === 'steps' ? 284 : dotX}
                  cy={spec.kind === 'steps' ? (ratio ? 24 : 100) : dotY}
                  r="5"
                />
              </>
            )}
          </>
        )}
      </svg>
      <figcaption>
        <Caption>{spec.label}</Caption>
        <Caption tone="muted">
          {seriesLabel ? `${reading} ${spec.unit ?? ''} · ${seriesLabel}` : captionText}
        </Caption>
      </figcaption>
    </figure>
  );
}
