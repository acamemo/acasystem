import { ConsoleColumns } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { VacuumMissing } from './VacuumDetails';
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

/**
 * Content of the vacuum console (Console primitive): the sections of the sheet in two columns.
 * Left, what the robot is doing: status, battery and main actions, the map. Right, what it can be
 * told: cleaning options, rooms, statistics, maintenance, diagnostics and the other sensors.
 */
export function VacuumConsole({ id, settings }: WidgetDetailsProps) {
  const v = useVacuumDetailsState(id, settings);
  if (!v) return <VacuumMissing id={id} />;
  return (
    <ConsoleColumns
      main={
        <>
          <VacuumStatusSection v={v} />
          <VacuumMapSection v={v} />
        </>
      }
      side={
        <>
          <VacuumCleaningSection v={v} />
          <VacuumRoomsSection v={v} />
          <VacuumStatsSection v={v} />
          <VacuumMaintenanceSection v={v} />
          <VacuumDiagnosticsSection v={v} />
          <VacuumTelemetrySection v={v} />
        </>
      }
    />
  );
}
