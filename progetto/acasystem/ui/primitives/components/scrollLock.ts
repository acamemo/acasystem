import { useEffect } from 'react';

/*
 * Page scroll lock shared by the primitive dialogs (DialogShell, Sheet).
 * It works on <html>, so it composes with the legacy shell that locks <body>:
 * the page scrolls again only when every owner has released its lock.
 */
let locks = 0;
let previousOverflow = '';

export function lockScroll() {
  const root = document.documentElement;
  if (locks++ === 0) {
    previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) root.style.overflow = previousOverflow;
  };
}

/** Locks the page scroll while active is true. */
export function useScrollLock(active: boolean) {
  useEffect(() => (active ? lockScroll() : undefined), [active]);
}
