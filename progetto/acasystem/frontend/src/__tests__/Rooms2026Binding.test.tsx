import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import type { Connection, HaMessage } from '@/@types/ha';
import { CLIENT_SESSION_EVENT } from '@/api/clientSession';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import * as profiles from '@/hooks/liveProfiles/LiveProfilesContext';
import { RoomBindingSection } from '@/templates/sheets/RoomBindingSection';
import { ROOM_PICKER_TIMEOUT_MS } from '@/templates/sheets/RoomPicker';
import { renderWithRuntime } from './UtilityHarness';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function connection() {
  const registry = {
    areas: [{ area_id: 'a', name: 'Sala', icon: 'mdi:sofa' }],
    entities: [
      { entity_id: 'light.a', device_id: 'd', area_id: null },
      { entity_id: 'light.b', device_id: 'd', area_id: 'b' },
    ],
    devices: [{ id: 'd', area_id: 'a' }],
  };
  const callbacks = new Map<string, Set<() => void>>();
  const add = (event: string, callback: () => void) => {
    const list = callbacks.get(event) ?? new Set();
    list.add(callback);
    callbacks.set(event, list);
  };
  const sendMessagePromise = vi.fn(async (message: HaMessage): Promise<unknown> => {
    if (message.type === 'config/area_registry/list') return registry.areas;
    if (message.type === 'config/entity_registry/list') return registry.entities;
    if (message.type === 'config/device_registry/list') return registry.devices;
    throw new Error(`Unexpected read ${message.type}`);
  });
  const conn = {
    connected: true,
    sendMessagePromise,
    addEventListener: add,
    removeEventListener: (event: string, callback: () => void) =>
      callbacks.get(event)?.delete(callback),
    subscribeEvents: async (callback: () => void, event: string) => {
      add(event, callback);
      return () => callbacks.get(event)?.delete(callback);
    },
  } as unknown as Connection;
  return {
    conn,
    registry,
    sendMessagePromise,
    emit: (event: string) => callbacks.get(event)?.forEach((callback) => callback()),
  };
}
const empty = {};
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
async function selectSala() {
  fireEvent.click(await screen.findByRole('button', { name: /^Sala/ }));
}

describe('Stanze 2026: associazione unica con riscontro', () => {
  it('la bozza ottimistica della propria patch non chiude l’attesa ACK e conserva il rifiuto', async () => {
    const source = connection(),
      ack = deferred<void>(),
      saveBinding = vi.fn(() => ack.promise);
    const view = renderWithRuntime(
      <RoomBindingSection settings={empty} resourceKey="home::room" saveBinding={saveBinding} />,
      { conn: source.conn }
    );
    await selectSala();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    view.update(
      {},
      <RoomBindingSection
        resourceKey="home::room"
        settings={{
          areaId: 'a',
          areaName: 'Sala',
          entityIds: ['light.a'],
          roomMembershipSource: 'area',
        }}
        saveBinding={() => saveBinding()}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Associazione in corso');
    expect(screen.getByRole('button', { name: 'Collega la stanza' })).toBeDisabled();
    await act(async () => ack.reject(new Error('ACK refused')));
    expect(screen.getByRole('alert')).toHaveTextContent('Associazione non confermata');
  });
  it('legge senza scrivere e salva una sola patch completa con precedenza area corretta', async () => {
    const source = connection(),
      ack = deferred<void>(),
      saveBinding = vi.fn(() => ack.promise),
      callService = vi.fn();
    renderWithRuntime(<RoomBindingSection settings={empty} saveBinding={saveBinding} />, {
      conn: source.conn,
      callService,
    });
    await selectSala();
    expect(saveBinding).not.toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
    const button = screen.getByRole('button', { name: 'Collega la stanza' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(saveBinding).toHaveBeenCalledTimes(1);
    expect(saveBinding).toHaveBeenCalledWith({
      areaId: 'a',
      areaName: 'Sala',
      areaIcon: 'mdi:sofa',
      entityIds: ['light.a'],
      roomMembershipSource: 'area',
    });
    expect(screen.getByRole('status')).toHaveTextContent('Associazione in corso');
    expect(button).toBeDisabled();
    await act(async () => ack.resolve());
    expect(screen.queryByText('Associazione in corso…')).not.toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('mostra il rifiuto e consente un nuovo tentativo esplicito', async () => {
    const source = connection(),
      saveBinding = vi
        .fn()
        .mockRejectedValueOnce(new Error('Refused'))
        .mockResolvedValue(undefined);
    renderWithRuntime(<RoomBindingSection settings={empty} saveBinding={saveBinding} />, {
      conn: source.conn,
    });
    await selectSala();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    await screen.findByRole('alert');
    expect(saveBinding).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    await waitFor(() => expect(saveBinding).toHaveBeenCalledTimes(2));
  });
  it('conserva l’associazione precedente finché la nuova non viene confermata', async () => {
    const source = connection(),
      saveBinding = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(
      <RoomBindingSection
        settings={{ areaId: 'old', areaName: 'Vecchia sala', entityIds: ['light.old'] }}
        saveBinding={saveBinding}
      />,
      { conn: source.conn }
    );
    await selectSala();
    expect(screen.getByText('Associazione precedente: Vecchia sala')).toBeInTheDocument();
    expect(saveBinding).not.toHaveBeenCalled();
  });
  it('non inventa entità quando l’area è vuota', async () => {
    const source = connection(),
      saveBinding = vi.fn().mockResolvedValue(undefined);
    source.registry.entities = [];
    renderWithRuntime(<RoomBindingSection settings={empty} saveBinding={saveBinding} />, {
      conn: source.conn,
    });
    await selectSala();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    expect(saveBinding).toHaveBeenCalledWith(
      expect.objectContaining({ entityIds: [], roomMembershipSource: 'area' })
    );
  });
  it('non accoda associazioni quando la casa è scollegata', () => {
    const saveBinding = vi.fn();
    renderWithRuntime(<RoomBindingSection settings={empty} saveBinding={saveBinding} />, {
      conn: null,
    });
    expect(screen.getByRole('button', { name: 'Collega la stanza' })).toBeDisabled();
    expect(saveBinding).not.toHaveBeenCalled();
  });
});

describe('Stanze 2026: deadline, registri e scope del raccordo', () => {
  it('StrictMode conserva solo la lettura corrente senza scritture al montaggio', async () => {
    const source = connection(),
      saveBinding = vi.fn();
    renderWithRuntime(
      <StrictMode>
        <RoomBindingSection settings={empty} saveBinding={saveBinding} />
      </StrictMode>,
      { conn: source.conn }
    );
    await selectSala();
    expect(screen.getByRole('button', { name: 'Collega la stanza' })).not.toBeDisabled();
    expect(saveBinding).not.toHaveBeenCalled();
  });
  it('resourceKey invalida la proposta e l’esito durante un ABA tra widget con stessi valori', async () => {
    const source = connection(),
      ack = deferred<void>(),
      saveBinding = vi.fn(() => ack.promise);
    const ui = (resourceKey: string) => (
      <RoomBindingSection settings={empty} resourceKey={resourceKey} saveBinding={saveBinding} />
    );
    const view = renderWithRuntime(ui('page::room1'), { conn: source.conn });
    await selectSala();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    view.update({}, ui('page::room2'));
    view.update({}, ui('page::room1'));
    await act(async () => ack.reject(new Error('Late')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(saveBinding).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Collega la stanza' })).toBeDisabled();
  });
  it('un registro senza risposta ha limite e Riprova recupera i dati', async () => {
    const source = connection(),
      saveBinding = vi.fn();
    const original = source.sendMessagePromise.getMockImplementation()!;
    source.sendMessagePromise.mockImplementation(() => new Promise(() => undefined));
    vi.useFakeTimers();
    renderWithRuntime(<RoomBindingSection settings={empty} saveBinding={saveBinding} />, {
      conn: source.conn,
    });
    await act(async () => {
      vi.advanceTimersByTime(ROOM_PICKER_TIMEOUT_MS + 1);
    });
    expect(screen.getByText('Impossibile caricare le aree.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collega la stanza' })).toBeDisabled();
    source.sendMessagePromise.mockImplementation(original);
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await screen.findByRole('button', { name: /^Sala/ });
    expect(saveBinding).not.toHaveBeenCalled();
  });
  it('un ACK perso non diventa successo e non avvia un altro salvataggio', async () => {
    const source = connection(),
      saveBinding = vi.fn(() => new Promise<void>(() => undefined));
    renderWithRuntime(<RoomBindingSection settings={empty} saveBinding={saveBinding} />, {
      conn: source.conn,
    });
    await selectSala();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    await act(async () => {
      vi.advanceTimersByTime(ROOM_PICKER_TIMEOUT_MS + 1);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Associazione non confermata');
    expect(saveBinding).toHaveBeenCalledTimes(1);
  });
  it('un’area rimossa viene tolta dalla proposta prima di un nuovo collegamento', async () => {
    const source = connection(),
      saveBinding = vi.fn();
    renderWithRuntime(<RoomBindingSection settings={empty} saveBinding={saveBinding} />, {
      conn: source.conn,
    });
    await selectSala();
    source.registry.areas = [];
    act(() => source.emit('area_registry_updated'));
    await screen.findByText('Nessuna area trovata.');
    expect(screen.getByRole('button', { name: 'Collega la stanza' })).toBeDisabled();
    expect(saveBinding).not.toHaveBeenCalled();
  });
  it('ignora il rifiuto di un salvataggio dopo cambio fonte', async () => {
    const source = connection(),
      ack = deferred<void>(),
      saveBinding = vi.fn(() => ack.promise);
    const view = renderWithRuntime(
      <RoomBindingSection settings={empty} saveBinding={saveBinding} />,
      { conn: source.conn }
    );
    await selectSala();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    view.update(
      {},
      <RoomBindingSection
        settings={{ areaId: 'b', areaName: 'Cucina', entityIds: ['light.b'] }}
        saveBinding={saveBinding}
      />
    );
    await act(async () => ack.reject(new Error('Late')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Associazione precedente: Cucina')).toBeInTheDocument();
  });
  it('un evento account ABA invalida il risultato ancora pendente', async () => {
    const source = connection(),
      ack = deferred<void>(),
      saveBinding = vi.fn(() => ack.promise);
    renderWithRuntime(<RoomBindingSection settings={empty} saveBinding={saveBinding} />, {
      conn: source.conn,
    });
    await selectSala();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    act(() => {
      window.dispatchEvent(new Event(CLIENT_SESSION_EVENT));
      window.dispatchEvent(new Event(CLIENT_SESSION_EVENT));
    });
    await act(async () => ack.reject(new Error('Late')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(saveBinding).toHaveBeenCalledTimes(1);
  });
  it('un owner ABA invalida il risultato anche tornando allo stesso editor', async () => {
    const source = connection(),
      ack = deferred<void>(),
      saveBinding = vi.fn(() => ack.promise),
      subscriptions = new Set<() => void>();
    let profile = 'a';
    const live = {
      coordinator: {
        snapshot: () => ({ profile: { id: profile }, editor: { id: 'editor' } }),
        subscribe: (callback: () => void) => {
          subscriptions.add(callback);
          return () => subscriptions.delete(callback);
        },
      },
    };
    vi.spyOn(profiles, 'useOptionalLiveProfiles').mockReturnValue(
      live as unknown as ReturnType<typeof profiles.useOptionalLiveProfiles>
    );
    renderWithRuntime(<RoomBindingSection settings={empty} saveBinding={saveBinding} />, {
      conn: source.conn,
    });
    await selectSala();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    act(() => {
      profile = 'b';
      subscriptions.forEach((callback) => callback());
      profile = 'a';
      subscriptions.forEach((callback) => callback());
    });
    await act(async () => ack.reject(new Error('Late')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('il backend offline sospende il collegamento anche con HA ancora connesso', async () => {
    const source = connection(),
      saveBinding = vi.fn(),
      subscriptions = new Set<() => void>();
    let offline = false;
    const live = {
      coordinator: {
        snapshot: () => ({ profile: { id: 'a' }, editor: { id: 'editor' }, offline }),
        subscribe: (callback: () => void) => {
          subscriptions.add(callback);
          return () => subscriptions.delete(callback);
        },
      },
    };
    vi.spyOn(profiles, 'useOptionalLiveProfiles').mockReturnValue(
      live as unknown as ReturnType<typeof profiles.useOptionalLiveProfiles>
    );
    renderWithRuntime(<RoomBindingSection settings={empty} saveBinding={saveBinding} />, {
      conn: source.conn,
    });
    await selectSala();
    act(() => {
      offline = true;
      subscriptions.forEach((callback) => callback());
    });
    expect(screen.getByRole('button', { name: 'Collega la stanza' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    expect(saveBinding).not.toHaveBeenCalled();
  });
  it('nascondere la sezione invalida gli esiti tardivi', async () => {
    const source = connection(),
      ack = deferred<void>(),
      saveBinding = vi.fn(() => ack.promise);
    const ui = (visible: boolean) => (
      <PageVisibilityContext.Provider value={visible}>
        <RoomBindingSection settings={empty} saveBinding={saveBinding} />
      </PageVisibilityContext.Provider>
    );
    const view = renderWithRuntime(ui(true), { conn: source.conn });
    await selectSala();
    fireEvent.click(screen.getByRole('button', { name: 'Collega la stanza' }));
    view.update({}, ui(false));
    await act(async () => ack.reject(new Error('Late')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('una risposta del vecchio collegamento non sostituisce la lettura dopo connessione ABA', async () => {
    const source = connection(),
      other = connection(),
      firstAreas = deferred<unknown>(),
      saveBinding = vi.fn();
    const original = source.sendMessagePromise.getMockImplementation()!;
    let first = true;
    source.sendMessagePromise.mockImplementation(async (message) => {
      if (message.type === 'config/area_registry/list' && first) {
        first = false;
        return firstAreas.promise;
      }
      return original(message);
    });
    other.registry.areas = [{ area_id: 'b', name: 'Cucina', icon: 'mdi:room' }];
    const view = renderWithRuntime(
      <RoomBindingSection settings={empty} saveBinding={saveBinding} />,
      { conn: source.conn }
    );
    view.update({ conn: other.conn });
    await screen.findByRole('button', { name: /^Cucina/ });
    view.update({ conn: source.conn });
    await screen.findByRole('button', { name: /^Sala/ });
    await act(async () => firstAreas.resolve([{ area_id: 'old', name: 'Risposta vecchia' }]));
    expect(screen.queryByRole('button', { name: /^Risposta vecchia/ })).not.toBeInTheDocument();
    expect(saveBinding).not.toHaveBeenCalled();
  });
});
