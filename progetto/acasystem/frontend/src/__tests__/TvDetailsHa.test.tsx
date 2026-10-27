import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvDetails } from '@/components/widgets/media/widgets/TvDetails';
import { MEDIA_FEATURE } from '@/components/widgets/media/model/features';

/**
 * Details of the TV widgets: the live widget on top and every interaction Home Assistant allows,
 * each section only when the entity declares it (supported_features).
 */

const TV = 'media_player.ue50j6200_ue50j6200';
const REMOTE = 'remote.ue50j6200_ue50j6200';
const SAMSUNG_FEATURES = 24381;

const tv = (state: string, attributes: Record<string, unknown>): HassEntity =>
  fixtureEntity(TV, state, { friendly_name: 'UE50J6200', ...attributes });

function setup(entity: HassEntity, remoteId = REMOTE) {
  const callService = vi.fn(async () => undefined);
  const openDetails = vi.fn();
  const runtime = createFixtureRuntime({
    // «No remote» means HA has none either: otherwise the paired `remote.*` would be used.
    entities: fixtureEntities(remoteId ? [entity, fixtureEntity(REMOTE, 'on', {})] : [entity]),
    callService,
    openDetails,
  });
  render(
    <WidgetRuntimeProvider value={runtime}>
      <AndroidTvDetails
        id="androidtv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV, remoteId }}
        onClose={() => undefined}
      />
    </WidgetRuntimeProvider>
  );
  return { callService, openDetails };
}

const samsung = (extra: Record<string, unknown> = {}) =>
  tv('on', {
    supported_features: SAMSUNG_FEATURES,
    platform: 'samsungtv',
    source_list: ['TV', 'HDMI'],
    ...extra,
  });
const lg = (extra: Record<string, unknown> = {}) =>
  tv('on', { supported_features: 131968, platform: 'webostv', ...extra });
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const noButton = (name: string | RegExp) =>
  expect(screen.queryByRole('button', { name })).toBeNull();

afterEach(() => cleanup());

describe('TV details: layout', () => {
  it('header, base keys, missing controls, then the player', () => {
    const { openDetails, callService } = setup(samsung());
    const header = screen.getByRole('region', { name: 'UE50J6200' });
    // Base keys: power, volume knob, channel key; the same components as the widget.
    const keys = Array.from(header.querySelectorAll('.aca-media-keys button')).map((el) =>
      el.getAttribute('aria-label')
    );
    expect(keys).toEqual(['Spegni', 'Volume', 'Canale']);
    const order = ['UE50J6200', 'Volume', 'Canali', 'Ingressi', 'Telecomando', 'Riproduzione'];
    const headings = screen.getAllByRole('heading', { level: 3 });
    const positions = order.map((name) =>
      headings.findIndex((heading) => heading.textContent === name)
    );
    // Every heading present after the first, in order; the player is last.
    const found = positions.filter((position) => position >= 0);
    expect(found).toEqual([...found].sort((x, y) => x - y));
    expect(positions[positions.length - 1]).toBeGreaterThan(-1);
    expect(headings[headings.length - 1].textContent).not.toBe('Telecomando');
    // Power acts from the sheet itself; there is no opener to nest another sheet.
    fireEvent.click(within(header).getByRole('button', { name: 'Spegni' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: REMOTE,
      command: 'KEY_POWER',
    });
    expect(openDetails).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: /Accendi|Spegni/ })).toHaveLength(1);
  });

  it('play/pause lives only in the sheet, in the player section', () => {
    const { callService } = setup(samsung());
    const player = screen.getByRole('region', { name: 'Riproduzione' });
    fireEvent.click(within(player).getByRole('button', { name: 'Riproduci' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', {
      entity_id: TV,
    });
    expect(screen.getAllByRole('button', { name: /Riproduci|Metti in pausa/ })).toHaveLength(1);
  });

  it('the channel key and the volume −/+ are in the sheet too', () => {
    const { callService } = setup(samsung());
    fireEvent.click(screen.getByRole('button', { name: 'Canale' }));
    expect(callService).toHaveBeenLastCalledWith('remote', 'send_command', {
      entity_id: REMOTE,
      command: 'KEY_CHUP',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Alza il volume' }));
    expect(callService).toHaveBeenLastCalledWith('media_player', 'volume_up', { entity_id: TV });
  });
});

describe('TV details: sections follow the declared features', () => {
  it('Samsung 24381: playback with stop, sources, no seek and no sound mode', () => {
    setup(samsung());
    expect(screen.getByRole('heading', { name: 'Riproduzione' })).toBeInTheDocument();
    button('Brano precedente');
    button('Ferma');
    button('Brano successivo');
    // Its list has only inputs (TV, HDMI): no «App» section.
    expect(screen.getByRole('heading', { name: 'Ingressi' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'App' })).toBeNull();
    expect(screen.queryByRole('slider', { name: 'Posizione nel brano' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Modalità audio' })).toBeNull();
    noButton('Riproduzione casuale');
    noButton(/^Ripeti/);
  });

  it('stop appears only with STOP', () => {
    setup(samsung({ supported_features: SAMSUNG_FEATURES & ~MEDIA_FEATURE.STOP }));
    noButton('Ferma');
  });

  it('stop calls media_stop', () => {
    const { callService } = setup(samsung());
    fireEvent.click(button('Ferma'));
    expect(callService).toHaveBeenCalledWith('media_player', 'media_stop', { entity_id: TV });
  });

  it('seek bar needs SEEK and a position and duration', () => {
    const seekable = MEDIA_FEATURE.SEEK | MEDIA_FEATURE.PAUSE;
    setup(samsung({ supported_features: seekable, media_duration: 600, media_position: 30 }));
    expect(screen.getByRole('slider', { name: 'Posizione nel brano' })).toBeInTheDocument();
    cleanup();
    setup(samsung({ supported_features: seekable }));
    expect(screen.queryByRole('slider', { name: 'Posizione nel brano' })).toBeNull();
    cleanup();
    setup(
      samsung({ supported_features: MEDIA_FEATURE.PAUSE, media_duration: 600, media_position: 30 })
    );
    expect(screen.queryByRole('slider', { name: 'Posizione nel brano' })).toBeNull();
  });

  it('without a seek bar, rewind and fast forward use the remote keys', () => {
    const { callService } = setup(samsung());
    fireEvent.click(button('Indietro veloce'));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: REMOTE,
      command: 'KEY_REWIND',
    });
    fireEvent.click(button('Avanti veloce'));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: REMOTE,
      command: 'KEY_FF',
    });
    cleanup();
    const seekable = MEDIA_FEATURE.SEEK | MEDIA_FEATURE.PAUSE;
    setup(samsung({ supported_features: seekable, media_duration: 600, media_position: 30 }));
    noButton('Indietro veloce');
    noButton('Avanti veloce');
    cleanup();
    setup(samsung(), '');
    noButton('Indietro veloce');
  });

  it('shuffle and repeat only when declared', () => {
    setup(
      samsung({
        supported_features:
          MEDIA_FEATURE.SHUFFLE_SET | MEDIA_FEATURE.REPEAT_SET | MEDIA_FEATURE.PAUSE,
        shuffle: false,
        repeat: 'off',
      })
    );
    button('Riproduzione casuale');
    button(/^Ripeti/);
  });

  it('sound mode needs SELECT_SOUND_MODE and calls select_sound_mode', () => {
    const modes = { sound_mode_list: ['Film', 'Musica'], sound_mode: 'Film' };
    const { callService } = setup(
      samsung({ supported_features: SAMSUNG_FEATURES | MEDIA_FEATURE.SELECT_SOUND_MODE, ...modes })
    );
    expect(screen.getByRole('heading', { name: 'Modalità audio' })).toBeInTheDocument();
    expect(button('Film')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button('Musica'));
    expect(callService).toHaveBeenCalledWith('media_player', 'select_sound_mode', {
      entity_id: TV,
      sound_mode: 'Musica',
    });
    cleanup();
    setup(samsung(modes));
    expect(screen.queryByRole('heading', { name: 'Modalità audio' })).toBeNull();
  });

  it('without a remote the channel buttons use the next and previous track', () => {
    const { callService } = setup(samsung(), '');
    fireEvent.click(button('Canale +'));
    expect(callService).toHaveBeenLastCalledWith('media_player', 'media_next_track', {
      entity_id: TV,
    });
    fireEvent.click(button('Canale −'));
    expect(callService).toHaveBeenLastCalledWith('media_player', 'media_previous_track', {
      entity_id: TV,
    });
  });

  it('the current source is highlighted', () => {
    setup(samsung({ source: 'HDMI' }));
    expect(button('HDMI')).toHaveAttribute('aria-pressed', 'true');
    expect(button('TV')).toHaveAttribute('aria-pressed', 'false');
  });

  it('without a remote and not LG: no channels, no remote keys', () => {
    const noSkip = SAMSUNG_FEATURES & ~(MEDIA_FEATURE.PREVIOUS_TRACK | MEDIA_FEATURE.NEXT_TRACK);
    setup(samsung({ supported_features: noSkip }), '');
    expect(screen.queryByRole('heading', { name: 'Canali' })).toBeNull();
    noButton('Canale');
    noButton('Su');
    noButton('Altri tasti');
  });
});

describe('TV details: Samsung remote', () => {
  const sent = (callService: ReturnType<typeof vi.fn>, command: string) =>
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: REMOTE,
      command,
    });

  it('channels, info, guide, source and exit send Samsung keys', () => {
    const { callService } = setup(samsung());
    fireEvent.click(button('Canale +'));
    sent(callService, 'KEY_CHUP');
    fireEvent.click(button('Canale −'));
    sent(callService, 'KEY_CHDOWN');
    for (const [name, key] of [
      ['Info', 'KEY_INFO'],
      ['Guida', 'KEY_GUIDE'],
      ['Sorgente', 'KEY_SOURCE'],
      ['Esci', 'KEY_EXIT'],
      ['Indietro', 'KEY_RETURN'],
      ['Home', 'KEY_HOME'],
      ['Menu', 'KEY_MENU'],
    ] as const) {
      fireEvent.click(button(name));
      sent(callService, key);
    }
  });

  it('colours and numbers are in the «Altri tasti» group', () => {
    const { callService } = setup(samsung());
    noButton('Rosso');
    const toggle = button('Altri tasti');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(button('Rosso'));
    sent(callService, 'KEY_RED');
    fireEvent.click(button('Blu'));
    sent(callService, 'KEY_CYAN');
    fireEvent.click(button('Tasto 5'));
    sent(callService, 'KEY_5');
    fireEvent.click(button('Tasto 0'));
    sent(callService, 'KEY_0');
  });
});

describe('TV details: LG webOS remote', () => {
  const pressed = (callService: ReturnType<typeof vi.fn>, name: string) =>
    expect(callService).toHaveBeenCalledWith('webostv', 'button', {
      entity_id: TV,
      button: name,
    });

  it('needs no remote entity and calls webostv.button', () => {
    const { callService } = setup(lg(), '');
    fireEvent.click(button('Su'));
    pressed(callService, 'UP');
    fireEvent.click(button('OK'));
    pressed(callService, 'ENTER');
    fireEvent.click(button('Indietro'));
    pressed(callService, 'BACK');
    fireEvent.click(button('Canale +'));
    pressed(callService, 'CHANNELUP');
    fireEvent.click(button('Canale −'));
    pressed(callService, 'CHANNELDOWN');
    fireEvent.click(button('Altri tasti'));
    fireEvent.click(button('Verde'));
    pressed(callService, 'GREEN');
    fireEvent.click(button('Tasto 9'));
    pressed(callService, '9');
  });

  it('has no guide or source key', () => {
    setup(lg(), '');
    noButton('Guida');
    noButton('Sorgente');
  });
});
