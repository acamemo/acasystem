import { useEffect, useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { PageVisibilityContext, usePageVisible } from '@/hooks/launcher/PageVisibilityContext';

export interface PagerPage {
  key: string;
  label: string;
  content: ReactNode;
}

export interface PagerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  pages: readonly PagerPage[];
  index: number;
  onIndexChange: (index: number) => void;
  /** While a widget is dragged the swipe is off (the pages turn from the edges instead). */
  locked: boolean;
  reducedMotion: boolean;
  /** Receives the scroll container, for the edge detection of the drag. */
  containerRef?: (node: HTMLDivElement | null) => void;
}

const SETTLE_MS = 90;

/** Page the scroll position rests on. */
const settledIndexOf = (element: HTMLDivElement | null, fallback: number) =>
  !element || element.clientWidth === 0
    ? fallback
    : Math.round(element.scrollLeft / element.clientWidth);

/**
 * Full-screen horizontal pager on CSS scroll snap. Swiping settles on a page and reports it;
 * a new index (indicator, keyboard, edge of a drag) scrolls there. Off-screen pages are inert,
 * so Tab stays on the page shown.
 */
export function Pager({
  pages,
  index,
  onIndexChange,
  locked,
  reducedMotion,
  containerRef,
  className,
  ...props
}: PagerProps) {
  const visible = usePageVisible();
  const ref = useRef<HTMLDivElement | null>(null);
  const indexRef = useRef(index);
  const onChangeRef = useRef(onIndexChange);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keys = pages.map((page) => page.key).join('|');

  useEffect(() => {
    onChangeRef.current = onIndexChange;
  }, [onIndexChange]);

  // A new index from outside: scroll there (instantly the first time, e.g. the launcher opening
  // on «Principale», and when the pages themselves changed).
  const lastKeys = useRef(keys);
  const placed = useRef(false);
  useLayoutEffect(() => {
    indexRef.current = index;
    const element = ref.current;
    if (!element || element.clientWidth === 0) return;
    const pagesChanged = lastKeys.current !== keys;
    const first = !placed.current;
    lastKeys.current = keys;
    placed.current = true;
    if (settledIndexOf(element, index) === index && !pagesChanged) return;
    const left = index * element.clientWidth;
    // Keyboard paging lands immediately; the indicator and other pointer input glide there.
    const fromKeyboard = document.documentElement.dataset.acaInput === 'keyboard';
    if (
      first ||
      pagesChanged ||
      reducedMotion ||
      fromKeyboard ||
      typeof element.scrollTo !== 'function'
    ) {
      element.scrollLeft = left;
    } else {
      element.scrollTo({ left, behavior: 'smooth' });
    }
  }, [index, keys, reducedMotion]);

  // Keep the page in place when the viewport changes size.
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      element.scrollLeft = indexRef.current * element.clientWidth;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    []
  );

  const onScroll = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const settled = Math.max(
        0,
        Math.min(pages.length - 1, settledIndexOf(ref.current, indexRef.current))
      );
      if (settled !== indexRef.current) {
        indexRef.current = settled;
        onChangeRef.current(settled);
      }
    }, SETTLE_MS);
  };

  return (
    <div
      {...props}
      ref={(node) => {
        ref.current = node;
        containerRef?.(node);
      }}
      className={['aca-pager', locked && 'is-locked', className].filter(Boolean).join(' ')}
      onScroll={onScroll}
    >
      {pages.map((page, position) => (
        <section
          key={page.key}
          className="aca-pager__page"
          aria-label={page.label}
          aria-hidden={position !== index || undefined}
          inert={position !== index || undefined}
        >
          <PageVisibilityContext.Provider value={visible && position === index}>
            {page.content}
          </PageVisibilityContext.Provider>
        </section>
      ))}
    </div>
  );
}
