import { useLayoutEffect, type RefObject } from 'react';

/**
 * Density of the edit bar in the footer band (REP-20261007-001, V-01, V-05, V-06), from the
 * richest to the leanest:
 * - `text`: buttons with their name, the cover setting with icon and «Mostra copertina»;
 * - `short`: icon buttons, the cover setting with its short visible name «Mostra»;
 * - `icons`: icon buttons, the cover setting with its icon only.
 */
export type BandDensity = 'text' | 'short' | 'icons';

export const BAND_DENSITIES: readonly BandDensity[] = ['text', 'short', 'icons'];

/** Widths (px) of the two groups of the edit bar at one density. */
export interface BandGroups {
  actions: number;
  cover: number;
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
  /** Gap between the page name and the cover setting. */
  labelGap: number;
  groups: Record<BandDensity, BandGroups>;
  /** Leanest density already chosen for this width and number of pages: never go back richer. */
  floor?: BandDensity;
}

export interface BandFit {
  density: BandDensity;
  /** Room (px) for the indicator when it has to be narrower than its natural width. */
  room: number | null;
  /** Room (px) kept after the page name for the cover setting and its gap (one row only). */
  end: number | null;
}

/**
 * Chooses how the edit bar shares the band with the page indicator.
 * - One row: the indicator stays centred, so each side gets half of what it leaves. The actions
 *   fill the start side; the page name (at least `labelMin`) and the cover setting the end side.
 *   The richest density that fits wins; when even the icons do not fit, the indicator gets
 *   narrower (its stops shrink) before the page name goes under its minimum.
 * - Two rows: the edit bar has the whole second row; the richest density whose groups fit.
 */
export function fitBand(m: BandMeasures): BandFit {
  const first = m.floor ? BAND_DENSITIES.indexOf(m.floor) : 0;
  const candidates = BAND_DENSITIES.slice(Math.max(0, first));
  const leanest: BandDensity = 'icons';

  if (m.rows === 2) {
    const density =
      candidates.find((d) => m.groups[d].actions + m.groupGap + m.groups[d].cover <= m.width) ??
      leanest;
    return { density, room: null, end: null };
  }

  const side = (indicator: number) => (m.width - indicator - 2 * m.gap) / 2;
  const need = (d: BandDensity) =>
    Math.max(m.groups[d].actions, m.groups[d].cover + m.labelGap + m.labelMin);
  const end = (d: BandDensity) => Math.ceil(m.groups[d].cover + m.labelGap);

  const roomy = candidates.find((d) => side(m.indicator) >= need(d));
  if (roomy) return { density: roomy, room: null, end: end(roomy) };
  const room = Math.max(0, Math.floor(m.width - 2 * m.gap - 2 * need(leanest)));
  return { density: leanest, room, end: end(leanest) };
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

/**
 * Measures the band and applies the fit: data-band-density on the band, --aca-band-room (room
 * of the indicator) and --aca-band-end (what follows the page name) as inline properties. The
 * groups are measured at every density in one go, before paint (data-band-measure gives them
 * their natural width); nothing is applied when the band has no layout (jsdom, hidden).
 */
export function applyFooterBand(footer: HTMLElement, memory: BandMemory): void {
  const toolbar = footer.querySelector<HTMLElement>(':scope > .aca-edit-toolbar');
  const actions = toolbar?.querySelector<HTMLElement>(':scope > .aca-edit-toolbar__actions');
  const cover = toolbar?.querySelector<HTMLElement>(':scope > .aca-edit-toolbar__cover');
  footer.style.removeProperty('--aca-band-room');
  footer.style.removeProperty('--aca-band-end');
  if (!toolbar || !actions || !cover) {
    delete footer.dataset.bandDensity;
    return;
  }

  const view = footer.ownerDocument.defaultView;
  if (!view) return;
  const style = view.getComputedStyle(footer);
  const content =
    footer.clientWidth -
    (Number.parseFloat(style.paddingLeft) || 0) -
    (Number.parseFloat(style.paddingRight) || 0);
  if (!(content > 0)) return;
  const root =
    Number.parseFloat(view.getComputedStyle(footer.ownerDocument.documentElement).fontSize) || 16;
  const rows = style.getPropertyValue('--aca-band-rows').trim() === '2' ? 2 : 1;
  const indicator = footer.querySelector<HTMLElement>(':scope > .aca-indicator');

  footer.dataset.bandMeasure = '';
  const groups = {} as Record<BandDensity, BandGroups>;
  for (const density of BAND_DENSITIES) {
    footer.dataset.bandDensity = density;
    groups[density] = { actions: width(actions), cover: width(cover) };
  }
  delete footer.dataset.bandMeasure;

  const steps = indicator?.querySelectorAll('.aca-indicator__dot').length ?? 0;
  const key = `${rows}:${Math.round(content)}:${steps}`;
  if (memory.key !== key) {
    memory.key = key;
    memory.floor = undefined;
  }
  const fit = fitBand({
    width: content,
    rows,
    gap: Number.parseFloat(style.columnGap) || 0,
    groupGap: Number.parseFloat(view.getComputedStyle(toolbar).columnGap) || 0,
    indicator: indicator ? width(indicator) : 0,
    labelMin: indicator
      ? lengthToPx(view.getComputedStyle(indicator).getPropertyValue('--aca-label-min'), root)
      : 0,
    labelGap: lengthToPx(style.getPropertyValue('--aca-band-label-gap'), root),
    groups,
    floor: memory.floor,
  });
  memory.floor = fit.density;

  footer.dataset.bandDensity = fit.density;
  if (fit.room !== null) footer.style.setProperty('--aca-band-room', `${fit.room}px`);
  if (fit.end !== null) footer.style.setProperty('--aca-band-end', `${fit.end}px`);
}

/**
 * Keeps the band fitted: when its content changes (edit mode, page, number of pages), when its
 * width changes and when the fonts arrive. Mutations and resize observations are delivered
 * before paint, so the bar never shows a state that does not fit. New fonts change every text
 * width: the remembered density is dropped and the bar measured again.
 */
export function useFooterBand(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const footer = ref.current;
    if (!footer) return undefined;
    const memory: BandMemory = { key: '' };
    let active = true;
    const update = () => {
      if (active) applyFooterBand(footer, memory);
    };
    const remeasure = () => {
      memory.key = '';
      memory.floor = undefined;
      update();
    };
    update();
    const mutations = new MutationObserver(update);
    mutations.observe(footer, { childList: true, subtree: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resize?.observe(footer);
    const fonts: FontFaceSet | undefined = footer.ownerDocument.fonts;
    fonts?.addEventListener('loadingdone', remeasure);
    void fonts?.ready.then(remeasure);
    return () => {
      active = false;
      mutations.disconnect();
      resize?.disconnect();
      fonts?.removeEventListener('loadingdone', remeasure);
    };
  }, [ref]);
}
