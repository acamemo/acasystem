import { fireEvent, screen, within } from '@testing-library/react';
import { useState, type ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PageSettings } from '@/@types/dashboard';
import type { PageKindProps } from '@/@types/launcher';
import { utilityPages } from '@/components/widgets/utilities';
import { BatteryPage } from '@/components/widgets/utilities/fullpage/BatteryPage';
import { RoomsPage } from '@/components/widgets/utilities/fullpage/RoomsPage';
import {
  arrangeBatteries,
  batteryEntities,
  batteryStatus,
} from '@/components/widgets/utilities/fullpage/batteryData';
import { entitiesByArea } from '@/components/widgets/utilities/fullpage/roomsData';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderWithRuntime } from './UtilityHarness';

/** Page settings held like the launcher's PageKindHost: saved values come back as props. */
function HostedPage({
  Page,
  pageId,
  initial = {},
  onSave,
}: {
  Page: ComponentType<PageKindProps>;
  pageId: string;
  initial?: PageSettings;
  onSave: (key: string, value: unknown) => void;
}) {
  const [settings, setSettings] = useState<PageSettings>(initial);
  return (
    <Page
      pageId={pageId}
      settings={settings}
      onSaveSetting={(key, value) => {
        onSave(key, value);
        setSettings((current) => ({ ...current, [key]: value }));
      }}
    />
  );
}

const batteries = fixtureEntities([
  fixtureEntity('sensor.porta_battery', '15', {
    device_class: 'battery',
    friendly_name: 'Porta ingresso',
    area_id: 'ingresso',
  }),
  fixtureEntity('sensor.termostato_battery', '80', {
    device_class: 'battery',
    friendly_name: 'Termostato',
    area_name: 'Soggiorno',
  }),
  fixtureEntity('sensor.telecomando_battery', 'unavailable', {
    device_class: 'battery',
    friendly_name: 'Telecomando',
  }),
  fixtureEntity('sensor.robot_battery', '55', {
    device_class: 'battery',
    friendly_name: 'Aspirapolvere',
    is_charging: true,
  }),
  fixtureEntity('sensor.temperatura', '21', { device_class: 'temperature' }),
]);

describe('pagina batterie: dati', () => {
  it('rileva le entità con classe batteria e ordina per livello come il legacy', () => {
    const list = batteryEntities(batteries);
    expect(list).toHaveLength(4);
    expect(batteryStatus(batteries['sensor.porta_battery']!)).toBe('low');
    expect(batteryStatus(batteries['sensor.telecomando_battery']!)).toBe('unavailable');
    const ordered = arrangeBatteries(list, {
      filter: 'all',
      search: '',
      sort: 'level',
      areaOf: () => null,
    });
    expect(ordered.map((entity) => entity.entity_id)).toEqual([
      'sensor.telecomando_battery',
      'sensor.porta_battery',
      'sensor.robot_battery',
      'sensor.termostato_battery',
    ]);
  });
});

describe('pagina batterie', () => {
  it('riepilogo, filtri con conteggi, ricerca e ordinamento salvato nelle impostazioni', async () => {
    const onSaveSetting = vi.fn();
    const { conn } = fakeConnection({
      'config/area_registry/list': () => [{ area_id: 'ingresso', name: 'Ingresso' }],
    });
    renderWithRuntime(<HostedPage Page={BatteryPage} pageId="batterie" onSave={onSaveSetting} />, {
      entities: batteries,
      conn,
    });
    expect(screen.getByText('1 scarica · 4 in totale · 1 non disponibile')).toBeInTheDocument();
    expect(await screen.findByText('Scarica · Ingresso')).toBeInTheDocument();
    expect(screen.getByText('In carica')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Scariche (1)' }));
    expect(onSaveSetting).toHaveBeenCalledWith('batteryFilter', 'low');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Tutte (4)' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Cerca una batteria' }), {
      target: { value: 'soggiorno' },
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Termostato')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Cerca una batteria' }), {
      target: { value: 'garage' },
    });
    expect(screen.getByText('Nessuna batteria corrisponde alla ricerca.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Cerca una batteria' }), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Ordina: Livello/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Stanza' }));
    expect(onSaveSetting).toHaveBeenCalledWith('batterySort', 'area');
    expect(screen.getByRole('heading', { name: 'Ingresso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Senza stanza' })).toBeInTheDocument();
  });

  it('usa ordinamento e filtro salvati; stati di caricamento e vuoto', () => {
    const view = renderWithRuntime(
      <BatteryPage
        pageId="batterie"
        settings={{ batterySort: 'name-za', batteryFilter: 'ok' }}
        onSaveSetting={() => {}}
      />,
      { entities: batteries }
    );
    const items = screen
      .getAllByRole('listitem')
      .map((item) => within(item).getByTitle(/sensor\./).textContent);
    expect(items).toEqual(['Termostato', 'Aspirapolvere']);
    view.update({ entitiesLoaded: false });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento delle batterie…');
    view.update({ entitiesLoaded: true, entities: {} });
    expect(screen.getByText('Nessun sensore di batteria trovato.')).toBeInTheDocument();
  });

  it('le impostazioni della pagina arrivano dalle props (PageKindProps), senza stato proprio', () => {
    expect(utilityPages.find((definition) => definition.kind === 'battery')?.Page).toBe(
      BatteryPage
    );
    expect(utilityPages.find((definition) => definition.kind === 'rooms')?.Page).toBe(RoomsPage);
    const onSaveSetting = vi.fn();
    const page = (settings: PageSettings) => (
      <BatteryPage pageId="batterie" settings={settings} onSaveSetting={onSaveSetting} />
    );
    const view = renderWithRuntime(page({ batteryFilter: 'low' }), { entities: batteries });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    // The choice is saved through the launcher; the page shows what the settings say.
    fireEvent.click(screen.getByRole('button', { name: 'Tutte (4)' }));
    expect(onSaveSetting).toHaveBeenCalledWith('batteryFilter', 'all');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    view.update({}, page({ batteryFilter: 'all', batterySort: 'name-az' }));
    const names = screen
      .getAllByRole('listitem')
      .map((item) => within(item).getByTitle(/sensor\./).textContent);
    expect(names).toEqual(['Aspirapolvere', 'Porta ingresso', 'Telecomando', 'Termostato']);
    // Values that are not choices of this page fall back to the defaults.
    view.update({}, page({ batteryFilter: 'qualcosa', batterySort: 'x' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Ordina: Livello/ })).toBeInTheDocument();
  });
});

describe('pagina stanze', () => {
  const areas = [
    { area_id: 'cucina', name: 'Cucina' },
    { area_id: 'studio', name: 'Studio' },
  ];
  const entityRegistry = [
    { entity_id: 'light.cucina', area_id: 'cucina' },
    { entity_id: 'sensor.cucina_temperature', device_id: 'termometro' },
    { entity_id: 'cover.cucina', area_id: 'cucina' },
    { entity_id: 'switch.nascosto', area_id: 'cucina', hidden_by: 'user' },
    { entity_id: 'light.studio', area_id: 'studio' },
  ];
  const deviceRegistry = [{ id: 'termometro', area_id: 'cucina' }];
  const roomEntities = fixtureEntities([
    fixtureEntity('light.cucina', 'on', { brightness: 255, supported_color_modes: ['brightness'] }),
    fixtureEntity('sensor.cucina_temperature', '22.36', { device_class: 'temperature' }),
    fixtureEntity('cover.cucina', 'closed'),
    fixtureEntity('light.studio', 'off'),
  ]);
  const connection = () =>
    fakeConnection({
      'config/area_registry/list': () => areas,
      'config/entity_registry/list': () => entityRegistry,
      'config/device_registry/list': () => deviceRegistry,
    });

  it('raggruppa le entità per area come getEntitiesForArea (dispositivo compreso, nascoste escluse)', () => {
    expect(entitiesByArea(areas, entityRegistry, deviceRegistry)).toEqual({
      cucina: ['light.cucina', 'sensor.cucina_temperature', 'cover.cucina'],
      studio: ['light.studio'],
    });
  });

  it('panoramica, ordinamento, dettaglio con filtri e comandi', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const onSaveSetting = vi.fn();
    renderWithRuntime(<HostedPage Page={RoomsPage} pageId="stanze" onSave={onSaveSetting} />, {
      conn: connection().conn,
      entities: roomEntities,
      callService,
    });
    const kitchen = await screen.findByRole('button', {
      name: 'Cucina: 3 dispositivi, 1 luce accesa',
    });
    expect(screen.getByText('2 stanze · 1 luce accesa · 1 attivo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ordina: Nome A–Z/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Più dispositivi' }));
    expect(onSaveSetting).toHaveBeenCalledWith('roomSort', 'entity-count');

    fireEvent.click(kitchen);
    expect(screen.getByRole('heading', { level: 2, name: 'Cucina' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spegni tutte' }));
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.cucina' });
    fireEvent.click(screen.getByRole('button', { name: 'Apri cucina' }));
    expect(callService).toHaveBeenLastCalledWith('cover', 'open_cover', {
      entity_id: 'cover.cucina',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tapparelle (1)' }));
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle stanze' }));
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('ordinamento e temperatura dalle impostazioni della pagina e da haConfig', async () => {
    const fixture = renderWithRuntime(
      <RoomsPage pageId="stanze" settings={{ roomSort: 'name-za' }} onSaveSetting={() => {}} />,
      { conn: connection().conn, entities: roomEntities }
    );
    await screen.findByRole('button', { name: /^Cucina:/ });
    const tiles = screen
      .getAllByRole('button', { name: /dispositivi/ })
      .map((tile) => tile.getAttribute('aria-label'));
    expect(tiles[0]).toMatch(/^Studio:/);
    expect(screen.getByRole('button', { name: /Ordina: Nome Z–A/ })).toBeInTheDocument();
    expect(screen.getByText('22,4 °C')).toBeInTheDocument();
    const metric = fixture.runtime.haConfig;
    fixture.update({
      haConfig: metric && { ...metric, unit_system: { ...metric.unit_system, temperature: '°F' } },
    });
    expect(screen.getByText('72,3 °F')).toBeInTheDocument();
  });

  it('senza collegamento, errore del registro, nessuna area', async () => {
    const view = renderWithRuntime(
      <RoomsPage pageId="stanze" settings={{}} onSaveSetting={() => {}} />,
      {
        entities: roomEntities,
      }
    );
    expect(
      screen.getByText('Le stanze arrivano da Home Assistant: il collegamento non è attivo.')
    ).toBeInTheDocument();
    view.update({ conn: fakeConnection({}).conn });
    expect(
      await screen.findByText('Impossibile leggere le stanze da Home Assistant. Riprova più tardi.')
    ).toBeInTheDocument();
    view.update({
      conn: fakeConnection({
        'config/area_registry/list': () => [],
        'config/entity_registry/list': () => [],
        'config/device_registry/list': () => [],
      }).conn,
    });
    expect(await screen.findByText('Nessuna stanza in Home Assistant.')).toBeInTheDocument();
  });
});
