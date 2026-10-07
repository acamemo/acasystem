import { Button, Caption, Text } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { isSonosMediaEntity } from '@/utils/mediaEntityClassification';
import { MediaIcon } from '../icons';
import { artworkPath, resolveImage, type Entity } from '../model/entity';
import { testi } from '../testi';
import { Artwork } from './Artwork';

export interface PlayerListProps {
  players: Entity[];
  currentId: string | null;
  onSelect: (entityId: string) => void;
  isActive: (entity: Entity) => boolean;
  nameOf: (entity: Entity) => string;
  subtitleOf: (entity: Entity) => string;
  /** Sonos grouping: join/unjoin buttons next to the other players. */
  canGroup: boolean;
  groupMembers: readonly string[];
  onToggleMember: (entityId: string, isMember: boolean) => void;
  /** Hide the per-row group button when only one player is listed (media page rule). */
  disabled?: boolean;
}

/** Players of a group or page: select one, and group Sonos speakers with the selected one. */
export function PlayerList({
  players,
  currentId,
  onSelect,
  isActive,
  nameOf,
  subtitleOf,
  canGroup,
  groupMembers,
  onToggleMember,
  disabled = false,
}: PlayerListProps) {
  const { getEntityImageUrl } = useWidgetRuntime();
  return (
    <ul className="aca-media-players">
      {players.map((player) => {
        const playerId = player.entity_id;
        const selected = playerId === currentId;
        const member = groupMembers.includes(playerId);
        const name = nameOf(player);
        return (
          <li
            key={playerId}
            className={['aca-media-player', !isActive(player) && 'aca-media-player--idle']
              .filter(Boolean)
              .join(' ')}
          >
            <Button
              variant="control"
              size="md"
              shape="rounded"
              className="aca-media-player__select"
              contentClassName="aca-media-player__content"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onSelect(playerId)}
            >
              <Artwork
                src={resolveImage(artworkPath(player), getEntityImageUrl)}
                icon={isSonosMediaEntity(player) ? 'speaker' : 'music'}
                variant="small"
              />
              <span className="aca-media-text">
                <Text className="aca-type aca-type--body-sm" tone="ink">
                  {name}
                </Text>{' '}
                <Caption>{subtitleOf(player)}</Caption>
              </span>
              {player.state === 'playing' && (
                <span className="aca-media-show-13">
                  <MediaIcon name="music" size="sm" tone="active" />
                  <span className="sr-only">{testi.inRiproduzione}</span>
                </span>
              )}
            </Button>
            {canGroup && !selected && (
              <Button
                variant="control"
                shape="circle"
                size="md"
                aria-pressed={member}
                aria-label={member ? testi.togliDalGruppo(name) : testi.aggiungiAlGruppo(name)}
                disabled={disabled}
                onClick={() => onToggleMember(playerId, member)}
              >
                <MediaIcon name={member ? 'link' : 'add'} size="sm" />
              </Button>
            )}
            {canGroup && selected && groupMembers.length > 1 && (
              <span className="aca-media-linked">
                <MediaIcon name="link" size="sm" tone="info" />
                <Caption>{testi.collegato}</Caption>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
