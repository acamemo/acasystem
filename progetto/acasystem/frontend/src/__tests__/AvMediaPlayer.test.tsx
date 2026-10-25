import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CellSize, WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import {
  MediaGroupWidget,
  MediaPlayerWidget,
} from '@/components/widgets/media/widgets/MediaWidgets';

const ID = 'media_player.cucina';
const recent = () => new Date().toISOString();

function player(state: string, attributes: Record<string, unknown> = {}): HassEntity {
  return {
    ...fixtureEntity(ID, state, {
      friendly_name: 'Cucina',
      media_title: 'Blue in green',
      media_artist: 'Miles Davis',
      volume_level: 0.5,
      ...attributes,
    }),
    last_updated: recent(),
  };
}

function renderWidget(
  entity: HassEntity | null,
  size: CellSize,
  overrides: Partial<WidgetRuntime> = {},
  {
    settings = {},
    editMode = false,
  }: { settings?: Record<string, unknown>; editMode?: boolean } = {}
) {
  const callService = vi.fn(async () => undefined);
  const openDetails = vi.fn();
  const runtime = createFixtureRuntime({
    entities: fixtureEntities(entity ? [entity] : []),
    callService,
    openDetails,
    ...overrides,
  });
  const view = (value: WidgetRuntime) => (
    <WidgetRuntimeProvider value={value}>
      <MediaPlayerWidget
        id={ID}
        settingsKey={ID}
        settings={settings}
        size={size}
        editMode={editMode}
      />
    </WidgetRuntimeProvider>
  );
  const result = render(view(runtime));
  return {
    ...result,
    callService: (overrides.callService as typeof callService | undefined) ?? callService,
    openDetails,
    rerenderWith: (next: HassEntity) =>
      result.rerender(view({ ...runtime, entities: fixtureEntities([next]) })),
  };
}

describe('Lettore multimediale: densità per dimensione', () => {
  it('2×1 mostra copertina, titolo, artista e solo riproduci/pausa', () => {
    renderWidget(player('playing'), { w: 2, h: 1 });
    expect(screen.getByText('Blue in green')).toBeInTheDocument();
    expect(screen.getByText('Miles Davis')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Metti in pausa' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Brano precedente' })).toBeNull();
    expect(screen.queryByRole('slider', { name: 'Volume' })).toBeNull();
  });

  it('4×1 aggiunge precedente, successivo e accensione', () => {
    renderWidget(player('playing', { supported_features: 0xffffff }), { w: 4, h: 1 });
    expect(screen.getByRole('button', { name: 'Brano precedente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Brano successivo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spegni' })).toBeInTheDocument();
  });

  it('2×2 aggiunge il volume; 4×2 anche la posizione nel brano', () => {
    const { unmount } = renderWidget(
      player('playing', { media_duration: 200, media_position: 20 }),
      {
        w: 2,
        h: 2,
      }
    );
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('50');
    expect(screen.queryByRole('progressbar')).toBeNull();
    unmount();
    renderWidget(player('playing', { media_duration: 200, media_position: 20 }), { w: 4, h: 2 });
    expect(screen.getByRole('progressbar', { name: 'Posizione nel brano' })).toBeInTheDocument();
  });

  it('nasconde i comandi che l’entità non supporta', () => {
    renderWidget(player('playing', { supported_features: 1 | 16384 }), { w: 4, h: 2 });
    expect(screen.getByRole('button', { name: 'Metti in pausa' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Brano successivo' })).toBeNull();
    expect(screen.queryByRole('slider', { name: 'Volume' })).toBeNull();
  });
});

describe('Lettore multimediale: stati', () => {
  it('caricamento con skeleton finché le entità non arrivano', () => {
    renderWidget(null, { w: 2, h: 2 }, { entitiesLoaded: false });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento del lettore…');
  });

  it('entità mancante: messaggio chiaro', () => {
    renderWidget(null, { w: 2, h: 2 });
    expect(screen.getByText('Dispositivo non trovato')).toBeInTheDocument();
    expect(screen.getByText(ID)).toBeInTheDocument();
  });

  it('non disponibile: nessun comando', () => {
    renderWidget(player('unavailable'), { w: 2, h: 2 });
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Riproduci|Metti in pausa|Accendi|Spegni/ })
    ).toBeNull();
  });

  it('inattivo e spento: accende con turn_on se supportato', () => {
    const entity = {
      ...player('off', { supported_features: 128 }),
      last_updated: '2020-01-01T00:00:00Z',
    };
    const { callService } = renderWidget(entity, { w: 2, h: 2 });
    expect(screen.getByText('Niente in riproduzione')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: ID });
  });

  it('copertina mancante o rotta: segnaposto del kit, mai un’immagine rotta', () => {
    const { container, unmount } = renderWidget(player('playing'), { w: 2, h: 2 });
    expect(container.querySelector('[data-artwork]')).toHaveAttribute(
      'data-artwork',
      'placeholder'
    );
    unmount();
    const withPicture = renderWidget(
      player('playing', { entity_picture: '/api/media_player_proxy/x' }),
      {
        w: 2,
        h: 2,
      }
    );
    const img = withPicture.container.querySelector('img');
    expect(img).toHaveAttribute('src', 'http://ha.local/api/media_player_proxy/x');
    fireEvent.error(img as HTMLImageElement);
    expect(withPicture.container.querySelector('img')).toBeNull();
    expect(withPicture.container.querySelector('[data-artwork]')).toHaveAttribute(
      'data-artwork',
      'placeholder'
    );
  });

  it('modalità modifica: comandi e apertura dei dettagli disabilitati', () => {
    const { openDetails, container } = renderWidget(
      player('playing'),
      { w: 4, h: 2 },
      {},
      { editMode: true }
    );
    expect(screen.getByRole('button', { name: 'Metti in pausa' })).toBeDisabled();
    const opener = container.querySelector('[data-widget-open]') as HTMLButtonElement;
    expect(opener).toBeDisabled();
    fireEvent.click(opener);
    fireEvent.click(container.querySelector('.aca-media-widget') as HTMLElement);
    expect(openDetails).not.toHaveBeenCalled();
  });

  it('il pulsante data-widget-open apre i dettagli, i comandi no', () => {
    const { openDetails, container } = renderWidget(player('playing'), { w: 2, h: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Metti in pausa' }));
    fireEvent.click(screen.getByRole('slider', { name: 'Volume' }));
    expect(openDetails).not.toHaveBeenCalled();
    const opener = container.querySelector('[data-widget-open]') as HTMLButtonElement;
    expect(opener).toHaveAccessibleName(/Cucina.*Blue in green.*apri i dettagli/);
    fireEvent.click(opener);
    expect(openDetails).toHaveBeenCalledWith(ID);
  });
});

describe('Lettore multimediale: servizi identici al legacy', () => {
  it('riproduci/pausa, precedente, successivo, spegni', () => {
    const { callService } = renderWidget(player('playing', { supported_features: 0xffffff }), {
      w: 4,
      h: 2,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Metti in pausa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Brano precedente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Brano successivo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(callService.mock.calls).toEqual([
      ['media_player', 'media_play_pause', { entity_id: ID }],
      ['media_player', 'media_previous_track', { entity_id: ID }],
      ['media_player', 'media_next_track', { entity_id: ID }],
      ['media_player', 'turn_off', { entity_id: ID }],
    ]);
  });

  it('volume dal cursore: volume_set con livello / 100', () => {
    const { callService } = renderWidget(player('playing'), { w: 2, h: 2 });
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '40' } });
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_set', {
      entity_id: ID,
      volume_level: 0.4,
    });
  });
});

describe('Lettore multimediale: richiesto e confermato', () => {
  it('play/pausa resta in attesa finché Home Assistant non conferma', () => {
    const { rerenderWith } = renderWidget(player('paused'), { w: 2, h: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Riproduci' }));
    const pending = screen.getByRole('button', { name: 'Metti in pausa' });
    expect(pending).toHaveAttribute('aria-busy', 'true');
    rerenderWith(player('playing'));
    expect(screen.getByRole('button', { name: 'Metti in pausa' })).not.toHaveAttribute('aria-busy');
  });

  it('il volume richiesto è mostrato in attesa fino alla conferma', () => {
    const { rerenderWith } = renderWidget(player('playing'), { w: 2, h: 2 });
    const slider = screen.getByRole('slider', { name: 'Volume' });
    fireEvent.change(slider, { target: { value: '70' } });
    expect(slider).toHaveValue('70');
    expect(slider).toHaveAttribute('aria-busy', 'true');
    rerenderWith(player('playing', { volume_level: 0.7 }));
    expect(screen.getByRole('slider', { name: 'Volume' })).not.toHaveAttribute('aria-busy');
  });

  it('errore del comando: torna allo stato confermato e lo dice', async () => {
    const callService = vi.fn(async () => {
      throw new Error('rifiutato');
    });
    renderWidget(player('paused'), { w: 2, h: 2 }, { callService });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Riproduci' }));
    });
    expect(screen.getByRole('button', { name: 'Riproduci' })).not.toHaveAttribute('aria-busy');
    expect(screen.getAllByText('Comando non riuscito. Riprova.').length).toBeGreaterThan(0);
  });
});

describe('Gruppo di lettori', () => {
  const members = () => [
    {
      ...fixtureEntity('media_player.sala', 'playing', {
        friendly_name: 'Sala',
        media_title: 'Uno',
      }),
      last_updated: recent(),
    },
    {
      ...fixtureEntity('media_player.bagno', 'playing', {
        friendly_name: 'Bagno',
        media_title: 'Due',
      }),
      last_updated: recent(),
    },
  ];

  it('mostra il lettore salvato e passa al successivo salvando activeId', () => {
    const saveCardSetting = vi.fn();
    const runtime = createFixtureRuntime({ entities: fixtureEntities(members()), saveCardSetting });
    render(
      <WidgetRuntimeProvider value={runtime}>
        <MediaGroupWidget
          id="media_group_1"
          settingsKey="home::media_group_1"
          settings={{
            mediaIds: ['media_player.sala', 'media_player.bagno'],
            activeId: 'media_player.bagno',
          }}
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );
    expect(screen.getByText('Due')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Passa al lettore successivo/ }));
    expect(saveCardSetting).toHaveBeenCalledWith(
      'home::media_group_1',
      'activeId',
      'media_player.sala'
    );
  });

  it('gruppo senza lettori: messaggio', () => {
    render(
      <WidgetRuntimeProvider value={createFixtureRuntime()}>
        <MediaGroupWidget
          id="sonos_group_1"
          settingsKey="sonos_group_1"
          settings={{}}
          size={{ w: 2, h: 1 }}
          editMode={false}
        />
      </WidgetRuntimeProvider>
    );
    const status = screen.getByRole('status');
    expect(within(status).getByText('Nessun lettore nel gruppo')).toBeInTheDocument();
  });
});
