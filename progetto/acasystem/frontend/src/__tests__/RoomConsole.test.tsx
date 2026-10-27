import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { utilityWidgets } from '@/components/widgets/utilities';
import { RoomConsole } from '@/components/widgets/utilities/room/RoomConsole';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { renderWithRuntime } from './UtilityHarness';

/** The room console: the sections of the sheet in two columns, with the same behaviour. */

const settings = {
  areaName: 'Soggiorno',
  entityIds: [
    'light.soggiorno',
    'light.lampada',
    'climate.soggiorno',
    'sensor.soggiorno_temperature',
    'cover.soggiorno',
  ],
  climateEntityId: 'climate.soggiorno',
};

const entities = fixtureEntities([
  fixtureEntity('light.soggiorno', 'on', { supported_color_modes: ['brightness'] }),
  fixtureEntity('light.lampada', 'off', { supported_color_modes: ['brightness'] }),
  fixtureEntity('climate.soggiorno', 'heat', {
    temperature: 21,
    current_temperature: 20,
    hvac_modes: ['off', 'heat'],
    supported_features: 1,
  }),
  fixtureEntity('sensor.soggiorno_temperature', '21.4', {
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  fixtureEntity('cover.soggiorno', 'open'),
]);

function setup() {
  const callService = vi.fn().mockResolvedValue(undefined);
  renderWithRuntime(
    <RoomConsole
      id="room_card_1"
      settingsKey="home::room_card_1"
      settings={settings}
      onClose={() => undefined}
    />,
    { entities, callService }
  );
  const [main, side] = Array.from(document.querySelectorAll<HTMLElement>('.aca-console-column'));
  return { callService, main: within(main!), side: within(side!) };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Room console', () => {
  it('is registered on the room definition, next to the sheet', () => {
    const definition = utilityWidgets.find((candidate) => candidate.type === 'room');
    expect(definition?.Console).toBeDefined();
    expect(definition?.Details).toBeDefined();
  });

  it('puts climate and lights on the left, readings and other entities on the right', () => {
    const { main, side } = setup();
    expect(main.getByRole('button', { name: 'Clima' })).toBeInTheDocument();
    expect(main.getByRole('button', { name: /Luci/ })).toBeInTheDocument();
    expect(main.queryByRole('button', { name: 'Tapparelle' })).toBeNull();
    expect(side.getByRole('button', { name: 'Tapparelle' })).toBeInTheDocument();
    expect(side.getByRole('button', { name: 'Temperature' })).toBeInTheDocument();
    expect(side.queryByRole('button', { name: /Luci/ })).toBeNull();
  });

  it('turns all the lights off from the console', async () => {
    const { callService, main } = setup();
    fireEvent.click(main.getByRole('button', { name: 'Spegni tutte' }));
    await waitFor(() => expect(callService).toHaveBeenCalledTimes(2));
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.soggiorno' });
  });

  it('closes a cover from the right column', () => {
    const { callService, side } = setup();
    fireEvent.click(side.getByRole('button', { name: 'Chiudi soggiorno' }));
    expect(callService).toHaveBeenLastCalledWith('cover', 'close_cover', {
      entity_id: 'cover.soggiorno',
    });
  });

  it('says so when no device of the room is in Home Assistant', () => {
    renderWithRuntime(
      <RoomConsole id="r" settingsKey="k" settings={settings} onClose={() => undefined} />,
      { entities: fixtureEntities([]) }
    );
    expect(screen.getByText(/Nessun dispositivo di questa stanza/)).toBeInTheDocument();
  });
});
