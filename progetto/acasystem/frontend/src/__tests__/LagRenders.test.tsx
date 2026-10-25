/**
 * Lag on the tablet, block L2 (REP-20261012-003): the page in the centre and the overview change
 * at every swipe and every opening of the overview, and nothing a grid or a widget draws depends
 * on them. The controller they read keeps its identity (and with it the context of the launcher),
 * and the footer band measures only what can change its widths.
 */
import { useMemo, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardSettingsMap, PagesConfig, PageSettingsMap } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';
import { useWidgetController } from '@/hooks/launcher/useWidgetController';
import { useFooterBand } from '@/templates/app-shell/footerBand';

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: true },
  pages: [
    {
      id: 'home',
      label: 'Principale',
      kind: 'widgets',
      placements: { tablet: { 'light.a': { x: 0, y: 0, w: 2, h: 2 } } },
    },
    { id: 'studio', label: 'Studio', kind: 'widgets', placements: { tablet: {} } },
  ],
};

const legacy: PagesConfig = {
  header: [],
  pages: ['home', 'studio'],
  home: ['light.a'],
  studio: [],
};

function useStore(initial: LauncherLayout) {
  const [stored, setStored] = useState<LauncherLayout | null>(initial);
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>(legacy);
  const [pageSettings, setPageSettings] = useState<PageSettingsMap>({});
  const [cardSettings, setCardSettings] = useState<CardSettingsMap>({});
  return useMemo<LauncherStore>(
    () => ({
      ready: true,
      layout: stored,
      persistLayout: setStored,
      pagesConfig,
      pageSettings,
      cardSettings,
      persistPagesConfig: setPagesConfig,
      persistPageSettings: setPageSettings,
      persistCardSettings: setCardSettings,
    }),
    [stored, pagesConfig, pageSettings, cardSettings]
  );
}

function renderControllers(initial: LauncherLayout = layout) {
  return renderHook(() => {
    const live = useLauncherController({ store: useStore(initial), deviceClass: 'tablet' });
    return { live, widget: useWidgetController(live) };
  });
}

describe('the controller of the grids and the widgets (REP-20261012-003)', () => {
  it('is the same object when the page in the centre changes', () => {
    const { result } = renderControllers();
    act(() => result.current.live.setEditMode(true));
    const before = result.current;
    act(() => result.current.live.goToPageId('studio'));
    expect(result.current.live.currentPageId).toBe('studio');
    expect(result.current.live.currentPage).not.toBe(before.live.currentPage);
    expect(result.current.widget).toBe(before.widget);
  });

  it('is the same object when the overview opens and closes, with the cover on', () => {
    const { result } = renderControllers();
    act(() => result.current.live.setEditMode(true));
    const before = result.current;
    act(() => result.current.live.setOverview(true));
    expect(result.current.live.overview).toBe(true);
    expect(result.current.widget).toBe(before.widget);
    act(() => result.current.live.setOverview(false));
    expect(result.current.widget).toBe(before.widget);
  });

  it('is the same object when the overview opens and closes with the cover off', () => {
    const { result } = renderControllers();
    act(() => result.current.live.setEditMode(true));
    act(() => result.current.live.setCoverEnabled(false));
    const off = result.current;
    // A cover that is off has a card in the overview: the entries of the pager are another list
    // then, and the grids and the widgets still read the same controller.
    act(() => result.current.live.setOverview(true));
    expect(result.current.live.entries[0].key).toBe('cover');
    expect(result.current.live.entries).not.toBe(off.live.entries);
    expect(result.current.widget).toBe(off.widget);
    act(() => result.current.live.setOverview(false));
    expect(result.current.live.entries[0].key).not.toBe('cover');
    expect(result.current.widget).toBe(off.widget);
  });

  it('keeps the lookups of the pages: they are the same functions after a swipe', () => {
    const { result } = renderControllers();
    const before = result.current.widget;
    act(() => result.current.live.goToPageId('studio'));
    const after = result.current.widget;
    expect(after.classFor).toBe(before.classFor);
    expect(after.gridFor).toBe(before.gridFor);
    expect(after.findPage).toBe(before.findPage);
    expect(after.canRemovePage).toBe(before.canRemovePage);
    expect(after.columnsAllowed).toBe(before.columnsAllowed);
  });

  it('changes with what the widgets draw: edit mode and the layout', () => {
    const { result } = renderControllers();
    const before = result.current.widget;
    act(() => result.current.live.setEditMode(true));
    expect(result.current.widget).not.toBe(before);
    const editing = result.current.widget;
    act(() => result.current.live.updatePage('studio', { label: 'Ufficio' }));
    expect(result.current.widget).not.toBe(editing);
    expect(result.current.widget.findPage('studio')?.label).toBe('Ufficio');
  });

  it('still answers for the page that is not in the centre', () => {
    const { result } = renderControllers();
    expect(result.current.widget.findPage('studio')?.id).toBe('studio');
    expect(result.current.widget.findPage('cover')?.id).toBe('cover');
    expect(result.current.widget.gridFor('studio')).toBe(result.current.live.grid);
    expect(result.current.widget.canRemovePage('studio')).toBe(true);
  });
});

describe('the footer band measures what can change its widths (REP-20261012-003)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** A footer with the edit bar, its groups and an indicator of two dots, in a hook. */
  function mountFooter() {
    const footer = document.createElement('footer');
    footer.innerHTML =
      '<div class="aca-edit-toolbar"><div class="aca-edit-toolbar__actions"></div>' +
      '<div class="aca-edit-toolbar__pages"></div></div>' +
      '<div class="aca-indicator"><span class="aca-indicator__dot"></span>' +
      '<span class="aca-indicator__dot"></span></div>' +
      '<div class="aca-page-overview"><span class="name">Uno</span></div>';
    document.body.append(footer);
    const measured = vi.spyOn(footer, 'clientWidth', 'get').mockReturnValue(800);
    const hook = renderHook(() => {
      useFooterBand({ current: footer });
    });
    return { footer, measured, hook };
  }

  /** Lets the observers deliver their records. */
  // The measure of the band waits for the next frame, ahead of this callback (REP-20261019-002).
  const flush = () =>
    act(async () => {
      await Promise.resolve();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });

  it('does not measure for the classes of the dots, nor for the name in the bar of the pages', async () => {
    const { footer, measured, hook } = mountFooter();
    await flush();
    const calls = measured.mock.calls.length;
    expect(calls).toBeGreaterThan(0);

    footer.querySelector('.aca-indicator__dot')?.classList.add('is-current');
    footer.querySelector('.aca-indicator')?.classList.add('aca-indicator--hidden');
    footer.querySelector('.aca-page-overview')?.classList.add('aca-page-overview--hidden');
    footer.querySelector('.name')!.textContent = 'Due';
    footer.querySelector('.aca-page-overview')!.append(document.createElement('i'));
    await flush();
    expect(measured.mock.calls.length).toBe(calls);

    hook.unmount();
    footer.remove();
  });

  it('measures again when the edit bar is shown or hidden and when the dots change', async () => {
    const { footer, measured, hook } = mountFooter();
    await flush();
    let calls = measured.mock.calls.length;

    footer.querySelector('.aca-edit-toolbar')?.classList.add('aca-edit-toolbar--hidden');
    await flush();
    // Hidden, the band has nothing to measure: it stops before it reads anything.
    expect(measured.mock.calls.length).toBe(calls);

    footer.querySelector('.aca-edit-toolbar')?.classList.remove('aca-edit-toolbar--hidden');
    await flush();
    expect(measured.mock.calls.length).toBeGreaterThan(calls);

    calls = measured.mock.calls.length;
    footer.querySelector('.aca-indicator')?.append(document.createElement('span'));
    await flush();
    expect(measured.mock.calls.length).toBeGreaterThan(calls);

    hook.unmount();
    footer.remove();
  });

  /** The footer with both bars (REP-20261013-002, stage 2): status bar shown, edit bar hidden. */
  function mountBars() {
    const footer = document.createElement('footer');
    footer.innerHTML =
      '<div class="aca-status-bar" data-band-bar="status">' +
      '<div data-band-group="start"><time data-band-clock>12:00</time>' +
      '<span class="connection">Sincronizzato</span></div>' +
      '<div data-band-group="end"><div data-band-flex><span class="chip">Mattia</span></div>' +
      '<button type="button">Modifica</button></div></div>' +
      '<div class="aca-edit-toolbar aca-edit-toolbar--hidden" data-band-bar="edit" inert>' +
      '<div data-band-group="start"></div><div data-band-group="end"></div></div>' +
      '<div class="aca-indicator"><span class="aca-indicator__dot"></span>' +
      '<span class="aca-indicator__dot"></span></div>';
    document.body.append(footer);
    const measured = vi.spyOn(footer, 'clientWidth', 'get').mockReturnValue(800);
    const hook = renderHook(() => {
      useFooterBand({ current: footer });
    });
    return { footer, measured, hook };
  }

  it('does not measure for the chips or the clock of the status bar', async () => {
    const { footer, measured, hook } = mountBars();
    await flush();
    const calls = measured.mock.calls.length;
    expect(calls).toBeGreaterThan(0);

    footer.querySelector('[data-band-flex]')?.append(document.createElement('span'));
    footer.querySelector('.chip')?.classList.add('is-active');
    footer.querySelector('[data-band-flex]')?.replaceChildren();
    footer.querySelector('[data-band-clock]')?.replaceChildren(document.createElement('i'));
    footer.querySelector('.aca-indicator__dot')?.classList.add('is-current');
    await flush();
    expect(measured.mock.calls.length).toBe(calls);

    hook.unmount();
    footer.remove();
  });

  it('measures the bar that comes, and again what the connection is made of', async () => {
    const { footer, measured, hook } = mountBars();
    await flush();
    const status = footer.querySelector('.aca-status-bar');
    const edit = footer.querySelector('.aca-edit-toolbar');
    let calls = measured.mock.calls.length;

    // Edit mode: the status bar goes, the edit bar comes (a class each).
    status?.classList.add('aca-status-bar--hidden');
    edit?.classList.remove('aca-edit-toolbar--hidden');
    edit?.removeAttribute('inert');
    await flush();
    expect(measured.mock.calls.length).toBeGreaterThan(calls);

    // The status bar comes back: a change of visibility is a measure, or a memory of one.
    calls = measured.mock.calls.length;
    status?.classList.remove('aca-status-bar--hidden');
    edit?.classList.add('aca-edit-toolbar--hidden');
    edit?.setAttribute('inert', '');
    await flush();
    expect(measured.mock.calls.length).toBeGreaterThan(calls);

    calls = measured.mock.calls.length;
    footer.querySelector('.connection')?.append(document.createElement('b'));
    await flush();
    expect(measured.mock.calls.length).toBeGreaterThan(calls);

    // A change inside the bar that is out of its mode is not measured until it comes back.
    status?.classList.add('aca-status-bar--hidden');
    await flush();
    calls = measured.mock.calls.length;
    footer
      .querySelector('.aca-edit-toolbar [data-band-group]')
      ?.append(document.createElement('b'));
    await flush();
    expect(measured.mock.calls.length).toBe(calls);

    hook.unmount();
    footer.remove();
  });
});
