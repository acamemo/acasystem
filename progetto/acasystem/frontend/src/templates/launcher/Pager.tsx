import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type MutableRefObject,
  type PointerEvent,
  type ReactNode,
  type TransitionEvent,
} from 'react';
import { flushSync } from 'react-dom';
import { useOverviewPan } from '@/hooks/launcher/useOverviewPan';
import type { PageDragState } from '@/hooks/launcher/usePageDrag';
import {
  PageNearContext,
  PageVisibilityContext,
  markPagerResized,
  usePageVisible,
} from '@/hooks/launcher/PageVisibilityContext';
import { NO_STAGE, useStaged, type Stage } from '@/hooks/launcher/useStagedScene';
import { afterNextFrame } from '@/utils/launcher/afterFrame';

export interface PagerPage {
  key: string;
  label: string;
  content: ReactNode;
  /** In the page overview: named «nascosta» by the card (a hidden page, the cover that is off). */
  hidden?: boolean;
  /** In the page overview: named «principale» by the card, the page the launcher opens on. */
  main?: boolean;
}

export interface PagerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  pages: readonly PagerPage[];
  index: number;
  onIndexChange: (index: number) => void;
  /** While a widget is dragged the swipe is off (the pages turn from the edges instead). */
  locked: boolean;
  /**
   * A widget is being dragged (ISSUE-109, R2): the pages two away from the one shown stay drawn,
   * so that turning a page at the edge never has to draw one in the middle of the gesture.
   */
  dragging?: boolean;
  /**
   * The page a tap on a dot of the indicator asked for (ISSUE-109, R10; user answer D-2): set by
   * the caller together with the new index, and taken by the pager when that index arrives. Only
   * a dot jumps: further than MAX_GLIDE_PAGES from the page the scroll rests on, it lands at once.
   * Any other index from outside (the edge of a drag, «Annulla») glides the whole way.
   */
  dotJump?: MutableRefObject<number | null>;
  /**
   * Level 2 of ADR-0018 (ISSUE-109, R2b): at rest even the pages next to the one shown are
   * skipped, and drawn again at the first touch of the pager (REST_SKIPS_NEAR is the default).
   */
  skipNear?: boolean;
  reducedMotion: boolean;
  /** Receives the scroll container, for the edge detection of the drag. */
  containerRef?: (node: HTMLDivElement | null) => void;
  /**
   * Page overview (REP-20261007-028): the pages become cards, with their neighbours in view.
   * A tap on a card opens it; held for a second it lifts, to be dragged to a new place
   * (REP-20261008-001).
   */
  overview?: boolean;
  onOpen?: (index: number) => void;
  /** A press on a card, which lifts it once held (usePageDrag). */
  onCardPointerDown?: (index: number, event: PointerEvent<HTMLButtonElement>) => void;
  /** Card being held before it lifts: the progressive cue. */
  pressingCard?: number | null;
  /** Card being dragged in the overview. */
  cardDrag?: PageDragState | null;
  /** Alt + arrows on a card: the keyboard alternative to dragging it. */
  onMoveCard?: (index: number, direction: -1 | 1) => void;
  /** Controls under the card in the centre (arrows, columns); the others show their name. */
  cardFooter?: (index: number) => ReactNode;
  /**
   * The state of the overview has changed and its movement has not begun (REP-20261023-006, D-M25;
   * useStagedScene): the cards keep the look they had, and take the new one in the frame the
   * scene starts. Everything that is state (inert, the window of the pages, the controls) has
   * changed already, so the block of that commit comes before the movement, not inside it.
   */
  staged?: boolean;
  /**
   * The same, from the host of the scene (useStagedScene): the pager follows the end of the wait
   * on its own, with no render of the host or of the pages (0.9.28, D-M25). Either of the two
   * puts the pager in the wait.
   */
  stage?: Stage;
  /** The pager has been measured (it has a size) or not: a pager with no size has no movement. */
  onReadyChange?: (ready: boolean) => void;
  /**
   * Written true while the cards go back and while the pages settle (and while that is about to
   * start): a long press that begins then is ignored (D-M18). A ref, so that no render follows.
   */
  busyRef?: MutableRefObject<boolean>;
  /** Key of the page whose card is leaving: it shrinks and fades before the row closes (D-M24). */
  leavingKey?: string | null;
}

export const SETTLE_MS = 90;
/** One frame at 60 Hz, for the settling where there is no animation frame to wait for. */
const SETTLE_FRAME_MS = 16;
/**
 * Level 2 of ADR-0018 (ISSUE-109, R2b), the one place that switches it: with `true` the pages next
 * to the one shown are skipped at rest too, and drawn at the first touch of the pager, while a
 * widget is dragged and while the row scrolls; with `false` the pager keeps the window of level 1
 * (the page shown and its neighbours). Taking the step back is this value, or the prop `skipNear`.
 */
// Off since 2026-10-23: the scroll measurement showed level 2 worse than level 1
// (REP-20261022-002, ADR-0018).
export const REST_SKIPS_NEAR = false;
/**
 * How long the neighbours stay drawn after the finger leaves the pager, when no scroll has
 * started: a tap on a widget, or the beginning of a fling, must not hide and draw them again.
 */
const TOUCH_HOLD_MS = 300;
/**
 * After a scroll has landed the window keeps what the gesture drew, and narrows to the page it
 * landed on later, not before this long (REP-20261023-006, 0.9.28, measurement of the evening of
 * 2026-10-23): longer than the landing of the indicator (220 ms and the label, pageIndicator.css),
 * so the narrowing never falls on its frames. Then at an idle moment, with the second time as the
 * limit (`requestIdleCallback`), and never while another gesture has begun (see `rested`).
 */
export const NARROW_AFTER_LANDING_MS = 350;
export const NARROW_IDLE_TIMEOUT_MS = 700;
/**
 * A tap on a dot of the indicator glides to the page next to the one shown; further than this many
 * pages away it lands at once, without drawing the pages in between (ISSUE-109, R10; user answer
 * D-2, «Salto diretto»). Only a dot: see `dotJump`.
 */
const MAX_GLIDE_PAGES = 1;
/** A card is at most this share of its page (the area leaves room for the controls under it). */
const MAX_CARD = 0.72;
const MIN_CARD = 0.3;
/**
 * The time and the curve of the overview, as the stylesheet sets them (--aca-overview-ms and
 * --aca-overview-ease, launcher.css): constants, so that the code never reads the computed
 * style after a commit (REP-20261012-003).
 */
export const OVERVIEW_MS = 360;
/**
 * The order of the scene (D-M3, D-M25): the empty cells go first (--aca-dur-clear), the cards
 * follow after two gaps of --aca-stagger when they open and after one when they go back
 * (--aca-card-delay in launcher.css). They hold only while the scene runs (`entering`).
 */
export const OPENING_CARD_DELAY_MS = 80;
export const CLOSING_CARD_DELAY_MS = 40;
/** A card that leaves (a page deleted): --aca-dur-exit-sm, the time before the row closes. */
export const CARD_EXIT_MS = 160;
export const OVERVIEW_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
/**
 * How long the closing may last (ISSUE-109, R1). The safety timer counts from the moment the
 * transition really starts, not from the state change: a long task between the two used to eat
 * the glide. The cap counts from the state change and is only for when nothing starts at all.
 */
export const CLOSING_SAFETY_MS = OVERVIEW_MS + CLOSING_CARD_DELAY_MS + 50;
const CLOSING_CAP_MS = 3 * OVERVIEW_MS;

type CardStyle = CSSProperties &
  Partial<Record<'--aca-o' | '--aca-d' | '--aca-card-shift' | '--aca-card-drag', string>>;

/** Page the scroll position rests on. */
const settledIndexOf = (element: HTMLDivElement | null, fallback: number) =>
  !element || element.clientWidth === 0
    ? fallback
    : Math.round(element.scrollLeft / element.clientWidth);

/**
 * Distance between the centres of two cards of the overview, in px, as the pager measured it
 * (0 while it has no size).
 */
export function overviewPitchOf(pager: HTMLElement | null) {
  return parseFloat(pager?.style.getPropertyValue('--aca-overview-pitch') ?? '') || 0;
}

/** The variables the probe of `measureCards` reads: their computed values are its signature. */
const PROBE_VARS = [
  '--aca-card-gap',
  '--aca-card-footer',
  '--aca-space-2',
  '--aca-space-4',
  '--aca-undo-room',
  '--aca-overview-foot',
] as const;
/** A move against the direction of the window that is no turn: a tenth of a page at most... */
const TURN_PAGES = 0.1;
/** ...and within this many pages of a page (the landing of a snap overshoots by a hair). */
const AT_PAGE_PAGES = 0.02;
/** The last result of the probe for each pager, with the signature it was read under. */
const probeCache = new WeakMap<HTMLElement, { signature: string; gap: number; reserve: number }>();

/**
 * Size of the cards for the area of the pager: k, the share of the page a card keeps (its whole
 * picture, so the grid inside keeps its proportions), and the pitch. The room under the card
 * for its controls, the room above the cards for the «Annulla» pill (--aca-undo-room: the status
 * bar no longer leaves the top band empty for it, REP-20261013-002, ADR-0013), the room of the bar
 * of the pages at the bottom (--aca-overview-foot: the bars lie over the area, ADR-0016) and the
 * gap between the cards come from the stylesheet, in px from a probe; the group of card and controls is
 * centred in the area under that room, leaving room (space-4) above the card.
 * Null while the pager has no size.
 */
function measureCards(element: HTMLDivElement) {
  const width = element.clientWidth;
  // The area of the pages: the pager reaches under the bars with a padding (launcher.css).
  const styles = getComputedStyle(element);
  const height =
    element.clientHeight -
    (parseFloat(styles.paddingTop) || 0) -
    (parseFloat(styles.paddingBottom) || 0);
  if (width === 0 || height <= 0) return null;
  // The probe adds a node to the shell and takes it away, two mutations and a layout, each time
  // the pager is measured: the observer of the size fires on every return from Sistema and every
  // resize (0.9.28, tracing of 2026-10-24). What it reads depends on the values below alone, so
  // while they are the same the last result stands. They are the computed values of the variables
  // the probe uses (var() already replaced, so a change of density or of token is seen), the width,
  // the font sizes the rem and em of those values rest on and the size of the window.
  const root = document.documentElement;
  const signature = [
    width,
    styles.fontSize,
    getComputedStyle(root).fontSize,
    window.innerWidth,
    window.innerHeight,
    ...PROBE_VARS.map((name) => styles.getPropertyValue(name)),
  ].join('|');
  let probed = probeCache.get(element);
  if (probed?.signature !== signature) {
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:absolute;visibility:hidden;pointer-events:none;width:var(--aca-card-gap);' +
      'height:calc(var(--aca-card-footer) + var(--aca-space-2) + 2 * var(--aca-space-4) + ' +
      'var(--aca-undo-room) + var(--aca-overview-foot, 0px))';
    element.appendChild(probe);
    probed = { signature, gap: probe.offsetWidth, reserve: probe.offsetHeight };
    probe.remove();
    probeCache.set(element, probed);
  }
  const { gap, reserve } = probed;
  const k = Math.min(MAX_CARD, Math.max(MIN_CARD, (height - reserve) / height));
  return { k, pitch: k * width + gap, width };
}

/**
 * The transitions the content of the pages starts as the cards go back: the pages leave the edit
 * mode at the same time, and every control that was disabled for it (its shadow) would fade in
 * under the glide. They end at once, so only the cards move (REP-20261015-001, ISSUE-062).
 * A stylesheet rule did this for the whole subtree (`.aca-pager.is-closing .aca-pager__clip *`)
 * and restyled all of it, about 180 ms of a 4x throttled desktop for 5800 elements, at each entry
 * and exit (REP-20261019-002); this ends the transitions that actually started, the same ones.
 * Those of the cards themselves (pages, bodies) are outside the clip and run; so do those of
 * pseudo-elements, which the rule never reached.
 */
export function endContentTransitions(pager: HTMLElement) {
  if (typeof pager.getAnimations !== 'function' || typeof CSSTransition === 'undefined') return;
  for (const animation of pager.getAnimations({ subtree: true })) {
    if (!(animation instanceof CSSTransition)) continue;
    const effect = animation.effect as KeyframeEffect | null;
    if (!effect?.target || effect.pseudoElement) continue;
    if (effect.target.closest('.aca-pager__clip')) animation.finish();
  }
}

/** The pages of the pager: its children, but the layer of the gaps in the overview. */
function pagesOf(pager: Element) {
  return Array.from(pager.children).filter((child) =>
    child.classList.contains('aca-pager__page')
  ) as HTMLElement[];
}

/**
 * A transition of a card as it starts: any of a page, or the scale of a body. The widgets inside
 * have transitions of their own, which say nothing about the closing.
 */
function isCardTransition(event: Pick<Event, 'target'> & { propertyName?: string }) {
  const target = event.target as HTMLElement | null;
  if (!target?.classList) return false;
  if (target.classList.contains('aca-pager__page')) return true;
  return target.classList.contains('aca-pager__body') && event.propertyName === 'scale';
}

/** The pointer is over the padding of the pager, the band under a bar (launcher.css). */
function inBand(element: HTMLElement, clientY: number) {
  const box = element.getBoundingClientRect();
  if (box.height <= 0) return false;
  const styles = getComputedStyle(element);
  return (
    clientY < box.top + (parseFloat(styles.paddingTop) || 0) ||
    clientY > box.bottom - (parseFloat(styles.paddingBottom) || 0)
  );
}

/** Steps a card takes aside while another one is dragged over it (in cards). */
function shiftOf(position: number, drag: PageDragState) {
  if (position === drag.from) return 0;
  if (drag.from < drag.to && position > drag.from && position <= drag.to) return -1;
  if (drag.to < drag.from && position >= drag.to && position < drag.from) return 1;
  return 0;
}

/**
 * What the scroll has crossed since it last rested, in pages (ISSUE-109, R2): the lowest and the
 * highest page it has been over, and the way it was going at its last event.
 */
interface Reach {
  lo: number;
  hi: number;
  dir: -1 | 0 | 1;
}

/** The cards of the overview as the pager measured them: its width, k and the pitch (px). */
interface CardFrame {
  width: number;
  k: number;
  pitch: number;
}

/** The first and the last page the browser draws; the others are skipped (`data-far`). */
export type PageWindow = readonly [first: number, last: number];

const inWindow = (count: number, first: number, last: number): PageWindow => [
  Math.max(0, first),
  Math.min(count - 1, last),
];

/**
 * The pages kept drawn at rest and in edit mode (ADR-0018, level 1): the one the scroll rests on
 * and its neighbours. While the row scrolls the window follows the position from the first scroll
 * event, `[floor(p) - 1, ceil(p) + 1]` and one more page in the direction of travel, so that a page
 * comes into view with one page of margin: it is drawn (and its widgets measured again, if the
 * pager changed size meanwhile) before it is seen. It is drawn while the scroll runs, which the
 * compositor carries, and not after it has landed, where the cost fell on the landing of the
 * indicator (0.9.28 measured worse than 0.9.27 on that account, REP-20261023-006). The window
 * narrows to the page the scroll landed on later, at an idle moment (NARROW_AFTER_LANDING_MS). A
 * dragged widget keeps two pages on each side from the start of the drag. With `nearDrawn` false
 * (level 2, R2b) the neighbours are left out while nothing moves.
 */
export function restWindow(
  count: number,
  index: number,
  reach: Reach | null,
  dragging: boolean,
  nearDrawn = true
): PageWindow {
  const lo = reach ? Math.min(index, reach.lo) : index;
  const hi = reach ? Math.max(index, reach.hi) : index;
  // Level 2 (R2b): nothing moves and nobody touches the pager, so the page shown alone. A reach
  // (a scroll, a glide), a touch and a drag bring the neighbours back.
  const margin = nearDrawn || reach ? 1 : 0;
  let first = lo - margin;
  let last = hi + margin;
  if (reach && reach.dir > 0) last += 1;
  else if (reach && reach.dir < 0) first -= 1;
  if (dragging) {
    first = Math.min(first, index - 2);
    last = Math.max(last, index + 2);
  }
  return inWindow(count, first, last);
}

/**
 * The pages kept drawn in the overview and while the cards go back: the cards in view and one
 * more on each side, so that a card dragged in a hurry does not reach the screen skipped. The
 * position of a card is the one the stylesheet gives it: its distance from the centre, the step
 * aside of a card being moved, the pan of the finger (in px, to half a pitch) and the lifted
 * card's own offset. Until the cards are measured nothing is skipped.
 */
export function overviewWindow(
  count: number,
  index: number,
  frame: CardFrame | null,
  pan: number,
  cardDrag: PageDragState | null
): PageWindow {
  if (!frame || frame.pitch <= 0 || frame.width <= 0) return [0, count - 1];
  // A card is in view while its centre is nearer than half the pager plus half the card.
  const inView = (frame.width * (1 + frame.k)) / 2 / frame.pitch;
  let lo = index;
  let hi = index;
  for (let position = 0; position < count; position++) {
    const aside = cardDrag ? shiftOf(position, cardDrag) : 0;
    const lifted = cardDrag?.from === position ? cardDrag.offset : 0;
    const distance = position - index + aside + (pan + lifted) / frame.pitch;
    if (Math.abs(distance) < inView) {
      lo = Math.min(lo, position);
      hi = Math.max(hi, position);
    }
  }
  return inWindow(count, lo - 1, hi + 1);
}

const sameReach = (a: Reach | null, b: Reach | null) =>
  a === b || (a !== null && b !== null && a.lo === b.lo && a.hi === b.hi && a.dir === b.dir);

/** The last input was the keyboard: paging lands at once instead of gliding. */
const inputIsKeyboard = () => document.documentElement.dataset.acaInput === 'keyboard';

/**
 * Runs `task` once the landing of a scroll is over: NARROW_AFTER_LANDING_MS later, at an idle
 * moment of the main thread (NARROW_IDLE_TIMEOUT_MS at most), or after that time where the engine
 * has no idle callbacks. Returns what cancels it.
 */
function whenIdle(task: () => void): () => void {
  let idle: number | null = null;
  const timer = setTimeout(() => {
    if (typeof requestIdleCallback === 'function') {
      idle = requestIdleCallback(task, { timeout: NARROW_IDLE_TIMEOUT_MS });
    } else {
      task();
    }
  }, NARROW_AFTER_LANDING_MS);
  return () => {
    clearTimeout(timer);
    if (idle !== null && typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
  };
}

/**
 * Full-screen horizontal pager on CSS scroll snap. Swiping settles on a page and reports it;
 * a new index (indicator, keyboard, edge of a drag) scrolls there. Off-screen pages are inert,
 * so Tab stays on the page shown.
 *
 * In the page overview the pages keep their size and the scroll rests on the page it opened on
 * (`base`): the cards are the pages moved and scaled by transform alone (launcher.css), so the
 * grids do not measure again. A swipe moves them with the pointer (useOverviewPan); leaving the
 * overview they glide back to their places in the row (`closing`), and the scroll moves to the
 * page in the centre in the same frame that the transforms go.
 */
export function Pager({
  pages,
  index,
  onIndexChange,
  locked,
  dragging: widgetDragging = false,
  dotJump,
  skipNear = REST_SKIPS_NEAR,
  reducedMotion,
  containerRef,
  overview = false,
  onOpen,
  onCardPointerDown,
  pressingCard = null,
  cardDrag = null,
  onMoveCard,
  cardFooter,
  staged: stagedByProp = false,
  stage = NO_STAGE,
  onReadyChange,
  busyRef,
  leavingKey = null,
  className,
  onPointerDown,
  onFocus,
  ...props
}: PagerProps) {
  const visible = usePageVisible();
  const staged = useStaged(stage) || stagedByProp;
  const ref = useRef<HTMLDivElement | null>(null);
  const indexRef = useRef(index);
  const onChangeRef = useRef(onIndexChange);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keys = pages.map((page) => page.key).join('|');
  const [ready, setReady] = useState(false);
  // The page just left gets `data-quiet` later, after the landing (0.9.28, G2 tracing of
  // 2026-10-24): it is off screen and a jump or a swipe changes `data-quiet`, `is-current` and
  // `inert` on two pages in the same commit, 1067 elements against 841. The new current page
  // loses the attribute at once; the one left is still drawn without it for a moment, which
  // costs nothing that is seen.
  const currentKey = pages[index]?.key ?? null;
  const [seenKey, setSeenKey] = useState(currentKey);
  const [leftKey, setLeftKey] = useState<string | null>(null);
  if (seenKey !== currentKey) {
    setSeenKey(currentKey);
    setLeftKey(seenKey);
  }
  useEffect(() => {
    if (leftKey === null) return undefined;
    // A timer and not an idle callback: the narrowing of the window of the pages asks for the idle
    // moment of the landing (whenIdle), and this one page is a few dozen elements.
    const timer = setTimeout(() => setLeftKey(null), NARROW_AFTER_LANDING_MS);
    return () => clearTimeout(timer);
  }, [leftKey]);

  // The pages that came since the last render are the only ones to come in (launcher.css,
  // `is-new`): a page that React moves in the DOM when the order changes is not a new one.
  const [roster, setRoster] = useState<{ keys: string; fresh: readonly string[] }>({
    keys: '',
    fresh: [],
  });
  let current = roster;
  if (roster.keys !== keys) {
    const before = roster.keys.split('|');
    current = { keys, fresh: pages.map((page) => page.key).filter((key) => !before.includes(key)) };
    setRoster(current);
  }
  useEffect(() => {
    if (!roster.fresh.length) return undefined;
    const clear = () => setRoster((now) => (now.fresh.length ? { ...now, fresh: [] } : now));
    // A card that comes into the overview is committed hidden (opacity 0, a little smaller) and
    // comes in two frames later, after the block of the commit that added it (D-M24, D-M25).
    if (!(overview && ready && !reducedMotion)) {
      clear();
      return undefined;
    }
    return afterNextFrame(() => flushSync(clear));
  }, [roster, overview, ready, reducedMotion]);

  // The page the scroll rests on: the one in the centre, until the overview opens. In the
  // overview and while it closes it stays where it was (the cards move by transform).
  const [view, setView] = useState({ overview, closing: false, settling: false, base: index });
  let shown = view;
  if (overview !== view.overview) {
    shown = {
      overview,
      closing: view.overview && !overview && ready && !reducedMotion,
      settling: false,
      base: overview ? index : view.base,
    };
  }
  if (!overview && !shown.closing && shown.base !== index) shown = { ...shown, base: index };
  if (shown !== view) setView(shown);
  const { closing, settling } = shown;
  // The page that becomes the current one outside a scene keeps `data-quiet` in the commit that
  // gives it `is-current` and loses it two frames later, in a task of its own (J1, tracing of
  // 2026-10-25): the same commit restyled 247 elements against 31 at the jump of six pages (the 43
  // widgets of the page with their layers, by the rule `[data-quiet]` of launcher.css). Its widgets
  // cannot start a transition for those frames: a jump draws no animation, and a glide to the
  // next dot moves the page on the compositor. In a scene (opening or closing of the overview,
  // «Fine», settling) the widgets of the new page may have transitions in the same commit, so the
  // attribute goes with it as always.
  const [arrivalSeen, setArrivalSeen] = useState(currentKey);
  const [arrivingKey, setArrivingKey] = useState<string | null>(null);
  if (arrivalSeen !== currentKey) {
    setArrivalSeen(currentKey);
    const inScene = overview || view.overview || closing || settling || staged;
    setArrivingKey(inScene ? null : currentKey);
  }
  useEffect(() => {
    if (arrivingKey === null) return undefined;
    return afterNextFrame(() => setArrivingKey(null));
  }, [arrivingKey]);
  const base = Math.max(0, Math.min(pages.length - 1, shown.base));
  const shrunk = overview || closing;
  // What the stylesheet sees (D-M25). In the wait of a staged scene the cards keep the look they
  // had: still pages while the overview is about to open, still cards while it is about to close.
  // The class of movement comes with the frame the scene starts.
  const visualOverview = staged ? closing : overview;
  const closingMotion = closing && !staged;
  // The opening holds the cards back while the empty cells go (launcher.css, --aca-card-delay):
  // set in the render that gives the class, so the delay is there when the transitions are born.
  const [entering, setEntering] = useState(false);
  const [wasVisual, setWasVisual] = useState(visualOverview);
  if (wasVisual !== visualOverview) {
    setWasVisual(visualOverview);
    setEntering(visualOverview && ready && !reducedMotion);
  }
  useEffect(() => {
    if (!entering) return undefined;
    const timer = setTimeout(
      () => setEntering(false),
      OVERVIEW_MS + OPENING_CARD_DELAY_MS + CLOSING_CARD_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [entering]);

  // The pages the browser skips (ISSUE-109, R2, ADR-0018): the ones out of the window of
  // restWindow and overviewWindow. Only an attribute: every page stays mounted, with its state, its
  // polling and its contexts, and the stylesheet does the rest (launcher.css).
  const [reach, setReachState] = useState<Reach | null>(null);
  const reachRef = useRef<Reach | null>(null);
  // The page the window is built around: the one the scroll rests on. It follows the index at once
  // when the index is set from outside without a glide (a jump, the overview, a drag at the edge),
  // and, after a swipe or a glide, only when the window narrows, later and at an idle moment
  // (NARROW_AFTER_LANDING_MS): until then the reach the gesture drew stays, so the landing writes
  // no data-far, and the page left behind is skipped when nothing moves.
  const [rested, setRested] = useState(index);
  // Cancels the narrowing that waits (null when none).
  const landing = useRef<(() => void) | null>(null);
  const [frame, setFrame] = useState<CardFrame | null>(null);
  const [panStep, setPanStep] = useState(0);
  // A finger is on the pager, or was a moment ago (level 2, R2b): the neighbours are drawn.
  const [touching, setTouching] = useState(false);
  // The window of a drag (two pages on each side) narrows when the drag is over, later and at an
  // idle moment like the one of a scroll (W3, tracing of 2026-10-25): the commit that ends the
  // session wrote `data-far` on two pages and their layout. A new drag before that keeps it.
  const [dragWide, setDragWide] = useState(widgetDragging);
  if (widgetDragging && !dragWide) setDragWide(true);
  useEffect(() => {
    if (widgetDragging || !dragWide) return undefined;
    return whenIdle(() => setDragWide(false));
  }, [widgetDragging, dragWide]);
  const wideDrag = widgetDragging || dragWide;
  const setReach = useCallback((next: Reach | null) => {
    if (sameReach(reachRef.current, next)) return;
    setReachState((now) => (sameReach(now, next) ? now : next));
  }, []);
  // The index of the render before: an index that comes from outside glides there (a tap on a dot
  // next to the page, the edge of a drag), so the pages on the way are drawn from the very commit
  // that changes the index, before the glide starts. An index that comes from the scroll itself,
  // or a jump (keyboard, reduced motion, a dot further than MAX_GLIDE_PAGES), has nothing on the
  // way: its pages are those of the window (R10). Other indices from outside always glide.
  const [seen, setSeen] = useState(index);
  // The window with nothing moving, around the page the scroll rests on.
  const calm = restWindow(pages.length, rested, null, wideDrag, !skipNear || touching);
  if (seen !== index) {
    setSeen(index);
    // An index that comes from the scroll itself (the settle) is the page the scroll landed on:
    // the window follows it after the landing, not in this commit.
    const fromScroll = index === indexRef.current;
    if (
      !shrunk &&
      !fromScroll &&
      !reducedMotion &&
      !inputIsKeyboard() &&
      !(dotJump?.current === index && Math.abs(index - seen) > MAX_GLIDE_PAGES)
    ) {
      const lo = Math.min(reach?.lo ?? index, seen, index);
      const hi = Math.max(reach?.hi ?? index, seen, index);
      // The way of the glide is drawn already when it stays among the pages of the window: a tap
      // on the dot next to the page changes nothing until the scroll has landed.
      if (lo < calm[0] || hi > calm[1]) setReach({ lo, hi, dir: reach?.dir ?? 0 });
      if (widgetDragging) setRested(index);
    } else if (!fromScroll) {
      setRested(index);
    }
  }
  // The overview and the cards going back have the window of the cards: the page in the centre.
  if (shrunk && rested !== index) setRested(index);
  const [firstDrawn, lastDrawn] = shrunk
    ? overviewWindow(pages.length, index, frame, frame ? (panStep * frame.pitch) / 2 : 0, cardDrag)
    : restWindow(pages.length, rested, reach, wideDrag, !skipNear || touching);

  const latest = useRef({ index, base, shrunk, locked });
  /**
   * Where the scroll rests and how wide the pager is, as the last settled scroll, write and size
   * observation left them. The effects read these instead of scrollLeft and clientWidth, which
   * forced the layout of the whole page after every commit (REP-20261012-003). Until the
   * observer has reported (and without one), the width is the element's own.
   */
  const rest = useRef({ left: 0, width: 0 });
  const dragging = useRef(false);
  // Where the scroll is going, in pages, at its last event (null at rest): the direction of the
  // reach comes from it.
  const trail = useRef<number | null>(null);
  // The page a running glide is going to (null when none): the page ahead of it is not drawn.
  const glideTo = useRef<number | null>(null);
  useLayoutEffect(() => {
    latest.current = { index, base, shrunk, locked };
    dragging.current = Boolean(cardDrag);
    reachRef.current = reach;
  });

  useEffect(() => {
    onChangeRef.current = onIndexChange;
  }, [onIndexChange]);

  // A new index from outside: scroll there (instantly the first time, e.g. the launcher opening
  // on «Principale», when the pages themselves changed and when the overview has closed). In
  // the overview the scroll stays on the base page.
  const lastKeys = useRef(keys);
  const placed = useRef(false);
  const wasShrunk = useRef(false);
  useLayoutEffect(() => {
    indexRef.current = index;
    // The request of a dot is for this index change alone, whatever the effect does with it.
    const fromDot = dotJump?.current === index;
    if (dotJump) dotJump.current = null;
    glideTo.current = null;
    const element = ref.current;
    const width = rest.current.width || element?.clientWidth || 0;
    if (!element || width === 0) {
      // No size (the launcher is covered): nothing glides, so nothing on the way to keep drawn.
      trail.current = null;
      setReach(null);
      setRested(index);
      return;
    }
    if (shrunk) {
      // The overview has its own window (overviewWindow); what the scroll had crossed is over.
      trail.current = null;
      setReach(null);
      const opening = !wasShrunk.current;
      wasShrunk.current = true;
      // The scroll already rests on the base page when the overview opens: no write, no layout.
      // Unless a scroll has not settled yet: `rest` is behind it, so the base is written, as
      // before (REP-20261012-003).
      if (opening && settleTimer.current) {
        clearTimeout(settleTimer.current);
        settleTimer.current = null;
        rest.current.left = base * width;
        element.scrollLeft = rest.current.left;
      } else if (rest.current.left !== base * width) {
        rest.current.left = base * width;
        element.scrollLeft = rest.current.left;
      }
      return;
    }
    const pagesChanged = lastKeys.current !== keys;
    const first = !placed.current;
    const closed = wasShrunk.current;
    lastKeys.current = keys;
    placed.current = true;
    wasShrunk.current = false;
    if (Math.round(rest.current.left / width) === index && !pagesChanged && !closed) return;
    const left = index * width;
    const from = rest.current.left / width;
    // The overview closed on the page it opened on: the scroll never left it, and writing it
    // again would force the style of the whole pager for nothing (REP-20261012-003).
    if (closed && !first && !pagesChanged && rest.current.left === left) return;
    // Keyboard paging lands immediately; the indicator and other pointer input glide there, unless
    // the tap is on a dot further than MAX_GLIDE_PAGES from the page the scroll rests on (R10):
    // that lands at once, so the pages in between are never seen going by.
    const fromKeyboard = inputIsKeyboard();
    const farJump = fromDot && Math.abs(index - Math.round(from)) > MAX_GLIDE_PAGES;
    if (
      first ||
      pagesChanged ||
      closed ||
      reducedMotion ||
      fromKeyboard ||
      farJump ||
      typeof element.scrollTo !== 'function'
    ) {
      // Nothing on the way to draw: the page it lands on is in the window of this commit already.
      trail.current = null;
      setReach(null);
      setRested(index);
      rest.current.left = left;
      element.scrollLeft = left;
    } else {
      // The pages on the way were drawn by the render that changed the index (the reach); the
      // scroll events keep them so until it stops.
      trail.current = from;
      glideTo.current = index;
      // Where the glide will stop, so that an index that comes back during it glides back too
      // (the stop of the scroll corrects it with the real position; REP-20261012-003).
      rest.current.left = left;
      element.scrollTo({ left, behavior: 'smooth' });
    }
  }, [index, keys, reducedMotion, shrunk, base, setReach, dotJump]);

  // A page that React moves in the DOM (a new order) has no style to glide from: it would jump.
  // It is taken back to where it was, and the animation brings it to its place.
  const places = useRef(new Map<string, number>());
  const orderedKeys = useRef(keys);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reordered = orderedKeys.current !== keys;
    orderedKeys.current = keys;
    const pitch = overviewPitchOf(element);
    const next = new Map<string, number>();
    const sections = pagesOf(element);
    pages.forEach((page, position) => {
      // Where the stylesheet puts the card, relative to the centre, in px.
      const x =
        ((position - index + (cardDrag ? shiftOf(position, cardDrag) : 0)) * pitch || 0) +
        (cardDrag?.from === position ? cardDrag.offset : 0);
      const before = places.current.get(page.key);
      const section = sections[position];
      if (
        overview &&
        reordered &&
        !reducedMotion &&
        before !== undefined &&
        Math.abs(before - x) > 1 &&
        typeof section?.animate === 'function' &&
        // The pages that did not move are gliding already (their transition is running).
        section.getAnimations().length === 0
      ) {
        const glide = section.animate(
          { translate: [`${before - x}px`, '0px'], composite: 'add' },
          { duration: OVERVIEW_MS, easing: OVERVIEW_EASE }
        );
        // The card React moved goes over the one that glides by its own transition, for a stable
        // order of overlap while they cross (D-M24; before, the DOM order decided and flipped).
        section.classList.add('is-moved');
        const settled = () => section.classList.remove('is-moved');
        if (typeof glide?.addEventListener === 'function') {
          glide.addEventListener('finish', settled);
          glide.addEventListener('cancel', settled);
        } else {
          settled();
        }
      }
      next.set(page.key, x);
    });
    places.current = next;
  });

  // The size of the cards follows the area (once, not frame by frame: the cards only scale).
  const measure = useCallback(() => {
    const element = ref.current;
    const cards = element ? measureCards(element) : null;
    if (!element || !cards) return false;
    element.style.setProperty('--aca-overview-k', cards.k.toFixed(4));
    element.style.setProperty('--aca-overview-pitch', `${cards.pitch.toFixed(2)}px`);
    // The same numbers, rounded as the stylesheet reads them, for the window of the overview.
    const k = Number(cards.k.toFixed(4));
    const pitch = Number(cards.pitch.toFixed(2));
    setFrame((now) =>
      now && now.width === cards.width && now.k === k && now.pitch === pitch
        ? now
        : { width: cards.width, k, pitch }
    );
    return true;
  }, []);
  useLayoutEffect(() => {
    setReady(measure());
  }, [measure]);
  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);
  // A long press that begins while the cards go back or the pages settle is ignored (D-M18).
  useLayoutEffect(() => {
    if (busyRef) busyRef.current = closing || settling;
  }, [busyRef, closing, settling]);

  // Keep the page in place when the viewport changes size.
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      markPagerResized();
      setReady(measure());
      const { index: shownIndex, base: baseIndex, shrunk: inOverview } = latest.current;
      rest.current.width = element.clientWidth;
      rest.current.left = (inOverview ? baseIndex : shownIndex) * rest.current.width;
      element.scrollLeft = rest.current.left;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  // Closing: the cards glide back to their places; when they have, the row takes over (the
  // transform goes and the scroll moves to the page in the centre, in one frame). The end of
  // the transition says so; the timers are for when it does not come.
  // Settling (REP-20261015-001, ISSUE-109 R8): the empty cells reappear one frame after the closing
  // ends, so that the commit that ends it and the one that starts their fade-in are two.
  const finishClosing = useCallback(
    () => setView((now) => (now.closing ? { ...now, closing: false, settling: true } : now)),
    []
  );
  // The content of the pages does not transition while the cards go back: ended in the first
  // frame (before it is drawn), as the stylesheet rule did that this replaces. That frame is the
  // first after the commit, also when the scene is staged (D-M25) and its movement comes later.
  // The same frame starts the clock of the closing (ISSUE-109, R1), unless a transition of a card
  // (a page, or the scale of a body) has started before it: the clock runs from the first of the
  // two, never from the state change, so a long task in between cannot cut the glide short. A
  // current page with no pan or neighbours has no translate to transition, but its body always
  // scales, and the frame comes anyway. The cap, from the state change, is the last resort. In
  // the wait of a staged scene (`closing` without `closingMotion`) nothing moves yet, so no clock
  // runs: it would end the glide before it has begun.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!closing || !element) return undefined;
    let started = false;
    let clock: ReturnType<typeof setTimeout> | null = null;
    const start = () => {
      if (started || !closingMotion) return;
      started = true;
      clock = setTimeout(finishClosing, CLOSING_SAFETY_MS);
    };
    const onStart = (event: Event) => {
      if (isCardTransition(event as Event & { propertyName?: string })) start();
    };
    let cap: ReturnType<typeof setTimeout> | null = null;
    if (closingMotion) {
      element.addEventListener('transitionrun', onStart);
      element.addEventListener('transitionstart', onStart);
      cap = setTimeout(finishClosing, CLOSING_CAP_MS);
    }
    let frame: number | null = null;
    if (typeof requestAnimationFrame === 'function') {
      frame = requestAnimationFrame(() => {
        frame = null;
        endContentTransitions(element);
        start();
      });
    } else {
      start();
    }
    return () => {
      element.removeEventListener('transitionrun', onStart);
      element.removeEventListener('transitionstart', onStart);
      if (cap) clearTimeout(cap);
      if (clock) clearTimeout(clock);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [closing, closingMotion, finishClosing]);
  // The free cells are out of reach, and out of the way of assistive technology, while the cards
  // are shown and while the pages settle (opacity alone hides them: a visibility that changed
  // with the view was inherited by everything in the cells, launcher.css). One attribute on each
  // layer of cells; the rest of the page is inert in the overview and while it closes.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const out = shrunk || settling;
    for (const layer of element.querySelectorAll<HTMLElement>('.aca-launcher-cells')) {
      if (out) layer.setAttribute('inert', '');
      else layer.removeAttribute('inert');
    }
  }, [shrunk, settling]);
  useEffect(() => {
    if (!settling) return undefined;
    // The free cells come back with the page (ISSUE-109, R8; user answer D-1): the frame after the
    // one that ended the closing, not after an idle period (which came 0.10-0.33 s later). The one
    // frame keeps the commit that ends the closing apart from the one that starts the fade-in.
    const done = () => setView((now) => (now.settling ? { ...now, settling: false } : now));
    if (typeof requestAnimationFrame === 'function') {
      const handle = requestAnimationFrame(done);
      return () => cancelAnimationFrame(handle);
    }
    const timer = setTimeout(done, SETTLE_FRAME_MS);
    return () => clearTimeout(timer);
  }, [settling]);
  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (!closingMotion) return;
    // Of the pages and their bodies only: the widgets inside have transitions of their own.
    const target = event.target as HTMLElement;
    if (target.classList.contains('aca-pager__page')) {
      if (event.propertyName === 'translate') finishClosing();
      return;
    }
    // The page in the centre has no translate to end when nothing pans or neighbours it: the
    // scale of its body, which always runs, says it (ISSUE-109, R1).
    if (
      target.classList.contains('aca-pager__body') &&
      event.propertyName === 'scale' &&
      target.parentElement?.classList.contains('is-current')
    ) {
      finishClosing();
    }
  };

  // The cards follow the pointer in the overview (a swipe is no scroll there).
  const pan = useOverviewPan({
    element: ref,
    enabled: overview,
    count: pages.length,
    getPitch: () => overviewPitchOf(ref.current),
    getIndex: () => indexRef.current,
    // A name being edited holds the cards still, as it held the scroll.
    isBlocked: () => dragging.current || latest.current.locked,
    // The cards in view change as the pan goes on: a step of half a pitch is enough for the
    // window, which keeps one card more on each side (overviewWindow).
    onPan: (pixels) => {
      const pitch = overviewPitchOf(ref.current);
      setPanStep(pitch > 0 ? Math.round(pixels / (pitch / 2)) : 0);
    },
    onSettle: (settled) => {
      indexRef.current = settled;
      onChangeRef.current(settled);
    },
  });

  // A card reached with the keyboard (Tab, a screen reader) comes to the centre, so the bar of
  // the pages and the controls are always those of the card in focus. A press or a tap does not:
  // the card it ends on opens, and must stay under the finger.
  const onFocusCard = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    if (!overview) return;
    const target = event.target as HTMLElement;
    let byKeyboard = document.documentElement.dataset.acaInput === 'keyboard';
    try {
      byKeyboard = target.matches(':focus-visible');
    } catch {
      // No :focus-visible: the last input says.
    }
    if (!byKeyboard) return;
    const section = target.closest('.aca-pager__page');
    const position = section ? pagesOf(event.currentTarget).indexOf(section as HTMLElement) : -1;
    if (position >= 0 && position !== indexRef.current) {
      indexRef.current = position;
      onChangeRef.current(position);
    }
  };

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      landing.current?.();
      landing.current = null;
    },
    []
  );

  // Level 2 of ADR-0018 (R2b): the first touch of the pager draws the neighbours (it can only be
  // the beginning of a swipe or of a widget drag), before the finger has moved far enough to show
  // one. They go again when the finger is up and no scroll is running: after TOUCH_HOLD_MS, or at
  // the stop of the scroll that followed (see onScroll).
  const touch = useRef<{
    down: boolean;
    timer: ReturnType<typeof setTimeout> | null;
    off: (() => void) | null;
  }>({ down: false, timer: null, off: null });
  const letGo = useCallback(() => {
    const now = touch.current;
    if (now.timer) clearTimeout(now.timer);
    now.timer = null;
    if (!now.down) setTouching(false);
  }, []);
  const release = useCallback(() => {
    const now = touch.current;
    now.down = false;
    now.off?.();
    now.off = null;
    if (now.timer) clearTimeout(now.timer);
    now.timer = setTimeout(() => {
      now.timer = null;
      // A scroll is running: its stop lets the neighbours go.
      if (!settleTimer.current && !reachRef.current) setTouching(false);
    }, TOUCH_HOLD_MS);
  }, []);
  const touchStart = (event: PointerEvent<HTMLDivElement>) => {
    // A mouse does not swipe the row, and a press in the overview moves no page.
    if (!skipNear || latest.current.shrunk || event.pointerType === 'mouse') return;
    const target = event.target as HTMLElement;
    // The bands under the bars are not the pager's area: a press there does nothing.
    if (
      (target === event.currentTarget || target.classList.contains('aca-pager__surface')) &&
      inBand(event.currentTarget, event.clientY)
    ) {
      return;
    }
    const now = touch.current;
    if (now.timer) clearTimeout(now.timer);
    now.timer = null;
    now.down = true;
    setTouching(true);
    if (!now.off) {
      window.addEventListener('pointerup', release, true);
      window.addEventListener('pointercancel', release, true);
      now.off = () => {
        window.removeEventListener('pointerup', release, true);
        window.removeEventListener('pointercancel', release, true);
      };
    }
  };
  useEffect(
    () => () => {
      const now = touch.current;
      now.off?.();
      now.off = null;
      if (now.timer) clearTimeout(now.timer);
      now.timer = null;
    },
    []
  );

  /** Widens the reach to the position of the scroll and the way it goes (ISSUE-109, R2). */
  const follow = (left: number, clientWidth: number) => {
    const width = rest.current.width || clientWidth;
    if (width <= 0) return;
    const position = left / width;
    const before = trail.current ?? indexRef.current;
    trail.current = position;
    const prior = reachRef.current;
    const moved = Math.abs(position - before) > 0.0005;
    let dir: -1 | 0 | 1 = moved ? (position > before ? 1 : -1) : (prior?.dir ?? 0);
    // The last scroll events of a snap overshoot and come back by a hair (2.003, 1.998, 2.0): that is
    // the rounding of the landing, not a turn of the finger, and flipping the direction made the
    // window swap its spare page twice after each landing (two restyles at +146 and +205 ms,
    // tracing of 2026-10-24). A turn counts when it goes further than a tenth of a page, or when
    // the position is not at a page.
    if (
      prior &&
      prior.dir !== 0 &&
      dir === -prior.dir &&
      Math.abs(position - before) <= TURN_PAGES &&
      Math.abs(position - Math.round(position)) <= AT_PAGE_PAGES
    ) {
      dir = prior.dir;
    }
    // A glide to a known page, still on its way there, needs no page ahead of the one it reaches.
    const aim = glideTo.current;
    if (aim !== null && dir !== 0 && (aim - position) * dir >= 0) dir = 0;
    // A little room for the rounding of the scroll offset, which is rarely exact at a page.
    const lo = Math.min(Math.floor(position + 0.001), prior?.lo ?? Infinity);
    const hi = Math.max(Math.ceil(position - 0.001), prior?.hi ?? -Infinity);
    // On the page it rests on, going nowhere: nothing to widen.
    if (!prior && dir === 0 && lo === indexRef.current && hi === indexRef.current) return;
    setReach({ lo, hi, dir });
  };

  /** The window around the page the scroll rests on, with nothing left of the gesture. */
  const narrow = () => {
    landing.current = null;
    if (settleTimer.current || latest.current.shrunk) return;
    setReach(null);
    setRested(indexRef.current);
    letGo();
  };

  const onScroll = () => {
    const element = ref.current;
    if (latest.current.shrunk) {
      // Focus or a browser scroll must not move what rests on the base page.
      if (element) {
        rest.current.left = latest.current.base * element.clientWidth;
        element.scrollLeft = rest.current.left;
      }
      return;
    }
    // The window follows the scroll from its first event, not from the page it settles on, which
    // the index shows only once it has stopped (ISSUE-109, R2).
    if (element) follow(element.scrollLeft, element.clientWidth);
    // A gesture that begins before the window has narrowed to the page the last one landed on:
    // the narrowing waits for this one to land too.
    landing.current?.();
    landing.current = null;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      // Read once the scroll has stopped, not at every event (that would force a layout in each).
      if (ref.current) rest.current.left = ref.current.scrollLeft;
      // The scroll has stopped. What it crossed stays drawn for now (the window narrows later, see
      // below): the index that follows (the same batch) is the page it stopped on, and the commit
      // that carries it changes no window.
      trail.current = null;
      glideTo.current = null;
      letGo();
      const settled = Math.max(
        0,
        Math.min(pages.length - 1, settledIndexOf(ref.current, indexRef.current))
      );
      if (settled !== indexRef.current) {
        indexRef.current = settled;
        onChangeRef.current(settled);
      }
      // The window narrows to the page the scroll landed on: the page left behind is skipped, when
      // nothing moves (REP-20261023-006, 0.9.28): after the landing of the indicator, at an idle
      // moment. The pages it needs were drawn by the gesture, so nothing is unlocked here. A scroll
      // that begins first cancels it (onScroll), and the next landing asks for it again.
      landing.current?.();
      landing.current = whenIdle(narrow);
    }, SETTLE_MS);
  };

  return (
    <div
      {...props}
      ref={(node) => {
        ref.current = node;
        containerRef?.(node);
      }}
      className={[
        'aca-pager',
        locked && 'is-locked',
        visualOverview && 'is-overview',
        closingMotion && 'is-closing',
        entering && 'is-entering',
        settling && 'is-settling',
        cardDrag && 'is-card-dragging',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onScroll={onScroll}
      onPointerDownCapture={touchStart}
      onFocus={onFocusCard}
      onTransitionEnd={onTransitionEnd}
      onPointerDown={(event) => {
        // The bands under the bars are the pager's padding, not its area: a press there does nothing.
        const target = event.target as HTMLElement;
        const onPager =
          target === event.currentTarget || target.classList.contains('aca-pager__surface');
        if (onPager && inBand(event.currentTarget, event.clientY)) return;
        onPointerDown?.(event);
        pan(event);
      }}
    >
      {/* The gaps between the cards (launcher.css, .aca-pager__surface): where the base page rests. */}
      {shrunk && (
        <div className="aca-pager__surface" aria-hidden="true" style={{ left: `${base * 100}%` }} />
      )}
      {pages.map((page, position) => {
        const off = position !== index;
        const style: CardStyle = {
          '--aca-o': String(position - base),
          '--aca-d': String(position - index),
          ...(cardDrag
            ? {
                '--aca-card-shift': String(shiftOf(position, cardDrag)),
                ...(position === cardDrag.from
                  ? { '--aca-card-drag': `${cardDrag.offset}px` }
                  : {}),
              }
            : {}),
        };
        return (
          <section
            key={page.key}
            className={[
              'aca-pager__page',
              !off && 'is-current',
              current.fresh.includes(page.key) && 'is-new',
              overview && page.hidden && 'is-hidden',
              pressingCard === position && 'is-pressing',
              cardDrag?.from === position && 'is-lifted',
              leavingKey === page.key && 'is-leaving',
            ]
              .filter(Boolean)
              .join(' ')}
            style={style}
            // Skipped by the browser (launcher.css): out of the window of the pages drawn.
            data-far={position < firstDrawn || position > lastDrawn ? '' : undefined}
            // Not the current page: its widgets and cells run no transition (launcher.css). An
            // attribute of the page that depends only on which page is current, so that it is
            // written when the page changes and never in a scene (opening, «Fine», settling): a
            // write on nine pages restyled 1100 elements at the end of the wait and again at the end
            // of the settling (tracing of 2026-10-24, G2). The page just left gets it after the
            // landing (leftKey above).
            data-quiet={
              (off && page.key !== leftKey) || (!off && page.key === arrivingKey) ? '' : undefined
            }
            aria-label={page.label}
            // In the overview every card is in reach (its opener and controls); the content never.
            aria-hidden={(!overview && off) || undefined}
            inert={(!overview && off) || undefined}
          >
            {/*
              Out of reach while the cards are shown and while they go back (REP-20261019-002):
              the page no longer carries the pointer style, so this is what keeps the content
              from taking a press during the glide (launcher.css, .aca-pager__page).
            */}
            <div className="aca-pager__body" inert={shrunk || undefined}>
              {/* Clips the page as a card; the shadow of the card is the body's (launcher.css). */}
              <div className="aca-pager__clip">
                <PageVisibilityContext.Provider value={visible && !off}>
                  <PageNearContext.Provider value={Math.abs(position - index) <= 1}>
                    {page.content}
                  </PageNearContext.Provider>
                </PageVisibilityContext.Provider>
              </div>
            </div>
            {/*
              The opener and the controls stay while the cards go back, out of reach (inert), so the
              controls can fade out on their own time instead of vanishing at the commit (D-M3).
            */}
            {(overview || closing) && (
              <>
                <button
                  type="button"
                  className="aca-pager__open"
                  inert={!overview || undefined}
                  aria-label={`Apri ${page.label}${page.main ? ', principale' : ''}${
                    page.hidden ? ', nascosta' : ''
                  }`}
                  onClick={() => onOpen?.(position)}
                  onPointerDown={(event) => {
                    if (event.button === 0) onCardPointerDown?.(position, event);
                  }}
                  // Touch browsers open their menu on a long press: the card uses the gesture.
                  onContextMenu={(event) => event.preventDefault()}
                  onKeyDown={(event) => {
                    if (!event.altKey) return;
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    // Held on every card, the cover too (onMoveCard says why it stays): the
                    // browser would go back a page.
                    event.preventDefault();
                    onMoveCard?.(position, event.key === 'ArrowLeft' ? -1 : 1);
                  }}
                />
                <div className="aca-pager__footer" inert={!overview || undefined}>
                  {!off && cardFooter ? (
                    cardFooter(position)
                  ) : (
                    // A tap on the name of a side card brings it to the centre, where the bar
                    // of the pages renames it; the opener above already says its name.
                    <span
                      className="aca-pager__name"
                      aria-hidden="true"
                      onClick={() => onIndexChange(position)}
                    >
                      {page.label}
                    </span>
                  )}
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
