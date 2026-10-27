import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import {
  MediaGroupConsole,
  MediaPlayerConsole,
} from '@/components/widgets/media/widgets/MediaConsole';
import { mediaWidgets } from '@/components/widgets/media';

/** The player and group console: the sections of the sheet in two columns, same behaviour. */

const recent = () => new Date().toISOString();
const entity = (
  id: string,
  state: string,
  attributes: Record<string, unknown> = {}
): HassEntity => ({ ...fixtureEntity(id, state, attributes), last_updated: recent() });

const ID = 'media_player.studio';
const SALA = 'media_player.sonos_sala';
const CUCINA = 'media_player.sonos_cucina';

function setup(node: React.ReactNode, entities: HassEntity[]) {
  const callService = vi.fn(async () => undefined);
  const runtime = createFixtureRuntime({ entities: fixtureEntities(entities), callService });
  render(<WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>);
  const [main, side] = Array.from(document.querySelectorAll<HTMLElement>('.aca-console-column'));
  return { callService, main: main && within(main), side: side && within(side) };
}

const studio = () =>
  entity(ID, 'playing', {
    friendly_name: 'Studio',
    media_title: 'So what',
    volume_level: 0.5,
    supported_features: 1 | 4 | 512,
    media_duration: 300,
    media_position: 10,
    media_position_updated_at: recent(),
  });

const sonos = (id: string, name: string, members: string[]) =>
  entity(id, 'playing', {
    friendly_name: name,
    media_title: `${name} in onda`,
    group_members: members,
  });

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Player and group console', () => {
  it('is registered on player and group, next to the sheet', () => {
    for (const type of ['mediaPlayer', 'mediaGroup']) {
      const definition = mediaWidgets.find((candidate) => candidate.type === type);
      expect(definition?.Console).toBeDefined();
      expect(definition?.Details).toBeDefined();
    }
  });

  it('puts now playing and the controls on the left, the content choice on the right', () => {
    const { main, side } = setup(
      <MediaPlayerConsole id={ID} settingsKey={ID} settings={{}} onClose={() => undefined} />,
      [studio()]
    );
    expect(main.getByRole('heading', { name: 'So what' })).toBeInTheDocument();
    expect(main.getByRole('slider', { name: 'Posizione nel brano' })).toBeInTheDocument();
    expect(main.getByRole('button', { name: 'Alza il volume' })).toBeInTheDocument();
    expect(main.queryByRole('button', { name: /Scegli contenuto/ })).toBeNull();
    expect(side.getByRole('button', { name: /Scegli contenuto/ })).toBeInTheDocument();
  });

  it('sends a volume step from the console', () => {
    const { callService, main } = setup(
      <MediaPlayerConsole id={ID} settingsKey={ID} settings={{}} onClose={() => undefined} />,
      [studio()]
    );
    fireEvent.click(main.getByRole('button', { name: 'Alza il volume' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_set', {
      entity_id: ID,
      volume_level: 0.53,
    });
  });

  it('puts the speakers of a Sonos group on the right and groups them from there', () => {
    const members = [SALA, CUCINA];
    const { callService, main, side } = setup(
      <MediaGroupConsole
        id="sonos_group_1"
        settingsKey="sonos_group_1"
        settings={{ mediaIds: members, activeId: SALA }}
        onClose={() => undefined}
      />,
      [sonos(SALA, 'Sonos sala', [SALA]), sonos(CUCINA, 'Sonos cucina', [CUCINA])]
    );
    expect(main.queryByRole('heading', { name: 'Lettori Sonos' })).toBeNull();
    expect(side.getByRole('heading', { name: 'Lettori Sonos' })).toBeInTheDocument();
    fireEvent.click(side.getByRole('button', { name: 'Aggiungi Sonos cucina al gruppo' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'join', {
      entity_id: SALA,
      group_members: [CUCINA],
    });
  });

  it('says there is no player when none is there', () => {
    setup(
      <MediaPlayerConsole id={ID} settingsKey={ID} settings={{}} onClose={() => undefined} />,
      []
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(document.querySelector('.aca-console-column')).toBeNull();
  });
});
