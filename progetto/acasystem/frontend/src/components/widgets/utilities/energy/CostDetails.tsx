import { useEffect, useMemo, useState } from 'react';
import { Body, Segmented, Skeleton } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { getHistory, getStatistics } from '@/api/haClient';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { entityOf, numericState } from '../shared/entity';
import { formatAxisTime, formatNumber } from '../shared/format';
import { currencyUnit } from '../shared/units';
import { HistoryChart, type TimePoint } from '../shared/charts';
import { DetailsBody, Section, StatList } from '../shared/details';
import { Notice } from '../shared/UtilityCard';
import { costValue, monthValue } from './CostWidget';
import {
  buildCostSeries,
  costStats,
  historyPoints,
  readCostSettings,
  statisticPoints,
  type CostMetric,
  type CostRange,
  type CostView,
} from './costData';

type Source = 'today' | 'month';

const RANGES: Array<{ value: `${CostRange}`; label: string }> = [
  { value: '24', label: '24 h' },
  { value: '48', label: '48 h' },
  { value: '72', label: '72 h' },
  { value: '168', label: '7 g' },
];

type FetchState =
  | { status: 'idle' | 'loading' | 'offline'; points: TimePoint[] }
  | { status: 'ready'; points: TimePoint[]; start: Date; end: Date }
  | { status: 'error'; points: TimePoint[] };

/** Cost history: source, range, line or bars, value or change per period, and statistics. */
export function CostDetails({ settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const config = readCostSettings(settings);
  const currency = currencyUnit(config.currency, runtime.haConfig) ?? undefined;
  const [preferred, setPreferred] = useState<Source>('today');
  const [range, setRange] = useState<CostRange>(24);
  const [view, setView] = useState<CostView>('line');
  const [metric, setMetric] = useState<CostMetric>('value');
  const [fetched, setFetched] = useState<FetchState>({ status: 'idle', points: [] });

  // A source without an entity falls back to the other one (legacy behaviour).
  const source: Source =
    preferred === 'month' && !config.monthId && config.todayId
      ? 'today'
      : preferred === 'today' && !config.todayId && config.monthId
        ? 'month'
        : preferred;
  const entityId = source === 'month' ? config.monthId : config.todayId;
  const entity = entityOf(runtime.entities, entityId);
  const conn = runtime.conn;
  const liveState = entity?.state;

  useEffect(() => {
    if (!entityId) return undefined;
    if (!conn) {
      setFetched({ status: 'offline', points: [] });
      return undefined;
    }
    let cancelled = false;
    setFetched((previous) => ({ status: 'loading', points: previous.points }));
    const end = new Date();
    const start = new Date(end.getTime() - range * 60 * 60 * 1000);
    (async () => {
      try {
        let points = historyPoints(
          await getHistory(conn, {
            entityId,
            start,
            end,
            minimal_response: true,
            no_attributes: true,
          })
        );
        if (points.length < 2) {
          points = statisticPoints(
            await getStatistics(conn, {
              statisticId: entityId,
              start,
              end,
              period: range > 48 ? 'day' : 'hour',
            })
          );
        }
        if (points.length < 2) {
          const value = Number.parseFloat(String(liveState ?? ''));
          if (Number.isFinite(value)) {
            points = [
              { value, time: start },
              { value, time: end },
            ];
          }
        }
        if (!cancelled) setFetched({ status: 'ready', points, start, end });
      } catch {
        if (!cancelled) setFetched({ status: 'error', points: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conn, entityId, range, liveState]);

  const series = useMemo(() => {
    if (fetched.status !== 'ready') return [];
    return buildCostSeries(fetched.points, {
      rangeHours: range,
      view,
      metric,
      start: fetched.start,
      end: fetched.end,
    });
  }, [fetched, range, view, metric]);
  const stats = costStats(series);
  const money = (value: number) => formatNumber(value, 2);
  const kind = view === 'bars' || metric === 'delta' ? 'bars' : 'line';

  const sources: Array<{ value: Source; label: string }> = [
    ...(config.todayId ? [{ value: 'today' as const, label: config.todayLabel }] : []),
    ...(config.monthId ? [{ value: 'month' as const, label: config.monthLabel }] : []),
  ];

  if (!config.todayId && !config.monthId) {
    return (
      <DetailsBody>
        <Notice icon="warning">
          Nessuna entità dei costi configurata. Sceglile dalle impostazioni del widget.
        </Notice>
      </DetailsBody>
    );
  }

  const today = entityOf(runtime.entities, config.todayId);
  const month = entityOf(runtime.entities, config.monthId);
  const current = numericState(entity);

  return (
    <DetailsBody>
      <Section title="Riepilogo" icon="wallet">
        <StatList
          items={[
            ...(config.todayId
              ? [
                  {
                    key: 'today',
                    label: config.todayLabel,
                    value: costValue(today, config.decimals),
                    unit: currency,
                  },
                ]
              : []),
            ...(config.monthId
              ? [
                  {
                    key: 'month',
                    label: config.monthLabel,
                    value: monthValue(month),
                    unit: currency,
                  },
                ]
              : []),
          ]}
        />
      </Section>
      <Section title="Andamento" icon="chart">
        <div className="utility-toolbar">
          {sources.length > 1 && (
            <Segmented<Source>
              label="Periodo dei costi"
              size="sm"
              options={sources}
              value={source}
              onChange={setPreferred}
            />
          )}
          <Segmented<`${CostRange}`>
            label="Intervallo"
            size="sm"
            options={RANGES}
            value={`${range}` as `${CostRange}`}
            onChange={(value) => setRange(Number(value) as CostRange)}
          />
          <Segmented<CostView>
            label="Grafico"
            size="sm"
            options={[
              { value: 'line', label: 'Linea' },
              { value: 'bars', label: 'Barre' },
            ]}
            value={view}
            onChange={setView}
          />
          <Segmented<CostMetric>
            label="Valori"
            size="sm"
            options={[
              { value: 'value', label: 'Totale' },
              { value: 'delta', label: 'Per periodo' },
            ]}
            value={metric}
            onChange={setMetric}
          />
        </div>
        {fetched.status === 'loading' && series.length === 0 ? (
          <Skeleton
            variant="chart"
            label="Caricamento dello storico dei costi…"
            style={{ height: '12rem' }}
          />
        ) : fetched.status === 'offline' ? (
          <Notice icon="wifi">Storico non disponibile: Home Assistant non è collegato.</Notice>
        ) : fetched.status === 'error' ? (
          <Notice icon="warning" tone="danger">
            Impossibile caricare lo storico. Riprova più tardi.
          </Notice>
        ) : series.length === 0 ? (
          <Body size="sm" tone="muted">
            Nessun dato nel periodo scelto.
          </Body>
        ) : (
          <HistoryChart
            data={series}
            kind={kind}
            label={`Costi ${source === 'month' ? 'del mese' : 'di oggi'}, ultime ${range} ore${
              stats
                ? `: da ${money(stats.min)} a ${money(stats.max)}${currency ? ` ${currency}` : ''}`
                : ''
            }`}
            formatValue={(value) => formatNumber(value, Math.abs(value) >= 100 ? 0 : 2)}
            formatTime={(time) => formatAxisTime(time, range)}
          />
        )}
        {stats && (
          <StatList
            items={[
              { key: 'last', label: 'Ultimo', value: money(stats.last), unit: currency },
              { key: 'min', label: 'Minimo', value: money(stats.min), unit: currency },
              { key: 'max', label: 'Massimo', value: money(stats.max), unit: currency },
              { key: 'avg', label: 'Media', value: money(stats.avg), unit: currency },
            ]}
          />
        )}
        {current === null && entity && (
          <Notice icon="warning">
            Il sensore selezionato non è disponibile in questo momento.
          </Notice>
        )}
      </Section>
    </DetailsBody>
  );
}
