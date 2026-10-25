import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageNearContext, PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { useLongPress, LONG_PRESS_MS } from '@/hooks/launcher/useLongPress';
import Casa3dPage from '@/casa3d/Casa3dPage';
import { Casa3dHouseContext, type Casa3dHouse } from '@/casa3d/houseContext';
import { fetchAndPreloadCasa3d } from '@/casa3d/loader';
import {
  createFakeServer,
  drawnHouse,
  exampleHouse,
  type FakeCasaServer,
} from './casa3dFakeServer';

/**
 * The «Casa 3D» page of the launcher (ADR-0014, R1): a still picture of the plan the server holds,
 * no 3D at all, and a tap that opens the house at full screen. The server is a fake, the router is
 * not needed (the page only asks the app to open the house).
 */

const world = vi.hoisted(() => ({ server: null as unknown }));
const preload = vi.hoisted(() => vi.fn(() => Promise.resolve([] as string[])));
const server = () => world.server as FakeCasaServer;

vi.mock('@/casa3d/planRequest', async () => {
  const fake = await import('./casa3dFakeServer');
  return { createElementPlanApi: () => fake.fakeApi(world.server as FakeCasaServer) };
});
vi.mock('@/casa3d/loader', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/casa3d/loader')>()),
  preloadCasa3d: preload,
}));

const props = { pageId: 'casa3d', settings: {}, onSaveSetting: () => undefined };
const open = vi.fn<Casa3dHouse['open']>();

function Wrap({
  visible,
  near,
  provider = true,
  children,
}: {
  visible: boolean;
  near: boolean;
  provider?: boolean;
  children: ReactNode;
}) {
  const page = (
    <PageVisibilityContext.Provider value={visible}>
      <PageNearContext.Provider value={near}>{children}</PageNearContext.Provider>
    </PageVisibilityContext.Provider>
  );
  return provider ? (
    <Casa3dHouseContext.Provider value={{ open }}>{page}</Casa3dHouseContext.Provider>
  ) : (
    page
  );
}

const view = (visible: boolean, near: boolean, editMode = false) => (
  <Wrap visible={visible} near={near}>
    <Casa3dPage {...props} editMode={editMode} />
  </Wrap>
);

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
const button = () => screen.getByRole('button', { name: /Apri la casa/ });

describe('Casa 3D page of the launcher: a still picture that opens the house', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    world.server = createFakeServer({ building: drawnHouse(), revision: 3 });
    preload.mockClear();
    open.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('draws the plan of the server as a still picture and never builds a 3D view', async () => {
    const { container } = render(view(true, true));
    expect(screen.getByText('Caricamento della casa…')).toBeTruthy();
    await advance(50);
    const plan = container.querySelector('svg.c3d-plan');
    expect(plan).not.toBeNull();
    // the picture belongs to the button: it is decorative for assistive technology
    expect(plan?.getAttribute('aria-hidden')).toBe('true');
    // the first floor with rooms: the two rooms of the ground floor
    expect(container.querySelectorAll('.c3d-plan__room')).toHaveLength(2);
    expect(button().textContent).toContain('Apri la casa');
    expect(document.querySelector('fp3d-view3d')).toBeNull();
    // only a reading: no save, no look at the revision
    await advance(120_000);
    expect(server().requests).toEqual(['GET /building']);
  });

  it('says «Nessuna casa disegnata» when the server holds no house', async () => {
    world.server = createFakeServer();
    const { container } = render(view(true, true));
    await advance(50);
    expect(screen.getByText('Nessuna casa disegnata')).toBeTruthy();
    expect(container.querySelector('svg.c3d-plan')).toBeNull();
    // it still opens the house, where the plan can be drawn
    fireEvent.click(button());
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('says that the house cannot be read when the server is down, and still opens it', async () => {
    server().failWith = 503;
    render(view(true, true));
    await advance(50);
    expect(screen.getByText('La casa non si legge ora')).toBeTruthy();
    fireEvent.click(button());
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('shows the example house left on the bench like any other plan (the house offers «Ricomincia»)', async () => {
    world.server = createFakeServer({ building: exampleHouse(), revision: 6 });
    const { container } = render(view(true, true));
    await advance(50);
    expect(container.querySelectorAll('.c3d-plan__room').length).toBeGreaterThanOrEqual(5);
  });

  it('a short tap opens the house, and the opener is the button that was pressed', async () => {
    render(view(true, true));
    await advance(50);
    fireEvent.click(button());
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0]?.[0]).toBe(button());
  });

  it('opens nothing in edit mode, in the page overview or off screen', async () => {
    const { rerender } = render(view(true, true, true));
    await advance(50);
    fireEvent.click(button());
    rerender(view(false, true));
    fireEvent.click(button());
    expect(open).not.toHaveBeenCalled();
  });

  it('without the app around it (a preview) the button is off', async () => {
    render(
      <Wrap visible near provider={false}>
        <Casa3dPage {...props} />
      </Wrap>
    );
    await advance(50);
    expect((button() as HTMLButtonElement).disabled).toBe(true);
  });

  it('a touch that only stops the fling of the pager is not a tap', async () => {
    const { container } = render(
      <div className="aca-pager">
        <Wrap visible near>
          <Casa3dPage {...props} />
        </Wrap>
      </div>
    );
    await advance(50);
    const pager = container.querySelector('.aca-pager') as HTMLElement;
    Object.defineProperty(pager, 'clientWidth', { configurable: true, value: 1000 });
    pager.scrollLeft = 2000;
    // between two pages
    pager.scrollLeft = 1400;
    fireEvent.click(button());
    expect(open).not.toHaveBeenCalled();
    // at rest on the page
    pager.scrollLeft = 2000;
    fireEvent.click(button());
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('a press held to the long press stays the launcher’s: the click that follows opens nothing', async () => {
    const onLong = vi.fn();
    function Launcher() {
      const handlers = useLongPress({ onLongPress: onLong });
      return (
        <div {...handlers}>
          <Casa3dPage {...props} />
        </div>
      );
    }
    render(
      <Wrap visible near>
        <Launcher />
      </Wrap>
    );
    await advance(50);
    const init = { pointerId: 4, isPrimary: true, pointerType: 'touch', button: 0 };
    fireEvent.pointerDown(button(), { ...init, clientX: 50, clientY: 50 });
    await advance(LONG_PRESS_MS + 50);
    fireEvent.pointerUp(button(), { ...init, clientX: 50, clientY: 50 });
    expect(onLong).toHaveBeenCalledTimes(1);
    // the click of the release is swallowed by the launcher
    fireEvent.click(button(), { pointerId: 4 });
    expect(open).not.toHaveBeenCalled();
    // and the next, short, tap is a tap
    fireEvent.pointerDown(button(), { ...init, pointerId: 5, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(button(), { ...init, pointerId: 5, clientX: 50, clientY: 50 });
    fireEvent.click(button(), { pointerId: 5 });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('reads the plan when it is next to the one on screen, and again each time it comes back on screen', async () => {
    const { rerender } = render(view(false, false));
    await advance(100);
    expect(server().requests).toEqual([]);
    expect(preload).not.toHaveBeenCalled();
    rerender(view(false, true));
    await advance(100);
    expect(preload).toHaveBeenCalledTimes(1);
    expect(server().requests).toEqual(['GET /building']);
    rerender(view(true, true));
    await advance(100);
    expect(server().requests).toEqual(['GET /building', 'GET /building']);
    // the house was closed and a room added meanwhile: the picture follows
    const longer = drawnHouse();
    (longer.floors as Array<{ rooms: unknown[] }>)[0]!.rooms.push({
      id: 'bagno',
      name: 'Bagno',
      points: [
        [7, 0],
        [9, 0],
        [9, 3],
        [7, 3],
      ],
    });
    server().building = longer;
    rerender(view(false, true));
    rerender(view(true, true));
    await advance(100);
    expect(document.querySelectorAll('.c3d-plan__room')).toHaveLength(3);
  });
});

describe('modulepreload of the Casa 3D code', () => {
  const manifest = {
    name: 'casa3d',
    version: '0.1.0',
    entry: 'casa3d-abc123.js',
    bundles: {
      '3d': { file: 'casa3d-3d-def456.js', bytes: 1, sha256: 'x' },
      editor: { file: 'casa3d-editor-0a0a0a.js', bytes: 1, sha256: 'x' },
    },
  };
  const ok = (body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

  afterEach(() => {
    document.head.querySelectorAll('link[rel="modulepreload"]').forEach((link) => link.remove());
  });

  it('adds one link for the entry and one for the 3D bundle, with the addresses the import uses', async () => {
    const hrefs = await fetchAndPreloadCasa3d({
      documentUrl: 'http://acasystem.test/app/',
      fetchImpl: () => ok(manifest),
    });
    expect(hrefs).toEqual([
      'http://acasystem.test/app/casa3d/casa3d-abc123.js',
      'http://acasystem.test/app/casa3d/casa3d-3d-def456.js',
    ]);
    const links = [...document.head.querySelectorAll('link[rel="modulepreload"]')];
    expect(links.map((link) => (link as HTMLLinkElement).href)).toEqual(hrefs);
    // the editor is not fetched ahead: it is for the installer
    expect(hrefs.some((href) => href.includes('editor'))).toBe(false);
  });

  it('does not add a link twice', async () => {
    const deps = { documentUrl: 'http://acasystem.test/', fetchImpl: () => ok(manifest) };
    await fetchAndPreloadCasa3d(deps);
    await fetchAndPreloadCasa3d(deps);
    expect(document.head.querySelectorAll('link[rel="modulepreload"]')).toHaveLength(2);
  });

  it('ignores a manifest that names a file outside the folder, and fails on a missing manifest', async () => {
    const evil = { ...manifest, bundles: { '3d': { file: '../x.js', bytes: 1, sha256: 'x' } } };
    const hrefs = await fetchAndPreloadCasa3d({
      documentUrl: 'http://acasystem.test/',
      fetchImpl: () => ok(evil),
    });
    expect(hrefs).toEqual(['http://acasystem.test/casa3d/casa3d-abc123.js']);
    await expect(
      fetchAndPreloadCasa3d({
        documentUrl: 'http://acasystem.test/',
        fetchImpl: () => Promise.resolve(new Response('', { status: 404 })),
      })
    ).rejects.toThrow(/404/);
  });
});
