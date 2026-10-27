import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvDetails } from '@/components/widgets/media/widgets/TvDetails';
import { MEDIA_FEATURE } from '@/components/widgets/media/model/features';
import {
  TV_APP_SETTLE_MS,
  TV_WAKE_TIMEOUT_MS,
} from '@/components/widgets/media/hooks/useTvAppLaunch';

/** An app tapped with the TV off: the TV is switched on, then the app opens. */

const TV = 'media_player.tv_salotto';
const POWER = MEDIA_FEATURE.TURN_ON | MEDIA_FEATURE.TURN_OFF;
const android = (state: string, features = POWER | MEDIA_FEATURE.PLAY_MEDIA) =>
  fixtureEntity(TV, state, {
    friendly_name: 'Salotto',
    supported_features: features,
    platform: 'androidtv_remote',
  });

const netflix = {
  entity_id: TV,
  media_content_type: 'url',
  media_content_id: 'netflix://',
};

function setup(state: string, features?: number) {
  const callService = vi.fn(async () => undefined);
  const tree = (entity: ReturnType<typeof android>) => (
    <WidgetRuntimeProvider
      value={createFixtureRuntime({ entities: fixtureEntities([entity]), callService })}
    >
      <AndroidTvDetails
        id="androidtv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV }}
        onClose={() => undefined}
      />
    </WidgetRuntimeProvider>
  );
  const { rerender } = render(tree(android(state, features)));
  return { callService, report: (next: string) => rerender(tree(android(next, features))) };
}

const tap = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TV apps: tap with the TV off', () => {
  it('switches the TV on and opens the app once it is on', async () => {
    const { callService, report } = setup('off');
    await tap('Netflix');
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: TV });
    expect(callService).not.toHaveBeenCalledWith('media_player', 'play_media', netflix);
    report('on');
    await act(async () => {
      vi.advanceTimersByTime(TV_APP_SETTLE_MS - 1);
    });
    expect(callService).not.toHaveBeenCalledWith('media_player', 'play_media', netflix);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(callService).toHaveBeenCalledWith('media_player', 'play_media', netflix);
  });

  it('a TV that does not come on in time: no app, the command failed', async () => {
    const { callService } = setup('off');
    await tap('Netflix');
    await act(async () => {
      vi.advanceTimersByTime(TV_WAKE_TIMEOUT_MS);
    });
    expect(callService).not.toHaveBeenCalledWith('media_player', 'play_media', netflix);
    expect(screen.getAllByText('Comando non riuscito. Riprova.').length).toBeGreaterThan(0);
  });

  it('with the TV on the app opens at once', async () => {
    const { callService } = setup('on');
    await tap('Netflix');
    expect(callService).toHaveBeenCalledWith('media_player', 'play_media', netflix);
    expect(callService).not.toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: TV });
  });

  it('a TV that cannot be switched on: the apps are inert while it is off', async () => {
    const { callService } = setup('off', MEDIA_FEATURE.TURN_OFF | MEDIA_FEATURE.PLAY_MEDIA);
    expect(screen.getByRole('button', { name: 'Netflix' })).toBeDisabled();
    await tap('Netflix');
    expect(callService).not.toHaveBeenCalled();
  });
});
