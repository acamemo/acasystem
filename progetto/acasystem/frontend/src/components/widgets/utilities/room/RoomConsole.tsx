import { ConsoleColumns } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { RoomMissing, RoomRegistryNotice } from './RoomDetails';
import {
  RoomClimateSection,
  RoomLightsSection,
  RoomMediaSection,
  RoomOtherSections,
  RoomTemperaturesSection,
  RoomVacuumSection,
  RoomTechnicalSection,
} from './parts/RoomSections';
import { useRoomDetailsState } from './parts/useRoomDetailsState';
import { RoomScope } from './RoomScope';
import './room.css';

/**
 * Content of the room console (Console primitive): the sections of the sheet in two columns.
 * Left, the primary controls of the room: climate and lights. Right, the readings and the other
 * devices: temperatures, vacuums, media and the remaining entities.
 */
function RoomConsoleContent({ settings }: WidgetDetailsProps) {
  const v = useRoomDetailsState(settings);
  if (!v) return <RoomMissing />;
  return (
    <div className="room-details"><ConsoleColumns
      main={
        <>
          <RoomRegistryNotice />
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
          <RoomTechnicalSection v={v} />
        </>
      }
    /></div>
  );
}

export function RoomConsole(props: WidgetDetailsProps) {
  return <RoomScope settings={props.settings}>{settings => <RoomConsoleContent {...props} settings={settings} />}</RoomScope>;
}
