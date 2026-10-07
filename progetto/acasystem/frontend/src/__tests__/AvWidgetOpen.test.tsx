import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CellSize } from '@/@types/launcher';
import { isIconName } from '@/components/primitives';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { mediaWidgets } from '@/components/widgets/media';
import { MediaIcon, type MediaIconName } from '@/components/widgets/media/icons';
import { CameraWidget } from '@/components/widgets/media/widgets/Camera';
import { MediaGroupWidget, MediaPlayerWidget } from '@/components/widgets/media/widgets/MediaWidgets';
import { MediaPlayerDetails } from '@/components/widgets/media/widgets/MediaDetails';
import { AndroidTvWidget, AppleTvWidget } from '@/components/widgets/media/widgets/TvWidget';

vi.mock('hls.js', () => ({ default: { isSupported: () => false } }));

const recent = () => new Date().toISOString();
const live = (id: string, state: string, attributes: Record<string, unknown>): HassEntity => ({
  ...fixtureEntity(id, state, attributes),
  last_updated: recent(),
});

const entities = () =>
  fixtureEntities([
    live('media_player.cucina', 'playing', {
      friendly_name: 'Cucina',
      media_title: 'Blue in green',
      media_artist: 'Miles Davis',
      volume_level: 0.5,
      media_duration: 300,
      media_position: 30,
      media_position_updated_at: recent(),
      supported_features: 0xfffff,
    }),
    live('media_player.sala', 'playing', { friendly_name: 'Sala', media_title: 'Uno' }),
    live('media_player.bagno', 'playing', { friendly_name: 'Bagno', media_title: 'Due' }),
    { ...fixtureEntity('media_player.spento', 'off', { friendly_name: 'Spento', supported_features: 0xfffff }), last_updated: '2020-01-01T00:00:00Z' },
    live('media_player.tv_sala', 'on', { friendly_name: 'TV sala', app_name: 'YouTube', media_title: 'Concerto' }),
    live('camera.ingresso', 'idle', { friendly_name: 'Ingresso', access_token: 'tok' }),
  ]);

function setup(node: ReactElement) {
  const openDetails = vi.fn();
  const callService = vi.fn(async () => undefined);
  const saveCardSetting = vi.fn();
  const runtime = createFixtureRuntime({ entities: entities(), openDetails, callService, saveCardSetting });
  const result = render(<WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>);
  return { ...result, openDetails, callService };
}

const s22: CellSize = { w: 2, h: 2 };
const group = { mediaIds: ['media_player.sala', 'media_player.bagno'], activeId: 'media_player.sala' };

const CASES: Array<{ name: string; node: ReactElement; id: string }> = [
  {
    name: 'lettore 2×1',
    id: 'media_player.cucina',
    node: <MediaPlayerWidget id="media_player.cucina" settingsKey="k" settings={{}} size={{ w: 2, h: 1 }} editMode={false} />,
  },
  {
    name: 'lettore 4×1',
    id: 'media_player.cucina',
    node: <MediaPlayerWidget id="media_player.cucina" settingsKey="k" settings={{}} size={{ w: 4, h: 1 }} editMode={false} />,
  },
  {
    name: 'lettore 2×2',
    id: 'media_player.cucina',
    node: <MediaPlayerWidget id="media_player.cucina" settingsKey="k" settings={{}} size={s22} editMode={false} />,
  },
  {
    name: 'lettore 4×2',
    id: 'media_player.cucina',
    node: <MediaPlayerWidget id="media_player.cucina" settingsKey="k" settings={{}} size={{ w: 4, h: 2 }} editMode={false} />,
  },
  {
    name: 'lettore con copertina estesa',
    id: 'media_player.cucina',
    node: (
      <MediaPlayerWidget id="media_player.cucina" settingsKey="k" settings={{ artworkMode: 'cover' }} size={s22} editMode={false} />
    ),
  },
  {
    name: 'lettore spento',
    id: 'media_player.spento',
    node: <MediaPlayerWidget id="media_player.spento" settingsKey="k" settings={{}} size={s22} editMode={false} />,
  },
  {
    name: 'gruppo',
    id: 'media_group_1',
    node: <MediaGroupWidget id="media_group_1" settingsKey="k" settings={group} size={s22} editMode={false} />,
  },
  {
    name: 'gruppo vuoto',
    id: 'media_group_2',
    node: <MediaGroupWidget id="media_group_2" settingsKey="k" settings={{}} size={s22} editMode={false} />,
  },
  {
    name: 'Android TV',
    id: 'androidtv_card_1',
    node: (
      <AndroidTvWidget id="androidtv_card_1" settingsKey="k" settings={{ mediaPlayerId: 'media_player.tv_sala' }} size={s22} editMode={false} />
    ),
  },
  {
    name: 'Apple TV',
    id: 'appletv_card_1',
    node: (
      <AppleTvWidget id="appletv_card_1" settingsKey="k" settings={{ mediaPlayerId: 'media_player.tv_sala' }} size={s22} editMode={false} />
    ),
  },
  {
    name: 'videocamera',
    id: 'camera_card_1',
    node: <CameraWidget id="camera_card_1" settingsKey="k" settings={{ cameraId: 'camera.ingresso' }} size={s22} editMode={false} />,
  },
];

describe('Apertura dei dettagli: un solo pulsante data-widget-open, i comandi fuori', () => {
  it.each(CASES)('$name', ({ node, id }) => {
    const { container, openDetails } = setup(node);
    const openers = container.querySelectorAll('[data-widget-open]');
    expect(openers).toHaveLength(1);
    const opener = openers[0] as HTMLElement;
    // A transparent button stretched over the widget, never wrapping a command.
    expect(opener.tagName).toBe('BUTTON');
    expect(opener).toHaveClass('aca-media-open', 'aca-media-open--stretch');
    expect(opener.querySelector('button, input, [role="slider"]')).toBeNull();
    // No card of its own: the launcher draws the frame.
    expect(container.querySelector('.aca-m--card')).toBeNull();

    // Every command works without opening the details (the frame does not press for them).
    const commands = Array.from(container.querySelectorAll<HTMLElement>('button, input')).filter(
      (element) => element !== opener
    );
    for (const command of commands) fireEvent.click(command);
    expect(openDetails).not.toHaveBeenCalled();

    fireEvent.click(opener);
    expect(openDetails).toHaveBeenCalledWith(id);
  });

  it('entità mancante: solo il messaggio, nessuna apertura', () => {
    const { container } = setup(
      <MediaPlayerWidget id="media_player.cantina" settingsKey="k" settings={{}} size={s22} editMode={false} />
    );
    expect(screen.getByText('Dispositivo non trovato')).toBeInTheDocument();
    expect(container.querySelector('[data-widget-open]')).toBeNull();
  });
});

describe('Gesti che tengono il puntatore: data-no-long-press', () => {
  it('il cursore del volume del widget', () => {
    setup(<MediaPlayerWidget id="media_player.cucina" settingsKey="k" settings={{}} size={s22} editMode={false} />);
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveAttribute('data-no-long-press');
  });

  it('volume e posizione nel brano nei dettagli', () => {
    setup(<MediaPlayerDetails id="media_player.cucina" settingsKey="k" settings={{}} onClose={() => undefined} />);
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveAttribute('data-no-long-press');
    expect(screen.getByRole('slider', { name: 'Posizione nel brano' })).toHaveAttribute('data-no-long-press');
  });
});

describe('Icone', () => {
  it('le definizioni usano nomi della primitiva Icon', () => {
    for (const definition of mediaWidgets) {
      expect(isIconName(definition.icon), definition.type).toBe(true);
      expect(definition.frameless, definition.type).toBeFalsy();
    }
    expect(mediaWidgets.map((definition) => definition.icon)).toEqual(['music', 'speaker', 'tv', 'tv', 'camera']);
  });

  it('ogni glifo esiste a runtime (primitiva o mx-icons locale)', () => {
    const names: MediaIconName[] = [
      'play',
      'pause',
      'next',
      'previous',
      'repeat',
      'power',
      'volume',
      'mute',
      'add',
      'minus',
      'music',
      'speaker',
      'tv',
      'camera',
      'heart',
      'refresh',
      'home',
      'menu',
      'warning',
      'shuffle',
      'repeatOne',
      'volumeLow',
      'playlist',
      'cameraOff',
      'link',
      'swap',
      'up',
      'down',
      'left',
      'right',
      'back',
    ];
    for (const name of names) {
      const { container, unmount } = render(<MediaIcon name={name} size="sm" tone="active" />);
      const svg = container.querySelector('svg');
      expect(svg, name).not.toBeNull();
      expect(svg, name).toHaveClass('aca-icon', 'aca-icon--sm');
      expect(svg?.getAttribute('aria-hidden'), name).toBe('true');
      unmount();
    }
  });
});
