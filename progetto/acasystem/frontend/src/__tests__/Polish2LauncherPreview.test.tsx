import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageProvider } from '@/hooks/context/PageContext';
import { ToastProvider } from '@/hooks/context/ToastContext';
import { PreviewApp } from '@/pages/launcher/preview/PreviewApp';

/**
 * REP-20261007-001, second round, request of the kit lane: in the development preview
 * (launcher.html) `?pagina=<id>` opens that page once the layout is loaded, and stays there.
 * The launcher is drawn only after the start options apply, so the pager starts on that page
 * (no scroll from «Principale» that a slow first frame could settle back on). The app itself
 * (LauncherPage) is not touched: it always opens on «Principale».
 */

/** The page indicator waits above the screen in use (ADR-0016): the range is found as it is. */
const waitForIndicator = () =>
  waitFor(() => {
    const slider = document.querySelector<HTMLElement>('.aca-indicator__input');
    expect(slider).not.toBeNull();
    return slider as HTMLElement;
  });

/** Pager positions written while the preview starts: instant ones and smooth scrolls. */
interface Moves {
  instant: number[];
  smooth: number[];
}

/**
 * jsdom has no layout: pages 1000 px wide, a scroll position that keeps what is written, and a
 * scrollTo that records the smooth scrolls of the pager.
 */
function fakeScroll(moves: Moves) {
  const positions = new WeakMap<Element, number>();
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollLeft');
  const width = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  Object.defineProperty(Element.prototype, 'scrollLeft', {
    configurable: true,
    get(this: Element) {
      return positions.get(this) ?? 0;
    },
    set(this: Element, value: number) {
      positions.set(this, value);
      if (this.classList.contains('aca-pager')) moves.instant.push(value);
    },
  });
  const scrollTo = vi.fn(function (this: Element, options: ScrollToOptions) {
    if (this.classList.contains('aca-pager')) moves.smooth.push(options.left ?? 0);
  });
  Element.prototype.scrollTo = scrollTo as unknown as Element['scrollTo'];
  return () => {
    width.mockRestore();
    if (original) Object.defineProperty(Element.prototype, 'scrollLeft', original);
    Reflect.deleteProperty(Element.prototype, 'scrollTo');
  };
}

function renderPreview(search: string) {
  window.history.replaceState(null, '', `/launcher.html${search}`);
  // The preview reads the query string when it mounts.
  render(
    <ToastProvider>
      <PageProvider>
        <PreviewApp />
      </PageProvider>
    </ToastProvider>
  );
}

describe('preview start options', () => {
  let moves: Moves;
  let restore: () => void;
  beforeEach(() => {
    localStorage.clear();
    moves = { instant: [], smooth: [] };
    restore = fakeScroll(moves);
  });
  afterEach(() => {
    cleanup();
    restore();
    window.history.replaceState(null, '', '/');
  });

  it('opens the page of ?pagina= directly, with no scroll from «Principale»', async () => {
    renderPreview('?pagina=cover');
    const slider = await waitForIndicator();
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^Pagina 1 di \d+: Copertina$/);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^Pagina 1 di \d+: Copertina$/);
    // The pager was never placed on «Principale» (1000 px) nor scrolled from there.
    expect(moves.instant.every((left) => left === 0)).toBe(true);
    expect(moves.smooth).toEqual([]);
  }, 60000);

  it('without options opens on the base page, placed at once as in the app', async () => {
    renderPreview('');
    const slider = await waitForIndicator();
    await waitFor(() => expect(slider.getAttribute('aria-valuetext')).toMatch(/^Pagina 2 di /));
    expect(moves.instant).toContain(1000);
    expect(moves.smooth).toEqual([]);
  }, 60000);
});
