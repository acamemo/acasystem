import type { WidgetDetailsProps } from '@/@types/launcher';
import { DetailsBody } from '../shared/details';
import { Notice } from '../shared/UtilityCard';
import { VacuumMapSection } from './parts/VacuumMapSection';
import { VacuumCleaningSection } from './parts/VacuumCleaningSection';
import {
  VacuumDiagnosticsSection,
  VacuumMaintenanceSection,
  VacuumStatsSection,
  VacuumTelemetrySection,
} from './parts/VacuumCareSections';
import { VacuumRoomsSection } from './parts/VacuumRoomsSection';
import { VacuumStatusSection } from './parts/VacuumStatusSection';
import { useVacuumDetailsState } from './parts/useVacuumDetailsState';

/** Notice shown by the sheet and the console when the vacuum is not in Home Assistant. */
export function VacuumMissing({ id }: { id: string }) {
  return (
    <DetailsBody>
      <Notice icon="warning">Il dispositivo {id} non è stato trovato in Home Assistant.</Notice>
    </DetailsBody>
  );
}

/**
 * Vacuum details (legacy VacuumModal) in one column: commands, cleaning options, rooms, map,
 * statistics, maintenance. The console (VacuumConsole) lays out the same sections in two columns.
 */
export function VacuumDetails({ id, settings }: WidgetDetailsProps) {
  const v = useVacuumDetailsState(id, settings);
  if (!v) return <VacuumMissing id={id} />;
  return (
    <DetailsBody>
      <VacuumStatusSection v={v} />
      <VacuumCleaningSection v={v} />
      <VacuumRoomsSection v={v} />
      <VacuumMapSection v={v} />
      <VacuumStatsSection v={v} />
      <VacuumMaintenanceSection v={v} />
      <VacuumDiagnosticsSection v={v} />
      <VacuumTelemetrySection v={v} />
    </DetailsBody>
  );
}
