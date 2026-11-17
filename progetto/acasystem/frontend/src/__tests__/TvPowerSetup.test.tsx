import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';

// The brand logo of the TV is asked for the platform of the fixtures: none here.
const api = vi.hoisted(() => ({ getPower: vi.fn(), fetchBrandLogo: vi.fn(async () => null) }));
vi.mock('@/api/devicesApi', () => api);

import { PowerSetupProvider, type PowerSetupProps } from '@/hooks/launcher/PowerSetupContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { resetTvWake } from '@/components/widgets/media/hooks/useTvWake';
import { AndroidTvConsole } from '@/components/widgets/media/widgets/TvConsole';
import { AndroidTvDetails } from '@/components/widgets/media/widgets/TvDetails';

/**
 * «Configura l'accensione» in the TV details and the console: shown only where the step can be
 * hosted and the TV has a recipe to set up; it opens the power-on step in place, «Indietro» goes
 * back, and finishing makes the widget read the recipe again so the power key enables at once.
 */

const TV = 'media_player.tv_sala';
const HINT = 'Per accenderla da qui serve l’accensione dalla rete';
const settings = { mediaPlayerId: TV };

const lg = (state: string, extra: Record<string, unknown> = {}): HassEntity =>
  fixtureEntity(TV, state, {
    friendly_name: 'TV sala',
    platform: 'webostv',
    config_entry_id: 'entry_lg',
    ...extra,
  });

const recipe = (configured: boolean) => ({
  entryId: 'entry_lg',
  configured,
  active: configured ? true : null,
  message: null,
});

let finish: (() => void) | null = null;
const seen: PowerSetupProps[] = [];

/** Stands for the real step, which `PowerStep.test` covers: it only needs to be finished. */
function FakeStep(props: PowerSetupProps) {
  seen.push(props);
  finish = props.onFinished;
  return (
    <div>
      <p>Accensione dalla rete</p>
      <button type="button" onClick={props.onFinished}>
        Fine
      </button>
    </div>
  );
}

function mount(entity: HassEntity, hosted = true, Widget = AndroidTvDetails) {
  const callService = vi.fn(async () => undefined);
  const runtime = createFixtureRuntime({ entities: fixtureEntities([entity]), callService });
  const node = (
    <WidgetRuntimeProvider value={runtime}>
      <Widget id="androidtv_card_1" settingsKey="k" settings={settings} onClose={vi.fn()} />
    </WidgetRuntimeProvider>
  );
  render(hosted ? <PowerSetupProvider value={FakeStep}>{node}</PowerSetupProvider> : node);
  return { callService };
}

beforeEach(() => {
  api.getPower.mockReset();
  resetTvWake();
  seen.length = 0;
  finish = null;
});
afterEach(() => cleanup());

describe('«Configura l’accensione» in the TV details', () => {
  it('is offered next to the sentence when the TV cannot be woken', async () => {
    api.getPower.mockResolvedValue(recipe(false));
    mount(lg('unavailable'));
    expect(await screen.findByRole('button', { name: 'Configura l’accensione' })).toBeVisible();
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifica l’accensione' })).toBeNull();
  });

  it('is «Modifica l’accensione» when the recipe exists, awake or asleep', async () => {
    api.getPower.mockResolvedValue(recipe(true));
    mount(lg('unavailable'));
    expect(await screen.findByRole('button', { name: 'Modifica l’accensione' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Configura l’accensione' })).toBeNull();
    cleanup();
    mount(lg('playing'));
    expect(await screen.findByRole('button', { name: 'Modifica l’accensione' })).toBeVisible();
  });

  it('is in the console too', async () => {
    api.getPower.mockResolvedValue(recipe(false));
    mount(lg('unavailable'), true, AndroidTvConsole);
    expect(await screen.findByRole('button', { name: 'Configura l’accensione' })).toBeVisible();
  });

  it('is hidden without a launcher to host the step', async () => {
    api.getPower.mockResolvedValue(recipe(false));
    mount(lg('unavailable'), false);
    await waitFor(() => expect(screen.getByText(HINT)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /l’accensione/ })).toBeNull();
  });

  it('is hidden for a TV with no config entry or an integration with no recipe', async () => {
    api.getPower.mockResolvedValue(recipe(false));
    mount(lg('unavailable', { config_entry_id: undefined }));
    await waitFor(() => expect(screen.getByText('Non raggiungibile')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /l’accensione/ })).toBeNull();
    cleanup();
    mount(lg('off', { platform: 'samsungtv', supported_features: 0 }));
    await screen.findByText(HINT);
    expect(screen.queryByRole('button', { name: /l’accensione/ })).toBeNull();
    expect(api.getPower).not.toHaveBeenCalledWith('entry_lg');
  });

  it('opens the step for that entry in place, and «Indietro» goes back', async () => {
    api.getPower.mockResolvedValue(recipe(false));
    mount(lg('unavailable'));
    fireEvent.click(await screen.findByRole('button', { name: 'Configura l’accensione' }));
    expect(screen.getByText('Accensione dalla rete')).toBeInTheDocument();
    expect(seen[0]).toMatchObject({ entryId: 'entry_lg', mediaPlayerEntityId: TV });
    expect(screen.queryByRole('button', { name: 'Accendi' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(screen.queryByText('Accensione dalla rete')).toBeNull();
    expect(screen.getByRole('button', { name: 'Accendi' })).toBeInTheDocument();
  });

  it('finishing the step reads the recipe again: the power key enables and wakes the TV', async () => {
    api.getPower.mockResolvedValue(recipe(false));
    const { callService } = mount(lg('unavailable'));
    expect(await screen.findByRole('button', { name: 'Accendi' })).toBeDisabled();
    fireEvent.click(await screen.findByRole('button', { name: 'Configura l’accensione' }));
    api.getPower.mockResolvedValue(recipe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Fine' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Accendi' })).not.toBeDisabled());
    expect(screen.queryByText(HINT)).toBeNull();
    expect(screen.getByText('Spento')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Modifica l’accensione' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Accendi' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', { entity_id: TV });
    expect(finish).not.toBeNull();
  });
});
