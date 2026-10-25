import { useState } from 'react';
import { Body, Button, Caption, Heading, IconText, Text } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { isSonosMediaEntity } from '@/utils/mediaEntityClassification';
import { useNow, useServiceActions } from '../hooks/commands';
import { useMediaControls } from '../hooks/useMediaControls';
import {
  applyPlayerNameFilter,
  artworkPath,
  attrNumber,
  attrString,
  byFriendlyName,
  detailsSubtitle,
  effectivePosition,
  isChannel,
  isMediaActive,
  isSonosActive,
  mediaPlayerIds,
  resolveImage,
  serverName,
  stringList,
  type Entity,
} from '../model/entity';
import {
  readExtraPlayers,
  readLastChoices,
  readNameFilter,
  readSessionSensors,
  saveExtraPlayers,
  saveLastChoice,
  type LastChoice,
} from '../model/storage';
import { MediaIcon } from '../icons';
import { testi } from '../testi';
import { Artwork } from '../parts/Artwork';
import { CommandStatus, SeekBar, Transport, VolumeControl } from '../parts/Controls';
import { MediaChooser } from '../parts/MediaChooser';
import { PlayerList } from '../parts/PlayerList';
import { selectGroupPlayer } from './MediaWidgets';

const unique = (ids: string[]) => [...new Set(ids)];

function stateLabel(state: string | undefined): string {
  if (state === 'playing') return testi.inRiproduzione;
  if (state === 'paused') return testi.inPausa;
  if (state === 'off') return testi.spento;
  if (state === 'unavailable' || state === 'unknown' || !state) return testi.nonDisponibile;
  return testi.acceso;
}

interface MediaDetailsViewProps {
  /** Widget id: its custom name titles a group. */
  cardId: string;
  /** Players of the widget (one player, or the group members). */
  baseIds: string[];
  initialId: string | null;
  isGroup: boolean;
}

/**
 * Details of a media player or group (legacy MediaModal in «media» mode): now playing, playhead,
 * transport, volume, «Scegli contenuto» and, for groups and Sonos speakers, the player list with
 * join/unjoin and the extra Sonos players kept in the browser.
 */
function MediaDetailsView({ cardId, baseIds, initialId, isGroup }: MediaDetailsViewProps) {
  const { entities, getEntityImageUrl, customNames, callService } = useWidgetRuntime();
  const visible = usePageVisible();
  const now = useNow(1000, visible);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [extras, setExtras] = useState<string[]>(readExtraPlayers);
  const [choosing, setChoosing] = useState(false);
  const [showAddSonos, setShowAddSonos] = useState(false);
  const [lastChoices, setLastChoices] = useState<Record<string, LastChoice>>(readLastChoices);
  const [nameFilter] = useState(readNameFilter);
  const [sessionSensors] = useState(readSessionSensors);
  const groupActions = useServiceActions();

  const sonosIds = mediaPlayerIds(entities).filter((id) => isSonosMediaEntity(entities[id]));
  const fallbackId = mediaPlayerIds(entities).find((id) => isMediaActive(entities[id], now));
  const base = baseIds.length > 0 ? baseIds : fallbackId ? [fallbackId] : [];
  const baseSonos = base.length > 0 && base.every((id) => isSonosMediaEntity(entities[id]));
  const mediaIds = unique([...base, ...(baseSonos ? extras : [])]);
  const members = mediaIds
    .map((id) => entities[id])
    .filter((entity): entity is Entity => Boolean(entity));
  const treatAsSonos = members.length > 0 && members.every((entity) => isSonosMediaEntity(entity));
  const isActive = (entity: Entity) =>
    treatAsSonos ? isSonosActive(entity, now) : isMediaActive(entity, now);
  const players = members.slice().sort((a, b) => {
    const activeDiff = Number(isActive(b)) - Number(isActive(a));
    return activeDiff !== 0 ? activeDiff : byFriendlyName(a, b);
  });
  const current =
    members.find((entity) => entity.entity_id === selectedId) ??
    members.find(isActive) ??
    members[0];
  const currentId = current?.entity_id ?? null;
  const controls = useMediaControls(currentId);

  if (!current || !currentId) {
    return (
      <div className="aca-media-details">
        <Body tone="muted" role="status">
          {testi.nessunLettore}
        </Body>
      </div>
    );
  }

  const sessions = sessionSensors.flatMap((sensorId) => {
    const value = entities[sensorId]?.attributes?.sessions;
    return Array.isArray(value) ? value : [];
  });
  const userOf = (entity: Entity) => {
    const playerName = attrString(entity, 'friendly_name').toLowerCase();
    const match = sessions.find((session: unknown) => {
      if (typeof session !== 'object' || session === null) return false;
      const device = String((session as { device_name?: unknown }).device_name ?? '');
      return Boolean(device && playerName && playerName.includes(device.toLowerCase()));
    });
    return match ? String((match as { user_name?: unknown }).user_name ?? '') : '';
  };
  const nameOf = (entity: Entity) =>
    applyPlayerNameFilter(attrString(entity, 'friendly_name') || entity.entity_id, nameFilter);
  const currentUser = userOf(current);
  const displayName = currentUser ? `${currentUser} - ${nameOf(current)}` : nameOf(current);
  const isCurrentSonos = isSonosMediaEntity(current);
  const heading = isCurrentSonos
    ? testi.sonos
    : (isGroup && customNames[cardId]) || serverName(currentId) || testi.lettore;
  const groupMembers = stringList(current.attributes?.group_members);
  const canGroup = isCurrentSonos;
  const position = effectivePosition(current, now);
  const duration = attrNumber(current, 'media_duration') ?? 0;
  const lastChoice = lastChoices[currentId];
  const icon = isChannel(current) ? 'tv' : isCurrentSonos ? 'speaker' : 'music';

  const groupAll = () => {
    const allIds = players.map((player) => player.entity_id);
    const unjoined = allIds.filter((id) => !groupMembers.includes(id));
    if (unjoined.length > 0) {
      groupActions.run('group', () =>
        callService('media_player', 'join', { entity_id: currentId, group_members: unjoined })
      );
      return;
    }
    groupMembers
      .filter((id) => id !== currentId)
      .forEach((id) =>
        groupActions.run('group', () => callService('media_player', 'unjoin', { entity_id: id }))
      );
  };

  const toggleMember = (playerId: string, member: boolean) => {
    groupActions.run(`member:${playerId}`, () =>
      member
        ? callService('media_player', 'unjoin', { entity_id: playerId })
        : callService('media_player', 'join', { entity_id: currentId, group_members: [playerId] })
    );
  };

  const playLast = (choice: LastChoice) => {
    groupActions.run('last', () =>
      callService('media_player', 'play_media', {
        entity_id: currentId,
        media_content_id: choice.id,
        media_content_type: choice.type || 'music',
      })
    );
  };

  const rememberChoice = (choice: LastChoice) => {
    const saved = { id: choice.id, label: choice.label, type: choice.type || 'music' };
    saveLastChoice(currentId, saved);
    setLastChoices((prev) => ({ ...prev, [currentId]: saved }));
    setChoosing(false);
  };

  const updateExtras = (next: string[]) => {
    setExtras(next);
    saveExtraPlayers(next);
  };
  const availableSonos = sonosIds
    .filter((id) => id !== currentId && !mediaIds.includes(id))
    .map((id) => entities[id])
    .filter((entity): entity is Entity => Boolean(entity))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

  return (
    <div className="aca-media-details">
      <section className="aca-media-section" aria-label={heading}>
        <div className="aca-media-row aca-media-row--top">
          <Artwork
            src={resolveImage(artworkPath(current), getEntityImageUrl)}
            icon={icon}
            variant="large"
          />
          <div className="aca-media-text aca-media-grow">
            <Caption>{heading}</Caption>
            <Heading level={3} size="lg">
              {attrString(current, 'media_title') || testi.sconosciuto}
            </Heading>
            {detailsSubtitle(current) && <Body size="sm">{detailsSubtitle(current)}</Body>}
            <Caption tone="ink">{displayName}</Caption>
            <IconText
              icon={current.state === 'playing' ? 'activity' : 'info'}
              iconTone={current.state === 'playing' ? 'active' : undefined}
              iconSize="sm"
              tone="muted"
            >
              {controls.playing.pending ? testi.inAttesa : stateLabel(current.state)}
            </IconText>
          </div>
        </div>
        {duration > 0 && (
          <SeekBar controls={controls} position={position} duration={duration} now={now} />
        )}
        <Transport controls={controls} variant="full" showPower />
        <VolumeControl controls={controls} />
        <CommandStatus error={controls.error || groupActions.failed !== null} />
      </section>

      {controls.caps.playMedia && (
        <section className="aca-media-section" aria-label={testi.scegliContenuto}>
          <div className="aca-media-wrap">
            <Button
              variant="control"
              size="md"
              aria-expanded={choosing}
              onClick={() => setChoosing((value) => !value)}
            >
              <MediaIcon name="playlist" size="sm" />
              {testi.scegliContenuto}
            </Button>
            {lastChoice && (
              <Button
                variant="control"
                size="md"
                loading={groupActions.busy === 'last'}
                onClick={() => playLast(lastChoice)}
              >
                <MediaIcon name="music" size="sm" />
                {testi.ultimaScelta(lastChoice.label)}
              </Button>
            )}
          </div>
          {choosing && (
            <>
              <Caption>{testi.scegliContenutoNota}</Caption>
              <MediaChooser entityId={currentId} open={choosing} onPlayed={rememberChoice} />
            </>
          )}
        </section>
      )}

      {(players.length > 1 || canGroup) && (
        <section className="aca-media-section" aria-labelledby={`${cardId}-lettori`}>
          <div className="aca-media-row aca-media-row--between">
            <Heading level={3} size="sm" id={`${cardId}-lettori`}>
              {treatAsSonos ? testi.lettoriSonos : testi.lettoriSelezionati}
            </Heading>
            {canGroup && players.length > 1 && (
              <Button
                variant="control"
                size="sm"
                loading={groupActions.busy === 'group'}
                onClick={groupAll}
              >
                <MediaIcon name="link" size="sm" />
                {players.every((player) => groupMembers.includes(player.entity_id))
                  ? testi.separaTutti
                  : testi.raggruppaTutti}
              </Button>
            )}
          </div>
          <PlayerList
            players={players}
            currentId={currentId}
            onSelect={setSelectedId}
            isActive={isActive}
            nameOf={nameOf}
            subtitleOf={(entity) => attrString(entity, 'media_title') || testi.sconosciuto}
            canGroup={canGroup}
            groupMembers={groupMembers}
            onToggleMember={toggleMember}
          />
          {canGroup && (
            <div className="aca-media-section">
              <div className="aca-media-wrap">
                <Button
                  variant="control"
                  size="sm"
                  aria-expanded={showAddSonos}
                  onClick={() => setShowAddSonos((value) => !value)}
                >
                  <MediaIcon name="add" size="sm" />
                  {testi.aggiungiSonos}
                </Button>
              </div>
              {showAddSonos && (
                <div className="aca-media-section">
                  {extras
                    .map((id) => entities[id])
                    .filter((entity): entity is Entity => Boolean(entity))
                    .map((player) => (
                      <div key={player.entity_id} className="aca-media-row aca-media-row--between">
                        <Text className="aca-type aca-type--body-sm">{nameOf(player)}</Text>
                        <Button
                          variant="control"
                          size="sm"
                          aria-label={`${testi.togli}: ${nameOf(player)}`}
                          onClick={() =>
                            updateExtras(extras.filter((id) => id !== player.entity_id))
                          }
                        >
                          {testi.togli}
                        </Button>
                      </div>
                    ))}
                  {availableSonos.length === 0 ? (
                    <Caption>{testi.nessunSonosDisponibile}</Caption>
                  ) : (
                    <div className="aca-media-wrap">
                      {availableSonos.map((player) => (
                        <Button
                          key={player.entity_id}
                          variant="control"
                          size="sm"
                          onClick={() => {
                            updateExtras(unique([...extras, player.entity_id]));
                            setShowAddSonos(false);
                          }}
                        >
                          {nameOf(player)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** Details of a `media_player.*` widget. */
export function MediaPlayerDetails({ id }: WidgetDetailsProps) {
  return <MediaDetailsView cardId={id} baseIds={[id]} initialId={id} isGroup={false} />;
}

/** Details of a `media_group_*` / `sonos_group_*` widget. */
export function MediaGroupDetails({ id, settings }: WidgetDetailsProps) {
  const { entities } = useWidgetRuntime();
  const [initial] = useState(() => {
    const ids = stringList(settings.mediaIds);
    return (
      selectGroupPlayer(entities, ids, settings.activeId, Date.now()).current?.entity_id ?? null
    );
  });
  return (
    <MediaDetailsView
      cardId={id}
      baseIds={stringList(settings.mediaIds)}
      initialId={initial}
      isGroup
    />
  );
}
