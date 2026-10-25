/**
 * Empty places of the cover grid (REP-20261009-004): outside edit mode they are always visible
 * wells, hidden from assistive technology and without «+»; in edit mode they are the cells with
 * «+». The other pages keep their «+» cells in both modes.
 */
import { useMemo } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type {
  LauncherLayout,
  LauncherPage,
  WidgetDefinition,
  WidgetProps,
} from '@/@types/launcher';
import { PageProvider, usePages } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import {
  useLauncherController,
  type LauncherController,
  type LauncherStore,
} from '@/hooks/launcher/useLauncherController';
import { LauncherScreen } from '@/templates/launcher/LauncherScreen';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import { DEFAULT_GRIDS, columnsKey } from '@/utils/launcher/deviceClass';
import { COVER_PAGE_ID } from '@/utils/launcher/layout';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';

const cell = (x: number, y: number) => ({ x, y, w: 1, h: 1 });

const tile: WidgetDefinition = {
  type: 'test_tile',
  label: 'Tessera',
  icon: 'grid',
  sizes: { min: { w: 1, h: 1 }, max: { w: 3, h: 1 }, default: { w: 1, h: 1 } },
  matches: (id) => id.startsWith('test_tile'),
  Widget: ({ id }: WidgetProps) => <span>{id}</span>,
};
const findDefinition = (id: string, _settings: CardSettings) =>
  tile.matches(id, {}) ? tile : undefined;

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
    }),
    [pages]
  );
  const controller = useLauncherController({
    store,
    deviceClass: 'phoneLandscape',
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

/** Cover with a widget in the first and in the last column: the middle one is a hole. */
const coverKey = columnsKey('phoneLandscape', 3, DEFAULT_GRIDS);
const cover: LauncherPage = {
  id: COVER_PAGE_ID,
  label: 'Copertina',
  kind: 'cover',
  columns: 3,
  placements: { [coverKey]: { test_tile_a: cell(0, 0), test_tile_b: cell(2, 0) } },
};
const home: LauncherPage = {
  id: 'home',
  label: 'Casa',
  kind: 'widgets',
  placements: { phoneLandscape: { test_tile_c: cell(0, 0) } },
};
const layout = (pages: LauncherPage[]): LauncherLayout => ({
  version: 1,
  cover: { enabled: true },
  pages,
});

describe('celle libere della copertina', () => {
  beforeEach(() => {
    localStorage.clear();
    latest = null;
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout([home, cover])));
    // The area of the grid on the Lenovo in Chrome, as measured on the screenshots.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const area = this.classList.contains('aca-launcher-page');
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: area ? 973 : 0,
        height: area ? 230 : 0,
        right: area ? 973 : 0,
        bottom: area ? 230 : 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  async function open() {
    const view = render(
      <ToastProvider>
        <PageProvider>
          <Harness />
        </PageProvider>
      </ToastProvider>
    );
    await waitFor(() => expect(latest?.ready).toBe(true));
    const page = (id: string) =>
      view.container.querySelector<HTMLElement>(`[data-launcher-page="${id}"]`)!;
    return { view, page };
  }

  const placesOf = (page: HTMLElement) => {
    const style = page.querySelector<HTMLElement>('.aca-launcher-grid')!.style;
    return (
      Number(style.getPropertyValue('--aca-cols')) * Number(style.getPropertyValue('--aca-rows'))
    );
  };

  it('outside edit mode every empty place is a well: hidden, not interactive, without «+»', async () => {
    const { page } = await open();
    const cells = page(COVER_PAGE_ID);
    const wells = Array.from(cells.querySelectorAll<HTMLElement>('[data-launcher-well]'));
    // Every place except the two widgets, the hole in the middle among them.
    expect(wells).toHaveLength(placesOf(cells) - 2);
    expect(wells.map((well) => well.dataset.launcherWell)).toContain('1,0');
    for (const well of wells) {
      expect(well.tagName).toBe('SPAN');
      expect(well).toHaveClass('aca-launcher-cell', 'aca-m--well-soft', 'is-well');
      expect(well.querySelector('svg')).toBeNull();
      expect(well.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(well).not.toHaveAttribute('tabindex');
    }
    expect(cells.querySelectorAll('button[data-launcher-cell]')).toHaveLength(0);
    expect(cells.querySelector('[data-launcher-cells]')).toBeNull();
  });

  it('in edit mode the same places are cells with «+», in the same layer', async () => {
    const { page } = await open();
    const layer = page(COVER_PAGE_ID).querySelector('.aca-launcher-cells');
    expect(layer).not.toBeNull();
    act(() => latest?.setEditMode(true));
    const cells = page(COVER_PAGE_ID);
    expect(cells.querySelectorAll('[data-launcher-well]')).toHaveLength(0);
    const buttons = cells.querySelectorAll<HTMLElement>('button[data-launcher-cell]');
    expect(buttons).toHaveLength(placesOf(cells) - 2);
    for (const button of buttons) {
      expect(button.querySelector('svg')).not.toBeNull();
      expect(button).toHaveAccessibleName(/^Aggiungi un widget: colonna/);
    }
    // With free cells the layer is never unmounted: only the cells in it change.
    expect(cells.querySelector('.aca-launcher-cells')).toBe(layer);
    act(() => latest?.setEditMode(false));
    expect(page(COVER_PAGE_ID).querySelector('.aca-launcher-cells')).toBe(layer);
    expect(page(COVER_PAGE_ID).querySelectorAll('button[data-launcher-cell]')).toHaveLength(0);
  });

  it('a page of widgets keeps its «+» cells outside edit mode, without wells', async () => {
    const { page } = await open();
    const casa = page('home');
    expect(casa.querySelectorAll('[data-launcher-well]')).toHaveLength(0);
    expect(casa.querySelectorAll('button[data-launcher-cell]').length).toBeGreaterThan(0);
  });
});
