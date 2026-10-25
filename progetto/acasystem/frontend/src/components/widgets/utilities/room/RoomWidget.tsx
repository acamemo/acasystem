import { useId, type ReactNode } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import type { LauncherApi, WidgetProps } from '@/@types/launcher';
import { useLauncher } from '@/hooks/launcher/LauncherContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { settingString } from '../shared/entity';
import { formatCompact, lightsOnText } from '../shared/format';
import { CommandToggle } from '../shared/controls';
import { CardMessage, CardSkeleton, Chip, IconWell, UtilityCard } from '../shared/UtilityCard';
import { roomFlags, roomSummary } from './roomData';

export const ROOM_DEFAULT_NAME = 'Stanza';

export function roomName(
  id: string,
  settings: CardSettings,
  customNames: Record<string, string>
): string {
  return customNames[id] || settingString(settings, 'areaName') || ROOM_DEFAULT_NAME;
}

/** Pager index of a launcher page (0 is the cover when it is enabled; hidden pages are skipped). */
export function pagerIndex(launcher: Pick<LauncherApi, 'layout'>, pageId: string): number {
  const visible = launcher.layout.pages.filter((page) => !page.hidden);
  const index = visible.findIndex((page) => page.id === pageId);
  if (index < 0) return -1;
  return index + (launcher.layout.cover.enabled ? 1 : 0);
}

function RoomView({
  id,
  settings,
  size,
  editMode,
  onOpen,
  openLabel,
}: WidgetProps & { onOpen: () => void; openLabel: string }) {
  const runtime = useWidgetRuntime();
  const labelId = `luce-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const name = roomName(id, settings, runtime.customNames);
  const row = size.h <= 1;
  const card = (children: ReactNode) => (
    <UtilityCard openLabel={openLabel} onOpen={onOpen} editMode={editMode} row={row}>
      {children}
    </UtilityCard>
  );

  if (!runtime.entitiesLoaded) return card(<CardSkeleton label={`Caricamento di ${name}…`} />);

  const flags = roomFlags(settings);
  const room = roomSummary(runtime.entities, settings, runtime.haConfig);
  if (room.ids.length === 0) {
    return card(
      <CardMessage icon="room" title={name} detail="Nessun dispositivo associato alla stanza" />
    );
  }

  const temperature =
    flags.showTemp && room.temperature !== null
      ? `${formatCompact(room.temperature, 1)} ${room.temperatureUnit}`
      : null;
  const occupied = flags.showMotion && flags.showOccupiedIndicator && room.occupied;
  const mainLight = room.mainLightId ? runtime.entities[room.mainLightId] : undefined;

  const lightToggle = room.mainLightId ? (
    <span className="utility-actions">
      <span className="sr-only" id={labelId}>
        Luce principale di {name}
      </span>
      <CommandToggle
        entity={mainLight}
        entityId={room.mainLightId}
        domain="light"
        labelledBy={labelId}
      />
    </span>
  ) : null;

  const chips = (
    <>
      {occupied && (
        <span className="utility-show-narrow">
          <Chip icon="motion" tone="info" label={room.occupancyLabel} />
        </span>
      )}
      {temperature && <Chip icon="thermostat">{temperature}</Chip>}
      {flags.showLightChip && flags.showLights && room.lightsOn > 0 && (
        <Chip icon="light" tone="active" label={lightsOnText(room.lightsOn)}>
          {room.lightsOn}
        </Chip>
      )}
      {flags.showMediaChip && room.mediaPlaying > 0 && (
        <Chip icon="speaker" label={`${room.mediaPlaying} in riproduzione`}>
          {room.mediaPlaying}
        </Chip>
      )}
      {flags.showActiveChip && room.activeDevices > 0 && (
        <Chip icon="switch" label={`${room.activeDevices} dispositivi attivi`}>
          {room.activeDevices}
        </Chip>
      )}
      {flags.showVacuumChip && room.vacuumLabel && (
        <Chip icon="vacuum" tone={room.vacuumTone}>
          {room.vacuumLabel}
        </Chip>
      )}
      {flags.showCoverChip && room.coverLabel && <Chip icon="blinds">{room.coverLabel}</Chip>}
      {flags.showDoorChip && room.doorOpen && (
        <Chip icon="warning" tone="active">
          Porta aperta
        </Chip>
      )}
    </>
  );

  if (row) {
    return card(
      <>
        <IconWell
          icon="room"
          tone={room.lightsOn > 0 ? 'active' : null}
          className="utility-hide-narrow"
        />
        <div className="utility-stack utility-grow">
          <Body as="span" size="sm" tone="ink" className="utility-truncate">
            {name}
          </Body>
          <Caption className="utility-truncate">
            {[
              temperature,
              room.lightsOn > 0 ? lightsOnText(room.lightsOn) : null,
              occupied ? room.occupancyLabel : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Tutto spento'}
          </Caption>
        </div>
        {lightToggle}
      </>
    );
  }

  return card(
    <>
      <div className="utility-head">
        <IconWell icon="room" tone={room.lightsOn > 0 ? 'active' : null} />
        <div className="utility-head__text">
          <Body as="span" size="md" tone="ink" className="utility-truncate">
            {name}
          </Body>
        </div>
        {occupied && (
          <div className="utility-head__aside utility-hide-narrow">
            <Chip icon="motion" tone="info">
              {room.occupancyLabel}
            </Chip>
          </div>
        )}
      </div>
      <div className="utility-chips utility-grow">{chips}</div>
      {lightToggle && (
        <div className="utility-split">
          <Caption aria-hidden="true" className="utility-hide-narrow">
            Luce principale
          </Caption>
          {lightToggle}
        </div>
      )}
    </>
  );
}

function NavigatingRoom(props: WidgetProps & { pageId: string }) {
  const runtime = useWidgetRuntime();
  const launcher = useLauncher();
  const name = roomName(props.id, props.settings, runtime.customNames);
  const index = pagerIndex(launcher, props.pageId);
  return (
    <RoomView
      {...props}
      openLabel={index >= 0 ? `${name}, vai alla pagina della stanza` : `${name}, apri i dettagli`}
      onOpen={() => (index >= 0 ? launcher.goToPage(index) : runtime.openDetails(props.id))}
    />
  );
}

/** Summary of an area: temperature, lights, presence, devices and the main light (`room_card_*`). */
export function RoomWidget(props: WidgetProps) {
  const runtime = useWidgetRuntime();
  const pageId =
    props.settings.navigateOnTap === true
      ? settingString(props.settings, 'navigateToPageId')
      : null;
  if (pageId) return <NavigatingRoom {...props} pageId={pageId} />;
  const name = roomName(props.id, props.settings, runtime.customNames);
  return (
    <RoomView
      {...props}
      openLabel={`${name}, apri i dettagli`}
      onOpen={() => runtime.openDetails(props.id)}
    />
  );
}
