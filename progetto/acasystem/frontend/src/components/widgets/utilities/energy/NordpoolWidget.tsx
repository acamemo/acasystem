import { useEffect, useState, type ReactNode } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { entityOf, friendlyName, isUnavailableState } from '../shared/entity';
import { formatNumber } from '../shared/format';
import { Amount } from '../shared/Amount';
import { PriceBars } from '../shared/charts';
import { CardMessage, CardSkeleton, Chip, IconWell, UtilityCard } from '../shared/UtilityCard';
import type { UtilityIconName } from '../shared/UtilityIcon';
import {
  PRICE_LEVEL_LABEL,
  priceLevel,
  priceSeries,
  priceUnit,
  readNordpoolSettings,
  type PriceLevel,
} from './nordpoolData';

export const NORDPOOL_DEFAULT_NAME = 'Prezzo dell’energia';

const levelIcon: Record<PriceLevel, UtilityIconName | undefined> = {
  low: 'trendDown',
  normal: undefined,
  high: 'trendUp',
  veryHigh: 'trendUp',
};

/** Re-renders at every quarter hour so the current slot follows the clock. */
export function useQuarterHour(): Date {
  const visible = usePageVisible();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!visible) return undefined;
    setNow(new Date());
    const msToNext = 15 * 60_000 - (Date.now() % (15 * 60_000)) + 500;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 15 * 60_000);
    }, msToNext);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [visible]);
  return now;
}

/** Current energy price with its level and the day's price curve (`nordpool_card_*`). */
export function NordpoolWidget({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const now = useQuarterHour();
  const config = readNordpoolSettings(settings);
  const entity = entityOf(runtime.entities, config.nordpoolId);
  const name = runtime.customNames[id] || friendlyName(entity, NORDPOOL_DEFAULT_NAME);
  const row = size.h <= 1;
  const card = (children: ReactNode) => (
    <UtilityCard
      openLabel={`${name}, apri i prezzi della giornata`}
      onOpen={() => runtime.openDetails(id)}
      editMode={editMode}
      row={row}
    >
      {children}
    </UtilityCard>
  );

  if (!runtime.entitiesLoaded) return card(<CardSkeleton label={`Caricamento di ${name}…`} />);
  if (!config.nordpoolId) {
    return card(<CardMessage icon="energy" title="Scegli il sensore dei prezzi" detail="Dalle impostazioni del widget" />);
  }
  if (!entity) {
    return card(<CardMessage icon="warning" title="Sensore dei prezzi non trovato" detail={config.nordpoolId} />);
  }

  const series = priceSeries(entity, now);
  const unit = priceUnit(config, runtime.haConfig);
  const unavailable = isUnavailableState(entity.state) && series.current === null;
  const level = priceLevel(series.current, series.stats?.avg);
  const priceText = formatNumber(series.current, config.decimals);
  const levelChip = !unavailable && series.stats && (
    <Chip icon={levelIcon[level]} tone={level === 'high' || level === 'veryHigh' ? 'active' : 'neutral'}>
      {PRICE_LEVEL_LABEL[level]}
    </Chip>
  );

  if (row) {
    return card(
      <>
        <IconWell icon="energy" className="utility-hide-narrow" />
        <div className="utility-stack utility-grow">
          <Caption className="utility-truncate">{name}</Caption>
          <Amount value={priceText} unit={unavailable ? null : unit} size="md" />
        </div>
        {size.w >= 3 && <div className="utility-hide-narrow">{levelChip}</div>}
        {size.w < 3 && !unavailable && (
          <span className="sr-only">{PRICE_LEVEL_LABEL[level]}</span>
        )}
      </>
    );
  }

  const fmt = (value: number) => formatNumber(value, config.decimals);
  return card(
    <>
      <div className="utility-head">
        <IconWell icon="energy" />
        <div className="utility-head__text">
          <Body as="span" size="sm" tone="ink" className="utility-truncate">
            {name}
          </Body>
          {unavailable && <Caption>Non disponibile</Caption>}
        </div>
      </div>
      <div className="utility-split">
        <div className="utility-stack">
          <Caption>Adesso</Caption>
          <Amount value={priceText} unit={unavailable ? null : unit} />
        </div>
        <div className="utility-hide-narrow">{levelChip}</div>
      </div>
      {size.w >= 4 && series.stats && (
        <Caption>
          Media {fmt(series.stats.avg)} · minimo {fmt(series.stats.min)} · massimo{' '}
          {fmt(series.stats.max)}
          {unit ? ` ${unit}` : ''}
        </Caption>
      )}
      {series.points.length > 0 && (
        <div className="utility-spark utility-hide-short">
          <PriceBars data={series.points} currentIndex={series.currentIndex} variant={config.graphStyle} />
        </div>
      )}
    </>
  );
}
