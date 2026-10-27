import { useMemo } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { LauncherLayout, WidgetDefinition, WidgetProps } from '@/@types/launcher';
import type { AddWidgetSheetProps } from '@/templates/sheets';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import {
  useLauncherController,
  type LauncherController,
  type LauncherStore,
} from '@/hooks/launcher/useLauncherController';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';

// REP-20261007-001: «Principale» is the base screen and every free cell is a «+» button that
// adds a widget in that cell.

// The add sheet adds like the real one: onAdded for each new card, then onClose.
vi.mock('@/templates/sheets', () => ({
  AddWidgetSheet: ({ open, pageId, onAdded, onClose }: AddWidgetSheetProps) =>
    open ? (
      <div role="dialog" aria-label={`Aggiungi alla pagina ${pageId}`}>
        <button
          type="button"
          onClick={() => {
            onAdded('test_tile_new', { w: 2, h: 2 });
            onClose();
          }}
        >
          Aggiungi una tessera
        </button>
        <button
          type="button"
          onClick={() => {
            onAdded('test_tile_x', { w: 2, h: 1 });
            onAdded('test_tile_y', { w: 2, h: 1 });
            onClose();
          }}
        >
          Aggiungi due tessere
        </button>
        <button type="button" onClick={onClose}>
          Annulla
        </button>
      </div>
    ) : null,
  WidgetSettingsSheet: () => null,
}));

function Tile({ id, size }: WidgetProps) {
  return <span>{`Tessera ${id} ${size.w}x${size.h}`}</span>;
}
const tile: WidgetDefinition = {
  type: 'test_tile',
  label: 'Tessera',
  icon: 'grid',
  sizes: { min: { w: 1, h: 1 }, max: { w: 4, h: 3 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('test_tile'),
  Widget: Tile,
};
const findDefinition = (id: string, settings: CardSettings) =>
  tile.matches(id, settings) ? tile : undefined;

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: true },
  pages: [
    {
      id: 'home',
      label: 'Principale',
      kind: 'widgets',
      placements: { tablet: { test_tile_a: { x: 0, y: 0, w: 2, h: 2 } } },
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
  const runtime = useMemo(
    () => createFixtureRuntime({ editMode: controller.editMode }),
    [controller.editMode]
  );
  return (
    <LauncherScreen
      controller={controller}
      runtime={runtime}
      connection={{ phase: 'connected', label: 'Connesso' }}
      chips={[]}
      onOpenSystem={() => undefined}
      detailsWidgetId={null}
      onCloseDetails={() => undefined}
      findDefinition={findDefinition}
    />
  );
}

async function renderLauncher(stored: LauncherLayout = layout) {
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(stored));
  const view = render(
    <ToastProvider>
      <PageProvider>
        <Harness />
      </PageProvider>
    </ToastProvider>
  );
  await waitFor(() => expect(latest?.ready).toBe(true));
  return view;
}

const region = (name: string) => screen.getByRole('region', { name });
const cellsOf = (name: string) =>
  within(region(name)).getAllByRole('button', { name: /^Aggiungi un widget: / });
const cellLabel = (x: number, y: number) => `Aggiungi un widget: colonna ${x + 1}, riga ${y + 1}`;
const placement = (pageId: string, id: string) =>
  latest?.layout.pages.find((page) => page.id === pageId)?.placements.tablet?.[id];

describe('«Principale» as the base screen', () => {
  beforeEach(() => {
    localStorage.clear();
    latest = null;
  });

  it('opens on «Principale», with the cover reachable on its left', async () => {
    await renderLauncher();
    expect(latest?.currentPageId).toBe('home');
    expect(latest?.currentPage).toBe(1);
    expect(latest?.entries[0].key).toBe('cover');
    // The indicator waits above the screen in use (ADR-0016): it is read from the element.
    expect(document.querySelector('.aca-indicator__input')).toHaveAttribute(
      'aria-valuetext',
      'Pagina 2 di 3: Principale'
    );
  });

  it('keeps an empty «Principale» in the pager with its «+» cells and no empty-page overlay', async () => {
    await renderLauncher({
      ...layout,
      pages: [{ ...layout.pages[0], placements: { tablet: {} } }, layout.pages[1]],
    });
    expect(latest?.entries.map((entry) => entry.key)).toEqual(['cover', 'home', 'altra']);
    expect(latest?.currentPageId).toBe('home');
    expect(cellsOf('Principale')).toHaveLength(40);
    expect(screen.queryByText('Questa pagina è vuota')).not.toBeInTheDocument();
  });
});

describe('free cells with «+»', () => {
  beforeEach(() => {
    localStorage.clear();
    latest = null;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('draws a «+» button on every free cell only, the same cells in view and in edit mode', async () => {
    await renderLauncher();
    const view = cellsOf('Principale').map((cell) => cell.getAttribute('aria-label'));
    expect(view).toHaveLength(36);
    expect(view).not.toContain(cellLabel(0, 0));
    expect(view).not.toContain(cellLabel(1, 1));
    expect(view[0]).toBe(cellLabel(2, 0));

    // In edit mode the widget selected on entering is moved by a cell (E2): the same cells,
    // saying where the widget goes instead of what is added (2026-10-23).
    act(() => latest?.setEditMode(true));
    const edit = Array.from(
      region('Principale').querySelectorAll<HTMLElement>('button[data-launcher-cell]')
    );
    expect(edit.map((cell) => cell.dataset.launcherCell)).toHaveLength(36);
    expect(edit[0].getAttribute('aria-label')).toBe('Sposta Tessera qui: colonna 3, riga 1');
  });

  it('is one tab stop per grid; arrows, Home and End move between free cells', async () => {
    await renderLauncher();
    const cells = cellsOf('Principale');
    expect(cells.filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
    const first = screen.getByRole('button', { name: cellLabel(2, 0) });
    expect(first.tabIndex).toBe(0);
    expect(first).toHaveAttribute('aria-describedby', 'aca-launcher-cell-help');

    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const right = screen.getByRole('button', { name: cellLabel(3, 0) });
    expect(right).toHaveFocus();
    expect(right.tabIndex).toBe(0);
    expect(first.tabIndex).toBe(-1);

    // Down from column 2 of row 1 skips nothing; up from row 2 column 0 (under «a») goes to the
    // closest free column of row 1.
    fireEvent.keyDown(right, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: cellLabel(3, 1) })).toHaveFocus();
    act(() => screen.getByRole('button', { name: cellLabel(0, 2) }).focus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(screen.getByRole('button', { name: cellLabel(2, 1) })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(screen.getByRole('button', { name: cellLabel(7, 4) })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(screen.getByRole('button', { name: cellLabel(2, 0) })).toHaveFocus();
  });

  it('opens the add sheet from a cell, in view mode too, and places the widget on that cell', async () => {
    await renderLauncher();
    expect(latest?.editMode).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: cellLabel(5, 2) }));
    const sheet = screen.getByRole('dialog', { name: 'Aggiungi alla pagina home' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Aggiungi una tessera' }));
    expect(placement('home', 'test_tile_new')).toEqual({ x: 5, y: 2, w: 2, h: 2 });
    expect(screen.getByText('Tessera test_tile_new 2x2')).toBeInTheDocument();
    // The cells it now covers are no longer free (the new widget is selected, in edit mode).
    expect(screen.queryByRole('button', { name: cellLabel(6, 3) })).not.toBeInTheDocument();
    expect(region('Principale').querySelectorAll('button[data-launcher-cell]')).toHaveLength(32);
  });

  it('keeps widgets added together near the touched cell', async () => {
    await renderLauncher();
    fireEvent.click(screen.getByRole('button', { name: cellLabel(6, 3) }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi due tessere' }));
    expect(placement('home', 'test_tile_x')).toEqual({ x: 6, y: 3, w: 2, h: 1 });
    const second = placement('home', 'test_tile_y');
    expect(second && second.x >= 4 && second.y >= 2).toBe(true);
  });

  it('there is no «+ Widget» button nor tray: the widget goes where the cell touched is (2026-10-23)', async () => {
    await renderLauncher();
    act(() => latest?.setEditMode(true));
    expect(screen.queryByRole('button', { name: 'Aggiungi widget' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Aggiungi un widget' })).not.toBeInTheDocument();
  });

  it('gives the focus to the new widget, selected in edit mode, once the sheet closes', async () => {
    await renderLauncher();
    const cell = screen.getByRole('button', { name: cellLabel(4, 0) });
    act(() => cell.focus());
    fireEvent.click(cell);
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una tessera' }));
    await waitFor(() =>
      expect(document.activeElement?.closest('[data-widget-id]')).toHaveAttribute(
        'data-widget-id',
        'test_tile_new'
      )
    );
  });

  it('keeps the wells and drops the «+» while a widget is dragged', async () => {
    await renderLauncher();
    act(() => latest?.setEditMode(true));
    class Pointer extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 0;
      }
    }
    vi.stubGlobal('PointerEvent', Pointer);
    const grid = region('Principale').querySelector('.aca-launcher-grid');
    expect(grid).not.toHaveClass('is-dragging');
    // Selected first, the widget drags at once (not selected it lifts after a second).
    fireEvent.click(screen.getByRole('button', { name: /^Tessera,/ }));
    fireEvent.pointerDown(screen.getByRole('button', { name: /^Tessera,/ }), {
      pointerId: 1,
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 40, clientY: 50 });
    await waitFor(() => expect(grid).toHaveClass('is-dragging'));
    // The dragged widget leaves its own cells as wells for reference.
    expect(region('Principale').querySelectorAll('.aca-launcher-cell')).toHaveLength(40);
    fireEvent.pointerCancel(window, { pointerId: 1 });
    await waitFor(() => expect(grid).not.toHaveClass('is-dragging'));
  });

  it('the wells go out only on the pages in reach of the finger (0.9.28, G2 tracing)', async () => {
    const page = (id: string, label: string) => ({
      id,
      label,
      kind: 'widgets' as const,
      placements: { tablet: { [`test_tile_${id}`]: { x: 0, y: 0, w: 2, h: 2 } } },
    });
    await renderLauncher({
      ...layout,
      pages: [
        layout.pages[0],
        page('p2', 'Seconda'),
        page('p3', 'Terza'),
        page('p4', 'Quarta'),
        page('p5', 'Quinta'),
      ],
    });
    act(() => latest?.setEditMode(true));
    class Pointer extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 0;
      }
    }
    vi.stubGlobal('PointerEvent', Pointer);
    const grids = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.aca-pager__page')).map((section) =>
        section.querySelector('.aca-launcher-grid')
      );
    const own = within(region('Principale')).getByRole('button', { name: /^Tessera,/ });
    fireEvent.click(own);
    fireEvent.pointerDown(own, {
      pointerId: 1,
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 40, clientY: 50 });
    await waitFor(() =>
      expect(region('Principale').querySelector('.aca-launcher-grid')).toHaveClass('is-dragging')
    );
    // The cover is at 0, «Principale» at 1: the page in view only (W1, tracing of 2026-10-25), not
    // its two neighbours as before, and not the ones further on.
    const all = grids();
    expect(all).toHaveLength(6);
    expect(all.filter((grid) => grid?.classList.contains('is-dragging'))).toHaveLength(1);
    expect(all[1]).toHaveClass('is-dragging');
    fireEvent.pointerCancel(window, { pointerId: 1 });
  });

  it('the neighbour takes the drag style when the finger arms its edge, and the page left keeps it to the end (W1)', async () => {
    const page = (id: string, label: string) => ({
      id,
      label,
      kind: 'widgets' as const,
      placements: { tablet: { [`test_tile_${id}`]: { x: 0, y: 0, w: 2, h: 2 } } },
    });
    await renderLauncher({
      ...layout,
      pages: [layout.pages[0], page('p2', 'Seconda'), page('p3', 'Terza')],
    });
    act(() => latest?.setEditMode(true));
    class Pointer extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 0;
      }
    }
    vi.stubGlobal('PointerEvent', Pointer);
    // A pager of 1000 px: the edges are the 72 px at each side.
    const original = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      return this.classList.contains('aca-pager')
        ? ({ left: 0, right: 1000, top: 0, bottom: 700, width: 1000, height: 700 } as DOMRect)
        : original.call(this);
    });
    const grids = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.aca-pager__page')).map((section) =>
        section.querySelector('.aca-launcher-grid')
      );
    const dragging = () => grids().map((grid) => grid?.classList.contains('is-dragging'));
    const own = within(region('Principale')).getByRole('button', { name: /^Tessera,/ });
    fireEvent.click(own);
    fireEvent.pointerDown(own, { pointerId: 1, button: 0, clientX: 300, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 340, clientY: 50 });
    await waitFor(() => expect(dragging()).toEqual([false, true, false, false]));
    // The finger on the right edge: the page at 2 gets the class before it comes ...
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 990, clientY: 50 });
    await waitFor(() => expect(dragging()).toEqual([false, true, true, false]));
    // ... and the finger leaving the edge does not take it off: it keeps it to the end.
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 500, clientY: 50 });
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(dragging()).toEqual([false, true, true, false]);
    // The session ends: the page in view loses it in that commit (the «+» come back as ever), the
    // page armed at the edge, off screen, keeps it until the quiet moment (G4, W-A) ...
    fireEvent.pointerCancel(window, { pointerId: 1 });
    expect(dragging()).toEqual([false, false, true, false]);
    // ... or until the first pointerdown, which takes it off at once.
    fireEvent.pointerDown(document.body, { pointerId: 2 });
    expect(dragging()).toEqual([false, false, false, false]);
  });

  it('a resize draws the drag style on the grid it starts from and on no other (W1)', async () => {
    await renderLauncher();
    act(() => latest?.setEditMode(true));
    class Pointer extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 0;
      }
    }
    vi.stubGlobal('PointerEvent', Pointer);
    const grids = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.aca-pager__page')).map((section) =>
        section.querySelector('.aca-launcher-grid')
      );
    const widget = region('Principale').querySelector<HTMLElement>('[data-widget-id]')!;
    fireEvent.click(within(region('Principale')).getByRole('button', { name: /^Tessera,/ }));
    const side = widget.querySelector<HTMLElement>('[data-resize-side="e"]')!;
    fireEvent.pointerDown(side, { pointerId: 2, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 140, clientY: 100 });
    await waitFor(() => expect(widget).toHaveClass('is-resizing'));
    const marked = grids().filter((grid) => grid?.classList.contains('is-dragging'));
    expect(marked).toHaveLength(1);
    expect(marked[0]).toBe(region('Principale').querySelector('.aca-launcher-grid'));
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 140, clientY: 100 });
    await waitFor(() => expect(grids().some((grid) => grid?.classList.contains('is-dragging'))).toBe(false));
  });
});
