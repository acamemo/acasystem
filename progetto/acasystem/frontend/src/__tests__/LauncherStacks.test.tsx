/**
 * Widget stacks (REP-20261007-037): made by holding a widget over the middle of another one,
 * swiped in place, taken apart one widget at a time.
 */
import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LauncherLayout } from '@/@types/launcher';
import { useWidgetDrag, type DragSession } from '@/hooks/launcher/useWidgetDrag';
import { DEFAULT_GRIDS } from '@/utils/launcher/deviceClass';
import { layoutToPagesConfig } from '@/utils/launcher/legacySync';
import {
  setStackRotateInLayout,
  stackWidgetsInLayout,
  unstackWidgetInLayout,
  withoutEmptyStacks,
} from '@/utils/launcher/layout';
import { sanitizeLauncherLayout } from '@/validators/launcher';

const layout: LauncherLayout = {
  version: 1,
  cover: { enabled: false },
  pages: [
    {
      id: 'home',
      label: 'Principale',
      kind: 'widgets',
      placements: {
        tablet: {
          'camera.ingresso': { x: 0, y: 0, w: 2, h: 2 },
          'camera.giardino': { x: 4, y: 0, w: 2, h: 2 },
          'light.cucina': { x: 6, y: 0, w: 1, h: 1 },
        },
      },
    },
  ],
};
const ctx = {
  deviceClass: 'tablet' as const,
  grids: DEFAULT_GRIDS,
  sizesOf: () => ({ min: { w: 1, h: 1 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } }),
};

describe('stacks in the layout', () => {
  it('a widget dropped on another makes a stack in its place; the dragged one leaves the grid', () => {
    const next = stackWidgetsInLayout(
      layout,
      'home',
      'camera.giardino',
      'camera.ingresso',
      'stack_a'
    )!;
    const placements = next.pages[0].placements.tablet!;
    expect(placements.stack_a).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(placements['camera.ingresso']).toBeUndefined();
    expect(placements['camera.giardino']).toBeUndefined();
    expect(next.stacks).toEqual({ stack_a: { ids: ['camera.ingresso', 'camera.giardino'] } });

    // A third widget joins the stack; the legacy page list keeps every card.
    const three = stackWidgetsInLayout(next, 'home', 'light.cucina', 'stack_a', 'stack_b')!;
    expect(three.stacks?.stack_a.ids).toEqual([
      'camera.ingresso',
      'camera.giardino',
      'light.cucina',
    ]);
    expect(three.stacks?.stack_b).toBeUndefined();
    expect(layoutToPagesConfig(three, { pages: [], header: [] }, 'tablet').home).toEqual([
      'camera.ingresso',
      'camera.giardino',
      'light.cucina',
    ]);
  });

  it('taking widgets out puts them back on the page; the last one takes the stack’s place', () => {
    const stacked = stackWidgetsInLayout(
      layout,
      'home',
      'camera.giardino',
      'camera.ingresso',
      'stack_a'
    )!;
    const rotating = setStackRotateInLayout(stacked, 'stack_a', true);
    expect(rotating.stacks?.stack_a.rotate).toBe(true);
    const apart = unstackWidgetInLayout(rotating, ctx, 'home', 'stack_a', 'camera.giardino')!;
    const placements = apart.pages[0].placements.tablet!;
    expect(apart.stacks).toBeUndefined();
    expect(placements['camera.ingresso']).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(placements['camera.giardino']).toBeDefined();
    expect(placements.stack_a).toBeUndefined();
  });

  it('the validator keeps stacks and drops broken ones', () => {
    const clean = sanitizeLauncherLayout({
      ...layout,
      stacks: {
        stack_a: { ids: ['a', 'b', 'a', 3], rotate: true },
        stack_b: { ids: [] },
        other: { ids: ['c'] },
      },
    });
    expect(clean?.stacks).toEqual({ stack_a: { ids: ['a', 'b'], rotate: true } });
  });
});

describe('useWidgetDrag: «Crea pila»', () => {
  class Pointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number } = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
    }
  }
  beforeEach(() => {
    vi.stubGlobal('PointerEvent', Pointer);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('over the middle of another widget the target is a stack; near its side it is a move', () => {
    const onDrop = vi.fn<(session: DragSession) => void>();
    const { result } = renderHook(() =>
      useWidgetDrag({
        getGeometry: () => ({ left: 0, top: 0, cell: 100, gapX: 0, gapY: 0, grid: { w: 8, h: 5 } }),
        getPlacements: () => layout.pages[0].placements.tablet!,
        sizesFor: () => undefined,
        getPagerBounds: () => ({ left: -1000, right: 2000 }),
        onEdge: () => null,
        onDrop,
      })
    );
    act(() =>
      result.current.begin({
        mode: 'move',
        widgetId: 'camera.giardino',
        label: 'Giardino',
        pageId: 'home',
        origin: { x: 4, y: 0, w: 2, h: 2 },
        box: { left: 400, top: 0, width: 200, height: 200 },
        clientX: 500,
        clientY: 100,
        pointerId: 1,
      })
    );
    const move = (x: number, y: number) => {
      fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y });
      act(() => vi.advanceTimersByTime(20));
    };
    move(490, 100);
    // The middle of camera.ingresso (0..200 × 0..200).
    move(100, 100);
    expect(result.current.session?.target?.stackOn).toBe('camera.ingresso');
    // Its edge (within the outer quarter): a move, not a stack.
    move(20, 100);
    expect(result.current.session?.target?.stackOn).toBeUndefined();
    move(100, 100);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100 });
    expect(onDrop.mock.calls[0][0].target?.stackOn).toBe('camera.ingresso');
  });
});

describe('empty stacks give their cells back (0.9.28)', () => {
  const withEmptyStack = (stacks?: LauncherLayout['stacks']): LauncherLayout => ({
    ...layout,
    pages: [
      {
        ...layout.pages[0],
        placements: {
          tablet: {
            ...layout.pages[0].placements.tablet,
            stack_vuota: { x: 0, y: 2, w: 2, h: 2 },
          },
        },
      },
    ],
    ...(stacks ? { stacks } : {}),
  });

  it('a stored layout with an empty stack loads without it and the cells are free', () => {
    for (const stacks of [undefined, { stack_vuota: { ids: [] } }]) {
      const loaded = sanitizeLauncherLayout(withEmptyStack(stacks))!;
      expect(loaded.pages[0].placements.tablet?.stack_vuota).toBeUndefined();
      expect(loaded.stacks).toBeUndefined();
      // The other widgets stay where they were.
      expect(loaded.pages[0].placements.tablet?.['camera.ingresso']).toEqual({
        x: 0,
        y: 0,
        w: 2,
        h: 2,
      });
    }
  });

  it('the clean-up is idempotent and keeps a stack with widgets (one included) as it is', () => {
    const full: LauncherLayout = {
      ...withEmptyStack({
        stack_vuota: { ids: [] },
        stack_uno: { ids: ['light.cucina'], rotate: true },
      }),
    };
    full.pages[0].placements.tablet!.stack_uno = { x: 2, y: 2, w: 1, h: 1 };
    const once = sanitizeLauncherLayout(full)!;
    expect(once.stacks).toEqual({ stack_uno: { ids: ['light.cucina'], rotate: true } });
    expect(once.pages[0].placements.tablet?.stack_uno).toEqual({ x: 2, y: 2, w: 1, h: 1 });
    expect(sanitizeLauncherLayout(once)).toEqual(once);
    expect(withoutEmptyStacks(once)).toBe(once);
  });

  it('taking out the last widget of a stack removes the stack and frees its place', () => {
    const one: LauncherLayout = {
      ...layout,
      pages: [
        {
          ...layout.pages[0],
          placements: { tablet: { stack_solo: { x: 0, y: 0, w: 2, h: 2 } } },
        },
      ],
      stacks: { stack_solo: { ids: ['camera.ingresso'] } },
    };
    const next = unstackWidgetInLayout(one, ctx, 'home', 'stack_solo', 'camera.ingresso')!;
    expect(next.stacks).toBeUndefined();
    const placements = next.pages[0].placements.tablet!;
    expect(placements.stack_solo).toBeUndefined();
    expect(placements['camera.ingresso']).toBeDefined();
  });

  it('a stack left empty by removing its members is taken out whatever the way', () => {
    const stacked = stackWidgetsInLayout(
      layout,
      'home',
      'camera.giardino',
      'camera.ingresso',
      'stack_a'
    )!;
    // The members leave the stack by other means (e.g. a sync): the place is not kept.
    const emptied = withoutEmptyStacks({ ...stacked, stacks: { stack_a: { ids: [] } } });
    expect(emptied.stacks).toBeUndefined();
    expect(emptied.pages[0].placements.tablet?.stack_a).toBeUndefined();
    expect(emptied.pages[0].placements.tablet?.['light.cucina']).toBeDefined();
  });
});
