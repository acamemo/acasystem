import { Body } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { stringList } from '../model/entity';
import { testi } from '../testi';
import {
  PlayerChooseSection,
  PlayerListSection,
  PlayerNowSection,
} from '../parts/player/PlayerSections';
import {
  useGroupInitialId,
  useMediaDetailsState,
  type MediaDetailsInput,
} from '../parts/player/useMediaDetailsState';

/** What the details show when there is no player. */
export function MediaEmpty() {
  return (
    <div className="aca-media-details">
      <Body tone="muted" role="status">
        {testi.nessunLettore}
      </Body>
    </div>
  );
}

/**
 * Details of a media player or group (legacy MediaModal in «media» mode) in one column (the
 * sheet): now playing, playhead, transport, volume, «Scegli contenuto» and, for groups and Sonos
 * speakers, the player list with join/unjoin and the extra Sonos players kept in the browser.
 * The console (MediaConsole) lays out the same sections in two columns.
 */
function MediaDetailsView(input: MediaDetailsInput) {
  const media = useMediaDetailsState(input);
  if (!media) return <MediaEmpty />;
  return (
    <div className="aca-media-details">
      <PlayerNowSection media={media} />
      <PlayerChooseSection media={media} />
      <PlayerListSection media={media} />
    </div>
  );
}

/** Details of a `media_player.*` widget. */
export function MediaPlayerDetails({ id }: WidgetDetailsProps) {
  return <MediaDetailsView cardId={id} baseIds={[id]} initialId={id} isGroup={false} />;
}

/** Details of a `media_group_*` / `sonos_group_*` widget. */
export function MediaGroupDetails({ id, settings }: WidgetDetailsProps) {
  const initial = useGroupInitialId(settings);
  return (
    <MediaDetailsView
      cardId={id}
      baseIds={stringList(settings.mediaIds)}
      initialId={initial}
      isGroup
    />
  );
}
