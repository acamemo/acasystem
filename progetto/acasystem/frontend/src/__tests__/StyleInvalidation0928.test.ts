/**
 * Selectors that make the whole shell restyle (REP-20261023-006, 0.9.28, optimisation of
 * 2026-10-24). A `:has()` whose subject is the shell, the main area, the root or the page, followed
 * by a descendant or sibling combinator, is invalidated by every node mounted, removed or changed
 * under that subject: with 1230-1750 elements in the shell, each mount of a pill, a bar or a probe
 * cost 40-160 ms of style recalculation. The tracing of the 0.9.28 (backup/v0928/diagnosi4) found
 * it the main cause of the scenes slower than in the 0.9.27. jsdom computes no style, so the rules
 * are read as text, as in `RegressionCss0928.test.ts`.
 */
import { beforeAll, describe, expect, it } from 'vitest';

interface Fs {
  readFileSync: (path: string, encoding: 'utf8') => string;
  readdirSync: (path: string) => string[];
  statSync: (path: string) => { isDirectory: () => boolean };
}

const ROOT = 'src';
/** The subjects whose `:has()` reaches the whole shell. */
const WIDE_SUBJECT =
  /(?:^|[\s>+~,(])(?:html|:root|body|\.aca-shell|\.aca-shell__main|\.aca-app-root)(?:\[[^\]]*\]|\.[\w-]+)*:has\(/g;

/** What follows the `:has(...)` that opens at `from` (the position of its opening parenthesis). */
function afterHas(selector: string, from: number) {
  let depth = 0;
  for (let at = from; at < selector.length; at += 1) {
    if (selector[at] === '(') depth += 1;
    if (selector[at] === ')') {
      depth -= 1;
      if (depth === 0) return selector.slice(at + 1).trim();
    }
  }
  return '';
}

describe('selectors that restyle the shell', () => {
  const sheets: Record<string, string> = {};
  beforeAll(async () => {
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as Fs;
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        const path = `${dir}/${name}`;
        if (fs.statSync(path).isDirectory()) walk(path);
        else if (name.endsWith('.css'))
          sheets[path] = fs.readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      }
    };
    walk(ROOT);
  });

  const selectorsOf = (sheet: string) =>
    [...sheet.matchAll(/([^{};]+)\{/g)]
      .map((match) => match[1])
      .filter((text) => !text.trim().startsWith('@'))
      .flatMap((text) => text.split(/,(?![^(]*\))/))
      .map((text) => text.replace(/\s+/g, ' ').trim());

  it('finds the stylesheets', () => {
    expect(Object.keys(sheets).length).toBeGreaterThan(20);
  });

  it('no :has() on the shell, the main area, the root or the body reaches what is under it', () => {
    const found: string[] = [];
    for (const [path, sheet] of Object.entries(sheets)) {
      for (const selector of selectorsOf(sheet)) {
        for (const match of selector.matchAll(WIDE_SUBJECT)) {
          const open = (match.index ?? 0) + match[0].length - 1;
          // `html:has(.aca-app-root) {` is the subject alone: nothing follows to be restyled.
          if (afterHas(selector, open) === '') continue;
          found.push(`${path}: ${selector}`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it('the bars wait for their place in the scene by a class of their own, not by the pager', () => {
    const edit = sheets[`${ROOT}/components/system/edit/edit.css`];
    expect(edit).not.toMatch(/:has\(/);
    expect(edit).toMatch(
      /\.aca-edit-toolbar--closing:not\(\.aca-edit-toolbar--hidden\) > \.aca-edit-toolbar__group \{\s*transition-delay: 180ms;/
    );
    expect(edit).toMatch(
      /\.aca-page-overview--overview:not\(\.aca-widget-actions, \.aca-page-overview--hidden\)\s*> \.aca-page-overview__group \{\s*transition-delay: calc\(var\(--aca-stagger, 40ms\) \* 4\);/
    );
  });

  it('no state class of a widget is the ancestor of its controls (is-editing, is-selected, ...)', () => {
    // `.aca-launcher-widget.is-editing .aca-m ...` restyled every control of every widget drawn at
    // each entry to the edit mode: 848 elements in the frame of the threshold of the page view,
    // more than 1700 on «Fine» (G2 tracing of 2026-10-24).
    const found: string[] = [];
    const controls = /\.aca-m(?:__outer|__face|__content)?\b|\.aca-m\b/;
    for (const [path, sheet] of Object.entries(sheets)) {
      for (const selector of selectorsOf(sheet)) {
        const widget =
          /\.aca-launcher-widget(?:\.[\w-]+)*\.(?:is-editing|is-selected)(?:\.[\w-]+)*\s+([^>+~]*)/.exec(
            selector
          );
        if (widget && controls.test(widget[1])) found.push(`${path}: ${selector}`);
      }
    }
    expect(found).toEqual([]);
  });

  it('the controls disabled in the edit mode still change at once', () => {
    const launcher = sheets[`${ROOT}/templates/launcher/launcher.css`];
    expect(launcher).toMatch(
      /\.aca-launcher-widget\.aca-launcher-widget \.aca-m:is\(\[disabled\], \[aria-disabled='true'\]\),[\s\S]*?\{\s*transition: none;/
    );
  });

  it('the drag style of the grid reaches only the content of the cells, and the copy has its own hiding class (W1, W2, W-P, W-V)', () => {
    // The class is taken off three grids at the end of a drag, and each descendant rule restyles
    // every cell with its subtree (97-100 cells, tracing of 2026-10-25): no rule is added to the
    // one. The rule on the cell itself (`pointer-events: none`, inherited by the whole subtree of
    // the 85 cells) went in the round 4 (W-P): FreeCells ignores a press while a session is open.
    const rules = Object.values(sheets)
      .flatMap(selectorsOf)
      .filter((selector) => selector.includes('.aca-launcher-grid.is-dragging'));
    expect(rules.sort()).toEqual(['.aca-launcher-grid.is-dragging .aca-launcher-cell__content']);
    const launcher = sheets[`${ROOT}/templates/launcher/launcher.css`];
    expect(launcher).not.toMatch(
      /\.aca-launcher-grid\.is-dragging \.aca-launcher-cell\s*\{[^}]*pointer-events/
    );
    // The landed copy goes by opacity, which is not inherited: `visibility` restyled its whole
    // subtree on the first beat of the landing (W-V).
    expect(launcher).toMatch(/\.aca-drag-ghost\.is-landed \{\s*opacity: 0;\s*\}/);
    expect(launcher).not.toMatch(/\.aca-drag-ghost\.is-landed \{[^}]*visibility/);
  });

  it('the indicator waits for the cards by its own class, in the normal and in the reduced group', () => {
    const indicator = sheets[`${ROOT}/components/system/page-indicator/pageIndicator.css`];
    const delay =
      /\.aca-indicator\.aca-indicator--overview:not\(\.aca-indicator--hidden\) \{\s*transition-delay: calc\(var\(--aca-stagger, 40ms\) \* 3\);/;
    expect(indicator).toMatch(delay);
    const reduced =
      /prefers-reduced-motion: reduce\) \{[\s\S]*?\.aca-indicator\.aca-indicator--overview:not\(\.aca-indicator--hidden\) \{/;
    expect(indicator).toMatch(reduced);
    expect(indicator).not.toContain('.aca-pager.is-overview');
  });
});
