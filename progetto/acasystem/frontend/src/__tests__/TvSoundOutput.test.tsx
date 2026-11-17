import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvConsole } from '@/components/widgets/media/widgets/TvConsole';
import { AndroidTvDetails } from '@/components/widgets/media/widgets/TvDetails';
import { MEDIA_FEATURE } from '@/components/widgets/media/model/features';
import { tvSoundOutputs } from '@/components/widgets/media/model/tvSound';

/** «Uscita audio» of an LG webOS TV: `webostv.select_sound_output`, confirmed by `sound_output`. */

const TV = 'media_player.tv_lg';
const FEATURES = MEDIA_FEATURE.VOLUME_SET | MEDIA_FEATURE.VOLUME_STEP | MEDIA_FEATURE.SELECT_SOURCE;
const NOT_CONNECTED = 'La TV non ha questa uscita collegata';

const tv = (state: string, attributes: Record<string, unknown> = {}): HassEntity =>
  fixtureEntity(TV, state, {
    friendly_name: 'TV LG',
    supported_features: FEATURES,
    platform: 'webostv',
    sound_output: 'tv_speaker',
    ...attributes,
  });

function setup(
  entity: HassEntity,
  callService: (...args: unknown[]) => Promise<unknown> = vi.fn(async () => undefined),
  Component = AndroidTvDetails
) {
  const tree = (current: HassEntity) => (
    <WidgetRuntimeProvider
      value={createFixtureRuntime({ entities: fixtureEntities([current]), callService })}
    >
      <Component
        id="android_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV }}
        onClose={() => undefined}
      />
    </WidgetRuntimeProvider>
  );
  const { rerender } = render(tree(entity));
  return { callService, report: (next: HassEntity) => rerender(tree(next)) };
}

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('uscita audio: model', () => {
  it('lists the five documented outputs for an LG and none for other TVs', () => {
    expect(tvSoundOutputs(tv('on')).map(({ value }) => value)).toEqual([
      'tv_speaker',
      'external_arc',
      'external_optical',
      'external_speaker',
      'headphone',
    ]);
    expect(tvSoundOutputs(tv('on', { platform: 'samsungtv' }))).toEqual([]);
    expect(tvSoundOutputs(tv('on', { platform: undefined }))).toEqual([]);
  });

  it('adds the current output when it is not a documented one, with a readable name', () => {
    const known = tvSoundOutputs(tv('on', { sound_output: 'lineout' })).at(-1);
    expect(known).toEqual({ value: 'lineout', name: 'Uscita analogica (line out)' });
    const unknown = tvSoundOutputs(tv('on', { sound_output: 'mystery_out' })).at(-1);
    expect(unknown).toEqual({ value: 'mystery_out', name: 'mystery_out' });
  });
});

describe('uscita audio: details and console', () => {
  it('shows the section for an LG that is on, with the current output pressed', () => {
    setup(tv('on'));
    expect(screen.getByRole('heading', { name: 'Uscita audio' })).toBeTruthy();
    expect(pressed('Altoparlanti della TV')).toBe('true');
    expect(pressed('Soundbar o impianto (HDMI ARC)')).toBe('false');
    for (const name of ['Uscita ottica', 'Altoparlante esterno', 'Cuffie']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('shows it in the console too', () => {
    setup(tv('on'), undefined, AndroidTvConsole);
    expect(screen.getByRole('heading', { name: 'Uscita audio' })).toBeTruthy();
  });

  it('does not show it for another brand, an LG that is off or one that is not reachable', () => {
    for (const entity of [
      tv('on', { platform: 'samsungtv' }),
      tv('off'),
      tv('unavailable', { sound_output: undefined }),
    ]) {
      setup(entity);
      expect(screen.queryByRole('heading', { name: 'Uscita audio' })).toBeNull();
      cleanup();
    }
  });

  it('lists a current output outside the documented ones and marks it', () => {
    setup(tv('on', { sound_output: 'bt_soundbar' }));
    expect(pressed('Soundbar Bluetooth')).toBe('true');
    cleanup();
    setup(tv('on', { sound_output: 'strange_one' }));
    expect(pressed('strange_one')).toBe('true');
  });

  it('calls webostv.select_sound_output and marks the new output once the TV reports it', async () => {
    const { callService, report } = setup(tv('on'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Soundbar o impianto (HDMI ARC)' }));
    });
    expect(callService).toHaveBeenCalledWith('webostv', 'select_sound_output', {
      entity_id: TV,
      sound_output: 'external_arc',
    });
    // Until the TV reports it, the old output stays the current one.
    expect(pressed('Altoparlanti della TV')).toBe('true');
    await act(async () => report(tv('on', { sound_output: 'external_arc' })));
    expect(pressed('Soundbar o impianto (HDMI ARC)')).toBe('true');
    expect(screen.queryByText(NOT_CONNECTED)).toBeNull();
  });

  it('says the output is not connected when the TV never moves to it', async () => {
    setup(tv('on'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Uscita ottica' }));
    });
    expect(screen.queryByText(NOT_CONNECTED)).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(10_001);
    });
    expect(screen.getByText(NOT_CONNECTED)).toBeTruthy();
    expect(pressed('Altoparlanti della TV')).toBe('true');
  });

  it('says it at once when the call fails', async () => {
    setup(
      tv('on'),
      vi.fn(async () => {
        throw new Error('rejected');
      })
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cuffie' }));
    });
    expect(screen.getByText(NOT_CONNECTED)).toBeTruthy();
  });
});
