/**
 * PageShell (REP-20261009-004, ADR-0012): the one place that mounts the content of a page. The
 * cover, the pages of widgets and the special pages come through it, and the data of the page
 * (not a branch of the screen) tell them apart.
 */
import { useMemo } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSettings } from '@/@types/dashboard';
import type {
  LauncherLayout,
  LauncherPage,
  PageKind,
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
import { LAUNCHER_LAYOUT_STORAGE_KEY } from '@/utils/launcher/storage';
import { HomeMeasurementContext } from '@/hooks/startup/HomeStartupContext';
import { PageShell } from '@/templates/launcher/PageShell';
import { describePage } from '@/utils/launcher/pageDescriptor';

function SpecialPage() {
  return <p>Contenuto della pagina speciale</p>;
}

vi.mock('@/components/widgets/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/widgets/registry')>();
  return {
    ...actual,
    findPageKindDefinition: (kind: PageKind) =>
      kind === 'lights'
        ? { kind: 'lights' as const, label: 'Luci', Page: SpecialPage }
        : actual.findPageKindDefinition(kind),
  };
});

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

const home: LauncherPage = {
  id: 'home',
  label: 'Casa',
  kind: 'widgets',
  placements: { tablet: { test_tile_a: { x: 0, y: 0, w: 1, h: 1 } } },
};
const lights: LauncherPage = { id: 'luci', label: 'Luci', kind: 'lights', placements: {} };
const layout: LauncherLayout = { version: 1, cover: { enabled: true }, pages: [home, lights] };

async function open() {
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

/** The shell of the page under this section name (a page out of view has no accessible name). */
const shellOf = (name: string) =>
  document.querySelector<HTMLElement>(`section[aria-label="${name}"] .aca-page-shell`)!;

describe('PageShell', () => {
  beforeEach(() => {
    localStorage.clear();
    latest = null;
    localStorage.setItem(LAUNCHER_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('mounts one shell per page, in the pager order, with the kind and the top bar of the page', async () => {
    const { container } = await open();
    const shells = Array.from(container.querySelectorAll<HTMLElement>('.aca-page-shell'));
    expect(shells.map((shell) => shell.dataset.pageKind)).toEqual(['cover', 'widgets', 'lights']);
    expect(shells.map((shell) => shell.dataset.topBar)).toEqual(['never', 'auto', 'auto']);
    // The shell is the child of the clip of the body of its pager page (REP-20261012-003):
    // nothing else mounts the content.
    for (const shell of shells) {
      expect(shell.parentElement).toHaveClass('aca-pager__clip');
      expect(shell.parentElement?.parentElement).toHaveClass('aca-pager__body');
    }
    // The old wrapper of the cover is gone: the cover is a page like the others.
    expect(container.querySelector('.aca-cover, .aca-cover--widgets')).toBeNull();
  });

  it('takes no box of its own: its page is laid out as the child of the pager body', async () => {
    // Vitest empties CSS imports and the strict program has no Node types: typed dynamic import.
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const css = fs.readFileSync('../design/layout/launcher.css', 'utf8');
    expect(css).toMatch(/\.aca-page-shell\s*\{\s*display:\s*contents;\s*\}/);
  });

  it('puts a grid in the cover and in the pages of widgets, a special page in the others', async () => {
    await open();
    expect(shellOf('Copertina').querySelector('[data-launcher-page="cover"]')).not.toBeNull();
    expect(shellOf('Casa').querySelector('[data-launcher-page="home"]')).not.toBeNull();
    const special = shellOf('Luci');
    expect(special.querySelector('[data-launcher-page]')).toBeNull();
    // Out of view the page is hidden from assistive technology: the heading is there all the same.
    expect(
      within(special).getByRole('heading', { level: 1, name: 'Luci', hidden: true })
    ).toBeInTheDocument();
    expect(within(special).getByText('Contenuto della pagina speciale')).toBeInTheDocument();
  });

  it('keeps the special page out of reach in edit mode and gives it back after', async () => {
    await open();
    const content = () => shellOf('Luci').querySelector('.aca-launcher-special');
    expect(content()).not.toHaveAttribute('inert');
    act(() => latest?.setEditMode(true));
    expect(content()).toHaveAttribute('inert');
    act(() => latest?.setEditMode(false));
    expect(content()).not.toHaveAttribute('inert');
  });

  it('in the page overview only the body is out of reach: the opener of each page stays', async () => {
    await open();
    act(() => latest?.setEditMode(true));
    act(() => latest?.setOverview(true));
    expect(document.querySelector('.aca-pager')).toHaveClass('is-overview');
    for (const name of ['Copertina', 'Casa', 'Luci']) {
      const section = screen.getByRole('region', { name });
      expect(section).not.toHaveAttribute('inert');
      expect(section.querySelector('.aca-pager__body')).toHaveAttribute('inert');
      expect(
        within(section).getByRole('button', { name: new RegExp(`^Apri ${name}`) })
      ).toBeEnabled();
    }
  });
  it('reports real special-page geometry to startup when its display-contents shell has no box', () => {
    let width = 440, height = 956;
    let resize: ResizeObserverCallback | null = null;
    const disconnect = vi.fn(), observe = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const positive = this.classList.contains('aca-launcher-special');
      const w = positive ? width : 0, h = positive ? height : 0;
      return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({}) };
    });
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) { resize = callback; }
      observe = observe; disconnect = disconnect; unobserve = vi.fn();
    });
    const report = vi.fn();
    const descriptor = describePage({ type: 'page', key: lights.id, label: lights.label, page: lights }, home.id);
    const view = render(<PageProvider><HomeMeasurementContext.Provider value={{ key: 'lights-epoch', pageId: lights.id, report }}>
      <PageShell descriptor={descriptor} editMode={false} />
    </HomeMeasurementContext.Provider></PageProvider>);
    expect(report).toHaveBeenLastCalledWith('lights-epoch', true);
    expect(observe).toHaveBeenCalledWith(view.container.querySelector('.aca-launcher-special'));
    width = 0; height = 0;
    act(() => resize?.([], {} as ResizeObserver));
    expect(report).toHaveBeenLastCalledWith('lights-epoch', false);
    width = 390; height = 800;
    act(() => resize?.([], {} as ResizeObserver));
    expect(report).toHaveBeenLastCalledWith('lights-epoch', true);
    view.unmount(); expect(disconnect).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

});
