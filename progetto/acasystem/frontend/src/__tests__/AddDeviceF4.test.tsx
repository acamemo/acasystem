/**
 * F4 (ADR-0024, annotation of 2026-10-27): the customer does at home what the installer does.
 * Generic forms, the steps that are not forms (menu, progress, external), «Non lo trovi? Aggiungi
 * per marca» up to the add-widget sheet (the Samsung J series by address), «Fai lampeggiare» and
 * «Rimuovi dispositivo». The server is a fake `fetch`; the client and the screens are real.
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
import { DiscoverDetails } from '@/components/widgets/utilities/discover/DiscoverDetails';
import { PageProvider } from '@/hooks/context/PageContext';
import { AddWidgetRequestProvider } from '@/hooks/launcher/AddWidgetRequestContext';
import { DiscoveredFlowProvider } from '@/hooks/launcher/DiscoveredFlowContext';
import { LauncherProvider } from '@/hooks/launcher/LauncherContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { AddDeviceFlow } from '@/templates/devices/AddDeviceFlow';
import { DiscoveredAddFlow } from '@/templates/devices/DiscoveredAddFlow';
import { FlowFormStep } from '@/templates/devices/FlowFormStep';
import { FLOW_POLL_MS } from '@/templates/devices/useDeviceFlow';
import { RemoveDevice } from '@/templates/devices/RemoveDevice';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { fakeConnection } from './UtilityHarness';
import {
  SAMSUNG_ENTITY,
  entryDto,
  errorReply,
  externalDto,
  genericForm,
  installFakeDevices,
  menuDto,
  progressDto,
  samsungCreated,
  samsungEntry,
  userForm,
  type FakeDevices,
} from './devicesFakeServer';

let fake: FakeDevices;

beforeEach(() => {
  auth.headers.mockClear();
  fake = installFakeDevices();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Lets the requests that are about to leave go out (the client awaits the token first). */
const settled = () => new Promise((resolve) => setTimeout(resolve, 30));

const catalogueItem = (domain: string) => ({
  domain,
  name: domain,
  brand: null,
  integrationType: null,
  iotClass: null,
  startDomain: domain,
  startable: true,
  requiresInstaller: false,
});

// --- The generic form ------------------------------------------------------------------------

describe('a generic form drawn from the server’s fields', () => {
  const onSubmit = vi.fn();
  const onExit = vi.fn();

  const form = () =>
    render(
      <FlowFormStep
        form={genericForm()}
        busy={false}
        extraError={null}
        onSubmit={onSubmit}
        onExit={onExit}
      />
    );

  beforeEach(() => {
    onSubmit.mockClear();
    onExit.mockClear();
  });

  it('shows the label and the help of each field in Italian, and starts with the defaults', () => {
    form();
    expect(screen.getByLabelText('Indirizzo IP o nome')).toHaveValue('');
    expect(screen.getByText('Lo trovi sull’etichetta.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Tentativi')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Tentativi')).toHaveAttribute('min', '1');
    expect(screen.getByLabelText('Tentativi')).toHaveAttribute('max', '5');
    expect(screen.getByRole('button', { name: 'Veloce' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Cucina' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows and hides a password with a button, and the value stays', () => {
    form();
    const password = screen.getByLabelText('Password');
    fireEvent.change(password, { target: { value: 'segreto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mostra il testo' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Password')).toHaveValue('segreto');
    fireEvent.click(screen.getByRole('button', { name: 'Nascondi il testo' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('stops on a missing required field and on a number out of range, naming the field', () => {
    form();
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    expect(screen.getAllByText('Compila questo campo.')).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Indirizzo IP o nome'), {
      target: { value: '192.168.1.40' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
    fireEvent.change(screen.getByLabelText('Tentativi'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    expect(screen.getByText('Scrivi un numero tra 1 e 5.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends what was typed, chosen and switched, and nothing the person left empty', () => {
    form();
    fireEvent.change(screen.getByLabelText('Indirizzo IP o nome'), {
      target: { value: ' 192.168.1.40 ' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: ' pa ss ' } });
    fireEvent.change(screen.getByLabelText('Tentativi'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bagno' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Usa SSL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    expect(onSubmit).toHaveBeenCalledWith({
      host: '192.168.1.40',
      password: ' pa ss ',
      retries: 3,
      ssl: false,
      mode: 'slow',
      rooms: ['bath'],
    });
  });

  it('writes the errors of the server under the field and in general', () => {
    render(
      <FlowFormStep
        form={genericForm('f', [
          { field: 'host', code: 'invalid_host', message: 'L’indirizzo non è valido.' },
          { field: null, code: 'cannot_connect', message: 'Non riesco a collegarmi.' },
        ])}
        busy={false}
        extraError={null}
        onSubmit={onSubmit}
        onExit={onExit}
      />
    );
    expect(screen.getByText('L’indirizzo non è valido.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Non riesco a collegarmi.');
  });
});

// --- Menu, progress, external -----------------------------------------------------------------

function mountCatalogue() {
  return render(
    <WidgetRuntimeProvider value={createFixtureRuntime({ entities: fixtureEntities([]) })}>
      <AddDeviceFlow kind="media" onDone={vi.fn()} onExit={vi.fn()} />
    </WidgetRuntimeProvider>
  );
}

const startAcme = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi: hue' }));
};

describe('the steps that are not forms', () => {
  it('a menu shows the options and answers with the id of the chosen one', async () => {
    fake.on('POST /flussi', () => ({ status: 201, body: menuDto() }));
    fake.on('POST /flussi/:id', () => ({ body: genericForm() }));
    mountCatalogue();
    await startAcme();

    expect(await screen.findByRole('heading', { name: 'Scegli come continuare' })).toBeVisible();
    expect(screen.getByText('Puoi usare il cloud oppure la rete di casa.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Usa il cloud' }));

    await waitFor(() => expect(fake.callsTo('POST /flussi/flow-brand')).toHaveLength(1));
    expect(fake.callsTo('POST /flussi/flow-brand')[0]?.body).toEqual({
      input: { next_step_id: 'cloud' },
    });
    expect(await screen.findByRole('heading', { name: 'Collega Acme' })).toBeVisible();
  });

  it('a menu choice the server refuses stays on the menu with the message', async () => {
    fake.on('POST /flussi', () => ({ status: 201, body: menuDto() }));
    fake.on('POST /flussi/:id', () =>
      errorReply(400, 'INVALID_INPUT', 'I dati inseriti non sono validi.', {
        field: 'next_step_id',
      })
    );
    mountCatalogue();
    await startAcme();
    fireEvent.click(await screen.findByRole('button', { name: 'Usa la rete di casa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('I dati inseriti non sono validi.');
    expect(screen.getByRole('button', { name: 'Usa il cloud' })).toBeEnabled();
  });

  it('a progress step waits, reads the flow every few seconds, and goes on when it moves', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let reads = 0;
    fake.on('POST /flussi', () => ({ status: 201, body: progressDto() }));
    fake.on('GET /flussi/:id', () => {
      reads += 1;
      return { body: reads < 3 ? progressDto() : genericForm() };
    });
    mountCatalogue();
    await startAcme();

    expect(await screen.findByText('Cerco il dispositivo sulla rete.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Esci' })).toBeEnabled();
    expect(fake.callsTo('GET /flussi/flow-brand')).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FLOW_POLL_MS);
    });
    expect(fake.callsTo('GET /flussi/flow-brand')).toHaveLength(1);
    // The same step again: nothing changes on screen.
    expect(screen.getByText('Cerco il dispositivo sulla rete.')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FLOW_POLL_MS * 2);
    });
    expect(await screen.findByRole('heading', { name: 'Collega Acme' })).toBeVisible();
    // The wait is over: no more reads.
    const after = fake.callsTo('GET /flussi/flow-brand').length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FLOW_POLL_MS * 3);
    });
    expect(fake.callsTo('GET /flussi/flow-brand')).toHaveLength(after);
  });

  it('gives up after three failed reads, with the server’s words', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fake.on('POST /flussi', () => ({ status: 201, body: progressDto() }));
    fake.on('GET /flussi/:id', () =>
      errorReply(504, 'HA_TIMEOUT', 'Home Assistant non ha risposto in tempo. Riprova.')
    );
    mountCatalogue();
    await startAcme();
    await screen.findByText('Cerco il dispositivo sulla rete.');

    for (let round = 0; round < 3; round += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(FLOW_POLL_MS);
      });
    }
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Home Assistant non ha risposto in tempo. Riprova.'
    );
    expect(fake.callsTo('GET /flussi/flow-brand')).toHaveLength(3);
  });

  it('an external step opens the page of the maker in a new window and waits for the person', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    let reads = 0;
    fake.on('POST /flussi', () => ({ status: 201, body: externalDto() }));
    fake.on('GET /flussi/:id', () => {
      reads += 1;
      return { body: reads < 2 ? externalDto() : genericForm() };
    });
    mountCatalogue();
    await startAcme();

    expect(await screen.findByRole('heading', { name: 'Accedi sul sito del produttore' })).toBeVisible();
    expect(screen.getByText(/torna qui: continuo da solo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apri la pagina del produttore' }));
    expect(open).toHaveBeenCalledWith(
      'https://accounts.acme.test/oauth?state=abc',
      '_blank',
      'noopener,noreferrer'
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FLOW_POLL_MS * 2);
    });
    expect(await screen.findByRole('heading', { name: 'Collega Acme' })).toBeVisible();
  });

  it('leaving a waiting step cancels the flow', async () => {
    fake.on('POST /flussi', () => ({ status: 201, body: externalDto() }));
    mountCatalogue();
    await startAcme();
    await screen.findByRole('button', { name: 'Apri la pagina del produttore' });
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    await waitFor(() => expect(fake.callsTo('DELETE /flussi/flow-brand')).toHaveLength(1));
  });
});

// --- «Non lo trovi? Aggiungi per marca» --------------------------------------------------------

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

const onClose = vi.fn();
const openAddWidget = vi.fn<(pageId: string, selection: AddWidgetSelection) => void>();

const seed = () => {
  localStorage.clear();
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  localStorage.setItem(
    'tunet_pages_config',
    JSON.stringify({ header: [], pages: ['home'], home: ['rileva_card_1'] })
  );
};

function details(
  entities: EntityMap,
  handlers: Record<string, (message: Record<string, unknown>) => unknown> = {},
  callService = vi.fn(async () => undefined),
  children?: ReactNode
) {
  const connection = fakeConnection({
    'config/device_registry/list': () => [],
    'config/entity_registry/list': () => [],
    ...handlers,
  });
  return render(
    <PageProvider>
      <WidgetRuntimeProvider
        value={createFixtureRuntime({ entities, conn: connection.conn, callService })}
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
}

describe('«Non lo trovi? Aggiungi per marca»', () => {
  beforeEach(() => {
    seed();
    onClose.mockClear();
    openAddWidget.mockClear();
  });

  it('adds a Samsung J series TV by its address and opens «Aggiungi un widget» on it', async () => {
    const samsungUser = {
      ...userForm([], 'flow-s'),
      handler: 'samsungtv',
      title: 'Aggiungi il televisore Samsung',
    };
    const samsungPin = {
      ...userForm([], 'flow-s'),
      handler: 'samsungtv',
      stepId: 'encrypted_pairing',
      title: 'Scrivi il codice',
      description: 'Sul televisore è comparso un codice di quattro cifre: scrivilo qui.',
      fields: [
        {
          name: 'pin',
          kind: 'text' as const,
          required: true,
          label: 'Codice mostrato sul televisore',
        },
      ],
    };
    fake.on('GET /catalogo', () => ({
      body: {
        items: [catalogueItem('samsungtv'), catalogueItem('hue')],
        total: 2,
        degraded: true,
        message: null,
      },
    }));
    fake.on('POST /flussi', () => ({ status: 201, body: samsungUser }));
    fake.on('POST /flussi/:id', (call) => {
      const input = (call.body as { input: Record<string, unknown> }).input;
      return { body: 'host' in input ? samsungPin : samsungCreated(samsungEntry()) };
    });
    fake.on('GET /voci/:id', () => ({ body: samsungEntry() }));
    details(
      fixtureEntities([fixtureEntity(SAMSUNG_ENTITY, 'off', { friendly_name: 'Samsung J' })])
    );

    fireEvent.click(
      await screen.findByRole('button', { name: /Non lo trovi\? Aggiungi per marca/ })
    );
    // The catalogue of brands, no recommendation, every row startable.
    expect(await screen.findByRole('heading', { name: 'Scegli la marca' })).toBeVisible();
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi: samsungtv' }));
    await waitFor(() => expect(fake.callsTo('POST /flussi')).toHaveLength(1));
    expect(fake.callsTo('POST /flussi')[0]?.body).toEqual({ handler: 'samsungtv' });

    fireEvent.change(await screen.findByLabelText('Indirizzo del televisore'), {
      target: { value: '192.168.1.60' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    // The code step (F5): the fourth digit sends the answer, there is no «Avanti».
    fireEvent.change(await screen.findByLabelText('Codice mostrato sul televisore'), {
      target: { value: '4321' },
    });
    await waitFor(() => expect(fake.callsTo('POST /flussi/flow-s')).toHaveLength(2));
    expect(fake.callsTo('POST /flussi/flow-s').map((call) => call.body)).toEqual([
      { input: { host: '192.168.1.60' } },
      { input: { pin: '4321' } },
    ]);

    // Name and room, then the end; the sheet opens on the TV with its media player selected.
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
    // The flow of a discovery was never asked for.
    expect(fake.callsTo('POST /scoperti')).toHaveLength(0);
  });

  it('leaving the catalogue goes back to the details and reads the discoveries again', async () => {
    details(fixtureEntities([]));
    fireEvent.click(
      await screen.findByRole('button', { name: /Non lo trovi\? Aggiungi per marca/ })
    );
    await screen.findByRole('heading', { name: 'Scegli la marca' });
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    expect(await screen.findByRole('heading', { name: 'Pronti da aggiungere' })).toBeVisible();
  });
});

// --- «Fai lampeggiare» -------------------------------------------------------------------------

describe('«Fai lampeggiare»', () => {
  beforeEach(() => {
    seed();
    onClose.mockClear();
    openAddWidget.mockClear();
  });

  const registries = (rows: { entity: string; device: string; platform: string }[]) => ({
    'config/device_registry/list': () =>
      [...new Set(rows.map((row) => row.device))].map((id) => ({ id, name: id })),
    'config/entity_registry/list': () =>
      rows.map((row) => ({
        entity_id: row.entity,
        device_id: row.device,
        platform: row.platform,
      })),
  });

  it('presses the identify button of a device, and says the command was sent', async () => {
    const callService = vi.fn(async () => undefined);
    details(
      fixtureEntities([
        fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada', supported_features: 0 }),
        fixtureEntity('button.lampada_identify', 'unknown', { device_class: 'identify' }),
      ]),
      registries([
        { entity: 'light.studio', device: 'lampada', platform: 'hue' },
        { entity: 'button.lampada_identify', device: 'lampada', platform: 'hue' },
      ]),
      callService
    );

    fireEvent.click(await screen.findByRole('button', { name: /Fai lampeggiare/ }));
    await waitFor(() =>
      expect(callService).toHaveBeenCalledWith('button', 'press', {
        entity_id: 'button.lampada_identify',
      })
    );
    expect(await screen.findByText('Comando inviato: guarda il dispositivo.')).toBeInTheDocument();
  });

  it('flashes a light that supports it, and tells when the command fails', async () => {
    const callService = vi.fn(async () => {
      throw new Error('boom');
    });
    details(
      fixtureEntities([
        fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada', supported_features: 40 }),
      ]),
      registries([{ entity: 'light.studio', device: 'lampada', platform: 'hue' }]),
      callService
    );

    fireEvent.click(await screen.findByRole('button', { name: /Fai lampeggiare/ }));
    await waitFor(() =>
      expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
        entity_id: 'light.studio',
        flash: 'short',
      })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Non sono riuscito a farlo lampeggiare. Riprova.'
    );
  });

  it('offers nothing for a device with no way to show which one it is', async () => {
    details(
      fixtureEntities([
        fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada', supported_features: 0 }),
      ]),
      registries([{ entity: 'light.studio', device: 'lampada', platform: 'hue' }])
    );
    expect(await screen.findByRole('group', { name: 'Luci' })).toHaveTextContent(/lampada/i);
    expect(screen.queryByRole('button', { name: /Fai lampeggiare/ })).toBeNull();
  });

  it('is offered after an add too, next to the name of the new device', async () => {
    const callService = vi.fn(async () => undefined);
    fake.on('POST /flussi', () => ({ status: 201, body: userForm() }));
    fake.on('POST /flussi/:id', () => ({
      body: {
        ...samsungCreated(),
        entry: samsungEntry({ entities: ['light.studio'], mediaPlayerEntityId: null }),
      },
    }));
    fake.on('GET /voci/:id', () => ({
      body: samsungEntry({ entities: ['light.studio'], mediaPlayerEntityId: null }),
    }));
    const runtime = createFixtureRuntime({
      entities: fixtureEntities([
        fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada', supported_features: 8 }),
      ]),
      callService,
    });
    render(
      <WidgetRuntimeProvider value={runtime}>
        <AddDeviceFlow kind="media" onDone={vi.fn()} onExit={vi.fn()} />
      </WidgetRuntimeProvider>
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi: Televisore LG (webOS)' }));
    fireEvent.change(await screen.findByLabelText('Indirizzo del televisore'), {
      target: { value: '192.168.1.26' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));

    fireEvent.click(await screen.findByRole('button', { name: /Fai lampeggiare/ }));
    await waitFor(() => expect(callService).toHaveBeenCalledTimes(1));
    await settled();
  });
});

// --- «Rimuovi dispositivo» ---------------------------------------------------------------------

describe('«Rimuovi dispositivo»', () => {
  const onRemoved = vi.fn();

  const mountRemove = (entityId: string | null = 'media_player.samsung') => {
    const connection = fakeConnection({
      'config/entity_registry/list': () => [
        { entity_id: 'media_player.samsung', config_entry_id: 'entry1' },
        { entity_id: 'sun.sun', config_entry_id: 'entry-sun' },
        { entity_id: 'light.manual', device_id: 'x' },
      ],
    });
    return render(
      <WidgetRuntimeProvider
        value={createFixtureRuntime({ entities: fixtureEntities([]), conn: connection.conn })}
      >
        <RemoveDevice entityId={entityId} onRemoved={onRemoved} />
      </WidgetRuntimeProvider>
    );
  };

  beforeEach(() => onRemoved.mockClear());

  it('asks first, says what happens, removes the entry and tells the caller', async () => {
    fake.on('DELETE /voci/:id', () => ({ body: { removed: true } }));
    mountRemove();

    fireEvent.click(await screen.findByRole('button', { name: 'Rimuovi dispositivo' }));
    expect(
      screen.getByText(/sparisce da Home Assistant e da tutti i widget/)
    ).toBeInTheDocument();
    // Nothing was asked of the server yet but the check that the entry is the customer’s.
    expect(fake.callsTo('DELETE')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi' }));
    await waitFor(() => expect(fake.callsTo('DELETE /voci/entry1')).toHaveLength(1));
    expect(await screen.findByText('Dispositivo rimosso.')).toBeInTheDocument();
    expect(onRemoved).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled', async () => {
    mountRemove();
    fireEvent.click(await screen.findByRole('button', { name: 'Rimuovi dispositivo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(screen.getByRole('button', { name: 'Rimuovi dispositivo' })).toBeEnabled();
    expect(fake.callsTo('DELETE')).toHaveLength(0);
    expect(onRemoved).not.toHaveBeenCalled();
  });

  it('keeps the device and shows the server’s words when the removal fails', async () => {
    fake.on('DELETE /voci/:id', () =>
      errorReply(502, 'HA_REFUSED', 'Home Assistant ha rifiutato l’operazione.')
    );
    mountRemove();
    fireEvent.click(await screen.findByRole('button', { name: 'Rimuovi dispositivo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Home Assistant ha rifiutato l’operazione.'
    );
    expect(onRemoved).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Rimuovi dispositivo' })).toBeEnabled();
  });

  it('is not offered for a system integration, an entry made by hand, or without a device', async () => {
    fake.on('GET /voci/:id', () => errorReply(403, 'REQUIRES_INSTALLER', 'Richiede l’installatore.'));
    const view = mountRemove('sun.sun');
    await settled();
    expect(view.container).toBeEmptyDOMElement();
    view.unmount();

    const manual = mountRemove('light.manual');
    await settled();
    expect(manual.container).toBeEmptyDOMElement();
    manual.unmount();

    const none = mountRemove(null);
    await settled();
    expect(none.container).toBeEmptyDOMElement();
    expect(fake.callsTo('DELETE')).toHaveLength(0);
  });
});

describe('the entry of the details', () => {
  it('is disabled outside a launcher but does not break the details', async () => {
    fake.on('GET /voci/:id', () => ({ body: entryDto() }));
    seed();
    details(fixtureEntities([]));
    expect(await screen.findByRole('heading', { name: 'Per marca' })).toBeVisible();
  });
});
