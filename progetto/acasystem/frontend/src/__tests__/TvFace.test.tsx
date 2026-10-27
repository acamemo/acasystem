import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvWidget } from '@/components/widgets/media/widgets/TvWidget';
import { AndroidTvConsole } from '@/components/widgets/media/widgets/TvConsole';
import { Transport } from '@/components/widgets/media/parts/Controls';
import type { MediaControls } from '@/components/widgets/media/hooks/useMediaControls';

/**
 * The base keys of the TV are one component (TvFace): widget and console show the same row, with
 * the same classes and the same disabled state, TV on or off.
 */

const TV = 'media_player.tv_sala';
const REMOTE = 'remote.tv_sala';
// VOLUME_SET, VOLUME_MUTE, TURN_ON, TURN_OFF
const FEATURES = 4 | 8 | 128 | 256;

const tv = (state: string): HassEntity =>
  fixtureEntity(TV, state, {
    friendly_name: 'TV sala',
    supported_features: FEATURES,
    volume_level: 0.3,
    is_volume_muted: false,
    app_name: 'Netflix',
  });

function mount(state: string, node: 'widget' | 'console') {
  const callService = vi.fn(async () => undefined);
  const runtime = createFixtureRuntime({ entities: fixtureEntities([tv(state)]), callService });
  const settings = { mediaPlayerId: TV, remoteId: REMOTE };
  const content =
    node === 'widget' ? (
      <AndroidTvWidget
        id="androidtv_card_1"
        settingsKey="k"
        settings={settings}
        size={{ w: 3, h: 2 }}
        editMode={false}
      />
    ) : (
      <AndroidTvConsole
        id="androidtv_card_1"
        settingsKey="k"
        settings={settings}
        onClose={() => undefined}
      />
    );
  const view = render(<WidgetRuntimeProvider value={runtime}>{content}</WidgetRuntimeProvider>);
  return { ...view, callService };
}

const keyRow = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.aca-media-keys button')).map((button) => ({
    label: button.getAttribute('aria-label'),
    className: button.className,
    parent: button.parentElement?.className,
    disabled: (button as HTMLButtonElement).disabled,
  }));

afterEach(() => cleanup());

describe('TV face: widget and console', () => {
  it.each(['off', 'on'])('the same key row with the TV %s', (state) => {
    const widget = mount(state, 'widget');
    const widgetRow = keyRow(widget.container);
    widget.unmount();
    const console = mount(state, 'console');
    expect(widgetRow.length).toBeGreaterThanOrEqual(2);
    expect(keyRow(console.container)).toEqual(widgetRow);
  });

  it('with the TV off the keys are faded (waiting) as on the widget', () => {
    const { container } = mount('off', 'console');
    const waiting = container.querySelectorAll('.aca-media-key--waiting');
    // Power waits only when it cannot turn on; the volume knob always does with the TV off.
    expect(waiting.length).toBeGreaterThanOrEqual(1);
    expect(container.querySelector('.aca-vknob.aca-media-key--waiting')).not.toBeNull();
  });

  it('the knob of the console is inert with the TV off and acts with the TV on', () => {
    const off = mount('off', 'console');
    fireEvent.click(screen.getByRole('slider', { name: 'Volume' }));
    expect(off.callService).not.toHaveBeenCalled();
    cleanup();
    const on = mount('on', 'console');
    fireEvent.click(screen.getByRole('slider', { name: 'Volume' }));
    expect(on.callService).toHaveBeenCalledWith('media_player', 'volume_mute', {
      entity_id: TV,
      is_volume_muted: true,
    });
  });
});

describe('Transport: stop and keys around play', () => {
  const noop = () => undefined;
  const command = { value: false, pending: false, error: false };
  const controls = {
    caps: { playPause: true, previous: true, next: true, shuffle: false, repeat: false },
    playing: command,
    power: command,
    powerAction: null,
    shuffle: command,
    repeat: { ...command, value: 'off' },
    busy: null,
    togglePlay: noop,
    previous: noop,
    next: noop,
  } as unknown as MediaControls;

  it('shows stop and the slot keys only when given, in order around play', () => {
    const onStop = vi.fn();
    const { rerender } = render(<Transport controls={controls} variant="full" />);
    expect(screen.queryByRole('button', { name: 'Ferma' })).toBeNull();
    rerender(
      <Transport
        controls={controls}
        variant="full"
        onStop={onStop}
        beforePlay={<button aria-label="Indietro veloce" />}
        afterPlay={<button aria-label="Avanti veloce" />}
        playLabel="Play/Pausa"
      />
    );
    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual([
      'Brano precedente',
      'Indietro veloce',
      'Play/Pausa',
      'Avanti veloce',
      'Ferma',
      'Brano successivo',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Ferma' }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
