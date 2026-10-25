/**
 * Guards for the second round of optimisation of 0.9.28 (REP-20261023-006, tracings G2 of
 * 2026-10-24): what the corrections changed without changing what is seen. The rules of the
 * stylesheets are in `StyleInvalidation0928.test.ts` and `RegressionCss0928.test.ts`, the
 * attribute of the pages out of sight in `PagerOverview.test.tsx`.
 */
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import {
  OverlayPhaseContext,
  useSceneReached,
  type OverlayPhase,
} from '@/hooks/launcher/useOverlayScene';
import { LocationSection } from '@/pages/system/sections/LocationSection';
import { categoryPageSeeds } from '@/templates/sheets/categoryPages';
import { upgradeCategoryGrids } from '@/templates/sheets/categoryPageGrid';
import { coverDate } from '@/utils/launcher/calendar';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { placeWidgetInLayout, type LayoutContext } from '@/utils/launcher/layout';
import { legacySettingsKey } from '@/utils/launcher/migration';
import { findWidgetDefinition } from '@/components/widgets/registry';

// The layout of a page is laid out again by `placeWidgetInLayout`: it counts how often.
const placed = vi.hoisted(() => ({ calls: 0 }));
vi.mock('@/utils/launcher/layout', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/launcher/layout')>();
  return {
    ...original,
    placeWidgetInLayout: (...args: Parameters<typeof original.placeWidgetInLayout>) => {
      placed.calls += 1;
      return original.placeWidgetInLayout(...args);
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the date of the cover is formatted once (M3)', () => {
  it('gives the same texts, and makes no formatter for a call on a day already formatted', () => {
    const first = coverDate(new Date(2026, 9, 6, 9, 15));
    expect(first).toMatchObject({
      weekday: 'Martedì',
      month: 'Ottobre',
      day: 6,
      year: 2026,
      iso: '2026-10-06',
      spoken: 'martedì 6 ottobre 2026',
    });
    const formatter = vi.spyOn(Intl, 'DateTimeFormat');
    // Another time of the same day, and a call at every render of the cover.
    expect(coverDate(new Date(2026, 9, 6, 23, 59))).toEqual(first);
    expect(coverDate(new Date(2026, 9, 6, 0, 1))).toBe(coverDate(new Date(2026, 9, 6, 12, 0)));
    expect(formatter).not.toHaveBeenCalled();
  });

  it('another day gives its own texts, also without a new formatter', () => {
    coverDate(new Date(2026, 9, 6));
    const formatter = vi.spyOn(Intl, 'DateTimeFormat');
    expect(coverDate(new Date(2026, 9, 7))).toMatchObject({
      weekday: 'Mercoledì',
      day: 7,
      iso: '2026-10-07',
    });
    expect(coverDate(new Date(2026, 10, 1))).toMatchObject({ month: 'Novembre', day: 1 });
    expect(formatter).not.toHaveBeenCalled();
  });
});

describe('the upgrade of the category pages does not look again at a page left as it is (M4)', () => {
  const ctx: LayoutContext = {
    deviceClass: 'phone',
    grids: DEFAULT_GRIDS,
    viewportWidth: 390,
    sizesOf: (id) => findWidgetDefinition(id)?.sizes,
  };
  /** A page that looks like the old seed of «Casa» but was changed by the person. */
  function changedCategoryPage() {
    let layout: LauncherLayout = {
      version: 1,
      categoryDefaultsVersion: 1,
      cover: { enabled: true },
      pages: [{ id: 'casa', label: 'Casa personale', kind: 'widgets', placements: {} }],
    };
    const settings: CardSettingsMap = {};
    let target = 'casa';
    for (const seed of categoryPageSeeds('casa', 'casa')) {
      const result = placeWidgetInLayout(layout, ctx, target, seed.id, seed.size);
      layout = result.layout;
      target = result.pageId;
      settings[legacySettingsKey(target, seed.id)] = { ...seed.settings };
    }
    const changed = structuredClone(layout);
    const rects = changed.pages[0].placements.phone!;
    const [a, b] = Object.keys(rects);
    [rects[a], rects[b]] = [rects[b], rects[a]];
    return { layout: changed, settings };
  }

  it('the same page, settings and context give the same answer without laying the seed out again', () => {
    const { layout, settings } = changedCategoryPage();
    placed.calls = 0;
    expect(upgradeCategoryGrids(layout, settings, ctx).layout).toBe(layout);
    const first = placed.calls;
    expect(first).toBeGreaterThan(0);
    // A new layout object with the same page (every change of another page makes one).
    const next: LauncherLayout = { ...layout, pages: [...layout.pages] };
    expect(upgradeCategoryGrids(next, settings, ctx).layout).toBe(next);
    expect(placed.calls).toBe(first);
  });

  it('another settings object, another context or a page that changed look again', () => {
    const { layout, settings } = changedCategoryPage();
    upgradeCategoryGrids(layout, settings, ctx);
    placed.calls = 0;
    upgradeCategoryGrids(layout, { ...settings }, ctx);
    expect(placed.calls).toBeGreaterThan(0);
    placed.calls = 0;
    upgradeCategoryGrids(layout, settings, { ...ctx, viewportWidth: 400 });
    expect(placed.calls).toBeGreaterThan(0);
    placed.calls = 0;
    const edited = structuredClone(layout);
    upgradeCategoryGrids(edited, settings, ctx);
    expect(placed.calls).toBeGreaterThan(0);
  });

  it('the page that was left as it is is upgraded as before once it is back to the seed', () => {
    const { layout, settings } = changedCategoryPage();
    expect(upgradeCategoryGrids(layout, settings, ctx).layout).toBe(layout);
    // The person puts the two widgets back where they were: a new page object, the old seed.
    const restored = structuredClone(layout);
    const rects = restored.pages[0].placements.phone!;
    const [a, b] = Object.keys(rects);
    [rects[a], rects[b]] = [rects[b], rects[a]];
    const upgraded = upgradeCategoryGrids(restored, settings, ctx);
    expect(upgraded.layout).not.toBe(restored);
    expect(upgraded.layout.pages[0].categoryGrids).toBeDefined();
  });
});

// A holder of the phase that a test changes from outside.
let setPhase: (phase: OverlayPhase) => void = () => undefined;
function PhaseHolder({ children }: { children: ReactNode }) {
  const [phase, set] = useState<OverlayPhase>('wait');
  setPhase = set;
  return <OverlayPhaseContext.Provider value={phase}>{children}</OverlayPhaseContext.Provider>;
}

describe('what is costly to start waits for the scene of Sistema (S-L)', () => {
  const wrapper =
    (phase: OverlayPhase) =>
    ({ children }: { children: ReactNode }) => (
      <OverlayPhaseContext.Provider value={phase}>{children}</OverlayPhaseContext.Provider>
    );

  it('is true at once where there is no scene', () => {
    const { result } = renderHook(() => useSceneReached());
    expect(result.current).toBe(true);
  });

  it('is false in the wait and in the fade, true once the page is there, and stays true', async () => {
    const { result } = renderHook(() => useSceneReached(), { wrapper: PhaseHolder });
    expect(result.current).toBe(false);
    act(() => setPhase('in'));
    expect(result.current).toBe(false);
    act(() => setPhase('on'));
    await waitFor(() => expect(result.current).toBe(true));
    act(() => setPhase('out-wait'));
    expect(result.current).toBe(true);
    act(() => setPhase('out'));
    expect(result.current).toBe(true);
  });

  it('the map of Posizione is not made inside the fade, and is made when the page is there', async () => {
    const view = render(
      <LocationSection home={{ lat: 40.85, lon: 14.27 }} canEdit onSave={vi.fn()} />,
      { wrapper: wrapper('in') }
    );
    // The place of the map is held, the map itself is not made.
    expect(view.container.querySelector('.aca-location-map--loading')).not.toBeNull();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(screen.queryByRole('application', { name: 'Mappa' })).toBeNull();
    view.unmount();
    // Without a scene around it, or once the scene is `on`, the map is made.
    render(<LocationSection home={{ lat: 40.85, lon: 14.27 }} canEdit onSave={vi.fn()} />, {
      wrapper: wrapper('on'),
    });
    await waitFor(() => expect(screen.getByRole('application', { name: 'Mappa' })).toBeTruthy(), {
      timeout: 5000,
    });
  });
});
