import { useState } from 'react';
import {
  Body,
  Button,
  Caption,
  Heading,
  IconText,
  Segmented,
  Surface,
  Text,
  Toggle,
} from '@/components/primitives';
import type { PageKindProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { isSonosMediaEntity } from '@/utils/mediaEntityClassification';
import { useNow, useServiceActions } from '../hooks/commands';
import { useMediaControls } from '../hooks/useMediaControls';
import {
  artworkPath,
  attrNumber,
  attrString,
  byFriendlyName,
  effectivePosition,
  isSonosActive,
  isTelevision,
  mediaPlayerIds,
  resolveImage,
  stringList,
  type Entity,
} from '../model/entity';
import { MediaIcon } from '../icons';
import { testi } from '../testi';
import { Artwork } from '../parts/Artwork';
import { CommandStatus, SeekBar, Transport, VolumeControl } from '../parts/Controls';
import { MediaChooser } from '../parts/MediaChooser';
import { PlayerList } from '../parts/PlayerList';
import '../media.css';

type PageMode = 'media' | 'sonos';
type SidePanel = 'players' | 'choose' | 'manage';

const nameOf = (entity: Entity | undefined, fallback: string) =>
  attrString(entity, 'friendly_name') || entity?.entity_id || fallback;

/**
 * Media and Sonos pages (legacy MediaPage with `mode`): the selected player with transport and
 * volume, the list of players with Sonos grouping and the content chooser. The choice of players
 * shown lives in the page settings sheet (`pageSettings[pageId].mediaIds`, all when absent). The page
 * settings (`mediaIds`, `activeId`) come from the launcher through PageKindProps.
 */
export function MediaPageView({
  mode,
  settings,
  onSaveSetting: save,
}: PageKindProps & { mode: PageMode }) {
  const { entities, conn, callService, getEntityImageUrl, entitiesLoaded } =
    useWidgetRuntime();
  const visible = usePageVisible();
  const now = useNow(1000, visible);
  const [panel, setPanel] = useState<SidePanel>('players');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const groupActions = useServiceActions();
  const sonosMode = mode === 'sonos';

  const allMediaIds = mediaPlayerIds(entities).filter(
    (id) => isSonosMediaEntity(entities[id]) === sonosMode
  );
  const showAll = !Array.isArray(settings.mediaIds);
  const selectedIds = showAll ? allMediaIds : stringList(settings.mediaIds);
  const mediaEntities = selectedIds
    .map((id) => entities[id])
    .filter((entity): entity is Entity => Boolean(entity));
  const activeSonos = mediaEntities.filter((entity) => isSonosMediaEntity(entity) && isSonosActive(entity, now));
  const current =
    mediaEntities.find((entity) => entity.entity_id === settings.activeId) ??
    mediaEntities.find((entity) => entity.entity_id === selectedId) ??
    activeSonos[0] ??
    mediaEntities[0];
  const currentId = current?.entity_id ?? null;
  const controls = useMediaControls(currentId);

  const isPlayerActive = (entity: Entity) =>
    isSonosMediaEntity(entity) ? isSonosActive(entity, now) : entity.state === 'playing';
  const players = mediaEntities.slice().sort((a, b) => {
    const diff = Number(isPlayerActive(b)) - Number(isPlayerActive(a));
    return diff !== 0 ? diff : byFriendlyName(a, b);
  });
  const groupMembers = stringList(current?.attributes?.group_members);
  const groupedOthers = groupMembers.filter((id) => id !== currentId);
  const activePanel: SidePanel = !sonosMode && panel === 'manage' ? 'players' : panel;

  const selectPlayer = (id: string) => {
    save('activeId', id);
    setSelectedId(id);
  };
  const isAdded = (id: string) => (showAll ? allMediaIds.includes(id) : selectedIds.includes(id));
  const togglePlayer = (id: string) => {
    if (isAdded(id)) {
      const next = (showAll ? allMediaIds : selectedIds).filter((item) => item !== id);
      save('mediaIds', next);
      if (id === currentId && next.length > 0) setSelectedId(next[0]);
      return;
    }
    if (showAll || selectedIds.includes(id)) return;
    save('mediaIds', [...selectedIds, id]);
  };
  const toggleGroupAll = () => {
    if (!sonosMode || !conn || !currentId) return;
    if (groupedOthers.length > 0) {
      groupedOthers.forEach((id) =>
        groupActions.run('group', () => callService('media_player', 'unjoin', { entity_id: id }))
      );
      return;
    }
    const others = players.map((player) => player.entity_id).filter((id) => id !== currentId);
    if (others.length > 0) {
      groupActions.run('group', () =>
        callService('media_player', 'join', { entity_id: currentId, group_members: others })
      );
    }
  };
  const toggleMember = (id: string, member: boolean) => {
    if (!currentId) return;
    groupActions.run(`member:${id}`, () =>
      member
        ? callService('media_player', 'unjoin', { entity_id: id })
        : callService('media_player', 'join', { entity_id: currentId, group_members: [id] })
    );
  };

  const switchRow = (id: string) => {
    const name = nameOf(entities[id], id);
    return (
      <li key={id} className="aca-media-player">
        <span className="aca-media-text aca-media-grow">
          <Text className="aca-type aca-type--body-sm" tone="ink">
            {name}
          </Text>
          <Caption translate="no">{id}</Caption>
        </span>
        <Toggle
          compact
          checked={isAdded(id)}
          aria-label={name}
          onClick={() => togglePlayer(id)}
        />
      </li>
    );
  };

  if (!current || !currentId) {
    return (
      <div className="aca-media-page" data-mode={mode}>
        <Surface className="aca-media-page__empty" contentClassName="aca-media-widget__state" role="status">
          <MediaIcon name="speaker" size="xl" tone="muted" />
          <Heading level={2} size="md">
            {!entitiesLoaded
              ? testi.caricamentoLettore
              : sonosMode
                ? testi.nessunLettoreSonos
                : testi.nessunLettore}
          </Heading>
          {entitiesLoaded && (
            <Body size="sm" tone="muted">
              {sonosMode ? testi.nessunLettoreSonosNota : testi.nessunLettoreNota}
            </Body>
          )}
        </Surface>
      </div>
    );
  }

  const duration = attrNumber(current, 'media_duration') ?? 0;
  const subtitle = attrString(current, 'media_artist') || attrString(current, 'media_album_name');
  const panels = [
    { value: 'players' as const, label: testi.lettori },
    { value: 'choose' as const, label: testi.contenuti },
    ...(sonosMode ? [{ value: 'manage' as const, label: testi.gestisci }] : []),
  ];

  return (
    <div className="aca-media-page" data-mode={mode}>
      <div className="aca-media-page__grid">
        <Surface className="aca-media-page__now" contentClassName="aca-media-section" aria-label={sonosMode ? testi.sonos : testi.media}>
          <IconText icon={sonosMode ? 'speaker' : 'music'} iconSize="sm" tone="muted">
            {sonosMode ? `${testi.sonos} · ${testi.lettoriAttivi(players.length)}` : testi.media}
          </IconText>
          <div className="aca-media-row aca-media-row--top">
            <Artwork
              src={resolveImage(artworkPath(current), getEntityImageUrl)}
              alt={attrString(current, 'media_title') || nameOf(current, currentId)}
              icon={isTelevision(current) ? 'tv' : 'speaker'}
              variant="large"
            />
            <div className="aca-media-text aca-media-grow">
              <Caption>{nameOf(current, currentId)}</Caption>
              <Heading level={2} size="lg">
                {attrString(current, 'media_title') || testi.sconosciuto}
              </Heading>
              {subtitle && <Body size="sm">{subtitle}</Body>}
            </div>
          </div>
          {duration > 0 && (
            <SeekBar
              controls={controls}
              position={effectivePosition(current, now)}
              duration={duration}
              now={now}
            />
          )}
          <Transport controls={controls} variant="full" showPower />
          <VolumeControl controls={controls} />
          <CommandStatus error={controls.error || groupActions.failed !== null} />
        </Surface>

        <Surface className="aca-media-page__side" contentClassName="aca-media-section aca-media-page__side-content">
          <div className="aca-media-row aca-media-row--between aca-media-row--wrap">
            <Segmented<SidePanel> options={panels} value={activePanel} onChange={setPanel} label={testi.vista} size="sm" />
            {sonosMode && activePanel === 'players' && players.length > 1 && (
              <Button
                variant="control"
                size="sm"
                loading={groupActions.busy === 'group'}
                onClick={toggleGroupAll}
              >
                <MediaIcon name="link" size="sm" />
                {groupedOthers.length > 0 ? testi.separaTutti : testi.raggruppaTutti}
              </Button>
            )}
          </div>
          <div className="aca-media-page__scroll">
            {activePanel === 'players' && (
              <PlayerList
                players={players}
                currentId={currentId}
                onSelect={selectPlayer}
                isActive={isPlayerActive}
                nameOf={(entity) => nameOf(entity, entity.entity_id)}
                subtitleOf={(entity) => attrString(entity, 'media_title') || testi.sconosciuto}
                canGroup={sonosMode && players.length > 1}
                groupMembers={groupMembers}
                onToggleMember={toggleMember}
              />
            )}
            {activePanel === 'choose' && <MediaChooser entityId={currentId} open />}
            {activePanel === 'manage' && (
              <div className="aca-media-section">
                <Caption>{testi.selezionaLettoriNota}</Caption>
                <ul className="aca-media-players">
                  {allMediaIds
                    .filter((id) => isSonosMediaEntity(entities[id]))
                    .sort((a, b) => nameOf(entities[a], a).localeCompare(nameOf(entities[b], b)))
                    .map(switchRow)}
                </ul>
                {allMediaIds.length === 0 && <Caption>{testi.nessunSonosDisponibile}</Caption>}
              </div>
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}

export function MediaKindPage(props: PageKindProps) {
  return <MediaPageView {...props} mode="media" />;
}

export function SonosKindPage(props: PageKindProps) {
  return <MediaPageView {...props} mode="sonos" />;
}
