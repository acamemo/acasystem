/** Zigbee gateway widget (REP-20261029-003): ZHA and Zigbee2MQTT, card, details, demo house. */
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZigbeeWidget } from '@/components/widgets/utilities/zigbee/ZigbeeWidget';
import { ZigbeeDetails } from '@/components/widgets/utilities/zigbee/ZigbeeDetails';
import { resetZigbeeJoinWindows } from '@/components/widgets/utilities/zigbee/useZigbeeJoin';
import {
  countdownText,
  readZigbeeNetworks,
  type ZigbeeRegistries,
} from '@/components/widgets/utilities/zigbee/zigbeeData';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { DetailsSheet } from '@/templates/launcher/DetailsSheet';
import { ADD_WIDGET_TYPES } from '@/templates/sheets/catalog';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { createMockHaStore } from '@/utils/mockup/haStore';
import { createMockConnection } from '@/utils/mockup/mockConnection';
import { MOCK_DEVICES, ZIGBEE_COORDINATOR_ID } from '@/utils/mockup/mockData';
import { fakeConnection, renderWithRuntime } from './UtilityHarness';
const command = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@/api/commandApi', async (original) => ({ ...await original<typeof import('@/api/commandApi')>(), mutateHaConfiguration: command }));

const zhaDevices = [
  {
    id: 'coord',
    name: 'Zigbee Coordinator',
    manufacturer: 'ITead',
    model: 'SONOFF Zigbee 3.0 USB Dongle Plus V2',
    sw_version: '7.4.4.0 build 0',
    identifiers: [['zha', '00:12:4b:00:2a:5f:31:c7']],
  },
  {
    id: 'pulsante',
    name: 'Pulsante',
    name_by_user: 'Pulsante ingresso',
    identifiers: [['zha', 'a1']],
    via_device_id: 'coord',
  },
  { id: 'presa', name: 'Presa', identifiers: [['zha', 'a2']], via_device_id: 'coord' },
  { id: 'nuovo', name: 'Sensore nuovo', identifiers: [['zha', 'a3']], via_device_id: 'coord' },
  {
    id: 'gruppo',
    name: 'Luci cucina',
    model: 'Group',
    identifiers: [['zha', 'g1']],
    via_device_id: 'coord',
  },
  { id: 'hue', name: 'Luce Hue', identifiers: [['hue', 'x']] },
];

const zhaEntityRegistry = [
  { entity_id: 'sensor.pulsante_batteria', device_id: 'pulsante' },
  { entity_id: 'switch.presa', device_id: 'presa' },
  { entity_id: 'sensor.presa_potenza', device_id: 'presa' },
  { entity_id: 'sensor.nuovo_batteria', device_id: 'nuovo' },
  { entity_id: 'sensor.nuovo_lqi', device_id: 'nuovo', disabled_by: 'integration' },
];

const zhaEntities = fixtureEntities([
  fixtureEntity('sensor.pulsante_batteria', '12', { device_class: 'battery' }),
  fixtureEntity('switch.presa', 'unavailable'),
  fixtureEntity('sensor.presa_potenza', 'unavailable', { device_class: 'power' }),
  fixtureEntity('sensor.nuovo_batteria', '90', { device_class: 'battery' }),
]);

const zhaRegistries = (state: string | null = 'loaded'): ZigbeeRegistries => ({
  devices: zhaDevices,
  entities: zhaEntityRegistry,
  zhaEntryState: state,
});

const z2mDevices = [
  {
    id: 'bridge',
    name: 'Zigbee2MQTT Bridge',
    manufacturer: 'Zigbee2MQTT',
    model: 'Bridge',
    sw_version: '2.14.2',
    hw_version: 'zStack3x0 20240710',
    identifiers: [['mqtt', 'zigbee2mqtt_bridge_0x00124b002a5f31c7']],
  },
  {
    id: 'porta',
    name: 'Sensore porta',
    identifiers: [['mqtt', 'zigbee2mqtt_0x1']],
    via_device_id: 'bridge',
  },
  {
    id: 'gruppo',
    name: 'Gruppo',
    model: 'Group',
    identifiers: [['mqtt', 'g']],
    via_device_id: 'bridge',
  },
];

const z2mEntityRegistry = [
  { entity_id: 'binary_sensor.zigbee2mqtt_bridge_connection_state', device_id: 'bridge' },
  { entity_id: 'switch.zigbee2mqtt_bridge_permit_join', device_id: 'bridge' },
  { entity_id: 'button.zigbee2mqtt_bridge_restart', device_id: 'bridge' },
  { entity_id: 'binary_sensor.sensore_porta_battery_low', device_id: 'porta' },
];

const z2mEntities = (permit = 'off', connection = 'on') =>
  fixtureEntities([
    fixtureEntity('binary_sensor.zigbee2mqtt_bridge_connection_state', connection, {
      device_class: 'connectivity',
    }),
    fixtureEntity('switch.zigbee2mqtt_bridge_permit_join', permit),
    fixtureEntity('button.zigbee2mqtt_bridge_restart', 'unknown', { device_class: 'restart' }),
    fixtureEntity('binary_sensor.sensore_porta_battery_low', 'on', { device_class: 'battery' }),
  ]);

const haConnection = (
  devices: unknown[],
  entities: unknown[],
  zhaState: string | null,
  extra: Record<string, (message: Record<string, unknown>) => unknown> = {}
) =>
  fakeConnection({
    'config/device_registry/list': () => devices,
    'config/entity_registry/list': () => entities,
    'config_entries/get': () => (zhaState ? [{ domain: 'zha', state: zhaState }] : []),
    'auth/current_user': () => ({ is_admin: true }),
    ...extra,
  });

const props = (w = 2, h = 2) => ({
  id: 'zigbee_card_1',
  settingsKey: 'home::zigbee_card_1',
  settings: {},
  size: { w, h },
  editMode: false,
});

const detailProps = {
  id: 'zigbee_card_1',
  settingsKey: 'home::zigbee_card_1',
  settings: {},
  onClose: () => undefined,
};

afterEach(() => {
  act(resetZigbeeJoinWindows);
  vi.useRealTimers();
});

describe('readZigbeeNetworks', () => {
  it('reads a ZHA network: coordinator, devices without groups, offline and low batteries', () => {
    const [network] = readZigbeeNetworks(zhaRegistries(), zhaEntities);
    expect(network).toMatchObject({
      integration: 'zha',
      gatewayId: 'coord',
      model: 'SONOFF Zigbee 3.0 USB Dongle Plus V2',
      firmware: '7.4.4.0 build 0',
      online: true,
    });
    expect(network!.devices.map((device) => device.name)).toEqual([
      'Presa',
      'Pulsante ingresso',
      'Sensore nuovo',
    ]);
    expect(network!.devices.find((device) => device.id === 'presa')).toMatchObject({
      offline: true,
      batteryLow: false,
    });
    expect(network!.devices.find((device) => device.id === 'pulsante')).toMatchObject({
      offline: false,
      battery: 12,
      batteryLow: true,
    });
  });

  it('says the ZHA radio is down when its config entry is not loaded, and unknown without it', () => {
    expect(readZigbeeNetworks(zhaRegistries('setup_retry'), zhaEntities)[0]!.online).toBe(false);
    expect(readZigbeeNetworks(zhaRegistries(null), zhaEntities)[0]!.online).toBeNull();
  });

  it('reads a Zigbee2MQTT bridge: connectivity, permit join, restart and versions', () => {
    const [network] = readZigbeeNetworks(
      { devices: z2mDevices, entities: z2mEntityRegistry, zhaEntryState: null },
      z2mEntities()
    );
    expect(network).toMatchObject({
      integration: 'zigbee2mqtt',
      gatewayId: 'bridge',
      online: true,
      firmware: 'zStack3x0 20240710',
      software: '2.14.2',
      permitJoinId: 'switch.zigbee2mqtt_bridge_permit_join',
      restartId: 'button.zigbee2mqtt_bridge_restart',
    });
    expect(network!.devices).toEqual([
      { id: 'porta', name: 'Sensore porta', offline: false, battery: null, batteryLow: true },
    ]);
  });

  it('finds no network in a Home Assistant without Zigbee', () => {
    expect(
      readZigbeeNetworks({ devices: [zhaDevices[5]], entities: [], zhaEntryState: null }, {})
    ).toEqual([]);
  });

  it('writes the time left as minutes and seconds', () => {
    expect(countdownText(254_000)).toBe('4:14');
    expect(countdownText(7_200)).toBe('0:08');
  });
});

describe('ZigbeeWidget', () => {
  it('is in the add sheet under «Dispositivi» and matches its ids', () => {
    const item = ADD_WIDGET_TYPES.find((type) => type.type === 'zigbee');
    expect(item).toMatchObject({ group: 'devices', flow: 'simple', icon: 'server' });
    expect(findWidgetDefinition('zigbee_card_1')?.Widget).toBe(ZigbeeWidget);
  });

  it('shows the state, the number of devices and the problems', async () => {
    const { conn } = haConnection(zhaDevices, zhaEntityRegistry, 'loaded');
    renderWithRuntime(<ZigbeeWidget {...props()} />, { conn, entities: zhaEntities });
    expect(await screen.findByText('Attivo')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('1 non risponde')).toBeTruthy();
    expect(screen.getByText('1 batteria scarica')).toBeTruthy();
  });

  it('sums everything up on one line when one cell high', async () => {
    const { conn } = haConnection(zhaDevices, zhaEntityRegistry, 'loaded');
    renderWithRuntime(<ZigbeeWidget {...props(2, 1)} />, { conn, entities: zhaEntities });
    expect(
      await screen.findByText('3 dispositivi · 1 non risponde · 1 batteria scarica')
    ).toBeTruthy();
  });

  it('says when the gateway does not answer and hides the device problems', async () => {
    const { conn } = haConnection(zhaDevices, zhaEntityRegistry, 'setup_retry');
    renderWithRuntime(<ZigbeeWidget {...props()} />, { conn, entities: zhaEntities });
    expect(await screen.findByText('Non raggiungibile')).toBeTruthy();
    expect(screen.queryByText('1 non risponde')).toBeNull();
  });

  it('says there is no gateway in a Home Assistant without Zigbee', async () => {
    const { conn } = haConnection([], [], null);
    renderWithRuntime(<ZigbeeWidget {...props()} />, { conn });
    expect(await screen.findByText('Nessun gateway Zigbee in Home Assistant')).toBeTruthy();
  });

  it('opens the details on tap', async () => {
    const openDetails = vi.fn();
    const { conn } = haConnection(zhaDevices, zhaEntityRegistry, 'loaded');
    renderWithRuntime(<ZigbeeWidget {...props()} />, { conn, entities: zhaEntities, openDetails });
    fireEvent.click(await screen.findByRole('button', { name: /apri i dettagli del gateway/ }));
    expect(openDetails).toHaveBeenCalledWith('zigbee_card_1');
  });
});

describe('ZigbeeDetails', () => {
  it('opens ZHA joining for 254 seconds, counts down and closes it', async () => {
    const callService = vi.fn(async () => undefined);
    const { conn } = haConnection(zhaDevices, zhaEntityRegistry, 'loaded');
    renderWithRuntime(<ZigbeeDetails {...detailProps} />, {
      conn,
      entities: zhaEntities,
      callService,
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi un dispositivo Zigbee' }));
    expect(callService).toHaveBeenCalledWith('zha', 'permit', { duration: 254 });
    expect(await screen.findByText(/Aggiunta aperta ancora per 4:1\d/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi l’aggiunta' }));
    expect(callService).toHaveBeenLastCalledWith('zha', 'permit', { duration: 0 });
    expect(
      await screen.findByRole('button', { name: 'Aggiungi un dispositivo Zigbee' })
    ).toBeTruthy();
  });

  it('says so when Home Assistant refuses to open joining', async () => {
    const callService = vi.fn(async () => Promise.reject({ code: 'unauthorized' }));
    const { conn } = haConnection(zhaDevices, zhaEntityRegistry, 'loaded');
    renderWithRuntime(<ZigbeeDetails {...detailProps} />, {
      conn,
      entities: zhaEntities,
      callService,
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi un dispositivo Zigbee' }));
    expect(
      await screen.findByText(
        'Home Assistant non permette a questo account di aggiungere dispositivi.'
      )
    ).toBeTruthy();
  });

  it('lists the devices that do not answer and the low batteries, and the gateway', async () => {
    const { conn } = haConnection(zhaDevices, zhaEntityRegistry, 'loaded');
    renderWithRuntime(<ZigbeeDetails {...detailProps} />, { conn, entities: zhaEntities });
    expect(await screen.findByRole('heading', { name: 'Non rispondono' })).toBeTruthy();
    expect(screen.getByText('Presa')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Batterie scariche' })).toBeTruthy();
    expect(screen.getByText('12%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Informazioni tecniche' }));
    expect(screen.getByText('7.4.4.0 build 0')).toBeTruthy();
    expect(screen.getByText('ZHA')).toBeTruthy();
  });

  it('opens in the details sheet without the header of a single device', async () => {
    const { conn } = haConnection(zhaDevices, zhaEntityRegistry, 'loaded');
    renderWithRuntime(
      <DetailsSheet
        target={{
          widgetId: 'zigbee_card_1',
          pageId: 'home',
          settingsKey: 'home::zigbee_card_1',
          settings: { categoryWidgetType: 'zigbee' },
          title: 'Zigbee',
        }}
        onClose={() => undefined}
      />,
      { conn, entities: zhaEntities }
    );
    expect(
      await screen.findByRole('button', { name: 'Aggiungi un dispositivo Zigbee' })
    ).toBeTruthy();
    expect(screen.queryByText('Dispositivo non disponibile')).toBeNull();
  });

  it('requests a ZHA network copy through the tracked path and reports HA acceptance', async () => {
    const { conn, sendMessagePromise } = haConnection(zhaDevices, zhaEntityRegistry, 'loaded', {
      'zha/network/backups/create': () => ({ backup: {}, is_complete: true }),
    });
    renderWithRuntime(<ZigbeeDetails {...detailProps} />, { conn, entities: zhaEntities });
    fireEvent.click(await screen.findByRole('button', { name: 'Manutenzione' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salva una copia della rete' }));
    expect(await screen.findByText('Richiesta di copia accettata da Home Assistant.')).toBeTruthy();
    expect(screen.queryByText(/Copia salvata alle/)).toBeNull();
    expect(command).toHaveBeenCalledWith('zigbee.backup');
    expect(sendMessagePromise).not.toHaveBeenCalledWith({ type: 'zha/network/backups/create' });
  });

  it('opens Zigbee2MQTT joining with its switch and restarts the bridge', async () => {
    const callService = vi.fn(async () => undefined);
    const { conn } = haConnection(z2mDevices, z2mEntityRegistry, null);
    const view = renderWithRuntime(<ZigbeeDetails {...detailProps} />, {
      conn,
      entities: z2mEntities(),
      callService,
    });
    expect(within(await screen.findByRole('region', { name: 'Rete Zigbee' })).getByText('Zigbee2MQTT')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Informazioni tecniche' }));
    expect(screen.getByText('2.14.2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi un dispositivo Zigbee' }));
    expect(callService).toHaveBeenCalledWith('switch', 'turn_on', {
      entity_id: 'switch.zigbee2mqtt_bridge_permit_join',
    });
    view.update({ entities: z2mEntities('on') });
    expect(await screen.findByText(/Aggiunta aperta ancora per/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Manutenzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Riavvia Zigbee2MQTT' }));
    expect(callService).toHaveBeenCalledWith('button', 'press', {
      entity_id: 'button.zigbee2mqtt_bridge_restart',
    });
    expect(await screen.findByText('Riavvio accettato da Home Assistant. Attendi lo stato del gateway.')).toBeTruthy();
  });

  it('shows Zigbee2MQTT joining opened elsewhere, without a countdown', async () => {
    const { conn } = haConnection(z2mDevices, z2mEntityRegistry, null);
    renderWithRuntime(<ZigbeeDetails {...detailProps} />, { conn, entities: z2mEntities('on') });
    expect(
      await screen.findByText('Aggiunta aperta: metti il dispositivo in abbinamento.')
    ).toBeTruthy();
  });
});

describe('Zigbee in the demo house', () => {
  it('has a ZHA network with a low battery and a device that joins after zha.permit', async () => {
    vi.useFakeTimers();
    const store = createMockHaStore({ settleMs: 0 });
    const conn = createMockConnection(store);
    const entries = (await conn.sendMessagePromise({
      type: 'config_entries/get',
      domain: 'zha',
    })) as { state: string }[];
    const read = () =>
      readZigbeeNetworks(
        { ...store.registries(), zhaEntryState: entries[0]!.state },
        store.getEntities()
      )[0]!;
    expect(read()).toMatchObject({ integration: 'zha', online: true });
    const expectedIds = MOCK_DEVICES.filter((device) => device.platform === 'zha' &&
      device.id !== ZIGBEE_COORDINATOR_ID).map((device) => device.id).sort();
    expect(read().devices.map((device) => device.id).sort()).toEqual(expectedIds);
    expect(
      read()
        .devices.filter((device) => device.batteryLow)
        .map((d) => d.name)
    ).toEqual(['Pulsante ingresso']);
    await store.callService('zha', 'permit', { duration: 254 });
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(read().devices.map((device) => device.name)).toContain('Sensore finestra');
    expect(read().devices).toHaveLength(expectedIds.length + 1);
    store.dispose();
  });

  it('shows the joined device in the details while joining is open', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const store = createMockHaStore({ settleMs: 0 });
    const conn = createMockConnection(store);
    const callService = (domain: string, service: string, data?: Record<string, unknown>) =>
      store.callService(domain, service, data);
    const view = renderWithRuntime(<ZigbeeDetails {...detailProps} />, {
      conn,
      entities: store.getEntities(),
      callService,
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi un dispositivo Zigbee' }));
    await screen.findByText(/Aggiunta aperta ancora per/);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    view.update({ entities: store.getEntities() });
    await waitFor(() => expect(screen.getByText('Sensore finestra')).toBeTruthy());
    expect(screen.getByText('Comparso in Home Assistant')).toBeTruthy();
    store.dispose();
  });
});
