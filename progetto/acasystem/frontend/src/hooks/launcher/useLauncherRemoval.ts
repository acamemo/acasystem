/** Flusso applicativo di rimozione, ripristino, presenza e avvisi del launcher. */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { LauncherLayout } from '@/@types/launcher';
import type { WidgetController } from './useWidgetController';
import type { LauncherSelection, WidgetRef } from './useLauncherSelection';
import { afterNextFrame } from '@/utils/launcher/afterFrame';
import { TWO_FRAMES_MS, canAnimate } from '@/utils/launcher/motion';

/** The widget removed from its bar shrinks and fades first (--aca-dur-exit-sm, tokens.css). */
const WIDGET_EXIT_MS = 160;
/** A widget comes in (--aca-dur-enter-sm); put back, it waits 60 ms for the cells to give way. */
const WIDGET_ENTER_MS = 240;
const WIDGET_RESTORE_DELAY_MS = 60;
/** The pager glides to the page with room; the widget does not wait longer than this for it. */
const PAGER_GLIDE_CAP_MS = 700;
/** A widget set to come in that nothing releases is shown anyway after this long. */
const ENTERING_CAP_MS = 10000;
/** How long «Annulla» stays after a removal (Launcher3 uses a short snackbar). */
const UNDO_MS = 5000;

interface LauncherRemovalOptions {
  controller: WidgetController;
  selection: LauncherSelection;
  widgetName: (pageId: string, widgetId: string) => string;
  rememberRemovedWidget: (pageId: string, widgetId: string, name: string) => void;
  announce: (message: string) => void;
  reducedMotion: boolean;
  pagerRef: RefObject<HTMLDivElement | null>;
  removeWithUndoRef: RefObject<(pageId: string, widgetId: string) => void>;
  lockedNotice: RefObject<() => void>;
  editMode: boolean;
  setEditMode: (enabled: boolean) => void;
  currentPageId: string | null;
}

export function useLauncherRemoval({
  controller,
  selection,
  widgetName,
  rememberRemovedWidget,
  announce,
  reducedMotion,
  pagerRef,
  removeWithUndoRef,
  lockedNotice,
  editMode,
  setEditMode,
  currentPageId,
}: LauncherRemovalOptions) {
  const removeWidget = useCallback(
    (pageId: string, widgetId: string) => {
      // The configuration stays in memory for the widget's device (ADR-0019); «Annulla» is
      // unaffected: the settings are not touched by the removal.
      rememberRemovedWidget(pageId, widgetId, widgetName(pageId, widgetId));
      controller.removeWidget(pageId, widgetId);
      selection.setSelected((current) => (current?.widgetId === widgetId ? null : current));
      // The widget leaves with its selection and edit mode ends: a focus lost with it goes to
      // «Modifica la disposizione», the command with no face that comes back. The frame after
      // the next one (ISSUE-109, R7), as after «Fine».
      afterNextFrame(() => {
        const active = document.activeElement;
        if (active && active !== document.body) return;
        document.querySelector<HTMLElement>('[data-launcher-edit]')?.focus();
      });
    },
    [controller, selection, rememberRemovedWidget, widgetName]
  );

  // ── Removal as on Android: at once, then «Annulla» for a few seconds (REP-20261007-031) ──
  /**
   * A change to undo (`layout` set; `undone` read aloud once undone, a removal by default), or a
   * notice that only informs (the lock, why an action cannot be taken).
   */
  const [undo, setUndo] = useState<{
    message: string;
    layout?: LauncherLayout;
    undone?: string;
    /** The widget the removal took away: «Annulla» brings it back in (D-M10). */
    restored?: WidgetRef;
    /** The page a widget went to when the one asked for was full: «Vai lì» opens it. */
    goTo?: string;
  } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    []
  );
  const removeWithUndo = useCallback(
    (pageId: string, widgetId: string) => {
      const before = controller.layout;
      const name = widgetName(pageId, widgetId);
      removeWidget(pageId, widgetId);
      setUndo({ message: `${name} rimosso`, layout: before, restored: { pageId, widgetId } });
      announce(`${name} rimosso dalla pagina. Annulla per rimetterlo.`);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
    },
    [controller.layout, widgetName, removeWidget, announce]
  );
  removeWithUndoRef.current = removeWithUndo;

  // ── Widgets that leave and come in (REP-20261023-006, D-M10, D-M11, D-M22) ──
  /** Timers of the scenes below, cleared with the screen. */
  const sceneTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = sceneTimers.current;
    return () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
  }, []);
  const later = useCallback((callback: () => void, ms: number) => {
    const timers = sceneTimers.current;
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, ms);
    timers.add(timer);
  }, []);
  /** Where the browser animates and the person did not ask for less motion. */
  const moves = !reducedMotion && canAnimate();
  /**
   * Removal from the bar or the keyboard: the widget shrinks to 0.92 and fades out in 160 ms
   * (its ring and dots with it), and only then is the removal committed, so the pill and the free
   * cells follow an exit that has been seen. Without animation it goes at once, as before.
   */
  const leaving = useRef(false);
  const removeLeaving = useCallback(
    (pageId: string, widgetId: string) => {
      if (!moves) {
        removeWithUndoRef.current(pageId, widgetId);
        return;
      }
      if (leaving.current) return;
      leaving.current = true;
      selection.setExiting({ pageId, widgetId });
      later(() => {
        leaving.current = false;
        selection.setExiting(null);
        removeWithUndoRef.current(pageId, widgetId);
      }, WIDGET_EXIT_MS + TWO_FRAMES_MS);
    },
    [moves, selection, later, removeWithUndoRef]
  );
  /**
   * A widget that is mounted at the look it comes from (see-through, a little smaller) and takes
   * its own when `goEntering` runs: put back by «Annulla» or just added from the add sheet.
   */
  const beginEntering = useCallback(
    (ref: WidgetRef, mode: 'added' | 'restored') => {
      if (!moves) return false;
      const marker = { ...ref, mode, go: false };
      selection.setEntering(marker);
      // Nothing may keep a widget invisible for ever: shown anyway if it was never released.
      later(() => {
        if (selection.entering() === marker) selection.setEntering(null);
      }, ENTERING_CAP_MS);
      return true;
    },
    [moves, selection, later]
  );
  /** Runs `done` when the pager has stopped gliding (`scrollend`), or after a cap if it never says. */
  const afterGlide = useCallback(
    (done: () => void) => {
      const pager = pagerRef.current;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        pager?.removeEventListener('scrollend', finish);
        done();
      };
      pager?.addEventListener('scrollend', finish, { once: true });
      later(finish, PAGER_GLIDE_CAP_MS);
    },
    [later, pagerRef]
  );
  const goEntering = useCallback(() => {
    const now = selection.entering();
    if (!now || now.go) return;
    const going = { ...now, go: true };
    selection.setEntering(going);
    later(
      () => {
        if (selection.entering() === going) selection.setEntering(null);
      },
      WIDGET_ENTER_MS + (now.mode === 'restored' ? WIDGET_RESTORE_DELAY_MS : 0) + TWO_FRAMES_MS
    );
  }, [selection, later]);
  lockedNotice.current = () => {
    notify('Disposizione bloccata: sbloccala in Sistema → Schermata Home.');
    announce('Disposizione bloccata. Si sblocca in Sistema, Schermata Home.');
  };
  // Locked from Sistema while editing: edit mode ends.
  useEffect(() => {
    if (controller.layout.locked && editMode) setEditMode(false);
  }, [controller.layout.locked, editMode, setEditMode]);
  /** A short notice in the same pill, without «Annulla». */
  const notify = useCallback((message: string, goTo?: string) => {
    setUndo(goTo ? { message, goTo } : { message });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  }, []);
  const undoRemoval = useCallback(() => {
    if (!undo?.layout) return;
    // Put back, the widget comes in from the look it left with (D-M10), two frames after the commit.
    if (undo.restored && beginEntering(undo.restored, 'restored')) afterNextFrame(goEntering);
    controller.restoreLayout(undo.layout);
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    announce(undo.undone ?? 'Widget rimesso al suo posto.');
  }, [undo, controller, announce, beginEntering, goEntering]);

  /** «Vai lì» only while the view is not already on the page the widget went to. */
  const offerGo = Boolean(undo?.goTo) && undo?.goTo !== currentPageId;
  /** «Vai lì» of the notice that says where a widget went: opens that page. */
  const goToNoticePage = useCallback(() => {
    const page = undo?.goTo;
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (page) controller.goToPageId(page);
  }, [undo, controller]);


  /** La stessa pillola conserva anche il ripristino di una modifica alle colonne. */
  const offerLayoutUndo = (change: NonNullable<typeof undo>) => {
    setUndo(change);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  return {
    removeWidget,
    undo,
    removeLeaving,
    moves,
    beginEntering,
    afterGlide,
    goEntering,
    later,
    notify,
    undoRemoval,
    offerGo,
    goToNoticePage,
    offerLayoutUndo,
  };
}
