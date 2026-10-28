import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HaDeviceRegistryEntry, HaEntityRegistryEntry } from '@/@types/ha';
import { AndroidTvWidget } from '@/components/widgets/media/widgets/TvWidget';
import { DiscoveryScreenProvider } from '@/hooks/launcher/DiscoveryScreenContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { classifyDevices } from '@/utils/devices/classify';
import { selectionForNewEntry } from '@/utils/devices/entrySelection';
import {
  alikeTvIds,
  castOnlyBrand,
  nativeCounterpart,
  nativeTvBrand,
  tvModelToken,
} from '@/utils/devices/tvBrand';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';

/**
 * An LG that HA added through Google Cast by itself (2026-10-28): it has no remote and "turn on"
 * starts the Home Assistant Cast app on the TV. The native player (webostv) of the same TV wins
 * wherever it exists; the Cast one alone never gets power commands nor an automatic widget.
 */

const CAST = 'media_player.lg_webos_tv_ua751c0la';
const NATIVE = 'media_player.lg_webos_tv_ua751c0la_2';
const NAME = '[LG] webOS TV UA751C0LA';

const device = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, name: NAME, manufacturer: 'LG', model: 'UA751C0LA', ...extra }) as HaDeviceRegistryEntry;
const registered = (entityId: string, deviceId: string, platform: string) =>
  ({ entity_id: entityId, device_id: deviceId, platform }) as HaEntityRegistryEntry;

const castState = () =>
  fixtureEntity(CAST, 'off', {
    friendly_name: NAME,
    platform: 'cast',
    supported_features: 128 | 256,
  });
const nativeState = () =>
  fixtureEntity(NATIVE, 'on', {
    friendly_name: 'LG webOS TV UA751C0LA',
    platform: 'webostv',
    supported_features: 128 | 256,
  });

describe('TV helpers', () => {
  it('finds the brand and the model token', () => {
    expect(nativeTvBrand('LG Electronics', '')).toMatchObject({ key: 'lg', handler: 'webostv' });
    expect(nativeTvBrand(null, '[LG] webOS TV X')).toMatchObject({ handler: 'webostv' });
    expect(nativeTvBrand('Google', 'Salotto')).toBeNull();
    expect(tvModelToken(NAME)).toBe('ua751c0la');
    expect(tvModelToken('webOS TV', NAME)).toBe('ua751c0la');
    expect(tvModelToken('Salotto')).toBeNull();
  });

  it('pairs a Cast player with the native one of the same model only', () => {
    const entities = fixtureEntities([castState(), nativeState()]);
    expect(castOnlyBrand(entities[CAST])?.label).toBe('LG');
    expect(nativeCounterpart(CAST, entities)).toBe(NATIVE);
    const other = fixtureEntities([
      castState(),
      fixtureEntity('media_player.lg_nano', 'on', {
        friendly_name: '[LG] webOS TV NANO81T6A',
        platform: 'webostv',
      }),
    ]);
    expect(nativeCounterpart(CAST, other)).toBeNull();
  });

  it('marks TVs with the same name once the model is taken out', () => {
    const ids = alikeTvIds([
      { id: 'a', name: '[LG] webOS TV UA751C0LA', model: 'UA751C0LA' },
      { id: 'b', name: '[LG] webOS TV NANO81T6A', model: 'NANO81T6A' },
      { id: 'c', name: 'Salotto', model: null },
    ]);
    expect([...ids].sort()).toEqual(['a', 'b']);
  });
});

describe('classification and automatic widget', () => {
  it('in one device the native TV entity wins over the Cast one', () => {
    const found = classifyDevices({
      devices: [device('d1')],
      entityRegistry: [registered(CAST, 'd1', 'cast'), registered(NATIVE, 'd1', 'webostv')],
      entities: fixtureEntities([castState(), nativeState()]),
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ primaryEntityId: NATIVE, platform: 'webostv' });
  });

  it('a Cast-only LG gets no automatic widget', () => {
    const input = {
      devices: [device('d1')],
      entityRegistry: [registered(CAST, 'd1', 'cast')],
      entities: fixtureEntities([castState()]),
    };
    expect(
      selectionForNewEntry(
        input,
        { deviceId: 'd1', entityIds: [CAST], mediaPlayerEntityId: CAST },
        'tv'
      )
    ).toBeNull();
    // Without registries the family decides, and a Cast entry of a branded TV is still refused.
    expect(
      selectionForNewEntry(
        { devices: [], entityRegistry: [], entities: {} },
        {
          deviceId: null,
          entityIds: [CAST],
          mediaPlayerEntityId: CAST,
          domain: 'cast',
          manufacturer: 'LG',
          title: NAME,
        },
        'tv'
      )
    ).toBeNull();
  });

  it('a Chromecast keeps its widget', () => {
    const input = {
      devices: [
        device('d2', { name: 'Salotto', manufacturer: 'Google Inc.', model: 'Chromecast' }),
      ],
      entityRegistry: [registered('media_player.salotto', 'd2', 'cast')],
      entities: fixtureEntities([
        fixtureEntity('media_player.salotto', 'off', { friendly_name: 'Salotto' }),
      ]),
    };
    expect(
      selectionForNewEntry(
        input,
        { deviceId: 'd2', entityIds: ['media_player.salotto'], mediaPlayerEntityId: null },
        'tv'
      )
    ).toMatchObject({ type: 'androidtv' });
  });
});

describe('TV widget bound to a Cast player', () => {
  afterEach(() => cleanup());

  const widget = (
    <AndroidTvWidget
      id="androidtv_card_1"
      settingsKey="k"
      settings={{ mediaPlayerId: CAST }}
      size={{ w: 2, h: 2 }}
      editMode={false}
    />
  );
  const setup = (states: ReturnType<typeof fixtureEntity>[], showDiscovery = vi.fn()) => {
    const callService = vi.fn(async () => undefined);
    const runtime = createFixtureRuntime({ entities: fixtureEntities(states), callService });
    render(
      <DiscoveryScreenProvider value={showDiscovery}>
        <WidgetRuntimeProvider value={runtime}>{widget}</WidgetRuntimeProvider>
      </DiscoveryScreenProvider>
    );
    return { callService, showDiscovery };
  };

  it('power sends nothing: it says to connect the TV and opens the discovery screen', () => {
    const { callService, showDiscovery } = setup([castState()]);
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));

    expect(callService).not.toHaveBeenCalled();
    expect(
      screen.getByText('Collega la TV LG per accenderla e usare il telecomando.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la TV' }));
    expect(showDiscovery).toHaveBeenCalledTimes(1);
  });

  it('uses the native player of the same TV for state and power', () => {
    const { callService } = setup([castState(), nativeState()]);
    // The native player is on: the key says "Spegni" and calls the native entity.
    fireEvent.click(screen.getByRole('button', { name: 'Spegni' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_off', { entity_id: NATIVE });
    expect(screen.queryByText(/Collega la TV LG/)).toBeNull();
  });
});
