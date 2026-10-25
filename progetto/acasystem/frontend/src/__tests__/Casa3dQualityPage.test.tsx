import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Casa3dContextEvent } from '@/casa3d/contract';
import CasaScreen from '@/casa3d/CasaScreen';
import { casaOpenState, isCasaPath } from '@/casa3d/casaNav';
import { RESTORE_WAIT_MS } from '@/casa3d/contextGuard';
import { CASA3D_QUALITY_KEY, setCasa3dQuality } from '@/casa3d/quality';
import { createFakeServer, drawnHouse } from './casa3dFakeServer';

/**
 * The quality choice and the lost drawing context on the house screen (ADR-0014, T5, moved to the
 * screen in R1). The view is a stub that shows what the screen hands it and lets the test play the
 * part of the real view: the context lost, back, not made; a slow drawing.
 */

interface StubProps {
  paused: boolean;
  quality: string;
  generation: number;
  commandsOn?: boolean;
  onReadyChange: (ready: boolean) => void;
  onContextState: (event: Casa3dContextEvent) => void;
  onSlow: () => void;
}
const live = vi.hoisted(() => ({
  props: null as unknown,
  made: 0,
  alive: 0,
  server: null as unknown,
}));
const stub = () => live.props as StubProps;

vi.mock('@/hooks/context/HomeAssistantContext', () => ({
  useHomeAssistantMeta: () => ({
    haUnavailableVisible: false,
    oauthExpired: false,
    disconnectedSince: null,
  }),
  useHomeAssistantEntities: () => ({}),
}));
vi.mock('@/casa3d/planRequest', async () => {
  const fake = await import('./casa3dFakeServer');
  return { createElementPlanApi: () => fake.fakeApi(live.server as never) };
});
vi.mock('@/casa3d/Casa3dVista', async () => {
  const { useEffect } = await import('react');
  return {
    default: function Casa3dVistaStub(props: StubProps) {
      live.props = props;
      const { onReadyChange, generation } = props;
      useEffect(() => {
        live.made += 1;
        live.alive += 1;
        onReadyChange(true);
        return () => {
          live.alive -= 1;
          onReadyChange(false);
        };
      }, [onReadyChange, generation]);
      return (
        <div data-testid="vista" data-quality={props.quality} data-generation={props.generation} />
      );
    },
  };
});

let navigate: NavigateFunction;
function Scene() {
  const location = useLocation();
  navigate = useNavigate();
  return isCasaPath(location.pathname) ? (
    <CasaScreen onOpenSystem={() => undefined} />
  ) : (
    <p data-testid="launcher">Launcher</p>
  );
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
const vista = () => screen.getByTestId('vista');
const layerReady = (container: HTMLElement) =>
  container.querySelector('.casa__layer')?.getAttribute('data-ready');

async function openHouse() {
  const result = render(
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
  await advance(50);
  return result;
}
/** The quality sheet of the side bar. */
async function openQualitySheet() {
  screen.getByRole('button', { name: 'Menu della casa' }).focus();
  fireEvent.click(screen.getByRole('button', { name: 'Menu della casa' }));
  await advance(10);
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Casa 3D' })).getByRole('button', {
      name: /^Qualità/,
    })
  );
  await advance(10);
  return screen.getByRole('dialog', { name: 'Qualità della vista 3D' });
}

describe('Casa 3D screen: quality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    setCasa3dQuality('light');
    localStorage.clear();
    live.server = createFakeServer({ building: drawnHouse(), revision: 2 });
    live.props = null;
    live.made = 0;
    live.alive = 0;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('starts in Light on a device that never chose, and the menu says so', async () => {
    await openHouse();
    expect(vista().getAttribute('data-quality')).toBe('light');
    const sheet = await openQualitySheet();
    expect(within(sheet).getByRole('button', { name: 'Light' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
  });

  it('starts in the level saved for this device', async () => {
    setCasa3dQuality('medium');
    await openHouse();
    expect(vista().getAttribute('data-quality')).toBe('medium');
  });

  it('the sheet raises the level, keeps it for the device and does not make the view again', async () => {
    await openHouse();
    const sheet = await openQualitySheet();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Medium' }));
    expect(vista().getAttribute('data-quality')).toBe('medium');
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('medium');
    expect(live.made).toBe(1);
  });

  it('the sheet goes back to Light', async () => {
    setCasa3dQuality('high');
    await openHouse();
    const sheet = await openQualitySheet();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Light' }));
    expect(vista().getAttribute('data-quality')).toBe('light');
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('light');
  });

  it('shows the picture and a message when the context is lost, and the view again when it comes back', async () => {
    const { container } = await openHouse();
    expect(layerReady(container)).toBe('true');
    act(() => stub().onContextState({ state: 'lost' }));
    expect(layerReady(container)).toBe('false');
    expect(screen.getByText(/La vista 3D si è interrotta\. Provo a ripristinarla/)).toBeTruthy();
    // the commands are shut while the view is not up
    expect(stub().commandsOn).toBe(false);
    await advance(1200);
    act(() => stub().onContextState({ state: 'restored' }));
    expect(layerReady(container)).toBe('true');
    expect(screen.queryByText(/Provo a ripristinarla/)).toBeNull();
    await advance(RESTORE_WAIT_MS * 2);
    expect(vista().getAttribute('data-generation')).toBe('0');
    expect(live.made).toBe(1);
  });

  it('makes the view again in Light when the context does not come back, whatever the saved level', async () => {
    setCasa3dQuality('high');
    await openHouse();
    expect(vista().getAttribute('data-quality')).toBe('high');
    act(() => stub().onContextState({ state: 'lost' }));
    await advance(RESTORE_WAIT_MS + 100);
    expect(vista().getAttribute('data-generation')).toBe('1');
    expect(vista().getAttribute('data-quality')).toBe('light');
    expect(live.made).toBe(2);
    // the saved level is not touched; the sheet explains the return to Light
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('high');
    const sheet = await openQualitySheet();
    expect(screen.getByText(/La vista è tornata a Light dopo un’interruzione/)).toBeTruthy();
    // choosing a level lifts it
    fireEvent.click(within(sheet).getByRole('button', { name: 'Medium' }));
    expect(vista().getAttribute('data-quality')).toBe('medium');
  });

  it('a level chosen elsewhere (Sistema) also lifts the Light that followed a loss', async () => {
    setCasa3dQuality('high');
    await openHouse();
    act(() => stub().onContextState({ state: 'lost' }));
    await advance(RESTORE_WAIT_MS + 100);
    expect(vista().getAttribute('data-quality')).toBe('light');
    act(() => setCasa3dQuality('medium'));
    expect(vista().getAttribute('data-quality')).toBe('medium');
  });

  it('does not make the view again while the plan is open, and does when Esplora is back', async () => {
    setCasa3dQuality('high');
    await openHouse();
    act(() => stub().onContextState({ state: 'lost' }));
    await act(async () =>
      navigate('/casa/piantina', { state: { casa: { depth: 2, fromHouse: true } } })
    );
    await advance(RESTORE_WAIT_MS * 3);
    expect(live.made).toBe(1);
    await act(async () => navigate(-1));
    await advance(RESTORE_WAIT_MS + 200);
    expect(live.made).toBe(2);
  });

  it('closing the house frees the view, and the next opening starts clean: a first loss is a first', async () => {
    await openHouse();
    act(() => stub().onContextState({ state: 'lost' }));
    await advance(RESTORE_WAIT_MS + 100);
    expect(live.made).toBe(2);
    cleanup();
    expect(live.alive).toBe(0);
    await openHouse();
    expect(live.made).toBe(3);
    expect(screen.queryByText(/Provo a ripristinarla/)).toBeNull();
    act(() => stub().onContextState({ state: 'lost' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/Provo a ripristinarla/)).toBeTruthy();
  });

  it('recovers from three losses in a row, each one given back by the browser', async () => {
    const { container } = await openHouse();
    for (let i = 0; i < 3; i += 1) {
      act(() => stub().onContextState({ state: 'lost' }));
      expect(layerReady(container)).toBe('false');
      await advance(800);
      act(() => stub().onContextState({ state: 'restored' }));
      expect(layerReady(container)).toBe('true');
    }
    await advance(RESTORE_WAIT_MS * 2);
    expect(vista().getAttribute('data-generation')).toBe('0');
    expect(live.made).toBe(1);
  });

  it('keeps the still picture after a loss that follows a new view, with Riprova and no view', async () => {
    await openHouse();
    act(() => stub().onContextState({ state: 'lost' }));
    await advance(RESTORE_WAIT_MS + 100);
    act(() => stub().onContextState({ state: 'lost' }));
    expect(screen.queryByTestId('vista')).toBeNull();
    expect(live.alive).toBe(0);
    expect(screen.getByRole('alert').textContent).toMatch(/si è interrotta di nuovo e resta ferma/);
    // the room list stays at hand, in the bar
    expect(screen.getByRole('button', { name: 'Menu della casa' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rimetti la vista' }).hasAttribute('disabled')).toBe(
      true
    );
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await advance(10);
    expect(screen.getByTestId('vista').getAttribute('data-generation')).toBe('2');
    expect(screen.getByTestId('vista').getAttribute('data-quality')).toBe('light');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a view that cannot be made leaves the picture and the list, and says why', async () => {
    await openHouse();
    act(() => stub().onContextState({ state: 'failed' }));
    expect(screen.queryByTestId('vista')).toBeNull();
    expect(screen.getByRole('alert').textContent).toMatch(/non riesce a mostrare la vista 3D/);
    // the still picture of the plan is on screen instead
    expect(document.querySelector('svg.c3d-plan')).not.toBeNull();
  });

  it('a view that fails to load is told apart from one with no 3D, and Riprova tries again', async () => {
    await openHouse();
    act(() => stub().onContextState({ state: 'error' }));
    expect(screen.getByRole('alert').textContent).toMatch(/non si è caricata/);
    expect(screen.getByRole('alert').textContent).not.toMatch(/non riesce a mostrare/);
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await advance(10);
    expect(screen.getByTestId('vista').getAttribute('data-generation')).toBe('1');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('offers Light when the drawing stays slow above Light, and takes the offer away on Ignora', async () => {
    setCasa3dQuality('medium');
    await openHouse();
    act(() => stub().onSlow());
    expect(screen.getByText(/Il disegno è lento a questo livello/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ignora' }));
    expect(screen.queryByText(/Il disegno è lento/)).toBeNull();
    expect(vista().getAttribute('data-quality')).toBe('medium');
  });

  it('goes to Light on the offer and keeps it', async () => {
    setCasa3dQuality('high');
    await openHouse();
    act(() => stub().onSlow());
    fireEvent.click(screen.getByRole('button', { name: 'Passa a Light' }));
    expect(vista().getAttribute('data-quality')).toBe('light');
    expect(localStorage.getItem(CASA3D_QUALITY_KEY)).toBe('light');
    expect(screen.queryByText(/Il disegno è lento/)).toBeNull();
  });

  it('does not offer Light where Light already is', async () => {
    await openHouse();
    act(() => stub().onSlow());
    expect(screen.queryByText(/Il disegno è lento/)).toBeNull();
  });
});
