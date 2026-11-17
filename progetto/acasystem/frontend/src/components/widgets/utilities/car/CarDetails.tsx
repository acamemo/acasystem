import { useId, useState } from 'react';
import {
  Body,
  Caption,
  ConsoleColumns,
  Disclosure,
  DisclosureGroup,
  Skeleton,
} from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  CAR_SOURCE_FIELDS,
  carCapabilities,
  carCoordinates,
  carReading,
  carSourceMetadata,
  configuredCarSources,
  type CarSourceField,
} from '@/domain/car/carSources';
import { DetailsBody, OptionPicker, Section, StatList } from '../shared/details';
import { CarAction, CarControlScope, CarLock, CarNumeric, CarSelect } from './CarControls';
import { CarHistory } from './CarHistory';
import './car.css';

const historical = new Set<CarSourceField>([
  'batteryId',
  'rangeId',
  'odometerId',
  'fuelLevelId',
  'chargingPowerId',
  'chargeRateId',
  'timeToFullId',
  'tempId',
  'chargeLimitNumberId',
]);

export function CarDetails({ settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime(),
    config = configuredCarSources(settings),
    sectionId = useId();
  const [selected, setSelected] = useState<string | null>(null),
    [technicalOpen, setTechnicalOpen] = useState<string | null>(null);
  const sources = CAR_SOURCE_FIELDS.flatMap((source) => {
    const id = config.ids[source.key];
    return id
      ? [
          {
            ...source,
            id,
            entity: runtime.entities[id],
            reading: carReading(runtime.entities[id], source.key),
          },
        ]
      : [];
  });
  const histories = sources.filter(
    (source) =>
      historical.has(source.key) && carSourceMetadata(source.entity, source.key).compatible
  );
  const history = histories.find((source) => source.key === selected) ?? histories[0];
  const position = carCoordinates(runtime.entities, settings);
  const items = (section: string) =>
    sources
      .filter((source) => source.section === section)
      .map((source) => ({
        key: source.key,
        label: source.label,
        value: source.reading.valueText,
        unit: source.reading.available ? (source.reading.unit ?? undefined) : undefined,
        note: source.reading.reason ? <Caption>{source.reading.reason}</Caption> : undefined,
      }));
  const control = (field: CarSourceField, id = config.ids[field]) => {
    if (!id || !runtime.entitiesLoaded) return null;
    const entity = runtime.entities[id],
      caps = carCapabilities(
        entity,
        field,
        runtime.services,
        runtime.haConfig?.unit_system?.temperature
      );
    if (!caps.length) return null;
    let child;
    if (field === 'lockId') child = <CarLock entityId={id} />;
    else if (field === 'chargeLimitNumberId')
      child = <CarNumeric entityId={id} field={field} label="Limite di carica" />;
    else if (field === 'chargeLimitSelectId') child = <CarSelect entityId={id} />;
    else if (field === 'climateId')
      child = (
        <>
          {caps
            .filter((action) => action !== 'climate.set_temperature')
            .map((action) => (
              <CarAction
                key={action}
                entityId={id}
                action={action}
                label={action === 'climate.turn_on' ? 'Accendi clima' : 'Spegni clima'}
              />
            ))}
          {caps.includes('climate.set_temperature') && (
            <CarNumeric entityId={id} field={field} label="Temperatura desiderata" />
          )}
        </>
      );
    else
      child = caps.map((action) => (
        <CarAction
          key={action}
          entityId={id}
          action={action}
          sensitive={field === 'ignitionSwitchId'}
          targetName={
            field === 'chargeControlId' && action.startsWith('switch.')
              ? typeof entity?.attributes.friendly_name === 'string' &&
                entity.attributes.friendly_name.trim()
                ? entity.attributes.friendly_name
                : id
              : undefined
          }
          label={
            field === 'updateButtonId'
              ? 'Aggiorna dati'
              : field === 'ignitionSwitchId'
                ? action === 'switch.turn_on'
                  ? 'Avvio motore'
                  : 'Spegnimento motore'
                : action === 'switch.turn_on'
                  ? 'Avvia ricarica'
                  : action === 'switch.turn_off'
                    ? 'Interrompi ricarica'
                    : typeof entity?.attributes.friendly_name === 'string'
                      ? entity.attributes.friendly_name
                      : 'Esegui ricarica'
          }
        />
      ));
    return (
      <CarControlScope key={field + '|' + id} field={field} entityId={id} settings={settings}>
        {child}
      </CarControlScope>
    );
  };
  return (
    <div className="car-details">
      <DetailsBody label="Auto">
        {!runtime.entitiesLoaded ? (
          <Skeleton variant="list" label="Caricamento dell’auto…" />
        ) : !sources.length && !config.chargeControlIds.length ? (
          <Body size="sm">Collega le fonti dell’auto nelle impostazioni del widget.</Body>
        ) : (
          <>
            {items('Batteria e viaggio').length > 0 && (
              <Section title="Telemetria">
                <StatList items={items('Batteria e viaggio')} />
              </Section>
            )}
            {(items('Ricarica').length > 0 || config.chargeControlIds.length > 0) && (
              <Section title="Ricarica">
                <StatList items={items('Ricarica')} />
                {config.chargeControlIds.map((id) => (
                  <div className="car-control" key={id}>
                    <Body size="sm">
                      {typeof runtime.entities[id]?.attributes.friendly_name === 'string' &&
                      runtime.entities[id]?.attributes.friendly_name.trim()
                        ? runtime.entities[id]?.attributes.friendly_name
                        : id}
                    </Body>
                    {control('chargeControlId', id)}
                  </div>
                ))}
                {control('chargeLimitNumberId')}
                {control('chargeLimitSelectId')}
              </Section>
            )}
            {items('Clima').length > 0 && (
              <Section title="Clima">
                <StatList items={items('Clima')} />
                {control('climateId')}
              </Section>
            )}
            {items('Veicolo').length > 0 && (
              <Section title="Veicolo">
                <StatList items={items('Veicolo')} />
                {control('lockId')}
                {control('ignitionSwitchId')}
              </Section>
            )}
            {items('Posizione').length > 0 && (
              <Section title="Posizione">
                <StatList items={items('Posizione')} />
                {position ? (
                  <a
                    className="car-map-link"
                    href={`https://www.openstreetmap.org/?mlat=${position.lat}&mlon=${position.lon}#map=16/${position.lat}/${position.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                  >
                    Apri la posizione sulla mappa
                  </a>
                ) : (
                  <Caption>Coordinate non disponibili.</Caption>
                )}
              </Section>
            )}
            {histories.length > 0 && (
              <>
                {histories.length > 1 && (
                  <OptionPicker
                    label="Fonte della cronologia"
                    value={history?.key ?? null}
                    options={histories.map((source) => ({
                      value: source.key,
                      label: source.label,
                    }))}
                    onSelect={setSelected}
                    isolateEscape
                  />
                )}
                {history?.entity && (
                  <CarHistory
                    key={history.key + '|' + history.id}
                    entity={history.entity}
                    field={history.key}
                    initialHours={settings.adaptiveHistoryHours}
                  />
                )}
              </>
            )}
            <DisclosureGroup value={technicalOpen} onValueChange={setTechnicalOpen}>
              <Disclosure id={sectionId} title="Tecnica e manutenzione">
                <StatList items={items('Tecnica')} />
                {technicalOpen && control('updateButtonId')}
                <StatList
                  items={sources.map((source) => ({
                    key: source.key,
                    label: source.label,
                    value: source.reading.label,
                    note: <Caption>{source.id}</Caption>,
                  }))}
                />
              </Disclosure>
            </DisclosureGroup>
          </>
        )}
      </DetailsBody>
    </div>
  );
}

export function CarConsole(props: WidgetDetailsProps) {
  return (
    <ConsoleColumns
      main={
        <div className="widget-console-details">
          <CarDetails {...props} />
        </div>
      }
    />
  );
}
