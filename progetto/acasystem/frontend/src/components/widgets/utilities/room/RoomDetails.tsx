import type { WidgetDetailsProps } from '@/@types/launcher';
import { DetailsBody } from '../shared/details';
import { Notice } from '../shared/UtilityCard';
import {
  RoomClimateSection,
  RoomLightsSection,
  RoomMediaSection,
  RoomOtherSections,
  RoomTemperaturesSection,
  RoomVacuumSection,
} from './parts/RoomSections';
import { useRoomDetailsState } from './parts/useRoomDetailsState';

export { DOMAIN_LABEL, domainLabel } from './parts/roomLabels';

/** Shown by the sheet and the console when no device of the room is in Home Assistant. */
export function RoomMissing() {
  return (
    <DetailsBody>
      <Notice icon="room">
        Nessun dispositivo di questa stanza è disponibile in Home Assistant.
      </Notice>
    </DetailsBody>
  );
}

/**
 * Room details (legacy RoomModal) in one column: climate, temperatures, lights, vacuums, media and
 * the other devices. The console (RoomConsole) lays out the same sections in two columns.
 */
export function RoomDetails({ settings }: WidgetDetailsProps) {
  const v = useRoomDetailsState(settings);
  if (!v) return <RoomMissing />;
  return (
    <DetailsBody>
      <RoomClimateSection v={v} />
      <RoomTemperaturesSection v={v} />
      <RoomLightsSection v={v} />
      <RoomVacuumSection v={v} />
      <RoomMediaSection v={v} />
      <RoomOtherSections v={v} />
    </DetailsBody>
  );
}
