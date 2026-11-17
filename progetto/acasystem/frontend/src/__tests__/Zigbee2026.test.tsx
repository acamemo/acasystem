import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { setBackendOverride } from '@/api/backendClient';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { useZigbeeNetwork } from '@/components/widgets/utilities/zigbee/useZigbeeNetwork';
import { useZigbeeJoin, resetZigbeeJoinWindows } from '@/components/widgets/utilities/zigbee/useZigbeeJoin';
import { ZigbeeDetails } from '@/components/widgets/utilities/zigbee/ZigbeeDetails';
import { ZigbeeWidget } from '@/components/widgets/utilities/zigbee/ZigbeeWidget';
import { readZigbeeNetworks, type ZigbeeNetwork } from '@/components/widgets/utilities/zigbee/zigbeeData';
import { ZIGBEE_COMMAND_TIMEOUT_MS, ZIGBEE_READ_TIMEOUT_MS } from '@/components/widgets/utilities/zigbee/zigbeeSession';
import { fakeConnection, renderWithRuntime } from './UtilityHarness';
const command = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@/api/commandApi', async (original) => ({ ...await original<typeof import('@/api/commandApi')>(), mutateHaConfiguration: command }));

const devices = [
  { id: 'coord', name: 'Zigbee Coordinator', identifiers: [['zha', '0']], model: 'Radio' },
  { id: 'one', name: 'Sensore', identifiers: [['zha', '1']], via_device_id: 'coord' },
];
const entries = [{ entity_id: 'sensor.one', device_id: 'one' }];
const entities = fixtureEntities([fixtureEntity('sensor.one', '10', { device_class: 'battery', unit_of_measurement: '%' })]);
const detailProps = { id: 'zigbee_card_review', settingsKey: 'home::zigbee_card_review', settings: {}, onClose: () => {} };
const widgetProps = { ...detailProps, size: { w: 1, h: 1 }, editMode: false };
const network: ZigbeeNetwork = { integration: 'zha', gatewayId: 'coord', manufacturer: null, model: 'Radio',
  firmware: null, software: null, online: true, devices: [], permitJoinId: null, restartId: null };
const registries = { devices, entities: entries, zhaEntryState: 'loaded' };
function connection(admin: boolean | null = true) {
  return fakeConnection({
    'config/device_registry/list': () => devices,
    'config/entity_registry/list': () => entries,
    'config_entries/get': () => [{ domain: 'zha', state: 'loaded' }],
    'auth/current_user': () => admin === null ? {} : { is_admin: admin },
  });
}
function NetworkProbe() {
  const state = useZigbeeNetwork();
  return <><span data-testid="status">{state.status}</span>
    {state.status === 'ready' && <span data-testid="network">{state.network.gatewayId}:{String(state.stale)}:{state.network.devices.length}</span>}
    <button onClick={state.retry}>refresh</button></>;
}
function JoinProbe({ name = 'one', target = network }: { name?: string; target?: ZigbeeNetwork | null }) {
  const join = useZigbeeJoin(target);
  return <div><button disabled={!join.canStart} onClick={join.start}>start {name}</button>
    <button disabled={!join.canStop} onClick={join.stop}>stop {name}</button>
    <span data-testid={`join-${name}`}>{`${join.open}:${join.pending}:${join.error}:${join.newDevices.length}`}</span></div>;
}
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }); };
afterEach(() => { act(resetZigbeeJoinWindows); setBackendOverride(null); vi.useRealTimers(); command.mockReset().mockResolvedValue(undefined); });

describe('Zigbee2026 model evidence', () => {
  it.each(['unknown', '', 'unavailable'])('does not call %s readings healthy', (value) => {
    const result = readZigbeeNetworks(registries, fixtureEntities([fixtureEntity('sensor.one', value)]))[0]!;
    expect(result.devices[0]!.offline).toBe(value === 'unavailable');
    if (value !== 'unavailable') expect(result.devices[0]!.availabilityUnknown).toBe(true);
  });
  it('a missing registered reading is unknown rather than offline or healthy', () => {
    expect(readZigbeeNetworks(registries, {})[0]!.devices[0]).toMatchObject({ offline: false, availabilityUnknown: true });
  });
  it('does not create a gateway or member from a device with no stable id', () => {
    expect(readZigbeeNetworks({ devices: [{ identifiers: [['zha', '0']] }], entities: [], zhaEntryState: 'loaded' }, {})).toEqual([]);
  });
  it.each([[-1, '%'], [101, '%'], [2.7, 'V'], ['NaN', '%']])('rejects nonpercentage battery %s %s', (value, unit) => {
    const state = fixtureEntities([fixtureEntity('sensor.one', String(value), { device_class: 'battery', unit_of_measurement: unit })]);
    expect(readZigbeeNetworks(registries, state)[0]!.devices[0]!.battery).toBeNull();
  });
  it('excludes groups, disabled devices and other integrations', () => {
    const input = { ...registries, devices: [...devices,
      { id: 'group', identifiers: [['zha', '2']], model: 'Group' },
      { id: 'disabled', identifiers: [['zha', '3']], disabled_by: 'user' },
      { id: 'other', identifiers: [['hue', '4']] }] };
    expect(readZigbeeNetworks(input, entities)[0]!.devices.map((device) => device.id)).toEqual(['one']);
  });
  const bridge = { id: 'bridge', name: 'Bridge', identifiers: [['mqtt', 'zigbee2mqtt_bridge_0x123']], manufacturer: 'Zigbee2MQTT', model: 'Bridge' };
  it('does not select an arbitrary bridge switch as permit join', () => {
    const [result] = readZigbeeNetworks({ devices: [bridge], entities: [{ entity_id: 'switch.led', device_id: 'bridge' }], zhaEntryState: null }, {});
    expect(result!.permitJoinId).toBeNull();
  });
  it('recognizes an exactly identified renamed MQTT permit control', () => {
    const [result] = readZigbeeNetworks({ devices: [bridge], entities: [{ entity_id: 'switch.rinomina', device_id: 'bridge', unique_id: 'bridge_0x123_permit_join_zigbee2mqtt' }], zhaEntryState: null }, {});
    expect(result!.permitJoinId).toBe('switch.rinomina');
  });
  it('does not take a similarly named but differently identified bridge switch', () => {
    const [result] = readZigbeeNetworks({ devices: [bridge], entities: [{ entity_id: 'switch.foo_permit_join', device_id: 'bridge', unique_id: 'bridge_0x999_permit_join_zigbee2mqtt' }], zhaEntryState: null }, {});
    expect(result!.permitJoinId).toBeNull();
  });
});

describe('Zigbee2026 reads and lifecycle', () => {
  it('reads only and never sends permit, backup or restart on mount', async () => {
    const callService = vi.fn(); const { conn } = connection();
    renderWithRuntime(<ZigbeeDetails {...detailProps} />, { conn, entities, callService });
    await screen.findByText('Rete Zigbee');
    expect(callService).not.toHaveBeenCalled(); expect(command).not.toHaveBeenCalled();
  });
  it('does not read or write while hidden', async () => {
    const { conn, sendMessagePromise } = connection();
    renderWithRuntime(<PageVisibilityContext.Provider value={false}><ZigbeeDetails {...detailProps} /></PageVisibilityContext.Provider>, { conn, entities });
    await flush(); expect(sendMessagePromise).not.toHaveBeenCalled(); expect(command).not.toHaveBeenCalled();
  });
  it('shows read failure separately from an empty network', async () => {
    const { conn } = fakeConnection({});
    renderWithRuntime(<NetworkProbe />, { conn });
    expect(await screen.findByText('error')).toBeTruthy(); expect(screen.queryByText('none')).toBeNull();
  });
  it('bounds a hanging initial registry read', async () => {
    vi.useFakeTimers(); const { conn } = fakeConnection({
      'config/device_registry/list': () => new Promise(() => {}),
      'config/entity_registry/list': () => entries, 'config_entries/get': () => [], 'auth/current_user': () => ({}),
    });
    renderWithRuntime(<NetworkProbe />, { conn }); await flush();
    await act(async () => { vi.advanceTimersByTime(ZIGBEE_READ_TIMEOUT_MS + 1); });
    expect(screen.getByTestId('status').textContent).toBe('error');
  });
  it('keeps successful data as previous data after a refresh error', async () => {
    const { conn, sendMessagePromise } = connection();
    renderWithRuntime(<NetworkProbe />, { conn, entities });
    await screen.findByText('coord:false:1');
    sendMessagePromise.mockRejectedValue(new Error('offline')); fireEvent.click(screen.getByText('refresh'));
    expect(await screen.findByText('coord:true:1')).toBeTruthy();
  });
  it('invalidates an old connection immediately and ignores its late answer', async () => {
    let resolve!: (value: unknown) => void;
    const old = fakeConnection({ 'config/device_registry/list': () => new Promise((done) => { resolve = done; }),
      'config/entity_registry/list': () => entries, 'config_entries/get': () => [], 'auth/current_user': () => ({}) });
    const fresh = fakeConnection({ 'config/device_registry/list': () => [], 'config/entity_registry/list': () => [],
      'config_entries/get': () => [], 'auth/current_user': () => ({}) });
    const view = renderWithRuntime(<NetworkProbe />, { conn: old.conn, entities }); await flush();
    view.update({ conn: fresh.conn }); await screen.findByText('none');
    await act(async () => resolve(devices)); expect(screen.getByTestId('status').textContent).toBe('none');
  });
  it('connection A -> B -> A starts a fresh membership read', async () => {
    const a = connection(); const b = connection();
    const view = renderWithRuntime(<NetworkProbe />, { conn: a.conn, entities }); await screen.findByText('coord:false:1');
    view.update({ conn: b.conn }); await flush();
    a.sendMessagePromise.mockImplementation(async (message) => message.type === 'config/device_registry/list' ? [] : []);
    view.update({ conn: a.conn }); await screen.findByText('none');
  });
  it('backend A -> B -> A drops a retained source snapshot', async () => {
    const a = async () => ({ status: 200, body: {} }); const b = async () => ({ status: 200, body: {} });
    setBackendOverride(a); const fixture = connection();
    const view = renderWithRuntime(<NetworkProbe />, { conn: fixture.conn, entities }); await screen.findByText('coord:false:1');
    setBackendOverride(b); view.update({}); await flush();
    fixture.sendMessagePromise.mockResolvedValue([]);
    setBackendOverride(a); view.update({}); await screen.findByText('none');
  });
  it('refreshes replacement entity ids even if the entity count stays the same', async () => {
    const fixture = connection(); const view = renderWithRuntime(<NetworkProbe />, { conn: fixture.conn, entities });
    await screen.findByText('coord:false:1'); const before = fixture.sendMessagePromise.mock.calls.length;
    view.update({ entities: fixtureEntities([fixtureEntity('sensor.replacement', '1')]) });
    await waitFor(() => expect(fixture.sendMessagePromise.mock.calls.length).toBeGreaterThan(before));
  });
  it('cleans a subscription that resolves after the view unmounts', async () => {
    const fixture = connection(); let resolve!: (value: () => Promise<void>) => void;
    const unsubscribe = vi.fn(async () => {});
    Object.assign(fixture.conn, { subscribeEvents: vi.fn(() => new Promise((done) => { resolve = done; })) });
    const view = renderWithRuntime(<NetworkProbe />, { conn: fixture.conn, entities }); await screen.findByText('coord:false:1');
    view.unmount(); await act(async () => resolve(unsubscribe)); expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it('refreshes on registry membership events without waiting for an entity count change', async () => {
    const fixture = connection(); const callbacks = new Map<string, () => void>();
    const unsubscribe = vi.fn(async () => {});
    Object.assign(fixture.conn, { subscribeEvents: vi.fn((callback: () => void, type: string) => {
      callbacks.set(type, callback); return Promise.resolve(unsubscribe);
    }) });
    const view = renderWithRuntime(<NetworkProbe />, { conn: fixture.conn, entities });
    await screen.findByText('coord:false:1'); const before = fixture.sendMessagePromise.mock.calls.length;
    act(() => callbacks.get('device_registry_updated')!());
    await waitFor(() => expect(fixture.sendMessagePromise.mock.calls.length).toBeGreaterThan(before));
    view.unmount(); await flush(); expect(unsubscribe).toHaveBeenCalledTimes(2);
  });
  it('keeps all details hooks synchronized after connection A -> B -> A', async () => {
    const a = connection(); const b = connection();
    const view = renderWithRuntime(<ZigbeeDetails {...detailProps} />, { conn: a.conn, entities });
    await screen.findByText('Rete Zigbee'); view.update({ conn: b.conn }); await flush();
    view.update({ conn: a.conn }); await screen.findByText('Rete Zigbee');
    expect(screen.getByRole('button', { name: 'Aggiungi un dispositivo Zigbee' })).toBeEnabled();
  });
  it('invalidates even a disconnect/reconnect completed between two React renders', async () => {
    const fixture = connection(); const listeners = new Map<string, Set<() => void>>();
    Object.assign(fixture.conn, { connected: true,
      addEventListener: (type: string, listener: () => void) => {
        const group = listeners.get(type) ?? new Set(); group.add(listener); listeners.set(type, group);
      },
      removeEventListener: (type: string, listener: () => void) => listeners.get(type)?.delete(listener),
    });
    renderWithRuntime(<ZigbeeDetails {...detailProps} />, { conn: fixture.conn, entities }); await screen.findByText('Rete Zigbee');
    const before = fixture.sendMessagePromise.mock.calls.length;
    act(() => {
      Object.assign(fixture.conn, { connected: false }); listeners.get('disconnected')?.forEach((listener) => listener());
      Object.assign(fixture.conn, { connected: true }); listeners.get('ready')?.forEach((listener) => listener());
    });
    await screen.findByText('Rete Zigbee');
    await waitFor(() => expect(fixture.sendMessagePromise.mock.calls.length).toBeGreaterThan(before));
    expect(screen.getByRole('button', { name: 'Aggiungi un dispositivo Zigbee' })).toBeEnabled();
  });
});

describe('Zigbee2026 explicit commands', () => {
  it('deduplicates synchronous starts from two consumers of the same gateway', async () => {
    const { conn } = connection(); const callService = vi.fn(() => new Promise(() => {}));
    renderWithRuntime(<><JoinProbe /><JoinProbe name="two" /></>, { conn, callService });
    fireEvent.click(screen.getByText('start one')); fireEvent.click(screen.getByText('start two'));
    expect(callService).toHaveBeenCalledExactlyOnceWith('zha', 'permit', { duration: 254 });
  });
  it('blocks stale callbacks from reopening or closing twice after an acknowledgement', async () => {
    const { conn } = connection(); const callService = vi.fn(async () => undefined);
    let captured!: ReturnType<typeof useZigbeeJoin>;
    function Capture() { captured = useZigbeeJoin(network); return null; }
    renderWithRuntime(<Capture />, { conn, callService });
    const initial = captured; act(() => initial.start()); await flush();
    act(() => initial.start()); expect(callService).toHaveBeenCalledTimes(1);
    const opened = captured; act(() => opened.stop()); await flush();
    act(() => opened.stop()); expect(callService).toHaveBeenCalledTimes(2);
  });
  it('does not write for an offline gateway', () => {
    const { conn } = connection(); const callService = vi.fn();
    renderWithRuntime(<JoinProbe target={{ ...network, online: false }} />, { conn, callService });
    fireEvent.click(screen.getByText('start one')); expect(callService).not.toHaveBeenCalled();
  });
  it('does not write with a retained disconnected socket', () => {
    const { conn } = connection(); Object.assign(conn, { connected: false }); const callService = vi.fn();
    renderWithRuntime(<JoinProbe />, { conn, callService }); fireEvent.click(screen.getByText('start one'));
    expect(callService).not.toHaveBeenCalled();
  });
  it('does not write while editing', () => {
    const { conn } = connection(); const callService = vi.fn();
    renderWithRuntime(<JoinProbe />, { conn, callService, editMode: true }); fireEvent.click(screen.getByText('start one'));
    expect(callService).not.toHaveBeenCalled();
  });
  it('bounds an unknown request, prevents reopening and allows one explicit close', async () => {
    vi.useFakeTimers(); const { conn } = connection(); const callService = vi.fn(() => new Promise(() => {}));
    renderWithRuntime(<JoinProbe />, { conn, callService }); fireEvent.click(screen.getByText('start one'));
    await act(async () => vi.advanceTimersByTime(ZIGBEE_COMMAND_TIMEOUT_MS + 1));
    expect(screen.getByTestId('join-one').textContent).toContain('false:false:unknown');
    expect(screen.getByText('start one')).toBeDisabled(); expect(callService).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('stop one')); expect(callService).toHaveBeenLastCalledWith('zha', 'permit', { duration: 0 });
  });
  it('never repeats after a tracked unknown response', async () => {
    const { conn } = connection(); const callService = vi.fn(async () => { throw { code: 'RESULT_UNKNOWN' }; });
    renderWithRuntime(<JoinProbe />, { conn, callService }); fireEvent.click(screen.getByText('start one')); await flush();
    fireEvent.click(screen.getByText('start one')); expect(callService).toHaveBeenCalledTimes(1);
  });
  it('does not claim any new member on HA service acceptance', async () => {
    const { conn } = connection(); const callService = vi.fn(async () => undefined);
    renderWithRuntime(<JoinProbe />, { conn, callService }); fireEvent.click(screen.getByText('start one')); await flush();
    expect(screen.getByTestId('join-one').textContent).toBe('true:false:null:0');
  });
  it('does not send a close on timeout expiry or unmount', async () => {
    vi.useFakeTimers(); const { conn } = connection(); const callService = vi.fn(async () => undefined);
    const view = renderWithRuntime(<JoinProbe />, { conn, callService }); fireEvent.click(screen.getByText('start one')); await flush();
    await act(async () => vi.advanceTimersByTime(255_000)); view.unmount(); expect(callService).toHaveBeenCalledTimes(1);
  });
  it('waits for the real Z2M switch and avoids duplicate opening before observation', async () => {
    const { conn } = connection(); const callService = vi.fn(async () => undefined);
    const z2m: ZigbeeNetwork = { ...network, integration: 'zigbee2mqtt', permitJoinId: 'switch.permit_join' };
    const view = renderWithRuntime(<JoinProbe target={z2m} />, { conn, callService,
      entities: fixtureEntities([fixtureEntity('switch.permit_join', 'off')]) });
    fireEvent.click(screen.getByText('start one')); await flush();
    expect(screen.getByTestId('join-one').textContent).toBe('false:false:null:0');
    fireEvent.click(screen.getByText('start one')); expect(callService).toHaveBeenCalledTimes(1);
    view.update({ entities: fixtureEntities([fixtureEntity('switch.permit_join', 'on')]) });
    expect(screen.getByTestId('join-one').textContent).toBe('true:false:null:0');
  });
  it('does not operate an unknown Z2M permit switch', () => {
    const { conn } = connection(); const callService = vi.fn();
    renderWithRuntime(<JoinProbe target={{ ...network, integration: 'zigbee2mqtt', permitJoinId: 'switch.permit_join' }} />, { conn, callService,
      entities: fixtureEntities([fixtureEntity('switch.permit_join', 'unknown')]) });
    fireEvent.click(screen.getByText('start one')); expect(callService).not.toHaveBeenCalled();
  });
  it('respects an available service catalog that does not offer zha.permit', () => {
    const { conn } = connection(); const callService = vi.fn();
    renderWithRuntime(<JoinProbe />, { conn, callService, services: {} });
    fireEvent.click(screen.getByText('start one')); expect(callService).not.toHaveBeenCalled();
  });
  it('ignores acceptance of a request made before connection A -> B -> A', async () => {
    const a = connection(); const b = connection(); let resolve!: () => void;
    const callService = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    const view = renderWithRuntime(<JoinProbe />, { conn: a.conn, callService });
    fireEvent.click(screen.getByText('start one')); view.update({ conn: b.conn }); view.update({ conn: a.conn });
    await act(async () => resolve()); expect(screen.getByTestId('join-one').textContent).toBe('false:false:null:0');
  });
  it('keeps an accepted Z2M close locked until the switch actually turns off', async () => {
    const { conn } = connection(); const callService = vi.fn(async () => undefined);
    const target: ZigbeeNetwork = { ...network, integration: 'zigbee2mqtt', permitJoinId: 'switch.permit_join' };
    const view = renderWithRuntime(<JoinProbe target={target} />, { conn, callService,
      entities: fixtureEntities([fixtureEntity('switch.permit_join', 'on')]) });
    fireEvent.click(screen.getByText('stop one')); await flush(); fireEvent.click(screen.getByText('stop one'));
    expect(callService).toHaveBeenCalledTimes(1); expect(screen.getByText('stop one')).toBeDisabled();
    view.update({ entities: fixtureEntities([fixtureEntity('switch.permit_join', 'off')]) });
    expect(screen.getByText('start one')).toBeEnabled();
  });
  it('reports accepted but unobserved Z2M state without another opening', async () => {
    vi.useFakeTimers(); const { conn } = connection(); const callService = vi.fn(async () => undefined);
    renderWithRuntime(<JoinProbe target={{ ...network, integration: 'zigbee2mqtt', permitJoinId: 'switch.permit_join' }} />, { conn, callService,
      entities: fixtureEntities([fixtureEntity('switch.permit_join', 'off')]) });
    fireEvent.click(screen.getByText('start one')); await flush();
    await act(async () => vi.advanceTimersByTime(31_000));
    expect(screen.getByTestId('join-one').textContent).toContain('unconfirmed');
    fireEvent.click(screen.getByText('start one')); expect(callService).toHaveBeenCalledTimes(1);
  });
});

describe('Zigbee2026 interface and permissions', () => {
  it.each([false, null])('disables backup with admin role %s', async (admin) => {
    const { conn } = connection(admin); renderWithRuntime(<ZigbeeDetails {...detailProps} />, { conn, entities });
    fireEvent.click(await screen.findByRole('button', { name: 'Manutenzione' }));
    expect(screen.getByRole('button', { name: 'Salva una copia della rete' })).toBeDisabled(); expect(command).not.toHaveBeenCalled();
  });
  it('sends admin backup only after a gesture and labels only HA acceptance', async () => {
    const { conn } = connection(); renderWithRuntime(<ZigbeeDetails {...detailProps} />, { conn, entities });
    fireEvent.click(await screen.findByRole('button', { name: 'Manutenzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva una copia della rete' }));
    expect(await screen.findByText('Richiesta di copia accettata da Home Assistant.')).toBeTruthy();
    expect(command).toHaveBeenCalledExactlyOnceWith('zigbee.backup'); expect(screen.queryByText(/Copia salvata/)).toBeNull();
  });
  it('keeps technical information out of the daily reading', async () => {
    const { conn } = connection(); renderWithRuntime(<ZigbeeDetails {...detailProps} />, { conn, entities });
    const technical = await screen.findByRole('button', { name: 'Informazioni tecniche' });
    expect(technical).toHaveAttribute('aria-expanded', 'false'); fireEvent.click(technical);
    expect(technical).toHaveAttribute('aria-expanded', 'true'); expect(screen.getByText('Radio')).toBeTruthy();
  });
  it('keeps compact content and complete accessible open label', async () => {
    const { conn } = connection(); const name = 'Gateway con un nome molto lungo';
    renderWithRuntime(<ZigbeeWidget {...widgetProps} />, { conn, entities, customNames: { [widgetProps.id]: name } });
    expect(await screen.findByRole('button', { name: `${name}, apri i dettagli del gateway` })).toBeTruthy();
    expect(screen.getByText(name).className).toContain('utility-truncate');
  });
  it('never presents an unknown gateway as all healthy', async () => {
    const fixture = connection(); fixture.sendMessagePromise.mockImplementation(async (message) => message.type === 'config/device_registry/list' ? devices
      : message.type === 'config/entity_registry/list' ? entries : []);
    renderWithRuntime(<ZigbeeWidget {...widgetProps} size={{ w: 2, h: 2 }} />, { conn: fixture.conn, entities: {} });
    expect(await screen.findByText('Stato non disponibile')).toBeTruthy(); expect(screen.queryByText('Tutto a posto')).toBeNull();
  });
  it('retains an uncertain backup outcome across closing and reopening its details', async () => {
    command.mockRejectedValueOnce({ code: 'RESULT_UNKNOWN' });
    const { conn } = connection(); const view = renderWithRuntime(<ZigbeeDetails {...detailProps} />, { conn, entities });
    fireEvent.click(await screen.findByRole('button', { name: 'Manutenzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva una copia della rete' })); await flush();
    view.update({}, <span>closed</span>); view.update({}, <ZigbeeDetails {...detailProps} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Manutenzione' }));
    expect(screen.getByRole('button', { name: 'Salva una copia della rete' })).toBeDisabled();
    expect(command).toHaveBeenCalledTimes(1);
  });
});
