import { useEffect, useState } from 'react';
import { TWO_FRAMES_MS, canAnimate } from '@/utils/launcher/motion';

/**
 * Elements that leave with an animation (REP-20261023-006, D-M14): a notice, a toast. When the
 * state says they are gone they stay mounted for the time of their exit, marked as leaving, and
 * are released at the end (a cap of the exit plus two frames, P1). Where nothing animates (jsdom,
 * `canAnimate`) they go at once, as before.
 */

/** A «+» cell that goes stays for its exit (--aca-dur-cell, tokens.css). */
export const CELL_EXIT_MS = 160;

/** A single element: `mounted` while it is visible or leaving, `leaving` for the exit only. */
export function useExitPresence(visible: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(visible);
  const [seen, setSeen] = useState(visible);
  if (seen !== visible) {
    setSeen(visible);
    if (visible) setMounted(true);
    else if (!canAnimate()) setMounted(false);
  }
  useEffect(() => {
    if (visible || !mounted) return undefined;
    const timer = setTimeout(() => setMounted(false), exitMs + TWO_FRAMES_MS);
    return () => clearTimeout(timer);
  }, [visible, mounted, exitMs]);
  return { mounted: visible || mounted, leaving: !visible && mounted };
}

export interface LeavingEntry<T> {
  item: T;
  leaving: boolean;
  /** Came after the first render of the list (not one of the items it began with). */
  entering: boolean;
}

/**
 * A list: the items that disappear from `items` stay in their place, marked as leaving, for
 * `exitMs` and a cap of two frames, then go. New items are added at the end, in order, marked as
 * entering (where the browser animates) unless they were there at the first render: a list drawn
 * for the first time does not animate its items (REP-20261023-006, D-M6).
 */
export function useLeavingItems<T extends { id: string | number }>(
  items: readonly T[],
  exitMs: number
): LeavingEntry<T>[] {
  const key = items.map((item) => item.id).join('|');
  const [seen, setSeen] = useState(key);
  const [entries, setEntries] = useState<LeavingEntry<T>[]>(() =>
    items.map((item) => ({ item, leaving: false, entering: false }))
  );
  if (seen !== key) {
    setSeen(key);
    const ids = new Set(items.map((item) => item.id));
    const kept = canAnimate()
      ? entries.map((entry) =>
          ids.has(entry.item.id)
            ? {
                item: items.find((item) => item.id === entry.item.id) ?? entry.item,
                leaving: false,
                entering: entry.entering,
              }
            : { ...entry, leaving: true }
        )
      : entries.filter((entry) => ids.has(entry.item.id));
    const known = new Set(kept.map((entry) => entry.item.id));
    setEntries([
      ...kept,
      ...items
        .filter((item) => !known.has(item.id))
        .map((item) => ({ item, leaving: false, entering: canAnimate() })),
    ]);
  }
  const anyLeaving = entries.some((entry) => entry.leaving);
  useEffect(() => {
    if (!anyLeaving) return undefined;
    const timer = setTimeout(
      () => setEntries((current) => current.filter((entry) => !entry.leaving)),
      exitMs + TWO_FRAMES_MS
    );
    return () => clearTimeout(timer);
  }, [anyLeaving, entries, exitMs]);
  return entries;
}
