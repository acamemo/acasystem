import { useState } from 'react';
import { Body, Button, Caption, Field, Segmented, Skeleton } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useServiceActions } from '../hooks/commands';
import { useMediaBrowse } from '../hooks/useMediaBrowse';
import { filterChoices, mergeChoices, normalizeChoices, type MediaChoice } from '../model/choices';
import { resolveImage } from '../model/entity';
import { testi } from '../testi';
import { Artwork } from './Artwork';
import { CommandStatus } from './Controls';

type ChooseTab = 'favorites' | 'playlists' | 'library' | 'search';

const TABS: ReadonlyArray<{ value: ChooseTab; label: string }> = [
  { value: 'favorites', label: testi.preferiti },
  { value: 'playlists', label: testi.playlist },
  { value: 'library', label: testi.libreria },
  { value: 'search', label: testi.cerca },
];

const EMPTY: Record<ChooseTab, string> = {
  favorites: testi.nessunPreferito,
  playlists: testi.nessunaPlaylist,
  library: testi.nessunContenuto,
  search: testi.nessunRisultato,
};

export interface MediaChooserProps {
  entityId: string;
  /** Loads the player's media tree only while shown. */
  open: boolean;
  /** Called after play_media was sent with the chosen content. */
  onPlayed?: (choice: MediaChoice) => void;
}

/**
 * «Scegli contenuto»: favourites, playlists, library and search over the player's media tree and
 * its Sonos attributes; a tile sends play_media (legacy MediaModal/MediaPage).
 */
export function MediaChooser({ entityId, open, onPlayed }: MediaChooserProps) {
  const { conn, entities, callService, getEntityImageUrl } = useWidgetRuntime();
  const [tab, setTab] = useState<ChooseTab>('favorites');
  const [query, setQuery] = useState('');
  const browse = useMediaBrowse(conn, entityId, open);
  const actions = useServiceActions();
  const entity = entities[entityId];

  const browsed = browse.choices ?? { favorites: [], playlists: [], library: [] };
  const favorites = mergeChoices(
    browsed.favorites,
    normalizeChoices(entity?.attributes?.sonos_favorites, 'music')
  );
  const playlists = mergeChoices(
    browsed.playlists,
    normalizeChoices(entity?.attributes?.sonos_playlists, 'playlist')
  );
  const library = mergeChoices(browsed.library);
  const lists: Record<ChooseTab, MediaChoice[]> = {
    favorites,
    playlists,
    library,
    search: filterChoices(mergeChoices(favorites, playlists, library), query),
  };
  const shown = lists[tab];

  const play = (choice: MediaChoice) => {
    actions.run(`play:${choice.type}::${choice.id}`, () =>
      callService('media_player', 'play_media', {
        entity_id: entityId,
        media_content_id: choice.id,
        media_content_type: choice.type || 'music',
      })
    );
    onPlayed?.(choice);
  };

  return (
    <div className="aca-media-section">
      <Segmented<ChooseTab>
        options={TABS}
        value={tab}
        onChange={setTab}
        label={testi.schede}
        size="sm"
      />
      {tab === 'search' && (
        <Field
          type="search"
          label={testi.cercaContenuto}
          placeholder={testi.cercaContenuto}
          icon="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      <div aria-busy={browse.loading || undefined}>
        {browse.error && (
          <div className="aca-media-row aca-media-row--between">
            <Caption tone="danger" role="status">
              {testi.erroreContenuti}
            </Caption>
            <Button variant="control" size="sm" onClick={browse.retry}>
              {testi.riprova}
            </Button>
          </div>
        )}
        {browse.loading && shown.length === 0 ? (
          <Skeleton variant="list" rows={3} label={testi.caricamentoContenuti} />
        ) : shown.length > 0 ? (
          <div className="aca-media-choices">
            {shown.map((choice) => {
              const key = `${choice.type}::${choice.id}`;
              const image = resolveImage(choice.image, getEntityImageUrl);
              return (
                <Button
                  key={key}
                  variant="control"
                  shape="rounded"
                  size="md"
                  className="aca-media-choice"
                  contentClassName="aca-media-choice__content"
                  loading={actions.busy === `play:${key}`}
                  onClick={() => play(choice)}
                >
                  <Artwork
                    src={image}
                    icon={tab === 'favorites' ? 'heart' : 'music'}
                    variant="window"
                  />
                  <Body as="span" size="sm" className="aca-media-choice__label">
                    {choice.label}
                  </Body>
                  <Caption>{choice.source || choice.type || testi.fonteSconosciuta}</Caption>
                </Button>
              );
            })}
          </div>
        ) : (
          <Body size="sm" tone="muted" role="status">
            {EMPTY[tab]}
          </Body>
        )}
        {browse.loading && shown.length > 0 && (
          <span className="sr-only" role="status">
            {testi.caricamentoContenuti}
          </span>
        )}
      </div>
      <CommandStatus error={actions.failed !== null} />
    </div>
  );
}
