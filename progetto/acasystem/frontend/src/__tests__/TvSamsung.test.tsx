import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvWidget } from '@/components/widgets/media/widgets/TvWidget';
import { AndroidTvDetails } from '@/components/widgets/media/widgets/TvDetails';

/**
 * REP-20261026-006: the Samsung UE50J6200 (2015, encrypted protocol) added from «Rileva
 * dispositivi». HA's `turn_off` sends KEY_POWEROFF then KEY_POWER and the TV stays on; KEY_POWER
 * alone switches it off. The TV declares volume steps and mute (supported_features 24381), which
 * the details showed only with Apple TV.
 */

const TV = 'media_player.ue50j6200_ue50j6200';
const REMOTE = 'remote.ue50j6200_ue50j6200';
const SAMSUNG_FEATURES = 24381;

const samsung = (state: string, platform = 'samsungtv'): HassEntity =>
  fixtureEntity(TV, state, {
    friendly_name: 'UE50J6200',
    supported_features: SAMSUNG_FEATURES,
    device_class: 'tv',
    platform,
  });

function setup(entity: HassEntity) {
  const callService = vi.fn(async () => undefined);
  const runtime = createFixtureRuntime({
    entities: fixtureEntities([entity, fixtureEntity(REMOTE, 'on', {})]),
    callService,
  });
  const wrap = (node: React.ReactNode) =>
    render(<WidgetRuntimeProvider value={runtime}>{node}</WidgetRuntimeProvider>);
  return { callService, wrap };
}

const settings = (remoteId = REMOTE) => ({ mediaPlayerId: TV, remoteId });

afterEach(() => cleanup());

describe('Samsung TV: switching off', () => {
  it('with its remote, «Spegni» sends only KEY_POWER', () => {
    const { callService, wrap } = setup(samsung('on'));
    wrap(
      <AndroidTvWidget
        id="androidtv_card_1"
        settingsKey="k"
        settings={settings()}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: REMOTE,
      command: 'KEY_POWER',
    });
    expect(callService).not.toHaveBeenCalledWith('media_player', 'turn_off', expect.anything());
  });

  it('without a configured remote, the remote HA created with the TV is used (KEY_POWER)', () => {
    const { callService, wrap } = setup(samsung('on'));
    wrap(
      <AndroidTvWidget
        id="androidtv_card_1"
        settingsKey="k"
        settings={settings('')}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: REMOTE,
      command: 'KEY_POWER',
    });
  });

  it('without a remote, or for another brand, «Spegni» stays media_player.turn_off', () => {
    const { callService, wrap } = setup(samsung('on', 'webostv'));
    wrap(
      <AndroidTvWidget
        id="androidtv_card_1"
        settingsKey="k"
        settings={settings()}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_off', { entity_id: TV });
  });
});

describe('Samsung TV: details', () => {
  it('show volume and mute declared by the TV, also without a remote', () => {
    const { callService, wrap } = setup(samsung('on'));
    wrap(
      <AndroidTvDetails
        id="androidtv_card_1"
        settingsKey="k"
        settings={settings('')}
        onClose={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Alza il volume|Volume su/i }));
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_up', { entity_id: TV });
    // Mute is now the tap of the single volume knob.
    fireEvent.click(screen.getByRole('slider', { name: 'Volume' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_mute', {
      entity_id: TV,
      is_volume_muted: true,
    });
  });

  it('the arrows of a Samsung remote send Samsung keys', () => {
    const { callService, wrap } = setup(samsung('on'));
    wrap(
      <AndroidTvDetails
        id="androidtv_card_1"
        settingsKey="k"
        settings={settings()}
        onClose={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Su' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: REMOTE,
      command: 'KEY_UP',
    });
  });
});
