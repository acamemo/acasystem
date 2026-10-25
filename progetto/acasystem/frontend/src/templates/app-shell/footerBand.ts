import { useLayoutEffect, type RefObject } from 'react';

/**
 * Density of the edit bar in the footer band (REP-20261007-001, V-01, V-05, V-06), from the
 * richest to the leanest:
 * - `text`: buttons with their name («Widget», «Pagine»);
 * - `short` and `icons`: round icon buttons, the name in aria-label and title. Since the cover
 *   setting left the bar (REP-20261008-001) the two show the same; the steps stay unchanged.
 */
export type BandDensity = 'text' | 'short' | 'icons';

export const BAND_DENSITIES: readonly BandDensity[] = ['text', 'short', 'icons'];

/**
 * The two bars that share the band (REP-20261013-002, ADR-0013): the edit bar and the status
 * bar. Only one is visible at a time; each is marked data-band-bar and its two pills
 * data-band-group="start" and "end". The edit bar is also found without the marks.
 */
export type BandBarKind = 'edit' | 'status';

/** What differs from one bar to the other in the way the band fits it. */
export interface BandBarOptions {
  /**
   * The page name keeps its minimum (`labelMin`) next to the indicator, and the end group a
   * `labelGap` after it: the edit bar, whose end group follows the name. Not the status bar.
   */
  keepsName: boolean;
  /**
   * The indicator is measured with the widest name allowed, so the fit does not depend on the
   * page shown (the status bar stays on screen while the pages change).
   */
  widestName: boolean;
  /** Start of the key of the remembered fit; the edit bar keeps the key it always had. */
  keyPrefix: string;
}

export const BAND_BARS: Record<BandBarKind, BandBarOptions> = {
  edit: { keepsName: true, widestName: false, keyPrefix: '' },
  status: { keepsName: false, widestName: true, keyPrefix: 'status:' },
};

/** Widest page name under the indicator (rem), as the indicator's CSS allows it. */
const NAME_MAX_REM = 14;

/** Widths (px) of the two groups of the bar at one density: start and end («Pagine»). */
export interface BandGroups {
  actions: number;
  end: number;
}

/** What the band needs to know, in px, measured on the page (see applyFooterBand). */
export interface BandMeasures {
  /** Content width of the band, inside the gutters. */
  width: number;
  /** 1: indicator and edit bar share the row; 2: the edit bar has its own row. */
  rows: 1 | 2;
  /** Gap between the columns of the band (one row). */
  gap: number;
  /** Gap between the two groups when the edit bar has its own row. */
  groupGap: number;
  /** Width of the indicator as the band would show it without the edit bar. */
  indicator: number;
  /** Minimum readable width of the page name next to the indicator. */
  labelMin: number;
  /**
   * Narrowest the groove can be made: its stops at the size of the ball (0: not known). The
   * indicator takes that much even when the fit leaves it less.
   */
  indicatorMin?: number;
  /** Gap between the page name and the end group of the bar. */
  labelGap: number;
  groups: Record<BandDensity, BandGroups>;
  /** Leanest density already chosen for this width and number of pages: never go back richer. */
  floor?: BandDensity;
}

export interface BandFit {
  density: BandDensity;
  /** Room (px) for the indicator when it has to be narrower than its natural width. */
  room: number | null;
  /** Room (px) kept after the page name for the end group and its gap (one row only). */
  end: number | null;
}

/**
 * Chooses how the edit bar shares the band with the page indicator.
 * - One row: the indicator stays centred, so each side gets half of what it leaves. The actions
 *   fill the start side; the page name (at least `labelMin`) and the end group the end side.
 *   The richest density that fits wins; when even the icons do not fit, the indicator gets
 *   narrower (its stops shrink) before the page name goes under its minimum.
 * - Two rows: the edit bar has the whole second row; the richest density whose groups fit.
 */
export function fitBand(input: BandMeasures, options?: Pick<BandBarOptions, 'keepsName'>): BandFit {
  // A bar that does not keep the page name has no minimum for it and no gap after it.
  const m = options?.keepsName === false ? { ...input, labelMin: 0, labelGap: 0 } : input;
  const first = m.floor ? BAND_DENSITIES.indexOf(m.floor) : 0;
  const candidates = BAND_DENSITIES.slice(Math.max(0, first));
  const leanest: BandDensity = 'icons';

  if (m.rows === 2) {
    const density =
      candidates.find((d) => m.groups[d].actions + m.groupGap + m.groups[d].end <= m.width) ??
      leanest;
    return { density, room: null, end: null };
  }

  const side = (indicator: number) => (m.width - indicator - 2 * m.gap) / 2;
  const need = (d: BandDensity) =>
    Math.max(m.groups[d].actions, m.groups[d].end + m.labelGap + m.labelMin);
  const end = (d: BandDensity) => Math.ceil(m.groups[d].end + m.labelGap);

  const roomy = candidates.find((d) => side(m.indicator) >= need(d));
  if (roomy) return { density: roomy, room: null, end: end(roomy) };
  const room = Math.max(0, Math.floor(m.width - 2 * m.gap - 2 * need(leanest)));
  return { density: leanest, room, end: end(leanest) };
}

/**
 * Largest width (px) of a pill on each side of the indicator, for a bar whose pills are not
 * placed by the columns of the band (--aca-band-side); null where the bar has its own row.
 * When the indicator had to be made narrower, the side is what is left around the groove at its
 * narrowest, not around the widest page name: the pills get what `fitBand` left them, and give
 * way (the word of the connection first) only when the groove cannot shrink further
 * (REP-20261013-002, review of stage 3, round 2).
 */
export function bandSide(m: BandMeasures, fit: BandFit): number | null {
  if (m.rows === 2) return null;
  const indicator = fit.room === null ? m.indicator : Math.max(fit.room, m.indicatorMin ?? 0);
  return Math.max(0, Math.floor((m.width - indicator - 2 * m.gap) / 2));
}

/** Memory of one band: the leanest density used at the current width and number of pages. */
export interface BandMemory {
  key: string;
  floor?: BandDensity;
}

/** Converts a computed custom property in px or rem («1.5rem», «24px») to px. */
export function lengthToPx(value: string, rootFontSize: number): number {
  const text = value.trim();
  const amount = Number.parseFloat(text);
  if (!Number.isFinite(amount)) return 0;
  return text.endsWith('rem') ? amount * rootFontSize : amount;
}

const width = (element: Element) => element.getBoundingClientRect().width;

const BAR = ':scope > [data-band-bar], :scope > .aca-edit-toolbar';
const BAR_OF = '[data-band-bar], .aca-edit-toolbar';
/**
 * The parts of a group that take what the pill leaves (the chips, the note of a special page),
 * or change often: never measured.
 */
const FLEX_PART = '[data-band-flex], [data-band-clock]';
const START = ':scope > [data-band-group="start"], :scope > .aca-edit-toolbar__actions';
const END = ':scope > [data-band-group="end"], :scope > .aca-edit-toolbar__pages';

/** Largest pill at each side of the indicator: written on the status bar itself (see writeBand). */
const SIDE = '--aca-band-side';

const kindOf = (bar: HTMLElement): BandBarKind =>
  bar.dataset.bandBar === 'status' ? 'status' : 'edit';

/** A bar out of its mode waits below the screen, inert: it takes no room from the indicator. */
const isHidden = (bar: HTMLElement) => bar.matches('[inert], [class*="--hidden"]');

const groupsOf = (bar: HTMLElement) =>
  [bar.querySelector<HTMLElement>(START), bar.querySelector<HTMLElement>(END)] as const;

/**
 * What the band writes (REP-20261013-002, review of stage 2): densities, room, end and the side
 * of the bars. The widths of the groups follow these, so a change of them is not a change of
 * content.
 */
const bandState = (footer: HTMLElement) =>
  [
    footer.dataset.bandDensity,
    ...['--aca-band-room', '--aca-band-end'].map((name) => footer.style.getPropertyValue(name)),
    ...Array.from(
      footer.querySelectorAll<HTMLElement>(BAR_OF),
      (bar) => `${bar.dataset.bandDensity}/${bar.style.getPropertyValue(SIDE)}`
    ),
  ].join('|');

/** What the band reads from the page and does not change while its width stays the same. */
interface BandGeometry {
  clientWidth: number;
  /** Content width of the band, inside the gutters (0 or less: no layout). */
  content: number;
  rows: 1 | 2;
  /** Gap between the columns of the band. */
  gap: number;
  /** Root font size, px. */
  root: number;
  labelGap: number;
}

/** What a measure of one bar sets on the band. */
interface BandApplied {
  density: BandDensity;
  room: number | null;
  end: number | null;
  side: number | null;
}

/**
 * The fits already measured, by key and bar (REP-20261013-002, stage 2): with two bars in the
 * band, showing one and hiding the other goes back and forth over the same keys, and a measure
 * forces the layout of the page (about 17 ms for three densities). An entry is dropped when its
 * bar changes what it is made of (childList), when a measured part of a group changes size
 * (ResizeObserver, which also sees the changes of text) and for every new font. The chips and the
 * clock are not measured parts: they take what the pill leaves, or change at every minute.
 */
interface BandCache {
  geometry?: BandGeometry;
  fits: Map<string, { kind: BandBarKind; applied: BandApplied }>;
}

const caches = new WeakMap<BandMemory, BandCache>();
const MAX_FITS = 16;

function cacheOf(memory: BandMemory): BandCache {
  let cache = caches.get(memory);
  if (!cache) {
    cache = { fits: new Map() };
    caches.set(memory, cache);
  }
  return cache;
}

/** Drops the remembered fits of one bar, or of both. */
function dropFits(memory: BandMemory, kind?: BandBarKind): void {
  const fits = caches.get(memory)?.fits;
  if (!fits) return;
  for (const [key, entry] of fits) if (!kind || entry.kind === kind) fits.delete(key);
}

/** Forgets everything measured, density included: new fonts change every width. */
export function resetBandMemory(memory: BandMemory): void {
  memory.key = '';
  memory.floor = undefined;
  caches.delete(memory);
}

/**
 * What a mutation changes in the band: nothing it measures (null), the footer itself, the
 * indicator, or one bar. The classes of the dots at a page change, or the name in the bar of
 * the overview, leave the widths as they were, and measuring for them would force the layout
 * of the whole page (REP-20261012-003). Nor do the chips of the status bar (data-band-flex:
 * they scroll, they take what the pill leaves) and its clock (data-band-clock), which change
 * every few seconds and every minute.
 */
function changedBand(
  footer: HTMLElement,
  record: MutationRecord
): HTMLElement | 'footer' | 'indicator' | null {
  const target = record.target;
  if (!(target instanceof Element)) return 'footer';
  if (target.closest(FLEX_PART)) return null;
  if (record.type === 'attributes') return target.matches(BAR_OF) ? (target as HTMLElement) : null;
  if (target === footer) return 'footer';
  const bar = target.closest<HTMLElement>(BAR_OF);
  if (bar) return bar;
  return target.closest('.aca-indicator') ? 'indicator' : null;
}

/** Sets a length in px on an element, or removes it; nothing is written when it is as it was. */
function setPx(element: HTMLElement, name: string, value: number | null): void {
  const next = value === null ? '' : `${value}px`;
  if (element.style.getPropertyValue(name) === next) return;
  if (next) element.style.setProperty(name, next);
  else element.style.removeProperty(name);
}

/**
 * Density of the bar that is measured. It is written on the bar, which keeps it while it sinks
 * (the bar that leaves must not change density under the one that arrives), and, for the edit
 * bar, also on the band, as it always was. The status bar clears the one on the band.
 */
function setDensity(footer: HTMLElement, bar: HTMLElement, density: BandDensity): void {
  bar.dataset.bandDensity = density;
  if (kindOf(bar) === 'edit') footer.dataset.bandDensity = density;
  else delete footer.dataset.bandDensity;
}

function readGeometry(footer: HTMLElement, view: Window): BandGeometry {
  const style = view.getComputedStyle(footer);
  const clientWidth = footer.clientWidth;
  const root =
    Number.parseFloat(view.getComputedStyle(footer.ownerDocument.documentElement).fontSize) || 16;
  return {
    clientWidth,
    content:
      clientWidth -
      (Number.parseFloat(style.paddingLeft) || 0) -
      (Number.parseFloat(style.paddingRight) || 0),
    rows: style.getPropertyValue('--aca-band-rows').trim() === '2' ? 2 : 1,
    gap: Number.parseFloat(style.columnGap) || 0,
    root,
    labelGap: lengthToPx(style.getPropertyValue('--aca-band-label-gap'), root),
  };
}

/** Measures the visible bar at every density and fits it (the layout is read here). */
function measureBar(
  footer: HTMLElement,
  bar: HTMLElement,
  view: Window,
  geometry: BandGeometry,
  floor: BandDensity | undefined
): BandApplied {
  const kind = kindOf(bar);
  const options = BAND_BARS[kind];
  const [start, end] = groupsOf(bar);
  const indicator = footer.querySelector<HTMLElement>(':scope > .aca-indicator');

  footer.dataset.bandMeasure = '';
  const groups = {} as Record<BandDensity, BandGroups>;
  for (const density of BAND_DENSITIES) {
    setDensity(footer, bar, density);
    groups[density] = { actions: start ? width(start) : 0, end: end ? width(end) : 0 };
  }
  delete footer.dataset.bandMeasure;

  let indicatorWidth = indicator ? width(indicator) : 0;
  let name = 0;
  let indicatorMin = 0;
  if (indicator && options.widestName) {
    const track = indicator.querySelector('.aca-indicator__track');
    name = Math.min(geometry.content, NAME_MAX_REM * geometry.root);
    indicatorWidth = Math.min(
      geometry.content,
      Math.max((track ? width(track) : 0) || indicatorWidth, name)
    );
    if (track) {
      // The groove at its narrowest: every stop the size of the ball, inside the track padding.
      const style = view.getComputedStyle(track);
      const stops = indicator.querySelectorAll('.aca-indicator__dot').length;
      indicatorMin =
        stops * lengthToPx(style.getPropertyValue('--aca-ball'), geometry.root) +
        2 * lengthToPx(style.getPropertyValue('--aca-pad'), geometry.root);
    }
  }
  const measures: BandMeasures = {
    width: geometry.content,
    rows: geometry.rows,
    gap: geometry.gap,
    groupGap: Number.parseFloat(view.getComputedStyle(bar).columnGap) || 0,
    indicator: indicatorWidth,
    indicatorMin,
    labelMin: indicator
      ? lengthToPx(
          view.getComputedStyle(indicator).getPropertyValue('--aca-label-min'),
          geometry.root
        )
      : 0,
    labelGap: geometry.labelGap,
    groups,
    floor,
  };
  const fit = fitBand(measures, options);
  return {
    density: fit.density,
    room: fit.room,
    // What follows the page name is the edit bar's; the status bar has no name to keep.
    end: options.keepsName ? fit.end : null,
    side: kind === 'status' ? bandSide(measures, fit) : null,
  };
}

function writeBand(footer: HTMLElement, bar: HTMLElement | null, applied: BandApplied | null) {
  if (bar && applied) setDensity(footer, bar, applied.density);
  setPx(footer, '--aca-band-room', applied?.room ?? null);
  setPx(footer, '--aca-band-end', applied?.end ?? null);
  // The side stays on the status bar when it sinks (REP-20261013-002, review of stage 3): its
  // pills are still on screen for a moment and must keep their width while they go; the next
  // measure of the bar replaces it. Only the status bar has one.
  if (bar && applied && kindOf(bar) === 'status') setPx(bar, SIDE, applied.side);
}

/**
 * Measures the band and applies the fit of the visible bar (the edit bar or the status bar,
 * marked data-band-bar; the other waits below the screen): data-band-density on the bar (and,
 * for the edit bar, on the band), --aca-band-room (room of the indicator) and --aca-band-end
 * (what follows the page name) as inline properties on the band, and --aca-band-side (largest
 * pill at each side of the indicator) inline on the status bar. The groups are measured at every density in one
 * go, before paint (data-band-measure gives them their natural width); nothing is applied when
 * the band has no layout (jsdom, hidden). A fit already measured under the same key is applied
 * again without reading the layout (BandCache).
 */
export function applyFooterBand(footer: HTMLElement, memory: BandMemory): void {
  // A hidden bar (out of its mode, REP-20261007-018) takes no room from the indicator.
  const bar = Array.from(footer.querySelectorAll<HTMLElement>(BAR)).find((b) => !isHidden(b));
  const [start, end] = bar ? groupsOf(bar) : [];
  if (!bar || !start || !end) {
    writeBand(footer, null, null);
    delete footer.dataset.bandDensity;
    return;
  }

  const view = footer.ownerDocument.defaultView;
  if (!view) {
    writeBand(footer, null, null);
    return;
  }
  const cache = cacheOf(memory);
  if (cache.geometry?.clientWidth !== footer.clientWidth) {
    cache.geometry = readGeometry(footer, view);
    cache.fits.clear();
  }
  const geometry = cache.geometry;
  if (!(geometry.content > 0)) {
    writeBand(footer, null, null);
    return;
  }

  const kind = kindOf(bar);
  const steps = footer.querySelectorAll(':scope > .aca-indicator .aca-indicator__dot').length;
  // The bar may say what else changes its widths without changing its content (data-band-key).
  const phase = bar.dataset.bandKey ? `:${bar.dataset.bandKey}` : '';
  const key = `${BAND_BARS[kind].keyPrefix}${geometry.rows}:${Math.round(geometry.content)}:${steps}${phase}`;
  if (memory.key !== key) {
    memory.key = key;
    memory.floor = undefined;
  }
  // The edit bar measures the indicator with the name of the page shown: the fit depends on it.
  const name = BAND_BARS[kind].widestName
    ? ''
    : (footer.querySelector(':scope > .aca-indicator .aca-indicator__label')?.textContent ?? '');
  const fitKey = name ? `${key}|${name}` : key;
  let remembered = cache.fits.get(fitKey);
  // A fit richer than the floor of this key is not used: swiping in edit mode never goes back to
  // a richer density (REP-20261013-002, review of stage 2); it is measured again with the floor.
  if (
    remembered &&
    memory.floor &&
    BAND_DENSITIES.indexOf(remembered.applied.density) < BAND_DENSITIES.indexOf(memory.floor)
  ) {
    remembered = undefined;
  }
  if (!remembered) {
    // As the page would show it without the last fit: a room left over narrows the indicator.
    writeBand(footer, null, null);
    remembered = { kind, applied: measureBar(footer, bar, view, geometry, memory.floor) };
    if (cache.fits.size >= MAX_FITS) cache.fits.clear();
    cache.fits.set(fitKey, remembered);
  }
  memory.floor = remembered.applied.density;
  writeBand(footer, bar, remembered.applied);
}

/** The bar the band fits (the first that is not out of its mode), or null when none is shown. */
const shownBar = (footer: HTMLElement): HTMLElement | null =>
  Array.from(footer.querySelectorAll<HTMLElement>(BAR)).find((bar) => !isHidden(bar)) ?? null;

/**
 * Keeps the band fitted: when its content changes (edit mode, page, number of pages), when its
 * width changes and when the fonts arrive. Resize observations are delivered before paint, and
 * measured at once. A change in the tree is measured in the next frame, before it is drawn
 * (requestAnimationFrame runs ahead of the style and the layout of the frame): the change
 * comes from an event or a timer, and measuring in its own microtask forced the whole page to
 * restyle in the click that started a view change (about 150 ms with the page overview open on
 * the Tab M11, ISSUE-062, REP-20261019-002) before the transitions had started. The bar never
 * shows a state that does not fit. A change of class that leaves the same bar shown measures
 * nothing. New fonts change every text width: the remembered density and fits are dropped and
 * the bar measured again. A bar that is out of its mode is not measured: its fits are dropped and
 * it is measured when it comes back.
 */
export function useFooterBand(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const footer = ref.current;
    if (!footer) return undefined;
    const memory: BandMemory = { key: '' };
    let active = true;
    // The measure that waits for the next frame, and the bar the last measure was made for.
    let frame = 0;
    let measuredFor: HTMLElement | null = null;
    const update = () => {
      if (!active) return;
      // A measure made now takes the place of the one that was waiting.
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      const before = bandState(footer);
      applyFooterBand(footer, memory);
      measuredFor = shownBar(footer);
      // What the band wrote moves the widths it watches: they are observed anew, so their next
      // size is the one at the measure and not a change of content (no second measure).
      if (bandState(footer) !== before) rebase();
    };
    /** Measures before the next frame is drawn (at once where there are no frames). */
    const updateNextFrame = () => {
      if (typeof requestAnimationFrame !== 'function') {
        update();
        return;
      }
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    const remeasure = () => {
      resetBandMemory(memory);
      update();
    };
    // A change of text inside a group is not a mutation of the tree: its size says it. What the
    // band then writes changes the size of parts at the same depth as the observed ones, so the
    // browser reports «ResizeObserver loop completed with undelivered notifications» once per
    // such change: it only reaches window.onerror (no console, no pageerror), and the parts are
    // observed anew (rebase) so nothing is measured twice. The measure stays before paint.
    const sizes = new WeakMap<Element, number>();
    const watched = new Set<Element>();
    const groupResize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver((entries) => {
            let measure = false;
            for (const entry of entries) {
              const last = sizes.get(entry.target);
              sizes.set(entry.target, entry.contentRect.width);
              const bar = entry.target.closest<HTMLElement>(BAR_OF);
              // The first observation of a group is its size at the measure, not a change.
              if (last === undefined || last === entry.contentRect.width || !bar) continue;
              dropFits(memory, kindOf(bar));
              if (!isHidden(bar)) measure = true;
            }
            if (measure) update();
          });
    // The parts of the groups that are measured: not the chips nor the clock.
    const watchGroups = () => {
      if (!groupResize) return;
      const parts = new Set<Element>();
      for (const bar of footer.querySelectorAll<HTMLElement>(BAR)) {
        for (const group of groupsOf(bar)) {
          for (const part of group?.children ?? []) if (!part.matches(FLEX_PART)) parts.add(part);
        }
      }
      for (const part of watched) {
        if (parts.has(part)) continue;
        groupResize.unobserve(part);
        watched.delete(part);
      }
      for (const part of parts) {
        if (watched.has(part)) continue;
        groupResize.observe(part);
        watched.add(part);
      }
    };
    function rebase() {
      if (!groupResize) return;
      for (const part of watched) {
        sizes.delete(part);
        groupResize.unobserve(part);
        groupResize.observe(part);
      }
    }
    update();
    watchGroups();
    const mutations = new MutationObserver((records) => {
      let measure = false;
      let classes = false;
      for (const record of records) {
        const change = changedBand(footer, record);
        if (!change) continue;
        if (change === 'footer') dropFits(memory);
        else if (change !== 'indicator' && record.type === 'childList') {
          dropFits(memory, kindOf(change));
        }
        if (record.type === 'attributes') {
          // The class of a bar says whether it is shown: it matters if another bar is now shown.
          classes = true;
        } else if (typeof change === 'string' || !isHidden(change)) {
          // A bar out of its mode is measured when it comes back, unless this is that change.
          measure = true;
        }
      }
      if (classes && !measure && shownBar(footer) !== measuredFor) measure = true;
      if (measure) updateNextFrame();
      watchGroups();
    });
    // Classes too: the bars stay mounted and are shown or hidden by a class.
    mutations.observe(footer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resize?.observe(footer);
    const fonts: FontFaceSet | undefined = footer.ownerDocument.fonts;
    fonts?.addEventListener('loadingdone', remeasure);
    void fonts?.ready.then(remeasure);
    return () => {
      active = false;
      if (frame) cancelAnimationFrame(frame);
      mutations.disconnect();
      groupResize?.disconnect();
      resize?.disconnect();
      fonts?.removeEventListener('loadingdone', remeasure);
    };
  }, [ref]);
}
