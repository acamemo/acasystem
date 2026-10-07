import type { ReactNode } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import type { MaybeEntity } from '../shared/entity';
import { entityOf, numericState, safeState } from '../shared/entity';
import { formatNumber } from '../shared/format';
import { currencyUnit } from '../shared/units';
import { Amount } from '../shared/Amount';
import { CardMessage, CardSkeleton, IconWell, UtilityCard } from '../shared/UtilityCard';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { readCostSettings } from './costData';

export const COST_DEFAULT_NAME = 'Costi energetici';

/** Legacy getEntityValue: fixed decimals for numbers, the raw state otherwise, «--» if unavailable. */
export function costValue(entity: MaybeEntity, decimals: number): string {
  const value = numericState(entity);
  if (value !== null) return formatNumber(value, decimals);
  return safeState(entity) ?? '--';
}

/** Legacy formatMonthValue: the month total is rounded to whole units. */
export function monthValue(entity: MaybeEntity): string {
  const value = numericState(entity);
  if (value !== null) return formatNumber(Math.round(value), 0);
  return safeState(entity) ?? '--';
}

/** Energy cost of today and of the month (`cost_card_*`). */
export function CostWidget({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const config = readCostSettings(settings);
  const name = runtime.customNames[id] || COST_DEFAULT_NAME;
  const currency = currencyUnit(config.currency, runtime.haConfig);
  const row = size.h <= 1;
  const card = (children: ReactNode) => (
    <UtilityCard
      openLabel={`${name}, apri lo storico dei costi`}
      onOpen={() => runtime.openDetails(id)}
      editMode={editMode}
      row={row}
    >
      {children}
    </UtilityCard>
  );

  if (!runtime.entitiesLoaded) return card(<CardSkeleton label={`Caricamento di ${name}…`} />);

  if (!config.todayId && !config.monthId) {
    return card(
      <CardMessage icon="wallet" title="Scegli le entità dei costi" detail="Dalle impostazioni del widget" />
    );
  }

  const today = entityOf(runtime.entities, config.todayId);
  const month = entityOf(runtime.entities, config.monthId);
  if (!today && !month) {
    return card(
      <CardMessage
        icon="warning"
        title="Entità dei costi non trovate"
        detail={[config.todayId, config.monthId].filter(Boolean).join(', ')}
      />
    );
  }

  const todayText = costValue(today, config.decimals);
  const monthText = monthValue(month);
  const unavailable = todayText === '--' && monthText === '--';

  if (row) {
    return card(
      <>
        <IconWell icon="wallet" className="utility-hide-narrow" />
        <div className="utility-stack utility-grow">
          <Caption className="utility-truncate">{name}</Caption>
          <span className="utility-inline">
            <Amount value={todayText} unit={todayText === '--' ? null : currency} size="md" />
            <Caption>{config.todayLabel.toLocaleLowerCase('it-IT')}</Caption>
          </span>
        </div>
        {config.monthId && size.w >= 3 && (
          <div className="utility-stack utility-hide-narrow">
            <Caption>{config.monthLabel}</Caption>
            <Amount value={monthText} unit={monthText === '--' ? null : currency} size="sm" />
          </div>
        )}
      </>
    );
  }

  const wide = size.w >= 4;
  return card(
    <>
      <div className="utility-head">
        <IconWell icon="wallet" />
        <div className="utility-head__text">
          <Body as="span" size="sm" tone="ink" className="utility-truncate">
            {name}
          </Body>
          {unavailable && <Caption>Non disponibile</Caption>}
        </div>
      </div>
      <div className={wide ? 'utility-split utility-bottom' : 'utility-stack utility-bottom'}>
        {config.todayId && (
          <div className="utility-stack">
            <Caption>{config.todayLabel}</Caption>
            <Amount value={todayText} unit={todayText === '--' ? null : currency} />
          </div>
        )}
        {config.monthId && (
          <div className="utility-stack utility-hide-short">
            <Caption>{config.monthLabel}</Caption>
            <Amount
              value={monthText}
              unit={monthText === '--' ? null : currency}
              size={config.todayId ? 'sm' : 'lg'}
            />
          </div>
        )}
      </div>
    </>
  );
}
