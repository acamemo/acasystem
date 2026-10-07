import { useMemo, useState } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CardSettingsMap, PagesConfig, PageSettingsMap } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';

// REP-20261007-001, second round, R-03: a page that leaves the pager gives its place back to
// «Principale» for good; a page chosen before it is shown (layout loading, page just added) is
// still reached.

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

function useStore(initial: LauncherLayout | null, ready: boolean) {
  const [stored, setStored] = useState<LauncherLayout | null>(initial);
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>(legacy);
  const [pageSettings, setPageSettings] = useState<PageSettingsMap>({});
  const [cardSettings, setCardSettings] = useState<CardSettingsMap>({});
  return useMemo<LauncherStore>(
    () => ({
      ready,
      layout: stored,
      persistLayout: setStored,
      pagesConfig,
      pageSettings,
      cardSettings,
      persistPagesConfig: setPagesConfig,
      persistPageSettings: setPageSettings,
      persistCardSettings: setCardSettings,
    }),
    [ready, stored, pagesConfig, pageSettings, cardSettings]
  );
}

function renderController(initial: LauncherLayout | null = layout, ready = true) {
  return renderHook(
    ({ isReady }: { isReady: boolean }) =>
      useLauncherController({ store: useStore(initial, isReady), deviceClass: 'tablet' }),
    { initialProps: { isReady: ready } }
  );
}

describe('current page that leaves the pager', () => {
  it('stays on «Principale» when edit mode comes back after an empty page was left', () => {
    const { result } = renderController();
    expect(result.current.currentPageId).toBe('home');
    expect(result.current.currentPage).toBe(1);

    act(() => result.current.setEditMode(true));
    act(() => result.current.goToPageId('studio'));
    expect(result.current.currentPageId).toBe('studio');
    expect(result.current.currentPage).toBe(2);

    // «Fine» on the empty page: it leaves the pager, «Principale» is shown.
    act(() => result.current.setEditMode(false));
    expect(result.current.entries.map((entry) => entry.key)).toEqual(['cover', 'home']);
    expect(result.current.currentPageId).toBe('home');

    // Edit mode again (long press on «Principale»): no jump to the empty page.
    act(() => result.current.setEditMode(true));
    expect(result.current.entries.map((entry) => entry.key)).toEqual(['cover', 'home', 'studio']);
    expect(result.current.currentPageId).toBe('home');
    expect(result.current.currentPage).toBe(1);
  });

  it('goes back to «Principale» for good when the page shown is removed or hidden', () => {
    const { result } = renderController();
    act(() => result.current.setEditMode(true));
    act(() => result.current.goToPageId('studio'));
    act(() => result.current.updatePage('studio', { hidden: true }));
    act(() => result.current.setEditMode(false));
    expect(result.current.currentPageId).toBe('home');
    act(() => result.current.updatePage('studio', { hidden: false }));
    act(() => result.current.setEditMode(true));
    expect(result.current.currentPageId).toBe('home');

    act(() => result.current.goToPageId('cover'));
    expect(result.current.currentPage).toBe(0);
    act(() => result.current.setCoverEnabled(false));
    expect(result.current.currentPageId).toBe('home');
    act(() => result.current.setCoverEnabled(true));
    expect(result.current.currentPageId).toBe('home');
  });

  it('keeps a page chosen before the settings are loaded, and reaches it once it exists', async () => {
    const { result, rerender } = renderController(null, false);
    // Not ready: the default layout has no «studio» yet.
    act(() => result.current.goToPageId('studio'));
    expect(result.current.currentPageId).toBe('home');
    act(() => result.current.setEditMode(true));
    rerender({ isReady: true });
    // Migrated from the legacy configuration: «studio» exists and is shown in edit mode.
    await waitFor(() => expect(result.current.currentPageId).toBe('studio'));
  });

  it('shows a page just added', () => {
    const { result } = renderController();
    act(() => result.current.setEditMode(true));
    let pageId = '';
    act(() => {
      pageId = result.current.addPage({ label: 'Cantina', kind: 'widgets' });
    });
    expect(result.current.currentPageId).toBe(pageId);
    expect(result.current.entries[result.current.currentPage].key).toBe(pageId);
  });
});
