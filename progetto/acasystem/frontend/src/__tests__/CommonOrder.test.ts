import { describe, expect, it } from 'vitest';
import {
  migrateCommonOrder,
  moveInCommonOrder,
  newProfileConfiguration,
  orderedSegments,
  projectCommonOrder,
} from '@/domain/launcher/commonOrder';
import { configurationLayout } from '../../../contracts/profileResources';
import { DEFAULT_GRIDS, gridFor } from '@/utils/launcher/deviceClass';
import { idsByPosition, rectFits, rectsOverlap } from '@/utils/launcher/grid';
import type { DeviceClass, LauncherLayout } from '@/@types/launcher';
import { sanitizeLauncherLayout } from '@/validators/launcher';

describe('ordine comune dei profili', () => {
  it('conserva il drop su una cella vuota anche con il solo Tavano e dopo ricaricamento', () => {
    const base: LauncherLayout = { version: 1, commonOrderVersion: 1, cover: { enabled: false },
      pages: [{ id: 'home', label: 'Casa', kind: 'widgets', order: ['tavano'], placements: {} }] };
    const ctx = { deviceClass: 'tablet' as const, grids: DEFAULT_GRIDS };
    const view = projectCommonOrder(base, ctx);
    const next = moveInCommonOrder(base, view, ctx, 'home', 'tavano', { x: 4, y: 2 });
    expect(next.pages[0]!.order).toEqual(['tavano']);
    expect(base.pages[0]!.positionHints).toBeUndefined();
    const reloaded = sanitizeLauncherLayout(JSON.parse(JSON.stringify(next)))!;
    expect(projectCommonOrder(reloaded, ctx).pages[0]!.placements.tablet!.tavano)
      .toMatchObject({ x: 4, y: 2 });
    expect(reloaded.pages[0]!.placements).toEqual({});
  });
  it('adatta la posizione ai formati senza uscire dalla griglia o riscrivere il documento', () => {
    const base: LauncherLayout = { version: 1, commonOrderVersion: 1, cover: { enabled: false },
      pages: [{ id: 'home', label: 'Casa', kind: 'widgets', order: ['a', 'b', 'c'], placements: {},
        positionHints: { b: { x: 0.5, y: 0.5 }, c: { x: 1, y: 1 } } }] };
    const before = JSON.stringify(base);
    for (const deviceClass of ['tablet', 'phone', 'phoneLandscape', 'tabletPortrait'] as const) {
      const view = projectCommonOrder(base, { deviceClass, grids: DEFAULT_GRIDS });
      expect(view.pages.flatMap(page => idsByPosition(Object.values(page.placements)[0]!))).toEqual(['a', 'b', 'c']);
      for (const page of view.pages) {
        const rects = Object.values(Object.values(page.placements)[0]!);
        const actualGrid = gridFor(DEFAULT_GRIDS, Object.keys(page.placements)[0] as DeviceClass);
        expect(rects.every(rect => rectFits(rect, actualGrid))).toBe(true);
        expect(rects.every((rect, index) => rects.slice(index + 1).every(other => !rectsOverlap(rect, other)))).toBe(true);
      }
    }
    expect(JSON.stringify(base)).toBe(before);
    expect(base.pages).toHaveLength(1);
  });
  it('ignora suggerimenti posizionali non validi senza perdere i widget', () => {
    const clean = sanitizeLauncherLayout({ version: 1, commonOrderVersion: 1, cover: { enabled: false },
      pages: [{ id: 'home', label: 'Casa', kind: 'widgets', placements: {}, order: ['a', 'b', 'c', 'd'],
        positionHints: { a: { x: 0.5, y: 1 }, b: { x: -1, y: 0 }, c: { x: Infinity, y: 0 }, d: { x: 0, y: '1' } } }] })!;
    expect(clean.pages[0]!.positionHints).toEqual({ a: { x: 0.5, y: 1 } });
    expect(clean.pages[0]!.order).toEqual(['a', 'b', 'c', 'd']);
  });
  it('riordina un’istanza senza rimuovere l’alias dello stesso widget da un’altra pagina', () => {
    const layout: LauncherLayout = {
      version: 1,
      commonOrderVersion: 1,
      cover: { enabled: false },
      pages: [
        { id: 'home', label: 'Casa', kind: 'widgets', order: ['a', 'b'], placements: {} },
        { id: 'other', label: 'Altra', kind: 'widgets', order: ['a'], placements: {} },
      ],
    };
    const ctx = { deviceClass: 'phone' as const, grids: DEFAULT_GRIDS };
    const next = moveInCommonOrder(layout, projectCommonOrder(layout, ctx), ctx, 'home', 'b', {
      x: 0,
      y: 0,
    });
    expect(next.pages[0]!.order).toEqual(['b', 'a']);
    expect(next.pages[1]!.order).toEqual(['a']);
  });
  it('inizializza categorie e Casa3D soltanto per una nuova configurazione esplicita', () => {
    const fresh = newProfileConfiguration({ snapshot: { layout: {} } }, 'phone');
    const data = configurationLayout(fresh);
    const layout = data.launcherLayout as LauncherLayout;
    expect(layout.categoryDefaultsVersion).toBe(1);
    expect(layout.casa3dVersion).toBe(1);
    expect(layout.pages.some((page) => page.kind === 'casa3d')).toBe(true);
    expect(
      Object.values(data.cardSettings as Record<string, { categoryWidgetType?: string }>).filter(
        (item) => item.categoryWidgetType
      )
    ).toHaveLength(29);
    expect(layout.pages.every((page) => Object.keys(page.placements).length === 0)).toBe(true);
    const custom = migrateCommonOrder(
      { snapshot: { layout: { pagesConfig: { pages: ['home'], home: [] } } } },
      'phone'
    );
    expect((configurationLayout(custom).launcherLayout as LauncherLayout).pages).toHaveLength(1);
  });
  it('non inserisce un widget successivo in un buco sopra quello precedente', () => {
    const segments = orderedSegments(
      [
        { id: 'a', size: { w: 3, h: 1 } },
        { id: 'b', size: { w: 2, h: 2 } },
        { id: 'c', size: { w: 1, h: 1 } },
      ],
      { w: 4, h: 4 }
    );
    expect(segments.flatMap(idsByPosition)).toEqual(['a', 'b', 'c']);
  });

  it('il primo overflow porta con sé gli elementi successivi', () => {
    const segments = orderedSegments(
      [
        { id: 'a', size: { w: 3, h: 2 } },
        { id: 'b', size: { w: 2, h: 2 } },
        { id: 'c', size: { w: 1, h: 1 } },
      ],
      { w: 4, h: 3 }
    );
    expect(segments.map(idsByPosition)).toEqual([['a'], ['b', 'c']]);
  });

  it('telefono e PC proiettano lo stesso ordine senza modificare il documento', () => {
    const layout: LauncherLayout = {
      version: 1,
      commonOrderVersion: 1,
      cover: { enabled: false },
      pages: [
        {
          id: 'home',
          label: 'Principale',
          kind: 'widgets',
          order: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
          placements: {},
        },
      ],
    };
    const before = JSON.stringify(layout);
    for (const deviceClass of ['phone', 'tablet', 'phoneLandscape'] as const) {
      const projected = projectCommonOrder(layout, { deviceClass, grids: DEFAULT_GRIDS });
      expect(
        projected.pages.flatMap((page) =>
          Object.values(page.placements).flatMap((rects) => idsByPosition(rects ?? {}))
        )
      ).toEqual(layout.pages[0]!.order);
      for (const page of projected.pages) {
        const placements = Object.values(page.placements)[0]!;
        const rectangles = Object.values(placements);
        const grid = gridFor(DEFAULT_GRIDS, Object.keys(page.placements)[0] as typeof deviceClass);
        expect(rectangles.every((rect) => rectFits(rect, grid))).toBe(true);
        expect(
          rectangles.every((rect, index) =>
            rectangles.slice(index + 1).every((other) => !rectsOverlap(rect, other))
          )
        ).toBe(true);
        expect(page.logicalPageId).toBe('home');
      }
    }
    expect(JSON.stringify(layout)).toBe(before);
  });

  it('migra una sola fonte e recupera mancanti senza duplicare spostamenti fra pagine', () => {
    const box = (x: number) => ({ x, y: 0, w: 1, h: 1 });
    const configuration = {
      snapshot: {
        layout: {
          launcherLayout: {
            version: 1,
            cover: { enabled: false },
            pages: [
              {
                id: 'home',
                label: 'Principale',
                kind: 'widgets',
                placements: {
                  tablet: { a: box(1), b: box(0) },
                  phone: { a: box(0), lost: box(1), moved: box(2) },
                },
              },
              {
                id: 'second',
                label: 'Seconda',
                kind: 'widgets',
                placements: { tablet: { moved: box(0) }, phone: {} },
              },
            ],
          },
        },
      },
    };
    const migrated = migrateCommonOrder(configuration, 'tablet');
    const pages = (migrated.snapshot as { layout: { launcherLayout: LauncherLayout } }).layout
      .launcherLayout.pages;
    expect(pages[0]!.order).toEqual(['b', 'a', 'lost']);
    expect(pages[1]!.order).toEqual(['moved']);
    expect(migrateCommonOrder(migrated, 'phone')).toEqual(migrated);
    expect(configuration.snapshot.layout.launcherLayout.pages[0]!.placements.tablet).toBeDefined();
  });

  it('un profilo legacy privo di geometria conserva la lista e proietta widget sconosciuti', () => {
    const migrated = migrateCommonOrder(
      { snapshot: { layout: { pagesConfig: { pages: ['home'], home: ['unknown', 'other'] } } } },
      'phone'
    );
    const layout = (migrated.snapshot as { layout: { launcherLayout: LauncherLayout } }).layout
      .launcherLayout;
    expect(layout.pages[0]!.order).toEqual(['unknown', 'other']);
    expect(
      projectCommonOrder(layout, { deviceClass: 'phone', grids: DEFAULT_GRIDS }).pages[0]!
        .placements.phone
    ).toHaveProperty('unknown');
  });
});
