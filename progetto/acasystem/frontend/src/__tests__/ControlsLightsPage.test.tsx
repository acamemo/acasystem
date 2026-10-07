import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PageSettings } from '@/@types/dashboard';
import { LightsPage, LightsPageView, sortLights } from '@/components/widgets/controls/light/LightsPage';
import { findPageKindDefinition } from '@/components/widgets/registry';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { renderWithRuntime, serviceMock } from './ControlsHarness';

const lights = [
  fixtureEntity('light.cucina', 'on', {
    friendly_name: 'Cucina',
    supported_color_modes: ['brightness'],
    brightness: 64,
    area_name: 'Zona giorno',
  }),
  fixtureEntity('light.bagno', 'on', {
    friendly_name: 'Bagno',
    supported_color_modes: ['brightness'],
    brightness: 255,
    area_name: 'Zona notte',
  }),
  fixtureEntity('light.studio', 'off', { friendly_name: 'Studio', supported_color_modes: ['onoff'] }),
  fixtureEntity('light.garage', 'unavailable', { friendly_name: 'Garage' }),
  fixtureEntity('light.gruppo', 'on', {
    friendly_name: 'Tutte le luci giorno',
    entity_id: ['light.cucina', 'light.studio'],
    supported_color_modes: ['brightness'],
    brightness: 120,
  }),
  fixtureEntity('sensor.temperatura', '21'),
];

function renderPage(settings: PageSettings = {}) {
  const onSaveSetting = vi.fn();
  const callService = serviceMock();
  const view = renderWithRuntime(<LightsPageView settings={settings} onSaveSetting={onSaveSetting} />, {
    entities: fixtureEntities(lights),
    callService,
  });
  return { ...view, onSaveSetting, callService };
}

const tileNames = () =>
  within(screen.getAllByRole('list')[0] as HTMLElement)
    .getAllByRole('switch')
    .map((item) => item.getAttribute('aria-label'));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Pagina delle luci (legacy LightsPage)', () => {
  it('conteggio, tessere con manopola e cursore, solo entità light', () => {
    renderPage();
    expect(screen.queryByRole('heading', { name: 'Luci' })).not.toBeInTheDocument();
    expect(screen.getByText('3 accese · 5 in totale')).toBeInTheDocument();
    expect(tileNames()).toEqual(['Bagno', 'Tutte le luci giorno', 'Cucina', 'Garage', 'Studio']);
    expect(screen.getByRole('slider', { name: 'Luminosità di Cucina' })).toHaveValue('25');
    expect(screen.queryByText('21')).toBeNull();
  });

  it('accensione dalla tessera con light.toggle e luminosità con light.turn_on', () => {
    const { callService } = renderPage();
    fireEvent.click(screen.getByRole('switch', { name: 'Studio' }));
    expect(callService).toHaveBeenLastCalledWith('light', 'toggle', { entity_id: 'light.studio' });
    fireEvent.change(screen.getByRole('slider', { name: 'Luminosità di Bagno' }), {
      target: { value: '50' },
    });
    expect(callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.bagno',
      brightness: 128,
    });
  });

  it('«Spegni tutte» chiede conferma, poi turn_off delle sole luci accese', () => {
    const { callService } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Spegni tutte' }));
    expect(callService).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Spegnere tutte le luci?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Conferma' }));
    expect(callService.mock.calls).toEqual([
      ['light', 'turn_off', { entity_id: 'light.cucina' }],
      ['light', 'turn_off', { entity_id: 'light.bagno' }],
      ['light', 'turn_off', { entity_id: 'light.gruppo' }],
    ]);
  });

  it('«Accendi tutte» salta le luci non disponibili', () => {
    const { callService } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Accendi tutte' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Accendere tutte le luci?' })).getByRole('button', {
        name: 'Conferma',
      })
    );
    expect(callService.mock.calls).toEqual([['light', 'turn_on', { entity_id: 'light.studio' }]]);
  });

  it('ordinamento, gruppi e non disponibili salvati nelle impostazioni della pagina', () => {
    const { onSaveSetting } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ordina: Stato' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nome A→Z' }));
    expect(onSaveSetting).toHaveBeenCalledWith('lightsSort', 'name-az');
    expect(tileNames()).toEqual(['Bagno', 'Cucina', 'Garage', 'Studio', 'Tutte le luci giorno']);

    fireEvent.click(screen.getByRole('button', { name: 'Gruppi (1)' }));
    expect(onSaveSetting).toHaveBeenCalledWith('lightsShowGroups', false);
    expect(tileNames()).not.toContain('Tutte le luci giorno');

    fireEvent.click(screen.getByRole('button', { name: /Nascondi non disponibili/ }));
    expect(onSaveSetting).toHaveBeenCalledWith('lightsHideUnavailable', true);
    expect(tileNames()).not.toContain('Garage');
  });

  it('per stanza: sezioni con il conteggio', () => {
    renderPage({ lightsSort: 'area' });
    expect(screen.getByRole('region', { name: 'Zona giorno' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Altre' })).toBeInTheDocument();
  });

  it('ricerca per nome e stato vuoto', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Cerca luci'), { target: { value: 'cuc' } });
    expect(tileNames()).toEqual(['Cucina']);
    fireEvent.change(screen.getByLabelText('Cerca luci'), { target: { value: 'nessuna' } });
    expect(screen.getByText('Nessuna luce corrisponde alla ricerca.')).toBeInTheDocument();
  });

  it('sortLights: stessi criteri del legacy', () => {
    const entities = lights.filter((entity) => entity.entity_id.startsWith('light.'));
    expect(sortLights(entities, 'brightness', () => null).map((e) => e.entity_id)).toEqual([
      'light.bagno',
      'light.gruppo',
      'light.cucina',
      'light.garage',
      'light.studio',
    ]);
    expect(sortLights(entities, 'unavailable', () => null)[0]?.entity_id).toBe('light.garage');
  });

  it('come pagina del launcher legge e salva le impostazioni da PageKindProps (senza PageProvider)', () => {
    const onSaveSetting = vi.fn();
    const runtime = createFixtureRuntime({ entities: fixtureEntities(lights) });
    const withRuntime = (ui: ReactElement) => (
      <WidgetRuntimeProvider value={runtime}>{ui}</WidgetRuntimeProvider>
    );
    const view = render(
      withRuntime(
        <LightsPage pageId="luci" settings={{ lightsSort: 'name-za' }} onSaveSetting={onSaveSetting} />
      )
    );
    expect(screen.getByRole('button', { name: 'Ordina: Nome Z→A' })).toBeInTheDocument();
    expect(tileNames()[0]).toBe('Tutte le luci giorno');

    fireEvent.click(screen.getByRole('button', { name: 'Gruppi (1)' }));
    expect(onSaveSetting).toHaveBeenLastCalledWith('lightsShowGroups', false);
    fireEvent.click(screen.getByRole('button', { name: /Nascondi non disponibili/ }));
    expect(onSaveSetting).toHaveBeenLastCalledWith('lightsHideUnavailable', true);
    fireEvent.click(screen.getByRole('button', { name: 'Ordina: Nome Z→A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stanza' }));
    expect(onSaveSetting).toHaveBeenLastCalledWith('lightsSort', 'area');

    // Settings loaded later by the launcher reach the page through the same props.
    view.rerender(
      withRuntime(
        <LightsPage
          pageId="luci"
          settings={{ lightsSort: 'name-az', lightsShowGroups: true, lightsHideUnavailable: false }}
          onSaveSetting={onSaveSetting}
        />
      )
    );
    expect(screen.getByRole('button', { name: 'Ordina: Nome A→Z' })).toBeInTheDocument();
    expect(tileNames()).toEqual(['Bagno', 'Cucina', 'Garage', 'Studio', 'Tutte le luci giorno']);
  });

  it('la definizione della pagina «lights» usa il componente con PageKindProps', () => {
    const definition = findPageKindDefinition('lights');
    expect(definition?.Page).toBe(LightsPage);
  });
});
