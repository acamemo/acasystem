import type { CSSProperties } from 'react';

/**
 * Size of the reading in the bottom pole of a 2×2 widget (L-19): the value grows with the
 * widget (cqi / cqh units in controls.css) but never wider than the widget, so it is never cut.
 * The browser cannot measure text in CSS, so this estimates the width of the longest line in em
 * (Inter, light weight) and passes it as `--aca-ctl-fit`; CSS divides the container width by it.
 */

/** Average advance per character in em, rounded up (tabular digits, Inter light). */
const DIGIT_EM = 0.62;
const LOWER_EM = 0.56;
const UPPER_EM = 0.72;
const NARROW_EM = 0.3;
const WIDE_EM = 0.9;
/** The unit is drawn at half size (.ctl-unit), after a small margin. */
const UNIT_SCALE = 0.5;
const UNIT_GAP_EM = 0.08;
/** Margin for the estimate: glyphs wider than the average must still fit. */
const SLACK = 1.12;
/**
 * Square widget: the reading may take this share of the height (the name keeps the top),
 * at the line height of the reading (1.2). Mirrors the cqh limit in controls.css.
 */
const HEIGHT_SHARE = 0.45;
const LINE_HEIGHT = 1.2;
export const MAX_FIT_LINES = 3;

function charEm(char: string): number {
  if (/\d/.test(char)) return DIGIT_EM;
  if (/[\s.,:;'’!|il]/.test(char)) return NARROW_EM;
  if (/[%@mwMW]/.test(char)) return WIDE_EM;
  if (char !== char.toLowerCase()) return UPPER_EM;
  return LOWER_EM;
}

/** Estimated width of a text in em at its own font size. */
export function textEm(text: string): number {
  let width = 0;
  for (const char of text) width += charEm(char);
  return width;
}

/** Lines of a greedy wrap (as the browser does) of `words` at `width` em. */
function lineCount(words: number[], space: number, width: number): number {
  let lines = 1;
  let current = 0;
  for (const word of words) {
    if (current === 0) current = word;
    else if (current + space + word <= width) current += space + word;
    else {
      lines += 1;
      current = word;
    }
  }
  return lines;
}

/** Narrowest width (em) whose greedy wrap needs at most `lines` lines. */
function narrowestWidth(words: number[], space: number, lines: number): number {
  const longest = Math.max(...words);
  const total = words.reduce((sum, word) => sum + word, 0) + space * (words.length - 1);
  if (lines <= 1 || words.length === 1) return total;
  let low = longest;
  let high = total;
  for (let step = 0; step < 24; step += 1) {
    const middle = (low + high) / 2;
    if (lineCount(words, space, middle) <= lines) high = middle;
    else low = middle;
  }
  return high;
}

export interface ValueFit {
  /** Width of the longest line in em, with margin: CSS sets font-size ≈ 100cqi / fit. */
  fit: number;
  /** Lines the text is laid out on (1 for figures). */
  lines: number;
  /** Custom properties for the element (`--aca-ctl-fit`, `--aca-ctl-lines`). */
  style: CSSProperties;
}

const round = (value: number) => Math.round(value * 100) / 100;

function result(width: number, lines: number): ValueFit {
  const fit = round(Math.max(width, 1) * SLACK);
  return {
    fit,
    lines,
    style: { '--aca-ctl-fit': fit, '--aca-ctl-lines': lines } as CSSProperties,
  };
}

/**
 * A figure with its unit («21,4 °C», «65%»): one line, never wrapped (Numeric).
 * `extraEm` adds room for an inline glyph before the text.
 */
export function figureFit(value: string, unit = '', extraEm = 0): ValueFit {
  const unitEm = unit ? UNIT_GAP_EM + textEm(` ${unit}`) * UNIT_SCALE : 0;
  return result(textEm(value) + unitEm + extraEm, 1);
}

/**
 * Text size, as a share of the widget width, from which a state reads well on one line less:
 * 20 px on a 2×2 of 12.5 rem, a quarter more than the name.
 */
const COMFORTABLE_SHARE = 0.1;

/**
 * A state in words («Inattivo», «Aggiornamento del firmware in corso»): up to three lines.
 * In a square widget, it takes the fewest lines that give a comfortable size (or the largest
 * size possible when no count does), so short states stay on one line.
 * `maxLines` 1 keeps the text on one line (e.g. next to a warning glyph, `extraEm`).
 */
export function stateFit(text: string, maxLines = MAX_FIT_LINES, extraEm = 0): ValueFit {
  const words = text.trim().split(/\s+/).filter(Boolean).map(textEm);
  if (words.length === 0) return result(1 + extraEm, 1);
  const space = charEm(' ');
  const limit = Math.max(1, Math.min(maxLines, MAX_FIT_LINES, words.length));
  const options = Array.from({ length: limit }, (_, index) => {
    const lines = index + 1;
    const width = narrowestWidth(words, space, lines) + extraEm;
    return { width, lines, size: Math.min(1 / width, HEIGHT_SHARE / (lines * LINE_HEIGHT)) };
  });
  const largest = Math.max(...options.map((option) => option.size));
  const enough = Math.min(largest, COMFORTABLE_SHARE);
  const chosen = options.find((option) => option.size >= enough) ?? options[0];
  return chosen ? result(chosen.width, chosen.lines) : result(1 + extraEm, 1);
}
