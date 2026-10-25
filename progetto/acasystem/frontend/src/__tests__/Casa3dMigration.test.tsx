import { useMemo, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CardSettingsMap, PagesConfig, PageSettingsMap } from '@/@types/dashboard';
import type { LauncherLayout, LauncherPage } from '@/@types/launcher';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';
import { installCasa3dPage, removePageFromLayout } from '@/utils/launcher/layout';
import { layoutToPageSettings } from '@/utils/launcher/legacySync';
import { pagerEntries } from '@/utils/launcher/pager';
import {
  LEGACY_PAGE_TYPE,
  PAGE_KIND_LABEL,
  createPageId,
  legacyPageKind,
} from '@/utils/launcher/pageIdentity';
import { findPageKindDefinition } from '@/components/widgets/registry';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { isLauncherLayout, isPageKind, sanitizeLauncherLayout } from '@/validators/launcher';

const page = (id: string, kind: LauncherPage['kind'] = 'widgets', extra = {}): LauncherPage => ({
  id,
  label: id,
  kind,
  placements: kind === 'widgets' ? { tablet: { a: { x: 0, y: 0, w: 1, h: 1 } } } : {},
  ...extra,
});

const base = (pages: LauncherPage[], extra: Partial<LauncherLayout> = {}): LauncherLayout => ({
  version: 1,
  cover: { enabled: true },
  pages,
  ...extra,
});

describe('Casa 3D page: kind, identity, validator, registry', () => {
  it('is a page kind with its label, its legacy type and a registry definition', () => {
    expect(isPageKind('casa3d')).toBe(true);
    expect(PAGE_KIND_LABEL.casa3d).toBe('Casa 3D');
    expect(LEGACY_PAGE_TYPE.casa3d).toBe('casa3d');
    expect(legacyPageKind('casa3d', undefined)).toBe('widgets');
    expect(legacyPageKind('casa3d_giardino', {})).toBe('widgets');
    expect(legacyPageKind('x', { x: { type: 'casa3d' } })).toBe('casa3d');
    expect(findPageKindDefinition('casa3d')?.label).toBe('Casa 3D');
  });

  it('gives the page its own id and never lets a page of widgets take the prefix', () => {
    expect(createPageId('Casa 3D', 'casa3d', ['home'])).toBe('casa3d');
    expect(createPageId('Casa 3D', 'casa3d', ['home', 'casa3d'])).toBe('casa3d_2');
    expect(createPageId('casa3d', 'widgets', ['home'])).toBe('page_casa3d');
  });

  it('keeps the page and the mark through the validator', () => {
    const layout = base([page('home'), page('casa3d', 'casa3d')], { casa3dVersion: 1 });
    expect(isLauncherLayout(layout)).toBe(true);
    const clean = sanitizeLauncherLayout(JSON.parse(JSON.stringify(layout)));
    expect(clean?.casa3dVersion).toBe(1);
    expect(clean?.pages[1].kind).toBe('casa3d');
    expect(sanitizeLauncherLayout({ ...layout, casa3dVersion: 2 })?.casa3dVersion).toBeUndefined();
  });

  it('writes its legacy type next to the other special pages', () => {
    const layout = base([page('home'), page('casa3d', 'casa3d')]);
    expect(layoutToPageSettings(layout, {}).casa3d?.type).toBe('casa3d');
  });
});

describe('installCasa3dPage: the migration', () => {
  it('adds the page at the end, once, and marks the layout', () => {
    const before = base([page('home'), page('luci', 'lights'), page('altro')]);
    const after = installCasa3dPage(before);
    expect(after.pages.map((item) => item.id)).toEqual(['home', 'luci', 'altro', 'casa3d']);
    expect(after.pages[3]).toMatchObject({ kind: 'casa3d', label: 'Casa 3D', placements: {} });
    expect(after.casa3dVersion).toBe(1);
    // the second run changes nothing, not even the object
    expect(installCasa3dPage(after)).toBe(after);
  });

  it('leaves every other page exactly as it was', () => {
    const pages = [page('home', 'widgets', { columns: 4, hidden: true }), page('luci', 'lights')];
    const after = installCasa3dPage(base(pages, { homePageId: 'home', density: 'wide' }));
    expect(after.pages[0]).toBe(pages[0]);
    expect(after.pages[1]).toBe(pages[1]);
    expect(after.homePageId).toBe('home');
    expect(after.density).toBe('wide');
  });

  it('does not duplicate a page of the kind that is already there, and only sets the mark', () => {
    const before = base([page('casa3d_mia', 'casa3d'), page('home')]);
    const after = installCasa3dPage(before);
    expect(after.pages).toBe(before.pages);
    expect(after.casa3dVersion).toBe(1);
  });

  it('does not bring back a page the user removed', () => {
    const installed = installCasa3dPage(base([page('home'), page('luci', 'lights')]));
    const removed = removePageFromLayout(installed, 'casa3d');
    expect(removed.pages.map((item) => item.id)).toEqual(['home', 'luci']);
    expect(installCasa3dPage(removed)).toBe(removed);
  });

  it('shows the page in the pager as the last one, outside edit mode too', () => {
    const layout = installCasa3dPage(base([page('home'), page('luci', 'lights')]));
    const keys = pagerEntries(layout, 'tablet', false, DEFAULT_GRIDS).map((entry) => entry.key);
    expect(keys).toEqual(['cover', 'home', 'luci', 'casa3d']);
  });
});

function useStore(initial: LauncherLayout | null) {
  const [layout, setLayout] = useState<LauncherLayout | null>(initial);
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>({
    header: [],
    pages: ['home'],
    home: [],
  });
  const [pageSettings, setPageSettings] = useState<PageSettingsMap>({});
  const [cardSettings, setCardSettings] = useState<CardSettingsMap>({});
  return useMemo<LauncherStore>(
    () => ({
      ready: true,
      layout,
      persistLayout: setLayout,
      pagesConfig,
      pageSettings,
      cardSettings,
      persistPagesConfig: setPagesConfig,
      persistPageSettings: setPageSettings,
      persistCardSettings: setCardSettings,
    }),
    [layout, pagesConfig, pageSettings, cardSettings]
  );
}

const render = (initial: LauncherLayout | null, initializeCategoryPages = true) =>
  renderHook(() => {
    const store = useStore(initial);
    return {
      store,
      controller: useLauncherController({ store, deviceClass: 'tablet', initializeCategoryPages }),
    };
  });

describe('launcher controller: the Casa 3D page', () => {
  it('puts the page after the category pages of a new profile, once', () => {
    const { result } = render(null);
    const pages = result.current.controller.layout.pages;
    expect(pages.filter((item) => item.kind === 'casa3d')).toHaveLength(1);
    expect(pages[pages.length - 1].kind).toBe('casa3d');
    expect(pages.length).toBeGreaterThan(8);
    expect(result.current.controller.layout.casa3dVersion).toBe(1);
    expect(result.current.store.layout?.casa3dVersion).toBe(1);
  });

  it('appends it to an existing profile without touching its pages', () => {
    const home = page('home');
    const luci = page('luci', 'lights');
    const saved = base([home, luci], { categoryDefaultsVersion: 1 });
    const { result, rerender } = render(saved);
    const pages = result.current.controller.layout.pages;
    expect(pages.map((item) => item.id)).toEqual(['home', 'luci', 'casa3d']);
    expect(pages[1]).toMatchObject({ id: 'luci', kind: 'lights' });
    rerender();
    rerender();
    expect(result.current.controller.layout.pages.map((item) => item.id)).toEqual([
      'home',
      'luci',
      'casa3d',
    ]);
  });

  it('does not bring it back after the user removes it, even after a reload', () => {
    const saved = base([page('home'), page('luci', 'lights')], { categoryDefaultsVersion: 1 });
    const first = render(saved);
    act(() => first.result.current.controller.removePage('casa3d'));
    const stored = first.result.current.store.layout!;
    expect(stored.pages.some((item) => item.kind === 'casa3d')).toBe(false);
    first.unmount();
    const reload = render(stored);
    expect(reload.result.current.controller.layout.pages.map((item) => item.id)).toEqual([
      'home',
      'luci',
    ]);
  });

  it('leaves harnesses without the operational start alone', () => {
    const { result } = render(null, false);
    expect(result.current.controller.layout.pages.some((item) => item.kind === 'casa3d')).toBe(
      false
    );
  });

  it('moves with the other pages: reordering keeps one page and the mark', () => {
    const saved = base([page('home'), page('luci', 'lights')], { categoryDefaultsVersion: 1 });
    const { result } = render(saved);
    act(() => result.current.controller.reorderPages(['casa3d', 'home', 'luci']));
    expect(result.current.controller.layout.pages.map((item) => item.id)).toEqual([
      'casa3d',
      'home',
      'luci',
    ]);
    expect(result.current.controller.layout.casa3dVersion).toBe(1);
  });
});
