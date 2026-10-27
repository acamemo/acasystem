import type { HassEntity } from 'home-assistant-js-websocket';
import { Body, Button, Caption } from '@/components/primitives';
import { friendlyName, settingFlag } from '../../shared/entity';
import { OptionPicker } from '../../shared/details';
import { Notice } from '../../shared/UtilityCard';
import { EntityRow, domainIcon, entityStateText } from '../EntityRow';
import { ClimateControl } from './RoomControls';
import { domainLabel } from './roomLabels';
import type { RoomState } from './useRoomDetailsState';

export function RoomClimateSection({ v }: { v: RoomState }) {
  const { settings, entities, climates, activeClimateId, setSelectedClimate, section } = v;
  return (
    <>
      {settingFlag(settings, 'showPopupClimate') &&
        climates.length > 0 &&
        section(
          'climate',
          'Clima',
          'thermostat',
          activeClimateId && entities[activeClimateId] ? (
            <ClimateControl
              climateId={activeClimateId}
              entity={entities[activeClimateId] as HassEntity}
            />
          ) : (
            <Caption>Nessun termostato disponibile.</Caption>
          ),
          climates.length > 1 ? (
            <OptionPicker
              label="Termostato"
              value={activeClimateId}
              options={climates.map((id) => ({ value: id, label: friendlyName(entities[id], id) }))}
              onSelect={setSelectedClimate}
            />
          ) : null
        )}
    </>
  );
}

export function RoomTemperaturesSection({ v }: { v: RoomState }) {
  const { settings, runtime, entities, temperatures, section } = v;
  return (
    <>
      {settingFlag(settings, 'showPopupTempOverview') &&
        temperatures.length > 0 &&
        section(
          'tempOverview',
          'Temperature',
          'thermostat',
          <ul className="utility-list">
            {temperatures.map((id) => {
              const entity = entities[id] as HassEntity;
              return (
                <li className="utility-list__row" key={id}>
                  <span className="utility-list__main">
                    <Body as="span" size="sm" tone="ink" className="utility-truncate" title={id}>
                      {friendlyName(entity, id)}
                    </Body>
                  </span>
                  <span className="utility-list__end">
                    <Caption>{entityStateText(id, entity, runtime.haConfig)}</Caption>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
    </>
  );
}

export function RoomLightsSection({ v }: { v: RoomState }) {
  const { settings, entities, lights, lightsOn, lightsError, toggleAllLights, section } = v;
  return (
    <>
      {settingFlag(settings, 'showPopupLights') &&
        lights.length > 0 &&
        section(
          'lights',
          `Luci (${lightsOn} su ${lights.length} ${lightsOn === 1 ? 'accesa' : 'accese'})`,
          'light',
          <>
            <ul className="utility-list">
              {lights.map((id) => (
                <EntityRow
                  key={id}
                  entityId={id}
                  entity={entities[id] as HassEntity}
                  brightness="always"
                />
              ))}
            </ul>
            {lightsError && (
              <Notice tone="danger" icon="warning" live>
                Alcune luci non hanno risposto. Riprova.
              </Notice>
            )}
          </>,
          <Button variant="control" size="sm" onClick={toggleAllLights}>
            {lightsOn > 0 ? 'Spegni tutte' : 'Accendi tutte'}
          </Button>
        )}
    </>
  );
}

export function RoomVacuumSection({ v }: { v: RoomState }) {
  const { settings, entities, orderedVacuums, section } = v;
  return (
    <>
      {settingFlag(settings, 'showPopupVacuum') &&
        orderedVacuums.length > 0 &&
        section(
          'vacuum',
          'Aspirapolvere',
          'vacuum',
          <ul className="utility-list">
            {orderedVacuums.map((id) => (
              <EntityRow key={id} entityId={id} entity={entities[id] as HassEntity} />
            ))}
          </ul>
        )}
    </>
  );
}

export function RoomMediaSection({ v }: { v: RoomState }) {
  const { settings, entities, orderedMedia, section } = v;
  return (
    <>
      {settingFlag(settings, 'showPopupMedia') &&
        orderedMedia.length > 0 &&
        section(
          'media',
          'Media',
          'speaker',
          <ul className="utility-list">
            {orderedMedia.map((id) => (
              <EntityRow key={id} entityId={id} entity={entities[id] as HassEntity} playPause />
            ))}
          </ul>
        )}
    </>
  );
}

export function RoomOtherSections({ v }: { v: RoomState }) {
  const { entities, groupList, section } = v;
  return (
    <>
      {groupList.map(([domain, list]) =>
        section(
          domain,
          domainLabel(domain),
          domainIcon(domain),
          <ul className="utility-list">
            {list.map((id) => (
              <EntityRow key={id} entityId={id} entity={entities[id] as HassEntity} />
            ))}
          </ul>
        )
      )}
    </>
  );
}
