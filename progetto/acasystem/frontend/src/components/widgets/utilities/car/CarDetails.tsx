import { useId } from 'react';
import { Body, Caption, MaterialLayers, materialClass } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  entityOf,
  friendlyName,
  isUnavailableState,
  listAttr,
  numberAttr,
  numericState,
  readableState,
  safeState,
  stringAttr,
} from '../shared/entity';
import { formatCompact, formatRelative } from '../shared/format';
import { CommandButton, CommandToggle, ValueStepper } from '../shared/controls';
import { DetailsBody, OptionPicker, Section, StatList, type StatItem } from '../shared/details';
import { Chip, Notice, commandNotice } from '../shared/UtilityCard';
import { useCommand } from '../shared/useCommand';
import { haUnit, lengthReading, temperatureReading } from '../shared/units';
import { carPosition, chargeControlCall, oneDecimal, readCar, readCarSettings } from './carData';

const CLIMATE_MIN = 16;
const CLIMATE_MAX = 30;

/** Car details (legacy LeafModal): state, map, readings, climate, charging and vehicle controls. */
export function CarDetails({ settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const { entities, haConfig } = runtime;
  const car = readCarSettings(settings);
  const { ids } = car;
  const data = readCar(entities, car, haConfig);
  const position = carPosition(entities, car);
  const climateLabelId = `clima-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const selectCommand = useCommand(entityOf(entities, ids.chargeLimitSelectId));

  const climate = entityOf(entities, ids.climateId);
  const tempEntity = entityOf(entities, ids.tempId);
  const odometer = entityOf(entities, ids.odometerId);
  // Climate entities report in the HA unit; the interior sensor is converted to it.
  const climateUnit = haUnit('temperature', haConfig, stringAttr(climate, 'temperature_unit') ?? '°C');
  const interior = ids.tempId
    ? temperatureReading(numericState(tempEntity), stringAttr(tempEntity, 'unit_of_measurement'), haConfig)
    : { value: numberAttr(climate, 'current_temperature'), unit: climateUnit };
  const odometerReading = lengthReading(
    numericState(odometer),
    stringAttr(odometer, 'unit_of_measurement'),
    haConfig
  );
  const target = numberAttr(climate, 'temperature');
  const lastUpdated = safeState(entityOf(entities, ids.lastUpdatedId));
  const apiStatus = safeState(entityOf(entities, ids.apiStatusId));
  const reading = (id: string | undefined) => (id ? readableState(entityOf(entities, id)) : '--');

  const status = data.isCharging ? 'In carica' : data.isClimateOn ? 'Clima acceso' : 'Inattiva';
  const stats: StatItem[] = [];
  if (ids.batteryId) {
    stats.push({
      key: 'battery',
      label: 'Batteria',
      value: formatCompact(oneDecimal(data.battery), 1),
      unit: '%',
      note: ids.pluggedId ? <Caption>{data.isPlugged ? 'Collegata' : 'Scollegata'}</Caption> : null,
    });
  }
  if (ids.rangeId) {
    stats.push({ key: 'range', label: 'Autonomia', value: formatCompact(data.range, 1), unit: data.rangeUnit });
  }
  if (ids.tempId || interior.value !== null) {
    stats.push({ key: 'temp', label: 'Temperatura interna', value: formatCompact(interior.value, 1), unit: interior.unit });
  }
  if (ids.odometerId) {
    stats.push({
      key: 'odometer',
      label: 'Contachilometri',
      value: formatCompact(oneDecimal(odometerReading.value), 1),
      unit: odometerReading.unit,
    });
  }
  if (ids.fuelLevelId) {
    stats.push({
      key: 'fuel',
      label: 'Carburante',
      value: formatCompact(oneDecimal(numericState(entityOf(entities, ids.fuelLevelId))), 1),
      unit: '%',
    });
  }
  if (ids.chargingPowerId) stats.push({ key: 'power', label: 'Potenza di carica', value: reading(ids.chargingPowerId) });
  if (ids.chargeRateId) stats.push({ key: 'rate', label: 'Velocità di carica', value: reading(ids.chargeRateId) });
  if (ids.timeToFullId) stats.push({ key: 'full', label: 'Carica completa tra', value: reading(ids.timeToFullId) });
  if (ids.chargeEndTimeId) stats.push({ key: 'end', label: 'Fine della carica', value: reading(ids.chargeEndTimeId) });

  const limitNumber = entityOf(entities, ids.chargeLimitNumberId);
  const limitSelect = entityOf(entities, ids.chargeLimitSelectId);
  const lock = entityOf(entities, ids.lockId);
  const lockState = lock?.state;
  const locked = lockState === 'locked' || lockState === 'locking';
  const ignition = entityOf(entities, ids.ignitionSwitchId);
  const selectNotice = commandNotice(selectCommand.errorKey, selectCommand.unconfirmedKey);

  return (
    <DetailsBody>
      <Section
        title="Stato"
        icon="car"
        aside={
          ids.updateButtonId ? (
            <CommandButton
              entity={entityOf(entities, ids.updateButtonId)}
              domain="button"
              service="press"
              data={{ entity_id: ids.updateButtonId }}
              icon="refresh"
            >
              Aggiorna dati
            </CommandButton>
          ) : null
        }
      >
        <div className="utility-chips">
          <Chip icon={data.isCharging ? 'energy' : data.isClimateOn ? 'thermostat' : 'car'} tone={data.isCharging || data.isClimateOn ? 'active' : 'neutral'}>
            {status}
          </Chip>
          {lastUpdated && (
            <Chip icon="clock">Aggiornata {formatRelative(lastUpdated) ?? lastUpdated}</Chip>
          )}
          {apiStatus && <Chip icon="wifi">Servizio: {apiStatus}</Chip>}
        </div>
      </Section>

      <Section title="Posizione" icon="location">
        {data.location && safeState(data.location) && (
          <Body size="sm" tone="ink">
            {readableState(data.location)}
          </Body>
        )}
        {position ? (
          <figure className="utility-figure">
            <div className={materialClass({ behavior: 'well', shape: 'card', size: 'inherit' }, 'utility-map')}>
              <MaterialLayers element="div">
                <iframe
                  title="Mappa con l’ultima posizione dell’auto"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${position.lon - 0.005}%2C${position.lat - 0.005}%2C${position.lon + 0.005}%2C${position.lat + 0.005}&layer=mapnik&marker=${position.lat}%2C${position.lon}`}
                />
              </MaterialLayers>
            </div>
            <Caption as="figcaption">Ultima posizione rilevata</Caption>
          </figure>
        ) : (
          <Notice icon="map">Posizione non disponibile: collega un localizzatore con coordinate.</Notice>
        )}
      </Section>

      {stats.length > 0 && (
        <Section title="Batteria e viaggio" icon="battery">
          <StatList items={stats} />
        </Section>
      )}

      {ids.climateId && (
        <Section
          title="Clima"
          icon="thermostat"
          aside={
            <span className="utility-inline">
              <Caption id={climateLabelId}>{data.isClimateOn ? 'Acceso' : 'Spento'}</Caption>
              <CommandToggle
                entity={climate}
                entityId={ids.climateId}
                domain="climate"
                label="Clima dell’auto"
                isOn={(entity) => Boolean(entity) && !isUnavailableState(entity?.state) && entity?.state !== 'off'}
              />
            </span>
          }
        >
          <ValueStepper
            label="Temperatura desiderata"
            confirmed={target ?? 20}
            min={CLIMATE_MIN}
            max={CLIMATE_MAX}
            step={0.5}
            format={(value) => `${formatCompact(value, 1)} ${climateUnit}`}
            disabled={!climate || isUnavailableState(climate.state)}
            toCall={(value) => ({
              domain: 'climate',
              service: 'set_temperature',
              data: { entity_id: ids.climateId, temperature: Math.min(CLIMATE_MAX, Math.max(CLIMATE_MIN, value)) },
            })}
          />
          <Caption>
            Desiderata {formatCompact(target ?? 20, 1)} {climateUnit}
          </Caption>
        </Section>
      )}

      {(car.chargeControlIds.length > 0 || ids.chargeLimitNumberId || ids.chargeLimitSelectId) && (
        <Section title="Ricarica" icon="energy">
          {car.chargeControlIds.length > 0 && (
            <ul className="utility-list">
              {car.chargeControlIds.map((controlId) => {
                const control = entities[controlId];
                const call = chargeControlCall(controlId, control?.state);
                const name = friendlyName(control, controlId);
                return (
                  <li className="utility-list__row" key={controlId}>
                    <span className="utility-list__main">
                      <Body as="span" size="sm" tone="ink" className="utility-truncate">
                        {name}
                      </Body>
                    </span>
                    <span className="utility-list__end">
                      {call && controlId.startsWith('switch.') ? (
                        <CommandToggle entity={control} entityId={controlId} domain="switch" label={name} />
                      ) : call ? (
                        <CommandButton
                          entity={control}
                          domain={call.domain}
                          service={call.service}
                          data={{ entity_id: controlId }}
                          label={`${call.domain === 'script' ? 'Esegui' : 'Premi'}: ${name}`}
                        >
                          {call.domain === 'script' ? 'Esegui' : 'Premi'}
                        </CommandButton>
                      ) : (
                        <Caption>Non supportato</Caption>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {ids.chargeLimitNumberId && (
            <div className="utility-stack">
              <Caption>{friendlyName(limitNumber, 'Limite di carica')}</Caption>
              <ValueStepper
                label="Limite di carica"
                confirmed={numericState(limitNumber)}
                min={numberAttr(limitNumber, 'min') ?? 50}
                max={numberAttr(limitNumber, 'max') ?? 100}
                step={numberAttr(limitNumber, 'step') ?? 1}
                format={(value) => `${formatCompact(value, 1)} %`}
                disabled={!limitNumber || isUnavailableState(limitNumber.state)}
                toCall={(value) => ({
                  domain: 'number',
                  service: 'set_value',
                  data: { entity_id: ids.chargeLimitNumberId, value },
                })}
              />
            </div>
          )}
          {ids.chargeLimitSelectId && (
            <div className="utility-stack">
              <OptionPicker
                label={friendlyName(limitSelect, 'Limite di carica')}
                value={safeState(limitSelect)}
                options={listAttr(limitSelect, 'options').map((option) => ({ value: option, label: option }))}
                pending={selectCommand.pendingKey === 'select'}
                disabled={!limitSelect || isUnavailableState(limitSelect.state)}
                onSelect={(option) =>
                  selectCommand.run({
                    key: 'select',
                    domain: 'select',
                    service: 'select_option',
                    data: { entity_id: ids.chargeLimitSelectId, option },
                    confirm: (entity) => entity?.state === option,
                  })
                }
              />
              {selectNotice && (
                <Notice tone={selectNotice.tone} icon="warning" live>
                  {selectNotice.text}
                </Notice>
              )}
            </div>
          )}
        </Section>
      )}

      {(ids.lockId || ids.ignitionSwitchId) && (
        <Section title="Veicolo" icon="key">
          <div className="utility-toolbar">
            {ids.lockId && (
              <CommandButton
                entity={lock}
                domain="lock"
                service={locked ? 'unlock' : 'lock'}
                data={{ entity_id: ids.lockId }}
                icon={locked ? 'unlock' : 'lock'}
                confirm={(entity) => (locked ? entity?.state === 'unlocked' : entity?.state === 'locked')}
                disabled={!lock || isUnavailableState(lock.state)}
              >
                {locked ? 'Sblocca' : 'Blocca'}
              </CommandButton>
            )}
            {ids.ignitionSwitchId && (
              <CommandButton
                entity={ignition}
                domain="switch"
                service={ignition?.state === 'on' ? 'turn_off' : 'turn_on'}
                data={{ entity_id: ids.ignitionSwitchId }}
                icon="key"
                confirm={(entity) => (ignition?.state === 'on' ? entity?.state === 'off' : entity?.state === 'on')}
                disabled={!ignition || isUnavailableState(ignition.state)}
              >
                {ignition?.state === 'on' ? 'Spegni il motore' : 'Avvia il motore'}
              </CommandButton>
            )}
          </div>
          {lock && <Caption>Serratura: {locked ? 'bloccata' : 'sbloccata'}</Caption>}
        </Section>
      )}
    </DetailsBody>
  );
}
