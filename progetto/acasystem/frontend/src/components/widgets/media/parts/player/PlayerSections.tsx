import { Button, Caption, Heading, IconText, Text } from '@/components/primitives';
import { artworkPath, detailsSubtitle, resolveImage, attrString } from '../../model/entity';
import { MediaIcon } from '../../icons';
import { testi } from '../../testi';
import { CommandStatus, VolumeControl } from '../Controls';
import { MediaChooser } from '../MediaChooser';
import { NowPlaying } from '../NowPlaying';
import { PlayerList } from '../PlayerList';
import type { MediaDetailsState } from './useMediaDetailsState';

function stateLabel(state: string | undefined): string {
  if (state === 'playing') return testi.inRiproduzione;
  if (state === 'paused') return testi.inPausa;
  if (state === 'off') return testi.spento;
  if (state === 'unavailable' || state === 'unknown' || !state) return testi.nonDisponibile;
  return testi.acceso;
}

/** Now playing: artwork, title, state, playhead, transport and volume. */
export function PlayerNowSection({ media }: { media: MediaDetailsState }) {
  const { current, controls, groupActions, heading, displayName, icon, now } = media;
  return (
    <section className="aca-media-section" aria-label={heading}>
      <NowPlaying
        cover={{
          src: resolveImage(artworkPath(current), media.getEntityImageUrl),
          icon,
        }}
        eyebrow={<Caption>{heading}</Caption>}
        title={attrString(current, 'media_title') || testi.sconosciuto}
        subtitle={detailsSubtitle(current)}
        meta={
          <>
            <Caption tone="ink">{displayName}</Caption>
            <IconText
              icon={current.state === 'playing' ? 'activity' : 'info'}
              iconTone={current.state === 'playing' ? 'active' : undefined}
              iconSize="sm"
              tone="muted"
            >
              {controls.playing.pending ? testi.inAttesa : stateLabel(current.state)}
            </IconText>
          </>
        }
        seek={
          media.duration > 0
            ? { controls, position: media.position, duration: media.duration, now }
            : null
        }
        transport={{ controls, variant: 'full', showPower: true }}
      />
      <VolumeControl controls={controls} />
      <CommandStatus error={controls.error || groupActions.failed !== null} />
    </section>
  );
}

/** «Scegli contenuto»: the content chooser and the last choice, when the player can play media. */
export function PlayerChooseSection({ media }: { media: MediaDetailsState }) {
  const { controls, choosing, setChoosing, lastChoice, groupActions, currentId } = media;
  if (!controls.caps.playMedia) return null;
  return (
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
            onClick={() => media.playLast(lastChoice)}
          >
            <MediaIcon name="music" size="sm" />
            {testi.ultimaScelta(lastChoice.label)}
          </Button>
        )}
      </div>
      {choosing && (
        <>
          <Caption>{testi.scegliContenutoNota}</Caption>
          <MediaChooser entityId={currentId} open={choosing} onPlayed={media.rememberChoice} />
        </>
      )}
    </section>
  );
}

/** The players of the widget: select, join/unjoin, and the extra Sonos players of the browser. */
export function PlayerListSection({ media }: { media: MediaDetailsState }) {
  const { cardId, players, canGroup, groupMembers, groupActions, nameOf, treatAsSonos } = media;
  if (players.length <= 1 && !canGroup) return null;
  return (
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
            onClick={media.groupAll}
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
        currentId={media.currentId}
        onSelect={media.setSelectedId}
        isActive={media.isActive}
        nameOf={nameOf}
        subtitleOf={(entity) => attrString(entity, 'media_title') || testi.sconosciuto}
        canGroup={canGroup}
        groupMembers={groupMembers}
        onToggleMember={media.toggleMember}
      />
      {canGroup && (
        <div className="aca-media-section">
          <div className="aca-media-wrap">
            <Button
              variant="control"
              size="sm"
              aria-expanded={media.showAddSonos}
              onClick={() => media.setShowAddSonos((value) => !value)}
            >
              <MediaIcon name="add" size="sm" />
              {testi.aggiungiSonos}
            </Button>
          </div>
          {media.showAddSonos && (
            <div className="aca-media-section">
              {media.extraPlayers.map((player) => (
                <div key={player.entity_id} className="aca-media-row aca-media-row--between">
                  <Text className="aca-type aca-type--body-sm">{nameOf(player)}</Text>
                  <Button
                    variant="control"
                    size="sm"
                    aria-label={`${testi.togli}: ${nameOf(player)}`}
                    onClick={() => media.removeExtra(player.entity_id)}
                  >
                    {testi.togli}
                  </Button>
                </div>
              ))}
              {media.availableSonos.length === 0 ? (
                <Caption>{testi.nessunSonosDisponibile}</Caption>
              ) : (
                <div className="aca-media-wrap">
                  {media.availableSonos.map((player) => (
                    <Button
                      key={player.entity_id}
                      variant="control"
                      size="sm"
                      onClick={() => media.addExtra(player.entity_id)}
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
  );
}
