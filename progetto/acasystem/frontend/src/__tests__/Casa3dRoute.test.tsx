import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { casaOpenState, readCasaState } from '@/casa3d/casaNav';
import { AppRoutes, ROUTES } from '@/routes/AppRoutes';

/**
 * The Casa 3D development page (ADR-0014, T3) is reached by its address only: it needs the Home
 * Assistant connection (so it comes after the connection page), it is drawn instead of the
 * launcher, and the launcher never links to it. The house (R1) is another thing: a screen over the
 * launcher at `#/casa`, like Sistema, opened by a button of the launcher page or of Sistema.
 */

vi.mock('@/pages/launcher/LauncherPage', async () => {
  const { useCasa3dHouse } = await import('@/casa3d/houseContext');
  return {
    LauncherPage: function LauncherPageStub({ overlay }: { overlay?: ReactNode }) {
      const house = useCasa3dHouse();
      return (
        <div data-testid="launcher">
          <button
            type="button"
            data-casa-opener=""
            hidden={Boolean(overlay)}
            onClick={(event) => house?.open(event.currentTarget)}
          >
            Apri la casa (pagina)
          </button>
          {overlay}
        </div>
      );
    },
  };
});
vi.mock('@/pages/system', async () => {
  const { useCasa3dHouse } = await import('@/casa3d/houseContext');
  return {
    SystemPage: function SystemPageStub() {
      const house = useCasa3dHouse();
      return (
        <div>
          <p>Pagina Sistema</p>
          <button
            type="button"
            data-casa-opener=""
            onClick={(event) => house?.open(event.currentTarget)}
          >
            Apri la casa (Sistema)
          </button>
        </div>
      );
    },
  };
});
vi.mock('@/casa3d/CasaScreen', () => ({
  default: function CasaScreenStub({ onOpenSystem }: { onOpenSystem: () => void }) {
    return (
      <main>
        <p>Casa aperta</p>
        <button type="button" onClick={onOpenSystem}>
          Sistema dalla casa
        </button>
      </main>
    );
  },
}));
vi.mock('@/pages/connect', () => ({ ConnectPage: () => <p>Collegamento</p> }));
vi.mock('@/casa3d/Casa3dProva', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      Pagina di prova Casa 3D
    </button>
  ),
}));

let navigate: NavigateFunction;
let lastState: unknown;
function Where() {
  navigate = useNavigate();
  const location = useLocation();
  lastState = location.state;
  return <p data-testid="where">{location.pathname}</p>;
}

function routesAt(path: string | { pathname: string; state?: unknown }, showConnect = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes showConnect={showConnect} onConnected={() => undefined} />
      <Where />
    </MemoryRouter>
  );
}

describe('Casa 3D development route', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('has its own address', () => {
    expect(ROUTES.casa3dProva).toBe('/casa3d-prova');
  });

  it('draws the page instead of the launcher', async () => {
    routesAt(ROUTES.casa3dProva);
    expect(await screen.findByText('Pagina di prova Casa 3D')).toBeInTheDocument();
    expect(screen.queryByTestId('launcher')).not.toBeInTheDocument();
  });

  it('waits for the connection page like every page that needs Home Assistant', () => {
    routesAt(ROUTES.casa3dProva, true);
    expect(screen.getByText('Collegamento')).toBeInTheDocument();
    expect(screen.queryByText('Pagina di prova Casa 3D')).not.toBeInTheDocument();
  });

  it('goes back to the launcher', async () => {
    routesAt(ROUTES.casa3dProva);
    fireEvent.click(await screen.findByText('Pagina di prova Casa 3D'));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    expect(screen.getByTestId('launcher')).toBeInTheDocument();
  });

  it('the launcher routes do not show it', () => {
    routesAt('/');
    expect(screen.queryByText('Pagina di prova Casa 3D')).not.toBeInTheDocument();
  });

  it('is not reachable in a production build (ISSUE-091)', () => {
    vi.stubEnv('DEV', false);
    routesAt('/casa3d-prova');
    expect(screen.queryByText('Pagina di prova Casa 3D')).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    expect(screen.getByTestId('launcher')).toBeInTheDocument();
  });
});

describe('the house route (R1)', () => {
  afterEach(() => cleanup());

  it('has its own addresses, next to the launcher and Sistema', () => {
    expect(ROUTES.casa).toBe('/casa');
    expect(ROUTES.casaPlan).toBe('/casa/piantina');
  });

  it('is a screen over the launcher, which stays mounted underneath', async () => {
    routesAt('/casa');
    expect(await screen.findByText('Casa aperta')).toBeInTheDocument();
    expect(screen.getByTestId('launcher')).toBeInTheDocument();
    expect(screen.queryByText('Pagina Sistema')).not.toBeInTheDocument();
  });

  it('also answers at the address of the plan, and sends an unknown address under it to the launcher', async () => {
    routesAt('/casa/piantina');
    expect(await screen.findByText('Casa aperta')).toBeInTheDocument();
    cleanup();
    routesAt('/casa/altro');
    expect(screen.queryByText('Casa aperta')).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/');
  });

  it('waits for the connection page like Sistema does', () => {
    routesAt('/casa', true);
    expect(screen.getByText('Collegamento')).toBeInTheDocument();
    expect(screen.queryByText('Casa aperta')).not.toBeInTheDocument();
  });

  it('is opened by the button of the launcher page with one entry of the history, and gives it the focus back', async () => {
    routesAt('/');
    const opener = screen.getByRole('button', { name: 'Apri la casa (pagina)' });
    opener.focus();
    fireEvent.click(opener);
    expect(await screen.findByText('Casa aperta')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/casa');
    // the entry carries the depth of one, so that «Esci» knows how far to go back
    expect(readCasaState(lastState)).toEqual(casaOpenState().casa);
    act(() => navigate(-1));
    await waitFor(() => expect(screen.queryByText('Casa aperta')).not.toBeInTheDocument());
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    expect(document.activeElement).toBe(opener);
  });

  it('is opened from Sistema too, and the button of the rebuilt Sistema gets the focus on leaving', async () => {
    routesAt('/sistema');
    fireEvent.click(screen.getByRole('button', { name: 'Apri la casa (Sistema)' }));
    expect(await screen.findByText('Casa aperta')).toBeInTheDocument();
    expect(screen.queryByText('Pagina Sistema')).not.toBeInTheDocument();
    act(() => navigate(-1));
    await waitFor(() => expect(screen.getByText('Pagina Sistema')).toBeInTheDocument());
    expect(screen.queryByText('Casa aperta')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Apri la casa (Sistema)' })
    );
  });

  it('lets the house open Sistema (after an expired sign-in)', async () => {
    routesAt({ pathname: '/casa', state: casaOpenState() });
    fireEvent.click(await screen.findByRole('button', { name: 'Sistema dalla casa' }));
    expect(await screen.findByText('Pagina Sistema')).toBeInTheDocument();
    expect(screen.queryByText('Casa aperta')).not.toBeInTheDocument();
  });
});
