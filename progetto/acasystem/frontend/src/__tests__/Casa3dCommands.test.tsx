import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntityMap } from '@/@types/ha';
import type { WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { Casa3dReadOnlyError } from '@/casa3d/haShim';
import type { Casa3dHass } from '@/casa3d/contract';
import { COMMAND_GAP_MS } from '@/casa3d/commandPath';
import CasaScreen from '@/casa3d/CasaScreen';
import { casaOpenState, isCasaPath } from '@/casa3d/casaNav';
import { createFakeServer, drawnHouse } from './casa3dFakeServer';

/**
 * The commands of the Casa 3D, end to end on the house screen (ADR-0014, T7 moved to the screen in
 * R1): the real screen, the real view component and the real adapter, with a stand-in for the 3D
 * element, for Home Assistant and for the server. «callService» below is the call of the app (the
 * one the widgets use). The rule of the revised plan: it is reached, through the list, only in
 * Esplora (`#/casa`), with the view up and nothing open on top of it; not from the menu, a sheet, a
 * question, the plan (`#/casa/piantina`), a view that is not up, or a house that was left. And the
 * whole thing is off while the switch of commandSwitch.ts is (until R7): the last describe.
 */

const ha = vi.hoisted(() => ({
  entities: {} as Record<string, unknown>,
  meta: {} as Record<string, unknown>,
  server: null as unknown,
}));

vi.mock('@/hooks/context/HomeAssistantContext', () => ({
  useHomeAssistantEntities: () => ha.entities,
  useHomeAssistantMeta: () => ha.meta,
}));
vi.mock('@/casa3d/useCasa3dBundle', () => ({
  useCasa3dBundle: () => ({ status: 'ready', loaded: { manifest: { version: 'prova' } } }),
}));
vi.mock('@/casa3d/planRequest', async () => {
  const fake = await import('./casa3dFakeServer');
  return { createElementPlanApi: () => fake.fakeApi(ha.server as never) };
});

// A stand-in for the Lit element: it has the properties React sets, a canvas in its shadow root
// (that is how the screen knows the view is up) and a pin to touch.
const VIEW_PROPERTIES = [
  'quality',
  'statsEvents',
  'holograms',
  'flows',
  'showEnergy',
  'weather',
  'trail',
  'cameraWall',
  'director',
  'voice',
  'floorThumbs',
  'clean',
  'cleanButton',
  'hass',
  'building',
  'packs',
  'floorId',
  'roomId',
  'panelOpen',
];
class FakeView extends HTMLElement {
  constructor() {
    super();
    for (const name of VIEW_PROPERTIES)
      Object.defineProperty(this, name, { value: undefined, writable: true });
    const root = this.attachShadow({ mode: 'open' });
    root.append(document.createElement('canvas'));
    const pin = document.createElement('button');
    pin.className = 'fp3d-dev';
    root.append(pin);
  }
}
if (!customElements.get('fp3d-view3d')) customElements.define('fp3d-view3d', FakeView);

/** The devices of the test: the lock is locked unless said otherwise. */
const world = (lock = 'locked'): EntityMap =>
  fixtureEntities([
    fixtureEntity('light.sala', 'off', { friendly_name: 'Lampada sala' }),
    fixtureEntity('light.cucina', 'off', { friendly_name: 'Plafoniera cucina' }),
    fixtureEntity('lock.ingresso', lock, {
      friendly_name: 'Porta d’ingresso',
      code_format: 'number',
    }),
    fixtureEntity('climate.termostato', 'heat', { friendly_name: 'Termostato' }),
  ]);

let entities: EntityMap;
let callService: ReturnType<typeof vi.fn>;
let navigate: NavigateFunction;

function runtimeOf(map: EntityMap): WidgetRuntime {
  return createFixtureRuntime({ entities: map, callService: callService as never });
}

function Scene({ map = entities, children }: { map?: EntityMap; children?: ReactNode }) {
  const location = useLocation();
  navigate = useNavigate();
  return (
    <WidgetRuntimeProvider value={runtimeOf(map)}>
      {isCasaPath(location.pathname) ? (
        <CasaScreen onOpenSystem={() => undefined} />
      ) : (
        <p data-testid="launcher">Launcher</p>
      )}
      {children}
    </WidgetRuntimeProvider>
  );
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const viewEl = () =>
  document.querySelector('fp3d-view3d') as (HTMLElement & { hass: Casa3dHass }) | null;
const hass = () => viewEl()!.hass;

/** The house on screen, the view up, in Esplora. */
async function openHouse() {
  const view = render(
    <MemoryRouter
      initialEntries={['/', { pathname: '/casa', state: casaOpenState() }]}
      initialIndex={1}
    >
      <Scene />
    </MemoryRouter>
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  await advance(800);
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  await advance(100);
  expect(viewEl()).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Rimetti la vista' }).hasAttribute('disabled')).toBe(
    false
  );
  return view;
}

async function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Menu della casa' }));
  await advance(20);
}

/** The view asks for a service the way its pins, its menu and its swipes do. */
const toggleSala = () => hass().callService('light', 'toggle', { entity_id: 'light.sala' });

/** Asks, and returns whether the app's call was reached by it. */
async function reaches(call: () => Promise<unknown>): Promise<boolean> {
  const before = callService.mock.calls.length;
  await act(async () => {
    await call().catch(() => undefined);
    await vi.advanceTimersByTimeAsync(COMMAND_GAP_MS + 20);
  });
  return callService.mock.calls.length > before;
}

beforeEach(() => {
  vi.useFakeTimers();
  // The switch of the commands is off by default (commandSwitch.ts): this file tests the barriers
  // and the path behind it, so it is on here; the last describe tests it off.
  vi.stubEnv('VITE_CASA3D_COMMANDS', 'on');
  entities = world();
  callService = vi.fn(() => Promise.resolve());
  ha.entities = entities;
  ha.server = createFakeServer({ building: drawnHouse(), revision: 2 });
  ha.meta = {
    conn: { sendMessagePromise: () => Promise.resolve([]) },
    haUser: { id: 'ana', name: 'Ana', is_admin: false },
    haConfig: null,
    activeUrl: 'https://aca.test/ha',
    entitiesLoaded: true,
    haUnavailableVisible: false,
    oauthExpired: false,
    disconnectedSince: null,
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('Casa 3D commands: nothing is sent unless the barrier is open', () => {
  it('while the view is not up there is nothing to call', async () => {
    render(
      <MemoryRouter
        initialEntries={['/', { pathname: '/casa', state: casaOpenState() }]}
        initialIndex={1}
      >
        <Scene />
      </MemoryRouter>
    );
    await advance(2000);
    expect(callService).not.toHaveBeenCalled();
  });

  it('with the menu open the view refuses every kind of command', async () => {
    await openHouse();
    await openMenu();
    for (const call of [
      toggleSala,
      () => hass().callService('light', 'turn_on', { entity_id: 'light.sala', brightness_pct: 50 }),
      () =>
        hass().callService('cover', 'set_cover_position', { entity_id: 'cover.x', position: 10 }),
      () => hass().callService('lock', 'unlock', { entity_id: 'lock.ingresso' }),
      () => hass().callService('homeassistant', 'turn_off', { entity_id: ['light.sala'] }),
      () => hass().callService('light', 'toggle', { entity_id: 'light.sala' }, { ask: true }),
    ]) {
      await expect(call()).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    }
    expect(callService).not.toHaveBeenCalled();
    // and the view is a picture for TalkBack, not a group of buttons
    expect(viewEl()?.getAttribute('role')).toBe('img');
  });

  it('closing the menu opens the barrier again, opening a sheet shuts it', async () => {
    await openHouse();
    await openMenu();
    fireEvent.click(screen.getByRole('button', { name: /^Elenco stanze/ }));
    await advance(20);
    expect(await reaches(toggleSala)).toBe(false);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await advance(20);
    expect(await reaches(toggleSala)).toBe(true);
  });

  it('the plan (#/casa/piantina) sends nothing, not even with the view kept hidden behind it', async () => {
    await openHouse();
    await act(async () =>
      navigate('/casa/piantina', { state: { casa: { depth: 2, fromHouse: true } } })
    );
    await advance(20);
    expect(screen.getByText('La piantina a quadretti è in arrivo')).toBeTruthy();
    await expect(toggleSala()).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    expect(callService).not.toHaveBeenCalled();
    // back in Esplora the barrier opens again
    await act(async () => navigate(-1));
    await advance(COMMAND_GAP_MS + 20);
    expect(await reaches(toggleSala)).toBe(true);
  });

  it('leaving the house shuts the barrier at once, for a view that still holds the old object', async () => {
    await openHouse();
    const old = hass();
    expect(
      await reaches(() => old.callService('light', 'toggle', { entity_id: 'light.sala' }))
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    await advance(20);
    expect(screen.getByTestId('launcher')).toBeTruthy();
    await expect(
      old.callService('light', 'toggle', { entity_id: 'light.cucina' })
    ).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    expect(callService).toHaveBeenCalledTimes(1);
  });

  it('never saves the plan from the view: the adapter refuses the save', async () => {
    await openHouse();
    await expect(
      hass().callWS({ type: 'casa3d/building/save', building: { version: 1, floors: [] } })
    ).rejects.toBeTruthy();
    const server = ha.server as { requests: string[] };
    expect(server.requests.some((request) => request.startsWith('PUT'))).toBe(false);
  });
});

describe('Casa 3D commands: in Esplora', () => {
  it('a tap on a lamp reaches the app’s call once, through the list', async () => {
    await openHouse();
    expect(await reaches(toggleSala)).toBe(true);
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.sala' });
  });

  it('the view is a group of buttons for TalkBack in Esplora', async () => {
    await openHouse();
    expect(viewEl()?.getAttribute('role')).toBe('group');
    expect(viewEl()?.getAttribute('aria-label')).toMatch(/dispositivo è un pulsante/);
  });

  it('events of the view reach it (a pin can be touched)', async () => {
    await openHouse();
    const seen: string[] = [];
    const host = viewEl()!;
    host.addEventListener('click', () => seen.push('click'));
    host.addEventListener('pointerdown', () => seen.push('pointerdown'));
    const pin = host.shadowRoot!.querySelector('.fp3d-dev') as HTMLElement;
    pin.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true }));
    pin.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(seen).toEqual(['pointerdown', 'click']);
  });

  it('refuses a service that is not on the list, and says so', async () => {
    await openHouse();
    await act(async () => {
      await hass()
        .callService('climate', 'set_temperature', {
          entity_id: 'climate.termostato',
          temperature: 30,
        })
        .catch(() => undefined);
    });
    expect(callService).not.toHaveBeenCalled();
    expect(document.body.textContent).toMatch(/Questo comando non è abilitato in Casa 3D/);
  });

  it('takes a double tap for one command, and a second one after the limit for another', async () => {
    await openHouse();
    await act(async () => {
      void toggleSala();
      await vi.advanceTimersByTimeAsync(90);
      void toggleSala();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(callService).toHaveBeenCalledTimes(1);
    await advance(COMMAND_GAP_MS);
    await act(async () => {
      void toggleSala();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(callService).toHaveBeenCalledTimes(2);
  });

  it('asks before a lock opens, takes the code, sends it, and says when it is done', async () => {
    const view = await openHouse();
    let call!: Promise<unknown>;
    await act(async () => {
      call = hass().callService('lock', 'unlock', { entity_id: 'lock.ingresso' });
      call.catch(() => undefined);
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(callService).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Sbloccare «Porta d’ingresso»?' })).toBeTruthy();
    // this lock wants a code, so the field has the focus
    const field = screen.getByLabelText('Codice della serratura');
    expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: '4821' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sblocca' }));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', {
      entity_id: 'lock.ingresso',
      code: '4821',
    });
    // the lock shows the state: «fatto», said in words for TalkBack
    entities = world('unlocked');
    ha.entities = entities;
    view.rerender(
      <MemoryRouter
        initialEntries={['/', { pathname: '/casa', state: casaOpenState() }]}
        initialIndex={1}
      >
        <Scene map={entities} />
      </MemoryRouter>
    );
    await advance(50);
    const live = document.querySelector('.c3d-vista [role="status"].sr-only');
    expect(live?.textContent).toBe('Sblocca Porta d’ingresso: fatto');
  });

  it('sends nothing after a no', async () => {
    await openHouse();
    let call!: Promise<unknown>;
    await act(async () => {
      call = hass().callService('lock', 'unlock', { entity_id: 'lock.ingresso' });
      call.catch(() => undefined);
      await vi.advanceTimersByTimeAsync(10);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
      await vi.advanceTimersByTimeAsync(10);
    });
    await expect(call).rejects.toMatchObject({ code: 'cancelled' });
    expect(callService).not.toHaveBeenCalled();
    const live = document.querySelector('.c3d-vista [role="status"].sr-only');
    expect(live?.textContent).toBe('Sblocca Porta d’ingresso: annullato');
  });

  it('leaving the house with the question on screen is a no: nothing is sent', async () => {
    await openHouse();
    let call!: Promise<unknown>;
    await act(async () => {
      call = hass().callService('lock', 'unlock', { entity_id: 'lock.ingresso' });
      call.catch(() => undefined);
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.queryByRole('heading', { name: /Sbloccare/ })).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(screen.getByTestId('launcher')).toBeTruthy();
    await expect(call).rejects.toBeTruthy();
    expect(callService).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: /Sbloccare/ })).toBeNull();
  });

  it('says in words, for TalkBack, that Home Assistant refused', async () => {
    await openHouse();
    callService.mockImplementation(() => Promise.reject(new Error('non disponibile')));
    await act(async () => {
      await toggleSala().catch(() => undefined);
      await vi.advanceTimersByTimeAsync(10);
    });
    const live = document.querySelector('.c3d-vista [role="status"].sr-only');
    expect(live?.textContent).toBe(
      'Cambia Lampada sala: Home Assistant ha rifiutato il comando (non disponibile)'
    );
  });
});

describe('Casa 3D commands: the switch is off (read-only until R7)', () => {
  it('in Esplora, with a connection, no command reaches the app’s call and the view says so', async () => {
    vi.stubEnv('VITE_CASA3D_COMMANDS', '');
    await openHouse();
    for (const call of [
      toggleSala,
      () => hass().callService('light', 'turn_on', { entity_id: 'light.sala', brightness_pct: 50 }),
      () => hass().callService('lock', 'unlock', { entity_id: 'lock.ingresso' }),
    ]) {
      await expect(call()).rejects.toBeInstanceOf(Casa3dReadOnlyError);
    }
    await advance(COMMAND_GAP_MS + 20);
    expect(callService).not.toHaveBeenCalled();
    // The screen does not promise what it does not do.
    expect(viewEl()?.getAttribute('aria-label')).toMatch(/comandi non sono ancora abilitati/);
  });
});
