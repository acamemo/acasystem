import { useState } from 'react';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { isSonosMediaEntity } from '@/utils/mediaEntityClassification';
import { useNow, useServiceActions } from '../../hooks/commands';
import { useMediaControls } from '../../hooks/useMediaControls';
import {
  applyPlayerNameFilter,
  attrNumber,
  attrString,
  byFriendlyName,
  effectivePosition,
  isChannel,
  isMediaActive,
  isSonosActive,
  mediaPlayerIds,
  serverName,
  stringList,
  type Entity,
} from '../../model/entity';
import {
  readExtraPlayers,
  readLastChoices,
  readNameFilter,
  readSessionSensors,
  saveExtraPlayers,
  saveLastChoice,
  type LastChoice,
} from '../../model/storage';
import { type MediaIconName } from '../../icons';
import { testi } from '../../testi';
import { selectGroupPlayer } from '../../widgets/MediaWidgets';

const unique = (ids: string[]) => [...new Set(ids)];

export interface MediaDetailsInput {
  /** Widget id: its custom name titles a group. */
  cardId: string;
  /** Players of the widget (one player, or the group members). */
  baseIds: string[];
  initialId: string | null;
  isGroup: boolean;
}

/** The player a group widget starts on (the one that is playing, else the saved or first one). */
export function useGroupInitialId(settings: WidgetDetailsProps['settings']): string | null {
  const { entities } = useWidgetRuntime();
  const [initial] = useState(() => {
    const ids = stringList(settings.mediaIds);
    return (
      selectGroupPlayer(entities, ids, settings.activeId, Date.now()).current?.entity_id ?? null
    );
  });
  return initial;
}

/**
 * Everything the sections of the player details share (sheet and console alike): the players of
 * the widget, the one that is shown, its controls, the grouping and the content choice. Null when
 * there is no player to show. The logic lives here once; the sections only draw.
 */
export function useMediaDetailsState({ cardId, baseIds, initialId, isGroup }: MediaDetailsInput) {
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

  if (!current || !currentId) return null;

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
  const icon: MediaIconName = isChannel(current) ? 'tv' : isCurrentSonos ? 'speaker' : 'music';

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
  const addExtra = (playerId: string) => {
    updateExtras(unique([...extras, playerId]));
    setShowAddSonos(false);
  };
  const removeExtra = (playerId: string) => updateExtras(extras.filter((id) => id !== playerId));
  const extraPlayers = extras
    .map((id) => entities[id])
    .filter((entity): entity is Entity => Boolean(entity));
  const availableSonos = sonosIds
    .filter((id) => id !== currentId && !mediaIds.includes(id))
    .map((id) => entities[id])
    .filter((entity): entity is Entity => Boolean(entity))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

  return {
    cardId,
    current,
    currentId,
    controls,
    groupActions,
    getEntityImageUrl,
    now,
    players,
    isActive,
    treatAsSonos,
    nameOf,
    displayName,
    heading,
    groupMembers,
    canGroup,
    position,
    duration,
    lastChoice,
    icon,
    choosing,
    setChoosing,
    showAddSonos,
    setShowAddSonos,
    setSelectedId,
    groupAll,
    toggleMember,
    playLast,
    rememberChoice,
    extraPlayers,
    addExtra,
    removeExtra,
    availableSonos,
  };
}

export type MediaDetailsState = NonNullable<ReturnType<typeof useMediaDetailsState>>;
