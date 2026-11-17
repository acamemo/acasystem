import { useId, type ReactNode } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import type { LauncherApi, WidgetProps } from '@/@types/launcher';
import { useLauncher } from '@/hooks/launcher/LauncherContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { settingString } from '../shared/entity';
import { formatCompact, lightsOnText } from '../shared/format';
import { CardMessage, CardSkeleton, Chip, IconWell, UtilityCard } from '../shared/UtilityCard';
import { roomFlags, roomSummary } from './roomData';
import { RoomScope, useRoomContext } from './RoomScope';
import { RoomToggle } from './RoomToggle';
import { UtilityIcon } from '../shared/UtilityIcon';
import { useMeasuredHeight } from '../../home/shared/useMeasuredHeight';
import './room.css';

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
  const membership = useRoomContext();
  const labelId = `luce-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const name = roomName(id, settings, runtime.customNames);
  const row = size.h <= 1;
  const [bodyRef, measuredHeight] = useMeasuredHeight<HTMLDivElement>();
  const compact = measuredHeight !== null && measuredHeight < 176;
  const controlFits = measuredHeight === null || measuredHeight >= 144;
  const card = (children: ReactNode) => (
    <UtilityCard className="room-widget" openLabel={openLabel} onOpen={onOpen} editMode={editMode} row={row}>
      <div ref={bodyRef} className={`room-widget__body${row ? ' room-widget__body--row' : ''}`}>
      <span className="room-widget__mini" aria-hidden="true"><UtilityIcon name="room" size="sm" /></span>
      {children}
      </div>
    </UtilityCard>
  );

  if (!runtime.entitiesLoaded) return card(<CardSkeleton label={`Caricamento di ${name}…`} />);
  if (membership && membership.status !== 'ready') return card(<CardMessage icon="room" title={name}
    detail={membership.status === 'loading' ? 'Caricamento della stanza…' : membership.status === 'missing'
      ? 'Area non più disponibile' : membership.status === 'offline' ? 'Casa non collegata' : 'Stanza non disponibile'} />);

  const flags = roomFlags(settings);
  const connectionLabel = membership?.registryStatus === 'offline' ? 'Casa non collegata'
    : membership?.registryStatus === 'error' ? 'Dispositivi da verificare' : null;
  const room = roomSummary(runtime.entities, membership?.technicalIds.length
    ? { ...settings, entityIds: (settings.entityIds as string[]).filter(id => !membership.technicalIds.includes(id)) }
    : settings, runtime.haConfig);
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

  const lightToggle = room.mainLightId && controlFits ? (
    <span className="utility-actions">
      <span className="sr-only" id={labelId}>
        Luce principale di {name}
      </span>
      <RoomToggle
        entity={mainLight}
        entityId={room.mainLightId}
        domain="light"
        label={`Luce principale di ${name}`}
      />
    </span>
  ) : null;

  // Warnings precede optional readings. A short tile keeps its actual control at full height;
  // the rest of the room remains available in the shared details.
  const priorities = [
    ['unavailable', room.unavailableCount > 0],
    ['door', flags.showDoorChip && room.doorOpen],
    ['temperature', Boolean(temperature)],
    ['lights', flags.showLightChip && flags.showLights && room.lightsOn > 0],
    ['occupied', Boolean(occupied)],
    ['media', flags.showMediaChip && room.mediaPlaying > 0],
    ['vacuum', flags.showVacuumChip && Boolean(room.vacuumLabel)],
    ['cover', flags.showCoverChip && Boolean(room.coverLabel)],
    ['active', flags.showActiveChip && room.activeDevices > 0],
  ] as const;
  const selected = new Set(priorities.filter(([, present]) => present)
    .slice(0, compact ? lightToggle ? 1 : 2 : 3).map(([key]) => key));
  const include = (key: (typeof priorities)[number][0]) => measuredHeight === null || selected.has(key);

  const chips = (
    <>
      {occupied && include('occupied') && (
        <span className="utility-show-narrow">
          <Chip icon="motion" tone="info" label={room.occupancyLabel} />
        </span>
      )}
      {temperature && include('temperature') && <Chip icon="thermostat">{temperature}</Chip>}
      {flags.showLightChip && flags.showLights && room.lightsOn > 0 && include('lights') && (
        <Chip icon="light" tone="active" label={lightsOnText(room.lightsOn)}>
          {room.lightsOn}
        </Chip>
      )}
      {flags.showMediaChip && room.mediaPlaying > 0 && include('media') && (
        <Chip icon="speaker" label={`${room.mediaPlaying} in riproduzione`}>
          {room.mediaPlaying}
        </Chip>
      )}
      {flags.showActiveChip && room.activeDevices > 0 && include('active') && (
        <Chip icon="switch" label={`${room.activeDevices} dispositivi attivi`}>
          {room.activeDevices}
        </Chip>
      )}
      {flags.showVacuumChip && room.vacuumLabel && include('vacuum') && (
        <Chip icon="vacuum" tone={room.vacuumTone}>
          {room.vacuumLabel}
        </Chip>
      )}
      {flags.showCoverChip && room.coverLabel && include('cover') && <Chip icon="blinds">{room.coverLabel}</Chip>}
      {flags.showDoorChip && room.doorOpen && include('door') && (
        <Chip icon="warning" tone="active">
          Porta aperta
        </Chip>
      )}
      {room.unavailableCount > 0 && include('unavailable') && <Chip icon="warning">{room.unavailableCount} non disponibili</Chip>}
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
              connectionLabel,
              temperature,
              room.lightsOn > 0 ? lightsOnText(room.lightsOn) : null,
              occupied ? room.occupancyLabel : null,
              room.mediaPlaying > 0 ? `${room.mediaPlaying} in riproduzione` : null,
              room.doorOpen ? 'Porta aperta' : null,
              room.vacuumLabel,
              room.coverLabel,
            ]
              .filter(Boolean)
              .slice(0, 3)
              .join(' · ') || (room.unavailableCount > 0 ? 'Dati non disponibili' : `${room.ids.length} entità associate`)}
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
          {connectionLabel && <Caption>{connectionLabel}</Caption>}
        </div>
        {occupied && !compact && (
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

function ScopedRoomWidget(props: WidgetProps) {
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

/** Summary and details share the same current area membership and command boundary. */
export function RoomWidget(props: WidgetProps) {
  return <RoomScope settings={props.settings}>{settings => <ScopedRoomWidget {...props} settings={settings} />}</RoomScope>;
}
