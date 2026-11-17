import { useEffect, useState } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { entityOf } from '../shared/entity';
import { CardMessage, CardSkeleton, IconWell, UtilityCard } from '../shared/UtilityCard';
import {
  energyPreferences,
  energyReading,
  parseEnergyPriceSlots,
  validatableEnergySourceIds,
} from './energyModel';
import './energy.css';

export const NORDPOOL_DEFAULT_NAME = 'Prezzo dell’energia';

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

export function NordpoolWidget({
  openDetails,
  ...props
}: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    now = useQuarterHour(),
    { id, settings, size, editMode } = props;
  const ids = validatableEnergySourceIds(settings),
    entity = entityOf(runtime.entities, ids.nordpoolId);
  const reading = energyReading(entity, 'price', energyPreferences(settings));
  const published = parseEnergyPriceSlots(entity, now, runtime.haConfig?.time_zone);
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    (entity ? reading.label : NORDPOOL_DEFAULT_NAME);
  return (
    <article className="energy-widget" data-widget-type="nordpool">
      <UtilityCard
        openLabel={`${name}, apri prezzi e cronologia`}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
        editMode={editMode}
        className={`energy-widget__card${size.h <= 1 ? ' energy-widget--compact' : ''}`}
      >
        {!runtime.entitiesLoaded ? (
          <CardSkeleton label={`Caricamento di ${name}…`} />
        ) : !ids.nordpoolId ? (
          <CardMessage
            icon="energy"
            title={
              settings.nordpoolId != null && settings.nordpoolId !== ''
                ? 'Fonte incompatibile'
                : 'Scegli il sensore dei prezzi'
            }
            detail="Dalle impostazioni del widget"
          />
        ) : (
          <>
            <div className="utility-head">
              <IconWell icon="energy" small />
              <Body as="span" size="sm" className="energy-widget__name ctl-clamp-2" title={name}>
                {name}
              </Body>
            </div>
            <dl className="energy-widget__readings">
              <div>
                <dt>
                  <Caption>Adesso</Caption>
                </dt>
                <dd>
                  <Body size="sm" className="ctl-clamp-2">
                    {reading.valueText}
                    {reading.available && reading.unit && ` ${reading.unit}`}
                  </Body>
                </dd>
              </div>
            </dl>
            {size.h > 1 && (
              <Caption className="energy-widget__summary ctl-clamp-2">
                {published.slots.length
                  ? `${published.slots.length} fasce pubblicate`
                  : 'Fasce non fornite dalla fonte'}
              </Caption>
            )}
          </>
        )}
      </UtilityCard>
    </article>
  );
}
