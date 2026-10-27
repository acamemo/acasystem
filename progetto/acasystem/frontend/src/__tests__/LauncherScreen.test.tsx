import { useMemo, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { DeviceClass, LauncherLayout, WidgetDefinition, WidgetProps } from '@/@types/launcher';
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
import { CARD_EXIT_MS } from '@/templates/launcher/Pager';
import { TWO_FRAMES_MS } from '@/utils/launcher/motion';

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
/** Commands pressed inside the opener widget (a tap acts at once, ADR-0016). */
const commands: string[] = [];
function OpenerTile({ id }: WidgetProps) {
  const runtime = useWidgetRuntime();
  return (
    <div>
      <button type="button" data-widget-open onClick={() => runtime.openDetails(id)}>
        {`Apri ${id}`}
      </button>
      <button type="button" onClick={() => commands.push(id)}>
        {`Comando ${id}`}
      </button>
      <input type="range" aria-label={`Cursore ${id}`} />
      {/* A knob drawn as a plain element, marked as the real one is (BrightnessKnob). */}
      <div role="img" aria-label={`Manopola ${id}`} data-no-long-press />
    </div>
  );
}
const opener: WidgetDefinition = {
  type: 'test_open',
  label: 'Apribile',
  icon: 'grid',
  sizes: { min: { w: 1, h: 1 }, max: { w: 4, h: 3 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('test_open'),
  Widget: OpenerTile,
  Details: ({ id }) => <p>{`Dettagli di ${id}`}</p>,
};
/** Fixed width (as the alarm or the climate widgets) and a single size. */
const narrow: WidgetDefinition = {
  ...tile,
  type: 'test_narrow',
  sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 1 } },
  matches: (id) => id.startsWith('test_narrow'),
};
const single: WidgetDefinition = {
  ...tile,
  type: 'test_single',
  sizes: { min: { w: 2, h: 2 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('test_single'),
};
/** A widget with a full-screen console (the TV), in place of the sheet. */
const consoleTile: WidgetDefinition = {
  ...tile,
  type: 'test_console',
  matches: (id) => id.startsWith('test_console'),
  Console: ({ id }) => <p>{`Console di ${id}`}</p>,
};
const definitions = [tile, broken, opener, narrow, single, consoleTile];
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

// A constant, as in LauncherPage: a new function at every render would redraw the whole launcher
// (REP-20261012-003).
const resolveSizes = (id: string, settings: CardSettings) => findDefinition(id, settings)?.sizes;

let latest: LauncherController | null = null;
let latestPages: ReturnType<typeof usePages> | null = null;
/** Presses of the gear of Sistema (REP-20261013-002, ADR-0013). */
const openedSystem = vi.fn();
/** Screen class of the harness: the tablet unless a test sets another one. */
let harnessDevice: DeviceClass = 'tablet';

function Harness() {
  const pages = usePages();
  latestPages = pages;
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
    deviceClass: harnessDevice,
    resolveSizes,
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
          test_narrow_1: 'Stretto',
          test_single_1: 'Unico',
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
      connection={{ phase: 'connected', label: 'Connesso' }}
      chips={[]}
      onOpenSystem={openedSystem}
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

/** A tap of the finger: press, release, then the click (with detail 1, as a pointer gives). */
function tap(element: Element) {
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: 5, clientY: 5 });
  fireEvent.pointerUp(window, { button: 0, pointerId: 1, clientX: 5, clientY: 5 });
  fireEvent.click(element, { detail: 1 });
}

describe('launcher screen', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    latest = null;
    openedSystem.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('renders widgets, the missing-definition fallback and the error fallback', async () => {
    await openHome();
    expect(screen.getByRole('button', { name: 'Tile test_tile_a 2x2' })).toBeInTheDocument();
    // On «Casa» (the cover holds its own widgets, unknown to this test resolver).
    const fallbacks = within(screen.getByRole('region', { name: 'Casa' })).getAllByText(
      'Widget non disponibile'
    );
    expect(fallbacks).toHaveLength(2);
    const casa = within(screen.getByRole('region', { name: 'Casa' }));
    expect(
      casa.getByText('Questo tipo di scheda non è ancora disponibile nella nuova interfaccia.')
    ).toBeInTheDocument();
    expect(casa.getByText(/Si è verificato un problema nel mostrarlo/)).toBeInTheDocument();
    expect(casa.getByText('unknown_card_1')).toBeInTheDocument();
  });

  it('opens the details of a widget in the sheet', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Tile test_tile_a 2x2' }));
    expect(await screen.findByText('Dettagli di test_tile_a')).toBeInTheDocument();
  });

  it('opens a widget with a console full screen from its rectangle, and the others in the sheet', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          {
            id: 'home',
            label: 'Casa',
            kind: 'widgets',
            placements: {
              tablet: {
                test_tile_a: { x: 0, y: 0, w: 2, h: 2 },
                test_console_a: { x: 2, y: 0, w: 2, h: 2 },
              },
            },
          },
        ],
      })
    );
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        return this.dataset.widgetId === 'test_console_a'
          ? ({ top: 20, left: 10, width: 200, height: 100 } as DOMRect)
          : ({ top: 0, left: 0, width: 0, height: 0 } as DOMRect);
      });
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Tile test_console_a 2x2' }));
    expect(await screen.findByText('Console di test_console_a')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('.aca-console')).not.toBeNull();
    expect(document.querySelector('dialog[open]')).toBeNull();
    expect(dialog.querySelector('.aca-console')?.getAttribute('style')).toContain(
      'translate(10px, 20px)'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    await waitFor(() => expect(screen.queryByText('Console di test_console_a')).toBeNull());
    // A widget without a console still opens the sheet.
    fireEvent.click(screen.getByRole('button', { name: 'Tile test_tile_a 2x2' }));
    expect(await screen.findByText('Dettagli di test_tile_a')).toBeInTheDocument();
    expect(document.querySelector('.aca-console')).toBeNull();
    rect.mockRestore();
  });

  it('moves and resizes a widget with the keyboard in edit mode', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
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

    // At the left edge the widget goes to the previous widget page: there is none (the cover
    // takes widgets since REP-20261007-030: it is turned off here).
    act(() => latest?.setCoverEnabled(false));
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

  it('removes a widget at once and edit mode ends with it, «Annulla» puts it back, Esc leaves edit mode', async () => {
    await openHome();
    // Edit mode begins with the first widget selected (2026-10-23): its bar has the removal.
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    // Remove lives in the bar of the selected widget; at once, as on Android (REP-20261007-031).
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Tessera A' }));
    expect(placement('home', 'test_tile_a')).toBeUndefined();
    // The widget leaves with its selection: back to use, no bar left.
    expect(latest?.editMode).toBe(false);
    const undo = document.querySelector<HTMLElement>('.aca-undo')!;
    expect(undo).toHaveTextContent('Tessera A rimosso');
    // In the area of the pages, under a connection notice (REP-20261013-002, ADR-0013).
    expect(undo.parentElement).toHaveClass('aca-shell__main');
    fireEvent.click(within(undo).getByRole('button', { name: 'Annulla' }));
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(latest?.editMode).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    expect(latest?.editMode).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(latest?.editMode).toBe(false);
  });

  it('removing a widget linked to a device keeps its configuration for the device (ADR-0019), and «Annulla» still puts it back', async () => {
    localStorage.setItem(
      'tunet_card_settings',
      JSON.stringify({
        'home::test_tile_a': {
          categoryWidgetType: 'light',
          bindingEntityId: 'light.cucina',
          heading: 'Sopra il piano',
        },
        'home::test_tile_b': { heading: 'Nessun dispositivo' },
      })
    );
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Tessera A' }));
    expect(placement('home', 'test_tile_a')).toBeUndefined();
    const memory = JSON.parse(localStorage.getItem('tunet_widget_memory') ?? '{}');
    expect(Object.keys(memory.entries)).toEqual(['light|light.cucina']);
    expect(memory.entries['light|light.cucina']).toMatchObject({
      settings: { heading: 'Sopra il piano' },
    });
    // the settings of the removed widget are not touched: «Annulla» is as it was
    expect(
      JSON.parse(localStorage.getItem('tunet_card_settings') ?? '{}')['home::test_tile_a']
    ).toMatchObject({
      heading: 'Sopra il piano',
    });
    fireEvent.click(
      within(document.querySelector<HTMLElement>('.aca-undo')!).getByRole('button', {
        name: 'Annulla',
      })
    );
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 0, w: 2, h: 2 });

    // a widget that shows no device leaves nothing in memory
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    tap(screen.getByRole('button', { name: /^Tessera B,/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Tessera B' }));
    expect(placement('home', 'test_tile_b')).toBeUndefined();
    expect(
      Object.keys(JSON.parse(localStorage.getItem('tunet_widget_memory') ?? '{}').entries)
    ).toEqual(['light|light.cucina']);
  });

  it('a widget linked to a device takes the configuration kept for it, and the notice says so (ADR-0019)', async () => {
    localStorage.setItem(
      'tunet_card_settings',
      JSON.stringify({ 'home::test_tile_b': { categoryWidgetType: 'light' } })
    );
    localStorage.setItem(
      'tunet_widget_memory',
      JSON.stringify({
        entries: {
          'light|light.cucina': {
            type: 'light',
            deviceKey: 'light.cucina',
            updatedAt: 10,
            label: 'Luce del piano',
            settings: { heading: 'Sopra il piano' },
          },
        },
        touched: {},
      })
    );
    await openHome();
    act(() => latestPages?.saveCardSetting('home::test_tile_b', 'bindingEntityId', 'light.cucina'));
    const pill = await waitFor(() => {
      const element = document.querySelector<HTMLElement>('.aca-undo')!;
      expect(element).toHaveTextContent('Impostazioni riprese da “Luce del piano”');
      return element;
    });
    expect(pill).toHaveAttribute('role', 'status');
    // a notice only: no «Annulla» in it
    expect(within(pill).queryByRole('button', { name: 'Annulla' })).toBeNull();
    expect(latestPages?.cardSettings['home::test_tile_b']).toMatchObject({
      bindingEntityId: 'light.cucina',
      heading: 'Sopra il piano',
    });
  });

  it('moves with a tap on a free cell and resizes from the settings opened with a second tap', async () => {
    await openHome();
    // Edit mode begins with the first widget selected: the bar is the one of the widget, with
    // Rimuovi, Annulla and Fine only (REP-20261008-001, REP-20261013-001), and no «+ Widget» /
    // «Pagine» bar (2026-10-23); the indicator is the top bar now and stays (ADR-0016, C2).
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    expect(document.querySelector('.aca-edit-toolbar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modifica le pagine' })).toBeNull();
    expect(screen.getByRole('toolbar', { name: 'Modifica Tessera A' })).toBeInTheDocument();
    expect(document.querySelector('.aca-indicator')).not.toHaveClass('aca-indicator--hidden');
    expect(screen.queryByRole('button', { name: 'Sposta con le frecce' })).not.toBeInTheDocument();
    // With a widget selected a free cell moves it there (E2).
    fireEvent.click(
      screen.getByRole('button', { name: 'Sposta Tessera A qui: colonna 1, riga 3' })
    );
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 2, w: 2, h: 2 });
    expect(document.querySelector('[data-widget-id="test_tile_a"]')).toHaveClass('is-selected');
    // The widget is selected: a second tap on it opens the settings, with «Dimensione» (G5).
    tap(screen.getByRole('button', { name: /^Tessera A,/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Impostazioni del widget' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Aumenta larghezza' }));
    expect(placement('home', 'test_tile_a')?.w).toBe(3);
  });

  it('selects a widget with a tap: no dots before, eight dots and four grip sides after', async () => {
    const { container } = await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    // Tessera A is the selected one on entering; the tap moves the selection to Tessera B.
    const widget = container.querySelector<HTMLElement>('[data-widget-id="test_tile_b"]')!;
    const dots = () =>
      Array.from(widget.querySelectorAll('[data-resize-edge]')).map((node) =>
        node.getAttribute('data-resize-edge')
      );
    const sides = () =>
      Array.from(widget.querySelectorAll('[data-resize-side]')).map((node) =>
        node.getAttribute('data-resize-side')
      );
    // Not selected: no dot and no grip at all.
    expect(dots()).toEqual([]);
    expect(sides()).toEqual([]);
    tap(screen.getByRole('button', { name: /^Tessera B,/ }));
    expect(widget).toHaveClass('is-selected');
    expect(container.querySelector('[data-widget-id="test_tile_a"]')).not.toHaveClass(
      'is-selected'
    );
    expect(dots()).toEqual(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']);
    expect(sides()).toEqual(['n', 'e', 's', 'w']);
    // No corner knobs any more (U4).
    expect(widget.querySelector('[data-widget-knob]')).toBeNull();
    // «Fine» of the bar of the widget keeps the changes and leaves edit mode in one tap, where
    // «Conferma» then «Fine» took two (REP-20261013-001): the bars of edit mode sink.
    const bar = screen.getByRole('toolbar', { name: 'Modifica Tessera B' });
    fireEvent.click(within(bar).getByRole('button', { name: 'Fine' }));
    expect(widget).not.toHaveClass('is-selected');
    expect(latest?.editMode).toBe(false);
    expect(document.querySelector('.aca-edit-toolbar')).toBeNull();
    expect(document.querySelector('.aca-indicator')).toHaveClass('aca-indicator--hidden');
  });

  it('a press on the pager itself (the empty band) keeps the selection, one on a page clears it and edit mode ends', async () => {
    const { container } = await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    const widget = container.querySelector<HTMLElement>('[data-widget-id="test_tile_a"]')!;
    expect(widget).toHaveClass('is-selected');
    const pager = container.querySelector<HTMLElement>('.aca-pager')!;
    fireEvent.pointerDown(pager, { button: 0, pointerId: 2, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(window, { button: 0, pointerId: 2, clientX: 5, clientY: 5 });
    expect(widget).toHaveClass('is-selected');
    fireEvent.pointerDown(pager.querySelector<HTMLElement>('.aca-pager__page')!, {
      button: 0,
      pointerId: 3,
      clientX: 5,
      clientY: 5,
    });
    fireEvent.pointerUp(window, { button: 0, pointerId: 3, clientX: 5, clientY: 5 });
    expect(widget).not.toHaveClass('is-selected');
    // No widget selected, no edit mode: the person is back in use (2026-10-23).
    expect(latest?.editMode).toBe(false);
  });

  it('a press on the layer of the gaps (the pager in the overview) keeps the selection too (REP-20261019-002)', async () => {
    const { container } = await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    const widget = container.querySelector<HTMLElement>('[data-widget-id="test_tile_a"]')!;
    expect(widget).toHaveClass('is-selected');
    // The overview gives the gaps between the cards to a layer under the pages (Pager.tsx): its
    // press is the pager's, as it was when the pager itself took it.
    const gaps = document.createElement('div');
    gaps.className = 'aca-pager__surface';
    container.querySelector<HTMLElement>('.aca-pager')!.prepend(gaps);
    fireEvent.pointerDown(gaps, { button: 0, pointerId: 2, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(window, { button: 0, pointerId: 2, clientX: 5, clientY: 5 });
    expect(widget).toHaveClass('is-selected');
    expect(latest?.editMode).toBe(true);
  });

  it('«Annulla» puts the widget back as it was when selected', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    const undo = screen.getByRole('button', { name: 'Annulla' });
    expect(undo).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Sposta Tessera A qui: colonna 1, riga 3' })
    );
    expect(placement('home', 'test_tile_a')?.y).toBe(2);
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 0, w: 2, h: 2 });
  });

  it('removes with Canc and edit mode ends: the focus lost with the widget goes to «Modifica la disposizione»', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    const handle = screen.getByRole('button', { name: /^Tessera A,/ });
    handle.focus();
    // Canc removes at once, like the trash; «Annulla» stays for a few seconds.
    fireEvent.keyDown(handle, { key: 'Delete' });
    expect(placement('home', 'test_tile_a')).toBeUndefined();
    expect(document.querySelector('.aca-undo')).toHaveTextContent('Tessera A rimosso');
    expect(latest?.editMode).toBe(false);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Modifica la disposizione' })).toHaveFocus()
    );
  });

  it('«Fine» is only in the bar of the widget; «Modifica la disposizione» has no face and gets the focus back (D1, ADR-0016)', async () => {
    await openHome();
    expect(screen.queryByRole('button', { name: 'Fine' })).toBeNull();
    // The old bar of the footer is gone: no clock, no «Sincronizzato», no visible «Modifica».
    expect(document.querySelector('.aca-status-bar')).toBeNull();
    expect(screen.queryByText('Sincronizzato')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modifica' })).toBeNull();
    const commands = () => document.querySelector('.aca-screen-commands')!;
    expect(commands()).not.toHaveAttribute('inert');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    expect(latest?.editMode).toBe(true);
    // The commands go out of the way; the bar of the widget has the one «Fine» (2026-10-23).
    expect(commands()).toHaveAttribute('inert');
    expect(screen.queryByRole('group', { name: 'Modifica della disposizione' })).toBeNull();
    const widgetBar = screen.getByRole('toolbar', { name: 'Modifica Tessera A' });
    const done = within(widgetBar).getByRole('button', { name: 'Fine' });
    expect(screen.getAllByRole('button', { name: 'Fine' })).toEqual([done]);
    fireEvent.click(done);
    expect(latest?.editMode).toBe(false);
    expect(commands()).not.toHaveAttribute('inert');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Modifica la disposizione' })).toHaveFocus()
    );
  });

  it('the focus after «Fine» and after a card of the page overview waits for the frame after the next one (ISSUE-109, R7)', async () => {
    await openHome();
    // Frames held back by hand from here: what the screen asks for after the click is run by us.
    const queue = new Map<number, FrameRequestCallback>();
    let nextFrame = 1;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      queue.set(nextFrame, callback);
      return nextFrame++;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      queue.delete(id);
    });
    const runFrame = () =>
      act(() => {
        const callbacks = [...queue.values()];
        queue.clear();
        for (const callback of callbacks) callback(performance.now());
      });
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
      const widgetBar = screen.getByRole('toolbar', { name: 'Modifica Tessera A' });
      fireEvent.click(within(widgetBar).getByRole('button', { name: 'Fine' }));
      const command = () => screen.getByRole('button', { name: 'Modifica la disposizione' });
      expect(command()).not.toHaveFocus();
      runFrame();
      expect(command()).not.toHaveFocus();
      runFrame();
      expect(command()).toHaveFocus();

      // From the page overview (as Sistema opens it): the card opens that page in use and the
      // focus left on nothing goes to «Modifica la disposizione», as after «Fine».
      act(() => {
        latest?.setEditMode(true);
        latest?.setOverview(true);
      });
      runFrame();
      runFrame();
      fireEvent.click(screen.getByRole('button', { name: 'Apri Altra' }));
      expect(latest?.editMode).toBe(false);
      (document.activeElement as HTMLElement | null)?.blur();
      expect(command()).not.toHaveFocus();
      runFrame();
      expect(command()).not.toHaveFocus();
      runFrame();
      expect(command()).toHaveFocus();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('the focus of «Modifica la disposizione» goes to the widget it selects as the commands go out of the way (D1, 2026-10-23)', async () => {
    await openHome();
    const command = screen.getByRole('button', { name: 'Modifica la disposizione' });
    command.focus();
    fireEvent.click(command);
    // The first widget of the page, as none had the focus; its bar is one Tab away.
    await waitFor(() => expect(screen.getByRole('button', { name: /^Tessera A,/ })).toHaveFocus());
  });

  it('«Modifica la disposizione» selects the widget that had the focus last, else the first one; with none it says so', async () => {
    await openHome();
    const command = () => screen.getByRole('button', { name: 'Modifica la disposizione' });
    screen.getByRole('button', { name: 'Tile test_tile_b 2x2' }).focus();
    command().focus();
    fireEvent.click(command());
    expect(document.querySelector('[data-widget-id="test_tile_b"]')).toHaveClass('is-selected');
    expect(document.querySelector('[data-widget-id="test_tile_a"]')).not.toHaveClass('is-selected');
    expect(screen.getByRole('toolbar', { name: 'Modifica Tessera B' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(latest?.editMode).toBe(false);
    // A page with no widgets has nothing to edit: the words say where the pages are.
    act(() => {
      latest?.addPage({ label: 'Vuota', kind: 'widgets' });
    });
    await waitFor(() => expect(latest?.currentPageId).not.toBe('home'));
    fireEvent.click(command());
    expect(latest?.editMode).toBe(false);
    await waitFor(() =>
      expect(document.querySelector('.sr-only[role="status"]')).toHaveTextContent(
        'Nessun widget da modificare in questa pagina. Per le pagine: Sistema, Modifica le pagine.'
      )
    );
  });

  it('the cover has the gear and the commands like any page; «Fine» leaves the focus on «Modifica la disposizione»', async () => {
    renderScreen();
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.goToPageId('cover'));
    expect(screen.getByRole('button', { name: 'Sistema' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifica la disposizione' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    expect(latest?.editMode).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Fine' }));
    expect(latest?.editMode).toBe(false);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Modifica la disposizione' })).toHaveFocus()
    );
  });

  it('the gear, the commands and the top bar are laid over the pages, before them in the tab order; the footer holds the bars of edit mode only (ADR-0016)', async () => {
    await openHome();
    const shell = document.querySelector('.aca-shell')!;
    const footer = document.querySelector('.aca-shell__footer')!;
    const gear = screen.getByRole('button', { name: 'Sistema' }).closest('.aca-system-gear')!;
    const commands = screen.getByRole('group', { name: 'Comandi della schermata' });
    expect(gear.parentElement).toBe(shell);
    expect(commands.parentElement).toBe(shell);
    expect(document.querySelector('.aca-shell__top > .aca-indicator')).not.toBeNull();
    const main = shell.querySelector('.aca-shell__main')!;
    const before = (node: Element) =>
      Boolean(node.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(commands)).toBe(true);
    expect(before(gear)).toBe(true);
    expect(footer.querySelector('.aca-indicator')).toBeNull();
    // Only the bar of a widget and the bar of the pages wait there: no «+ Widget» / «Pagine» bar
    // any more (2026-10-23).
    expect(footer.querySelector('.aca-widget-actions')).not.toBeNull();
    expect(footer.querySelector('.aca-page-overview:not(.aca-widget-actions)')).not.toBeNull();
    expect(footer.querySelector('.aca-edit-toolbar')).toBeNull();
    // The three commands with no face.
    expect(
      within(commands)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Modifica la disposizione', 'Pagina precedente', 'Pagina successiva']);
  });

  it('Sistema is reachable with the layout locked, where «Modifica la disposizione» only says how to unlock (ADR-0016)', async () => {
    await openHome();
    act(() => latest?.setLayoutOptions({ locked: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    expect(latest?.editMode).toBe(false);
    expect(document.querySelector('.aca-undo')).toHaveTextContent('Disposizione bloccata');
    expect(openedSystem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sistema' }));
    expect(openedSystem).toHaveBeenCalledTimes(1);
  });

  it('«Fine» right after entering edit mode is never held: no control shares a corner now (ADR-0016)', async () => {
    await openHome();
    const now = vi.spyOn(Date, 'now');
    try {
      now.mockReturnValue(10_000);
      fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }), {
        detail: 1,
      });
      expect(latest?.editMode).toBe(true);
      now.mockReturnValue(10_100);
      fireEvent.click(
        within(screen.getByRole('toolbar', { name: 'Modifica Tessera A' })).getByRole('button', {
          name: 'Fine',
        }),
        { detail: 1 }
      );
      expect(latest?.editMode).toBe(false);
    } finally {
      now.mockRestore();
    }
  });

  it('the gear opens Sistema in every state of the launcher: use, edit mode and the page overview (ADR-0016, C1)', async () => {
    await openHome();
    const gear = () => screen.getByRole('button', { name: 'Sistema' });
    fireEvent.click(gear());
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    expect(latest?.editMode).toBe(true);
    fireEvent.click(gear());
    // The page overview, as Sistema → «Modifica le pagine» opens it.
    act(() => {
      latest?.setEditMode(true);
      latest?.setOverview(true);
    });
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    fireEvent.click(gear());
    expect(openedSystem).toHaveBeenCalledTimes(3);
  });

  it('the commands go to the page before and after and say which: the keyboard and the readers have what the swipe does (C3)', async () => {
    await openHome();
    const group = screen.getByRole('group', { name: 'Comandi della schermata' });
    act(() => latest?.goToPageId('home'));
    const previous = () => within(group).getByRole('button', { name: 'Pagina precedente' });
    const next = () => within(group).getByRole('button', { name: 'Pagina successiva' });
    const at = latest!.currentPage;
    expect(previous()).not.toBeDisabled();
    fireEvent.click(next());
    expect(latest?.currentPage).toBe(at + 1);
    await waitFor(() =>
      expect(document.querySelector('.sr-only[role="status"]')).toHaveTextContent(
        /^Pagina \d+ di \d+: /
      )
    );
    fireEvent.click(previous());
    expect(latest?.currentPage).toBe(at);
    act(() => latest?.goToPage(0));
    expect(previous()).toBeDisabled();
    act(() => latest?.goToPage(latest!.entries.length - 1));
    expect(next()).toBeDisabled();
  });

  it('a page change out of edit mode shows the indicator as a cue for two seconds, then it goes up (ADR-0016, C2)', async () => {
    await openHome();
    const indicator = () => document.querySelector('.aca-indicator')!;
    expect(indicator()).toHaveClass('aca-indicator--hidden');
    vi.useFakeTimers();
    try {
      act(() => latest?.goToPage(0));
      // A cue only: it takes no touch and says nothing.
      expect(indicator()).toHaveClass('aca-indicator--passive');
      expect(indicator()).not.toHaveClass('aca-indicator--hidden');
      expect(indicator()).toHaveAttribute('inert');
      act(() => {
        vi.advanceTimersByTime(1900);
      });
      expect(indicator()).not.toHaveClass('aca-indicator--hidden');
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(indicator()).toHaveClass('aca-indicator--hidden');
      // Edit mode: the indicator is the top bar, in use.
      act(() => latest?.setEditMode(true));
      expect(indicator()).not.toHaveClass('aca-indicator--hidden');
      expect(indicator()).not.toHaveClass('aca-indicator--passive');
      expect(indicator()).not.toHaveAttribute('inert');
    } finally {
      vi.useRealTimers();
    }
  });

  it('the first time a hint says how to edit; closed, or once edit mode opens, it does not come back (ADR-0016, C3)', async () => {
    localStorage.removeItem('aca_edit_hint_seen');
    await openHome();
    const note = await screen.findByRole('note', { name: 'Suggerimento' }, { timeout: 4000 });
    expect(note).toHaveTextContent(
      'Tieni premuto uno spazio vuoto per modificare le pagine, o un widget per spostarlo.'
    );
    expect(localStorage.getItem('aca_edit_hint_seen')).toBe('1');
    fireEvent.click(within(note).getByRole('button', { name: 'Ho capito' }));
    expect(screen.queryByRole('note', { name: 'Suggerimento' })).toBeNull();
    cleanup();
    // The same device, the next start: nothing.
    await openHome();
    await new Promise((resolve) => setTimeout(resolve, 1800));
    expect(screen.queryByRole('note', { name: 'Suggerimento' })).toBeNull();
  }, 20000);

  it('the hint leaves when edit mode opens and is never shown with the layout locked', async () => {
    localStorage.removeItem('aca_edit_hint_seen');
    await openHome();
    const note = await screen.findByRole('note', { name: 'Suggerimento' }, { timeout: 4000 });
    act(() => latest?.setEditMode(true));
    await waitFor(() => expect(screen.queryByRole('note', { name: 'Suggerimento' })).toBeNull());
    expect(note).toHaveAttribute('inert');
    cleanup();
    localStorage.removeItem('aca_edit_hint_seen');
    renderScreen();
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.setLayoutOptions({ locked: true }));
    await new Promise((resolve) => setTimeout(resolve, 1800));
    expect(screen.queryByRole('note', { name: 'Suggerimento' })).toBeNull();
    expect(localStorage.getItem('aca_edit_hint_seen')).toBeNull();
  }, 20000);

  it('opens the page overview, which is edit mode, with a long press on the page', async () => {
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
        vi.advanceTimersByTime(1020);
      });
      expect(latest?.editMode).toBe(true);
      expect(latest?.overview).toBe(true);
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
      // A widget not selected lifts after a press of a second (REP-20261008-001).
      act(() => vi.advanceTimersByTime(1000));
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 40, clientY: 50 });
      act(() => vi.advanceTimersByTime(20));
      expect(document.querySelector('.aca-drag-ghost')).not.toBeNull();
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

describe('the pages kept drawn while a widget is dragged (ISSUE-109, R2)', () => {
  class Pointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
    }
  }
  beforeEach(() => {
    const spare = Array.from({ length: 6 }, (_, position) => ({
      id: `spare${position}`,
      label: `Spare ${position}`,
      kind: 'widgets' as const,
      placements: { tablet: {} },
    }));
    localStorage.clear();
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({ ...layout, pages: [...layout.pages, ...spare] })
    );
    latest = null;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('PointerEvent', Pointer);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  /** The furthest page the browser draws. */
  const lastDrawn = () => {
    const sections = Array.from(document.querySelectorAll('.aca-pager__page'));
    return sections.reduce((last, section, position) => {
      return section.hasAttribute('data-far') ? last : position;
    }, -1);
  };

  it('two pages on each side while a widget is moved, the neighbours alone while it is resized', async () => {
    const { container } = await openHome();
    act(() => latest?.setEditMode(true));
    const home = lastDrawn() - 1;
    expect(lastDrawn()).toBe(home + 1);
    const widget = container.querySelector<HTMLElement>('[data-widget-id="test_tile_a"]')!;
    // Resized from a side of the grip frame: it never turns a page, so nothing more is drawn.
    fireEvent.click(screen.getByRole('button', { name: /^Tessera A,/ }));
    const side = widget.querySelector<HTMLElement>('[data-resize-side="e"]')!;
    fireEvent.pointerDown(side, { pointerId: 3, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 3, clientX: 140, clientY: 100 });
    await waitFor(() => expect(widget).toHaveClass('is-resizing'));
    expect(lastDrawn()).toBe(home + 1);
    fireEvent.pointerUp(window, { pointerId: 3, clientX: 140, clientY: 100 });
    await waitFor(() => expect(widget).not.toHaveClass('is-resizing'));
    // Moved: the edge of the screen can turn the page, so the pages two away are drawn.
    fireEvent.pointerDown(screen.getByRole('button', { name: /^Tessera A,/ }), {
      pointerId: 4,
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(window, { pointerId: 4, clientX: 60, clientY: 60 });
    await waitFor(() => expect(document.querySelector('.aca-drag-ghost')).not.toBeNull());
    expect(lastDrawn()).toBe(home + 2);
    fireEvent.pointerCancel(window, { pointerId: 4 });
    await waitFor(() => expect(document.querySelector('.aca-drag-ghost')).toBeNull());
    // The window narrows later, at a moment of quiet like the one of a scroll (W3).
    await waitFor(() => expect(lastDrawn()).toBe(home + 1), { timeout: 4000 });
  });
});

describe('page overview (REP-20261007-028)', () => {
  class OverviewPointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
    }
  }
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    latest = null;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  /** A long press on `target` (a free cell by default) on «Casa». */
  async function longPress(target?: (page: HTMLElement) => Element | null, render = true) {
    vi.useFakeTimers();
    try {
      if (render) renderScreen();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      act(() => latest?.goToPageId('home'));
      const page = screen.getByRole('region', { name: 'Casa' });
      const element = target?.(page) ?? page.querySelector('[data-launcher-cell]') ?? page;
      fireEvent.pointerDown(element, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      act(() => {
        vi.advanceTimersByTime(1020);
      });
      fireEvent.pointerUp(element, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      // The click of the release, swallowed by the long press (no add sheet on the cell).
      fireEvent.click(element);
    } finally {
      vi.useRealTimers();
    }
  }
  /**
   * The page overview, opened as a finger does: a press and hold on an empty place (REP-20261021-003,
   * the request of 2026-10-21 reverses D-2). The focus stays where it was, on nothing.
   */
  async function openOverview(render = true) {
    await longPress(undefined, render);
  }
  /**
   * The page overview as Sistema → «Modifica le pagine» opens it (SystemPage): edit mode and the
   * overview together, while the launcher is hidden under Sistema, which then closes.
   */
  async function openOverviewFromSistema() {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      act(() => {
        latest?.setEditMode(true);
        latest?.setOverview(true);
      });
      visibility.mockReturnValue('visible');
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
    } finally {
      visibility.mockRestore();
    }
  }
  const pageIds = () => latest?.layout.pages.map((page) => page.id);
  const overviewBar = () => screen.getByRole('toolbar', { name: 'Pagine' });
  const notice = () => document.querySelector('.aca-undo');
  const spoken = () => document.querySelector('.sr-only[role="status"]');
  /** «Nuova» of the bar: an empty page at once (REP-20261009-002, D1). */
  const addPage = () => {
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Nuova pagina' }));
    fireEvent.click(screen.getByRole('button', { name: 'Griglia vuota' }));
  };
  /** The text a control shows: its hidden reason and its spoken words left out. */
  const shownText = (element: Element) => {
    const copy = element.cloneNode(true) as Element;
    copy.querySelectorAll('[hidden], .sr-only').forEach((node) => node.remove());
    return copy.textContent?.trim() ?? '';
  };

  it('opens on a long press on a free cell: indicator down at the top, bar of the pages up', async () => {
    await openOverview();
    expect(latest?.editMode).toBe(true);
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    // The top bar comes down with the overview, a working control (REP-20261021-003, 2026-10-21).
    expect(document.querySelector('.aca-indicator')).not.toHaveClass('aca-indicator--hidden');
    expect(document.querySelector('.aca-indicator')).not.toHaveClass('aca-indicator--passive');
    expect(document.querySelector('.aca-indicator')).not.toHaveAttribute('inert');
    const bar = overviewBar();
    expect(bar).not.toHaveClass('aca-page-overview--hidden');
    // Places that never move and «Fine» (REP-20261008-001); the name beside the house (D2).
    expect(
      within(bar)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent)
    ).toEqual([
      'Elimina la pagina Casa',
      'Nuova pagina',
      'Aggiungi widget',
      'Casa è la pagina principale',
      'Rinomina Casa',
      'Nascondi Casa',
      'Fine',
    ]);
    // Icons without words (D4): only the name and «Fine» show text, and no native tooltip.
    expect(
      within(bar)
        .getAllByRole('button')
        .map((button) => shownText(button))
    ).toEqual(['', '', '', '', 'Casa', '', 'Fine']);
    expect(bar.querySelector('[title]')).toBeNull();
    // «Principale» (home) cannot be deleted: still reachable, and a press says why.
    const trash = within(bar).getByRole('button', { name: 'Elimina la pagina Casa' });
    expect(trash).toHaveAttribute('aria-disabled', 'true');
    expect(trash).not.toBeDisabled();
    expect(trash).toHaveAccessibleDescription(
      'La pagina principale non si elimina: prima scegline un’altra con la casa.'
    );
    fireEvent.click(trash);
    expect(pageIds()).toEqual(['home', 'altra']);
    expect(notice()).toHaveTextContent('La pagina principale non si elimina');
    // The card shows no mark (the house in the bar says it); its opener says it to a screen reader.
    expect(screen.getByRole('button', { name: 'Apri Casa, principale' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Casa' })).not.toHaveTextContent('Principale');
  });

  it('a long press on an empty place leaves the page as it is while held, then shrinks it into the page overview: top bar down, bar of the pages up (the request of 2026-10-23)', async () => {
    vi.useFakeTimers();
    try {
      renderScreen();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      act(() => latest?.goToPageId('home'));
      const page = screen.getByRole('region', { name: 'Casa' });
      const empty = page.querySelector('[data-launcher-cell]') ?? page;
      expect(document.querySelector('.aca-indicator')).toHaveClass('aca-indicator--hidden');
      expect(document.querySelector('.aca-edit-toolbar')).toBeNull();
      fireEvent.pointerDown(empty, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      // Held: the counter runs, the page does not change, not at the start nor before the threshold.
      const pager = document.querySelector('.aca-pager')!;
      expect(pager).not.toHaveClass('is-pressing');
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(latest?.editMode).toBe(false);
      expect(latest?.overview).toBe(false);
      expect(pager).not.toHaveClass('is-pressing');
      expect(pager).not.toHaveClass('is-overview');
      // The threshold (LONG_PRESS_MS, 500): the shrink of the page starts, as the overview.
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(latest?.overview).toBe(true);
      expect(pager).toHaveClass('is-overview');
      expect(pager).not.toHaveClass('is-pressing');
      fireEvent.pointerUp(empty, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      fireEvent.click(empty);
      // The page overview, not the edit mode of the widgets.
      expect(latest?.editMode).toBe(true);
      expect(latest?.overview).toBe(true);
      expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
      expect(document.querySelector('.aca-pager')).not.toHaveClass('is-pressing');
      // The top bar comes down, the bar of the pages rises; no bar of the widgets is there.
      expect(document.querySelector('.aca-indicator')).not.toHaveClass('aca-indicator--hidden');
      expect(overviewBar()).not.toHaveClass('aca-page-overview--hidden');
      expect(document.querySelector('.aca-edit-toolbar')).toBeNull();
      // The commands with no face go out of the way.
      expect(document.querySelector('.aca-screen-commands')).toHaveAttribute('inert');
    } finally {
      vi.useRealTimers();
    }
  });

  it('the top bar goes up with the end of edit mode, and waits above while «Annulla» hangs from the top of the overview', async () => {
    await openOverview();
    const indicator = () => document.querySelector('.aca-indicator')!;
    expect(indicator()).not.toHaveClass('aca-indicator--hidden');
    // The pill of the notices hangs from the top of the overview: the indicator waits above it.
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Elimina la pagina Casa' }));
    expect(notice()).toHaveTextContent('La pagina principale non si elimina');
    expect(indicator()).toHaveClass('aca-indicator--hidden');
    // «Fine» ends edit mode: the indicator is up, the same as before the press.
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Fine' }));
    expect(latest?.editMode).toBe(false);
    expect(indicator()).toHaveClass('aca-indicator--hidden');
  });

  it('a long press on the body of a widget in use enters edit mode with it selected and its grip frame up (the request of 2026-10-21)', async () => {
    await longPress((page) => page.querySelector('[data-widget-id="test_tile_a"]'));
    expect(latest?.editMode).toBe(true);
    // The page overview is for the empty part: here the widget is edited.
    expect(latest?.overview).toBe(false);
    expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
    const widget = document.querySelector<HTMLElement>('[data-widget-id="test_tile_a"]')!;
    expect(widget).toHaveClass('is-selected');
    expect(widget.querySelector('.aca-resize-frame')).not.toBeNull();
    // Only the bar of the widget (remove, «Annulla», «Fine»): no «+ Widget» / «Pagine» bar, no tray
    // (the request of 2026-10-23); the widgets do not shake (LagLayers: no wiggle in the sheet).
    expect(document.querySelector('.aca-edit-toolbar')).toBeNull();
    expect(document.querySelector('.aca-widget-tray')).toBeNull();
    const bar = screen.getByRole('toolbar', { name: 'Modifica Tessera A' });
    expect(
      within(bar)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent)
    ).toEqual(['Rimuovi Tessera A', 'Annulla', 'Fine']);
    // Released without moving: the widget is back in its place, not carried.
    expect(document.querySelector('.aca-drag-ghost')).toBeNull();
  });

  it('a press held on a widget in use shrinks nothing, then lifts it after half a second (the request of 2026-10-21)', async () => {
    vi.useFakeTimers();
    try {
      renderScreen();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      act(() => latest?.goToPageId('home'));
      const widget = document.querySelector<HTMLElement>('[data-widget-id="test_tile_a"]')!;
      fireEvent.pointerDown(widget, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      // Neither the page nor the widget shrinks under the finger.
      expect(document.querySelector('.aca-pager')).not.toHaveClass('is-pressing');
      expect(widget).not.toHaveClass('is-pressing');
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(latest?.editMode).toBe(false);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(latest?.editMode).toBe(true);
      expect(latest?.overview).toBe(false);
      expect(widget).toHaveClass('is-selected');
      expect(widget).not.toHaveClass('is-pressing');
      expect(document.querySelector('.aca-drag-ghost')).not.toBeNull();
      expect(document.querySelector('.aca-pager')).not.toHaveClass('is-pressing');
      // The release, so the guard of its click does not outlive the test.
      fireEvent.pointerUp(window, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      fireEvent.click(widget);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('the same finger lifts and drags a widget in use (2026-10-21, «Pressione lunga e trascinamento nello stesso tocco»)', () => {
    class TouchPointer extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 0;
        this.pointerType = 'touch';
      }
    }
    const down = { pointerId: 1, button: 0, isPrimary: true, clientX: 10, clientY: 10 };
    /** A touchmove as Chrome sends the first one of a touch: cancelable. */
    const touchMove = (target: EventTarget) => {
      const event = new Event('touchmove', { bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event;
    };
    const ghostAt = () =>
      document.querySelector<HTMLElement>('.aca-drag-ghost')?.style.transform ?? null;
    async function onWidget() {
      vi.stubGlobal('PointerEvent', TouchPointer);
      vi.useFakeTimers();
      renderScreen();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      act(() => latest?.goToPageId('home'));
      return document.querySelector<HTMLElement>('[data-widget-id="test_tile_a"]')!;
    }
    afterEach(() => {
      // A new press ends the guard of the click of a release (its timer is a fake one).
      fireEvent.pointerDown(window, { pointerId: 99 });
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('moves the widget with the finger that held it, without lifting it', async () => {
      const widget = await onWidget();
      fireEvent.pointerDown(widget, down);
      act(() => vi.advanceTimersByTime(700));
      expect(latest?.editMode).toBe(true);
      const held = ghostAt();
      expect(held).not.toBeNull();
      // The very first move of the same pointer already carries the copy.
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 90, clientY: 60 });
      act(() => vi.advanceTimersByTime(20));
      expect(ghostAt()).not.toBe(held);
      expect(ghostAt()).toContain('80px');
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 90, clientY: 60 });
    });

    it('from the long press the touch moves are cancelled, so the browser neither scrolls nor cancels the touch', async () => {
      const widget = await onWidget();
      fireEvent.pointerDown(widget, down);
      act(() => vi.advanceTimersByTime(300));
      // Still holding: the page and the commands keep the touch.
      expect(touchMove(widget).defaultPrevented).toBe(false);
      expect(touchMove(window).defaultPrevented).toBe(false);
      act(() => vi.advanceTimersByTime(400));
      expect(latest?.editMode).toBe(true);
      // On the widget (the touch follows it even if it is redrawn away) and on the window.
      expect(touchMove(widget).defaultPrevented).toBe(true);
      expect(touchMove(window).defaultPrevented).toBe(true);
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10 });
      // The release gives the touch moves back: the next touch scrolls as usual.
      expect(touchMove(widget).defaultPrevented).toBe(false);
      expect(touchMove(window).defaultPrevented).toBe(false);
    });

    it('a swipe before the long press scrolls: nothing is cancelled, nothing lifts', async () => {
      const widget = await onWidget();
      fireEvent.pointerDown(widget, down);
      act(() => vi.advanceTimersByTime(200));
      fireEvent.pointerMove(widget, { pointerId: 1, clientX: 60, clientY: 10 });
      expect(touchMove(widget).defaultPrevented).toBe(false);
      act(() => vi.advanceTimersByTime(700));
      expect(latest?.editMode).toBe(false);
      expect(document.querySelector('.aca-drag-ghost')).toBeNull();
      expect(touchMove(window).defaultPrevented).toBe(false);
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 60, clientY: 10 });
    });

    it('lifted without moving, it only stays selected; the end of the touch gives the page back', async () => {
      const widget = await onWidget();
      fireEvent.pointerDown(widget, down);
      act(() => vi.advanceTimersByTime(700));
      expect(touchMove(window).defaultPrevented).toBe(true);
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.click(widget);
      expect(latest?.editMode).toBe(true);
      expect(widget).toHaveClass('is-selected');
      expect(document.querySelector('.aca-drag-ghost')).toBeNull();
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(touchMove(window).defaultPrevented).toBe(false);
    });

    it('a drag of over 2 s ends over a command and that command does not act (2026-10-22)', async () => {
      const widget = await onWidget();
      const command = document.createElement('button');
      const acted = vi.fn();
      command.addEventListener('click', acted);
      document.body.append(command);
      fireEvent.pointerDown(widget, down);
      act(() => vi.advanceTimersByTime(700));
      for (let step = 1; step <= 25; step++) {
        fireEvent.pointerMove(window, { pointerId: 1, clientX: 10 + step * 8, clientY: 10 });
        act(() => vi.advanceTimersByTime(100));
      }
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 210, clientY: 10 });
      const release = new MouseEvent('click', { bubbles: true, cancelable: true });
      Object.assign(release, { pointerId: 1 });
      act(() => {
        command.dispatchEvent(release);
      });
      expect(acted).not.toHaveBeenCalled();
      // The next touch is a new gesture: its click reaches the command.
      fireEvent.pointerDown(command, { pointerId: 2, button: 0, isPrimary: true });
      fireEvent.pointerUp(window, { pointerId: 2 });
      const next = new MouseEvent('click', { bubbles: true, cancelable: true });
      Object.assign(next, { pointerId: 2 });
      act(() => {
        command.dispatchEvent(next);
      });
      expect(acted).toHaveBeenCalledTimes(1);
      command.remove();
    });

    it('touchend and a cancelled pointer also end it', async () => {
      const widget = await onWidget();
      fireEvent.pointerDown(widget, down);
      act(() => vi.advanceTimersByTime(700));
      expect(touchMove(window).defaultPrevented).toBe(true);
      // The drag session of the hook cancels them too until it ends: end both.
      fireEvent(window, new Event('touchend'));
      fireEvent.pointerCancel(window, { pointerId: 1 });
      expect(touchMove(window).defaultPrevented).toBe(false);
      expect(touchMove(widget).defaultPrevented).toBe(false);
    });
  });

  it('the free cells of a page in use keep their «+»: a tap opens the add sheet (the request of 2026-10-21, D-8 reversed)', async () => {
    renderScreen();
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.goToPageId('home'));
    expect(latest?.editMode).toBe(false);
    const page = screen.getByRole('region', { name: 'Casa' });
    const cells = within(page).getAllByRole('button', { name: /^Aggiungi un widget: / });
    expect(cells.length).toBeGreaterThan(0);
    // Buttons with their «+», not quiet wells.
    expect(page.querySelectorAll('[data-launcher-well]')).toHaveLength(0);
    fireEvent.click(cells[0]);
    expect(screen.getByRole('dialog', { name: 'Aggiungi un widget' })).toBeInTheDocument();
    // A tap on a cell is not a long press: nothing else opens.
    expect(latest?.editMode).toBe(false);
    expect(latest?.overview).toBe(false);
  });

  describe('a press on a «+» (0.9.28, the answer of 2026-10-23: only small scales, D-M4)', () => {
    /** The cells of «Casa» and the first of them, the page being on screen. */
    const cellsOfHome = () => {
      const page = screen.getByRole('region', { name: 'Casa' });
      const all = [...page.querySelectorAll<HTMLElement>('button[data-launcher-cell]')];
      return { all, cell: all[0] };
    };
    const press = (target: Element, x = 10) =>
      fireEvent.pointerDown(target, {
        button: 0,
        isPrimary: true,
        pointerId: 1,
        clientX: x,
        clientY: 10,
      });
    beforeEach(() => {
      vi.stubGlobal('PointerEvent', OverviewPointer);
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('takes the cell down at once and the cell alone, and gives it back when the sheet it opens starts to move', async () => {
      renderScreen();
      await waitFor(() => expect(latest?.ready).toBe(true));
      act(() => latest?.goToPageId('home'));
      const { all, cell } = cellsOfHome();
      const pager = document.querySelector('.aca-pager')!;
      press(cell);
      // Pressed: the cell, not the page, not the other cells; no tap cue is played.
      expect(cell).toHaveClass('is-pressed');
      expect(all.slice(1).some((other) => other.classList.contains('is-pressed'))).toBe(false);
      expect(pager).not.toHaveClass('is-pressing');
      expect(pager).not.toHaveClass('is-overview');
      expect(cell).not.toHaveClass('is-tapped');
      fireEvent.pointerUp(cell, { button: 0, isPrimary: true, pointerId: 1, clientX: 10 });
      fireEvent.click(cell);
      // The sheet is asked for and has not moved yet: the cell covers the wait.
      expect(cell).toHaveClass('is-pressed');
      expect(latest?.overview).toBe(false);
      const sheet = document.querySelector<HTMLElement>('dialog.aca-sheet');
      expect(sheet).not.toBeNull();
      expect(screen.getByRole('dialog', { name: 'Aggiungi un widget' })).toBeInTheDocument();
      // Something else that transitions is not the sheet.
      act(() => {
        cell.dispatchEvent(new Event('transitionstart', { bubbles: true }));
      });
      expect(cell).toHaveClass('is-pressed');
      act(() => {
        sheet!.dispatchEvent(new Event('transitionstart', { bubbles: true }));
      });
      expect(cell).not.toHaveClass('is-pressed');
    });

    it('a finger that slips beyond the hold tolerance, or a touch the browser takes, gives the cell back and opens nothing', async () => {
      renderScreen();
      await waitFor(() => expect(latest?.ready).toBe(true));
      act(() => latest?.goToPageId('home'));
      const { cell } = cellsOfHome();
      press(cell);
      expect(cell).toHaveClass('is-pressed');
      // Within the tolerance the cell stays down; beyond it (a swipe from the «+») it comes back.
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 14, clientY: 10 });
      expect(cell).toHaveClass('is-pressed');
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 40, clientY: 10 });
      expect(cell).not.toHaveClass('is-pressed');
      press(cell);
      expect(cell).toHaveClass('is-pressed');
      // Another finger does not move it; the scroll taking the touch does (pointercancel).
      fireEvent.pointerCancel(window, { pointerId: 2 });
      expect(cell).toHaveClass('is-pressed');
      fireEvent.pointerCancel(window, { pointerId: 1 });
      expect(cell).not.toHaveClass('is-pressed');
      expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull();
      expect(latest?.overview).toBe(false);
    });

    it('a release whose sheet never moves gives the cell back after 700 ms; so does a long press, whose click is swallowed', async () => {
      vi.useFakeTimers();
      try {
        renderScreen();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(20);
        });
        act(() => latest?.goToPageId('home'));
        const { cell } = cellsOfHome();
        press(cell);
        act(() => {
          vi.advanceTimersByTime(1020);
        });
        // Held for the long press: the pages view is open, and the cell has not moved on its own.
        expect(latest?.overview).toBe(true);
        expect(cell).toHaveClass('is-pressed');
        fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10 });
        fireEvent.click(cell);
        act(() => {
          vi.advanceTimersByTime(699);
        });
        expect(cell).toHaveClass('is-pressed');
        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(cell).not.toHaveClass('is-pressed');
        expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('the cell shows no rotation, no keyframe and no class of the first 0.9.28 cue', async () => {
      renderScreen();
      await waitFor(() => expect(latest?.ready).toBe(true));
      act(() => latest?.goToPageId('home'));
      const { cell } = cellsOfHome();
      press(cell);
      fireEvent.pointerUp(cell, { button: 0, isPrimary: true, pointerId: 1, clientX: 10 });
      fireEvent.click(cell);
      expect(cell).not.toHaveClass('is-tapped');
      expect(cell.getAttribute('style') ?? '').not.toMatch(/rotate|animation/);
      expect(
        cell.querySelector('.aca-launcher-cell__content')?.getAttribute('style') ?? ''
      ).not.toMatch(/rotate|animation/);
    });
  });

  it('a press on an empty place that ends before the threshold changes nothing (the request of 2026-10-23)', async () => {
    vi.useFakeTimers();
    try {
      renderScreen();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      act(() => latest?.goToPageId('home'));
      const page = screen.getByRole('region', { name: 'Casa' });
      const pager = document.querySelector('.aca-pager')!;
      const before = pager.className;
      fireEvent.pointerDown(page, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(pager.className).toBe(before);
      fireEvent.pointerUp(page, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      // Released early: no shrink, no overview, no cue left on the page or on its cells.
      expect(pager.className).toBe(before);
      expect(latest?.overview).toBe(false);
      expect(latest?.editMode).toBe(false);
      expect(page.querySelector('.is-tapped')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a long press on a «+» cell opens the page overview and its release adds nothing', async () => {
    await longPress((page) => page.querySelector('button[data-launcher-cell]'));
    expect(latest?.overview).toBe(true);
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull();
  });

  describe('the release of a long press with the overview open (2026-10-22)', () => {
    /** A long press of the finger `pointerId` on a free cell of «Casa»; the overview opens. */
    async function holdWith(pointerId: number, heldMs = 1020) {
      vi.stubGlobal('PointerEvent', OverviewPointer);
      vi.useFakeTimers();
      renderScreen();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      act(() => latest?.goToPageId('home'));
      const cell = screen
        .getByRole('region', { name: 'Casa' })
        .querySelector('button[data-launcher-cell]') as HTMLElement;
      fireEvent.pointerDown(cell, {
        button: 0,
        isPrimary: true,
        pointerId,
        clientX: 10,
        clientY: 10,
      });
      act(() => {
        vi.advanceTimersByTime(1020);
      });
      expect(latest?.overview).toBe(true);
      // The finger stays down: the guard of the release click has no time limit of its own.
      act(() => {
        vi.advanceTimersByTime(heldMs - 1020);
      });
      // The overview shrank the page: under the finger now is the card of the next page.
      fireEvent.pointerUp(window, { button: 0, pointerId, clientX: 10, clientY: 10 });
      return screen.getByRole('button', { name: 'Apri Altra' });
    }
    /** A click as the browser makes it: a PointerEvent of the finger that was released. */
    const clickOf = (target: Element, pointerId: number) => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      Object.assign(event, { pointerId });
      act(() => {
        target.dispatchEvent(event);
      });
    };
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('does not open the card that lands under the finger: the overview stays', async () => {
      const card = await holdWith(7);
      clickOf(card, 7);
      expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
      expect(latest?.currentPageId).toBe('home');
      // The next touch is a new gesture, whose click is its own.
      fireEvent.pointerDown(card, { button: 0, isPrimary: true, pointerId: 8 });
      fireEvent.pointerUp(window, { button: 0, pointerId: 8 });
      clickOf(card, 8);
      expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
      expect(latest?.currentPageId).toBe('altra');
    });

    it.each([1500, 2500, 5000])(
      'a hold of %i ms released over the next card opens nothing: the overview stays',
      async (heldMs) => {
        const next = await holdWith(7, heldMs);
        clickOf(next, 7);
        expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
        expect(latest?.currentPageId).toBe('home');
        // A new touch after the release acts.
        fireEvent.pointerDown(next, { button: 0, isPrimary: true, pointerId: 8 });
        fireEvent.pointerUp(window, { button: 0, pointerId: 8 });
        clickOf(next, 8);
        expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
        expect(latest?.currentPageId).toBe('altra');
      }
    );

    it.each([1500, 2500, 5000])(
      'a hold of %i ms released over the current page keeps the overview',
      async (heldMs) => {
        await holdWith(7, heldMs);
        clickOf(screen.getByRole('button', { name: 'Apri Casa, principale' }), 7);
        expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
        expect(latest?.currentPageId).toBe('home');
        // A new touch after the release acts.
        const card = screen.getByRole('button', { name: 'Apri Altra' });
        fireEvent.pointerDown(card, { button: 0, isPrimary: true, pointerId: 8 });
        fireEvent.pointerUp(window, { button: 0, pointerId: 8 });
        clickOf(card, 8);
        expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
        expect(latest?.currentPageId).toBe('altra');
      }
    );

    it('lets through the click of another finger', async () => {
      const card = await holdWith(7);
      clickOf(card, 9);
      expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
      expect(latest?.currentPageId).toBe('altra');
    });
  });

  it('«Nuova» offers categories and adds an empty page right after the page in the centre', async () => {
    await openOverview();
    const add = within(overviewBar()).getByRole('button', { name: 'Nuova pagina' });
    // A plain action (D1): nothing to open.
    expect(add).not.toHaveAttribute('aria-expanded');
    expect(add).not.toHaveAttribute('aria-controls');
    addPage();
    expect(screen.queryByRole('dialog', { name: 'Nuova pagina' })).toBeNull();
    const ids = pageIds() ?? [];
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe('home');
    expect(ids[2]).toBe('altra');
    expect(latest?.currentPageId).toBe(ids[1]);
    expect(latest?.layout.pages[1]).toMatchObject({ kind: 'widgets', label: 'Nuova pagina' });
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    await waitFor(() =>
      expect(spoken()).toHaveTextContent(
        'Nuova pagina vuota aggiunta. Tocca il nome in basso per cambiarlo.'
      )
    );
    // Its name is in the bar, ready to be changed.
    expect(
      within(overviewBar()).getByRole('button', { name: 'Rinomina Nuova pagina' })
    ).toBeInTheDocument();
    // From the last page of the row: at the end.
    act(() => latest?.goToPageId('altra'));
    addPage();
    expect(pageIds()?.slice(0, 3)).toEqual(['home', ids[1], 'altra']);
    expect(latest?.layout.pages[3]).toMatchObject({ kind: 'widgets', label: 'Nuova pagina' });
    expect(latest?.currentPageId).toBe(latest?.layout.pages[3]?.id);
  });

  it('«Aggiungi widget» opens the sheet of the «+» cells; cancelled, the view stays and the focus returns to it (2026-10-23)', async () => {
    await openOverview();
    const before = JSON.stringify(latest?.layout);
    const button = within(overviewBar()).getByRole('button', { name: 'Aggiungi widget' });
    button.focus();
    fireEvent.click(button);
    const dialog = screen.getByRole('dialog', { name: 'Aggiungi un widget' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annulla' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Aggiungi un widget' })).toBeNull()
    );
    expect(latest?.overview).toBe(true);
    expect(latest?.editMode).toBe(true);
    expect(JSON.stringify(latest?.layout)).toBe(before);
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    await waitFor(() => expect(button).toHaveFocus());
  });

  it('«Aggiungi widget» adds a widget from the real sheet: the view closes and the widget is selected on its page (2026-10-23)', async () => {
    await openOverview();
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Aggiungi widget' }));
    const dialog = screen.getByRole('dialog', { name: 'Aggiungi un widget' });
    fireEvent.click(dialog.querySelector<HTMLElement>('[data-widget-type="spacer"]')!);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aggiungi il widget' }));
    const added = () =>
      latest?.layout.pages
        .flatMap((page) => Object.keys(page.placements.tablet ?? {}).map((id) => [page.id, id]))
        .filter(([, id]) => id.startsWith('spacer_card')) ?? [];
    await waitFor(() => expect(added()).toHaveLength(1));
    const [[pageId, widgetId]] = added();
    // «Casa» has room: the widget is there, the view has closed and the widget is selected.
    expect(pageId).toBe('home');
    await waitFor(() => expect(latest?.overview).toBe(false));
    await waitFor(() =>
      expect(document.querySelector(`[data-widget-id="${widgetId}"]`)).toHaveClass('is-selected')
    );
    expect(latest?.editMode).toBe(true);
    expect(screen.getByRole('toolbar', { name: /^Modifica / })).toBeInTheDocument();
  });

  it('deletes an empty page at once and asks first for a page with widgets', async () => {
    await openOverview();
    addPage();
    fireEvent.click(screen.getByRole('button', { name: 'Elimina la pagina Nuova pagina' }));
    expect(pageIds()).toEqual(['home', 'altra']);

    act(() => latest?.goToPageId('altra'));
    fireEvent.click(screen.getByRole('button', { name: 'Elimina la pagina Altra' }));
    const confirm = screen.getByRole('dialog', { name: 'Conferma l’eliminazione di Altra' });
    expect(within(confirm).getByText('Eliminare «Altra» e il suo widget?')).toBeInTheDocument();
    expect(pageIds()).toEqual(['home', 'altra']);
    fireEvent.click(within(confirm).getByRole('button', { name: 'Elimina' }));
    expect(pageIds()).toEqual(['home']);
  });

  it('moves a card with Alt + arrows on the card, the cover staying first', async () => {
    await openOverview();
    // The cover never moves: the keys are held anyway (the browser would go back) and it says why.
    const held = fireEvent.keyDown(screen.getByRole('button', { name: 'Apri Copertina' }), {
      key: 'ArrowRight',
      altKey: true,
    });
    expect(held).toBe(false);
    expect(pageIds()).toEqual(['home', 'altra']);
    expect(notice()).toHaveTextContent('La copertina resta sempre la prima pagina.');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Apri Altra' }), {
      key: 'ArrowLeft',
      altKey: true,
    });
    expect(pageIds()).toEqual(['altra', 'home']);
    // First now, without a page chosen with the house: the main page (basePageId).
    fireEvent.keyDown(screen.getByRole('button', { name: 'Apri Altra, principale' }), {
      key: 'ArrowLeft',
      altKey: true,
    });
    expect(pageIds()).toEqual(['altra', 'home']);
  });

  it('a tap on a card goes back to that page in use: no edit mode, no bar, nothing shaking (the request of 2026-10-23)', async () => {
    await openOverview();
    const opener = screen.getByRole('button', { name: 'Apri Altra' });
    act(() => opener.focus());
    fireEvent.click(opener);
    expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
    expect(latest?.currentPageId).toBe('altra');
    expect(latest?.editMode).toBe(false);
    expect(latest?.overview).toBe(false);
    // No bar of edit mode is there, the top bar goes up with it, the commands with no face are back.
    expect(document.querySelector('.aca-edit-toolbar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fine' })).toBeNull();
    expect(document.querySelector('.aca-page-overview:not(.aca-widget-actions)')).toHaveClass(
      'aca-page-overview--hidden'
    );
    expect(document.querySelector('.aca-widget-actions')).toHaveClass('aca-page-overview--hidden');
    // The indicator is only the passive cue of a page change, as in use.
    expect(document.querySelector('.aca-indicator')).toHaveClass('aca-indicator--passive');
    expect(document.querySelector('.aca-screen-commands')).not.toHaveAttribute('inert');
    // The widgets are in use: not editing (the style that shook them), none selected.
    expect(document.querySelector('.aca-launcher-widget.is-editing')).toBeNull();
    expect(document.querySelector('.aca-launcher-widget.is-selected')).toBeNull();
    expect(document.querySelector('.aca-launcher-grid.is-editing')).toBeNull();
    // The opener went with the overview: the focus goes to «Modifica la disposizione».
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Modifica la disposizione' })).toHaveFocus()
    );
  });

  it('a tap on the card of a hidden page keeps the overview open and says how to show it', async () => {
    await openOverview();
    act(() => latest?.updatePage('altra', { hidden: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Apri Altra, nascosta' }));
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    expect(latest?.editMode).toBe(true);
    expect(latest?.currentPageId).toBe('altra');
    expect(notice()).toHaveTextContent('La pagina è nascosta: tocca Mostra per rivederla.');
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Mostra Altra' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apri Altra' }));
    expect(latest?.editMode).toBe(false);
    expect(latest?.currentPageId).toBe('altra');
  });

  it('a tap on the name of a side card brings it to the centre', async () => {
    await openOverview();
    const side = screen.getByRole('region', { name: 'Altra' });
    expect(within(side).queryByRole('button', { name: 'Rinomina Altra' })).toBeNull();
    const name = side.querySelector('.aca-pager__name');
    if (!name) throw new Error('nome');
    fireEvent.click(name);
    expect(latest?.currentPageId).toBe('altra');
    expect(screen.getByRole('button', { name: 'Rinomina Altra' })).toBeInTheDocument();
  });

  it('Esc and «Fine» of the bar of the pages close the overview and end edit mode: back to the page in use (2026-10-23)', async () => {
    await openOverview();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
    expect(latest?.editMode).toBe(false);
    expect(document.querySelector('.aca-edit-toolbar')).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Modifica la disposizione' })).toHaveFocus()
    );

    await openOverview(false);
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Fine' }));
    expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
    expect(latest?.editMode).toBe(false);
    expect(latest?.currentPageId).toBe('home');
  });

  it('Sistema → «Modifica le pagine» opens the editor of the pages, on the name of the page', async () => {
    renderScreen();
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.goToPageId('home'));
    // No «+ Widget» / «Pagine» bar to open it from any more: Sistema does (2026-10-23).
    expect(screen.queryByRole('button', { name: 'Modifica le pagine' })).toBeNull();
    await openOverviewFromSistema();
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    expect(latest?.editMode).toBe(true);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Rinomina Casa' })).toHaveFocus()
    );
    await waitFor(() => expect(spoken()).toHaveTextContent('Pagine. Tocca una pagina per aprirla'));
    // The menu of a long touch on a card is held back: the card uses the gesture.
    expect(fireEvent.contextMenu(screen.getByRole('button', { name: 'Apri Altra' }))).toBe(false);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(latest?.editMode).toBe(false);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Modifica la disposizione' })).toHaveFocus()
    );
    // On the cover, which has no name to change, the focus goes to its card.
    act(() => latest?.goToPageId('cover'));
    await openOverviewFromSistema();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Apri Copertina' })).toHaveFocus()
    );
  });

  it('renames the page in the centre in place: Invio saves, Esc keeps the name', async () => {
    await openOverview();
    act(() => latest?.goToPageId('altra'));
    // The name is in the bar, beside the house (D2); under the card only arrows and columns.
    const card = screen.getByRole('region', { name: 'Altra' });
    expect(within(card).queryByRole('button', { name: /^Rinomina/ })).toBeNull();
    expect(card.querySelector('.aca-page-card')).not.toHaveTextContent('Altra');
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Rinomina Altra' }));
    const field = within(overviewBar()).getByRole('textbox', { name: 'Nome della pagina' });
    // Every icon and «Fine» step aside, out of reach: the bar is just the field.
    expect(within(overviewBar()).queryAllByRole('button')).toEqual([]);
    expect(field).toHaveValue('Altra');
    expect(field).toHaveFocus();
    expect(field).toHaveAccessibleDescription('Invio per salvare, Esc per annullare');
    // The whole name selected, to be typed over; the on-screen key says «done».
    expect((field as HTMLInputElement).selectionStart).toBe(0);
    expect((field as HTMLInputElement).selectionEnd).toBe('Altra'.length);
    expect(field).toHaveAttribute('enterkeyhint', 'done');
    expect(field).toHaveAttribute('autocomplete', 'off');
    // While the field is open the cards hold still.
    expect(document.querySelector('.aca-pager')).toHaveClass('is-locked');
    fireEvent.change(field, { target: { value: '  Cucina ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(latest?.layout.pages[1].label).toBe('Cucina');
    expect(screen.queryByRole('textbox', { name: 'Nome della pagina' })).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Rinomina Cucina' })).toHaveFocus()
    );
    await waitFor(() => expect(spoken()).toHaveTextContent('Nome cambiato: Cucina.'));
    expect(document.querySelector('.aca-pager')).not.toHaveClass('is-locked');
    expect(within(overviewBar()).getByRole('button', { name: 'Nascondi Cucina' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Rinomina Cucina' }));
    const again = screen.getByRole('textbox', { name: 'Nome della pagina' });
    fireEvent.change(again, { target: { value: 'Studio' } });
    fireEvent.keyDown(again, { key: 'Escape' });
    // Esc closes the field only: the overview stays and the name does not change.
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    expect(latest?.layout.pages[1].label).toBe('Cucina');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Rinomina Cucina' })).toHaveFocus()
    );
    await waitFor(() => expect(spoken()).toHaveTextContent('Nome invariato.'));
    // The cover has no name to change: shown, not a control; its house says why not.
    act(() => latest?.goToPageId('cover'));
    expect(screen.queryByRole('button', { name: 'Rinomina Copertina' })).toBeNull();
    expect(overviewBar().querySelector('.aca-page-overview__page')).toHaveTextContent('Copertina');
    expect(
      within(overviewBar()).getByRole('button', { name: 'Imposta Copertina come principale' })
    ).toHaveAccessibleDescription('La copertina non può essere la pagina principale.');
  });

  it('with the field open the house and «Fine» are out of reach; once it closes they act as always', async () => {
    await openOverview();
    act(() => latest?.goToPageId('altra'));
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Rinomina Altra' }));
    const field = within(overviewBar()).getByRole('textbox', { name: 'Nome della pagina' });
    fireEvent.change(field, { target: { value: 'Sala' } });
    expect(
      within(overviewBar()).queryByRole('button', { name: 'Imposta Altra come principale' })
    ).toBeNull();
    expect(within(overviewBar()).queryByRole('button', { name: 'Fine' })).toBeNull();
    // Leaving the field saves the name; the house then acts at the first press.
    fireEvent.blur(field);
    expect(latest?.layout.pages[1].label).toBe('Sala');
    fireEvent.click(
      within(overviewBar()).getByRole('button', { name: 'Imposta Sala come principale' })
    );
    expect(latest?.layout.homePageId).toBe('altra');

    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Rinomina Sala' }));
    const again = within(overviewBar()).getByRole('textbox', { name: 'Nome della pagina' });
    fireEvent.change(again, { target: { value: 'Studio' } });
    fireEvent.keyDown(again, { key: 'Enter' });
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Fine' }));
    expect(latest?.layout.pages[1].label).toBe('Studio');
    expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
  });

  it('an empty name is refused: with Invio in the field, leaving it in the notice pill', async () => {
    await openOverview();
    act(() => latest?.goToPageId('altra'));
    fireEvent.click(screen.getByRole('button', { name: 'Rinomina Altra' }));
    const field = screen.getByRole('textbox', { name: 'Nome della pagina' });
    fireEvent.change(field, { target: { value: '   ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.getByText('Il nome non può essere vuoto: resta quello di prima.')
    ).toBeInTheDocument();
    // Read aloud too; the pill is left for leaving the field.
    await waitFor(() =>
      expect(spoken()).toHaveTextContent('Il nome non può essere vuoto: resta quello di prima.')
    );
    expect(notice()?.textContent).not.toContain('Il nome non può essere vuoto');
    fireEvent.blur(field);
    expect(screen.queryByRole('textbox', { name: 'Nome della pagina' })).toBeNull();
    expect(latest?.layout.pages[1].label).toBe('Altra');
    expect(notice()).toHaveTextContent('Il nome non può essere vuoto: resta quello di prima.');
  });

  it('leaving the field saves a new name; the same name writes nothing', async () => {
    await openOverview();
    act(() => latest?.goToPageId('altra'));
    fireEvent.click(screen.getByRole('button', { name: 'Rinomina Altra' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome della pagina' }), {
      target: { value: ' Studio ' },
    });
    fireEvent.blur(screen.getByRole('textbox', { name: 'Nome della pagina' }));
    expect(latest?.layout.pages[1].label).toBe('Studio');
    expect(screen.queryByRole('textbox', { name: 'Nome della pagina' })).toBeNull();
    await waitFor(() => expect(spoken()).toHaveTextContent('Nome cambiato: Studio.'));

    fireEvent.click(screen.getByRole('button', { name: 'Rinomina Studio' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Nome della pagina' }), {
      key: 'Escape',
    });
    await waitFor(() => expect(spoken()).toHaveTextContent('Nome invariato.'));
    const before = latest?.layout;
    fireEvent.click(screen.getByRole('button', { name: 'Rinomina Studio' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Nome della pagina' }), {
      key: 'Enter',
    });
    expect(screen.queryByRole('textbox', { name: 'Nome della pagina' })).toBeNull();
    expect(latest?.layout).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: 'Rinomina Studio' }));
    fireEvent.blur(screen.getByRole('textbox', { name: 'Nome della pagina' }));
    expect(latest?.layout).toBe(before);
    // Nothing is said either: the last words stay.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    expect(spoken()).toHaveTextContent('Nome invariato.');

    // The name is said as the card shows it.
    fireEvent.click(screen.getByRole('button', { name: 'Rinomina Studio' }));
    const field = screen.getByRole('textbox', { name: 'Nome della pagina' });
    fireEvent.change(field, { target: { value: 'TV' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Rinomina Tv' })).toBeInTheDocument();
    await waitFor(() => expect(spoken()).toHaveTextContent('Nome cambiato: Tv.'));
  });

  it('Alt + arrows on the name move the page as on the card', async () => {
    await openOverview();
    act(() => latest?.goToPageId('altra'));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Rinomina Altra' }), {
      key: 'ArrowLeft',
      altKey: true,
    });
    expect(pageIds()).toEqual(['altra', 'home']);
  });

  /** «Casa», «Altra» and a third page «Terza». */
  const withThird = () =>
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [...layout.pages, { id: 'terza', label: 'Terza', kind: 'widgets', placements: {} }],
      })
    );

  it('Alt + arrows on the name move the page again and again, the focus staying on the name', async () => {
    withThird();
    await openOverview();
    act(() => latest?.goToPageId('terza'));
    const name = screen.getByRole('button', { name: 'Rinomina Terza' });
    act(() => name.focus());
    // Held both times: the browser would go back a page with Alt + ←.
    expect(fireEvent.keyDown(name, { key: 'ArrowLeft', altKey: true })).toBe(false);
    expect(pageIds()).toEqual(['home', 'terza', 'altra']);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(screen.getByRole('button', { name: 'Rinomina Terza' })).toHaveFocus();
    const focused = document.activeElement;
    if (!focused) throw new Error('focus');
    expect(fireEvent.keyDown(focused, { key: 'ArrowLeft', altKey: true })).toBe(false);
    expect(pageIds()).toEqual(['terza', 'home', 'altra']);
  });

  it('Alt + arrows on the name of the main page, right after opening, keep that page in the centre', async () => {
    withThird();
    // No page chosen: the centre follows the main page (the first), which the new order changes.
    renderScreen();
    await waitFor(() => expect(latest?.ready).toBe(true));
    await openOverviewFromSistema();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Rinomina Casa' })).toHaveFocus()
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Rinomina Casa' }), {
      key: 'ArrowRight',
      altKey: true,
    });
    expect(pageIds()).toEqual(['altra', 'home', 'terza']);
    expect(latest?.currentPageId).toBe('home');
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    // The name in the bar is still the moved page: the second press moves it on, not «Altra».
    expect(screen.getByRole('button', { name: 'Rinomina Casa' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Rinomina Casa' }), {
      key: 'ArrowRight',
      altKey: true,
    });
    expect(pageIds()).toEqual(['altra', 'terza', 'home']);
    expect(latest?.currentPageId).toBe('home');
  });

  it('an arrow that can still be used keeps the focus; at the end the other one takes it', async () => {
    withThird();
    await openOverview();
    const after = screen.getByRole('button', { name: 'Sposta Casa dopo' });
    act(() => after.focus());
    fireEvent.click(after);
    expect(pageIds()).toEqual(['altra', 'home', 'terza']);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(screen.getByRole('button', { name: 'Sposta Casa dopo' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Sposta Casa dopo' }));
    expect(pageIds()).toEqual(['altra', 'terza', 'home']);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sposta Casa prima' })).toHaveFocus()
    );
  });

  it('the arrows under the card move the page and keep the focus, with the reason at the ends', async () => {
    await openOverview();
    act(() => latest?.goToPageId('altra'));
    const after = screen.getByRole('button', { name: 'Sposta Altra dopo' });
    expect(after).toHaveAttribute('aria-disabled', 'true');
    expect(after).toHaveAccessibleDescription('È già l’ultima pagina.');
    fireEvent.click(after);
    expect(pageIds()).toEqual(['home', 'altra']);
    expect(notice()).toHaveTextContent('È già l’ultima pagina.');

    const before = screen.getByRole('button', { name: 'Sposta Altra prima' });
    act(() => before.focus());
    fireEvent.click(before);
    expect(pageIds()).toEqual(['altra', 'home']);
    await waitFor(() => expect(spoken()).toHaveTextContent('Altra: posizione 2 di 3.'));
    // Now first after the cover: the arrow used says why, the focus is on the other one.
    expect(screen.getByRole('button', { name: 'Sposta Altra prima' })).toHaveAccessibleDescription(
      'La copertina resta sempre la prima pagina.'
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sposta Altra dopo' })).toHaveFocus()
    );
  });

  it('under the card plain icons without words; Alt + arrows on an arrow move the page (D3)', async () => {
    withThird();
    await openOverview();
    act(() => latest?.goToPageId('altra'));
    const card = screen.getByRole('region', { name: 'Altra' });
    const controls = card.querySelector('.aca-page-card');
    if (!controls) throw new Error('controlli');
    expect(
      within(card)
        .getAllByRole('button')
        .filter((button) => controls.contains(button))
        .map((button) => [button.getAttribute('aria-label'), shownText(button)])
    ).toEqual([
      ['Sposta Altra prima', ''],
      ['Meno colonne', ''],
      ['Più colonne', ''],
      ['Sposta Altra dopo', ''],
    ]);
    // No words but the number of columns; no raised buttons, plain icons of 44 px.
    expect(shownText(controls)).toBe('8');
    expect(controls.querySelector('.aca-m')).toBeNull();
    expect(controls.querySelectorAll('.aca-bar-button')).toHaveLength(4);
    expect(controls.querySelector('[title]')).toBeNull();
    const before = within(card).getByRole('button', { name: 'Sposta Altra prima' });
    act(() => before.focus());
    expect(fireEvent.keyDown(before, { key: 'ArrowLeft', altKey: true })).toBe(false);
    expect(pageIds()).toEqual(['altra', 'home', 'terza']);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Sposta Altra dopo' }), {
      key: 'ArrowRight',
      altKey: true,
    });
    expect(pageIds()).toEqual(['home', 'altra', 'terza']);
  });

  it('a finger held on an icon of the editor shows its tip and does not act (D5)', async () => {
    class FingerPointer extends OverviewPointer {
      pointerType = 'touch';
    }
    vi.stubGlobal('PointerEvent', FingerPointer);
    /** No page sinks or lifts, the order and the overview stay. */
    const expectNoLift = () => {
      for (const page of document.querySelectorAll('.aca-pager__page')) {
        expect(page).not.toHaveClass('is-pressing');
        expect(page).not.toHaveClass('is-lifted');
      }
      expect(spoken()?.textContent ?? '').not.toContain('sollevata');
      expect(pageIds()).toEqual(['home', 'altra']);
      expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    };
    try {
      await openOverview();
      vi.useFakeTimers();
      const add = within(overviewBar()).getByRole('button', { name: 'Nuova pagina' });
      fireEvent.pointerDown(add, { button: 0, pointerId: 4, clientX: 5, clientY: 5 });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByRole('tooltip')).toHaveTextContent('Nuova pagina vuota');
      // Held past the 1 s that lifts a card: the bar ignores the press of the overview.
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expectNoLift();
      fireEvent.pointerUp(add, { button: 0, pointerId: 4, clientX: 5, clientY: 5 });
      fireEvent.click(add, { detail: 1 });
      expect(pageIds()).toEqual(['home', 'altra']);
      // The tip stays a moment after the finger lifts, to be read.
      expect(screen.getByRole('tooltip')).toHaveTextContent('Nuova pagina vuota');
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.queryByRole('tooltip')).toBeNull();
      // An action that cannot be taken shows its reason, and says nothing at the release.
      const trash = within(overviewBar()).getByRole('button', { name: 'Elimina la pagina Casa' });
      fireEvent.pointerDown(trash, { button: 0, pointerId: 5, clientX: 5, clientY: 5 });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        'Elimina la paginaLa pagina principale non si elimina'
      );
      fireEvent.pointerUp(trash, { button: 0, pointerId: 5, clientX: 5, clientY: 5 });
      fireEvent.click(trash, { detail: 1 });
      expect(notice()?.textContent ?? '').not.toContain('La pagina principale non si elimina');
      // Under the card too: the arrow keeps the page where it is.
      const after = screen.getByRole('button', { name: 'Sposta Casa dopo' });
      fireEvent.pointerDown(after, { button: 0, pointerId: 6, clientX: 5, clientY: 5 });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByRole('tooltip')).toHaveTextContent('Sposta dopo');
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expectNoLift();
      fireEvent.pointerUp(after, { button: 0, pointerId: 6, clientX: 5, clientY: 5 });
      fireEvent.click(after, { detail: 1 });
      expect(pageIds()).toEqual(['home', 'altra']);
      expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
      // A short tap acts.
      fireEvent.pointerDown(add, { button: 0, pointerId: 7, clientX: 5, clientY: 5 });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.pointerUp(add, { button: 0, pointerId: 7, clientX: 5, clientY: 5 });
      fireEvent.click(add, { detail: 1 });
      fireEvent.click(screen.getByRole('button', { name: 'Griglia vuota' }));
      expect(pageIds()).toHaveLength(3);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('the arrows move a page with its continuations, past a whole family, and say where', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          ...layout.pages,
          {
            id: 'altra_2',
            label: 'Altra 2',
            kind: 'widgets',
            continuationOf: 'altra',
            placements: {},
          },
        ],
      })
    );
    await openOverview();
    act(() => latest?.goToPageId('altra'));
    // Its continuation follows it: the family is already at the end.
    const after = screen.getByRole('button', { name: 'Sposta Altra dopo' });
    expect(after).toHaveAttribute('aria-disabled', 'true');
    expect(after).toHaveAccessibleDescription('Con le sue pagine di seguito è già in fondo.');
    fireEvent.click(after);
    expect(pageIds()).toEqual(['home', 'altra', 'altra_2']);
    expect(notice()).toHaveTextContent('Con le sue pagine di seguito è già in fondo.');
    // The same from the keyboard on the card.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Apri Altra' }), {
      key: 'ArrowRight',
      altKey: true,
    });
    expect(pageIds()).toEqual(['home', 'altra', 'altra_2']);

    // «Casa» steps past the whole family: last of four cards, the cover included.
    act(() => latest?.goToPageId('home'));
    fireEvent.click(screen.getByRole('button', { name: 'Sposta Casa dopo' }));
    expect(pageIds()).toEqual(['altra', 'altra_2', 'home']);
    await waitFor(() => expect(spoken()).toHaveTextContent('Casa: posizione 4 di 4.'));

    // The continuation takes its family with it.
    act(() => latest?.goToPageId('altra_2'));
    expect(screen.getByRole('button', { name: 'Sposta Altra 2 prima' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sposta Altra 2 dopo' }));
    expect(pageIds()).toEqual(['home', 'altra', 'altra_2']);
    await waitFor(() => expect(spoken()).toHaveTextContent('Altra 2: posizione 4 di 4.'));
    act(() => latest?.goToPageId('altra_2'));
    expect(screen.getByRole('button', { name: 'Sposta Altra 2 dopo' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('«prima» steps past a whole family too', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          ...layout.pages,
          {
            id: 'altra_2',
            label: 'Altra 2',
            kind: 'widgets',
            continuationOf: 'altra',
            placements: {},
          },
          { id: 'b', label: 'B', kind: 'widgets', placements: {} },
        ],
      })
    );
    await openOverview();
    act(() => latest?.goToPageId('b'));
    fireEvent.click(screen.getByRole('button', { name: 'Sposta B prima' }));
    expect(pageIds()).toEqual(['home', 'b', 'altra', 'altra_2']);
    await waitFor(() => expect(spoken()).toHaveTextContent('B: posizione 3 di 5.'));
  });

  it('holding a card for a second lifts it: dropped further on, the family moves together', async () => {
    vi.stubGlobal('PointerEvent', OverviewPointer);
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          ...layout.pages,
          {
            id: 'altra_2',
            label: 'Altra 2',
            kind: 'widgets',
            continuationOf: 'altra',
            placements: {},
          },
        ],
      })
    );
    try {
      await openOverview();
      vi.useFakeTimers();
      const card = screen.getByRole('button', { name: 'Apri Altra' });
      fireEvent.pointerDown(card, { button: 0, pointerId: 7, clientX: 50, clientY: 50 });
      act(() => {
        vi.advanceTimersByTime(250);
      });
      // Held: the card rises little by little, not lifted yet.
      expect(card.closest('.aca-pager__page')).toHaveClass('is-pressing');
      act(() => {
        vi.advanceTimersByTime(270);
      });
      expect(card.closest('.aca-pager__page')).toHaveClass('is-lifted');
      act(() => {
        vi.advanceTimersByTime(40);
      });
      expect(spoken()).toHaveTextContent(
        'Altra sollevata: trascinala a destra o a sinistra e lasciala.'
      );
      // jsdom has no layout: one card is 1 px apart.
      fireEvent.pointerMove(window, { pointerId: 7, clientX: 49, clientY: 50 });
      fireEvent.pointerUp(window, { pointerId: 7, clientX: 49, clientY: 50 });
      // The click of the release does not open the page.
      fireEvent.click(card);
      expect(pageIds()).toEqual(['altra', 'altra_2', 'home']);
      expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');

      // The cover does not lift: holding it says why.
      const cover = screen.getByRole('button', { name: 'Apri Copertina' });
      fireEvent.pointerDown(cover, { button: 0, pointerId: 8, clientX: 50, clientY: 50 });
      act(() => {
        vi.advanceTimersByTime(1020);
      });
      fireEvent.pointerUp(window, { pointerId: 8, clientX: 50, clientY: 50 });
      fireEvent.click(cover);
      expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
      expect(notice()).toHaveTextContent('La copertina resta sempre la prima pagina.');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('dropped forward over a page, a page with continuations lands where it was shown', async () => {
    vi.stubGlobal('PointerEvent', OverviewPointer);
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          ...layout.pages,
          {
            id: 'altra_2',
            label: 'Altra 2',
            kind: 'widgets',
            continuationOf: 'altra',
            placements: {},
          },
          { id: 'terza', label: 'Terza', kind: 'widgets', placements: {} },
          { id: 'quarta', label: 'Quarta', kind: 'widgets', placements: {} },
        ],
      })
    );
    try {
      await openOverview();
      vi.useFakeTimers();
      const card = screen.getByRole('button', { name: 'Apri Altra' });
      fireEvent.pointerDown(card, { button: 0, pointerId: 7, clientX: 50, clientY: 50 });
      act(() => {
        vi.advanceTimersByTime(1020);
      });
      // Two cards on (1 px each in jsdom): «Altra 2» and «Terza» make room, «Quarta» stays after.
      fireEvent.pointerMove(window, { pointerId: 7, clientX: 52, clientY: 50 });
      fireEvent.pointerUp(window, { pointerId: 7, clientX: 52, clientY: 50 });
      expect(pageIds()).toEqual(['home', 'terza', 'altra', 'altra_2', 'quarta']);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('a lifted card held at an edge turns the centre one card at a time (the overview has no scroll)', async () => {
    vi.stubGlobal('PointerEvent', OverviewPointer);
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          ...layout.pages,
          { id: 'terza', label: 'Terza', kind: 'widgets', placements: {} },
          { id: 'quarta', label: 'Quarta', kind: 'widgets', placements: {} },
        ],
      })
    );
    const centre = () =>
      document.querySelector('.aca-pager__page.is-current')?.getAttribute('aria-label');
    try {
      await openOverview();
      act(() => latest?.goToPageId('terza'));
      vi.useFakeTimers();
      const card = screen.getByRole('button', { name: 'Apri Terza' });
      fireEvent.pointerDown(card, { button: 0, pointerId: 7, clientX: 50, clientY: 50 });
      act(() => {
        vi.advanceTimersByTime(1020);
      });
      expect(card.closest('.aca-pager__page')).toHaveClass('is-lifted');
      // Held at the left edge (jsdom: the pager has no width, so every x is an edge).
      fireEvent.pointerMove(window, { pointerId: 7, clientX: 5, clientY: 50 });
      expect(centre()).toBe('Terza');
      act(() => {
        vi.advanceTimersByTime(460);
      });
      expect(centre()).toBe('Altra');
      act(() => {
        vi.advanceTimersByTime(450);
      });
      expect(centre()).toBe('Casa');
      fireEvent.pointerUp(window, { pointerId: 7, clientX: 5, clientY: 50 });
      // Let go: the turning stops, the overview stays.
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(centre()).toBe('Casa');
      expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('while a name is edited a card held for a second neither rises nor lifts', async () => {
    vi.stubGlobal('PointerEvent', OverviewPointer);
    try {
      await openOverview();
      act(() => latest?.goToPageId('altra'));
      fireEvent.click(screen.getByRole('button', { name: 'Rinomina Altra' }));
      vi.useFakeTimers();
      const card = screen.getByRole('button', { name: 'Apri Casa, principale' });
      fireEvent.pointerDown(card, { button: 0, pointerId: 7, clientX: 50, clientY: 50 });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(card.closest('.aca-pager__page')).not.toHaveClass('is-pressing');
      act(() => {
        vi.advanceTimersByTime(420);
      });
      expect(card.closest('.aca-pager__page')).not.toHaveClass('is-lifted');
      fireEvent.pointerMove(window, { pointerId: 7, clientX: 52, clientY: 50 });
      fireEvent.pointerUp(window, { pointerId: 7, clientX: 52, clientY: 50 });
      expect(pageIds()).toEqual(['home', 'altra']);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('the house sets the page in the centre as the main page (REP-20261007-033)', async () => {
    await openOverview();
    act(() => latest?.goToPageId('altra'));
    fireEvent.click(screen.getByRole('button', { name: 'Imposta Altra come principale' }));
    expect(latest?.layout.homePageId).toBe('altra');
    expect(screen.getByRole('button', { name: 'Altra è la pagina principale' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // The main page is never deleted; «Casa» now can be.
    expect(screen.getByRole('button', { name: 'Elimina la pagina Altra' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Apri Altra, principale' })).toBeInTheDocument();
  });

  it('hides and shows a page; the main page does not hide and says why', async () => {
    await openOverview();
    const hideMain = within(overviewBar()).getByRole('button', { name: 'Nascondi Casa' });
    expect(hideMain).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(hideMain);
    expect(latest?.layout.pages[0].hidden).toBeUndefined();
    expect(notice()).toHaveTextContent(
      'La pagina principale non si nasconde: prima scegline un’altra con la casa.'
    );

    act(() => latest?.goToPageId('altra'));
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Nascondi Altra' }));
    expect(latest?.layout.pages[1].hidden).toBe(true);
    await waitFor(() =>
      expect(spoken()).toHaveTextContent('Altra nascosta: non compare scorrendo le pagine.')
    );
    const card = screen.getByRole('region', { name: 'Altra' });
    expect(card).toHaveClass('is-hidden');
    expect(card).not.toHaveTextContent('Nascosta');
    expect(screen.getByRole('button', { name: 'Apri Altra, nascosta' })).toBeInTheDocument();
    // A hidden page cannot become the main page.
    const house = within(overviewBar()).getByRole('button', {
      name: 'Imposta Altra come principale',
    });
    expect(house).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Mostra Altra' }));
    expect(latest?.layout.pages[1].hidden).toBeUndefined();
    await waitFor(() => expect(spoken()).toHaveTextContent('Altra di nuovo visibile.'));
  });

  it('the cover that is off keeps its card in the overview only, to be shown again', async () => {
    await openOverview();
    act(() => latest?.goToPageId('cover'));
    const trash = within(overviewBar()).getByRole('button', {
      name: 'Elimina la pagina Copertina',
    });
    expect(trash).toHaveAccessibleDescription('La copertina non si elimina: puoi nasconderla.');
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Nascondi Copertina' }));
    expect(latest?.layout.cover.enabled).toBe(false);
    // Still a card, hidden, in the overview.
    expect(latest?.entries.map((entry) => entry.key)).toEqual(['cover', 'home', 'altra']);
    expect(screen.getByRole('region', { name: 'Copertina' })).not.toHaveTextContent('Nascosta');
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Mostra Copertina' }));
    expect(latest?.layout.cover.enabled).toBe(true);

    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Nascondi Copertina' }));
    // Its card does not open: there is no page outside the overview. It comes to the centre.
    act(() => latest?.goToPageId('home'));
    fireEvent.click(screen.getByRole('button', { name: 'Apri Copertina, nascosta' }));
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    expect(latest?.entries[latest.currentPage]?.key).toBe('cover');
    expect(notice()).toHaveTextContent('La copertina è nascosta: tocca Mostra per rivederla.');
    // Out of the overview the cover that is off has no page; Esc ends edit mode as well.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(latest?.editMode).toBe(false);
    expect(latest?.entries.map((entry) => entry.key)).toEqual(['home', 'altra']);
    expect(latest?.currentPageId).toBe('home');
    // Back in the editor, the card in the centre is the page shown, not the cover.
    await openOverviewFromSistema();
    expect(latest?.entries[latest.currentPage]?.key).toBe('home');
  });

  it('the columns of the page change under the card, with «Annulla»', async () => {
    await openOverview();
    const columns = screen.getByRole('group', { name: 'Colonne di Casa' });
    // The tablet at normal density: 8 × 5, the grid of the pages without a choice. Shown as
    // the number of columns alone (D3), the rows said to the screen reader.
    expect(shownText(columns)).toBe('8');
    expect(columns).toHaveTextContent('8 colonne e 5 righe');
    fireEvent.click(within(columns).getByRole('button', { name: 'Più colonne' }));
    expect(latest?.layout.pages[0].columns).toBe(9);
    expect(latest?.gridFor('home')).toEqual({ w: 9, h: 4 });
    expect(screen.getByRole('group', { name: 'Colonne di Casa' })).toHaveTextContent(
      '9 colonne e 4 righe'
    );
    await waitFor(() => expect(spoken()).toHaveTextContent('Casa: 9 colonne e 4 righe.'));
    expect(notice()).toHaveTextContent('Casa: 9 colonne');
    // An action that cannot be taken meanwhile is only read aloud: «Annulla» stays.
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Elimina la pagina Casa' }));
    await waitFor(() =>
      expect(spoken()).toHaveTextContent(
        'La pagina principale non si elimina: prima scegline un’altra con la casa.'
      )
    );
    expect(notice()).toHaveTextContent('Casa: 9 colonne');
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeInTheDocument();

    const more = within(screen.getByRole('group', { name: 'Colonne di Casa' })).getByRole(
      'button',
      { name: 'Più colonne' }
    );
    fireEvent.click(more);
    expect(latest?.layout.pages[0].columns).toBe(10);
    // At the most of the screen: still reachable, and a press says why.
    expect(more).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(more);
    expect(latest?.layout.pages[0].columns).toBe(10);
    await waitFor(() => expect(spoken()).toHaveTextContent('Massimo su questo schermo.'));
    expect(notice()).toHaveTextContent('Casa: 10 colonne');

    fireEvent.click(within(columns).getByRole('button', { name: 'Meno colonne' }));
    expect(latest?.layout.pages[0].columns).toBe(9);
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(latest?.layout.pages[0].columns).toBe(10);
    await waitFor(() => expect(spoken()).toHaveTextContent('Colonne di Casa come prima.'));
    // The special pages have no columns; the cover has them, three at the least.
    act(() => latest?.goToPageId('cover'));
    const cover = screen.getByRole('group', { name: 'Colonne di Copertina' });
    expect(cover).toHaveTextContent('3 colonne e 1 riga');
    const fewer = within(cover).getByRole('button', { name: 'Meno colonne' });
    expect(fewer).toHaveAttribute('aria-disabled', 'true');
    expect(fewer).toHaveAccessibleDescription('Servono più colonne per i suoi widget.');
  });

  it('fewer columns send widgets on; a step from the continuation that empties centres its family', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          layout.pages[0],
          {
            id: 'altra',
            label: 'Altra',
            kind: 'widgets',
            columns: 3,
            placements: {
              'tablet@3x1': {
                test_tile_c: { x: 0, y: 0, w: 1, h: 1 },
                test_tile_d: { x: 1, y: 0, w: 1, h: 1 },
                test_tile_e: { x: 2, y: 0, w: 1, h: 1 },
              },
            },
          },
        ],
      })
    );
    await openOverview();
    act(() => latest?.goToPageId('altra'));
    expect(screen.getByRole('group', { name: 'Colonne di Altra' })).toHaveTextContent(
      '3 colonne e 1 riga'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Meno colonne' }));
    expect(pageIds()).toEqual(['home', 'altra', 'altra_2']);
    await waitFor(() =>
      expect(spoken()).toHaveTextContent('Altra: 2 colonne e 1 riga. 1 widget spostato in Altra 2.')
    );

    // From the card of the continuation the choice is the family's: back to 3, it empties.
    act(() => latest?.goToPageId('altra_2'));
    fireEvent.click(screen.getByRole('button', { name: 'Più colonne' }));
    expect(pageIds()).toEqual(['home', 'altra']);
    await waitFor(() => expect(spoken()).toHaveTextContent('Altra: 3 colonne e 1 riga.'));
    expect(spoken()?.textContent).not.toContain('spostat');
    expect(latest?.currentPageId).toBe('altra');
    expect(notice()).toHaveTextContent('Altra: 3 colonne');
  });

  it('on the phone the columns shown are half the stored ones, with the limits of the screen', async () => {
    harnessDevice = 'phone';
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [...layout.pages, { id: 'luci', label: 'Luci', kind: 'lights', placements: {} }],
      })
    );
    try {
      await openOverview();
      const group = () => screen.getByRole('group', { name: 'Colonne di Casa' });
      const less = () => within(group()).getByRole('button', { name: 'Meno colonne' });
      expect(group()).toHaveTextContent('4 colonne e 6 righe');
      fireEvent.click(less());
      // Saved as the columns of a landscape screen: 3 shown here are 6 there.
      expect(latest?.layout.pages[0].columns).toBe(6);
      expect(group()).toHaveTextContent('3 colonne e 5 righe');
      fireEvent.click(less());
      expect(latest?.layout.pages[0].columns).toBe(4);
      expect(less()).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(less());
      expect(latest?.layout.pages[0].columns).toBe(4);
      await waitFor(() => expect(spoken()).toHaveTextContent('Minimo su questo schermo.'));

      // The cover at its least: its widgets need the columns.
      act(() => latest?.goToPageId('cover'));
      const cover = screen.getByRole('group', { name: 'Colonne di Copertina' });
      expect(
        within(cover).getByRole('button', { name: 'Meno colonne' })
      ).toHaveAccessibleDescription('Servono più colonne per i suoi widget.');
      // A special page has no columns.
      act(() => latest?.goToPageId('luci'));
      expect(screen.getByRole('button', { name: 'Rinomina Luci' })).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Colonne di Luci' })).toBeNull();
      // Nor can it be the main page: the house says why.
      const house = within(overviewBar()).getByRole('button', {
        name: 'Imposta Luci come principale',
      });
      expect(house).toHaveAttribute('aria-disabled', 'true');
      expect(house).toHaveAccessibleDescription(
        'Solo una pagina di widget può essere la principale.'
      );
      fireEvent.click(house);
      expect(latest?.layout.homePageId).toBeUndefined();
      await waitFor(() =>
        expect(spoken()).toHaveTextContent('Solo una pagina di widget può essere la principale.')
      );
    } finally {
      harnessDevice = 'tablet';
    }
  });

  it('locked: the long press and «Modifica» only say how to unlock', async () => {
    renderScreen();
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.setLayoutOptions({ locked: true }));
    await longPress(undefined, false);
    expect(latest?.editMode).toBe(false);
    expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
    expect(document.querySelector('.aca-undo')).toHaveTextContent('Disposizione bloccata');
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    expect(latest?.editMode).toBe(false);
  });
});

describe('the pages view as a staged scene (REP-20261023-006, D-M3, D-M18, D-M25)', () => {
  class StagedPointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
    }
  }
  const pagerEl = () => document.querySelector<HTMLElement>('.aca-pager')!;
  const overviewBar = () =>
    document.querySelector<HTMLElement>('.aca-page-overview:not(.aca-widget-actions)')!;
  const indicator = () => document.querySelector<HTMLElement>('.aca-indicator')!;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    latest = null;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('PointerEvent', StagedPointer);
    // A pager with a size: without one nothing moves, and nothing is staged.
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(24);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(84);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** The screen on «Casa», settled, and the first free cell. */
  async function ready() {
    renderScreen();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
    act(() => latest?.goToPageId('home'));
    // Let the settling of the first render pass, so no frame of it is left in the way.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    return screen
      .getByRole('region', { name: 'Casa' })
      .querySelector<HTMLElement>('[data-launcher-cell]')!;
  }
  const tick = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  const press = (target: Element) =>
    fireEvent.pointerDown(target, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
  /** A long press that has just fired: the clock stops at the 500 ms of the threshold. */
  async function openByLongPress() {
    const cell = await ready();
    press(cell);
    tick(500);
    expect(latest?.overview).toBe(true);
    return cell;
  }

  it('the long press starts the scene in the commit of the threshold: no second time (0.9.28, choice of 2026-10-25, «Un tempo solo»)', async () => {
    const cell = await ready();
    press(cell);
    // The threshold of the long press: one act commits the state and the look of the scene together,
    // the pager, the bar and the indicator, with no frame run after it.
    tick(500);
    expect(latest?.overview).toBe(true);
    expect(latest?.editMode).toBe(true);
    expect(pagerEl().querySelector('.aca-pager__surface')).not.toBeNull();
    expect(pagerEl()).toHaveClass('is-overview');
    expect(pagerEl()).toHaveClass('is-entering');
    expect(overviewBar()).not.toHaveClass('aca-page-overview--hidden');
    expect(indicator()).not.toHaveClass('aca-indicator--hidden');
    // Nothing is left to change when the frames run: the classes are the same two frames later.
    const classes = [pagerEl().className, overviewBar().className, indicator().className];
    tick(60);
    expect([pagerEl().className, overviewBar().className, indicator().className]).toEqual(classes);
  });

  it('the last input is written on the root only when it changes (0.9.28, M2)', async () => {
    const cell = await ready();
    const root = document.documentElement;
    const writes: string[] = [];
    const watch = new MutationObserver(() => undefined);
    watch.observe(root, { attributes: true, attributeFilter: ['data-aca-input'] });
    press(cell);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10 });
    press(cell);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10 });
    press(cell);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(root.dataset.acaInput).toBe('pointer');
    // One write for three presses (the attribute may have been written by an earlier press).
    writes.push(...watch.takeRecords().map(() => root.dataset.acaInput ?? ''));
    expect(writes.length).toBeLessThanOrEqual(1);
    watch.takeRecords();
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'b' });
    expect(root.dataset.acaInput).toBe('keyboard');
    expect(watch.takeRecords()).toHaveLength(1);
    press(cell);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(root.dataset.acaInput).toBe('pointer');
    expect(watch.takeRecords()).toHaveLength(1);
    watch.disconnect();
  });

  it('«Fine» does not wait: the cards go back with the bar and the indicator in the commit of the tap (0.9.28, choice of 2026-10-24)', async () => {
    await openByLongPress();
    tick(60);
    expect(pagerEl()).toHaveClass('is-overview');
    tick(500);
    expect(pagerEl()).not.toHaveClass('is-entering');
    expect(indicator()).toHaveClass('aca-indicator--overview');
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Fine' }));
    expect(latest?.overview).toBe(false);
    // The same act as the tap, with no frame run: edit mode is off, the cards are going back and the
    // bar and the indicator leave with them, as in the 0.9.27.
    expect(latest?.editMode).toBe(false);
    expect(pagerEl()).toHaveClass('is-closing');
    expect(pagerEl()).not.toHaveClass('is-overview');
    expect(overviewBar()).toHaveClass('aca-page-overview--hidden');
    expect(indicator()).toHaveClass('aca-indicator--hidden');
    expect(indicator()).not.toHaveClass('aca-indicator--overview');
  });

  it('a press that begins while the cards go back and the pages settle is ignored, held as long as it may be (D-M18)', async () => {
    await openByLongPress();
    tick(560);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.click(within(overviewBar()).getByRole('button', { name: 'Fine' }));
    tick(60);
    expect(pagerEl()).toHaveClass('is-closing');
    // The finger goes down on the page now and stays: nothing opens, not even once the pages settle.
    const page = screen.getByRole('region', { name: 'Casa' });
    press(page);
    // The press is counted for the whole time the cards need to go back, and for more: 1.5 s.
    tick(500);
    expect(latest?.overview).toBe(false);
    // The cards are back, the pages settle one more frame; React flushes between the steps.
    expect(pagerEl()).toHaveClass('is-settling');
    tick(100);
    tick(900);
    expect(latest?.overview).toBe(false);
    expect(pagerEl()).not.toHaveClass('is-closing');
    expect(pagerEl()).not.toHaveClass('is-settling');
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 10, clientY: 10 });
    // Settled: the same press, begun now, counts.
    press(page);
    tick(500);
    expect(latest?.overview).toBe(true);
  });

  it('a page deleted from the pages view leaves first: its card shrinks and fades, then the page goes and the row closes (D-M24)', async () => {
    await openByLongPress();
    tick(560);
    act(() => {
      latest?.addPage({ label: 'Nuova pagina', kind: 'widgets' });
    });
    const added = latest!.layout.pages[latest!.layout.pages.length - 1];
    act(() => latest?.goToPageId(added.id));
    tick(100);
    const ids = () => latest?.layout.pages.map((page) => page.id);
    expect(ids()).toContain(added.id);
    fireEvent.click(screen.getByRole('button', { name: 'Elimina la pagina Nuova pagina' }));
    // The card goes first; the page is still there, and the person cannot delete it twice.
    const leaving = document.querySelector('.aca-pager__page.is-leaving');
    expect(leaving?.getAttribute('aria-label')).toBe('Nuova pagina');
    expect(ids()).toContain(added.id);
    // The time of the exit is counted from the frame that draws it, not from the click.
    tick(CARD_EXIT_MS);
    expect(ids()).toContain(added.id);
    expect(document.querySelectorAll('.aca-pager__page.is-leaving')).toHaveLength(1);
    tick(TWO_FRAMES_MS);
    // The removal is committed once the card is gone; the cards at its right close the gap.
    expect(ids()).not.toContain(added.id);
    expect(document.querySelector('.aca-pager__page.is-leaving')).toBeNull();
  });

  it('with reduced motion, or a pager with no size, nothing waits: the look comes with the state', async () => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // No size lent: a covered launcher has none.
    const cell = await ready();
    press(cell);
    tick(500);
    expect(latest?.overview).toBe(true);
    expect(pagerEl()).toHaveClass('is-overview');
    expect(overviewBar()).not.toHaveClass('aca-page-overview--hidden');
  });
});

describe('simplified editing of the widgets (REP-20261008-001)', () => {
  class TestPointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
    }
  }
  const box = (top: number, left: number, width: number, height: number) =>
    ({
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  const widgetOf = (pageId: string, widgetId: string) =>
    document.querySelector<HTMLElement>(
      `[data-launcher-page="${pageId}"] [data-widget-id="${widgetId}"]`
    );
  const handle = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name},`) });
  const settingsSheet = () => screen.queryByRole('dialog', { name: 'Impostazioni del widget' });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    latest = null;
    commands.length = 0;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  /**
   * In edit mode, picks `name` up with the finger: it follows at once, with no hold (ADR-0016,
   * G5), after a few pixels; the bar of the widget gets a measured box at the bottom of the
   * screen (jsdom has no layout).
   */
  function lift(name: string) {
    fireEvent.pointerDown(handle(name), { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 112, clientY: 100 });
    act(() => vi.advanceTimersByTime(20));
    const bar = screen.getByRole('toolbar', { name: `Modifica ${name}` });
    const group = bar.querySelector<HTMLElement>('.aca-page-overview__group')!;
    group.getBoundingClientRect = () => box(700, 300, 200, 52);
    bar.getBoundingClientRect = () => box(690, 0, 1024, 70);
    return bar;
  }
  const moveTo = (x: number, y: number) => {
    fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y });
    act(() => vi.advanceTimersByTime(20));
  };

  it('picks a widget not selected up at once, selects it and the trash removes it (G5)', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    vi.useFakeTimers();
    try {
      // A few pixels: no hold to wait for, nothing shrinks, but a touch of 3 px is still a tap.
      fireEvent.pointerDown(handle('Tessera B'), {
        pointerId: 1,
        button: 0,
        clientX: 100,
        clientY: 100,
      });
      expect(widgetOf('home', 'test_tile_b')).not.toHaveClass('is-pressing');
      moveTo(103, 100);
      expect(document.querySelector('.aca-drag-ghost')).toBeNull();
      expect(widgetOf('home', 'test_tile_b')).not.toHaveClass('is-selected');
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 103, clientY: 100 });
      // Held still for a second: it does not wait to lift, so nothing happens either.
      fireEvent.pointerDown(handle('Tessera B'), {
        pointerId: 1,
        button: 0,
        clientX: 100,
        clientY: 100,
      });
      act(() => vi.advanceTimersByTime(1500));
      expect(document.querySelector('.aca-drag-ghost')).toBeNull();
      expect(widgetOf('home', 'test_tile_b')).not.toHaveClass('is-pressing');
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100 });

      // Dragged beyond a few pixels, it is picked up there and then: no wait, no vibration.
      const bar = lift('Tessera B');
      expect(document.querySelector('.aca-drag-ghost')).not.toBeNull();
      expect(document.querySelector('.aca-drag-ghost')).not.toHaveClass('is-lifting');
      expect(vibrate).not.toHaveBeenCalled();
      // Selected as it is picked up (U5): the bar rises with only its trash, as «Rimuovi».
      expect(widgetOf('home', 'test_tile_b')).toHaveClass('is-selected');
      expect(bar).toHaveAttribute('data-drop', 'ready');
      expect(within(bar).getByRole('button', { name: 'Rimuovi Tessera B' })).toHaveTextContent(
        'Rimuovi'
      );
      // «Annulla» and «Fine» fade out where they are, out of reach (REP-20261023-006, D-M14).
      expect(bar.querySelector('.aca-widget-actions__rest')).toHaveAttribute('inert');
      expect(document.querySelector('.aca-remove-zone')).toBeNull();

      // 10 px above the target (it starts 8 px above the band): not over the trash.
      moveTo(400, 672);
      expect(bar).toHaveAttribute('data-drop', 'ready');
      moveTo(400, 720);
      expect(bar).toHaveAttribute('data-drop', 'armed');
      expect(document.querySelector('.aca-drag-ghost')).toHaveClass('is-removing');
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 400, clientY: 720 });
      expect(placement('home', 'test_tile_b')).toBeUndefined();
      expect(document.querySelector('.aca-undo')).toHaveTextContent('Tessera B rimosso');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      Reflect.deleteProperty(navigator, 'vibrate');
    }
  });

  it('the trash is the bar itself, which lies over the last row: 4 px of margin above its row, 8 px sideways (ADR-0016, D-11)', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    vi.useFakeTimers();
    try {
      // The row of the bar starts at 690, its group at 300 px sideways.
      const bar = lift('Tessera A');
      // A finger on the last row of the grid, just above the row of the bar: not over the trash.
      moveTo(400, 680);
      expect(bar).toHaveAttribute('data-drop', 'ready');
      moveTo(400, 685);
      expect(bar).toHaveAttribute('data-drop', 'ready');
      // 4 px above the row (a bar that is still rising counts) and below it: over the trash.
      moveTo(400, 687);
      expect(bar).toHaveAttribute('data-drop', 'armed');
      // Beside the group, even on the row of the bar, it is not: 8 px sideways at most.
      moveTo(285, 720);
      expect(bar).toHaveAttribute('data-drop', 'ready');
      moveTo(295, 720);
      expect(bar).toHaveAttribute('data-drop', 'armed');
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 285, clientY: 720 });
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('released more than 8 px above the bar, the widget is not removed', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    vi.useFakeTimers();
    try {
      lift('Tessera A');
      moveTo(400, 672);
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 400, clientY: 672 });
      expect(placement('home', 'test_tile_a')).toBeDefined();
      expect(document.querySelector('.aca-undo')).not.toHaveTextContent('rimosso');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('released low but beside the bar (left of its group), the widget is not removed', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    vi.useFakeTimers();
    try {
      const bar = lift('Tessera A');
      // The group starts at 300 px, the target 12 px before it.
      moveTo(100, 720);
      expect(bar).toHaveAttribute('data-drop', 'ready');
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 720 });
      expect(placement('home', 'test_tile_a')).toBeDefined();
      expect(document.querySelector('.aca-undo')).not.toHaveTextContent('rimosso');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('edit mode ended during the press: nothing is picked up and nothing stays selected', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    vi.useFakeTimers();
    try {
      fireEvent.pointerDown(handle('Tessera B'), {
        pointerId: 1,
        button: 0,
        clientX: 100,
        clientY: 100,
      });
      act(() => vi.advanceTimersByTime(300));
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(latest?.editMode).toBe(false);
      // The finger goes on moving: the press is gone with edit mode, nothing follows it.
      moveTo(160, 100);
      expect(document.querySelector('.aca-drag-ghost')).toBeNull();
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 160, clientY: 100 });
      act(() => latest?.setEditMode(true));
      expect(widgetOf('home', 'test_tile_b')).not.toHaveClass('is-selected');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('the click of the release after a drag is not a tap: a widget picked up opens no settings', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    vi.useFakeTimers();
    try {
      lift('Tessera A');
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 112, clientY: 100 });
      // The widget is selected by the drag and its release click is swallowed: no settings.
      fireEvent.click(handle('Tessera A'), { detail: 1 });
      expect(settingsSheet()).toBeNull();
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
      // The next tap is the second on a selected widget (G5): it opens the settings.
      act(() => vi.advanceTimersByTime(500));
      tap(handle('Tessera A'));
      expect(settingsSheet()).not.toBeNull();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('edit mode has no «+ Widget» button and no tray of widget types: widgets are added from the «+» cells (2026-10-23)', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    expect(document.querySelector('[data-launcher-add]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aggiungi widget' })).toBeNull();
    expect(document.querySelector('.aca-widget-tray')).toBeNull();
    expect(document.querySelector('[data-tray-type]')).toBeNull();
  });

  it('the same widget id on another page is another widget: its «Annulla» starts disabled', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          layout.pages[0],
          {
            id: 'altra',
            label: 'Altra',
            kind: 'widgets',
            placements: { tablet: { test_tile_a: { x: 0, y: 0, w: 2, h: 2 } } },
          },
        ],
      } satisfies LauncherLayout)
    );
    await openHome();
    act(() => latest?.setEditMode(true));
    const handleIn = (pageId: string) =>
      document.querySelector<HTMLElement>(
        `[data-launcher-page="${pageId}"] [data-widget-id="test_tile_a"] > .aca-launcher-widget__handle`
      )!;
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    tap(handleIn('home'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Sposta Tessera A qui: colonna 1, riga 3' })
    );
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 2, w: 2, h: 2 });
    act(() => latest?.goToPageId('altra'));
    now.mockReturnValue(20_000);
    tap(handleIn('altra'));
    now.mockRestore();
    expect(widgetOf('altra', 'test_tile_a')).toHaveClass('is-selected');
    const bar = screen.getByRole('toolbar', { name: 'Modifica Tessera A' });
    expect(within(bar).getByRole('button', { name: 'Annulla' })).toBeDisabled();
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 2, w: 2, h: 2 });
  });

  it('picked again, the same widget keeps «Annulla» to before it was picked', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    tap(handle('Tessera A'));
    now.mockRestore();
    fireEvent.click(handle('Tessera A'));
    const sheet = await screen.findByRole('dialog', { name: 'Impostazioni del widget' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Aumenta larghezza' }));
    expect(placement('home', 'test_tile_a')?.w).toBe(3);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await waitFor(() => expect(settingsSheet()).toBeNull());
    fireEvent.click(
      screen.getByRole('button', { name: 'Sposta Tessera A qui: colonna 1, riga 4' })
    );
    expect(placement('home', 'test_tile_a')?.y).toBe(3);
    // Reached again with the keyboard: the same widget, still picked from where it was.
    fireEvent.keyDown(window, { key: 'Tab' });
    act(() => handle('Tessera A').focus());
    const bar = screen.getByRole('toolbar', { name: 'Modifica Tessera A' });
    fireEvent.click(within(bar).getByRole('button', { name: 'Annulla' }));
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 0, w: 2, h: 2 });
  });

  it('the grip frame follows the axes the widget can be resized along', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          {
            id: 'home',
            label: 'Casa',
            kind: 'widgets',
            placements: {
              tablet: {
                test_narrow_1: { x: 0, y: 0, w: 2, h: 1 },
                test_single_1: { x: 2, y: 0, w: 2, h: 2 },
              },
            },
          },
        ],
      } satisfies LauncherLayout)
    );
    await openHome();
    act(() => latest?.setEditMode(true));
    const attrs = (widgetId: string, name: string) =>
      Array.from(widgetOf('home', widgetId)!.querySelectorAll(`[${name}]`)).map((node) =>
        node.getAttribute(name)
      );
    tap(handle('Stretto'));
    expect(attrs('test_narrow_1', 'data-resize-side')).toEqual(['n', 's']);
    expect(attrs('test_narrow_1', 'data-resize-edge')).toEqual(['n', 's']);
    tap(handle('Unico'));
    expect(widgetOf('home', 'test_single_1')).toHaveClass('is-selected');
    expect(widgetOf('home', 'test_single_1')!.querySelector('.aca-resize-frame')).toBeNull();
  });

  /** A layout with a widget that has an opener, a button, a slider and a knob (test_open_1). */
  const withOpener = (): LauncherLayout => ({
    ...layout,
    pages: layout.pages.map((page) =>
      page.id === 'home'
        ? {
            ...page,
            placements: {
              tablet: { ...page.placements.tablet, test_open_1: { x: 0, y: 2, w: 2, h: 2 } },
            },
          }
        : page
    ),
  });

  it('out of edit mode a long press on a button of a widget does not shrink, lift or edit, and its click arrives', async () => {
    vi.useFakeTimers();
    try {
      renderScreen();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      act(() => latest?.goToPageId('home'));
      const tile = screen.getByRole('button', { name: 'Tile test_tile_a 2x2' });
      fireEvent.pointerDown(tile, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-pressing');
      expect(document.querySelector('.aca-pager')).not.toHaveClass('is-pressing');
      act(() => vi.advanceTimersByTime(1020));
      expect(latest?.editMode).toBe(false);
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-pressing');
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-selected');
      expect(document.querySelector('.aca-drag-ghost')).toBeNull();
      fireEvent.pointerUp(tile, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      // The click of the release is the button's own: nothing swallows it.
      fireEvent.click(tile);
      expect(screen.getByText('Dettagli di test_tile_a')).toBeInTheDocument();
      expect(latest?.editMode).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['a button', 'button', 'Comando test_open_1'],
    ['a slider', 'slider', 'Cursore test_open_1'],
    ['a knob marked as a command', 'img', 'Manopola test_open_1'],
  ])(
    'a long press on %s of a widget in use starts no move and no shrink',
    async (_, role, name) => {
      localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(withOpener()));
      vi.useFakeTimers();
      try {
        renderScreen();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(20);
        });
        act(() => latest?.goToPageId('home'));
        const control = screen.getByRole(role, { name });
        fireEvent.pointerDown(control, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
        const widget = widgetOf('home', 'test_open_1')!;
        expect(widget).not.toHaveClass('is-pressing');
        expect(document.querySelector('.aca-pager')).not.toHaveClass('is-pressing');
        act(() => vi.advanceTimersByTime(1500));
        expect(latest?.editMode).toBe(false);
        expect(latest?.overview).toBe(false);
        expect(widget).not.toHaveClass('is-pressing');
        expect(widget).not.toHaveClass('is-selected');
        expect(document.querySelector('.aca-drag-ghost')).toBeNull();
        fireEvent.pointerUp(control, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
        fireEvent.click(control);
        expect(latest?.editMode).toBe(false);
        // The tap of a command reaches it.
        expect(commands).toEqual(role === 'button' ? ['test_open_1'] : []);
      } finally {
        vi.useRealTimers();
      }
    }
  );

  it('a press on the empty page does not sink it while held (the request of 2026-10-23)', async () => {
    vi.useFakeTimers();
    try {
      renderScreen();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      act(() => latest?.goToPageId('home'));
      const cell = screen
        .getByRole('region', { name: 'Casa' })
        .querySelector('[data-launcher-cell]')!;
      fireEvent.pointerDown(cell, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      expect(document.querySelector('.aca-pager')).not.toHaveClass('is-pressing');
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(document.querySelector('.aca-pager')).not.toHaveClass('is-pressing');
      fireEvent.pointerUp(cell, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      expect(document.querySelector('.aca-pager')).not.toHaveClass('is-pressing');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a tap selects, a second tap on the selected widget opens the settings, however late it comes (G5)', async () => {
    await openHome();
    // Edit mode begins with Tessera A selected (2026-10-23).
    act(() => latest?.setEditMode(true));
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    try {
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
      expect(settingsSheet()).toBeNull();
      // Another widget: its first tap selects it and opens nothing, whatever came before.
      now.mockReturnValue(10_100);
      tap(handle('Tessera B'));
      expect(widgetOf('home', 'test_tile_b')).toHaveClass('is-selected');
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-selected');
      expect(settingsSheet()).toBeNull();
      // Two seconds later, and with a clock set back: the second tap on the selected one opens.
      now.mockReturnValue(7_000);
      tap(handle('Tessera B'));
      expect(settingsSheet()).not.toBeNull();
    } finally {
      now.mockRestore();
    }
  });

  it('a tap on a stack selects it, a second tap opens the sheet of the stack', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    act(() => {
      latest?.stackWidgets('home', 'test_tile_b', 'test_tile_a');
    });
    tap(handle('Pila di 2 widget'));
    expect(screen.queryByRole('dialog', { name: 'Pila di widget' })).toBeNull();
    tap(handle('Pila di 2 widget'));
    expect(await screen.findByRole('dialog', { name: 'Pila di widget' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Larghezza di Pila di 2 widget' })
    ).toBeInTheDocument();
  });

  it('Invio on the selected widget (a click without a pointer) opens its settings', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    const now = vi.spyOn(Date, 'now').mockReturnValue(20_000);
    try {
      tap(handle('Tessera A'));
      now.mockReturnValue(20_700);
      fireEvent.click(handle('Tessera A'));
      expect(settingsSheet()).not.toBeNull();
    } finally {
      now.mockRestore();
    }
  });

  it('Tab goes from the selected widget to its bar and from «Fine» to the next widget', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    fireEvent.keyDown(window, { key: 'Tab' });
    const a = handle('Tessera A');
    act(() => a.focus());
    expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
    fireEvent.keyDown(a, { key: 'Tab' });
    const remove = screen.getByRole('button', { name: 'Rimuovi Tessera A' });
    expect(remove).toHaveFocus();
    fireEvent.keyDown(remove, { key: 'Tab', shiftKey: true });
    expect(handle('Tessera A')).toHaveFocus();
    const done = within(screen.getByRole('toolbar', { name: 'Modifica Tessera A' })).getByRole(
      'button',
      { name: 'Fine' }
    );
    act(() => done.focus());
    fireEvent.keyDown(done, { key: 'Tab' });
    expect(handle('Tessera B')).toHaveFocus();
    expect(widgetOf('home', 'test_tile_b')).toHaveClass('is-selected');
  });

  describe('out of edit mode, on the area that opens the details', () => {
    beforeEach(() => {
      localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(withOpener()));
    });

    it('one tap opens the details at once, with no wait for a second tap (D-7)', async () => {
      await openHome();
      fireEvent.click(screen.getByRole('button', { name: 'Apri test_open_1' }), { detail: 1 });
      expect(screen.getByText('Dettagli di test_open_1')).toBeInTheDocument();
      expect(settingsSheet()).toBeNull();
    });

    it('a second tap opens no settings: out of edit mode every tap acts', async () => {
      await openHome();
      vi.useFakeTimers();
      try {
        const open = screen.getByRole('button', { name: 'Apri test_open_1' });
        fireEvent.click(open, { detail: 1 });
        act(() => vi.advanceTimersByTime(150));
        fireEvent.click(open, { detail: 2 });
        act(() => vi.advanceTimersByTime(400));
        expect(settingsSheet()).toBeNull();
        expect(screen.getByText('Dettagli di test_open_1')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('a tap on a command reaches it at once and opens neither details nor settings', async () => {
      await openHome();
      fireEvent.click(screen.getByRole('button', { name: 'Comando test_open_1' }), { detail: 1 });
      expect(commands).toEqual(['test_open_1']);
      expect(screen.queryByText('Dettagli di test_open_1')).toBeNull();
      expect(settingsSheet()).toBeNull();
    });

    it('a click on the box beside the opener opens nothing: the widget does not shrink, so a press ends where it began', async () => {
      await openHome();
      fireEvent.click(widgetOf('home', 'test_open_1')!, { detail: 1, clientX: 104, clientY: 60 });
      expect(screen.queryByText('Dettagli di test_open_1')).toBeNull();
      expect(settingsSheet()).toBeNull();
    });

    it('locked, a tap opens the details at once and no settings', async () => {
      localStorage.setItem(
        LAUNCHER_LAYOUT_STORAGE_KEY,
        JSON.stringify({ ...withOpener(), locked: true })
      );
      await openHome();
      fireEvent.click(screen.getByRole('button', { name: 'Apri test_open_1' }), { detail: 1 });
      expect(screen.getByText('Dettagli di test_open_1')).toBeInTheDocument();
      expect(settingsSheet()).toBeNull();
    });

    it('the keyboard opens the details at once and the widget commands are never delayed', async () => {
      await openHome();
      fireEvent.click(screen.getByRole('button', { name: 'Comando test_open_1' }), { detail: 1 });
      expect(commands).toEqual(['test_open_1']);
      fireEvent.click(screen.getByRole('button', { name: 'Apri test_open_1' }));
      // At once: no wait for a second tap.
      expect(screen.getByText('Dettagli di test_open_1')).toBeInTheDocument();
    });
  });

  describe('a widget not yet linked (G4 reversed by the request of 2026-10-21)', () => {
    const unlinked = () =>
      localStorage.setItem(
        'tunet_card_settings',
        JSON.stringify({ 'home::test_tile_a': { categoryWidgetType: 'light' } })
      );
    const pill = () => document.querySelector('.aca-undo');

    it('in use one tap on its body opens «Collega» at once: no notice, no edit mode, no selection', async () => {
      unlinked();
      await openHome();
      fireEvent.click(screen.getByRole('button', { name: 'Collega Tessera' }), { detail: 1 });
      expect(settingsSheet()).not.toBeNull();
      expect(pill()?.textContent ?? '').not.toContain('non è ancora collegato');
      expect(latest?.editMode).toBe(false);
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-selected');
      // The other widgets keep their own tap.
      expect(screen.getByRole('button', { name: 'Tile test_tile_b 2x2' })).toBeInTheDocument();
    });

    it('Invio or Spazio (a click with no pointer) opens «Collega» too', async () => {
      unlinked();
      await openHome();
      fireEvent.click(screen.getByRole('button', { name: 'Collega Tessera' }), { detail: 0 });
      expect(settingsSheet()).not.toBeNull();
      expect(latest?.editMode).toBe(false);
    });

    it('with the layout locked it opens «Collega» all the same: linking changes the widget, not the layout', async () => {
      unlinked();
      localStorage.setItem(
        LAUNCHER_LAYOUT_STORAGE_KEY,
        JSON.stringify({ ...layout, locked: true })
      );
      await openHome();
      fireEvent.click(screen.getByRole('button', { name: 'Collega Tessera' }), { detail: 1 });
      expect(settingsSheet()).not.toBeNull();
      expect(latest?.editMode).toBe(false);
    });

    it('a long press on it lifts the widget, and the click of the release does not open «Collega»', async () => {
      unlinked();
      await openHome();
      vi.useFakeTimers();
      try {
        const body = screen.getByRole('button', { name: 'Collega Tessera' });
        fireEvent.pointerDown(body, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
        act(() => vi.advanceTimersByTime(700));
        expect(latest?.editMode).toBe(true);
        expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
        fireEvent.pointerUp(window, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
        // The tile target is gone with edit mode: the release click lands on the handle.
        fireEvent.click(handle('Tessera A'), { detail: 1 });
        expect(settingsSheet()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('in edit mode one tap opens «Collega» at once, with the widget selected', async () => {
      unlinked();
      await openHome();
      act(() => latest?.setEditMode(true));
      tap(handle('Tessera A'));
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
      expect(settingsSheet()).not.toBeNull();
      expect(pill()?.textContent ?? '').not.toContain('non è ancora collegato');
    });

    it('in edit mode a widget already linked is selected by one tap, its settings open on the second', async () => {
      unlinked();
      await openHome();
      act(() => latest?.setEditMode(true));
      tap(handle('Tessera B'));
      expect(widgetOf('home', 'test_tile_b')).toHaveClass('is-selected');
      expect(settingsSheet()).toBeNull();
      tap(handle('Tessera B'));
      expect(settingsSheet()).not.toBeNull();
    });
  });

  describe('the body of a widget, on a full page as on any page, is held to edit and move it (the request of 2026-10-21, D-4 absorbed)', () => {
    /** Four widgets cover the 8 × 5 grid of the tablet: there is no empty cell left to press. */
    const fullLayout = (extra = false): LauncherLayout => ({
      ...layout,
      pages: [
        ...layout.pages,
        {
          id: 'piena',
          label: 'Piena',
          kind: 'widgets',
          placements: {
            tablet: {
              test_open_1: { x: 0, y: 0, w: 4, h: 3 },
              test_tile_p2: { x: 4, y: 0, w: 4, h: 3 },
              test_tile_p3: { x: 0, y: 3, w: 4, h: 2 },
              ...(extra ? {} : { test_tile_p4: { x: 4, y: 3, w: 4, h: 2 } }),
            },
          },
        },
      ],
    });
    const pressHold = (element: Element, ms = 700) => {
      fireEvent.pointerDown(element, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
      act(() => vi.advanceTimersByTime(ms));
    };
    // A press held to its end guards the click of its release: a new press ends that guard.
    afterEach(() => {
      fireEvent.pointerDown(document.body);
    });
    async function openPage(pageId: string, pageLayout: LauncherLayout) {
      localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(pageLayout));
      vi.useFakeTimers();
      renderScreen();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      act(() => latest?.goToPageId(pageId));
    }

    it('a press held on the body edits and lifts the widget: nothing sinks or shrinks, the page overview stays shut, and the click of the release is swallowed', async () => {
      await openPage('piena', fullLayout());
      try {
        const body = screen.getByRole('button', { name: 'Apri test_open_1' });
        fireEvent.pointerDown(body, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
        // Neither the page nor the widget sinks while it is held.
        expect(widgetOf('piena', 'test_open_1')).not.toHaveClass('is-pressing');
        expect(document.querySelector('.aca-pager')).not.toHaveClass('is-pressing');
        act(() => vi.advanceTimersByTime(700));
        expect(latest?.editMode).toBe(true);
        expect(latest?.overview).toBe(false);
        expect(document.querySelector('.aca-pager')).not.toHaveClass('is-overview');
        expect(widgetOf('piena', 'test_open_1')).toHaveClass('is-selected');
        expect(widgetOf('piena', 'test_open_1')).not.toHaveClass('is-pressing');
        expect(document.querySelector('.aca-drag-ghost')).not.toBeNull();
        fireEvent.pointerUp(window, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
        fireEvent.click(body, { detail: 1 });
        expect(document.querySelector('.aca-drag-ghost')).toBeNull();
        expect(screen.queryByText('Dettagli di test_open_1')).toBeNull();
        expect(settingsSheet()).toBeNull();
        // The widget is where it was, still selected.
        expect(placement('piena', 'test_open_1')).toEqual({ x: 0, y: 0, w: 4, h: 3 });
        expect(widgetOf('piena', 'test_open_1')).toHaveClass('is-selected');
      } finally {
        vi.useRealTimers();
      }
    });

    it.each([
      ['a button', 'button', 'Comando test_open_1'],
      ['a slider', 'slider', 'Cursore test_open_1'],
      ['a knob marked as a command', 'img', 'Manopola test_open_1'],
    ])(
      'a press held on %s of the widget does not: its commands keep the touch',
      async (_, role, name) => {
        await openPage('piena', fullLayout());
        try {
          pressHold(screen.getByRole(role, { name }), 1500);
          expect(latest?.editMode).toBe(false);
          expect(widgetOf('piena', 'test_open_1')).not.toHaveClass('is-selected');
          expect(document.querySelector('.aca-drag-ghost')).toBeNull();
        } finally {
          vi.useRealTimers();
        }
      }
    );

    it('a quick tap on the body still opens the details', async () => {
      await openPage('piena', fullLayout());
      try {
        const body = screen.getByRole('button', { name: 'Apri test_open_1' });
        fireEvent.pointerDown(body, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
        act(() => vi.advanceTimersByTime(200));
        fireEvent.pointerUp(body, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
        fireEvent.click(body, { detail: 1 });
        expect(latest?.editMode).toBe(false);
        expect(screen.getByText('Dettagli di test_open_1')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('a swipe on the body is not a long press: edit mode is not entered', async () => {
      await openPage('piena', fullLayout());
      try {
        const body = screen.getByRole('button', { name: 'Apri test_open_1' });
        fireEvent.pointerDown(body, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
        fireEvent.pointerMove(body, { button: 0, isPrimary: true, clientX: 60, clientY: 10 });
        act(() => vi.advanceTimersByTime(1500));
        expect(latest?.editMode).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it.each([
      ['a page with an empty cell', 'piena', () => fullLayout(true)],
      ['the home page', 'home', withOpener],
    ])('%s lifts the widget the same way', async (_, pageId, pageLayout) => {
      await openPage(pageId, pageLayout());
      try {
        pressHold(screen.getByRole('button', { name: 'Apri test_open_1' }));
        expect(latest?.editMode).toBe(true);
        expect(latest?.overview).toBe(false);
        expect(widgetOf(pageId, 'test_open_1')).toHaveClass('is-selected');
        expect(document.querySelector('.aca-drag-ghost')).not.toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('with the layout locked the press says how to unlock: no edit mode, no lift, no selection', async () => {
      await openPage('piena', { ...fullLayout(), locked: true });
      try {
        pressHold(screen.getByRole('button', { name: 'Apri test_open_1' }));
        expect(latest?.editMode).toBe(false);
        expect(document.querySelector('.aca-undo')).toHaveTextContent('Disposizione bloccata');
        expect(document.querySelector('.aca-drag-ghost')).toBeNull();
        expect(widgetOf('piena', 'test_open_1')).not.toHaveClass('is-selected');
      } finally {
        vi.useRealTimers();
      }
    });

    it('the widget carried by the same press goes where the finger goes, and a vibration marks the lift', async () => {
      const vibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
      vi.stubGlobal('PointerEvent', TestPointer);
      await openPage('home', withOpener());
      try {
        const body = screen.getByRole('button', { name: 'Apri test_open_1' });
        fireEvent.pointerDown(body, {
          pointerId: 1,
          button: 0,
          isPrimary: true,
          clientX: 10,
          clientY: 10,
        });
        act(() => vi.advanceTimersByTime(700));
        expect(vibrate).toHaveBeenCalledTimes(1);
        const ghost = () => document.querySelector<HTMLElement>('.aca-drag-ghost')!;
        expect(ghost()).not.toBeNull();
        const before = ghost().style.transform;
        // The finger goes on without leaving the screen: the copy goes with it.
        fireEvent.pointerMove(window, { pointerId: 1, clientX: 90, clientY: 50 });
        act(() => vi.advanceTimersByTime(20));
        expect(ghost().style.transform).not.toBe(before);
        expect(ghost().style.transform).toContain('80px, 40px');
        fireEvent.pointerUp(window, { pointerId: 1, clientX: 90, clientY: 50 });
        expect(document.querySelector('.aca-drag-ghost')).toBeNull();
        expect(latest?.editMode).toBe(true);
        expect(widgetOf('home', 'test_open_1')).toHaveClass('is-selected');
      } finally {
        vi.useRealTimers();
        vi.unstubAllGlobals();
      }
    });
  });

  it('a tap on the grip frame selects the widget under it, else counts as a tap on its own', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    const now = vi.spyOn(Date, 'now').mockReturnValue(50_000);
    const under: Element[] = [];
    Object.defineProperty(document, 'elementsFromPoint', {
      value: () => under,
      configurable: true,
    });
    const frameTap = (side: Element) => {
      fireEvent.pointerDown(side, { pointerId: 2, button: 0, clientX: 150, clientY: 5 });
      fireEvent.pointerUp(window, { pointerId: 2, clientX: 150, clientY: 5 });
    };
    const sideOf = (widgetId: string) =>
      widgetOf('home', widgetId)!.querySelector('[data-resize-side="n"]')!;
    try {
      // Tessera A is the selected one on entering. Over the handle of Tessera B: that is selected.
      under.splice(0, under.length, sideOf('test_tile_a'), handle('Tessera B'));
      now.mockReturnValue(51_000);
      frameTap(sideOf('test_tile_a'));
      expect(widgetOf('home', 'test_tile_b')).toHaveClass('is-selected');
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-selected');

      // Over a free cell: a tap on the widget itself, so on the selected one it is the second tap.
      now.mockReturnValue(52_000);
      tap(handle('Tessera A'));
      expect(settingsSheet()).toBeNull();
      const cell = document.querySelector('[data-launcher-cell]')!;
      under.splice(0, under.length, sideOf('test_tile_a'), cell);
      now.mockReturnValue(53_000);
      frameTap(sideOf('test_tile_a'));
      expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 0, w: 2, h: 2 });
      expect(settingsSheet()).not.toBeNull();
    } finally {
      now.mockRestore();
      vi.unstubAllGlobals();
      Reflect.deleteProperty(document, 'elementsFromPoint');
    }
  });

  it('«Annulla» after a move to another page brings the widget back, selected on its page', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    const now = vi.spyOn(Date, 'now').mockReturnValue(30_000);
    try {
      tap(handle('Tessera A'));
      now.mockReturnValue(30_700);
      fireEvent.click(handle('Tessera A'));
    } finally {
      now.mockRestore();
    }
    const sheet = await screen.findByRole('dialog', { name: 'Impostazioni del widget' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Sposta nella pagina successiva' }));
    await waitFor(() => expect(placement('altra', 'test_tile_a')).toBeDefined());
    fireEvent.click(within(sheet).getByRole('button', { name: 'Fatto' }));
    fireEvent.click(
      within(screen.getByRole('toolbar', { name: 'Modifica Tessera A' })).getByRole('button', {
        name: 'Annulla',
      })
    );
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(placement('altra', 'test_tile_a')).toBeUndefined();
    expect(latest?.currentPageId).toBe('home');
    await waitFor(() => expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected'));
  });

  it('free cells: a press keeps the selection, the keyboard entering them clears it', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    tap(handle('Tessera A'));
    const cell = screen.getByRole('button', { name: 'Sposta Tessera A qui: colonna 1, riga 3' });
    fireEvent.pointerDown(cell, { button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(cell, { button: 0, clientX: 5, clientY: 5 });
    expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
    // Without a selection a cell adds a widget, as before.
    fireEvent.keyDown(window, { key: 'Tab' });
    act(() => cell.focus());
    expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-selected');
    expect(
      screen.getByRole('button', { name: 'Aggiungi un widget: colonna 1, riga 3' })
    ).toBeInTheDocument();
  });

  it('the size and page steps say why they cannot be taken', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    act(() => latest?.setCoverEnabled(false));
    const now = vi.spyOn(Date, 'now').mockReturnValue(40_000);
    try {
      tap(handle('Tessera A'));
      now.mockReturnValue(40_700);
      fireEvent.click(handle('Tessera A'));
    } finally {
      now.mockRestore();
    }
    const sheet = await screen.findByRole('dialog', { name: 'Impostazioni del widget' });
    const previous = within(sheet).getByRole('button', { name: 'Sposta nella pagina precedente' });
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(
      within(sheet).getByRole('button', { name: 'Sposta nella pagina successiva' })
    ).not.toHaveAttribute('aria-disabled');
    fireEvent.click(previous);
    expect(await within(sheet).findByText('Nessuna pagina in questa direzione.')).toHaveAttribute(
      'role',
      'status'
    );
    expect(placement('home', 'test_tile_a')).toBeDefined();

    const narrower = within(sheet).getByRole('button', { name: 'Riduci larghezza' });
    fireEvent.click(narrower);
    expect(placement('home', 'test_tile_a')?.w).toBe(1);
    expect(narrower).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(narrower);
    expect(await within(sheet).findByText('Larghezza minima per questo widget.')).toHaveAttribute(
      'role',
      'status'
    );
    expect(placement('home', 'test_tile_a')?.w).toBe(1);
  });

  /** Opens the settings of `name` in edit mode: a tap selects it, Invio opens them. */
  async function openSettings(name: string) {
    tap(handle(name));
    fireEvent.keyDown(handle(name), { key: 'Enter' });
    fireEvent.click(handle(name));
    return screen.findByRole('dialog', { name: 'Impostazioni del widget' });
  }

  it('a slow tap or a press held still on the selected widget is a tap: the second one opens the settings (G5)', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    const now = vi.spyOn(Date, 'now').mockReturnValue(60_000);
    const press = (from: number, to: number) => {
      now.mockReturnValue(from);
      fireEvent.pointerDown(handle('Tessera B'), {
        button: 0,
        pointerId: 1,
        clientX: 5,
        clientY: 5,
      });
      now.mockReturnValue(to);
      fireEvent.pointerUp(window, { button: 0, pointerId: 1, clientX: 5, clientY: 5 });
      fireEvent.click(handle('Tessera B'), { detail: 1 });
    };
    try {
      // A press held still for a second and a half on a widget not selected only selects it.
      press(60_000, 61_500);
      expect(widgetOf('home', 'test_tile_b')).toHaveClass('is-selected');
      expect(settingsSheet()).toBeNull();
      // On the selected one, however slow, it is the second tap.
      press(62_000, 62_600);
      expect(settingsSheet()).not.toBeNull();
    } finally {
      now.mockRestore();
    }
  });

  it('with the layout locked, a double tap out of edit mode opens no sheet', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    act(() => {
      latest?.stackWidgets('home', 'test_tile_b', 'test_tile_a');
    });
    act(() => latest?.setEditMode(false));
    act(() => latest?.setLayoutOptions({ locked: true }));
    const opener = document.querySelector<HTMLElement>('[data-widget-id^="stack_"] button')!;
    // The stack draws the test tile, which has no opener of its own: mark it as one.
    opener.setAttribute('data-widget-open', '');
    const before = JSON.stringify(latest?.layout);
    vi.useFakeTimers();
    try {
      fireEvent.click(opener, { detail: 1 });
      act(() => vi.advanceTimersByTime(100));
      fireEvent.click(opener, { detail: 1 });
      act(() => vi.advanceTimersByTime(400));
    } finally {
      vi.useRealTimers();
    }
    expect(screen.queryByRole('dialog', { name: 'Pila di widget' })).toBeNull();
    expect(settingsSheet()).toBeNull();
    expect(JSON.stringify(latest?.layout)).toBe(before);
  });

  it('Tab on «Fine» reaches the free cells, and on a full page goes on as usual', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    fireEvent.keyDown(window, { key: 'Tab' });
    const last = widgetOf('home', 'test_broken_1')!.querySelector<HTMLElement>(
      '.aca-launcher-widget__handle'
    )!;
    act(() => last.focus());
    const done = document.querySelector<HTMLElement>('[data-widget-action="done"]')!;
    act(() => done.focus());
    expect(fireEvent.keyDown(done, { key: 'Tab' })).toBe(false);
    expect(document.querySelector('[data-launcher-cells="home"] [tabindex="0"]')).toHaveFocus();
    // The keyboard entering the free cells clears the selection, which ends edit mode: the cells
    // add a widget with Invio (2026-10-23).
    expect(latest?.editMode).toBe(false);

    // The page full: no widget after the last one and no free cell, Tab is not taken.
    act(() =>
      latest?.restoreLayout({
        ...layout,
        pages: [
          {
            id: 'home',
            label: 'Casa',
            kind: 'widgets',
            placements: {
              tablet: {
                test_tile_a: { x: 0, y: 0, w: 4, h: 3 },
                test_tile_b: { x: 4, y: 0, w: 4, h: 3 },
                test_tile_c: { x: 0, y: 3, w: 4, h: 2 },
                test_tile_d: { x: 4, y: 3, w: 4, h: 2 },
              },
            },
          },
        ],
      })
    );
    expect(document.querySelector('[data-launcher-cells="home"]')).toBeNull();
    act(() => latest?.setEditMode(true));
    const d = widgetOf('home', 'test_tile_d')!.querySelector<HTMLElement>(
      '.aca-launcher-widget__handle'
    )!;
    act(() => d.focus());
    expect(widgetOf('home', 'test_tile_d')).toHaveClass('is-selected');
    act(() => done.focus());
    expect(fireEvent.keyDown(done, { key: 'Tab' })).toBe(true);
  });

  it('out of edit mode a press on a widget redraws no other widget', async () => {
    await openHome();
    const before = {
      b: tileRenders.get('test_tile_b') ?? 0,
      c: tileRenders.get('test_tile_c') ?? 0,
    };
    const target = screen.getByRole('button', { name: 'Tile test_tile_a 2x2' });
    fireEvent.pointerDown(target, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
    // A widget in use does not shrink under the finger: nothing redraws, not even itself.
    expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-pressing');
    fireEvent.pointerUp(target, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
    expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-pressing');
    expect(tileRenders.get('test_tile_b') ?? 0).toBe(before.b);
    expect(tileRenders.get('test_tile_c') ?? 0).toBe(before.c);
  });

  it.each([true, false])(
    'the overview opening (the cover that is off adds its card) and a change of the centre redraw no other widget (cover on: %s) (REP-20261012-003)',
    async (coverOn) => {
      await openHome();
      act(() => latest?.setEditMode(true));
      act(() => latest?.setCoverEnabled(coverOn));
      const ids = ['test_tile_b', 'test_tile_c'];
      const before = ids.map((id) => tileRenders.get(id) ?? 0);
      // The overview keeps no selection: only the widget that was selected (Tessera A) redraws.
      act(() => latest?.setOverview(true));
      expect(latest?.overview).toBe(true);
      expect(document.querySelector('.aca-launcher-widget.is-selected')).toBeNull();
      act(() => latest?.goToPageId('altra'));
      act(() => latest?.goToPageId('home'));
      expect(latest?.overview).toBe(true);
      expect(ids.map((id) => tileRenders.get(id) ?? 0)).toEqual(before);
    }
  );

  it('Esc or a cancelled pointer after the lift leave the widget selected where it was', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    vi.useFakeTimers();
    try {
      lift('Tessera B');
      moveTo(300, 300);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(document.querySelector('.aca-drag-ghost')).toBeNull();
      expect(latest?.editMode).toBe(true);
      expect(widgetOf('home', 'test_tile_b')).toHaveClass('is-selected');
      expect(placement('home', 'test_tile_b')).toEqual({ x: 2, y: 0, w: 2, h: 2 });

      lift('Tessera A');
      moveTo(300, 300);
      fireEvent.pointerCancel(window, { pointerId: 1 });
      expect(document.querySelector('.aca-drag-ghost')).toBeNull();
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
      expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('a free cell where the selected widget cannot go refuses the move and keeps it selected', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          {
            id: 'home',
            label: 'Casa',
            kind: 'widgets',
            placements: {
              tablet: {
                test_tile_a: { x: 0, y: 0, w: 2, h: 2 },
                unknown_card_1: { x: 2, y: 0, w: 6, h: 5 },
                unknown_card_2: { x: 0, y: 2, w: 2, h: 2 },
              },
            },
          },
        ],
      } satisfies LauncherLayout)
    );
    await openHome();
    act(() => latest?.setEditMode(true));
    tap(handle('Tessera A'));
    const before = JSON.stringify(latest?.layout.pages);
    fireEvent.click(
      screen.getByRole('button', { name: 'Sposta Tessera A qui: colonna 2, riga 5' })
    );
    // The announcement waits a moment; a busy test runner may stretch it.
    expect(
      await screen.findByText('Non c’è spazio lì.', undefined, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(JSON.stringify(latest?.layout.pages)).toBe(before);
    expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
  });

  it('the size steps say inside the sheet why the widget cannot grow', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    act(() => latest?.goToPageId('altra'));
    act(() => {
      latest?.moveWidget('altra', 'test_tile_c', { x: 0, y: 0, w: 4, h: 3 });
    });
    const sheet = await openSettings('Tessera C');
    const wider = within(sheet).getByRole('button', { name: 'Aumenta larghezza' });
    const taller = within(sheet).getByRole('button', { name: 'Aumenta altezza' });
    expect(wider).toHaveAttribute('aria-disabled', 'true');
    expect(taller).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(wider);
    expect(within(sheet).getByText('Larghezza massima per questo widget.')).toHaveAttribute(
      'role',
      'status'
    );
    fireEvent.click(taller);
    expect(within(sheet).getByText('Altezza massima per questo widget.')).toBeInTheDocument();
    expect(placement('altra', 'test_tile_c')).toEqual({ x: 0, y: 0, w: 4, h: 3 });

    // On the right edge of the page, one row high: it must move before growing that way.
    act(() => {
      latest?.moveWidget('altra', 'test_tile_c', { x: 6, y: 0, w: 2, h: 1 });
    });
    expect(wider).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(wider);
    expect(
      within(sheet).getByText('Bordo della pagina: spostalo prima per ingrandirlo.')
    ).toBeInTheDocument();
    const shorter = within(sheet).getByRole('button', { name: 'Riduci altezza' });
    expect(shorter).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(shorter);
    expect(within(sheet).getByText('Altezza minima per questo widget.')).toBeInTheDocument();
    fireEvent.click(taller);
    expect(placement('altra', 'test_tile_c')).toEqual({ x: 6, y: 0, w: 2, h: 2 });
    expect(within(sheet).getByText('Dimensione 2 per 2.')).toBeInTheDocument();
  });

  it('a size step of the stack sheet resizes the stack', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    let stackId = '';
    act(() => {
      stackId = latest?.stackWidgets('home', 'test_tile_b', 'test_tile_a') ?? '';
    });
    const now = vi.spyOn(Date, 'now').mockReturnValue(70_000);
    tap(handle('Pila di 2 widget'));
    tap(handle('Pila di 2 widget'));
    now.mockRestore();
    const sheet = await screen.findByRole('dialog', { name: 'Pila di widget' });
    const before = placement('home', stackId)!;
    fireEvent.click(within(sheet).getByRole('button', { name: 'Riduci larghezza' }));
    expect(placement('home', stackId)).toEqual({ ...before, w: before.w - 1 });
  });

  it('keeps the trash, the press cue and the still lifted copy as designed', async () => {
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const read = (file: string) => fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const edit = read('src/components/system/edit/edit.css');
    const launcher = read('src/templates/launcher/launcher.css');
    // The trash is as wide as the plan asks, measured on the band (not on its own content).
    expect(edit).toMatch(
      /\.aca-page-overview__group\.aca-widget-actions--drop \{[^}]*width: min\(100cqw, 20rem\);/
    );
    // Its text ≥ 4.5:1: the red ink, a lighter red on the dark page, white once armed.
    expect(edit).toMatch(
      /\.aca-widget-actions--drop > \.aca-widget-actions__remove \{[^}]*color: var\(--aca-danger-ink\);/
    );
    expect(edit).toMatch(
      /:root\[data-theme='dark'\] \.aca-widget-actions--drop > \.aca-widget-actions__remove \{[^}]*color: oklch\(from var\(--aca-danger\) 0\.7 /
    );
    expect(edit).toMatch(
      /\.aca-widget-actions--drop\.is-armed > \.aca-widget-actions__remove \{[^}]*background: var\(--aca-danger\);[^}]*color: var\(--aca-on-blue\);/
    );
    // The press cue waits a tap's time before it shrinks.
    expect(launcher).toMatch(
      /\.aca-launcher-widget\.is-pressing > :is\([^)]*\) \{[^}]*scale calc\(var\(--aca-hold-ms\) - var\(--aca-hold-delay\)\) linear var\(--aca-hold-delay\)/
    );
    // Lifted, the copy keeps still under the finger (the shake is gone: answer of 2026-10-23).
    expect(launcher).not.toMatch(/aca-hold-shake|animation-delay: 150ms/);
    expect(launcher).not.toMatch(/\.aca-drag-ghost\.is-lifting/);
  });

  it('keeps the name field in the bar, the arrows at the card sides and no marks on the card', async () => {
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const read = (file: string) => fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const edit = read('src/components/system/edit/edit.css');
    const launcher = read('src/templates/launcher/launcher.css');
    // The field of the name takes the bar and gives way inside it (visual check, 390×844).
    const field = edit.match(/\.aca-page-overview__field \{([^}]*)\}/)?.[1] ?? '';
    expect(field).toMatch(/min-width: 0;/);
    expect(field).toMatch(/grid-template-columns: minmax\(0, 1fr\);/);
    expect(edit).toMatch(
      /\.aca-page-overview__group\.is-renaming > \.aca-page-overview__tools \{\s*opacity: 0;/
    );
    // The input fills its well (G34): the vertical padding moves from the well into the input.
    expect(edit).toMatch(/\.aca-page-overview__field > \.aca-field \{\s*--aca-pad: 0 1\.25em;/);
    expect(edit).toMatch(
      /\.aca-page-overview__field \.aca-field__input \{\s*padding-block: 0\.85em;/
    );
    // The error of an empty name ≥ 4.5:1 on the dark page: a lighter red (visual check, 390×844).
    expect(edit).toMatch(
      /:root\[data-theme='dark'\] \.aca-page-overview__field > \.aca-field-error \{\s*color: oklch\(from var\(--aca-danger\) 0\.7 /
    );
    // The bar never goes past the band on a phone: the name gives way (visual check, 360×780).
    expect(edit).toMatch(/\.aca-page-overview:not\(\.aca-widget-actions\) \{\s*max-width: 100%;/);
    expect(edit).toMatch(
      /\.aca-page-overview:not\(\.aca-widget-actions\) > \.aca-page-overview__group \{\s*min-width: 0;\s*max-width: 100%;/
    );
    // Under the card one row: the arrows at its sides, the columns between them.
    expect(edit).toMatch(/\.aca-page-card__move--before \{[^}]*grid-column: 1;/);
    expect(edit).toMatch(/\.aca-page-card__move--after \{[^}]*grid-column: 3;/);
    expect(launcher).toMatch(/--aca-card-footer: var\(--aca-control-height\);/);
    // No «Principale» / «Nascosta» marks on the card (REP-20261009-005, N1).
    expect(launcher).not.toMatch(/aca-pager__badge/);
  });

  // The selected widget, the one just dropped and the one that refused a move are read from a
  // store, not from the context of the launcher (ISSUE-109, R5a): a change redraws the widget
  // concerned and not the others.
  const countOf = (id: string) => tileRenders.get(id) ?? 0;

  it('selecting a widget, and passing the selection on, redraws no widget of the others (ISSUE-109, R5a)', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    // Edit mode begins with A selected.
    expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
    const before = { b: countOf('test_tile_b'), c: countOf('test_tile_c') };
    expect(before.b).toBeGreaterThan(0);
    // The selection goes to B: A lets it go, the other page is not drawn again.
    fireEvent.click(handle('Tessera B'));
    expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-selected');
    expect(widgetOf('home', 'test_tile_b')).toHaveClass('is-selected');
    expect(countOf('test_tile_c')).toBe(before.c);
    // Leaving edit mode clears it.
    act(() => latest?.setEditMode(false));
    expect(document.querySelector('.aca-launcher-widget.is-selected')).toBeNull();
  });

  it('a refused move lights the error LED of that widget only and puts it out again (ISSUE-109, R5a)', async () => {
    localStorage.setItem(
      LAUNCHER_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...layout,
        pages: [
          {
            id: 'home',
            label: 'Casa',
            kind: 'widgets',
            placements: {
              tablet: {
                test_tile_a: { x: 0, y: 0, w: 2, h: 2 },
                unknown_card_1: { x: 2, y: 0, w: 6, h: 5 },
                unknown_card_2: { x: 0, y: 2, w: 2, h: 2 },
              },
            },
          },
          layout.pages[1],
        ],
      } satisfies LauncherLayout)
    );
    await openHome();
    act(() => latest?.setEditMode(true));
    fireEvent.click(handle('Tessera A'));
    const led = () =>
      widgetOf('home', 'test_tile_a')?.querySelector('.aca-launcher-widget__frame') ?? null;
    expect(led()).not.toHaveClass('aca-m--error');
    const other = countOf('test_tile_c');
    vi.useFakeTimers();
    try {
      fireEvent.click(
        screen.getByRole('button', { name: 'Sposta Tessera A qui: colonna 2, riga 5' })
      );
      expect(led()).toHaveClass('aca-m--error');
      expect(countOf('test_tile_c')).toBe(other);
      act(() => vi.advanceTimersByTime(1000));
      expect(led()).not.toHaveClass('aca-m--error');
      expect(countOf('test_tile_c')).toBe(other);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a dropped widget lands, and the end of the landing redraws no widget (ISSUE-109, R5a)', async () => {
    // The grids need a measured area to turn a pointer into a cell (jsdom has no layout).
    const measured = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(() => box(0, 0, 1024, 600));
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    vi.useFakeTimers();
    try {
      lift('Tessera A');
      moveTo(500, 450);
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 500, clientY: 450 });
      expect(placement('home', 'test_tile_a')).not.toEqual({ x: 0, y: 0, w: 2, h: 2 });
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-landing');
      const before = { b: countOf('test_tile_b'), c: countOf('test_tile_c') };
      act(() => vi.advanceTimersByTime(400));
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-landing');
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
      expect(countOf('test_tile_b')).toBe(before.b);
      expect(countOf('test_tile_c')).toBe(before.c);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      measured.mockRestore();
    }
  });

  it('a drop that flies is committed at the release; the widget stays hidden in its cell (is-landing) until the copy lands, and nothing is committed at the end of the flight (K6b, 2026-10-25)', async () => {
    const measured = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(() => box(0, 0, 1024, 600));
    Object.defineProperty(document.documentElement, 'getAnimations', {
      configurable: true,
      value: () => [],
    });
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    vi.useFakeTimers();
    try {
      lift('Tessera A');
      moveTo(500, 450);
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 500, clientY: 450 });
      // The copy is flying, and the layout is already the new one (no commit waits for the end).
      expect(document.querySelector('.aca-drag-ghost')).toHaveClass('is-flying--land');
      expect(placement('home', 'test_tile_a')).not.toEqual({ x: 0, y: 0, w: 2, h: 2 });
      // The widget is in its new cell and not shown: it lands with the copy, without a trip.
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-landing');
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-dragging');
      const layoutAtRelease = latest?.layout;
      // The end of the flight: the copy goes and the widget shows; the layout is not touched.
      for (let step = 0; step < 60 && document.querySelector('.aca-drag-ghost'); step += 1) {
        act(() => vi.advanceTimersByTime(20));
      }
      expect(document.querySelector('.aca-drag-ghost')).toBeNull();
      expect(latest?.layout).toBe(layoutAtRelease);
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-dragging');
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-landing');
      // The time of the landing counts from the end of the flight.
      act(() => vi.advanceTimersByTime(400));
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-landing');
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-selected');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      Reflect.deleteProperty(document.documentElement, 'getAnimations');
      measured.mockRestore();
    }
  });

  it('the landing is in two beats: the swap (widget shown, copy hidden) in the frame of the end of the flight, the end of the session after the next frames (W2, 2026-10-25)', async () => {
    const measured = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(() => box(0, 0, 1024, 600));
    Object.defineProperty(document.documentElement, 'getAnimations', {
      configurable: true,
      value: () => [],
    });
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    vi.useFakeTimers();
    try {
      lift('Tessera A');
      moveTo(500, 450);
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 500, clientY: 450 });
      const ghost = document.querySelector<HTMLElement>('.aca-drag-ghost')!;
      const grid = widgetOf('home', 'test_tile_a')!.closest('.aca-launcher-grid')!;
      expect(ghost).toHaveClass('is-flying--land');
      expect(ghost).not.toHaveClass('is-landed');
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-dragging');
      // The copy has landed.
      act(() => {
        ghost.dispatchEvent(
          Object.assign(new Event('transitionend', { bubbles: true }), {
            propertyName: 'transform',
          })
        );
      });
      // First beat, all in this frame: the widget shows and the copy hides ...
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-dragging');
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-landing');
      expect(ghost).toBeInTheDocument();
      expect(ghost).toHaveClass('is-landed');
      // ... and what belongs to the end of the session is still there: the drag style of the grid.
      expect(grid).toHaveClass('is-dragging');
      const gear = document.querySelector<HTMLElement>('.aca-system-gear')!;
      const pagerNode = document.querySelector<HTMLElement>('.aca-pager')!;
      expect(gear).toHaveAttribute('inert');
      expect(pagerNode).toHaveClass('is-locked');
      // Second beat, after the frames: the session ends, the copy goes, the grid is as at rest.
      for (let step = 0; step < 10 && document.querySelector('.aca-drag-ghost'); step += 1) {
        act(() => vi.advanceTimersByTime(20));
      }
      expect(document.querySelector('.aca-drag-ghost')).toBeNull();
      expect(grid).not.toHaveClass('is-dragging');
      // The gear and the pager come back two frames later, not in the commit that ends the session
      // (G4 tracing of 2026-10-25, W-B and W-L).
      expect(gear).toHaveAttribute('inert');
      expect(pagerNode).toHaveClass('is-locked');
      act(() => vi.advanceTimersByTime(100));
      expect(gear).not.toHaveAttribute('inert');
      expect(pagerNode).not.toHaveClass('is-locked');
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-dragging');
      // The landing counts 260 ms from the first beat.
      act(() => vi.advanceTimersByTime(400));
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-landing');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      Reflect.deleteProperty(document.documentElement, 'getAnimations');
      measured.mockRestore();
    }
  });

  it('dropped where it was, the widget stays hidden under the flying copy and shows at the swap (W2)', async () => {
    const measured = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(() => box(0, 0, 200, 200));
    Object.defineProperty(document.documentElement, 'getAnimations', {
      configurable: true,
      value: () => [],
    });
    await openHome();
    act(() => latest?.setEditMode(true));
    vi.stubGlobal('PointerEvent', TestPointer);
    vi.useFakeTimers();
    try {
      const origin = placement('home', 'test_tile_a');
      lift('Tessera A');
      // Back to the corner of the page, where the widget was (the grids are measured as one box).
      moveTo(0, 0);
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 0, clientY: 0 });
      const ghost = document.querySelector<HTMLElement>('.aca-drag-ghost')!;
      expect(ghost).toHaveClass('is-flying--land');
      expect(placement('home', 'test_tile_a')).toEqual(origin);
      expect(widgetOf('home', 'test_tile_a')).toHaveClass('is-dragging');
      act(() => {
        ghost.dispatchEvent(
          Object.assign(new Event('transitionend', { bubbles: true }), {
            propertyName: 'transform',
          })
        );
      });
      expect(widgetOf('home', 'test_tile_a')).not.toHaveClass('is-dragging');
      expect(ghost).toHaveClass('is-landed');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      Reflect.deleteProperty(document.documentElement, 'getAnimations');
      measured.mockRestore();
    }
  });
});

describe('renders of the widgets (REP-20261012-003)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    latest = null;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  const renders = () =>
    ['test_tile_a', 'test_tile_b', 'test_tile_c'].map((id) => tileRenders.get(id) ?? 0);

  it('a change of the centre in the overview and a change of page redraw no widget', async () => {
    await openHome();
    act(() => {
      latest?.setEditMode(true);
      latest?.setOverview(true);
    });
    const before = renders();
    expect(before.every((count) => count > 0)).toBe(true);
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    act(() => latest?.goToPageId('altra'));
    expect(screen.getByRole('region', { name: 'Altra' })).toHaveClass('is-current');
    act(() => latest?.goToPageId('home'));
    expect(renders()).toEqual(before);
  });

  it('a change of page redraws no widget out of edit mode either', async () => {
    await openHome();
    const before = renders();
    act(() => latest?.goToPageId('altra'));
    act(() => latest?.goToPageId('home'));
    expect(renders()).toEqual(before);
  });

  it('entering edit mode does redraw them: they show the controls', async () => {
    await openHome();
    const before = renders();
    act(() => latest?.setEditMode(true));
    expect(renders().some((count, at) => count > before[at])).toBe(true);
  });
});

describe('widgets that leave and come in (REP-20261023-006, block 3: D-M10)', () => {
  const lendAnimations = () =>
    Object.defineProperty(document.documentElement, 'getAnimations', {
      configurable: true,
      value: () => [],
    });
  const widgetOf = (id: string) => document.querySelector<HTMLElement>(`[data-widget-id="${id}"]`);
  // The test of reduced motion replaces the media query; the others after it must find it as it was.
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    latest = null;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    lendAnimations();
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Reflect.deleteProperty(document.documentElement, 'getAnimations');
    vi.restoreAllMocks();
  });

  it('«Rimuovi» in the bar: the widget shrinks and fades first, out of reach; the removal is committed after', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Tessera A' }));
    expect(widgetOf('test_tile_a')).toHaveClass('is-exiting');
    // Out of reach by pointer-events, not inert: the focus stays until the removal is committed.
    expect(widgetOf('test_tile_a')).not.toHaveAttribute('inert');
    // Not yet: the pill and the free cells follow an exit that has been seen.
    expect(placement('home', 'test_tile_a')).toBeDefined();
    expect(document.querySelector('.aca-undo:not(.aca-undo--hidden)')).toBeNull();
    await waitFor(() => expect(placement('home', 'test_tile_a')).toBeUndefined(), {
      timeout: 1500,
    });
    expect(document.querySelector('.aca-undo')).toHaveTextContent('Tessera A rimosso');
    expect(widgetOf('test_tile_a')).toBeNull();
    // The other widgets were not touched.
    expect(widgetOf('test_tile_b')).not.toHaveClass('is-exiting');
  });

  it('Canc goes the same way, and a second press while it leaves does not remove twice', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    const handle = screen.getByRole('button', { name: /^Tessera A,/ });
    fireEvent.keyDown(handle, { key: 'Delete' });
    fireEvent.keyDown(handle, { key: 'Delete' });
    expect(widgetOf('test_tile_a')).toHaveClass('is-exiting');
    await waitFor(() => expect(placement('home', 'test_tile_a')).toBeUndefined(), {
      timeout: 1500,
    });
    // One removal, one pill.
    expect(document.querySelectorAll('.aca-undo:not(.aca-undo--hidden)')).toHaveLength(1);
  });

  it('«Annulla» brings it back mounted at the look it comes from, then lets it in', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Tessera A' }));
    await waitFor(() => expect(placement('home', 'test_tile_a')).toBeUndefined(), {
      timeout: 1500,
    });
    const undo = document.querySelector<HTMLElement>('.aca-undo')!;
    fireEvent.click(within(undo).getByRole('button', { name: 'Annulla' }));
    // Back in the layout in this commit, at the look it came from: no flash of the widget.
    expect(placement('home', 'test_tile_a')).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(widgetOf('test_tile_a')).toHaveClass('is-entering', 'is-restored');
    expect(widgetOf('test_tile_a')).not.toHaveClass('is-go');
    // Two frames later it goes to full size; when that has run the mark is gone.
    await waitFor(() => expect(widgetOf('test_tile_a')).toHaveClass('is-go'), { timeout: 1000 });
    await waitFor(() => expect(widgetOf('test_tile_a')).not.toHaveClass('is-entering'), {
      timeout: 1500,
    });
  });

  it('with reduced motion, or where nothing animates, the widget goes and comes at once', async () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica la disposizione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Tessera A' }));
    expect(placement('home', 'test_tile_a')).toBeUndefined();
    const undo = document.querySelector<HTMLElement>('.aca-undo')!;
    fireEvent.click(within(undo).getByRole('button', { name: 'Annulla' }));
    expect(widgetOf('test_tile_a')).not.toHaveClass('is-entering');
  });
});

describe('a widget just added comes in after the sheet (REP-20261023-006, D-M11, D-M22)', () => {
  const lendAnimations = () =>
    Object.defineProperty(document.documentElement, 'getAnimations', {
      configurable: true,
      value: () => [],
    });
  const widgetOf = (id: string) => document.querySelector<HTMLElement>(`[data-widget-id="${id}"]`);
  const spacers = () =>
    latest?.layout.pages
      .flatMap((page) => Object.keys(page.placements.tablet ?? {}).map((id) => [page.id, id]))
      .filter(([, id]) => id.startsWith('spacer_card')) ?? [];

  /** The sheet of the «+» cells, the spacer chosen and «Aggiungi il widget» pressed. */
  function addSpacer() {
    const dialog = screen.getByRole('dialog', { name: 'Aggiungi un widget' });
    fireEvent.click(dialog.querySelector<HTMLElement>('[data-widget-type="spacer"]')!);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aggiungi il widget' }));
  }

  beforeEach(() => {
    localStorage.clear();
    latest = null;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    lendAnimations();
  });
  afterEach(() => {
    Reflect.deleteProperty(document.documentElement, 'getAnimations');
    vi.restoreAllMocks();
  });

  it('is mounted at the look it comes from, selected, and goes to full size when the sheet is nearly gone', async () => {
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    renderScreen();
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.goToPageId('home'));
    const page = screen.getByRole('region', { name: 'Casa' });
    fireEvent.click(within(page).getAllByRole('button', { name: /^Aggiungi un widget: / })[0]);
    addSpacer();
    await waitFor(() => expect(spacers()).toHaveLength(1));
    const [[pageId, widgetId]] = spacers();
    expect(pageId).toBe('home');
    // Added behind the sheet at the look it comes from: no flash of the widget.
    expect(widgetOf(widgetId)).toHaveClass('is-entering', 'is-added');
    await waitFor(() => expect(widgetOf(widgetId)).toHaveClass('is-selected'));
    expect(widgetOf(widgetId)).not.toHaveClass('is-go');
    // The sheet takes 200 ms to go: the widget is let in 160 ms after it began, never at once.
    await waitFor(() => expect(widgetOf(widgetId)).toHaveClass('is-go'), { timeout: 1500 });
    await waitFor(() => expect(widgetOf(widgetId)).not.toHaveClass('is-entering'), {
      timeout: 1500,
    });
    expect(widgetOf(widgetId)).toHaveClass('is-selected');
  });

  it('when the page is full, the pages glide to the page with room before the widget comes in', async () => {
    // «Casa» holds four widgets over the whole grid of the tablet (8 × 5): no room for another.
    const full: LauncherLayout = {
      ...layout,
      pages: [
        {
          id: 'home',
          label: 'Casa',
          kind: 'widgets',
          placements: {
            tablet: {
              test_tile_a: { x: 0, y: 0, w: 4, h: 3 },
              test_tile_b: { x: 4, y: 0, w: 4, h: 3 },
              test_tile_e: { x: 0, y: 3, w: 4, h: 2 },
              test_tile_f: { x: 4, y: 3, w: 4, h: 2 },
            },
          },
        },
        layout.pages[1],
      ],
    };
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(full));
    renderScreen();
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.goToPageId('home'));
    act(() => latest?.setEditMode(true));
    act(() => latest?.setOverview(true));
    const bar = document.querySelector<HTMLElement>('.aca-page-overview:not(.aca-widget-actions)')!;
    fireEvent.click(within(bar).getByRole('button', { name: 'Aggiungi widget' }));
    addSpacer();
    await waitFor(() => expect(spacers()).toHaveLength(1));
    const [[pageId, widgetId]] = spacers();
    // The page with room is another one, and the widget waits for the pager to be there.
    expect(pageId).not.toBe('home');
    expect(widgetOf(widgetId)).toHaveClass('is-entering');
    expect(widgetOf(widgetId)).not.toHaveClass('is-go');
    await waitFor(() => expect(latest?.currentPageId).toBe(pageId), { timeout: 1500 });
    await waitFor(() => expect(widgetOf(widgetId)).toHaveClass('is-go'), { timeout: 2000 });
  });

  it('without animation nothing is held back: the widget is there as it always was', async () => {
    Reflect.deleteProperty(document.documentElement, 'getAnimations');
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    renderScreen();
    await waitFor(() => expect(latest?.ready).toBe(true));
    act(() => latest?.goToPageId('home'));
    const page = screen.getByRole('region', { name: 'Casa' });
    fireEvent.click(within(page).getAllByRole('button', { name: /^Aggiungi un widget: / })[0]);
    addSpacer();
    await waitFor(() => expect(spacers()).toHaveLength(1));
    const [[, widgetId]] = spacers();
    await waitFor(() => expect(widgetOf(widgetId)).toHaveClass('is-selected'));
    expect(widgetOf(widgetId)).not.toHaveClass('is-entering');
  });
});

describe('a stack with no widget that can be resolved shows free cells (ISSUE-116)', () => {
  const ghostLayout: LauncherLayout = {
    version: 1,
    cover: { enabled: false },
    pages: [
      {
        id: 'home',
        label: 'Casa',
        kind: 'widgets',
        placements: {
          tablet: {
            test_tile_a: { x: 0, y: 0, w: 2, h: 2 },
            stack_fantasma: { x: 2, y: 0, w: 2, h: 1 },
            stack_viva: { x: 4, y: 0, w: 2, h: 1 },
          },
        },
      },
    ],
    stacks: {
      stack_fantasma: { ids: ['unknown_a', 'unknown_b'] },
      stack_viva: { ids: ['unknown_c', 'test_tile_b'] },
    },
  };
  const cellLabel = (x: number, y: number) => `Aggiungi un widget: colonna ${x + 1}, riga ${y + 1}`;
  const drawn = (id: string) => document.querySelector(`[data-widget-id="${id}"]`);
  const reservedCells = () =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-launcher-reserved]')).map(
      (cell) => cell.dataset.launcherReserved
    );

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(ghostLayout));
    latest = null;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('draws the ghost as «+» cells, not as a widget and not as reserved wells, and writes nothing', async () => {
    await openHome();
    expect(drawn('stack_fantasma')).toBeNull();
    expect(drawn('stack_viva')).not.toBeNull();
    expect(screen.getByRole('button', { name: cellLabel(2, 0) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: cellLabel(3, 0) })).toBeInTheDocument();
    expect(reservedCells()).toEqual([]);
    // The saved layout keeps the stack, its place and its widgets.
    expect(placement('home', 'stack_fantasma')).toEqual({ x: 2, y: 0, w: 2, h: 1 });
    expect(latest?.layout.stacks?.stack_fantasma.ids).toEqual(['unknown_a', 'unknown_b']);
  });

  it('in edit mode the cells are free as well, and the layout is still untouched', async () => {
    await openHome();
    act(() => latest?.setEditMode(true));
    expect(drawn('stack_fantasma')).toBeNull();
    // With a widget selected the cells offer to move it there, still as free cells.
    expect(screen.getByRole('button', { name: /qui: colonna 3, riga 1$/ })).toBeInTheDocument();
    expect(reservedCells()).toEqual([]);
    expect(placement('home', 'stack_fantasma')).toEqual({ x: 2, y: 0, w: 2, h: 1 });
  });

  it('a stack with one widget that can be resolved is drawn as a stack', async () => {
    await openHome();
    expect(screen.queryByRole('button', { name: cellLabel(4, 0) })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: cellLabel(5, 0) })).not.toBeInTheDocument();
  });

  it('a tap on a free cell of the ghost opens the sheet to add a widget there', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: cellLabel(2, 0) }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
