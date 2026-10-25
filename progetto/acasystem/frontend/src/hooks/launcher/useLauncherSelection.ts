import { useSyncExternalStore } from 'react';

/** A widget with its page: the same id on another page is another widget. */
export interface WidgetRef {
  pageId: string;
  widgetId: string;
}

/**
 * A widget that comes in (REP-20261023-006, D-M10, D-M11): `added` from the add sheet (it waits
 * for the sheet to go and for its page to be on screen), `restored` by «Annulla». It is mounted at
 * the look it comes from (see-through, a little smaller) and takes its own when `go` is true.
 */
export interface WidgetEntering extends WidgetRef {
  mode: 'added' | 'restored';
  go: boolean;
}

/**
 * The volatile state of a touch in edit mode (ISSUE-109, R5a): the widget selected, the widget
 * just dropped, the widget that refused a move, the widget that is leaving and the one that is
 * coming in. It lives outside the context of the launcher (`LauncherUi`, which only carries this
 * store), so a selection, the end of a landing or the end of the error LED redraw only the grid and
 * the widget concerned, not every page. The reads are plain getters; the components read through
 * `useSelectedIn`, `useLandedIn`, `useRejected`, `useExitingIn` and `useEnteringIn`, which
 * subscribe to one answer each.
 */
export interface LauncherSelection {
  selected: () => WidgetRef | null;
  /** Takes a value or a function of the current one (evaluated at once, in order). */
  setSelected: (next: WidgetRef | null | ((current: WidgetRef | null) => WidgetRef | null)) => void;
  /** Widget just dropped by the pointer: it appears in its new cell without travelling. */
  landed: () => WidgetRef | null;
  setLanded: (next: WidgetRef | null) => void;
  /**
   * Widget dropped whose copy is still flying (K6b): committed in its cell, hidden until it lands.
   * Always the same widget as `landed`; it is set before the flight and cleared when it has landed.
   */
  airborne: () => WidgetRef | null;
  setAirborne: (next: WidgetRef | null) => void;
  /** Widget that just refused a drop or a key: its frame shows the error LED briefly. */
  rejected: () => string | null;
  setRejected: (next: string | null) => void;
  /** Widget removed from its bar: it shrinks and fades before the removal is committed. */
  exiting: () => WidgetRef | null;
  setExiting: (next: WidgetRef | null) => void;
  /** Widget just added or put back: it comes in once `go` is true. */
  entering: () => WidgetEntering | null;
  setEntering: (next: WidgetEntering | null) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createLauncherSelection(): LauncherSelection {
  let selected: WidgetRef | null = null;
  let landed: WidgetRef | null = null;
  let airborne: WidgetRef | null = null;
  let rejected: string | null = null;
  let exiting: WidgetRef | null = null;
  let entering: WidgetEntering | null = null;
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of Array.from(listeners)) listener();
  };
  return {
    selected: () => selected,
    setSelected: (next) => {
      const value = typeof next === 'function' ? next(selected) : next;
      if (Object.is(value, selected)) return;
      selected = value;
      emit();
    },
    landed: () => landed,
    setLanded: (next) => {
      if (Object.is(next, landed)) return;
      landed = next;
      emit();
    },
    airborne: () => airborne,
    setAirborne: (next) => {
      if (Object.is(next, airborne)) return;
      airborne = next;
      emit();
    },
    rejected: () => rejected,
    setRejected: (next) => {
      if (next === rejected) return;
      rejected = next;
      emit();
    },
    exiting: () => exiting,
    setExiting: (next) => {
      if (Object.is(next, exiting)) return;
      exiting = next;
      emit();
    },
    entering: () => entering,
    setEntering: (next) => {
      if (Object.is(next, entering)) return;
      entering = next;
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Id of the widget selected on this page, else null: only that grid redraws when it changes. */
export function useSelectedIn(store: LauncherSelection, pageId: string): string | null {
  return useSyncExternalStore(store.subscribe, () => {
    const current = store.selected();
    return current?.pageId === pageId ? current.widgetId : null;
  });
}

/** Id of the widget just dropped on this page, else null. */
export function useLandedIn(store: LauncherSelection, pageId: string): string | null {
  return useSyncExternalStore(store.subscribe, () => {
    const current = store.landed();
    return current?.pageId === pageId ? current.widgetId : null;
  });
}

/** Id of the widget of this page whose copy is still flying to it, else null. */
export function useAirborneIn(store: LauncherSelection, pageId: string): string | null {
  return useSyncExternalStore(store.subscribe, () => {
    const current = store.airborne();
    return current?.pageId === pageId ? current.widgetId : null;
  });
}

/** True while this widget shows the error LED: only that widget redraws when it changes. */
export function useRejected(store: LauncherSelection, widgetId: string): boolean {
  return useSyncExternalStore(store.subscribe, () => store.rejected() === widgetId);
}

/** Id of the widget of this page that is leaving, else null. */
export function useExitingIn(store: LauncherSelection, pageId: string): string | null {
  return useSyncExternalStore(store.subscribe, () => {
    const current = store.exiting();
    return current?.pageId === pageId ? current.widgetId : null;
  });
}

/** The widget of this page that is coming in, else null (the same object until it changes). */
export function useEnteringIn(store: LauncherSelection, pageId: string): WidgetEntering | null {
  return useSyncExternalStore(store.subscribe, () => {
    const current = store.entering();
    return current?.pageId === pageId ? current : null;
  });
}
