import { ConsoleColumns } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { RoomMissing } from './RoomDetails';
import {
  RoomClimateSection,
  RoomLightsSection,
  RoomMediaSection,
  RoomOtherSections,
  RoomTemperaturesSection,
  RoomVacuumSection,
} from './parts/RoomSections';
import { useRoomDetailsState } from './parts/useRoomDetailsState';

/**
 * Content of the room console (Console primitive): the sections of the sheet in two columns.
 * Left, the primary controls of the room: climate and lights. Right, the readings and the other
 * devices: temperatures, vacuums, media and the remaining entities.
 */
export function RoomConsole({ settings }: WidgetDetailsProps) {
  const v = useRoomDetailsState(settings);
  if (!v) return <RoomMissing />;
  return (
    <ConsoleColumns
      main={
        <>
          <RoomClimateSection v={v} />
          <RoomLightsSection v={v} />
        </>
      }
      side={
        <>
          <RoomTemperaturesSection v={v} />
          <RoomVacuumSection v={v} />
          <RoomMediaSection v={v} />
          <RoomOtherSections v={v} />
        </>
      }
    />
  );
}
