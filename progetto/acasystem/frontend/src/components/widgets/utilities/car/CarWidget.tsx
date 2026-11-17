import { useState } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { widgetDisplayName } from '@/utils/launcher/names';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  CAR_SOURCE_FIELDS,
  carImageSource,
  carReading,
  configuredCarSources,
  type CarSourceField,
} from '@/domain/car/carSources';
import { CardMessage, CardSkeleton, IconWell, UtilityCard } from '../shared/UtilityCard';
import './car.css';

export const CAR_DEFAULT_NAME = 'Auto';

/** A readonly summary of explicit vehicle sources. Commands belong to its full screen. */
export function CarWidget({ openDetails, ...props }: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime();
  const { id, settings, size, editMode } = props;
  const car = configuredCarSources(settings);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const name = widgetDisplayName(
    id,
    settings,
    runtime.entities,
    runtime.customNames,
    CAR_DEFAULT_NAME
  );
  const fields: CarSourceField[] = [
    'batteryId',
    'rangeId',
    'fuelLevelId',
    'chargingPowerId',
    'tempId',
    'odometerId',
  ];
  const readings = fields
    .flatMap((key) =>
      car.ids[key] ? [{ key, reading: carReading(runtime.entities[car.ids[key]!], key) }] : []
    )
    .slice(0, size.h <= 1 ? 1 : 2);
  const statusKey = (
    ['chargingStateId', 'pluggedId', 'locationId', 'climateId', 'lockId', 'engineStatusId'] as const
  ).find((key) => car.ids[key]);
  const status = statusKey ? carReading(runtime.entities[car.ids[statusKey]!], statusKey) : null;
  const configured = Object.keys(car.ids).length > 0 || car.chargeControlIds.length > 0;
  const rawImage = carImageSource(car.imageUrl);
  const image = rawImage ? carImageSource(runtime.getEntityImageUrl(rawImage) ?? rawImage) : null;
  const other =
    !readings.length && !status ? CAR_SOURCE_FIELDS.find((field) => car.ids[field.key]) : null;
  const otherReading = other ? carReading(runtime.entities[car.ids[other.key]!], other.key) : null;
  return (
    <article className="car-widget" data-widget-type="car">
      <UtilityCard
        openLabel={`${name}, apri i dettagli dell’auto`}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
        editMode={editMode}
        className={`car-widget__card${size.h <= 1 ? ' car-widget--compact' : ''}`}
      >
        {!runtime.entitiesLoaded ? (
          <CardSkeleton label={`Caricamento di ${name}…`} />
        ) : !configured ? (
          <CardMessage
            icon="car"
            title="Collega le fonti dell’auto"
            detail="Dalle impostazioni del widget"
          />
        ) : (
          <>
            <div className="utility-head">
              {size.h > 1 && <IconWell icon="car" small />}
              <Body as="span" size="sm" className="car-widget__name ctl-clamp-2" title={name}>
                {name}
              </Body>
            </div>
            <div className="car-widget__summary">
              <dl className="car-widget__readings">
                {readings.map(({ key, reading }) => (
                  <div key={key}>
                    <dt className={size.h <= 1 ? 'sr-only' : undefined}>
                      <Caption>{reading.label}</Caption>
                    </dt>
                    <dd>
                      {size.h <= 1 ? (
                        <Body
                          size="sm"
                          className="car-widget__compact-value ctl-clamp-2"
                          title={`${reading.valueText}${reading.available && reading.unit ? ` ${reading.unit}` : ''}`}
                        >
                          {reading.valueText}
                          {reading.available && reading.unit ? ` ${reading.unit}` : ''}
                        </Body>
                      ) : reading.available && reading.value !== null ? (
                        <Body as="div" size="sm" className="car-widget__reading-value">
                          <span className="car-widget__number" title={reading.valueText}>
                            {reading.valueText}
                          </span>
                          {reading.unit && (
                            <span className="car-widget__unit">{` ${reading.unit}`}</span>
                          )}
                        </Body>
                      ) : (
                        <Body size="sm" className="ctl-clamp-2">
                          {reading.valueText}
                        </Body>
                      )}
                    </dd>
                  </div>
                ))}
                {otherReading && (
                  <div>
                    <dt>
                      <Caption>{otherReading.label}</Caption>
                    </dt>
                    <dd>
                      <Body size="sm" className="ctl-clamp-2">
                        {otherReading.valueText}
                      </Body>
                    </dd>
                  </div>
                )}
              </dl>
              {size.h > 1 && image && failedImage !== image && (
                <img
                  className="car-widget__image"
                  src={image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => setFailedImage(image)}
                />
              )}
            </div>
            {status && (
              <Caption
                className={
                  size.h <= 1 && readings.length > 0 ? 'sr-only' : 'car-widget__status ctl-clamp-2'
                }
              >
                {status.valueText}
              </Caption>
            )}
            {!readings.length && !status && !otherReading && <Caption>Comandi di ricarica</Caption>}
          </>
        )}
      </UtilityCard>
    </article>
  );
}
