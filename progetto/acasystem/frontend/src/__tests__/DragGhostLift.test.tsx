/**
 * The copy of a lifted widget takes the size of the cell from the grid without asking the browser
 * for a style (ISSUE-109, R3): getComputedStyle at the lift recalculated the whole document inside
 * the gesture. The values are those of the grid; the radius of the cell comes from the stylesheet,
 * from the same expression the grid uses.
 */
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DragGhost } from '@/templates/launcher/DragGhost';
import type { DragSession } from '@/hooks/launcher/useWidgetDrag';

const session: DragSession = {
  mode: 'move',
  edge: { x: 1, y: 1 },
  widgetId: 'luce',
  label: 'Luce',
  sourcePageId: 'home',
  origin: { x: 0, y: 0, w: 1, h: 1 },
  box: { width: 100, height: 100 },
  offset: { x: 30, y: 40 },
  start: { x: 30, y: 40 },
  pointer: { x: 30, y: 40 },
  target: null,
  lifted: true,
};

/** The page, grid and widget the copy is taken from, as WidgetGrid leaves them. */
function mountGrid(vars: Record<string, string> = {}) {
  const page = document.createElement('div');
  page.setAttribute('data-launcher-page', 'home');
  const grid = document.createElement('div');
  grid.className = 'aca-launcher-grid';
  for (const [name, value] of Object.entries({
    '--aca-cell': '86px',
    '--aca-gap-x': '12px',
    '--aca-gap-y': '14px',
    ...vars,
  })) {
    grid.style.setProperty(name, value);
  }
  const widget = document.createElement('div');
  widget.setAttribute('data-widget-id', 'luce');
  const frame = document.createElement('div');
  frame.className = 'aca-launcher-widget__frame';
  frame.id = 'frame-luce';
  frame.innerHTML = '<span id="inner">Luce</span>';
  widget.appendChild(frame);
  grid.appendChild(widget);
  page.appendChild(grid);
  document.body.appendChild(page);
  return page;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('the lift of a widget reads no computed style (R3)', () => {
  it('the copy gets the cell size and the gaps of the grid it left', () => {
    mountGrid({ '--aca-cell': '90px', '--aca-gap-x': '10px', '--aca-gap-y': '8px' });
    const { container } = render(<DragGhost session={session} />);
    const ghost = container.querySelector<HTMLElement>('.aca-drag-ghost')!;
    expect(ghost.style.getPropertyValue('--aca-cell')).toBe('90px');
    expect(ghost.style.getPropertyValue('--aca-gap-x')).toBe('10px');
    expect(ghost.style.getPropertyValue('--aca-gap-y')).toBe('8px');
    // The copy itself: the frame cloned, out of reach and without ids.
    expect(ghost).toHaveAttribute('data-has-copy');
    const copy = ghost.querySelector('.aca-drag-ghost__copy > *')!;
    expect(copy).toHaveAttribute('inert');
    expect(copy.id).toBe('');
    expect(copy.querySelector('[id]')).toBeNull();
  });

  it('without a call to getComputedStyle, or to any measure of the layout', () => {
    mountGrid();
    const style = vi.spyOn(window, 'getComputedStyle');
    const box = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    render(<DragGhost session={session} />);
    expect(style).not.toHaveBeenCalled();
    expect(box).not.toHaveBeenCalled();
  });

  it('a widget that is not in the page, or a grid without values, leaves the copy bare', () => {
    const { container, unmount } = render(<DragGhost session={session} />);
    expect(container.querySelector('.aca-drag-ghost')).not.toHaveAttribute('data-has-copy');
    expect(
      container.querySelector<HTMLElement>('.aca-drag-ghost')!.style.getPropertyValue('--aca-cell')
    ).toBe('');
    unmount();
    mountGrid({ '--aca-cell': '' });
    const again = render(<DragGhost session={session} />);
    expect(
      again.container
        .querySelector<HTMLElement>('.aca-drag-ghost')!
        .style.getPropertyValue('--aca-cell')
    ).toBe('');
  });

  it('the copy leaves the page as it found it when the lift ends', () => {
    mountGrid();
    const { container, unmount } = render(<DragGhost session={session} />);
    const host = container.querySelector('.aca-drag-ghost__copy')!;
    expect(host.children).toHaveLength(1);
    unmount();
    expect(host.children).toHaveLength(0);
  });

  it('keeps the same single copy and its marker while pointer, target and flight update', () => {
    mountGrid();
    const clone = vi.spyOn(Element.prototype, 'cloneNode');
    const lookup = vi.spyOn(document, 'querySelectorAll');
    const { container, rerender } = render(<DragGhost session={session} />);
    const ghost = container.querySelector('.aca-drag-ghost')!;
    const copy = ghost.querySelector('.aca-drag-ghost__copy > *');
    const lookups = lookup.mock.calls.length;
    const updates: DragSession[] = [
      { ...session, pointer: { x: 90, y: 80 }, target: { pageId: 'home', rect: session.origin, valid: false, preview: null } },
      { ...session, pointer: { x: 120, y: 90 }, removing: true },
      { ...session, flight: { kind: 'return', x: 0, y: 0, scale: 1 } },
    ];
    for (const update of updates) {
      rerender(<DragGhost session={update} />);
      expect(ghost).toHaveAttribute('data-has-copy');
      expect(ghost.querySelector('.aca-drag-ghost__copy')?.children).toHaveLength(1);
      expect(ghost.querySelector('.aca-drag-ghost__copy > *')).toBe(copy);
    }
    expect(ghost).toHaveClass('is-flying', 'is-flying--return');
    expect(clone).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(lookups);
  });

  it('removes the marker and copy when adding or switching to a source that is absent', () => {
    mountGrid();
    const { container, rerender } = render(<DragGhost session={session} />);
    const ghost = container.querySelector('.aca-drag-ghost')!;
    rerender(<DragGhost session={{ ...session, mode: 'add' }} />);
    expect(ghost).not.toHaveAttribute('data-has-copy');
    expect(ghost.querySelector('.aca-drag-ghost__copy')?.children).toHaveLength(0);
    rerender(<DragGhost session={{ ...session, sourcePageId: 'absent' }} />);
    expect(ghost).not.toHaveAttribute('data-has-copy');
    expect(ghost.querySelector('.aca-drag-ghost__copy')?.children).toHaveLength(0);
  });

  it('keeps one copy through StrictMode setup/cleanup and removes its marker on unmount', () => {
    mountGrid();
    const { container, unmount } = render(<StrictMode><DragGhost session={session} /></StrictMode>);
    const ghost = container.querySelector('.aca-drag-ghost')!;
    expect(ghost).toHaveAttribute('data-has-copy');
    expect(ghost.querySelector('.aca-drag-ghost__copy')?.children).toHaveLength(1);
    unmount();
    expect(ghost).not.toHaveAttribute('data-has-copy');
    expect(ghost.querySelector('.aca-drag-ghost__copy')?.children).toHaveLength(0);
  });
});

describe('the radius of the cell of the copy (R3)', () => {
  let css = '';
  beforeAll(async () => {
    // Vitest empties CSS imports and the strict program has no Node types: typed dynamic import.
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    css = fs
      .readFileSync('../design/layout/launcher.css', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  });
  /** The `--aca-radius-cell` that a rule with exactly this selector declares. */
  const radiusOf = (selector: string) => {
    for (const [, head, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (head.replace(/^[\s\S]*\{/, '').trim() !== selector) continue;
      const value = /--aca-radius-cell:\s*([^;]+);/.exec(body)?.[1];
      if (value) return value.trim();
    }
    return undefined;
  };

  it('is the expression of the grid, from the same cell, so the copy has the same corners', () => {
    const grid = radiusOf('.aca-launcher-grid');
    expect(grid).toBe('min(var(--aca-radius-card), calc(var(--aca-cell) * 0.24))');
    expect(radiusOf('.aca-drag-ghost')).toBe(grid);
  });
});
