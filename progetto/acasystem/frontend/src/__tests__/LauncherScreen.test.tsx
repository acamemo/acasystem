import { useMemo, useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { LauncherLayout, WidgetDefinition, WidgetProps } from '@/@types/launcher';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  useLauncherController,
  type LauncherController,
  type LauncherStore,
} from '@/hooks/launcher/useLauncherController';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';

const tileRenders = new Map<string, number>();
function TestTile({ id, size }: WidgetProps) {
  tileRenders.set(id, (tileRenders.get(id) ?? 0) + 1);
  const runtime = useWidgetRuntime();
  return (
    <button type="button" onClick={() => runtime.openDetails(id)}>
      {`Tile ${id} ${size.w}x${size.h}`}
    </button>
  );
}

function Broken(): never {
  throw new Error('widget failure');
}

const tile: WidgetDefinition = {
  type: 'test_tile',
  label: 'Tessera',
  icon: 'grid',
  sizes: { min: { w: 1, h: 1 }, max: { w: 4, h: 3 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('test_tile'),
  Widget: TestTile,
  Details: ({ id }) => <p>{`Dettagli di ${id}`}</p>,
};
const broken: WidgetDefinition = {
  type: 'test_broken',
  label: 'Rotto',
  icon: 'warning',
  sizes: { min: { w: 1, h: 1 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('test_broken'),
  Widget: Broken,
};
const definitions = [tile, broken];
const findDefinition = (id: string, settings: CardSettings) =>
  definitions.find((definition) => definition.matches(id, settings));

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: true },
  pages: [
    {
      id: 'home',
      label: 'Casa',
      kind: 'widgets',
      placements: {
        tablet: {
          test_tile_a: { x: 0, y: 0, w: 2, h: 2 },
          test_tile_b: { x: 2, y: 0, w: 2, h: 2 },
          unknown_card_1: { x: 4, y: 0, w: 2, h: 2 },
          test_broken_1: { x: 6, y: 0, w: 2, h: 2 },
        },
      },
    },
    {
      id: 'altra',
      label: 'Altra',
      kind: 'widgets',
      placements: { tablet: { test_tile_c: { x: 0, y: 0, w: 2, h: 2 } } },
    },
  ],
};

let latest: LauncherController | null = null;

function Harness() {
  const pages = usePages();
  const store = useMemo<LauncherStore>(
    () => ({
      ready: pages.settingsLoaded,
      layout: pages.launcherLayout,
      persistLayout: pages.persistLauncherLayout,
      pagesConfig: pages.pagesConfig,
      pageSettings: pages.pageSettings,
      cardSettings: pages.cardSettings,
      persistPagesConfig: pages.persistConfig,
      persistPageSettings: pages.persistPageSettings,
      persistCardSettings: pages.persistCardSettings,
    }),
    [pages]
  );
  const controller = useLauncherController({
    store,
    deviceClass: 'tablet',
    resolveSizes: (id, settings) => findDefinition(id, settings)?.sizes,
  });
  latest = controller;
  const [details, setDetails] = useState<string | null>(null);
  const runtime = useMemo(
    () =>
      createFixtureRuntime({
        entities: fixtureEntities([
          fixtureEntity('person.mario', 'home', { friendly_name: 'Mario' }),
        ]),
        customNames: {
          test_tile_a: 'Tessera A',
          test_tile_b: 'Tessera B',
          test_tile_c: 'Tessera C',
        },
        openDetails: setDetails,
        editMode: controller.editMode,
      }),
    [controller.editMode]
  );
  return (
    <LauncherScreen
      controller={controller}
      runtime={runtime}
      cover={<p>Copertina di prova</p>}
      connection={{ phase: 'connected', label: 'Connesso' }}
      chips={[]}
      onOpenSystem={() => undefined}
      detailsWidgetId={details}
      onCloseDetails={() => setDetails(null)}
      findDefinition={findDefinition}
    />
  );
}

function renderScreen() {
  return render(
    <ToastProvider>
      <PageProvider>
        <Harness />
      </PageProvider>
    </ToastProvider>
  );
}

async function openHome() {
  const view = renderScreen();
  await waitFor(() => expect(latest?.ready).toBe(true));
  act(() => latest?.goToPageId('home'));
  return view;
}

const placement = (pageId: string, id: string) =>
  latest?.layout.pages.find((page) => page.id === pageId)?.placements.tablet?.[id];

describe('launcher screen', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    latest = null;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('renders widgets, the missing-definition fallback and the error fallback', async () => {
    await openHome();
    expect(screen.getByRole('button', { name: 'Tile test_tile_a 2x2' })).toBeInTheDocument();
    const fallbacks = screen.getAllByText('Widget non disponibile');
    expect(fallbacks).toHaveLength(2);
    expect(
      screen.getByText('Questo tipo di scheda non è ancora disponibile nella nuova interfaccia.')
    ).toBeInTheDocument();
    expect(screen.getByText(/Si è verificato un problema nel mostrarlo/)).toBeInTheDocument();
    expect(screen.getByText('unknown_card_1')).toBeInTheDocument();
  });

  it('opens the details of a widget in the sheet', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Tile test_tile_a 2x2' }));
    expect(await screen.findByText('Dettagli di test_tile_a')).toBeInTheDocument();
  });

  it('moves and resizes a widget with the keyboard in edit mode', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    expect(latest?.editMode).toBe(true);

    const handle = screen.getByRole('button', {
      name: 'Tessera A, 2 per 2, colonna 1, riga 1',
    });
    handle.focus();
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 1, w: 2, h: 2 });
    fireEvent.keyDown(screen.getByRole('button', { name: /^Tessera A,/ }), {
      key: 'ArrowRight',
      shiftKey: true,
    });
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 1, w: 3, h: 2 });
    // Max width 4 for this widget, so a second step reaches the limit.
    fireEvent.keyDown(screen.getByRole('button', { name: /^Tessera A,/ }), {
      key: 'ArrowRight',
      shiftKey: true,
    });
    fireEvent.keyDown(screen.getByRole('button', { name: /^Tessera A,/ }), {
      key: 'ArrowRight',
      shiftKey: true,
    });
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 1, w: 4, h: 2 });
    expect(await screen.findByText('Dimensione al limite per questo widget.')).toBeInTheDocument();
  });

  it('refuses a key move with no room and moves to the next page at the edge', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    const b = () => screen.getByRole('button', { name: /^Tessera B,/ });
    // b is at column 3: moving left onto a pushes a aside (there is room below).
    fireEvent.keyDown(b(), { key: 'ArrowLeft' });
    expect(placement('home', 'test_tile_b')).toEqual({ x: 1, y: 0, w: 2, h: 2 });
    expect(placement('home', 'test_tile_a')).toBeDefined();

    // At the left edge the widget goes to the previous widget page: there is none.
    act(() => {
      latest?.moveWidget('home', 'test_tile_b', { x: 0, y: 3, w: 2, h: 2 });
    });
    fireEvent.keyDown(b(), { key: 'ArrowLeft' });
    expect(await screen.findByText('Nessuna pagina in questa direzione.')).toBeInTheDocument();

    // At the right edge it moves to «Altra».
    act(() => {
      latest?.moveWidget('home', 'test_tile_b', { x: 6, y: 3, w: 2, h: 2 });
    });
    fireEvent.keyDown(b(), { key: 'ArrowRight' });
    await waitFor(() => expect(placement('altra', 'test_tile_b')).toBeDefined());
    expect(placement('home', 'test_tile_b')).toBeUndefined();
    expect(latest?.currentPageId).toBe('altra');
  });

  it('removes a widget after confirmation and leaves edit mode with Esc', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Tessera A' }));
    const confirm = screen.getByRole('dialog', { name: 'Conferma la rimozione di Tessera A' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Rimuovi' }));
    expect(placement('home', 'test_tile_a')).toBeUndefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(latest?.editMode).toBe(false);
  });

  it('moves and resizes with single-tap controls and keeps the first-row hint inside the toolbar', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    fireEvent.click(screen.getByRole('button', { name: /^Tessera A,/ }));
    const menu = screen.getByRole('dialog', { name: 'Azioni per Tessera A' });
    fireEvent.click(within(menu).getByRole('button', { name: 'Sposta' }));
    const controls = screen.getByRole('group', { name: 'Sposta Tessera A' });
    fireEvent.click(within(controls).getByRole('button', { name: 'Sposta in basso' }));
    expect(placement('home', 'test_tile_a')?.y).toBe(1);
    expect(controls.closest('.aca-shell__footer')).not.toBeNull();
    fireEvent.click(within(controls).getByRole('button', { name: 'Fatto' }));
    expect(screen.queryByRole('group', { name: 'Sposta Tessera A' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Tessera A,/ }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Azioni per Tessera A' })).getByRole('button', {
        name: 'Ridimensiona',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta larghezza' }));
    expect(placement('home', 'test_tile_a')?.w).toBe(3);
  });

  it('focuses cancel in keyboard removal, the next widget afterwards, and Edit after Escape', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    const handle = screen.getByRole('button', { name: /^Tessera A,/ });
    handle.focus();
    fireEvent.keyDown(handle, { key: 'Delete' });
    const confirm = screen.getByRole('dialog', { name: 'Conferma la rimozione di Tessera A' });
    await waitFor(() =>
      expect(within(confirm).getByRole('button', { name: 'Annulla' })).toHaveFocus()
    );
    fireEvent.click(within(confirm).getByRole('button', { name: 'Rimuovi' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Tessera B,/ })).toHaveFocus());
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifica' })).toHaveFocus());
  });

  it('enters edit mode with a long press on the page', async () => {
    vi.useFakeTimers();
    try {
      renderScreen();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      act(() => latest?.goToPageId('home'));
      const page = screen.getByRole('region', { name: 'Casa' });
      fireEvent.pointerDown(page, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      act(() => {
        vi.advanceTimersByTime(520);
      });
      expect(latest?.editMode).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not rerender every widget on pointer frames while dragging', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    expect(latest?.editMode).toBe(true);
    class Pointer extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 0;
      }
    }
    vi.stubGlobal('PointerEvent', Pointer);
    vi.useFakeTimers();
    try {
      fireEvent.pointerDown(screen.getByRole('button', { name: /^Tessera A,/ }), {
        pointerId: 1,
        button: 0,
        clientX: 10,
        clientY: 10,
      });
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 40, clientY: 50 });
      const baseline = new Map(tileRenders);
      for (let step = 0; step < 10; step += 1) {
        fireEvent.pointerMove(window, { pointerId: 1, clientX: 50 + step, clientY: 50 });
        act(() => vi.advanceTimersByTime(20));
      }
      expect(tileRenders.get('test_tile_b')).toBe(baseline.get('test_tile_b'));
      expect(tileRenders.get('test_tile_c')).toBe(baseline.get('test_tile_c'));
      fireEvent.pointerCancel(window, { pointerId: 1 });
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
