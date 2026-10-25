import { useEffect, useRef, useState } from 'react';

/** How long the page indicator stays on screen after a page change out of edit mode. */
export const PAGE_FLASH_MS = 2000;

/**
 * True for PAGE_FLASH_MS after the page in the centre changes (a swipe, the keyboard commands),
 * so the page indicator can show itself for a moment as a cue (ADR-0016, C2). It does not start
 * at the first render, nor while `suppressed` (edit mode and the page overview, where the
 * indicator or the cards already say it); a change during that time flashes nothing.
 */
export function usePageFlash(pageKey: string | undefined, suppressed: boolean): boolean {
  const [flash, setFlash] = useState(false);
  const seen = useRef(pageKey);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (seen.current === pageKey) return;
    seen.current = pageKey;
    if (suppressed || pageKey === undefined) return;
    setFlash(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setFlash(false);
    }, PAGE_FLASH_MS);
  }, [pageKey, suppressed]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return flash;
}
