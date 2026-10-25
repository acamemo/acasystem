/**
 * True while the pager around an element is between two pages (a fling still running, or a swipe
 * in progress). The pager changes the visible page only a moment after the last scroll event, so a
 * page can look «on screen» while it moves; a tap that stops the fling is not a tap on the page.
 */

/** Scroll offsets this close to a page edge count as aligned (subpixel rounding at DPR 1.5). */
const ALIGN_TOLERANCE_PX = 2;

export function pagerMoving(element: Element): boolean {
  const pager = element.closest('.aca-pager');
  if (!pager) return false;
  // The real width: clientWidth is rounded, and the error grows with the page index when the
  // pager is fractionally wide (phones at DPR 2.625, browser zoom 110%).
  const width = pager.getBoundingClientRect().width || pager.clientWidth;
  if (width === 0) return false;
  const offset = pager.scrollLeft % width;
  const gap = Math.min(offset, width - offset);
  return gap > ALIGN_TOLERANCE_PX;
}
