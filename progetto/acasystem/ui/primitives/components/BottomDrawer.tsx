import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject, type TransitionEvent } from 'react';
import { createPortal } from 'react-dom';
import { DialogShell } from './DialogShell';
import { PanelPresence } from './PanelPresence';
import { Heading } from '../typography/Heading';
import { prefersReducedMotion } from '../motion';
import { SHEET_IN_MS, SHEET_OUT_MS } from './Sheet';

export interface BottomDrawerInteraction {
  readonly ready: boolean;
  readonly progress: number;
  readonly height: number;
  begin(): boolean;
  update(progress: number): void;
  finish(velocityY: number, cancelled?: boolean): void;
  cancel(): void;
}

export interface BottomDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Retain the accessible title without reserving visual header space. */
  headerHidden?: boolean;
  /** Reveal autonomously after an intentional swipe, retaining drag for existing consumers. */
  gestureMode?: 'drag' | 'reveal';
  children: ReactNode;
  footer?: ReactNode;
  /** Actual committed panel presence; the desired open state alone is not a loaded window. */
  onOpenChange?: (open: boolean) => void;
  interactionRef?: RefObject<BottomDrawerInteraction | null>;
  interactionReady?: boolean;
  onRequestOpen?: () => boolean;
  onProgress?: (progress: number | null, immediate: boolean) => void;
}

interface Drag {
  pointer: number; pointerType: string; startX: number; startY: number; from: number; height: number; moved: boolean;
  y: number; triggered?: boolean; samples: { y: number; at: number }[];
}
const HISTORY_KEY = 'acaBottomDrawer';
let sequence = 0;

/** A full-screen drawer: passive swipe surfaces dismiss downward; forms retain native scrolling. */
export function BottomDrawer({ open, onClose, title, children, footer, onOpenChange, headerHidden = false,
  interactionRef, interactionReady = true, onRequestOpen, onProgress, gestureMode = 'drag' }: BottomDrawerProps) {
  const panel = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef<number | null>(null);
  const visualSettle = useRef<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [modal, setModal] = useState(open);
  const tracking = useRef(false);
  const position = useRef(open ? 1 : 0);
  const origin = useRef(position.current);
  const completion = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const interaction = useRef<BottomDrawerInteraction | null>(null);
  const wheelEnd = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const revealWheel = useRef({ distance: 0, at: 0, attempted: false });
  const latest = useRef({ open, onClose, interactionReady, onRequestOpen, onProgress, gestureMode });
  latest.current = { open, onClose, interactionReady, onRequestOpen, onProgress, gestureMode };
  useLayoutEffect(() => {
    onOpenChange?.(open && panel.current?.isConnected === true);
    return () => onOpenChange?.(false);
  }, [open, onOpenChange]);
  const historyToken = useRef<string | null>(null);
  const pendingBack = useRef<string | null>(null);
  const ownsHistory = useCallback(() => historyToken.current !== null
    && window.history.state?.[HISTORY_KEY] === historyToken.current, []);
  const close = useCallback(() => {
    if (ownsHistory()) {
      if (pendingBack.current === historyToken.current) return;
      pendingBack.current = historyToken.current;
      window.history.back();
    } else latest.current.onClose();
  }, [ownsHistory]);

  const height = () => panel.current?.getBoundingClientRect().height || window.innerHeight;
  const progress = () => {
    const transform = panel.current && getComputedStyle(panel.current).transform;
    if (!transform || transform === 'none') return position.current;
    const values = transform.slice(transform.indexOf('(') + 1, -1).split(',').map(Number);
    const offset = transform.startsWith('matrix') ? values.length === 16 ? values[13] : values[5]
      : transform.startsWith('translateY') ? parseFloat(transform.slice(11)) * (transform.includes('%') ? height() / 100 : 1) : NaN;
    return Number.isFinite(offset) ? Math.max(0, Math.min(1, 1 - offset / height())) : position.current;
  };
  const complete = () => {
    clearTimeout(completion.current);
    if (tracking.current) return;
    setPreview(false);
    if (!latest.current.open) setModal(false);
    latest.current.onProgress?.(null, false);
  };


  // A visual phase only: glass pages sample the fixed scene while the drawer moves.
  const settleVertical = useCallback(() => {
    if (visualSettle.current !== null) cancelAnimationFrame(visualSettle.current);
    const node = panel.current;
    if (!node) return;
    if (drag.current?.moved || tracking.current) return;
    if (prefersReducedMotion()) { node.removeAttribute('data-drawer-moving'); return; }
    visualSettle.current = requestAnimationFrame(() => {
      visualSettle.current = null;
      if (!node.isConnected || drag.current?.moved || tracking.current) return;
      const moving = typeof node.getAnimations === 'function'
        ? node.getAnimations().some((animation) => 'transitionProperty' in animation && animation.transitionProperty === 'transform')
        : !['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(node).transform);
      if (!moving) node.removeAttribute('data-drawer-moving');
    });
  }, []);

  useEffect(() => {
    const node = panel.current;
    if (!open || !node?.querySelector('[data-drawer-swipe]')) {
      clearTimeout(wheelEnd.current);
      revealWheel.current = { distance: 0, at: 0, attempted: false };
      return undefined;
    }
    const wheel = (event: WheelEvent) => {
      if (!latest.current.open || event.ctrlKey || event.shiftKey
        || !(event.target instanceof Element)) return;
      const catalog = node.querySelector('[data-drawer-swipe]');
      if (!catalog || !node.contains(event.target)
        || event.target.closest('input, select, textarea, a, [role="slider"], [role="switch"], [role="checkbox"], [role="spinbutton"], [data-widget-command], [contenteditable="true"]')) return;
      const button = event.target.closest('button, [role="button"]');
      if (button && !catalog.contains(button)) return;
      for (let target: Element | null = event.target; target && target !== node; target = target.parentElement) {
        const style = getComputedStyle(target);
        if (/auto|scroll/.test(style.overflowY || style.overflow) && target.scrollHeight > target.clientHeight + 1) return;
      }
      const candidate = drag.current;
      if (candidate?.pointerType === 'mouse' && !candidate.moved && event.buttons === 0) drag.current = null;
      if (drag.current) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX) * 1.2 || !event.deltaY) return;
      if (latest.current.gestureMode === 'reveal') {
        const burst = revealWheel.current, now = performance.now();
        if (burst.attempted) { event.preventDefault(); event.stopPropagation(); return; }
        if (event.deltaY > 0) { burst.distance = 0; return; }
        if (now - burst.at > 240) burst.distance = 0;
        burst.at = now;
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight || window.innerHeight : 1;
        burst.distance += -event.deltaY * unit;
        event.preventDefault(); event.stopPropagation();
        if (burst.distance >= 24) { burst.attempted = true; close(); }
        return;
      }
      if (!tracking.current && (event.deltaY > 0 || !interaction.current?.begin())) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight || window.innerHeight : 1;
      interaction.current?.update(position.current + event.deltaY * unit / height());
      clearTimeout(wheelEnd.current);
      wheelEnd.current = setTimeout(() => interaction.current?.finish(0), 240);
      event.preventDefault(); event.stopPropagation();
    };
    node.addEventListener('wheel', wheel, { passive: false, capture: true });
    return () => node.removeEventListener('wheel', wheel, true);
  }, [open, children, close, gestureMode]);

  useEffect(() => {
    if (!open) return undefined;
    if (!ownsHistory()) {
      historyToken.current = `bottom-drawer-${++sequence}`;
      window.history.pushState({ ...window.history.state, [HISTORY_KEY]: historyToken.current }, '');
    }
    const back = () => {
      if (!ownsHistory()) { pendingBack.current = null; latest.current.onClose(); }
    };
    window.addEventListener('popstate', back);
    return () => {
      window.removeEventListener('popstate', back);
      setTimeout(() => {
        if (mounted.current && latest.current.open) return;
        if (ownsHistory() && pendingBack.current !== historyToken.current) {
          pendingBack.current = historyToken.current;
          window.history.back();
        }
        historyToken.current = null;
      }, 0);
    };
  }, [open, ownsHistory]);

  const paint = useCallback((offset: number) => {
    const node = panel.current;
    if (!node) return;
    offset = Math.round(offset * 1000) / 1000;
    node.setAttribute('data-drawer-moving', '');
    node.style.transition = 'none';
    node.style.transform = `translateY(${offset}px)`;
    if (scene.current) {
      scene.current.style.transition = 'none';
      scene.current.style.clipPath = `inset(${offset}px 0 0 0)`;
    }
  }, []);
  if (!interaction.current) interaction.current = {
    get ready() { return latest.current.interactionReady && panel.current?.isConnected === true
      && panel.current.getBoundingClientRect().height > 0; },
    get progress() { return progress(); },
    get height() { return height(); },
    begin() {
      if (!this.ready) return false;
      clearTimeout(completion.current); clearTimeout(wheelEnd.current);
      origin.current = this.progress; position.current = origin.current; tracking.current = true;
      setPreview(true); paint((1 - position.current) * height());
      latest.current.onProgress?.(position.current, true);
      return true;
    },
    update(value) {
      if (!tracking.current) return;
      position.current = Math.max(0, Math.min(1, value));
      paint((1 - position.current) * height());
      latest.current.onProgress?.(position.current, true);
    },
    finish(velocityY, cancelled = false) {
      if (!tracking.current) return;
      tracking.current = false;
      const distance = (position.current - origin.current) * height();
      let show = cancelled ? latest.current.open : Math.abs(distance) >= 56 ? distance > 0
        : Math.abs(distance) >= 24 && Math.abs(velocityY) >= 0.5 ? velocityY < 0 : latest.current.open;
      if (show && !latest.current.open && !latest.current.onRequestOpen?.()) show = false;
      position.current = show ? 1 : 0;
      if (panel.current) { panel.current.style.transition = ''; panel.current.style.transitionDuration = (prefersReducedMotion() ? 0 : show ? SHEET_IN_MS : SHEET_OUT_MS) + 'ms'; panel.current.style.transform = show ? '' : 'translateY(100%)'; }
      if (scene.current) { scene.current.style.transition = ''; scene.current.style.transitionDuration = (prefersReducedMotion() ? 0 : show ? SHEET_IN_MS : SHEET_OUT_MS) + 'ms'; scene.current.style.clipPath = show ? '' : 'inset(100% 0 0 0)'; }
      latest.current.onProgress?.(position.current, false);
      if (!show && latest.current.open) close();
      completion.current = setTimeout(complete, prefersReducedMotion() ? 0 : show ? SHEET_IN_MS : SHEET_OUT_MS);
      settleVertical();
    },
    cancel() { this.finish(0, true); },
  };
  useLayoutEffect(() => {
    if (interactionRef) interactionRef.current = interaction.current;
    return () => { if (interactionRef) interactionRef.current = null; };
  }, [interactionRef]);
  useLayoutEffect(() => {
    if (open) setModal(true);
    if (tracking.current || gestureMode === 'drag' && drag.current?.moved) paint((1 - position.current) * height());
    else if (panel.current) {
      if (interactionRef && modal) panel.current.setAttribute('data-drawer-moving', '');
      panel.current.style.transition = '';
      panel.current.style.transitionDuration = interactionRef ? (prefersReducedMotion() ? 0 : open ? SHEET_IN_MS : SHEET_OUT_MS) + 'ms' : '';
      panel.current.style.transform = interactionRef && !open ? 'translateY(100%)' : '';
      position.current = open ? 1 : 0;
      if (scene.current) { scene.current.style.transition = ''; scene.current.style.transitionDuration = interactionRef ? (prefersReducedMotion() ? 0 : open ? SHEET_IN_MS : SHEET_OUT_MS) + 'ms' : ''; scene.current.style.clipPath = gestureMode === 'reveal' ? '' : interactionRef && !open ? 'inset(100% 0 0 0)' : ''; }
    }
    if (!open) drag.current = null;
    else if (panel.current) {
      panel.current.setAttribute('data-drawer-moving', '');
      settleVertical();
    }
    if (!open && modal) completion.current = setTimeout(complete, prefersReducedMotion() ? 0 : SHEET_OUT_MS);
  }, [open, interactionRef, paint, settleVertical, gestureMode]);
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false; drag.current = null;
    clearTimeout(completion.current); clearTimeout(wheelEnd.current);
    latest.current.onProgress?.(null, true);
    if (visualSettle.current !== null) cancelAnimationFrame(visualSettle.current);
  }; }, []);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const pointer = suppressClick.current;
      if (pointer === null) return;
      suppressClick.current = null;
      if (event.detail && (!('pointerId' in event) || event.pointerId === pointer)) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    const clear = () => { suppressClick.current = null; };
    const releaseCandidate = (event: Event) => {
      const candidate = drag.current;
      if (candidate && !candidate.moved && (event.type === 'blur'
        || 'pointerId' in event && event.pointerId === candidate.pointer)) drag.current = null;
    };
    document.addEventListener('click', click, true);
    document.addEventListener('pointerdown', clear, true);
    document.addEventListener('keydown', clear, true);
    document.addEventListener('pointerup', releaseCandidate, true);
    document.addEventListener('pointercancel', releaseCandidate, true);
    window.addEventListener('blur', releaseCandidate);
    return () => {
      document.removeEventListener('click', click, true);
      document.removeEventListener('pointerdown', clear, true);
      document.removeEventListener('keydown', clear, true);
      document.removeEventListener('pointerup', releaseCandidate, true);
      document.removeEventListener('pointercancel', releaseCandidate, true);
      window.removeEventListener('blur', releaseCandidate);
    };
  }, []);
  const begin = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) {
      drag.current = null;
      interaction.current?.cancel();
      settleVertical();
      return;
    }
    if (!(latest.current.open || preview) || event.button !== 0 || !(event.target instanceof Element)) return;
    const surface = event.target.closest('[data-drawer-swipe], .aca-bottom-drawer__header');
    if ((!surface && !preview || surface && !panel.current?.contains(surface))
      || event.target.closest('input, select, textarea, a, [role="slider"], [role="switch"], [contenteditable="true"]')) return;
    const button = event.target.closest('button, [role="button"]');
    if (button && !surface?.hasAttribute('data-drawer-swipe')) return;
    for (let node: Element | null = event.target; node && node !== surface; node = node.parentElement) {
      if (/auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1) return;
    }
    const node = panel.current;
    if (!node) return;
    const height = gestureMode === 'reveal' ? 0 : node.getBoundingClientRect().height || window.innerHeight;
    let from = 0;
    // A settle can be grabbed again: continue from the actual painted position.
    const matrix = gestureMode === 'reveal' ? 'none' : getComputedStyle(node).transform;
    if (matrix && matrix !== 'none') {
      const values = matrix.slice(matrix.indexOf('(') + 1, -1).split(',').map(Number);
      from = values.length === 16 ? values[13] : values[5] ?? from;
    }
    drag.current = { pointer: event.pointerId, pointerType: event.pointerType, startX: event.clientX, startY: event.clientY, from, height,
      moved: false, y: from, samples: [{ y: event.clientY, at: performance.now() }] };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    const dx = Math.abs(event.clientX - state.startX), dy = event.clientY - state.startY;
    if (latest.current.gestureMode === 'reveal') {
      if (Math.hypot(dx, dy) > 8) suppressClick.current = event.pointerId;
      if (!state.moved) {
        if (dx > 8 && dx > Math.abs(dy) * 1.25 || dy < -8) { drag.current = null; return; }
        if (dy < 8 || dy < dx * 1.25) return;
        state.moved = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      event.preventDefault();
      if (dy >= 24 && !state.triggered) { state.triggered = true; close(); }
      return;
    }
    if (!state.moved) {
      if (Math.hypot(dx, dy) > 8) suppressClick.current = event.pointerId;
      if (dx > 8 && dx > Math.abs(dy) * 1.25 || dy < -8 && state.from <= 1) {
        suppressClick.current = event.pointerId; drag.current = null; return;
      }
      if (Math.abs(dy) < 8 || Math.abs(dy) < dx * 1.25) return;
      if (!interaction.current?.begin()) { drag.current = null; return; }
      state.moved = true; suppressClick.current = event.pointerId;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    state.y = Math.max(0, Math.min(state.height, state.from + dy));
    state.samples.push({ y: event.clientY, at: performance.now() });
    state.samples = state.samples.filter((sample) => performance.now() - sample.at <= 100).slice(-5);
    interaction.current?.update(1 - state.y / state.height);
  };
  const finish = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    drag.current = null;
    if (!state.moved) return;
    event.preventDefault();
    if (latest.current.gestureMode === 'reveal') { settleVertical(); return; }
    const first = state.samples[0];
    const velocity = (event.clientY - first.y) / Math.max(1, performance.now() - first.at);
    interaction.current?.finish(velocity, cancelled);
  };
  const visualTransition = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
    if (event.type === 'transitionrun') event.currentTarget.setAttribute('data-drawer-moving', '');
    if (event.type === 'transitionend' && !tracking.current) complete();
    settleVertical();
  };
  const handlers = {
    onTransitionRun: visualTransition,
    onTransitionEnd: visualTransition,
    onTransitionCancel: visualTransition,
    onPointerDownCapture: begin,
    onPointerMoveCapture: move,
    onPointerUpCapture: (event: PointerEvent<HTMLDivElement>) => finish(event),
    onPointerCancelCapture: (event: PointerEvent<HTMLDivElement>) => finish(event, true),
    onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) finish(event, true);
    },
  };
  if (typeof document === 'undefined') return null;
  return <>
    {createPortal(<PanelPresence exitMs={prefersReducedMotion() ? 0 : SHEET_OUT_MS}>
      {(open || interactionRef) && <DialogShell open active={interactionRef ? modal : undefined} onClose={close}
        overlayClassName={`aca-bottom-drawer-overlay${interactionRef && !modal ? ' aca-bottom-drawer-overlay--preview' : ''}`}
        overlayStyle={interactionRef && !open && !modal && !preview ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
        panelClassName="aca-bottom-drawer-dialog" panelStyle={interactionRef && modal && !open && !tracking.current ? { pointerEvents: 'none' } : undefined}>
        {(titleId) => <><div ref={scene} className="aca-bottom-drawer-scene" data-gesture-mode={gestureMode} aria-hidden="true"
          style={gestureMode === 'reveal' ? { opacity: open ? 1 : 0, transitionDuration: (prefersReducedMotion() ? 0 : open ? SHEET_IN_MS : SHEET_OUT_MS) + 'ms' } : undefined} />
        <div ref={panel} className="aca-bottom-drawer" data-gesture-mode={gestureMode} {...handlers}>
          {headerHidden ? (
            <Heading level={2} size="sm" className="aca-visually-hidden sr-only" id={titleId} tabIndex={-1} data-autofocus>{title}</Heading>
          ) : (
            <header className="aca-bottom-drawer__header">
              <span className="aca-bottom-drawer-grip" aria-hidden="true" />
              <Heading level={2} size="sm" id={titleId} tabIndex={-1} data-autofocus>{title}</Heading>
            </header>
          )}
          <div className="aca-bottom-drawer__body" inert={interactionRef && (!modal || !open) || undefined}>{children}</div>
          {footer && <footer className="aca-bottom-drawer__footer" inert={interactionRef && (!modal || !open) || undefined}>{footer}</footer>}
        </div></>}
      </DialogShell>}
    </PanelPresence>, document.body)}
  </>;
}
