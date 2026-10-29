/**
 * «Rileva dispositivi» (F1): the widget and its details with a fake Home Assistant, and the add
 * sheet opened with a device already chosen.
 */
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntityMap } from '@/@types/ha';
import type { AddWidgetSelection, LauncherApi, LauncherLayout } from '@/@types/launcher';
import { DiscoverDetails } from '@/components/widgets/utilities/discover/DiscoverDetails';
import { DiscoverWidget } from '@/components/widgets/utilities/discover/DiscoverWidget';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { PageProvider } from '@/hooks/context/PageContext';
import { AddWidgetRequestProvider } from '@/hooks/launcher/AddWidgetRequestContext';
import { DiscoveryScreenProvider } from '@/hooks/launcher/DiscoveryScreenContext';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { AddWidgetSheet } from '@/templates/sheets';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { discoveredDto, installFakeDevices, tvDto } from './devicesFakeServer';
import { fakeConnection } from './UtilityHarness';

const auth = vi.hoisted(() => ({
  headers: vi.fn(() => Promise.resolve({ Authorization: 'Bearer test' })),
  method: vi.fn(() => 'oauth'),
  unauthorized: vi.fn((message: string) => Object.assign(new Error(message), { status: 401 })),
}));

vi.mock('@/api/apiAuth', () => ({
  getValidatedHomeAssistantRequestHeadersAsync: auth.headers,
  getStoredAuthMethod: auth.method,
  notifyHomeAssistantApiUnauthorized: auth.unauthorized,
}));

const layout = {
  version: 1,
  categoryDefaultsVersion: 1,
  cover: { enabled: false },
  pages: [
    {
      id: 'home',
      label: 'home',
      kind: 'widgets',
      placements: { tablet: { rileva_card_1: { x: 0, y: 0, w: 2, h: 2 } } },
    },
  ],
} as unknown as LauncherLayout;

const deviceRegistry = [
  { id: 'tv', name: 'LG webOS TV' },
  { id: 'lampada', name: 'Lampada studio' },
  { id: 'gia', name: 'Luce cucina' },
  { id: 'sole', name: 'Sun', identifiers: [['sun', 'x']] },
];
const entityRegistry = [
  { entity_id: 'media_player.lg', device_id: 'tv', platform: 'webostv' },
  { entity_id: 'remote.lg', device_id: 'tv', platform: 'webostv' },
  { entity_id: 'light.studio', device_id: 'lampada', platform: 'hue' },
  { entity_id: 'light.cucina', device_id: 'gia', platform: 'hue' },
  {
    entity_id: 'sensor.sole',
    device_id: 'sole',
    platform: 'sun',
    original_device_class: 'timestamp',
  },
];
const entities = () =>
  fixtureEntities([
    fixtureEntity('media_player.lg', 'off', { friendly_name: 'LG webOS TV' }),
    fixtureEntity('remote.lg', 'on'),
    fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada studio' }),
    fixtureEntity('light.cucina', 'on', { friendly_name: 'Luce cucina' }),
    fixtureEntity('sensor.sole', 'x'),
  ]);

const connection = () =>
  fakeConnection({
    'config/device_registry/list': () => deviceRegistry,
    'config/entity_registry/list': () => entityRegistry,
  });

const seed = () => {
  localStorage.clear();
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  localStorage.setItem(
    'tunet_pages_config',
    JSON.stringify({ header: [], pages: ['home'], home: ['rileva_card_1', 'light.cucina'] })
  );
};

const wrap = (node: ReactNode, state: EntityMap = entities(), conn = connection().conn) => (
  <PageProvider>
    <WidgetRuntimeProvider value={createFixtureRuntime({ entities: state, conn })}>
      {node}
    </WidgetRuntimeProvider>
  </PageProvider>
);

beforeEach(seed);
afterEach(cleanup);

describe('widget «Trova dispositivi»', () => {
  it('è nel registro con le misure del piano', () => {
    const definition = findWidgetDefinition('rileva_card_1', {});
    expect(definition?.type).toBe('rileva');
    expect(definition?.sizes).toEqual({
      min: { w: 2, h: 2 },
      max: { w: 4, h: 4 },
      default: { w: 2, h: 2 },
    });
  });

  it('conta i dispositivi da collegare come la schermata, televisori in rete compresi', async () => {
    const fake = installFakeDevices();
    fake.on('GET /scoperti', () => ({
      body: {
        devices: [
          discoveredDto({ flowId: 'f1', name: 'Reolink ingresso', family: 'camera' }),
          discoveredDto({ flowId: 'f2', name: 'Philips Hue', family: 'light' }),
        ],
      },
    }));
    fake.on('GET /tv-in-rete', () => ({ body: { tvs: [tvDto({ name: 'Samsung salotto' })] } }));
    render(
      wrap(
        <DiscoverWidget
          id="rileva_card_1"
          settingsKey="home::rileva_card_1"
          settings={{}}
          size={{ w: 2, h: 2 }}
          editMode={false}
        />
      )
    );
    const list = await screen.findByRole('list', { name: 'Primi dispositivi' });
    await waitFor(() => expect(list).toHaveTextContent('Samsung salotto'));
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(list).toHaveTextContent('Reolink ingresso');
    expect(list).toHaveTextContent('Philips Hue');
    vi.unstubAllGlobals();
  });

  it('al tocco apre la schermata «Trova dispositivi» del launcher', async () => {
    const show = vi.fn();
    const openDetails = vi.fn();
    render(
      <PageProvider>
        <WidgetRuntimeProvider
          value={createFixtureRuntime({
            entities: entities(),
            conn: connection().conn,
            openDetails,
          })}
        >
          <DiscoveryScreenProvider value={show}>
            <DiscoverWidget
              id="rileva_card_1"
              settingsKey="home::rileva_card_1"
              settings={{}}
              size={{ w: 2, h: 2 }}
              editMode={false}
            />
          </DiscoveryScreenProvider>
        </WidgetRuntimeProvider>
      </PageProvider>
    );
    fireEvent.click(
      await screen.findByRole('button', { name: /Trova dispositivi, apri l’elenco/ })
    );
    expect(show).toHaveBeenCalledTimes(1);
    expect(openDetails).not.toHaveBeenCalled();
  });

  it('mentre i dati arrivano mostra il caricamento, non «nessun dispositivo»', () => {
    render(
      <PageProvider>
        <WidgetRuntimeProvider
          value={createFixtureRuntime({ entitiesLoaded: false, conn: connection().conn })}
        >
          <DiscoverWidget
            id="rileva_card_1"
            settingsKey="home::rileva_card_1"
            settings={{}}
            size={{ w: 2, h: 2 }}
            editMode={false}
          />
        </WidgetRuntimeProvider>
      </PageProvider>
    );
    expect(screen.queryByText('Nessun dispositivo nuovo')).toBeNull();
    expect(screen.getByText('Caricamento di Trova dispositivi…')).toBeInTheDocument();
  });
});

describe('Details di «Trova dispositivi»', () => {
  const launcher = { layout } as unknown as LauncherApi;

  const details = (
    onClose = vi.fn(),
    openAddWidget: (pageId: string, selection: AddWidgetSelection) => void = vi.fn(),
    state?: EntityMap
  ) =>
    render(
      wrap(
        <LauncherProvider value={launcher}>
          <AddWidgetRequestProvider value={openAddWidget}>
            <DiscoverDetails
              id="rileva_card_1"
              settingsKey="home::rileva_card_1"
              settings={{}}
              onClose={onClose}
            />
          </AddWidgetRequestProvider>
        </LauncherProvider>,
        state
      )
    );

  it('mentre legge i registri dice che sta caricando', () => {
    details();
    expect(screen.getByText('Cerco i dispositivi della casa…')).toBeInTheDocument();
  });

  it('elenca per famiglia sotto «Pronti da aggiungere», senza i dispositivi già in un widget', async () => {
    details();
    expect(await screen.findByText('Pronti da aggiungere')).toBeInTheDocument();
    const tv = await screen.findByRole('group', { name: 'Televisori' });
    expect(tv).toHaveTextContent('LG webOS TV');
    expect(screen.getByRole('group', { name: 'Luci' })).toHaveTextContent('Lampada studio');
    expect(screen.queryByText('Luce cucina')).toBeNull();
    expect(screen.queryByText('Sun')).toBeNull();
  });

  it('un tocco chiude i dettagli e apre «Aggiungi un widget» sul tipo con il dispositivo scelto', async () => {
    const onClose = vi.fn();
    const openAddWidget = vi.fn();
    details(onClose, openAddWidget);
    fireEvent.click(await screen.findByRole('button', { name: /LG webOS TV/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(openAddWidget).toHaveBeenCalledWith('home', {
      type: 'androidtv',
      entityIds: ['media_player.lg'],
      remoteId: 'remote.lg',
    });
  });

  it('senza il launcher le righe sono inerti', async () => {
    render(
      wrap(
        <DiscoverDetails
          id="rileva_card_1"
          settingsKey="home::rileva_card_1"
          settings={{}}
          onClose={vi.fn()}
        />
      )
    );
    expect(await screen.findByRole('button', { name: /LG webOS TV/ })).toBeDisabled();
  });

  it('senza dispositivi nuovi lo dice', async () => {
    const only = fixtureEntities([fixtureEntity('light.cucina', 'on')]);
    details(vi.fn(), vi.fn(), only);
    expect(
      await screen.findByText(
        'Nessun dispositivo nuovo: quelli della casa sono già nei widget.'
      )
    ).toBeInTheDocument();
  });

  it('se Home Assistant non risponde lo dice', async () => {
    const failing = fakeConnection({
      'config/device_registry/list': () => {
        throw new Error('no');
      },
      'config/entity_registry/list': () => [],
    });
    render(
      wrap(
        <DiscoverDetails
          id="rileva_card_1"
          settingsKey="home::rileva_card_1"
          settings={{}}
          onClose={vi.fn()}
        />,
        entities(),
        failing.conn
      )
    );
    expect(
      await screen.findByText('Non riesco a leggere i dispositivi della casa.')
    ).toBeInTheDocument();
  });
});

describe('«Aggiungi un widget» con un dispositivo già scelto', () => {
  const open = (initialSelection: { type: string; entityIds: string[]; remoteId?: string }) => {
    const onAdded = vi.fn();
    const view = render(
      wrap(
        <AddWidgetSheet
          open
          onClose={vi.fn()}
          pageId="home"
          onAdded={onAdded}
          initialSelection={initialSelection}
        />
      )
    );
    return { ...view, onAdded };
  };

  const stored = () =>
    Object.values(
      JSON.parse(localStorage.getItem('tunet_card_settings') ?? '{}') as Record<
        string,
        Record<string, unknown>
      >
    );

  it('un televisore: apre i dettagli con lettore e telecomando scelti e lo aggiunge', async () => {
    const { onAdded } = open({
      type: 'androidtv',
      entityIds: ['media_player.lg'],
      remoteId: 'remote.lg',
    });
    expect(await screen.findByRole('heading', { name: 'Android TV' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Tipi di widget' })).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /LG webOS TV/ })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    );
    expect(screen.getByRole('button', { name: /^lg$/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi il widget' }));
    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    expect(stored().find((settings) => settings.mediaPlayerId === 'media_player.lg')).toMatchObject(
      { mediaPlayerId: 'media_player.lg', remoteId: 'remote.lg' }
    );
  });

  it('una luce: la seleziona e il widget nasce legato a lei', async () => {
    const { onAdded } = open({ type: 'light', entityIds: ['light.studio'] });
    const row = await screen.findByRole('button', { name: /Lampada studio/ });
    await waitFor(() => expect(row).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi il widget' }));
    await waitFor(() => expect(onAdded).toHaveBeenCalledWith('light.studio'));
    const config = JSON.parse(localStorage.getItem('tunet_pages_config') ?? '{}') as Record<
      string,
      string[]
    >;
    expect(config.home).toContain('light.studio');
  });

  it('un tipo che non esiste lascia la scelta del tipo', () => {
    open({ type: 'inesistente', entityIds: [] });
    expect(screen.getByRole('group', { name: 'Tipi di widget' })).toBeInTheDocument();
  });
});
