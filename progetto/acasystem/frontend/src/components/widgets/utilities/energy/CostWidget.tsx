import { Body, Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import type { MaybeEntity } from '../shared/entity';
import { entityOf, numericState, safeState } from '../shared/entity';
import { formatNumber } from '../shared/format';
import { CardMessage, CardSkeleton, IconWell, UtilityCard } from '../shared/UtilityCard';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { readCostSettings } from './costData';
import { energyPreferences, energyReading, validatableEnergySourceIds } from './energyModel';
import './energy.css';

export const COST_DEFAULT_NAME = 'Energia e consumi';

/** Compatibility helpers for the historical data model; not used by the new interface. */
export function costValue(entity: MaybeEntity, decimals: number): string {
  const value = numericState(entity);
  return value !== null ? formatNumber(value, decimals) : (safeState(entity) ?? '--');
}
export function monthValue(entity: MaybeEntity): string {
  const value = numericState(entity);
  return value !== null ? formatNumber(Math.round(value), 0) : (safeState(entity) ?? '--');
}

export function CostWidget({ openDetails, ...props }: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    { id, settings, size, editMode } = props;
  const config = readCostSettings(settings),
    ids = validatableEnergySourceIds(settings),
    preferences = energyPreferences(settings);
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    COST_DEFAULT_NAME;
  const sources = (
    [
      ['powerId', 'power', 'Potenza'],
      ['consumptionId', 'energy', 'Energia'],
      ['todayId', 'cost', config.todayLabel],
      ['monthId', 'cost', config.monthLabel],
    ] as const
  ).flatMap(([key, kind, label]) =>
    settings[key] != null && settings[key] !== ''
      ? [
          {
            key,
            label,
            reading: energyReading(entityOf(runtime.entities, ids[key]), kind, preferences),
          },
        ]
      : []
  );
  const visible = sources.slice(0, size.h <= 1 ? 1 : 2),
    remainder = sources
      .slice(visible.length)
      .map((source) => source.label)
      .join(' · ');
  return (
    <article className="energy-widget" data-widget-type="cost">
      <UtilityCard
        openLabel={`${name}, apri letture e cronologia`}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
        editMode={editMode}
        className={`energy-widget__card${size.h <= 1 ? ' energy-widget--compact' : ''}`}
      >
        {!runtime.entitiesLoaded ? (
          <CardSkeleton label={`Caricamento di ${name}…`} />
        ) : sources.length === 0 ? (
          <CardMessage
            icon="energy"
            title="Scegli le fonti energetiche"
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
              {visible.map((source) => (
                <div key={source.key}>
                  <dt>
                    <Caption className="ctl-clamp-1" title={source.label}>
                      {source.label}
                    </Caption>
                  </dt>
                  <dd>
                    <Body size="sm" className="ctl-clamp-2">
                      {ids[source.key] ? source.reading.valueText : 'Fonte incompatibile'}
                      {source.reading.available && source.reading.unit && ` ${source.reading.unit}`}
                    </Body>
                  </dd>
                </div>
              ))}
            </dl>
            {remainder && (
              <Caption className="energy-widget__summary ctl-clamp-1" title={remainder}>
                {remainder}
              </Caption>
            )}
          </>
        )}
      </UtilityCard>
    </article>
  );
}
