import { useState, type ReactNode } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { readableState, safeState } from '../shared/entity';
import { formatCompact } from '../shared/format';
import { Amount } from '../shared/Amount';
import { CardMessage, CardSkeleton, Chip, IconWell, Meter, UtilityCard } from '../shared/UtilityCard';
import { oneDecimal, readCar, readCarSettings } from './carData';

export const CAR_DEFAULT_NAME = 'Auto';

/** Battery, range, position and charging state of a car (`car_card_*` and the legacy `car`). */
export function CarWidget({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const [imageFailed, setImageFailed] = useState(false);
  const car = readCarSettings(settings);
  const name = runtime.customNames[id] || CAR_DEFAULT_NAME;
  const row = size.h <= 1;
  const card = (children: ReactNode) => (
    <UtilityCard
      openLabel={`${name}, apri i dettagli dell’auto`}
      onOpen={() => runtime.openDetails(id)}
      editMode={editMode}
      row={row}
    >
      {children}
    </UtilityCard>
  );

  if (!runtime.entitiesLoaded) return card(<CardSkeleton label={`Caricamento di ${name}…`} />);
  if (!car.ids.batteryId && !car.ids.rangeId && !car.ids.locationId) {
    return card(<CardMessage icon="car" title="Collega le entità dell’auto" detail="Dalle impostazioni del widget" />);
  }

  const data = readCar(runtime.entities, car, runtime.haConfig);
  const battery = oneDecimal(data.battery);
  const batteryText = battery === null ? '--' : formatCompact(battery, 1);
  const rangeText = data.range === null ? null : formatCompact(data.range, 1);
  const location = safeState(data.location) ? readableState(data.location) : null;
  const imageUrl = car.imageUrl && !imageFailed ? runtime.getEntityImageUrl(car.imageUrl) ?? car.imageUrl : null;
  const tone = data.isCharging ? 'active' : null;

  const chips = (
    <>
      {data.isCharging && (
        <Chip icon="energy" tone="active">
          In carica
        </Chip>
      )}
      {data.isPlugged && !data.isCharging && <Chip icon="plug">Collegata</Chip>}
      {data.isClimateOn && (
        <Chip icon="thermostat" tone="active">
          Clima acceso
        </Chip>
      )}
    </>
  );

  if (row) {
    return card(
      <>
        <IconWell icon="car" tone={tone} className="utility-hide-narrow" />
        <div className="utility-stack utility-grow">
          <Caption className="utility-truncate">{name}</Caption>
          <span className="utility-inline">
            <Amount value={batteryText} unit={battery === null ? null : '%'} size="md" tight />
            {rangeText && <Amount value={rangeText} unit={data.rangeUnit} size="sm" />}
          </span>
        </div>
        {size.w >= 3 && <div className="utility-chips utility-hide-narrow">{chips}</div>}
        {size.w < 3 && data.isCharging && <span className="sr-only">In carica</span>}
      </>
    );
  }

  return card(
    <>
      <div className="utility-head">
        <IconWell icon="car" tone={tone} />
        <div className="utility-head__text">
          <Body as="span" size="sm" tone="ink" className="utility-truncate">
            {name}
          </Body>
          {location && (
            <Caption className="utility-truncate" title={location}>
              {location}
            </Caption>
          )}
        </div>
      </div>
      <div className="utility-split utility-bottom">
        <div className="utility-stack">
          <Caption className="utility-hide-narrow">Batteria e autonomia</Caption>
          <span className="utility-inline">
            <Amount value={batteryText} unit={battery === null ? null : '%'} tight />
            {rangeText && <Amount value={rangeText} unit={data.rangeUnit} size="sm" />}
          </span>
        </div>
        {imageUrl && (
          <img
            className="utility-car-image utility-hide-narrow"
            src={imageUrl}
            alt=""
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      {battery !== null && (
        <Meter
          value={battery}
          label="Livello della batteria"
          valueText={`${batteryText}%`}
          low={battery <= 20 && !data.isCharging}
          className="utility-hide-short"
        />
      )}
      <div className="utility-chips utility-hide-short">{chips}</div>
    </>
  );
}
