import { useId, useState } from 'react';
import {
  Body,
  Button,
  Caption,
  ConsoleColumns,
  Disclosure,
  DisclosureGroup,
} from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { EnergyHistory } from './EnergyHistory';
import { DetailsBody, Section, StatList } from '../shared/details';
import { entityOf } from '../shared/entity';
import { useQuarterHour } from './NordpoolWidget';
import {
  energyPreferences,
  energyReading,
  parseEnergyPriceSlots,
  validatableEnergySourceIds,
} from './energyModel';
import './energy.css';

export function NordpoolDetails({ settings }: WidgetDetailsProps) {
  const sectionId = useId();
  const runtime = useWidgetRuntime(),
    now = useQuarterHour(),
    ids = validatableEnergySourceIds(settings);
  const entity = entityOf(runtime.entities, ids.nordpoolId),
    preferences = energyPreferences(settings);
  const reading = energyReading(entity, 'price', preferences);
  const published = parseEnergyPriceSlots(entity, now, runtime.haConfig?.time_zone);
  const [page, setPage] = useState({ source: ids.nordpoolId, limit: 30 });
  const limit = page.source === ids.nordpoolId ? page.limit : 30;
  const priceText = (value: number) =>
    new Intl.NumberFormat('it-IT', {
      maximumFractionDigits: preferences.decimals,
      minimumFractionDigits: preferences.decimals,
    }).format(value);
  const zone = runtime.haConfig?.time_zone || 'UTC';
  const timeText = (value: Date) => {
    try {
      return new Intl.DateTimeFormat('it-IT', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'shortOffset',
      }).format(value);
    } catch {
      return value.toISOString();
    }
  };
  return (
    <div className="energy-details">
      <DetailsBody label="Prezzo dell’energia">
        <Section title="Adesso">
          <StatList
            items={[
              {
                key: 'current',
                label: 'Prezzo attuale',
                value: ids.nordpoolId
                  ? reading.valueText
                  : settings.nordpoolId != null && settings.nordpoolId !== ''
                    ? 'Fonte incompatibile'
                    : 'Fonte non configurata',
                unit: reading.available ? (reading.unit ?? undefined) : undefined,
                note: reading.reason ? <Caption>{reading.reason}</Caption> : undefined,
              },
            ]}
          />
        </Section>
        <Section title="Prezzi pubblicati">
          {published.slots.length ? (
            <>
              <Caption>Orari: {zone}</Caption>
              <ol className="energy-price-slots">
                {published.slots.slice(0, limit).map((slot) => (
                  <li key={slot.start.toISOString() + slot.end.toISOString()}>
                    <Caption>
                      <time dateTime={slot.start.toISOString()}>{timeText(slot.start)}</time> –{' '}
                      <time dateTime={slot.end.toISOString()}>{timeText(slot.end)}</time>
                    </Caption>
                    <Body size="sm">
                      {priceText(slot.value)}
                      {published.unit && ` ${published.unit}`}
                    </Body>
                  </li>
                ))}
              </ol>
              {published.slots.length > limit && (
                <Button
                  variant="control"
                  size="sm"
                  onClick={() => setPage({ source: ids.nordpoolId, limit: limit + 30 })}
                >
                  Mostra altre fasce
                </Button>
              )}
            </>
          ) : (
            <Body size="sm">
              {published.reason ||
                'La fonte non fornisce fasce prezzo con intervalli verificabili.'}
            </Body>
          )}
        </Section>
        {entity && reading.status !== 'invalid' ? (
          <EnergyHistory
            key={entity.entity_id}
            entity={entity}
            initialHours={settings.adaptiveHistoryHours}
            kind="price"
            preferences={preferences}
          />
        ) : (
          <Body size="sm">Cronologia non disponibile per la fonte selezionata.</Body>
        )}
        <DisclosureGroup>
          <Disclosure id={sectionId} title="Informazioni sulla fonte">
            <StatList
              items={
                entity
                  ? [
                      {
                        key: 'source',
                        label: 'Fonte',
                        value: reading.label,
                        note: <Caption>{entity.entity_id}</Caption>,
                      },
                    ]
                  : []
              }
            />
            <Caption>Prezzi originali di Home Assistant, nell’unità indicata dalla fonte.</Caption>
            {settings.showWithSupport === true && (
              <Caption>La formula norvegese storica non è applicata.</Caption>
            )}
            {preferences.currency && (
              <Caption>
                La valuta impostata non converte né sostituisce l’unità della fonte.
              </Caption>
            )}
          </Disclosure>
        </DisclosureGroup>
      </DetailsBody>
    </div>
  );
}

export function NordpoolConsole(props: WidgetDetailsProps) {
  return (
    <ConsoleColumns
      main={
        <div className="widget-console-details">
          <NordpoolDetails {...props} />
        </div>
      }
    />
  );
}
