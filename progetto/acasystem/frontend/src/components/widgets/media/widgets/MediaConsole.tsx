import { mediaProductBinding } from '../../home/media/productMediaModel';
import { ProductMediaConsole } from '../../home/media/ProductMediaDetails';
import { ConsoleColumns } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { stringList } from '../model/entity';
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
import { MediaEmpty } from './MediaDetails';

/**
 * Content of the player console (Console primitive): the sections of the sheet in two columns.
 * Left, now playing: artwork, title, playhead, transport, volume. Right, what to play and where:
 * «Scegli contenuto» and the players (grouping, extra Sonos). On a narrow screen the columns
 * stack in that order.
 */
function MediaConsoleView(input: MediaDetailsInput) {
  const media = useMediaDetailsState(input);
  if (!media) return <MediaEmpty />;
  return (
    <ConsoleColumns
      main={<PlayerNowSection media={media} />}
      side={
        <>
          <PlayerChooseSection media={media} />
          <PlayerListSection media={media} />
        </>
      }
    />
  );
}

/** Console of a `media_player.*` widget. */
export function MediaPlayerConsole(props: WidgetDetailsProps) {
  if (mediaProductBinding(props.settings)) return <ProductMediaConsole {...props} />;
  return <LegacyMediaPlayerConsole {...props} />;
}
function LegacyMediaPlayerConsole({ id }: WidgetDetailsProps) {
  return <MediaConsoleView cardId={id} baseIds={[id]} initialId={id} isGroup={false} />;
}

/** Console of a `media_group_*` / `sonos_group_*` widget. */
export function MediaGroupConsole(props: WidgetDetailsProps) {
  if (mediaProductBinding(props.settings)) return <ProductMediaConsole {...props} />;
  return <LegacyMediaGroupConsole {...props} />;
}
function LegacyMediaGroupConsole({ id, settings }: WidgetDetailsProps) {
  const initial = useGroupInitialId(settings);
  return (
    <MediaConsoleView
      cardId={id}
      baseIds={stringList(settings.mediaIds)}
      initialId={initial}
      isGroup
    />
  );
}
