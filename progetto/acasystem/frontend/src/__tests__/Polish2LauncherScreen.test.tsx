import { useMemo } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type { LauncherLayout, WidgetDefinition, WidgetProps } from '@/@types/launcher';
import type { AddWidgetSheetProps, WidgetSettingsSheetProps } from '@/templates/sheets';
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

// REP-20261007-001, second round: widgets before the «+» cells in the DOM (V-03, R-04), cells
// kept by a hidden widget drawn as quiet wells without «+» (V-04), focus back on a widget added
// from a cell after its settings sheet (R-02), cells on the soft well of the kit (R-05).

// The add sheet adds like the real one (onAdded, then onClose); the settings sheet is a plain
// dialog with a close button, so the focus is left on the body as with the real <dialog>.
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
            onAdded('todo_card_1', { w: 2, h: 2 });
            onClose();
          }}
        >
          Aggiungi le attività
        </button>
      </div>
    ) : null,
  WidgetSettingsSheet: ({ open, widgetId, onClose }: WidgetSettingsSheetProps) =>
    open ? (
      <div role="dialog" aria-label={`Impostazioni di ${widgetId}`}>
        <button type="button" onClick={onClose}>
          Chiudi le impostazioni
        </button>
      </div>
    ) : null,
  PageSettingsSheet: () => null,
}));

function Tile({ id }: WidgetProps) {
  return <button type="button">{`Apri ${id}`}</button>;
}
const tile: WidgetDefinition = {
  type: 'test_tile',
  label: 'Tessera',
  icon: 'grid',
  sizes: { min: { w: 1, h: 1 }, max: { w: 4, h: 3 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('test_tile') || id.startsWith('todo_card_'),
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
      placements: {
        tablet: {
          test_tile_a: { x: 0, y: 0, w: 2, h: 2 },
          test_tile_hidden: { x: 4, y: 1, w: 2, h: 2 },
        },
      },
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
      cover={<p>Copertina di prova</p>}
      connection={{ phase: 'connected', label: 'Connesso' }}
      chips={[]}
      onOpenSystem={() => undefined}
      detailsWidgetId={null}
      onCloseDetails={() => undefined}
      isWidgetHidden={(_pageId, widgetId) => widgetId === 'test_tile_hidden'}
      findDefinition={findDefinition}
    />
  );
}

async function renderLauncher() {
  localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
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

const region = () => screen.getByRole('region', { name: 'Principale' });
const grid = () => region().querySelector('.aca-launcher-grid') as HTMLElement;
const freeCellButtons = () =>
  within(region()).getAllByRole('button', { name: /^Aggiungi un widget: / });
const cellLabel = (x: number, y: number) => `Aggiungi un widget: colonna ${x + 1}, riga ${y + 1}`;

beforeEach(() => {
  localStorage.clear();
  latest = null;
});

describe('order of widgets and «+» cells (V-03, R-04)', () => {
  it('puts the widgets before the free cells in the DOM and in the reading order', async () => {
    await renderLauncher();
    const children = Array.from(grid().children);
    const firstCells = children.findIndex((child) => child.matches('[data-launcher-cells]'));
    const lastWidget = children.map((child) => child.matches('[data-widget-id]')).lastIndexOf(true);
    expect(firstCells).toBeGreaterThan(lastWidget);
    // The first button of the page is the widget's own control, not «Aggiungi un widget».
    const first = within(region()).getAllByRole('button')[0];
    expect(first.closest('[data-widget-id]')).toHaveAttribute('data-widget-id', 'test_tile_a');
  });
});

describe('cells kept by a hidden widget (V-04)', () => {
  it('draws quiet wells without «+», not interactive and hidden from assistive technology', async () => {
    await renderLauncher();
    expect(screen.queryByText('Apri test_tile_hidden')).not.toBeInTheDocument();
    const reserved = Array.from(
      grid().querySelectorAll<HTMLElement>('[data-launcher-reserved]')
    ).map((cell) => cell.dataset.launcherReserved);
    expect(reserved.sort()).toEqual(['4,1', '4,2', '5,1', '5,2']);
    for (const cell of grid().querySelectorAll<HTMLElement>('[data-launcher-reserved]')) {
      expect(cell.tagName).toBe('SPAN');
      expect(cell).toHaveClass('aca-m--well-soft', 'is-reserved');
      expect(cell.querySelector('svg')).toBeNull();
      expect(cell.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    // Not free: 40 cells − 4 (visible widget) − 4 (hidden widget).
    expect(freeCellButtons()).toHaveLength(32);
    expect(screen.queryByRole('button', { name: cellLabel(4, 1) })).not.toBeInTheDocument();
  });

  it('shows the hidden widget in edit mode instead, with no reserved wells', async () => {
    await renderLauncher();
    act(() => latest?.setEditMode(true));
    expect(grid().querySelectorAll('[data-launcher-reserved]')).toHaveLength(0);
    expect(grid().querySelector('[data-widget-id="test_tile_hidden"]')).not.toBeNull();
    expect(freeCellButtons()).toHaveLength(32);
  });
});

describe('free cells on the kit (R-05)', () => {
  it('uses the soft well modifier of a static material, not the full well', async () => {
    await renderLauncher();
    for (const cell of freeCellButtons()) {
      expect(cell).toHaveClass('aca-m', 'aca-m--static', 'aca-m--well-soft', 'aca-launcher-cell');
      expect(cell).not.toHaveClass('aca-m--well');
    }
  });
});

describe('focus after a widget added from a cell opens its settings (R-02)', () => {
  async function addTodoFrom(cell: { x: number; y: number }) {
    const button = screen.getByRole('button', { name: cellLabel(cell.x, cell.y) });
    act(() => button.focus());
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi le attività' }));
    // The settings sheet of the new widget opens right away.
    const settings = await screen.findByRole('dialog', { name: 'Impostazioni di todo_card_1' });
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(within(settings).getByRole('button', { name: 'Chiudi le impostazioni' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  }

  it('in view mode the focus goes to the new widget', async () => {
    await renderLauncher();
    await addTodoFrom({ x: 6, y: 3 });
    expect(latest?.layout.pages[0].placements.tablet?.todo_card_1).toEqual({
      x: 6,
      y: 3,
      w: 2,
      h: 2,
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Apri todo_card_1' })).toHaveFocus()
    );
  });

  it('in edit mode the focus goes to the handle of the new widget', async () => {
    await renderLauncher();
    act(() => latest?.setEditMode(true));
    await addTodoFrom({ x: 2, y: 3 });
    await waitFor(() => expect(document.activeElement).toHaveClass('aca-launcher-widget__handle'));
    expect(document.activeElement?.closest('[data-widget-id]')).toHaveAttribute(
      'data-widget-id',
      'todo_card_1'
    );
  });

  it('a plain add in view mode still leaves the focus on the free-cell stop', async () => {
    await renderLauncher();
    const button = screen.getByRole('button', { name: cellLabel(6, 3) });
    act(() => button.focus());
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una tessera' }));
    await waitFor(() =>
      expect(document.activeElement?.getAttribute('aria-label') ?? '').toMatch(
        /^Aggiungi un widget: /
      )
    );
  });
});
