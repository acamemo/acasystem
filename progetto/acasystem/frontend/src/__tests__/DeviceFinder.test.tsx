/**
 * «Aggiungi un dispositivo», the one screen of every way in (plan REP-20261027-003, T1-T6): the
 * lists filtered by the family of the widget, in the order «in rete», «già in Home Assistant»,
 * recommended brands, other brand; a brand starts its integration or connects the television that
 * was seen, always after the guide of the brand; the television sheets open it, by themselves
 * when there is no television. Runs on the fake device facade, with the real client, flow and
 * screen.
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
import type { LauncherLayout } from '@/@types/launcher';
import {
  DeviceFinder,
  type DeviceFinderProps,
} from '@/components/widgets/utilities/discover/DeviceFinder';
import { PageProvider } from '@/hooks/context/PageContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { AddWidgetSheet } from '@/templates/sheets';
import { DiscoveredAddFlow } from '@/templates/devices/DiscoveredAddFlow';
import { PAIRING_HINTS } from '@/templates/devices/deviceTexts';
import { RECOMMENDED_BRANDS } from '@/utils/devices/recommendedBrands';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { fakeConnection } from './UtilityHarness';
import {
  SAMSUNG_ENTITY,
  TV_SAMSUNG_ID,
  discoveredDto,
  errorReply,
  installFakeDevices,
  samsungPinForm,
  tvDto,
  type FakeDevices,
} from './devicesFakeServer';

const layout = {
  version: 1,
  categoryDefaultsVersion: 1,
  cover: { enabled: false },
  pages: [{ id: 'home', label: 'home', kind: 'widgets', placements: { tablet: {} } }],
} as unknown as LauncherLayout;

const BRAND_LABELS = [
  'Samsung',
  'LG',
  'Android TV / Google TV',
  'Sony',
  'Philips',
  'Panasonic',
  'Apple TV',
  'Roku',
];

// A Samsung and a lamp, both in Home Assistant and in no widget yet.
const deviceRegistry = [
  { id: 'tv1', name: 'Samsung salotto' },
  { id: 'lampada', name: 'Lampada studio' },
];
const entityRegistry = [
  { entity_id: SAMSUNG_ENTITY, device_id: 'tv1', platform: 'samsungtv' },
  { entity_id: 'light.studio', device_id: 'lampada', platform: 'hue' },
];

const entities = (): EntityMap =>
  fixtureEntities([
    fixtureEntity(SAMSUNG_ENTITY, 'off', { friendly_name: 'Samsung salotto' }),
    fixtureEntity('light.studio', 'off', { friendly_name: 'Lampada studio' }),
  ]);

const connection = () =>
  fakeConnection({
    'config/device_registry/list': () => deviceRegistry,
    'config/entity_registry/list': () => entityRegistry,
  }).conn;

let fake: FakeDevices;

const seed = () => {
  localStorage.clear();
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  localStorage.setItem(
    'tunet_pages_config',
    JSON.stringify({ header: [], pages: ['home'], home: [] })
  );
};

const onUse = vi.fn();
const onFlowDone = vi.fn();
const onExit = vi.fn();

const finder = (props: Partial<DeviceFinderProps> = {}, map: EntityMap = entities()) =>
  render(
    <PageProvider>
      <WidgetRuntimeProvider value={createFixtureRuntime({ entities: map, conn: connection() })}>
        <DeviceFinder
          family="tv"
          label="Aggiungi un dispositivo"
          Flow={DiscoveredAddFlow}
          onUse={onUse}
          onFlowDone={onFlowDone}
          onExit={onExit}
          {...props}
        />
      </WidgetRuntimeProvider>
    </PageProvider>
  );

const withFound = (...devices: ReturnType<typeof discoveredDto>[]) =>
  fake.on('GET /scoperti', () => ({ body: { devices } }));
const withTvs = (...tvs: ReturnType<typeof tvDto>[]) =>
  fake.on('GET /tv-in-rete', () => ({ body: { tvs } }));

const lgTv = () =>
  tvDto({
    id: 'lg00000000000001',
    brandKey: 'lg',
    brand: 'LG',
    name: 'LG OLED',
    handler: 'webostv',
    conferma: 'consenti',
  });
const appleTv = () =>
  tvDto({
    id: 'ap00000000000001',
    brandKey: 'apple',
    brand: 'Apple TV',
    name: 'Apple TV salotto',
    handler: 'apple_tv',
    conferma: 'pin',
  });
const hue = () =>
  discoveredDto({
    flowId: 'found-hue',
    handler: 'hue',
    name: 'Philips Hue',
    model: 'BSB002',
    family: 'light',
  });
const appleFound = () =>
  discoveredDto({
    flowId: 'found-apple',
    handler: 'apple_tv',
    name: 'Apple TV camera',
    model: 'AppleTV6,2',
    family: 'tv',
  });

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const GUIDE = 'Sono davanti alla TV, continua';

beforeEach(() => {
  seed();
  auth.headers.mockClear();
  onUse.mockClear();
  onFlowDone.mockClear();
  onExit.mockClear();
  fake = installFakeDevices();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the table of recommended brands', () => {
  it('holds the eight televisions in order, with one handler each', () => {
    const brands = RECOMMENDED_BRANDS.tv ?? [];
    expect(brands.map((brand) => brand.label)).toEqual(BRAND_LABELS);
    expect(brands.map((brand) => brand.handler)).toEqual([
      'samsungtv',
      'webostv',
      'androidtv_remote',
      'braviatv',
      'philips_js',
      'panasonic_viera',
      'apple_tv',
      'roku',
    ]);
    // Each of them has a guide to read before the television is asked anything, except Roku:
    // nothing happens on it, so the guide would only be a tap more.
    for (const { handler } of brands) {
      if (handler === 'roku') expect(PAIRING_HINTS[handler]?.guide).toBeUndefined();
      else expect(PAIRING_HINTS[handler]?.guide, handler).toBeDefined();
    }
  });
});

describe('the screen of a family', () => {
  it('shows only that family, in the order network, Home Assistant, brands, other brand', async () => {
    withFound(discoveredDto(), hue());
    withTvs(tvDto());
    finder();

    const found = await screen.findByRole('list', { name: 'Dispositivi trovati in rete' });
    expect(found).toHaveTextContent('Samsung 7 Series (49)');
    expect(found).not.toHaveTextContent('Philips Hue');
    expect(screen.getByRole('list', { name: 'Televisori trovati in rete' })).toHaveTextContent(
      'Televisore Samsung'
    );
    // Already in Home Assistant: the television, not the lamp.
    const ready = await screen.findByRole('group', { name: 'Televisori' });
    expect(ready).toHaveTextContent('Samsung salotto');
    expect(screen.queryByRole('group', { name: 'Luci' })).toBeNull();
    expect(screen.queryByText('Lampada studio')).toBeNull();
    expect(within(ready).getByText('Usa questo')).toBeInTheDocument();

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual([
      'Televisori in rete',
      'Trovati in rete',
      'Già in Home Assistant',
      'Marche consigliate',
      'Altra marca',
    ]);

    const brands = within(screen.getByRole('list', { name: 'Marche consigliate' })).getAllByRole(
      'listitem'
    );
    expect(brands).toHaveLength(BRAND_LABELS.length);
    brands.forEach((row, index) =>
      expect(row.textContent).toMatch(new RegExp(`^${BRAND_LABELS[index] ?? ''}`))
    );
  });

  it('says plainly that nothing is there and keeps the brands and «Altra marca»', async () => {
    finder({}, fixtureEntities([]));

    expect(
      await screen.findByText(
        'Non trovo televisori nuovi in rete né in Home Assistant. Scegli la marca qui sotto.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Televisori in rete' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Già in Home Assistant' })).toBeNull();
    expect(screen.getByRole('list', { name: 'Marche consigliate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Altra marca/ })).toBeEnabled();
  });

  it('says the service is off with «Ripara il servizio», and still offers the brands', async () => {
    fake.on('GET /scoperti', () => errorReply(503, 'SERVICE_NOT_ACTIVE', 'Servizio non attivo.'));
    finder({}, fixtureEntities([]));

    expect(
      await screen.findByText('Il servizio dei dispositivi non è attivo.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ripara il servizio' })).toBeEnabled();
    expect(screen.getByRole('list', { name: 'Marche consigliate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Altra marca/ })).toBeEnabled();
  });

  it('narrows to the integrations of the widget: the Apple TV takes Apple TV only', async () => {
    withFound(discoveredDto(), appleFound());
    withTvs(tvDto(), appleTv());
    finder({ handlers: ['apple_tv'] });

    const found = await screen.findByRole('list', { name: 'Dispositivi trovati in rete' });
    expect(found).toHaveTextContent('Apple TV camera');
    expect(found).not.toHaveTextContent('Samsung 7 Series');
    const tvs = screen.getByRole('list', { name: 'Televisori trovati in rete' });
    expect(tvs).toHaveTextContent('Apple TV salotto');
    expect(tvs).not.toHaveTextContent('Televisore Samsung');
    const brands = within(screen.getByRole('list', { name: 'Marche consigliate' })).getAllByRole(
      'listitem'
    );
    expect(brands).toHaveLength(1);
    expect(brands[0]).toHaveTextContent(/^Apple TV/);
  });

  it('«Usa questo» hands the device that Home Assistant already has to the caller', async () => {
    finder();

    fireEvent.click(await screen.findByRole('button', { name: /Samsung salotto/ }));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onUse.mock.calls[0]?.[0]).toMatchObject({
      primaryEntityId: SAMSUNG_ENTITY,
      family: 'tv',
    });
  });

  it('«Esci» is the caller’s', async () => {
    finder();
    fireEvent.click(await screen.findByRole('button', { name: 'Esci' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe('a recommended brand', () => {
  it('with a television of that brand in the network connects that one, after the guide', async () => {
    withTvs(lgTv());
    fake.on('POST /tv-in-rete/:id/collega', () => ({ status: 201, body: samsungPinForm() }));
    finder();

    const row = await screen.findByRole('button', { name: /^LG/ });
    expect(row).toHaveTextContent('Trovata in rete: LG OLED');
    fireEvent.click(row);

    // The guide first: nothing was asked of the server, not even its status.
    expect(await screen.findByRole('heading', { name: 'Prima di cominciare' })).toBeInTheDocument();
    expect(screen.getByText(/LG Connect Apps/)).toBeInTheDocument();
    expect(fake.callsTo('GET /stato')).toHaveLength(0);
    expect(fake.callsTo('POST /tv-in-rete')).toHaveLength(0);
    expect(fake.callsTo('POST /flussi')).toHaveLength(0);

    click(GUIDE);
    await waitFor(() =>
      expect(fake.callsTo('POST /tv-in-rete/lg00000000000001/collega')).toHaveLength(1)
    );
    expect(fake.callsTo('POST /flussi')).toHaveLength(0);
    expect(fake.callsTo('GET /catalogo')).toHaveLength(0);
  });

  it('with a device of that brand found by Home Assistant takes its flow over, after the guide', async () => {
    // After a removal Home Assistant finds the Samsung again by itself: its flow is open, so the
    // television is in «Trovati in rete», not in «Televisori in rete» (prova reale, 2026-10-28).
    withFound(discoveredDto({ name: 'UE50J6200', model: 'UE50J6200', source: 'ssdp' }));
    withTvs();
    fake.on('POST /scoperti/:id/aggiungi', () => ({ body: samsungPinForm() }));
    finder();

    const row = await screen.findByRole('button', { name: /^Samsung/ });
    await waitFor(() => expect(row).toHaveTextContent('Trovata in rete: UE50J6200'));
    fireEvent.click(row);

    expect(await screen.findByRole('heading', { name: 'Prima di cominciare' })).toBeInTheDocument();
    expect(fake.callsTo('POST /scoperti')).toHaveLength(0);

    click(GUIDE);
    await waitFor(() =>
      expect(fake.callsTo('POST /scoperti/found-samsung/aggiungi')).toHaveLength(1)
    );
    // No address to write: the integration is not started again from the brand.
    expect(fake.callsTo('POST /flussi')).toHaveLength(0);
    expect(fake.callsTo('POST /tv-in-rete')).toHaveLength(0);
  });

  it('without a television in the network starts the integration, after the guide', async () => {
    withTvs(tvDto());
    finder();

    fireEvent.click(await screen.findByRole('button', { name: /^Sony/ }));
    expect(await screen.findByRole('heading', { name: 'Prima di cominciare' })).toBeInTheDocument();
    expect(screen.getByText(/Controllo remoto/)).toBeInTheDocument();
    expect(fake.callsTo('GET /stato')).toHaveLength(0);
    expect(fake.callsTo('POST /flussi')).toHaveLength(0);
    expect(fake.callsTo('POST /tv-in-rete')).toHaveLength(0);

    click(GUIDE);
    await waitFor(() => expect(fake.callsTo('POST /flussi')).toHaveLength(1));
    // The integration starts at once: the catalogue is skipped.
    expect(fake.callsTo('POST /flussi')[0]?.body).toEqual({ handler: 'braviatv' });
    expect(fake.callsTo('GET /catalogo')).toHaveLength(0);
    expect(fake.callsTo('POST /tv-in-rete')).toHaveLength(0);
  });

  it('«Esci» of the guide goes back to the lists without asking the server anything', async () => {
    finder();
    fireEvent.click(await screen.findByRole('button', { name: /^Sony/ }));
    await screen.findByRole('heading', { name: 'Prima di cominciare' });
    // The guide has its own «Esci»: it closes the guide, not the screen.
    click('Esci');
    expect(await screen.findByRole('heading', { name: 'Marche consigliate' })).toBeInTheDocument();
    expect(onExit).not.toHaveBeenCalled();
    expect(fake.callsTo('POST /flussi')).toHaveLength(0);
    expect(fake.callsTo('GET /stato')).toHaveLength(0);
  });

  it('«Altra marca» opens the catalogue with no guide', async () => {
    finder();
    fireEvent.click(await screen.findByRole('button', { name: /Altra marca/ }));
    expect(await screen.findByLabelText('Cerca un’integrazione')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Prima di cominciare' })).toBeNull();
    await waitFor(() => expect(fake.callsTo('GET /catalogo').length).toBeGreaterThan(0));
  });

  it('«Collega» of a television in the network also reads the guide of its brand first', async () => {
    withTvs(tvDto());
    fake.on('POST /tv-in-rete/:id/collega', () => ({ status: 201, body: samsungPinForm() }));
    finder();

    fireEvent.click(await screen.findByRole('button', { name: 'Collega Televisore Samsung' }));
    expect(await screen.findByRole('heading', { name: 'Prima di cominciare' })).toBeInTheDocument();
    expect(screen.getByText(/Consenti/)).toBeInTheDocument();
    expect(fake.callsTo(`POST /tv-in-rete/${TV_SAMSUNG_ID}/collega`)).toHaveLength(0);
    click(GUIDE);
    await waitFor(() =>
      expect(fake.callsTo(`POST /tv-in-rete/${TV_SAMSUNG_ID}/collega`)).toHaveLength(1)
    );
  });
});

describe('the television sheets', () => {
  const wrap = (map: EntityMap) => (
    <PageProvider>
      <WidgetRuntimeProvider value={createFixtureRuntime({ entities: map, conn: connection() })}>
        <AddWidgetSheet open onClose={vi.fn()} pageId="home" onAdded={vi.fn()} />
      </WidgetRuntimeProvider>
    </PageProvider>
  );

  const chooseType = (type: string) =>
    fireEvent.click(document.querySelector<HTMLElement>(`[data-widget-type="${type}"]`)!);

  it('opens the screen at once when Home Assistant has no television (P-1)', async () => {
    render(wrap(fixtureEntities([fixtureEntity('light.sala', 'off', { friendly_name: 'Sala' })])));
    chooseType('androidtv');

    expect(await screen.findByRole('heading', { name: 'Marche consigliate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aggiungi un dispositivo/ })).toBeNull();
    expect(screen.queryByText('Nessun lettore multimediale trovato.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aggiungi il widget' })).toBeNull();

    // There is no list behind it: «Esci» goes back to the types.
    click('Esci');
    expect(await screen.findByRole('group', { name: 'Tipi di widget' })).toBeInTheDocument();
  });

  it('does the same for the Apple TV, narrowed to Apple TV', async () => {
    render(wrap(fixtureEntities([])));
    chooseType('appletv');

    const brands = await screen.findByRole('list', { name: 'Marche consigliate' });
    expect(within(brands).getAllByRole('listitem')).toHaveLength(1);
    expect(brands).toHaveTextContent('Apple TV');
    expect(brands).not.toHaveTextContent('Samsung');
  });

  it('«Usa questo» selects the television that Home Assistant already has', async () => {
    render(wrap(entities()));
    chooseType('androidtv');
    click(/Aggiungi un dispositivo/);

    fireEvent.click(await screen.findByRole('button', { name: /Samsung salotto/ }));
    const row = await screen.findByRole('button', { name: /Samsung salotto/ });
    expect(row).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Aggiungi il widget' })).toBeEnabled();
  });
});
