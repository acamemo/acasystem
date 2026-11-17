import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type { BottomDrawerInteraction } from '@/components/primitives';

interface Options {
  active: boolean;
  onOpen: () => boolean;
  commandSelector: string;
  interaction: RefObject<BottomDrawerInteraction | null>;
  onIntent?: () => void;
}
interface Gesture {
  source: 'pointer' | 'touch'; id: number; pointerId: number | null; pointerType: string;
  x: number; y: number; intent: boolean; attempted: boolean;
}

/** A reserved vertical intent reveals the prepared catalog; the drawer owns its entry motion. */
export function useHomeCatalogScroll(home: RefObject<HTMLElement | null>, options: Options) {
  const latest = useRef(options); latest.current = options;
  const cancelInput = useRef<(() => void) | null>(null);
  useEffect(() => {
    const root = home.current;
    if (!root) return undefined;
    let gesture: Gesture | null = null;
    let wheelAmount = 0, wheelLast = 0, wheelAttempted = false, wheelIntent = false;
    let compatibility: { id: number | null; x: number; y: number; at: number } | null = null;
    const passiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element) || !root.contains(target)) return false;
      const command = target.closest(latest.current.commandSelector);
      if (command && !command.matches('[data-widget-open], .aca-category-widget__tap, .aca-launcher-widget__handle, [data-launcher-cell], [data-casa-opener]')) return false;
      if (target.closest('[contenteditable="true"]')) return false;
      for (let node: Element | null = target; node && node !== root; node = node.parentElement) {
        if (node.classList.contains('aca-pager')) continue;
        const style = getComputedStyle(node);
        if ((/auto|scroll/.test(style.overflowY || style.overflow) && node.scrollHeight > node.clientHeight + 1)
          || (/auto|scroll/.test(style.overflowX || style.overflow) && node.scrollWidth > node.clientWidth + 1)) return false;
      }
      return true;
    };
    const suppress = (id: number | null, x: number, y: number) => {
      compatibility = { id, x, y, at: performance.now() };
    };
    const cancelWheel = () => {
      wheelAmount = 0; wheelAttempted = false; wheelIntent = false;
    };
    const finish = (_cancelled: boolean, x?: number, y?: number) => {
      const current = gesture; gesture = null;
      if (!current) return;
      if (compatibility?.id === current.pointerId && x !== undefined && y !== undefined) suppress(current.pointerId, x, y);
    };
    const advance = (x: number, y: number, event: Event) => {
      const current = gesture;
      if (!current) return;
      if (!latest.current.active) { finish(true, x, y); return; }
      const dx = Math.abs(x - current.x), dy = current.y - y;
      if (!current.intent) {
        if (dx > 12 && dx > Math.abs(dy) * 1.2 || dy < -8) { gesture = null; return; }
        if (dy < 8 || dy < dx * 1.25) return;
        current.intent = true;
        latest.current.onIntent?.();
      }
      if (dy < dx * 1.25) return;
      suppress(current.pointerId, x, y);
      if (!latest.current.interaction.current?.ready) { current.attempted = true; return; }
      if (!current.attempted && dy >= 24) {
        current.attempted = true;
        latest.current.onOpen();
      }
      // Reserve only prepared vertical input. No position is painted before the entry starts.
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
    };
    const wheel = (event: WheelEvent) => {
      if (!latest.current.active || event.ctrlKey || event.shiftKey || !passiveTarget(event.target)) return;
      if (gesture?.source === 'pointer' && gesture.pointerType === 'mouse' && !gesture.intent && event.buttons === 0) finish(true);
      if (gesture) return;
      const now = performance.now();
      if (now - wheelLast > 240) cancelWheel();
      wheelLast = now;
      if (event.deltaY <= 0 || event.deltaY < Math.abs(event.deltaX) * 1.2) { wheelAmount = 0; return; }
      if (wheelAttempted) return;
      const owner = latest.current.interaction.current;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? owner?.height || window.innerHeight : 1;
      wheelAmount += event.deltaY * unit;
      if (wheelAmount >= 8 && !wheelIntent) { wheelIntent = true; latest.current.onIntent?.(); }
      if (wheelAmount < 24) return;
      wheelAttempted = true;
      if (owner?.ready && latest.current.onOpen()) { event.preventDefault(); event.stopPropagation(); }
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) { finish(true); cancelWheel(); return; }
      if (event.button !== 0 || !latest.current.active || !passiveTarget(event.target)) return;
      finish(true); cancelWheel();
      gesture = { source: 'pointer', id: event.pointerId, pointerId: event.pointerId, pointerType: event.pointerType,
        x: event.clientX, y: event.clientY, intent: false, attempted: false };
    };
    const move = (event: PointerEvent) => {
      if (gesture?.source !== 'pointer' || event.pointerId !== gesture.id) return;
      advance(event.clientX, event.clientY, event);
    };
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) { finish(true); return; }
      if (!latest.current.active || !passiveTarget(event.target)) return;
      const point = event.touches[0], previous = gesture;
      if (previous?.source === 'touch') return;
      cancelWheel();
      gesture = { source: 'touch', id: point.identifier, pointerId: previous?.pointerId ?? null, pointerType: 'touch',
        x: previous?.x ?? point.clientX, y: previous?.y ?? point.clientY,
        intent: previous?.intent ?? false, attempted: previous?.attempted ?? false };
    };
    const touchMove = (event: TouchEvent) => {
      if (gesture?.source !== 'touch') return;
      if (event.touches.length !== 1) { finish(true); return; }
      const point = Array.from(event.touches).find((item) => item.identifier === gesture?.id);
      if (point) advance(point.clientX, point.clientY, event);
    };
    const touchEnd = (event: TouchEvent) => {
      if (gesture?.source !== 'touch') return;
      const point = Array.from(event.changedTouches).find((item) => item.identifier === gesture?.id);
      if (!point) return;
      const claimed = gesture.intent;
      finish(event.type === 'touchcancel', point.clientX, point.clientY);
      if (claimed && event.cancelable) event.preventDefault();
    };
    const up = (event: PointerEvent) => {
      if (gesture?.source === 'pointer' && gesture.id === event.pointerId) {
        const claimed = gesture.intent;
        finish(event.type === 'pointercancel', event.clientX, event.clientY);
        if (claimed && event.cancelable) event.preventDefault();
      } else if (compatibility?.id === event.pointerId) suppress(event.pointerId, event.clientX, event.clientY);
    };
    const click = (event: MouseEvent) => {
      const pending = compatibility;
      if (!pending) return;
      compatibility = null;
      if (!event.detail || performance.now() - pending.at > 700) return;
      const same = pending.id !== null && 'pointerId' in event ? event.pointerId === pending.id
        : Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < 32;
      if (same) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const newPointer = (event: PointerEvent) => {
      compatibility = null;
      if (!event.isPrimary) { finish(true); cancelWheel(); }
    };
    const cancel = () => { finish(true); cancelWheel(); };
    cancelInput.current = cancel;
    const hidden = () => { if (document.hidden) cancel(); };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gesture?.intent) { cancel(); event.preventDefault(); return; }
      if (event.key !== 'PageDown' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || !latest.current.active) return;
      if (event.target !== document.body && event.target !== document.documentElement && !passiveTarget(event.target)) return;
      cancel();
      if (latest.current.onOpen()) { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener('wheel', wheel, { passive: false, capture: true });
    root.addEventListener('pointerdown', down, true);
    document.addEventListener('pointermove', move, { passive: false, capture: true });
    root.addEventListener('touchstart', touchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', touchMove, { passive: false, capture: true });
    document.addEventListener('touchend', touchEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', touchEnd, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
    document.addEventListener('pointerdown', newPointer, true);
    document.addEventListener('click', click, true);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', key);
    return () => {
      cancel(); compatibility = null;
      if (cancelInput.current === cancel) cancelInput.current = null;
      document.removeEventListener('wheel', wheel, true);
      root.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointermove', move, true);
      root.removeEventListener('touchstart', touchStart, true);
      document.removeEventListener('touchmove', touchMove, true);
      document.removeEventListener('touchend', touchEnd, true);
      document.removeEventListener('touchcancel', touchEnd, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
      document.removeEventListener('pointerdown', newPointer, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', key);
    };
  }, [home]);
  useLayoutEffect(() => { if (!options.active) cancelInput.current?.(); }, [options.active]);
}
