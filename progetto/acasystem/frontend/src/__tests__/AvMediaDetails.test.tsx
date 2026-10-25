import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { Connection } from 'home-assistant-js-websocket';
import type { WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import {
  MediaGroupDetails,
  MediaPlayerDetails,
} from '@/components/widgets/media/widgets/MediaDetails';

const recent = () => new Date().toISOString();
const entity = (
  id: string,
  state: string,
  attributes: Record<string, unknown> = {}
): HassEntity => ({
  ...fixtureEntity(id, state, attributes),
  last_updated: recent(),
});

function renderDetails(
  node: React.ReactNode,
  entities: HassEntity[],
  overrides: Partial<WidgetRuntime> = {}
) {
  const callService = vi.fn(async () => undefined);
  const runtime = createFixtureRuntime({
    entities: fixtureEntities(entities),
    callService,
    ...overrides,
  });
  render(<WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>);
  return { callService };
}

afterEach(() => localStorage.clear());

describe('Dettagli del lettore: servizi identici al MediaModal legacy', () => {
  const ID = 'media_player.studio';
  const studio = () =>
    entity(ID, 'playing', {
      friendly_name: 'Studio',
      media_title: 'So what',
      media_artist: 'Miles Davis',
      volume_level: 0.5,
      shuffle: false,
      repeat: 'off',
      is_volume_muted: false,
      media_duration: 300,
      media_position: 10,
      media_position_updated_at: recent(),
    });

  it('casuale, ripetizione, muto, passi del volume e posizione', () => {
    const { callService } = renderDetails(
      <MediaPlayerDetails id={ID} settingsKey={ID} settings={{}} onClose={() => undefined} />,
      [studio()]
    );
    fireEvent.click(screen.getByRole('button', { name: 'Riproduzione casuale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ripeti: no' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disattiva l’audio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alza il volume' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Posizione nel brano' }), {
      target: { value: '120' },
    });
    expect(callService.mock.calls).toEqual([
      ['media_player', 'shuffle_set', { entity_id: ID, shuffle: true }],
      ['media_player', 'repeat_set', { entity_id: ID, repeat: 'one' }],
      ['media_player', 'volume_mute', { entity_id: ID, is_volume_muted: true }],
      ['media_player', 'volume_set', { entity_id: ID, volume_level: 0.53 }],
      ['media_player', 'media_seek', { entity_id: ID, seek_position: 120 }],
    ]);
  });

  it('abbassa il volume di 0,03 dal valore confermato', () => {
    const { callService } = renderDetails(
      <MediaPlayerDetails id={ID} settingsKey={ID} settings={{}} onClose={() => undefined} />,
      [studio()]
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abbassa il volume' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_set', {
      entity_id: ID,
      volume_level: 0.47,
    });
  });

  it('Scegli contenuto: esplora i preferiti e invia play_media', async () => {
    const sendMessagePromise = vi.fn(
      async (message: { type: string; media_content_id?: string }) => {
        if (!message.media_content_id) {
          return {
            title: 'Spotify',
            children: [
              {
                title: 'Preferiti',
                media_content_id: 'fav',
                media_content_type: 'favorites_folder',
                can_expand: true,
                can_play: false,
              },
            ],
          };
        }
        return {
          title: 'Preferiti',
          children: [
            {
              title: 'Kind of blue',
              media_content_id: 'spotify:album:kob',
              media_content_type: 'album',
              can_play: true,
            },
          ],
        };
      }
    );
    const conn = { sendMessagePromise } as unknown as Connection;
    const { callService } = renderDetails(
      <MediaPlayerDetails id={ID} settingsKey={ID} settings={{}} onClose={() => undefined} />,
      [studio()],
      { conn }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Scegli contenuto' }));
    const tile = await screen.findByRole('button', { name: /Kind of blue/ });
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'media_player/browse_media',
      entity_id: ID,
    });
    fireEvent.click(tile);
    expect(callService).toHaveBeenCalledWith('media_player', 'play_media', {
      entity_id: ID,
      media_content_id: 'spotify:album:kob',
      media_content_type: 'album',
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Di nuovo: Kind of blue' })).toBeInTheDocument()
    );
    expect(JSON.parse(localStorage.getItem('tunet_media_last_choice') ?? '{}')[ID]).toEqual({
      id: 'spotify:album:kob',
      label: 'Kind of blue',
      type: 'album',
    });
  });
});

describe('Dettagli del gruppo Sonos', () => {
  const sonos = (id: string, name: string, members: string[], state = 'playing') =>
    entity(id, state, {
      friendly_name: name,
      media_title: `${name} in onda`,
      group_members: members,
    });

  it('aggiunge un lettore al gruppo con join e lo toglie con unjoin', () => {
    const { callService } = renderDetails(
      <MediaGroupDetails
        id="sonos_group_1"
        settingsKey="sonos_group_1"
        settings={{
          mediaIds: ['media_player.sonos_sala', 'media_player.sonos_cucina'],
          activeId: 'media_player.sonos_sala',
        }}
        onClose={() => undefined}
      />,
      [
        sonos('media_player.sonos_sala', 'Sonos sala', ['media_player.sonos_sala']),
        sonos('media_player.sonos_cucina', 'Sonos cucina', ['media_player.sonos_cucina']),
      ]
    );
    expect(screen.getByRole('heading', { name: 'Lettori Sonos' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi Sonos cucina al gruppo' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'join', {
      entity_id: 'media_player.sonos_sala',
      group_members: ['media_player.sonos_cucina'],
    });
    fireEvent.click(screen.getByRole('button', { name: /Raggruppa tutti/ }));
    expect(callService).toHaveBeenLastCalledWith('media_player', 'join', {
      entity_id: 'media_player.sonos_sala',
      group_members: ['media_player.sonos_cucina'],
    });
  });

  it('separa tutti con unjoin degli altri membri', () => {
    const members = ['media_player.sonos_sala', 'media_player.sonos_cucina'];
    const { callService } = renderDetails(
      <MediaGroupDetails
        id="sonos_group_1"
        settingsKey="sonos_group_1"
        settings={{ mediaIds: members }}
        onClose={() => undefined}
      />,
      [
        sonos('media_player.sonos_sala', 'Sonos sala', members),
        sonos('media_player.sonos_cucina', 'Sonos cucina', members),
      ]
    );
    fireEvent.click(screen.getByRole('button', { name: /Separa tutti/ }));
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('media_player', 'unjoin', {
      entity_id: 'media_player.sonos_cucina',
    });
  });

  it('seleziona un altro lettore del gruppo', () => {
    renderDetails(
      <MediaGroupDetails
        id="media_group_2"
        settingsKey="media_group_2"
        settings={{ mediaIds: ['media_player.a', 'media_player.b'] }}
        onClose={() => undefined}
      />,
      [
        entity('media_player.a', 'playing', { friendly_name: 'A', media_title: 'Primo' }),
        entity('media_player.b', 'paused', { friendly_name: 'B', media_title: 'Secondo' }),
      ]
    );
    expect(screen.getByRole('heading', { name: 'Primo' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^B\s?Secondo/ }));
    expect(screen.getByRole('heading', { name: 'Secondo' })).toBeInTheDocument();
  });
});
