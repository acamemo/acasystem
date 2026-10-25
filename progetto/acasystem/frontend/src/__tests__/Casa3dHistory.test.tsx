import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HashRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CasaScreen from '@/casa3d/CasaScreen';
import { casaOpenState, isCasaPath } from '@/casa3d/casaNav';
import { createFakeServer, drawnHouse } from './casa3dFakeServer';

/**
 * The house in the real history of the browser (the HashRouter and `window.history`, not a memory
 * router): the entries it puts on the stack, the back button, and the exit that leaves none behind.
 * Real timers: the history of jsdom answers in a task of its own.
 */

const world = vi.hoisted(() => ({ server: null as unknown }));
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
  return { createElementPlanApi: () => fake.fakeApi(world.server as never) };
});
vi.mock('@/casa3d/Casa3dVista', async () => {
  const { useEffect } = await import('react');
  return {
    default: function Casa3dVistaStub({
      onReadyChange,
    }: {
      onReadyChange: (ready: boolean) => void;
    }) {
      useEffect(() => {
        onReadyChange(true);
        return () => onReadyChange(false);
      }, [onReadyChange]);
      return <div data-testid="vista" />;
    },
  };
});

let open: () => void;
function Scene() {
  const location = useLocation();
  const navigate = useNavigate();
  open = () => navigate('/casa', { state: casaOpenState() });
  return isCasaPath(location.pathname) ? (
    <CasaScreen onOpenSystem={() => undefined} />
  ) : (
    <p data-testid="launcher">Launcher</p>
  );
}
const index = (): number => (window.history.state as { idx: number }).idx;

beforeEach(() => {
  world.server = createFakeServer({ building: drawnHouse(), revision: 2 });
  window.location.hash = '#/';
});
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

async function start(fromLauncher = true) {
  render(
    <HashRouter>
      <Scene />
    </HashRouter>
  );
  if (fromLauncher) expect(screen.getByTestId('launcher')).toBeTruthy();
  return index();
}

describe('the house in the history of the browser', () => {
  it('puts one entry for the house and one for what is open on it, and the back button takes them off one by one', async () => {
    const base = await start();
    open();
    await waitFor(() => expect(window.location.hash).toBe('#/casa'));
    expect(index()).toBe(base + 1);
    await screen.findByTestId('vista');

    fireEvent.click(screen.getByRole('button', { name: 'Menu della casa' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Casa 3D' })).toBeTruthy());
    expect(index()).toBe(base + 2);

    window.history.back();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Casa 3D' })).toBeNull());
    expect(window.location.hash).toBe('#/casa');
    expect(index()).toBe(base + 1);

    window.history.back();
    await waitFor(() => expect(screen.getByTestId('launcher')).toBeTruthy());
    expect(window.location.hash).toBe('#/');
    expect(index()).toBe(base);
  });

  it('«Esci» from an open sheet goes back to the entry below the house in one step', async () => {
    const base = await start();
    open();
    await screen.findByTestId('vista');
    fireEvent.click(screen.getByRole('button', { name: 'Menu della casa' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Casa 3D' })).toBeTruthy());
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Casa 3D' })).getByRole('button', {
        name: /Elenco stanze/,
      })
    );
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Elenco stanze' })).toBeTruthy());
    // opening a sheet from the bar replaces the entry: still one above the house
    expect(index()).toBe(base + 2);

    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
    await waitFor(() => expect(screen.getByTestId('launcher')).toBeTruthy());
    expect(index()).toBe(base);
    expect(window.location.hash).toBe('#/');
  });

  describe('the house opened by its own address (nothing of ours below)', () => {
    it('«Esci» from the menu leaves in one tap', async () => {
      window.location.hash = '#/casa';
      await start(false);
      await screen.findByTestId('vista');
      fireEvent.click(screen.getByRole('button', { name: 'Menu della casa' }));
      await waitFor(() => expect(screen.getByRole('dialog', { name: 'Casa 3D' })).toBeTruthy());
      fireEvent.click(
        within(screen.getByRole('dialog', { name: 'Casa 3D' })).getByRole('button', {
          name: 'Esci',
        })
      );
      await waitFor(() => expect(screen.getByTestId('launcher')).toBeTruthy());
      expect(window.location.hash).toBe('#/');
    });

    it('«Esci» from the plan opened by its address, back in Esplora, leaves in one tap', async () => {
      window.location.hash = '#/casa/piantina';
      await start(false);
      await waitFor(() =>
        expect(screen.getByRole('main').getAttribute('data-mode')).toBe('piantina')
      );
      fireEvent.click(screen.getByRole('button', { name: 'Menu della casa' }));
      await waitFor(() => expect(screen.getByRole('dialog', { name: 'Casa 3D' })).toBeTruthy());
      fireEvent.click(
        within(screen.getByRole('dialog', { name: 'Casa 3D' })).getByRole('button', {
          name: /Esplora/,
        })
      );
      await waitFor(() =>
        expect(screen.getByRole('main').getAttribute('data-mode')).toBe('esplora')
      );
      fireEvent.click(screen.getByRole('button', { name: 'Esci' }));
      await waitFor(() => expect(screen.getByTestId('launcher')).toBeTruthy());
      expect(window.location.hash).toBe('#/');
    });

    it('two taps on «Esci» do not go out of the launcher', async () => {
      window.location.hash = '#/casa';
      await start(false);
      await screen.findByTestId('vista');
      fireEvent.click(screen.getByRole('button', { name: 'Menu della casa' }));
      await waitFor(() => expect(screen.getByRole('dialog', { name: 'Casa 3D' })).toBeTruthy());
      const exit = within(screen.getByRole('dialog', { name: 'Casa 3D' })).getByRole('button', {
        name: 'Esci',
      });
      fireEvent.click(exit);
      fireEvent.click(exit);
      await waitFor(() => expect(screen.getByTestId('launcher')).toBeTruthy());
      expect(window.location.hash).toBe('#/');
    });
  });
});
