import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { Body, Icon, type IconName, type IconSize } from '@/components/primitives';
import './edit.css';

/** A finger held this long shows the tip, as the long press of Android; the release does nothing. */
export const TIP_PRESS_MS = 500;
/** The mouse resting this long on the icon shows the tip. */
export const TIP_HOVER_MS = 300;
/** A finger that moves farther than this is scrolling the page, not holding the icon. */
const TIP_SLOP_PX = 10;
/** After a hold that showed the tip, the click of the release that follows within this is held. */
const TIP_RELEASE_MS = 600;
/** A tip shown by a hold stays this long after the finger lifts, as on Android, to be read. */
export const TIP_LINGER_MS = 1500;
/** …and this much longer for each character of the reason of a blocked action, up to the cap. */
export const TIP_LINGER_PER_CHAR_MS = 50;
export const TIP_LINGER_MAX_MS = 5000;
/** The mouse leaving the icon: the tip waits this long, for the pointer to reach it (WCAG 1.4.13). */
export const TIP_LEAVE_MS = 120;
const GAP = 8;
const MARGIN = 8;
/** The pointer of the tip stays this far from its ends, clear of the rounded corners. */
const ARROW_INSET = 12;

/** Hides the tip on screen, if any: one tip at a time. */
let hideShownTip: (() => void) | null = null;

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

export type IconActionProps = Omit<ComponentPropsWithRef<'button'>, 'children' | 'title'> & {
  icon: IconName;
  iconSize?: IconSize;
  /** Accessible name. */
  label: string;
  /** What the action does, in a few words: the text of the tip. */
  tip: string;
  /** Why the action cannot be taken now: aria-disabled, the reason in the tip and on a press. */
  blocked?: string | null;
  onBlocked: (reason: string) => void;
};

/**
 * An icon without text of the page editor (REP-20261009-002, D5), with its tip: a finger held
 * for TIP_PRESS_MS shows it without taking the action at the release, the mouse resting on the
 * icon or the focus from the keyboard show it too; the pointer going away (after a moment, to let
 * it reach the tip), Esc and a scroll hide it, and the release of the hold after TIP_LINGER_MS,
 * longer with a reason to read. An action that cannot be taken stays
 * focusable with aria-disabled: a press tells why (the notice pill), the tip shows the reason
 * under what it does, and the reason is its accessible description, instead of a disabled
 * button whose tooltip a finger never reaches.
 * The look of the tip is the tooltip reference UI-010 on the accent (edit.css, --aca-tip-*).
 */
export function IconAction({
  icon,
  iconSize = 'lg',
  label,
  tip,
  blocked = null,
  onBlocked,
  onClick,
  onFocus,
  onBlur,
  className,
  ref,
  ...props
}: IconActionProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const reasonId = `motivo-${id}`;
  const tipId = `suggerimento-${id}`;
  const [shown, setShown] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The finger on the icon, until it lifts, moves away or the browser takes the gesture. */
  const press = useRef<{ id: number; x: number; y: number } | null>(null);
  /** The tip was shown by a hold: the click of the release is not a press. */
  const held = useRef(false);
  const releasedAt = useRef(0);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setShown(false);
  }, []);
  const show = () => {
    clearTimer();
    // A bar on its way out (inert) shows nothing.
    if (anchorRef.current?.closest('[inert]')) {
      setShown(false);
      return;
    }
    if (hideShownTip && hideShownTip !== hide) hideShownTip();
    hideShownTip = hide;
    setShown(true);
  };
  const later = (ms: number, then?: () => void) => {
    clearTimer();
    timer.current = setTimeout(() => {
      then?.();
      show();
    }, ms);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (hideShownTip === hide) hideShownTip = null;
    },
    [hide]
  );

  // Above the icon (the editor is at the bottom of the screen), below it when there is no room.
  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = tipRef.current;
    if (!anchor || !panel) return;
    const box = anchor.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const above = box.top - GAP - height;
    const top = above >= MARGIN ? above : box.bottom + GAP;
    const left = Math.round(
      Math.min(
        Math.max(MARGIN, box.left + box.width / 2 - width / 2),
        Math.max(MARGIN, viewportWidth - width - MARGIN)
      )
    );
    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${left}px`;
    // The pointer of the tip aims at the icon, also when the tip is pushed against the edge.
    panel.dataset.side = above >= MARGIN ? 'above' : 'below';
    const arrowX = Math.max(
      ARROW_INSET,
      Math.min(box.left + box.width / 2 - left, width - ARROW_INSET)
    );
    panel.style.setProperty('--aca-tip-arrow-x', `${Math.round(arrowX)}px`);
  }, []);
  useLayoutEffect(() => {
    if (shown) place();
  }, [shown, tip, blocked, place]);
  // The cards of the page overview glide by transform, with no scroll: a tip shown on the way
  // is placed again when the card has arrived.
  useEffect(() => {
    if (!shown) return undefined;
    const onEnd = (event: Event) => {
      if ((event as TransitionEvent).propertyName === 'translate') place();
    };
    window.addEventListener('transitionend', onEnd, true);
    return () => window.removeEventListener('transitionend', onEnd, true);
  }, [shown, place]);

  // Shown: Esc hides it (and only it: the overview stays), as a scroll or a new size do.
  useEffect(() => {
    if (!shown) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      hide();
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [shown, hide]);

  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      anchorRef.current = node;
      assignRef(ref, node);
    },
    [ref]
  );

  return (
    <button
      type="button"
      {...props}
      ref={setRef}
      className={['aca-bar-button', 'aca-icon-action', className].filter(Boolean).join(' ')}
      aria-label={label}
      aria-disabled={blocked ? true : undefined}
      aria-describedby={blocked ? reasonId : shown ? tipId : undefined}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse') {
          hide();
          return;
        }
        held.current = false;
        press.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        later(TIP_PRESS_MS, () => {
          held.current = true;
        });
      }}
      onPointerMove={(event) => {
        const start = press.current;
        if (!start || start.id !== event.pointerId || held.current) return;
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TIP_SLOP_PX) {
          press.current = null;
          clearTimer();
        }
      }}
      onPointerUp={(event) => {
        if (event.pointerType === 'mouse') return;
        press.current = null;
        if (held.current) {
          releasedAt.current = Date.now();
          // The tip stays a moment for the eyes, longer with a reason to read; a tap, Esc or a
          // scroll still hide it at once.
          clearTimer();
          timer.current = setTimeout(
            hide,
            Math.min(
              TIP_LINGER_MAX_MS,
              TIP_LINGER_MS + TIP_LINGER_PER_CHAR_MS * (blocked?.length ?? 0)
            )
          );
        } else {
          hide();
        }
        held.current = false;
      }}
      onPointerCancel={() => {
        press.current = null;
        held.current = false;
        hide();
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') later(TIP_HOVER_MS);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') return;
        clearTimer();
        timer.current = setTimeout(hide, TIP_LEAVE_MS);
      }}
      // Touch browsers open their menu on a long press: the icon uses the gesture for its tip.
      onContextMenu={(event) => {
        if (press.current || held.current) event.preventDefault();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        // From the keyboard only: a tap focuses the button too, and shows nothing.
        let visible = false;
        try {
          visible = event.currentTarget.matches(':focus-visible');
        } catch {
          // An engine without :focus-visible: the last input decides.
        }
        // Beside :focus-visible, which an engine may not report for a focus moved by script:
        // the last input, as the launcher tracks it (LauncherScreen, data-aca-input).
        const keyboard = document.documentElement.dataset.acaInput === 'keyboard';
        if ((visible || keyboard) && !press.current) show();
      }}
      onBlur={(event) => {
        onBlur?.(event);
        hide();
      }}
      onClick={(event) => {
        if (releasedAt.current && Date.now() - releasedAt.current < TIP_RELEASE_MS) {
          // The release of the hold that showed the tip: no action (nor a popover opened).
          releasedAt.current = 0;
          event.preventDefault();
          return;
        }
        releasedAt.current = 0;
        hide();
        if (blocked) onBlocked(blocked);
        else onClick?.(event);
      }}
    >
      <Icon name={icon} size={iconSize} />
      {blocked && (
        <span id={reasonId} hidden>
          {blocked}
        </span>
      )}
      {shown &&
        createPortal(
          <span
            ref={tipRef}
            id={tipId}
            role="tooltip"
            className="aca-edit-tip"
            // The mouse on the tip keeps it, to be read (edit.css lets a fine pointer reach it).
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') clearTimer();
            }}
            onPointerLeave={(event) => {
              // Back onto the icon (the tip rises past it while it enters): it stays.
              const to = event.relatedTarget;
              const onIcon = to instanceof Node && anchorRef.current?.contains(to);
              if (event.pointerType === 'mouse' && !onIcon) hide();
            }}
            // In the tree of the button: a press on the tip is not a press on the button.
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <Body as="span" size="md">
              {tip}
            </Body>
            {blocked && (
              <Body as="span" size="md" className="aca-edit-tip__reason">
                {blocked}
              </Body>
            )}
          </span>,
          document.body
        )}
    </button>
  );
}
