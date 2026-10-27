import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { utilityWidgets } from '@/components/widgets/utilities';
import { VacuumConsole } from '@/components/widgets/utilities/robots/VacuumConsole';
import { adaptiveFixtureServices } from '@/utils/fixtures/adaptiveData';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderWithRuntime } from './UtilityHarness';

/** The vacuum console: the sections of the sheet in two columns, with the same behaviour. */

const VACUUM = 'vacuum.roborock_s7';
const SCRIPT = 'script.pulisci_cucina';

const services = {
  ...adaptiveFixtureServices,
  vacuum: { ...adaptiveFixtureServices.vacuum, set_mop_intensity: {} },
  script: { turn_on: {} },
};

function setup() {
  const callService = vi.fn().mockResolvedValue(undefined);
  const entities = fixtureEntities([
    fixtureEntity(VACUUM, 'docked', {
      battery_level: 80,
      current_room: 'Cucina',
      supported_features: 8192 | 4 | 8 | 16 | 32 | 512 | 16384,
    }),
    fixtureEntity(SCRIPT, 'off', { friendly_name: 'Cucina' }),
  ]);
  renderWithRuntime(
    <VacuumConsole
      id={VACUUM}
      settingsKey="k"
      settings={{ roomScripts: [{ entityId: SCRIPT, label: 'Pulisci la cucina' }] }}
      onClose={() => undefined}
    />,
    { conn: fakeConnection({}).conn, services, entities, callService }
  );
  const [main, side] = Array.from(document.querySelectorAll<HTMLElement>('.aca-console-column'));
  return { callService, main: within(main!), side: within(side!) };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Vacuum console', () => {
  it('is registered on the vacuum definition, next to the sheet', () => {
    const definition = utilityWidgets.find((candidate) => candidate.type === 'vacuum');
    expect(definition?.Console).toBeDefined();
    expect(definition?.Details).toBeDefined();
    expect(utilityWidgets.find((candidate) => candidate.type === 'mower')?.Console).toBeUndefined();
  });

  it('puts status, battery and the main actions on the left, rooms and statistics on the right', () => {
    const { main, side } = setup();
    expect(main.getByRole('heading', { name: 'Stato' })).toBeInTheDocument();
    expect(main.getByText('Batteria 80%')).toBeInTheDocument();
    expect(main.getByRole('button', { name: 'Avvia' })).toBeInTheDocument();
    expect(main.getByRole('button', { name: 'Torna alla base' })).toBeInTheDocument();
    expect(main.queryByRole('heading', { name: 'Stanze' })).toBeNull();
    expect(side.getByRole('heading', { name: 'Stanze' })).toBeInTheDocument();
    expect(side.getByRole('heading', { name: 'Statistiche' })).toBeInTheDocument();
    expect(side.queryByRole('heading', { name: 'Stato' })).toBeNull();
  });

  it('starts the cleaning from the console', () => {
    const { callService, main } = setup();
    fireEvent.click(main.getByRole('button', { name: 'Avvia' }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'start', { entity_id: VACUUM });
  });

  it('runs a room script from the right column', () => {
    const { callService, side } = setup();
    fireEvent.click(side.getByRole('button', { name: 'Pulisci la cucina' }));
    expect(callService).toHaveBeenLastCalledWith('script', 'turn_on', { entity_id: SCRIPT });
  });

  it('says so when the vacuum is not in Home Assistant', () => {
    renderWithRuntime(
      <VacuumConsole id="vacuum.gone" settingsKey="k" settings={{}} onClose={() => undefined} />,
      { entities: fixtureEntities([]) }
    );
    expect(screen.getByText(/non è stato trovato in Home Assistant/)).toBeInTheDocument();
  });
});
