/**
 * «Trovati in rete» (F2): the section of the details of «Rileva dispositivi» that lists what Home
 * Assistant found by itself, with a fake `fetch` for the device facade. The real client, the real
 * flow of «Aggiungi un dispositivo» and the real details run on top of it.
 */
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import type { EntityMap } from '@/@types/ha';
import type { AddWidgetSelection, LauncherApi, LauncherLayout } from '@/@types/launcher';
import { DISCOVERED_POLL_MS } from '@/components/widgets/utilities/discover/useDiscoveredDevices';
import { DiscoverDetails } from '@/components/widgets/utilities/discover/DiscoverDetails';
import { PageProvider } from '@/hooks/context/PageContext';
import { AddWidgetRequestProvider } from '@/hooks/launcher/AddWidgetRequestContext';
import { DiscoveredFlowProvider } from '@/hooks/launcher/DiscoveredFlowContext';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { DiscoveredAddFlow } from '@/templates/devices/DiscoveredAddFlow';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { fakeConnection } from './UtilityHarness';
import {
  SAMSUNG_ENTITY,
  SAMSUNG_FLOW,
  discoveredDto,
  entryDto,
  errorReply,
  installFakeDevices,
  samsungConfirmForm,
  samsungCreated,
  samsungEntry,
  type FakeDevices,
} from './devicesFakeServer';

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

const launcher = { layout } as unknown as LauncherApi;

// The new devices are in the live data but not yet in the registries: the family decides.
const deviceRegistry = [{ id: 'lampada', name: 'Lampada studio' }];
const entityRegistry = [{ entity_id: 'light.studio', device_id: 'lampada', platform: 'hue' }];

const entities = (): EntityMap =>
  fixtureEntities([
    fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada studio' }),
    fixtureEntity(SAMSUNG_ENTITY, 'off', { friendly_name: 'Samsung 7 Series (49)' }),
    fixtureEntity('light.hue_lamp', 'off', { friendly_name: 'Hue' }),
  ]);

const connection = () =>
  fakeConnection({
    'config/device_registry/list': () => deviceRegistry,
    'config/entity_registry/list': () => entityRegistry,
  });

let fake: FakeDevices;

const seed = () => {
  localStorage.clear();
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  localStorage.setItem(
    'tunet_pages_config',
    JSON.stringify({ header: [], pages: ['home'], home: ['rileva_card_1'] })
  );
};

const onClose = vi.fn();
const openAddWidget = vi.fn<(pageId: string, selection: AddWidgetSelection) => void>();

const details = (children?: ReactNode) =>
  render(
    <PageProvider>
      <WidgetRuntimeProvider
        value={createFixtureRuntime({ entities: entities(), conn: connection().conn })}
      >
        <LauncherProvider value={launcher}>
          <AddWidgetRequestProvider value={openAddWidget}>
            <DiscoveredFlowProvider value={DiscoveredAddFlow}>
              {children ?? (
                <DiscoverDetails
                  id="rileva_card_1"
                  settingsKey="home::rileva_card_1"
                  settings={{}}
                  onClose={onClose}
                />
              )}
            </DiscoveredFlowProvider>
          </AddWidgetRequestProvider>
        </LauncherProvider>
      </WidgetRuntimeProvider>
    </PageProvider>
  );

const nestFound = () =>
  discoveredDto({
    flowId: 'found-nest',
    handler: 'nest',
    name: 'Nest Thermostat',
    model: null,
    family: 'climate',
    addable: false,
    reason: 'Richiede l’installatore.',
  });

const withFound = (...devices: ReturnType<typeof discoveredDto>[]) =>
  fake.on('GET /scoperti', () => ({ body: { devices } }));

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  seed();
  auth.headers.mockClear();
  onClose.mockClear();
  openAddWidget.mockClear();
  fake = installFakeDevices();
});

afterEach(() => {
  cleanup();
  setVisibility('visible');
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('«Trovati in rete»: the section', () => {
  it('lists what Home Assistant found, above «Pronti da aggiungere», with its two answers', async () => {
    withFound(discoveredDto(), nestFound());
    details();

    const list = await screen.findByRole('list', { name: 'Dispositivi trovati in rete' });
    expect(list).toHaveTextContent('Samsung 7 Series (49)');
    expect(list).toHaveTextContent('UE49NU7100');
    expect(screen.getByRole('button', { name: 'Aggiungi Samsung 7 Series (49)' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Non mi interessa: Samsung 7 Series (49)' })
    ).toBeEnabled();

    // Put first: «Trovati in rete» comes before «Pronti da aggiungere».
    const network = screen.getByRole('heading', { name: 'Trovati in rete' });
    const ready = await screen.findByRole('heading', { name: 'Pronti da aggiungere' });
    expect(network.compareDocumentPosition(ready) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The section of the F1 keeps working beside it.
    expect(await screen.findByRole('group', { name: 'Luci' })).toHaveTextContent('Lampada studio');
  });

  it('shows why a device cannot be added here, and offers no «Aggiungi» for it', async () => {
    withFound(nestFound());
    details();

    expect(await screen.findByText('Nest Thermostat')).toBeInTheDocument();
    expect(screen.getByText('Richiede l’installatore.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Aggiungi Nest/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Non mi interessa: Nest Thermostat' })).toBeEnabled();
  });

  it('says so when nothing new was found', async () => {
    details();
    expect(
      await screen.findByText('Nessun dispositivo nuovo trovato in rete.')
    ).toBeInTheDocument();
  });

  it('says "servizio non attivo" in the words of the server, and keeps the other list', async () => {
    const message =
      'Servizio non attivo. La configurazione dei dispositivi da Acasystem è spenta: chiedi all’installatore di attivarla.';
    fake.on('GET /scoperti', () => errorReply(503, 'SERVICE_NOT_ACTIVE', message));
    details();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trovati in rete' })).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: 'Luci' })).toHaveTextContent('Lampada studio');
  });

  it('stays quiet when the network fails: no section, the F1 list still there', async () => {
    fake.fetchMock.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
    details();

    expect(await screen.findByRole('group', { name: 'Luci' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Trovati in rete' })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Failed to fetch/);
  });
});

describe('«Trovati in rete»: the polling', () => {
  it('reads again every 15 seconds while open, and stops when closed or hidden', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const view = details();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fake.callsTo('GET /scoperti')).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DISCOVERED_POLL_MS);
    });
    expect(fake.callsTo('GET /scoperti')).toHaveLength(2);

    // The tab goes to the background: no more requests...
    act(() => setVisibility('hidden'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DISCOVERED_POLL_MS * 3);
    });
    expect(fake.callsTo('GET /scoperti')).toHaveLength(2);

    // ...and one at once when it comes back.
    act(() => setVisibility('visible'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fake.callsTo('GET /scoperti')).toHaveLength(3);

    // The details close: the timer goes with them.
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DISCOVERED_POLL_MS * 4);
    });
    expect(fake.callsTo('GET /scoperti')).toHaveLength(3);
  });
});

describe('«Non mi interessa»', () => {
  it('asks the server to ignore the device and takes the row off the list', async () => {
    withFound(discoveredDto(), nestFound());
    fake.on('POST /scoperti/:id/ignora', () => ({ body: { ignored: true } }));
    details();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Non mi interessa: Samsung 7 Series (49)' })
    );
    await waitFor(() => expect(screen.queryByText('Samsung 7 Series (49)')).toBeNull());
    expect(fake.callsTo('POST /scoperti/found-samsung/ignora')).toHaveLength(1);
    expect(screen.getByText('Nest Thermostat')).toBeInTheDocument();
  });

  it('keeps the row and says why when the server refuses', async () => {
    withFound(discoveredDto());
    fake.on('POST /scoperti/:id/ignora', () =>
      errorReply(502, 'HA_REFUSED', 'Home Assistant ha rifiutato l’operazione.')
    );
    details();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Non mi interessa: Samsung 7 Series (49)' })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Home Assistant ha rifiutato l’operazione.'
    );
    expect(screen.getByText('Samsung 7 Series (49)')).toBeInTheDocument();
  });
});

describe('«Aggiungi» on a device found in the network', () => {
  const addSamsung = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi Samsung 7 Series (49)' }));
  };

  it('takes the flow over, asks «Consenti» on the TV, then opens «Aggiungi un widget» on the TV', async () => {
    withFound(discoveredDto());
    fake.on('POST /scoperti/:id/aggiungi', () => ({ body: samsungConfirmForm() }));
    fake.on('POST /flussi/:id', () => ({ body: samsungCreated() }));
    fake.on('GET /voci/:id', () => ({ body: samsungEntry() }));
    details();

    await addSamsung();
    // The catalogue is skipped: the flow of the device is taken over by id.
    expect(
      await screen.findByRole('heading', { name: 'Accetta sul televisore' })
    ).toBeInTheDocument();
    expect(fake.callsTo('POST /scoperti/found-samsung/aggiungi')).toHaveLength(1);
    expect(fake.callsTo('GET /catalogo')).toHaveLength(0);
    expect(screen.getByText(/scegliere Consenti/)).toBeInTheDocument();
    // While the flow is open the list is not polled any more.
    const reads = fake.callsTo('GET /scoperti').length;

    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    // The step is answered on the flow id of the discovery, with the empty body of «Consenti».
    await waitFor(() => expect(fake.callsTo(`POST /flussi/${SAMSUNG_FLOW}`)).toHaveLength(1));
    expect(fake.callsTo(`POST /flussi/${SAMSUNG_FLOW}`)[0]?.body).toEqual({ input: {} });

    // Name and room, then the end.
    fireEvent.click(await screen.findByRole('button', { name: 'Salta' }));
    const done = await screen.findByRole('button', { name: 'Fine' });
    await waitFor(() => expect(done).toBeEnabled());
    fireEvent.click(done);

    await waitFor(() => expect(openAddWidget).toHaveBeenCalledTimes(1));
    expect(openAddWidget).toHaveBeenCalledWith('home', {
      type: 'androidtv',
      entityIds: [SAMSUNG_ENTITY],
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fake.callsTo('GET /scoperti')).toHaveLength(reads);
  });

  it('a light: the flow without a wait, and the widget of the lights with its entity', async () => {
    withFound(
      discoveredDto({
        flowId: 'found-hue',
        handler: 'hue',
        name: 'Philips Hue',
        model: 'BSB002',
        family: 'light',
      })
    );
    fake.on('POST /scoperti/:id/aggiungi', () => ({
      body: {
        type: 'form',
        flowId: 'found-hue',
        handler: 'hue',
        stepId: 'link',
        title: 'Premi il pulsante del bridge',
        description: 'Premi il pulsante rotondo sopra il bridge Hue, poi tocca Conferma.',
        waitSeconds: null,
        fields: [],
        errors: [],
      },
    }));
    fake.on('POST /flussi/:id', () => ({
      body: {
        type: 'create_entry',
        handler: 'hue',
        entryId: 'entry-hue',
        domain: 'hue',
        title: 'Philips Hue',
        entry: entryDto({
          entryId: 'entry-hue',
          domain: 'hue',
          title: 'Philips Hue',
          device: {
            id: 'dev-hue',
            name: 'Philips Hue',
            manufacturer: 'Signify',
            model: 'BSB002',
            areaId: null,
            areaName: null,
          },
          entities: ['light.hue_lamp'],
          mediaPlayerEntityId: null,
          power: null,
        }),
        pending: false,
      },
    }));
    details();

    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi Philips Hue' }));
    expect(
      await screen.findByRole('heading', { name: 'Premi il pulsante del bridge' })
    ).toBeInTheDocument();
    expect(screen.getByText(/pulsante rotondo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Conferma' }));

    // The name offered is the one Home Assistant gave, not «Televisore».
    expect(await screen.findByLabelText('Nome del dispositivo')).toHaveValue('Philips Hue');
    fireEvent.click(screen.getByRole('button', { name: 'Salta' }));
    const done = await screen.findByRole('button', { name: 'Fine' });
    await waitFor(() => expect(done).toBeEnabled());
    fireEvent.click(done);

    // The registries do not know the new device yet: the family of the integration decides.
    await waitFor(() => expect(openAddWidget).toHaveBeenCalledTimes(1));
    expect(openAddWidget).toHaveBeenCalledWith('home', {
      type: 'light',
      entityIds: ['light.hue_lamp'],
    });
  });

  it('says "Richiede l’installatore" when the server refuses the flow, and «Esci» goes back to the list', async () => {
    withFound(discoveredDto());
    fake.on('POST /scoperti/:id/aggiungi', () =>
      errorReply(403, 'REQUIRES_INSTALLER', 'Richiede l’installatore.')
    );
    details();

    await addSamsung();
    expect(await screen.findByText('Richiede l’installatore.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ricomincia' })).toBeNull();
    const before = fake.callsTo('GET /scoperti').length;

    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    expect(
      await screen.findByRole('list', { name: 'Dispositivi trovati in rete' })
    ).toBeInTheDocument();
    await waitFor(() => expect(fake.callsTo('GET /scoperti').length).toBeGreaterThan(before));
    expect(openAddWidget).not.toHaveBeenCalled();
  });

  it('cancels the flow when the person leaves in the middle', async () => {
    withFound(discoveredDto());
    fake.on('POST /scoperti/:id/aggiungi', () => ({ body: samsungConfirmForm() }));
    details();

    await addSamsung();
    await screen.findByRole('heading', { name: 'Accetta sul televisore' });
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    await waitFor(() => expect(fake.callsTo(`DELETE /flussi/${SAMSUNG_FLOW}`)).toHaveLength(1));
    expect(
      await screen.findByRole('list', { name: 'Dispositivi trovati in rete' })
    ).toBeInTheDocument();
  });

  it('without the launcher «Aggiungi» is inert', async () => {
    withFound(discoveredDto());
    render(
      <PageProvider>
        <WidgetRuntimeProvider
          value={createFixtureRuntime({ entities: entities(), conn: connection().conn })}
        >
          <DiscoverDetails
            id="rileva_card_1"
            settingsKey="home::rileva_card_1"
            settings={{}}
            onClose={onClose}
          />
        </WidgetRuntimeProvider>
      </PageProvider>
    );
    expect(
      await screen.findByRole('button', { name: 'Aggiungi Samsung 7 Series (49)' })
    ).toBeDisabled();
  });
});
