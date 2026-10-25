import { useId, useState } from 'react';
import { Body, Caption, Toggle } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { entityOf } from '../shared/entity';
import { formatClock, formatNumber } from '../shared/format';
import { PriceExplorer, type PricePoint } from '../shared/charts';
import { DetailsBody, Section, StatList } from '../shared/details';
import { Notice } from '../shared/UtilityCard';
import { useQuarterHour } from './NordpoolWidget';
import {
  PRICE_LEVEL_LABEL,
  priceLevel,
  priceSeries,
  priceUnit,
  readNordpoolSettings,
  withSupport,
} from './nordpoolData';

function dayLabel(date: Date, now: Date): string {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Oggi';
  if (diff === 1) return 'Domani';
  return date.toLocaleDateString('it-IT', { weekday: 'long' });
}

/** Prices of today (and tomorrow when published), explorable slot by slot. */
export function NordpoolDetails({ settingsKey, settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const now = useQuarterHour();
  const config = readNordpoolSettings(settings);
  const [support, setSupport] = useState(config.showWithSupport);
  const supportLabelId = `sostegno-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const entity = entityOf(runtime.entities, config.nordpoolId);

  if (!config.nordpoolId || !entity) {
    return (
      <DetailsBody>
        <Notice icon="warning">
          {config.nordpoolId
            ? `Il sensore dei prezzi ${config.nordpoolId} non è stato trovato.`
            : 'Nessun sensore dei prezzi configurato.'}
        </Notice>
      </DetailsBody>
    );
  }

  const series = priceSeries(entity, now);
  const unit = priceUnit(config, runtime.haConfig) ?? undefined;
  const adjust = (value: number) => (support ? withSupport(value) : value);
  const points: PricePoint[] = series.points.map((point) => ({
    ...point,
    value: adjust(point.value),
  }));
  const stats = series.stats
    ? {
        min: adjust(series.stats.min),
        max: adjust(series.stats.max),
        avg: adjust(series.stats.avg),
      }
    : null;
  const current = series.current === null ? null : adjust(series.current);
  const fmt = (value: number) => formatNumber(value, config.decimals);
  const level = priceLevel(current, stats?.avg);

  const toggleSupport = () => {
    const next = !support;
    setSupport(next);
    runtime.saveCardSetting(settingsKey, 'showWithSupport', next);
  };

  return (
    <DetailsBody>
      <Section title="Adesso" icon="energy">
        <StatList
          items={[
            {
              key: 'current',
              label: 'Prezzo attuale',
              value: formatNumber(current, config.decimals),
              unit,
              note:
                current !== null && stats ? <Caption>{PRICE_LEVEL_LABEL[level]}</Caption> : null,
            },
            ...(stats
              ? [
                  { key: 'avg', label: 'Media', value: fmt(stats.avg), unit },
                  { key: 'min', label: 'Minimo', value: fmt(stats.min), unit },
                  { key: 'max', label: 'Massimo', value: fmt(stats.max), unit },
                ]
              : []),
          ]}
        />
      </Section>
      <Section title="Andamento dei prezzi" icon="chart">
        {points.length > 0 ? (
          <>
            <PriceExplorer
              data={points}
              currentIndex={series.currentIndex}
              variant={config.graphStyle}
              formatValue={fmt}
              describe={(point, index) =>
                `${dayLabel(point.start, now)} ${formatClock(point.start)}–${formatClock(point.end)}: ${fmt(point.value)}${unit ? ` ${unit}` : ''}${
                  index === series.currentIndex ? ' (adesso)' : ''
                }`
              }
            />
            <Caption>
              Usa le frecce o tocca il grafico per leggere il prezzo di ogni fascia.
            </Caption>
          </>
        ) : (
          <Body size="sm" tone="muted">
            Il sensore non fornisce ancora i prezzi della giornata.
          </Body>
        )}
      </Section>
      <Section title="Calcolo" icon="wallet">
        <div className="utility-split">
          <div className="utility-stack">
            <Body as="span" size="sm" tone="ink" id={supportLabelId}>
              Con sostegno statale
            </Body>
            <Caption>Calcolo norvegese: 90% della quota oltre 75 øre/kWh, IVA inclusa.</Caption>
          </div>
          <Toggle
            checked={support}
            compact
            aria-labelledby={supportLabelId}
            onClick={toggleSupport}
          />
        </div>
      </Section>
    </DetailsBody>
  );
}
