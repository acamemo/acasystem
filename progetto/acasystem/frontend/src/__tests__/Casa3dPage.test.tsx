import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityMap, HaMessage } from '@/@types/ha';
import { Casa3dProva } from '@/casa3d/Casa3dProva';
import { buildExamplePlan } from '@/casa3d/examplePlan';
import { loadCasa3d } from '@/casa3d/loader';
import { useCasa3dHass } from '@/casa3d/useCasa3dHass';

/**
 * The hook that builds the hass object from the app's Home Assistant context, and the
 * development page of the Casa 3D view (ADR-0014, T3): Light forced, read-only, the example
 * plan tied to the areas, commands refused and listed. The context and the loader are fakes.
 */

const state = vi.hoisted(() => ({
  entities: {} as Record<string, unknown>,
  meta: {} as Record<string, unknown>,
}));

vi.mock('@/hooks/context/HomeAssistantContext', () => ({
  useHomeAssistantEntities: () => state.entities,
  useHomeAssistantMeta: () => state.meta,
}));

vi.mock('@/casa3d/loader', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/casa3d/loader')>()),
  loadCasa3d: vi.fn(),
}));

const entity = (id: string, value = 'on'): HassEntity => ({
  entity_id: id,
  state: value,
  attributes: {},
  last_changed: '2026-10-20T10:00:00Z',
  last_updated: '2026-10-20T10:00:00Z',
  context: { id: 'c', parent_id: null, user_id: null },
});

const registryAnswers: Record<string, unknown> = {
  'config/area_registry/list': [
    { area_id: 'cucina', name: 'Cucina' },
    { area_id: 'sala', name: 'Sala' },
  ],
  'config/floor_registry/list': [],
  'config/device_registry/list': [],
  'config/entity_registry/list_for_display': { entity_categories: {}, entities: [] },
};

function fakeConn(refuse: string[] = []) {
  return {
    connected: true,
    sendMessagePromise: vi.fn(async (message: HaMessage) => {
      if (refuse.includes(message.type))
        throw Object.assign(new Error('Unauthorized'), { code: 'unauthorized' });
      return registryAnswers[message.type];
    }),
  };
}

function setContext(
  over: Record<string, unknown> = {},
  entities: EntityMap = { 'light.sala': entity('light.sala') }
) {
  state.entities = entities;
  state.meta = {
    conn: fakeConn(),
    haUser: { id: 'u', name: 'Mario', is_admin: true },
    haConfig: null,
    activeUrl: 'https://aca.test/ha',
    entitiesLoaded: true,
    ...over,
  };
}

const loadMock = vi.mocked(loadCasa3d);
const manifest = { name: 'casa3d', version: '0.1.0', entry: 'casa3d-a1.js', bundles: {} };

beforeEach(() => {
  loadMock.mockReset();
  loadMock.mockResolvedValue({ manifest, base: 'https://aca.test/casa3d/' });
});
afterEach(() => cleanup());

describe('useCasa3dHass', () => {
  it('builds the hass object once the connection, the entities and the registries are there', async () => {
    setContext();
    const { result } = renderHook(() => useCasa3dHass(null));
    expect(result.current.hass).toBeNull();
    await waitFor(() => expect(result.current.hass).not.toBeNull());
    expect(result.current.registriesLoaded).toBe(true);
    expect(result.current.failed).toEqual([]);
    expect(result.current.hass?.language).toBe('it');
    expect(Object.keys(result.current.hass?.areas ?? {})).toEqual(['cucina', 'sala']);
    expect(Object.keys(result.current.hass?.states ?? {})).toEqual(['light.sala']);
    expect(result.current.hass?.user.is_admin).toBe(true);
  });

  it('reads the four registries once per connection, not once per render', async () => {
    setContext();
    const conn = state.meta.conn as ReturnType<typeof fakeConn>;
    const { result, rerender } = renderHook(() => useCasa3dHass(null));
    await waitFor(() => expect(result.current.hass).not.toBeNull());
    rerender();
    rerender();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(4);
  });

  it('without a connection or before the entities arrive there is no hass', async () => {
    setContext({ conn: null });
    const none = renderHook(() => useCasa3dHass(null));
    expect(none.result.current.hass).toBeNull();
    none.unmount();

    setContext({ entitiesLoaded: false });
    const early = renderHook(() => useCasa3dHass(null));
    await waitFor(() => expect(early.result.current.registriesLoaded).toBe(true));
    expect(early.result.current.hass).toBeNull();
  });

  it('a user that is not known is not an administrator, and refused registries are reported', async () => {
    setContext({
      haUser: null,
      conn: fakeConn(['config/device_registry/list', 'config/area_registry/list']),
    });
    const { result } = renderHook(() => useCasa3dHass(null));
    await waitFor(() => expect(result.current.hass).not.toBeNull());
    expect(result.current.hass?.user.is_admin).toBe(false);
    expect(result.current.failed.sort()).toEqual(['areas', 'devices']);
    expect(result.current.hass?.areas).toEqual({});
  });

  it('a non-administrator user keeps the registries the entity display form gives', async () => {
    setContext({ haUser: { id: 'g', name: 'Ospite', is_admin: false } });
    const { result } = renderHook(() => useCasa3dHass(null));
    await waitFor(() => expect(result.current.hass).not.toBeNull());
    expect(result.current.hass?.user).toEqual({ is_admin: false, name: 'Ospite' });
  });
});

describe('example plan', () => {
  const roomOf = (building: ReturnType<typeof buildExamplePlan>['building'], id: string) =>
    building.floors[0]?.rooms.find((room) => room.id === id);

  it('ties an area to the room of the same name, the other areas to the rooms left', () => {
    const { building, bound } = buildExamplePlan({
      areas: {
        sala: { area_id: 'sala', name: 'Sala' },
        cucina: { area_id: 'cucina', name: 'Cucina' },
        studio: { area_id: 'studio', name: 'Studio' },
      },
    });
    expect(bound).toBe(3);
    expect(roomOf(building, 'cucina')).toMatchObject({ area_id: 'cucina', name: 'Cucina' });
    // Sala and Studio fill the first rooms left, in alphabetical order
    expect(roomOf(building, 'soggiorno')).toMatchObject({ area_id: 'sala', name: 'Sala' });
    expect(roomOf(building, 'ingresso')).toMatchObject({ area_id: 'studio', name: 'Studio' });
    expect(roomOf(building, 'camera')?.area_id).toBeNull();
    expect(building.floors[0]?.rooms).toHaveLength(6);
  });

  it('lays out the devices of a tied area as pins inside its room, and skips the rest', () => {
    const { building, pins } = buildExamplePlan({
      areas: {
        sala: { area_id: 'sala', name: 'Sala' },
        cucina: { area_id: 'cucina', name: 'Cucina' },
      },
      devices: { d1: { id: 'd1', area_id: 'sala' } },
      entities: {
        'light.a': { entity_id: 'light.a', device_id: 'd1' },
        'sensor.t': { entity_id: 'sensor.t', area_id: 'sala' },
        'cover.c': { entity_id: 'cover.c', area_id: 'cucina' },
        'light.nascosta': { entity_id: 'light.nascosta', area_id: 'sala', hidden: true },
        'switch.config': { entity_id: 'switch.config', area_id: 'sala', entity_category: 'config' },
        'light.altrove': { entity_id: 'light.altrove', area_id: 'giardino' },
      },
    });
    const placements = building.floors[0]?.placements as unknown as {
      entity_id: string;
      x: number;
      z: number;
      pin?: boolean;
    }[];
    expect(pins).toBe(2);
    expect(placements.map((p) => p.entity_id).sort()).toEqual(['cover.c', 'light.a']);
    expect(placements.find((p) => p.entity_id === 'light.a')?.pin).toBe(true);
    expect(placements.find((p) => p.entity_id === 'cover.c')?.pin).toBeUndefined();
    const sala = roomOf(building, 'soggiorno');
    const xs = sala?.points.map((point) => point[0]) ?? [];
    const zs = sala?.points.map((point) => point[1]) ?? [];
    const light = placements.find((p) => p.entity_id === 'light.a');
    expect(light?.x).toBeGreaterThan(Math.min(...xs));
    expect(light?.x).toBeLessThan(Math.max(...xs));
    expect(light?.z).toBeGreaterThan(Math.min(...zs));
    expect(light?.z).toBeLessThan(Math.max(...zs));
  });

  it('caps the pins of one room', () => {
    const entities = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [
        `light.l${i}`,
        { entity_id: `light.l${i}`, area_id: 'sala' },
      ])
    );
    const { pins } = buildExamplePlan({
      areas: { sala: { area_id: 'sala', name: 'Sala' } },
      entities,
    });
    expect(pins).toBe(8);
  });

  it('without areas it is the plan as written, and every call returns a fresh copy', () => {
    const a = buildExamplePlan({ areas: {} });
    const b = buildExamplePlan({ areas: {} });
    expect(a.bound).toBe(0);
    expect(a.pins).toBe(0);
    expect(a.building).not.toBe(b.building);
    expect(a.building).toEqual(b.building);
    expect(a.building.floors[0]?.rooms.every((room) => room.area_id === null)).toBe(true);
    expect(a.building.floors[0]?.placements).toEqual([]);
  });
});

describe('Casa3dProva', () => {
  const view = () =>
    document.querySelector('fp3d-view3d') as (HTMLElement & Record<string, unknown>) | null;

  it('shows the 3D view in Light, with the heavy extras off, the example plan and the real hass', async () => {
    setContext();
    render(<Casa3dProva onClose={() => undefined} />);
    await waitFor(() => expect(view()).not.toBeNull());
    const element = view();
    expect(element?.quality).toBe('light');
    expect(element?.holograms).toBe(false);
    expect(element?.flows).toBe(false);
    expect(element?.weather).toBe(false);
    expect(element?.showEnergy).toBe(false);
    expect(element?.trail).toBe(false);
    expect(element?.cameraWall).toBe(false);
    expect((element?.hass as { language: string }).language).toBe('it');
    const rooms =
      (element?.building as ReturnType<typeof buildExamplePlan>['building']).floors[0]?.rooms ?? [];
    expect(rooms.find((room) => room.id === 'cucina')?.name).toBe('Cucina');
    expect(rooms.find((room) => room.id === 'soggiorno')?.name).toBe('Sala');
    expect(element?.floorThumbs).toBe(false);
    expect(element?.floorId).toBe('piano_terra');
    expect(screen.getByText(/Utente: amministratore/)).toBeTruthy();
    expect(screen.getByText(/2 aree, 0 piani/)).toBeTruthy();
    expect(screen.getByText(/Stanze legate ad aree: 2 di 6, 0 dispositivi/)).toBeTruthy();
  });

  it('a non-administrator user is shown as such and the view still opens', async () => {
    setContext({
      haUser: null,
      conn: fakeConn(['config/area_registry/list', 'config/device_registry/list']),
    });
    render(<Casa3dProva onClose={() => undefined} />);
    await waitFor(() => expect(view()).not.toBeNull());
    expect(screen.getByText(/Utente: non amministratore/)).toBeTruthy();
    expect(screen.getByText(/non letti: areas, devices/)).toBeTruthy();
    expect(screen.getByText(/Stanze legate ad aree: 0 di 6, 0 dispositivi/)).toBeTruthy();
  });

  it('a command the view sends is refused and listed', async () => {
    setContext();
    render(<Casa3dProva onClose={() => undefined} />);
    await waitFor(() => expect(view()).not.toBeNull());
    const hass = view()?.hass as { callService: (d: string, s: string) => Promise<unknown> };
    await act(async () => {
      await hass.callService('light', 'toggle').catch(() => undefined);
    });
    expect(screen.getByText(/Comandi rifiutati \(sola lettura\): light\.toggle/)).toBeTruthy();
  });

  it('a tap on a room opens its panel and closing it goes back', async () => {
    setContext();
    render(<Casa3dProva onClose={() => undefined} />);
    await waitFor(() => expect(view()).not.toBeNull());
    expect(document.querySelector('fp3d-room-panel')).toBeNull();

    await act(async () => {
      view()?.dispatchEvent(
        new CustomEvent('room-tap', {
          detail: { floorId: 'piano_terra', roomId: 'soggiorno' },
          bubbles: true,
        })
      );
    });
    const panel = document.querySelector('fp3d-room-panel') as
      (HTMLElement & Record<string, unknown>) | null;
    await waitFor(() => expect(panel?.room).toMatchObject({ id: 'soggiorno' }));
    expect(panel?.readOnly).toBe(false);
    expect(view()?.roomId).toBe('soggiorno');

    await act(async () => {
      panel?.dispatchEvent(new CustomEvent('close'));
    });
    expect(document.querySelector('fp3d-room-panel')).toBeNull();
    expect(view()?.roomId).toBeNull();
  });

  it('shows the error and tries again on request', async () => {
    setContext();
    loadMock.mockRejectedValueOnce(new Error('Casa 3D non è disponibile su questo server (404).'));
    render(<Casa3dProva onClose={() => undefined} />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('404');
    expect(view()).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await waitFor(() => expect(view()).not.toBeNull());
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it('waits for Home Assistant when the bundle is ready first', async () => {
    setContext({ conn: null });
    render(<Casa3dProva onClose={() => undefined} />);
    expect(await screen.findByText('In attesa di Home Assistant…')).toBeTruthy();
    expect(view()).toBeNull();
  });

  it('the button takes the person back', async () => {
    setContext();
    const onClose = vi.fn();
    render(<Casa3dProva onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Torna alla home' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
