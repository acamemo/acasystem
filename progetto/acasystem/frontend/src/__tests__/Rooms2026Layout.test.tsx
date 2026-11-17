import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomWidget } from '@/components/widgets/utilities/room/RoomWidget';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderWithRuntime } from './UtilityHarness';

const observers = new Set<TestResizeObserver>();
class TestResizeObserver {
  constructor(readonly callback: ResizeObserverCallback) {}
  observe() {
    observers.add(this);
  }
  disconnect() {
    observers.delete(this);
  }
}
const measure = (height: number) =>
  act(() =>
    observers.forEach((observer) =>
      observer.callback(
        [{ contentRect: { height } } as ResizeObserverEntry],
        observer as unknown as ResizeObserver
      )
    )
  );
const entities = fixtureEntities([
  fixtureEntity('light.main', 'on'),
  fixtureEntity('light.other', 'on'),
  fixtureEntity('sensor.t', '21.5', { device_class: 'temperature', unit_of_measurement: '°C' }),
  fixtureEntity('switch.a', 'on'),
  fixtureEntity('switch.b', 'on'),
]);
const settings = { areaName: 'Sala', entityIds: Object.keys(entities) };
function mount() {
  const conn = fakeConnection({
    'config/area_registry/list': () => [],
    'config/entity_registry/list': () => [],
    'config/device_registry/list': () => [],
  }).conn;
  return renderWithRuntime(
    <RoomWidget
      id="room_card_layout"
      settingsKey="home::room_card_layout"
      settings={settings}
      size={{ w: 2, h: 2 }}
      editMode={false}
    />,
    { conn, entities, services: { light: { turn_on: {}, turn_off: {} } } }
  );
}
beforeEach(() => vi.stubGlobal('ResizeObserver', TestResizeObserver));
afterEach(() => {
  observers.clear();
  vi.unstubAllGlobals();
});

describe('Stanza: contenuto commisurato all’altezza fisica', () => {
  it('158px conserva un riepilogo e il comando, eliminando dal DOM le statistiche supplementari', async () => {
    mount();
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Luce principale di Sala' })).not.toBeDisabled()
    );
    measure(158);
    expect(screen.getByText('21,5 °C')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Luce principale di Sala' })).toBeInTheDocument();
    expect(screen.queryByText('2 dispositivi attivi')).not.toBeInTheDocument();
    expect(screen.queryByText('2 luci accese')).not.toBeInTheDocument();
  });
  it('122px mostra due letture e lascia i comandi completi ai dettagli', async () => {
    mount();
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Luce principale di Sala' })).not.toBeDisabled()
    );
    measure(122);
    expect(screen.getByText('21,5 °C')).toBeInTheDocument();
    expect(screen.getByText('2 luci accese')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByText('2 dispositivi attivi')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sala, apri i dettagli' })).toBeInTheDocument();
  });
  it('dà precedenza al dato non disponibile e ripristina il riepilogo quando cresce lo spazio', async () => {
    const ui = mount();
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Luce principale di Sala' })).not.toBeDisabled()
    );
    measure(158);
    ui.update({
      entities: {
        ...entities,
        'sensor.t': fixtureEntity('sensor.t', 'unavailable', { device_class: 'temperature' }),
      },
    });
    expect(screen.getByText('1 non disponibili')).toBeInTheDocument();
    expect(screen.queryByText('2 luci accese')).not.toBeInTheDocument();
    ui.update({ entities });
    measure(240);
    expect(screen.getByText('21,5 °C')).toBeInTheDocument();
    expect(screen.getByText('2 luci accese')).toBeInTheDocument();
    expect(screen.getByText('2 dispositivi attivi')).toBeInTheDocument();
  });
});
