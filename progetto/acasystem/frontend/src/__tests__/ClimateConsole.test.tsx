import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { ClimateConsole } from '@/components/widgets/home/climate/ClimateConsole';
import { climateWidget } from '@/components/widgets/home/climate';

/** The climate console: the sections of the sheet in two columns, with the same behaviour. */

const thermostat = (): HassEntity =>
  fixtureEntity('climate.soggiorno', 'heat', {
    friendly_name: 'Soggiorno',
    current_temperature: 20.5,
    temperature: 21,
    min_temp: 7,
    max_temp: 35,
    hvac_action: 'heating',
    hvac_modes: ['off', 'heat', 'cool', 'auto'],
    fan_modes: ['auto', 'low', 'high'],
    fan_mode: 'auto',
    swing_modes: ['off', 'vertical'],
    swing_mode: 'off',
    preset_modes: ['none', 'eco', 'comfort'],
    preset_mode: 'none',
  });

function setup(settings: Record<string, unknown> = { climateId: 'climate.soggiorno' }) {
  const callService = vi.fn(async () => undefined);
  const runtime = createFixtureRuntime({
    entities: fixtureEntities([thermostat()]),
    callService,
  });
  render(
    <WidgetRuntimeProvider value={runtime}>
      <ClimateConsole
        id="climate_card_1"
        settingsKey="k"
        settings={settings}
        onClose={() => undefined}
      />
    </WidgetRuntimeProvider>
  );
  const [main, side] = Array.from(document.querySelectorAll<HTMLElement>('.aca-console-column'));
  return { callService, main: within(main ?? document.body), side: within(side ?? document.body) };
}

afterEach(() => cleanup());

describe('Climate console', () => {
  it('is registered on the climate definition, next to the sheet', () => {
    expect(climateWidget.Console).toBeDefined();
    expect(climateWidget.Details).toBeDefined();
  });

  it('puts the temperatures and the power on the left, the modes and the choices on the right', () => {
    const { main, side } = setup();
    expect(main.getByText('20,5 °C')).toBeInTheDocument();
    expect(main.getByRole('switch', { name: 'Accensione' })).toBeInTheDocument();
    expect(main.getByRole('heading', { name: 'Temperatura desiderata' })).toBeInTheDocument();
    expect(main.getByRole('button', { name: 'Aumenta di mezzo grado' })).toBeInTheDocument();
    expect(main.queryByRole('group', { name: 'Ventola' })).toBeNull();
    expect(side.getByRole('group', { name: 'Tutte le modalità' })).toBeInTheDocument();
    expect(side.getByRole('group', { name: 'Preset' })).toBeInTheDocument();
    expect(side.getByRole('group', { name: 'Ventola' })).toBeInTheDocument();
    expect(side.getByRole('group', { name: 'Oscillazione' })).toBeInTheDocument();
    expect(side.queryByRole('switch')).toBeNull();
  });

  it('sends the HVAC mode from the console', () => {
    const { callService, side } = setup();
    fireEvent.click(side.getByRole('button', { name: 'Freddo' }));
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.soggiorno',
      hvac_mode: 'cool',
    });
  });

  it('steps the target temperature from the console', () => {
    const { callService, main } = setup();
    fireEvent.click(main.getByRole('button', { name: 'Aumenta di mezzo grado' }));
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.soggiorno',
      temperature: 21.5,
    });
  });

  it('shows the notice, without columns, when no thermostat is chosen', () => {
    setup({});
    expect(document.querySelector('.aca-console-column')).toBeNull();
  });
});
