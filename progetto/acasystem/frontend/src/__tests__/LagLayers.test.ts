/**
 * Lag on the tablets, step 1 (REP-20261012-003): the stylesheet rules that give the launcher
 * stable compositor layers and keep the page overview from drawing the pages again at every
 * frame, with the look unchanged. jsdom computes no layers, so the rules are read as text, as the
 * style tests of the launcher do; the measures (style recalculations, paints, rasters) are in the
 * report.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { OVERVIEW_EASE, OVERVIEW_MS } from '@/templates/launcher/Pager';

const FILES = {
  launcher: 'src/templates/launcher/launcher.css',
  statusBar: 'src/components/system/status-bar/statusBar.css',
  indicator: 'src/components/system/page-indicator/pageIndicator.css',
  edit: 'src/components/system/edit/edit.css',
  skin: 'src/themes/kit2/skin.css',
  material: 'src/themes/acasystem/material.css',
} as const;

type Sheet = keyof typeof FILES;

describe('stable layers and no redraw per frame (REP-20261012-003)', () => {
  const css = {} as Record<Sheet, string>;
  beforeAll(async () => {
    // Vitest empties CSS imports and the strict program has no Node types: typed dynamic import.
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    for (const [key, path] of Object.entries(FILES)) {
      css[key as Sheet] = fs.readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    }
  });

  /** Every `selector { body }` of a sheet (the inner rules of a media query too). */
  const rules = (sheet: Sheet) =>
    [...css[sheet].matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
      selector: selector.replace(/^[\s\S]*\{/, '').trim(),
      body,
    }));
  const squash = (selector: string) => selector.replace(/\s+/g, ' ');
  /** The bodies of every `@media (prefers-reduced-motion: reduce)` of the launcher sheet. */
  const reducedMotion = () =>
    [...css.launcher.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n {2}\}\n/g)]
      .map(([, inner]) => inner)
      .join('\n');
  /** The selectors of a list, split at the commas outside parentheses. */
  const split = (list: string) => {
    const parts: string[] = [];
    let depth = 0;
    let from = 0;
    [...list].forEach((char, at) => {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        parts.push(list.slice(from, at));
        from = at + 1;
      }
    });
    return [...parts, list.slice(from)];
  };
  /** The declarations of every rule whose selector list holds exactly `selector`. */
  const bodyOf = (sheet: Sheet, selector: string) =>
    rules(sheet)
      .filter(({ selector: list }) => split(list).some((part) => squash(part.trim()) === selector))
      .map(({ body }) => body)
      .join('\n');

  describe('custom properties that place the pages are not inherited', () => {
    const registered: Record<string, [string, string]> = {
      '--aca-o': ['<number>', '0'],
      '--aca-d': ['<number>', '0'],
      '--aca-card-shift': ['<number>', '0'],
      '--aca-card-drag': ['<length>', '0px'],
      '--aca-overview-pan': ['<length>', '0px'],
    };
    for (const [name, [syntax, initial]] of Object.entries(registered)) {
      it(`${name} is registered with inherits: false`, () => {
        const block = new RegExp(`@property ${name} \\{([^}]*)\\}`).exec(css.launcher)?.[1] ?? '';
        expect(block).toMatch(new RegExp(`syntax:\\s*'${syntax}';`));
        expect(block).toMatch(/inherits:\s*false;/);
        expect(block).toMatch(new RegExp(`initial-value:\\s*${initial};`));
      });
    }

    it('the registrations are at the top of the sheet, outside the layer that holds the rules', () => {
      const first = css.launcher.indexOf('@layer components');
      for (const name of Object.keys(registered)) {
        const at = css.launcher.indexOf(`@property ${name}`);
        expect(at).toBeGreaterThanOrEqual(0);
        expect(at).toBeLessThan(first);
      }
    });
  });

  describe('the card of the overview is not redrawn while it moves', () => {
    const cards = '.aca-pager:is(.is-overview, .is-closing)';
    const bodyOfCard = `${cards} > .aca-pager__page > .aca-pager__body`;

    it('no rule of the body animates or sets a box-shadow, and its radius is a plain value', () => {
      const bodies = rules('launcher').filter(({ selector }) =>
        /\.aca-pager__body$/.test(squash(selector))
      );
      expect(bodies.length).toBeGreaterThan(3);
      for (const { selector, body } of bodies) {
        expect(body, selector).not.toMatch(/box-shadow:/);
        for (const [, value] of body.matchAll(/transition:([^;]*);/g)) {
          expect(value, selector).not.toMatch(/border-radius|box-shadow/);
        }
      }
      expect(bodyOf('launcher', bodyOfCard)).toMatch(
        /border-radius:\s*calc\(var\(--aca-radius-card\) \/ var\(--aca-overview-k, 0\.72\)\);/
      );
    });

    it('closing keeps the corner rounded until the card covers the screen (0.9.28, D-M21): it was squared at once', () => {
      const closing = bodyOf(
        'launcher',
        '.aca-pager.is-closing > .aca-pager__page > .aca-pager__body'
      );
      // The radius of the overview, shared with the closing, stays; the card only grows back.
      expect(closing).not.toMatch(/border-radius/);
      expect(closing).toMatch(/scale:\s*1;/);
      expect(bodyOf('launcher', bodyOfCard)).toMatch(/border-radius:\s*calc\(/);
    });

    it('the clip of the page is a child of the body, so the shadow of the body stays whole', () => {
      const clip = bodyOf('launcher', `${bodyOfCard} > .aca-pager__clip`);
      expect(clip).toMatch(/overflow:\s*hidden;/);
      expect(clip).toMatch(/border-radius:\s*inherit;/);
      expect(clip).toMatch(/background:\s*var\(--aca-page\);/);
      // The body itself clips nothing and has no page colour (the ring and the shadow need it).
      expect(bodyOf('launcher', bodyOfCard)).not.toMatch(/overflow|background/);
      // In the row the clip is only a box that fills the body, as the body filled the page.
      expect(bodyOf('launcher', '.aca-pager__clip')).toMatch(/flex:\s*1 1 auto;/);
    });

    it('the shadows are shapes out of the flow that only fade by opacity', () => {
      const shapes = rules('launcher').filter(({ selector }) =>
        /\.aca-pager__body::(?:before|after)$/.test(squash(selector).replace(/,$/, ''))
      );
      expect(shapes.length).toBeGreaterThanOrEqual(6);
      for (const { selector, body } of shapes) {
        // Only opacity moves, with its own transition (no other property in it).
        for (const [, value] of body.matchAll(/transition:([^;]*);/g)) {
          expect(value, selector).toMatch(/^\s*(?:opacity |none$)/);
          expect(value, selector).not.toMatch(
            /\b(?:scale|translate|transform|box-shadow|border-radius)\b/
          );
        }
        expect(body, selector).not.toMatch(/\b(?:scale|translate|rotate|width|height|margin)\s*:/);
      }
      const base = bodyOf('launcher', '.aca-pager__body::after');
      expect(base).toMatch(/box-shadow:\s*var\(--aca-socket-shadow-card\);/);
      const common = bodyOf('launcher', '.aca-pager__body::before');
      expect(common).toMatch(/position:\s*absolute;/);
      expect(common).toMatch(/inset:\s*0;/);
      expect(common).toMatch(/opacity:\s*0;/);
      expect(common).toMatch(/pointer-events:\s*none;/);
      // Under the page and under the ring of the card, as the shadow of the body was.
      expect(common).toMatch(/z-index:\s*-1;/);
      expect(bodyOf('launcher', '.aca-pager__body')).toMatch(/z-index:\s*0;/);
    });

    it('opening and closing fade the shadow of the card on the time and curve of the overview', () => {
      const shadow = bodyOf('launcher', `${cards} > .aca-pager__page > .aca-pager__body::after`);
      expect(shadow).toMatch(/opacity:\s*1;/);
      // Behind the cards by the same gap as they are (D-M3, D-M25), so the shadow does not come first.
      expect(shadow).toMatch(
        /transition:\s*opacity var\(--aca-overview-ms\) var\(--aca-overview-ease\) var\(--aca-card-delay\);/
      );
      expect(
        bodyOf('launcher', '.aca-pager.is-closing > .aca-pager__page > .aca-pager__body::after')
      ).toMatch(/opacity:\s*0;/);
    });

    it('the time and the curve the pager uses are the ones of the stylesheet', () => {
      const pager = bodyOf('launcher', '.aca-pager');
      expect(pager).toContain(`--aca-overview-ms: ${OVERVIEW_MS}ms;`);
      expect(pager).toContain(`--aca-overview-ease: ${OVERVIEW_EASE};`);
    });

    it('the lift of a card held fades its shadow too, and the page held on its empty part has no cue of its own (0.9.28)', () => {
      expect(
        bodyOf(
          'launcher',
          '.aca-pager.is-overview > .aca-pager__page.is-lifted > .aca-pager__body::before'
        )
      ).toMatch(/opacity:\s*1;[\s\S]*transition:\s*opacity var\(--aca-dur-lift, 150ms\)/);
      // The card held in the pages view has no cue either until it lifts (D-M2).
      expect(css.launcher).not.toMatch(/\.aca-pager__page\.is-pressing/);
      // The shrink of the page starts at the long press with the overview, not during the hold.
      expect(css.launcher).not.toMatch(/\.aca-pager\.is-pressing/);
    });

    it('with reduced motion the shadow comes at once', () => {
      const reduced = reducedMotion();
      // The rules of the overview and of the lift weigh more than the plain ones: the block
      // repeats their selectors, so that the shadow does not fade in either (a tie, and later).
      const none = split(
        [...reduced.matchAll(/([^{}]+)\{\s*transition: none;\s*\}/g)]
          .map(([, list]) => list)
          .join(',')
      ).map((part) => squash(part.trim()));
      for (const selector of [
        '.aca-pager__body::before',
        '.aca-pager__body::after',
        '.aca-pager:is(.is-overview, .is-closing) > .aca-pager__page > .aca-pager__body::after',
        '.aca-pager.is-overview > .aca-pager__page.is-lifted > .aca-pager__body::before',
      ]) {
        expect(none).toContain(selector);
      }
    });
  });

  describe('no wiggle in edit mode (the request of 2026-10-23)', () => {
    const frame = '.aca-launcher-widget.is-editing .aca-launcher-widget__frame';

    it('no widget shakes while it is in edit mode: the wiggle and its rules are gone', () => {
      expect(css.launcher).not.toMatch(/aca-wiggle/);
      expect(bodyOf('launcher', frame)).not.toMatch(/animation/);
      // Not one rule animates the frame of a widget being edited, selected or not.
      const animated = rules('launcher').filter(
        ({ selector, body }) =>
          selector.includes('.is-editing') &&
          selector.includes('.aca-launcher-widget__frame') &&
          /animation/.test(body)
      );
      expect(animated).toEqual([]);
    });

    it('the widget being edited is only highlighted: the ring of the selected one stays', () => {
      expect(bodyOf('launcher', '.aca-launcher-widget.is-selected::after')).toMatch(
        /border:\s*2px solid var\(--aca-selection\);/
      );
    });
  });

  it('entering edit mode switches the disabled controls at once, without box-shadow transitions', () => {
    // Not under `.is-editing`: that ancestor restyled every control at each entry to the edit mode
    // (G2 tracing); the state is the attribute of the control.
    const own =
      ".aca-launcher-widget.aca-launcher-widget .aca-m:is([disabled], [aria-disabled='true'])";
    expect(own).not.toContain('is-editing');
    expect(bodyOf('launcher', own)).toMatch(/transition:\s*none;/);
    expect(bodyOf('launcher', `${own} :is(.aca-m__outer, .aca-m__face, .aca-m__content)`)).toMatch(
      /transition:\s*none;/
    );
  });

  describe('own compositor layers', () => {
    it('every widget and free cell has one, also with reduced motion', () => {
      expect(bodyOf('launcher', '.aca-launcher-widget')).toMatch(/will-change:\s*transform;/);
      expect(bodyOf('launcher', '.aca-launcher-cell.aca-m')).toMatch(/will-change:\s*transform;/);
      expect(reducedMotion()).not.toMatch(/will-change/);
    });

    it('the widget keeps its place by translate, which already made it a stacking context', () => {
      // The widget and the free cell, not only the drop preview that shares the rule.
      expect(bodyOf('launcher', '.aca-launcher-widget')).toMatch(/translate:\s*calc\(/);
      expect(bodyOf('launcher', '.aca-launcher-cell.aca-m')).toMatch(/translate:\s*calc\(/);
    });

    it('the bars that slide in and out keep a layer of their own', () => {
      // The two pills of the status bar, not its root (REP-20261013-002, ADR-0013).
      expect(bodyOf('statusBar', '.aca-status-bar__pill')).toMatch(
        /will-change:\s*transform, opacity;/
      );
      expect(bodyOf('statusBar', '.aca-status-bar')).not.toMatch(/will-change/);
      expect(bodyOf('edit', '.aca-edit-toolbar__group')).toMatch(
        /will-change:\s*transform, opacity;/
      );
      expect(bodyOf('edit', '.aca-page-overview__group')).toMatch(
        /will-change:\s*transform, opacity;/
      );
      expect(bodyOf('indicator', '.aca-indicator')).toMatch(/will-change:\s*transform, opacity;/);
    });

    it('Kit 2, whose press does not scale, drops the layer of the pressables inside a widget', () => {
      const own = bodyOf(
        'skin',
        '.aca-launcher-widget :is(.aca-fx-press, .aca-m--press) > .aca-m__outer'
      );
      expect(own).toMatch(/will-change:\s*auto;/);
      // The Kit 2 press is a sink, not a scale: that is why nothing is lost.
      expect(css.skin).toMatch(
        /\.aca-launcher-widget__frame:has\(\[data-widget-open\]:active\) > \.aca-m__outer \{\s*transform: none;/
      );
    });

    it('the shell of the widget frame keeps its layer: launcher.css, after the skin, still scales it', () => {
      // The skin comes first in the cascade (main.tsx), so at equal weight launcher.css wins.
      expect(css.skin).not.toMatch(/data-widget-open\][^{}]*\{[^{}]*will-change/);
      expect(
        bodyOf('launcher', '.aca-launcher-widget__frame:has([data-widget-open]) > .aca-m__outer')
      ).toMatch(/will-change:\s*transform;/);
    });

    it('the Metallo kit keeps the layer of its scaling press', () => {
      expect(css.material).toMatch(
        /\.aca-m-host \.aca-m--hosted\) > \.aca-m__outer \{\s*will-change: transform;/
      );
    });
  });
  describe('empty cells fade out in the pages view and settling (ISSUE-062, REP-20261015-001)', () => {
    it('fades out .aca-launcher-cells under .is-overview, .is-closing and .is-settling', () => {
      const hits = rules('launcher').filter(
        ({ selector, body }) =>
          /opacity:\s*0/.test(body) && selector.includes('.aca-launcher-cells')
      );
      expect(hits).toHaveLength(1);
      expect(squash(hits[0].selector)).toBe(
        '.aca-pager:is(.is-overview, .is-closing, .is-settling) .aca-launcher-cells'
      );
    });

    it('fade by opacity alone: no visibility on the layer of cells, which would be inherited (REP-20261019-002, N4)', () => {
      // `visibility` is inherited, and a change of it restyled the layer and every cell in it, at the
      // beginning and at the end of each view (47-68 ms on the Tab M11). The cells are kept out of
      // reach by an `inert` on each layer (Pager.tsx), and are invisible at opacity 0.
      const layers = rules('launcher').filter(({ selector }) =>
        selector.includes('.aca-launcher-cells')
      );
      expect(layers.length).toBeGreaterThan(0);
      for (const { selector, body } of layers) {
        expect(body, selector).not.toMatch(/visibility/);
      }
      const view = layers.find(({ selector }) => selector.includes('.is-settling'));
      expect(view?.body).toMatch(/opacity:\s*0;/);
      // No composition hint while hidden: it would keep every cell a painting layer at opacity 0.
      expect(view?.body).toMatch(/will-change:\s*auto;/);
      // They go first and quickly (D-M3): 100 ms, ease-in.
      expect(view?.body).toMatch(
        /transition:\s*opacity var\(--aca-dur-clear, 100ms\) var\(--aca-motion-ease-in, ease-in\);/
      );
      const rest = layers.find(({ selector }) => squash(selector).trim() === '.aca-launcher-cells');
      expect(rest?.body).toMatch(/opacity:\s*1;/);
      // They come back in 180 ms instead of 240 (D-M20).
      expect(rest?.body).toMatch(
        /transition:\s*opacity var\(--aca-dur-fade-in, 180ms\) var\(--aca-motion-ease-out, ease-out\);/
      );
    });
  });

  describe('no selector of the pager reaches the whole subtree (REP-20261019-002, N1)', () => {
    it('nothing under the pager is matched by `*`, which restyles every element on each change of class', () => {
      // `.aca-pager.is-closing .aca-pager__clip *` made each entry and exit restyle all the elements
      // of the pages (180 ms for 5800 elements on a 4x throttled desktop). The transitions of the
      // content are ended by Pager.tsx instead (endContentTransitions).
      for (const { selector } of rules('launcher')) {
        for (const part of split(selector)) {
          if (!part.includes('.aca-pager')) continue;
          expect(squash(part), part).not.toMatch(/(?:^|[\s>+~])\*$/);
        }
      }
    });
  });
});
