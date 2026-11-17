import type { EntityMap } from '@/@types/ha';
import { carHistoryReading, type CarSourceField } from '@/domain/car/carSources';
import { ProductSensorHistory } from '../../home/sensor/ProductSensorHistory';

export function CarHistory({
  entity,
  field,
  initialHours,
}: {
  entity: EntityMap[string];
  field: CarSourceField;
  initialHours: unknown;
}) {
  return (
    <ProductSensorHistory
      entity={entity}
      initialHours={initialHours}
      eventReading={(event) => {
        const reading = carHistoryReading(event, entity, field);
        return {
          value: reading.valueText,
          unit: reading.available ? (reading.unit ?? '') : '',
          numeric: reading.value,
        };
      }}
    />
  );
}
