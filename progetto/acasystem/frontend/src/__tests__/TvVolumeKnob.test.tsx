import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CellSize } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvWidget, AppleTvWidget } from '@/components/widgets/media/widgets/TvWidget';
import { AndroidTvDetails } from '@/components/widgets/media/widgets/TvDetails';
import { resolveTv, tvVolumeMode } from '@/components/widgets/media/model/tv';
import {
  VOLUME_STEP_INTERVAL_MS,
  VOLUME_PX_PER_STEP,
} from '@/components/widgets/media/parts/VolumeKnob';
import { VOLUME_SEND_INTERVAL_MS } from '@/components/widgets/media/hooks/useTvVolume';

/**
 * Single volume knob of the TV widget and details: tap mutes, vertical press-and-drag sets the
 * volume (level when the TV reports volume_level, relative steps otherwise: Samsung UE50J6200).
 */

const TV = 'media_player.tv_sala';
const LG_FEATURES = 4 | 8 | 1024 | 128 | 256; // VOLUME_SET, VOLUME_MUTE, VOLUME_STEP, TURN_OFF, TURN_ON
const SAMSUNG_FEATURES = 24381;

const lg = (state = 'on', attributes: Record<string, unknown> = {}): HassEntity =>
  fixtureEntity(TV, state, {
    friendly_name: 'TV sala',
    supported_features: LG_FEATURES,
    volume_level: 0.3,
    is_volume_muted: false,
    app_name: 'Netflix',
    ...attributes,
  });

const samsung = (state = 'on', attributes: Record<string, unknown> = {}): HassEntity =>
  fixtureEntity(TV, state, {
    friendly_name: 'UE50J6200',
    supported_features: SAMSUNG_FEATURES,
    platform: 'samsungtv',
    ...attributes,
  });

function setup(entity: HassEntity) {
  const callService = vi.fn(async () => undefined);
  const runtime = createFixtureRuntime({
    entities: fixtureEntities([entity]),
    callService,
  });
  const wrap = (node: React.ReactNode) =>
    render(<WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>);
  return { callService, wrap };
}

const widget = (size: CellSize, editMode = false, settings: Record<string, unknown> = {}) => (
  <AndroidTvWidget
    id="androidtv_card_1"
    settingsKey="k"
    settings={{ mediaPlayerId: TV, ...settings }}
    size={size}
    editMode={editMode}
  />
);
const details = (settings: Record<string, unknown> = {}) => (
  <AndroidTvDetails
    id="androidtv_card_1"
    settingsKey="k"
    settings={{ mediaPlayerId: TV, ...settings }}
    onClose={() => undefined}
  />
);
const knob = () => screen.getByRole('slider', { name: 'Volume' });
const pointer = { pointerId: 1, pointerType: 'touch' } as const;
const press = (y: number) => fireEvent.pointerDown(knob(), { ...pointer, button: 0, clientY: y });
const moveTo = (y: number) => fireEvent.pointerMove(knob(), { ...pointer, clientY: y });
const release = (y: number) => fireEvent.pointerUp(knob(), { ...pointer, clientY: y });
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const calls = (service: string, ctx: { mock: { calls: unknown[][] } }) =>
  ctx.mock.calls.filter(([, name]) => name === service);

afterEach(() => cleanup());

describe('Mode of the volume knob', () => {
  it('level when the TV reports volume_level and can set it, step otherwise', () => {
    const view = (entity: HassEntity, kind: 'android' | 'apple' = 'android') =>
      resolveTv(kind, fixtureEntities([entity]), 'c', TV, [], {});
    expect(tvVolumeMode('android', view(lg()))).toBe('level');
    // Samsung 24381 declares VOLUME_SET but reports no volume_level.
    expect(tvVolumeMode('android', view(samsung()))).toBe('step');
    expect(tvVolumeMode('android', view(fixtureEntity(TV, 'on', {})))).toBeNull();
    expect(tvVolumeMode('android', view(fixtureEntity(TV, 'on', {})), true)).toBe('step');
    expect(tvVolumeMode('apple', view(fixtureEntity(TV, 'on', {})))).toBe('step');
  });
});

describe('Volume knob: tap', () => {
  it('mutes and unmutes with the explicit state of the entity', () => {
    const { callService, wrap } = setup(lg());
    wrap(widget({ w: 2, h: 2 }));
    press(300);
    release(300);
    fireEvent.click(knob());
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_mute', {
      entity_id: TV,
      is_volume_muted: true,
    });
    expect(knob()).toHaveAttribute('aria-valuetext', 'Volume 30 %, audio disattivato');
  });

  it('unmutes a muted TV', () => {
    const { callService, wrap } = setup(lg('on', { is_volume_muted: true }));
    wrap(widget({ w: 2, h: 2 }));
    fireEvent.click(knob());
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_mute', {
      entity_id: TV,
      is_volume_muted: false,
    });
  });

  it('a TV without is_volume_muted keeps the state locally for the icon', () => {
    const { callService, wrap } = setup(samsung());
    wrap(widget({ w: 2, h: 2 }));
    expect(knob()).toHaveAttribute('aria-valuetext', 'Volume, audio attivo');
    fireEvent.click(knob());
    expect(knob()).toHaveAttribute('aria-valuetext', 'Volume, audio disattivato');
    fireEvent.click(knob());
    expect(callService.mock.calls).toEqual([
      ['media_player', 'volume_mute', { entity_id: TV, is_volume_muted: true }],
      ['media_player', 'volume_mute', { entity_id: TV, is_volume_muted: false }],
    ]);
    expect(knob()).toHaveAttribute('aria-valuetext', 'Volume, audio attivo');
  });

  it('a TV that only declares volume steps does not mute', () => {
    const { callService, wrap } = setup(
      fixtureEntity(TV, 'on', { supported_features: 1024, friendly_name: 'TV sala' })
    );
    wrap(widget({ w: 2, h: 2 }));
    fireEvent.click(knob());
    expect(calls('volume_mute', callService)).toHaveLength(0);
  });
});

describe('Volume knob: drag in level mode', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('previews at once, sends volume_set throttled and the final value on release', () => {
    const { callService, wrap } = setup(lg());
    wrap(widget({ w: 2, h: 2 }));
    press(300);
    // Inside the dead zone nothing happens.
    moveTo(295);
    expect(callService).not.toHaveBeenCalled();
    // 8 px up = +5 %: 30 → 35, sent at once.
    moveTo(292);
    expect(calls('volume_set', callService)).toHaveLength(1);
    expect(callService).toHaveBeenLastCalledWith('media_player', 'volume_set', {
      entity_id: TV,
      volume_level: 0.35,
    });
    expect(screen.getByText('35 %')).toBeInTheDocument();
    // 32 px up = +20 %: the preview follows, the TV only gets it at the next interval.
    moveTo(268);
    expect(screen.getByText('50 %')).toBeInTheDocument();
    expect(calls('volume_set', callService)).toHaveLength(1);
    advance(VOLUME_SEND_INTERVAL_MS);
    expect(calls('volume_set', callService)).toHaveLength(2);
    expect(callService).toHaveBeenLastCalledWith('media_player', 'volume_set', {
      entity_id: TV,
      volume_level: 0.5,
    });
    moveTo(252);
    release(252);
    // 48 px up = +30 %: final value at once, without waiting.
    expect(callService).toHaveBeenLastCalledWith('media_player', 'volume_set', {
      entity_id: TV,
      volume_level: 0.6,
    });
    // The click that follows a drag does not mute.
    fireEvent.click(knob());
    expect(calls('volume_mute', callService)).toHaveLength(0);
  });

  it('dragging down lowers the volume and never goes below 0', () => {
    const { callService, wrap } = setup(lg());
    wrap(widget({ w: 2, h: 2 }));
    press(200);
    moveTo(400);
    release(400);
    expect(callService).toHaveBeenLastCalledWith('media_player', 'volume_set', {
      entity_id: TV,
      volume_level: 0,
    });
  });

  it('a cancelled gesture stops sending and does not mute', () => {
    const { callService, wrap } = setup(lg());
    wrap(widget({ w: 2, h: 2 }));
    press(300);
    moveTo(292);
    moveTo(250);
    fireEvent.pointerCancel(knob(), { ...pointer, clientY: 250 });
    advance(VOLUME_SEND_INTERVAL_MS * 3);
    expect(calls('volume_set', callService)).toHaveLength(1);
    fireEvent.click(knob());
    expect(calls('volume_mute', callService)).toHaveLength(0);
  });

  it('keeps the gesture to itself: no page swipe or long press', () => {
    const { wrap } = setup(lg());
    const parentSeen = vi.fn();
    wrap(<div onPointerDown={parentSeen}>{widget({ w: 2, h: 2 })}</div>);
    expect(knob()).toHaveAttribute('data-no-long-press');
    press(300);
    expect(parentSeen).not.toHaveBeenCalled();
  });
});

describe('Volume knob: drag in step mode (Samsung, no volume_level)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('one volume_up per step of travel, in order and paced', () => {
    const { callService, wrap } = setup(samsung());
    wrap(widget({ w: 2, h: 2 }));
    press(400);
    // 5 steps asked in one move: the first goes out at once, the others at 5 per second.
    moveTo(400 - 5 * VOLUME_PX_PER_STEP);
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(calls('volume_up', callService)).toHaveLength(1);
    advance(VOLUME_STEP_INTERVAL_MS);
    expect(calls('volume_up', callService)).toHaveLength(2);
    // Released: the queue still drains.
    release(400 - 5 * VOLUME_PX_PER_STEP);
    advance(VOLUME_STEP_INTERVAL_MS * 3);
    expect(callService.mock.calls).toEqual(
      Array.from({ length: 5 }, () => ['media_player', 'volume_up', { entity_id: TV }])
    );
    advance(VOLUME_STEP_INTERVAL_MS * 5);
    expect(calls('volume_up', callService)).toHaveLength(5);
    expect(calls('volume_set', callService)).toHaveLength(0);
    fireEvent.click(knob());
    expect(calls('volume_mute', callService)).toHaveLength(0);
  });

  it('dragging down sends volume_down and shows a negative count, never a percentage', () => {
    const { callService, wrap } = setup(samsung());
    wrap(widget({ w: 2, h: 2 }));
    press(300);
    moveTo(300 + VOLUME_PX_PER_STEP);
    expect(screen.getByText('−1')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    release(300 + VOLUME_PX_PER_STEP);
    expect(callService.mock.calls).toEqual([['media_player', 'volume_down', { entity_id: TV }]]);
  });

  it('less travel than a step sends nothing', () => {
    const { callService, wrap } = setup(samsung());
    wrap(widget({ w: 2, h: 2 }));
    press(300);
    moveTo(300 - (VOLUME_PX_PER_STEP - 1));
    release(300 - (VOLUME_PX_PER_STEP - 1));
    expect(callService).not.toHaveBeenCalled();
  });

  it('a cancelled gesture drops the queued steps', () => {
    const { callService, wrap } = setup(samsung());
    wrap(widget({ w: 2, h: 2 }));
    press(400);
    moveTo(400 - 5 * VOLUME_PX_PER_STEP);
    fireEvent.pointerCancel(knob(), { ...pointer, clientY: 300 });
    advance(VOLUME_STEP_INTERVAL_MS * 6);
    expect(calls('volume_up', callService)).toHaveLength(1);
  });
});

describe('Volume knob: keyboard', () => {
  it('arrows change the level by 5 % and a step in step mode', () => {
    const level = setup(lg());
    level.wrap(widget({ w: 2, h: 2 }));
    fireEvent.keyDown(knob(), { key: 'ArrowUp' });
    expect(level.callService).toHaveBeenLastCalledWith('media_player', 'volume_set', {
      entity_id: TV,
      volume_level: 0.35,
    });
    cleanup();
    const step = setup(samsung());
    step.wrap(widget({ w: 2, h: 2 }));
    fireEvent.keyDown(knob(), { key: 'ArrowDown' });
    expect(step.callService).toHaveBeenLastCalledWith('media_player', 'volume_down', {
      entity_id: TV,
    });
  });

  it('is a slider with the level, a hint and Enter/Space handled by the button', () => {
    const { wrap } = setup(lg());
    wrap(widget({ w: 2, h: 2 }));
    expect(knob().tagName).toBe('BUTTON');
    expect(knob()).toHaveAttribute('aria-valuenow', '30');
    expect(knob()).toHaveAttribute('aria-valuetext', 'Volume 30 %');
    expect(knob()).toHaveAccessibleDescription(
      'Tocca per disattivare l’audio, trascina in verticale per regolare il volume.'
    );
  });
});

describe('Volume knob: widget layout by size', () => {
  it.each<[string, CellSize, string]>([
    ['2x1', { w: 2, h: 1 }, 'aca-vknob--md'],
    ['3x1', { w: 3, h: 1 }, 'aca-vknob--md'],
    ['4x1', { w: 4, h: 1 }, 'aca-vknob--md'],
    ['2x2', { w: 2, h: 2 }, 'aca-vknob--lg'],
    ['3x2', { w: 3, h: 2 }, 'aca-vknob--xl'],
    ['4x2', { w: 4, h: 2 }, 'aca-vknob--xl'],
  ])('%s: the knob is there while the TV is on', (_name, size, sizeClass) => {
    const { wrap } = setup(lg());
    const { container } = wrap(widget(size));
    expect(knob()).toBeInTheDocument();
    expect(container.querySelector(`.${sizeClass}`)).not.toBeNull();
    // No D-pad on the tile.
    expect(screen.queryByRole('button', { name: 'Su' })).toBeNull();
  });

  it('the knob sits before the power button on a compact tile', () => {
    const { wrap } = setup(lg());
    wrap(widget({ w: 2, h: 1 }));
    const power = screen.getByRole('button', { name: 'Spegni' });
    expect(knob().compareDocumentPosition(power) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('off: the knob and the channel key stay, inert and «waiting»; power turns on', () => {
    const { wrap, callService } = setup(lg('off'));
    const { container } = wrap(widget({ w: 2, h: 2 }, false, { remoteId: 'remote.tv' }));
    expect(knob()).toBeDisabled();
    expect(container.querySelector('.aca-vknob.aca-media-key--waiting')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Canale' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: TV });
    expect(container.querySelector('.aca-media-widget--off')).not.toBeNull();
  });

  it('unavailable: the knob stays, inert', () => {
    const { wrap } = setup(lg('unavailable'));
    wrap(widget({ w: 2, h: 2 }));
    expect(knob()).toBeDisabled();
  });

  it('2x1 off: knob and power are on the tile, no channel or play key', () => {
    const { wrap } = setup(lg('off'));
    wrap(widget({ w: 2, h: 1 }, false, { remoteId: 'remote.tv' }));
    expect(knob()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Accendi' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Canale|Riproduci|Metti in pausa/ })).toBeNull();
  });

  it('2x1 on: no channel or play key', () => {
    const { wrap } = setup(lg());
    wrap(widget({ w: 2, h: 1 }, false, { remoteId: 'remote.tv' }));
    expect(screen.queryByRole('button', { name: /Canale|Riproduci|Metti in pausa/ })).toBeNull();
  });

  it('2x2: three keys in order power, volume, channel', () => {
    const { wrap } = setup(lg());
    const { container } = wrap(widget({ w: 2, h: 2 }, false, { remoteId: 'remote.tv' }));
    const keys = Array.from(container.querySelectorAll('.aca-media-keys button')).map((el) =>
      el.getAttribute('aria-label')
    );
    expect(keys).toEqual(['Spegni', 'Volume', 'Canale']);
  });

  it('Samsung off cannot be turned on: the power key is faded and inert, with no text', () => {
    const { wrap, callService } = setup(samsung('off'));
    const { container } = wrap(widget({ w: 2, h: 2 }));
    const power = screen.getByRole('button', { name: 'Accendi' });
    expect(power).toBeDisabled();
    expect(power.className).toContain('aca-media-key--waiting');
    expect(container.querySelector('.aca-media-keys .aca-vknob')).not.toBeNull();
    fireEvent.click(power);
    expect(callService).not.toHaveBeenCalled();
    expect(screen.queryByText(/telecomando/)).toBeNull();
  });

  it('a TV without volume or mute declares no knob', () => {
    const { wrap } = setup(fixtureEntity(TV, 'on', { friendly_name: 'TV sala' }));
    wrap(widget({ w: 2, h: 2 }));
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('edit mode: the knob is inert', () => {
    const { callService, wrap } = setup(lg());
    wrap(widget({ w: 2, h: 2 }, true));
    expect(knob()).toBeDisabled();
    fireEvent.click(knob());
    expect(callService).not.toHaveBeenCalled();
  });

  it('Apple TV tile shows the knob too and keeps its tap-to-toggle', () => {
    const { callService, wrap } = setup(lg('on', { supported_features: 0 }));
    wrap(
      <AppleTvWidget
        id="appletv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV, tapAction: 'toggle' }}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    expect(knob()).toBeInTheDocument();
    fireEvent.click(knob());
    // The knob click is the knob's: it does not reach the tap-to-toggle of the background.
    expect(calls('turn_off', callService)).toHaveLength(0);
  });
});

describe('Channel key of the widget', () => {
  const channelKey = () => screen.getByRole('button', { name: 'Canale' });
  const channelPress = (y: number) =>
    fireEvent.pointerDown(channelKey(), { ...pointer, button: 0, clientY: y });
  const channelMove = (y: number) =>
    fireEvent.pointerMove(channelKey(), { ...pointer, clientY: y });
  const channelRelease = (y: number) =>
    fireEvent.pointerUp(channelKey(), { ...pointer, clientY: y });
  const keysSent = (callService: { mock: { calls: unknown[][] } }, command: string) =>
    callService.mock.calls.filter(
      ([domain, service, data]) =>
        domain === 'remote' &&
        service === 'send_command' &&
        (data as { command: string }).command === command
    );

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a tap is one channel up (Samsung KEY_CHUP through its remote)', () => {
    const { wrap, callService } = setup(samsung());
    wrap(widget({ w: 2, h: 2 }, false, { remoteId: 'remote.tv' }));
    fireEvent.click(channelKey());
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: 'remote.tv',
      command: 'KEY_CHUP',
    });
  });

  it('dragging up goes one channel per step, paced like the volume; down goes back', () => {
    const { wrap, callService } = setup(samsung());
    wrap(widget({ w: 2, h: 2 }, false, { remoteId: 'remote.tv' }));
    channelPress(400);
    channelMove(400 - 3 * VOLUME_PX_PER_STEP);
    expect(keysSent(callService, 'KEY_CHUP')).toHaveLength(1);
    advance(VOLUME_STEP_INTERVAL_MS * 2);
    expect(keysSent(callService, 'KEY_CHUP')).toHaveLength(3);
    channelRelease(400 - 3 * VOLUME_PX_PER_STEP);
    // The drag is not also a tap.
    fireEvent.click(channelKey());
    expect(keysSent(callService, 'KEY_CHUP')).toHaveLength(3);

    channelPress(300);
    channelMove(300 + 2 * VOLUME_PX_PER_STEP);
    advance(VOLUME_STEP_INTERVAL_MS);
    channelRelease(300 + 2 * VOLUME_PX_PER_STEP);
    expect(keysSent(callService, 'KEY_CHDOWN')).toHaveLength(2);
  });

  it('LG webOS uses webostv.button, with no remote entity', () => {
    const { wrap, callService } = setup(lg('on', { platform: 'webostv' }));
    wrap(widget({ w: 2, h: 2 }));
    fireEvent.click(channelKey());
    expect(callService).toHaveBeenCalledWith('webostv', 'button', {
      entity_id: TV,
      button: 'CHANNELUP',
    });
  });

  it('without a channel key falls back to the next track when the TV declares it', () => {
    const { wrap, callService } = setup(lg('on', { supported_features: LG_FEATURES | 16 | 32 }));
    wrap(widget({ w: 2, h: 2 }));
    fireEvent.click(channelKey());
    expect(callService).toHaveBeenCalledWith('media_player', 'media_next_track', { entity_id: TV });
  });

  it('a TV with no way to change channel leaves the slot empty', () => {
    const { wrap } = setup(lg());
    const { container } = wrap(widget({ w: 2, h: 2 }));
    expect(screen.queryByRole('button', { name: 'Canale' })).toBeNull();
    expect(container.querySelectorAll('.aca-media-keys > *')).toHaveLength(2);
  });
});

describe('Volume knob: details', () => {
  it('big knob with the −/+ buttons as single-pointer alternative', () => {
    const { callService, wrap } = setup(lg());
    wrap(details());
    expect(knob()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Alza il volume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbassa il volume' }));
    expect(callService.mock.calls).toEqual([
      ['media_player', 'volume_up', { entity_id: TV }],
      ['media_player', 'volume_down', { entity_id: TV }],
    ]);
    // The separate mute button is gone: mute is the tap of the knob.
    expect(screen.queryByRole('button', { name: /Disattiva l.audio/ })).toBeNull();
    fireEvent.click(knob());
    expect(callService).toHaveBeenLastCalledWith('media_player', 'volume_mute', {
      entity_id: TV,
      is_volume_muted: true,
    });
  });

  it('Samsung without volume_level works in step mode', () => {
    const { callService, wrap } = setup(samsung());
    wrap(details({ remoteId: 'remote.tv' }));
    expect(knob()).not.toHaveAttribute('aria-valuenow');
    fireEvent.keyDown(knob(), { key: 'ArrowUp' });
    expect(callService).toHaveBeenLastCalledWith('media_player', 'volume_up', { entity_id: TV });
  });

  it('a TV without remote or volume features shows no knob', () => {
    const { wrap } = setup(fixtureEntity(TV, 'on', { friendly_name: 'TV sala' }));
    wrap(details());
    expect(screen.queryByRole('slider')).toBeNull();
  });
});
