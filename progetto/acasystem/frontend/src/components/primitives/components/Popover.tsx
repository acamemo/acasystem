import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { MaterialLayers, materialClass } from './Material';

export type PopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/** Props to spread on the trigger button. */
export interface PopoverTriggerProps {
  ref: (node: HTMLElement | null) => void;
  'aria-controls': string;
  'aria-expanded': boolean;
  popoverTarget?: string;
  onClick?: () => void;
}

export type PopoverProps = Omit<ComponentPropsWithRef<'div'>, 'children' | 'popover'> & {
  /** Renders the trigger; spread the given props on a button (e.g. Button or SelectTrigger). */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  /** Accessible name of the panel. */
  label: string;
  placement?: PopoverPlacement;
  /** Classes for the content layer of the panel; className stays on the panel socket. */
  contentClassName?: string;
  onOpenChange?: (open: boolean) => void;
  /** Content, or a function receiving close() for menus that shut after a choice. */
  children: ReactNode | ((close: () => void) => ReactNode);
};

const GAP = 8;
const MARGIN = 8;

const supportsPopover = () =>
  typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

type ToggleLike = Event & { newState?: string };

/**
 * Non-modal panel on the native popover API: top layer (never clipped by overflow), light
 * dismiss, Escape and focus return handled by the browser. Placed under or over its trigger
 * and kept inside the viewport. Engines without the API get a hidden/visible fallback.
 */
export function Popover({
  trigger,
  label,
  placement = 'bottom-start',
  contentClassName,
  onOpenChange,
  className,
  role = 'dialog',
  children,
  ...props
}: PopoverProps) {
  const id = `popover-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [native] = useState(supportsPopover);
  const [open, setOpen] = useState(false);
  /** Native panel fading out: its content stays until the transition ends, then unmounts. */
  const [closing, setClosing] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const autofocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const setTriggerRef = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const place = useCallback(() => {
    const anchor = triggerRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const box = anchor.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = window.innerHeight;
    const [side, align] = placement.split('-');
    const below = box.bottom + GAP;
    const above = box.top - GAP - height;
    let top = side === 'top' ? above : below;
    if (side === 'bottom' && below + height > viewportHeight - MARGIN && above >= MARGIN)
      top = above;
    if (side === 'top' && above < MARGIN && below + height <= viewportHeight - MARGIN) top = below;
    const start = align === 'end' ? box.right - width : box.left;
    const left = Math.min(
      Math.max(MARGIN, start),
      Math.max(MARGIN, viewportWidth - width - MARGIN)
    );
    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(left)}px`;
  }, [placement]);

  const update = useCallback((next: boolean) => {
    setOpen(next);
    onOpenChangeRef.current?.(next);
  }, []);

  // Native: follow the browser and mount content before measuring the open panel.
  useEffect(() => {
    const panel = panelRef.current;
    if (!native || !panel) return undefined;
    const onBeforeToggle = (event: Event) => {
      if ((event as ToggleLike).newState === 'open') setOpen(true);
    };
    const onToggle = (event: Event) => {
      const next = (event as ToggleLike).newState === 'open';
      setClosing(!next);
      if (!next) {
        const fading = typeof panel.getAnimations === 'function' ? panel.getAnimations() : [];
        void Promise.allSettled(fading.map((animation) => animation.finished)).then(() =>
          setClosing(false)
        );
      }
      update(next);
    };
    panel.addEventListener('beforetoggle', onBeforeToggle);
    panel.addEventListener('toggle', onToggle);
    return () => {
      panel.removeEventListener('beforetoggle', onBeforeToggle);
      panel.removeEventListener('toggle', onToggle);
    };
  }, [native, place, update]);

  // Lazy content is measured after mounting, before the next paint. Confirmations can
  // request focus explicitly without resetting it on each render of the open menu.
  useLayoutEffect(() => {
    if (!open) {
      autofocusRef.current = null;
      return;
    }
    place();
    const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
    if (target && target !== autofocusRef.current) target.focus();
    autofocusRef.current = target ?? null;
  }, [open, children, place]);

  // While open: measure, flip if needed and follow resize and scroll.
  useEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  // Fallback: Escape and a press outside close the panel.
  useEffect(() => {
    if (native || !open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      update(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      update(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [native, open, update]);

  const close = useCallback(() => {
    const panel = panelRef.current;
    if (native && panel) {
      try {
        panel.hidePopover();
      } catch {
        // Already closed.
      }
    } else {
      update(false);
    }
    triggerRef.current?.focus();
  }, [native, update]);

  const triggerProps: PopoverTriggerProps = native
    ? { ref: setTriggerRef, 'aria-controls': id, 'aria-expanded': open, popoverTarget: id }
    : {
        ref: setTriggerRef,
        'aria-controls': id,
        'aria-expanded': open,
        onClick: () => update(!open),
      };

  return (
    <>
      {trigger(triggerProps)}
      <div
        ref={panelRef}
        id={id}
        popover={native ? 'auto' : undefined}
        hidden={native ? undefined : !open}
        role={role}
        aria-label={label}
        className="aca-popover"
        {...props}
      >
        <div
          className={materialClass(
            { behavior: 'static', shape: 'card' },
            'aca-popover__panel',
            className
          )}
        >
          <MaterialLayers element="div" contentClassName={contentClassName}>
            {(open || closing) && (typeof children === 'function' ? children(close) : children)}
          </MaterialLayers>
        </div>
      </div>
    </>
  );
}
