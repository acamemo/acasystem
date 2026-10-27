import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { AndroidTvConsole } from '@/components/widgets/media/widgets/TvConsole';
import { mediaWidgets } from '@/components/widgets/media';

/** The TV console: the sections of the sheet in two columns, with the same behaviour. */

const TV = 'media_player.ue50j6200_ue50j6200';
const REMOTE = 'remote.ue50j6200_ue50j6200';
const SAMSUNG_FEATURES = 24381;

const samsung = (): HassEntity =>
  fixtureEntity(TV, 'on', {
    friendly_name: 'UE50J6200',
    supported_features: SAMSUNG_FEATURES,
    platform: 'samsungtv',
    source_list: ['TV', 'HDMI'],
    app_name: 'Netflix',
    media_title: 'Una serie',
  });

function setup(entity: HassEntity = samsung()) {
  const callService = vi.fn(async () => undefined);
  const runtime = createFixtureRuntime({
    entities: fixtureEntities([entity, fixtureEntity(REMOTE, 'on', {})]),
    callService,
  });
  render(
    <WidgetRuntimeProvider value={runtime}>
      <AndroidTvConsole
        id="androidtv_card_1"
        settingsKey="k"
        settings={{ mediaPlayerId: TV, remoteId: REMOTE }}
        onClose={() => undefined}
      />
    </WidgetRuntimeProvider>
  );
  const [main, side] = Array.from(document.querySelectorAll<HTMLElement>('.aca-console-column'));
  return { callService, main: within(main), side: within(side) };
}

afterEach(() => cleanup());

describe('TV console', () => {
  it('is registered on both TV definitions, next to the sheet', () => {
    for (const type of ['androidTv', 'appleTv']) {
      const definition = mediaWidgets.find((candidate) => candidate.type === type);
      expect(definition?.Console).toBeDefined();
      expect(definition?.Details).toBeDefined();
    }
  });

  it('puts the base keys, the steps and the player on the left, the remote and the choices on the right', () => {
    const { main, side } = setup();
    expect(main.getByRole('button', { name: 'Spegni' })).toBeInTheDocument();
    expect(main.getByRole('button', { name: 'Alza il volume' })).toBeInTheDocument();
    expect(main.getByRole('heading', { name: 'Riproduzione' })).toBeInTheDocument();
    expect(main.queryByRole('heading', { name: 'Telecomando' })).toBeNull();
    expect(side.getByRole('heading', { name: 'Telecomando' })).toBeInTheDocument();
    expect(side.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(side.getByRole('heading', { name: 'Ingressi' })).toBeInTheDocument();
    expect(side.queryByRole('heading', { name: 'Riproduzione' })).toBeNull();
  });

  it('sends a remote key from the console', () => {
    const { callService, side } = setup();
    fireEvent.click(side.getByRole('button', { name: 'OK' }));
    expect(callService).toHaveBeenCalled();
    const [domain] = callService.mock.calls.at(-1) as unknown as [string];
    expect(domain).toBe('remote');
  });

  it('chooses an input from the console', () => {
    const { callService, side } = setup();
    fireEvent.click(side.getByRole('button', { name: 'HDMI' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'select_source', {
      entity_id: TV,
      source: 'HDMI',
    });
  });

  it('says the TV is not there when Home Assistant does not know it', () => {
    const runtime = createFixtureRuntime({ entities: fixtureEntities([]) });
    render(
      <WidgetRuntimeProvider value={runtime}>
        <AndroidTvConsole
          id="androidtv_card_1"
          settingsKey="k"
          settings={{ mediaPlayerId: TV }}
          onClose={() => undefined}
        />
      </WidgetRuntimeProvider>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(document.querySelector('.aca-console-column')).toBeNull();
  });
});
