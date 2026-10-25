/**
 * Choreography of the launcher, block 1 of 0.9.28 (REP-20261023-006, with the user's answers of
 * 2026-10-23): the times and curves in tokens (D-M16), the order of the pages view (D-M3), the
 * cells that go first and come back quicker (D-M20), the corner that stays rounded (D-M21), the
 * indicator and the «Annulla» pill that swap in sequence and the cards that come in and go out
 * (D-M24), and the rule that decides them all: only small scales (±10 %), no shake, no rotation,
 * no decorative slide. jsdom computes no animation, so the rules are read as text, as the style
 * tests of the launcher do; the frames themselves are measured in the report, on the tablet.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  CARD_EXIT_MS,
  CLOSING_CARD_DELAY_MS,
  OPENING_CARD_DELAY_MS,
  OVERVIEW_MS,
} from '@/templates/launcher/Pager';

const FILES = {
  tokens: 'src/themes/acasystem/tokens.css',
  launcher: 'src/templates/launcher/launcher.css',
  edit: 'src/components/system/edit/edit.css',
  indicator: 'src/components/system/page-indicator/pageIndicator.css',
} as const;
type Sheet = keyof typeof FILES;

describe('choreography of the launcher (block 1 of 0.9.28)', () => {
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

  /** The body of the first rule of a sheet with exactly this selector. */
  const rule = (sheet: Sheet, selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css[sheet])?.[1] ?? '';
  };
  /** A token of tokens.css as a number: ms for a time, the plain number for a scale. */
  const token = (name: string) => {
    const value = new RegExp(`${name}:\\s*([0-9.]+)(ms)?;`).exec(css.tokens)?.[1];
    expect(value, name).toBeDefined();
    return Number(value);
  };

  describe('times and curves in one place (D-M16)', () => {
    it('every role of the table of REP-20261023-006 has a token on :root', () => {
      for (const name of [
        '--aca-motion-ease-out',
        '--aca-motion-ease-in',
        '--aca-motion-ease-in-out',
        '--aca-dur-press',
        '--aca-dur-press-out',
        '--aca-dur-clear',
        '--aca-dur-swap-out',
        '--aca-dur-exit-sm',
        '--aca-dur-enter-sm',
        '--aca-dur-fade-in',
        '--aca-dur-lift',
        '--aca-dur-move',
        '--aca-dur-bar-in',
        '--aca-dur-bar-out',
        '--aca-dur-bar-fade-in',
        '--aca-dur-bar-fade-out',
        '--aca-dur-scene',
        '--aca-dur-sheet-in',
        '--aca-dur-sheet-out',
        '--aca-dur-reduced',
        '--aca-stagger',
        '--aca-scale-press',
        '--aca-scale-lift',
        '--aca-scale-enter',
      ]) {
        expect(css.tokens, name).toMatch(new RegExp(`${name}:`));
      }
      // On :root, where a widget, a card or a bar can read them (the kit's own are on .aca-m only).
      expect(css.tokens.indexOf('--aca-dur-press:')).toBeGreaterThan(css.tokens.indexOf(':root'));
    });

    it('the exits are shorter than the entrances, in every pair', () => {
      expect(token('--aca-dur-exit-sm')).toBeLessThan(token('--aca-dur-enter-sm'));
      expect(token('--aca-dur-swap-out')).toBeLessThan(token('--aca-dur-enter-sm'));
      expect(token('--aca-dur-bar-out')).toBeLessThan(token('--aca-dur-bar-in'));
      expect(token('--aca-dur-bar-fade-out')).toBeLessThan(token('--aca-dur-bar-fade-in'));
      expect(token('--aca-dur-sheet-out')).toBeLessThan(token('--aca-dur-sheet-in'));
      // Two thirds, give or take: the cells that clear the way go quickest of all.
      expect(token('--aca-dur-clear')).toBeLessThan(token('--aca-dur-exit-sm'));
      // The press is felt at once and given back a little slower.
      expect(token('--aca-dur-press')).toBeLessThan(token('--aca-dur-press-out'));
    });

    it('the values of the table: scene 360, cells back 180, sheets 280 in and 200 out, reduced 120', () => {
      expect(token('--aca-dur-scene')).toBe(360);
      expect(token('--aca-dur-fade-in')).toBe(180);
      expect(token('--aca-dur-sheet-in')).toBe(280);
      expect(token('--aca-dur-sheet-out')).toBe(200);
      expect(token('--aca-dur-reduced')).toBe(120);
      expect(token('--aca-dur-bar-in')).toBe(360);
      expect(token('--aca-dur-bar-out')).toBe(240);
    });

    it('the scene of the stylesheet and the pager are one time, and so are the gaps of the order', () => {
      expect(token('--aca-dur-scene')).toBe(OVERVIEW_MS);
      expect(token('--aca-stagger') * 2).toBe(OPENING_CARD_DELAY_MS);
      expect(token('--aca-stagger')).toBe(CLOSING_CARD_DELAY_MS);
      expect(token('--aca-dur-exit-sm')).toBe(CARD_EXIT_MS);
    });

    it('no scale goes beyond 10 % (the answer of 2026-10-23): press, lift and entrance', () => {
      for (const name of ['--aca-scale-press', '--aca-scale-lift', '--aca-scale-enter']) {
        expect(Math.abs(token(name) - 1), name).toBeLessThanOrEqual(0.1);
      }
      expect(token('--aca-scale-press')).toBe(0.93);
      expect(token('--aca-scale-lift')).toBe(1.05);
    });

    it('the bars and the indicator take their times from the tokens, not from numbers', () => {
      for (const sheet of ['edit', 'indicator'] as const) {
        const bars = [
          ...css[sheet].matchAll(/transform var\(--aca-dur-bar-(?:in|out)[^)]*\)[^;]*;/g),
        ];
        expect(bars.length, sheet).toBeGreaterThan(0);
        expect(css[sheet], sheet).not.toMatch(/transform (?:360|240)ms/);
        expect(css[sheet], sheet).not.toMatch(/opacity (?:240|200)ms (?:ease-out|ease-in)/);
      }
    });
  });

  describe('the order of the pages view (D-M3, D-M25)', () => {
    it('the cells go first and quickly, ease-in; the cards follow after two gaps', () => {
      expect(css.launcher).toMatch(
        /\.aca-pager:is\(\.is-overview, \.is-closing, \.is-settling\) \.aca-launcher-cells \{[^}]*transition:\s*opacity var\(--aca-dur-clear, 100ms\) var\(--aca-motion-ease-in, ease-in\);/
      );
      const onCards = (state: string) =>
        new RegExp(
          String.raw`\.aca-pager\.${state} > \.aca-pager__page,\s*\.aca-pager\.${state} > \.aca-pager__page > \.aca-pager__body,\s*\.aca-pager\.${state} > \.aca-pager__page > \.aca-pager__body::after \{\s*--aca-card-delay:\s*([^;]+);`
        ).exec(css.launcher)?.[1];
      expect(onCards('is-entering')).toBe('calc(var(--aca-stagger, 40ms) * 2)');
      // Going back, the cards leave after one gap; the delay lives on the state of the closing.
      expect(onCards('is-closing')).toBe('var(--aca-stagger, 40ms)');
      // Written on the pages and their bodies alone, on a property that is not inherited: a class of
      // the pager restyles those, not the whole subtree of every page. 0 at rest and after a pan.
      expect(css.launcher).toMatch(
        /@property --aca-card-delay \{\s*syntax: '<time>';\s*inherits: false;\s*initial-value: 0ms;\s*\}/
      );
      expect(css.launcher).not.toMatch(/\.aca-pager(?:\.is-\w+)? \{[^}]*--aca-card-delay/);
    });

    it('the indicator comes after three gaps, the bar after four, the controls after five', () => {
      expect(css.indicator).toMatch(
        /\.aca-indicator\.aca-indicator--overview:not\(\.aca-indicator--hidden\) \{\s*transition-delay: calc\(var\(--aca-stagger, 40ms\) \* 3\);/
      );
      expect(css.edit).toMatch(
        /> \.aca-page-overview__group \{\s*transition-delay: calc\(var\(--aca-stagger, 40ms\) \* 4\);/
      );
      expect(rule('launcher', '.aca-pager.is-overview .aca-pager__footer')).toMatch(
        /calc\(var\(--aca-stagger, 40ms\) \* 5\);/
      );
    });

    it('the shadow of a card keeps the delay of its card, so it does not come before it', () => {
      expect(
        rule(
          'launcher',
          '.aca-pager:is(.is-overview, .is-closing) > .aca-pager__page > .aca-pager__body::after'
        )
      ).toMatch(/var\(--aca-overview-ease\) var\(--aca-card-delay\);/);
    });

    it('the cells are back in 180 ms, ease-out, instead of 240 (D-M20)', () => {
      expect(rule('launcher', '.aca-launcher-cells')).toMatch(
        /transition:\s*opacity var\(--aca-dur-fade-in, 180ms\) var\(--aca-motion-ease-out, ease-out\);/
      );
      expect(css.launcher).not.toMatch(/\.aca-launcher-cells[^}]*240ms/);
    });

    it('the corner of the card stays rounded while it grows back; it is square only when the closing ends (D-M21)', () => {
      const closing = rule(
        'launcher',
        '.aca-pager.is-closing > .aca-pager__page > .aca-pager__body'
      );
      expect(closing).not.toMatch(/border-radius/);
      // The radius is the one rule of the cards, for the overview and the closing alike.
      expect(
        rule(
          'launcher',
          '.aca-pager:is(.is-overview, .is-closing) > .aca-pager__page > .aca-pager__body'
        )
      ).toMatch(
        /border-radius:\s*calc\(var\(--aca-radius-card\) \/ var\(--aca-overview-k, 0\.72\)\);/
      );
    });
  });

  describe('a press shows nothing on the page, and a small scale where it shows something (D-M1, D-M2, D-M4)', () => {
    it('no rule moves the page or a held card while the press is counted', () => {
      expect(css.launcher).not.toMatch(/\.aca-pager\.is-pressing/);
      expect(css.launcher).not.toMatch(/\.aca-pager__page\.is-pressing/);
      expect(css.launcher).not.toMatch(/\.is-pressing\s*>\s*\.aca-pager__body/);
    });

    it('a card lifted grows by 5 % and keeps still: no animation, no rotation', () => {
      const lifted = rule(
        'launcher',
        '.aca-pager.is-overview > .aca-pager__page.is-lifted > .aca-pager__body'
      );
      expect(lifted).toMatch(/var\(--aca-scale-lift, 1\.05\)/);
      expect(lifted).toMatch(/transition:\s*scale var\(--aca-dur-lift, 150ms\)/);
      expect(lifted).not.toMatch(/animation|rotate/);
      expect(css.launcher).not.toMatch(/aca-hold-shake-flat/);
    });

    it('the pressed «+» cell is the scale of 0.93 and nothing else', () => {
      const pressed = rule('launcher', '.aca-launcher-cell.aca-m.is-pressed');
      expect(pressed).toMatch(/scale:\s*var\(--aca-scale-press, 0\.93\);/);
      expect(pressed).not.toMatch(/rotate|translate|top|margin|animation/);
      expect(css.launcher).not.toMatch(/aca-cell-tap|is-tapped/);
    });

    it('no rotation is left in the sheet: the dragged copy keeps still too (block 3 took the shake away)', () => {
      // The user's answer asks for no shake. This guard keeps a rotation from creeping into the
      // pages view, the cells, the widgets or the bars.
      expect(css.launcher).not.toMatch(/rotate:/);
      expect(css.launcher).not.toMatch(/aca-hold-shake/);
      // edit.css has the arrow of the tip (a square turned 45 degrees): a shape, not a motion.
      expect(css.edit.match(/rotate:\s*[^;]+;/g)).toEqual(['rotate: 45deg;']);
      expect(css.indicator).not.toMatch(/rotate:/);
    });

    it('every scale of the pages view, the cells and the pill is within 10 % of full size', () => {
      const scales: number[] = [];
      for (const sheet of ['launcher', 'edit'] as const) {
        const touched = [
          ...css[sheet].matchAll(
            /([^{}]*(?:\.aca-pager|\.aca-launcher-cell|\.aca-undo)[^{}]*)\{([^}]*)\}/g
          ),
        ];
        for (const [, , body] of touched) {
          for (const [, value] of body.matchAll(/(?:^|[\s;])scale:\s*([^;]+);/g)) {
            // The fallbacks of the scale tokens and the plain numbers; --aca-overview-k is the card's
            // own size, not a scale of motion.
            for (const [, number] of value.matchAll(
              /var\(--aca-scale-[a-z]+,\s*([0-9.]+)\)|^\s*([0-9.]+)\s*$/g
            )) {
              scales.push(Number(number ?? 1));
            }
          }
        }
      }
      expect(scales.length).toBeGreaterThan(4);
      for (const scale of scales) expect(Math.abs(scale - 1)).toBeLessThanOrEqual(0.1);
    });
  });

  describe('the pages view: arrows, indicator and pill, cards that come and go (D-M24)', () => {
    it('the controls under a card are hidden by default and shown with the overview, never from @starting-style', () => {
      // A footer that React moves in the DOM (the arrows) must not start again from nothing.
      expect(css.launcher).not.toMatch(/\.aca-pager__footer[^{]*\{[^}]*@starting-style/);
      expect(css.launcher).not.toMatch(/@starting-style\s*\{[^}]*\.aca-pager__footer/);
      expect(rule('launcher', '.aca-pager__footer')).toMatch(/\bopacity:\s*0;/);
      // Going back they fade out on their own, quickly, before the cards move (0 to 120 ms, ease-in).
      expect(rule('launcher', '.aca-pager__footer')).toMatch(
        /transition:\s*opacity var\(--aca-dur-swap-out, 120ms\) var\(--aca-motion-ease-in, ease-in\);/
      );
    });

    it('a card React moved goes over the one that glides by its own transition', () => {
      expect(rule('launcher', '.aca-pager.is-overview > .aca-pager__page.is-moved')).toMatch(
        /z-index:\s*1;/
      );
      // Under the card held, which is above all.
      expect(rule('launcher', '.aca-pager.is-overview > .aca-pager__page.is-lifted')).toMatch(
        /z-index:\s*2;/
      );
    });

    it('a card that comes in is hidden and a little smaller as a state; one that leaves goes the shorter way', () => {
      expect(
        rule('launcher', '.aca-pager:is(.is-overview, .is-closing) > .aca-pager__page.is-new')
      ).toMatch(/opacity:\s*0;/);
      expect(
        rule(
          'launcher',
          '.aca-pager:is(.is-overview, .is-closing) > .aca-pager__page.is-new > .aca-pager__body'
        )
      ).toMatch(/var\(--aca-scale-enter, 0\.92\)/);
      const leaving = rule('launcher', '.aca-pager.is-overview > .aca-pager__page.is-leaving');
      expect(leaving).toMatch(/opacity:\s*0;/);
      expect(leaving).toMatch(
        /opacity var\(--aca-dur-exit-sm, 160ms\) var\(--aca-motion-ease-in, ease-in\)/
      );
      expect(
        rule('launcher', '.aca-pager.is-overview > .aca-pager__page.is-leaving > .aca-pager__body')
      ).toMatch(
        /scale: calc\(var\(--aca-overview-k, 0\.72\) \* var\(--aca-scale-enter, 0\.92\)\);/
      );
    });

    it('the indicator gives its place to the pill in a short time, and the pill comes after, with a scale and a fade', () => {
      expect(css.indicator).toMatch(
        /\.aca-indicator\.aca-indicator--hidden\.aca-indicator--yield \{\s*transition:\s*transform var\(--aca-dur-swap-out, 120ms\)[^;]*,\s*opacity var\(--aca-dur-swap-out, 120ms\)/
      );
      expect(rule('edit', '.aca-undo--top:not(.aca-undo--hidden)')).toMatch(
        /transition-delay:\s*calc\(var\(--aca-stagger, 40ms\) \* 1\.5\);/
      );
      // The pill: a scale of 8 % and a fade in and out, no slide; the exit is the shorter.
      const pill = rule('edit', '.aca-undo--hidden');
      expect(pill).toMatch(/scale:\s*var\(--aca-scale-enter, 0\.92\);/);
      expect(pill).toMatch(/opacity:\s*0;/);
      expect(pill).toMatch(/var\(--aca-dur-exit-sm, 160ms\)/);
      expect(pill).not.toMatch(/translate/);
      expect(css.edit).not.toMatch(/\.aca-undo--top\.aca-undo--hidden \{\s*transform: translateY/);
      expect(rule('edit', '.aca-undo')).toMatch(/var\(--aca-dur-enter-sm, 240ms\)/);
    });

    it('with reduced motion the indicator and the pill only fade, in the reduced time', () => {
      expect(css.indicator).toMatch(
        /prefers-reduced-motion: reduce\) \{[\s\S]*?\.aca-indicator\.aca-indicator--hidden\.aca-indicator--yield,[\s\S]*?transition:\s*opacity var\(--aca-dur-reduced, 120ms\) linear;/
      );
      expect(css.edit).toMatch(
        /prefers-reduced-motion: reduce\) \{\s*\.aca-undo,\s*\.aca-undo--hidden,\s*\.aca-undo--top:not\(\.aca-undo--hidden\) \{\s*scale: none;\s*transition: opacity var\(--aca-dur-reduced, 120ms\) linear;/
      );
    });
  });
});
