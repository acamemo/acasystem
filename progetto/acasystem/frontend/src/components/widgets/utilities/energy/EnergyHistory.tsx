import type { EntityMap } from '@/@types/ha';
import { ProductSensorHistory } from '../../home/sensor/ProductSensorHistory';
import { energyHistoryReading, type EnergyKind, type EnergyPreferences } from './energyModel';

/** The same recorder UI, with semantic validation supplied by the explicit energy source. */
export function EnergyHistory({
  entity,
  kind,
  preferences,
  initialHours,
}: {
  entity: EntityMap[string];
  kind: EnergyKind;
  preferences: EnergyPreferences;
  initialHours: unknown;
}) {
  return (
    <ProductSensorHistory
      entity={entity}
      initialHours={initialHours}
      eventReading={(event) => {
        const reading = energyHistoryReading(event, entity, kind, preferences);
        return {
          value: reading.valueText,
          unit: reading.available ? (reading.unit ?? '') : '',
          numeric: reading.value,
        };
      }}
    />
  );
}
