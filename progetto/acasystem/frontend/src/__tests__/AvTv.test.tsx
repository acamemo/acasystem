import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CellSize, WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvWidget, AppleTvWidget } from '@/components/widgets/media/widgets/TvWidget';
import { AndroidTvDetails, AppleTvDetails } from '@/components/widgets/media/widgets/TvDetails';

const TV = 'media_player.tv_sala';
const REMOTE = 'remote.tv_sala';
const EMBY = 'media_player.emby_sala';

const tv = (state: string, attributes: Record<string, unknown> = {}): HassEntity =>
  fixtureEntity(TV, state, { friendly_name: 'TV sala', app_name: 'Netflix', media_title: 'Dark', ...attributes });

function setup(entities: HassEntity[], overrides: Partial<WidgetRuntime> = {}) {
  const callService = vi.fn(async () => undefined);
  const openDetails = vi.fn();
  const runtime = createFixtureRuntime({
    entities: fixtureEntities(entities),
    callService,
    openDetails,
    ...overrides,
  });
  const wrap = (node: React.ReactNode) => render(<WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>);
  return { callService, openDetails, wrap };
}

const size2x2: CellSize = { w: 2, h: 2 };

describe('Android TV: widget', () => {
  it('mostra dispositivo, app e titolo; play/pausa sul lettore collegato che sta suonando', () => {
    const { callService, wrap } = setup([
      tv('on'),
      fixtureEntity(EMBY, 'playing', { media_title: 'Episodio 3', media_series_title: 'Dark' }),
    ]);
    const { container } = wrap(
      <AndroidTvWidget
        id="androidtv_card_1"
        settingsKey="androidtv_card_1"
        settings={{ mediaPlayerId: TV, remoteId: REMOTE, linkedMediaPlayers: [EMBY] }}
        size={size2x2}
        editMode={false}
      />
    );
    // The launcher draws the card frame: the widget never nests a card of its own.
    expect(container.querySelector('.aca-m--card')).toBeNull();
    expect(screen.getByText('TV sala')).toBeInTheDocument();
    expect(screen.getByText('Episodio 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Metti in pausa' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', { entity_id: EMBY });
  });

  it('Android: con il lettore collegato in pausa comanda la TV (regola legacy)', () => {
    const { callService, wrap } = setup([tv('on'), fixtureEntity(EMBY, 'paused', { media_title: 'Film' })]);
    wrap(
      <AndroidTvWidget
        id="androidtv_card_1"
        settingsKey="androidtv_card_1"
        settings={{ mediaPlayerId: TV, linkedMediaPlayers: [EMBY] }}
        size={size2x2}
        editMode={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Riproduci' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', { entity_id: TV });
  });

  it('spenta: nessun play/pausa; non configurata: messaggio', () => {
    const { wrap } = setup([tv('off')]);
    const { unmount } = wrap(
      <AndroidTvWidget id="androidtv_card_1" settingsKey="k" settings={{ mediaPlayerId: TV }} size={size2x2} editMode={false} />
    );
    expect(screen.getAllByText('Spento').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Riproduci|Metti in pausa/ })).toBeNull();
    unmount();
    wrap(<AndroidTvWidget id="androidtv_card_2" settingsKey="k" settings={{}} size={{ w: 2, h: 1 }} editMode={false} />);
    expect(screen.getByText('Dispositivo non configurato')).toBeInTheDocument();
  });
});

describe('Apple TV: widget', () => {
  it('accensione diretta: turn_off mentre è accesa, con attesa di conferma', () => {
    const { callService, wrap } = setup([tv('playing')]);
    wrap(<AppleTvWidget id="appletv_card_1" settingsKey="k" settings={{ mediaPlayerId: TV }} size={size2x2} editMode={false} />);
    const power = screen.getByRole('button', { name: 'Spegni' });
    fireEvent.click(power);
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_off', { entity_id: TV });
    expect(screen.getByRole('button', { name: 'Accendi' })).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    expect(callService).toHaveBeenCalledTimes(1);
  });

  it('turn_on da spenta e standby', () => {
    const { callService, wrap } = setup([tv('standby')]);
    wrap(<AppleTvWidget id="appletv_card_1" settingsKey="k" settings={{ mediaPlayerId: TV }} size={{ w: 2, h: 1 }} editMode={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: TV });
  });

  it('tapAction toggle: il tocco accende/spegne, i dettagli restano raggiungibili dal pulsante', () => {
    const { callService, openDetails, wrap } = setup([tv('on')]);
    const { container } = wrap(
      <AppleTvWidget
        id="appletv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV, tapAction: 'toggle' }}
        size={size2x2}
        editMode={false}
      />
    );
    fireEvent.click(container.querySelector('.aca-media-widget') as HTMLElement);
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_off', { entity_id: TV });
    expect(openDetails).not.toHaveBeenCalled();
    // The opener does not stretch over the background, which belongs to the toggle.
    const opener = container.querySelector('[data-widget-open]') as HTMLElement;
    expect(opener).not.toHaveClass('aca-media-open--stretch');
    fireEvent.click(screen.getByRole('button', { name: /TV sala/ }));
    expect(openDetails).toHaveBeenCalledWith('appletv_card_1');
    expect(callService).toHaveBeenCalledTimes(1);
  });

  it('play/pausa sul lettore collegato attivo anche se in pausa', () => {
    const { callService, wrap } = setup([tv('on'), fixtureEntity(EMBY, 'paused', { media_title: 'Film' })]);
    wrap(
      <AppleTvWidget
        id="appletv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV, linkedMediaPlayers: [EMBY] }}
        size={size2x2}
        editMode={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Riproduci' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', { entity_id: EMBY });
  });

  it('errore del comando: messaggio e stato confermato', async () => {
    const callService = vi.fn(async () => {
      throw new Error('no');
    });
    const { wrap } = setup([tv('on')], { callService });
    wrap(<AppleTvWidget id="appletv_card_1" settingsKey="k" settings={{ mediaPlayerId: TV }} size={size2x2} editMode={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    });
    expect(screen.getByRole('button', { name: 'Spegni' })).not.toHaveAttribute('aria-busy');
    expect(screen.getAllByText('Comando non riuscito. Riprova.').length).toBeGreaterThan(0);
  });
});

describe('Dettagli TV: comandi identici ai modali legacy', () => {
  it('Android: D-pad, tasti, volume e accensione', () => {
    const { callService, wrap } = setup([tv('on')]);
    wrap(
      <AndroidTvDetails
        id="androidtv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV, remoteId: REMOTE }}
        onClose={() => undefined}
      />
    );
    for (const name of ['Su', 'Giù', 'Sinistra', 'Destra', 'OK', 'Indietro', 'Home', 'Menu']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Alza il volume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbassa il volume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(callService.mock.calls).toEqual([
      ...['DPAD_UP', 'DPAD_DOWN', 'DPAD_LEFT', 'DPAD_RIGHT', 'DPAD_CENTER', 'BACK', 'HOME', 'MENU'].map(
        (command) => ['remote', 'send_command', { entity_id: REMOTE, command }]
      ),
      ['media_player', 'volume_up', { entity_id: TV }],
      ['media_player', 'volume_down', { entity_id: TV }],
      ['media_player', 'turn_off', { entity_id: TV }],
    ]);
  });

  it('Android: senza telecomando nasconde D-pad, volume e accensione', () => {
    const { wrap } = setup([tv('on')]);
    wrap(<AndroidTvDetails id="androidtv_card_1" settingsKey="k" settings={{ mediaPlayerId: TV }} onClose={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Su' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Alza il volume' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Spegni' })).toBeNull();
  });

  it('Apple: clickpad, menu/home, app, muto, volume, trasporto sul lettore collegato', () => {
    const { callService, wrap } = setup([
      tv('on', { source_list: ['Netflix', 'YouTube'], is_volume_muted: false }),
      fixtureEntity(EMBY, 'playing', { media_title: 'Episodio' }),
    ]);
    wrap(
      <AppleTvDetails
        id="appletv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV, remoteId: REMOTE, linkedMediaPlayers: [EMBY] }}
        onClose={() => undefined}
      />
    );
    for (const name of ['Su', 'Giù', 'Sinistra', 'Destra', 'OK', 'Indietro', 'Home']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    expect(screen.getByRole('button', { name: 'Netflix' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'YouTube' }));
    fireEvent.click(screen.getByRole('button', { name: /Disattiva l’audio/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Alza il volume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Riproduci o metti in pausa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Brano successivo' }));
    expect(callService.mock.calls).toEqual([
      ...['up', 'down', 'left', 'right', 'select', 'menu', 'home'].map((command) => [
        'remote',
        'send_command',
        { entity_id: REMOTE, command },
      ]),
      ['media_player', 'select_source', { entity_id: TV, source: 'YouTube' }],
      ['media_player', 'volume_mute', { entity_id: TV, is_volume_muted: true }],
      ['media_player', 'volume_up', { entity_id: TV }],
      ['media_player', 'media_play_pause', { entity_id: EMBY }],
      ['media_player', 'media_next_track', { entity_id: EMBY }],
    ]);
  });

  it('Apple: riattiva l’audio con lo stato esplicito di HA e accende', () => {
    const { callService, wrap } = setup([tv('off', { is_volume_muted: true })]);
    wrap(<AppleTvDetails id="appletv_card_1" settingsKey="k" settings={{ mediaPlayerId: TV }} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Riattiva l’audio/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    expect(callService.mock.calls).toEqual([
      ['media_player', 'volume_mute', { entity_id: TV, is_volume_muted: false }],
      ['media_player', 'turn_on', { entity_id: TV }],
    ]);
  });
});
