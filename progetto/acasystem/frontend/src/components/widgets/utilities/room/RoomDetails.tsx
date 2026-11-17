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
  RoomTechnicalSection,
} from './parts/RoomSections';
import { useRoomDetailsState } from './parts/useRoomDetailsState';
import { RoomScope, useRoomContext } from './RoomScope';
import { Body, Button } from '@/components/primitives';
import './room.css';

export { DOMAIN_LABEL, domainLabel } from './parts/roomLabels';

/** Shown by the sheet and the console when no device of the room is in Home Assistant. */
export function RoomMissing() {
  const membership = useRoomContext();
  return (
    <DetailsBody>
      <Notice icon="room">
        {membership?.status === 'loading' ? 'Caricamento della stanza…' : membership?.status === 'missing'
          ? 'Questa area non è più disponibile in Home Assistant.' : membership?.status === 'offline'
            ? 'Collega la casa per vedere la stanza.' : membership?.status === 'error'
              ? 'Non riesco a caricare la stanza.' : 'Nessun dispositivo di questa stanza è disponibile.'}
      </Notice>
      {membership?.status === 'error' && <Button variant="control" onClick={membership.retry}>Riprova</Button>}
    </DetailsBody>
  );
}

export function RoomRegistryNotice() {
  const membership = useRoomContext();
  if (membership?.registryStatus === 'offline') return <Notice icon="wifi">Casa non collegata. I comandi sono sospesi.</Notice>;
  if (membership?.registryStatus !== 'error') return null;
  return <Notice icon="warning">Non riesco a verificare i dispositivi della stanza. I comandi sono sospesi.
    <Button variant="control" onClick={membership.retry}>Riprova</Button></Notice>;
}

/**
 * Room details (legacy RoomModal) in one column: climate, temperatures, lights, vacuums, media and
 * the other devices. The console (RoomConsole) lays out the same sections in two columns.
 */
export function RoomDetailsContent({ settings }: WidgetDetailsProps) {
  const v = useRoomDetailsState(settings);
  if (!v) return <RoomMissing />;
  return (
    <div className="room-details"><DetailsBody>
      <RoomRegistryNotice />
      {v.missingIds.length > 0 && <Body size="sm" tone="muted">{v.missingIds.length} entità non disponibili</Body>}
      <RoomClimateSection v={v} />
      <RoomTemperaturesSection v={v} />
      <RoomLightsSection v={v} />
      <RoomVacuumSection v={v} />
      <RoomMediaSection v={v} />
      <RoomOtherSections v={v} />
      <RoomTechnicalSection v={v} />
    </DetailsBody></div>
  );
}

export function RoomDetails(props: WidgetDetailsProps) {
  return <RoomScope settings={props.settings}>{settings => <RoomDetailsContent {...props} settings={settings} />}</RoomScope>;
}
