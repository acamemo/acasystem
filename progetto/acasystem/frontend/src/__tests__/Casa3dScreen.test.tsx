import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  type RenderResult,
} from '@testing-library/react';
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  type InitialEntry,
  type NavigateFunction,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CasaScreen from '@/casa3d/CasaScreen';
import { casaOpenState, isCasaPath, readCasaState } from '@/casa3d/casaNav';
import { CASA3D_QUALITY_KEY, setCasa3dQuality } from '@/casa3d/quality';
import {
  createFakeServer,
  drawnHouse,
  exampleHouse,
  type FakeCasaServer,
} from './casa3dFakeServer';

/**
 * The house screen (ADR-0014, R1): the route `#/casa`, the exits (back, Esc, «Esci»), the side bar,
 * the sheets, the plan from the server, «Ricomincia», «Rimetti la vista» and the keyboard zoom. The
 * server is a fake with the rules of the real routes, the 3D view a stub, Home Assistant a fake.
 */

interface StubProps {
  building: Record<string, unknown>;
  revision?: number;
  floorId?: string | null;
  paused: boolean;
  quality: string;
  commandsOn?: boolean;
  onReadyChange: (ready: boolean) => void;
}
const world = vi.hoisted(() => ({
  server: null as unknown,
  props: null as unknown,
  resetView: vi.fn(),
  zoom: vi.fn(() => true),
  ha: {} as Record<string, unknown>,
}));
const server = () => world.server as FakeCasaServer;
const stub = () => world.props as StubProps;

vi.mock('@/hooks/context/HomeAssistantContext', () => ({
  useHomeAssistantMeta: () => world.ha,
  useHomeAssistantEntities: () => ({}),
}));
vi.mock('@/casa3d/planRequest', async () => {
  const fake = await import('./casa3dFakeServer');
  return { createElementPlanApi: () => fake.fakeApi(world.server as FakeCasaServer) };
});
vi.mock('@/casa3d/Casa3dVista', async () => {
  const { useEffect, useImperativeHandle } = await import('react');
  return {
    default: function Casa3dVistaStub(props: StubProps & { handleRef?: unknown }) {
      world.props = props;
      const { onReadyChange, handleRef } = props;
      useImperativeHandle(
        handleRef as never,
        () => ({ resetView: world.resetView, zoom: world.zoom }),
        []
      );
      useEffect(() => {
        onReadyChange(true);
        return () => onReadyChange(false);
      }, [onReadyChange]);
      return (
        <div
          data-testid="vista"
          data-paused={String(props.paused)}
          data-floor={String(props.floorId)}
          data-quality={props.quality}
        />
      );
    },
  };
});

let navigate: NavigateFunction;
function Probe() {
  navigate = useNavigate();
  const location = useLocation();
  const state = readCasaState(location.state);
  return (
    <p data-testid="where" data-overlay={state.overlay ?? ''} data-depth={String(state.depth)}>
      {location.pathname}
    </p>
  );
}
const onOpenSystem = vi.fn();
function Scene() {
  const location = useLocation();
  return isCasaPath(location.pathname) ? (
    <CasaScreen onOpenSystem={onOpenSystem} />
  ) : (
    <p data-testid="launcher">Launcher</p>
  );
}

const OPENED: InitialEntry[] = ['/prev', '/', { pathname: '/casa', state: casaOpenState() }];

async function openHouse(entries: InitialEntry[] = OPENED): Promise<RenderResult> {
  const result = render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Scene />
      <Probe />
    </MemoryRouter>
  );
  await settle();
  return result;
}
async function settle() {
  await act(async () => {
    await vi.dynamicImportSettled();
    await vi.advanceTimersByTimeAsync(20);
  });
}
const where = () => screen.getByTestId('where').textContent;
const overlay = () => screen.getByTestId('where').getAttribute('data-overlay');
const back = async (steps = -1) => {
  await act(async () => navigate(steps));
};
const press = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document.body, { key, ...init });
const menuButton = () => screen.getByRole('button', { name: 'Menu della casa' });
async function openMenu() {
  // a real tap focuses the button before the click
  menuButton().focus();
  fireEvent.click(menuButton());
  await settle();
}
const dialogOf = (name: string) => screen.getByRole('dialog', { name });
const choose = async (name: string) => {
  fireEvent.click(within(dialogOf('Casa 3D')).getByRole('button', { name: new RegExp(name) }));
  await settle();
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  setCasa3dQuality('light');
  localStorage.clear();
  world.server = createFakeServer({ building: drawnHouse(), revision: 3 });
  world.props = null;
  world.resetView.mockClear();
  world.zoom.mockClear();
  world.ha = {
    conn: null,
    haUser: { id: 'u', name: 'Ana', is_admin: false },
    haConfig: null,
    activeUrl: 'https://aca.test/ha',
    entitiesLoaded: true,
    haUnavailableVisible: false,
    oauthExpired: false,
    disconnectedSince: null,
  };
  onOpenSystem.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Casa 3D screen: the house at full screen', () => {
  it('is a screen with its title, the menu arrow, «Esci» and the plan of the server in the view', async () => {
    await openHouse();
    const main = screen.getByRole('main', { name: 'Casa 3D' });
    expect(main.classList.contains('casa')).toBe(true);
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'Esci' })).toBeTruthy();
    expect(screen.getByTestId('vista')).toBeTruthy();
    // the plan is the server's, in Light, and the view is not paused
    expect(stub().building).toEqual(server().building);
    expect(stub().revision).toBe(3);
    expect(stub().quality).toBe('light');
    expect(stub().paused).toBe(false);
    expect(server().requests[0]).toBe('GET /building');
    // the focus starts on the title, as in Sistema
    expect(document.activeElement?.textContent).toBe('Casa 3D');
  });

  it('shows one floor by itself when there is only one, the whole house when there are more', async () => {
    await openHouse();
    expect(screen.getByTestId('vista').getAttribute('data-floor')).toBe('null');
    cleanup();
    world.server = createFakeServer({ building: exampleHouse(), revision: 6 });
    await openHouse();
    expect(screen.getByTestId('vista').getAttribute('data-floor')).toBe('piano_terra');
  });

  it('says «Caricamento della casa…» while it reads, and «La casa non si legge» when the server is down', async () => {
    server().failWith = 503;
    await openHouse();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/La casa non si legge/);
    expect(screen.queryByTestId('vista')).toBeNull();
    server().failWith = null;
    fireEvent.click(within(alert).getByRole('button', { name: 'Riprova' }));
    await settle();
    expect(screen.getByTestId('vista')).toBeTruthy();
  });

  it('with no house drawn says so, offers the plan and builds no 3D view', async () => {
    world.server = createFakeServer();
    await openHouse();
    expect(screen.getByText('Nessuna casa disegnata')).toBeTruthy();
    expect(screen.queryByTestId('vista')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rimetti la vista' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la piantina' }));
    await settle();
    expect(where()).toBe('/casa/piantina');
    expect(screen.getByText('La piantina a quadretti è in arrivo')).toBeTruthy();
  });

  it('reads the plan again when another device saves it (the revision is looked at every 30 s)', async () => {
    await openHouse();
    expect(Object.keys(stub().building)).toContain('floors');
    const other = exampleHouse();
    server().building = other;
    server().revision = 4;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });
    await settle();
    expect(stub().building).toEqual(other);
    expect(stub().revision).toBe(4);
  });

  it('shows the connection notice while Home Assistant does not answer', async () => {
    world.ha = { ...world.ha, haUnavailableVisible: true, disconnectedSince: Date.now() - 5000 };
    await openHouse();
    expect(screen.getByText(/Home Assistant non risponde/)).toBeTruthy();
  });
});

describe('Casa 3D screen: «Rimetti la vista» and the keyboard', () => {
  it('resets the camera and is always on screen with the house', async () => {
    await openHouse();
    const reset = screen.getByRole('button', { name: 'Rimetti la vista' });
    expect((reset as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(reset);
    expect(world.resetView).toHaveBeenCalledTimes(1);
  });

  it('zooms with + and -, and not while something is open on top or in a text field', async () => {
    await openHouse();
    press('+');
    press('-');
    expect(world.zoom.mock.calls).toEqual([[1], [-1]]);
    press('=', { ctrlKey: true });
    expect(world.zoom).toHaveBeenCalledTimes(2);
    const field = document.body.appendChild(document.createElement('input'));
    fireEvent.keyDown(field, { key: '+' });
    expect(world.zoom).toHaveBeenCalledTimes(2);
    field.remove();
    await openMenu();
    press('+');
    expect(world.zoom).toHaveBeenCalledTimes(2);
  });
});

describe('Casa 3D screen: the side bar', () => {
  it('opens from the arrow with the six entries, Esplora selected, flat over the view', async () => {
    await openHouse();
    await openMenu();
    expect(overlay()).toBe('menu');
    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    const dialog = dialogOf('Casa 3D');
    const names = within(dialog)
      .getAllByRole('button')
      .map((button) => button.textContent?.trim());
    expect(names).toEqual([
      '',
      'Esplora',
      'Modifica la piantina',
      'Piani',
      'Elenco stanze',
      'QualitàLight',
      'Esci',
    ]);
    expect(
      within(dialog).getByRole('button', { name: 'Esplora' }).getAttribute('aria-current')
    ).toBe('true');
    expect(
      within(dialog)
        .getByRole('button', { name: 'Modifica la piantina' })
        .getAttribute('aria-current')
    ).toBeNull();
    // the first control takes the focus
    expect(document.activeElement?.textContent).toBe('Esplora');
  });

  it('closes with Esc, and gives the focus back to the arrow', async () => {
    await openHouse();
    await openMenu();
    press('Escape');
    await settle();
    expect(overlay()).toBe('');
    expect(where()).toBe('/casa');
    expect(document.activeElement).toBe(menuButton());
  });

  it('closes with a touch on the background and with its close button', async () => {
    await openHouse();
    await openMenu();
    const dialog = dialogOf('Casa 3D');
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    await settle();
    expect(overlay()).toBe('');
    await openMenu();
    fireEvent.click(within(dialogOf('Casa 3D')).getByRole('button', { name: 'Chiudi il menu' }));
    await settle();
    expect(overlay()).toBe('');
    expect(where()).toBe('/casa');
  });

  it('«Esplora» closes it, being the screen already', async () => {
    await openHouse();
    await openMenu();
    await choose('^Esplora');
    expect(overlay()).toBe('');
    expect(where()).toBe('/casa');
  });
});

describe('Casa 3D screen: the exits and the history', () => {
  it('the back button closes what is open on top first, and the house only after', async () => {
    await openHouse();
    await openMenu();
    expect(overlay()).toBe('menu');
    await back();
    expect(overlay()).toBe('');
    expect(where()).toBe('/casa');
    expect(screen.getByTestId('vista')).toBeTruthy();
    await back();
    expect(where()).toBe('/');
    expect(screen.getByTestId('launcher')).toBeTruthy();
    // the view is released with the house
    expect(screen.queryByTestId('vista')).toBeNull();
  });

  it('«Esci» leaves with one step and no entry of the house is left behind', async () => {
    await openHouse();
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    await settle();
    expect(where()).toBe('/');
    // one more back is the screen before the launcher: nothing of the house stayed in between
    await back();
    expect(where()).toBe('/prev');
  });

  it('«Esci» from the menu and from a sheet takes off the entries of the overlay too', async () => {
    await openHouse();
    await openMenu();
    await choose('^Esci');
    expect(where()).toBe('/');
    await back();
    expect(where()).toBe('/prev');
    cleanup();

    await openHouse();
    await openMenu();
    await choose('Piani');
    expect(overlay()).toBe('piani');
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    await settle();
    expect(where()).toBe('/');
    await back();
    expect(where()).toBe('/prev');
  });

  it('a house opened by its address (nothing of ours below) is replaced by the launcher', async () => {
    await openHouse(['/casa']);
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    await settle();
    expect(where()).toBe('/');
    expect(screen.getByTestId('launcher')).toBeTruthy();
  });

  it('Esc leaves the house when nothing is open, and is marked as handled', async () => {
    await openHouse();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    await settle();
    expect(event.defaultPrevented).toBe(true);
    expect(where()).toBe('/');
  });

  it('Esc closes the sheet that is open and keeps the house', async () => {
    await openHouse();
    await openMenu();
    await choose('Elenco stanze');
    expect(overlay()).toBe('stanze');
    press('Escape');
    await settle();
    expect(overlay()).toBe('');
    expect(where()).toBe('/casa');
    // the next Esc is the house's
    press('Escape');
    await settle();
    expect(where()).toBe('/');
  });

  it('Delete and Ctrl+Z pressed in the screen never reach the launcher, and do not leave', async () => {
    await openHouse();
    const reached = vi.fn();
    window.addEventListener('keydown', reached);
    const main = screen.getByRole('main');
    fireEvent.keyDown(main, { key: 'Delete' });
    fireEvent.keyDown(main, { key: 'z', ctrlKey: true });
    window.removeEventListener('keydown', reached);
    expect(reached).not.toHaveBeenCalled();
    expect(where()).toBe('/casa');
  });
});

describe('Casa 3D screen: the plan (R2 will draw on it)', () => {
  it('«Modifica la piantina» opens the place of the editor; the view stays, hidden, for the way back', async () => {
    await openHouse();
    await openMenu();
    await choose('Modifica la piantina');
    expect(where()).toBe('/casa/piantina');
    expect(overlay()).toBe('');
    expect(screen.getByText('La piantina a quadretti è in arrivo')).toBeTruthy();
    expect(screen.getByTestId('vista').getAttribute('data-paused')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Rimetti la vista' })).toBeNull();
    // "Torna a Esplora" takes the plan entry off: the house is below it
    fireEvent.click(screen.getByRole('button', { name: 'Torna a Esplora' }));
    await settle();
    expect(where()).toBe('/casa');
    expect(screen.getByTestId('vista').getAttribute('data-paused')).toBe('false');
  });

  it('the back button leaves the plan for the house, and the house for the launcher', async () => {
    await openHouse();
    await openMenu();
    await choose('Modifica la piantina');
    await back();
    expect(where()).toBe('/casa');
    await back();
    expect(where()).toBe('/');
  });

  it('Esc leaves the plan for the house first, «Esci» leaves everything at once', async () => {
    await openHouse();
    await openMenu();
    await choose('Modifica la piantina');
    press('Escape');
    await settle();
    expect(where()).toBe('/casa');
    await openMenu();
    await choose('Modifica la piantina');
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    await settle();
    expect(where()).toBe('/');
    await back();
    expect(where()).toBe('/prev');
  });

  it('from the plan the menu reaches Esplora again and marks the plan as current', async () => {
    await openHouse();
    await openMenu();
    await choose('Modifica la piantina');
    await openMenu();
    const dialog = dialogOf('Casa 3D');
    expect(
      within(dialog)
        .getByRole('button', { name: 'Modifica la piantina' })
        .getAttribute('aria-current')
    ).toBe('true');
    await choose('^Esplora');
    expect(where()).toBe('/casa');
    expect(overlay()).toBe('');
    // two back steps go to the launcher and the screen before: no entry of the plan is left
    await back();
    expect(where()).toBe('/');
  });

  it('a plan reached by its address goes to the house with "Torna a Esplora", replacing the entry', async () => {
    await openHouse(['/casa/piantina']);
    expect(screen.getByText('La piantina a quadretti è in arrivo')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Torna a Esplora' }));
    await settle();
    expect(where()).toBe('/casa');
  });
});

describe('Casa 3D screen: floors, rooms and quality', () => {
  it('«Piani» lists the floors and the whole house, and the choice goes to the view', async () => {
    await openHouse();
    await openMenu();
    await choose('Piani');
    expect(overlay()).toBe('piani');
    const sheet = dialogOf('Piani');
    expect(
      within(sheet).getByRole('button', { name: 'Tutta la casa' }).getAttribute('aria-pressed')
    ).toBe('true');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Primo piano' }));
    await settle();
    expect(overlay()).toBe('');
    expect(screen.getByTestId('vista').getAttribute('data-floor')).toBe('piano_2');
    await openMenu();
    await choose('Piani');
    expect(
      within(dialogOf('Piani'))
        .getByRole('button', { name: 'Primo piano' })
        .getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('«Elenco stanze» lists the rooms by floor, as text', async () => {
    await openHouse();
    await openMenu();
    await choose('Elenco stanze');
    const sheet = dialogOf('Elenco stanze');
    expect(within(sheet).getByRole('heading', { name: 'Piano terra' })).toBeTruthy();
    expect(within(sheet).getByRole('heading', { name: 'Primo piano' })).toBeTruthy();
    expect(
      within(sheet)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['Sala', 'Studio', 'Camera']);
  });

  it('«Qualità» raises the level for the device and the view does not need to be made again', async () => {
    await openHouse();
    await openMenu();
    await choose('Qualità');
    expect(overlay()).toBe('qualita');
    fireEvent.click(
      within(dialogOf('Qualità della vista 3D')).getByRole('button', { name: 'Medium' })
    );
    expect(stub().quality).toBe('medium');
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('medium');
    press('Escape');
    await settle();
    await openMenu();
    expect(within(dialogOf('Casa 3D')).getByRole('button', { name: /Qualità/ }).textContent).toBe(
      'QualitàMedium'
    );
  });
});

describe('Casa 3D screen: «Ricomincia»', () => {
  beforeEach(() => {
    world.server = createFakeServer({ building: exampleHouse(), revision: 6 });
  });

  it('is offered only for the example house the T6 test left, not for a house somebody drew', async () => {
    await openHouse();
    expect(screen.getByText(/casa d’esempio rimasta dalle prove/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ricomincia' })).toBeTruthy();
    cleanup();
    world.server = createFakeServer({ building: drawnHouse(), revision: 6 });
    await openHouse();
    expect(screen.queryByRole('button', { name: 'Ricomincia' })).toBeNull();
  });

  it('asks first; «Annulla» changes nothing', async () => {
    await openHouse();
    fireEvent.click(screen.getByRole('button', { name: 'Ricomincia' }));
    await settle();
    expect(overlay()).toBe('ricomincia');
    const question = dialogOf('Ricominciare da una casa vuota?');
    expect(question).toBeTruthy();
    fireEvent.click(within(question).getByRole('button', { name: 'Annulla' }));
    await settle();
    expect(overlay()).toBe('');
    expect(server().revision).toBe(6);
    expect(server().requests.some((request) => request.startsWith('PUT'))).toBe(false);
  });

  it('on a yes keeps a restore point, saves an empty house on the revision it read and shows it', async () => {
    await openHouse();
    fireEvent.click(screen.getByRole('button', { name: 'Ricomincia' }));
    await settle();
    fireEvent.click(
      within(dialogOf('Ricominciare da una casa vuota?')).getByRole('button', {
        name: 'Ricomincia',
      })
    );
    await settle();
    expect(server().snapshots).toBe(1);
    expect(server().revision).toBe(7);
    expect(server().building).toMatchObject({ version: 1, floors: [] });
    // the restore point is asked before the save
    const order = server().requests.filter((request) => request !== 'GET /building');
    expect(order.slice(0, 2)).toEqual(['POST /history', 'PUT /building']);
    expect(overlay()).toBe('');
    expect(screen.getByText('Nessuna casa disegnata')).toBeTruthy();
    expect(screen.queryByTestId('vista')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ricomincia' })).toBeNull();
  });

  it('does not overwrite a house somebody saved meanwhile: it says so and shows the server’s', async () => {
    await openHouse();
    server().beforeSave = () => {
      // another device saves between the reading and the save
      server().building = drawnHouse();
      server().revision = 7;
      server().beforeSave = null;
    };
    fireEvent.click(screen.getByRole('button', { name: 'Ricomincia' }));
    await settle();
    fireEvent.click(
      within(dialogOf('Ricominciare da una casa vuota?')).getByRole('button', {
        name: 'Ricomincia',
      })
    );
    await settle();
    expect(screen.getByRole('alert').textContent).toMatch(/cambiata da un altro dispositivo/);
    expect(server().building).toEqual(drawnHouse());
    expect(server().revision).toBe(7);
    // the house on screen is the other device's
    expect(Object.keys(stub().building)).toContain('floors');
  });

  it('says what went wrong when the server refuses, and leaves the house as it is', async () => {
    await openHouse();
    fireEvent.click(screen.getByRole('button', { name: 'Ricomincia' }));
    await settle();
    server().failWith = 503;
    fireEvent.click(
      within(dialogOf('Ricominciare da una casa vuota?')).getByRole('button', {
        name: 'Ricomincia',
      })
    );
    await settle();
    expect(screen.getByRole('alert').textContent).toMatch(/Errore del server/);
    expect(server().revision).toBe(6);
  });
});

describe('Casa 3D screen: the commands stay off (R7)', () => {
  it('asks for none and hands the view no barrier open outside Esplora', async () => {
    await openHouse();
    // in Esplora, with the view up and nothing open, the screen's rule is satisfied...
    expect(stub().commandsOn).toBe(true);
    // ...with the menu open it is not
    await openMenu();
    expect(stub().commandsOn).toBe(false);
    press('Escape');
    await settle();
    expect(stub().commandsOn).toBe(true);
    await openMenu();
    await choose('Modifica la piantina');
    expect(stub().commandsOn).toBe(false);
  });
});
