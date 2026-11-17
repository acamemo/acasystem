import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CellSize } from '@/@types/launcher';

// The brand logo of the TV is asked for the platform of the fixtures: none here.
const api = vi.hoisted(() => ({ getPower: vi.fn(), fetchBrandLogo: vi.fn(async () => null) }));
vi.mock('@/api/devicesApi', () => api);

import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { resetTvWake } from '@/components/widgets/media/hooks/useTvWake';
import {
  resolveTv,
  tvStatusLine,
  tvStatusOf,
  type TvKind,
} from '@/components/widgets/media/model/tv';
import { adaptiveStateWord } from '@/components/widgets/adaptive/adaptiveState';
import { AndroidTvConsole } from '@/components/widgets/media/widgets/TvConsole';
import { AndroidTvDetails, AppleTvDetails } from '@/components/widgets/media/widgets/TvDetails';
import { AndroidTvWidget, AppleTvWidget } from '@/components/widgets/media/widgets/TvWidget';

/**
 * The TV in words (gaps 1 and 4), the LG webOS TV that is off (gap 2), a request the TV never
 * confirmed (gap 3) and the inert power key that explains itself (gap 5).
 */

const TV = 'media_player.tv_sala';
const NO_POWER_HINT = 'Per accenderla da qui serve l’accensione dalla rete';
const NO_ANSWER = 'La TV non ha risposto. Riprova.';
const TURN_ON = 128;
const size2x2: CellSize = { w: 2, h: 2 };
const settings = { mediaPlayerId: TV };

const tv = (state: string, attributes: Record<string, unknown> = {}): HassEntity =>
  fixtureEntity(TV, state, {
    friendly_name: 'TV sala',
    app_name: 'Netflix',
    media_title: 'Dark',
    ...attributes,
  });

const lg = (state: string, extra: Record<string, unknown> = {}): HassEntity =>
  tv(state, { platform: 'webostv', config_entry_id: 'entry_lg', ...extra });

const recipe = (configured: boolean) => ({
  entryId: 'entry_lg',
  configured,
  active: configured ? true : null,
  message: null,
});

const resolve = (kind: TvKind, entity: HassEntity, canWake?: boolean | null) =>
  resolveTv(
    kind,
    fixtureEntities([entity]),
    'k',
    TV,
    [],
    {},
    canWake === undefined ? {} : { canWake }
  );

function setup(entity: HassEntity) {
  const callService = vi.fn(async () => undefined);
  const openDetails = vi.fn();
  const runtime = createFixtureRuntime({
    entities: fixtureEntities([entity]),
    callService,
    openDetails,
  });
  const wrap = (node: React.ReactNode) =>
    render(<WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>);
  return { callService, openDetails, wrap, runtime };
}

const android = (editMode = false) => (
  <AndroidTvWidget
    id="androidtv_card_1"
    settingsKey="k"
    settings={settings}
    size={size2x2}
    editMode={editMode}
  />
);
const apple = () => (
  <AppleTvWidget
    id="appletv_card_1"
    settingsKey="k"
    settings={settings}
    size={size2x2}
    editMode={false}
  />
);
const androidDetails = () => (
  <AndroidTvDetails id="androidtv_card_1" settingsKey="k" settings={settings} onClose={vi.fn()} />
);

beforeEach(() => {
  api.getPower.mockReset();
  resetTvWake();
});
afterEach(() => cleanup());

describe('TV status in words', () => {
  it.each([
    ['playing', 'In riproduzione'],
    ['paused', 'In pausa'],
    ['buffering', 'Caricamento…'],
    ['on', 'Acceso'],
    ['idle', 'Acceso'],
    ['off', 'Spento'],
    ['standby', 'In standby'],
    ['unavailable', 'Non raggiungibile'],
  ])('%s is «%s», for Android and Apple TV alike', (state, word) => {
    for (const kind of ['android', 'apple'] as const) {
      expect(tvStatusOf(resolve(kind, tv(state)))).toBe(word);
    }
  });

  it('standby is off for every kind of TV (the deprecated state)', () => {
    for (const kind of ['android', 'apple'] as const) {
      const view = resolve(kind, tv('standby'));
      expect(view.isOn).toBe(false);
      expect(view.unavailable).toBe(false);
    }
  });

  it('the status line starts with the word, then the app and the title while the TV is on', () => {
    expect(tvStatusLine(resolve('apple', tv('paused')))).toBe('In pausa · Netflix · Dark');
    expect(tvStatusLine(resolve('apple', tv('standby')))).toBe('In standby');
    expect(tvStatusLine(resolve('apple', tv('off')))).toBe('Spento');
  });

  it('live TV reads «TV in diretta»: the LG with its channel, the Samsung on «TV» alone', () => {
    const live = { app_name: undefined, media_title: undefined };
    const lgLive = resolve(
      'android',
      lg('on', {
        ...live,
        source: 'Live TV',
        media_title: 'Rai 1',
        media_content_type: 'channel',
      })
    );
    expect(tvStatusLine(lgLive)).toBe('Acceso · TV in diretta · Rai 1');
    expect(lgLive.liveTv).toBe(true);
    expect(lgLive.channelSkip).toBe(true);
    const samsung = resolve(
      'android',
      tv('on', { ...live, platform: 'samsungtv', source: 'TV' })
    );
    expect(tvStatusLine(samsung)).toBe('Acceso · TV in diretta');
    // A channel content type is live TV whatever the source says.
    const byType = resolve('android', tv('on', { ...live, source: '', media_content_type: 'channel' }));
    expect(tvStatusLine(byType)).toBe('Acceso · TV in diretta');
  });

  it('without an app the line uses the source, then «Schermata Home»', () => {
    const none = { app_name: undefined, media_title: undefined };
    expect(tvStatusLine(resolve('android', lg('on', { ...none, source: 'HDMI 1' })))).toBe(
      'Acceso · HDMI 1'
    );
    expect(tvStatusLine(resolve('android', lg('on', { ...none, source: 'Netflix' })))).toBe(
      'Acceso · Netflix'
    );
    expect(tvStatusLine(resolve('android', lg('on', none)))).toBe('Acceso · Schermata Home');
    // An app name still wins, and a Samsung TV always has channel keys.
    expect(tvStatusLine(resolve('android', lg('on', { source: 'HDMI 1' })))).toBe(
      'Acceso · Netflix · Dark'
    );
    expect(resolve('android', tv('on', { platform: 'samsungtv', source: 'HDMI' })).channelSkip).toBe(
      true
    );
    expect(resolve('android', lg('on', { source: 'Netflix' })).channelSkip).toBe(false);
  });

  it('the card, the details and the console say the same word', () => {
    const { wrap, runtime } = setup(tv('paused'));
    wrap(apple());
    expect(screen.getByText('In pausa · Netflix · Dark')).toBeInTheDocument();
    cleanup();
    render(
      <WidgetRuntimeProvider value={runtime}>
        <AppleTvDetails id="appletv_card_1" settingsKey="k" settings={settings} onClose={vi.fn()} />
      </WidgetRuntimeProvider>
    );
    expect(screen.getByText('In pausa · Netflix · Dark')).toBeInTheDocument();
    cleanup();
    render(
      <WidgetRuntimeProvider value={runtime}>
        <AndroidTvConsole
          id="androidtv_card_1"
          settingsKey="k"
          settings={settings}
          onClose={vi.fn()}
        />
      </WidgetRuntimeProvider>
    );
    expect(screen.getByText('In pausa · Netflix · Dark')).toBeInTheDocument();
  });

  it('buffering reads «Caricamento…» on the card', () => {
    setup(tv('buffering')).wrap(apple());
    expect(screen.getByText('Caricamento… · Netflix · Dark')).toBeInTheDocument();
  });

  it('standby never gets the danger tone; only «Non raggiungibile» does', () => {
    setup(tv('standby')).wrap(android());
    expect(screen.getByText('In standby').className).not.toContain('danger');
    cleanup();
    setup(tv('unavailable')).wrap(android());
    expect(screen.getByText('Non raggiungibile').className).toContain('danger');
  });

  it('standby switches on with turn_on, as an off TV', () => {
    const { wrap, callService } = setup(tv('standby'));
    wrap(apple());
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: TV });
  });
});

describe('the adaptive card of a TV', () => {
  it('uses the same words as the widget, the details and the console', () => {
    for (const type of ['androidtv', 'appletv']) {
      const word = (state: string) => adaptiveStateWord(type, tv(state), new Set());
      expect(word('paused')).toBe('In pausa');
      expect(word('buffering')).toBe('Caricamento…');
      expect(word('standby')).toBe('In standby');
      expect(word('off')).toBe('Spento');
      expect(word('idle')).toBe('Acceso');
      expect(word('playing')).toBe('In riproduzione');
    }
    // Other players keep their own words.
    expect(adaptiveStateWord('media', tv('buffering'), new Set())).toBe('In caricamento');
  });
});

describe('LG webOS TV that is off', () => {
  it('resolveTv: unavailable is «Spento» only for webOS with a way to wake it', () => {
    const asleep = resolve('android', lg('unavailable'), true);
    expect(asleep.wakeable).toBe(true);
    expect(asleep.unavailable).toBe(false);
    expect(asleep.isOn).toBe(false);
    expect(tvStatusOf(asleep)).toBe('Spento');
    // No wake method, or not a webOS TV: still a fault.
    expect(tvStatusOf(resolve('android', lg('unavailable'), false))).toBe('Non raggiungibile');
    const samsung = tv('unavailable', { platform: 'samsungtv' });
    expect(tvStatusOf(resolve('android', samsung, true))).toBe('Non raggiungibile');
    // Still being checked: shown as asleep until Home Assistant says otherwise.
    expect(tvStatusOf(resolve('android', lg('unavailable'), null))).toBe('Spento');
  });

  it('with the power-on recipe configured: «Spento», neutral, and the key wakes it', async () => {
    api.getPower.mockResolvedValue(recipe(true));
    const { wrap, callService } = setup(lg('unavailable', { supported_features: 0 }));
    wrap(android());
    const status = await screen.findByText('Spento');
    expect(status.className).not.toContain('danger');
    expect(screen.queryByText('Non raggiungibile')).toBeNull();
    expect(api.getPower).toHaveBeenCalledWith('entry_lg');
    const key = screen.getByRole('button', { name: 'Accendi' });
    expect(key).not.toBeDisabled();
    expect(screen.queryByText(NO_POWER_HINT)).toBeNull();
    fireEvent.click(key);
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: TV });
  });

  it('asks for the recipe once per entry, however many widgets and renders', async () => {
    api.getPower.mockResolvedValue(recipe(true));
    const { wrap } = setup(lg('unavailable'));
    wrap(android());
    await screen.findByText('Spento');
    cleanup();
    wrap(android());
    await screen.findByText('Spento');
    expect(api.getPower).toHaveBeenCalledTimes(1);
  });

  it('without a recipe: «Non raggiungibile», the key stays off and the sentence says why', async () => {
    api.getPower.mockResolvedValue(recipe(false));
    const { wrap } = setup(lg('unavailable'));
    wrap(android());
    await waitFor(() => expect(screen.getByText('Non raggiungibile')).toBeInTheDocument());
    expect(screen.getByText('Non raggiungibile').className).toContain('danger');
    expect(screen.getByRole('button', { name: 'Accendi' })).toBeDisabled();
    expect(screen.getByText(NO_POWER_HINT)).toBeInTheDocument();
  });

  it('a recipe that cannot be read counts as none', async () => {
    api.getPower.mockRejectedValue(new Error('offline'));
    const { wrap } = setup(lg('unavailable'));
    wrap(android());
    await waitFor(() => expect(screen.getByText('Non raggiungibile')).toBeInTheDocument());
  });

  it('an entity that declared TURN_ON when it was last seen needs no question', async () => {
    const { runtime } = setup(lg('playing'));
    const view = (entity: HassEntity) => (
      <WidgetRuntimeProvider value={{ ...runtime, entities: fixtureEntities([entity]) }}>
        {android()}
      </WidgetRuntimeProvider>
    );
    const { rerender } = render(view(lg('playing', { supported_features: TURN_ON })));
    expect(screen.getByText(/In riproduzione/)).toBeInTheDocument();
    rerender(view(lg('unavailable', { supported_features: undefined })));
    await waitFor(() => expect(screen.getByText('Spento')).toBeInTheDocument());
    expect(api.getPower).not.toHaveBeenCalled();
  });

  it('the details say «Spento» too, with the power key ready', async () => {
    api.getPower.mockResolvedValue(recipe(true));
    const { runtime } = setup(lg('unavailable'));
    render(<WidgetRuntimeProvider value={runtime}>{androidDetails()}</WidgetRuntimeProvider>);
    await screen.findByText('Spento');
    expect(screen.getByRole('button', { name: 'Accendi' })).not.toBeDisabled();
  });
});

describe('A request the TV never confirms', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const tap = (name: string) =>
    act(() => {
      fireEvent.click(screen.getByRole('button', { name }));
    });
  const timeout = () =>
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

  it('shows the message in the status line and in role=status, with «Riprova»', () => {
    const { wrap, callService } = setup(tv('playing'));
    wrap(apple());
    tap('Spegni');
    expect(callService).toHaveBeenCalledTimes(1);
    // While it waits: the key pulses and the word is still the confirmed one.
    expect(screen.getByRole('button', { name: 'Spegni' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('In riproduzione · Netflix · Dark')).toBeInTheDocument();
    timeout();
    expect(screen.getAllByText(NO_ANSWER).length).toBeGreaterThan(0);
    const live = screen.getAllByRole('status').find((node) => node.textContent === NO_ANSWER);
    expect(live).toBeDefined();
    expect(screen.getByRole('button', { name: 'Spegni' })).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument();
  });

  it('«Riprova» sends the same request again and starts waiting again', () => {
    const { wrap, callService } = setup(tv('playing'));
    wrap(apple());
    tap('Spegni');
    timeout();
    tap('Riprova');
    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService).toHaveBeenLastCalledWith('media_player', 'turn_off', { entity_id: TV });
    expect(screen.queryByRole('button', { name: 'Riprova' })).toBeNull();
    expect(screen.queryByText(NO_ANSWER)).toBeNull();
    expect(screen.getByRole('button', { name: 'Spegni' })).toHaveAttribute('aria-busy', 'true');
  });

  it('the details show it too, with the same «Riprova»', () => {
    const { runtime, callService } = setup(tv('on'));
    render(
      <WidgetRuntimeProvider value={runtime}>
        <AppleTvDetails id="appletv_card_1" settingsKey="k" settings={settings} onClose={vi.fn()} />
      </WidgetRuntimeProvider>
    );
    tap('Spegni');
    timeout();
    expect(screen.getAllByText(NO_ANSWER).length).toBeGreaterThan(0);
    tap('Riprova');
    expect(callService).toHaveBeenCalledTimes(2);
  });

  it('a state reported late clears the message', () => {
    const { runtime } = setup(tv('playing'));
    const view = (entity: HassEntity) => (
      <WidgetRuntimeProvider value={{ ...runtime, entities: fixtureEntities([entity]) }}>
        {apple()}
      </WidgetRuntimeProvider>
    );
    const { rerender } = render(view(tv('playing')));
    tap('Spegni');
    timeout();
    expect(screen.getAllByText(NO_ANSWER).length).toBeGreaterThan(0);
    rerender(view(tv('off')));
    expect(screen.queryByText(NO_ANSWER)).toBeNull();
    expect(screen.getByText('Spento')).toBeInTheDocument();
  });

  it('a rejected call keeps the generic failure message', async () => {
    vi.useRealTimers();
    const { runtime } = setup(tv('playing'));
    const failing = { ...runtime, callService: vi.fn(() => Promise.reject(new Error('no'))) };
    render(<WidgetRuntimeProvider value={failing}>{apple()}</WidgetRuntimeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    await waitFor(() =>
      expect(screen.getAllByText('Comando non riuscito. Riprova.').length).toBeGreaterThan(0)
    );
    expect(screen.queryByText(NO_ANSWER)).toBeNull();
  });
});

describe('The power key that cannot be used says why', () => {
  const samsungOff = () =>
    tv('off', { platform: 'samsungtv', supported_features: 24381 & ~TURN_ON });

  it('an off TV with no turn-on: inert key, and the sentence in the widget', () => {
    const { wrap, callService } = setup(samsungOff());
    wrap(android());
    const key = screen.getByRole('button', { name: 'Accendi' });
    expect(key).toBeDisabled();
    expect(screen.getByText(NO_POWER_HINT)).toBeInTheDocument();
    expect(screen.getByText('Spento').className).not.toContain('danger');
    fireEvent.click(key);
    expect(callService).not.toHaveBeenCalled();
  });

  it('the sentence is part of the area that opens the details', () => {
    const { wrap, openDetails } = setup(samsungOff());
    wrap(android());
    fireEvent.click(screen.getByText(NO_POWER_HINT));
    expect(openDetails).toHaveBeenCalledWith('androidtv_card_1');
  });

  it('the details repeat it', () => {
    const { runtime } = setup(samsungOff());
    render(<WidgetRuntimeProvider value={runtime}>{androidDetails()}</WidgetRuntimeProvider>);
    expect(screen.getByText(NO_POWER_HINT)).toBeInTheDocument();
  });

  it('a TV that can be switched on, or is on, has no sentence; edit mode shows none either', () => {
    setup(tv('off', { supported_features: TURN_ON })).wrap(android());
    expect(screen.queryByText(NO_POWER_HINT)).toBeNull();
    cleanup();
    setup(tv('playing')).wrap(android());
    expect(screen.queryByText(NO_POWER_HINT)).toBeNull();
    cleanup();
    setup(samsungOff()).wrap(android(true));
    expect(screen.queryByText(NO_POWER_HINT)).toBeNull();
  });
});
