import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MowerWidget, VacuumWidget } from '@/components/widgets/utilities/robots/RobotWidget';
import { VacuumDetails } from '@/components/widgets/utilities/robots/VacuumDetails';
import { MowerDetails } from '@/components/widgets/utilities/robots/MowerDetails';
import { CONFIRM_TIMEOUT_MS } from '@/components/widgets/utilities/shared/useCommand';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderWithRuntime as renderBaseRuntime } from './UtilityHarness';
import { adaptiveFixtureServices } from '@/utils/fixtures/adaptiveData';
import type { WidgetRuntime } from '@/@types/launcher';
import type { ReactElement } from 'react';

const robotServices = {
  ...adaptiveFixtureServices,
  vacuum: { ...adaptiveFixtureServices.vacuum, set_mop_intensity: {} },
};
const withFeatures = (options: Partial<WidgetRuntime>) =>
  !options.entities
    ? options
    : {
        ...options,
        entities: Object.fromEntries(
          Object.entries(options.entities).map(([id, entity]) => [
            id,
            {
              ...entity,
              attributes: {
                ...(id.startsWith('vacuum.')
                  ? { supported_features: 8192 | 4 | 8 | 16 | 32 | 512 | 16384 }
                  : id.startsWith('lawn_mower.')
                    ? { supported_features: 7 }
                    : {}),
                ...entity.attributes,
              },
            },
          ])
        ),
      };
function renderWithRuntime(ui: ReactElement, options: Partial<WidgetRuntime> = {}) {
  const view = renderBaseRuntime(ui, {
    conn: fakeConnection({}).conn,
    services: robotServices,
    ...withFeatures(options),
  });
  return {
    ...view,
    update: (next: Partial<WidgetRuntime>, nextUi?: ReactElement) =>
      view.update(withFeatures(next), nextUi),
  };
}

const vacuumId = 'vacuum.roborock_s7';
const mowerId = 'lawn_mower.automower';
const props = (id: string, w = 2, h = 2) => ({
  id,
  settingsKey: `home::${id}`,
  settings: {},
  size: { w, h },
  editMode: false,
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('aspirapolvere: widget', () => {
  it('avvio e ritorno alla base chiamano gli stessi servizi del legacy', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const entities = fixtureEntities([
      fixtureEntity(vacuumId, 'docked', { battery_level: 80, current_room: 'Cucina' }),
    ]);
    renderWithRuntime(<VacuumWidget {...props(vacuumId)} />, { entities, callService });
    fireEvent.click(screen.getByRole('button', { name: /Avvia/ }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'start', { entity_id: vacuumId });
    fireEvent.click(screen.getByRole('button', { name: /Torna alla base/ }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'return_to_base', {
      entity_id: vacuumId,
    });
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Cucina')).toBeInTheDocument();
  });

  it('durante la pulizia il comando principale è la pausa', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const entities = fixtureEntities([fixtureEntity(vacuumId, 'cleaning')]);
    renderWithRuntime(<VacuumWidget {...props(vacuumId)} />, { entities, callService });
    expect(screen.getByText('Pulizia in corso')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pausa/ }));
    expect(callService).toHaveBeenCalledWith('vacuum', 'pause', { entity_id: vacuumId });
  });

  it('mostra la richiesta finché Home Assistant non conferma lo stato', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const docked = fixtureEntities([fixtureEntity(vacuumId, 'docked')]);
    const view = renderWithRuntime(<VacuumWidget {...props(vacuumId)} />, {
      entities: docked,
      callService,
    });
    fireEvent.click(screen.getByRole('button', { name: /Avvia/ }));
    expect(screen.getByText('Avvio richiesto…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Avvia/ })).toHaveAttribute('aria-busy', 'true');
    await act(async () => {});
    // Still docked: the request stays pending.
    expect(screen.getByText('Avvio richiesto…')).toBeInTheDocument();
    view.update({ entities: fixtureEntities([fixtureEntity(vacuumId, 'cleaning')]) });
    expect(screen.queryByText('Avvio richiesto…')).not.toBeInTheDocument();
    expect(screen.getByText('Pulizia in corso')).toBeInTheDocument();
  });

  it('un comando rifiutato diventa un errore, non un successo', async () => {
    const callService = vi.fn().mockRejectedValue(new Error('denied'));
    const entities = fixtureEntities([fixtureEntity(vacuumId, 'docked')]);
    renderWithRuntime(<VacuumWidget {...props(vacuumId)} />, { entities, callService });
    fireEvent.click(screen.getByRole('button', { name: /Torna alla base/ }));
    expect(await screen.findByText('Comando non riuscito. Riprova.')).toBeInTheDocument();
    expect(screen.queryByText('Ritorno alla base richiesto…')).not.toBeInTheDocument();
  });

  it('senza conferma entro il tempo massimo lo dice', async () => {
    vi.useFakeTimers();
    const callService = vi.fn().mockResolvedValue(undefined);
    const entities = fixtureEntities([fixtureEntity(vacuumId, 'docked')]);
    renderWithRuntime(<VacuumWidget {...props(vacuumId)} />, { entities, callService });
    fireEvent.click(screen.getByRole('button', { name: /Avvia/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CONFIRM_TIMEOUT_MS + 10);
    });
    expect(screen.getByText('Nessuna conferma dal dispositivo.')).toBeInTheDocument();
    expect(screen.getByText('In carica')).toBeInTheDocument();
  });

  it('non disponibile: comandi disabilitati; entità mancante: messaggio chiaro', () => {
    const entities = fixtureEntities([fixtureEntity(vacuumId, 'unavailable')]);
    const view = renderWithRuntime(<VacuumWidget {...props(vacuumId)} />, { entities });
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Avvia/ })).toBeDisabled();
    view.update({ entities: {} });
    expect(screen.getByText('Dispositivo non trovato')).toBeInTheDocument();
  });

  it('caricamento con scheletro e taglia 2×1 con comandi a icona', () => {
    const entities = fixtureEntities([fixtureEntity(vacuumId, 'docked', { battery_level: 55 })]);
    const view = renderWithRuntime(<VacuumWidget {...props(vacuumId)} />, {
      entities,
      entitiesLoaded: false,
    });
    expect(screen.getByRole('status')).toHaveTextContent(/Caricamento/);
    view.update({ entitiesLoaded: true }, <VacuumWidget {...props(vacuumId, 2, 1)} />);
    expect(screen.getByRole('button', { name: 'Avvia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Torna alla base' })).toBeInTheDocument();
    expect(screen.getByText('Batteria 55%')).toBeInTheDocument();
  });

  it('in modalità modifica la card è inerte e non apre i dettagli', () => {
    const openDetails = vi.fn();
    const entities = fixtureEntities([fixtureEntity(vacuumId, 'docked')]);
    const { container } = renderWithRuntime(<VacuumWidget {...props(vacuumId)} editMode />, {
      entities,
      openDetails,
    });
    const card = container.querySelector('.utility-card');
    expect(card).toHaveAttribute('inert');
    expect(card?.querySelector('.utility-card__open')).toBeNull();
  });

  it('il tocco sulla card apre i dettagli', () => {
    const openDetails = vi.fn();
    const entities = fixtureEntities([
      fixtureEntity(vacuumId, 'docked', { friendly_name: 'Robot' }),
    ]);
    renderWithRuntime(<VacuumWidget {...props(vacuumId)} />, { entities, openDetails });
    fireEvent.click(screen.getByRole('button', { name: 'Robot, apri i comandi' }));
    expect(openDetails).toHaveBeenCalledWith(vacuumId);
  });
});

describe('tosaerba: widget e dettagli', () => {
  it('avvio, pausa e base come il legacy (start_mowing, pause, dock)', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const view = renderWithRuntime(<MowerWidget {...props(mowerId)} />, {
      entities: fixtureEntities([
        fixtureEntity(mowerId, 'docked', { battery_level: 100, current_zone: 'Prato' }),
      ]),
      callService,
    });
    expect(screen.getByText('Alla base')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Avvia/ }));
    expect(callService).toHaveBeenLastCalledWith('lawn_mower', 'start_mowing', {
      entity_id: mowerId,
    });
    fireEvent.click(screen.getByRole('button', { name: /Torna alla base/ }));
    expect(callService).toHaveBeenLastCalledWith('lawn_mower', 'dock', { entity_id: mowerId });
    view.update({ entities: fixtureEntities([fixtureEntity(mowerId, 'mowing')]) });
    fireEvent.click(screen.getByRole('button', { name: /Pausa/ }));
    expect(callService).toHaveBeenLastCalledWith('lawn_mower', 'pause', { entity_id: mowerId });
  });

  it('dettagli: stato, comandi e zona', () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(
      <MowerDetails id={mowerId} settingsKey="k" settings={{}} onClose={() => {}} />,
      {
        entities: fixtureEntities([
          fixtureEntity(mowerId, 'error', { battery_level: 12, zone: 'Retro' }),
        ]),
        callService,
      }
    );
    expect(screen.getByText('Errore')).toBeInTheDocument();
    expect(screen.getByText('Retro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Avvia/ }));
    expect(callService).toHaveBeenCalledWith('lawn_mower', 'start_mowing', { entity_id: mowerId });
    expect(screen.getByRole('meter', { name: 'Batteria del tosaerba' })).toHaveAttribute(
      'aria-valuenow',
      '12'
    );
  });
});

describe('aspirapolvere: dettagli', () => {
  const details = (settings = {}) => (
    <VacuumDetails id={vacuumId} settingsKey="k" settings={settings} onClose={() => {}} />
  );

  it('pausa o arresto secondo le funzioni supportate, trova e aspirazione', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    // supported_features 8 (stop) without pause: while cleaning the primary action is stop.
    renderWithRuntime(details(), {
      entities: fixtureEntities([
        fixtureEntity(vacuumId, 'cleaning', {
          supported_features: 8 | 16 | 32 | 512,
          fan_speed: 'Standard',
          fan_speed_list: ['Silent', 'Standard', 'Turbo'],
        }),
      ]),
      callService,
    });
    fireEvent.click(screen.getByRole('button', { name: /Arresta/ }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'stop', { entity_id: vacuumId });
    fireEvent.click(screen.getByRole('button', { name: /Trova/ }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'locate', { entity_id: vacuumId });
    fireEvent.click(screen.getByRole('button', { name: /Torna alla base/ }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'return_to_base', {
      entity_id: vacuumId,
    });
    fireEvent.click(screen.getByRole('button', { name: /Aspirazione: Standard/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Turbo' }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'set_fan_speed', {
      entity_id: vacuumId,
      fan_speed: 'Turbo',
    });
  });

  it('intensità del lavaggio senza select: vacuum.set_mop_intensity', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), {
      entities: fixtureEntities([
        fixtureEntity(vacuumId, 'docked', {
          mop_intensity: 'Low',
          mop_intensity_list: ['Low', 'High'],
        }),
      ]),
      callService,
    });
    fireEvent.click(screen.getByRole('button', { name: /Lavaggio: Low/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'High' }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'set_mop_intensity', {
      entity_id: vacuumId,
      mop_intensity: 'High',
    });
  });

  it('aree mappate: vacuum.clean_area con target; stanza dal select; script delle stanze', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const { conn } = fakeConnection({
      'config/entity_registry/list': () => [
        {
          entity_id: vacuumId,
          device_id: 'dev1',
          options: { vacuum: { area_mapping: { cucina: [1], bagno: [2] } } },
        },
        { entity_id: 'sensor.roborock_s7_filter_left', device_id: 'dev1' },
        { entity_id: 'button.roborock_s7_reset_filter', device_id: 'dev1' },
      ],
      'config/area_registry/list': () => [
        { area_id: 'cucina', name: 'Cucina' },
        { area_id: 'bagno', name: 'Bagno' },
        { area_id: 'garage', name: 'Garage' },
      ],
    });
    renderWithRuntime(
      details({
        roomSelectEntityId: 'select.roborock_s7_room',
        adaptiveBindings: { maintenance: 'button.roborock_s7_reset_filter' },
        roomScripts: [{ entityId: 'script.pulisci_cucina', label: 'Pulisci cucina' }],
      }),
      {
        conn,
        callService,
        entities: fixtureEntities([
          fixtureEntity(vacuumId, 'docked'),
          fixtureEntity('select.roborock_s7_room', 'Soggiorno', {
            options: ['Soggiorno', 'Studio'],
          }),
          fixtureEntity('script.pulisci_cucina', 'off'),
          fixtureEntity('sensor.roborock_s7_filter_left', '75', { unit_of_measurement: 'h' }),
          fixtureEntity('button.roborock_s7_reset_filter', 'unknown'),
        ]),
      }
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Cucina' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bagno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pulisci 2 aree' }));
    expect(callService).toHaveBeenLastCalledWith('vacuum', 'clean_area', {
      target: { entity_id: vacuumId },
      cleaning_area_id: ['cucina', 'bagno'],
    });

    fireEvent.click(screen.getByRole('button', { name: /Stanza: Soggiorno/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Studio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pulisci la stanza' }));
    expect(callService).toHaveBeenLastCalledWith('select', 'select_option', {
      entity_id: 'select.roborock_s7_room',
      option: 'Studio',
    });

    fireEvent.click(screen.getByRole('button', { name: /Pulisci cucina/ }));
    expect(callService).toHaveBeenLastCalledWith('script', 'turn_on', {
      entity_id: 'script.pulisci_cucina',
    });

    // Filter: 75 h left of 150 h → 50 %, reset needs a confirmation.
    const filterRow = screen.getByText('Filtro').closest('li') as HTMLElement;
    expect(within(filterRow).getByText('50%')).toBeInTheDocument();
    fireEvent.click(within(filterRow).getByRole('button', { name: 'Azzera' }));
    expect(callService).not.toHaveBeenCalledWith('button', 'press', expect.anything());
    fireEvent.click(within(filterRow).getByRole('button', { name: 'Conferma azzeramento' }));
    expect(callService).toHaveBeenLastCalledWith('button', 'press', {
      entity_id: 'button.roborock_s7_reset_filter',
    });
  });

  it('mappa: immagine dell’entità e preferenza di visibilità salvata come il legacy', async () => {
    renderWithRuntime(details(), {
      entities: fixtureEntities([
        fixtureEntity(vacuumId, 'docked'),
        fixtureEntity('image.roborock_s7_map', 'ok', {
          entity_picture: '/api/image_proxy/image.roborock_s7_map',
        }),
      ]),
    });
    const image = screen.getByRole('img', { name: /Mappa di/ });
    expect(image.getAttribute('src')).toBe(
      'http://ha.local/api/image_proxy/image.roborock_s7_map?t=0'
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Mostra la mappa' }));
    expect(localStorage.getItem(`tunet_vacuum_show_map_${vacuumId}`)).toBe('false');
    await waitFor(() =>
      expect(screen.queryByRole('img', { name: /Mappa di/ })).not.toBeInTheDocument()
    );
  });
});

describe('robot: capacità reali nei dettagli', () => {
  it('il solo attributo di lavaggio non espone un servizio inesistente', async () => {
    renderWithRuntime(
      <VacuumDetails id={vacuumId} settingsKey="k" settings={{}} onClose={() => undefined} />,
      {
        services: adaptiveFixtureServices,
        entities: fixtureEntities([
          fixtureEntity(vacuumId, 'docked', {
            mop_intensity: 'Low',
            mop_intensity_list: ['Low', 'High'],
          }),
        ]),
      }
    );
    expect(screen.queryByRole('button', { name: /Lavaggio:/ })).not.toBeInTheDocument();
    await act(async () => undefined);
  });
  it('capability zero disabilita avvio/base; batteria non abilita localizzazione', async () => {
    renderWithRuntime(
      <VacuumDetails id={vacuumId} settingsKey="k" settings={{}} onClose={() => undefined} />,
      {
        entities: fixtureEntities([
          fixtureEntity(vacuumId, 'docked', { supported_features: 64, battery_level: 80 }),
        ]),
      }
    );
    expect(screen.getByRole('button', { name: /Avvia/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Trova' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Torna alla base' })).not.toBeInTheDocument();
    await act(async () => undefined);
  });
});
