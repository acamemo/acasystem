import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Connection, HaMessage } from '@/@types/ha';
import type { WidgetRuntime } from '@/@types/launcher';
import { CLIENT_SESSION_EVENT } from '@/api/clientSession';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { RoomScope, useRoomContext } from '@/components/widgets/utilities/room/RoomScope';
import { RoomWidget } from '@/components/widgets/utilities/room/RoomWidget';
import { RoomDetails } from '@/components/widgets/utilities/room/RoomDetails';
import { RoomsPage } from '@/components/widgets/utilities/fullpage/RoomsPage';
import { renderWithRuntime } from './UtilityHarness';

const services = {
  light: { turn_on: {}, turn_off: {} },
  cover: { open_cover: {}, close_cover: {}, stop_cover: {} },
};
const data = () =>
  fixtureEntities([
    fixtureEntity('light.a', 'on', {
      friendly_name: 'Luce sala',
      brightness: 128,
      supported_color_modes: ['brightness'],
    }),
    fixtureEntity('light.b', 'off', { friendly_name: 'Luce cucina' }),
    fixtureEntity('sensor.a', '21.7', {
      friendly_name: 'Temperatura sala',
      device_class: 'temperature',
      unit_of_measurement: '°C',
    }),
  ]);
function connection() {
  const listeners = new Map<string, Set<() => void>>();
  const registry = {
    areas: [
      { area_id: 'a', name: 'Sala' },
      { area_id: 'b', name: 'Cucina' },
    ],
    entities: [
      { entity_id: 'light.a', device_id: 'dev-a', area_id: null },
      { entity_id: 'light.b', device_id: 'dev-a', area_id: 'b' },
      { entity_id: 'sensor.a', area_id: 'a' },
    ],
    devices: [{ id: 'dev-a', area_id: 'a' }],
  };
  const add = (event: string, fn: () => void) => {
    const callbacks = listeners.get(event) ?? new Set();
    callbacks.add(fn);
    listeners.set(event, callbacks);
  };
  const sendMessagePromise = vi.fn(async (message: HaMessage) => {
    if (message.type === 'config/area_registry/list') return registry.areas;
    if (message.type === 'config/entity_registry/list') return registry.entities;
    if (message.type === 'config/device_registry/list') return registry.devices;
    if (message.type === 'get_services') return services;
    throw new Error(`Unexpected read ${message.type}`);
  });
  const conn = {
    connected: true,
    sendMessagePromise,
    subscribeEvents: vi.fn(async (fn: () => void, event: string) => {
      add(event, fn);
      return () => listeners.get(event)?.delete(fn);
    }),
    addEventListener: add,
    removeEventListener: (event: string, fn: () => void) => listeners.get(event)?.delete(fn),
  } as unknown as Connection;
  return {
    conn,
    registry,
    sendMessagePromise,
    emit: (event: string) => listeners.get(event)?.forEach((fn) => fn()),
  };
}
const settings = {
  areaId: 'a',
  areaName: 'Sala',
  roomMembershipSource: 'area',
  entityIds: ['light.b'],
};
const widget = (s = settings) => (
  <RoomWidget
    id="room_card_saved"
    settingsKey="home::room_card_saved"
    settings={s}
    size={{ w: 2, h: 2 }}
    editMode={false}
  />
);
const details = (s = settings) => (
  <RoomDetails
    id="room_card_saved"
    settingsKey="home::room_card_saved"
    settings={s}
    onClose={() => {}}
  />
);
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('Stanze 2026: sorgenti vive e aperture in sola lettura', () => {
  it('un errore di registro sospende i comandi conservando le associazioni esplicite', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    source.sendMessagePromise.mockRejectedValueOnce(new Error('Registry unavailable'));
    renderWithRuntime(
      details({ ...settings, roomMembershipSource: 'legacy', entityIds: ['light.a'] }),
      { entities: data(), conn: source.conn, services, callService }
    );
    await screen.findByText(/Non riesco a verificare i dispositivi della stanza/);
    expect(screen.getByText('Luce sala')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Luce sala' })).toBeDisabled();
    fireEvent.click(screen.getByRole('switch', { name: 'Luce sala' }));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Luce sala' })).not.toBeDisabled()
    );
  });
  it('un errore di registro nella fonte area non usa lo snapshot vecchio', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    source.sendMessagePromise.mockRejectedValueOnce(new Error('Registry unavailable'));
    renderWithRuntime(details(), { entities: data(), conn: source.conn, services, callService });
    await screen.findByText('Non riesco a caricare la stanza.');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('legge i registri senza comandi e non importa la luce assegnata a un’altra area', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined),
      openDetails = vi.fn();
    renderWithRuntime(widget(), {
      entities: data(),
      conn: source.conn,
      services,
      callService,
      openDetails,
    });
    await screen.findByRole('switch', { name: 'Luce principale di Sala' });
    expect(screen.getByText('21,7 °C')).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sala, apri i dettagli' }));
    expect(openDetails).toHaveBeenCalledWith('room_card_saved');
    expect(callService).not.toHaveBeenCalled();
  });
  it('aggiorna le entità riassegnate su evento del registro', async () => {
    const source = connection();
    renderWithRuntime(details(), { entities: data(), conn: source.conn, services });
    await screen.findByText('Luce sala');
    expect(screen.queryByText('Luce cucina')).not.toBeInTheDocument();
    source.registry.entities[0] = { ...source.registry.entities[0]!, area_id: 'b' };
    act(() => source.emit('entity_registry_updated'));
    await waitFor(() => expect(screen.queryByText('Luce sala')).not.toBeInTheDocument());
    expect(screen.getByText('Temperatura sala')).toBeInTheDocument();
  });
  it('un’area rimossa diventa mancante e non invia vecchi target', async () => {
    const source = connection(),
      callService = vi.fn();
    renderWithRuntime(details(), { entities: data(), conn: source.conn, services, callService });
    await screen.findByText('Luce sala');
    source.registry.areas = source.registry.areas.filter((area) => area.area_id !== 'a');
    act(() => source.emit('area_registry_updated'));
    await screen.findByText('Questa area non è più disponibile in Home Assistant.');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('l’explorer usa la stessa precedenza e l’apertura resta in sola lettura', async () => {
    const source = connection(),
      callService = vi.fn();
    renderWithRuntime(<RoomsPage pageId="rooms" settings={{}} onSaveSetting={() => {}} />, {
      entities: data(),
      conn: source.conn,
      services,
      callService,
    });
    fireEvent.click(await screen.findByRole('button', { name: /^Sala:/ }));
    await screen.findByText('Luce sala');
    expect(screen.queryByText('Luce cucina')).not.toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('mantiene il vecchio ID e la lista esplicita senza migrazione implicita', async () => {
    const source = connection(),
      legacy = {
        areaId: 'a',
        areaName: 'Sala',
        roomMembershipSource: 'legacy',
        entityIds: ['light.b'],
      };
    renderWithRuntime(details(legacy), { entities: data(), conn: source.conn, services });
    await screen.findByText('Luce cucina');
    expect(screen.queryByText('Luce sala')).not.toBeInTheDocument();
  });
});

describe('Stanze 2026: comandi osservati, duplicati e ritardi', () => {
  it('una luce principale sconosciuta non appare come spenta', async () => {
    const source = connection();
    renderWithRuntime(widget(), { entities: { ...data(), 'light.a': fixtureEntity('light.a', 'unknown') }, conn: source.conn, services });
    await screen.findByText('Non disponibile');
    expect(screen.queryByRole('switch', { name: 'Luce principale di Sala' })).not.toBeInTheDocument();
    expect(screen.queryByText('Spento')).not.toBeInTheDocument();
  });
  it('deduplica il doppio tocco e aspetta lo stato osservato dopo ACK', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    const view = renderWithRuntime(widget(), {
      entities: data(),
      conn: source.conn,
      services,
      callService,
    });
    const toggle = await screen.findByRole('switch', { name: 'Luce principale di Sala' });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.a' });
    await act(async () => undefined);
    expect(toggle).toHaveAttribute('aria-busy', 'true');
    expect(toggle).toBeDisabled();
    view.update({ entities: { ...data(), 'light.a': fixtureEntity('light.a', 'off') } });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Luce principale di Sala' })).not.toHaveAttribute(
        'aria-busy',
        'true'
      )
    );
  });
  it('il comando collettivo include solo luci correnti disponibili e resta pendente dopo ACK', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities: data(), conn: source.conn, services, callService });
    fireEvent.click(await screen.findByRole('button', { name: 'Spegni tutte' }));
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.a' });
    await screen.findByText('In attesa delle luci…');
    expect(screen.getByRole('button', { name: 'Spegni tutte' })).toBeDisabled();
  });
  it('annulla la luminosità non ancora inviata quando si cambia area', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    const view = renderWithRuntime(details(), {
      entities: data(),
      conn: source.conn,
      services,
      callService,
    });
    const slider = await screen.findByRole('slider', { name: 'Luminosità di Luce sala' });
    fireEvent.change(slider, { target: { value: '45' } });
    view.update({}, details({ ...settings, areaId: 'b', areaName: 'Cucina' }));
    await new Promise((resolve) => setTimeout(resolve, 280));
    expect(callService).not.toHaveBeenCalled();
  });
  it('annulla la luminosità sospesa quando la pagina si nasconde', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    const ui = (visible: boolean) => (
      <PageVisibilityContext.Provider value={visible}>{details()}</PageVisibilityContext.Provider>
    );
    const view = renderWithRuntime(ui(true), {
      entities: data(),
      conn: source.conn,
      services,
      callService,
    });
    fireEvent.change(await screen.findByRole('slider', { name: 'Luminosità di Luce sala' }), {
      target: { value: '45' },
    });
    view.update({}, ui(false));
    await new Promise((resolve) => setTimeout(resolve, 280));
    expect(callService).not.toHaveBeenCalled();
  });
  it('i comandi offline sono disabilitati e non vengono accodati al ritorno', async () => {
    const callService = vi.fn(),
      source = connection();
    const legacy = { ...settings, roomMembershipSource: 'legacy', entityIds: ['light.a'] };
    const view = renderWithRuntime(widget(legacy), {
      entities: data(),
      conn: null,
      services,
      callService,
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Luce principale di Sala' }));
    expect(callService).not.toHaveBeenCalled();
    view.update({ conn: source.conn });
    await act(async () => undefined);
    expect(callService).not.toHaveBeenCalled();
  });
  it('il rifiuto del servizio mostra un errore e non inventa la conferma', async () => {
    const source = connection(),
      callService = vi.fn().mockRejectedValue(new Error('Refused'));
    renderWithRuntime(widget(), { entities: data(), conn: source.conn, services, callService });
    fireEvent.click(await screen.findByRole('switch', { name: 'Luce principale di Sala' }));
    await screen.findByText('Comando non riuscito');
    expect(screen.getByRole('switch', { name: 'Luce principale di Sala' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });
  it('l’ACK senza stato osservato scade senza dichiarare successo', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(widget(), { entities: data(), conn: source.conn, services, callService });
    const toggle = await screen.findByRole('switch', { name: 'Luce principale di Sala' });
    vi.useFakeTimers();
    fireEvent.click(toggle);
    await act(async () => {
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(30_001));
    expect(screen.getByText('Nessuna conferma dal dispositivo')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('un rifiuto tardivo dopo cambio stanza non compare nella nuova stanza', async () => {
    const source = connection();
    let reject: (reason: Error) => void = () => undefined;
    const callService = vi.fn(
      () =>
        new Promise((_, no) => {
          reject = no;
        })
    );
    const view = renderWithRuntime(widget(), {
      entities: data(),
      conn: source.conn,
      services,
      callService,
    });
    fireEvent.click(await screen.findByRole('switch', { name: 'Luce principale di Sala' }));
    view.update({}, widget({ ...settings, areaId: 'b', areaName: 'Cucina' }));
    await screen.findByRole('switch', { name: 'Luce principale di Cucina' });
    await act(async () => {
      reject(new Error('Late'));
    });
    expect(screen.queryByText('Comando non riuscito')).not.toBeInTheDocument();
  });
});

describe('Stanze 2026: callback scaduti e generazioni ABA', () => {
  function Probe({ capture }: { capture: (call: WidgetRuntime['callService']) => void }) {
    const runtime = useWidgetRuntime();
    const context = useRoomContext();
    capture(runtime.callService);
    return <span>{context?.registryStatus}</span>;
  }
  const legacy = { entityIds: ['light.a'] };
  it('rifiuta il callback conservato dopo cambio area e ritorno', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    let captured: WidgetRuntime['callService'] = async () => undefined;
    const ui = (ids: string[]) => (
      <RoomScope settings={{ entityIds: ids }}>
        {() => (
          <Probe
            capture={(call) => {
              captured = call;
            }}
          />
        )}
      </RoomScope>
    );
    const view = renderWithRuntime(ui(['light.a']), {
      conn: source.conn,
      services,
      entities: data(),
      callService,
    });
    await screen.findByText('ready');
    const stale = captured;
    view.update({}, ui(['light.b']));
    view.update({}, ui(['light.a']));
    await expect(stale('light', 'turn_off', { entity_id: 'light.a' })).rejects.toThrow();
    expect(callService).not.toHaveBeenCalled();
  });
  it('l’evento account invalida anche la stessa identità conservata', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    let captured: WidgetRuntime['callService'] = async () => undefined;
    renderWithRuntime(
      <RoomScope settings={legacy}>
        {() => (
          <Probe
            capture={(call) => {
              captured = call;
            }}
          />
        )}
      </RoomScope>,
      { conn: source.conn, services, entities: data(), callService }
    );
    await screen.findByText('ready');
    const stale = captured;
    act(() => {
      window.dispatchEvent(new Event(CLIENT_SESSION_EVENT));
      window.dispatchEvent(new Event(CLIENT_SESSION_EVENT));
    });
    await expect(stale('light', 'turn_off', { entity_id: 'light.a' })).rejects.toThrow();
    expect(callService).not.toHaveBeenCalled();
  });
  it('un ciclo disconnected/ready non riattiva il callback della stessa connessione', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    let captured: WidgetRuntime['callService'] = async () => undefined;
    renderWithRuntime(
      <RoomScope settings={legacy}>
        {() => (
          <Probe
            capture={(call) => {
              captured = call;
            }}
          />
        )}
      </RoomScope>,
      { conn: source.conn, services, entities: data(), callService }
    );
    await screen.findByText('ready');
    const stale = captured;
    act(() => {
      source.emit('disconnected');
      source.emit('ready');
    });
    await expect(stale('light', 'turn_off', { entity_id: 'light.a' })).rejects.toThrow();
    expect(callService).not.toHaveBeenCalled();
  });
  it('impedisce target di un’altra area e servizi non supportati anche con callback diretta', async () => {
    const source = connection(),
      callService = vi.fn().mockResolvedValue(undefined);
    let captured: WidgetRuntime['callService'] = async () => undefined;
    renderWithRuntime(
      <RoomScope settings={legacy}>
        {() => (
          <Probe
            capture={(call) => {
              captured = call;
            }}
          />
        )}
      </RoomScope>,
      { conn: source.conn, services, entities: data(), callService }
    );
    await screen.findByText('ready');
    await expect(captured('light', 'turn_on', { entity_id: 'light.b' })).rejects.toThrow();
    await expect(captured('light', 'toggle', { entity_id: 'light.a' })).rejects.toThrow();
    expect(callService).not.toHaveBeenCalled();
  });
});
