import { useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { Body, Caption, Heading, Sheet, Surface, Title } from '@/components/primitives';
import type { CardSettings, PageSettings } from '@/@types/dashboard';
import type { CellSize, PageKindProps, WidgetDefinition, WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { mediaWidgets } from '../index';
import { MediaKindPage, SonosKindPage } from '../views/MediaPage';

/*
 * Development-only gallery of the media widgets (preview-media.html): fixture entities, every
 * size between min and max, the states and the detail sheets. Not part of the production build.
 */

const now = () => new Date().toISOString();
const ART = '/1.Main.jpg';
const PHOTO = '/Main.png';

const live = (id: string, state: string, attributes: Record<string, unknown>): HassEntity => ({
  ...fixtureEntity(id, state, attributes),
  last_updated: now(),
});

function buildEntities(): HassEntity[] {
  return [
    live('media_player.soggiorno', 'playing', {
      friendly_name: 'Soggiorno',
      media_title: 'Blue in green',
      media_artist: 'Miles Davis',
      media_album_name: 'Kind of blue',
      entity_picture: ART,
      volume_level: 0.42,
      media_duration: 337,
      media_position: 95,
      media_position_updated_at: now(),
      shuffle: false,
      repeat: 'all',
      supported_features: 0xfffff,
    }),
    live('media_player.cucina', 'paused', {
      friendly_name: 'Cucina',
      media_title: 'Notiziario delle otto',
      media_artist: 'Radio 3',
      volume_level: 0.2,
      supported_features: 0xfffff,
    }),
    {
      ...fixtureEntity('media_player.camera', 'off', {
        friendly_name: 'Camera da letto',
        supported_features: 0xfffff,
      }),
      last_updated: '2026-01-01T00:00:00Z',
    },
    fixtureEntity('media_player.garage', 'unavailable', { friendly_name: 'Garage' }),
    live('media_player.sonos_sala', 'playing', {
      friendly_name: 'Sonos sala',
      media_title: 'So what',
      media_artist: 'Miles Davis',
      entity_picture: '/immagine-mancante.jpg',
      group_members: ['media_player.sonos_sala', 'media_player.sonos_studio'],
      volume_level: 0.35,
      sonos_favorites: [
        { title: 'Jazz della sera', media_content_id: 'fav:1', media_content_type: 'playlist' },
      ],
    }),
    live('media_player.sonos_studio', 'playing', {
      friendly_name: 'Sonos studio',
      media_title: 'Freddie freeloader',
      media_artist: 'Miles Davis',
      group_members: ['media_player.sonos_sala', 'media_player.sonos_studio'],
      volume_level: 0.3,
    }),
    live('media_player.tv_sala', 'on', {
      friendly_name: 'TV sala',
      app_name: 'YouTube',
      media_title: 'Concerto dal vivo',
      source_list: ['Netflix', 'YouTube', 'Prime Video'],
      // Like an LG webOS TV: level (VOLUME_SET), mute and steps.
      supported_features: 4 | 8 | 1024 | 128 | 256,
      volume_level: 0.3,
      is_volume_muted: false,
    }),
    // Like the Samsung UE50J6200: volume and mute declared, but no volume_level (step mode).
    live('media_player.tv_samsung', 'on', {
      friendly_name: 'Samsung camera',
      app_name: 'Netflix',
      media_title: 'Dark',
      supported_features: 24381,
      platform: 'samsungtv',
    }),
    live('media_player.emby_sala', 'playing', {
      friendly_name: 'Emby sala',
      media_title: 'Episodio 4',
      media_series_title: 'Dark',
      entity_picture: PHOTO,
    }),
    live('media_player.apple_tv', 'standby', {
      friendly_name: 'Apple TV studio',
      source_list: ['Musica', 'TV'],
    }),
    live('camera.ingresso', 'idle', { friendly_name: 'Ingresso', access_token: 'demo' }),
    live('camera.giardino', 'idle', { friendly_name: 'Giardino', access_token: 'demo' }),
    live('camera.box', 'unavailable', { friendly_name: 'Box auto' }),
    live('binary_sensor.movimento_ingresso', 'on', { friendly_name: 'Movimento ingresso' }),
  ];
}

const cardSettings: Record<string, CardSettings> = {
  media_group_1: {
    mediaIds: ['media_player.sonos_sala', 'media_player.sonos_studio'],
    activeId: 'media_player.sonos_sala',
  },
  androidtv_card_1: {
    mediaPlayerId: 'media_player.tv_sala',
    remoteId: 'remote.tv_sala',
    linkedMediaPlayers: ['media_player.emby_sala'],
  },
  androidtv_card_2: { mediaPlayerId: 'media_player.tv_sala', remoteId: 'remote.tv_sala' },
  androidtv_card_3: { mediaPlayerId: 'media_player.tv_samsung', remoteId: 'remote.tv_samsung' },
  appletv_card_1: {
    mediaPlayerId: 'media_player.apple_tv',
    remoteId: 'remote.apple_tv',
    tapAction: 'toggle',
  },
  camera_card_1: {
    cameraId: 'camera.ingresso',
    cameraRefreshMode: 'motion',
    cameraMotionSensor: 'binary_sensor.movimento_ingresso',
  },
  camera_card_2: { cameraId: 'camera.giardino', cameraStreamEngine: 'snapshot' },
  camera_card_3: { cameraId: 'camera.box' },
  camera_card_4: { cameraId: 'camera.cancello' },
  media_player_cover: { artworkMode: 'cover' },
};

/** Camera proxy paths of the fixtures point at the static images of public/. */
function imageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('/api/camera_proxy/camera.giardino'))
    return `${PHOTO}?${path.split('?')[1] ?? ''}`;
  if (path.startsWith('/api/camera_proxy/camera.ingresso'))
    return `${ART}?${path.split('?')[1] ?? ''}`;
  return path;
}

interface Sample {
  id: string;
  settingsKey?: string;
  size: CellSize;
  note: string;
}

const SAMPLES: Array<{ title: string; items: Sample[] }> = [
  {
    title: 'Lettore multimediale',
    items: [
      { id: 'media_player.soggiorno', size: { w: 2, h: 1 }, note: '2×1 in riproduzione' },
      { id: 'media_player.soggiorno', size: { w: 4, h: 1 }, note: '4×1' },
      { id: 'media_player.soggiorno', size: { w: 2, h: 2 }, note: '2×2' },
      { id: 'media_player.soggiorno', size: { w: 4, h: 2 }, note: '4×2' },
      {
        id: 'media_player.soggiorno',
        settingsKey: 'media_player_cover',
        size: { w: 2, h: 2 },
        note: '2×2 copertina estesa',
      },
      { id: 'media_player.cucina', size: { w: 2, h: 2 }, note: 'In pausa (attivo)' },
      { id: 'media_player.camera', size: { w: 2, h: 2 }, note: 'Spento, inattivo' },
      { id: 'media_player.garage', size: { w: 2, h: 1 }, note: 'Non disponibile' },
      { id: 'media_player.cantina', size: { w: 2, h: 1 }, note: 'Entità mancante' },
    ],
  },
  {
    title: 'Gruppo e Sonos',
    items: [
      {
        id: 'media_group_1',
        size: { w: 2, h: 2 },
        note: 'Gruppo Sonos, 2 lettori attivi, copertina rotta',
      },
      { id: 'media_group_1', size: { w: 4, h: 1 }, note: '4×1' },
    ],
  },
  {
    title: 'Televisori',
    items: [
      { id: 'androidtv_card_1', size: { w: 2, h: 2 }, note: 'Android TV con Emby collegato' },
      { id: 'androidtv_card_2', size: { w: 2, h: 1 }, note: 'Android TV 2×1, logo app' },
      { id: 'androidtv_card_2', size: { w: 3, h: 1 }, note: 'Android TV 3×1, manopola volume' },
      { id: 'androidtv_card_2', size: { w: 4, h: 1 }, note: 'Android TV 4×1' },
      { id: 'androidtv_card_2', size: { w: 4, h: 2 }, note: 'Android TV 4×2, manopola grande' },
      {
        id: 'androidtv_card_3',
        size: { w: 2, h: 2 },
        note: 'Samsung senza livello: volume a passi',
      },
      { id: 'androidtv_card_3', size: { w: 2, h: 1 }, note: 'Samsung 2×1' },
      {
        id: 'appletv_card_1',
        size: { w: 2, h: 2 },
        note: 'Apple TV in standby, tocco = accensione',
      },
      { id: 'appletv_card_1', size: { w: 2, h: 1 }, note: 'Apple TV 2×1' },
    ],
  },
  {
    title: 'Videocamere',
    items: [
      { id: 'camera_card_1', size: { w: 2, h: 2 }, note: 'Movimento rilevato' },
      { id: 'camera_card_2', size: { w: 4, h: 2 }, note: '4×2' },
      { id: 'camera_card_1', size: { w: 2, h: 1 }, note: '2×1' },
      { id: 'camera_card_3', size: { w: 2, h: 1 }, note: 'Non disponibile' },
      { id: 'camera_card_4', size: { w: 2, h: 1 }, note: 'Entità mancante' },
    ],
  },
];

const definitionFor = (id: string): WidgetDefinition | undefined =>
  mediaWidgets.find((definition) => definition.matches(id, {}));

/**
 * Cell with the same kit frame the launcher (WidgetHost) draws around every widget: static, and
 * pressed only by the widget's details opener ([data-widget-open], preview.css).
 */
function Cell({ size, children }: { size: CellSize; children: ReactNode }) {
  return (
    <div className="preview-cell" style={{ '--w': size.w, '--h': size.h } as CSSProperties}>
      <Surface
        behavior="static"
        className="aca-m--fill preview-frame"
        contentClassName="preview-frame__content"
      >
        {children}
      </Surface>
    </div>
  );
}

/** A special page with its settings kept in memory, as the launcher passes them (PageKindProps). */
function PreviewKindPage({ Page, pageId }: { Page: ComponentType<PageKindProps>; pageId: string }) {
  const [settings, setSettings] = useState<PageSettings>({});
  return (
    <Page
      pageId={pageId}
      settings={settings}
      onSaveSetting={(key, value) => setSettings((previous) => ({ ...previous, [key]: value }))}
    />
  );
}

export default function PreviewMedia() {
  const [editMode, setEditMode] = useState(false);
  const [open, setOpen] = useState<{ id: string; settingsKey: string } | null>(null);
  const entities = useMemo(() => fixtureEntities(buildEntities()), []);
  const runtime: WidgetRuntime = useMemo(
    () =>
      createFixtureRuntime({
        entities,
        cardSettings,
        callService: async (domain, service, data) => {
          console.warn('callService', domain, service, data);
        },
        getEntityImageUrl: imageUrl,
        openDetails: (id) => setOpen({ id, settingsKey: id }),
        editMode,
      }),
    [entities, editMode]
  );
  const pendingRuntime = useMemo(
    () => ({ ...runtime, callService: () => new Promise<unknown>(() => undefined) }),
    [runtime]
  );
  const failingRuntime = useMemo(
    () => ({ ...runtime, callService: () => Promise.reject(new Error('rifiutato')) }),
    [runtime]
  );
  const loadingRuntime = useMemo(() => ({ ...runtime, entitiesLoaded: false }), [runtime]);
  const openDefinition = open ? definitionFor(open.id) : undefined;
  const openSettings = open ? (cardSettings[open.settingsKey] ?? cardSettings[open.id] ?? {}) : {};
  const Details = openDefinition?.Details;

  const render = (sample: Sample, value: WidgetRuntime = runtime) => {
    const definition = definitionFor(sample.id);
    if (!definition) return null;
    const settingsKey = sample.settingsKey ?? sample.id;
    const Widget = definition.Widget;
    return (
      <figure className="preview-figure" key={`${sample.id}-${sample.note}`}>
        <Cell size={sample.size}>
          <WidgetRuntimeProvider
            value={{ ...value, openDetails: () => setOpen({ id: sample.id, settingsKey }) }}
          >
            <Widget
              id={sample.id}
              settingsKey={settingsKey}
              settings={cardSettings[settingsKey] ?? {}}
              size={sample.size}
              editMode={editMode}
            />
          </WidgetRuntimeProvider>
        </Cell>
        <Caption as="figcaption">{sample.note}</Caption>
      </figure>
    );
  };

  return (
    <main className="preview-page">
      <header className="preview-header">
        <Title tone="engraved">Widget multimediali</Title>
        <Body tone="muted">
          Anteprima solo per lo sviluppo: lettori, gruppi, televisori, videocamere e pagine media,
          con dati fittizi. Una cella misura 8,5 rem come sul tablet orizzontale.
        </Body>
        <label className="preview-toggle">
          <input
            type="checkbox"
            checked={editMode}
            onChange={(event) => setEditMode(event.target.checked)}
          />
          <Body as="span" size="sm">
            Modalità modifica
          </Body>
        </label>
      </header>

      {SAMPLES.map((group) => (
        <section key={group.title} className="preview-section" aria-label={group.title}>
          <Heading level={2} size="lg">
            {group.title}
          </Heading>
          <div className="preview-grid">{group.items.map((sample) => render(sample))}</div>
        </section>
      ))}

      <section className="preview-section" aria-label="Stati dei comandi">
        <Heading level={2} size="lg">
          Stati dei comandi
        </Heading>
        <div className="preview-grid">
          {render(
            {
              id: 'media_player.cucina',
              size: { w: 2, h: 2 },
              note: 'Richiesto, in attesa: premi Riproduci',
            },
            pendingRuntime
          )}
          {render(
            { id: 'media_player.cucina', size: { w: 2, h: 2 }, note: 'Errore: premi Riproduci' },
            failingRuntime
          )}
          {render(
            { id: 'media_player.soggiorno', size: { w: 2, h: 2 }, note: 'Caricamento' },
            loadingRuntime
          )}
        </div>
      </section>

      <WidgetRuntimeProvider value={runtime}>
        <section className="preview-section preview-section--page" aria-label="Pagina media">
          <Heading level={2} size="lg">
            Pagina media
          </Heading>
          <div className="preview-page-frame">
            <PreviewKindPage Page={MediaKindPage} pageId="media" />
          </div>
        </section>
        <section className="preview-section preview-section--page" aria-label="Pagina Sonos">
          <Heading level={2} size="lg">
            Pagina Sonos
          </Heading>
          <div className="preview-page-frame">
            <PreviewKindPage Page={SonosKindPage} pageId="sonos" />
          </div>
        </section>
      </WidgetRuntimeProvider>

      <WidgetRuntimeProvider value={runtime}>
        <Sheet
          open={Boolean(open && Details)}
          onClose={() => setOpen(null)}
          title={openDefinition?.label ?? ''}
        >
          {open && Details && (
            <Details
              id={open.id}
              settingsKey={open.settingsKey}
              settings={openSettings}
              onClose={() => setOpen(null)}
            />
          )}
        </Sheet>
      </WidgetRuntimeProvider>
    </main>
  );
}
