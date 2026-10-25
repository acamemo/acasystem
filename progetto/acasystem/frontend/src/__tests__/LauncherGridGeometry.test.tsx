/**
 * Geometry a grid registers for the drag (REP-20261009-004): the place where its page rests,
 * measured from the section and placed on the pager, not where the page is while it scrolls
 * into view. A drag that has just turned the page then snaps to the right cell at once.
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LauncherPage } from '@/@types/launcher';
import type { GridGeometry } from '@/hooks/launcher/useWidgetDrag';
import { createLauncherSelection } from '@/hooks/launcher/useLauncherSelection';
import { LauncherUiContext, type LauncherUi } from '@/templates/launcher/LauncherUiContext';
import { WidgetGrid } from '@/templates/launcher/WidgetGrid';

const page: LauncherPage = {
  id: 'casa',
  label: 'Casa',
  kind: 'widgets',
  placements: { phoneLandscape: {} },
};

const rectOf = (left: number, top = 0) =>
  ({
    x: left,
    y: top,
    left,
    top,
    width: 0,
    height: 0,
    right: left,
    bottom: top,
    toJSON: () => ({}),
  }) as DOMRect;

describe('geometry registered by a grid', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is measured from the section and placed on the pager while the page scrolls in', () => {
    let measure: (() => GridGeometry | null) | null = null;
    const ui = {
      controller: {
        editMode: false,
        classFor: () => 'phoneLandscape',
        gridFor: () => ({ w: 4, h: 2 }),
      },
      registerGrid: (_pageId: string, fn: () => GridGeometry | null) => {
        measure = fn;
        return () => undefined;
      },
      isWidgetHidden: () => false,
      selection: createLauncherSelection(),
    } as unknown as LauncherUi;
    // Half way through the scroll: the section is 1000 px off the pager, the grid 10 px in it.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.classList.contains('aca-pager')) return rectOf(0, 0);
      if (this.classList.contains('aca-pager__page')) return rectOf(-1000, 0);
      if (this.classList.contains('aca-launcher-grid')) return rectOf(-990, 40);
      return rectOf(0, 0);
    });
    render(
      <LauncherUiContext.Provider value={ui}>
        <div className="aca-pager">
          <section className="aca-pager__page">
            <WidgetGrid page={page} />
          </section>
        </div>
      </LauncherUiContext.Provider>
    );
    const geometry = measure!();
    expect(geometry?.left).toBe(10);
    expect(geometry?.top).toBe(40);
  });

  it('measures its area by the layout size when the page is scaled (the page overview)', () => {
    const ui = {
      controller: {
        editMode: false,
        classFor: () => 'phoneLandscape',
        gridFor: () => ({ w: 4, h: 2 }),
      },
      registerGrid: () => () => undefined,
      isWidgetHidden: () => false,
      selection: createLauncherSelection(),
    } as unknown as LauncherUi;
    // The layout size of the page, in px (fractional, as the layout of a real page is).
    const cellOf = (scale: number, layout = { width: 1000, height: 500 }) => {
      const sized = (left: number) =>
        ({
          ...rectOf(left),
          width: layout.width * scale,
          height: layout.height * scale,
        }) as DOMRect;
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement
      ) {
        return this.classList.contains('aca-launcher-page') ? sized(0) : rectOf(0);
      });
      // The layout size does not follow the scale of the card.
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(
        Math.round(layout.width)
      );
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(
        Math.round(layout.height)
      );
      const sheet = document.createElement('style');
      sheet.textContent = `.aca-launcher-page { width: ${layout.width}px; height: ${layout.height}px; }`;
      document.head.append(sheet);
      const { container, unmount } = render(
        <LauncherUiContext.Provider value={ui}>
          <WidgetGrid page={page} />
        </LauncherUiContext.Provider>
      );
      const cell = container
        .querySelector<HTMLElement>('.aca-launcher-grid')!
        .style.getPropertyValue('--aca-cell');
      unmount();
      sheet.remove();
      vi.restoreAllMocks();
      return cell;
    };
    // A page at 72 % (a grid mounted in the overview, such as a new page) has the cells of a
    // page at full size: the card is its picture, scaled.
    expect(cellOf(0.72)).toBe(cellOf(1));
    expect(cellOf(1)).not.toBe('0px');
    // The same with a fractional layout size: the scaled page is not measured by the rounded
    // offset (nothing measures it again when the overview closes).
    const fractional = { width: 765.6, height: 1000 };
    expect(cellOf(0.72, fractional)).toBe(cellOf(1, fractional));
  });
});
