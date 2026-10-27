/**
 * «Televisori in rete» (F5): the section of the details of «Rileva dispositivi» that lists the
 * televisions Home Assistant saw, and the one-tap connection: «Collega» starts the flow on the
 * server, which fills the address, and the person only writes the code the television shows or
 * accepts on it. Runs on the fake device facade, with the real client, flow and details.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import { DiscoveredAddFlow } from '@/templates/devices/DiscoveredAddFlow';
import { cleanPin, pinSpecFor } from '@/utils/devices/pinSpec';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { fakeConnection } from './UtilityHarness';
import {
  SAMSUNG_ENTITY,
  TV_SAMSUNG_ID,
  errorReply,
  installFakeDevices,
  pairingForm,
  samsungCreated,
  samsungEntry,
  samsungPinForm,
  tvDto,
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

const deviceRegistry = [
  { id: 'lampada', name: 'Lampada studio' },
  { id: 'prese', name: 'Presa cantina' },
];
const entityRegistry = [
  { entity_id: 'light.studio', device_id: 'lampada', platform: 'hue' },
  { entity_id: 'switch.cantina', device_id: 'prese', platform: 'tplink' },
];

const entities = (lampState = 'off'): EntityMap =>
  fixtureEntities([
    fixtureEntity('light.studio', lampState, { friendly_name: 'Lampada studio' }),
    fixtureEntity('switch.cantina', 'off', {
      friendly_name: 'Presa cantina',
      device_class: 'outlet',
    }),
    fixtureEntity(SAMSUNG_ENTITY, 'off', { friendly_name: 'Samsung J' }),
  ]);

let fake: FakeDevices;

const onClose = vi.fn();
const openAddWidget = vi.fn<(pageId: string, selection: AddWidgetSelection) => void>();

const details = (map: EntityMap = entities()) =>
  render(
    <PageProvider>
      <WidgetRuntimeProvider
        value={createFixtureRuntime({
          entities: map,
          conn: fakeConnection({
            'config/device_registry/list': () => deviceRegistry,
            'config/entity_registry/list': () => entityRegistry,
          }).conn,
        })}
      >
        <LauncherProvider value={launcher}>
          <AddWidgetRequestProvider value={openAddWidget}>
            <DiscoveredFlowProvider value={DiscoveredAddFlow}>
              <DiscoverDetails
                id="rileva_card_1"
                settingsKey="home::rileva_card_1"
                settings={{}}
                onClose={onClose}
              />
            </DiscoveredFlowProvider>
          </AddWidgetRequestProvider>
        </LauncherProvider>
      </WidgetRuntimeProvider>
    </PageProvider>
  );

const withTvs = (...tvs: ReturnType<typeof tvDto>[]) =>
  fake.on('GET /tv-in-rete', () => ({ body: { tvs } }));

const tap = async (name = 'Collega Televisore Samsung') =>
  fireEvent.click(await screen.findByRole('button', { name }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  localStorage.setItem(
    'tunet_pages_config',
    JSON.stringify({ header: [], pages: ['home'], home: ['rileva_card_1'] })
  );
  auth.headers.mockClear();
  onClose.mockClear();
  openAddWidget.mockClear();
  fake = installFakeDevices();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the code of a television', () => {
  it('knows the code field of the integrations and cleans what is typed', () => {
    const form = samsungPinForm();
    const spec = pinSpecFor(form);
    expect(spec).toEqual({ fieldName: 'pin', length: 4, hex: false });
    expect(cleanPin('4a3-2 1x9', spec ?? { fieldName: 'pin', length: 4, hex: false })).toBe('4321');

    const android = pinSpecFor({ ...form, handler: 'androidtv_remote' });
    expect(android).toEqual({ fieldName: 'pin', length: 6, hex: true });
    expect(cleanPin('a1b2c3zz', android ?? { fieldName: 'pin', length: 6, hex: true })).toBe(
      'A1B2C3'
    );

    // A host field is not a code; an unknown integration keeps any characters.
    expect(pinSpecFor({ ...form, fields: [{ ...(form.fields[0] ?? { name: 'host' }), name: 'host' }] }))
      .toBeNull();
    const unknown = pinSpecFor({ ...form, handler: 'acme' });
    expect(unknown).toEqual({ fieldName: 'pin', length: null, hex: false });
    expect(cleanPin(' AB-12 ', unknown ?? { fieldName: 'pin', length: null, hex: false })).toBe(
      'AB-12'
    );
  });
});

describe('«Televisori in rete»: the section', () => {
  it('lists the televisions first, with a big «Collega», and says why one cannot be connected', async () => {
    withTvs(
      tvDto(),
      tvDto({
        id: 'fedcba9876543210',
        brandKey: 'amazon',
        brand: 'Fire TV',
        name: 'Fire TV Stick',
        model: 'AFTMM',
        handler: null,
        conferma: 'nessuno',
        collegabile: false,
        motivo: 'Il Fire TV si collega solo dopo aver attivato il debug ADB.',
      })
    );
    details();

    const list = await screen.findByRole('list', { name: 'Televisori trovati in rete' });
    expect(list).toHaveTextContent('Televisore Samsung');
    expect(list).toHaveTextContent('Fire TV Stick');
    expect(list).toHaveTextContent('Fire TV · AFTMM');
    expect(screen.getByRole('button', { name: 'Collega Televisore Samsung' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Collega Fire TV/ })).toBeNull();
    expect(screen.getByText(/debug ADB/)).toBeInTheDocument();

    const first = screen.getByRole('heading', { name: 'Televisori in rete' });
    const found = screen.getByRole('heading', { name: 'Trovati in rete' });
    expect(first.compareDocumentPosition(found) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // No address anywhere on screen.
    expect(document.body.textContent).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
  });

  it('shows no section when there is no television, or when the service fails', async () => {
    details();
    expect(await screen.findByText('Nessun dispositivo nuovo trovato in rete.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Televisori in rete' })).toBeNull();
    cleanup();

    fake.on('GET /tv-in-rete', () => errorReply(503, 'SERVICE_NOT_ACTIVE', 'Servizio non attivo.'));
    details();
    expect(await screen.findByText('Nessun dispositivo nuovo trovato in rete.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Televisori in rete' })).toBeNull();
  });
});

describe('«Collega»: one tap', () => {
  const server = () => {
    withTvs(tvDto());
    fake.on('POST /tv-in-rete/:id/collega', () => ({ status: 201, body: samsungPinForm() }));
    fake.on('GET /voci/:id', () => ({ body: samsungEntry() }));
  };

  it('goes straight to the code: no catalogue, no address, the field has the focus', async () => {
    server();
    details();

    await tap();
    expect(
      await screen.findByText('Guarda la TV: compare un codice. Scrivilo qui.')
    ).toBeInTheDocument();
    const field = await screen.findByLabelText('Codice mostrato sul televisore');
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute('inputmode', 'numeric');

    expect(fake.callsTo(`POST /tv-in-rete/${TV_SAMSUNG_ID}/collega`)).toHaveLength(1);
    expect(fake.callsTo('GET /catalogo')).toHaveLength(0);
    expect(fake.callsTo('POST /flussi')).toHaveLength(0);
    expect(fake.callsTo('POST /scoperti')).toHaveLength(0);
    expect(screen.queryByLabelText(/Indirizzo/)).toBeNull();
    // Four digits send by themselves: there is no «Avanti» to press.
    expect(screen.queryByRole('button', { name: 'Avanti' })).toBeNull();
  });

  it('sends the code at the fourth digit, once, and opens «Aggiungi un widget» on the TV', async () => {
    server();
    fake.on('POST /flussi/:id', () => ({ body: samsungCreated() }));
    details();

    await tap();
    const field = await screen.findByLabelText('Codice mostrato sul televisore');
    fireEvent.change(field, { target: { value: '43' } });
    expect(fake.callsTo('POST /flussi/flow-tv')).toHaveLength(0);
    fireEvent.change(field, { target: { value: '4321' } });
    await waitFor(() => expect(fake.callsTo('POST /flussi/flow-tv')).toHaveLength(1));
    expect(fake.callsTo('POST /flussi/flow-tv')[0]?.body).toEqual({ input: { pin: '4321' } });

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
  });

  it('says a wrong code in Italian, empties the field and takes the next try', async () => {
    server();
    let tries = 0;
    fake.on('POST /flussi/:id', () => {
      tries += 1;
      return {
        body:
          tries === 1
            ? samsungPinForm([
                {
                  field: null,
                  code: 'invalid_pin',
                  message: 'Il codice non è quello mostrato sul televisore. Riprova.',
                },
              ])
            : samsungCreated(),
      };
    });
    details();

    await tap();
    const field = await screen.findByLabelText('Codice mostrato sul televisore');
    fireEvent.change(field, { target: { value: '0000' } });
    expect(
      await screen.findByText('Il codice non è quello mostrato sul televisore. Riprova.')
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Codice mostrato sul televisore')).toHaveValue(''));

    fireEvent.change(screen.getByLabelText('Codice mostrato sul televisore'), {
      target: { value: '4321' },
    });
    await waitFor(() => expect(fake.callsTo('POST /flussi/flow-tv')).toHaveLength(2));
    expect(fake.callsTo('POST /flussi/flow-tv').map((call) => call.body)).toEqual([
      { input: { pin: '0000' } },
      { input: { pin: '4321' } },
    ]);
    expect(await screen.findByRole('button', { name: 'Salta' })).toBeInTheDocument();
  });

  it('takes six hexadecimal characters for an Android TV, in capitals', async () => {
    withTvs(tvDto({ brandKey: 'hisense', brand: 'Hisense', name: 'Hisense', handler: 'androidtv_remote', conferma: 'codice' }));
    fake.on('POST /tv-in-rete/:id/collega', () => ({
      status: 201,
      body: { ...samsungPinForm(), handler: 'androidtv_remote', stepId: 'pair' },
    }));
    fake.on('POST /flussi/:id', () => ({ body: samsungCreated() }));
    details();

    await tap('Collega Hisense');
    const field = await screen.findByLabelText('Codice mostrato sul televisore');
    expect(field).toHaveAttribute('inputmode', 'text');
    fireEvent.change(field, { target: { value: 'a1b2c' } });
    expect(fake.callsTo('POST /flussi/flow-tv')).toHaveLength(0);
    fireEvent.change(field, { target: { value: 'a1b2c3' } });
    await waitFor(() => expect(fake.callsTo('POST /flussi/flow-tv')).toHaveLength(1));
    expect(fake.callsTo('POST /flussi/flow-tv')[0]?.body).toEqual({ input: { pin: 'A1B2C3' } });
  });

  it('asks to accept on the TV and sends the empty answer by itself for a step with no fields', async () => {
    withTvs(tvDto({ brandKey: 'lg', brand: 'LG', name: 'LG OLED', handler: 'webostv', conferma: 'consenti' }));
    fake.on('POST /tv-in-rete/:id/collega', () => ({ status: 201, body: pairingForm() }));
    fake.on('POST /flussi/:id', () => ({ body: samsungCreated() }));
    details();

    await tap('Collega LG OLED');
    await waitFor(() => expect(fake.callsTo('POST /flussi/flow1')).toHaveLength(1));
    expect(fake.callsTo('POST /flussi/flow1')[0]?.body).toEqual({ input: {} });
    // Sent once: no second answer by itself.
    expect(fake.callsTo('POST /flussi/flow1')).toHaveLength(1);
    expect(await screen.findByRole('button', { name: 'Salta' })).toBeInTheDocument();
  });

  it('shows the refusal of the server for a television that is gone, and goes back on «Esci»', async () => {
    withTvs(tvDto());
    fake.on('POST /tv-in-rete/:id/collega', () =>
      errorReply(404, 'TV_NOT_FOUND', 'Questo televisore non si trova più in rete. Aggiorna l’elenco.')
    );
    details();

    await tap();
    expect(
      await screen.findByText('Questo televisore non si trova più in rete. Aggiorna l’elenco.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    expect(await screen.findByRole('heading', { name: 'Televisori in rete' })).toBeInTheDocument();
  });
});

describe('«Pronti da aggiungere»: devices that do not answer (ISSUE-120)', () => {
  it('puts them last, tagged «Non raggiungibile», and keeps them addable', async () => {
    details(entities('unavailable'));

    const ready = await screen.findByRole('group', { name: 'Prese' });
    expect(ready).toHaveTextContent('Presa cantina');
    expect(ready).not.toHaveTextContent('Non raggiungibile');

    const silent = await screen.findByRole('group', { name: 'Non raggiungibili' });
    expect(silent).toHaveTextContent('Lampada studio');
    expect(silent).toHaveTextContent('Non raggiungibile ·');
    // The silent group comes after the reachable ones, and the lamp is not in its family group.
    expect(screen.queryByRole('group', { name: 'Luci' })).toBeNull();
    expect(ready.compareDocumentPosition(silent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(within(silent).getByRole('button', { name: /Lampada studio/ }));
    expect(openAddWidget).toHaveBeenCalledTimes(1);
    expect(openAddWidget.mock.calls[0]?.[1]).toMatchObject({ entityIds: ['light.studio'] });
  });

  it('does not tag a device that answers', async () => {
    details();
    const lights = await screen.findByRole('group', { name: 'Luci' });
    expect(lights).toHaveTextContent('Lampada studio');
    expect(screen.queryByRole('group', { name: 'Non raggiungibili' })).toBeNull();
  });
});
